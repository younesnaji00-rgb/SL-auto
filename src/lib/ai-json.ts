import { jsonrepair } from 'jsonrepair';

/**
 * Resilient parser for Gemini / LLM JSON responses.
 *
 * LLMs occasionally emit valid-looking JSON with quirks that break
 * `JSON.parse`: trailing commas, smart quotes, line comments, prose
 * before the opening brace, leftover code fences, or a truncated tail
 * when the response hits the token cap. This helper layers cleanup
 * passes and falls back to the `jsonrepair` library before giving up,
 * so a single misplaced comma no longer blanks an entire scan.
 *
 * Usage:
 *   const result = parseAiJson(rawText);
 *   if (!result.ok) return 422 with result.snippet for diagnostics.
 *   const data = result.data;
 */
export type ParseAiJsonResult<T = unknown> =
  | { ok: true; data: T; repaired: boolean }
  | { ok: false; cleaned: string; snippet: string; error: string };

export function parseAiJson<T = unknown>(raw: string): ParseAiJsonResult<T> {
  const cleaned = stripFences(raw);
  const sliced = sliceToJsonRegion(cleaned);

  try {
    return { ok: true, data: JSON.parse(sliced) as T, repaired: false };
  } catch {
    /* fall through to repair */
  }

  try {
    const repaired = jsonrepair(sliced);
    return { ok: true, data: JSON.parse(repaired) as T, repaired: true };
  } catch (err) {
    const snippet = sliced.length > 500 ? sliced.slice(0, 500) + '…' : sliced;
    return {
      ok: false,
      cleaned: sliced,
      snippet,
      error: err instanceof Error ? err.message : 'unknown JSON error',
    };
  }
}

function stripFences(raw: string): string {
  return (raw || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function sliceToJsonRegion(text: string): string {
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const candidates = [firstObj, firstArr].filter((i) => i >= 0);
  if (candidates.length === 0) return text;
  const start = Math.min(...candidates);
  const lastObj = text.lastIndexOf('}');
  const lastArr = text.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end <= start) return text.slice(start);
  return text.slice(start, end + 1);
}
