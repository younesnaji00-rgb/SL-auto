import { collection, doc, query, serverTimestamp, updateDoc, where, type Firestore } from 'firebase/firestore';
import { getDoc, getDocs } from './firestore-logged';
import { isEditableDocType } from './devis-schema';
import { deriveStatus, isChiffragePhaseStatus, statutBeforeChiffrage } from './status-machine';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';

const toMillis = (v: unknown): number => {
  const ts = v as { toMillis?: () => number } | null | undefined;
  // A statut logged a moment ago may still carry a pending server timestamp.
  return typeof ts?.toMillis === 'function' ? ts.toMillis() : Number.MAX_SAFE_INTEGER;
};

/**
 * Owner ruling 2026-10-05: once a dossier has no garage devis and no garage
 * facture left — the last one deleted — the chiffrage they fed is gone, and
 * the statut falls back to the last one the dossier had before its chiffrage
 * phase (« Planification expertise avant », or whatever came before), read
 * from its statut historique. « Création dossier » when there is none.
 *
 * Call after a document is deleted. A no-op while a devis or a facture is
 * still there (or uploading), or when the statut is not a chiffrage-phase one
 * (chiffrage, accords, envoi, réforme). Never throws: the deletion stands.
 * Returns the statut set, or null when nothing changed.
 */
export async function restoreStatutWithoutGarageDocs(
  db: Firestore,
  dossierId: string,
  user: { email?: string | null; nom?: string | null },
): Promise<string | null> {
  try {
    const docsSnap = await getDocs(collection(db, 'dossiers', dossierId, 'documents'));
    const garageLeft = docsSnap.docs.some((d) => {
      const data = d.data() as { type?: string; typeDocument?: string; url?: string | null; storagePath?: string | null; pendingUpload?: boolean };
      const type = (data.type || data.typeDocument || '').trim();
      return isEditableDocType(type) && !!(data.url || data.storagePath || data.pendingUpload);
    });
    if (garageLeft) return null;

    const dossierRef = doc(db, 'dossiers', dossierId);
    const snap = await getDoc(dossierRef);
    const current = snap.exists() ? (snap.data() as { statut?: unknown }).statut : undefined;
    if (typeof current !== 'string' || !isChiffragePhaseStatus(current)) return null;

    const historySnap = await getDocs(
      query(collection(db, 'dossiers', dossierId, 'historique'), where('type', '==', 'statut')),
    );
    const history = historySnap.docs
      .map((d) => d.data() as { action?: string; date?: unknown })
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
      .map((h) => String(h.action ?? ''));
    const target = statutBeforeChiffrage(history) ?? deriveStatus({ kind: 'create' });
    if (target === current) return null;

    await updateDoc(dossierRef, { statut: target, updatedAt: serverTimestamp() });
    await logHistorique(
      db,
      dossierId,
      target,
      user.email || user.nom || 'Utilisateur',
      'Statut rétabli automatiquement : plus aucun devis ni facture garage dans le dossier.',
      'statut',
      user.nom || undefined,
    );
    return target;
  } catch (err) {
    console.warn('[restore-statut] fallback failed (non-fatal)', err);
    return null;
  }
}
