import { withApi, json } from '../../_lib/http.js';
import { generateJSON } from '../../_lib/gemini.js';
import { bad } from '../../_lib/errors.js';
import { clean, str, oneOf } from '../../_lib/validate.js';
import { GPA_COACH_SYSTEM, buildGpaCoachUserPrompt } from '../../_lib/prompts.js';

// POST /api/ai/coach — GPA Simulator AI Study Coach.
// The client sends its simulator state; the server recomputes all analytics
// (so grades are never trusted blindly), builds the prompt, and returns a
// structured coaching report: strengths, weaknesses, target-GPA progress,
// subject priorities and a weekly study plan.
export const onRequestPost = withApi(async ({ body, env }) => {
  const scaleId = oneOf(clean(body.scaleId), ['us40', 'us43', 'us50', 'aus7', 'in10', 'pct'], 'us40');
  const scale = SCALES[scaleId];

  const semesters = sanitizeSemesters(body.semesters);
  if (!semesters) throw bad('Provide at least one semester with courses.');
  const target = clampNum(body.target, 0, scale.max, null);

  const analytics = computeAnalytics(scale, semesters, target);
  if (!analytics.cgpa) throw bad('Add at least one course with credits to get AI coaching.');

  const userPrompt = buildGpaCoachUserPrompt({
    scaleLabel: scale.label,
    target: analytics.target,
    cgpa: analytics.cgpa,
    semGpas: analytics.semGpas,
    strengths: analytics.strengths,
    weaknesses: analytics.weaknesses,
    progressPct: analytics.progressPct,
    priorities: analytics.priorities,
    totalCredits: analytics.totalCredits
  });

  const report = await generateJSON(env, {
    systemInstruction: GPA_COACH_SYSTEM,
    userContent: userPrompt,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
  });
  return json({ coach: normalizeReport(report) });
});

/* ── Server-side analytics (mirrors gpa-simulator-core.js) ────────────── */

var SCALES = {
  us40:  { max: 4.0,  type: 'letter', label: '4.0 scale',  letters: [['A+',4],['A',4],['A-',3.7],['B+',3.3],['B',3],['B-',2.7],['C+',2.3],['C',2],['C-',1.7],['D+',1.3],['D',1],['D-',0.7],['F',0]] },
  us43:  { max: 4.3,  type: 'letter', label: '4.3 scale',  letters: [['A+',4.3],['A',4],['A-',3.7],['B+',3.3],['B',3],['B-',2.7],['C+',2.3],['C',2],['C-',1.7],['D+',1.3],['D',1],['D-',0.7],['F',0]] },
  us50:  { max: 5.0,  type: 'letter', label: '5.0 scale',  letters: [['A+',5],['A',5],['A-',4.5],['B+',4],['B',3.5],['B-',3],['C+',2.5],['C',2],['C-',1.5],['D+',1],['D',0.5],['D-',0],['F',0]] },
  aus7:  { max: 7.0,  type: 'letter', label: '7.0 scale',  letters: [['HD',7],['D',6],['C',5],['P',4],['N',0]] },
  in10:  { max: 10,   type: 'number', label: '10.0 scale' },
  pct:   { max: 100,  type: 'number', label: 'percentage scale' }
};

function sanitizeSemesters(raw) {
  if (!Array.isArray(raw)) return null;
  var out = [];
  for (var si = 0; si < raw.length && out.length < 12; si++) {
    var s = raw[si];
    if (!s || typeof s !== 'object') continue;
    var courses = [];
    var rawCourses = Array.isArray(s.courses) ? s.courses : [];
    for (var ci = 0; ci < rawCourses.length && courses.length < 20; ci++) {
      var c = rawCourses[ci];
      if (!c || typeof c !== 'object') continue;
      courses.push({
        name: clean(c.name).slice(0, 120),
        grade: clean(c.grade).slice(0, 8),
        credits: clampNum(c.credits, 0, 50, 0)
      });
    }
    if (courses.length) out.push({ name: clean(s.name).slice(0, 60) || ('Semester ' + (out.length + 1)), courses: courses });
  }
  return out.length ? out : null;
}

