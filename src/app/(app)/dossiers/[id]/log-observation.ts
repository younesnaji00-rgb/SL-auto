import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export type ObservationType = 'Planification' | 'Décision de statut' | 'Expert' | 'Général';
export type PhaseATG = 'Avant' | 'En cours' | 'Après';
export type AccordSlot = '1er accord' | '2ème accord ou +';

/**
 * Append an observation to the dossier's observations subcollection.
 * Fire-and-forget — errors are logged but never thrown.
 *
 * Context tags:
 *  - `phaseATG`  → scopes the observation to a planification phase (Avant /
 *    En cours / Après). Visible only in that step's dossier panel + the
 *    AT's ATG view when that tab is active.
 *  - `accordSlot` → scopes to an accord context. Legacy values are the coarse
 *    slot labels ('1er accord' / '2ème accord ou +'); since the round where
 *    the chiffreur picker became dynamic, the field can also hold the
 *    specific accord/proposition docType the chiffreur was working on
 *    ('Devis 2ème accord', "1ère proposition d'accord (devis)", etc.). The
 *    dossier timeline filter derives the coarse slot via
 *    `accordSlotFromValue` so both shapes route to the right panel.
 *  An observation should have AT MOST ONE of the two tags set.
 */
export async function addObservation(
  db: any,
  dossierId: string,
  text: string,
  type: ObservationType,
  author: string,
  authorEmail: string,
  authorRole: string,
  source: 'dossiers' | 'assignations-atg' | 'assignations-chiffrage',
  phaseATG?: PhaseATG | null,
  accordSlot?: AccordSlot | string | null,
): Promise<void> {
  if (!db || !dossierId || !text.trim()) return;

  try {
    const docPayload: Record<string, any> = {
      text: text.trim(),
      type,
      author,
      authorEmail,
      authorRole,
      source,
      createdAt: serverTimestamp(),
      dossierId,
    };
    if (phaseATG) docPayload.phaseATG = phaseATG;
    if (accordSlot) docPayload.accordSlot = accordSlot;

    await addDoc(collection(db, 'dossiers', dossierId, 'observations'), docPayload);

    const lastObservation: Record<string, any> = {
      text: text.trim(),
      type,
      author,
      authorRole,
      at: serverTimestamp(),
    };
    if (phaseATG) lastObservation.phaseATG = phaseATG;
    if (accordSlot) lastObservation.accordSlot = accordSlot;

    await setDoc(
      doc(db, 'dossiers', dossierId),
      { lastObservation },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to log observation:', err);
  }
}
