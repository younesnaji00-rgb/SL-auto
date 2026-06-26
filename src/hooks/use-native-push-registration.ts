'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';

/**
 * Native (Capacitor Android) push registration for the Agent de Terrain.
 *
 * The web `useFcmRegistration` obtains an FCM token through the Firebase JS SDK
 * + a service worker + the Web Push API. The Android System WebView that the
 * Capacitor shell runs in does NOT implement Web Push, so that path silently
 * yields no token there. The result: the `sendLocationRequestNotification`
 * Cloud Function reads `users/{uid}.fcmTokens` and finds it empty, so the agent
 * never receives the "Demande de position" notification while the app is
 * cleared from the background / the screen is locked.
 *
 * This hook is the native counterpart. It uses `@capacitor/push-notifications`
 * to obtain the device's *native* FCM token and stores it in the SAME
 * `users/{uid}.fcmTokens` array the Cloud Function already reads — so the
 * backend and the gestionnaire request flow need no changes. When the agent
 * taps the notification, Android brings the app to the foreground; the
 * `location_requests` listener in `useGpsPublisher` then publishes a fresh
 * fix, and `useNativeBgGeolocation` re-arms the foreground tracking service.
 *
 * On the web (browser / PWA) this is an inert no-op — `useFcmRegistration`
 * owns that path. The plugin is imported dynamically and only after the
 * native-platform guard, so it is never loaded or executed on the web.
 */
export function useNativePushRegistration() {
  const db = useFirestore();
  const { firebaseUser } = useCurrentUser();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!db || !firebaseUser?.uid) return;
    if (
      typeof Capacitor?.isNativePlatform !== 'function' ||
      !Capacitor.isNativePlatform()
    ) {
      return;
    }

    const uid = firebaseUser.uid;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Android 13+ requires a runtime prompt for POST_NOTIFICATIONS.
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        if (cancelled || perm.receive !== 'granted') return;

        // `registration` fires with the device's native FCM token. Persist it
        // where the Cloud Function looks for it (same array the web SDK uses,
        // so multiple devices / a web + app pair accumulate cleanly).
        const regHandle = await PushNotifications.addListener('registration', (token) => {
          if (cancelled || !token?.value) return;
          void setDoc(
            doc(db, 'users', uid),
            { fcmTokens: arrayUnion(token.value) },
            { merge: true },
          ).catch((err) =>
            console.warn('[use-native-push-registration] token store failed:', err),
          );
        });
        cleanups.push(() => void regHandle.remove());

        const errHandle = await PushNotifications.addListener('registrationError', (err) => {
          console.warn('[use-native-push-registration] registration error:', err?.error);
        });
        cleanups.push(() => void errHandle.remove());

        // Tapping the notification cold-starts / foregrounds the WebView, which
        // is enough: `useGpsPublisher`'s `location_requests` listener fires the
        // one-shot position push on mount. We keep the listener for visibility
        // and so future deep-link routing can hook in here.
        const actionHandle = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const type = (action?.notification?.data as any)?.type;
            console.info('[use-native-push-registration] notification tapped', { type });
          },
        );
        cleanups.push(() => void actionHandle.remove());

        await PushNotifications.register();
      } catch (err) {
        console.warn('[use-native-push-registration] setup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [db, firebaseUser?.uid]);
}
