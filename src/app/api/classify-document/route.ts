import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { parseAiJson } from '@/lib/ai-json';
import { withAiRetry } from '@/lib/ai-retry';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { DOC_CLASSES, DOC_CLASS_LABELS } from '@/lib/doc-classes';
import { exampleText, formatExamplesForPrompt, retrieveSimilarExamples } from '@/lib/ai-memory';

export const maxDuration = 60;

/**
 * AI document classifier for the dossier drop box.
 *
 * 1. Describe + first-pass classification (multimodal, one call).
 * 2. Retrieve the nearest user-validated examples (RAG over ai_examples).
 * 3. If examples exist, re-classify with them as few-shot guidance.
 *
 * Returns { docType, confidence, rationale, summary, keyText, examplesUsed }.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const fileBase64: string | undefined = body.fileBase64;
    const contentType: string = body.contentType || 'application/octet-stream';
    const fileName: string = body.fileName || 'document';
    const hints: { compagnie?: string; refExpert?: string; matricule?: string } = body.hints || {};
    if (!fileBase64) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });

    const classList = DOC_CLASSES.map((c) => `- « ${c.label} » : ${c.description}`).join('\n');
    const hintText = [
      hints.compagnie ? `Compagnie du dossier : ${hints.compagnie}` : null,
      hints.refExpert ? `Référence dossier : ${hints.refExpert}` : null,
      hints.matricule ? `Immatriculation attendue : ${hints.matricule}` : null,
      `Nom du fichier : ${fileName}`,
    ].filter(Boolean).join('\n');

    // ── Pass 1: describe + preliminary class ─────────────────────────────
    const { text: t1 } = await withAiRetry(
      () =>
        ai.generate({
          model: 'googleai/gemini-3-flash-preview',
          config: { responseMimeType: 'application/json', temperature: 0.1 },
          prompt: [
            {
              text: `Tu classes des fichiers déposés dans un dossier d'expertise automobile (assurance, Maroc). Réponds en JSON strict, sans markdown.

CLASSES POSSIBLES (utilise EXACTEMENT l'un de ces libellés) :
${classList}

CONTEXTE :
${hintText}

Renvoie :
{
  "summary": string,      // ≤ 60 mots, en français : nature du document, émetteur, éléments visibles (en-têtes, tampons, tableaux, photo…)
  "keyText": string,      // ≤ 400 caractères : le texte le plus identifiant lu sur le document (titres, en-têtes, mentions « Devis », « Facture », « Ordre de mission », numéro de police…)
  "docType": string,      // un libellé de la liste
  "confidence": number,   // 0 à 1
  "rationale": string     // ≤ 25 mots : pourquoi cette classe
}

RÈGLES : « Facture Garage » exige une mention explicite de facture (numéro de facture, « Facture », TVA acquittée). Un chiffrage sans cette mention est un « Devis Garage ». Une capture d'écran de portail assureur est une « Lettre de mission ». Une photo sans texte structuré est « Photo du véhicule », sauf si elle montre clairement un compteur (« Kilométrage ») ou une plaque constructeur/VIN (« Numéro de chassis »). En cas de doute réel, baisse la confiance plutôt que d'inventer.`,
            },
            { media: { url: `data:${contentType};base64,${fileBase64}` } },
          ],
        }),
      { label: 'classify-document:describe' },
    );
    const p1 = parseAiJson<any>(t1 || '');
    if (!p1.ok) {
      return NextResponse.json({ error: 'Réponse IA illisible.', raw: p1.snippet }, { status: 422 });
    }
    const prelim = normalize(p1.data);

    // ── Pass 2: retrieve similar user-validated examples ─────────────────
    const query = exampleText(prelim.summary, prelim.keyText);
    const examples = query ? await retrieveSimilarExamples(query, 6) : [];

    let final = prelim;
    if (examples.length > 0) {
      const { text: t2 } = await withAiRetry(
        () =>
          ai.generate({
            model: 'googleai/gemini-3-flash-preview',
            config: { responseMimeType: 'application/json', temperature: 0 },
            prompt: `Tu affines la classification d'un document d'expertise automobile. Réponds en JSON strict {"docType": string, "confidence": number, "rationale": string}.

CLASSES POSSIBLES : ${DOC_CLASS_LABELS.map((l) => `« ${l} »`).join(', ')}.

DOCUMENT À CLASSER :
Résumé : ${prelim.summary}
Texte clé : ${prelim.keyText}
Première proposition de l'IA : « ${prelim.docType} » (confiance ${prelim.confidence.toFixed(2)}) — ${prelim.rationale}

${formatExamplesForPrompt(examples)}

Si un exemple corrigé ressemble fortement au document (même émetteur, mêmes mentions), suis la classe corrigée par l'utilisateur. Sinon garde la première proposition. Donne une confiance honnête.`,
          }),
        { label: 'classify-document:refine' },
      );
      const p2 = parseAiJson<any>(t2 || '');
      if (p2.ok && p2.data?.docType && DOC_CLASS_LABELS.includes(String(p2.data.docType))) {
        final = {
          ...prelim,
          docType: String(p2.data.docType),
          confidence: clamp01(Number(p2.data.confidence)),
          rationale: String(p2.data.rationale || prelim.rationale),
        };
      }
    }

    return NextResponse.json({
      docType: final.docType,
      confidence: final.confidence,
      rationale: final.rationale,
      summary: final.summary,
      keyText: final.keyText,
      prelimDocType: prelim.docType,
      examplesUsed: examples.length,
    });
  } catch (err: any) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error('[classify-document] error', err);
    return NextResponse.json({ error: err?.message || 'Erreur de classification.' }, { status: 500 });
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function normalize(d: any): { summary: string; keyText: string; docType: string; confidence: number; rationale: string } {
  const docType = DOC_CLASS_LABELS.includes(String(d?.docType)) ? String(d.docType) : 'Autre';
  return {
    summary: String(d?.summary || '').slice(0, 1200),
    keyText: String(d?.keyText || '').slice(0, 1200),
    docType,
    confidence: DOC_CLASS_LABELS.includes(String(d?.docType)) ? clamp01(Number(d?.confidence)) : 0.3,
    rationale: String(d?.rationale || '').slice(0, 300),
  };
}
