// =============================================
// CoreLedger Service Worker — Auto-update
// Detecta cambios automáticamente comparando
// el ETag/Last-Modified del index.html
// =============================================

const CACHE_BASE = 'coreledger';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap'
];

// — INSTALL: cachea los assets con el nombre de caché actual —
self.addEventListener('install', e => {
  self.skipWaiting(); // activa el nuevo SW inmediatamente
  e.waitUntil(
    caches.open(CACHE_BASE).then(cache => cache.addAll(ASSETS))
  );
});

// — ACTIVATE: limpia cachés viejas y toma control —
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_BASE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// — FETCH: Network first para index.html (detecta updates),
//          Cache first para el resto (rendimiento) —
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // Intenta red primero — si hay versión nueva la descarga
    e.respondWith(
      fetch(e.request)
        .then(networkRes => {
          // Guarda la versión nueva en caché
          const clone = networkRes.clone();
          caches.open(CACHE_BASE).then(cache => cache.put(e.request, clone));
          return networkRes;
        })
        .catch(() => caches.match(e.request)) // sin red: usa caché
    );
  } else {
    // Resto de assets: caché primero
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(networkRes => {
          const clone = networkRes.clone();
          caches.open(CACHE_BASE).then(cache => cache.put(e.request, clone));
          return networkRes;
        });
      })
    );
  }
});

// — MESSAGE: permite forzar update desde la app —
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
