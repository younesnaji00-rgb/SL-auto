'use client';

import { useEffect } from 'react';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useFirestore } from '@/firebase';
import { getMessagingIfSupported } from '@/firebase/messaging';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';

export function useFcmRegistration() {
  const app = useFirebaseApp();
  const db = useFirestore();
  const { firebaseUser } = useCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!app || !db || !firebaseUser?.uid) return;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[use-fcm-registration] NEXT_PUBLIC_FIREBASE_VAPID_KEY missing');
      return;
    }

    let cancelled = false;
    let unsubscribeForeground: (() => void) | null = null;

    (async () => {
      try {
        const messaging = await getMessagingIfSupported(app);
        if (!messaging || cancelled) return;

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        if (cancelled) return;

        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          if (cancelled) return;
          if (result !== 'granted') return;
        } else if (Notification.permission !== 'granted') {
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (cancelled || !token) return;

        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          { fcmTokens: arrayUnion(token) },
          { merge: true },
        );

        unsubscribeForeground = onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title || 'Notification',
            description: payload.notification?.body || '',
          });
        });
      } catch (err) {
        console.warn('[use-fcm-registration] setup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [app, db, firebaseUser?.uid, toast]);
}
