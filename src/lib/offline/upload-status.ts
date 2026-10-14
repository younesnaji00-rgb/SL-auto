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
export function describeUploadFailure(item: {
  lastErrorCode?: string;
  lastError?: string;
  lastAttemptAt?: number;
}): {
  reason: string;
  detail?: string;
} {
  const code = item.lastErrorCode ?? '';
  const msg = item.lastError ?? '';
  if (code === 'storage/unauthenticated' || code === 'unauthenticated' || code === 'storage/unauthorized-app') {
    return { reason: 'La session de cet appareil n’était plus valide. Reconnectez-vous puis réessayez.' };
  }
  if (code === 'storage/unauthorized') {
    return { reason: 'Le stockage a refusé ce fichier (droits insuffisants pour ce compte).' };
  }
  if (code === 'permission-denied') {
    return { reason: 'Le serveur a refusé d’enregistrer ce fichier dans le dossier (droits insuffisants pour ce compte).' };
  }
  if (code === 'storage/quota-exceeded' || code === 'resource-exhausted') {
    return { reason: 'L’espace de stockage du serveur est plein.' };
  }
  if (code === 'storage/canceled') {
    return { reason: 'L’envoi a été interrompu (application fermée ou page rechargée).' };
  }
  if (code === 'storage/server-file-wrong-size' || code === 'storage/invalid-checksum') {
    return { reason: 'Le fichier est arrivé incomplet sur le serveur.' };
  }
  if (/NotFoundError|NotReadableError|WebKitBlobResource|could not be read/i.test(msg)) {
    return { reason: 'Le fichier n’est plus lisible sur cet appareil (mémoire du navigateur vidée).' };
  }
  if (
    code === 'storage/retry-limit-exceeded' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    /network|failed to fetch|offline/i.test(msg)
  ) {
    return { reason: 'La connexion a coupé pendant l’envoi (réseau trop faible ou sans internet).' };
  }
  // Abandoned by the version before 2026-10-12, which kept no reason and no
  // attempt time — five quick tries on a dead connection were enough then.
  if (!msg && !code && !item.lastAttemptAt) {
    return { reason: 'Abandonné par l’ancienne version de l’application (avant le 12/10), qui n’enregistrait pas la raison.' };
  }
  if (!msg) return { reason: 'L’envoi a échoué plusieurs fois.', detail: code || undefined };
  return { reason: 'L’envoi a échoué.', detail: code ? `${msg} (${code})` : msg };
}
