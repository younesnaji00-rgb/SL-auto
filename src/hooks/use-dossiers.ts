'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { getDocs, onSnapshot } from '@/lib/firestore-logged';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import { useListenerEpoch } from '@/hooks/use-listener-epoch';
import type { Dossier } from '@/lib/dossiers-data';

export function useDossiers(allowedCompagnies?: string[]) {
    const db = useFirestore();
    const storage = useStorage();
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Re-subscribes after a refusal caused by a missing/refreshing login
    // token instead of freezing on cached rows (owner report 2026-09-24).
    const { epoch, onDenied } = useListenerEpoch();

    // Stabilize the array reference to avoid re-subscribing on every render
    const compagniesKey = allowedCompagnies ? JSON.stringify(allowedCompagnies.map(c => c.toLowerCase().trim()).sort()) : '';
    const allowed = useMemo(() => compagniesKey ? JSON.parse(compagniesKey) as string[] : null, [compagniesKey]);

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const q = query(collection(db, 'dossiers'), orderBy('createdAt', 'desc'));

        const unsub = onSnapshot(q,
            (snapshot) => {
                let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dossier));

                // Filter by user's allowed companies. A dossier whose compagnie
                // is still blank (freshly created, not yet qualified) belongs to
                // nobody's scope in particular — hiding it made « 2 sur 6 »
                // dossiers vanish from the list and the Total tile for the very
                // person who had just created them.
                if (allowed && allowed.length > 0) {
                    results = results.filter(d => {
                        const c = (d.compagnie || '').toLowerCase().trim();
                        return !c || allowed.includes(c);
                    });
                }

                setDossiers(results);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('useDossiers error:', err);
                // Retrying: keep the error out of sight — it is almost always
                // a token that was not ready yet, and the next subscription
                // clears it. Only a refusal that survives the retries shows.
                if (err.code === 'permission-denied' && onDenied()) return;
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, allowed, epoch]);

  const deleteDossier = async (dossierId: string): Promise<void> => {
    if (!db) throw new Error('DB not initialized');

    // Delete the main doc FIRST so the snapshot listener removes the row from
    // the dossiers list immediately. Subcollection + storage cleanup runs in
    // the background; orphans aren't visible anywhere because the parent doc
    // is gone. Errors on the main delete propagate; cleanup failures don't.
    await deleteDoc(doc(db, 'dossiers', dossierId));

    void (async () => {
      // The chiffrages FIRST: they are the only leftovers that show in a list
      // (the chiffrage queue, the dashboards), so they must not wait behind
      // the subcollections — a tab closed mid-cleanup left six chiffrages of a
      // deleted dossier in the queue (owner report 2026-09-25).
      try {
        const chiffragesSnap = await getDocs(query(collection(db, 'chiffrages'), where('dossierId', '==', dossierId)));
        await Promise.allSettled(chiffragesSnap.docs.map(d => deleteDoc(d.ref)));
      } catch (err) {
        console.warn('[deleteDossier] chiffrages cleanup failed:', err);
      }

      const subcollections = [
        'documents', 'photos', 'commentaires', 'chiffrage', 'observations',
        'missions', 'reclamations', 'planifications',
        'planificationHistory', 'historique', 'rapport_pieces', 'workflow',
      ];

      for (const sub of subcollections) {
        try {
          const subSnap = await getDocs(collection(db, 'dossiers', dossierId, sub));
          const results = await Promise.allSettled(subSnap.docs.map(d => deleteDoc(d.ref)));
          const failed = results.filter(r => r.status === 'rejected').length;
          if (failed > 0) console.warn(`[deleteDossier] ${sub}: ${failed} doc(s) failed to delete`);
        } catch (err) {
          console.warn(`[deleteDossier] ${sub} listing failed:`, err);
        }
      }

      if (storage) {
        try {
          const deleteStorageFolder = async (folderRef: any) => {
            const list = await listAll(folderRef);
            await Promise.allSettled([
              ...list.items.map(item => deleteObject(item)),
              ...list.prefixes.map((sub: any) => deleteStorageFolder(sub)),
            ]);
          };
          await deleteStorageFolder(ref(storage, `dossiers/${dossierId}`));
        } catch (err) {
          console.warn('[deleteDossier] storage cleanup failed:', err);
        }
      }

      console.log(`[deleteDossier] background cleanup complete: ${dossierId}`);
    })();
  };

    return { dossiers, loading, error, deleteDossier };
}
