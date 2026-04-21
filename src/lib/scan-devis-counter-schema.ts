import { z } from 'zod';

/**
 * Shared schema for the /api/scan-devis-counter extraction output.
 *
 * The route takes a marked-up devis (printed prices + handwritten / MS-Paint
 * counter-prices layered on top) and, for each row designation the caller
 * provides, returns the counter-proposal price the annotator wrote — or null
 * when no annotation is visible.
 */

export const CounterMatch = z.object({
  rowId: z.string(),
  designation: z.string(),
  counterPrice: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});
export type CounterMatch = z.infer<typeof CounterMatch>;

export const CounterUnmatched = z.object({
  designation: z.string(),
  counterPrice: z.number(),
});
export type CounterUnmatched = z.infer<typeof CounterUnmatched>;

export const CounterTotals = z.object({
  ht: z.number().nullable(),
  ttc: z.number().nullable(),
});
export type CounterTotals = z.infer<typeof CounterTotals>;

export const ScanDevisCounterOutput = z.object({
  matches: z.array(CounterMatch),
  unmatched: z.array(CounterUnmatched),
  totalHandwritten: CounterTotals.nullable(),
});
export type ScanDevisCounterOutput = z.infer<typeof ScanDevisCounterOutput>;

/** Shape Gemini is asked to return — before server-side rowId binding. */
export const GeminiRawOutput = z.object({
  matches: z.array(
    z.object({
      designation: z.string(),
      counterPrice: z.number().nullable(),
      confidence: z.number().min(0).max(1).default(0.5),
    })
  ),
  unmatched: z.array(
    z.object({
      designation: z.string(),
      counterPrice: z.number(),
    })
  ).default([]),
  totalHandwritten: CounterTotals.nullable().default(null),
});
export type GeminiRawOutput = z.infer<typeof GeminiRawOutput>;
