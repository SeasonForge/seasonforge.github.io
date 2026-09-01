const CACHE_NAME = 'seasonforge-v2.3.0';
const CRITICAL_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/favicon.png',
  '/assets/logo.png',
  '/assets/bg-smoke.jpeg'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CRITICAL_SHELL_ASSETS) {
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

// Activate: Immediately claim clients and purge old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Purging old cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Strategy:
// 1. HTML Pages, JSON Data, JS modules, CSS -> Network-First (always fresh, fallback to cache if offline)
// 2. Static Media (Images, Fonts, Audio) -> Stale-While-Revalidate (fast cached delivery with bg update)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  const isCodeOrData = 
    request.mode === 'navigate' ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css');

  if (isCodeOrData) {
    // Network-First Strategy for Code and Data
    event.respondWith(
      (async () => {
        try {
          const fetchOptions = request.mode === 'navigate' ? { redirect: 'follow' } : {};
          const networkResponse = await fetch(request, fetchOptions);
          
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, copy);
          }
          return networkResponse;
        } catch (error) {
          // Offline fallback
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

  // Strategy B: Static Assets (Images, Fonts, Icons) -> Stale-While-Revalidate
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
