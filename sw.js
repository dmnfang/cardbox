const CACHE = 'cardbox-v2';
const PRECACHE = [
  './', './index.html', './manifest.json',
  './css/styles.css',
  './js/data.js', './js/app.js', './js/flash.js',
  './js/reveal.js', './js/target.js', './js/vanish.js',
  './data/library.json',
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-180.png',
  './assets/icons/favicon.png',
  './assets/icons/flash.svg',
  './assets/icons/reveal.svg',
  './assets/icons/target.svg',
  './assets/icons/vanish.svg',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (e.request.url.includes('/assets/flashcards/')) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
