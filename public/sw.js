/**
 * @fileoverview Service Worker para soporte Offline completo (PWA).
 */

const CACHE_NAME = 'magifinance-cache-v1';

// Recursos esenciales a cachear inmediatamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,-50..200'
];

// Instalar Service Worker y cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Abriendo cache de PWA y almacenando estáticos...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar Service Worker y limpiar versiones de cache antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Limpiando cache obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones y servir desde cache si no hay red (Offline First)
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET de la misma aplicación o fuentes externas confiables (como Google Fonts)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Evitar interceptar WebSockets del dev-server de Vite
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar el recurso cacheado y actualizarlo en segundo plano (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => { /* Ignorar errores de red en segundo plano */ });
        
        return cachedResponse;
      }

      // Si no está en cache, intentar obtener de la red
      return fetch(event.request)
        .then((networkResponse) => {
          // Si el recurso es válido, cachear una copia
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y es una navegación HTML, retornar index.html
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
    })
  );
});
