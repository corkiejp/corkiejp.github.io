const CACHE_NAME = 'atproto-pwa-v1.36';
const URLS_TO_CACHE = [
  '/ATProtoViewer/',
  '/ATProtoViewer/index.html',
  '/ATProtoViewer/BlueskyPostViewer.html',
  '/ATProtoViewer/Blueskyessentiallinks.html',
  '/ATProtoViewer/ATProtoSimpleFeeds.html',
  '/ATProtoViewer/bookmarks.html',
  '/ATProtoViewer/manifest.webmanifest',
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
// Added lists display. + Linkto toolify.blue added.
// Added a simple feed/list viewer + a small edit to display handle on single posts + search for feeds instructions.
// Integrated a view button on my lists display.
// Bug fixes on feed/list viewer and addition of bskyinfo.com to links list.
// Listed with bskyinfo, added a badge to the page. (3)
// Lists/Feeds display title when available. (2)
// Added a link to https://atproto.at/viewer for records/did + added to list of links.
// Updated hopefully to handle profile shares? Due to bluesky updates on the 5th June.
// Added support for iOS hopefully? safari-26
// https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes#Web-Apps
// Hope this latest change will detect feed shares? & List Feeds. (4)
// Changed Icon. and changed back!
// Added Button link to BlueskToMP4.com video downloader.
// Updated the essential links with the above.
// Trying a different icon again
// Added a QR code to my page! + Deletion of unused function.
// Link to ttospwa which has additional links.
// Bluesky Embeds modal popup integrated. Thanks to @baileytownsend.dev resolving a bug with a single line of code.
// Bug fixes from previous commit. + also on the simple feeds viewer now (2)
// Feeds embed modal and some style on record at uri so it wraps! + Recent feeds/list remembered
// Added RedDwarfLIte link
// Hopefully at a protocol 'web+at' for this PWA.
// Added links to https://scrapboard.org/ for accounts images posts. + Profile links when active in more menu. (3)
// Prep for EU age verification. + Disclaimer
// Change example feeds provided! ~ Age gated through YouTube short NSFW 18+ (3) ~ New code 2207
// Install: Pre-cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
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

// Fetch: Handle redirects and serve cache/network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Handle share redirect to /ATProtoViewer/
  if (url.pathname === '/ATProtoViewer/') {
    const sharedData = url.searchParams.get('uri') ||
                       url.searchParams.get('text') ||
                       url.searchParams.get('url');

    let redirectUrl = '/ATProtoViewer/index.html'; // Default

    if (sharedData) {
      // 1. Check for Bluesky feed URL
      const isFeed = /^https:\/\/bsky\.app\/profile\/([^/]+)\/feed\/([^/]+)/.test(sharedData);
      // 2. Check for Bluesky list URL
      const isList = /^https:\/\/bsky\.app\/profile\/([^/]+)\/lists?\/([^/]+)/.test(sharedData);

      if (isFeed) {
        // Redirect to feed viewer
        redirectUrl = `/ATProtoViewer/ATProtoSimpleFeeds.html?input=${encodeURIComponent(sharedData)}`;
      } else if (isList) {
        // Redirect to list viewer (you may need to create this page)
        redirectUrl = `/ATProtoViewer/ATProtoSimpleFeeds.html?input=${encodeURIComponent(sharedData)}`;
      } else if (sharedData.startsWith('did:')) {
        redirectUrl += `?did=${encodeURIComponent(sharedData)}`;
      } else {
        redirectUrl += `?uri=${encodeURIComponent(sharedData)}`;
      }
    }

    event.respondWith(Response.redirect(redirectUrl, 302));
    return;
  }

  // Default: serve from cache, then network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});



