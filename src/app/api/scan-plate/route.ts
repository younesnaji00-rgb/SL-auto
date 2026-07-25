import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { transliterateArabic } from '@/lib/transliterate-arabic';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { BRAND } from '@/lib/brand';

/**
 * License-plate scanner for the AT self-service flows: the agent photographs
 * the physical plate on the vehicle (not a document) and we extract the
 * registration so it can be matched against existing dossiers client-side.
 * Sibling of `/api/scan-carte-grise`, tuned for in-the-wild plate photos
 * (angle, glare, dirt, Arabic middle letter).
 */

// Market-specific prompt fragments. MA is the original Moroccan prompt text,
// verbatim; CA describes Canadian provincial plates for the demo deployment.
const PLATE_MARKET_MA = {
  intro: `Tu es un système de lecture de plaques d'immatriculation marocaines de haute précision.`,
  formats: `FORMATS MAROCAINS:
- Format standard: numéro de série (1 à 5 chiffres) | lettre arabe (أ، ب، ت، د، ه، و…) ou latine | numéro de préfecture (1 à 2 chiffres). Exemple visuel: "12345 | ب | 6".
- Plaques temporaires: préfixe ou suffixe "WW" ou "W" suivi de chiffres.
- Ancien format: uniquement numérique.
- La plaque se lit de gauche à droite: chiffres, puis lettre, puis chiffres.

FORMAT DE SORTIE:
Renvoie les trois parties séparées par des tirets, exemple: "12345-ب-6" ou "12345-B-6". Garde la lettre telle qu'elle apparaît (arabe ou latine). Pour une plaque WW: "WW-123456". Pour l'ancien format numérique: les chiffres tels quels.`,
};

const PLATE_MARKET_CA = {
  intro: `Tu es un système de lecture de plaques d'immatriculation canadiennes de haute précision.`,
  formats: `FORMATS CANADIENS:
- Les plaques canadiennes sont des chaînes alphanumériques de 2 à 8 caractères dont le format varie selon la province.
- Ontario: souvent 4 lettres + 3 chiffres, exemple: "CKXR 382".
- Québec: souvent 1 lettre + 2 chiffres + 3 lettres ("F12 ABC") ou 3 chiffres + 3 lettres ("123 ABC").
- Autres provinces: autres combinaisons de lettres latines et de chiffres, parfois séparées par un espace ou un tiret.
- Uniquement des lettres latines et des chiffres.

FORMAT DE SORTIE:
Renvoie la plaque exactement telle qu'elle apparaît, en majuscules, en conservant les espaces ou tirets, exemple: "CKXR 382" ou "F12 ABC". N'ajoute pas le nom de la province ni le slogan de la plaque.`,
};

const PLATE_MARKET = BRAND.market === 'CA' ? PLATE_MARKET_CA : PLATE_MARKET_MA;
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const fileBase64: string | undefined = body?.fileBase64;
    const contentType: string | undefined = body?.contentType;

    if (!fileBase64) {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    }

    const { text } = await withAiRetry(
      () =>
        ai.generate({
          model: 'googleai/gemini-3-flash-preview',
          config: { responseMimeType: 'application/json' },
          prompt: [
            {
              text: `${PLATE_MARKET.intro}

TÂCHE:
La photo montre un véhicule (ou une plaque en gros plan). Lis le numéro de la plaque d'immatriculation et renvoie-le dans "registration".

${PLATE_MARKET.formats}

SCHÉMA JSON STRICT:
{
  "registration": string | null,
  "confidence": "high" | "low"
}

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de \`\`\`, pas de commentaires.
2. Si la plaque est illisible, coupée, floue ou absente, mets registration à null.
3. Si plusieurs véhicules sont visibles, lis la plaque la plus grande / la plus centrée.
4. Ne confonds pas avec un autocollant, une vignette, un numéro de taxi peint sur la carrosserie ou un numéro de téléphone.
5. "confidence": "high" seulement si chaque caractère est net et sans ambiguïté, sinon "low".`,
            },
            {
              media: {
                url: `data:${contentType || 'image/jpeg'};base64,${fileBase64}`,
              },
            },
          ],
        }),
      { label: 'scan-plate' },
    );

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-plate] Failed to parse AI response');
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }

    const data = parsed.data || {};
    const reg = transliterateArabic(
      typeof data.registration === 'string' ? data.registration.trim() : null,
    ) as string | null;

    return NextResponse.json({
      registration: reg || null,
      confidence: data.confidence === 'high' ? 'high' : 'low',
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-plate] Error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
