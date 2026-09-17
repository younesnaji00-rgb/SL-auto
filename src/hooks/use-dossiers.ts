'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { getDocs, onSnapshot } from '@/lib/firestore-logged';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import type { Dossier } from '@/lib/dossiers-data';

export function useDossiers(allowedCompagnies?: string[]) {
    const db = useFirestore();
    const storage = useStorage();
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [db, allowed]);

  const deleteDossier = async (dossierId: string): Promise<void> => {
    if (!db) throw new Error('DB not initialized');

    // Delete the main doc FIRST so the snapshot listener removes the row from
    // the dossiers list immediately. Subcollection + storage cleanup runs in
    // the background; orphans aren't visible anywhere because the parent doc
    // is gone. Errors on the main delete propagate; cleanup failures don't.
    await deleteDoc(doc(db, 'dossiers', dossierId));

    void (async () => {
      const subcollections = [
        'documents', 'photos', 'commentaires', 'chiffrage',
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

      try {
        const chiffragesSnap = await getDocs(query(collection(db, 'chiffrages'), where('dossierId', '==', dossierId)));
        await Promise.allSettled(chiffragesSnap.docs.map(d => deleteDoc(d.ref)));
      } catch (err) {
        console.warn('[deleteDossier] chiffrages cleanup failed:', err);
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
