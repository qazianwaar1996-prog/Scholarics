/**
 * StudyMetrics — Global Shell Extension  v2.0
 * Runs on EVERY page (sm2-shell + old site-head pages).
 *
 * On sm2-shell pages (body.sm2):
 *   – Injects AI Paraphraser sidebar link if missing
 *   – Injects AI Paraphraser footer link if missing
 *
 * On old site-head pages (body without .sm2):
 *   – Replaces the sparse nav-links with the full homepage navigation
 *   – Makes the nav link text consistent ("GPA Calculators", "Dashboard", etc.)
 *   – Ensures the mobile hamburger menu works correctly
 *   – Fixes any text overflow in the nav-cta at narrow widths
 */
(function () {
  'use strict';

  /* ── Helpers ── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* ── SM2 Shell pages: inject paraphraser link ── */
  function integrateSm2Shell() {
    /* Escape key closes the mobile sidebar */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { document.body.classList.remove('nav-open'); }
    });

    /* Tapping a nav link on mobile should close the sidebar */
    var sm2NavEl = qs('.sm2-nav');
    if (sm2NavEl) {
      sm2NavEl.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' && window.innerWidth < 980) {
          document.body.classList.remove('nav-open');
        }
      });
    }

    var sidebarNav = qs('.sm2-nav');
    if (sidebarNav) {
      if (!sidebarNav.querySelector('a[href="paraphraser.html"]')) {
        var aiTutorLink = sidebarNav.querySelector('a[href="ai.html"]');
        var paraLink = document.createElement('a');
        paraLink.href = 'paraphraser.html';
        paraLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> AI Paraphraser <span class="sm2-badge">NEW</span>';
        if (window.location.pathname.indexOf('paraphraser.html') !== -1) {
          sidebarNav.querySelectorAll('a').forEach(function (el) { el.classList.remove('active'); });
          paraLink.classList.add('active');
        }
        if (aiTutorLink && aiTutorLink.nextSibling) {
          sidebarNav.insertBefore(paraLink, aiTutorLink.nextSibling);
        } else {
          sidebarNav.appendChild(paraLink);
        }
      }
    }

    /* Footer injection */
    document.querySelectorAll('.foot-col').forEach(function (col) {
      var header = col.querySelector('h4');
      if (!header) return;
      var txt = header.textContent.trim().toLowerCase();
      if ((txt === 'productivity' || txt === 'guides & company' || txt === 'gpa & grades') &&
          !col.querySelector('a[href="paraphraser.html"]')) {
        var a = document.createElement('a');
        a.href = 'paraphraser.html';
        a.textContent = 'AI Paraphraser';
        col.appendChild(a);
      }
    });
  }

  /* ── Old site-head pages: unify the navbar ── */
  function unifyOldNavbar() {
    var siteHead = qs('.site-head');
    if (!siteHead) return;

    /* Replace nav-links with full homepage nav set */
    var navLinks = qs('.nav-links', siteHead);
    if (navLinks) {
      var path = window.location.pathname;
      var currentPage = path.split('/').pop() || 'index.html';
      var links = [
        { href: 'index.html#tools', label: 'Calculators', match: '' },
        { href: 'dashboard.html',   label: 'Dashboard',   match: 'dashboard.html' },
        { href: 'ai.html',          label: 'AI Tutor',    match: 'ai.html' },
        { href: 'notes.html',       label: 'Notes',       match: 'notes.html' },
        { href: 'grading-guide.html', label: 'Countries', match: 'grading-guide.html' },
        { href: 'academic-resources.html', label: 'Resources', match: 'academic-resources.html' },
      ];
      navLinks.innerHTML = links.map(function (l) {
        var isActive = l.match && currentPage === l.match;
        return '<a href="' + l.href + '"' + (isActive ? ' class="on"' : '') + '>' + l.label + '</a>';
      }).join('');
    }

    /* Build nav-cta: Search input + Notifications + Theme + Profile + Hamburger */
    var navCta = qs('.nav-cta', siteHead);
    if (navCta) {
      navCta.innerHTML =
        /* Search bar */
        '<div class="sh-search" style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--surface-2,#faf9f5);border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--ink-3);cursor:text;transition:border-color .15s" id="shSearchBar">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
          '<input type="search" id="sm2Search" placeholder="Search tools…" aria-label="Search tools" style="background:none;border:none;outline:none;font-size:13px;color:var(--ink);width:140px;font-family:inherit;min-width:0">' +
          '<kbd style="font-size:10px;padding:1px 5px;background:var(--border);border-radius:4px;color:var(--ink-3);font-family:inherit;white-space:nowrap">⌘K</kbd>' +
        '</div>' +
        /* Notifications */
        '<button class="sh-icon-btn" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);color:var(--ink-2);cursor:pointer;position:relative;transition:background .15s" aria-label="Notifications">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>' +
          '<span class="sm2-dot" style="position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--gold,#e6bd63);display:block"></span>' +
        '</button>' +
        /* Theme toggle */
        '<button class="sh-icon-btn sm-theme-toggle" onclick="sm2Theme()" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);color:var(--ink-2);cursor:pointer;transition:background .15s" aria-label="Toggle theme">' +
          '<svg class="sm-theme-icon-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>' +
        '</button>' +
        /* Profile */
        '<a href="profile.html" class="sh-icon-btn" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border);color:var(--ink-2);cursor:pointer;transition:background .15s" aria-label="Profile">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>' +
        '</a>' +
        /* Hamburger */
        '<button class="menu-toggle" id="menuToggle" aria-label="Menu" aria-expanded="false">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
        '</button>';

      /* Wire hamburger */
      var toggle = qs('#menuToggle', navCta);
      var ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
      var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

      function closeNav() {
        if (!navLinks) return;
        navLinks.classList.remove('open');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = ICON_MENU;
        }
      }

      if (toggle && navLinks) {
        toggle.dataset.smBound = '1';   /* flag so premium.js won't double-bind the same #menuToggle */
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = navLinks.classList.toggle('open');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
          toggle.innerHTML = open ? ICON_CLOSE : ICON_MENU;
        });

        /* Close when clicking outside the header */
        document.addEventListener('click', function (e) {
          if (!siteHead.contains(e.target)) { closeNav(); }
        });

        /* Close on Escape key */
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { closeNav(); }
        });

        /* Close when a nav link is tapped (mobile SPA-feel) */
        navLinks.addEventListener('click', function (e) {
          if (e.target.tagName === 'A') { closeNav(); }
        });
      }
    }

    /* Inject scoped styles for the enhanced header */
    if (!document.getElementById('sh-unified-style')) {
      var style = document.createElement('style');
      style.id = 'sh-unified-style';
      style.textContent = [
        /* Nav height alignment */
        '.nav{height:64px;gap:20px}',
        '.nav-links{gap:20px}',
        '.nav-links a{font-size:13.5px;font-weight:500;white-space:nowrap}',
        /* Prevent overflow */
        '.site-head{max-width:100vw}',
        'html,body{overflow-x:hidden;max-width:100%}',
        /* Search focus */
        '#sm2Search:focus+kbd{display:none}',
        /* Hide search+icons below 860px; hamburger handles nav */
        '@media(max-width:860px){',
        '  .sh-search,.sh-icon-btn:not(.sm-theme-toggle),.sm-install-btn{display:none!important}',
        '  .nav-cta{gap:8px}',
        '  .nav-links{top:64px;max-height:70vh;overflow-y:auto}',
        '}',
        /* On very small screens, shrink logo text */
        '@media(max-width:400px){',
        '  .logo span:not(.logo-mark){max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '}',
      ].join('');
      document.head.appendChild(style);
    }
  }

  /* ── Dynamically load sm-v2-features.js on old-nav pages if not already loaded ── */
  function loadFeaturesIfNeeded() {
    /* Only on old-nav pages (no .sm2) that don't already have it */
    if (document.body.classList.contains('sm2')) return;
    if (document.querySelector('script[src*="sm-v2-features"]')) return;
    var s = document.createElement('script');
    s.src = 'js/sm-v2-features.js';
    s.defer = true;
    document.head.appendChild(s);
  }
  loadFeaturesIfNeeded();

  /* ── sm2Theme: global theme toggle (needed on old-nav pages) ── */
  if (typeof window.sm2Theme === 'undefined') {
    window.sm2Theme = function () {
      var h = document.documentElement;
      var n = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      h.setAttribute('data-theme', n);
      try { localStorage.setItem('sm_theme', n); } catch (e) {}
      /* Update theme icon SVG */
      document.querySelectorAll('.sm-theme-icon-svg').forEach(function (svg) {
        if (n === 'dark') {
          svg.innerHTML = '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>';
        } else {
          svg.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>';
        }
      });
      if (window.SM && SM.toast) SM.toast(n === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on', 'info');
    };
  }

  ready(function () {
    /* Sync theme icon with current theme on load */
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
      document.querySelectorAll('.sm-theme-icon-svg').forEach(function (svg) {
        svg.innerHTML = '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>';
      });
    }

    if (document.body.classList.contains('sm2')) {
      integrateSm2Shell();
    } else {
      unifyOldNavbar();
    }
  });

})();
