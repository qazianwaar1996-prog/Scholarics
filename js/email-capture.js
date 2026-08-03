/* ==========================================================================
   StudyMetrics — Email Capture Modal
   • Submits to the Cloudflare Pages Function /api/subscribe
   • Triggers on: 3rd pageview in this session (sessionStorage) OR
     45s time-on-page, whichever comes first
   • Respects a 7-day cooldown after any dismissal (localStorage)
   • Never shows again once a visitor has subscribed (localStorage)
   • Self-contained: injects its own styles, no shared CSS/markup touched
   ========================================================================== */
(function () {
  "use strict";

  var FORM_ENDPOINT   = "/api/subscribe"; /* Cloudflare Pages Function (was Formspree) */
  var LAST_SHOWN_KEY  = "sm_ec_last_shown";   /* localStorage: ms timestamp of last time modal was shown */
  var SUBSCRIBED_KEY  = "sm_ec_subscribed";   /* localStorage: "1" once the visitor has submitted an email */
  var SESSION_SEEN_KEY= "sm_ec_seen_session"; /* sessionStorage: modal already shown this session */
  var PAGEVIEW_KEY     = "sm_ec_pageviews";   /* sessionStorage: pages viewed this session */
  var COOLDOWN_MS      = 7 * 24 * 60 * 60 * 1000; /* 7 days */
  var PAGEVIEW_TRIGGER = 3;
  var TIME_TRIGGER_MS  = 45000;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  function isSubscribed() { return lsGet(SUBSCRIBED_KEY) === "1"; }
  function inCooldown() {
    var last = parseInt(lsGet(LAST_SHOWN_KEY), 10);
    return !!last && (Date.now() - last) < COOLDOWN_MS;
  }
  function eligible() {
    return !isSubscribed() && !inCooldown() && ssGet(SESSION_SEEN_KEY) !== "1";
  }

  function bumpPageviews() {
    var n = (parseInt(ssGet(PAGEVIEW_KEY), 10) || 0) + 1;
    ssSet(PAGEVIEW_KEY, String(n));
    return n;
  }

  /* ── Styles (injected once) ── */
  function injectStyles() {
    if (document.getElementById("smEcStyle")) return;
    var s = document.createElement("style");
    s.id = "smEcStyle";
    s.textContent =
      ".sm-ec-overlay{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(10,10,10,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:var(--s4,16px);animation:smEcFade .18s ease}" +
      "@keyframes smEcFade{from{opacity:0}to{opacity:1}}" +
      "@keyframes smEcPop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}" +
      ".sm-ec-box{position:relative;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;background:var(--surface,#fff);border:1px solid var(--border,#e5e5e5);border-radius:var(--r-lg,20px);box-shadow:var(--shadow,0 24px 60px rgba(0,0,0,.25));padding:var(--s6,32px) var(--s5,24px) var(--s5,24px);animation:smEcPop .22s var(--ease,ease)}" +
      ".sm-ec-close{position:absolute;top:14px;right:14px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:999px;color:var(--ink-3,#888);cursor:pointer;transition:background .15s,color .15s}" +
      ".sm-ec-close:hover{background:var(--surface-2,#f2f2f2);color:var(--ink,#1a1a1a)}" +
      ".sm-ec-icon{width:46px;height:46px;border-radius:14px;background:var(--accent-dim,rgba(124,58,237,.1));color:var(--accent-strong,#7c3aed);display:flex;align-items:center;justify-content:center;margin-bottom:var(--s4,16px)}" +
      ".sm-ec-box h3{font-size:var(--step-lg,1.4rem);margin-bottom:var(--s2,8px);line-height:1.2}" +
      ".sm-ec-box p.sm-ec-sub{font-size:var(--step-sm,.9rem);color:var(--ink-2,#555);line-height:1.5;margin-bottom:var(--s5,20px)}" +
      ".sm-ec-field{display:flex;flex-direction:column;gap:6px;margin-bottom:var(--s4,16px)}" +
      ".sm-ec-field label{font-size:var(--step-sm,.85rem);font-weight:500;color:var(--ink-2,#555)}" +
      ".sm-ec-field input{width:100%;padding:12px var(--s4,16px);font-size:var(--step-md,1rem);background:var(--surface,#fff);border:1px solid var(--border,#ccc);border-radius:var(--r-md,14px);color:var(--ink,#1a1a1a)}" +
      ".sm-ec-field input:focus{outline:none;border-color:var(--accent,#7c3aed);box-shadow:0 0 0 3px var(--accent-dim,rgba(124,58,237,.12))}" +
      ".sm-ec-actions{display:flex;flex-direction:column;gap:var(--s3,10px)}" +
      ".sm-ec-actions .btn{width:100%;justify-content:center}" +
      ".sm-ec-note{font-size:var(--step-xs,.75rem);color:var(--ink-3,#888);text-align:center;margin-top:var(--s4,16px);line-height:1.4}" +
      ".sm-ec-error{font-size:var(--step-xs,.8rem);color:var(--danger,#d33);margin-top:-6px;margin-bottom:var(--s3,10px);display:none}" +
      ".sm-ec-error.show{display:block}" +
      ".sm-ec-success{display:none;text-align:center;padding:var(--s4,10px) 0}" +
      ".sm-ec-success.show{display:block}" +
      ".sm-ec-success .sm-ec-icon{margin:0 auto var(--s4,16px);background:var(--ok-dim,rgba(47,158,91,.12));color:var(--ok,#2f9e5b)}" +
      ".sm-ec-form.hide{display:none}";
    document.head.appendChild(s);
  }

  var ICON_MAIL = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>';
  var ICON_CHECK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function closeModal(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener("keydown", onEsc);
  }
  function onEsc(e) {
    if (e.key === "Escape") {
      var ov = document.getElementById("smEcOverlay");
      if (ov) closeModal(ov);
    }
  }

  function showModal() {
    if (document.getElementById("smEcOverlay")) return;
    injectStyles();

    var overlay = document.createElement("div");
    overlay.id = "smEcOverlay";
    overlay.className = "sm-ec-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Subscribe for study tips");

    overlay.innerHTML =
      '<div class="sm-ec-box">' +
        '<button type="button" class="sm-ec-close" id="smEcCloseBtn" aria-label="Close">' + ICON_CLOSE + "</button>" +
        '<form id="smEcForm" class="sm-ec-form" novalidate>' +
          '<div class="sm-ec-icon">' + ICON_MAIL + "</div>" +
          "<h3>Get free study tips in your inbox</h3>" +
          '<p class="sm-ec-sub">Join students getting GPA tips, grading guides, and new tool alerts. No spam — unsubscribe anytime.</p>' +
          '<input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">' +
          '<input type="hidden" name="_subject" value="New email capture — Study Metrics">' +
          '<div class="sm-ec-field">' +
            '<label for="smEcEmail">Email address</label>' +
            '<input type="email" id="smEcEmail" name="email" placeholder="you@example.com" required autocomplete="email">' +
          "</div>" +
          '<div class="sm-ec-error" id="smEcError">Please enter a valid email address.</div>' +
          '<div class="sm-ec-actions">' +
            '<button type="submit" class="btn btn-primary" id="smEcSubmit">Subscribe — it\u2019s free</button>' +
            '<button type="button" class="btn btn-ghost" id="smEcNoThanks">No thanks</button>' +
          "</div>" +
          '<p class="sm-ec-note">By subscribing you agree to our <a href="privacy-policy.html">Privacy Policy</a>.</p>' +
        "</form>" +
        '<div class="sm-ec-success" id="smEcSuccess">' +
          '<div class="sm-ec-icon">' + ICON_CHECK + "</div>" +
          "<h3>You're in!</h3>" +
          '<p class="sm-ec-sub">Thanks for subscribing — check your inbox for a welcome note.</p>' +
        "</div>" +
      "</div>";

    document.body.appendChild(overlay);
    document.addEventListener("keydown", onEsc);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
    document.getElementById("smEcCloseBtn").addEventListener("click", function () {
      closeModal(overlay);
    });
    document.getElementById("smEcNoThanks").addEventListener("click", function () {
      closeModal(overlay);
    });

    var form = document.getElementById("smEcForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailInput = document.getElementById("smEcEmail");
      var errorEl = document.getElementById("smEcError");
      var email = (emailInput.value || "").trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        errorEl.classList.add("show");
        emailInput.focus();
        return;
      }
      errorEl.classList.remove("show");
      var submitBtn = document.getElementById("smEcSubmit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Subscribing\u2026";

      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          email: email,
          page: window.location.pathname,
          _subject: "New email capture — Study Metrics"
        })
      }).then(function (res) {
        if (res.ok) {
          lsSet(SUBSCRIBED_KEY, "1");
          form.classList.add("hide");
          document.getElementById("smEcSuccess").classList.add("show");
          setTimeout(function () { closeModal(overlay); }, 2500);
        } else {
          errorEl.textContent = "Something went wrong — please try again.";
          errorEl.classList.add("show");
          submitBtn.disabled = false;
          submitBtn.textContent = "Subscribe — it\u2019s free";
        }
      }).catch(function () {
        errorEl.textContent = "Could not connect — please try again later.";
        errorEl.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Subscribe — it\u2019s free";
      });
    });
  }

  function maybeShow() {
    if (!eligible()) return;
    ssSet(SESSION_SEEN_KEY, "1");
    lsSet(LAST_SHOWN_KEY, String(Date.now()));
    showModal();
  }

  function init() {
    var n = bumpPageviews();
    if (!eligible()) return;
    if (n >= PAGEVIEW_TRIGGER) {
      maybeShow();
      return;
    }
    setTimeout(maybeShow, TIME_TRIGGER_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
