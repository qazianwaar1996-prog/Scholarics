/* ============================================================
   StudyMetrics Service Worker v2.0
   Strategy: Cache-first for shell assets, network-first for HTML,
   offline fallback page for navigation failures.
   ============================================================ */

var CACHE_NAME = 'sm-shell-v1';
var OFFLINE_URL = '/404.html';

/* Assets to pre-cache on install (the app shell) */
var SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/studymetrics-v2.css',
  '/css/premium.css',
  '/css/personalization.css',
  '/js/script.js',
  '/js/sm-shell.js',
  '/js/premium.js',
  '/images/favicon.svg',
  '/404.html'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS).catch(function () {
        /* Non-fatal: if a shell asset fails, install still succeeds */
      });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* Only handle GET requests to same origin */
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  /* API calls: always network-only, no caching */
  if (req.url.includes('/api/')) return;

  /* HTML navigation: network-first, fallback to offline page */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  /* Static assets: cache-first */
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200) return res;
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        return res;
      });
    })
  );
});
