// === FILE: public/sw.js ===
// Project: Mobogram — Phase 19
// Purpose: Service Worker for PWA (Relative paths for GitHub Pages)

const CACHE_NAME = 'mobogram-cache-v2'; // نسخه رو عوض کردم تا کش قدیمی پاک بشه
const STATIC_ASSETS = [
  './',
  './index.html',
  './pages/products.html',
  './pages/product.html',
  './pages/cart.html',
  './pages/checkout.html',
  './pages/account.html',
  './pages/auth.html',
  './styles/tokens.css',
  './styles/reset.css',
  './styles/base.css',
  './styles/components.css',
  './styles/advanced.css',
  './styles/animations.css',
  './styles/pages.css',
  './styles/polish.css',
  './styles/fonts.css',
  './styles/dark-mode.css',
  './styles/preloader.css',
  './src/config.js',
  './src/errors.js',
  './src/types.js',
  './src/utils.js',
  './src/i18n.js',
  './src/state.js',
  './src/motion.js',
  './src/observers.js',
  './src/services/auth.service.js',
  './src/services/catalog.service.js',
  './src/services/shopping.service.js',
  './src/ui/primitives.js',
  './src/ui/product.ui.js',
  './src/ui/shopping.ui.js',
  './src/ui/admin.ui.js',
  './src/ui/motion-effects.js',
  './src/pages/home.js',
  './src/pages/products.js',
  './src/pages/product.js',
  './src/pages/cart.js',
  './src/pages/checkout.js',
  './src/pages/account.js',
  './src/pages/auth.js',
  './src/pages/admin.js'
];

// Install event - cache static assets
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

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase')) return;
  if (url.origin !== location.origin) return;

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
        return caches.match('./index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Mobogram';
  const options = {
    body: data.body || 'پیام جدید',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-72x72.png',
    dir: 'rtl',
    lang: 'fa',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
