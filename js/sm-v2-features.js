/* ==========================================================================
   StudyMetrics v2.0 — Feature Engine
   Activates every visual-only element in the v2 shell:
     • Global search (⌘K) with live dropdown
     • Notification panel with dismiss
     • Profile modal (name, avatar initial, theme)
     • Watch Demo modal
     • Dashboard: live metric cards from localStorage calc data
     • Dashboard: editable Goals (add / edit / delete)
     • Dashboard: editable Deadlines (add / edit / delete / check off)
     • Dashboard: live GPA Trend from CGPA semesters
     • Dashboard: live calendar with today highlighted + deadline dots
   ========================================================================== */
(function () {
  'use strict';



  /* ──────────────────────────────────────────────────────────────────────
     TOOL INDEX (used for search)
  ────────────────────────────────────────────────────────────────────── */
  var TOOLS = [
    { name: 'GPA Calculator',         url: 'gpa.html',                   cat: 'GPA & Grades',  tags: 'gpa grade point average' },
    { name: 'CGPA Calculator',        url: 'cgpa.html',                  cat: 'GPA & Grades',  tags: 'cgpa cumulative semester' },
    { name: 'Semester GPA',           url: 'semester-gpa.html',          cat: 'GPA & Grades',  tags: 'semester gpa term' },
    { name: 'GPA Converter',          url: 'gpa-converter.html',         cat: 'GPA & Grades',  tags: 'gpa convert country scale' },
    { name: 'Target GPA',             url: 'target-gpa.html',            cat: 'GPA & Grades',  tags: 'target goal gpa future' },
    { name: 'GPA Improvement Planner',url: 'gpa-improvement-planner.html',cat: 'GPA & Grades', tags: 'improve gpa plan boost' },
    { name: 'Percentage to GPA',      url: 'percentage-to-gpa.html',     cat: 'GPA & Grades',  tags: 'percent percentage gpa convert' },
    { name: 'GPA to Percentage',      url: 'gpa-to-percentage.html',     cat: 'GPA & Grades',  tags: 'gpa percent percentage convert' },
    { name: 'Grade Calculator',       url: 'grade-calculator.html',      cat: 'Grade Tools',   tags: 'grade weighted average' },
    { name: 'Final Exam Calculator',  url: 'final-exam-calculator.html', cat: 'Grade Tools',   tags: 'final exam score needed' },
    { name: 'Final Grade',            url: 'final-grade.html',           cat: 'Grade Tools',   tags: 'final grade overall result' },
    { name: 'Required Marks',         url: 'required-marks.html',        cat: 'Grade Tools',   tags: 'required marks pass score need' },
    { name: 'Grade Predictor',        url: 'grade-predictor.html',       cat: 'Grade Tools',   tags: 'predict grade forecast future' },
    { name: 'Assignment Weight',      url: 'assignment-weight.html',     cat: 'Grade Tools',   tags: 'assignment weight percentage contribution' },
    { name: 'Class Average',          url: 'class-average.html',         cat: 'Grade Tools',   tags: 'class average mean score' },
    { name: 'Percentage Calculator',  url: 'percentage-calculator.html', cat: 'Grade Tools',   tags: 'percentage calculate marks' },
    { name: 'Attendance Tracker',     url: 'attendance-calculator.html', cat: 'Planning',      tags: 'attendance classes present absent' },
    { name: 'Attendance Percentage',  url: 'attendance-percentage.html', cat: 'Planning',      tags: 'attendance percent ratio' },
    { name: 'Attendance Goal',        url: 'attendance-goal.html',       cat: 'Planning',      tags: 'attendance goal target classes' },
    { name: 'Study Time Planner',     url: 'study-time.html',            cat: 'Planning',      tags: 'study time hours plan' },
    { name: 'Pomodoro Timer',         url: 'pomodoro.html',              cat: 'Planning',      tags: 'pomodoro timer focus session' },
    { name: 'Study Schedule',         url: 'study-schedule.html',        cat: 'Planning',      tags: 'study schedule timetable week plan planner' },
    { name: 'Credit Hour Planner',    url: 'credit-hour-planner.html',   cat: 'Planning',      tags: 'credit hours semester courses plan' },
    { name: 'Scientific Calculator',  url: 'scientific-calculator.html', cat: 'Utilities',     tags: 'scientific calculator math sin cos' },
    { name: 'Basic Calculator',       url: 'basic-calculator.html',      cat: 'Utilities',     tags: 'basic calculator arithmetic' },
    { name: 'Word Counter',           url: 'word-counter.html',          cat: 'Utilities',     tags: 'word count essay characters' },
    { name: 'AI Tutor',               url: 'ai.html',                    cat: 'AI',            tags: 'ai tutor coach assistant help' },
    { name: 'Notes',                  url: 'notes.html',                 cat: 'Productivity',  tags: 'notes notebook write save' },
    { name: 'Flashcards',             url: 'flashcards.html',            cat: 'Productivity',  tags: 'flashcards study quiz memory cards' },
    { name: 'Dashboard',              url: 'dashboard.html',             cat: 'Overview',      tags: 'dashboard overview stats' },
    { name: 'Study Guides',           url: 'study-guides.html',          cat: 'Resources',     tags: 'guides tips strategies' },
    { name: 'Grading Systems',        url: 'grading-guide.html',         cat: 'Resources',     tags: 'grading country scale system' },
    { name: 'Academic Resources',     url: 'academic-resources.html',    cat: 'Resources',     tags: 'resources links directory' },
  ];

  var store = SM.store;
  var esc   = SM.esc;
  var round = SM.round;

  /* ──────────────────────────────────────────────────────────────────────
     GPA helpers (mirrors dashboard.js)
  ────────────────────────────────────────────────────────────────────── */
  var L2P = {'A+':4.0,'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0,'C-':1.7,'D+':1.3,'D':1.0,'D-':0.7,'F':0};
  function letterToGpa(l) { return L2P.hasOwnProperty(l) ? L2P[l] : (parseFloat(l) || 0); }
  function pctToGpa(p) {
    p = Math.max(0, Math.min(100, p));
    if (p >= 93) return 4.0; if (p >= 90) return 3.7; if (p >= 87) return 3.3;
    if (p >= 83) return 3.0; if (p >= 80) return 2.7; if (p >= 77) return 2.3;
    if (p >= 73) return 2.0; if (p >= 70) return 1.7; if (p >= 67) return 1.3;
    if (p >= 63) return 1.0; if (p >= 60) return 0.7; return 0;
  }
  function gpaColor(g) {
    if (g >= 3.7) return 'var(--ok)'; if (g >= 3.0) return 'var(--info)';
    if (g >= 2.0) return 'var(--warn,#c98a12)'; return 'var(--danger,#d1503c)';
  }
  function gpaLabel(g) {
    if (g >= 3.7) return 'Excellent'; if (g >= 3.3) return 'Very Good'; if (g >= 3.0) return 'Good';
    if (g >= 2.0) return 'Satisfactory'; if (g > 0) return 'Needs improvement'; return '—';
  }
  function gpaData() {
    var rows = store.get('sm_gpa_rows', []);
    if (!rows.length) return null;
    var scale = store.get('sm_gpa_scale', 'letter') || 'letter';
    var pts = 0, cr = 0;
    rows.forEach(function (r) {
      var g = scale === 'letter' ? letterToGpa(r.grade) : scale === 'points' ? parseFloat(r.grade) || 0 : pctToGpa(parseFloat(r.grade) || 0);
      var c = parseFloat(r.credits) || 0;
      if (c > 0) { pts += g * c; cr += c; }
    });
    return cr > 0 ? { gpa: pts / cr, courses: rows.length, credits: cr } : null;
  }
  function cgpaData() {
    var rows = store.get('sm_cgpa_rows', []);
    if (!rows.length) return null;
    var pts = 0, cr = 0;
    rows.forEach(function (r) {
      var g = parseFloat(r.gpa) || 0; var c = parseFloat(r.credits) || 0;
      if (c > 0) { pts += g * c; cr += c; }
    });
    return cr > 0 ? { cgpa: pts / cr, semesters: rows.length, credits: cr, rows: rows } : null;
  }
  function semGpaData() {
    var rows = store.get('sm_semester_gpa', []);
    if (!rows.length) return null;
    var pts = 0, cr = 0;
    rows.forEach(function (r) {
      var g = letterToGpa(r.grade); var c = parseFloat(r.credits) || 0;
      if (c > 0) { pts += g * c; cr += c; }
    });
    return cr > 0 ? { gpa: pts / cr, courses: rows.length } : null;
  }
  function studyHoursData() {
    var rows = store.get('sm_ss', []);
    if (!rows.length) return null;
    return rows.reduce(function (s, r) { return s + (parseFloat(r.hrs) || 0); }, 0);
  }
  function targetGpaData() {
    var d = store.get('sm_target', null);
    return (d && d.goal) ? parseFloat(d.goal) : null;
  }

  /* ──────────────────────────────────────────────────────────────────────
     MODAL helper
  ────────────────────────────────────────────────────────────────────── */
  function createModal(id, content, maxW) {
    var existing = document.getElementById(id);
    if (existing) { existing.remove(); }
    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center',
      'background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)',
      'padding:16px;animation:smFadeIn .18s ease',
    ].join(';');
    var box = document.createElement('div');
    box.style.cssText = [
      'background:var(--panel,#fff);border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.24)',
      'border:1px solid var(--border);width:100%;max-width:' + (maxW || '540px'),
      'max-height:90vh;overflow-y:auto;position:relative',
    ].join(';');
    box.innerHTML = content;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
    });
    // inject animation keyframe once
    if (!document.getElementById('smModalAnim')) {
      var s = document.createElement('style');
      s.id = 'smModalAnim';
      s.textContent = '@keyframes smFadeIn{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(s);
    }
    return { overlay: overlay, box: box };
  }

  /* ──────────────────────────────────────────────────────────────────────
     DROPDOWN helper
  ────────────────────────────────────────────────────────────────────── */
  function createDropdown(anchor, content, width) {
    closeAllDropdowns();
    var rect = anchor.getBoundingClientRect();
    var dd = document.createElement('div');
    dd.className = 'sm2-dropdown';
    dd.style.cssText = [
      'position:fixed;z-index:8000',
      'top:' + (rect.bottom + 6) + 'px',
      'right:' + (window.innerWidth - rect.right) + 'px',
      'width:' + (width || '320px'),
      'background:var(--panel,#fff);border:1px solid var(--border)',
      'border-radius:16px;box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.18))',
      'animation:smFadeIn .14s ease;overflow:hidden',
    ].join(';');
    dd.innerHTML = content;
    document.body.appendChild(dd);
    setTimeout(function () {
      document.addEventListener('click', function closer(e) {
        if (!dd.contains(e.target) && e.target !== anchor) {
          dd.remove(); document.removeEventListener('click', closer);
        }
      });
    }, 10);
    return dd;
  }
  function closeAllDropdowns() {
    document.querySelectorAll('.sm2-dropdown').forEach(function (d) { d.remove(); });
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. GLOBAL SEARCH
  ══════════════════════════════════════════════════════════════════════ */
  function initSearch() {
    /* Ensure animation keyframe exists before dropdown is created */
    if (!document.getElementById('smModalAnim')) {
      var _ks = document.createElement('style');
      _ks.id = 'smModalAnim';
      _ks.textContent = '@keyframes smFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}';
      document.head.appendChild(_ks);
    }
    function wireSearchInput(input) {
      if (!input || input.__sm2SearchBound) return;
      input.__sm2SearchBound = true;

      var dropdown = null;
      function doSearch(q) {
        q = q.trim().toLowerCase();
        if (dropdown) { dropdown.remove(); dropdown = null; }
        if (!q) return;
        var matches = TOOLS.filter(function (t) {
          return (t.name + ' ' + t.tags + ' ' + t.cat).toLowerCase().indexOf(q) !== -1;
        }).slice(0, 8);
        var html = '<div style="padding:10px 14px 6px;font-size:11px;font-weight:700;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em">Tools</div>';
        if (!matches.length) {
          html += '<div style="padding:12px 16px;font-size:13px;color:var(--ink-3)">No results for "' + esc(q) + '"</div>';
        } else {
          matches.forEach(function (t) {
            html += '<a href="' + t.url + '" style="display:flex;align-items:center;gap:12px;padding:10px 16px;text-decoration:none;color:var(--ink);font-size:13.5px;font-weight:500;transition:background .12s" onmouseenter="this.style.background=\'var(--card-2)\'" onmouseleave="this.style.background=\'\'">'
              + '<span style="flex:1">' + esc(t.name) + '</span>'
              + '<span style="font-size:11px;color:var(--ink-3)">' + esc(t.cat) + '</span>'
              + '</a>';
          });
        }
        html += '<div style="border-top:1px solid var(--border);padding:10px 16px">'
          + '<a href="academic-resources.html" style="font-size:12.5px;font-weight:600;color:var(--gold-strong,#a97c14);text-decoration:none">Browse all tools →</a></div>';

        var rect = input.getBoundingClientRect();
        closeAllDropdowns();
        dropdown = document.createElement('div');
        dropdown.className = 'sm2-dropdown';
        var ddWidth = Math.max(rect.width, 300);
        var ddLeft = rect.left;
        /* Clamp to viewport right edge */
        var vw = window.innerWidth || document.documentElement.clientWidth;
        if (ddLeft + ddWidth > vw - 12) { ddLeft = Math.max(8, vw - ddWidth - 12); }
        dropdown.style.cssText = [
          'position:fixed;z-index:8000',
          'top:' + (rect.bottom + 6) + 'px',
          'left:' + ddLeft + 'px',
          'width:' + ddWidth + 'px',
          'background:var(--panel,#fff);border:1px solid var(--border)',
          'border-radius:14px;box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.18))',
          'animation:smFadeIn .14s ease;overflow:hidden',
        ].join(';');
        dropdown.innerHTML = html;
        document.body.appendChild(dropdown);
      }

      input.addEventListener('input', function () { doSearch(input.value); });
      input.addEventListener('focus',  function () { if (input.value.trim()) doSearch(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; if (dropdown) { dropdown.remove(); dropdown = null; } }
        if (e.key === 'Enter') {
          var q = input.value.trim().toLowerCase();
          var m = TOOLS.find(function (t) { return (t.name + ' ' + t.tags).toLowerCase().indexOf(q) !== -1; });
          if (m) { window.location.href = m.url; }
        }
      });
    }

    // Bind on existing inputs + any injected by sm-shell
    function bindAll() {
      document.querySelectorAll('#sm2Search').forEach(wireSearchInput);
    }
    bindAll();
    // ⌘K / Ctrl+K shortcut
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        var inp = document.querySelector('#sm2Search');
        if (inp) { inp.focus(); inp.select(); }
      }
    });
    // Re-bind after shell injects topbar
    setTimeout(bindAll, 400);
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. NOTIFICATIONS
  ══════════════════════════════════════════════════════════════════════ */
  var NOTIF_KEY = 'sm_notifs_dismissed';
  var NOTIFS = [
    { id: 'n1', icon: '🎯', title: 'Track your GPA', body: 'Open the GPA Calculator and add your courses to see live stats on your dashboard.' },
    { id: 'n2', icon: '🤖', title: 'AI Tutor is ready', body: 'Ask your academic coach for a personalised GPA improvement plan or exam strategy.' },
    { id: 'n3', icon: '📅', title: 'Set your study schedule', body: 'Use the Study Schedule Generator to plan your week and hit your grade targets.' },
  ];

  function initNotifications() {
    function bindBtn(btn) {
      if (!btn || btn.__sm2NotifBound) return;
      btn.__sm2NotifBound = true;

      var dismissed = store.get(NOTIF_KEY, []);
      var active = NOTIFS.filter(function (n) { return dismissed.indexOf(n.id) === -1; });
      var dot = btn.querySelector('.sm2-dot');

      function updateDot() {
        dismissed = store.get(NOTIF_KEY, []);
        active = NOTIFS.filter(function (n) { return dismissed.indexOf(n.id) === -1; });
        if (dot) dot.style.display = active.length ? '' : 'none';
      }
      updateDot();

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissed = store.get(NOTIF_KEY, []);
        active = NOTIFS.filter(function (n) { return dismissed.indexOf(n.id) === -1; });

        var html = '<div style="padding:16px 18px 10px;font-weight:700;font-size:14px;color:var(--ink);border-bottom:1px solid var(--border)">Notifications'
          + (active.length ? ' <span style="font-size:11px;background:var(--gold-soft);color:var(--gold-strong);border-radius:6px;padding:2px 7px;font-weight:700;margin-left:4px">' + active.length + '</span>' : '') + '</div>';

        if (!active.length) {
          html += '<div style="padding:24px 18px;text-align:center;font-size:13px;color:var(--ink-3)">All caught up! ✓</div>';
        } else {
          active.forEach(function (n) {
            html += '<div style="padding:14px 18px;border-bottom:1px solid var(--border-2,var(--border));display:flex;gap:12px;align-items:flex-start">'
              + '<span style="font-size:22px;line-height:1">' + n.icon + '</span>'
              + '<div style="flex:1">'
              + '<div style="font-weight:600;font-size:13px;color:var(--ink)">' + n.title + '</div>'
              + '<div style="font-size:12px;color:var(--ink-3);margin-top:3px;line-height:1.5">' + n.body + '</div>'
              + '</div>'
              + '<button onclick="SM2Features.dismissNotif(\'' + n.id + '\',this)" style="background:none;border:none;cursor:pointer;color:var(--ink-3);font-size:16px;padding:2px 4px;line-height:1">×</button>'
              + '</div>';
          });
          html += '<div style="padding:10px 18px"><button onclick="SM2Features.dismissAllNotifs(this)" style="background:none;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:var(--ink-3)">Clear all</button></div>';
        }

        createDropdown(btn, html, '340px');
      });
    }

    function bindAll() {
      document.querySelectorAll('[aria-label="Notifications"]').forEach(bindBtn);
    }
    bindAll();
    setTimeout(bindAll, 400);

    // Expose for inline onclick
    window.SM2Features = window.SM2Features || {};
    window.SM2Features.dismissNotif = function (id, el) {
      var d = store.get(NOTIF_KEY, []); if (d.indexOf(id) === -1) d.push(id); store.set(NOTIF_KEY, d);
      var row = el.closest('[style*="border-bottom"]');
      if (row) { row.style.opacity = '0'; row.style.transition = 'opacity .2s'; setTimeout(function () { row.remove(); }, 200); }
      document.querySelectorAll('[aria-label="Notifications"] .sm2-dot').forEach(function (dot) {
        var remaining = NOTIFS.filter(function (n) { return d.indexOf(n.id) === -1; });
        dot.style.display = remaining.length ? '' : 'none';
      });
    };
    window.SM2Features.dismissAllNotifs = function (el) {
      var ids = NOTIFS.map(function (n) { return n.id; }); store.set(NOTIF_KEY, ids);
      closeAllDropdowns();
      document.querySelectorAll('[aria-label="Notifications"] .sm2-dot').forEach(function (dot) { dot.style.display = 'none'; });
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. PROFILE MODAL
  ══════════════════════════════════════════════════════════════════════ */
  function initProfile() {
    function bindAvatar(el) {
      if (!el || el.__sm2ProfileBound) return;
      el.__sm2ProfileBound = true;
      el.style.cursor = 'pointer';
      el.title = 'Edit profile';
      el.addEventListener('click', openProfile);
    }
    function openProfile() {
      var name = store.get('sm_dash_name', '') || '';
      var initial = name.trim().charAt(0).toUpperCase() || '?';
      var html = '<div style="padding:28px 28px 24px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
        + '<h2 style="margin:0;font-size:18px;font-weight:700;color:var(--ink)">Your Profile</h2>'
        + '<button onclick="this.closest(\'[id^=sm2modal]\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-3);line-height:1">×</button>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:24px">'
        + '<div style="width:72px;height:72px;border-radius:22px;background:linear-gradient(135deg,var(--gold),var(--gold-strong,#a97c14));display:grid;place-items:center;font-size:30px;font-weight:700;color:#1a1509">' + esc(initial) + '</div>'
        + '<div style="font-size:14px;color:var(--ink-2)">' + (name ? esc(name) : 'Set your name below') + '</div>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:14px">'
        + '<div>'
        + '<label style="display:block;font-size:12px;font-weight:600;color:var(--ink-3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Display Name</label>'
        + '<input id="sm2ProfName" class="input" type="text" value="' + esc(name) + '" placeholder="Your name" style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2,#faf9f5);box-sizing:border-box">'
        + '</div>'
        + '<div>'
        + '<label style="display:block;font-size:12px;font-weight:600;color:var(--ink-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Theme</label>'
        + '<div style="display:flex;gap:8px">'
        + '<button onclick="SM2Features.setTheme(\'light\',this)" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center;font-size:12.5px">☀️ Light</button>'
        + '<button onclick="SM2Features.setTheme(\'dark\',this)" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center;font-size:12.5px">🌙 Dark</button>'
        + '<button onclick="SM2Features.setTheme(\'system\',this)" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center;font-size:12.5px">⚙️ System</button>'
        + '</div>'
        + '</div>'
        + '<button onclick="SM2Features.saveProfile()" class="sm2-btn sm2-btn-primary" style="width:100%;justify-content:center;margin-top:4px">Save Profile</button>'
        + '</div>'
        + '</div>';
      var m = createModal('sm2modalProfile', html, '420px');
      m.overlay.id = 'sm2modalProfile';
    }
    function bindAll() {
      document.querySelectorAll('.sm2-avatar, .sm2-side-foot img').forEach(bindAvatar);
      // Also profile span in sidebar footer
      document.querySelectorAll('.sm2-side-foot .nm').forEach(function (el) {
        if (el.__sm2ProfileBound) return; el.__sm2ProfileBound = true;
        el.style.cursor = 'pointer'; el.addEventListener('click', openProfile);
        // update display name
        var n = store.get('sm_dash_name', '');
        if (n) el.textContent = n;
      });
    }
    bindAll(); setTimeout(bindAll, 500);

    window.SM2Features = window.SM2Features || {};
    window.SM2Features.setTheme = function (t) {
      var theme = t === 'system' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('sm_theme', t === 'system' ? '' : theme); } catch (e) {}
      SM.toast(t === 'system' ? '⚙️ Using system theme' : (theme === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on'), 'info');
    };
    window.SM2Features.saveProfile = function () {
      var inp = document.getElementById('sm2ProfName');
      if (!inp) return;
      var n = inp.value.trim().slice(0, 40);
      store.set('sm_dash_name', n);
      SM.toast('Profile saved ✓', 'success');
      // update sidebar name
      document.querySelectorAll('.sm2-side-foot .nm').forEach(function (el) { el.textContent = n || 'Profile'; });
      var modal = document.getElementById('sm2modalProfile');
      if (modal) modal.remove();
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. WATCH DEMO MODAL
  ══════════════════════════════════════════════════════════════════════ */
  function initWatchDemo() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('a[href="ai.html"].sm2-btn-ghost, button.sm2-btn-ghost');
      if (!btn) return;
      var txt = btn.textContent.trim();
      if (txt.indexOf('Demo') === -1 && txt.indexOf('Watch') === -1) return;
      e.preventDefault();
      var html = '<div style="padding:28px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
        + '<h2 style="margin:0;font-size:18px;font-weight:700;color:var(--ink)">How StudyMetrics Works</h2>'
        + '<button onclick="document.getElementById(\'sm2modalDemo\').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--ink-3);line-height:1">×</button>'
        + '</div>'
        + '<div style="display:grid;gap:14px;margin-bottom:20px">'
        + demoStep('1', '🔢', 'Enter Your Grades', 'Open any calculator — GPA, CGPA, or Grade — and type in your courses. Data saves instantly to your browser.')
        + demoStep('2', '📊', 'See Live Stats', 'Your Dashboard updates automatically. Track GPA trends, CGPA, study hours, and deadlines in one place.')
        + demoStep('3', '🤖', 'Ask the AI Tutor', 'Get a personalised improvement plan from your AI academic coach — exam strategies, study schedules, GPA goals.')
        + demoStep('4', '🎯', 'Set & Hit Goals', 'Add academic goals and deadlines to your dashboard. The streak counter keeps you motivated.')
        + '</div>'
        + '<div style="display:flex;gap:10px">'
        + '<a href="gpa.html" class="sm2-btn sm2-btn-primary" style="flex:1;justify-content:center" onclick="document.getElementById(\'sm2modalDemo\').remove()">Start with GPA →</a>'
        + '<a href="ai.html" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center" onclick="document.getElementById(\'sm2modalDemo\').remove()">Try AI Tutor</a>'
        + '</div>'
        + '</div>';
      var m = createModal('sm2modalDemo', html, '500px');
      m.overlay.id = 'sm2modalDemo';
    });
  }
  function demoStep(n, icon, title, body) {
    return '<div style="display:flex;gap:14px;padding:16px;background:var(--card-2,#faf9f5);border:1px solid var(--border);border-radius:14px;align-items:flex-start">'
      + '<div style="width:36px;height:36px;border-radius:10px;background:var(--gold-soft);color:var(--gold-strong);display:grid;place-items:center;font-size:18px;flex:none">' + icon + '</div>'
      + '<div><div style="font-weight:700;font-size:14px;color:var(--ink);margin-bottom:4px">' + title + '</div>'
      + '<div style="font-size:12.5px;color:var(--ink-2);line-height:1.5">' + body + '</div></div>'
      + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. DASHBOARD LIVE METRIC CARDS
  ══════════════════════════════════════════════════════════════════════ */
  function initDashboardMetrics() {
    if (!document.querySelector('.sm2-metric')) return;

    var gd   = semGpaData() || gpaData();
    var cd   = cgpaData();
    var tgt  = targetGpaData();
    var hrs  = studyHoursData();

    function updateCard(el, val, ms, progPct) {
      if (!el) return;
      var mvEl = el.querySelector('.mv');
      var msEl = el.querySelector('.ms');
      var progEl = el.querySelector('.sm2-progress i');
      if (mvEl && val !== null) {
        if (typeof val === 'string') mvEl.innerHTML = val;
        else mvEl.textContent = round(val, 2).toFixed(2);
      }
      if (msEl && ms) msEl.textContent = ms;
      if (progEl && progPct !== undefined) progEl.style.width = Math.min(100, Math.max(0, progPct)).toFixed(1) + '%';
    }

    // Card 1: Semester GPA
    var c1 = document.getElementById('db-metric-1') || document.querySelectorAll('.sm2-metric')[0];
    if (c1 && gd) {
      var gpaVal = gd.gpa !== undefined ? gd.gpa : 0;
      updateCard(c1, gpaVal, gpaLabel(gpaVal) + ' standing', (gpaVal / 4) * 100);
      var mdEl1 = c1.querySelector('.md');
      if (mdEl1) {
        var courses = gd.courses || 0;
        mdEl1.innerHTML = mdEl1.innerHTML.replace(/[\d.]+ vs last term/, courses + ' course' + (courses !== 1 ? 's' : '') + ' tracked');
      }
    }

    // Card 2: CGPA
    var c2 = document.getElementById('db-metric-2') || document.querySelectorAll('.sm2-metric')[1];
    if (c2 && cd) {
      updateCard(c2, cd.cgpa, gpaLabel(cd.cgpa) + ' · ' + cd.semesters + ' semester' + (cd.semesters !== 1 ? 's' : ''), (cd.cgpa / 4) * 100);
    }

    // Card 3: Target GPA
    var c3 = document.getElementById('db-metric-3') || document.querySelectorAll('.sm2-metric')[2];
    if (c3 && tgt) {
      var base = (cd && cd.cgpa) ? cd.cgpa : (gd ? (gd.gpa || 0) : 0);
      var pct3 = tgt > 0 ? (base / tgt) * 100 : 0;
      var diff = Math.max(0, tgt - base);
      updateCard(c3, tgt, 'Current: ' + round(base, 2).toFixed(2) + (diff > 0 ? ' · ' + diff.toFixed(2) + ' to go' : ' · Goal reached!'), pct3);
    }

    // Card 4: Study Hours
    var c4 = document.getElementById('db-metric-4') || document.querySelectorAll('.sm2-metric')[3];
    if (c4 && hrs !== null) {
      var hrsRounded = round(hrs, 1);
      updateCard(c4, hrsRounded + '<span style="font-size:18px;color:var(--ink-3)">h</span>', 'This week · goal 45h', (hrs / 45) * 100);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. DASHBOARD: GOALS (editable)
  ══════════════════════════════════════════════════════════════════════ */
  var GOALS_KEY = 'sm2_goals';
  var STREAK_KEY = 'sm2_streak';

  function defaultGoals() {
    var cd = cgpaData(); var ad = store.get('sm_attend', null);
    var hrs = studyHoursData();
    return [
      { id: 'g1', label: 'Reach ' + (cd ? Math.min(4.0, round(cd.cgpa + 0.3, 2)).toFixed(2) : '3.80') + ' CGPA', current: cd ? round((cd.cgpa / 4) * 100, 0) : 50 },
      { id: 'g2', label: '90% attendance', current: ad && ad.h > 0 ? round((ad.a / ad.h) * 100, 0) : 70 },
      { id: 'g3', label: '45 study hrs / week', current: hrs ? Math.min(100, round((hrs / 45) * 100, 0)) : 60 },
    ];
  }

  function initGoals() {
    var goalsSection = document.getElementById('goals');
    if (!goalsSection) return;
    var goalContainer = goalsSection.querySelector('.sm2-goal:not(.sm2-streak-mini)') ? goalsSection : null;
    if (!goalContainer) return;

    var goals = store.get(GOALS_KEY, null);
    if (!goals) { goals = defaultGoals(); store.set(GOALS_KEY, goals); }

    var streak = store.get(STREAK_KEY, { count: 0, lastDate: null });
    var today = new Date().toDateString();
    if (streak.lastDate !== today) {
      var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (streak.lastDate === yesterday.toDateString()) {
        streak.count += 1;
      } else if (streak.lastDate !== today) {
        streak.count = streak.lastDate ? 0 : streak.count; // keep initial
      }
      streak.lastDate = today;
      store.set(STREAK_KEY, streak);
    }

    function renderGoals() {
      goals = store.get(GOALS_KEY, goals);
      var panelHead = goalsSection.querySelector('.sm2-panel-head');
      var streakMini = goalsSection.querySelector('.sm2-streak-mini');
      if (!panelHead || !streakMini) return;

      // Remove old goal divs
      goalsSection.querySelectorAll('.sm2-goal').forEach(function (el) { el.remove(); });

      // Update badge
      var badge = panelHead.querySelector('.sm2-pill-badge');
      if (badge) badge.textContent = goals.length + ' ACTIVE';

      // Inject goals before streak
      goals.forEach(function (g) {
        var div = document.createElement('div');
        div.className = 'sm2-goal';
        div.innerHTML = '<div class="sm2-goal-row">'
          + '<span>' + esc(g.label) + '</span>'
          + '<div style="display:flex;align-items:center;gap:8px">'
          + '<b>' + Math.min(100, g.current || 0) + '%</b>'
          + '<button onclick="SM2Features.editGoal(\'' + g.id + '\')" style="background:none;border:none;cursor:pointer;padding:2px 4px;color:var(--ink-3);font-size:13px;line-height:1" title="Edit goal">✎</button>'
          + '<button onclick="SM2Features.deleteGoal(\'' + g.id + '\')" style="background:none;border:none;cursor:pointer;padding:2px 4px;color:var(--ink-3);font-size:13px;line-height:1" title="Delete goal">×</button>'
          + '</div>'
          + '</div>'
          + '<div class="sm2-progress"><i style="width:' + Math.min(100, g.current || 0) + '%"></i></div>';
        goalsSection.insertBefore(div, streakMini);
      });

      // Add goal button
      var addBtn = goalsSection.querySelector('.sm2-add-goal-btn');
      if (!addBtn) {
        addBtn = document.createElement('button');
        addBtn.className = 'sm2-btn sm2-btn-ghost sm2-add-goal-btn';
        addBtn.style.cssText = 'width:100%;justify-content:center;font-size:12.5px;margin-top:8px';
        addBtn.textContent = '+ Add Goal';
        addBtn.addEventListener('click', function () { SM2Features.addGoal(); });
        goalsSection.insertBefore(addBtn, streakMini);
      }

      // Update streak
      var streakNum = streakMini.querySelector('.d');
      if (streakNum) streakNum.textContent = streak.count || 1;
    }

    renderGoals();

    window.SM2Features = window.SM2Features || {};
    window.SM2Features.editGoal = function (id) {
      var g = (store.get(GOALS_KEY, goals) || []).find(function (x) { return x.id === id; });
      if (!g) return;
      var html = '<div style="padding:24px">'
        + '<h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:var(--ink)">Edit Goal</h3>'
        + '<label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Goal Label</label>'
        + '<input id="goalLabel" class="input" style="width:100%;margin:6px 0 14px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2);box-sizing:border-box" value="' + esc(g.label) + '">'
        + '<label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Progress (' + g.current + '%)</label>'
        + '<input id="goalCurrent" type="range" min="0" max="100" value="' + g.current + '" style="width:100%;margin:10px 0 20px;accent-color:var(--gold)">'
        + '<div style="display:flex;gap:10px">'
        + '<button onclick="SM2Features.saveGoal(\'' + id + '\')" class="sm2-btn sm2-btn-primary" style="flex:1;justify-content:center">Save</button>'
        + '<button onclick="document.getElementById(\'sm2modalGoal\').remove()" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center">Cancel</button>'
        + '</div></div>';
      var m = createModal('sm2modalGoal', html, '380px');
      m.overlay.id = 'sm2modalGoal';
      document.getElementById('goalCurrent').addEventListener('input', function () {
        document.querySelector('#sm2modalGoal label:nth-of-type(2)').textContent = 'Progress (' + this.value + '%)';
      });
    };
    window.SM2Features.addGoal = function () {
      var html = '<div style="padding:24px">'
        + '<h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:var(--ink)">Add Goal</h3>'
        + '<label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Goal</label>'
        + '<input id="goalLabel" class="input" style="width:100%;margin:6px 0 14px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2);box-sizing:border-box" placeholder="e.g. Reach 3.8 CGPA">'
        + '<label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Progress (0%)</label>'
        + '<input id="goalCurrent" type="range" min="0" max="100" value="0" style="width:100%;margin:10px 0 20px;accent-color:var(--gold)">'
        + '<div style="display:flex;gap:10px">'
        + '<button onclick="SM2Features.saveGoal(null)" class="sm2-btn sm2-btn-primary" style="flex:1;justify-content:center">Add Goal</button>'
        + '<button onclick="document.getElementById(\'sm2modalGoal\').remove()" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center">Cancel</button>'
        + '</div></div>';
      var m = createModal('sm2modalGoal', html, '380px');
      m.overlay.id = 'sm2modalGoal';
      document.getElementById('goalCurrent').addEventListener('input', function () {
        document.querySelector('#sm2modalGoal label:nth-of-type(2)').textContent = 'Progress (' + this.value + '%)';
      });
    };
    window.SM2Features.saveGoal = function (id) {
      var label = (document.getElementById('goalLabel') || {}).value || '';
      var current = parseInt((document.getElementById('goalCurrent') || {}).value || '0', 10);
      if (!label.trim()) { SM.toast('Please enter a goal label', 'error'); return; }
      var list = store.get(GOALS_KEY, goals) || [];
      if (id) {
        list = list.map(function (g) { return g.id === id ? { id: id, label: label.trim(), current: current } : g; });
      } else {
        list.push({ id: 'g' + Date.now(), label: label.trim(), current: current });
      }
      store.set(GOALS_KEY, list); goals = list;
      var m = document.getElementById('sm2modalGoal'); if (m) m.remove();
      renderGoals(); SM.toast(id ? 'Goal updated ✓' : 'Goal added ✓', 'success');
    };
    window.SM2Features.deleteGoal = function (id) {
      var list = (store.get(GOALS_KEY, goals) || []).filter(function (g) { return g.id !== id; });
      store.set(GOALS_KEY, list); goals = list; renderGoals();
      SM.toast('Goal removed', 'info');
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. DASHBOARD: DEADLINES (editable)
  ══════════════════════════════════════════════════════════════════════ */
  var DEADLINES_KEY = 'sm2_deadlines';

  function defaultDeadlines() {
    var now = new Date();
    var d1 = new Date(now); d1.setDate(d1.getDate() + 1);
    var d2 = new Date(now); d2.setDate(d2.getDate() + 4);
    var d3 = new Date(now); d3.setDate(d3.getDate() + 8);
    return [
      { id: 'dl1', title: 'Calculus Problem Set', subject: 'Mathematics', due: d1.toISOString().slice(0,10), done: false },
      { id: 'dl2', title: 'Physics Lab Report',   subject: 'Physics',     due: d2.toISOString().slice(0,10), done: false },
      { id: 'dl3', title: 'Essay: Modern History', subject: 'History',    due: d3.toISOString().slice(0,10), done: false },
    ];
  }

  function initDeadlines() {
    // First try by ID, then fall back to finding the section containing "Deadlines" text
    var panel = document.getElementById('db-deadlines');
    if (!panel) {
      document.querySelectorAll('.sm2-panel, .sm2-card').forEach(function (p) {
        if (!panel && p.querySelector('h3') && p.querySelector('h3').textContent.indexOf('Deadline') !== -1) panel = p;
      });
    }
    if (!panel) return;
    var section = panel.querySelector('.sm2-list');
    if (!section) { section = document.createElement('div'); section.className = 'sm2-list'; panel.appendChild(section); }
    var panelHead = panel.querySelector('.sm2-panel-head');
    if (!panelHead) return;

    var deadlines = store.get(DEADLINES_KEY, null);
    if (!deadlines) { deadlines = defaultDeadlines(); store.set(DEADLINES_KEY, deadlines); }

    function daysUntil(dateStr) {
      var due = new Date(dateStr + 'T23:59:59');
      var now = new Date(); now.setHours(0,0,0,0);
      return Math.ceil((due - now) / 86400000);
    }
    function tagClass(days, done) {
      if (done) return 'tag-ok';
      if (days <= 1) return 'tag-red'; if (days <= 5) return 'tag-gold'; return '';
    }
    function tagLabel(days, done) {
      if (done) return 'Done';
      if (days < 0) return 'Overdue'; if (days === 0) return 'Today'; if (days === 1) return '1 day';
      return days + ' days';
    }

    function renderDeadlines() {
      deadlines = store.get(DEADLINES_KEY, deadlines) || [];
      section.innerHTML = '';
      var sorted = deadlines.slice().sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return new Date(a.due) - new Date(b.due);
      });
      sorted.slice(0, 5).forEach(function (dl) {
        var days = daysUntil(dl.due);
        var tc = tagClass(days, dl.done);
        var row = document.createElement('div');
        row.className = 'sm2-list-row';
        row.innerHTML = '<span class="sm2-list-ico ' + (dl.done ? 'ico-ok' : days <= 1 ? 'ico-gold' : 'ico-info') + '" style="cursor:pointer" onclick="SM2Features.toggleDeadline(\'' + dl.id + '\')" title="' + (dl.done ? 'Mark undone' : 'Mark done') + '">'
          + (dl.done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3.5h9l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V9h5M8 13h8M8 16.5h5"/></svg>')
          + '</span>'
          + '<div class="sm2-list-body"><div class="t" style="' + (dl.done ? 'text-decoration:line-through;opacity:.55' : '') + '">' + esc(dl.title) + '</div><div class="s">' + esc(dl.subject) + ' · Due ' + new Date(dl.due + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) + '</div></div>'
          + (tc ? '<span class="sm2-tag ' + tc + '">' + tagLabel(days, dl.done) + '</span>' : '')
          + '<button onclick="SM2Features.deleteDeadline(\'' + dl.id + '\')" style="background:none;border:none;cursor:pointer;color:var(--ink-3);font-size:16px;padding:4px;line-height:1;margin-left:4px" title="Delete">×</button>';
        section.appendChild(row);
      });

      // Add deadline button
      if (!panel.querySelector('.sm2-add-deadline-btn')) {
        var addBtn = document.createElement('button');
        addBtn.className = 'sm2-btn sm2-btn-ghost sm2-add-deadline-btn';
        addBtn.style.cssText = 'width:100%;justify-content:center;font-size:12.5px;margin-top:10px';
        addBtn.textContent = '+ Add Deadline';
        addBtn.addEventListener('click', function () { SM2Features.addDeadline(); });
        panel.appendChild(addBtn);
      }
    }

    renderDeadlines();

    window.SM2Features = window.SM2Features || {};
    window.SM2Features.toggleDeadline = function (id) {
      var list = store.get(DEADLINES_KEY, deadlines) || [];
      list = list.map(function (dl) { return dl.id === id ? Object.assign({}, dl, { done: !dl.done }) : dl; });
      store.set(DEADLINES_KEY, list); deadlines = list; renderDeadlines();
    };
    window.SM2Features.deleteDeadline = function (id) {
      var list = (store.get(DEADLINES_KEY, deadlines) || []).filter(function (dl) { return dl.id !== id; });
      store.set(DEADLINES_KEY, list); deadlines = list; renderDeadlines();
      SM.toast('Deadline removed', 'info');
    };
    window.SM2Features.addDeadline = function () {
      var today = new Date().toISOString().slice(0,10);
      var html = '<div style="padding:24px">'
        + '<h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:var(--ink)">Add Deadline</h3>'
        + '<div style="display:flex;flex-direction:column;gap:12px">'
        + '<div><label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Title</label>'
        + '<input id="dlTitle" class="input" style="width:100%;margin-top:6px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2);box-sizing:border-box" placeholder="e.g. Math Assignment 3"></div>'
        + '<div><label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Subject</label>'
        + '<input id="dlSubject" class="input" style="width:100%;margin-top:6px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2);box-sizing:border-box" placeholder="e.g. Mathematics"></div>'
        + '<div><label style="font-size:12px;font-weight:600;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Due Date</label>'
        + '<input id="dlDue" type="date" style="width:100%;margin-top:6px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;font-size:14px;color:var(--ink);background:var(--card-2);box-sizing:border-box" value="' + today + '"></div>'
        + '<div style="display:flex;gap:10px;margin-top:4px">'
        + '<button onclick="SM2Features.saveDeadline()" class="sm2-btn sm2-btn-primary" style="flex:1;justify-content:center">Add Deadline</button>'
        + '<button onclick="document.getElementById(\'sm2modalDL\').remove()" class="sm2-btn sm2-btn-ghost" style="flex:1;justify-content:center">Cancel</button>'
        + '</div></div></div>';
      var m = createModal('sm2modalDL', html, '380px');
      m.overlay.id = 'sm2modalDL';
    };
    window.SM2Features.saveDeadline = function () {
      var title   = (document.getElementById('dlTitle')   || {}).value || '';
      var subject = (document.getElementById('dlSubject') || {}).value || '';
      var due     = (document.getElementById('dlDue')     || {}).value || '';
      if (!title.trim() || !due) { SM.toast('Please fill in title and date', 'error'); return; }
      var list = store.get(DEADLINES_KEY, deadlines) || [];
      list.push({ id: 'dl' + Date.now(), title: title.trim(), subject: subject.trim() || 'General', due: due, done: false });
      store.set(DEADLINES_KEY, list); deadlines = list;
      var m = document.getElementById('sm2modalDL'); if (m) m.remove();
      renderDeadlines(); SM.toast('Deadline added ✓', 'success');
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. DASHBOARD: LIVE GPA TREND from CGPA data
  ══════════════════════════════════════════════════════════════════════ */
  function initGpaTrend() {
    var trendSvg = document.querySelector('.sm2-trend svg');
    var trendSum = document.querySelector('.sm2-trend-sum');
    if (!trendSvg || !trendSum) return;

    var cd = cgpaData();
    if (!cd || !cd.rows || cd.rows.length < 2) return; // keep static if no data

    var rows = cd.rows.slice(-8);
    var gpas = rows.map(function (r) { return Math.max(0, Math.min(4.0, parseFloat(r.gpa) || 0)); });
    var W = 620, H = 190, PAD = 20;
    var minG = Math.max(0, Math.min.apply(null, gpas) - 0.2);
    var maxG = Math.min(4.0, Math.max.apply(null, gpas) + 0.2);
    function toX(i) { return PAD + (i / (gpas.length - 1)) * (W - PAD * 2); }
    function toY(g) { return PAD + (1 - (g - minG) / (maxG - minG)) * (H - PAD * 2 - 10); }

    var pts = gpas.map(function (g, i) { return toX(i) + ',' + toY(g); }).join(' ');
    var area = 'M' + toX(0) + ',' + toY(gpas[0])
      + gpas.slice(1).map(function (g, i) { return ' L' + toX(i + 1) + ',' + toY(g); }).join('')
      + ' L' + toX(gpas.length - 1) + ',' + H + ' L' + toX(0) + ',' + H + ' Z';
    var line = 'M' + toX(0) + ',' + toY(gpas[0])
      + gpas.slice(1).map(function (g, i) { return ' L' + toX(i + 1) + ',' + toY(g); }).join('');

    trendSvg.innerHTML = '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>'
      + '<g stroke="var(--border)" stroke-width="1"><line x1="0" y1="' + H*0.25 + '" x2="' + W + '" y2="' + H*0.25 + '"/><line x1="0" y1="' + H*0.5 + '" x2="' + W + '" y2="' + H*0.5 + '"/><line x1="0" y1="' + H*0.75 + '" x2="' + W + '" y2="' + H*0.75 + '"/></g>'
      + '<path d="' + area + '" fill="url(#ga)"/>'
      + '<path d="' + line + '" fill="none" stroke="var(--gold-strong)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      + gpas.map(function (g, i) {
          var cx = toX(i), cy = toY(g), isLast = i === gpas.length - 1;
          return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isLast ? '4.5' : '3.5') + '" fill="var(--gold-strong)"'
            + (isLast ? ' stroke="var(--panel)" stroke-width="2"' : '') + '/>';
        }).join('');

    // Update summary
    var high = Math.max.apply(null, gpas), low = Math.min.apply(null, gpas);
    var avg = gpas.reduce(function (s, g) { return s + g; }, 0) / gpas.length;
    var rising = gpas[gpas.length - 1] > gpas[0];
    var cells = trendSum.querySelectorAll('.ts .v');
    if (cells.length >= 4) {
      cells[0].textContent = high.toFixed(2);
      cells[1].textContent = low.toFixed(2);
      cells[2].textContent = round(avg, 2).toFixed(2);
      cells[3].textContent = rising ? '▲ Rising' : '▼ Falling';
      cells[3].style.color = rising ? 'var(--ok)' : 'var(--danger)';
    }
    // Update labels
    var labels = document.querySelector('.sm2-trend + div');
    if (labels) {
      labels.innerHTML = rows.map(function (r, i) {
        return '<span>' + esc(r.name || 'S' + (i + 1)) + '</span>';
      }).join('');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. DASHBOARD: LIVE CALENDAR with today + deadline dots
  ══════════════════════════════════════════════════════════════════════ */
  function initCalendar() {
    var calSection = document.querySelector('.sm2-cal');
    if (!calSection) return;
    var panelHead = calSection.closest('.sm2-panel').querySelector('.sm2-panel-head h3');

    var now = new Date();
    var year = now.getFullYear(), month = now.getMonth();
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (panelHead) panelHead.textContent = monthNames[month] + ' ' + year;

    var deadlines = store.get(DEADLINES_KEY, []) || [];
    var deadlineDays = {};
    deadlines.forEach(function (dl) {
      if (!dl.done) {
        var d = new Date(dl.due + 'T12:00:00');
        if (d.getMonth() === month && d.getFullYear() === year) {
          deadlineDays[d.getDate()] = true;
        }
      }
    });

    var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = now.getDate();

    var html = '';
    for (var i = 0; i < firstDay; i++) html += '<div class="cd mut"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var isToday = d === today;
      var hasDL = deadlineDays[d];
      var cls = 'cd' + (isToday ? ' hd' : '');
      html += '<div class="' + cls + '" title="' + monthNames[month] + ' ' + d + '">'
        + d
        + (hasDL && !isToday ? '<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--danger,#d1503c)"></span>' : '')
        + '</div>';
    }
    calSection.innerHTML = html;
    // Add relative positioning to cal cells that have deadline dots
    calSection.querySelectorAll('.cd').forEach(function (el) {
      if (el.querySelector('span')) el.style.position = 'relative';
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     10. AI SUGGESTIONS (dynamic from real data)
  ══════════════════════════════════════════════════════════════════════ */
  function initAiSuggestions() {
    var sugContainer = document.getElementById('db-ai-suggestions');
    if (!sugContainer) {
      var firstSug = document.querySelector('.sm2-sug');
      sugContainer = firstSug ? firstSug.parentElement : null;
    }
    if (!sugContainer) return;
    var gd = gpaData() || semGpaData();
    var cd = cgpaData();
    var tgt = targetGpaData();
    var deadlines = store.get(DEADLINES_KEY, []) || [];
    var urgent = deadlines.filter(function (dl) {
      if (dl.done) return false;
      var days = Math.ceil((new Date(dl.due + 'T23:59:59') - new Date()) / 86400000);
      return days <= 2;
    });

    var sugs = [];
    if (cd && tgt && tgt > cd.cgpa) {
      var needed = (tgt - cd.cgpa).toFixed(2);
      sugs.push({ icon: '📈', title: 'Boost your CGPA', body: 'You need ' + needed + ' more GPA points to hit your ' + tgt.toFixed(2) + ' target. Score 3.9+ next term to get there faster.' });
    } else {
      sugs.push({ icon: '📈', title: 'Track your CGPA', body: 'Open the CGPA Calculator and add your semesters — your dashboard will show live trend data.' });
    }
    if (urgent.length) {
      sugs.push({ icon: '⏰', title: 'Deadline alert', body: urgent[0].title + ' is due ' + (Math.ceil((new Date(urgent[0].due + 'T23:59:59') - new Date()) / 86400000) <= 1 ? 'tomorrow' : 'soon') + ' — block focused study time now.' });
    } else {
      sugs.push({ icon: '📅', title: 'Plan ahead', body: 'No urgent deadlines this week. Great time to review past material or get ahead on coursework.' });
    }
    sugs.push({ icon: '🎯', title: 'Study smarter', body: 'Use the Study Schedule Generator to plan your week — students who plan study 28% more effectively.' });

    var html = sugs.map(function (s) {
      return '<div class="sm2-sug"><span class="si"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:14px;height:14px;display:inline;color:var(--gold-strong)"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/></svg></span><div class="st"><b>' + s.icon + ' ' + esc(s.title) + ':</b> ' + esc(s.body) + '</div></div>';
    }).join('');
    var existing = sugContainer.querySelectorAll('.sm2-sug');
    existing.forEach(function (el) { el.remove(); });
    var askBtn = sugContainer.querySelector('.sm2-btn');
    sugContainer.insertAdjacentHTML('afterbegin', html);
  }

  /* ══════════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════════ */
  function init() {
    initSearch();
    initNotifications();
    initProfile();
    initWatchDemo();

    // Dashboard-only features
    if (document.querySelector('.sm2-metric, .sm2-goal, .sm2-cal')) {
      initDashboardMetrics();
      initGoals();
      initDeadlines();
      initGpaTrend();
      initCalendar();
      initAiSuggestions();
    }

    // Update sidebar profile name
    setTimeout(function () {
      var n = SM.store.get('sm_dash_name', '');
      if (n) document.querySelectorAll('.sm2-side-foot .nm').forEach(function (el) { el.textContent = n; });
    }, 300);
  }

  /* Boot: wait for both DOM and SM to be ready */
  function boot() {
    if (typeof window.SM === 'undefined') {
      /* SM not ready — poll with backoff (handles dynamic load on tool pages) */
      var attempts = 0;
      var poll = setInterval(function () {
        attempts++;
        if (typeof window.SM !== 'undefined') {
          clearInterval(poll);
          init();
        } else if (attempts > 40) {
          clearInterval(poll); /* give up after 4s */
        }
      }, 100);
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
