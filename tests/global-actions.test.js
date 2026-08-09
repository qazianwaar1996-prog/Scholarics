/* Scholarics — Global Calculator Actions (Share, Copy Link, PDF, State Restoration & GPA Regression) tests (jsdom) */
"use strict";
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const { TextEncoder, TextDecoder } = require("util");

const ROOT = path.join(__dirname, "..");
const PORT = 8945;
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
    function patchJsPDFSave() {
      const jsPDF = w.jspdf && w.jspdf.jsPDF;
      if (!jsPDF || !jsPDF.API || jsPDF.__scPdfSavePatched) return;
      jsPDF.__scPdfSavePatched = true;
      jsPDF.API.save = function(filename) {
        let bytes = Buffer.alloc(0);
        let pdfText = "";
        try {
          const output = this.output("arraybuffer");
          bytes = Buffer.from(output || []);
          const raw = this.output();
          pdfText = typeof raw === "string" ? raw : "";
        } catch (e) {
          state.pdfSaveError = e && e.stack || String(e);
        }
        state.saveCalls.push({
          filename: String(filename || ""),
          byteLength: bytes.length,
          header: bytes.slice(0, 5).toString("latin1"),
          hasAutoTable: typeof this.autoTable === "function",
          pageCount: this.internal && typeof this.internal.getNumberOfPages === "function" ? this.internal.getNumberOfPages() : null,
          text: pdfText
        });
        state.pdfBytes = bytes;
        return this;
      };
      state.jsPDFSavePatched = true;
    }

    let jspdfValue;
    Object.defineProperty(w, "jspdf", {
      configurable: true,
      get() { return jspdfValue; },
      set(v) { jspdfValue = v; patchJsPDFSave(); }
    });

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

    const nativeAppendChild = w.Element.prototype.appendChild;
    w.Element.prototype.appendChild = function(node) {
      if (node && node.tagName) {
        const tag = node.tagName.toLowerCase();
        if (tag === "script") {
          const rawSrc = node.getAttribute("src") || node.src || "";
          if (/jspdf(?:\.min)?\.js|jspdf-autotable(?:\.min)?\.js/.test(rawSrc)) {
            state.pdfScriptAppends.push(rawSrc);
            node.addEventListener("load", () => {
              patchJsPDFSave();
              state.pdfScriptLoads.push(rawSrc);
              if (/jspdf(?:\.min)?\.js/.test(rawSrc) && !/autotable/.test(rawSrc)) {
                state.jsPDFLoaded = !!(w.jspdf && typeof w.jspdf.jsPDF === "function");
              }
              if (/jspdf-autotable(?:\.min)?\.js/.test(rawSrc)) {
                const ctor = w.jspdf && w.jspdf.jsPDF;
                state.autoTableLoaded = !!(ctor && ctor.API && typeof ctor.API.autoTable === "function");
              }
            });
            node.addEventListener("error", () => {
              state.pdfScriptErrors.push(rawSrc);
            });
          }
        } else if (tag === "iframe") {
          state.printFallbackUsed = true;
        }
      }
      return nativeAppendChild.call(this, node);
    };

    w.navigator.clipboard = {
      writeText: async (txt) => {
        state.clipboardText = txt;
      }
    };
    w.navigator.share = async (data) => {
      state.sharedData = data;
    };
    w.open = () => {
      state.popupFallbackUsed = true;
      return {
        document: { write() {}, close() {} },
        focus() {},
        print() { state.printCalled = true; }
      };
    };
  };
}

async function load(pageUrl) {
  const state = {
    errors: [], clipboardText: null, sharedData: null,
    saveCalls: [], pdfBytes: null, pdfSaveError: null,
    pdfScriptAppends: [], pdfScriptLoads: [], pdfScriptErrors: [],
    jsPDFLoaded: false, autoTableLoaded: false, jsPDFSavePatched: false,
    printFallbackUsed: false, popupFallbackUsed: false, printCalled: false
  };
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = e && e.message ? e.message : String(e);
    if (/Could not load (resource|script|link)|Not implemented/i.test(msg)) return;
    state.errors.push("jsdomError: " + msg);
  });
  vc.on("error", (...a) => state.errors.push("console.error: " + a.join(" ")));
  const dom = await JSDOM.fromURL(pageUrl, {
    resources: "usable", runScripts: "dangerously", pretendToBeVisual: true,
    virtualConsole: vc, beforeParse: stubsFor(state)
  });
  await new Promise((r) => setTimeout(r, 220));
  return { dom, state };
}

