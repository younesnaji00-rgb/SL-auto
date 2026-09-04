import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { adminDb, adminAccessToken } from '@/lib/firebase-admin';
import {
  configureSeed,
  resolveDemoUids,
  seedSampleDossiers,
  seedCounts,
  buildDossiersData,
  demoManagerEmail,
} from '../../../../scripts/seed-demo.mjs';

/**
 * Demo-brand only: restores the showcase to its canonical state. Called by
 * the login page when the demo GESTIONNAIRE account signs in — "logging out
 * and back in restarts the demo", so every entry the previous run created
 * (dossiers, reminders, estimating assignments, location requests) is wiped
 * and the 8 sample dossiers are re-seeded with fresh relative dates.
 *
 * Left alone on purpose:
 *  - the pre-existing Honda Civic dossier (created by hand, not by the seed
 *    — deleting it would lose it forever);
 *  - users/{uid} docs (a full rewrite would erase the single-session claim
 *    fields of the session that is logging in RIGHT NOW);
 *  - option collections & holidays (idempotent config, rarely touched).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRESERVED_DOSSIER = 'ndEjPG1OFCfH6pINFCcN';

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_BRAND !== 'demo') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const { token } = await requireAuth(req);
    // Only the account whose login means "the demo restarts" may reset —
    // a field-agent phone login mid-walkthrough must never wipe the data.
    if ((token.email || '').toLowerCase() !== demoManagerEmail().toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (err) {
    const resp = authErrorResponse(err);
    if (resp) return resp;
    return NextResponse.json({ error: 'Auth failure' }, { status: 500 });
  }

  const t0 = Date.now();
  const db = adminDb();
  const seededIds: string[] = buildDossiersData().map((d: { id: string }) => d.id);
  const seeded = new Set(seededIds);
  let deletedDocs = 0;

  const deleteRefsBatched = async (refs: FirebaseFirestore.DocumentReference[]) => {
    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      for (const ref of refs.slice(i, i + 400)) batch.delete(ref);
      await batch.commit();
    }
    deletedDocs += refs.length;
  };

  try {
    // 1. Dossiers: strays (walkthrough creations) go entirely; seeded ones
    //    keep their doc (the reseed PATCH fully replaces it) but drop every
    //    subcollection doc, so stray planifications/photos/observations
    //    added on them disappear too.
    const dossierRefs = await db.collection('dossiers').listDocuments();
    for (const ref of dossierRefs) {
      if (ref.id === PRESERVED_DOSSIER) continue;
      if (seeded.has(ref.id)) {
        for (const col of await ref.listCollections()) {
          await deleteRefsBatched(await col.listDocuments());
        }
      } else {
        for (const col of await ref.listCollections()) {
          await deleteRefsBatched(await col.listDocuments());
        }
        await deleteRefsBatched([ref]);
      }
    }

    // 2. Reminders (with their session-snapshot subcollections).
    const rappelRefs = await db.collection('rappels').listDocuments();
    for (const ref of rappelRefs) {
      for (const col of await ref.listCollections()) {
        await deleteRefsBatched(await col.listDocuments());
      }
    }
    await deleteRefsBatched(rappelRefs);

    // 3. Estimating assignments — everything except the preserved dossier's.
    const chifSnap = await db.collection('chiffrages').get();
    await deleteRefsBatched(
      chifSnap.docs
        .filter((d) => (d.get('dossierId') as string | undefined) !== PRESERVED_DOSSIER)
        .map((d) => d.ref),
    );

    // 4. Demo geolocation requests.
    await deleteRefsBatched(await db.collection('location_requests').listDocuments());

    // 5. Re-seed the 8 sample dossiers (planifications, workflow, historique)
    //    with fresh relative dates, through the shared seed module.
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
    if (!projectId) throw new Error('No project id configured');
    configureSeed({ projectId, accessToken: await adminAccessToken() });
    const uids = await resolveDemoUids();
    await seedSampleDossiers(uids);
    const { written, failed } = seedCounts();

    const ms = Date.now() - t0;
    console.log(`[demo-reset] deleted ${deletedDocs} docs, reseeded ${written} (${failed} failed) in ${ms}ms`);
    return NextResponse.json({ ok: failed === 0, deleted: deletedDocs, written, failed, ms });
  } catch (err) {
    console.error('[demo-reset] failed:', err);
    return NextResponse.json(
      { error: 'Reset failed', detail: String((err as Error)?.message || err) },
      { status: 500 },
    );
  }
}
