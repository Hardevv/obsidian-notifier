/* global self caches fetch URL */

const APP_CACHE = 'obsidian-notifier-v1'
const BASE = '/page'
const APP_SHELL = [`${BASE}/`, `${BASE}/manifest.webmanifest`]

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
  const url = payload.url || `${BASE}/`

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        data: { url },
        icon: `${BASE}/check.jpg`,
        badge: `${BASE}/check.jpg`,
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PUSH_RECEIVED', title, body, url })
        })
      }),
    ])
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification?.data?.url || `${BASE}/`

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        const clientUrl = new URL(client.url)
        if (clientUrl.pathname.startsWith(BASE) && 'focus' in client) {
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    })
  )
})
