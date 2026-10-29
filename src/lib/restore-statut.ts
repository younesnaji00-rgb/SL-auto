import { collection, deleteField, doc, query, serverTimestamp, updateDoc, where, type Firestore } from 'firebase/firestore';
import { getDoc, getDocs } from './firestore-logged';
import { getStorage } from 'firebase/storage';
import { isEditableDocType } from './devis-schema';
import { syncGarageDocs } from './devis-extract';
import { parseAccordDocType } from './docType-accorde';
import { normalizeTypeMission } from './type-mission';
import {
  deriveStatus,
  isChiffragePhaseStatus,
  statutAfterAccordRemoval,
  statutAfterPhotoRemoval,
  statutBeforeChiffrage,
} from './status-machine';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { NOTE_HONORAIRE_TYPE } from './dossier-finished';
import { syncNoteHonoraireStamp } from './note-honoraire-stamp';

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

type RemovalUser = { email?: string | null; nom?: string | null };

const isReceived = (d: { url?: unknown; pendingUpload?: unknown }) => !!d.url && !d.pendingUpload;

/**
 * Owner, 2026-10-13: an accord or proposition document removed from the
 * dossier sends it back to « Chiffrage en cours » when it was the answer its
 * statut stood for (status-machine `statutAfterAccordRemoval`), and the
 * dossier's chiffrage reopens in the chiffreur's queue — no `completedAt`,
 * status `pending` — exactly as a re-send does.
 *
 * Call after the document is deleted (or moved out of its slot). Never
 * throws: the deletion stands. Returns the statut set, or null.
 */
