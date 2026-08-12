/* Scholarics — Calculator Action Router: REAL CLICK-PATH verification (jsdom)
   ============================================================================
   This suite does not trust source code: it loads the BUILT pages (the same
   fingerprinted bundles a browser gets), dispatches genuine bubbling click
   events at the buttons (and at the SVG icons INSIDE them, and at CLONED
   re-rendered replacements), and asserts via the development-gated
   console.debug diagnostic that every click physically reached the single
   delegated document handler and executed the right action pipeline.

     Share      → debug line + getCalculatorSummary() + getCalculatorStateUrl()
                  + navigator.share (stubbed)
     Copy Link  → debug line + getCalculatorStateUrl() + SC.copy (clipboard stub)
     PDF        → debug line + IMMEDIATE generating state + generateDynamicPDFReport()
                  + real jsPDF doc.save()

   Run standalone:  node tests/click-router.test.js
   (also wired into tests/run-all.js)
============================================================================ */
"use strict";
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const { TextEncoder, TextDecoder } = require("util");

const ROOT = path.join(__dirname, "..");
const PORT = 8946;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};
let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "");
      fs.readFile(path.join(ROOT, rel), (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        const ext = path.extname(rel).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(PORT, "127.0.0.1", resolve);
  });
}

function stubsFor(state) {
  return (w) => {
    /* Turn the development diagnostic ON for this window only */
    w.SC_DEBUG_ACTIONS = true;

    function patchJsPDFSave() {
      const jsPDF = w.jspdf && w.jspdf.jsPDF;
      if (!jsPDF || !jsPDF.API || jsPDF.__scPdfSavePatched) return;
      jsPDF.__scPdfSavePatched = true;
      jsPDF.API.save = function(filename) {
        let bytes = Buffer.alloc(0);
        let pdfText = "";
        try {
          bytes = Buffer.from(this.output("arraybuffer") || []);
          const raw = this.output();
          pdfText = typeof raw === "string" ? raw : "";
        } catch (e) {
          state.pdfSaveError = e && e.stack || String(e);
        }
        state.saveCalls.push({ filename: String(filename || ""), byteLength: bytes.length, header: bytes.slice(0, 5).toString("latin1"), text: pdfText });
        return this;
      };
    }
    let jspdfValue;
    Object.defineProperty(w, "jspdf", {
      configurable: true,
      get() { return jspdfValue; },
      set(v) { jspdfValue = v; patchJsPDFSave(); }
    });
    /* jsPDF v4's UMD assigns window.jspdf = {} BEFORE populating .jsPDF —
       patch again once each vendor script has actually finished loading. */
    const nativeAppendChild = w.Element.prototype.appendChild;
    w.Element.prototype.appendChild = function(node) {
      if (node && node.tagName && node.tagName.toLowerCase() === "script") {
        const rawSrc = node.getAttribute("src") || node.src || "";
        if (/jspdf(?:\.min)?\.js|jspdf-autotable(?:\.min)?\.js/.test(rawSrc)) {
          node.addEventListener("load", () => patchJsPDFSave());
        }
      }
      return nativeAppendChild.call(this, node);
    };

    w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.requestAnimationFrame = w.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    w.cancelAnimationFrame = w.cancelAnimationFrame || ((id) => clearTimeout(id));
    w.scrollTo = w.scrollTo || (() => {});
    w.IntersectionObserver = w.IntersectionObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.ResizeObserver = w.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.confirm = () => true;
    w.getSelection = w.getSelection || (() => ({ removeAllRanges(){}, addRange(){} }));
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = w.URL.createObjectURL || (() => "blob:scholarics-test-pdf");
    w.URL.revokeObjectURL = w.URL.revokeObjectURL || (() => {});

    w.navigator.clipboard = { writeText: async (txt) => { state.clipboardWrites.push(txt); } };
    w.navigator.share = async (data) => { state.shareCalls.push(data); };
    w.open = () => ({ document: { write() {}, close() {} }, focus() {}, print() {} });
  };
}

async function load(pageUrl) {
  const state = {
    errors: [], debugLines: [],
    shareCalls: [], clipboardWrites: [],
    saveCalls: [], pdfSaveError: null
  };
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = e && e.message ? e.message : String(e);
    if (/Could not load (resource|script|link)|Not implemented/i.test(msg)) return;
    state.errors.push("jsdomError: " + msg);
  });
  vc.on("error", (...a) => state.errors.push("console.error: " + a.join(" ")));
  vc.on("debug", (...a) => state.debugLines.push(a.join(" ")));
  const dom = await JSDOM.fromURL(pageUrl, {
    resources: "usable", runScripts: "dangerously", pretendToBeVisual: true,
    virtualConsole: vc, beforeParse: stubsFor(state)
  });
  await new Promise((r) => setTimeout(r, 220));
  return { dom, state };
}

