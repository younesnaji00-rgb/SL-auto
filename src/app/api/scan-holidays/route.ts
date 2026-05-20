import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

/**
 * AI Holiday Calendar Scanner.
 * Reads a screenshot/image of a holiday calendar and extracts every date
 * present, returned as ISO YYYY-MM-DD strings. Used by the Jours fériés
 * settings page to bulk-import a year's holidays from a single picture.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const fileBase64: string | undefined = body.fileBase64;
    const contentType: string = body.contentType || 'image/jpeg';

    if (!fileBase64) {
      return NextResponse.json({ error: 'Image manquante.' }, { status: 400 });
    }

    const { text } = await withAiRetry(() => ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      config: { responseMimeType: 'application/json' },
      prompt: [
        {
          text: `Tu es un système d'extraction de dates précis. L'image fournie est une capture d'écran d'un calendrier de jours fériés (probablement marocain) pour une année donnée.

TÂCHE:
Repère CHAQUE date qui figure dans l'image et renvoie-la au format ISO "YYYY-MM-DD".

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT un tableau JSON brut de chaînes, par exemple: ["2026-01-01","2026-05-01","2026-07-30"]. Pas de markdown, pas de \`\`\`, pas de texte avant ou après.
2. Format de date OBLIGATOIRE: YYYY-MM-DD (ex: "15/03/2026" → "2026-03-15"). Si le format est ambigu (ex: 03/04/2026), utilise DD/MM/YYYY (standard marocain/français).
3. Si l'année n'est pas explicite à côté d'une date mais figure quelque part dans l'image (titre, en-tête), applique-la à toutes les dates non datées.
4. Ignore les week-ends ordinaires (samedis/dimanches non listés comme fériés). N'inclus une date que si elle correspond explicitement à un jour férié indiqué dans l'image.
5. Ignore tout ce qui n'est pas une date (titres, descriptions, illustrations).
6. Pas de doublons dans le tableau.
7. Si tu ne trouves aucune date, renvoie un tableau vide: [].`,
        },
        { media: { url: `data:${contentType};base64,${fileBase64}` } },
      ],
    }), { label: 'scan-holidays' });

    const parsed = parseAiJson<unknown>(text || '');
    if (!parsed.ok) {
      console.error('[scan-holidays] Failed to parse AI response:', parsed.cleaned);
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const raw = parsed.data;
    let candidates: unknown[] = [];
    if (Array.isArray(raw)) {
      candidates = raw;
    } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).dates)) {
      candidates = (raw as any).dates;
    }

    const dates = Array.from(
      new Set(
        candidates
          .filter((d): d is string => typeof d === 'string')
          .map((d) => d.trim())
          .filter((d) => ISO_DATE.test(d)),
      ),
    ).sort();

    return NextResponse.json({ dates, count: dates.length });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-holidays] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
