const CACHE_NAME = 'ttospwa-v1.05';
const URLS_TO_CACHE = [
  '/ttospwa/',
  '/ttospwa/index.html',
  '/ttospwa/manifest.json',
  '/ttospwa/styles.css',
  '/ttospwa/main.js',
  '/ttospwa/assets/icon-192.png',
  '/ttospwa/assets/icon-512.png'
];

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});



// Index.html with debugging v2
// Install: Cache new assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting()) // Force immediate activation
  );
});

// Activate: Delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim()) // Control all clients immediately
  );
});

// Fetch: Serve cached or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});


