// sw.js
const CACHE_NAME = 'testshareto-pwa-v0.02';
const URLS_TO_CACHE = [
  '/Testsharetopwa/',
  '/Testsharetopwa/index.html',
  '/Testsharetopwa/manifest.json',
  '/Testsharetopwa/styles.css',
  '/Testsharetopwa/main.js',
  '/Testsharetopwa/icon-192x192.png',
  '/Testsharetopwa/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
