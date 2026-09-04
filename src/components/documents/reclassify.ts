'use client';

/**
 * Reclassify a document by dragging it from one socket to another — the
 * user's correction of the AI's placement.
 *
 *  - Target EMPTY  → MOVE: every page (doc) of the source type takes the
 *    target type.
 *  - Target FILLED → SWAP: the two documents exchange types wholesale
 *    (multi-page slots swap all their pages).
 *
 * One Firestore batch, one historique line, and — for every page the
 * SmartInbox had classified (`aiSuggestedType`) — one non-fatal POST to
 * `/api/classify-feedback` so the classifier learns from the correction.
 */

import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { apiFetch } from '@/lib/api-fetch';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { docDisplayName, type TypedDoc } from './typed-doc';

export interface ReclassifyArgs {
  db: Firestore;
  dossierId: string;
  /** Type the dragged document currently has. */
  sourceType: string;
  /** Slot type it was dropped on. */
  targetType: string;
  /** Every doc (page) of `sourceType`. */
  sourceDocs: TypedDoc[];
  /** Every doc (page) currently in the target slot — empty → move, else swap. */
  targetDocs: TypedDoc[];
  userEmail: string;
  userName?: string;
  compagnie?: string | null;
}

export interface ReclassifyResult {
  mode: 'move' | 'swap';
  /** Number of Firestore docs whose `type` changed. */
  updated: number;
}

async function sendFeedback(
  dossierId: string,
  d: TypedDoc,
  corrected: string,
  compagnie: string | null | undefined,
): Promise<void> {
  const predicted = (d.aiSuggestedType || '').trim();
  if (!predicted) return;
  try {
    await apiFetch('/api/classify-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId,
        docId: d.id,
        fileName: docDisplayName(d),
        summary: d.aiSummary ?? '',
        keyText: '',
        predicted,
        corrected,
        confidence: typeof d.aiConfidence === 'number' ? d.aiConfidence : null,
        kind: predicted === corrected ? 'confirmation' : 'correction',
        compagnie: compagnie ?? null,
      }),
    });
  } catch (err) {
    console.warn('[reclassify] classify-feedback failed (non-fatal)', err);
  }
}

export async function reclassifyDocuments(args: ReclassifyArgs): Promise<ReclassifyResult> {
  const { db, dossierId, sourceType, targetType, sourceDocs, targetDocs, userEmail, userName, compagnie } = args;
  if (!sourceType || !targetType || sourceType === targetType || sourceDocs.length === 0) {
    return { mode: 'move', updated: 0 };
  }
  const swap = targetDocs.length > 0;
  const stamp = { classifiedBy: 'user', classifiedAt: serverTimestamp() };

  const batch = writeBatch(db);
  for (const d of sourceDocs) {
    batch.update(doc(db, 'dossiers', dossierId, 'documents', d.id), { type: targetType, ...stamp });
  }
  if (swap) {
    for (const d of targetDocs) {
      batch.update(doc(db, 'dossiers', dossierId, 'documents', d.id), { type: sourceType, ...stamp });
    }
  }
  await batch.commit();

  await logHistorique(
    db,
    dossierId,
    swap ? 'Documents échangés' : 'Document reclassé',
    userEmail,
    swap
      ? `Documents échangés : ${sourceType} ↔ ${targetType}.`
      : `Document reclassé : ${sourceType} → ${targetType}.`,
    'document',
    userName,
  ).catch((err) => console.warn('[reclassify] historique failed (non-fatal)', err));

  // Learning loop — fire-and-forget, never blocks the UI.
  void Promise.allSettled([
    ...sourceDocs.map((d) => sendFeedback(dossierId, d, targetType, compagnie)),
    ...(swap ? targetDocs.map((d) => sendFeedback(dossierId, d, sourceType, compagnie)) : []),
  ]);

  return { mode: swap ? 'swap' : 'move', updated: sourceDocs.length + (swap ? targetDocs.length : 0) };
}
