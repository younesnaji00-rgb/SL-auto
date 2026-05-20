import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { transliterateArabic } from '@/lib/transliterate-arabic';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

/**
 * Carte Grise scanner — narrow extractor that pulls only the two registration
 * numbers off a Moroccan carte grise:
 *   - registration         → matricule définitive (current plate)
 *   - previousRegistration → matricule antérieure (prior plate, often absent)
 *
 * The full mission-letter extractor at `/api/scan-document` covers many more
 * fields and is therefore slower and more error-prone; this endpoint exists so
 * the Carte Grise slot in the typed-documents grid can run a tight, fast scan
 * on upload and write the two plates straight onto the dossier.
 */
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
              text: `Tu es un système d'extraction de haute précision spécialisé dans les cartes grises marocaines.

TÂCHE:
Extraire UNIQUEMENT les deux numéros d'immatriculation présents sur l'image:
- "registration" : le numéro d'immatriculation actuel/définitif. Libellés possibles: "Immatriculation", "N° d'immatriculation", "Numéro d'immatriculation", "Matricule".
- "previousRegistration" : le numéro d'immatriculation antérieur, s'il est explicitement mentionné. Libellés possibles: "Immatriculation antérieure", "Ancien numéro", "Précédente immatriculation", "Ancienne immatriculation". Souvent ABSENT — dans ce cas mets null.

FORMATS MAROCAINS:
Les immatriculations suivent les formats: "12345-A-1", "12345|A|1", ou ancien format numérique. Copier EXACTEMENT le format du document, caractère par caractère, sans rien standardiser.

SCHÉMA JSON STRICT:
{
  "registration": string | null,
  "previousRegistration": string | null
}

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de \`\`\`, pas de commentaires.
2. Si un numéro n'apparaît pas explicitement sur le document, mets null. Ne devine RIEN.
3. Confiance ≥ 90% pour remplir un champ. En cas de doute, mets null.
4. Ne pas confondre avec le numéro de chassis (VIN, 17 caractères), un numéro de police d'assurance, ou un numéro de série moteur.
5. \`previousRegistration\` ne peut jamais être identique à \`registration\` — si c'est le cas, mets-le à null.`,
            },
            {
              media: {
                url: `data:${contentType || 'image/jpeg'};base64,${fileBase64}`,
              },
            },
          ],
        }),
      { label: 'scan-carte-grise' },
    );

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-carte-grise] Failed to parse AI response');
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }

    const data = parsed.data || {};
    const reg = transliterateArabic(typeof data.registration === 'string' ? data.registration.trim() : null) as string | null;
    const prev = transliterateArabic(typeof data.previousRegistration === 'string' ? data.previousRegistration.trim() : null) as string | null;

    return NextResponse.json({
      registration: reg || null,
      previousRegistration: prev && prev !== reg ? prev : null,
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-carte-grise] Error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
