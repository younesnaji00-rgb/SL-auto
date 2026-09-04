import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { storeFieldCorrections } from '@/lib/ai-memory';

/**
 * Records field-level corrections the user made after an AI pre-fill, so the
 * next /api/scan-document call for the same compagnie is told about them.
 * Body: { dossierId, compagnie?, corrections: [{ field, before, after }] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth: any = await requireAuth(req);
    const body = await req.json();
    const dossierId = String(body.dossierId || '');
    const corrections = Array.isArray(body.corrections) ? body.corrections : [];
    if (!dossierId || corrections.length === 0) return NextResponse.json({ ok: true, stored: 0 });
    const stored = await storeFieldCorrections({
      dossierId,
      compagnie: body.compagnie ? String(body.compagnie) : null,
      uid: auth?.uid ?? auth?.user?.uid ?? undefined,
      corrections: corrections.slice(0, 50).map((c: any) => ({ field: String(c.field || ''), before: c.before, after: c.after })),
    });
    return NextResponse.json({ ok: true, stored });
  } catch (err: any) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error('[extract-feedback] error', err);
    return NextResponse.json({ error: err?.message || 'Erreur.' }, { status: 500 });
  }
}
