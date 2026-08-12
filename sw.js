const CACHE_NAME = 'seasonforge-v2.0.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/src/styles/v2/dist/v2-bundle.css?v=2.0.0',
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
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Failed to pre-cache asset: ${asset}`, err);
        }
      }
    })
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
      (async () => {
        try {
          // Explicitly construct request with redirect: 'follow' to prevent browser SW navigation redirect errors
          const fetchOptions = request.mode === 'navigate' ? { redirect: 'follow' } : {};
          const networkResponse = await fetch(request.url, fetchOptions);
          
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, copy);
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          if (request.mode === 'navigate') {
            const offlineResponse = await caches.match('/offline.html');
            if (offlineResponse) return offlineResponse;
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#0c0915;color:#fff;font-family:sans-serif;text-align:center;padding:3rem;"><h1>SeasonForge Offline</h1><p>Please check your connection.</p></body></html>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }

          return new Response('Resource unavailable offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // Strategy B: Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      const fetchPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, copy);
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) return cachedResponse;
      const netResp = await fetchPromise;
      if (netResp) return netResp;
      return new Response('Asset not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    })()
  );
});
