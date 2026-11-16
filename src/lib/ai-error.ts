/**
 * What an AI route tells the user when the model call fails.
 *
 * QA bug 070 (2026-10-26): the plate scanner showed Google's raw error
 * (« UNKNOWN: … 402 Payment Required … ») to the agent. The raw text stays in
 * the server log; the screen gets one French sentence.
 *
 * `unavailable` = the AI service itself is out of reach for now (no credit,
 * quota, key refused, overloaded, network) — nothing the user can fix by
 * taking another photo. `failed` = anything else.
 */

export type AiFailureKind = 'unavailable' | 'failed';

const UNAVAILABLE_STATUSES = new Set([
  'UNAVAILABLE',
  'RESOURCE_EXHAUSTED',
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
  'DEADLINE_EXCEEDED',
]);

const UNAVAILABLE_PATTERNS: RegExp[] = [
  /\b402\b/,
  /payment required/i,
  /billing/i,
  /credits?\b/i,
  /prepa(id|y)/i,
  /\b429\b/,
  /quota/i,
  /rate limit/i,
  /resource[_ ]exhausted/i,
  /\b40[13]\b/,
  /api key/i,
  /permission[_ ]denied/i,
  /\b50[0234]\b/,
  /unavailable/i,
  /overloaded/i,
  /high demand/i,
  /deadline/i,
  /timed? ?out/i,
  /fetch failed/i,
  /ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/,
];

export function classifyAiError(err: unknown): AiFailureKind {
  if (!err || typeof err !== 'object') {
    return typeof err === 'string' && UNAVAILABLE_PATTERNS.some((re) => re.test(err)) ? 'unavailable' : 'failed';
  }
  const e = err as { status?: unknown; code?: unknown; message?: unknown; originalMessage?: unknown };
  if (typeof e.status === 'string' && UNAVAILABLE_STATUSES.has(e.status)) return 'unavailable';
  if (typeof e.code === 'number' && (e.code === 401 || e.code === 402 || e.code === 403 || e.code === 429 || e.code >= 500)) {
    return 'unavailable';
  }
  const text = `${String(e.message ?? '')} ${String(e.originalMessage ?? '')}`;
  return UNAVAILABLE_PATTERNS.some((re) => re.test(text)) ? 'unavailable' : 'failed';
}

/**
 * The plate scanner's two messages. The flow is scan-only (owner ruling
 * 2026-07-07: no typed plate), so the way on is the mission list.
 */
export const PLATE_SCAN_MESSAGES: Record<AiFailureKind, string> = {
  unavailable: 'Le scan est momentanément indisponible. Réessayez plus tard, ou ouvrez la mission depuis la liste des missions.',
  failed: 'La lecture de la photo a échoué. Reprenez la photo, ou ouvrez la mission depuis la liste des missions.',
};
