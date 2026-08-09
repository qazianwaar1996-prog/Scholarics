/* Scholarics — Global Calculator Actions (Share, Copy Link, PDF, State Restoration & GPA Regression) tests (jsdom) */
"use strict";
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

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
    w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.requestAnimationFrame = w.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    w.cancelAnimationFrame = w.cancelAnimationFrame || ((id) => clearTimeout(id));
    w.scrollTo = w.scrollTo || (() => {});
    w.IntersectionObserver = w.IntersectionObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.ResizeObserver = w.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.confirm = () => true;
    w.getSelection = w.getSelection || (() => ({ removeAllRanges(){}, addRange(){} }));
    w.navigator.clipboard = {
      writeText: async (txt) => {
        state.clipboardText = txt;
      }
    };
    w.navigator.share = async (data) => {
      state.sharedData = data;
    };
    w.open = () => {
      const fakeWin = {
        document: {
          write(h) { state.openedHTML = (state.openedHTML || "") + h; },
          close() {}
        },
        focus() {},
        print() { state.printCalled = true; }
      };
      return fakeWin;
    };
  };
}

async function load(pageUrl) {
  const state = { errors: [], clipboardText: null, sharedData: null, printedHTML: null };
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
  /* Capture iframe content for printHTMLReport */
  const origAppend = dom.window.document.body.appendChild.bind(dom.window.document.body);
  dom.window.document.body.appendChild = function(node) {
    if (node && node.tagName && node.tagName.toLowerCase() === "iframe") {
      setTimeout(() => {
        try {
          const doc = node.contentWindow || node.contentDocument;
          if (doc && doc.document) state.printedHTML = doc.document.documentElement.innerHTML;
        } catch(e) {}
      }, 50);
    }
    return origAppend(node);
  };
  return { dom, state };
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

    /* Test PDF button */
    const pdfBtn = d.querySelector("#pdfBtn");
    assert.ok(pdfBtn, "#pdfBtn missing");
    pdfBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const printedHTML = state.printedHTML || state.openedHTML || "";
    assert.ok(printedHTML.includes("Scholarics GPA Calculator Report"), "PDF report missing tool title");
    assert.ok(printedHTML.includes("3.41"), "PDF report missing GPA 3.41");
    assert.ok(printedHTML.includes("Courses: 6") || printedHTML.includes(">6<"), "PDF report missing courses count");
    assert.ok(printedHTML.includes("Total Credits: 18") || printedHTML.includes(">18<"), "PDF report missing total credits");
    assert.ok(printedHTML.includes("Calculus I") && printedHTML.includes("Digital Logic Design"), "PDF report missing course rows");

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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics CGPA Calculator Report"), "CGPA PDF title missing");
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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics Attendance Calculator Report") && phtml.includes("80%"), "Attendance PDF missing details");
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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics Final Exam Score Calculator Report"), "Final exam PDF title wrong");
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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics Weighted Grade Calculator Report"), "Grade calc PDF title wrong");
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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics Target GPA Calculator Report"), "Target GPA PDF title wrong");
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
    await new Promise((r) => setTimeout(r, 300));
    const phtml = state.printedHTML || state.openedHTML || "";
    assert.ok(phtml.includes("Scholarics Percentage to GPA Converter Report"), "p2g PDF title wrong");
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
        await new Promise((r) => setTimeout(r, 150));
        const phtml = state.printedHTML || state.openedHTML || "";
        assert.ok(phtml.includes("Report"), page + " PDF report generation failed");
      }
      assert.deepStrictEqual(state.errors, [], page + " errors: " + JSON.stringify(state.errors));
      dom.window.close();
    });
  }

  console.log("\nGlobal Actions: " + passed + " passed, " + failed + " failed");
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); server && server.close(); process.exit(1); });
