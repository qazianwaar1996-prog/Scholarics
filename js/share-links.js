/* ==========================================================================
   Scholarics — Shareable Result Links
   Generic helpers used by gpa.js, cgpa.js, final-exam.js and
   attendance-calculator.js to:
     • Read calculator state encoded in the URL query string
     • Build a shareable URL that encodes the current calculator state
     • Copy that URL to the clipboard (via SC.copy when available)
     • Render a dismissible "shared result" banner above the calculator
   This file does not touch any existing markup/CSS — it injects its own
   minimal, theme-aware styles and only runs where explicitly called.
   ========================================================================== */
(function () {
  "use strict";

  function params() {
    try { return new URLSearchParams(window.location.search); }
    catch (e) { return new URLSearchParams(); }
  }

  function buildUrl(data) {
    var base = window.location.href.split("#")[0].split("?")[0];
    var url;
    try { url = new URL(base); }
    catch (e) { return base; }
    Object.keys(data || {}).forEach(function (key) {
      var val = data[key];
      if (val === undefined || val === null || val === "") return;
      url.searchParams.set(key, val);
    });
    var finalUrl = url.toString();
    window.SC_LAST_STATE_URL = finalUrl;
    return finalUrl;
  }

  function copyLink(data) {
    var url = buildUrl(data);
    window.SC_LAST_STATE_URL = url;
    if (window.SC && typeof SC.copy === "function") {
      SC.copy(url);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    return url;
  }

  function injectStyles() {
    if (document.getElementById("scSharedBannerStyle")) return;
    var s = document.createElement("style");
    s.id = "scSharedBannerStyle";
    s.textContent =
      ".sc-shared-banner{margin-bottom:var(--s5,20px);animation:scSharedIn .25s var(--ease,ease)}" +
      "@keyframes scSharedIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
      ".sc-shared-inner{display:flex;align-items:flex-start;gap:var(--s3,12px);background:var(--accent-dim,rgba(124,58,237,.08));border:1px solid var(--border,#e5e5e5);border-left:4px solid var(--accent,#7c3aed);border-radius:var(--r-md,14px);padding:var(--s4,16px) var(--s4,16px)}" +
      ".sc-shared-icon{color:var(--accent-strong,#7c3aed);flex-shrink:0;display:flex;margin-top:2px}" +
      ".sc-shared-text{flex:1;min-width:0}" +
      ".sc-shared-label{font-size:var(--step-xs,.75rem);font-weight:700;color:var(--accent-strong,#7c3aed);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}" +
      ".sc-shared-msg{font-size:var(--step-sm,.875rem);color:var(--ink,#1a1a1a);line-height:1.5}" +
      ".sc-shared-msg b{font-weight:700}" +
      ".sc-shared-close{background:none;border:none;font-size:1.3rem;line-height:1;color:var(--ink-3,#888);cursor:pointer;padding:0 4px;border-radius:var(--r-sm,8px);flex-shrink:0;transition:color .15s}" +
      ".sc-shared-close:hover{color:var(--ink,#1a1a1a)}" +
      "@media (max-width:560px){.sc-shared-inner{padding:var(--s3,12px)}}";
    document.head.appendChild(s);
  }

  /**
   * opts:
   *   message   {string}   HTML-safe message (inline <b> allowed)
   *   host      {Element}  element to insert the banner directly before
   *   onDismiss {function} called when the user closes the banner
   */
  function showBanner(opts) {
    opts = opts || {};
    var host = opts.host;
    if (!host || !host.parentNode) return null;
    var old = document.getElementById("scSharedBanner");
    if (old) old.remove();
    injectStyles();

    var banner = document.createElement("div");
    banner.id = "scSharedBanner";
    banner.className = "sc-shared-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML =
      '<div class="sc-shared-inner">' +
        '<span class="sc-shared-icon" aria-hidden="true">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>' +
        "</span>" +
        '<div class="sc-shared-text">' +
          '<div class="sc-shared-label">Shared result</div>' +
          '<div class="sc-shared-msg">' + (opts.message || "Someone shared their result with you. Edit any field below to make it your own.") + "</div>" +
        "</div>" +
        '<button type="button" class="sc-shared-close" aria-label="Dismiss shared result banner">&times;</button>' +
      "</div>";

    host.parentNode.insertBefore(banner, host);
    var closeBtn = banner.querySelector(".sc-shared-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        banner.remove();
        if (typeof opts.onDismiss === "function") opts.onDismiss();
      });
    }
    return banner;
  }

  window.SCShare = {
    params: params,
    buildUrl: buildUrl,
    copyLink: copyLink,
    showBanner: showBanner
  };
})();
