/* global self caches fetch */

const APP_CACHE = 'obsidian-notifier-v27'
const APP_SHELL = [`/`, `/manifest.webmanifest`]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => {
      return cache.addAll(APP_SHELL)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== APP_CACHE).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse
      return fetch(event.request)
    })
  )
})

self.addEventListener('push', event => {
  let payload

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data?.text() || 'New reminder' }
  }

  const title = payload.title || 'Obsidian reminder'
  const body = payload.body || 'You have a new reminder.'
  const url = payload.url || "/"

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        data: { url },
        icon: '/public/check.jpg',
        badge: '/public/check.jpg',
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PUSH_RECEIVED', title, body, url })
        })
      }),
    ])
  )
})

// self.addEventListener('notificationclick', event => {
//   event.notification.close()

//   event.waitUntil(self.clients.openWindow('http://localhost:5500/pwa/redirection-page'))

// })