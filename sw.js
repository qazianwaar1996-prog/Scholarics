/* ============================================================
   StudyMetrics PWA — Service Worker  v2.6
   Strategy:
     • HTML pages      → Network-First (500ms timeout) → cache → offline
     • JS / CSS / images → Stale-While-Revalidate
         (serve cache instantly, refresh from network in the background)
     • Fonts / other same-origin → Stale-While-Revalidate
     • Offline fallback → index.html

   Update behaviour:
     • CACHE_NAME / HTML_CACHE are versioned. Bump them to force a hard
       reset (old caches are deleted in 'activate').
     • IMPORTANT: with Stale-While-Revalidate you do NOT need to bump the
       version on every JS/CSS edit — the cache revalidates in the
       background, so the next navigation serves the latest file
       automatically, with no manual cache clearing.
     • skipWaiting() (after install) + clients.claim() (on activate) make a
       new SW take over immediately; pwa.js reloads on controllerchange so
       the page is always served by the newest SW + freshest cache.
   ============================================================ */
'use strict';

var CACHE_NAME  = 'sm-static-v2.6';
var HTML_CACHE  = 'sm-pages-v2.6';
/* Relative to the SW location so it works on a root domain (studymetrics.app)
   AND on a project subpath (github.io/<repo>/). */
var OFFLINE_URL = 'index.html';

/* ---- Files to pre-cache on install (relative URLs) ---- */
var PRECACHE_STATIC = [
  'css/style.css',
  'css/studymetrics-v2.css',
  'css/premium.css',
  'css/personalization.css',
  'css/calculators.css',
  'css/content-platform.css',
  'css/consent.css',
  'css/print.css',
  'css/ai-chat.css',
  'css/ai-assistant.css',
  'css/dashboard.css',
  'css/country-selector.css',
  'css/gpa-converter.css',
  'js/script.js',
  'js/sm-shell.js',
  'js/sm-v2-features.js',
  'js/premium.js',
  'js/personalization.js',
  'js/content-platform.js',
  'js/analytics.js',
  'js/consent.js',
  'js/pwa.js',
  'js/email-capture.js',
  'images/favicon.svg',
  'images/avatar.svg',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/og-image.png',
  'manifest.json'
];

var PRECACHE_HTML = [
  'index.html',
  'gpa.html',
  'dashboard.html',
  'profile.html',
  'pomodoro.html',
  '404.html'
];

/* Helper: is this a good cacheable response? */
function isGoodResponse(res) {
  return res && res.status !== 0 && res.ok;
}

/* Helper: Network-First with timeout (used for HTML) */
function networkFirstWithTimeout(req, cacheName, timeoutMs) {
  return new Promise(function (resolve) {
    var settled = false;
    var timer;

    /* Start network fetch */
    var networkFetch = fetch(req.clone()).then(function (res) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (isGoodResponse(res)) {
        /* Cache the fresh response */
        var clone = res.clone();
        caches.open(cacheName).then(function (c) { c.put(req, clone); });
      }
      resolve(res);
    }).catch(function () {
      /* Network failed — cache fallback handles it below */
    });

    /* Timeout: serve cache while network is slow */
    timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      caches.match(req).then(function (cached) {
        if (cached) {
          resolve(cached);
        }
        /* If no cache, let the network promise resolve naturally */
      });
      /* After we've served from cache, update cache in background */
      networkFetch.then(function (res) {
        if (res && isGoodResponse(res)) {
          var clone = res.clone();
          caches.open(cacheName).then(function (c) { c.put(req, clone); });
        }
      }).catch(function () {});
    }, timeoutMs);
  }).catch(function () {
    return caches.match(req).then(function (cached) {
      return cached || caches.match(OFFLINE_URL);
    });
  });
}

