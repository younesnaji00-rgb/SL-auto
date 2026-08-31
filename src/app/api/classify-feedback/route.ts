import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { isDocClass } from '@/lib/doc-classes';
import { storeExample } from '@/lib/ai-memory';

/**
 * Records what the user did with an AI classification so the classifier
 * learns: a correction (user picked another class), a confirmation (user
 * validated the AI's class) or a manual label (user classified without AI).
 */
export async function POST(req: NextRequest) {
  try {
    const auth: any = await requireAuth(req);
    const body = await req.json();
    const corrected = String(body.corrected || '');
    if (!isDocClass(corrected)) return NextResponse.json({ error: 'Classe invalide.' }, { status: 400 });
    const kind = body.kind === 'correction' || body.kind === 'manual' ? body.kind : 'confirmation';
    const summary = String(body.summary || '');
    const keyText = String(body.keyText || '');
    if (!summary && !keyText) return NextResponse.json({ ok: true, stored: false, reason: 'no-text' });

    const id = await storeExample({
      docType: corrected,
      predicted: body.predicted ? String(body.predicted) : null,
      kind,
      summary,
      keyText,
      fileName: body.fileName ? String(body.fileName) : undefined,
      confidence: typeof body.confidence === 'number' ? body.confidence : null,
      dossierId: body.dossierId ? String(body.dossierId) : undefined,
      docId: body.docId ? String(body.docId) : undefined,
      uid: auth?.uid ?? auth?.user?.uid ?? undefined,
      compagnie: body.compagnie ? String(body.compagnie) : null,
    });
    return NextResponse.json({ ok: true, stored: true, id });
  } catch (err: any) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error('[classify-feedback] error', err);
    return NextResponse.json({ error: err?.message || 'Erreur.' }, { status: 500 });
  }
}
