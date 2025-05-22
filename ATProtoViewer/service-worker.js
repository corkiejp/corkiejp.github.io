const CACHE_NAME = 'atproto-pwa-v1.03';
const URLS_TO_CACHE = [
  '/ATProtoViewer/',
  '/ATProtoViewer/index.html',
  '/ATProtoViewer/BlueskyPostViewer.html',
  '/ATProtoViewer/manifest.json',
  '/ATProtoViewer/styles.css',
  '/ATProtoViewer/main.js',
  '/ATProtoViewer/assets/icon-192.png',
  '/ATProtoViewer/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheAllowList = [CACHE_NAME]; // Only keep the current cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheAllowList.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

