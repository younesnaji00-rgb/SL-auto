'use client';

import { getAuth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

export class ApiFetchError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown = null) {
    super(message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Client-side `fetch` wrapper that injects the current Firebase user's ID
 * token as `Authorization: Bearer <idToken>` on every request.
 *
 * Uses the same Firebase client app instance as the rest of the app via the
 * `initializeFirebase()` helper (which dedupes via `getApps()` and never
 * calls `initializeApp` twice).
 *
 * Returns the raw `Response` — callers retain full control over parsing,
 * status handling, streaming, etc.
 *
 * Throws `ApiFetchError` with status 401 if no user is currently signed in.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const { app } = initializeFirebase();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) {
    throw new ApiFetchError('Not signed in', 401);
  }

  const idToken = await user.getIdToken();

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  if (init.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...init, headers });
}
