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

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Adjust this path to match your share_target action
  if (
    event.request.method === 'POST' &&
    url.pathname === '/ttospwa/'
  ) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text');
        // Send the shared text to all open clients (pages)
        const clientsArr = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsArr) {
          client.postMessage({ sharedText: text });
        }
        // Redirect user to your main page after sharing
        return Response.redirect('/ttospwa/', 303);
      })()
    );
  }
});


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


