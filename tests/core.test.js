/* Scholarics — GPA Simulator Core unit tests (pure Node, no DOM) */
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

/* Load the core module exactly as a browser would (window global). */
global.window = global;
const code = fs.readFileSync(path.join(__dirname, "..", "js", "gpa-simulator-core.js"), "utf8");
eval(code);
const C = global.window.SCSimCore;
delete global.window;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  \u2713 " + name); }
  catch (e) { failed++; console.error("  \u2717 " + name + "\n    " + e.message); }
}
function close(a, b, eps) {
  assert.ok(Math.abs(a - b) < (eps === undefined ? 1e-9 : eps), a + " !~ " + b);
}

/* ── Sample data ──────────────────────────────────────────────────────── */
const sem = (name, courses) => ({ id: "s_" + name, name, courses });
const crs = (id, name, grade, credits) => ({ id, name, grade, credits });

const SAMPLE = [
  sem("Semester 1", [
    crs("c1", "English 101", "A", 3),
    crs("c2", "Calculus I", "B+", 4),
    crs("c3", "History 101", "A-", 3)
  ]),
  sem("Semester 2", [
    crs("c4", "Physics", "B", 4),
    crs("c5", "CS 101", "A", 3)
  ])
];
/* Semester 1: (4*3 + 3.3*4 + 3.7*3)/(10) = (12+13.2+11.1)/10 = 36.3/10 = 3.63 */
/* Semester 2: (3*4 + 4*3)/7 = 24/7 ≈ 3.428571 → 3.429 */
/* CGPA: (36.3 + 24)/17 = 60.3/17 ≈ 3.547058 → 3.547 */

test("4.0: semester GPA matches manual calculation", () => {
  const r = C.calcGpa(C.getScale("us40"), SAMPLE[0].courses);
  assert.strictEqual(r.gpa, 3.63);
  assert.strictEqual(r.credits, 10);
  assert.strictEqual(r.qualityPoints, 36.3);
});

test("4.0: CGPA across semesters matches manual calculation", () => {
  const r = C.calcCgpa(C.getScale("us40"), SAMPLE);
  assert.strictEqual(r.gpa, C.round(60.3 / 17, 3)); /* 3.547 */
  close(r.qualityPoints, 60.3, 1e-9);
  assert.strictEqual(r.credits, 17);
});

test("empty courses => gpa null, zero credits", () => {
  const r = C.calcGpa(C.getScale("us40"), []);
  assert.strictEqual(r.gpa, null);
  assert.strictEqual(r.credits, 0);
});

test("4.3 scale: A+ counts as 4.3", () => {
  const r = C.calcGpa(C.getScale("us43"), [crs("x", "X", "A+", 1)]);
  assert.strictEqual(r.gpa, 4.3);
});

test("5.0 scale: A=5, B+=4, B-=3 (0.5 steps)", () => {
  const s = C.getScale("us50");
  assert.strictEqual(C.gradePoints(s, "A+"), 5);
  assert.strictEqual(C.gradePoints(s, "B+"), 4);
  assert.strictEqual(C.gradePoints(s, "D-"), 0);
  const r = C.calcGpa(s, [crs("x", "X", "A", 1), crs("y", "Y", "B-", 1)]);
  assert.strictEqual(r.gpa, 4.0);
});

test("7.0 scale (Australia): HD=7, D=6, C=5, P=4, N=0", () => {
  const s = C.getScale("aus7");
  assert.strictEqual(C.gradePoints(s, "HD"), 7);
  assert.strictEqual(C.gradePoints(s, "P"), 4);
  assert.strictEqual(C.gradePoints(s, "N"), 0);
  const r = C.calcGpa(s, [crs("x", "X", "HD", 2), crs("y", "Y", "C", 2)]);
  assert.strictEqual(r.gpa, 6.0);
});

test("10.0 scale: numeric grades, points = value", () => {
  const s = C.getScale("in10");
  assert.strictEqual(C.gradePoints(s, "8.5"), 8.5);
  assert.strictEqual(C.gradePoints(s, "12"), 10);          /* clamped to max */
  const r = C.calcGpa(s, [crs("x", "X", "9", 2), crs("y", "Y", "7", 2)]);
  assert.strictEqual(r.gpa, 8.0);
});

