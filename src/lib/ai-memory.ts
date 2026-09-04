import 'server-only';

/**
 * AI memory — the retrieval layer that lets the document classifier and the
 * field extractor learn from what users upload and correct.
 *
 * Two stores (written by the server with the Admin SDK, never by clients):
 *
 *   ai_examples            — one doc per classified file the user confirmed,
 *                            corrected or labelled by hand. Holds a short
 *                            summary + the most identifying text + a 768-d
 *                            embedding. Retrieved by vector similarity and
 *                            injected as few-shot examples when classifying.
 *
 *   ai_field_corrections   — one doc per field the user changed after an AI
 *                            pre-fill (field, before → after, compagnie).
 *                            Aggregated per compagnie into prompt guidance for
 *                            /api/scan-document.
 *
 * Vector search needs a Firestore vector index on `ai_examples.embedding`
 * (see firestore.indexes.json). Until it is deployed, retrieval falls back to
 * the most recent examples so the feature degrades gracefully.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

export const EMBED_DIMS = 768; // Firestore vectors max out at 2048; 768 keeps docs small.
const EMBEDDER = googleAI.embedder('gemini-embedding-001');

export interface AiExample {
  id: string;
  docType: string;
  predicted: string | null;
  kind: 'correction' | 'confirmation' | 'manual';
  summary: string;
  keyText: string;
  fileName?: string;
  distance?: number;
  at?: Date | null;
}

export interface FieldCorrection {
  field: string;
  before: string | null;
  after: string | null;
  compagnie?: string | null;
  count: number;
}

export async function embedText(text: string): Promise<number[]> {
  const clean = (text || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
  if (!clean) return [];
  const res = await ai.embed({
    embedder: EMBEDDER,
    content: clean,
    options: { outputDimensionality: EMBED_DIMS, taskType: 'RETRIEVAL_DOCUMENT' } as any,
  });
  const first = Array.isArray(res) ? res[0] : (res as any);
  const vec: number[] = first?.embedding ?? [];
  return vec.length > EMBED_DIMS ? vec.slice(0, EMBED_DIMS) : vec;
}

export function exampleText(summary: string, keyText: string): string {
  return `${summary || ''}\n${keyText || ''}`.trim();
}

export async function storeExample(input: {
  docType: string;
  predicted: string | null;
  kind: AiExample['kind'];
  summary: string;
  keyText: string;
  fileName?: string;
  confidence?: number | null;
  dossierId?: string;
  docId?: string;
  uid?: string;
  compagnie?: string | null;
}): Promise<string> {
  const db = adminDb();
  const text = exampleText(input.summary, input.keyText);
  let embedding: number[] = [];
  try {
    embedding = await embedText(text);
  } catch (err) {
    console.warn('[ai-memory] embedding failed; storing example without vector', err);
  }
  const ref = db.collection('ai_examples').doc();
  await ref.set({
    docType: input.docType,
    predicted: input.predicted ?? null,
    kind: input.kind,
    summary: (input.summary || '').slice(0, 1200),
    keyText: (input.keyText || '').slice(0, 1200),
    fileName: input.fileName ?? null,
    confidence: typeof input.confidence === 'number' ? input.confidence : null,
    dossierId: input.dossierId ?? null,
    docId: input.docId ?? null,
    uid: input.uid ?? null,
    compagnie: input.compagnie ?? null,
    ...(embedding.length ? { embedding: FieldValue.vector(embedding), dims: embedding.length } : {}),
    at: Timestamp.now(),
  });
  return ref.id;
}

/**
 * Nearest examples for a query text. Vector search first; if the index is not
 * deployed yet (or embedding fails) fall back to the latest examples so the
 * classifier still benefits from recent corrections.
 */
export async function retrieveSimilarExamples(queryText: string, k = 6): Promise<AiExample[]> {
  const db = adminDb();
  const col = db.collection('ai_examples');
  let vec: number[] = [];
  try {
    vec = await embedText(queryText);
  } catch (err) {
    console.warn('[ai-memory] query embedding failed', err);
  }
  if (vec.length) {
    try {
      const snap = await (col as any)
        .findNearest({
          vectorField: 'embedding',
          queryVector: FieldValue.vector(vec),
          limit: k,
          distanceMeasure: 'COSINE',
          distanceResultField: 'vector_distance',
        })
        .get();
      return snap.docs.map((d: any) => toExample(d.id, d.data()));
    } catch (err) {
      console.warn('[ai-memory] vector search unavailable (index missing?) — falling back to recent examples', err);
    }
  }
  try {
    const snap = await col.orderBy('at', 'desc').limit(k * 3).get();
    // Prefer corrections (they carry the most signal), then most recent.
    return snap.docs
      .map((d) => toExample(d.id, d.data()))
      .sort((a, b) => (a.kind === 'correction' ? -1 : 0) - (b.kind === 'correction' ? -1 : 0))
      .slice(0, k);
  } catch (err) {
    console.warn('[ai-memory] fallback retrieval failed', err);
    return [];
  }
}

