const CACHE_NAME = 'gozulu-v0.7.2';
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

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
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