test("Percentage scale: credit-weighted percentage", () => {
  const s = C.getScale("pct");
  const r = C.calcGpa(s, [crs("x", "X", "90", 3), crs("y", "Y", "70", 1)]);
  assert.strictEqual(r.gpa, 85); /* (90*3+70*1)/4 = 85 */
});

test("invalid grade on any scale yields 0 points (never NaN)", () => {
  ["us40", "us43", "us50", "aus7", "in10", "pct"].forEach((id) => {
    const p = C.gradePoints(C.getScale(id), "NOT-A-GRADE");
    assert.ok(Number.isFinite(p) && p === 0, id + " -> " + p);
  });
});

/* ── Needed grade ─────────────────────────────────────────────────────── */
test("needed grade: exact math for a single-course change", () => {
  /* other courses: c2(4cr,B+=3.3), c3(3cr,A-=3.7) → cr=7, qp=13.2+11.1=24.3
     target 3.5, this course 3 cr → needed = (3.5*10 - 24.3)/3 = (35-24.3)/3 = 3.5666… */
  const n = C.neededPoints(C.getScale("us40"), SAMPLE.slice(0, 1), "c1", 3.5);
  close(n, C.round((35 - 24.3) / 3, 3), 1e-9); /* rounds to 3.567 */
});

test("needed grade: impossible when above scale max", () => {
  const n = C.neededPoints(C.getScale("us40"), SAMPLE.slice(0, 1), "c1", 4.0);
  const f = C.formatNeeded(C.getScale("us40"), n, 4);
  assert.strictEqual(f.label, "Impossible");
});

test("needed grade: already met when at/below zero", () => {
  /* needed <= 0 ⇔ target <= otherQp/(otherCr+thisCr) = 24.3/10 = 2.43 */
  const n = C.neededPoints(C.getScale("us40"), SAMPLE.slice(0, 1), "c1", 2.0);
  const f = C.formatNeeded(C.getScale("us40"), n, 4);
  assert.strictEqual(f.label, "Already met");
});

test("needed grade: nearest letter shown for letter scales", () => {
  const n = C.neededPoints(C.getScale("us40"), SAMPLE.slice(0, 1), "c1", 3.5);
  const f = C.formatNeeded(C.getScale("us40"), n, 4);
  close(n, 3.567, 1e-2);
  assert.strictEqual(f.cls, "sim-need-info");
  assert.ok(f.label.indexOf("Need ") === 0);
});

test("needed grade: numeric label on 10.0 scale", () => {
  const s = C.getScale("in10");
  const sem1 = [sem("S1", [crs("a", "A", "8", 3), crs("b", "B", "9", 1)])];
  const n = C.neededPoints(s, sem1, "a", 9);
  const f = C.formatNeeded(s, n, 10);
  close(n, (9 * 4 - 9) / 3, 1e-6); /* (36-9)/3 = 9 */
  assert.ok(f.label === "Need 9" || f.label === "Need 9.00", f.label);
});

/* ── Grade conversion ─────────────────────────────────────────────────── */
test("convertGrade: letter scales keep same letter when present", () => {
  assert.strictEqual(C.convertGrade("us40", "us43", "A-"), "A-");
});
test("convertGrade: 4.0 A (4.0) → 10.0 = 10", () => {
  assert.strictEqual(C.convertGrade("us40", "in10", "A"), 10);
});
test("convertGrade: 4.0 B (3.0) → 10.0 = 7.5", () => {
  assert.strictEqual(C.convertGrade("us40", "in10", "B"), 7.5);
});
test("convertGrade: 4.0 B (3.0) → percentage = 75", () => {
  assert.strictEqual(C.convertGrade("us40", "pct", "B"), 75);
});
test("convertGrade: 10.0 9.0 → 4.0 nearest letter (3.6 → A-, closest)", () => {
  assert.strictEqual(C.convertGrade("in10", "us40", "9"), "A-");
});
test("convertGrade: same scale passes through", () => {
  assert.strictEqual(C.convertGrade("us40", "us40", "A+"), "A+");
  assert.strictEqual(C.convertGrade("in10", "in10", "8.5"), "8.5");
});

