import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { BRAND } from '@/lib/brand';

/**
 * AI Rapport Scanner API.
 * Extracts structured rapport data from repair invoices, expert reports, or estimate documents.
 * Returns JSON matching the rapport tab structure: pieces, main d'oeuvre, points de choc, observation.
 */

// Market-specific prompt fragments. MA is the original Moroccan prompt text,
// verbatim; CA swaps in Canadian sales taxes, CAD prices and labour rates.
const RAPPORT_MARKET_MA = {
  country: 'au Maroc',
  taxLine: `TVA standard au Maroc: 20%.`,
  currency: 'MAD',
  ttcRule: `Si seul le TTC est disponible, divise par 1.20 pour obtenir le HT.`,
  labourRate: `80 MAD/h`,
};

const RAPPORT_MARKET_CA = {
  country: 'au Canada',
  taxLine: `Taxes de vente au Canada: TPS/GST 5% + TVQ/QST 9,975% (Québec, total 14,975%) ou TVH/HST 13% (Ontario).`,
  currency: 'CAD',
  ttcRule: `Si seul le montant taxes incluses est disponible, divise par 1.14975 (Québec, TPS+TVQ) ou par 1.13 (Ontario, TVH) pour obtenir le HT, selon la taxe indiquée sur le document.`,
  labourRate: `90 CAD/h`,
};

const RAPPORT_MARKET = BRAND.market === 'CA' ? RAPPORT_MARKET_CA : RAPPORT_MARKET_MA;
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const { fileBase64, contentType } = await req.json();

    if (!fileBase64) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const dataUri = `data:${contentType || 'image/jpeg'};base64,${fileBase64}`;

    const { text } = await withAiRetry(() => ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      config: { responseMimeType: 'application/json' },
      prompt: [
        {
          text: `Tu es un système d'extraction de données de haute précision spécialisé dans les rapports d'expertise automobile ${RAPPORT_MARKET.country}. Tu analyses des factures de réparation, devis, rapports d'expertise, ou documents similaires pour en extraire les données structurées.

CONTEXTE:
- Les documents sont des rapports d'expertise automobile, factures de réparation, devis de carrosserie/mécanique.
- Les pièces peuvent être de type: ORG (Origine), ADP (Adaptable), REC (Récupéré), P.P (Pièce Peinte), R.P (Réparation Peinture), ou leurs variantes avec "s" (ORGs, ADPs, RECs, P.Ps, R.Ps).
- Les opérations possibles sont: Echange, Réparation, Peinture.
- La main d'oeuvre se divise en: Tolerie, Peinture, Mécanique, Electrique.
- Les types de choc vont de "Choc 1" à "Choc 10".
- Les zones de choc (dessus): AR, ARG, ARD, LATG, LATD, AVG, AVD, AV, Toit.
- Les zones de choc (dessous): suspensionAV, soubassementAV, plancher, transmission, differentiel, suspensionAR, echappement, reservoir.
- ${RAPPORT_MARKET.taxLine}

TÂCHE:
Analyse minutieusement ce document et extrais TOUTES les informations relatives au rapport d'expertise. Extrais chaque pièce/ligne de devis individuellement.

SCHÉMA JSON STRICT — renvoie exactement cette structure:
{
  "pieces": [
    {
      "designation": string,
      "operation": "Echange" | "Réparation" | "Peinture",
      "typePiece": "ORG" | "ADP" | "REC" | "ORGs" | "ADPs" | "RECs" | "P.P" | "P.Ps" | "R.P" | "R.Ps",
      "vetuste": number (pourcentage, 0-100),
      "quantite": number,
      "puHT": number (prix unitaire hors taxe en ${RAPPORT_MARKET.currency}),
      "remise": number (pourcentage de remise, 0-100),
      "tva": boolean (true si TVA applicable),
      "typeChoc": "Choc 1" | "Choc 2" | ... | "Choc 10"
    }
  ],
  "mainOeuvre": {
    "tolerie": { "nbrH": number, "pu": number },
    "peinture": { "nbrH": number, "pu": number },
    "mécanique": { "nbrH": number, "pu": number },
    "electrique": { "nbrH": number, "pu": number }
  },
  "pointsChoc": {
    "AR": boolean, "ARG": boolean, "ARD": boolean,
    "LATG": boolean, "LATD": boolean,
    "AVG": boolean, "AVD": boolean, "AV": boolean,
    "Toit": boolean
  },
  "pointsChocDessous": {
    "suspensionAV": boolean, "soubassementAV": boolean, "plancher": boolean,
    "transmission": boolean, "differentiel": boolean,
    "suspensionAR": boolean, "echappement": boolean, "reservoir": boolean
  },
  "observationExpert": string | null
}

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de commentaires, pas de \`\`\`, pas de texte avant ou après.
2. Extrais CHAQUE ligne de pièce/désignation individuellement. Ne regroupe PAS les pièces.
3. Si le type de choc n'est pas spécifié dans le document, utilise "Choc 1" par défaut.
4. Si le type de pièce n'est pas clair, utilise "P.Ps" par défaut.
5. Si l'opération n'est pas spécifiée, déduis-la du contexte: "Echange" pour remplacement, "Réparation" pour remise en état, "Peinture" pour travaux de peinture.
6. Prix: Extrais le prix unitaire HT. ${RAPPORT_MARKET.ttcRule}
7. Vétusté: Si mentionnée, extrais le pourcentage. Sinon, mets 0.
8. Remise: Si mentionnée, extrais le pourcentage. Sinon, mets 0.
9. TVA: true par défaut sauf indication contraire.
10. Main d'oeuvre: Extrais les heures et tarif horaire pour chaque type. Si le PU n'est pas spécifié, utilise ${RAPPORT_MARKET.labourRate} par défaut.
11. Points de choc: Détermine les zones impactées d'après les pièces et descriptions. Si une pièce est "pare-chocs avant", marque AV comme true.
12. Observation: Extrais toute remarque, observation ou conclusion de l'expert.
13. Si une section n'est pas trouvée dans le document, renvoie un tableau vide pour pieces, des valeurs à 0 pour mainOeuvre, false pour tous les pointsChoc, et null pour observationExpert.
14. Quantité par défaut: 1 si non spécifiée.`
        },
        { media: { url: dataUri } }
      ]
    }), { label: 'scan-rapport' });

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-rapport] Failed to parse AI response');
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }
    if (parsed.repaired) {
      console.warn('[scan-rapport] AI response required jsonrepair fallback');
    }
    const extracted = parsed.data;

    return NextResponse.json({
      data: {
        pieces: extracted.pieces || [],
        mainOeuvre: extracted.mainOeuvre || null,
        pointsChoc: extracted.pointsChoc || null,
        pointsChocDessous: extracted.pointsChocDessous || null,
        observationExpert: extracted.observationExpert || null,
      },
      piecesCount: (extracted.pieces || []).length,
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-rapport] Error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