export async function restoreStatutAfterAccordRemoval(
  db: Firestore,
  dossierId: string,
  removedType: string,
  user: RemovalUser,
): Promise<string | null> {
  const parsed = parseAccordDocType(String(removedType ?? '').trim());
  if (!parsed) return null;
  try {
    const dossierRef = doc(db, 'dossiers', dossierId);
    const snap = await getDoc(dossierRef);
    if (!snap.exists()) return null;
    const data = snap.data() as { statut?: unknown; currentChiffrageId?: unknown };
    const current = typeof data.statut === 'string' ? data.statut : '';

    const docsSnap = await getDocs(collection(db, 'dossiers', dossierId, 'documents'));
    const removedLabel = String(removedType).trim();
    let highestRemainingRound = 0;
    let sameSlotLeft = false;
    for (const d of docsSnap.docs) {
      const x = d.data() as { type?: string; typeDocument?: string; url?: unknown; pendingUpload?: unknown };
      const label = (x.type || x.typeDocument || '').trim();
      const p = parseAccordDocType(label);
      if (!p || !isReceived(x)) continue;
      highestRemainingRound = Math.max(highestRemainingRound, p.ordinal);
      if (label === removedLabel) sameSlotLeft = true;
    }
    // Another page of the same accord is still there: the accord is not gone.
    if (sameSlotLeft) return null;
    const target = statutAfterAccordRemoval(
      current,
      { kind: parsed.kind === 'accord' ? 'accord' : 'proposition', round: parsed.ordinal },
      highestRemainingRound,
    );
    if (!target || target === current) return null;

    await updateDoc(dossierRef, { statut: target, updatedAt: serverTimestamp() });
    const chiffrageId = typeof data.currentChiffrageId === 'string' ? data.currentChiffrageId : '';
    if (chiffrageId) {
      await updateDoc(doc(db, 'chiffrages', chiffrageId), {
        status: 'pending',
        completedAt: null,
        // A new assignment, as a re-send makes it: the chiffreur gets a fresh
        // 24 business hours instead of finding it « En retard » at once.
        assignedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('[restore-statut] chiffrage reopen failed (non-fatal)', err));
    }
    await logHistorique(
      db,
      dossierId,
      target,
      user.email || user.nom || 'Utilisateur',
      `Statut rétabli automatiquement : « ${removedType} » supprimé, le dossier repart au chiffrage.`,
      'statut',
      user.nom || undefined,
    );
    return target;
  } catch (err) {
    console.warn('[restore-statut] accord fallback failed (non-fatal)', err);
    return null;
  }
}

const PHOTOS_SENT_FIELD = { avant: 'datePhotosAvant', en_cours: 'datePhotosEnCours', apres: 'datePhotosApres' } as const;
const PHASE_OF_CATEGORY = { avant: 'Avant', en_cours: 'En cours', apres: 'Après' } as const;

/**
 * Owner, 2026-10-13: once the LAST photo of a phase is removed, that phase
 * is back to « planned »:
 *  - « Planification expertise <phase> » returns to « Planification
 *    programmée <phase> » (status-machine `statutAfterPhotoRemoval`);
 *  - the phase's « photos envoyées » marks go — the dossier's
 *    `datePhotos<Phase>` (the visit step read « Terminé » from it) and the
 *    `photosSentAt` of its visits (the dashboards' « visite faite »).
 * Photos left in the phase change nothing. Never throws. Returns the statut
 * set, or null.
 */
export async function restoreStatutAfterPhotoRemoval(
  db: Firestore,
  dossierId: string,
  category: unknown,
  user: RemovalUser,
): Promise<string | null> {
  if (category !== 'avant' && category !== 'en_cours' && category !== 'apres') return null;
  try {
    const photosSnap = await getDocs(collection(db, 'dossiers', dossierId, 'photos'));
    // A photo without a category is an « avant » one, as everywhere else.
    if (photosSnap.docs.some((d) => ((d.data() as { category?: string }).category || 'avant') === category)) return null;

    const dossierRef = doc(db, 'dossiers', dossierId);
    const snap = await getDoc(dossierRef);
    if (!snap.exists()) return null;
    const current = (snap.data() as { statut?: unknown }).statut;
    const target = typeof current === 'string' ? statutAfterPhotoRemoval(current, category) : null;
    const field = PHOTOS_SENT_FIELD[category];
    await updateDoc(dossierRef, {
      [field]: deleteField(),
      [`author${field.charAt(0).toUpperCase()}${field.slice(1)}`]: deleteField(),
      ...(target ? { statut: target } : {}),
      updatedAt: serverTimestamp(),
    });

    const plansSnap = await getDocs(collection(db, 'dossiers', dossierId, 'planifications'));
    await Promise.all(
      plansSnap.docs
        .filter((p) => {
          const x = p.data() as { typeMission?: unknown; photosSentAt?: unknown; photosSentEarly?: unknown };
          return normalizeTypeMission(x.typeMission) === PHASE_OF_CATEGORY[category] && !!(x.photosSentAt || x.photosSentEarly);
        })
        .map((p) =>
          updateDoc(p.ref, { photosSentAt: deleteField(), photosSentEarly: deleteField() })
            .catch((err) => console.warn('[restore-statut] visit unstamp failed (non-fatal)', err)),
        ),
    );

    if (target) {
      await logHistorique(
        db,
        dossierId,
        target,
        user.email || user.nom || 'Utilisateur',
        `Statut rétabli automatiquement : plus aucune photo ${PHASE_OF_CATEGORY[category].toLowerCase()} dans le dossier.`,
        'statut',
        user.nom || undefined,
      );
    }
    return target;
  } catch (err) {
    console.warn('[restore-statut] photo fallback failed (non-fatal)', err);
    return null;
  }
}

/**
 * After a document left the dossier — deleted, discarded from this device, or
 * moved out of its slot: the statut fallback its type calls for (garage devis
 * / facture, or accord / proposition). Null when the statut is unchanged.
 */
export async function restoreStatutAfterDocumentRemoval(
  db: Firestore,
  dossierId: string,
  removedType: unknown,
  user: RemovalUser,
): Promise<string | null> {
  const type = String(removedType ?? '').trim();
  // The last note d'honoraire gone: the dossier is « en cours » again
  // (owner ruling 2026-10-29). The statut itself does not move.
  if (type === NOTE_HONORAIRE_TYPE) {
    await syncNoteHonoraireStamp(db, dossierId, user);
    return null;
  }
  if (isEditableDocType(type)) {
    // The tables follow: the removed devis / facture's rows leave the
    // dossier's table and the chiffreur's (tester 2026-10-14).
    void syncGarageDocs({ db, storage: getStorage(db.app), dossierId, docType: type });
    return restoreStatutWithoutGarageDocs(db, dossierId, user);
  }
  if (parseAccordDocType(type)) return restoreStatutAfterAccordRemoval(db, dossierId, type, user);
  return null;
}