/* ── Classification ───────────────────────────────────────────────────── */
test("classify: thresholds are scale-relative", () => {
  assert.strictEqual(C.classify(C.getScale("us40"), 3.7), "Excellent standing");
  assert.strictEqual(C.classify(C.getScale("us40"), 3.1), "Good standing");
  assert.strictEqual(C.classify(C.getScale("pct"), 95), "Excellent standing");
  assert.strictEqual(C.classify(C.getScale("pct"), 76), "Good standing");
  assert.strictEqual(C.classify(C.getScale("in10"), 5.5), "Satisfactory");
  assert.strictEqual(C.classify(C.getScale("in10"), 1), "Needs improvement");
  assert.strictEqual(C.classify(C.getScale("us40"), null), "");
});

/* ── Sanitisation / reliability ───────────────────────────────────────── */
test("sanitizeSemesters: returns null for garbage", () => {
  assert.strictEqual(C.sanitizeSemesters(null), null);
  assert.strictEqual(C.sanitizeSemesters("nope"), null);
  assert.strictEqual(C.sanitizeSemesters([]), null);
  assert.strictEqual(C.sanitizeSemesters([{ noCourses: true }]), null);
});

test("sanitizeSemesters: dedupes duplicate course IDs", () => {
  const raw = [sem("S1", [crs("dup", "A", "A", 3), crs("dup", "B", "B", 3)])];
  const out = C.sanitizeSemesters(raw);
  assert.strictEqual(out[0].courses[0].id !== out[0].courses[1].id, true);
});

test("sanitizeSemesters: regenerates missing IDs", () => {
  const raw = [{ name: "S1", courses: [{ name: "X", grade: "A", credits: 3 }] }];
  const out = C.sanitizeSemesters(raw);
  assert.ok(out[0].courses[0].id);
  assert.ok(out[0].id);
});

test("sanitizeSemesters: clamps credits and caps rows/semesters", () => {
  const raw = [];
  for (let i = 0; i < 15; i++) raw.push(sem("S" + i, []));
  raw[0].courses.push(crs("c", "Huge", "A", 999));
  const out = C.sanitizeSemesters(raw, { maxSemesters: 12, maxCourses: 20 });
  assert.strictEqual(out.length, 12);
  assert.strictEqual(out[0].courses[0].credits, 50);
});

test("sanitizeSemesters: strips non-object entries", () => {
  const raw = [42, "x", sem("S1", [crs("a", "A", "A", 3), "bad"])];
  const out = C.sanitizeSemesters(raw);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].courses.length, 1);
});

test("sanitizeSemesters: trims long names", () => {
  const raw = [sem("S".repeat(500), [crs("a", "N".repeat(500), "A", 3)])];
  const out = C.sanitizeSemesters(raw);
  assert.ok(out[0].name.length <= 60);
  assert.ok(out[0].courses[0].name.length <= 120);
});

test("sanitizeSemesters: keeps empty-semester (cleared) state", () => {
  const raw = [sem("S1", [])];
  const out = C.sanitizeSemesters(raw);
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual(out[0].courses, []);
});

test("progressPct: math", () => {
  assert.strictEqual(C.progressPct(3.0, 3.5, 4), 86);
  assert.strictEqual(C.progressPct(3.63, 3.5, 4), 100);
  assert.strictEqual(C.progressPct(null, 3.5, 4), 0);
  assert.strictEqual(C.progressPct(3.0, 0, 4), 100);
});

test("rounding: SC-style EPSILON rounding at 3 decimals", () => {
  assert.strictEqual(C.round(1.005, 2), 1.01);
  assert.strictEqual(C.round(3.5470588, 3), 3.547);
});

/* ── Scale registry ───────────────────────────────────────────────────── */
test("six scales registered with valid maxima", () => {
  const list = C.scaleList();
  assert.strictEqual(list.length, 6);
  const expect = { us40: 4, us43: 4.3, us50: 5, aus7: 7, in10: 10, pct: 100 };
  list.forEach((s) => assert.strictEqual(s.max, expect[s.id], s.id));
  assert.strictEqual(C.getScale("bogus").id, "us40"); /* safe fallback */
  assert.strictEqual(C.getScale(null).id, "us40");
  assert.strictEqual(C.getScale(undefined).id, "us40");
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
