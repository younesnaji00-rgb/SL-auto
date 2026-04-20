import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Utility function to log actions to the dossier's audit trail (historique subcollection).
 * When type === 'statut', also denormalize `lastStatusChange` onto the dossier doc so
 * the dossiers list can render the last status + time without an extra subquery per row.
 */
export async function logHistorique(
  db: any,
  dossierId: string,
  action: string,
  user: string,
  details?: string,
  type?: string
) {
  if (!db || !dossierId) return;

  try {
    await addDoc(collection(db, 'dossiers', dossierId, 'historique'), {
      action,
      date: serverTimestamp(),
      user: user || 'Admin',
      details: details || '',
      type: type || 'autre',
    });

    if (type === 'statut') {
      try {
        await updateDoc(doc(db, 'dossiers', dossierId), {
          lastStatusChange: {
            status: action,
            at: serverTimestamp(),
            by: user || 'Admin',
            details: details || '',
          },
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
 * Utility function to log workflow progress steps.
 */
export async function logWorkflow(
  db: any,
  dossierId: string,
  action: string,
  user: string,
  userId: string,
  status: 'done' | 'pending' = 'done',
  extra?: { dossierRef?: string; details?: string }
) {
  if (!db || !dossierId) return;

  try {
    await addDoc(collection(db, 'dossiers', dossierId, 'workflow'), {
      action,
      date: serverTimestamp(),
      user: user || 'Admin',
      userId: userId || 'unknown',
      status,
      ...(extra?.dossierRef && { dossierRef: extra.dossierRef }),
      ...(extra?.details && { details: extra.details }),
    });
  } catch (err) {
    console.error('Failed to log workflow step:', err);
  }
}
