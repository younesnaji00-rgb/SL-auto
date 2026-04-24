/**
 * One-off backfill: adds nomLowercase field to every user doc.
 * Required before enabling case-insensitive login (task #8).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json tsx scripts/backfill-nom-lowercase.ts
 *
 * Idempotent — safe to re-run.
 */

import * as admin from 'firebase-admin';

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
  const snap = await db.collection('users').get();

  let written = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const nom = (data.nom ?? '') as string;

    if (typeof nom !== 'string' || nom.trim() === '') {
      skipped++;
      console.log(`[SKIP] ${doc.id}: missing or empty nom`);
      continue;
    }

    const desired = nom.trim().toLowerCase();
    const current = (data.nomLowercase ?? '') as string;

    if (current === desired) {
      skipped++;
      console.log(`[SKIP] ${doc.id}: nomLowercase already correct`);
      continue;
    }

    await doc.ref.update({ nomLowercase: desired });
    written++;
    console.log(`[WRITE] ${doc.id}: nomLowercase = "${desired}"`);
  }

  console.log(`\n${written} written, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