/* Dispatch a genuine bubbling, cancelable MouseEvent at an element and
   report whether any listener called preventDefault(). */
function realClick(dom, el) {
  const ev = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, view: dom.window });
  const notPrevented = el.dispatchEvent(ev);
  return { prevented: !notPrevented };
}

const actionLines = (state, action, id) =>
  state.debugLines.filter((l) =>
    l.indexOf("[Scholarics] calculator action:") === 0 &&
    l.indexOf(action) !== -1 &&
    l.indexOf(id) !== -1
  );

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log("  ✓ " + name); })
    .catch((e) => { failed++; console.error("  ✗ " + name + "\n    " + (e && e.stack || e)); });
}

(async () => {
  await startServer();
  const BASE = "http://127.0.0.1:" + PORT + "/";

  /* ── A. Static obstacle audit on gpa.html ─────────────────────────────── */
  await test("Obstacle audit: no pointer-events/disabled/overlay blockers on the action buttons", async () => {
    const html = fs.readFileSync(path.join(ROOT, "gpa.html"), "utf8");
    for (const id of ["shareBtn", "copyLinkBtn", "pdfBtn"]) {
      const tagMatch = html.match(new RegExp("<button[^>]*id=\\\"" + id + "\\\"[^>]*>"));
      assert.ok(tagMatch, id + " button tag not found in gpa.html");
      assert.ok(!/\bdisabled\b/i.test(tagMatch[0]), id + " ships with a disabled attribute");
    }
    /* No stylesheet may disable pointer events on the buttons or their row. */
    const cssFiles = [];
    const collect = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".css")).forEach((f) => cssFiles.push(path.join(dir, f)));
    collect(path.join(ROOT, "css"));
    collect(path.join(ROOT, "assets", "css"));
    const cssText = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
    const rules = cssText.split("}").map((r) => r + "}");
    const blocked = rules.filter((r) => {
      const sel = r.split("{")[0] || "";
      /* pointer-events:none on a ::before/::after INSIDE the button is safe:
         clicks targeting a pseudo-element dispatch to the element itself. */
      if (/::(before|after)/.test(sel)) return false;
      return /pointer-events\s*:\s*none/.test(r) &&
        /(^|[\s,])(\.result-btn-row|#shareBtn|#copyLinkBtn|#pdfBtn|\.gpa-hero|\.btn)(?![\w-])/.test(sel);
    });
    assert.deepStrictEqual(blocked, [], "pointer-events:none rules target the action buttons: " + blocked.join(" | "));
    /* Fixed decorative overlays that could cover the page must be click-through. */
    for (const sel of [".prem-bg", ".noise-overlay", ".particles", "#scroll-progress", "#cursor-dot", "#cursor-ring", "#mouse-glow"]) {
      const esc = sel.replace(/[.#]/g, (c) => "\\" + c);
      const hit = rules.some((r) => new RegExp(esc + "(?![\\w-])").test(r.split("{")[0] || ""));
      if (!hit) continue; /* overlay styles not shipped — nothing to cover the click */
      const covered = rules.filter((r) =>
        new RegExp(esc + "(?![\\w-])").test(r.split("{")[0] || "") &&
        /position\s*:\s*fixed/.test(r)
      );
      for (const r of covered) {
        assert.ok(/pointer-events\s*:\s*none/.test(r), sel + " is position:fixed WITHOUT pointer-events:none — it can swallow clicks");
      }
    }
  });

  /* ── B. Bundle freshness: the live page ships the router ─────────────── */
  await test("Bundle freshness: gpa.html references a fingerprinted bundle that contains the router", async () => {
    const html = fs.readFileSync(path.join(ROOT, "gpa.html"), "utf8");
    const m = html.match(/src="(assets\/js\/[^"]+)"[^>]*data-sc-src="([^"]*\bcalculators\b[^"]*)"/);
    assert.ok(m, "no data-sc-src='calculators' script tag found on gpa.html");
    const code = fs.readFileSync(path.join(ROOT, m[1]), "utf8");
    assert.ok(code.includes("SC_CALC_ACTIONS_ROUTER"), m[1] + " does NOT contain the delegated router — stale bundle?");
    assert.ok(!code.includes("SC_ACTIONS_INITIALIZED"), m[1] + " still contains the fragile old guard");
  });

  /* ── C. GPA page: physical click verification ─────────────────────────── */
  const { dom, state } = await load(BASE + "gpa.html");
  const d = dom.window.document;

  await test("Router installed exactly once (SC_CALC_ACTIONS_ROUTER set at script evaluation)", async () => {
    assert.strictEqual(dom.window.SC_CALC_ACTIONS_ROUTER, true, "router flag not set — listener missing");
    assert.ok(!dom.window.SC_ACTIONS_INITIALIZED, "old fragile guard reappeared");
  });

  await test("GPA dataset → 3.41 / 6 courses / 18 credits (calculator untouched)", async () => {
    d.querySelectorAll("[data-del]").forEach((btn) => btn.click());
    await new Promise((r) => setTimeout(r, 50));
    const dataset = [
      { name: "Calculus I", grade: "A", credits: 3 },
      { name: "Programming Fundamentals", grade: "A-", credits: 3 },
      { name: "Physics", grade: "B+", credits: 4 },
      { name: "English Composition", grade: "B", credits: 3 },
      { name: "Pakistan Studies", grade: "A", credits: 2 },
      { name: "Digital Logic Design", grade: "B-", credits: 3 }
    ];
    const addRowBtn = d.querySelector("#addRow");
    for (const item of dataset) {
      addRowBtn.click();
      await new Promise((r) => setTimeout(r, 20));
      const crows = d.querySelectorAll(".crow");
      const row = crows[crows.length - 1];
      const set = (sel, val) => {
        const el = row.querySelector(sel);
        el.value = val;
        el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      };
      set('[data-f="name"]', item.name);
      set('[data-f="grade"]', item.grade);
      set('[data-f="credits"]', item.credits);
    }
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(d.querySelector("#gpaOut").textContent.trim(), "3.41", "GPA wrong — calculator logic must not change");
    assert.strictEqual(d.querySelector("#mCourses").textContent.trim(), "6");
    assert.strictEqual(d.querySelector("#mCredits").textContent.trim(), "18");
  });

  await test("CLICK EVENT REACHED HANDLER: Share (real bubbling click on #shareBtn)", async () => {
    state.shareCalls.length = 0;
    const btn = d.querySelector("#shareBtn");
    const { prevented } = realClick(dom, btn);
    assert.ok(prevented, "click on an action button must be preventDefault()ed by the router");
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(actionLines(state, "share", "shareBtn").length, 1,
      "expected exactly ONE delegated debug line for share, got: " + JSON.stringify(state.debugLines));
    assert.strictEqual(state.shareCalls.length, 1, "navigator.share must fire exactly once (no double action)");
    assert.ok(state.shareCalls[0].text.includes("GPA: 3.41 / 4.0"), "getCalculatorSummary() pipeline produced wrong text: " + state.shareCalls[0].text);
    assert.ok(state.shareCalls[0].url.includes("gpa.html?"), "getCalculatorStateUrl() pipeline produced wrong url: " + state.shareCalls[0].url);
  });

  await test("Event path: click on the SVG icon INSIDE #copyLinkBtn still routes (closest walk)", async () => {
    state.clipboardWrites.length = 0;
    const btn = d.querySelector("#copyLinkBtn");
    const svg = btn.querySelector("svg");
    assert.ok(svg, "expected an <svg> icon inside #copyLinkBtn");
    const { prevented } = realClick(dom, svg);
    assert.ok(prevented, "click landing on the button's icon must also be handled");
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(actionLines(state, "copylink", "copyLinkBtn").length, 1,
      "click on inner SVG did not resolve to the button via the delegated walk");
    assert.strictEqual(state.clipboardWrites.length, 1, "SC.copy must fire exactly once");
    assert.ok(state.clipboardWrites[0].includes("gpa.html?scale=letter&rows="), "copied URL lost the calculator state: " + state.clipboardWrites[0]);
  });

  await test("CLICK EVENT REACHED HANDLER: PDF click enters generating state IMMEDIATELY, then doc.save()", async () => {
    const btn = d.querySelector("#pdfBtn");
    const { prevented } = realClick(dom, btn);
    /* generateDynamicPDFReport() must have run synchronously: */
    assert.ok(prevented, "PDF click must be preventDefault()ed");
    assert.strictEqual(btn.disabled, true, "PDF button did not IMMEDIATELY disable (generating state)");
    assert.ok(btn.classList.contains("btn-loading"), "PDF button did not IMMEDIATELY show .btn-loading");
    assert.ok(/Generating/.test(btn.textContent), "PDF button label did not switch to a generating state: " + btn.textContent.trim());
    assert.strictEqual(actionLines(state, "pdf", "pdfBtn").length, 1,
      "expected exactly ONE delegated debug line for pdf, got: " + JSON.stringify(actionLines(state, "pdf", "pdfBtn")));
    const start = Date.now();
    while (!state.saveCalls.length && Date.now() - start < 8000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(state.saveCalls.length, "generateDynamicPDFReport() never reached doc.save()");
    assert.strictEqual(state.saveCalls[state.saveCalls.length - 1].header, "%PDF-", "saved output is not a real PDF");
    assert.ok(!state.pdfSaveError, "PDF generation error: " + state.pdfSaveError);
  });

  await test("Robustness: a button REPLACED by a calculator re-render still works (zero re-binding)", async () => {
    /* Clone = exactly what a result-area re-render produces: same id, fresh
       node, no listeners attached by anyone. The delegated router must
       still catch it. */
    const oldBtn = d.querySelector("#shareBtn");
    const clone = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(clone, oldBtn);
    state.shareCalls.length = 0;
    state.debugLines.length = 0;
    const { prevented } = realClick(dom, d.querySelector("#shareBtn"));
    assert.ok(prevented, "click on the re-rendered Share button was not handled");
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(actionLines(state, "share", "shareBtn").length, 1,
      "delegated handler missed the re-rendered (fresh-node) button");
    assert.strictEqual(state.shareCalls.length, 1, "Share action must fire exactly once on the fresh node");
  });

  await test("Robustness: a button INSERTED long after page load still works", async () => {
    const b = d.createElement("button");
    b.id = "simShareBtn"; /* id routed to Copy Link by the router */
    b.textContent = "late button";
    d.body.appendChild(b);
    state.clipboardWrites.length = 0;
    const { prevented } = realClick(dom, b);
    assert.ok(prevented, "late-inserted button click not handled");
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(actionLines(state, "copylink", "simShareBtn").length, 1,
      "router did not route a dynamically inserted button");
    assert.strictEqual(state.clipboardWrites.length, 1, "Copy Link action must fire exactly once");
    b.remove();
  });

  await test("Routing precision: non-action buttons are NOT hijacked (no preventDefault, no debug line)", async () => {
    state.debugLines.length = 0;
    const { prevented } = realClick(dom, d.querySelector("#addRow2"));
    assert.ok(!prevented, "router preventDefault()ed a non-action click — it must only guard confirmed action buttons");
    assert.deepStrictEqual(state.debugLines.filter((l) => l.indexOf("[Scholarics] calculator action:") === 0), [],
      "router logged an action for a non-action button");
  });

  await test("No console errors anywhere during the full click-path verification", async () => {
    assert.deepStrictEqual(state.errors, [], "console errors: " + JSON.stringify(state.errors));
  });
  dom.window.close();

  /* ── D. GPA Simulator page: router covers it now (calculators.js added) ── */
  await test("gpa-simulator.html: simShareBtn Copy Link + simPdfBtn PDF route through the ONE global handler", async () => {
    const { dom: sdom, state: sstate } = await load(BASE + "gpa-simulator.html");
    const sd = sdom.window.document;
    assert.strictEqual(sdom.window.SC_CALC_ACTIONS_ROUTER, true, "router not installed on the simulator page");

    const simShare = sd.querySelector("#simShareBtn");
    assert.ok(simShare, "#simShareBtn missing");
    realClick(sdom, simShare);
    await new Promise((r) => setTimeout(r, 80));
    assert.strictEqual(actionLines(sstate, "copylink", "simShareBtn").length, 1, "simShareBtn did not route to Copy Link exactly once");
    assert.strictEqual(sstate.clipboardWrites.length, 1, "Copy Link did not write the clipboard on the simulator page");
    assert.ok(sstate.clipboardWrites[0].includes("gpa-simulator.html"), "simulator share URL wrong: " + sstate.clipboardWrites[0]);

    const simPdf = sd.querySelector("#simPdfBtn");
    assert.ok(simPdf, "#simPdfBtn missing");
    realClick(sdom, simPdf);
    assert.strictEqual(simPdf.disabled, true, "#simPdfBtn did not IMMEDIATELY enter the generating state");
    assert.ok(simPdf.classList.contains("btn-loading"), "#simPdfBtn missing .btn-loading after click");
    assert.strictEqual(actionLines(sstate, "pdf", "simPdfBtn").length, 1, "simPdfBtn did not route to PDF exactly once");

    /* Let the async PDF pipeline finish BEFORE closing the window: an async
       continuation firing after window.close() would crash on the torn-down
       document (test-harness hygiene; mirrors real page-unload semantics). */
    const start = Date.now();
    while (!sstate.saveCalls.length && Date.now() - start < 8000) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.ok(sstate.saveCalls.length, "simulator PDF never reached doc.save()");
    assert.strictEqual(sstate.saveCalls[sstate.saveCalls.length - 1].header, "%PDF-", "simulator saved output is not a real PDF");

    assert.deepStrictEqual(sstate.errors, [], "simulator console errors: " + JSON.stringify(sstate.errors));
    sdom.window.close();
  });

  /* ── E. Every page whose legacy inline share handler was removed ──────
     These pages previously bound their own #xxShare.onclick (double-firing
     alongside the global listener). Each must now be served by the ONE
     router: set a result value, click Share, expect the exact Share
     pipeline (summary → state URL → navigator.share) exactly once. */
  const legacySharePages = [
    ["assignment-weight.html",        "#awShare",   "#awAvgOut",     "12.5%"],
    ["attendance-goal.html",          "#agShare",   "#agMustAttend", "3 classes"],
    ["attendance-percentage.html",    "#apShare",   "#apPctOut",     "81%"],
    ["class-average.html",            "#caShare",   "#caMean",       "86.5"],
    ["credit-hour-planner.html",      "#chShare",   "#chSemOut",     "2"],
    ["gpa-improvement-planner.html",  "#giShare",   "#giRequired",   "3.55"],
    ["grade-predictor.html",          "#gpShare",   "#gpPredOut",    "B+"],
    ["study-schedule.html",           "#ssShare",   "#ssTotalHours", "10"],
    ["study-time.html",               "#stShare",   "#stWeeklyHours", "22"],
    ["required-marks.html",           "#rmShare",   "#rmRequired",   "78%"],
    ["semester-gpa.html",             "#sgShare",   "#sgGpaOut",     "3.52"],
    ["grading-guide.html",            "#ggShare",   "#ggUS4Out",     "3.70"],
    ["gpa-to-percentage.html",        "#g2pShare",  "#g2pOut",       "88%"],
    ["percentage-to-gpa.html",        "#p2gShare",  "#p2gOut",       "3.31"],
    ["final-exam-calculator.html",    "#feShare",   "#feNeedOut",    "85%"]
  ];
  for (const [page, shareSel, outSel, outVal] of legacySharePages) {
    await test(page + ": legacy inline share handler gone — " + shareSel + " routes through the ONE router", async () => {
      const { dom: pdom, state: pstate } = await load(BASE + page);
      const pd = pdom.window.document;
      assert.strictEqual(pdom.window.SC_CALC_ACTIONS_ROUTER, true, "router missing on " + page);
      const out = pd.querySelector(outSel);
      const share = pd.querySelector(shareSel);
      assert.ok(out, outSel + " result element missing on " + page);
      assert.ok(share, shareSel + " share button missing on " + page);
      assert.ok(!share.onclick, shareSel + " still has an inline onclick handler — clicks would fire twice");
      out.textContent = outVal; /* a computed result now exists */
      const { prevented } = realClick(pdom, share);
      assert.ok(prevented, "router did not claim the click on " + page);
      await new Promise((r) => setTimeout(r, 60));
      const lines = actionLines(pstate, "share", shareSel.slice(1));
      assert.strictEqual(lines.length, 1, "expected exactly ONE delegated debug line on " + page + ", got " + pstate.debugLines.length);
      assert.strictEqual(pstate.shareCalls.length, 1, "navigator.share must fire exactly once on " + page);
      assert.ok(pstate.shareCalls[0].text.indexOf(outVal) !== -1,
        "share text on " + page + " lost the computed result (" + outVal + "): " + pstate.shareCalls[0].text);
      assert.ok(pstate.shareCalls[0].url && pstate.shareCalls[0].url.indexOf(page) !== -1,
        "share url on " + page + " wrong: " + pstate.shareCalls[0].url);
      assert.deepStrictEqual(pstate.errors, [], page + " console errors: " + JSON.stringify(pstate.errors));
      pdom.window.close();
    });
  }

  server.close();
  console.log("\nClick Router: " + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); server && server.close(); process.exit(1); });
