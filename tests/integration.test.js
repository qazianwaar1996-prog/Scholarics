/* Scholarics — GPA Simulator site-integration tests (jsdom)
   Verifies the simulator is registered across the whole site:
   homepage, All Calculators directory, related-tools grids, footers,
   search registries, sitemap, service-worker pre-cache, AI Tutor context,
   and that key pages still load with zero console errors. */
"use strict";
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const PORT = 8936;
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

function stubsFor(opts) {
  const state = { errors: [] };
  return (w) => {
    w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.requestAnimationFrame = w.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    w.cancelAnimationFrame = w.cancelAnimationFrame || ((id) => clearTimeout(id));
    w.scrollTo = w.scrollTo || (() => {});
    w.IntersectionObserver = w.IntersectionObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.ResizeObserver = w.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} };
    w.confirm = () => true;
    w.getSelection = w.getSelection || (() => ({ removeAllRanges(){}, addRange(){} }));
    try { Object.defineProperty(w.navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } }); } catch (e) {}
    w.fetch = w.fetch || (() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    w.URL.createObjectURL = () => "blob:x";
    w.URL.revokeObjectURL = () => {};
    w.open = () => ({ document: { write(){}, close(){} }, focus(){}, print(){} });
  };
}

async function load(page) {
  const state = { errors: [] };
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = e && e.message ? e.message : String(e);
    if (/Could not load (resource|script|link)|Not implemented/i.test(msg)) return;
    state.errors.push("jsdomError: " + msg);
  });
  vc.on("error", (...a) => state.errors.push("console.error: " + a.join(" ")));
  const dom = await JSDOM.fromURL("http://127.0.0.1:" + PORT + "/" + page, {
    resources: "usable", runScripts: "dangerously", pretendToBeVisual: true,
    virtualConsole: vc, beforeParse: stubsFor()
  });
  await new Promise((r) => setTimeout(r, 180));
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

  /* ── Pages that must link to the simulator (homepage, directory, related) ── */
  const linkPages = [
    "index.html", "academic-resources.html",
    "gpa.html", "cgpa.html", "target-gpa.html", "semester-gpa.html",
    "gpa-improvement-planner.html", "gpa-converter.html",
    "percentage-to-gpa.html", "gpa-to-percentage.html",
    "gpa-help-center.html", "study-guides.html", "404.html", "ai.html"
  ];
  for (const page of linkPages) {
    await test(page + " links to gpa-simulator.html, zero console errors", async () => {
      const { dom, state } = await load(page);
      const d = dom.window.document;
      const link = d.querySelector('a[href="gpa-simulator.html"]');
      assert.ok(link, "no link to gpa-simulator.html on " + page);
      assert.ok(link.textContent.trim().length > 0, "link has no text on " + page);
      assert.deepStrictEqual(state.errors, [], page + " console errors: " + JSON.stringify(state.errors));
      dom.window.close();
    });
  }

  /* ── Homepage tile & chip ─────────────────────────────────────────────── */
  await test("homepage: GPA Simulator tile in Explore Our Tools", async () => {
    const { dom } = await load("index.html");
    const d = dom.window.document;
    const tile = d.querySelector('.sc2-tools a[href="gpa-simulator.html"]');
    assert.ok(tile, "homepage tile missing");
    assert.ok(tile.querySelector("h3"), "tile heading missing");
    const chip = d.querySelector('.sc2-chips a[href="gpa-simulator.html"]');
    assert.ok(chip, "popular-search chip missing");
    dom.window.close();
  });

  /* ── All Calculators directory card ──────────────────────────────────── */
  await test("academic-resources: GPA Simulator card in GPA & Grades grid", async () => {
    const { dom } = await load("academic-resources.html");
    const d = dom.window.document;
    const card = d.querySelector('.tools-grid a[href="gpa-simulator.html"]');
    assert.ok(card, "directory card missing");
    assert.ok(card.classList.contains("tool"), "card not styled as a tool");
    const search = d.querySelector("#resourceSearch");
    if (search) {
      search.value = "gpa simulator";
      search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      assert.strictEqual(card.style.display, "", "card hidden by directory search");
    }
    dom.window.close();
  });

  /* ── Footer across all pages ─────────────────────────────────────────── */
  await test("every footer-bearing page links the simulator in its footer", () => {
    const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
    let footed = 0, checked = 0;
    for (const p of pages) {
      const s = fs.readFileSync(path.join(ROOT, p), "utf8");
      const hasFooter = s.indexOf("<footer") !== -1;
      const hasGpa = s.indexOf('<a href="gpa.html">GPA Calculator</a>') !== -1;
      if (!hasFooter || !hasGpa) continue;
      checked++;
      const footerIdx = s.indexOf("<footer");
      const footerSub = s.slice(footerIdx);
      const gpaIdx = footerSub.indexOf('<a href="gpa.html">GPA Calculator</a>');
      const simIdx = footerSub.indexOf('<a href="gpa-simulator.html">GPA Simulator</a>');
      assert.ok(simIdx !== -1 && gpaIdx !== -1 && simIdx > gpaIdx, p + ": footer missing simulator link (or out of order)");
      footed++;
    }
    assert.ok(footed >= 50, "expected ~52 footer insertions, got " + footed);
    assert.ok(checked >= 50, "sanity: expected ~52 footer-capable pages, got " + checked);
  });

  /* ── Search registries ───────────────────────────────────────────────── */
  await test("search registries include the simulator", () => {
    for (const f of ["js/sc-v2-features.js", "js/personalization.js", "js/dashboard.js"]) {
      const s = fs.readFileSync(path.join(ROOT, f), "utf8");
      assert.ok(s.indexOf("gpa-simulator.html") !== -1, f + " missing entry");
    }
    const v2 = fs.readFileSync(path.join(ROOT, "js/sc-v2-features.js"), "utf8");
    assert.ok(/tags: 'gpa simulate/.test(v2), "sc-v2 search tags missing");
    const pers = fs.readFileSync(path.join(ROOT, "js/personalization.js"), "utf8");
    assert.ok(/slug:'gpa-simulator'/.test(pers), "personalization slug missing");
  });

  await test("site search finds the simulator (sc-v2 doSearch behaviour)", async () => {
    const { dom } = await load("index.html");
    const w = dom.window, d = w.document;
    const input = d.querySelector("#sc2Search");
    assert.ok(input, "search input missing on homepage");
    input.value = "simulat";
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    const dropdown = d.querySelector(".sc2-dropdown");
    assert.ok(dropdown, "search dropdown did not open");
    const hit = dropdown.querySelector('a[href="gpa-simulator.html"]');
    assert.ok(hit, "simulator not returned by search for 'simulat'");
    dom.window.close();
  });

  /* ── SEO: sitemap + meta ─────────────────────────────────────────────── */
  await test("sitemap.xml contains the simulator URL", () => {
    const s = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    assert.ok(s.indexOf("https://scholarics.com/gpa-simulator.html") !== -1, "sitemap missing URL");
  });

  await test("simulator page has SEO + mobile meta", async () => {
    const { dom } = await load("gpa-simulator.html");
    const d = dom.window.document;
    assert.ok(d.querySelector('meta[name="description"]'), "missing meta description");
    assert.ok(d.querySelector('link[rel="canonical"][href="https://scholarics.com/gpa-simulator.html"]'), "canonical wrong");
    assert.ok(d.querySelector('meta[name="viewport"]'), "missing viewport meta");
    assert.ok(d.querySelector('script[type="application/ld+json"]'), "missing structured data");
    assert.ok(d.querySelector(".skip-link"), "missing skip link");
    dom.window.close();
  });

  /* ── Service worker pre-cache ────────────────────────────────────────── */
  await test("service worker pre-caches the simulator shell", () => {
    const s = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
    const list = s.slice(s.indexOf("var SHELL_ASSETS"), s.indexOf("];", s.indexOf("var SHELL_ASSETS")));
    assert.ok(list.indexOf("'/gpa-simulator.html'") !== -1, "sw.js does not pre-cache /gpa-simulator.html");
    /* the simulator's CSS/JS ship inside fingerprinted bundles — every bundle the
       page loads must be pre-cached for the tool to work offline */
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/assets.manifest.json"), "utf8"));
    const page = man.pages["gpa-simulator.html"];
    assert.ok(page.js.indexOf("js/gpa-simulator.js") !== -1, "gpa-simulator.js not bundled");
    assert.ok(page.js.indexOf("js/gpa-simulator-core.js") !== -1, "gpa-simulator-core.js not bundled");
    for (const kind of ["css", "js"]) {
      for (const name of page.bundles[kind]) {
        const re = new RegExp("'/assets/" + kind + "/" + name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&") + "\\.[0-9a-f]{8}\\." + kind + "'");
        assert.ok(re.test(list), "sw.js does not pre-cache bundle " + name);
      }
    }
  });

  /* ── AI Tutor context ────────────────────────────────────────────────── */
  await test("AI Tutor context map includes the simulator", () => {
    const s = fs.readFileSync(path.join(ROOT, "js/ai-assistant.js"), "utf8");
    assert.ok(s.indexOf("'gpa-simulator.html':") !== -1, "ai-assistant.js missing context");
  });

  /* ── No duplicate IDs on the simulator page ──────────────────────────── */
  await test("simulator page has no duplicate element IDs", async () => {
    const { dom } = await load("gpa-simulator.html");
    const d = dom.window.document;
    const ids = Array.from(d.querySelectorAll("[id]")).map((el) => el.id);
    assert.strictEqual(new Set(ids).size, ids.length, "duplicate ids: " + JSON.stringify(ids.filter((id, i) => ids.indexOf(id) !== i)));
    dom.window.close();
  });

  console.log("\nIntegration: " + passed + " passed, " + failed + " failed");
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); server && server.close(); process.exit(1); });
