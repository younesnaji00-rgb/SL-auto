// Combined service worker:
//   1. Firebase Cloud Messaging background handler (Firebase SDK looks for
//      this file at /firebase-messaging-sw.js).
//   2. PWA install + offline-navigation fallback so the app passes
//      installability checks and shows a branded screen when offline.
//
// Scope: '/' (registered from src/hooks/use-fcm-registration.ts and
// src/components/pwa-register.tsx).

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCVP_zYN5n2MI-tXjbcknQS1DGqOHCYZ2U',
  authDomain: 'studio-9568416614-6523a.firebaseapp.com',
  projectId: 'studio-9568416614-6523a',
  storageBucket: 'studio-9568416614-6523a.firebasestorage.app',
  messagingSenderId: '588304904574',
  appId: '1:588304904574:web:26b8dd1d7f19241c7c832f',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Notification';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL('/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

// ---------------------------------------------------------------------------
// PWA install + offline navigation fallback
// ---------------------------------------------------------------------------

// Bump this string whenever offline.html or the precache set changes — the
// browser only re-runs `install` if the SW file content differs.
const SW_VERSION = 'sl-auto-pwa-v2';
const PRECACHE = `${SW_VERSION}-precache`;
const RUNTIME = `${SW_VERSION}-runtime`;
// Hard cap on how many runtime entries (Next.js JS/CSS chunks) we keep so a
// long-lived install doesn't grow the cache unboundedly.
const RUNTIME_MAX = 80;

const PRECACHE_URLS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // `addAll` is atomic — if any fail, none get cached. Use individual
      // adds with a try/catch so a missing optional asset doesn't break the
      // whole install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch (err) {
            console.warn('[sw] precache skip', url, err);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop old precaches/runtime caches from previous SW_VERSIONs.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('sl-auto-pwa-') && k !== PRECACHE && k !== RUNTIME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Trim runtime cache (FIFO) so it can't grow without bound across many builds.
async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME);
  const reqs = await cache.keys();
  if (reqs.length <= RUNTIME_MAX) return;
  const excess = reqs.length - RUNTIME_MAX;
  await Promise.all(reqs.slice(0, excess).map((r) => cache.delete(r)));
}

// Allow the page to ask the SW to activate immediately on update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only intercept GETs. Mutations (POST etc.) must always hit the network.
  if (req.method !== 'GET') return;

  // Only handle same-origin. Don't proxy Firestore / Storage / Gemini / etc. —
  // Firebase has its own offline persistence, and intercepting third-party
  // APIs risks breaking long-polling.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: try network, fall back to offline.html when the
  // device is offline. This is what makes the PWA feel installable.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(PRECACHE);
          const offline = await cache.match('/offline.html');
          return (
            offline ||
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        }
      })(),
    );
    return;
  }

  // Precached static assets: cache-first.
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PRECACHE);
        const cached = await cache.match(req);
        return cached || fetch(req);
      })(),
    );
    return;
  }

  // Next.js hashed bundles (`/_next/static/*`) are immutable — safe to serve
  // from cache forever, and this is what lets the app shell open offline
  // after a first online visit. Plus same-origin /icons/* and /images/*
  // which are stable enough to treat the same way.
  const isImmutable =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/');

  if (isImmutable) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            cache.put(req, fresh.clone()).then(trimRuntimeCache);
          }
          return fresh;
        } catch (err) {
          // Offline and not in cache — let the browser handle the error.
          throw err;
        }
      })(),
    );
    return;
  }

  // Everything else (Next.js HTML for routes, /api/*, Firestore, Storage,
  // Gemini, etc.): let the network handle it. Caching auth/Firestore
  // responses here would create staleness bugs that are hard to reason
  // about, and Firestore already has its own offline persistence.
});
