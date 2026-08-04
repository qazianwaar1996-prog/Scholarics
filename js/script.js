(function () {
  "use strict";

  /* ── Scholarics rebrand: one-time migration of legacy storage keys
        (sm_*, sm2_*, sm-* → sc_*, sc2_*, sc-*) so returning users
        keep their saved data. ── */
  (function () {
    var FLAG = 'sc_migrated_v1';
    function migrate(store) {
      try {
        if (!store || store.getItem(FLAG)) return;
        var keys = [];
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i);
          if (k && (k.indexOf('sm2_') === 0 || k.indexOf('sm_') === 0 || k.indexOf('sm-') === 0)) {
            keys.push(k);
          }
        }
        keys.forEach(function (k) {
          var nk = k.indexOf('sm2_') === 0 ? 'sc2_' + k.slice(4)
                : k.indexOf('sm_') === 0  ? 'sc_' + k.slice(3)
                : 'sc-' + k.slice(3);
          if (store.getItem(nk) === null) store.setItem(nk, store.getItem(k));
        });
        store.setItem(FLAG, '1');
      } catch (e) { /* storage unavailable — skip migration */ }
    }
    migrate(window.localStorage);
    migrate(window.sessionStorage);
  })();

  window.SC = {
    $:  function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    round: function (n, d) {
      d = d === undefined ? 2 : d;
      var f = Math.pow(10, d);
      return Math.round((n + Number.EPSILON) * f) / f;
    },
    clamp: function (n, min, max) { return Math.max(min, Math.min(max, n)); },
    esc: function (s) {
      var map = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};
      return String(s || "").replace(/[&<>"']/g, function (m) { return map[m]; });
    },
    uid: function () { return Math.random().toString(36).slice(2, 9); },
    store: {
      get: function (k, fallback) {
        try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
        catch (e) { return fallback; }
      },
      set: function (k, v) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
      }
    },
    toast: function (msg, type) {
      var existing = document.querySelector('.toast');
      if (existing) { existing.remove(); }
      var toast = document.createElement("div");
      toast.className = "toast";
      if (type) toast.classList.add(type);
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.textContent = msg;
      document.body.appendChild(toast);
      void toast.offsetWidth;
      toast.classList.add("show");
      setTimeout(function () {
        toast.classList.remove("show");
        setTimeout(function () { if (toast.parentNode) toast.remove(); }, 400);
      }, 3000);
    },
    copy: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          SC.toast("Copied to clipboard!", "success");
        }).catch(function () {
          SC._copyFallback(text);
        });
      } else {
        SC._copyFallback(text);
      }
    },
    _copyFallback: function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); SC.toast("Copied!", "success"); }
      catch (e) { SC.toast("Copy failed", "error"); }
      ta.remove();
    },
    trackVisit: function () {
      try {
        var url = location.pathname.split('/').pop() || 'index.html';
        var skip = ['dashboard.html','index.html','404.html','about.html',
                    'blog.html','contact.html','privacy-policy.html',
                    'terms-and-conditions.html','disclaimer.html',
                    'academic-resources.html','gpa-help-center.html',
                    'study-guides.html','grading-guide.html',''];
        if (skip.indexOf(url) !== -1) return;
        var name = document.title
          .replace(/\s*[—|\-]\s*Scholarics\s*$/i, '')
          .replace(/\s*\|\s*Scholarics\s*$/i, '')
          .trim() || url;
        var recent = SC.store.get('sc_dash_recent', []);
        recent = recent.filter(function (r) { return r.url !== url; });
        recent.unshift({ url: url, name: name, ts: Date.now() });
        if (recent.length > 12) recent = recent.slice(0, 12);
        SC.store.set('sc_dash_recent', recent);
        SC.store.set('sc_last_open', { url: url, name: name, ts: Date.now() });
      } catch (e) {}
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { SC.trackVisit(); });
  } else {
    SC.trackVisit();
  }
})();