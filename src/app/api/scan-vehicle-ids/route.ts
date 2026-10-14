import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

/**
 * Kilométrage and numéro de châssis (VIN) read off the dossier's PHOTOS
 * (owner request 2026-10-14: both fields stayed empty — nothing fed them).
 * The agent photographs the odometer and the constructor plate; the photos of
 * a batch go in one call, and the client writes a value only into a field that
 * is still empty (lib/scan-vehicle-ids.ts). Sibling of `/api/scan-plate`.
 */

const MAX_FILES = 12;
// ~4 MB of base64 per photo, ~24 MB per call: the client downscales first.
const MAX_FILE_CHARS = 5_500_000;
const MAX_TOTAL_CHARS = 26_000_000;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const files: Array<{ fileBase64?: string; contentType?: string }> = Array.isArray(body?.files) ? body.files : [];
    const wantKm = body?.want?.km !== false;
    const wantVin = body?.want?.vin !== false;

    const usable = files
      .filter((f) => typeof f?.fileBase64 === 'string' && f.fileBase64.length > 0 && f.fileBase64.length <= MAX_FILE_CHARS)
      .slice(0, MAX_FILES);
    if (usable.length === 0) {
      return NextResponse.json({ error: 'Aucune photo à lire.' }, { status: 400 });
    }
    if (usable.reduce((n, f) => n + (f.fileBase64?.length ?? 0), 0) > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: 'Photos trop lourdes pour un seul envoi.' }, { status: 413 });
    }
    if (!wantKm && !wantVin) {
      return NextResponse.json({ mileage: null, vin: null });
    }

    const tasks = [
      wantKm
        ? `- KILOMÉTRAGE: le kilométrage TOTAL affiché par le compteur du tableau de bord (afficheur numérique ou compteur à rouleaux), souvent marqué « ODO » ou « km ». Ce n'est PAS le compteur journalier (« TRIP », « A », « B », souvent avec une décimale), PAS la vitesse, PAS l'autonomie restante, PAS l'heure ni la température.`
        : null,
      wantVin
        ? `- NUMÉRO DE CHÂSSIS (VIN): le numéro d'identification du véhicule gravé ou imprimé sur la plaque constructeur (montant de porte, pied milieu), en bas du pare-brise, sur le châssis ou dans le compartiment moteur. Un VIN moderne a 17 caractères (lettres et chiffres, jamais I, O ni Q). Les véhicules anciens peuvent en avoir moins.`
        : null,
    ].filter(Boolean).join('\n');

    const { text } = await withAiRetry(
      () =>
        ai.generate({
          model: 'googleai/gemini-3-flash-preview',
          config: { responseMimeType: 'application/json' },
          prompt: [
            {
              text: `Tu lis des photos prises par un expert automobile sur un véhicule sinistré (${usable.length} photo(s), numérotées dans l'ordre à partir de 0). La plupart montrent des dégâts : ignore-les. Cherche seulement :
${tasks}

SCHÉMA JSON STRICT:
{
  "mileage": { "value": string | null, "unit": "km" | "mi" | null, "photo": number | null, "confidence": "high" | "low" },
  "vin": { "value": string | null, "photo": number | null, "confidence": "high" | "low" }
}

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de \`\`\`, pas de commentaires.
2. "value" du kilométrage: les chiffres seuls, sans espace, point ni unité (ex. "128450").
3. "value" du VIN: les caractères seuls, en majuscules, sans espace ni tiret.
4. Si l'information n'apparaît sur aucune photo, ou si elle est floue, coupée ou ambiguë, mets value à null. N'invente jamais un chiffre.
5. Ne confonds pas le VIN avec la plaque d'immatriculation, un numéro de pièce, un code peinture ou un numéro de moteur.
6. "photo": l'index de la photo d'où vient la valeur.
7. "confidence": "high" seulement si chaque caractère est net et sans ambiguïté, sinon "low".`,
            },
            ...usable.map((f) => ({
              media: { url: `data:${f.contentType || 'image/jpeg'};base64,${f.fileBase64}` },
            })),
          ],
        }),
      { label: 'scan-vehicle-ids' },
    );

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-vehicle-ids] Failed to parse AI response');
      return NextResponse.json({ error: `Réponse IA illisible. Début: ${parsed.snippet}` }, { status: 422 });
    }
    const data = parsed.data || {};

    const kmRaw = typeof data?.mileage?.value === 'string' || typeof data?.mileage?.value === 'number' ? String(data.mileage.value) : '';
    let kmDigits = kmRaw.replace(/[^\d]/g, '');
    // A reading in miles is given in km — the dossier's unit.
    if (kmDigits && data?.mileage?.unit === 'mi') kmDigits = String(Math.round(Number(kmDigits) * 1.609344));
    const vin = typeof data?.vin?.value === 'string' ? data.vin.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

    return NextResponse.json({
      mileage: wantKm && kmDigits
        ? { value: kmDigits, photo: Number.isInteger(data.mileage.photo) ? data.mileage.photo : null, confidence: data.mileage.confidence === 'high' ? 'high' : 'low', unit: data.mileage.unit === 'mi' ? 'mi' : 'km' }
        : null,
      vin: wantVin && vin
        ? { value: vin, photo: Number.isInteger(data.vin.photo) ? data.vin.photo : null, confidence: data.vin.confidence === 'high' ? 'high' : 'low' }
        : null,
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-vehicle-ids] Error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
