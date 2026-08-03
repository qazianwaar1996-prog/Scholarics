(function () {
  'use strict';
  var PUB_ID   = 'ca-pub-XXXXXXXXXXXXXXXXX';
  var KEY      = 'sm_cookie_consent';
  var ACCEPTED = 'accepted';
  var DECLINED = 'declined';
  function getConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {  }
  }
  var adsLoaded = false;
  function loadAds() {
    if (adsLoaded) return;
    adsLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + PUB_ID;
    document.head.appendChild(s);
    s.onload = function () {
      pushAllSlots();
    };
    window._smAdsPending = true;
  }
  function pushAllSlots() {
    var slots = document.querySelectorAll('ins.adsbygoogle:not([data-ad-pushed])');
    slots.forEach(function (ins) {
      try {
        ins.setAttribute('data-ad-pushed', '1');
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {  }
    });
  }
  function buildBanner() {
    var banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="consent-inner">' +
        '<p class="consent-text">' +
          '<strong>We use cookies to keep Study Metrics free.</strong> ' +
          'We display ads through Google AdSense. By clicking Accept you consent to ' +
          'personalised advertising cookies. ' +
          '<a href="privacy-policy.html">Privacy Policy</a>' +
        '</p>' +
        '<div class="consent-actions">' +
          '<button class="consent-btn-decline" id="consent-decline" type="button">Decline</button>' +
          '<button class="consent-btn-accept" id="consent-accept" type="button">Accept &amp; continue</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    setTimeout(function () { banner.classList.add('visible'); }, 300);
    document.getElementById('consent-accept').addEventListener('click', function () {
      setConsent(ACCEPTED);
      hideBanner(banner);
      loadAds();
      document.dispatchEvent(new Event('sm:consent:accepted'));
    });
    document.getElementById('consent-decline').addEventListener('click', function () {
      setConsent(DECLINED);
      hideBanner(banner);
    });
  }
  function hideBanner(banner) {
    banner.classList.remove('visible');
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 400);
  }
  function init() {
    var choice = getConsent();
    if (choice === ACCEPTED) {
      loadAds();
    } else if (choice === DECLINED) {
    } else {
      buildBanner();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();