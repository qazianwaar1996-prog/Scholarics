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
      return new Promise(function(resolve, reject) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            SC.toast("Copied to clipboard!", "success");
            resolve(true);
          }).catch(function () {
            SC._copyFallback(text).then(function() { resolve(true); }).catch(function(err) { reject(err); });
          });
        } else {
          SC._copyFallback(text).then(function() { resolve(true); }).catch(function(err) { reject(err); });
        }
      });
    },
    _copyFallback: function (text) {
      return new Promise(function(resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;z-index:-1;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, 999999);
        try {
          var ok = document.execCommand('copy');
          ta.remove();
          if (ok) {
            SC.toast("Copied!", "success");
            resolve(true);
          } else {
            SC.toast("Copy failed", "error");
            reject(new Error('execCommand copy returned false'));
          }
        } catch (e) {
          ta.remove();
          SC.toast("Copy failed", "error");
          reject(e);
        }
      });
    },
    /* Anonymous device id used only to apply the free daily AI allowance.
       It is a random opaque token — no name, email, account or tracking
       profile — and the server never trusts it on its own (it is always
       combined with a hashed IP bucket). */
    visitorId: function () {
      var KEY = 'sc_vid';
      var id = '';
      try { id = localStorage.getItem(KEY) || ''; } catch (e) {}
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
        id = '';
        try {
          if (window.crypto && crypto.getRandomValues) {
            var a = new Uint8Array(16);
            crypto.getRandomValues(a);
            for (var i = 0; i < a.length; i++) id += a[i].toString(36);
            id = id.slice(0, 32);
          }
        } catch (e2) {}
        if (id.length < 8) id = (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 32);
        try { localStorage.setItem(KEY, id); } catch (e3) {}
      }
      /* Mirror into a first-party cookie so the request carries it even when a
         fetch is made without custom headers. SameSite=Lax, no cross-site use. */
      try {
        if (document.cookie.indexOf('sc_vid=') === -1) {
          document.cookie = 'sc_vid=' + id + ';path=/;max-age=31536000;SameSite=Lax';
        }
      } catch (e4) {}
      return id;
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