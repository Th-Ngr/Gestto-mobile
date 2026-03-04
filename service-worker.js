const CACHE_VERSION = "v3"; // ⬅️ Aumentei para v3 para forçar a atualização
const CACHE_NAME = `financeiro-pwa-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css", // Corrigido de style.css para styles.css
  "./script.js",
  "./manifest.json" // Corrigido de manisfest para manifest
];

// INSTALAÇÃO
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Instalando Cache...");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ATIVAÇÃO
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log("Limpando cache antigo...");
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH (Estratégia: Tenta Rede, se falhar usa Cache)
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          // Não cacheia chamadas do Firebase (Google APIs)
          if (!event.request.url.includes('googleapis')) {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});