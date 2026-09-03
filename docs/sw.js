// Service worker ScanRebut — cache la coquille de l'appli pour permettre
// l'installation PWA et un chargement hors-ligne. L'envoi du rapport final
// (bouton "Terminer") a toujours besoin du réseau pour joindre Apps Script.
//
// IMPORTANT : incrémenter CACHE (v2, v3, ...) à chaque déploiement qui
// change docs/. Le nom de cache est ce qui force les appareils ayant déjà
// installé la PWA à récupérer la nouvelle version au prochain lancement
// (voir activate ci-dessous, qui supprime les anciens caches).
var CACHE = 'scanrebut-v6';
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

  var isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isHTML) {
    // Page principale : toujours réseau d'abord pour être sûr d'avoir la
    // dernière version quand on est en ligne ; le cache ne sert que de
    // secours hors-ligne.
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
          return res;
        })
        .catch(function () { return caches.match(event.request); })
    );
    return;
  }

  // Autres ressources (icône, manifest...) : cache d'abord, réseau en secours.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (res) {
        if (res && res.ok && event.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      });
    })
  );
});
