/**
 * One-off migration script: rewrites legacy dossier statuses to canonical values.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json tsx scripts/migrate-statuses.ts
 *
 * Idempotent — safe to re-run.
 */

import * as admin from 'firebase-admin';
import { CANONICAL_STATUTS } from '../src/lib/dossiers-data';

type Canonical = typeof CANONICAL_STATUTS[number];

const LEGACY_MAP: Record<string, Canonical> = {
  'Expertise programmée avant': 'Planification programmée avant',
  'Expertise programmée en cours': 'Planification programmée en cours',
  'Expertise programmée après': 'Planification programmée après',
  'Avis de véhicule expertisé avant': 'Planification expertise avant',
  'Avis de véhicule expertisé en cours': 'Planification expertise en cours',
  'Avis de véhicule expertisé après': 'Planification expertise après',
  'Avis de véhicule non expertisé avant': 'Planification programmée avant',
  'Avis de véhicule non expertisé en cours': 'Planification programmée en cours',
  'Avis de véhicule non expertisé après': 'Planification programmée après',
  'Création de dossier': 'Création dossier',
  'Accord devis': 'Accord',
  'Accord devis rectifié 2': '2ème accord',
  'Accord devis rectifié 3': '3ème accord',
  'Accord facture garage': 'Accord',
  'Rapport Validé': 'Accord envoyé',
  'Rapport validé': 'Accord envoyé',
  'Rapport envoyé': 'Accord envoyé',
  'Demande 1er accord': "Proposition d'accord",
  'Demande 2ème accord': "2ème proposition d'accord",
  'Demande 3ème accord': "3ème proposition d'accord",
  'Demande accord': "Proposition d'accord",
  'Chiffrage': 'Chiffrage en cours',
  'Chiffrage en-cours': 'Chiffrage en cours',
  'Ouverture dossier': 'Création dossier',
  'Ouverture de dossier': 'Création dossier',
  'Nouveau dossier': 'Création dossier',
};

const FALLBACK: Canonical = 'Création dossier';

async function main(): Promise<void> {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    const sa = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS auto-discovery.
    admin.initializeApp();
  }

  const db = admin.firestore();
  const canonicalSet = new Set<string>(CANONICAL_STATUTS as readonly string[]);

  const snap = await db.collection('dossiers').get();
  let rewritten = 0;
  let skipped = 0;
  let fallback = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const current = (data.statut ?? '') as string;

    if (canonicalSet.has(current)) {
      skipped++;
      console.log(`[SKIP] ${doc.id}: already canonical (${current})`);
      continue;
    }

    let target: Canonical;
    if (current in LEGACY_MAP) {
      target = LEGACY_MAP[current];
    } else {
      target = FALLBACK;
      fallback++;
      console.warn(`[FALLBACK] ${doc.id}: "${current}" → ${FALLBACK}`);
    }

    const prevLastStatusChange = data.lastStatusChange ?? null;

    await doc.ref.update({
      statut: target,
      lastStatusChange: prevLastStatusChange
        ? { ...prevLastStatusChange, migratedAt: admin.firestore.FieldValue.serverTimestamp() }
        : { at: admin.firestore.FieldValue.serverTimestamp(), by: 'migration-script' },
    });

    await doc.ref.collection('historique').add({
      action: 'Migration statut',
      type: 'statut',
      from: current,
      to: target,
      at: admin.firestore.FieldValue.serverTimestamp(),
      by: 'migration-script',
    });

    rewritten++;
    console.log(`[REWRITE] ${doc.id}: "${current}" → "${target}"`);
  }

  console.log(`\n${rewritten} rewritten, ${skipped} skipped, ${fallback} fallbacks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
