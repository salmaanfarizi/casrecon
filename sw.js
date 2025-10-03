// sw.js - Service Worker
const CACHE_NAME = 'cash-recon-v3';
const PRECACHE_URLS = ['/', '/index.html'];

// Install: pre-cache essentials
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always fetch fresh for API/config
  if (url.pathname.startsWith('/.netlify/functions/') || url.pathname === '/config.js') {
    return event.respondWith(fetch(request));
  }

  // Network-first for documents (HTML)
  if (request.destination === 'document') {
    return event.respondWith(
      fetch(request)
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request))
    );
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      })
    )
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
