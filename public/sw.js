/* Kardio service worker — offline-first app shell.
   Hashed build assets are immutable, so cache-first is safe; navigations always
   fall back to the cached shell so the app opens with no signal at the trailhead. */

const VERSION = 'kardio-v1'
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    )
    return
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit)
    }),
  )
})
