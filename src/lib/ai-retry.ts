/**
 * Retry-with-backoff wrapper for Gemini / genkit `ai.generate(...)` calls.
 *
 * Gemini's free tier returns transient 503 ("This model is currently
 * experiencing high demand") on bursty load. These windows usually clear
 * within a few seconds — observed behaviour is "first call 503s after ~45s,
 * second call 200s right after". A short backoff retry catches the next
 * quiet moment without manual intervention.
 *
 * Retry only on:
 *   - HTTP 5xx (503 UNAVAILABLE, 502, 504, etc.)
 *   - HTTP 429 RESOURCE_EXHAUSTED (rate limit)
 *   - genkit `status === 'UNAVAILABLE'` / `'RESOURCE_EXHAUSTED'`
 *   - error messages containing "overloaded", "high demand", "503", etc.
 *
 * Do NOT retry 4xx other than 429 — they won't fix themselves (bad key,
 * deprecated model, malformed prompt). The route's existing parser-failure
 * 422 handling stays in place.
 */

const RETRY_DELAYS_MS = [1000, 3000, 9000] as const;
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // 4 total: initial + 3 retries

export async function withAiRetry<T>(
  fn: () => Promise<T>,
  options?: { label?: string },
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === MAX_ATTEMPTS - 1;
      if (isLast || !isRetryable(err)) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      const label = options?.label ? `:${options.label}` : '';
      console.warn(
        `[ai-retry${label}] attempt ${attempt + 1}/${MAX_ATTEMPTS} failed (${describeError(err)}), retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: unknown; code?: unknown; message?: unknown; originalMessage?: unknown };
  if (e.status === 'UNAVAILABLE' || e.status === 'RESOURCE_EXHAUSTED') return true;
  if (typeof e.code === 'number' && (e.code >= 500 || e.code === 429)) return true;
  const msg = String(e.message ?? e.originalMessage ?? '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('rate limit') ||
    msg.includes('quota exceeded')
  );
}

function describeError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof e.code === 'number' || typeof e.code === 'string') {
    return `${e.status || 'ERR'} ${e.code}`;
  }
  return String(e.message ?? 'unknown error');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