async function waitForPdfSave(state, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (state.saveCalls.length > 0) return state.saveCalls[state.saveCalls.length - 1];
    if (state.pdfScriptErrors.length) throw new Error("PDF script failed to load: " + state.pdfScriptErrors.join(", "));
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("Timed out waiting for doc.save(); scripts appended=" + JSON.stringify(state.pdfScriptAppends) + ", loads=" + JSON.stringify(state.pdfScriptLoads));
}

function hasAutoTable(dom) {
  const jsPDF = dom.window.jspdf && dom.window.jspdf.jsPDF;
  if (!jsPDF) return false;
  if (jsPDF.API && typeof jsPDF.API.autoTable === "function") return true;
  if (jsPDF.prototype && typeof jsPDF.prototype.autoTable === "function") return true;
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    return typeof doc.autoTable === "function";
  } catch (e) {
    return false;
  }
}

function countPdfScript(state, part) {
  return state.pdfScriptAppends.filter((src) => src.includes(part)).length;
}

function assertRealPdfGeneration(dom, state, save, label) {
  assert.ok(dom.window.jspdf && typeof dom.window.jspdf.jsPDF === "function", label + ": jsPDF was not available");
  assert.ok(state.jsPDFLoaded || state.pdfScriptLoads.some((src) => /jspdf(?:\.min)?\.js/.test(src) && !/autotable/.test(src)), label + ": jsPDF script load was not observed");
  assert.ok(state.autoTableLoaded || hasAutoTable(dom), label + ": AutoTable script load was not observed");
  assert.ok(hasAutoTable(dom), label + ": AutoTable is not installed on jsPDF/doc instances");
  assert.ok(state.jsPDFSavePatched, label + ": jsPDF save hook was not installed before PDF generation");
  assert.ok(save, label + ": doc.save() did not execute");
  assert.ok(save.hasAutoTable, label + ": doc.autoTable was not present at doc.save()");
  assert.ok(/\.pdf$/i.test(save.filename), label + ": filename does not end with .pdf: " + save.filename);
  assert.ok(save.byteLength > 1000, label + ": PDF output too small/non-empty check failed: " + save.byteLength);
  assert.strictEqual(save.header, "%PDF-", label + ": generated data is not a PDF header");
  assert.ok(!state.pdfSaveError, label + ": PDF output failed: " + state.pdfSaveError);
  assert.strictEqual(state.printFallbackUsed, false, label + ": iframe print fallback was used instead of doc.save()");
  assert.strictEqual(state.popupFallbackUsed, false, label + ": popup print fallback was used instead of doc.save()");
  assert.strictEqual(state.printCalled, false, label + ": browser print was called instead of doc.save()");
}

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log("  \u2713 " + name); })
    .catch((e) => { failed++; console.error("  \u2717 " + name + "\n    " + (e && e.stack || e)); });
}

