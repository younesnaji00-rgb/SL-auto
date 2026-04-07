import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

// Module-level guard — prevents multiple seeds in the same browser session
const _seeded = new Set<string>();

const ALL_DEFAULTS: Record<string, string[]> = {
  options_natures: ['Automobile', 'Incendie', 'Classique', 'Contradictoire', 'Arbitrage', 'Réforme', 'Collégiale', 'Forfait'],
  options_statuts: ['Accord devis', 'Accord devis rectifié 2', 'Accord devis refusé', 'Accord facture garage', 'Att Signature 2ème expert', 'Avis de réforme', 'Avis dommage', 'Assigné au chiffrage', 'Expertise programmée en cours'],
  options_types_mission: ['Expertise', 'Constat', 'Contre-expertise', 'Visite technique'],
  options_types_documents: ['Rapport d\'expertise', 'Devis', 'Facture', 'Photos avant expertise', 'Photos après expertise', 'Photos au moment du sinistre', 'PV de constat', 'Carte grise', 'Permis de conduire', 'Attestation d\'assurance'],
  options_roles: ['Admin', 'Responsable technique', 'Responsable d\'équipe', 'Gestionnaire', 'Chiffreur', 'Agent de Terrain'],
  options_agents: ['Agent 1', 'Agent 2'],
  compagnies: ['ATLANTA', 'Allianz', 'CP', 'Fès ATLANTASANAD', 'Fès RMA', 'Fès Sanlam', 'Rma assurance', 'Wafa Assurance', 'Zurich Assurance'],
  options_types_dossier: ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'],
  options_reparateur_types: ['Particulier', 'Garage'],
  options_rapport_types_pieces: ['ORG', 'ADP', 'REC', 'ORGs', 'ADPs', 'RECs', 'P.P', 'P.Ps', 'R.P', 'R.Ps'],
  options_rapport_operations: ['Echange', 'Réparation', 'Peinture'],
  options_mdo_types: ['Tolerie', 'Peinture', 'Mécanique', 'Electrique'],
};

/**
 * Seeds a collection ONLY if it has ZERO documents AND has never been seeded.
 * Once seeded (or if collection already has data), it NEVER runs again.
 * Uses a Firestore lock doc at _seeds/{collectionName} as a permanent flag.
 */
export async function seedCollectionOnce(db: Firestore, collectionName: string): Promise<void> {
  // 1. In-memory guard (same session)
  if (_seeded.has(collectionName)) return;
  _seeded.add(collectionName);

  const defaults = ALL_DEFAULTS[collectionName];
  if (!defaults || defaults.length === 0) return;

  try {
    // 2. Firestore lock guard (across sessions/tabs)
    const lockRef = doc(db, '_seeds', collectionName);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists()) return; // Already seeded permanently

    // 3. Check if collection has ANY data
    const colSnap = await getDocs(collection(db, collectionName));
    if (!colSnap.empty) {
      // Collection already has data (maybe manually added) — mark as seeded and stop
      await setDoc(lockRef, { seededAt: serverTimestamp(), reason: 'collection_not_empty' });
      return;
    }

    // 4. Collection is truly empty AND never seeded — write defaults
    const batch = writeBatch(db);
    defaults.forEach((label, i) => {
      const ref = doc(collection(db, collectionName));
      batch.set(ref, { 
        label: label.trim(), 
        order: i, 
        active: true,
        createdAt: serverTimestamp()
      });
    });
    batch.set(lockRef, { seededAt: serverTimestamp(), reason: 'initial_seed' });
    await batch.commit();
    console.log(`[seed] Seeded ${collectionName} with ${defaults.length} defaults`);
  } catch (err) {
    console.warn(`[seed] Failed for ${collectionName}:`, err);
    _seeded.delete(collectionName); // Allow retry on actual errors
  }
}

/**
 * Call once at app startup.
 */
export async function seedAllOptions(db: Firestore): Promise<void> {
  await Promise.all(
    Object.keys(ALL_DEFAULTS).map((col) => seedCollectionOnce(db, col))
  );
}
