(function () {
  'use strict';
  var store = SM.store;
  var esc   = SM.esc;
  var round = SM.round;
  var TOOLS = [
    { slug:'gpa',                   name:'GPA Calculator',         url:'gpa.html',                   cat:'GPA & Grades' },
    { slug:'cgpa',                  name:'CGPA Calculator',        url:'cgpa.html',                  cat:'GPA & Grades' },
    { slug:'semester-gpa',          name:'Semester GPA',           url:'semester-gpa.html',          cat:'GPA & Grades' },
    { slug:'gpa-converter',         name:'GPA Converter',          url:'gpa-converter.html',         cat:'GPA & Grades' },
    { slug:'target-gpa',            name:'Target GPA',             url:'target-gpa.html',            cat:'GPA & Grades' },
    { slug:'gpa-improvement-planner',name:'GPA Planner',           url:'gpa-improvement-planner.html',cat:'GPA & Grades'},
    { slug:'percentage-to-gpa',     name:'% to GPA',               url:'percentage-to-gpa.html',     cat:'GPA & Grades' },
    { slug:'gpa-to-percentage',     name:'GPA to %',               url:'gpa-to-percentage.html',     cat:'GPA & Grades' },
    { slug:'grade-calculator',      name:'Grade Calculator',       url:'grade-calculator.html',      cat:'Grade Tools' },
    { slug:'final-exam-calculator', name:'Final Exam Calc',        url:'final-exam-calculator.html', cat:'Grade Tools' },
    { slug:'final-grade',           name:'Final Grade',            url:'final-grade.html',           cat:'Grade Tools' },
    { slug:'required-marks',        name:'Required Marks',         url:'required-marks.html',        cat:'Grade Tools' },
    { slug:'grade-predictor',       name:'Grade Predictor',        url:'grade-predictor.html',       cat:'Grade Tools' },
    { slug:'assignment-weight',     name:'Assignment Weight',      url:'assignment-weight.html',     cat:'Grade Tools' },
    { slug:'class-average',         name:'Class Average',          url:'class-average.html',         cat:'Grade Tools' },
    { slug:'percentage-calculator', name:'Percentage Calc',        url:'percentage-calculator.html', cat:'Grade Tools' },
    { slug:'attendance-calculator', name:'Attendance Tracker',     url:'attendance-calculator.html', cat:'Planning'    },
    { slug:'attendance-percentage', name:'Attendance %',           url:'attendance-percentage.html', cat:'Planning'    },
    { slug:'attendance-goal',       name:'Attendance Goal',        url:'attendance-goal.html',       cat:'Planning'    },
    { slug:'study-time',            name:'Study Time Planner',     url:'study-time.html',            cat:'Planning'    },
    { slug:'pomodoro',              name:'Pomodoro Timer',         url:'pomodoro.html',              cat:'Planning'    },
    { slug:'study-schedule',        name:'Study Schedule',         url:'study-schedule.html',        cat:'Planning'    },
    { slug:'credit-hour-planner',   name:'Credit Hour Planner',    url:'credit-hour-planner.html',   cat:'Planning'    },
    { slug:'scientific-calculator', name:'Scientific Calculator',  url:'scientific-calculator.html', cat:'Utilities'   },
    { slug:'basic-calculator',      name:'Basic Calculator',       url:'basic-calculator.html',      cat:'Utilities'   },
    { slug:'word-counter',          name:'Word Counter',           url:'word-counter.html',          cat:'Utilities'   },
  ];
  var K = {
    GPA_ROWS     : 'sm_gpa_rows',
    GPA_SCALE    : 'sm_gpa_scale',
    CGPA_ROWS    : 'sm_cgpa_rows',
    SEM_GPA      : 'sm_semester_gpa',
    GRADE_ROWS   : 'sm_grade_rows',
    GRADE_PRED   : 'sm_gp',
    CONV_ROWS    : 'sm_conv_rows',
    CONV_META    : 'sm_conv_meta',
    TARGET       : 'sm_target',
    FINAL_EXAM   : 'sm_final_exam',
    FINAL_GRADE  : 'sm_final',
    ATTEND       : 'sm_attend',
    ATTEND_PCT   : 'sm_ap',
    ATTEND_GOAL  : 'sm_ag',
    STUDY_TIME   : 'sm_st',
    ASSIGN_WT    : 'sm_aw',
    REQUIRED     : 'sm_required_marks',
    CREDIT_PLAN  : 'sm_chp',
    GIP          : 'sm_gip',
    STUDY_SCHED  : 'sm_ss',
    P2G          : 'sm_p2g',
    G2P          : 'sm_g2p',
    FAVORITES    : 'sm_dash_favorites',
    RECENT       : 'sm_dash_recent',
    USERNAME     : 'sm_dash_name',
  };
  var favorites    = store.get(K.FAVORITES, []);
  var recentVisits = store.get(K.RECENT, []);
  var username     = store.get(K.USERNAME, '');
  function $  (s, c) { return (c || document).querySelector(s); }
  function $$ (s, c) { return Array.from((c || document).querySelectorAll(s)); }
  var ICO = {
    star  : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    starO : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    arr   : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    clock : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    edit  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  };
  var L2P = {'A+':4.0,'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0,'C-':1.7,'D+':1.3,'D':1.0,'D-':0.7,'F':0};
  function letterToGpa(l) {
    return L2P.hasOwnProperty(l) ? L2P[l] : (parseFloat(l) || 0);
  }
  function pctToGpa(p) {
    p = Math.max(0, Math.min(100, p));
    if (p >= 93) return 4.0; if (p >= 90) return 3.7; if (p >= 87) return 3.3;
    if (p >= 83) return 3.0; if (p >= 80) return 2.7; if (p >= 77) return 2.3;
    if (p >= 73) return 2.0; if (p >= 70) return 1.7; if (p >= 67) return 1.3;
    if (p >= 63) return 1.0; if (p >= 60) return 0.7; return 0;
  }
  function gpaColor(g) {
    if (g >= 3.7) return 'var(--ok)';
    if (g >= 3.0) return 'var(--info)';
    if (g >= 2.0) return 'var(--warn)';
    return 'var(--danger)';
  }
  function gpaLabel(g) {
    if (g >= 3.7) return 'Excellent';
    if (g >= 3.3) return 'Very Good';
    if (g >= 3.0) return 'Good';
    if (g >= 2.0) return 'Satisfactory';
    if (g > 0)   return 'Needs improvement';
    return '—';
  }
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  }
  function weightedGpa(rows, gField, cField) {
    var pts = 0, cr = 0;
    (rows || []).forEach(function (r) {
      var g = parseFloat(r[gField] || r.gpa || 0);
      var c = parseFloat(r[cField] || r.credits || 0);
      if (!isNaN(g) && c > 0) { pts += g * c; cr += c; }
    });
    return cr > 0 ? pts / cr : null;
  }
  function ring(gpa, color, size) {
    var s = size || 90;
    var r = s / 2 - 7;
    var circ = 2 * Math.PI * r;
    var dash = Math.min(gpa / 4, 1) * circ;
    var cx = s / 2;
    return [
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '" aria-hidden="true">',
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="6.5"/>',
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6.5"',
      ' stroke-dasharray="' + dash.toFixed(2) + ' ' + circ.toFixed(2) + '"',
      ' stroke-linecap="round"',
      ' transform="rotate(-90 ' + cx + ' ' + cx + ')"',
      ' style="transition:stroke-dasharray .9s cubic-bezier(.22,1,.36,1)"',
      '/></svg>',
    ].join('');
  }
  function empty(title, sub, url, cta) {
    return [
      '<div class="db-empty">',
      '<div class="db-empty-msg">' + title + '</div>',
      '<div class="db-empty-sub">' + sub + '</div>',
      '<a href="' + url + '" class="btn btn-ghost">' + cta + '</a>',
      '</div>',
    ].join('');
  }
  function gpaData() {
    var rows = store.get(K.GPA_ROWS, []);
    if (!rows.length) return null;
    var scale = store.get(K.GPA_SCALE, 'letter') || 'letter';
    var pts = 0, cr = 0;
    rows.forEach(function (r) {
      var g;
      if (scale === 'letter') g = letterToGpa(r.grade);
      else if (scale === 'points') g = parseFloat(r.grade) || 0;
      else g = pctToGpa(parseFloat(r.grade) || 0);
      var c = parseFloat(r.credits) || 0;
      if (c > 0) { pts += g * c; cr += c; }
    });
    return { gpa: cr > 0 ? pts / cr : 0, courses: rows.length, credits: cr, rows: rows, scale: scale };
  }
  function cgpaData() {
    var rows = store.get(K.CGPA_ROWS, []);
    if (!rows.length) return null;
    var g = weightedGpa(rows, 'gpa', 'credits');
    var cr = rows.reduce(function (s, r) { return s + (parseFloat(r.credits) || 0); }, 0);
    return { cgpa: g || 0, semesters: rows.length, credits: cr, rows: rows };
  }
  function semGpaData() {
    var rows = store.get(K.SEM_GPA, []);
    if (!rows.length) return null;
    var g = weightedGpa(rows, 'grade', 'credits');
    var pts2 = 0, cr2 = 0;
    rows.forEach(function (r) {
      var gv = letterToGpa(r.grade);
      var c = parseFloat(r.credits) || 0;
      if (c > 0) { pts2 += gv * c; cr2 += c; }
    });
    var gpa = cr2 > 0 ? pts2 / cr2 : 0;
    return { gpa: gpa, courses: rows.length, rows: rows };
  }
  function renderWelcome() {
    var el = $('#db-welcome');
    if (!el) return;
    var gd = gpaData();
    var cd = cgpaData();
    var name = username || 'Student';
    var hr = new Date().getHours();
    var greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    var date = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    var mottos = [
      'Your GPA is built one grade at a time. 🎯',
      'Small steps, big results. Keep tracking. 📈',
      "Today's effort is tomorrow's average. ✨",
      'Consistency beats intensity every time. 💪',
      'Every calculation puts you closer to your goal. 🏆',
    ];
    var motto = mottos[new Date().getDate() % mottos.length];
    function statCard(gpaVal, label, sub, color) {
      return [
        '<div class="db-stat-card">',
        '  <div class="db-stat-ring">',
        '    ' + ring(gpaVal, color, 72),
        '    <div class="db-stat-ring-val"><span class="db-stat-num">' + round(gpaVal, 2).toFixed(2) + '</span></div>',
        '  </div>',
        '  <div class="db-stat-info">',
        '    <div class="db-stat-label">' + label + '</div>',
        '    <div class="db-stat-sub">' + sub + '</div>',
        '    <div class="db-stat-badge" style="color:' + color + '">' + gpaLabel(gpaVal) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }
    var statsHtml = '';
    if (gd) {
      statsHtml += statCard(gd.gpa, 'Current GPA',
        gd.courses + ' course' + (gd.courses !== 1 ? 's' : '') + ' · ' + round(gd.credits, 1) + ' cr',
        gpaColor(gd.gpa));
    } else {
      statsHtml += '<div class="db-stat-empty"><a href="gpa.html" class="btn btn-ghost">Set up GPA</a></div>';
    }
    if (cd) {
      statsHtml += statCard(cd.cgpa, 'Cumulative GPA',
        cd.semesters + ' semester' + (cd.semesters !== 1 ? 's' : '') + ' · ' + round(cd.credits, 1) + ' cr',
        gpaColor(cd.cgpa));
    } else {
      statsHtml += '<div class="db-stat-empty"><a href="cgpa.html" class="btn btn-ghost">Set up CGPA</a></div>';
    }
    el.innerHTML = [
      '<div class="db-welcome-inner">',
      '  <div class="db-welcome-text">',
      '    <div class="db-greeting">' + greet + ', <span class="db-name">' + esc(name) + '</span>',
      '      <button class="db-name-edit" id="editName" aria-label="Edit name" title="Edit your name">' + ICO.edit + '</button>',
      '    </div>',
      '    <div class="db-date">' + date + '</div>',
      '    <div class="db-motivation">' + motto + '</div>',
      '  </div>',
      '  <div class="db-stats-bar">' + statsHtml + '</div>',
      '</div>',
    ].join('');
    var btn = $('#editName');
    if (btn) {
      btn.addEventListener('click', function () {
        var n = prompt('Enter your name:', username);
        if (n !== null) {
          username = n.trim().slice(0, 40);
          store.set(K.USERNAME, username);
          renderWelcome();
        }
      });
    }
  }
  function renderGpaHistory() {
    var el = $('#db-gpa-history');
    if (!el) return;
    var d = gpaData();
    if (!d) {
      el.innerHTML = empty('No GPA data', 'Open the GPA Calculator and enter your courses — data saves automatically.', 'gpa.html', 'Open GPA Calculator');
      return;
    }
    var rows = d.rows.slice(0, 8);
    var courseRows = rows.map(function (r) {
      var pts;
      if (d.scale === 'letter') pts = letterToGpa(r.grade);
      else if (d.scale === 'points') pts = parseFloat(r.grade) || 0;
      else pts = pctToGpa(parseFloat(r.grade) || 0);
      var barW = ((pts / 4) * 100).toFixed(1);
      return [
        '<div class="db-course-row">',
        '<span class="db-course-name">' + esc(r.name || 'Course') + '</span>',
        '<span class="db-course-grade">' + esc(String(r.grade || '—')) + '</span>',
        '<div class="db-course-bar"><div class="db-course-bar-fill" style="width:' + barW + '%;background:' + gpaColor(pts) + '"></div></div>',
        '<span class="db-course-pts tnum">' + pts.toFixed(2) + '</span>',
        '</div>',
      ].join('');
    }).join('');
    var more = d.rows.length > 8 ? '<div class="db-course-more">+' + (d.rows.length - 8) + ' more courses — open calculator to see all</div>' : '';
    el.innerHTML = [
      '<div class="db-gpa-summary">',
      '  <div class="db-gpa-ring-wrap">' + ring(d.gpa, gpaColor(d.gpa), 100) + '<div class="db-gpa-ring-center"><span class="db-gpa-big">' + round(d.gpa, 2).toFixed(2) + '</span><span class="db-gpa-sub">/ 4.0</span></div></div>',
      '  <div class="db-gpa-details">',
      '    <div class="db-gpa-label-row"><span class="db-gpa-standing" style="color:' + gpaColor(d.gpa) + '">' + gpaLabel(d.gpa) + '</span><span class="db-gpa-meta">' + d.courses + ' course' + (d.courses !== 1 ? 's' : '') + ' · ' + round(d.credits, 1) + ' credits</span></div>',
      '    <div class="db-course-list">' + courseRows + more + '</div>',
      '  </div>',
      '</div>',
      '<a href="gpa.html" class="db-panel-link">Open GPA Calculator ' + ICO.arr + '</a>',
    ].join('');
  }
  function renderCgpaHistory() {
    var el = $('#db-cgpa-history');
    if (!el) return;
    var d = cgpaData();
    if (!d) {
      el.innerHTML = empty('No CGPA data', 'Open the CGPA Calculator and add your semesters — data saves automatically.', 'cgpa.html', 'Open CGPA Calculator');
      return;
    }
    var semRows = d.rows.map(function (r) {
      var g = parseFloat(r.gpa) || 0;
      var barW = ((g / 4) * 100).toFixed(1);
      return [
        '<div class="db-course-row">',
        '<span class="db-course-name">' + esc(r.name || 'Semester') + '</span>',
        '<span class="db-course-grade tnum">' + g.toFixed(2) + '</span>',
        '<div class="db-course-bar"><div class="db-course-bar-fill" style="width:' + barW + '%;background:' + gpaColor(g) + '"></div></div>',
        '<span class="db-course-pts">' + (parseFloat(r.credits) || 0) + ' cr</span>',
        '</div>',
      ].join('');
    }).join('');
    el.innerHTML = [
      '<div class="db-gpa-summary">',
      '  <div class="db-gpa-ring-wrap">' + ring(d.cgpa, gpaColor(d.cgpa), 100) + '<div class="db-gpa-ring-center"><span class="db-gpa-big">' + round(d.cgpa, 2).toFixed(2) + '</span><span class="db-gpa-sub">/ 4.0</span></div></div>',
      '  <div class="db-gpa-details">',
      '    <div class="db-gpa-label-row"><span class="db-gpa-standing" style="color:' + gpaColor(d.cgpa) + '">' + gpaLabel(d.cgpa) + '</span><span class="db-gpa-meta">' + d.semesters + ' semester' + (d.semesters !== 1 ? 's' : '') + ' · ' + round(d.credits, 1) + ' credits</span></div>',
      '    <div class="db-course-list">' + semRows + '</div>',
      '  </div>',
      '</div>',
      '<a href="cgpa.html" class="db-panel-link">Open CGPA Calculator ' + ICO.arr + '</a>',
    ].join('');
  }
  function buildCalcs() {
    var list = [];
    var gd = gpaData();
    if (gd && gd.courses) {
      list.push({ tool:'GPA Calculator', url:'gpa.html',
        result: round(gd.gpa,2).toFixed(2) + ' GPA',
        sub: gd.courses + ' courses tracked',
        color: gpaColor(gd.gpa) });
    }
    var cd = cgpaData();
    if (cd) {
      list.push({ tool:'CGPA Calculator', url:'cgpa.html',
        result: round(cd.cgpa,2).toFixed(2) + ' CGPA',
        sub: cd.semesters + ' semesters',
        color: gpaColor(cd.cgpa) });
    }
    var sd = semGpaData();
    if (sd) {
      list.push({ tool:'Semester GPA', url:'semester-gpa.html',
        result: round(sd.gpa,2).toFixed(2) + ' GPA',
        sub: sd.courses + ' courses this term',
        color: gpaColor(sd.gpa) });
    }
    var tgt = store.get(K.TARGET, null);
    if (tgt && tgt.goal) {
      list.push({ tool:'Target GPA', url:'target-gpa.html',
        result: 'Goal: ' + parseFloat(tgt.goal).toFixed(2),
        sub: 'Current: ' + parseFloat(tgt.cur || 0).toFixed(2),
        color: 'var(--info)' });
    }
    var fe = store.get(K.FINAL_EXAM, null);
    if (fe && fe.goal) {
      list.push({ tool:'Final Exam Calc', url:'final-exam-calculator.html',
        result: 'Goal: ' + parseFloat(fe.goal).toFixed(1) + '%',
        sub: 'Current: ' + parseFloat(fe.cur || 0).toFixed(1) + '% · Weight: ' + parseFloat(fe.weight || 0) + '%',
        color: 'var(--warn)' });
    }
    var att = store.get(K.ATTEND, null);
    if (att && (att.a !== undefined)) {
      var pct = att.h > 0 ? (att.a / att.h) * 100 : 0;
      list.push({ tool:'Attendance Tracker', url:'attendance-calculator.html',
        result: round(pct,1) + '% attendance',
        sub: att.a + ' attended of ' + att.h + ' classes',
        color: pct >= 75 ? 'var(--ok)' : 'var(--danger)' });
    }
    var gip = store.get(K.GIP, null);
    if (gip && gip.cur) {
      list.push({ tool:'GPA Planner', url:'gpa-improvement-planner.html',
        result: gip.cur + ' → ' + (gip.tgt || '?'),
        sub: (gip.left || '?') + ' credits remaining',
        color: 'var(--ok)' });
    }
    var gp = store.get(K.GRADE_PRED, []);
    if (gp.length) {
      list.push({ tool:'Grade Predictor', url:'grade-predictor.html',
        result: gp.length + ' component' + (gp.length !== 1 ? 's' : '') + ' saved',
        sub: 'Open to see predicted grade',
        color: 'var(--info)' });
    }
    var aw = store.get(K.ASSIGN_WT, []);
    if (aw.length) {
      list.push({ tool:'Assignment Weight', url:'assignment-weight.html',
        result: aw.length + ' assignment' + (aw.length !== 1 ? 's' : '') + ' saved',
        sub: 'Open to calculate weight',
        color: 'var(--accent-strong)' });
    }
    var ss = store.get(K.STUDY_SCHED, []);
    if (ss.length) {
      var totalHrs = ss.reduce(function (s, r) { return s + (parseFloat(r.hrs) || 0); }, 0);
      list.push({ tool:'Study Schedule', url:'study-schedule.html',
        result: totalHrs + ' hrs / week planned',
        sub: ss.length + ' subject' + (ss.length !== 1 ? 's' : ''),
        color: 'var(--info)' });
    }
    var rm = store.get(K.REQUIRED, []);
    if (rm.length) {
      list.push({ tool:'Required Marks', url:'required-marks.html',
        result: rm.length + ' subject' + (rm.length !== 1 ? 's' : ''),
        sub: 'Target marks saved',
        color: 'var(--warn)' });
    }
    return list.slice(0, 9);
  }
  function renderRecentCalcs() {
    var el = $('#db-recent-calcs');
    if (!el) return;
    var list = buildCalcs();
    if (!list.length) {
      el.innerHTML = empty(
        'No calculations yet',
        'Use any calculator tool — your results will appear here automatically.',
        'index.html#tools', 'Browse all tools'
      );
      return;
    }
    var html = '<div class="db-calcs-grid">';
    list.forEach(function (c) {
      html += [
        '<a href="' + c.url + '" class="db-calc-card">',
        '<div class="db-calc-indicator" style="background:' + c.color + '"></div>',
        '<div class="db-calc-body">',
        '<div class="db-calc-tool">' + c.tool + '</div>',
        '<div class="db-calc-result">' + c.result + '</div>',
        '<div class="db-calc-sub">' + c.sub + '</div>',
        '</div>',
        '<div class="db-calc-arrow">' + ICO.arr + '</div>',
        '</a>',
      ].join('');
    });
    html += '</div>';
    el.innerHTML = html;
  }
  function renderRecentVisits() {
    var el = $('#db-recent-visits');
    if (!el) return;
    if (!recentVisits.length) {
      el.innerHTML = empty(
        'No recent activity',
        'Visit any calculator — your history will appear here.',
        'index.html#tools', 'Browse tools'
      );
      return;
    }
    var html = '<div class="db-visits-list">';
    recentVisits.forEach(function (v) {
      html += [
        '<a href="' + esc(v.url) + '" class="db-visit-row">',
        '<div class="db-visit-dot"></div>',
        '<div class="db-visit-name">' + esc(v.name) + '</div>',
        '<div class="db-visit-time">' + ICO.clock + fmtDate(v.ts) + '</div>',
        '<div class="db-visit-arrow">' + ICO.arr + '</div>',
        '</a>',
      ].join('');
    });
    html += '</div>';
    el.innerHTML = html;
  }
  function isFav(slug) { return favorites.indexOf(slug) !== -1; }
  function toggleFav(slug) {
    if (isFav(slug)) {
      favorites = favorites.filter(function (f) { return f !== slug; });
      SM.toast('Removed from favorites', 'info');
    } else {
      if (favorites.length >= 20) {
        SM.toast('Maximum 20 favorites — remove one first', 'error');
        return;
      }
      favorites.push(slug);
      SM.toast('Added to favorites ⭐', 'success');
    }
    store.set(K.FAVORITES, favorites);
    renderFavorites();
    renderQuickAccess();
  }
  function renderFavorites() {
    var el = $('#db-favorites');
    if (!el) return;
    var favTools = TOOLS.filter(function (t) { return isFav(t.slug); });
    if (!favTools.length) {
      el.innerHTML = [
        '<div class="db-empty">',
        '<div class="db-empty-icon">' + ICO.star + '</div>',
        '<div class="db-empty-msg">No favorites yet</div>',
        '<div class="db-empty-sub">Star any tool in Quick Access below to pin it here.</div>',
        '</div>',
      ].join('');
      return;
    }
    var html = '<div class="db-fav-grid">';
    favTools.forEach(function (t) {
      html += [
        '<div class="db-fav-card">',
        '<a href="' + t.url + '" class="db-fav-link">',
        '<span class="db-fav-name">' + t.name + '</span>',
        '<span class="db-fav-arrow">' + ICO.arr + '</span>',
        '</a>',
        '<button class="db-fav-star active" data-slug="' + t.slug + '" aria-label="Remove from favorites">',
        ICO.star,
        '</button>',
        '</div>',
      ].join('');
    });
    html += '</div>';
    el.innerHTML = html;
    $$('.db-fav-star', el).forEach(function (btn) {
      btn.addEventListener('click', function () { toggleFav(btn.getAttribute('data-slug')); });
    });
  }
  function renderQuickAccess() {
    var el = $('#db-quick-access');
    if (!el) return;
    var groups = {};
    var order  = [];
    TOOLS.forEach(function (t) {
      if (!groups[t.cat]) { groups[t.cat] = []; order.push(t.cat); }
      groups[t.cat].push(t);
    });
    var html = '';
    order.forEach(function (cat) {
      html += '<div class="db-qa-group">';
      html += '<div class="db-qa-cat">' + cat + '</div>';
      html += '<div class="db-qa-grid">';
      groups[cat].forEach(function (t) {
        var fav = isFav(t.slug);
        html += [
          '<div class="db-qa-card">',
          '<a href="' + t.url + '" class="db-qa-link"><span class="db-qa-name">' + t.name + '</span></a>',
          '<button class="db-qa-star' + (fav ? ' active' : '') + '" data-slug="' + t.slug + '"',
          ' aria-label="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '">' + (fav ? ICO.star : ICO.starO) + '</button>',
          '</div>',
        ].join('');
      });
      html += '</div></div>';
    });
    el.innerHTML = html;
    $$('.db-qa-star', el).forEach(function (btn) {
      btn.addEventListener('click', function () { toggleFav(btn.getAttribute('data-slug')); });
    });
  }
  function initSectionNav() {
    var btns     = $$('.db-nav-btn');
    var sections = $$('[id^="db-sec-"]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-section');
        var sec = $('#db-sec-' + id);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    function updateActiveNav() {
      var y = window.scrollY + 130;
      var active = '';
      sections.forEach(function (s) {
        if (s.offsetTop <= y) active = s.id.replace('db-sec-', '');
      });
      if (!active && sections.length) active = sections[0].id.replace('db-sec-', '');
      btns.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-section') === active);
      });
    }
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();
  }
  function initClearSettings() {
    var btn = $('#dbClearSettings');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!confirm('Clear your name, favorites, and personalization data? Calculator data is not affected.')) return;
      store.set(K.FAVORITES, []);
      store.set(K.RECENT, []);
      store.set(K.USERNAME, '');
      try {
        localStorage.removeItem('sm_freq');
        localStorage.removeItem('sm_last_open');
        localStorage.removeItem('sm_search_history');
      } catch(e) {}
      favorites = []; recentVisits = []; username = '';
      renderAll();
      if (window.SM_PERSONALIZATION) {
        SM_PERSONALIZATION.renderDashboardRecommended();
        SM_PERSONALIZATION.renderCountryNote();
      }
      SM.toast('Dashboard reset', 'info');
    });
  }
  function renderAll() {
    renderWelcome();
    renderGpaHistory();
    renderCgpaHistory();
    renderRecentCalcs();
    renderFavorites();
    renderQuickAccess();
    renderRecentVisits();
  }
  function init() {
    renderAll();
    initSectionNav();
    initClearSettings();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();