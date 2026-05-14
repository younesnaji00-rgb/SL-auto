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
import { CANONICAL_STATUTS } from './dossiers-data';

// Module-level guard — prevents multiple seeds in the same browser session
const _seeded = new Set<string>();

const ALL_DEFAULTS: Record<string, string[]> = {
  options_natures: ['Classique', 'Contradictoire 1er', 'Contradictoire 2ème', 'Arbitrage', 'Réforme', 'Collégiale', 'Forfait', 'Appréciation', 'EAD'],
  // Seeded from the canonical status list — single source of truth lives in
  // dossiers-data.ts. Add/remove labels there, not here.
  options_statuts: [...CANONICAL_STATUTS],
  options_types_rdv: ['Avant', 'En cours', 'Après'],
  options_types_documents: ['Rapport d\'expertise', 'Devis', 'Facture', 'Photos avant expertise', 'Photos après expertise', 'Photos au moment du sinistre', 'PV de constat', 'Carte grise', 'Permis de conduire', 'Attestation d\'assurance'],
  options_roles: ['Admin', 'Directeur', 'Directeur des opérations', 'Directeur technique', 'Responsable technique', 'Responsable d\'équipe', 'Gestionnaire', 'Chiffreur', 'Agent de Terrain'],
  options_agents: ['Agent 1', 'Agent 2'],
  compagnies: ['ATLANTA', 'Allianz', 'CP', 'Fès ATLANTASANAD', 'Fès RMA', 'Fès Sanlam', 'Rma assurance', 'Wafa Assurance', 'Zurich Assurance'],
  options_types_dossier: ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'],
  options_reparateur_types: ['Agréé', 'Normal'],
  options_rapport_types_pieces: ['ORG', 'ADP', 'REC', 'ORGs', 'ADPs', 'RECs', 'P.P', 'P.Ps', 'R.P', 'R.Ps'],
  options_rapport_operations: ['Echange', 'Réparation', 'Peinture'],
  options_mdo_types: ['Tolerie', 'Peinture', 'Mécanique', 'Electrique'],
  options_observations: ['Assuré injoignable', 'Véhicule hors ville d\'expertise', 'Assuré non disponible', 'Rendez-vous reporté', 'Numéro erroné', 'Assuré en retard', 'Sous réserve', 'Autre'],
  options_sites: ['Casablanca', 'Fès'],
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

/**
 * Ensures every canonical status label the app depends on exists in
 * `options_statuts`. Invoked on-demand by the admin "Synchroniser les statuts
 * canoniques" button in OptionsManagerModal — intentionally not part of app
 * startup (running it alongside onSnapshot on the same collection triggered a
 * Firestore SDK target-table drift, assertion ID ca9).
 *
 * Returns the count of labels actually inserted.
 */
export async function reconcileCanonicalStatuts(db: Firestore): Promise<number> {
  const colRef = collection(db, 'options_statuts');
  const snap = await getDocs(colRef);
  const existing = new Set(
    snap.docs.map((d) => String(d.data().label || '').trim())
  );
  const canonical = new Set<string>(CANONICAL_STATUTS as readonly string[]);

  // Idempotent: log legacy docs that live in options_statuts but are not in
  // the canonical list. We do NOT delete them here — actual pruning is
  // deferred to the migration script (task #7). Logging keeps the admin
  // aware of drift without risking data loss.
  const legacy = Array.from(existing).filter((l) => l && !canonical.has(l));
  if (legacy.length > 0) {
    console.log(
      `[reconcileCanonicalStatuts] ${legacy.length} legacy status label(s) ` +
      `present in options_statuts but not in CANONICAL_STATUTS (not deleted; ` +
      `migration script #7 handles pruning):`,
      legacy,
    );
  }

  const missing = (CANONICAL_STATUTS as readonly string[]).filter((l) => !existing.has(l));
  if (missing.length === 0) return 0;

  const baseOrder = snap.size;
  const batch = writeBatch(db);
  missing.forEach((label, i) => {
    const ref = doc(colRef);
    batch.set(ref, {
      label,
      order: baseOrder + i,
      active: true,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return missing.length;
}

export function getDefaultsFor(collectionName: string): readonly string[] | undefined {
  return ALL_DEFAULTS[collectionName];
}

/**
 * Idempotently adds any default labels missing from the given collection.
 * Returns the count of newly inserted docs (0 if the collection already
 * contains every default, or if no defaults are registered for the
 * collection). Modeled on reconcileCanonicalStatuts.
 */
export async function reconcileOptionDefaults(
  db: Firestore,
  collectionName: string,
): Promise<number> {
  const defaults = ALL_DEFAULTS[collectionName];
  if (!defaults || defaults.length === 0) return 0;
  const colRef = collection(db, collectionName);
  const snap = await getDocs(colRef);
  const existing = new Set(
    snap.docs.map((d) => String(d.data().label || '').trim()),
  );
  const missing = defaults.filter((l) => !existing.has(l));
  if (missing.length === 0) return 0;
  const baseOrder = snap.size;
  const batch = writeBatch(db);
  missing.forEach((label, i) => {
    const ref = doc(colRef);
    batch.set(ref, {
      label,
      order: baseOrder + i,
      active: true,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return missing.length;
}