(async () => {
  await startServer();
  const BASE = "http://127.0.0.1:" + PORT + "/";

  /* ── 1. REGRESSION TEST — GPA ─────────────────────────────────────────── */
  await test("GPA Regression: dataset (6 courses, GPA 3.41, 6 courses, 18 credits) & Global Actions", async () => {
    const { dom, state } = await load(BASE + "gpa.html");
    const d = dom.window.document;
    const rowsContainer = d.querySelector("#rows");
    assert.ok(rowsContainer, "#rows not found on gpa.html");

    /* Clear default courses */
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
      const lastRow = crows[crows.length - 1];
      const nameInp = lastRow.querySelector('[data-f="name"]');
      const gradeSel = lastRow.querySelector('[data-f="grade"]');
      const credInp = lastRow.querySelector('[data-f="credits"]');

      nameInp.value = item.name;
      nameInp.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      gradeSel.value = item.grade;
      gradeSel.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      credInp.value = item.credits;
      credInp.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    await new Promise((r) => setTimeout(r, 50));
    const gpaOut = d.querySelector("#gpaOut").textContent.trim();
    const coursesOut = d.querySelector("#mCourses").textContent.trim();
    const creditsOut = d.querySelector("#mCredits").textContent.trim();

    assert.strictEqual(gpaOut, "3.41", "Expected GPA 3.41, got " + gpaOut);
    assert.strictEqual(coursesOut, "6", "Expected Courses 6, got " + coursesOut);
    assert.strictEqual(creditsOut, "18", "Expected Credits 18, got " + creditsOut);

    /* Test Share button */
    const shareBtn = d.querySelector("#shareBtn");
    assert.ok(shareBtn, "#shareBtn missing");
    shareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "navigator.share was not called on #shareBtn click");
    assert.ok(
      state.sharedData.text.includes("Scholarics GPA Calculator") &&
      state.sharedData.text.includes("GPA: 3.41 / 4.0"),
      "Unexpected share text: " + state.sharedData.text
    );
    assert.ok(shareBtn.classList.contains("btn-copied") || shareBtn.textContent.includes("Shared!"), "No visual button feedback on share");

    /* Test Copy Link button */
    const copyLinkBtn = d.querySelector("#copyLinkBtn");
    assert.ok(copyLinkBtn, "#copyLinkBtn missing");
    copyLinkBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.clipboardText, "Clipboard was not written on #copyLinkBtn click");
    assert.ok(state.clipboardText.includes("gpa.html?scale=letter&rows="), "URL does not preserve state: " + state.clipboardText);
    assert.ok(copyLinkBtn.classList.contains("btn-copied") || copyLinkBtn.textContent.includes("Copied"), "No visual button feedback on copy link");

    /* Test State Restoration: open the copied link in a new JSDOM */
    const copiedUrl = state.clipboardText;
    const { dom: resDom, state: resState } = await load(copiedUrl);
    const resD = resDom.window.document;
    assert.strictEqual(resD.querySelector("#gpaOut").textContent.trim(), "3.41", "Restored GPA does not equal 3.41");
    assert.strictEqual(resD.querySelector("#mCourses").textContent.trim(), "6", "Restored Courses does not equal 6");
    assert.strictEqual(resD.querySelector("#mCredits").textContent.trim(), "18", "Restored Credits does not equal 18");
    resDom.window.close();

    /* Test real jsPDF + AutoTable PDF button path (including duplicate concurrent calls) */
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(pdfBtn, "#pdfBtn missing");
    pdfBtn.dispatchEvent(new dom.window.Event("click", { bubbles: true, cancelable: true }));
    pdfBtn.dispatchEvent(new dom.window.Event("click", { bubbles: true, cancelable: true }));
    const pdfSave = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, pdfSave, "GPA PDF");
    assert.strictEqual(countPdfScript(state, "jspdf.min.js"), 1, "Duplicate jsPDF script injected");
    assert.strictEqual(countPdfScript(state, "jspdf-autotable.min.js"), 1, "Duplicate AutoTable script injected");
    assert.ok(pdfSave.text.includes("Scholarics GPA Calculator Report"), "Real PDF missing tool title");
    assert.ok(pdfSave.text.includes("3.41"), "Real PDF missing GPA 3.41");
    assert.ok(pdfSave.text.includes("Calculus I") && pdfSave.text.includes("Digital Logic Design"), "Real PDF missing course rows");

    assert.deepStrictEqual(state.errors, [], "GPA page console errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  /* ── 2. REPRESENTATIVE CALCULATORS ────────────────────────────────────── */
  await test("CGPA Calculator (cgpa.html): Share, Copy Link, State Restoration & PDF", async () => {
    const { dom, state } = await load(BASE + "cgpa.html");
    const d = dom.window.document;
    const shareBtn = d.querySelector("#shareBtn");
    const copyLinkBtn = d.querySelector("#copyLinkBtn");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(shareBtn && copyLinkBtn && pdfBtn, "Buttons missing on cgpa.html");

    shareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "Share failed on cgpa.html");
    assert.ok(state.sharedData.text.includes("Scholarics CGPA Calculator"), "CGPA share title wrong");

    copyLinkBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.clipboardText && state.clipboardText.includes("cgpa.html"), "Copy Link failed on cgpa.html");

    pdfBtn.click();
    const cgpaPdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, cgpaPdf, "CGPA PDF");
    assert.deepStrictEqual(state.errors, [], "CGPA errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("Attendance Calculator (attendance-calculator.html): Share, Copy Link (#attCopyLink), State Restoration & PDF", async () => {
    const { dom, state } = await load(BASE + "attendance-calculator.html?a=20&h=25&r=75");
    const d = dom.window.document;
    const pctOut = d.querySelector("#pct").textContent.trim();
    assert.strictEqual(pctOut, "80%", "Expected attendance pct 80%, got " + pctOut);

    const shareBtn = d.querySelector("#shareBtn");
    const copyLinkBtn = d.querySelector("#attCopyLink");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(shareBtn && copyLinkBtn && pdfBtn, "Buttons missing on attendance-calculator.html");

    shareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "Share failed on attendance-calculator.html");
    assert.ok(state.sharedData.text.includes("80%"), "Attendance share text missing 80%: " + state.sharedData.text);

    copyLinkBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.clipboardText && state.clipboardText.includes("a=20&h=25&r=75"), "Copy Link did not preserve state: " + state.clipboardText);

    pdfBtn.click();
    const attendancePdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, attendancePdf, "Attendance PDF");
    assert.ok(attendancePdf.text.includes("80%"), "Attendance real PDF missing 80%");
    assert.deepStrictEqual(state.errors, [], "Attendance errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("Final Exam Calculator (final-exam-calculator.html): Share (#feShare), Copy Link (#feCopyLink) & PDF", async () => {
    const { dom, state } = await load(BASE + "final-exam-calculator.html?cur=80&goal=90&weight=40");
    const d = dom.window.document;
    const feShare = d.querySelector("#feShare");
    const feCopyLink = d.querySelector("#feCopyLink");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(feShare && feCopyLink && pdfBtn, "Buttons missing on final-exam-calculator.html");

    feShare.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "feShare failed");

    feCopyLink.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.clipboardText && state.clipboardText.includes("cur=80&goal=90&weight=40"), "feCopyLink failed: " + state.clipboardText);

    pdfBtn.click();
    const finalExamPdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, finalExamPdf, "Final Exam PDF");
    assert.deepStrictEqual(state.errors, [], "Final Exam errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("Grade Calculator (grade-calculator.html): Share & PDF", async () => {
    const { dom, state } = await load(BASE + "grade-calculator.html");
    const d = dom.window.document;
    const shareBtn = d.querySelector("#shareBtn");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(shareBtn && pdfBtn, "Buttons missing on grade-calculator.html");

    shareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "Share failed on grade-calculator");

    pdfBtn.click();
    const gradePdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, gradePdf, "Grade Calculator PDF");
    assert.deepStrictEqual(state.errors, [], "Grade Calculator errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("Target GPA Calculator (target-gpa.html): Share & PDF", async () => {
    const { dom, state } = await load(BASE + "target-gpa.html");
    const d = dom.window.document;
    const shareBtn = d.querySelector("#shareBtn");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(shareBtn && pdfBtn, "Buttons missing on target-gpa.html");

    pdfBtn.click();
    const targetPdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, targetPdf, "Target GPA PDF");
    assert.deepStrictEqual(state.errors, [], "Target GPA errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("Percentage to GPA (percentage-to-gpa.html): Share (#p2gShare) & PDF", async () => {
    const { dom, state } = await load(BASE + "percentage-to-gpa.html");
    const d = dom.window.document;
    const inp = d.querySelector("#p2gPct");
    if (inp) {
      inp.value = "85";
      inp.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
    }
    const shareBtn = d.querySelector("#p2gShare");
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(shareBtn && pdfBtn, "Buttons missing on percentage-to-gpa.html");

    shareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.sharedData, "p2gShare failed");

    pdfBtn.click();
    const p2gPdf = await waitForPdfSave(state);
    assertRealPdfGeneration(dom, state, p2gPdf, "Percentage to GPA PDF");
    assert.deepStrictEqual(state.errors, [], "p2g errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  await test("GPA Simulator (gpa-simulator.html): Share/Copy Link (#simShareBtn), CSV & PDF (#simPdfBtn)", async () => {
    const { dom, state } = await load(BASE + "gpa-simulator.html");
    const d = dom.window.document;
    const simShareBtn = d.querySelector("#simShareBtn");
    const simPdfBtn = d.querySelector("#simPdfBtn");
    assert.ok(simShareBtn && simPdfBtn, "Buttons missing on gpa-simulator.html");

    simShareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(state.clipboardText && state.clipboardText.includes("gpa-simulator.html"), "simShareBtn copy link failed");

    simPdfBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    assert.deepStrictEqual(state.errors, [], "GPA Simulator errors: " + JSON.stringify(state.errors));
    dom.window.close();
  });

  /* ── 3. ALL REMAINING CALCULATORS IN PROJECT ──────────────────────────── */
  const restCalculators = [
    "semester-gpa.html",
    "assignment-weight.html",
    "attendance-goal.html",
    "attendance-percentage.html",
    "class-average.html",
    "credit-hour-planner.html",
    "gpa-improvement-planner.html",
    "gpa-to-percentage.html",
    "grade-predictor.html",
    "required-marks.html",
    "study-schedule.html",
    "study-time.html",
    "final-grade.html"
  ];
  for (const page of restCalculators) {
    await test(page + ": Share & PDF work with zero console errors", async () => {
      const { dom, state } = await load(BASE + page);
      const d = dom.window.document;
      const pdfBtn = d.querySelector("#pdfBtn");
      if (pdfBtn) {
        pdfBtn.click();
        const pagePdf = await waitForPdfSave(state);
        assertRealPdfGeneration(dom, state, pagePdf, page + " PDF");
      }
      assert.deepStrictEqual(state.errors, [], page + " errors: " + JSON.stringify(state.errors));
      dom.window.close();
    });
  }

  console.log("\nGlobal Actions: " + passed + " passed, " + failed + " failed");
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); server && server.close(); process.exit(1); });
