/* Scholarics — GPA Simulator UI tests (jsdom + full page load)
   Loads the real gpa-simulator.html with every site script against a local
   static server, stubbing only browser APIs jsdom lacks. Verifies rendering,
   math on screen, focus retention, undo, scale switching, share links,
   storage recovery, exports, AI coach, keyboard nav and debounced saves. */
"use strict";
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const PORT = 8931;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

let server;
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split("?")[0]);
      const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
      const file = path.join(ROOT, rel);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        const ext = path.extname(file).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(PORT, "127.0.0.1", resolve);
  });
}

/* ── Browser-API stubs for jsdom ──────────────────────────────────────── */
function makeStubs(opts) {
  const state = {
    errors: [],            /* page console.error / uncaught exceptions */
    clipboard: null,
    csvBlobs: [],
    fetches: [],
    confirms: true,
    downloads: []
  };
  const stubs = (window) => {
    if (opts.beforeParseExtra) opts.beforeParseExtra(window);
    window.matchMedia = window.matchMedia || function (q) {
      return {
        matches: q.indexOf("prefers-color-scheme: dark") !== -1 && (opts.dark || false),
        media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}
      };
    };
    window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
    window.scrollTo = window.scrollTo || function () {};
    window.IntersectionObserver = window.IntersectionObserver || class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.ResizeObserver = window.ResizeObserver || class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.confirm = function () { return state.confirms; };
    window.getSelection = window.getSelection || (() => ({ removeAllRanges() {}, addRange() {} }));
    try {
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (t) => { state.clipboard = t; } }
      });
    } catch (e) {}
    window.fetch = function (url, init) {
      state.fetches.push({ url: String(url), init: init || {} });
      if (opts.fetchHandler) return opts.fetchHandler(String(url), init || {}, state);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    };
    window.URL.createObjectURL = function (blob) { state.csvBlobs.push(blob); return "blob:test-" + state.csvBlobs.length; };
    window.URL.revokeObjectURL = function () {};
    window.open = function () {
      return {
        document: { write() {}, close() {} },
        focus() {}, print() {}
      };
    };
  };
  return { state, stubs };
}

function makeVC(state) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = e && e.message ? e.message : String(e);
    /* jsdom environment noise (blocked external fonts/analytics), not page bugs */
    if (/Could not load (resource|script|link)|Not implemented/i.test(msg)) return;
    state.errors.push("jsdomError: " + msg);
  });
  vc.on("error", (...a) => state.errors.push("console.error: " + a.join(" ")));
  vc.on("warn", () => {});
  return vc;
}

async function loadPage(url, opts) {
  opts = opts || {};
  const { state, stubs } = makeStubs(opts);
  const dom = await JSDOM.fromURL(url, {
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: makeVC(state),
    beforeParse: stubs
  });
  await new Promise((r) => setTimeout(r, opts.settle || 150));
  return { dom, state };
}

const PAGE = "http://127.0.0.1:" + PORT + "/gpa-simulator.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fire = (el, type) => el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true }));

/* Let pending promise chains (clipboard, toasts) settle before closing. */
async function closeDom(dom) {
  await sleep(25);
  dom.window.close();
}

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(() => { passed++; console.log("  \u2713 " + name); })
    .catch((e) => { failed++; console.error("  \u2717 " + name + "\n    " + (e && e.stack || e)); });
}

