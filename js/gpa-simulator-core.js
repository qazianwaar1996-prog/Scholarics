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
