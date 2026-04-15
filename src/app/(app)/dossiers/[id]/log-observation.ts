import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type ObservationType = 'Planification' | 'Décision de statut' | 'Expert' | 'Général';

/**
 * Append an observation to the dossier's observations subcollection.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function addObservation(
  db: any,
  dossierId: string,
  text: string,
  type: ObservationType,
  author: string,
  authorEmail: string,
  authorRole: string,
  source: 'dossiers' | 'assignations-atg' | 'assignations-chiffrage'
): Promise<void> {
  if (!db || !dossierId || !text.trim()) return;

  try {
    await addDoc(collection(db, 'dossiers', dossierId, 'observations'), {
      text: text.trim(),
      type,
      author,
      authorEmail,
      authorRole,
      source,
      createdAt: serverTimestamp(),
      dossierId,
    });
  } catch (err) {
    console.error('Failed to log observation:', err);
  }
}
