const CACHE_NAME = 'seasonforge-v1.2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/src/styles/main.css?v=1.2.1',
  '/src/app.js',
  '/src/game-page.js',
  '/src/config.js',
  '/assets/favicon.png',
  '/assets/logo.png',
  '/assets/bg-smoke.jpeg'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Strategy:
// 1. Page Navigations & Data JSON -> Network First (Fallback to Cache, then Offline Page)
// 2. Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Strategy A: HTML Page Navigations & Seasons Data JSON -> Network First
  if (request.mode === 'navigate' || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          // Uncached page navigation offline fallback
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        })
    );
    return;
  }

  // Strategy B: Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
