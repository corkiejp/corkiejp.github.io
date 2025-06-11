const CACHE_NAME = 'ttospwa-v1.10';
const URLS_TO_CACHE = [
  '/ttospwa/',
  '/ttospwa/index.html',
  '/ttospwa/manifest.json',
  '/ttospwa/styles.css',
  '/ttospwa/main.js',
  '/ttospwa/assets/icon-192.png',
  '/ttospwa/assets/icon-512.png'
];

// Install: Cache new assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
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
    }).then(() => self.clients.claim())
  );
});

// Fetch: Handle share POST, otherwise serve cached/network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Handle POST to share target
  if (
    event.request.method === 'POST' &&
    url.pathname === '/ttospwa/'
  ) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text');
        // Broadcast to all open clients
        const clientsArr = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsArr) {
          client.postMessage({ sharedText: text });
        }
        // Redirect user to your main page after sharing
        return Response.redirect('/ttospwa/', 303);
      })()
    );
    return; // Stop further processing for this request
  }

  // For all other requests: serve cache, then network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
