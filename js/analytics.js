/**
 * analytics.js — Google Analytics 4 (Phase 9.2)
 *
 * Consent-aware GA4 loader.
 * - GA4 loads in analytics-only mode on all visits (no ad personalisation).
 * - If the user has accepted cookies (sm_cookie_consent = "accepted"),
 *   full measurement (including personalisation signals) is enabled.
 *
 * Replace G-XXXXXXXXXX with your real GA4 Measurement ID before deploying.
 * Replace the gtag-placeholder script src if your ID changes.
 *
 * Google Search Console & Bing Webmaster verification tags are in each
 * page's <head> — see the meta[name="google-site-verification"] and
 * meta[name="msvalidate.01"] entries injected by the build process.
 */
(function () {
  'use strict';

  var GA_ID = 'G-XXXXXXXXXX'; // ← replace with your Measurement ID
  var CONSENT_KEY = 'sm_cookie_consent';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  /* ── Load gtag.js ─────────────────────────────────────────── */
  function loadGA4() {
    if (window._ga4Loaded) return;
    window._ga4Loaded = true;

    /* Inject the script tag */
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    /* Initialise dataLayer */
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };

    var consent = getConsent();
    var adStorage   = consent === 'accepted' ? 'granted' : 'denied';
    var analyticsStorage = 'granted'; // always on for basic measurement

    /* Default consent state */
    gtag('consent', 'default', {
      'ad_storage':             adStorage,
      'analytics_storage':      analyticsStorage,
      'ad_user_data':           adStorage,
      'ad_personalization':     adStorage,
      'wait_for_update':        500
    });

    gtag('js', new Date());
    gtag('config', GA_ID, {
      'anonymize_ip': true,
      'send_page_view': true
    });
  }

  /* ── Upgrade consent when user accepts in consent banner ──── */
  /* consent.js fires a custom event 'sm:consent:accepted' */
  document.addEventListener('sm:consent:accepted', function () {
    if (window.gtag) {
      gtag('consent', 'update', {
        'ad_storage':         'granted',
        'ad_user_data':       'granted',
        'ad_personalization': 'granted'
      });
    }
  });

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    loadGA4();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
