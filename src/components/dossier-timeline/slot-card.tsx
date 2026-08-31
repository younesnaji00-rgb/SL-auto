'use client';

/**
 * Compatibility shim — the slot-card grid was replaced by the structured
 * document list (`@/components/documents/document-list` + `typed-slot-row`).
 * External importers (assignations-chiffrage, session replay) only ever used
 * the `TypedDoc` / `ExtraSlotKind` types and the `isImage` / `isPdf` helpers,
 * which now live in `@/components/documents/typed-doc` and are re-exported
 * here so existing imports keep compiling.
 */

export {
  isImage,
  isPdf,
  type ExtraSlotKind,
  type TypedDoc,
} from '@/components/documents/typed-doc';
