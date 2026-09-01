(function () {
  'use strict';
  var qs  = function (s, c) { return (c || document).querySelector(s); };
  var qsa = function (s, c) { return Array.from((c || document).querySelectorAll(s)); };
  var pRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.add('js-loaded');
  /* body.premium (the legacy purple/glass skin) is intentionally NOT applied.
     Calculator pages must use the unified gold/black design system in
     css/style.css — the same one the sc2 homepage uses — instead of the old
     body.premium overlay (which recoloured focus rings, field labels, grade
     letters and result heros purple via css/calculators.css). */
  function injectBackground () {
    var bg = document.createElement('div');
    bg.className = 'prem-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="blob blob-1"></div>' +
      '<div class="blob blob-2"></div>' +
      '<div class="blob blob-3"></div>';
    document.body.insertBefore(bg, document.body.firstChild);
    var noise = document.createElement('div');
    noise.className = 'noise-overlay';
    noise.setAttribute('aria-hidden', 'true');
    document.body.appendChild(noise);
  }
  function initScrollProgress () {
    var bar = document.createElement('div');
    bar.id = 'scroll-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Page reading progress');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    document.body.appendChild(bar);
    /* Coalesced into one write per animation frame: a scroll event can fire far
       more often than the screen refreshes, and reading scrollHeight inside the
       listener forced a synchronous layout on every one of them. */
    var queued = false, lastPct = -1;
    function paintProgress () {
      queued = false;
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var pct = total > 0 ? Math.round((window.scrollY / total) * 100) : 0;
      if (pct === lastPct) return;
      lastPct = pct;
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', pct);
    }
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paintProgress);
    }, { passive: true });
  }
  function initCursor () {
    if (pRM || isTouch) return;
    var dot  = document.createElement('div'); dot.id  = 'cursor-dot';
    var ring = document.createElement('div'); ring.id = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var mx = -200, my = -200, rx = -200, ry = -200;
    var rAF = null;
    /* Positions are written once per frame (a mouse can report faster than the
       display refreshes) and the loop parks itself once the ring has caught up,
       so an idle page costs nothing. */
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (rAF === null) rAF = requestAnimationFrame(animRing);
    }, { passive: true });
    function animRing () {
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = Math.round(rx) + 'px';
      ring.style.top  = Math.round(ry) + 'px';
      if (Math.abs(mx - rx) < 0.5 && Math.abs(my - ry) < 0.5) { rx = mx; ry = my; rAF = null; return; }
      rAF = requestAnimationFrame(animRing);
    }
    var hoverSel = 'a, button, [role="button"], input, select, textarea, label';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover');
    });
    document.addEventListener('mousedown', function () { document.body.classList.add('cursor-click'); });
    document.addEventListener('mouseup',   function () { document.body.classList.remove('cursor-click'); });
    document.addEventListener('mouseleave', function () {
      dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      dot.style.opacity = '1'; ring.style.opacity = '1';
    });
  }
  function initMouseGlow () {
    if (pRM || isTouch) return;
    var glow = document.createElement('div');
    glow.id = 'mouse-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    var tX = -600, tY = -600, cX = -600, cY = -600, raf = null;
    document.addEventListener('mousemove', function (e) {
      tX = e.clientX; tY = e.clientY;
      if (raf === null) raf = requestAnimationFrame(update);
    }, { passive: true });
    /* Same as the cursor ring: the easing loop stops once it has settled instead
       of running a style write every frame for the life of the page. */
    function update () {
      cX += (tX - cX) * 0.07;
      cY += (tY - cY) * 0.07;
      glow.style.left = Math.round(cX) + 'px';
      glow.style.top  = Math.round(cY) + 'px';
      if (Math.abs(tX - cX) < 0.5 && Math.abs(tY - cY) < 0.5) { cX = tX; cY = tY; raf = null; return; }
      raf = requestAnimationFrame(update);
    }
  }
  function initReveal () {
    var targets = qsa('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('active'); });
      return;
    }
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          entry.target.classList.add('active');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    targets.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setTimeout(function () { el.classList.add('active'); }, 50);
      } else {
        io.observe(el);
      }
    });
  }
  function animateNumber (el, from, to, duration) {
    if (pRM) { el.textContent = el.textContent; return; }
    var txt = el.textContent.trim();
    var suffix = txt.replace(/[0-9.]/g, '');
    var start  = null;
    var isFloat = String(to).includes('.');
    var dec = isFloat ? String(to).split('.')[1].length : 0;
    function step (ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var val = from + (to - from) * ease;
      el.textContent = (isFloat ? val.toFixed(dec) : Math.round(val)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function initCounters () {
    var statNums = qsa('.hero-stats .n, .stats-grid .n');
    if (!statNums.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el  = entry.target;
        var txt = el.textContent.trim();
        var num = parseFloat(txt.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) animateNumber(el, 0, num, 1600);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    statNums.forEach(function (el) { io.observe(el); });
  }
  function initNavbar () {
    var header  = qs('.site-head');
    var toggle  = qs('#menuToggle');
    var navLinks = qs('.nav-links');
    var btt     = qs('#backToTop');
    window.addEventListener('scroll', function () {
      if (header) header.classList.toggle('nav-scrolled', window.scrollY > 50);
      if (btt)    btt.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });
    if (btt) {
      btt.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      btt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
    if (toggle && navLinks && !toggle.dataset.scBound) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = navLinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = open
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
      });
      document.addEventListener('click', function (e) {
        if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
          navLinks.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    }
  }
  function initSmoothScroll () {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      // Never intercept: external links, mailto, tel, javascript, or plain page navigations
      if (!href || href.indexOf('#') === -1) return;
      // Never intercept links to other pages (e.g. academic-resources.html, gpa.html)
      if (href.indexOf('://') !== -1) return;
      var id = '';
      // Pure hash link: #tools
      if (href.startsWith('#') && href.length > 1) {
        id = href;
      }
      // Same-page link: /#tools or just the page#hash
      else if (href.indexOf('#') !== -1) {
        var parts = href.split('#');
        var pagePart = parts[0];
        var hashPart = parts[1];
        if (!hashPart) return;
        // Check if this points to the current page
        var currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (!pagePart || pagePart === currentPage) {
          id = '#' + hashPart;
        } else {
          return; // Different page, let browser handle
        }
      } else {
        return;
      }
      var target = qs(id);
      if (!target) return;
      e.preventDefault();
      var headerH = (qs('.site-head') || qs('.sc2-top') || { offsetHeight: 0 }).offsetHeight;
      var top = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }
  function initPageTransition () {
    /* Removed: caused blank/black pages by setting body opacity:0 before navigation.
       The 250ms fade + SW cache intercept left pages permanently blank. */
  }
  function initRipple () {
    if (pRM) return;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2;
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top  - size / 2;
      var rip = document.createElement('span');
      rip.className = 'btn-ripple';
      rip.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;';
      btn.appendChild(rip);
      setTimeout(function () { if (rip.parentNode) rip.remove(); }, 700);
    });
  }
  function initCardTilt () {
    if (pRM || isTouch) return;
    qsa('.tool.live').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top)  / rect.height;
        card.style.setProperty('--tilt-x', ((y - 0.5) * -8) + 'deg');
        card.style.setProperty('--tilt-y', ((x - 0.5) *  8) + 'deg');
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
        card.classList.add('tilting');
      });
      card.addEventListener('mouseleave', function () {
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
        card.classList.remove('tilting');
      });
    });
  }
  function initMagneticButtons () {
    if (pRM || isTouch) return;
    qsa('.btn-primary.btn-lg').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * 0.18;
        var y = (e.clientY - rect.top  - rect.height / 2) * 0.22;
        btn.style.setProperty('--mag-x', x + 'px');
        btn.style.setProperty('--mag-y', y + 'px');
        btn.classList.add('magnetic');
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.removeProperty('--mag-x');
        btn.style.removeProperty('--mag-y');
        btn.classList.remove('magnetic');
      });
    });
  }
  function initInputEffects () {
    qsa('.field').forEach(function (field) {
      var input = qs('input, select, textarea', field);
      var label = qs('label', field);
      if (!input || !label) return;
      input.addEventListener('focus', function () { label.classList.add('field-focus'); });
      input.addEventListener('blur',  function () { label.classList.remove('field-focus'); });
    });
    qsa('.gpa-big, .res-big, .grade-big, .gauge-num .n, .ring .pct').forEach(function (el) {
      var prev = el.textContent;
      new MutationObserver(function () {
        if (el.textContent !== prev && el.textContent !== '—') {
          prev = el.textContent;
          el.classList.remove('num-updated');
          void el.offsetWidth;
          el.classList.add('num-updated');
          setTimeout(function () { el.classList.remove('num-updated'); }, 500);
        }
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
  function initGpaRing () {
    var arc = qs('#gpaRingArc');
    var gpaBig = qs('.gpa-big');
    if (!arc || !gpaBig) return;
    function updateRing (gpa) {
      var pct = Math.min(Math.max(parseFloat(gpa) || 0, 0), 4) / 4;
      arc.style.strokeDashoffset = 314 - (314 * pct);
    }
    new MutationObserver(function () { updateRing(gpaBig.textContent); })
      .observe(gpaBig, { childList: true, characterData: true, subtree: true });
    setTimeout(function () { updateRing(gpaBig.textContent); }, 400);
  }
  function initPDFButton () {
    /* Handled globally by initGlobalCalculatorActions in js/calculators.js */
  }
  function initShareButtons () {
    /* Handled globally by initGlobalCalculatorActions in js/calculators.js */
  }
  function initIconAnims () {
    if (pRM) return;
    qsa('.hiw-num').forEach(function (el) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          el.classList.add('num-pop');
          setTimeout(function () { el.classList.remove('num-pop'); }, 600);
          io.unobserve(el);
        });
      }, { threshold: 0.8 });
      io.observe(el);
    });
  }
  function initFAQ () {
    qsa('.faq details').forEach(function (detail) {
      detail.addEventListener('toggle', function () {
        var p = qs('p', detail);
        if (detail.open && p && !pRM) {
          p.style.animation = 'none';
          void p.offsetWidth;
          p.style.animation = 'rowIn .3s cubic-bezier(.22,1,.36,1)';
        }
      });
    });
  }
  function initKickers () {
    if (pRM) return;
    qsa('.kicker').forEach(function (el) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            el.classList.add('kicker-visible');
            io.unobserve(el);
          }
        });
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }
  function initParticles () {
    if (pRM || isTouch) return;
    var container = document.createElement('div');
    container.className = 'particles';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
    var colors = [
      'rgba(124,58,237,.5)', 'rgba(37,99,235,.45)',
      'rgba(6,182,212,.45)', 'rgba(139,92,246,.5)'
    ];
    var count = window.innerWidth > 1024 ? 16 : window.innerWidth > 768 ? 10 : 6;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var x   = Math.random() * 100;
      var dur = 14 + Math.random() * 18;
      var del = -(Math.random() * dur);
      var tx  = (Math.random() - 0.5) * 100;
      var sz  = 2 + Math.random() * 2.5;
      p.style.cssText = [
        'left:' + x + '%',
        '--d:' + dur + 's',
        '--tx:' + tx + 'px',
        'animation-delay:' + del + 's',
        'width:' + sz + 'px',
        'height:' + sz + 'px',
        'background:' + colors[i % colors.length]
      ].join(';');
      container.appendChild(p);
    }
  }
  function initRowButtons () {
    if (pRM) return;
    qsa('#addRow, #addRow2').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.classList.add('btn-spring');
        setTimeout(function () { btn.classList.remove('btn-spring'); }, 400);
      });
    });
  }
  function initNewsletter () {
    var form = qs('#newsletterForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = qs('input[type="email"]', form);
      if (!input || !input.checkValidity()) return;
      var submit = form.querySelector('button[type="submit"]');
      if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: input.value.trim(),
          page: window.location.pathname,
          source: 'newsletter-footer'
        })
      }).then(function (res) {
        if (res.ok) {
          if (window.SC && SC.toast) SC.toast("Thanks — you're subscribed!", 'success');
          try { localStorage.setItem('sc_ec_subscribed', '1'); } catch (err) {}
          form.reset();
          return;
        }

        /* Non-2xx — read the body so a duplicate (already subscribed) is
           shown as a friendly message, not a generic failure. */
        return res.json().then(function (data) {
          data = data || {};
          var isDuplicate =
            res.status === 409 ||
            data.duplicate === true ||
            /already\s+subscribed|already\s+on\s+(our\s+)?waitlist|already\s+registered/i
              .test(String(data.error || ""));

          if (isDuplicate) {
            var dupMsg = /waitlist/i.test(String(data.error || ""))
              ? String(data.error)
              : "You're already subscribed! 🎉";
            if (window.SC && SC.toast) SC.toast(dupMsg, 'success');
            return;
          }
          throw new Error(String(data.error || 'subscribe failed'));
        }).catch(function () {
          if (res.status === 409) {
            if (window.SC && SC.toast) SC.toast("You're already subscribed! 🎉", 'success');
            return;
          }
          if (window.SC && SC.toast) SC.toast('Unable to subscribe right now. Please try again.', 'error');
        });
      }).catch(function () {
        if (window.SC && SC.toast) SC.toast('Unable to subscribe right now. Please try again.', 'error');
      }).finally(function () {
        if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
      });
    });
  }
  function init () {
    /* injectBackground() disabled — legacy purple blob/noise skin removed (Scholarics v2 design system) */
    initScrollProgress();
    initNavbar();
    initSmoothScroll();
    initRipple();
    initFAQ();
    initKickers();
    initRowButtons();
    initNewsletter();
    initGpaRing();
    initPDFButton();
    initShareButtons();
    initInputEffects();
    if (!pRM) {
      initReveal();
      initCounters();
      /* initCardTilt(), initMagneticButtons(), initCursor(), initMouseGlow(), initParticles()
         disabled — heavy mousemove/rAF-driven decorations from the legacy purple skin,
         removed for the flat Scholarics v2 design system and to cut runtime CPU cost. */
      initIconAnims();
    } else {
      qsa('.reveal').forEach(function (el) { el.classList.add('active'); });
    }
    initPageTransition();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();