import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Read the active "Mes rappels" treatment session id for this dossier from
 * localStorage. Set by mes-rappels/page.tsx on row click, cleared on "Valider
 * le traitement". Mirrors the tagging in log-observation.ts so EVERY action a
 * gestionnaire takes during a rappel session (status changes, workflow steps,
 * uploads…) carries the session id and surfaces in the manager's replay.
 */
function activeRappelSessionId(dossierId: string): string | null {
  if (typeof window === 'undefined' || !dossierId) return null;
  try {
    return window.localStorage.getItem(`rappel-active-session-${dossierId}`);
  } catch {
    return null;
  }
}

/**
 * Utility function to log actions to the dossier's audit trail (historique subcollection).
 * When type === 'statut', also denormalize `lastStatusChange` onto the dossier doc so
 * the dossiers list can render the last status + time without an extra subquery per row.
 *
 * Round 8: optional trailing `userNom` is persisted alongside `user` (email)
 * so display surfaces can render the name instead of the email. When
 * absent, readers fall back to "Utilisateur inconnu" (Q-7 → B).
 */
export async function logHistorique(
  db: any,
  dossierId: string,
  action: string,
  user: string,
  details?: string,
  type?: string,
  userNom?: string,
) {
  if (!db || !dossierId) return;

  try {
    const payload: Record<string, any> = {
      action,
      date: serverTimestamp(),
      user: user || 'Admin',
      details: details || '',
      type: type || 'autre',
    };
    if (userNom && userNom.trim()) payload.userNom = userNom.trim();
    // F9.B: auto-tag historique entries made during an active "Mes rappels"
    // session so the Mes rappels list can surface the modifications back to
    // the sender. Mirrors `log-observation.ts`.
    const histSid = activeRappelSessionId(dossierId);
    if (histSid) payload.rappelSessionId = histSid;
    await addDoc(collection(db, 'dossiers', dossierId, 'historique'), payload);

    if (type === 'statut') {
      try {
        const denorm: Record<string, any> = {
          status: action,
          at: serverTimestamp(),
          by: user || 'Admin',
          details: details || '',
        };
        if (userNom && userNom.trim()) denorm.byNom = userNom.trim();
        await updateDoc(doc(db, 'dossiers', dossierId), {
          lastStatusChange: denorm,
        });
      } catch (err) {
        console.error('Failed to denormalize lastStatusChange:', err);
      }
    }
  } catch (err) {
    console.error('Failed to log audit trail entry:', err);
  }
}

/**
 * Utility function to log workflow progress steps. See `logHistorique` for
 * the userNom contract.
 */
export async function logWorkflow(
  db: any,
  dossierId: string,
  action: string,
  user: string,
  userId: string,
  status: 'done' | 'pending' = 'done',
  extra?: { dossierRef?: string; details?: string },
  userNom?: string,
) {
  if (!db || !dossierId) return;

  try {
    const payload: Record<string, any> = {
      action,
      date: serverTimestamp(),
      user: user || 'Admin',
      userId: userId || 'unknown',
      status,
      ...(extra?.dossierRef && { dossierRef: extra.dossierRef }),
      ...(extra?.details && { details: extra.details }),
    };
    if (userNom && userNom.trim()) payload.userNom = userNom.trim();
    // F9.B: same Mes rappels session tagging as logHistorique above.
    const wfSid = activeRappelSessionId(dossierId);
    if (wfSid) payload.rappelSessionId = wfSid;
    await addDoc(collection(db, 'dossiers', dossierId, 'workflow'), payload);
  } catch (err) {
    console.error('Failed to log workflow step:', err);
  }
}