function clampNum(v, min, max, def) {
  var n = parseFloat(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function pointsFor(scale, grade) {
  if (scale.type === 'letter') {
    for (var i = 0; i < scale.letters.length; i++) {
      if (scale.letters[i][0] === grade) return scale.letters[i][1];
    }
    return 0;
  }
  return clampNum(grade, 0, scale.max, 0);
}

function computeAnalytics(scale, semesters, target) {
  var totalCr = 0, totalQp = 0, semGpas = [], allCourses = [];
  semesters.forEach(function (s, idx) {
    var cr = 0, qp = 0;
    s.courses.forEach(function (c) {
      var ccr = clampNum(c.credits, 0, 50, 0);
      var pts = pointsFor(scale, c.grade);
      if (ccr > 0) {
        cr += ccr; qp += pts * ccr;
        totalCr += ccr; totalQp += pts * ccr;
      }
      allCourses.push({ name: c.name || 'Untitled course', grade: c.grade, points: pts, credits: ccr, sem: idx + 1 });
    });
    semGpas.push({ sem: idx + 1, name: s.name, gpa: cr > 0 ? round3(qp / cr) : null });
  });

  var cgpa = totalCr > 0 ? round3(totalQp / totalCr) : null;
  var effective = target === null ? cgpa : target;

  /* strengths: courses with points >= 0.75 of max, ordered by quality points */
  var graded = allCourses.filter(function (c) { return c.credits > 0; });
  var sorted = graded.slice().sort(function (a, b) { return b.points - a.points; });
  var strengths = sorted.slice(0, 3).map(function (c) {
    return c.name + ' (' + c.grade + (scale.type === 'number' ? ' pts' : '') + ')';
  });
  var weaknesses = sorted.slice(-3).reverse().map(function (c) {
    return c.name + ' (' + c.grade + (scale.type === 'number' ? ' pts' : '') + ')';
  });

  /* priorities: lowest grade-points first, weighted by credits */
  var priorities = graded.slice().sort(function (a, b) {
    return (a.points / scale.max) - (b.points / scale.max) || b.credits - a.credits;
  }).slice(0, 4).map(function (c, i) {
    var ratio = c.points / scale.max;
    return {
      subject: c.name || 'Course ' + (i + 1),
      reason: ratio < 0.5 ? 'Failing range — urgent recovery needed'
            : ratio < 0.75 ? 'Below the strong threshold — highest potential gain'
            : 'Solid but with room to push higher',
      urgency: ratio < 0.5 ? 'high' : ratio < 0.75 ? 'medium' : 'low'
    };
  });

  return {
    cgpa: cgpa,
    target: target,
    semGpas: semGpas,
    strengths: strengths,
    weaknesses: weaknesses,
    progressPct: target === null ? null
      : Math.round(Math.max(0, Math.min(100, (cgpa / Math.max(target, 0.001)) * 100))),
    priorities: priorities,
    totalCredits: Math.round(totalCr)
  };
}

function round3(n) { return Math.round((n + Number.EPSILON) * 1000) / 1000; }

/* ── Report normalisation (never trust the model's shape blindly) ─────── */
function strList(v, max) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max || 5).map(function (x) {
    return clean(typeof x === 'string' ? x : (x && x.text) || '').slice(0, 200);
  }).filter(Boolean);
}

function normalizeReport(r) {
  r = r && typeof r === 'object' ? r : {};
  var priorities = Array.isArray(r.priorities) ? r.priorities.slice(0, 5).map(function (p, i) {
    return {
      subject: clean((p && (p.subject || p.name)) || ('Priority ' + (i + 1))).slice(0, 120),
      reason: clean(p && p.reason).slice(0, 200),
      urgency: oneOf(p && p.urgency, ['high', 'medium', 'low'], 'medium')
    };
  }) : [];
  var weeklyPlan = Array.isArray(r.weeklyPlan) ? r.weeklyPlan.slice(0, 7).map(function (d) {
    return {
      day: clean(d && d.day).slice(0, 20) || 'Study block',
      focus: clean(d && d.focus).slice(0, 120),
      tasks: strList(d && d.tasks, 4)
    };
  }) : [];
  return {
    strengths: strList(r.strengths, 4),
    weaknesses: strList(r.weaknesses, 4),
    progress: (r.progress && typeof r.progress === 'object') ? {
      current: clampNum(r.progress.current, 0, 1000, 0),
      target: clampNum(r.progress.target, 0, 1000, 0),
      gap: clampNum(r.progress.gap, -1000, 1000, 0),
      pct: Math.round(clampNum(r.progress.pct, 0, 100, 0))
    } : null,
    priorities: priorities,
    weeklyPlan: weeklyPlan,
    advice: clean(r.advice).slice(0, 400)
  };
}
