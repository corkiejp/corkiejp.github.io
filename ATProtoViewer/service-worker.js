const CACHE_NAME = 'atproto-pwa-v1.09';
const URLS_TO_CACHE = [
  '/ATProtoViewer/',
  '/ATProtoViewer/index.html',
  '/ATProtoViewer/BlueskyPostViewer.html',
  '/ATProtoViewer/Blueskyessentiallinks.html',
  '/ATProtoViewer/manifest.json',
  '/ATProtoViewer/styles.css',
  '/ATProtoViewer/main.js',
  '/ATProtoViewer/assets/icon-192.png',
  '/ATProtoViewer/assets/icon-512.png'
];

// Added share to feature for android PWA. 7th
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


