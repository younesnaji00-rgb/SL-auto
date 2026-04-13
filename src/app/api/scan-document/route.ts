import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

/**
 * AI Document Scanner API.
 * Extracts structured form data from insurance documents (mission letters, claim forms, etc.)
 * Returns JSON matching the dossier creation form fields.
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
      prompt: [
        {
          text: `Tu es un système d'extraction de données de haute précision spécialisé dans les dossiers d'expertise automobile au Maroc. Tu travailles pour un cabinet d'expertise d'assurance. La précision est CRITIQUE — toute erreur peut avoir des conséquences juridiques et financières graves.

CONTEXTE:
- Les documents traités sont des lettres de mission, constats amiables, rapports d'expertise, PV de police, ou factures de réparation.
- Les compagnies d'assurance marocaines incluent: Wafa Assurance, RMA, Saham Assurance, Allianz Maroc, AXA Assurance Maroc, MAMDA, MCMA, Atlanta, Sanad, Zurich Maroc, Maroc Assistance, La Marocaine Vie.
- Les immatriculations marocaines suivent les formats: "12345-A-1", "12345|A|1", ou ancien format numérique.
- Les marques courantes au Maroc: Renault, Dacia, Peugeot, Citroën, Volkswagen, Hyundai, Kia, Toyota, Fiat, Ford, Mercedes-Benz, BMW, Audi, Opel, Nissan, Suzuki, Mitsubishi, Honda, Chevrolet, Seat, Skoda, MG, Chery, DFSK.

TÂCHE:
Analyse minutieusement ce document et extrais UNIQUEMENT les informations EXPLICITEMENT présentes. Ne déduis RIEN, ne complète RIEN, ne devine RIEN.

SCHÉMA JSON STRICT — renvoie exactement cette structure:
{
  "expertRank": "1er expert" | "2eme expert" | "Arbitre" | null,
  "dossierType": "Normale" | "Classique" | "Agrée" | "Forfait" | null,
  "nature": string | null,
  "company": string | null,
  "insuredName": string | null,
  "insuredPhone": string | null,
  "brand": string | null,
  "model": string | null,
  "registration": string | null,
  "registrationW": string | null,
  "intermediaryName": string | null,
  "intermediaryEmail": string | null,
  "refExpert": string | null,
  "companyRef": string | null,
  "policyNumber": string | null,
  "dateOfLoss": "YYYY-MM-DD" | null,
  "dateOfRequest": "YYYY-MM-DD" | null,
  "dateOfMEC": "YYYY-MM-DD" | null,
  "repairerType": "Agréé" | "Normal" | null,
  "garageName": string | null,
  "adversaireAssure": string | null,
  "adversaireMatricule": string | null,
  "adversaireMarque": string | null,
  "adversairePolice": string | null,
  "adversaireCompagnie": string | null
}

RÈGLES STRICTES (ZÉRO TOLÉRANCE AUX ERREURS):
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de commentaires, pas de \`\`\`, pas de texte avant ou après.
2. DATES: Format YYYY-MM-DD uniquement. Si le document dit "15/03/2024", renvoie "2024-03-15". Si le format est ambigu (ex: 03/04/2024 pourrait être mars ou avril), utilise le format DD/MM/YYYY qui est le standard marocain/français.
3. NOMS DE COMPAGNIES: Copie le nom EXACT tel qu'il apparaît dans le document. Ne corrige pas l'orthographe, ne standardise pas.
4. IMMATRICULATION: Copie le format EXACT du document, caractère par caractère.
5. NOMS DE PERSONNES: Copie exactement comme écrit dans le document, avec la casse originale.
6. NUMÉROS DE TÉLÉPHONE: Copie le format exact du document.
7. MARQUE VÉHICULE: Utilise le nom officiel standard (ex: "RENAULT" → "Renault", "DACIA" → "Dacia").
8. PARTIE ADVERSE: Remplis les champs adversaire UNIQUEMENT si le document contient explicitement des informations sur la partie adverse/tiers.
9. CONFIANCE: Ne remplis un champ que si tu es confiant à 95% ou plus. En cas de doute, mets null. Il vaut mieux un champ null qu'une valeur incorrecte.
10. NE CONFONDS PAS les informations de l'assuré et de l'adversaire. Vérifie deux fois qui est qui.
11. "nature" fait référence à la nature du sinistre (ex: "Accident", "Vol", "Incendie", "Bris de glace", "Catastrophe naturelle").
12. "refExpert" est la référence du dossier chez l'expert, "companyRef" est la référence de la compagnie d'assurance.`
        },
        { media: { url: dataUri } }
      ]
    });

    const cleanedText = (text || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let extracted;
    try {
      extracted = JSON.parse(cleanedText);
    } catch {
      console.error('[scan-document] Failed to parse AI response:', cleanedText);
      return NextResponse.json({ error: 'Impossible de parser la réponse AI.', raw: cleanedText }, { status: 422 });
    }

    // Clean nulls
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }

    return NextResponse.json({ data: result, fieldsFound: Object.keys(result).length });
  } catch (error: any) {
    console.error('[/api/scan-document] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
