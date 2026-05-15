import type { FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

let cached: Messaging | null | undefined;

/**
 * Returns a Messaging instance, or null if push messaging isn't supported in
 * the current browser (e.g. iOS Safari without the site being added to the
 * home screen, older Firefox, no service worker support).
 */
export async function getMessagingIfSupported(app: FirebaseApp): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (cached !== undefined) return cached;
  try {
    const supported = await isSupported();
    cached = supported ? getMessaging(app) : null;
  } catch {
    cached = null;
  }
  return cached;
}
