import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { formatFr, numOrNull, qteFromScan } from '@/lib/devis-schema';
import { parseAiJson } from '@/lib/ai-json';

/**
 * AI Devis Scanner API.
 * Extracts structured devis data (garage header + line items) from a devis PDF/image.
 * Returns JSON matching the StructuredDevis shape (header + rows).
 */
export async function POST(req: NextRequest) {
  try {
    const { fileBase64, contentType } = await req.json();

    if (!fileBase64) {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    }

    const dataUri = `data:${contentType || 'application/pdf'};base64,${fileBase64}`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      config: { responseMimeType: 'application/json' },
      prompt: [
        {
          text: `Tu es un système d'extraction de données de haute précision spécialisé dans les DEVIS et FACTURES DE GARAGE automobiles au Maroc. Tu travailles pour un cabinet d'expertise d'assurance. La précision est CRITIQUE.

CONTEXTE:
- Les documents sont soit des devis de réparation, soit des factures émises par des garages marocains (carrosserie/mécanique). Tu traites les deux types avec le même schéma — la structure du tableau de lignes est identique.
- En-tête typique: logo du garage, numéro (devis ou facture), date, informations du véhicule (Marque, Matricule, Modèle ou Date MEC, Kilométrage, N° de chassis), client (garage/société ou particulier), adresse, ICE (identifiant commun de l'entreprise), téléphone, compagnie d'assurance.
- Tableau des lignes: REF, Désignation, TYPE, T.V.A (%), Qté, P.U H.T, Total H.T.
- REF est souvent la nature de l'opération: "CHANGE", "REPAR", "PEINTURE", etc.
- TVA au Maroc: 0% ou 20%.
- Montants en dirhams marocains (MAD), format français "1 234,50" ou "1234.50".
- Pour une facture, le numéro extrait dans "devisNumero" est en réalité le numéro de facture (le champ porte le nom historique mais accepte les deux).

TÂCHE:
Extrais UNIQUEMENT ce qui est explicitement présent. Ne devine rien.

SCHÉMA JSON STRICT:
{
  "header": {
    "marque": string | null,
    "matricule": string | null,
    "modele": string | null,
    "kilometrage": string | null,
    "chassis": string | null,
    "expert": string | null,
    "client": string | null,
    "adresse": string | null,
    "ice": string | null,
    "telephone": string | null,
    "assurances": string | null,
    "devisNumero": string | null,
    "dateDevis": string | null,
    "totalHT": number | null,
    "totalTTC": number | null
  },
  "rows": [
    {
      "ref": string,
      "designation": string,
      "type": string,
      "tva": number | null,
      "qte": number | null,
      "puHT": number,
      "reportedTotalHT": number | null
    }
  ]
}

CHAMP reportedTotalHT (par ligne): la valeur de la colonne "Total H.T" EXACTEMENT telle qu'imprimée dans la ligne du document source. Ne la recalcule PAS. Ne mets ce champ que si la ligne a une colonne Total H.T imprimée ; sinon omets-le (ou renvoie null). Ce champ sert uniquement à la validation arithmétique côté serveur.

CHAMPS totalHT / totalTTC (header): si le document affiche en pied de tableau un total général H.T ou T.T.C, copie la valeur telle qu'imprimée. Sinon, renvoie null.

RÈGLES STRICTES:
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de \`\`\`, pas de texte avant ou après.
2. Extrais CHAQUE ligne du tableau individuellement (y compris les lignes dupliquées).
3. Pour "ref": si le document affiche "CHANGE" ou équivalent, copie le tel quel. Sinon laisse vide.
4. Pour "type": souvent vide ou contient un code ("ORG", "ADP", etc.). Copie tel quel.
5. "tva" est un nombre (0, 20, 7, 10). Si affiché "0%", renvoie 0. Si la cellule est VIDE (aucun pourcentage affiché — typique des lignes de main d'œuvre), renvoie null.
6. "qte" et "puHT" sont des nombres. Convertis "1 234,50" en 1234.50. Si la cellule "qte" est VIDE (typique des lignes de main d'œuvre / forfait), renvoie null — ne mets JAMAIS 0 à la place d'une case vide.
7. Ne calcule PAS Total H.T — il sera recalculé.
8. Pour le header: "dateDevis" au format "DD/MM/YYYY" tel qu'affiché. "modele" peut être soit un nom de modèle, soit une date de mise en circulation — copie ce qui est affiché.
9. Si un champ du header n'est pas présent, renvoie null pour ce champ.
10. Si aucune ligne n'est lisible, renvoie "rows": [].
11. Nombre maximal de lignes attendues: jusqu'à 60. Ne tronque pas.

CORRECTIONS MANUSCRITES (TRÈS IMPORTANT):
Certains devis comportent des annotations manuscrites de l'expert — des corrections écrites à la main (souvent à l'encre rouge, parfois au stylo bleu ou noir) qui remplacent les valeurs imprimées par le garage. Les cas typiques:
- Une valeur imprimée barrée (trait horizontal/diagonal qui la traverse) avec un nouveau nombre manuscrit à côté, au-dessus, ou en dessous dans la même ligne.
- Une valeur manuscrite ajoutée à côté d'une valeur imprimée sans barrer, mais positionnée de façon à clairement la remplacer.
- Un marqueur textuel comme "S/R" (sans réserve / sous réserve) dans la ligne indiquant une intervention — dans ce cas, cherche attentivement un nombre manuscrit à proximité.

RÈGLE: Quand une ligne a une valeur imprimée ET une correction manuscrite pour le MÊME champ (qte ou puHT), extrais UNIQUEMENT la valeur manuscrite. Ignore la valeur imprimée.

La couleur de l'encre n'est PAS un critère fiable — concentre-toi sur:
- La présence d'un trait de biffure sur la valeur imprimée.
- Une écriture manuelle visible (différente de la police imprimée du reste du tableau).
- Un nombre supplémentaire positionné dans la même cellule ou à l'angle de la ligne.

Si une ligne n'a AUCUNE correction manuscrite, extrais la valeur imprimée comme d'habitude. La majorité des devis sont sans intervention — ne fabrique pas de corrections qui n'existent pas.

Conserve les marqueurs textuels comme "S/R" dans le champ "designation" si ils y figurent (n'essaie pas de les supprimer).`
        },
        { media: { url: dataUri } },
      ],
    });

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-devis] Failed to parse AI response:', parsed.cleaned);
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }
    if (parsed.repaired) {
      console.warn('[scan-devis] AI response required jsonrepair fallback');
    }
    const extracted = parsed.data;

    const header = extracted.header || {};
    const rows = Array.isArray(extracted.rows) ? extracted.rows : [];

    const cleanHeader = {
      marque: header.marque || '',
      matricule: header.matricule || '',
      modele: header.modele || '',
      kilometrage: header.kilometrage || '',
      chassis: header.chassis || '',
      expert: header.expert || '',
      client: header.client || '',
      adresse: header.adresse || '',
      ice: header.ice || '',
      telephone: header.telephone || '',
      assurances: header.assurances || '',
      devisNumero: header.devisNumero || '',
      dateDevis: header.dateDevis || '',
    };

    // Rows carry an extra `reportedTotalHT` field used for server-side arithmetic
    // validation only — it's stripped from the final payload before returning.
    const rowsWithReported = rows.map((r: any) => ({
      ref: String(r.ref ?? '').trim() || 'CHANGE',
      designation: String(r.designation ?? '').trim(),
      type: String(r.type ?? '').trim(),
      tva: numOrNull(r.tva),
      // qte from the AI scan:
      //   - blank/missing source  → 1 (neutral; Total = 1 × puHT, matches label rows)
      //   - explicit 0 in source  → null (shown blank, contributes 0 to totals)
      //   - anything else         → the parsed number
      qte: qteFromScan(r.qte),
      // puHT stays 0-defaulting — a line without a price is still a line, and
      // labor rows DO have a price (it's the labor cost itself).
      puHT: numOrNull(r.puHT) ?? 0,
      reportedTotalHT: numOrNull(r.reportedTotalHT),
    }));

    // Arithmetic validation: flag any row where Qté × PU.HT diverges from the
    // Total H.T printed on the document (1 DH tolerance for rounding).
    const calculationErrors: string[] = [];
    rowsWithReported.forEach((r: any, index: number) => {
      const reported = r.reportedTotalHT;
      if (typeof reported === 'number' && Number.isFinite(reported)) {
        const computed = (r.qte ?? 0) * (r.puHT ?? 0);
        if (Math.abs(computed - reported) > 1) {
          calculationErrors.push(
            `Ligne ${index + 1} : Qté × PU.HT = ${formatFr(computed)}, mais le document affiche ${formatFr(reported)}.`
          );
        }
      }
    });

    // Cross-check the header total H.T if Gemini returned one.
    const headerTotalHT = numOrNull(header.totalHT);
    if (typeof headerTotalHT === 'number') {
      const computedTotalHT = rowsWithReported.reduce(
        (sum: number, r: any) => sum + (r.qte ?? 0) * (r.puHT ?? 0),
        0
      );
      if (Math.abs(computedTotalHT - headerTotalHT) > 1) {
        calculationErrors.push(
          `Total H.T : somme calculée ${formatFr(computedTotalHT)}, document affiche ${formatFr(headerTotalHT)}.`
        );
      }
    }

    // Strip `reportedTotalHT` before returning — validation is the only use.
    const cleanRows = rowsWithReported.map(({ reportedTotalHT: _rtHT, ...rest }: any) => rest);

    return NextResponse.json({
      header: cleanHeader,
      rows: cleanRows,
      rowsCount: cleanRows.length,
      calculationErrors,
    });
  } catch (error: any) {
    console.error('[/api/scan-devis] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