function toExample(id: string, data: FirebaseFirestore.DocumentData): AiExample {
  return {
    id,
    docType: data.docType,
    predicted: data.predicted ?? null,
    kind: data.kind ?? 'confirmation',
    summary: data.summary ?? '',
    keyText: data.keyText ?? '',
    fileName: data.fileName ?? undefined,
    distance: typeof data.vector_distance === 'number' ? data.vector_distance : undefined,
    at: data.at?.toDate?.() ?? null,
  };
}

/** Few-shot block for the classification prompt. */
export function formatExamplesForPrompt(examples: AiExample[]): string {
  if (examples.length === 0) return '';
  const lines = examples.map((e, i) => {
    const tag = e.kind === 'correction' ? `(CORRIGÉ par un utilisateur — l'IA avait proposé « ${e.predicted ?? '?'} »)` : e.kind === 'manual' ? '(classé à la main par un utilisateur)' : '(confirmé par un utilisateur)';
    return `Exemple ${i + 1} ${tag}\n  Résumé : ${e.summary}\n  Texte clé : ${e.keyText}\n  → Classe correcte : ${e.docType}`;
  });
  return `EXEMPLES ISSUS DES CORRECTIONS PRÉCÉDENTES DES UTILISATEURS (à imiter en priorité quand le document ressemble) :\n${lines.join('\n')}`;
}

export async function storeFieldCorrections(input: {
  dossierId: string;
  compagnie?: string | null;
  uid?: string;
  corrections: { field: string; before: unknown; after: unknown }[];
}): Promise<number> {
  const db = adminDb();
  const batch = db.batch();
  let n = 0;
  for (const c of input.corrections) {
    if (!c.field) continue;
    const before = normalizeValue(c.before);
    const after = normalizeValue(c.after);
    if (before === after) continue;
    const ref = db.collection('ai_field_corrections').doc();
    batch.set(ref, {
      field: c.field,
      before,
      after,
      compagnie: input.compagnie ?? null,
      dossierId: input.dossierId,
      uid: input.uid ?? null,
      at: Timestamp.now(),
    });
    n++;
  }
  if (n > 0) await batch.commit();
  return n;
}

function normalizeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && v !== null && typeof (v as any).toDate === 'function') {
    return (v as any).toDate().toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  return s.length ? s.slice(0, 200) : null;
}

/**
 * Recent field corrections (optionally scoped to a compagnie), aggregated by
 * (field, before → after). Returned as prompt guidance lines.
 */
export async function retrieveFieldCorrectionGuidance(compagnie?: string | null, limit = 60): Promise<string> {
  const db = adminDb();
  try {
    let q: FirebaseFirestore.Query = db.collection('ai_field_corrections').orderBy('at', 'desc').limit(limit);
    const snap = await q.get();
    const rows = snap.docs.map((d) => d.data());
    const scoped = compagnie ? rows.filter((r) => !r.compagnie || String(r.compagnie).toLowerCase() === compagnie.toLowerCase()) : rows;
    if (scoped.length === 0) return '';
    const agg = new Map<string, FieldCorrection>();
    for (const r of scoped) {
      const key = `${r.field}|${r.before}|${r.after}`;
      const cur = agg.get(key);
      if (cur) cur.count++;
      else agg.set(key, { field: r.field, before: r.before ?? null, after: r.after ?? null, compagnie: r.compagnie ?? null, count: 1 });
    }
    const top = Array.from(agg.values()).sort((a, b) => b.count - a.count).slice(0, 20);
    const lines = top.map((c) => `- Champ « ${c.field} » : l'IA avait extrait « ${c.before ?? '∅'} », l'utilisateur a corrigé en « ${c.after ?? '∅'} »${c.count > 1 ? ` (${c.count} fois)` : ''}${c.compagnie ? ` [compagnie : ${c.compagnie}]` : ''}`);
    return `RETOURS DES UTILISATEURS SUR LES EXTRACTIONS PRÉCÉDENTES (applique ces corrections si le même cas se présente ; ne change rien sinon) :\n${lines.join('\n')}`;
  } catch (err) {
    console.warn('[ai-memory] field-correction retrieval failed', err);
    return '';
  }
}
