const CACHE_NAME = 'adese-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/home',
  '/manifest.json',
  '/adese_icon.svg',
];

// Install: cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API requests: always network, don't cache
  if (url.pathname.startsWith('/api/') || url.port === '3000') return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful HTML/JS/CSS responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached root
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
