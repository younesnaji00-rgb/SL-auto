import { collection, deleteField, doc, getDocsFromServer, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import { getDoc } from './firestore-logged';
import { NOTE_HONORAIRE_TYPE, isDossierFinished } from './dossier-finished';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';

/**
 * Keeps the dossier's note d'honoraire stamp (`dateNoteHonoraire`) in line
 * with its documents, since that stamp is what makes a dossier « terminé »
 * everywhere (owner ruling 2026-10-29, lib/dossier-finished.ts):
 * - a « Note d'honoraire » document is there and the stamp is not → stamped
 *   (the drop box and a reclassification file one without the typed slot's
 *   own stamp);
 * - the last one has left — deleted, discarded, moved to another slot — and
 *   the stamp is still there → cleared: the dossier is « en cours » again.
 *
 * A record still uploading counts as there, like the slot's own stamp at
 * upload. The documents are read from the SERVER: a partial offline cache
 * must never reopen or finish a dossier, so offline it does nothing. Never
 * throws; returns what it changed.
 */
export async function syncNoteHonoraireStamp(
  db: Firestore,
  dossierId: string,
  user: { email?: string | null; nom?: string | null },
): Promise<'set' | 'cleared' | null> {
  try {
    const dossierRef = doc(db, 'dossiers', dossierId);
    const [docsSnap, snap] = await Promise.all([
      getDocsFromServer(collection(db, 'dossiers', dossierId, 'documents')),
      getDoc(dossierRef),
    ]);
    if (!snap.exists()) return null;
    const hasNote = docsSnap.docs.some((d: any) => {
      const x = d.data() as { type?: unknown; typeDocument?: unknown };
      return String(x.type || x.typeDocument || '').trim() === NOTE_HONORAIRE_TYPE;
    });
    const stamped = isDossierFinished(snap.data() as any);
    if (hasNote && !stamped) {
      await updateDoc(dossierRef, {
        dateNoteHonoraire: serverTimestamp(),
        authorNoteHonoraire: user.email || user.nom || null,
        updatedAt: serverTimestamp(),
      });
      return 'set';
    }
    if (!hasNote && stamped) {
      await updateDoc(dossierRef, {
        dateNoteHonoraire: deleteField(),
        noteHonoraireAt: deleteField(),
        authorNoteHonoraire: deleteField(),
        updatedAt: serverTimestamp(),
      });
      await logHistorique(
        db,
        dossierId,
        "Note d'honoraire retirée",
        user.email || user.nom || 'Utilisateur',
        "Plus aucune note d'honoraire dans le dossier : il est de nouveau en cours.",
        'document',
        user.nom || undefined,
      );
      return 'cleared';
    }
    return null;
  } catch (err) {
    console.warn('[note-honoraire-stamp] sync failed (non-fatal)', err);
    return null;
  }
}
