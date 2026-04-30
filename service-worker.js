const CACHE_NAME = 'gozulu-v0.8.9';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/globe.js',
  '/teezee.js',
  '/manifest.json',
  '/vendor/d3-array.min.js',
  '/vendor/d3-geo.min.js',
  '/vendor/topojson-client.min.js',
  '/data/countries-110m.json',
  '/images/fund-button.svg',
  '/images/next-button.svg',
  '/images/help-button.svg',
  '/images/why-button.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
];

// Install event - cache assets, then skip the "waiting" phase so the new SW
// becomes active immediately instead of stalling until every controlled tab
// is closed.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event - delete stale caches, then claim existing clients so the
// page that just loaded starts being served by this SW (and its fresh cache)
// without requiring another reload.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