(async () => {
  await startServer();

  /* ── 1. Initial render + zero console errors ────────────────────────── */
  await test("page loads with zero console errors", async () => {
    const { dom, state } = await loadPage(PAGE);
    await closeDom(dom);
    assert.deepStrictEqual(state.errors, []);
  });

  await test("default state renders 3 courses and CGPA 3.63", async () => {
    const { dom } = await loadPage(PAGE);
    const w = dom.window, d = w.document;
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 3);
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.63");
    assert.strictEqual(d.querySelector("#simSemGpa").textContent, "3.63");
    assert.strictEqual(d.querySelector("#simTotalCredits").textContent, "10");
    assert.strictEqual(d.querySelector("#simStatus").textContent, "Very good");
    assert.ok(d.querySelector("#simSparkWrap svg"));
    assert.strictEqual(d.querySelectorAll("#semTabs .sim-tab[data-sem]").length, 1);
    await closeDom(dom);
  });

  /* ── 2. Focus retention while typing (no full re-render) ────────────── */
  await test("typing does NOT rebuild rows (focus preserved)", async () => {
    const { dom } = await loadPage(PAGE);
    const w = dom.window, d = w.document;
    const rowsEl = d.querySelector("#simRows");
    const input = rowsEl.querySelector("input[data-f='name']");
    input.focus();
    input.value = "English";
    fire(input, "input");
    assert.strictEqual(d.querySelector("#simRows"), rowsEl, "rows container replaced");
    assert.strictEqual(input.isConnected, true, "input node replaced");
    assert.strictEqual(d.activeElement, input, "focus lost");
    /* CGPA still correct and needed tags updated without rebuild */
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.63");
    await closeDom(dom);
  });

  await test("grade change updates CGPA live", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simRows select[data-f='grade']");
    sel.value = "C";
    fire(sel, "change"); /* change-only path: select in some browsers */
    /* English 101 → C: (2*3 + 13.2 + 11.1)/10 = 3.03 */
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.03");
    assert.strictEqual(d.querySelector("#simStatus").textContent, "Good standing");
    await closeDom(dom);
  });

  await test("credits change updates totals and clamps to 50", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const input = d.querySelector("#simRows input[data-f='credits']");
    input.value = "99";
    fire(input, "input");
    assert.strictEqual(d.querySelector("#simTotalCredits").textContent, "57"); /* 50+4+3 */
    await closeDom(dom);
  });

  /* ── 3. Course / semester CRUD + undo ───────────────────────────────── */
  await test("add course, delete course, undo restores it", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#addCourseBtn").click();
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 4);
    const rows = d.querySelectorAll("#simRows .sim-crow");
    const lastName = rows[3].querySelector("input[data-f='name']");
    lastName.value = "Chem 101";
    fire(lastName, "input");
    assert.strictEqual(d.activeElement, lastName, "focus should land on new row name");

    const del = rows[3].querySelector("[data-del]");
    del.click();
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 3);
    assert.strictEqual(d.querySelector("#simUndoBtn").disabled, false);

    d.querySelector("#simUndoBtn").click();
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 4);
    const names = Array.from(d.querySelectorAll("#simRows input[data-f='name']")).map((i) => i.value);
    assert.ok(names.indexOf("Chem 101") !== -1, "course not restored: " + names);
    await closeDom(dom);
  });

  await test("add semester, delete semester, undo restores it", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#addSemBtn").click();
    assert.strictEqual(d.querySelectorAll("#semTabs .sim-tab[data-sem]").length, 2);
    /* add a course to the new semester so deletion is meaningful */
    d.querySelector("#addCourseBtn").click();
    const rows = d.querySelectorAll("#simRows .sim-crow");
    const nameInput = rows[0].querySelector("input[data-f='name']");
    nameInput.value = "Biology";
    fire(nameInput, "input");
    d.querySelector("#delSemBtn").click(); /* confirm stubbed true */
    assert.strictEqual(d.querySelectorAll("#semTabs .sim-tab[data-sem]").length, 1);
    assert.strictEqual(d.querySelector("#delSemBtn").style.display, "none");
    d.querySelector("#simUndoBtn").click();
    assert.strictEqual(d.querySelectorAll("#semTabs .sim-tab[data-sem]").length, 2);
    const names = Array.from(d.querySelectorAll("#simRows input[data-f='name']")).map((i) => i.value);
    assert.ok(names.indexOf("Biology") !== -1, "semester courses not restored");
    await closeDom(dom);
  });

  await test("clear semester + undo restores courses", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#clearSemBtn").click();
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 0);
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "—");
    d.querySelector("#simUndoBtn").click();
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 3);
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.63");
    await closeDom(dom);
  });

  await test("delete semester blocked when only one remains", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    assert.strictEqual(d.querySelector("#delSemBtn").style.display, "none");
    d.querySelector("#delSemBtn").click();
    assert.strictEqual(d.querySelectorAll("#semTabs .sim-tab[data-sem]").length, 1);
    await closeDom(dom);
  });

  /* ── 4. Grading scales ──────────────────────────────────────────────── */
  await test("scale selector lists all six scales", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const opts = Array.from(d.querySelectorAll("#simScale option")).map((o) => o.value);
    assert.deepStrictEqual(opts, ["us40", "us43", "us50", "aus7", "in10", "pct"]);
    await closeDom(dom);
  });

  await test("switch to 10.0 converts grades and updates target limits", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simScale");
    sel.value = "in10";
    fire(sel, "change");
    const grades = Array.from(d.querySelectorAll("#simRows input[data-f='grade']")).map((i) => i.value);
    assert.deepStrictEqual(grades, ["10", "8.25", "9.25"]);
    /* (10*3 + 8.25*4 + 9.25*3)/10 = 9.075 → 9.08 (display 2dp) */
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "9.08");
    assert.strictEqual(d.querySelector("#simTarget").max, "10");
    assert.strictEqual(d.querySelector("#simTargetSlider").max, "10");
    assert.strictEqual(d.querySelector("#simTargetScale").textContent, "10.0");
    assert.ok(d.querySelector("#simScaleNote").textContent.indexOf("10.0 Scale") !== -1);
    await closeDom(dom);
  });

  await test("switch to percentage converts and computes weighted %", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simScale");
    sel.value = "pct";
    fire(sel, "change");
    const grades = Array.from(d.querySelectorAll("#simRows input[data-f='grade']")).map((i) => i.value);
    assert.deepStrictEqual(grades, ["100", "82.5", "92.5"]);
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "90.75");
    assert.strictEqual(d.querySelector("#simTargetScale").textContent, "100%");
    await closeDom(dom);
  });

  await test("needed-grade tag works on numeric scale", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simScale");
    sel.value = "in10";
    fire(sel, "change");
    const tgt = d.querySelector("#simTarget");
    tgt.value = "9.5";
    fire(tgt, "input");
    /* Calc I: (9.5*10 - (30+27.75))/4 = 9.3125 → Need 9.31 */
    const tags = Array.from(d.querySelectorAll("#simRows .sim-need")).map((t) => t.textContent);
    assert.ok(tags[1].indexOf("Need 9.31") !== -1, "tags: " + JSON.stringify(tags));
    /* impossible case for English (needs 11.42) */
    assert.ok(tags[0] === "Impossible", "tags: " + JSON.stringify(tags));
    await closeDom(dom);
  });

  await test("5.0 scale renders letter select and correct GPA", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simScale");
    sel.value = "us50";
    fire(sel, "change");
    assert.ok(d.querySelector("#simRows select[data-f='grade']"));
    /* A→5, B+→4, A-→4.5 → (15+16+13.5)/10 = 4.45 */
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "4.45");
    await closeDom(dom);
  });

  await test("7.0 scale (Australia) renders HD/N grades", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const sel = d.querySelector("#simScale");
    sel.value = "aus7";
    fire(sel, "change");
    const opts = Array.from(d.querySelectorAll("#simRows select[data-f='grade'] option")).map((o) => o.value);
    assert.ok(opts.indexOf("HD") !== -1 && opts.indexOf("N") !== -1);
    /* A→nearest of HD(7)…: A 4.0 → ratio 1.0 → 7 → HD ; B+ 3.3 → 5.775 → C; A- 3.7 → 6.475 → D */
    const grades = Array.from(d.querySelectorAll("#simRows select[data-f='grade']")).map((s) => s.value);
    assert.deepStrictEqual(grades, ["HD", "D", "D"]);
    await closeDom(dom);
  });

  /* ── 5. Share links ─────────────────────────────────────────────────── */
  await test("share link encodes state incl. scale; reload restores it", async () => {
    const { dom, state } = await loadPage(PAGE);
    const d = dom.window.document;
    /* tweak state */
    const sel = d.querySelector("#simScale");
    sel.value = "in10";
    fire(sel, "change");
    const nameInput = d.querySelector("#simRows input[data-f='name']");
    nameInput.value = "Physics I";
    fire(nameInput, "input");
    d.querySelector("#simShareBtn").click();
    await sleep(30);
    const url = state.clipboard;
    assert.ok(url && url.indexOf("sim=") !== -1, "no share URL copied");
    assert.ok(url.indexOf("scale=in10") !== -1, "scale missing from URL: " + url);
    await closeDom(dom);

    const { dom: dom2, state: state2 } = await loadPage(url);
    const d2 = dom2.window.document;
    assert.strictEqual(d2.querySelector("#simScale").value, "in10");
    assert.strictEqual(d2.querySelectorAll("#simRows .sim-crow").length, 3);
    const names = Array.from(d2.querySelectorAll("#simRows input[data-f='name']")).map((i) => i.value);
    assert.ok(names.indexOf("Physics I") !== -1, "names: " + JSON.stringify(names));
    assert.strictEqual(d2.querySelector("#simCgpa").textContent, "9.08");
    assert.ok(d2.querySelector("#scSharedBanner"), "shared banner missing");
    assert.deepStrictEqual(state2.errors, []);
    await closeDom(dom2);
  });

  await test("legacy v1 share link (no ids, no scale) still restores", async () => {
    const legacy = PAGE + "?sim=" + encodeURIComponent(JSON.stringify([
      { n: "Semester 1", c: [["Old Course", "A", 3], ["Another", "B+", 2]] }
    ])) + "&tgt=3.2";
    const { dom, state } = await loadPage(legacy);
    const d = dom.window.document;
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 2);
    assert.strictEqual(d.querySelector("#simScale").value, "us40");
    assert.strictEqual(d.querySelector("#simTarget").value, "3.20");
    /* (4*3 + 3.3*2)/5 = 3.72 */
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.72");
    assert.deepStrictEqual(state.errors, []);
    await closeDom(dom);
  });

  await test("malformed share link falls back to saved/default data", async () => {
    const bad = PAGE + "?sim=" + encodeURIComponent(JSON.stringify([{ n: 1, c: "nope" }])) + "&tgt=zzz&scale=bogus";
    const { dom, state } = await loadPage(bad);
    const d = dom.window.document;
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 3);
    assert.strictEqual(d.querySelector("#simScale").value, "us40");
    assert.deepStrictEqual(state.errors, []);
    await closeDom(dom);
  });

  /* ── 6. Storage reliability ─────────────────────────────────────────── */
  await test("corrupted localStorage recovers to defaults without errors", async () => {
    const { dom, state } = await loadPage(PAGE, {
      beforeParseExtra: (w) => {
        try {
          w.localStorage.setItem("sc_sim_semesters", "{not json!!");
          w.localStorage.setItem("sc_sim_target", "abc");
          w.localStorage.setItem("sc_sim_scale", "bogus");
        } catch (e) {}
      }
    });
    const d = dom.window.document;
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 3);
    assert.strictEqual(d.querySelector("#simScale").value, "us40");
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "3.63");
    assert.deepStrictEqual(state.errors, []);
    await closeDom(dom);
  });

  await test("duplicate IDs in saved data are deduped on load", async () => {
    const dupData = [{
      id: "same", name: "S1",
      courses: [
        { id: "dup", name: "A", grade: "A", credits: 3 },
        { id: "dup", name: "B", grade: "B", credits: 3 }
      ]
    }];
    const { dom, state } = await loadPage(PAGE, {
      beforeParseExtra: (w) => { w.localStorage.setItem("sc_sim_semesters", JSON.stringify(dupData)); }
    });
    const d = dom.window.document;
    const ids = Array.from(d.querySelectorAll("#simRows .sim-crow")).map((r) => r.getAttribute("data-id"));
    assert.strictEqual(new Set(ids).size, ids.length, "duplicate row ids: " + ids);
    assert.deepStrictEqual(state.errors, []);
    await closeDom(dom);
  });

  await test("existing saved 4.0 data (v1 format) loads unchanged", async () => {
    const v1 = [{ id: "s1", name: "Semester 1", courses: [{ id: "c1", name: "Math", grade: "A", credits: 4 }] }];
    const { dom } = await loadPage(PAGE, {
      beforeParseExtra: (w) => { w.localStorage.setItem("sc_sim_semesters", JSON.stringify(v1)); }
    });
    const d = dom.window.document;
    assert.strictEqual(d.querySelectorAll("#simRows .sim-crow").length, 1);
    assert.strictEqual(d.querySelector("#simCgpa").textContent, "4.00");
    await closeDom(dom);
  });

  /* ── 7. Exports ─────────────────────────────────────────────────────── */
  await test("CSV export contains courses, scale and summary", async () => {
    const { dom, state } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#simCsvBtn").click();
    assert.strictEqual(state.csvBlobs.length, 1, "no CSV blob created");
    const blob = state.csvBlobs[0];
    const text = await new Promise((resolve, reject) => {
      const fr = new dom.window.FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsText(blob);
    });
    assert.ok(text.indexOf("Semester,Course,Grade,Points,Credits") !== -1, "header missing");
    assert.ok(text.indexOf("English 101,A,4.00,3") !== -1, "course row missing: " + text);
    assert.ok(text.indexOf("Cumulative GPA,3.63") !== -1, "summary missing");
    assert.ok(text.indexOf("4.0 Scale (USA)") !== -1, "scale row missing");
    await closeDom(dom);
  });

  await test("Copy results copies a text summary", async () => {
    const { dom, state } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#simCopyBtn").click();
    assert.ok(state.clipboard, "clipboard empty");
    assert.ok(state.clipboard.indexOf("Cumulative GPA: 3.63") !== -1, state.clipboard);
    assert.ok(state.clipboard.indexOf("Semester 1: 3.63") !== -1, state.clipboard);
    await closeDom(dom);
  });

  await test("PDF export opens a print window without errors", async () => {
    const { dom, state } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#simPdfBtn").click();
    assert.deepStrictEqual(state.errors, []);
    await closeDom(dom);
  });

  /* ── 8. AI Coach ────────────────────────────────────────────────────── */
  const COACH_REPLY = {
    ok: true, status: 200,
    json: () => Promise.resolve({ coach: {
      strengths: ["Physics — strong fundamentals", "Consistent attendance"],
      weaknesses: ["Calculus — problem-set procrastination"],
      progress: { current: 3.63, target: 3.5, gap: -0.13, pct: 100 },
      priorities: [{ subject: "Calculus I", reason: "4 credits — biggest lever", urgency: "high" }],
      weeklyPlan: [
        { day: "Monday", focus: "Calculus problem set", tasks: ["5 problems", "Redo errors"] },
        { day: "Tuesday", focus: "History reading", tasks: ["1 chapter"] }
      ],
      advice: "Protect your momentum with weekly problem sets."
    } })
  };

  await test("AI coach renders structured report via /api/ai/coach", async () => {
    let called = null;
    const { dom, state } = await loadPage(PAGE, {
      fetchHandler: (url, init) => {
        if (url.indexOf("/api/ai/coach") !== -1) {
          called = JSON.parse(init.body);
          return Promise.resolve(COACH_REPLY);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
    });
    const d = dom.window.document;
    d.querySelector("#aiCoachBtn").click();
    await sleep(80);
    assert.ok(called, "coach endpoint never called");
    assert.strictEqual(called.scaleId, "us40");
    assert.strictEqual(called.semesters.length, 1);
    assert.strictEqual(called.semesters[0].courses.length, 3);
    const out = d.querySelector("#aiCoachOut").innerHTML;
    assert.ok(out.indexOf("Strengths") !== -1, "strengths missing");
    assert.ok(out.indexOf("Watch out for") !== -1, "weaknesses missing");
    assert.ok(out.indexOf("Target progress") !== -1, "progress missing");
    assert.ok(out.indexOf("Subject priorities") !== -1, "priorities missing");
    assert.ok(out.indexOf("Weekly study plan") !== -1, "weekly plan missing");
    assert.ok(out.indexOf("Calculus I") !== -1, "subject name missing");
    assert.strictEqual(d.querySelector("#aiCoachBtn").disabled, false, "button stayed disabled");
    assert.strictEqual(d.querySelector("#aiCoachLoader").style.display, "none");
    await closeDom(dom);
  });

  await test("AI coach falls back to local plan when backend fails", async () => {
    const { dom, state } = await loadPage(PAGE, {
      fetchHandler: () => Promise.reject(new Error("network down"))
    });
    const d = dom.window.document;
    d.querySelector("#aiCoachBtn").click();
    await sleep(80);
    const out = d.querySelector("#aiCoachOut").innerHTML;
    assert.ok(out.indexOf("Weekly study plan") !== -1, "local plan missing: " + out.slice(0, 200));
    assert.ok(out.indexOf("Subject priorities") !== -1);
    assert.strictEqual(d.querySelector("#aiCoachBtn").disabled, false);
    await closeDom(dom);
  });

  await test("AI coach never embeds an API key in the request", async () => {
    const bodies = [];
    const { dom } = await loadPage(PAGE, {
      fetchHandler: (url, init) => {
        bodies.push(String(url) + "|" + String(init.body));
        return Promise.resolve(COACH_REPLY);
      }
    });
    const d = dom.window.document;
    d.querySelector("#aiCoachBtn").click();
    await sleep(80);
    const joined = bodies.join("\n");
    assert.ok(joined.indexOf("generativelanguage.googleapis.com") === -1, "direct Gemini call!");
    assert.ok(joined.indexOf("AIza") === -1 && joined.indexOf("GEMINI_KEY") === -1, "key leaked");
    assert.ok(joined.indexOf("/api/ai/coach") !== -1, "did not call backend");
    await closeDom(dom);
  });

  /* ── 9. Keyboard accessibility ──────────────────────────────────────── */
  await test("semester tabs support arrow-key navigation", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    d.querySelector("#addSemBtn").click();
    const tabs = d.querySelectorAll("#semTabs .sim-tab[data-sem]");
    assert.strictEqual(tabs.length, 2);
    tabs[0].focus();
    tabs[0].dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    assert.strictEqual(d.activeElement.getAttribute("data-sem"), "1");
    assert.strictEqual(d.querySelector("#semTabs .sim-tab[data-sem='1']").getAttribute("aria-selected"), "true");
    /* tablist was rebuilt — operate on the freshly focused node */
    d.activeElement.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    assert.strictEqual(d.activeElement.getAttribute("data-sem"), "0");
    assert.strictEqual(d.querySelector("#semTabs .sim-tab[data-sem='0']").getAttribute("aria-selected"), "true");
    await closeDom(dom);
  });

  await test("semester name editor: Enter commits, Escape reverts", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const nameEl = d.querySelector("#activeSemName");
    nameEl.focus(); /* real users focus the editor before typing */
    nameEl.textContent = "Freshman Fall";
    fire(nameEl, "input");
    await sleep(20);
    nameEl.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.strictEqual(d.querySelector("#semTabs .sim-tab-name").textContent, "Freshman Fall");
    /* Escape reverts to committed value */
    nameEl.textContent = "typo";
    fire(nameEl, "input");
    nameEl.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.strictEqual(nameEl.textContent, "Freshman Fall");
    await closeDom(dom);
  });

  await test("remove-course button has an accessible label", async () => {
    const { dom } = await loadPage(PAGE);
    const d = dom.window.document;
    const del = d.querySelector("#simRows [data-del]");
    assert.ok(del.getAttribute("aria-label").length > 0);
    assert.ok(del.getAttribute("title").length > 0);
    await closeDom(dom);
  });

  /* ── 10. Performance: debounced saves ───────────────────────────────── */
  await test("typing triggers debounced localStorage writes (1 write)", async () => {
    const { dom } = await loadPage(PAGE, {
      beforeParseExtra: (w) => {
        /* jsdom Storage is prototype-based — patch the prototype */
        const orig = w.Storage.prototype.setItem;
        w.__semWrites = 0;
        w.Storage.prototype.setItem = function (k, v) {
          if (k === "sc_sim_semesters") w.__semWrites++;
          return orig.call(this, k, v);
        };
      }
    });
    const w = dom.window, d = w.document;
    const input = d.querySelector("#simRows input[data-f='name']");
    for (const ch of "abcd") {
      input.value += ch;
      fire(input, "input");
    }
    await sleep(450); /* past the 300ms debounce */
    assert.strictEqual(w.__semWrites, 1, "expected 1 write, got " + w.__semWrites);
    /* and the value persisted */
    const saved = JSON.parse(w.localStorage.getItem("sc_sim_semesters"));
    assert.ok(saved[0].courses[0].name.indexOf("abcd") !== -1);
    await closeDom(dom);
  });

  /* ── 11. Dark mode ──────────────────────────────────────────────────── */
  await test("dark mode theme applies and simulator dark CSS exists", async () => {
    const { dom } = await loadPage(PAGE, {
      dark: true,
      beforeParseExtra: (w) => { try { w.localStorage.setItem("sc_theme", "dark"); } catch (e) {} }
    });
    const d = dom.window.document;
    assert.strictEqual(d.documentElement.getAttribute("data-theme"), "dark");
    const style = Array.from(d.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    assert.ok(style.indexOf(':root[data-theme="dark"] .sim-result-card') !== -1, "dark result card rule missing");
    assert.ok(style.indexOf(':root[data-theme="dark"] .foot') !== -1, "dark footer rule missing");
    await closeDom(dom);
  });

  /* ── 12. Scale persistence across reloads ───────────────────────────── */
  await test("selected scale persists across reloads", async () => {
    const { dom } = await loadPage(PAGE, {
      beforeParseExtra: (w) => { w.localStorage.setItem("sc_sim_scale", "pct"); }
    });
    const d = dom.window.document;
    assert.strictEqual(d.querySelector("#simScale").value, "pct");
    assert.strictEqual(d.querySelector("#simTargetScale").textContent, "100%");
    await closeDom(dom);
  });

  console.log("\nUI: " + passed + " passed, " + failed + " failed");
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); server && server.close(); process.exit(1); });
