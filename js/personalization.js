(function () {
  'use strict';
  if (typeof window.SM === 'undefined') {
    console.warn('personalization.js: SM not found. Load script.js first.');
    return;
  }
  var store = SM.store;
  var esc   = SM.esc;
  var TOOLS = [
    { slug:'gpa',                    name:'GPA Calculator',          url:'gpa.html',                    cat:'GPA & Grades',  icon:'📐' },
    { slug:'cgpa',                   name:'CGPA Calculator',         url:'cgpa.html',                   cat:'GPA & Grades',  icon:'📊' },
    { slug:'semester-gpa',           name:'Semester GPA',            url:'semester-gpa.html',           cat:'GPA & Grades',  icon:'📋' },
    { slug:'gpa-converter',          name:'GPA Converter',           url:'gpa-converter.html',          cat:'GPA & Grades',  icon:'🌐' },
    { slug:'target-gpa',             name:'Target GPA',              url:'target-gpa.html',             cat:'GPA & Grades',  icon:'🎯' },
    { slug:'gpa-improvement-planner',name:'GPA Planner',             url:'gpa-improvement-planner.html',cat:'GPA & Grades',  icon:'📈' },
    { slug:'percentage-to-gpa',      name:'% to GPA',                url:'percentage-to-gpa.html',      cat:'GPA & Grades',  icon:'🔄' },
    { slug:'gpa-to-percentage',      name:'GPA to %',                url:'gpa-to-percentage.html',      cat:'GPA & Grades',  icon:'🔄' },
    { slug:'grade-calculator',       name:'Grade Calculator',        url:'grade-calculator.html',       cat:'Grade Tools',   icon:'🧮' },
    { slug:'final-exam-calculator',  name:'Final Exam Calculator',   url:'final-exam-calculator.html',  cat:'Grade Tools',   icon:'📝' },
    { slug:'final-grade',            name:'Final Grade',             url:'final-grade.html',            cat:'Grade Tools',   icon:'✅' },
    { slug:'required-marks',         name:'Required Marks',          url:'required-marks.html',         cat:'Grade Tools',   icon:'🎯' },
    { slug:'grade-predictor',        name:'Grade Predictor',         url:'grade-predictor.html',        cat:'Grade Tools',   icon:'🔮' },
    { slug:'assignment-weight',      name:'Assignment Weight',       url:'assignment-weight.html',      cat:'Grade Tools',   icon:'⚖️' },
    { slug:'class-average',          name:'Class Average',           url:'class-average.html',          cat:'Grade Tools',   icon:'📉' },
    { slug:'percentage-calculator',  name:'Percentage Calculator',   url:'percentage-calculator.html',  cat:'Grade Tools',   icon:'💯' },
    { slug:'attendance-calculator',  name:'Attendance Tracker',      url:'attendance-calculator.html',  cat:'Planning',      icon:'📅' },
    { slug:'attendance-percentage',  name:'Attendance %',            url:'attendance-percentage.html',  cat:'Planning',      icon:'📊' },
    { slug:'attendance-goal',        name:'Attendance Goal',         url:'attendance-goal.html',        cat:'Planning',      icon:'🏁' },
    { slug:'study-time',             name:'Study Time Planner',      url:'study-time.html',             cat:'Planning',      icon:'⏱️' },
    { slug:'pomodoro',               name:'Pomodoro Timer',          url:'pomodoro.html',               cat:'Planning',      icon:'🍅' },
    { slug:'study-schedule',         name:'Study Schedule',          url:'study-schedule.html',         cat:'Planning',      icon:'📆' },
    { slug:'credit-hour-planner',    name:'Credit Hour Planner',     url:'credit-hour-planner.html',    cat:'Planning',      icon:'🎓' },
    { slug:'scientific-calculator',  name:'Scientific Calculator',   url:'scientific-calculator.html',  cat:'Utilities',     icon:'🔬' },
    { slug:'basic-calculator',       name:'Basic Calculator',        url:'basic-calculator.html',       cat:'Utilities',     icon:'➕' },
    { slug:'word-counter',           name:'Word Counter',            url:'word-counter.html',           cat:'Utilities',     icon:'📝' },
  ];
  var TOOL_BY_SLUG = {};
  TOOLS.forEach(function (t) { TOOL_BY_SLUG[t.slug] = t; });
  var K = {
    THEME         : 'sm_theme',
    SEARCH_HIST   : 'sm_search_history',
    FREQ          : 'sm_freq',
    LAST_OPEN     : 'sm_last_open',
    RECENT        : 'sm_dash_recent',
    FAVORITES     : 'sm_dash_favorites',
    USERNAME      : 'sm_dash_name',
  };
  var SM_THEME = (function () {
    var ATTR = 'data-theme';
    function _apply(theme) {
      document.documentElement.setAttribute(ATTR, theme);
      document.querySelectorAll('.sm-theme-toggle').forEach(function (btn) {
        btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        var icon = btn.querySelector('.sm-theme-icon');
        if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      });
    }
    function _saved() {
      /* Theme is stored as a RAW string ('dark'/'light') to stay consistent with
         the inline boot script and the v2 sm2Theme() helper. Using SM.store here
         would JSON-encode the value and break cross-page theme persistence. */
      try { return localStorage.getItem(K.THEME) || null; } catch (e) { return null; }
    }
    function _system() {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
    }
    function current() {
      return _saved() || _system();
    }
    function toggle() {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(K.THEME, next); } catch (e) {}
      _apply(next);
      SM.toast(next === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on', 'info');
    }
    function init() {
      _apply(current());
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
          if (!_saved()) _apply(e.matches ? 'dark' : 'light');
        });
      }
    }
    return { current: current, toggle: toggle, init: init };
  })();
  function injectThemeToggle() {
    if (document.querySelector('.sm-theme-toggle')) return;
    var nav = document.querySelector('.site-head .nav-links') ||
              document.querySelector('.site-head nav') ||
              document.querySelector('.site-head');
    if (!nav) return;
    var btn = document.createElement('button');
    btn.className   = 'btn btn-ghost sm-theme-toggle';
    btn.style.cssText = 'padding:8px 10px;min-width:0;font-size:1.1rem;line-height:1;border-radius:var(--r-md)';
    btn.setAttribute('aria-pressed', SM_THEME.current() === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label', SM_THEME.current() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = '<span class="sm-theme-icon">' + (SM_THEME.current() === 'dark' ? '☀️' : '🌙') + '</span>';
    btn.addEventListener('click', SM_THEME.toggle);
    nav.appendChild(btn);
  }
  function trackFrequency() {
    var url  = location.pathname.split('/').pop() || '';
    var tool = TOOLS.find(function (t) { return t.url === url; });
    if (!tool) return;
    store.set(K.LAST_OPEN, { url: tool.url, name: tool.name, ts: Date.now() });
    var freq = store.get(K.FREQ, {});
    freq[tool.slug] = (freq[tool.slug] || 0) + 1;
    store.set(K.FREQ, freq);
  }
  function getRecommended(limit, excludeSlugs) {
    var freq      = store.get(K.FREQ, {});
    var recent    = store.get(K.RECENT, []);
    var favorites = store.get(K.FAVORITES, []);
    var exclude   = (excludeSlugs || []).reduce(function (m, s) { m[s] = true; return m; }, {});
    var now = Date.now();
    var DAY = 86400000;
    var recencyMap = {};
    recent.forEach(function (r, i) {
      var urlSlug = r.url.replace('.html', '');
      var tool = TOOLS.find(function (t) { return t.url === r.url; });
      if (!tool) return;
      var age = (now - r.ts) / DAY;
      var score = Math.max(0, 1 - age / 30);
      if (!recencyMap[tool.slug] || score > recencyMap[tool.slug]) {
        recencyMap[tool.slug] = score;
      }
    });
    var scores = TOOLS.map(function (t) {
      if (exclude[t.slug]) return null;
      var f  = Math.min(freq[t.slug] || 0, 20) / 20;
      var r  = recencyMap[t.slug] || 0;
      var fv = favorites.indexOf(t.slug) !== -1 ? 0.5 : 0;
      return { tool: t, score: f * 0.5 + r * 0.35 + fv * 0.15 };
    }).filter(Boolean);
    scores.sort(function (a, b) { return b.score - a.score; });
    var top = scores.filter(function (s) { return s.score > 0; }).slice(0, limit);
    if (top.length < limit) {
      var defaults = ['gpa', 'final-exam-calculator', 'attendance-calculator',
                      'grade-predictor', 'study-schedule', 'target-gpa'];
      defaults.forEach(function (slug) {
        if (top.length >= limit) return;
        if (exclude[slug]) return;
        if (top.find(function (s) { return s.tool.slug === slug; })) return;
        var t = TOOL_BY_SLUG[slug];
        if (t) top.push({ tool: t, score: 0 });
      });
    }
    return top.slice(0, limit).map(function (s) { return s.tool; });
  }
  function initSmartSearch() {
    var inputs = document.querySelectorAll('.sm-search-input');
    if (!inputs.length) return;
    inputs.forEach(function (input) {
      var wrapper = input.closest('.sm-search-wrap') || input.parentElement;
      var list    = wrapper.querySelector('.sm-search-suggestions');
      if (!list) {
        list = document.createElement('ul');
        list.className = 'sm-search-suggestions';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Search suggestions');
        wrapper.appendChild(list);
      }
      var history = store.get(K.SEARCH_HIST, []);
      function show(items) {
        list.innerHTML = '';
        if (!items.length) { list.hidden = true; return; }
        items.forEach(function (item) {
          var li = document.createElement('li');
          li.setAttribute('role', 'option');
          li.innerHTML = '<span class="sm-sugg-icon">' + esc(item.icon || '') + '</span>'
            + '<span class="sm-sugg-name">' + esc(item.name) + '</span>'
            + (item.cat ? '<span class="sm-sugg-cat">' + esc(item.cat) + '</span>' : '');
          li.addEventListener('mousedown', function (e) {
            e.preventDefault();
            saveSearch(item.name);
            location.href = item.url;
          });
          list.appendChild(li);
        });
        list.hidden = false;
      }
      function hide() { list.hidden = true; }
      function saveSearch(q) {
        history = [q].concat(history.filter(function (h) { return h !== q; })).slice(0, 8);
        store.set(K.SEARCH_HIST, history);
      }
      function suggest(q) {
        q = q.trim().toLowerCase();
        if (!q) {
          var rec = getRecommended(4, []);
          var histItems = history.slice(0, 3).map(function (h) {
            var match = TOOLS.find(function (t) { return t.name.toLowerCase() === h.toLowerCase(); });
            return match
              ? { name: match.name, url: match.url, icon: '🕐', cat: 'Recent search' }
              : { name: h, url: 'index.html#tools', icon: '🔍', cat: 'Recent search' };
          });
          var recItems = rec.map(function (t) {
            return { name: t.name, url: t.url, icon: t.icon, cat: 'For you' };
          });
          show(histItems.concat(recItems).slice(0, 6));
          return;
        }
        var matches = TOOLS.filter(function (t) {
          return t.name.toLowerCase().indexOf(q) !== -1 ||
                 t.cat.toLowerCase().indexOf(q) !== -1 ||
                 t.slug.replace(/-/g,' ').indexOf(q) !== -1;
        }).slice(0, 6).map(function (t) {
          return { name: t.name, url: t.url, icon: t.icon, cat: t.cat };
        });
        show(matches);
      }
      input.addEventListener('focus', function () { suggest(input.value); });
      input.addEventListener('input', function () { suggest(input.value); });
      input.addEventListener('blur', function () { setTimeout(hide, 180); });
      input.addEventListener('keydown', function (e) {
        var items = list.querySelectorAll('li');
        var active = list.querySelector('li.active');
        var idx = active ? Array.from(items).indexOf(active) : -1;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (active) active.classList.remove('active');
          var next = items[idx + 1] || items[0];
          if (next) { next.classList.add('active'); input.value = next.querySelector('.sm-sugg-name').textContent; }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (active) active.classList.remove('active');
          var prev = items[idx - 1] || items[items.length - 1];
          if (prev) { prev.classList.add('active'); input.value = prev.querySelector('.sm-sugg-name').textContent; }
        } else if (e.key === 'Enter') {
          if (active) { active.dispatchEvent(new Event('mousedown')); }
          else {
            var q = input.value.trim();
            if (q) {
              saveSearch(q);
              var firstMatch = TOOLS.find(function (t) {
                return t.name.toLowerCase().indexOf(q.toLowerCase()) !== -1;
              });
              if (firstMatch) location.href = firstMatch.url;
            }
          }
        } else if (e.key === 'Escape') { hide(); }
      });
    });
  }
  function renderContinueBanner(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var last = store.get(K.LAST_OPEN, null);
    if (!last || !last.url) { container.hidden = true; return; }
    var isToolPage = TOOLS.some(function (t) { return t.url === last.url; });
    if (!isToolPage) { container.hidden = true; return; }
    var age = (Date.now() - (last.ts || 0)) / 86400000;
    if (age > 7) { container.hidden = true; return; }
    var lastUrl = last.url;
    var banner = document.createElement('div');
    banner.className = 'sm-continue-banner reveal';
    banner.innerHTML = [
      '<div class="sm-continue-inner">',
      '  <span class="sm-continue-icon">↩️</span>',
      '  <div class="sm-continue-text">',
      '    <div class="sm-continue-label">Continue where you left off</div>',
      '    <div class="sm-continue-name">' + esc(last.name) + '</div>',
      '  </div>',
      '  <a href="' + esc(lastUrl) + '" class="btn btn-primary sm-continue-btn">Resume</a>',
      '  <button type="button" class="sm-continue-close" aria-label="Dismiss">&times;</button>',
      '</div>',
    ].join('');
    var inner = banner.querySelector('.sm-continue-inner');
    inner.addEventListener('click', function (e) {
      if (!e.target.closest('.sm-continue-close') && !e.target.closest('.sm-continue-btn')) {
        location.href = lastUrl;
      }
    });
    banner.querySelector('.sm-continue-close').addEventListener('click', function (e) {
      e.stopPropagation();
      banner.remove();
      container.hidden = true;
    });
    container.appendChild(banner);
    container.hidden = false;
  }
  function renderHomepageStrip() {
    var el = document.getElementById('sm-personalized-strip');
    if (!el) return;
    var recent  = store.get(K.RECENT, []);
    var hasData = recent.length > 0 || Object.keys(store.get(K.FREQ, {})).length > 0;
    var name    = store.get(K.USERNAME, '');
    if (!hasData) {
      el.hidden = true;
      return;
    }
    var rec = getRecommended(4, []);
    var cards = rec.map(function (t) {
      return [
        '<a href="' + t.url + '" class="sm-pers-card">',
        '  <span class="sm-pers-card-icon">' + t.icon + '</span>',
        '  <span class="sm-pers-card-name">' + esc(t.name) + '</span>',
        '  <span class="sm-pers-card-cat">' + esc(t.cat) + '</span>',
        '</a>',
      ].join('');
    }).join('');
    el.innerHTML = [
      '<div class="wrap">',
      '  <div class="sm-pers-head">',
      '    <span class="kicker">' + (name ? 'For you, ' + esc(name) : 'Recommended for you') + '</span>',
      '    <p>Based on your recent activity</p>',
      '  </div>',
      '  <div class="sm-pers-grid">' + cards + '</div>',
      '</div>',
    ].join('');
    el.hidden = false;
  }
  function renderSmartQuickLinks() {
    var el = document.getElementById('sm-quick-links');
    if (!el) return;
    var rec = getRecommended(6, []);
    if (!rec.length) { el.hidden = true; return; }
    var links = rec.map(function (t) {
      return '<a href="' + t.url + '" class="sm-quick-link">'
        + t.icon + ' ' + esc(t.name) + '</a>';
    }).join('');
    el.innerHTML = '<div class="sm-quick-links-inner"><span class="sm-quick-label">Quick links:</span>' + links + '</div>';
    el.hidden = false;
  }
  function renderDashboardRecommended() {
    var el = document.getElementById('db-recommended');
    if (!el) return;
    var favorites = store.get(K.FAVORITES, []);
    var rec = getRecommended(6, favorites);
    if (!rec.length) {
      el.innerHTML = '<div class="db-empty"><div class="db-empty-sub">Visit some calculators and recommendations will appear here.</div></div>';
      return;
    }
    var html = '<div class="db-rec-grid">';
    rec.forEach(function (t) {
      html += [
        '<a href="' + t.url + '" class="db-rec-card">',
        '  <span class="db-rec-icon">' + t.icon + '</span>',
        '  <div class="db-rec-body">',
        '    <div class="db-rec-name">' + esc(t.name) + '</div>',
        '    <div class="db-rec-cat">' + esc(t.cat) + '</div>',
        '  </div>',
        '  <svg class="db-rec-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
        '</a>',
      ].join('');
    });
    html += '</div>';
    el.innerHTML = html;
  }
  function renderCountryNote() {
    var el = document.getElementById('sm-country-note');
    if (!el) return;
    try {
      var saved = localStorage.getItem('sm_country');
      if (!saved) { el.hidden = true; return; }
      var label;
      if (window.SM_GRADING) {
        var sys = window.SM_GRADING.get(saved);
        label = sys ? (sys.flag + '\u00a0' + sys.name) : null;
      } else {
        var FLAGS = {
          us:'🇺🇸\u00a0United States', ca:'🇨🇦\u00a0Canada',
          uk:'🇬🇧\u00a0United Kingdom', ie:'🇮🇪\u00a0Ireland',
          de:'🇩🇪\u00a0Germany', fr:'🇫🇷\u00a0France', it:'🇮🇹\u00a0Italy',
          es:'🇪🇸\u00a0Spain', nl:'🇳🇱\u00a0Netherlands', se:'🇸🇪\u00a0Sweden',
          no:'🇳🇴\u00a0Norway', dk:'🇩🇰\u00a0Denmark', fi:'🇫🇮\u00a0Finland',
          pk:'🇵🇰\u00a0Pakistan', 'in':'🇮🇳\u00a0India', bd:'🇧🇩\u00a0Bangladesh',
          lk:'🇱🇰\u00a0Sri Lanka', ae:'🇦🇪\u00a0UAE', sa:'🇸🇦\u00a0Saudi Arabia',
          qa:'🇶🇦\u00a0Qatar', om:'🇴🇲\u00a0Oman', kw:'🇰🇼\u00a0Kuwait',
          sg:'🇸🇬\u00a0Singapore', my:'🇲🇾\u00a0Malaysia', jp:'🇯🇵\u00a0Japan',
          kr:'🇰🇷\u00a0South Korea', cn:'🇨🇳\u00a0China',
          au:'🇦🇺\u00a0Australia', nz:'🇳🇿\u00a0New Zealand', za:'🇿🇦\u00a0South Africa'
        };
        label = FLAGS[saved] || null;
      }
      if (!label) { el.hidden = true; return; }
      el.hidden = false;
      el.textContent = 'Showing ' + label + ' grading scale';
    } catch (e) { el.hidden = true; }
  }
  window.SM_PERSONALIZATION = {
    theme         : SM_THEME,
    getRecommended: getRecommended,
    renderContinueBanner     : renderContinueBanner,
    renderHomepageStrip      : renderHomepageStrip,
    renderSmartQuickLinks    : renderSmartQuickLinks,
    renderDashboardRecommended: renderDashboardRecommended,
    renderCountryNote        : renderCountryNote,
    initSmartSearch          : initSmartSearch,
  };
  function boot() {
    SM_THEME.init();
    injectThemeToggle();
    trackFrequency();
    initSmartSearch();
    renderContinueBanner('#sm-continue-slot');
    renderHomepageStrip();
    renderSmartQuickLinks();
    renderDashboardRecommended();
    renderCountryNote();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();