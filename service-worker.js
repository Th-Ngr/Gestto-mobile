const CACHE_VERSION = "v6"; // ⬅️ Aumentado para v6 para forçar atualização
const CACHE_NAME = `financeiro-pwa-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json"
];

// INSTALAÇÃO
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ATIVAÇÃO (Limpa caches antigos)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH - Estratégia Corrigida
self.addEventListener("fetch", event => {
  // 1. IGNORAR requisições do Firebase/Google e APIs externas
  // Isso evita o erro "intercepted the request and encountered an unexpected error"
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('google') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    return; // Deixa passar direto pela rede sem interceptar
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Retorna do cache se existir, senão busca na rede
      return response || fetch(event.request).then(fetchResponse => {
        // Apenas coloca no cache se for um arquivo do seu próprio domínio
        if (event.request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
        // Se falhar (offline), tenta retornar a página inicial
        if (event.request.mode === 'navigate') {
            return caches.match('./');
        }
    })
  );
});