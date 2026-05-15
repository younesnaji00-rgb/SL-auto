// Firebase Cloud Messaging service worker.
// Served at /firebase-messaging-sw.js (Firebase SDK looks here by default).

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
    icon: '/images/auto-expertise.png',
    badge: '/images/auto-expertise.png',
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
