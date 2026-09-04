'use client';

import { useEffect } from 'react';
import { messagingSwUrl } from '@/firebase/sw-url';

/**
 * Registers the combined FCM + PWA service worker as early as possible so the
 * browser sees the app as installable on first visit (otherwise the install
 * prompt only appears after the user logs in and `use-fcm-registration`
 * eventually runs). Registering the same URL twice is a no-op — the browser
 * returns the existing registration.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Skip in development — Next.js dev server + SW caching is a recipe for
    // stale-asset confusion. PWA install criteria only need to pass in prod.
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register(messagingSwUrl())
        .catch((err) => console.warn('[pwa] SW registration failed:', err));
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
