/**
 * Where a queued upload stands (owner choice 2026-10-05, option 2): an upload
 * the queue gave up on is shown as NOT SENT, with « Réessayer » and
 * « Supprimer », instead of being counted forever as « en cours d'envoi ».
 *
 * Pure helpers — no IndexedDB, no Firebase — so the rules are testable.
 */

/** Automatic attempts before the queue gives up and asks the user. */
export const MAX_UPLOAD_ATTEMPTS = 5;

/** Wait before the next automatic attempt: 30 s, 1, 2, 4 min, never more than 5. */
export function retryDelayMs(failedAttempts: number): number {
  const n = Math.max(1, failedAttempts);
  return Math.min(30_000 * 2 ** (n - 1), 5 * 60_000);
}

/** The queue gave up on this upload: only the user can retry or drop it. */
export function hasGivenUp(item: { retryCount: number }): boolean {
  return item.retryCount >= MAX_UPLOAD_ATTEMPTS;
}

/** `dossiers/{id}/documents` → `{id}`; null for any other path. */
export function dossierIdOfPath(path: string | undefined | null): string | null {
  const m = /^dossiers\/([^/]+)\//.exec(path ?? '');
  return m ? m[1] : null;
}

/**
 * Why the file did not go, in words the user can act on. `reason` is a French
 * sentence (a `t()` key); `detail` carries the raw message when no sentence
 * fits.
 */
export function describeUploadFailure(item: { lastErrorCode?: string; lastError?: string }): {
  reason: string;
  detail?: string;
} {
  const code = item.lastErrorCode ?? '';
  if (code === 'storage/unauthorized' || code === 'permission-denied') {
    return { reason: 'Le serveur a refusé ce fichier.' };
  }
  if (code === 'storage/quota-exceeded') {
    return { reason: 'L’espace de stockage du serveur est plein.' };
  }
  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'storage/canceled' ||
    code === 'unavailable' ||
    /network|failed to fetch/i.test(item.lastError ?? '')
  ) {
    return { reason: 'La connexion a coupé pendant l’envoi.' };
  }
  // Items queued before the reason was recorded, or an error with no code.
  if (!item.lastError) return { reason: 'L’envoi a échoué plusieurs fois.' };
  return { reason: 'L’envoi a échoué.', detail: item.lastError };
}
