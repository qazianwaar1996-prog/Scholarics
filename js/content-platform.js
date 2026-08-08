(function () {
  var bar = document.getElementById('readProgress');
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var scrollTop = h.scrollTop || document.body.scrollTop;
      var scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
      var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = pct + '%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  document.querySelectorAll('.copy-link-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || window.location.href;
      var done = function () {
        var original = btn.getAttribute('data-label') || btn.textContent.trim();
        btn.classList.add('copied');
        btn.textContent = 'Link copied';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.textContent = original;
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () { fallbackCopy(url, done); });
      } else {
        fallbackCopy(url, done);
      }
    });
  });
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {  }
    document.body.removeChild(ta);
    done();
  }
  document.querySelectorAll('.print-page-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });
  document.querySelectorAll('[data-search-target]').forEach(function (input) {
    var grid = document.querySelector(input.getAttribute('data-search-target'));
    var itemSel = input.getAttribute('data-search-item') || '.tool';
    var emptyEl = grid ? grid.parentElement.querySelector('.site-search-empty') : null;
    if (!grid) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      grid.querySelectorAll(itemSel).forEach(function (item) {
        var text = item.textContent.toLowerCase();
        var match = q === '' || text.indexOf(q) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
    });
  });

  /* ── Scroll-reveal activation ───────────────────────────────────────
     Content pages (guides, grading systems, resources) load this file
     instead of premium.js, so the .reveal elements here never receive
     the .active class and stay at opacity:0 (page looks blank).
     This mirrors premium.js initReveal() and is a no-op where .reveal
     is absent or already active. */
  (function activateReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;
    function show(el) { if (!el.classList.contains('active')) el.classList.add('active'); }
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    var vh = window.innerHeight || document.documentElement.clientHeight;
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) { show(el); } else { io.observe(el); }
    });
  })();
})();