/* Helper: Stale-While-Revalidate (used for JS/CSS/images).
   - Serves the cached copy INSTANTLY (fast + works offline).
   - Fetches from the network in the background and overwrites the cache,
     so the NEXT navigation always serves the latest version — no manual
     cache clearing and no sw.js version bump required for content edits. */
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      /* cache:'no-cache' forces the browser to revalidate with the server
         (honouring ETag/Last-Modified) instead of serving a heuristic-stale
         copy — this is what guarantees users receive the latest JS/CSS. */
      var networkUpdate = fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (isGoodResponse(res)) {
          cache.put(req, res.clone());   /* refresh cache in the background */
        }
        return res;
      }).catch(function () {
        /* Offline: fall back to whatever we have */
        return cached || new Response('', { status: 503, statusText: 'Offline' });
      });
      /* Instant response from cache if present; otherwise wait for network */
      return cached || networkUpdate;
    });
  });
}

/* Resolve a possibly-relative URL to an absolute one (for cache.match keys) */
function absUrl(relOrAbs) {
  return new URL(relOrAbs, self.location.href).href;
}

/* ─────────────────────────────── INSTALL ─────────────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(function (cache) {
        /* addAll is all-or-nothing; catch individual failures so a single
           missing optional asset doesn't abort the entire precache. */
        return Promise.all(
          PRECACHE_STATIC.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('[SW] Failed to precache static asset:', url, err);
            });
          })
        );
      }),
      caches.open(HTML_CACHE).then(function (cache) {
        return Promise.all(
          PRECACHE_HTML.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('[SW] Failed to precache HTML page:', url, err);
            });
          })
        );
      })
    ]).then(function () {
      /* skipWaiting only after precache attempt completes (not on failure),
         so we don't activate a SW with an empty/corrupt cache mid-session. */
      return self.skipWaiting();
    })
  );
});

/* ─────────────────────────────── ACTIVATE ────────────────────────────── */
self.addEventListener('activate', function (e) {
  var validCaches = [CACHE_NAME, HTML_CACHE];
  e.waitUntil(
    caches.keys().then(function (keys) {
      /* Delete every cache that is NOT the current version — this removes
         ALL old caches (sm-static-v2.4, v2.5, etc.) on every deploy. */
      return Promise.all(
        keys.map(function (key) {
          if (validCaches.indexOf(key) === -1) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      /* Take control of all open tabs immediately.
         pwa.js listens for controllerchange and reloads, ensuring
         the new page is served from the new cache (no stale/fresh mismatch). */
      return self.clients.claim();
    })
  );
});

/* ─────────────────────────────── FETCH ───────────────────────────────── */
self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* Skip non-GET, cross-origin, chrome-extension, and data: requests */
  if (req.method !== 'GET') return;
  var urlStr = req.url;
  if (urlStr.indexOf('chrome-extension') === 0) return;
  if (urlStr.indexOf('data:') === 0) return;

  var url;
  try { url = new URL(urlStr); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   /* only same-origin */

  var path = url.pathname;

  /* Determine request type */
  var isHTML    = (req.headers.get('Accept') || '').indexOf('text/html') !== -1
                  || path === '/'
                  || path.endsWith('.html');
  var isStatic  = /\.(css|js|png|svg|jpg|jpeg|gif|webp|woff|woff2|ttf|ico)(\?|$)/.test(path);

  /* ── HTML: Network-First (500ms timeout) → Cache → Offline fallback ── */
  if (isHTML) {
    e.respondWith(
      networkFirstWithTimeout(req, HTML_CACHE, 500).then(function (res) {
        if (res && res.status !== 0) return res;
        return caches.match(OFFLINE_URL).then(function (offline) {
          return offline || new Response(
            '<!doctype html><html><head><title>Offline</title></head>' +
            '<body style="font-family:system-ui;text-align:center;padding:4rem">' +
            '<h1>You are offline</h1>' +
            '<p>Please check your connection and try again.</p>' +
            '<button onclick="location.reload()">Retry</button>' +
            '</body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      }).catch(function () {
        return caches.match(OFFLINE_URL).then(function (offline) {
          return offline || caches.match(req);
        });
      })
    );
    return;
  }

  /* ── JS / CSS / images / fonts: Stale-While-Revalidate ──
     Always serves fast from cache, AND silently refreshes from the network
     so users receive the latest version on the next load — no manual clear. */
  if (isStatic) {
    e.respondWith(staleWhileRevalidate(req, CACHE_NAME));
    return;
  }

  /* ── All other requests: network with cache fallback ── */
  e.respondWith(
    fetch(req).then(function (res) {
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});
