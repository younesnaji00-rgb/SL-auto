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
          text: `Tu es un expert en extraction de données pour les dossiers d'expertise automobile au Maroc.

Analyse ce document (lettre de mission, constat amiable, rapport d'expertise, etc.) et extrais TOUTES les informations que tu peux trouver.

Renvoie un objet JSON STRICT avec les champs suivants. Si un champ n'est pas trouvé dans le document, mets null. Ne devine PAS les valeurs manquantes.

{
  "expertRank": "1er expert" | "2eme expert" | "Arbitre" | null,
  "dossierType": "Classique" | "Agrée" | "Forfait" | null,
  "nature": string | null,
  "dossierMode": string | null,
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

RÈGLES:
1. Renvoie UNIQUEMENT le JSON, sans markdown, sans commentaires, sans bloc de code.
2. Les dates doivent être au format YYYY-MM-DD.
3. Pour "company", utilise le nom exact de la compagnie d'assurance.
4. Pour "brand" (marque véhicule), utilise le nom standard (Renault, Peugeot, Dacia, etc.).
5. Pour "registration" (immatriculation/matricule), garde le format exact du document.
6. Si le document contient des informations sur la partie adverse, remplis les champs adversaire.
7. Sois précis: ne mets une valeur que si tu es confiant à plus de 80%.`
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
