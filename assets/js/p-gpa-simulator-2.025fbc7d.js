/* ==========================================================================
   Scholarics — GPA Simulator Core
   gpa-simulator-core.js · v1.0
   Pure grading logic + modular grading scales. No DOM access, no storage:
   this module is unit-testable in Node and shared by the simulator UI.

   Exposes window.SCSimCore:
     scales           { id -> scale }   registered grading scales
     scaleList()      [scale, ...]      in UI order
     getScale(id)     scale             validated, falls back to "us40"
     gradePoints(scale, grade)          points for a grade string
     calcGpa(scale, courses)            { gpa, credits, qualityPoints }
     calcCgpa(scale, semesters)         same, across all semesters
     neededPoints(scale, semesters, courseId, target)
     formatNeeded(scale, points, targetMet)
     nearestGrade(scale, points)        letter or rounded number
     classify(scale, gpa)               standing label
     convertGrade(from, to, grade)      best-effort grade conversion
     sanitizeSemesters(raw, opts)       validated, deduped copy
     progressPct(current, target, max)
   ========================================================================== */
(function (global) {
  "use strict";

  /* ── Modular grading scales ────────────────────────────────────────────
     type "letter": grade stored as a letter code; points via L2P map.
     type "number": grade stored as a number on the scale (points = value). */
  var LETTERS_4 = [
    { g: "A+", p: 4.0 }, { g: "A", p: 4.0 }, { g: "A-", p: 3.7 },
    { g: "B+", p: 3.3 }, { g: "B", p: 3.0 }, { g: "B-", p: 2.7 },
    { g: "C+", p: 2.3 }, { g: "C", p: 2.0 }, { g: "C-", p: 1.7 },
    { g: "D+", p: 1.3 }, { g: "D", p: 1.0 }, { g: "D-", p: 0.7 },
    { g: "F", p: 0 }
  ];

  var SCALES = {
    us40: {
      id: "us40", label: "4.0 Scale (USA)", short: "4.0", max: 4.0,
      type: "letter", step: 0.01, letters: LETTERS_4
    },
    us43: {
      id: "us43", label: "4.3 Scale (A+ = 4.3)", short: "4.3", max: 4.3,
      type: "letter", step: 0.01,
      letters: [
        { g: "A+", p: 4.3 }, { g: "A", p: 4.0 }, { g: "A-", p: 3.7 },
        { g: "B+", p: 3.3 }, { g: "B", p: 3.0 }, { g: "B-", p: 2.7 },
        { g: "C+", p: 2.3 }, { g: "C", p: 2.0 }, { g: "C-", p: 1.7 },
        { g: "D+", p: 1.3 }, { g: "D", p: 1.0 }, { g: "D-", p: 0.7 },
        { g: "F", p: 0 }
      ]
    },
    us50: {
      id: "us50", label: "5.0 Scale", short: "5.0", max: 5.0,
      type: "letter", step: 0.01,
      letters: [
        { g: "A+", p: 5.0 }, { g: "A", p: 5.0 }, { g: "A-", p: 4.5 },
        { g: "B+", p: 4.0 }, { g: "B", p: 3.5 }, { g: "B-", p: 3.0 },
        { g: "C+", p: 2.5 }, { g: "C", p: 2.0 }, { g: "C-", p: 1.5 },
        { g: "D+", p: 1.0 }, { g: "D", p: 0.5 }, { g: "D-", p: 0 },
        { g: "F", p: 0 }
      ]
    },
    aus7: {
      id: "aus7", label: "7.0 Scale (Australia)", short: "7.0", max: 7.0,
      type: "letter", step: 0.01,
      letters: [
        { g: "HD", p: 7.0 }, { g: "D", p: 6.0 }, { g: "C", p: 5.0 },
        { g: "P", p: 4.0 }, { g: "N", p: 0 }
      ]
    },
    in10: {
      id: "in10", label: "10.0 Scale (India)", short: "10.0", max: 10,
      type: "number", step: 0.01
    },
    pct: {
      id: "pct", label: "Percentage (%)", short: "%", max: 100,
      type: "number", step: 0.1
    }
  };

  var SCALE_ORDER = ["us40", "us43", "us50", "aus7", "in10", "pct"];

  /* ── Math helpers ────────────────────────────────────────────────────── */
  /* Round half-up to d decimals. Adds a small absolute epsilon before
     scaling so binary float representation errors (e.g. 9.075) don't
     round down; 1e-9 is negligible at GPA magnitudes (0–100). */
  function round(n, d) {
    var f = Math.pow(10, d === undefined ? 2 : d);
    var eps = 1e-9;
    return Math.round((n + (n >= 0 ? eps : -eps)) * f) / f;
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function num(v, fallback) {
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function creditsOf(c) {
    return clamp(num(c && c.credits, 0), 0, 50);
  }

  /* ── Scale access ────────────────────────────────────────────────────── */
  function getScale(id) { return SCALES[id] || SCALES.us40; }
  function scaleList() { return SCALE_ORDER.map(function (id) { return SCALES[id]; }); }

  /* ── Points ──────────────────────────────────────────────────────────── */
  function gradePoints(scale, grade) {
    scale = getScale(scale && scale.id ? scale.id : scale);
    if (scale.type === "letter") {
      for (var i = 0; i < scale.letters.length; i++) {
        if (scale.letters[i].g === grade) return scale.letters[i].p;
      }
      return 0;
    }
    return clamp(num(grade, 0), 0, scale.max);
  }

  /* ── GPA maths ───────────────────────────────────────────────────────── */
  function accumulate(scale, courses, running) {
    courses.forEach(function (c) {
      var cr = creditsOf(c);
      if (cr > 0) {
        running.credits += cr;
        running.qualityPoints += gradePoints(scale, c.grade) * cr;
      }
    });
  }

  function calcGpa(scale, courses) {
    var acc = { credits: 0, qualityPoints: 0 };
    accumulate(scale, courses || [], acc);
    return {
      gpa: acc.credits > 0 ? round(acc.qualityPoints / acc.credits, 3) : null,
      credits: round(acc.credits, 2),
      qualityPoints: round(acc.qualityPoints, 3)
    };
  }

  function calcCgpa(scale, semesters) {
    var acc = { credits: 0, qualityPoints: 0 };
    (semesters || []).forEach(function (s) {
      accumulate(scale, (s && s.courses) || [], acc);
    });
    return {
      gpa: acc.credits > 0 ? round(acc.qualityPoints / acc.credits, 3) : null,
      credits: round(acc.credits, 2),
      qualityPoints: round(acc.qualityPoints, 3)
    };
  }

  /* ── Needed-grade reverse calculation ───────────────────────────────────
     Points required in ONE course (courseId) so the cumulative GPA reaches
     target, holding every other course constant. */
  function neededPoints(scale, semesters, courseId, target) {
    var other = { credits: 0, qualityPoints: 0 };
    var thisCourse = null;
    (semesters || []).forEach(function (s) {
      (s && s.courses || []).forEach(function (c) {
        if (c.id === courseId) { thisCourse = c; return; }
        accumulate(scale, [c], other);
      });
    });
    if (!thisCourse) return null;
    var cr = creditsOf(thisCourse);
    if (cr === 0) return null;
    var t = clamp(num(target, 0), 0, scale.max);
    return round(((t * (other.credits + cr)) - other.qualityPoints) / cr, 3);
  }

  /* ── Needed-grade presentation ───────────────────────────────────────── */
  function nearestGrade(scale, points) {
    scale = getScale(scale && scale.id ? scale.id : scale);
    var p = clamp(num(points, 0), 0, scale.max);
    if (scale.type === "number") return round(p, 2);
    var best = scale.letters[scale.letters.length - 1].g;
    var bd = Infinity;
    scale.letters.forEach(function (l) {
      var d = Math.abs(l.p - p);
      if (d < bd) { bd = d; best = l.g; }
    });
    return best;
  }

  function formatNeeded(scale, points, scaleMax) {
    var max = num(scaleMax, scale.max);
    if (points === null || points === undefined) return null;
    if (points > max) return { label: "Impossible", cls: "sim-need-bad" };
    if (points <= 0) return { label: "Already met", cls: "sim-need-ok" };
    var grade = nearestGrade(scale, points);
    var label = scale.type === "number"
      ? (scale.id === "pct" ? "Need " + round(points, 1) + "%" : "Need " + round(points, 2))
      : "Need " + grade;
    return { label: label, cls: "sim-need-info" };
  }

  /* ── Standing classification (relative to each scale's maximum) ──────── */
  function classify(scale, gpa) {
    if (gpa === null || gpa === undefined) return "";
    var max = getScale(scale && scale.id ? scale.id : scale).max;
    if (gpa >= 0.925 * max) return "Excellent standing";
    if (gpa >= 0.825 * max) return "Very good";
    if (gpa >= 0.75 * max)  return "Good standing";
    if (gpa >= 0.5 * max)   return "Satisfactory";
    if (gpa > 0)            return "Needs improvement";
    return "";
  }

  /* ── Grade conversion between scales (ratio of max; letter fallback) ─── */
  function convertGrade(fromScale, toScale, grade) {
    var from = getScale(fromScale && fromScale.id ? fromScale.id : fromScale);
    var to = getScale(toScale && toScale.id ? toScale.id : toScale);
    if (from.id === to.id) return grade;
    var pts = gradePoints(from, grade);
    if (to.type === "number") return round((pts / from.max) * to.max, to.id === "pct" ? 1 : 2);
    /* letter target: exact match if available, else nearest letter */
    for (var i = 0; i < to.letters.length; i++) {
      if (to.letters[i].g === grade) return grade;
    }
    return nearestGrade(to, (pts / from.max) * to.max);
  }

  /* ── State sanitisation (corrupted localStorage / share links) ─────────
     Returns a clean array of semesters or null when unusable. Never throws. */
  function sanitizeSemesters(raw, opts) {
    opts = opts || {};
    var maxSem = opts.maxSemesters || 12;
    var maxRows = opts.maxCourses || 20;
    if (!Array.isArray(raw) || !raw.length) return null;

    var seen = {};
    var out = [];
    for (var si = 0; si < raw.length && out.length < maxSem; si++) {
      var s = raw[si];
      if (!s || typeof s !== "object") continue;
      /* drop objects with neither a name nor a courses array (junk rows) */
      if (!Array.isArray(s.courses) && !s.name) continue;
      var name = String(s.name || "").slice(0, 60).trim() || ("Semester " + (out.length + 1));
      var courses = [];
      var rawCourses = Array.isArray(s.courses) ? s.courses : [];
      for (var ci = 0; ci < rawCourses.length && courses.length < maxRows; ci++) {
        var c = rawCourses[ci];
        if (!c || typeof c !== "object") continue;
        var id = String(c.id || "");
        if (!id) id = uid();
        if (seen[id]) id = uid();            /* prevent duplicate IDs */
        seen[id] = true;
        courses.push({
          id: id,
          name: String(c.name || "").slice(0, 120),
          grade: String(c.grade || "").slice(0, 8),
          credits: clamp(num(c.credits, 3), 0, 50)
        });
      }
      var sid = String(s.id || "");
      if (!sid) sid = uid();
      if (seen[sid]) sid = uid();
      seen[sid] = true;
      out.push({ id: sid, name: name, courses: courses });
    }
    return out.length ? out : null;
  }

  function progressPct(current, target, max) {
    var t = clamp(num(target, 0), 0, max || 4);
    if (current === null || current === undefined) return 0;
    var c = clamp(num(current, 0), 0, max || 4);
    if (t <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
  }

  function uid() {
    return "c" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  }

  global.SCSimCore = {
    scales: SCALES,
    scaleList: scaleList,
    getScale: getScale,
    gradePoints: gradePoints,
    calcGpa: calcGpa,
    calcCgpa: calcCgpa,
    neededPoints: neededPoints,
    nearestGrade: nearestGrade,
    formatNeeded: formatNeeded,
    classify: classify,
    convertGrade: convertGrade,
    sanitizeSemesters: sanitizeSemesters,
    progressPct: progressPct,
    round: round,
    clamp: clamp,
    num: num,
    uid: uid
  };
})(typeof window !== "undefined" ? window : globalThis);

/* ==========================================================================
   Scholarics — GPA Simulator
   gpa-simulator.js · v2.0
   Features:
     • Modular grading scales (4.0, 4.3, 5.0, 7.0, 10.0, Percentage) —
       all maths delegated to SCSimCore (js/gpa-simulator-core.js)
     • Live multi-semester CGPA with what-if grade simulation
     • Semester trend sparkline (pure SVG, zero dependencies)
     • Target reverse-calculation per course ("needed grade")
     • Undo for deleted courses / cleared semesters / deleted semesters
     • Shareable URLs (state + scale), CSV export, copy-results, PDF print
     • AI Study Coach via the Cloudflare backend (/api/ai/coach) — the
       Gemini key never reaches the browser. Deterministic local fallback.
     • Performance: event delegation (no per-row listeners), targeted DOM
       updates (no full row re-render while typing), debounced saves.
     • Reliability: sanitised localStorage/share-link restore, deduped IDs,
       keyboard-navigable semester tabs, ARIA live regions.
   ========================================================================== */
(function () {
  "use strict";

  var CORE = window.SCSimCore;

  /* ── SC namespace utilities (Scholarics global) ─────────────────────── */
  var $ = SC.$, $$ = SC.$$, clamp = SC.clamp,
      esc = SC.esc, store = SC.store;

  /* ── Constants ───────────────────────────────────────────────────────── */
  var KEY_SEM   = "sc_sim_semesters";   /* array of semester objects (JSON) */
  var KEY_TGT   = "sc_sim_target";      /* target GPA (raw float string) */
  var KEY_SCALE = "sc_sim_scale";       /* grading scale id (raw string) */
  var MAX_SEM   = 12;
  var MAX_ROWS  = 20;
  var UNDO_MAX  = 20;
  var SAVE_DELAY = 300;                 /* ms — debounce for localStorage */

  /* ── State ───────────────────────────────────────────────────────────── */
  var semesters = [], targetGpa = 3.5, scaleId = "us40";
  var activeSem = 0, sharedFromLink = false, saveTimer = null;
  var undoStack = [];

  function getScale() { return CORE.getScale(scaleId); }

  /* Display formatting — round in decimal space before toFixed to avoid
     float artifacts (e.g. 9.075 → "9.07" without this). */
  function fmtGpa(g) {
    return g === null || g === undefined ? "—" : CORE.round(g, 2).toFixed(2);
  }

  /* ── State load (localStorage + share links, fully sanitised) ───────── */
  function loadState() {
    var scale, target = null, sems = null;

    /* 1. Share link takes priority */
    if (window.SCShare) {
      var p = SCShare.params();
      var raw = p.get("sim");
      var tgt = p.get("tgt");
      var sc = p.get("scale");
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            sems = CORE.sanitizeSemesters(normalizeShare(parsed));
            /* a "scenario" with no courses at all is junk — ignore it */
            if (sems && totalCourseCount(sems) === 0) sems = null;
            if (sems) {
              scale = CORE.getScale(sc);
              target = parseFloat(tgt);
              if (!isFinite(target)) target = null;
              sharedFromLink = true;
            }
          }
        } catch (e) { sems = null; }
      }
    }

    /* 2. Fall back to saved data */
    if (!sems) {
      sems = CORE.sanitizeSemesters(store.get(KEY_SEM, null));
      if (!sems || !sems.length) {
        sems = [makeSem("Semester 1", [
          { id: CORE.uid ? CORE.uid() : SC.uid(), name: "English 101", grade: "A",  credits: 3 },
          { id: CORE.uid ? CORE.uid() : SC.uid(), name: "Calculus I",  grade: "B+", credits: 4 },
          { id: CORE.uid ? CORE.uid() : SC.uid(), name: "History 101", grade: "A-", credits: 3 }
        ])];
      }
      try { target = parseFloat(localStorage.getItem(KEY_TGT)); } catch (e) {}
      if (!isFinite(target)) target = null;
      try { scale = CORE.getScale(localStorage.getItem(KEY_SCALE)); } catch (e) {}
    }

    var scObj = scale || CORE.getScale("us40");
    return {
      semesters: sems,
      target: clamp(target === null ? 3.5 : target, 0, scObj.max),
      scaleId: scObj.id
    };
  }

  /* Convert the compact share format [{n, c:[[name,grade,credits],…]}] —
     also emitted by the previous simulator version — into course objects. */
  function normalizeShare(parsed) {
    return parsed.map(function (s) {
      return {
        name: s.n,
        courses: (Array.isArray(s.c) ? s.c : []).map(function (r) {
          return Array.isArray(r)
            ? { name: r[0], grade: r[1], credits: r[2] }
            : { name: r.name, grade: r.grade, credits: r.credits };
        })
      };
    });
  }

  (function () {
    var s = loadState();
    semesters = s.semesters;
    targetGpa = s.target;
    scaleId = s.scaleId;
  })();

  /* ── Persistence (debounced; flushed on page hide) ──────────────────── */
  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    store.set(KEY_SEM, semesters);
    try {
      localStorage.setItem(KEY_TGT, targetGpa);
      localStorage.setItem(KEY_SCALE, scaleId);
    } catch (e) {}
  }

  function saveSoon() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DELAY);
  }

  if (typeof window.addEventListener === "function") {
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushSave();
    });
  }

  /* ── Model helpers ───────────────────────────────────────────────────── */
  function makeSem(name, courses) {
    return { id: CORE.uid(), name: name, courses: courses || [] };
  }

  function totalCourseCount(sems) {
    var n = 0;
    sems.forEach(function (s) { n += (s.courses || []).length; });
    return n;
  }

  function semGpa(s) { return CORE.calcGpa(getScale(), s.courses).gpa; }
  function cgpaAll() { return CORE.calcCgpa(getScale(), semesters).gpa; }
  function totalCredits() {
    return semesters.reduce(function (sum, s) {
      return sum + s.courses.reduce(function (a, c) {
        return a + CORE.clamp(CORE.num(c.credits, 0), 0, 50);
      }, 0);
    }, 0);
  }

  /* ── Semester tabs (tablist with roving tabindex + arrow keys) ───────── */
  function renderTabs() {
    var wrap = $("#semTabs");
    if (!wrap) return;
    wrap.innerHTML = semesters.map(function (s, i) {
      var g = semGpa(s);
      return '<button type="button" class="sim-tab' + (i === activeSem ? " on" : "") +
        '" data-sem="' + i + '" role="tab" aria-selected="' + (i === activeSem) +
        '" tabindex="' + (i === activeSem ? 0 : -1) + '">' +
        '<span class="sim-tab-name">' + esc(s.name) + "</span>" +
        (g !== null ? '<span class="sim-tab-gpa">' + fmtGpa(g) + "</span>" : "") +
        "</button>";
    }).join("") +
    (semesters.length < MAX_SEM
      ? '<button type="button" class="sim-tab sim-tab-add" id="addSemBtn" aria-label="Add new semester"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>'
      : "");
  }

  function tabButtons() { return $$(".sim-tab[data-sem]", $("#semTabs")); }

  /* ── Course rows ─────────────────────────────────────────────────────── */
  function renderRows() {
    var sem = semesters[activeSem];
    var container = $("#simRows");
    if (!sem || !container) return;
    var scale = getScale();

    /* ARIA table pattern requires role=table > role=rowgroup > role=row > role=cell */
    var rowsHtml = sem.courses.map(function (r) {
      var opts = scale.type === "letter"
        ? scale.letters.map(function (l) {
            return '<option value="' + esc(l.g) + '"' + (r.grade === l.g ? " selected" : "") + ">" +
              esc(l.g) + " (" + l.p.toFixed(1) + ")</option>";
          }).join("")
        : "";
      var gradeCtrl = scale.type === "letter"
        ? '<select class="select c-grade" data-f="grade" aria-label="Grade">' + opts + "</select>"
        : '<input class="input tnum c-grade" data-f="grade" type="number" min="0" max="' + scale.max +
          '" step="' + scale.step + '" value="' + esc(r.grade) + '" aria-label="Grade points">';
      var cr = clamp(CORE.num(r.credits, 0), 0, 50);
      return '<div class="crow sim-crow" data-id="' + esc(r.id) + '" role="row">' +
        '<div class="c-name" role="cell"><input class="input" data-f="name" value="' + esc(r.name) +
          '" placeholder="Course name" aria-label="Course name" maxlength="120"></div>' +
        '<div class="c-grade-wrap" role="cell">' + gradeCtrl + "</div>" +
        '<div class="c-credit" role="cell"><input class="input tnum" data-f="credits" type="number" min="0" max="50" step="0.5" value="' +
          esc(cr) + '" aria-label="Credits"></div>' +
        '<div class="c-need" role="cell" aria-live="off"></div>' +
        '<div class="c-del" role="cell"><button type="button" class="row-del" data-del="' + esc(r.id) +
          '" title="Remove course" aria-label="Remove course"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
        "</div>";
    }).join("");
    container.innerHTML = '<div role="rowgroup">' + rowsHtml + "</div>";

    updateNeededTags();
  }

  /* Update only the "needed grade" tags — no DOM rebuild, focus-safe. */
  function updateNeededTags() {
    var cgpa = cgpaAll();
    $$(".sim-crow").forEach(function (row) {
      var cell = row.querySelector(".c-need");
      if (!cell) return;
      var id = row.getAttribute("data-id");
      var points = CORE.neededPoints(getScale(), semesters, id, targetGpa);
      var tag = points !== null && cgpa !== null
        ? CORE.formatNeeded(getScale(), points, getScale().max)
        : null;
      cell.innerHTML = tag ? '<span class="sim-need ' + tag.cls + '">' + esc(tag.label) + "</span>" : "";
    });
  }

  /* ── Result panel + sparkline ────────────────────────────────────────── */
  function buildSparkline() {
    var scale = getScale();
    var gpas = [];
    semesters.forEach(function (s) {
      var acc = CORE.calcGpa(scale, s.courses);
      if (acc.gpa !== null) gpas.push(acc.gpa);
    });
    if (!gpas.length) return "";

    var W = 260, H = 80;
    var minG = Math.max(0, Math.min.apply(null, gpas) - scale.max * 0.075);
    var maxG = Math.min(scale.max, Math.max.apply(null, gpas) + scale.max * 0.075);
    var range = (maxG - minG) || (scale.max * 0.1);

    function px(i) { return gpas.length === 1 ? W / 2 : (i / (gpas.length - 1)) * W; }
    function py(g) { return H - ((g - minG) / range) * (H - 12) - 4; }

    var pts = gpas.map(function (g, i) { return px(i) + "," + py(g); }).join(" ");
    var last = gpas[gpas.length - 1];
    var lx = px(gpas.length - 1), ly = py(last);
    var area = "M" + px(0) + "," + H + " L" + pts.replace(/ /g, " L") + " L" + px(gpas.length - 1) + "," + H + " Z";
    var tgtY = py(clamp(targetGpa, minG, maxG));

    return '<svg viewBox="0 0 ' + W + " " + H + '" fill="none" aria-hidden="true" class="sim-sparkline">' +
      "<defs><linearGradient id=\"simGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
      '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      '<line x1="0" y1="' + tgtY + '" x2="' + W + '" y2="' + tgtY +
      '" stroke="var(--gold)" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7"/>' +
      '<path d="' + area + '" fill="url(#simGrad)"/>' +
      '<polyline points="' + pts + '" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      gpas.map(function (g, i) {
        return '<circle cx="' + px(i) + '" cy="' + py(g) + '" r="3" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>';
      }).join("") +
      '<text x="' + (lx + 6) + '" y="' + (ly + 4) + '" font-size="10" fill="var(--accent)" font-weight="600" font-family="inherit">' +
      fmtGpa(last) + "</text></svg>";
  }

  function compute() {
    var scale = getScale();
    var sg = semesters[activeSem] ? CORE.calcGpa(scale, semesters[activeSem].courses) : { gpa: null };
    var cg = CORE.calcCgpa(scale, semesters);
    var cgpa = cg.gpa, semG = sg.gpa;

    var cgpaOut = $("#simCgpa"), semOut = $("#simSemGpa"),
        statusOut = $("#simStatus"), creditsOut = $("#simTotalCredits"),
        sparkWrap = $("#simSparkWrap"), deltaEl = $("#simTargetDelta");

    if (cgpaOut) cgpaOut.textContent = fmtGpa(cgpa);
    if (semOut) semOut.textContent = fmtGpa(semG);
    if (statusOut) statusOut.textContent = cgpa !== null ? CORE.classify(scale, cgpa) : "Add courses to begin";
    if (creditsOut) creditsOut.textContent = cg.credits;

    if (deltaEl) {
      if (cgpa !== null) {
        /* Use CORE.round (1e-9 epsilon) for correct float rounding at GPA precision */
        var delta = CORE.round(targetGpa - cgpa, 2);
        deltaEl.style.display = "";
        if (delta <= 0) {
          deltaEl.className = "sim-delta sim-delta-ok";
          deltaEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Target reached!';
        } else {
          deltaEl.className = "sim-delta sim-delta-warn";
          deltaEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg> ' +
            (scale.id === "pct" ? delta.toFixed(1) + "%" : delta.toFixed(2)) + " to go";
        }
      } else {
        deltaEl.style.display = "none";
      }
    }

    if (sparkWrap) sparkWrap.innerHTML = buildSparkline();

    /* tab GPA labels */
    tabButtons().forEach(function (btn, i) {
      var tag = btn.querySelector(".sim-tab-gpa");
      if (tag && semesters[i]) {
        var g = semGpa(semesters[i]);
        tag.textContent = g !== null ? fmtGpa(g) : "";
      }
    });
  }

  /* ── Full render ─────────────────────────────────────────────────────── */
  var committedSemName = ""; /* last committed name — Escape restores it */

  function syncSemName() {
    var nameEl = $("#activeSemName");
    if (nameEl && semesters[activeSem]) {
      committedSemName = semesters[activeSem].name;
      nameEl.textContent = semesters[activeSem].name;
    }
  }

  function renderScaleUI() {
    var scale = getScale();
    var sel = $("#simScale");
    if (sel) sel.value = scaleId;
    var tgt = $("#simTarget"), slider = $("#simTargetSlider"),
        maxLbl = $("#simTargetScale");
    var maxStr = scale.id === "pct" ? "100%" : scale.max.toFixed(1);
    if (maxLbl) maxLbl.textContent = maxStr;
    if (tgt) {
      tgt.min = 0; tgt.max = scale.max; tgt.step = scale.step;
      tgt.setAttribute("aria-label", "Target GPA on the " + scale.label);
    }
    if (slider) { slider.min = 0; slider.max = scale.max; slider.step = scale.step; }
    syncTargetInputs();
  }

  function syncTargetInputs() {
    var scale = getScale();
    var tgt = $("#simTarget"), slider = $("#simTargetSlider");
    var v = clamp(targetGpa, 0, scale.max);
    if (tgt) tgt.value = scale.id === "pct" ? v.toFixed(1) : v.toFixed(2);
    if (slider) slider.value = v;
  }

  function renderScaleNote() {
    var note = $("#simScaleNote");
    if (!note) return;
    var scale = getScale();
    var html = "<b>" + esc(scale.label) + "</b>";
    if (scale.type === "letter") {
      var cols = Math.ceil(scale.letters.length / 2);
      var left = scale.letters.slice(0, cols), right = scale.letters.slice(cols);
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-top:var(--s3);font-size:var(--step-xs)">' +
        left.map(function (l) {
          return '<span>' + esc(l.g) + " = " + l.p.toFixed(1) + "</span>";
        }).join("") + right.map(function (l) {
          return '<span>' + esc(l.g) + " = " + l.p.toFixed(1) + "</span>";
        }).join("") + "</div>";
    } else {
      html += '<p style="margin-top:var(--s3);font-size:var(--step-xs);color:var(--ink-3);line-height:1.5">' +
        "Enter your grade points (0–" + scale.max + "). GPA is the credit-weighted average of your marks.</p>";
    }
    note.innerHTML = html;
  }

  function updateUndoBtn() {
    var btn = $("#simUndoBtn");
    if (!btn) return;
    btn.disabled = !undoStack.length;
    btn.setAttribute("aria-disabled", String(!undoStack.length));
  }

  function render() {
    renderTabs();
    renderScaleUI();
    renderScaleNote();
    renderRows();
    syncSemName();
    compute();
    updateUndoBtn();
    var delSem = $("#delSemBtn");
    if (delSem) delSem.style.display = semesters.length > 1 ? "" : "none";
  }

  /* ── Undo (deleted courses / cleared semesters / deleted semesters) ──── */
  function pushUndo(entry) {
    undoStack.push(entry);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    updateUndoBtn();
  }

  function undoLast() {
    var entry = undoStack.pop();
    if (!entry) return;
    if (entry.type === "course") {
      var sem = semesters[entry.semIdx];
      if (sem) {
        sem.courses.splice(Math.min(entry.index, sem.courses.length), 0, entry.course);
        activeSem = entry.semIdx;
      }
    } else if (entry.type === "clear") {
      var sem2 = semesters[entry.semIdx];
      if (sem2) sem2.courses = entry.courses.slice();
      activeSem = entry.semIdx;
    } else if (entry.type === "sem") {
      semesters.splice(Math.min(entry.index, semesters.length), 0, entry.sem);
      activeSem = Math.min(entry.index, semesters.length - 1);
    }
    flushSave();
    render();
    /* Return focus to the active semester tab so keyboard users stay oriented */
    var undoTab = $(".sim-tab[data-sem='" + activeSem + "']", $("#semTabs"));
    if (undoTab) undoTab.focus();
    SC.toast("Undone — " + entry.label, "success");
  }

  /* ── Deletions with undo support ─────────────────────────────────────── */
  function deleteCourse(id) {
    var sem = semesters[activeSem];
    if (!sem) return;
    var idx = -1;
    sem.courses.forEach(function (c, i) { if (c.id === id) idx = i; });
    if (idx === -1) return;
    var removed = sem.courses.splice(idx, 1)[0];
    pushUndo({ type: "course", semIdx: activeSem, index: idx, course: removed, label: "course removed" });
    flushSave();
    render();
    /* move focus to the next row's name input, else the add button */
    var rows = $$(".sim-crow");
    var next = rows[Math.min(idx, rows.length - 1)];
    var target = next ? next.querySelector("input[data-f='name']") : $("#addCourseBtn");
    if (target) target.focus();
  }

  function clearSemester() {
    var sem = semesters[activeSem];
    if (!sem || !sem.courses.length) return;
    if (!confirm("Clear all courses from " + sem.name + "?")) return;
    pushUndo({ type: "clear", semIdx: activeSem, courses: sem.courses.slice(), label: "semester cleared" });
    sem.courses = [];
    flushSave();
    render();
    SC.toast("Semester cleared", "info");
  }

  function deleteSemester() {
    if (semesters.length <= 1) return;
    if (!confirm("Delete \u201C" + semesters[activeSem].name + "\u201D and all its courses?")) return;
    var idx = activeSem;
    var removed = semesters.splice(idx, 1)[0];
    pushUndo({ type: "sem", index: idx, sem: removed, label: "semester deleted" });
    activeSem = Math.max(0, activeSem - 1);
    flushSave();
    render();
    /* Restore focus to the now-active tab so keyboard users aren't stranded */
    var newActiveTab = $(".sim-tab[data-sem='" + activeSem + "']", $("#semTabs"));
    if (newActiveTab) newActiveTab.focus();
    SC.toast("Semester deleted", "info");
  }

  /* ── Target GPA handlers ─────────────────────────────────────────────── */
  function setTarget(v) {
    var scale = getScale();
    var next = clamp(CORE.num(v, 0), 0, scale.max);
    if (next === targetGpa) return false;
    targetGpa = next;
    saveSoon();
    return true;
  }

  /* ── Grading scale switch (converts existing grades) ─────────────────── */
  function changeScale(newId) {
    if (!CORE.scales[newId] || newId === scaleId) return;
    var from = getScale(), to = CORE.getScale(newId);
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) { c.grade = CORE.convertGrade(from, to, c.grade); });
    });
    scaleId = newId;
    targetGpa = clamp(targetGpa, 0, to.max);
    flushSave();
    render();
    SC.toast("Grading scale: " + to.label, "success");
  }

  /* ── Share / export ──────────────────────────────────────────────────── */
  function buildShareData() {
    var compact = semesters.map(function (s) {
      return { n: s.name, c: s.courses.map(function (c) { return [c.name, c.grade, c.credits]; }) };
    });
    return { sim: JSON.stringify(compact), tgt: targetGpa.toString(), scale: scaleId };
  }

  function copyResults() {
    var scale = getScale();
    var cg = CORE.calcCgpa(scale, semesters);
    var lines = [
      "Scholarics GPA Simulator — " + scale.label,
      "Cumulative GPA: " + fmtGpa(cg.gpa) + " / " + scale.max.toFixed(1),
      "Target GPA: " + targetGpa.toFixed(2),
      "Total credits: " + cg.credits
    ];
    semesters.forEach(function (s) {
      var g = CORE.calcGpa(scale, s.courses).gpa;
      lines.push(s.name + ": " + fmtGpa(g));
    });
    SC.copy(lines.join("\n"));
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? "" : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv() {
    var scale = getScale();
    var lines = [["Semester", "Course", "Grade", "Points", "Credits"].map(csvCell).join(",")];
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) {
        lines.push([s.name, c.name, c.grade,
          CORE.gradePoints(scale, c.grade).toFixed(2),
          CORE.clamp(CORE.num(c.credits, 0), 0, 50)].map(csvCell).join(","));
      });
    });
    var cg = CORE.calcCgpa(scale, semesters);
    lines.push("");
    lines.push(["Scale", scale.label].map(csvCell).join(","));
    lines.push(["Cumulative GPA", fmtGpa(cg.gpa)].map(csvCell).join(","));
    lines.push(["Target GPA", targetGpa.toFixed(2)].map(csvCell).join(","));
    lines.push(["Total credits", cg.credits].map(csvCell).join(","));

    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "gpa-simulator.csv";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    SC.toast("CSV downloaded", "success");
  }

  /* printReport() was removed: #simPdfBtn is now served by the single global
     calculator action router in js/calculators.js (delegated click routing
     → generateDynamicPDFReport). No per-button PDF listener remains here. */

  /* ── AI Study Coach (backend /api/ai/coach + local fallback) ─────────── */
  function apiRequest(path, payload, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 30000) : null;
    var headers = { "Content-Type": "application/json" };
    /* Forward the anonymous visitor id so the server-side quota system can
       attribute the request correctly. Without this header the server falls
       back to IP-only bucketing, which mis-counts users on shared networks. */
    try {
      var vid = window.SC && typeof SC.visitorId === "function"
        ? SC.visitorId()
        : (localStorage.getItem("sc_vid") || "");
      if (vid) headers["X-SC-Visitor"] = vid;
    } catch (e) {}
    return fetch(path, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload || {}),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      /* Mirror the quota headers back through SCAI so the rest of the page
         can display remaining-run counts consistently (sc:ai-quota event). */
      if (window.SCAI && typeof SCAI.request === "function") {
        try {
          var tool = parseInt(res.headers.get("X-AI-Quota-Tool"), 10);
          var toolR = parseInt(res.headers.get("X-AI-Quota-Tool-Remaining"), 10);
          var glob = parseInt(res.headers.get("X-AI-Quota-Global"), 10);
          var globR = parseInt(res.headers.get("X-AI-Quota-Global-Remaining"), 10);
          if (Number.isFinite(tool)) {
            document.dispatchEvent(new CustomEvent("sc:ai-quota", {
              detail: { tool: tool, toolRemaining: toolR, global: glob, globalRemaining: globR }
            }));
          }
        } catch (e) {}
      }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || ("Request failed (" + res.status + ")."));
        return data;
      });
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  /* Deterministic offline coach — used when the backend is unreachable. */
  function localCoach() {
    var scale = getScale();
    var cg = CORE.calcCgpa(scale, semesters);
    var graded = [];
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) {
        var cr = CORE.clamp(CORE.num(c.credits, 0), 0, 50);
        if (cr > 0) graded.push({ name: c.name || "Course", grade: c.grade, points: CORE.gradePoints(scale, c.grade), credits: cr });
      });
    });
    graded.sort(function (a, b) { return b.points - a.points; });
    var strengths = graded.slice(0, 3).map(function (c) { return c.name + " (" + c.grade + ")"; });
    var weaknesses = graded.slice(-3).reverse().map(function (c) { return c.name + " (" + c.grade + ")"; });
    var prio = graded.slice().sort(function (a, b) { return a.points - b.points; }).slice(0, 3);
    var pct = CORE.progressPct(cg.gpa, targetGpa, scale.max);
    var w1 = prio[0] ? prio[0].name : "your weakest subject";
    var w2 = prio[1] ? prio[1].name : prio[0] ? prio[0].name : "your core subjects";
    return {
      strengths: strengths.length ? strengths : ["Keep attending classes consistently"],
      weaknesses: weaknesses.length ? weaknesses : ["Set a clear grade goal for each course"],
      progress: { current: cg.gpa, target: targetGpa, gap: CORE.round(targetGpa - cg.gpa, 2), pct: pct },
      priorities: prio.map(function (c) {
        var ratio = c.points / scale.max;
        return {
          subject: c.name,
          reason: ratio < 0.5 ? "Lowest points — biggest recovery opportunity" : "Below your average — room to improve",
          urgency: ratio < 0.5 ? "high" : "medium"
        };
      }),
      weeklyPlan: [
        { day: "Monday", focus: w1 + " — foundation work", tasks: ["Review lecture notes from the last 2 weeks", "Attempt 5 practice problems"] },
        { day: "Tuesday", focus: w2 + " — active recall", tasks: ["Self-quiz with flashcards", "Explain one topic out loud"] },
        { day: "Wednesday", focus: w1 + " — problem practice", tasks: ["Solve a past exam question", "Mark errors and redo them"] },
        { day: "Thursday", focus: w2 + " — past questions", tasks: ["One timed question set", "Compare answers with notes"] },
        { day: "Friday", focus: "Mixed review", tasks: ["Pomodoro: 2 \u00D7 25 min per subject", "Summarise the week's material"] },
        { day: "Saturday", focus: "Full practice", tasks: ["Re-do your weakest assignment", "Fill any knowledge gaps found"] },
        { day: "Sunday", focus: "Rest & plan", tasks: ["Light revision only", "Plan next week's priorities"] }
      ],
      advice: "You're at " + fmtGpa(cg.gpa) + " with a target of " + targetGpa.toFixed(2) +
        " (" + pct + "% of the way). Start with " + w1 + " for 25 focused minutes today — small consistent wins compound fastest."
    };
  }

  function renderCoach(c) {
    var out = $("#aiCoachOut");
    if (!out) return;
    var html = "";
    if (c.strengths && c.strengths.length) {
      html += '<section class="sim-coach-sec"><h4>Strengths</h4><ul>' +
        c.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></section>";
    }
    if (c.weaknesses && c.weaknesses.length) {
      html += '<section class="sim-coach-sec"><h4>Watch out for</h4><ul>' +
        c.weaknesses.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></section>";
    }
    if (c.progress && c.progress.target > 0) {
      var pct = Math.max(0, Math.min(100, c.progress.pct || 0));
      var met = c.progress.gap <= 0;
      html += '<section class="sim-coach-sec"><h4>Target progress</h4>' +
        '<div class="sim-coach-bar" role="img" aria-label="' + pct + '% of the way to your target GPA">' +
        '<span style="width:' + pct + '%"></span></div>' +
        '<p>' + esc(fmtGpa(c.progress.current)) +
        " of " + c.progress.target.toFixed(2) + (met ? " — target reached, keep it up!" : " — " + esc(c.progress.gap.toFixed(2)) + " to go") + "</p></section>";
    }
    if (c.priorities && c.priorities.length) {
      html += '<section class="sim-coach-sec"><h4>Subject priorities</h4><ul class="sim-coach-prio">' +
        c.priorities.map(function (p) {
          return '<li><b>' + esc(p.subject) + "</b> <span class=\"sim-prio sim-prio-" + esc(p.urgency) + "\">" +
            esc(p.urgency) + "</span><span>" + esc(p.reason || "") + "</span></li>";
        }).join("") + "</ul></section>";
    }
    if (c.weeklyPlan && c.weeklyPlan.length) {
      html += '<section class="sim-coach-sec"><h4>Weekly study plan</h4><ol class="sim-coach-week">' +
        c.weeklyPlan.map(function (d) {
          return "<li><b>" + esc(d.day) + "</b> — " + esc(d.focus) +
            (d.tasks && d.tasks.length ? "<ul>" + d.tasks.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
            "</li>";
        }).join("") + "</ol></section>";
    }
    if (c.advice) html += '<p class="sim-coach-advice">' + esc(c.advice) + "</p>";
    out.innerHTML = html || '<p>No coaching data available yet. Add courses and try again.</p>';
  }

  function requestAiCoach() {
    var btn = $("#aiCoachBtn"), out = $("#aiCoachOut"), loader = $("#aiCoachLoader");
    if (!btn || !out || btn.disabled) return;
    var scale = getScale();
    var payload = {
      scaleId: scaleId,
      target: targetGpa,
      semesters: semesters.map(function (s) {
        return {
          name: s.name,
          courses: s.courses.map(function (c) { return { name: c.name, grade: c.grade, credits: c.credits }; })
        };
      })
    };
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    if (loader) loader.style.display = "block";
    out.textContent = "";

    var fallback = function (err) {
      if (err && err.name === "AbortError") {
        out.innerHTML = '<p style="color:var(--ink-3)">The AI coach is taking too long — showing an offline plan instead.</p>';
      }
      renderCoach(localCoach());
    };

    apiRequest("/api/ai/coach", payload, 30000)
      .then(function (data) {
        if (data && data.coach) renderCoach(data.coach);
        else renderCoach(localCoach());
      })
      .catch(fallback)
      .finally(function () {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        if (loader) loader.style.display = "none";
      });
  }

  /* ── Static bindings (bound exactly once) ────────────────────────────── */
  function bindSemTabs() {
    var wrap = $("#semTabs");
    if (!wrap) return;
    /* tab clicks */
    wrap.addEventListener("click", function (e) {
      var addBtn = e.target.closest("#addSemBtn");
      if (addBtn) { addSemester(); return; }
      var btn = e.target.closest(".sim-tab[data-sem]");
      if (btn) activateTab(parseInt(btn.getAttribute("data-sem"), 10));
    });
    /* keyboard: arrows + Home/End (roving tabindex) */
    wrap.addEventListener("keydown", function (e) {
      var btn = e.target.closest ? e.target.closest(".sim-tab[data-sem]") : null;
      if (!btn) return;
      var btns = tabButtons();
      var idx = btns.indexOf(btn);
      if (idx === -1) return;
      var next = -1;
      if (e.key === "ArrowRight") next = (idx + 1) % btns.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + btns.length) % btns.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = btns.length - 1;
      else return;
      e.preventDefault();
      activateTab(next);
      /* activateTab re-renders the tablist — focus the fresh node */
      var fresh = $(".sim-tab[data-sem='" + next + "']", wrap);
      if (fresh) fresh.focus();
    });
  }

  function activateTab(i) {
    if (i < 0 || i >= semesters.length || i === activeSem) return;
    activeSem = i;
    render();
  }

  function addSemester() {
    if (semesters.length >= MAX_SEM) {
      SC.toast("Maximum " + MAX_SEM + " semesters", "info");
      return;
    }
    var n = semesters.length + 1;
    semesters.push(makeSem("Semester " + n, []));
    activeSem = semesters.length - 1;
    flushSave();
    render();
    SC.toast("Semester " + n + " added", "success");
    var nameEl = $("#activeSemName");
    if (nameEl) { nameEl.focus(); placeCaretAtEnd(nameEl); }
  }

  function placeCaretAtEnd(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function bindRows() {
    var container = $("#simRows");
    if (!container) return;

    /* one delegated handler covers input and change (selects in some
       browsers only fire "change") — no per-row listeners, no duplicates */
    function onFieldEdit(e, isChange) {
      var row = e.target.closest(".sim-crow");
      var field = e.target.getAttribute && e.target.getAttribute("data-f");
      if (!row || !field) return;
      var id = row.getAttribute("data-id");
      var sem = semesters[activeSem];
      if (!sem) return;
      var course = null;
      sem.courses.forEach(function (c) { if (c.id === id) course = c; });
      if (!course) return;
      var next = field === "credits" ? CORE.clamp(CORE.num(e.target.value, 0), 0, 50) : e.target.value;
      if (String(course[field]) === String(next)) return;
      course[field] = next;
      if (isChange && field === "credits") e.target.value = next; /* normalise on commit */
      saveSoon();
      compute();
      updateNeededTags();
    }

    container.addEventListener("input", function (e) { onFieldEdit(e, false); });
    container.addEventListener("change", function (e) { onFieldEdit(e, true); });
    container.addEventListener("click", function (e) {
      var del = e.target.closest("[data-del]");
      if (del) deleteCourse(del.getAttribute("data-del"));
    });
  }

  /* Update only one tab's label — never rebuild the tablist here, or a
     freshly focused/clicked tab would be destroyed (focus loss). */
  function updateTabLabel(i) {
    var btn = $(".sim-tab[data-sem='" + i + "']", $("#semTabs"));
    var label = btn ? btn.querySelector(".sim-tab-name") : null;
    if (label && semesters[i]) label.textContent = semesters[i].name;
  }

  function bindSemName() {
    var nameEl = $("#activeSemName");
    if (!nameEl) return;
    nameEl.addEventListener("input", function () {
      if (!semesters[activeSem]) return;
      semesters[activeSem].name = nameEl.textContent;
      saveSoon();
      updateTabLabel(activeSem);
    });
    nameEl.addEventListener("blur", function () {
      if (!semesters[activeSem]) return;
      committedSemName = nameEl.textContent.trim() || ("Semester " + (activeSem + 1));
      semesters[activeSem].name = committedSemName;
      nameEl.textContent = committedSemName;
      flushSave();
      updateTabLabel(activeSem);
    });
    nameEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); nameEl.blur(); }
      else if (e.key === "Escape") {
        /* revert to the last committed name */
        semesters[activeSem].name = committedSemName;
        nameEl.textContent = committedSemName;
        nameEl.blur();
      }
    });
  }

  function populateScaleSelect() {
    var sel = $("#simScale");
    if (!sel) return;
    CORE.scaleList().forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      sel.appendChild(opt);
    });
  }

  function init() {
    populateScaleSelect();
    render();
    bindSemTabs();
    bindRows();
    bindSemName();

    var tgtInput = $("#simTarget"), tgtSlider = $("#simTargetSlider");
    if (tgtInput) tgtInput.addEventListener("input", function () {
      if (setTarget(tgtInput.value)) { compute(); updateNeededTags(); syncTargetInputs(); }
    });
    if (tgtSlider) tgtSlider.addEventListener("input", function () {
      if (setTarget(tgtSlider.value)) { compute(); updateNeededTags(); syncTargetInputs(); }
    });

    var scaleSel = $("#simScale");
    if (scaleSel) scaleSel.addEventListener("change", function () { changeScale(scaleSel.value); });

    var addBtn = $("#addCourseBtn");
    if (addBtn) addBtn.addEventListener("click", function () {
      var sem = semesters[activeSem];
      if (!sem) return;
      if (sem.courses.length >= MAX_ROWS) {
        SC.toast("Maximum " + MAX_ROWS + " courses per semester", "info");
        return;
      }
      sem.courses.push({ id: CORE.uid(), name: "", grade: getScale().type === "letter" ? "A" : "0", credits: 3 });
      flushSave();
      render();
      var rows = $$(".sim-crow");
      var last = rows[rows.length - 1];
      var inp = last ? last.querySelector("input[data-f='name']") : null;
      if (inp) inp.focus();
    });

    var clearBtn = $("#clearSemBtn");
    if (clearBtn) clearBtn.addEventListener("click", clearSemester);

    var delSemBtn = $("#delSemBtn");
    if (delSemBtn) delSemBtn.addEventListener("click", deleteSemester);

    var undoBtn = $("#simUndoBtn");
    if (undoBtn) undoBtn.addEventListener("click", undoLast);

    window.SCGetSimulatorState = buildShareData;

    /* #simShareBtn (copy link) and #simPdfBtn (PDF) are intentionally NOT
       bound here — they are routed by the single global delegated
       calculator action router in js/calculators.js (loaded on this page),
       which resolves them by ID. Exactly one click mechanism may own them. */

    var copyBtn = $("#simCopyBtn");
    if (copyBtn) copyBtn.addEventListener("click", copyResults);

    var csvBtn = $("#simCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", exportCsv);

    var aiBtn = $("#aiCoachBtn");
    if (aiBtn) aiBtn.addEventListener("click", requestAiCoach);

    if (sharedFromLink && window.SCShare) {
      flushSave();
      var cgpaVal = cgpaAll();
      SCShare.showBanner({
        message: "You're viewing a shared GPA result" +
          (cgpaVal !== null ? " of <b>" + fmtGpa(cgpaVal) + " CGPA</b>" : "") +
          ". Edit any course to make it your own.",
        host: document.querySelector(".tool-layout")
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
