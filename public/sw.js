// Yaar service worker — offline app-shell caching (Phase 2 / M6).
//
// Strategy (no build step, no Workbox — keeps the app dependency-light):
//  - Precache the stable shell URLs on install (index, manifest, icons).
//  - Navigations: network-first, falling back to the cached shell when offline.
//  - Same-origin static assets (Vite's content-hashed JS/CSS): cache-first, and
//    cache-on-first-fetch so a single online visit makes the app fully offline-capable.
//  - Cross-origin requests (the Gemini API) are never intercepted — they always go
//    to the network, and fail loudly offline, which is the correct behavior.
//
// Bump CACHE_VERSION to force old caches out on the next activate.
const CACHE_VERSION = 'yaar-v1'
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Let the page trigger an immediate update if a new SW is waiting.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle our own origin. Gemini API (and anything cross-origin) is untouched.
  if (url.origin !== self.location.origin) return

  // Navigations → network-first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html'))),
    )
    return
  }

  // Static assets → cache-first, then network (and cache what we fetch).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        // Only cache successful, basic (same-origin) responses.
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy))
        }
        return res
      })
    }),
  )
})
