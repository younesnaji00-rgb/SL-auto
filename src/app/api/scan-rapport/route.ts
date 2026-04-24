import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

/**
 * AI Rapport Scanner API.
 * Extracts structured rapport data from repair invoices, expert reports, or estimate documents.
 * Returns JSON matching the rapport tab structure: pieces, main d'oeuvre, points de choc, observation.
 */
export async function POST(req: NextRequest) {
  try {
    const { fileBase64, contentType } = await req.json();

    if (!fileBase64) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    const dataUri = `data:${contentType || 'image/jpeg'};base64,${fileBase64}`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      config: { responseMimeType: 'application/json' },
      prompt: [
        {
          text: `Tu es un système d'extraction de données de haute précision spécialisé dans les rapports d'expertise automobile au Maroc. Tu analyses des factures de réparation, devis, rapports d'expertise, ou documents similaires pour en extraire les données structurées.

CONTEXTE:
- Les documents sont des rapports d'expertise automobile, factures de réparation, devis de carrosserie/mécanique.
- Les pièces peuvent être de type: ORG (Origine), ADP (Adaptable), REC (Récupéré), P.P (Pièce Peinte), R.P (Réparation Peinture), ou leurs variantes avec "s" (ORGs, ADPs, RECs, P.Ps, R.Ps).
- Les opérations possibles sont: Echange, Réparation, Peinture.
- La main d'oeuvre se divise en: Tolerie, Peinture, Mécanique, Electrique.
- Les types de choc vont de "Choc 1" à "Choc 10".
- Les zones de choc (dessus): AR, ARG, ARD, LATG, LATD, AVG, AVD, AV, Toit.
- Les zones de choc (dessous): suspensionAV, soubassementAV, plancher, transmission, differentiel, suspensionAR, echappement, reservoir.
- TVA standard au Maroc: 20%.

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
      "puHT": number (prix unitaire hors taxe en MAD),
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
6. Prix: Extrais le prix unitaire HT. Si seul le TTC est disponible, divise par 1.20 pour obtenir le HT.
7. Vétusté: Si mentionnée, extrais le pourcentage. Sinon, mets 0.
8. Remise: Si mentionnée, extrais le pourcentage. Sinon, mets 0.
9. TVA: true par défaut sauf indication contraire.
10. Main d'oeuvre: Extrais les heures et tarif horaire pour chaque type. Si le PU n'est pas spécifié, utilise 80 MAD/h par défaut.
11. Points de choc: Détermine les zones impactées d'après les pièces et descriptions. Si une pièce est "pare-chocs avant", marque AV comme true.
12. Observation: Extrais toute remarque, observation ou conclusion de l'expert.
13. Si une section n'est pas trouvée dans le document, renvoie un tableau vide pour pieces, des valeurs à 0 pour mainOeuvre, false pour tous les pointsChoc, et null pour observationExpert.
14. Quantité par défaut: 1 si non spécifiée.`
        },
        { media: { url: dataUri } }
      ]
    });

    const cleanedText = (text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let extracted;
    try {
      extracted = JSON.parse(cleanedText);
    } catch {
      console.error('[scan-rapport] Failed to parse AI response:', cleanedText);
      return NextResponse.json({ error: 'Impossible de parser la réponse AI.', raw: cleanedText }, { status: 422 });
    }

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
    console.error('[/api/scan-rapport] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
