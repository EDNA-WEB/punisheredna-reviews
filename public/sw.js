// Jednoduchý service worker — cieľom nie je kompletná offline funkčnosť
// (web je databázovo dynamický), ale rýchlejšie opakované načítanie
// statických súborov (ikony, fonty, obrázky rozhrania) a jednoduchá
// záložná stránka, keď je používateľ úplne bez pripojenia.

const CACHE_NAME = 'punisheredna-static-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Len GET požiadavky na náš vlastný pôvod — API a dynamické stránky
  // necháme vždy ísť priamo na sieť (nechceme cachovať databázový obsah).
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Navigácia (otváranie stránok) — skús sieť, pri zlyhaní ukáž záložnú stránku.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Statické súbory (obrázky, ikony, fonty) — najprv cache, potom sieť,
  // a úspešnú odpoveď zo siete si pre nabudúce uložíme.
  const isStaticAsset = /\.(png|jpg|jpeg|svg|webp|ico|woff2?|css)$/i.test(new URL(request.url).pathname);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
  }
});
