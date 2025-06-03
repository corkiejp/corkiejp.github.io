const CACHE_NAME = 'atproto-pwa-v1.15';
const URLS_TO_CACHE = [
  '/ATProtoViewer/',
  '/ATProtoViewer/index.html',
  '/ATProtoViewer/BlueskyPostViewer.html',
  '/ATProtoViewer/Blueskyessentiallinks.html',
  '/ATProtoViewer/bookmarks.html',
  '/ATProtoViewer/manifest.json',
  '/ATProtoViewer/styles.css',
  '/ATProtoViewer/main.js',
  '/ATProtoViewer/assets/icon-192.png',
  '/ATProtoViewer/assets/icon-512.png'
];


// Localstorage Bookmarks + autofill for desc! Fixed a bug that stopped scrolling on modal close.
// More list now in a modal display instead of drop down.
// Modal window to show bookmarks, with link to bookmarks page to manage them. v2
// Display follow records.
// Handle should now be displayed instead of DID string.
// Set your own presets and import/export them + display of likes.
// Update of CSS for mobile display ~ Didn't work had to resort to old form layout!
// And forgot about the likes option!
// Added to instructions for presets.
// Install: Cache new assets ...

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
     .then(() => {
        // Notify all clients that SW is activated
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({type: 'SW_ACTIVATED'});
          });
        });
      })
  );
});


// Fetch: Serve cached or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});


