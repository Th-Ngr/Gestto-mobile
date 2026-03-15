const CACHE_NAME = '1.4.6'; // Incrementei a versão para forçar atualização
const APP_PREFIX = '/Gestto-mobile';

const assets = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/styles.css`,
  `${APP_PREFIX}/script.js`,
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11' // Adicionei o SweetAlert ao cache
];

// Instalação: Salva os arquivos essenciais no cache
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

// Ativação: Limpa caches antigos de versões anteriores
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
    })
  );
});

// Fetch: Estratégia de busca de arquivos
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. BYPASS PARA FIREBASE/GOOGLE
  // Não tentamos cachear chamadas de API ou autenticação do Firebase
  if (url.includes('googleapis.com') || url.includes('gstatic.com') || url.includes('google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. ESTRATÉGIA NETWORK FIRST (Para seus arquivos locais)
  // Tenta a rede primeiro para garantir que você veja as atualizações do app.
  // Se falhar (offline), entrega o que está no cache.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a rede funcionar, atualizamos o cache com a nova cópia
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Se a rede falhar (está offline), busca no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso não tenha nem na rede nem no cache (ex: página nova)
          if (event.request.mode === 'navigate') {
            return caches.match(`${APP_PREFIX}/index.html`);
          }
        });
      })
  );
});