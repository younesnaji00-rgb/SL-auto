/**
 * Service-worker URL with the active Firebase config in the query string.
 *
 * public/firebase-messaging-sw.js cannot read process.env at runtime, so
 * white-label deployments pass their project config as query params; the SW
 * falls back to the original production project when none are given.
 */
export function messagingSwUrl(): string {
  const params = new URLSearchParams();
  const pairs: Array<[string, string | undefined]> = [
    ['apiKey', process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
    ['authDomain', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ['projectId', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ['storageBucket', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
    ['messagingSenderId', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
    ['appId', process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
  ];
  for (const [k, v] of pairs) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/firebase-messaging-sw.js?${qs}` : '/firebase-messaging-sw.js';
}
