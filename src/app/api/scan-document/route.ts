import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { transliterateArabic } from '@/lib/transliterate-arabic';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { retrieveFieldCorrectionGuidance } from '@/lib/ai-memory';
import { BRAND } from '@/lib/brand';

/**
 * AI Document Scanner API.
 * Extracts structured form data from insurance documents (mission letters, claim forms, etc.)
 * Returns JSON matching the dossier creation form fields.
 */

// Market-specific prompt fragments. MA is the original Moroccan prompt text,
// verbatim; CA swaps in Canadian insurers, plate formats and date conventions.
const DOC_MARKET_MA = {
  country: 'au Maroc',
  portals: `OU des captures d'écran de portails d'assurance (Sanlam ecosys, Wafa, RMA, etc.)`,
  insurers: `Les compagnies d'assurance marocaines incluent: Wafa Assurance, RMA, Saham Assurance, Allianz Maroc, AXA Assurance Maroc, MAMDA, MCMA, Atlanta, Sanad, Sanlam, Zurich Maroc, Maroc Assistance, La Marocaine Vie.`,
  plates: `Les immatriculations marocaines suivent les formats: "12345-A-1", "12345|A|1", ou ancien format numérique.`,
  brands: `Les marques courantes au Maroc: Renault, Dacia, Peugeot, Citroën, Volkswagen, Hyundai, Kia, Toyota, Fiat, Ford, Mercedes-Benz, BMW, Audi, Opel, Nissan, Suzuki, Mitsubishi, Honda, Chevrolet, Seat, Skoda, MG, Chery, DFSK.`,
  extrasHint: `(souvent présentes dans les portails Sanlam / RMA / Wafa et sur la carte grise)`,
  dateHint: `utilise le format DD/MM/YYYY qui est le standard marocain/français`,
};

const DOC_MARKET_CA = {
  country: 'au Canada',
  portals: `OU des captures d'écran de portails d'assurance de compagnies canadiennes (Intact, Desjardins, etc.)`,
  insurers: `Les compagnies d'assurance canadiennes incluent: Intact Assurance, Desjardins Assurances, Aviva Canada, TD Assurance, belairdirect, Wawanesa, Co-operators, Allstate Canada.`,
  plates: `Les plaques d'immatriculation canadiennes sont des chaînes alphanumériques de 2 à 8 caractères dont le format varie selon la province (ex: "CKXR 382" en Ontario, "F12 ABC" au Québec).`,
  brands: `Les marques courantes au Canada: Toyota, Honda, Ford, Chevrolet, GMC, Ram, Jeep, Dodge, Hyundai, Kia, Nissan, Mazda, Subaru, Volkswagen, Tesla, Mercedes-Benz, BMW, Audi, Lexus, Acura, Volvo, Chrysler, Buick, Cadillac, Mitsubishi.`,
  extrasHint: `(souvent présentes dans les portails des compagnies et sur le certificat d'immatriculation)`,
  dateHint: `utilise DD/MM/YYYY pour un document rédigé en français et MM/DD/YYYY pour un document rédigé en anglais`,
};

const DOC_MARKET = BRAND.market === 'CA' ? DOC_MARKET_CA : DOC_MARKET_MA;

// ── OCR-free extraction for structured text documents ───────────────────────
// HTML/plain-text uploads (e.g. an insurer portal's electronic mission order,
// or the demo kit's mission-document.html) carry their field table as text —
// no AI needed. Labels are normalized (accents/punctuation stripped) and
// matched against this map; anything unmatched is ignored. When at least one
// field parses, the AI call is skipped entirely.
const TEXT_LABEL_MAP: Record<string, string> = {
  'compagnie d assurance': 'company',
  'insurance company': 'company',
  'reference compagnie': 'companyRef',
  'company reference': 'companyRef',
  'n de police': 'policyNumber',
  'policy number': 'policyNumber',
  'date de reception mission': 'dateOfRequest',
  'date of assignment': 'dateOfRequest',
  'assure': 'insuredName',
  'insured': 'insuredName',
  'telephone de l assure': 'insuredPhone',
  'insured s phone': 'insuredPhone',
  'adresse de l assure': 'insuredAddress',
  'insured s address': 'insuredAddress',
  'marque': 'brand',
  'make': 'brand',
  'modele': 'model',
  'model': 'model',
  'immatriculation': 'registration',
  'licence plate': 'registration',
  'license plate': 'registration',
  'n de chassis niv': 'chassisNumber',
  'vin': 'chassisNumber',
  'energie': 'fuelType',
  'fuel': 'fuelType',
  'kilometrage': 'mileage',
  'mileage': 'mileage',
  'date du sinistre': 'dateOfLoss',
  'date of loss': 'dateOfLoss',
  'nature du sinistre': 'nature',
  'nature of loss': 'nature',
  'garage reparateur': 'garageName',
  'repair facility': 'garageName',
  'usage': 'vehicleUsage',
  'use': 'vehicleUsage',
};

function normalizeLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Parses `<td class="k">Label</td><td>Value</td>` rows (the structure the
// demo kit's electronic mission order uses). Returns null when the document
// carries no recognizable field table.
function extractFromTextDocument(html: string): Record<string, string> | null {
  const data: Record<string, string> = {};
  const rowRe = /<td class="k">([^<]+)<\/td>\s*<td>([^<]+)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const key = TEXT_LABEL_MAP[normalizeLabel(m[1])];
    const value = m[2].trim();
    if (key && value && !(key in data)) data[key] = value;
  }
  return Object.keys(data).length > 0 ? data : null;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    // Accept both { fileBase64, contentType } (single) and { files: [{fileBase64, contentType}] } (multi)
    const rawFiles: { fileBase64: string; contentType?: string }[] = Array.isArray(body.files) && body.files.length > 0
      ? body.files
      : body.fileBase64
        ? [{ fileBase64: body.fileBase64, contentType: body.contentType }]
        : [];

    if (rawFiles.length === 0) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    // Text documents first: when a structured field table parses, the data
    // is exact by construction — skip the AI entirely (faster, free, and
    // immune to AI-backend outages).
    const textData: Record<string, string> = {};
    for (const f of rawFiles) {
      if (!f.contentType || !f.contentType.startsWith('text/')) continue;
      try {
        const decoded = Buffer.from(f.fileBase64, 'base64').toString('utf8');
        const parsed = extractFromTextDocument(decoded);
        if (parsed) {
          for (const [k, v] of Object.entries(parsed)) {
            if (!(k in textData)) textData[k] = v;
          }
        }
      } catch {
        /* not parseable as text — leave to the AI */
      }
    }
    if (Object.keys(textData).length > 0) {
      return NextResponse.json({
        data: textData,
        regions: {},
        fieldsFound: Object.keys(textData).length,
      });
    }

    // Learned guidance from previous user corrections (per compagnie when known).
    const hints: { compagnie?: string } = body.hints || {};
    const guidance = await retrieveFieldCorrectionGuidance(hints.compagnie || null).catch(() => '');

    const mediaParts = rawFiles.map(f => ({
      media: { url: `data:${f.contentType || 'image/jpeg'};base64,${f.fileBase64}` }
    }));

    const { text } = await withAiRetry(() => ai.generate({
      model: 'googleai/gemini-3-flash-preview',
      config: { responseMimeType: 'application/json' },
      prompt: [
        {
          text: `Tu es un système d'extraction de données de haute précision spécialisé dans les dossiers d'expertise automobile ${DOC_MARKET.country}. Tu travailles pour un cabinet d'expertise d'assurance. La précision est CRITIQUE — toute erreur peut avoir des conséquences juridiques et financières graves.

CONTEXTE:
- Les documents traités sont des lettres de mission, constats amiables, rapports d'expertise, PV de police, factures de réparation, ${DOC_MARKET.portals}.
- Plusieurs pages/images peuvent être fournies pour un même dossier : traite-les comme un ensemble et fusionne les informations. Si une information apparaît sur une seule page, elle compte.
- ${DOC_MARKET.insurers}
- ${DOC_MARKET.plates}
- ${DOC_MARKET.brands}

TÂCHE:
Analyse minutieusement ce(s) document(s) et extrais UNIQUEMENT les informations EXPLICITEMENT présentes. Ne déduis RIEN, ne complète RIEN, ne devine RIEN.

SCHÉMA JSON STRICT — renvoie exactement cette structure, où chaque champ est un objet { value, fileIndex, box }:

- "value": la valeur extraite (string | null, ou date "YYYY-MM-DD" pour dates, ou null)
- "fileIndex": index (0-based) de l'image où tu as trouvé cette valeur (entier, ou null si value est null)
- "box": rectangle normalisé [yMin, xMin, yMax, xMax] avec des valeurs entre 0 et 1000 (convention Gemini), ou null

{
  "expertRank": { "value": "1er expert" | "2eme expert" | "Arbitre" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "dossierType": { "value": "Normale" | "Classique" | "Agrée" | "Forfait" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "nature": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "company": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuredName": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuredPhone": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "brand": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "model": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "registration": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "registrationW": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "previousRegistration": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "intermediaryName": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "intermediaryEmail": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "refExpert": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "companyRef": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "policyNumber": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "dateOfLoss": { "value": "YYYY-MM-DD" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "dateOfRequest": { "value": "YYYY-MM-DD" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "dateOfMEC": { "value": "YYYY-MM-DD" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "repairerType": { "value": "Agréé" | "Normal" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "garageName": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "adversaireAssure": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "adversaireMatricule": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "adversaireMarque": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "adversairePolice": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "adversaireCompagnie": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuredSubscriber": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuredCardHolder": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuredAddress": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "chassisNumber": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "fiscalPower": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "fuelType": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "mileage": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "vehicleNewValue": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "vehicleUsage": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "insuranceValidUntil": { "value": "YYYY-MM-DD" | null, "fileIndex": number | null, "box": [number,number,number,number] | null },
  "product": { "value": string | null, "fileIndex": number | null, "box": [number,number,number,number] | null }
}

IMPORTANT: Pour chaque champ rempli, donne la position (bounding box) aussi précise que possible autour du texte correspondant. Convention: [yMin, xMin, yMax, xMax] en coordonnées normalisées 0-1000.

INFOS SUPPLÉMENTAIRES ${DOC_MARKET.extrasHint}:
- "dateOfRequest" (Date de réception de la mission) = date à laquelle la mission a été émise/reçue par l'expert. Synonymes courants dans les documents importés: "Date de réception mission", "Date de réception", "Date de mission", "Date de création", "Date de création mission", "Date d'émission", "Date d'envoi". Tous ces libellés mappent sur \`dateOfRequest\`.
- "insuredSubscriber" (Souscripteur) = personne qui a souscrit le contrat. Format typique: "NOM Prénom" ou "Prénom NOM".
- "insuredCardHolder" (Titulaire Carte Grise) = propriétaire inscrit sur la carte grise. Peut différer du souscripteur.
- "insuredAddress" = adresse complète de l'assuré (rue, ville).
- "chassisNumber" (Numéro de chassis / VIN) = identifiant unique du véhicule (17 caractères généralement).
- "fiscalPower" (Puissance fiscale) = nombre de chevaux fiscaux, un entier (ex: "6", "7").
- "fuelType" (Combustion / Énergie / Carburant) = "Diesel", "Essence", "Hybride", "Électrique", "GPL", etc.
- "mileage" (Kilométrage / Km) = nombre de kilomètres, extrait tel quel.
- "vehicleNewValue" (Valeur à neuf / Valeur neuve) = prix d'achat neuf du véhicule (nombre, ex: "160000").
- "vehicleUsage" (Usage) = "Tourisme", "Utilitaire", "Transport public", "Location", etc.
- "insuranceValidUntil" (Date de validité / expiration de l'assurance) = format YYYY-MM-DD.
- "product" (Produit) = nom du produit d'assurance (ex: "Fidélité (Z0.1)", "AutoExpert").

RÈGLES STRICTES (ZÉRO TOLÉRANCE AUX ERREURS):
1. Renvoie UNIQUEMENT le JSON brut. Pas de markdown, pas de commentaires, pas de \`\`\`, pas de texte avant ou après.
2. DATES: Format YYYY-MM-DD uniquement. Si le document dit "15/03/2024", renvoie "2024-03-15". Si le format est ambigu (ex: 03/04/2024 pourrait être mars ou avril), ${DOC_MARKET.dateHint}.
3. NOMS DE COMPAGNIES: Copie le nom EXACT tel qu'il apparaît dans le document. Ne corrige pas l'orthographe, ne standardise pas.
4. IMMATRICULATION: Copie le format EXACT du document, caractère par caractère. Sur la carte grise, deux numéros peuvent figurer: le numéro courant ("Immatriculation" / "N° d'immatriculation" / "Numéro d'immatriculation") va dans \`registration\`; le numéro antérieur ("Immatriculation antérieure" / "Ancien numéro" / "Précédente immatriculation"), s'il est présent, va dans \`previousRegistration\`. Si un seul numéro est donné, remplis uniquement \`registration\` et laisse \`previousRegistration\` à null. \`registrationW\` reste réservé aux plaques W (transit).
5. NOMS DE PERSONNES: Copie exactement comme écrit dans le document, avec la casse originale.
6. NUMÉROS DE TÉLÉPHONE: Copie le format exact du document.
7. MARQUE & MODÈLE VÉHICULE:
   - Synonymes possibles: "Marque" peut apparaître sous "Marque", "Constructeur", "Fabricant", "Make". "Modèle" sous "Modèle", "Type", "Version", "Model".
   - IMPORTANT — forme combinée: Le véhicule est souvent écrit en une seule ligne dans un en-tête, par exemple "DACIA LOGAN", "RENAULT CLIO 4", "PEUGEOT 208", "VOLKSWAGEN GOLF 7". Dans ce cas, extraire le PREMIER mot (qui correspond à une marque connue de la liste ci-dessus) comme \`brand\`, et TOUT LE RESTE comme \`model\`.
   - Si tu reconnais une marque de la liste, extrais-la même si le document la présente en une seule chaîne.
   - Casse: Utilise le nom officiel standard (ex: "RENAULT" → "Renault", "DACIA" → "Dacia", "BMW" reste "BMW").
8. PARTIE ADVERSE: Remplis les champs adversaire UNIQUEMENT si le document contient explicitement des informations sur la partie adverse/tiers.
9. CONFIANCE: Ne remplis un champ que si tu es confiant à 90% ou plus. En cas de doute, mets null. Il vaut mieux un champ null qu'une valeur incorrecte. Exception: pour marque et modèle extraits d'un en-tête combiné, 80% suffit car ils sont vérifiables visuellement.
10. NE CONFONDS PAS les informations de l'assuré et de l'adversaire. Vérifie deux fois qui est qui.
11. "nature" fait référence à la nature du sinistre (ex: "Accident", "Vol", "Incendie", "Bris de glace", "Catastrophe naturelle").
12. "refExpert" est la référence du dossier chez l'expert, "companyRef" est la référence de la compagnie d'assurance.`
        },
        ...(guidance ? [{ text: guidance }] : []),
        ...mediaParts,
      ]
    }), { label: 'scan-document' });

    const parsed = parseAiJson<any>(text || '');
    if (!parsed.ok) {
      console.error('[scan-document] Failed to parse AI response');
      return NextResponse.json(
        { error: `Impossible de parser la réponse AI. Début: ${parsed.snippet}`, raw: parsed.cleaned },
        { status: 422 },
      );
    }
    if (parsed.repaired) {
      console.warn('[scan-document] AI response required jsonrepair fallback');
    }
    const extracted = parsed.data;

    // Normalize to { data: { key: value }, regions: { key: { fileIndex, box: {xMin,yMin,xMax,yMax} in 0-1 } } }
    // Accepts both the new wrapped shape { value, fileIndex, box } and the legacy flat shape (backward-compatible).
    const data: Record<string, any> = {};
    const regions: Record<string, { fileIndex: number; xMin: number; yMin: number; xMax: number; yMax: number }> = {};

    for (const [key, entry] of Object.entries(extracted)) {
      if (entry === null || entry === undefined) continue;
      let value: any;
      let fileIndex: number | null = null;
      let box: number[] | null = null;

      if (typeof entry === 'object' && 'value' in (entry as any)) {
        const o = entry as any;
        value = o.value;
        fileIndex = typeof o.fileIndex === 'number' ? o.fileIndex : null;
        box = Array.isArray(o.box) && o.box.length === 4 ? o.box : null;
      } else {
        value = entry;
      }

      if (value === null || value === undefined || value === '') continue;
      data[key] = value;

      if (fileIndex !== null && box) {
        // Gemini convention: [yMin, xMin, yMax, xMax] in 0-1000
        const [y0, x0, y1, x1] = box;
        regions[key] = {
          fileIndex,
          xMin: Math.max(0, Math.min(1, x0 / 1000)),
          yMin: Math.max(0, Math.min(1, y0 / 1000)),
          xMax: Math.max(0, Math.min(1, x1 / 1000)),
          yMax: Math.max(0, Math.min(1, y1 / 1000)),
        };
      }
    }

    if (typeof data.registration === 'string') data.registration = transliterateArabic(data.registration);
    if (typeof data.previousRegistration === 'string') data.previousRegistration = transliterateArabic(data.previousRegistration);

    return NextResponse.json({ data, regions, fieldsFound: Object.keys(data).length });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[/api/scan-document] Error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
