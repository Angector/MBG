// === FILE: public/sw.js ===
const CACHE_NAME = 'mobogram-cache-v4';
const STATIC_ASSETS = [
  '../',
  '../index.html',
  '../styles/tokens.css',
  '../styles/reset.css',
  '../styles/base.css',
  '../styles/components.css',
  '../styles/advanced.css',
  '../styles/animations.css',
  '../styles/pages.css',
  '../styles/polish.css',
  '../styles/fonts.css',
  '../styles/dark-mode.css',
  '../styles/preloader.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some assets failed to cache, skipping.', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.hostname.includes('supabase') || url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      if (request.destination === 'document') {
        return caches.match('../index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});
