/**
 * Reconciles dossier.statut by deriving the true phase from each dossier's
 * subcollection state (documents, photos, planifications). Run this when
 * statuses have drifted from reality (e.g., after fixing a write-path bug).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json tsx scripts/reconcile-statuses.ts            # dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json tsx scripts/reconcile-statuses.ts --apply   # commit changes
 *
 * Idempotent — safe to re-run.
 */

import * as admin from 'firebase-admin';
import { deriveActualStatut } from '../src/lib/reconcile-dossier-status';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  if (!apply) {
    console.log('[DRY-RUN] No writes will be made. Pass --apply to commit.\n');
  }

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    const sa = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS auto-discovery.
    admin.initializeApp();
  }

  const db = admin.firestore();
  const snap = await db.collection('dossiers').get();
  let changed = 0;
  let unchanged = 0;
  const transitions: Record<string, number> = {};

  for (const dossierDoc of snap.docs) {
    const dossier = dossierDoc.data();
    const current = (dossier.statut ?? '') as string;

    const [docsSnap, photosSnap, planifsSnap] = await Promise.all([
      dossierDoc.ref.collection('documents').get(),
      dossierDoc.ref.collection('photos').get(),
      dossierDoc.ref.collection('planifications').get(),
    ]);
    const documents = docsSnap.docs.map((d) => d.data());
    const photos = photosSnap.docs.map((d) => d.data());
    const planifications = planifsSnap.docs.map((d) => d.data());

    const derived = deriveActualStatut({
      dossier: { statut: current },
      documents,
      photos,
      planifications,
    });

    if (current === derived) {
      unchanged++;
      continue;
    }

    changed++;
    const key = `"${current || '(empty)'}" → "${derived}"`;
    transitions[key] = (transitions[key] || 0) + 1;
    const ref = dossier.refExpert ? ` (${dossier.refExpert})` : '';
    console.log(`[CHANGE] ${dossierDoc.id}${ref}: ${key}`);

    if (apply) {
      await dossierDoc.ref.update({
        statut: derived,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusChange: {
          status: derived,
          at: admin.firestore.FieldValue.serverTimestamp(),
          by: 'reconcile-script',
          details: `Reconciliation auto from "${current || '(empty)'}"`,
        },
      });
      await dossierDoc.ref.collection('historique').add({
        action: derived,
        type: 'statut',
        from: current,
        to: derived,
        date: admin.firestore.FieldValue.serverTimestamp(),
        user: 'reconcile-script',
        details: "Statut reconcilié automatiquement depuis l'état des sous-collections.",
      });
    }
  }

  console.log(
    `\n${changed} changed, ${unchanged} unchanged${apply ? '' : ' (dry-run, nothing written)'}`,
  );
  if (changed > 0) {
    console.log('\nTransitions:');
    const sorted = Object.entries(transitions).sort((a, b) => b[1] - a[1]);
    for (const [k, v] of sorted) {
      console.log(`  ${v.toString().padStart(4)} × ${k}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
