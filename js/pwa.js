/* ============================================================
   StudyMetrics PWA — Registration + Install Button  v2.2
   • Registers sw.js
   • Captures beforeinstallprompt → shows "Install App" button
     ONLY when: prompt is available, not in standalone mode,
     and installation hasn't already happened
   • Hides install button after installation or prompt dismissal
   • Never shows in standalone (PWA) mode
   • Offline banner on network change
   ============================================================ */
(function () {
  'use strict';

  /* ── Standalone / already-installed guard ── */
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      navigator.standalone === true /* iOS Safari */
    );
  }

  /* ── Service Worker registration ── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      // Service worker disabled
        .then(function (reg) {
          /* Check for updates once per hour */
          setInterval(function () { reg.update(); }, 60 * 60 * 1000);

          /* When a new SW is waiting, reload once it activates to avoid
             serving a mix of old HTML + new cached assets (blank page cause). */
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'activated' &&
                  navigator.serviceWorker.controller) {
                /* New SW is active and we had a previous controller —
                   silently reload to get the fresh page + assets in sync. */
                window.location.reload();
              }
            });
          });
        })
        .catch(function (err) {
          console.warn('[PWA] SW registration failed:', err);
        });

      /* Detect when the SW controlling this page changes (e.g. clients.claim)
         and reload to prevent stale asset / fresh HTML mismatch. */
      var firstController = navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        /* Only reload if there was already a controller (not first install). */
        if (firstController) {
          window.location.reload();
        }
      });
    });
  }

  /* ── Install Prompt ── */
  var deferredPrompt = null;

  /* If already running as installed PWA, never touch the install button. */
  if (isStandalone()) return;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    /* Double-check: if user installed mid-session and we somehow still fire */
    if (isStandalone()) return;
    deferredPrompt = e;
    injectInstallButton();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeInstallButton();
    if (window.SM && SM.toast) SM.toast('Study Metrics installed! 🎉', 'success');
  });

  /* Remove button immediately if the display-mode switches to standalone
     (happens when user completes install while the page is still open) */
  if (window.matchMedia) {
    ['standalone', 'fullscreen', 'minimal-ui'].forEach(function (mode) {
      var mq = window.matchMedia('(display-mode: ' + mode + ')');
      var handler = function (e) { if (e.matches) { deferredPrompt = null; removeInstallButton(); } };
      if (mq.addEventListener) { mq.addEventListener('change', handler); }
      else if (mq.addListener) { mq.addListener(handler); } /* Safari <14 */
    });
  }

  function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      deferredPrompt = null;
      /* Remove the button regardless of outcome — the prompt can only be
         used once; showing a dead button after dismiss is confusing. */
      removeInstallButton();
    });
  }

  function removeInstallButton() {
    document.querySelectorAll('.sm-install-btn').forEach(function (el) {
      el.remove();
    });
  }

  function injectInstallButton() {
    /* Avoid duplicates */
    if (document.querySelector('.sm-install-btn')) return;
    /* Final standalone check before injecting */
    if (isStandalone()) return;

    var INSTALL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13M8 12l4 4 4-4"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></svg>';

    /* --- Desktop: inject into sm2-top-tools or legacy nav-cta --- */
    function tryInjectDesktop() {
      var topTools = document.querySelector('.sm2-top-tools');
      if (topTools) {
        var btn = document.createElement('button');
        btn.className = 'sm2-icon-btn sm-install-btn';
        btn.setAttribute('aria-label', 'Install Study Metrics app');
        btn.setAttribute('title', 'Install App');
        btn.innerHTML = INSTALL_ICON;
        btn.addEventListener('click', triggerInstall);
        topTools.insertBefore(btn, topTools.firstChild);
        return true;
      }
      /* Legacy pages (.site-head) */
      var navCta = document.querySelector('.site-head .nav-cta');
      if (navCta) {
        var lbtn = document.createElement('button');
        lbtn.className = 'btn btn-ghost sm-install-btn';
        lbtn.setAttribute('aria-label', 'Install Study Metrics app');
        lbtn.setAttribute('title', 'Install App');
        lbtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 12px;min-width:0';
        lbtn.innerHTML = INSTALL_ICON + '<span>Install</span>';
        lbtn.addEventListener('click', triggerInstall);
        var toggle = navCta.querySelector('#menuToggle, .menu-toggle');
        if (toggle) { navCta.insertBefore(lbtn, toggle); } else { navCta.appendChild(lbtn); }
        return true;
      }
      return false;
    }

    if (!tryInjectDesktop()) {
      var obs = new MutationObserver(function () {
        if (tryInjectDesktop()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); }, 10000);
    }

  }

  /* ── Offline / Online banner ── */
  function showOfflineBanner() {
    if (document.getElementById('sm-offline-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'sm-offline-banner';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.textContent = '⚠ You are offline — some features may be limited.';
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'background:#c98a12', 'color:#fff', 'font-size:13px',
      'font-family:var(--font-sans,system-ui,sans-serif)',
      'text-align:center', 'padding:7px 16px',
      'box-shadow:0 2px 8px rgba(0,0,0,.3)'
    ].join(';');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function hideOfflineBanner() {
    var bar = document.getElementById('sm-offline-banner');
    if (bar) bar.remove();
  }

  if (!navigator.onLine) showOfflineBanner();
  window.addEventListener('offline', showOfflineBanner);
  window.addEventListener('online', hideOfflineBanner);

})();
