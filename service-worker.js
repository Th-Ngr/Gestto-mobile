const CACHE_NAME = 'gestto-gh-v2';
const APP_PREFIX = '/Gestto-mobile';

const assets = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/styles.css`,
  `${APP_PREFIX}/script.js`,
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});const CACHE_NAME = 'gestto-v2'; // Mudei a versão para forçar atualização
const assets = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Se tiver no cache, retorna. Se não, busca na rede.
      return response || fetch(event.request).catch(() => {
          // Se falhar rede e cache (offline), pode retornar a index
          return caches.match('/index.html');
      });
    })
  );
});
