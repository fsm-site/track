/* Minimal app-shell service worker.
   Caches the shell (HTML/manifest/icons) so the app can install and open
   offline. Data itself still comes from Firestore over the network — this
   does not cache or work with your live client/commission data. */
const CACHE_NAME = 'masterlist-shell-v1';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for the app shell so updates show up as soon as you're
// online; falls back to the cached copy when offline. Everything else
// (Firebase/Firestore, Google Fonts, etc.) is left untouched — no offline
// caching of your live data.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isShellRequest = event.request.mode === 'navigate' || SHELL_FILES.some(f => url.pathname.endsWith(f.replace('./', '')));
  if(url.origin !== self.location.origin || !isShellRequest) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
