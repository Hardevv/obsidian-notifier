/* global self caches fetch URL */
const APP_CACHE = 'obsidian-notifier-v8';
const IS_DEV = true

const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const APP_SHELL = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/app.js`,
  `${BASE}/manifest.webmanifest`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();

  //TODO: invesitage logic to update pwa app - now it's caching things
  if (IS_DEV) return

  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request);
    })
  );
});

self.addEventListener('push', (event) => {
  // eslint-disable-next-line no-useless-assignment
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'New reminder' };
  }

  const title = payload.title || 'Obsidian reminder';
  const body = payload.body || 'You have a new reminder.';
  const url = payload.url || '/';

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        data: { url },
        icon: '/redirection-page/check.jpg',
        badge: '/redirection-page/check.jpg',
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RECEIVED', title, body, url });
        });
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || `${BASE}/`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const clientUrl = new URL(client.url);

        // fokusuj okno tej PWA (nie tylko pathname === '/')
        if (clientUrl.pathname.startsWith(BASE) && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});