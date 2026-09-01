// Service worker ScanRebut — cache la coquille de l'appli pour permettre
// l'installation PWA et un chargement hors-ligne. L'envoi du rapport final
// (bouton "Terminer") a toujours besoin du réseau pour joindre Apps Script.

var CACHE = 'scanrebut-v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return; // laisse passer les POST (saveSession) sans interception

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request).then(function (res) {
        if (res && res.ok && event.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });

      return cached || network;
    })
  );
});
