import type { CounterMatch, CounterUnmatched } from './scan-devis-counter-schema';

/**
 * Normalize a designation for matching: lowercase, strip diacritics, drop
 * non-alphanumerics (keep digits — useful for part codes), collapse spaces.
 */
export function normalizeDesignation(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance between two strings. Iterative DP, O(m*n). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Similarity ratio in [0, 1] derived from Levenshtein distance. */
function similarity(a: string, b: string): number {
  const na = normalizeDesignation(a);
  const nb = normalizeDesignation(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

/**
 * Match each incoming (designation, counterPrice) against existing rows.
 * Exact-normalized match wins; falls back to Levenshtein similarity ≥ 0.7.
 * Each existing row can be matched at most once.
 */
export function matchRows(
  existing: Array<{ id: string; designation: string }>,
  incoming: Array<{ designation: string; counterPrice: number | null; confidence?: number }>
): { matches: CounterMatch[]; unmatched: CounterUnmatched[] } {
  const normalizedExisting = existing.map((r) => ({
    id: r.id,
    designation: r.designation,
    normalized: normalizeDesignation(r.designation),
  }));

  const matches: CounterMatch[] = [];
  const unmatched: CounterUnmatched[] = [];
  const usedIds = new Set<string>();

  // Emit matches for every existing row so callers can render blanks consistently.
  const perRowBest = new Map<string, { incomingIdx: number; score: number }>();

  for (let i = 0; i < incoming.length; i++) {
    const inc = incoming[i];
    const normInc = normalizeDesignation(inc.designation);
    if (!normInc) continue;

    // Try exact normalized match first.
    let bestId: string | null = null;
    let bestScore = 0;
    for (const ex of normalizedExisting) {
      if (usedIds.has(ex.id)) continue;
      if (ex.normalized === normInc) {
        bestId = ex.id;
        bestScore = 1;
        break;
      }
    }

    if (!bestId) {
      for (const ex of normalizedExisting) {
        if (usedIds.has(ex.id)) continue;
        const s = similarity(inc.designation, ex.designation);
        if (s > bestScore) {
          bestScore = s;
          bestId = ex.id;
        }
      }
      if (bestScore < 0.7) bestId = null;
    }

    if (bestId) {
      const prev = perRowBest.get(bestId);
      if (!prev || bestScore > prev.score) {
        perRowBest.set(bestId, { incomingIdx: i, score: bestScore });
      }
    } else if (inc.counterPrice != null) {
      unmatched.push({ designation: inc.designation, counterPrice: inc.counterPrice });
    }
  }

  // Build the final matches: one entry per existing row.
  for (const ex of existing) {
    const hit = perRowBest.get(ex.id);
    if (hit) {
      const inc = incoming[hit.incomingIdx];
      usedIds.add(ex.id);
      matches.push({
        rowId: ex.id,
        designation: ex.designation,
        counterPrice: inc.counterPrice ?? null,
        confidence: Math.min(hit.score, inc.confidence ?? hit.score),
      });
    } else {
      matches.push({
        rowId: ex.id,
        designation: ex.designation,
        counterPrice: null,
        confidence: 0,
      });
    }
  }

  // Any incoming entries whose best match was displaced by a better one go to unmatched.
  const winningIncomingIdx = new Set(Array.from(perRowBest.values()).map((v) => v.incomingIdx));
  for (let i = 0; i < incoming.length; i++) {
    if (winningIncomingIdx.has(i)) continue;
    const inc = incoming[i];
    if (inc.counterPrice != null && !unmatched.some((u) => u.designation === inc.designation && u.counterPrice === inc.counterPrice)) {
      unmatched.push({ designation: inc.designation, counterPrice: inc.counterPrice });
    }
  }

  return { matches, unmatched };
}
