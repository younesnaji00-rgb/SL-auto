import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Utility function to log actions to the dossier's audit trail (historique subcollection).
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
  status: 'done' | 'pending' = 'done'
) {
  if (!db || !dossierId) return;

  try {
    await addDoc(collection(db, 'dossiers', dossierId, 'workflow'), {
      action,
      date: serverTimestamp(),
      user: user || 'Admin',
      userId: userId || 'unknown',
      status
    });
  } catch (err) {
    console.error('Failed to log workflow step:', err);
  }
}
