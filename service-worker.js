const CACHE_NAME = 'gestto-gh-v1.1.2'; // Versão nova para limpar o cache problemático
const APP_PREFIX = '/Gestto-mobile';

const assets = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/styles.css`,
  `${APP_PREFIX}/script.js`,
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // --- ESTRATÉGIA DE BYPASS PARA FIREBASE ---
  // Se for Google ou Firebase, fazemos o fetch direto SEM passar pelo sistema de cache do SW
  if (url.includes('googleapis.com') || url.includes('gstatic.com') || url.includes('google.com')) {
    // Usamos event.respondWith(fetch(event.request)) em vez de apenas return
    // Isso garante que o navegador tente a rede de forma limpa.
    event.respondWith(fetch(event.request));
    return;
  }

  // --- ESTRATÉGIA PARA ARQUIVOS LOCAIS ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch((err) => {
        // Se falhar a rede e não tiver no cache, retorna erro amigável ou ignore favicon
        if (url.includes('favicon.ico')) return new Response(null, { status: 404 });
        console.error("Erro de rede e recurso não cacheado:", url);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Garante que o SW controle as abas abertas na hora
  );
});