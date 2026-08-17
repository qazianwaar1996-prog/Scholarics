/* Scholarics — centralised AI quota / kill-switch tests
   (functions/_lib/aiQuota.js + withApi in functions/_lib/http.js)

   Covers the acceptance checklist:
     A  a normal AI request succeeds and reports the remaining allowance
     B  rapid-fire requests hit the short-term AI burst limit
     C  the per-tool daily limit blocks that tool only
     D  the global daily limit blocks every tool
     E  switching AI tools (pages) does not reset the global allowance
     F  an invalid request never consumes quota
     G  a Gemini/upstream failure never consumes quota
     H  the kill switch returns a friendly message and calls no Gemini
     I  the Gemini API key never appears in anything the browser downloads
     J  the restored AI panels are present and mobile-ready

   Each scenario needs different limits, so the suite boots several short-lived
   `wrangler pages dev` servers with per-case bindings and a throwaway state
   directory (so yesterday's counters can never leak into a run).

   Run from the repo root:  node tests/ai-quota.test.js
*/
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log("  \u2713 " + name); })
    .catch((e) => { failed++; console.error("  \u2717 " + name + "\n    " + ((e && e.message) || e)); });
}

/* Friendly copy the visitor is allowed to see — must match _lib/aiQuota.js. */
const MSG = {
  globalLimit: "You've reached today's free AI limit. Your AI access will reset tomorrow. You can continue using the other Scholarics study tools.",
  toolLimit: "You've reached today's free limit for this AI tool. Try again tomorrow.",
  disabled: "AI tools are temporarily unavailable. Please try again later — all other Scholarics study tools are still available.",
  toolOff: "This AI tool is temporarily unavailable. Please try again later — all other Scholarics study tools are still available.",
  tooFast: "You're sending AI requests too quickly. Please wait a moment and try again."
};

/* An unreachable Gemini endpoint: if a handler ever calls upstream we get a
   502, which is exactly how the "no Gemini request was made" checks work. */
const DEAD_GEMINI = "http://127.0.0.1:1/v1beta";

let nextPort = 8790;
const tmpDirs = [];

/** Boot a wrangler pages dev server with the given extra bindings. */
async function startServer(bindings) {
  const port = nextPort++;
  const base = "http://127.0.0.1:" + port;
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "sc-quota-"));
  tmpDirs.push(state);

  const args = ["wrangler", "pages", "dev", ".", "--port", String(port),
    "--persist-to", state, "--compatibility-date=2024-11-01"];
  Object.keys(bindings).forEach((k) => { args.push("--binding", k + "=" + bindings[k]); });

  const proc = spawn("npx", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  proc.stdout.on("data", (d) => { log += d; });
  proc.stderr.on("data", (d) => { log += d; });

  const deadline = Date.now() + 90000;
  for (;;) {
    if (proc.exitCode !== null) throw new Error("wrangler exited early (" + proc.exitCode + "):\n" + log.slice(-800));
    try {
      const res = await fetch(base + "/api/ai/health");
      if (res.ok) break;
    } catch (e) { /* not up yet */ }
    if (Date.now() > deadline) throw new Error("wrangler did not start on port " + port + ":\n" + log.slice(-800));
    await new Promise((r) => setTimeout(r, 400));
  }

  return {
    base: base,
    stop: function () {
      try { process.kill(-proc.pid, "SIGTERM"); } catch (e) {}
      setTimeout(() => { try { process.kill(-proc.pid, "SIGKILL"); } catch (e) {} }, 2000).unref();
    },
    /** POST as an anonymous visitor (the browser id js/script.js writes). */
    post: function (route, body, visitor) {
      const headers = { "Content-Type": "application/json" };
      if (visitor) headers["X-SC-Visitor"] = visitor;
      return fetch(base + route, { method: "POST", headers: headers, body: JSON.stringify(body || {}) });
    }
  };
}

let vidSeq = 0;
/** A fresh anonymous visitor id — unique per run so KV state can never bleed. */
function visitor(tag) {
  vidSeq++;
  return "t" + Date.now().toString(36) + tag.replace(/[^a-z0-9]/gi, "") + vidSeq;
}

const MOCK = { AI_MOCK: "1", GEMINI_API_KEY: "mock" };
const PAYLOAD = {
  quiz: { topic: "Photosynthesis", count: 3 },
  flashcards: { topic: "Cell biology", count: 4 },
  chat: { messages: [{ role: "user", content: "Explain osmosis" }] },
  paraphrase: { prompt: "Rewrite: the mitochondrion produces energy." },
  "study-plan": { subject: "Calculus", timeframe: "2 weeks" },
  coach: {
    scaleId: "us40", target: 3.5,
    semesters: [{ name: "S1", courses: [{ name: "Maths", grade: "A", credits: 3 }] }]
  }
};

function num(res, header) {
  const v = res.headers.get(header);
  return v === null || v === "" ? null : parseInt(v, 10);
}

(async () => {
  const servers = [];
  try {
    /* ── Server 1: generous burst + IP headroom, so the DAILY quotas are the
          only thing under test. AI_DISABLED_TOOLS exercises the per-tool
          switch without needing another server. ─────────────────────────── */
    console.error("[ai-quota] booting quota server...");
    const q = await startServer(Object.assign({}, MOCK, {
      RATE_LIMIT: "10000", AI_RATE_LIMIT: "10000", AI_IP_MULTIPLIER: "1000",
      AI_QUOTA_SALT: "test-salt", AI_DISABLED_TOOLS: "coach"
    }));
    servers.push(q);

    /* A — normal request succeeds */
    await test("A: a normal AI request succeeds and reports the remaining free runs", async () => {
      const v = visitor("normal");
      const res = await q.post("/api/ai/quiz", PAYLOAD.quiz, v);
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(Array.isArray(j.quiz) && j.quiz.length, "no quiz returned");
      assert.strictEqual(num(res, "X-AI-Quota-Tool"), 3, "quiz daily limit should be 3");
      assert.strictEqual(num(res, "X-AI-Quota-Tool-Remaining"), 2);
      assert.strictEqual(num(res, "X-AI-Quota-Global"), 10, "global daily limit should be 10");
      assert.strictEqual(num(res, "X-AI-Quota-Global-Remaining"), 9);
    });

    /* C — per-tool daily limit */
    await test("C: the per-tool daily limit blocks that tool after 3 flashcard runs", async () => {
      const v = visitor("tool");
      for (let i = 0; i < 3; i++) {
        const ok = await q.post("/api/ai/flashcards", PAYLOAD.flashcards, v);
        assert.strictEqual(ok.status, 200, "flashcards run " + (i + 1) + " should succeed");
      }
      const blocked = await q.post("/api/ai/flashcards", PAYLOAD.flashcards, v);
      assert.strictEqual(blocked.status, 429);
      const j = await blocked.json();
      assert.strictEqual(j.error, MSG.toolLimit, "wrong copy: " + j.error);
      assert.ok(j.quota && j.quota.scope === "tool" && j.quota.exhausted, "quota scope not reported");
      assert.strictEqual(num(blocked, "X-AI-Quota-Tool-Remaining"), 0);
    });

    await test("C2: a different AI tool still works after one tool is exhausted", async () => {
      const v = visitor("toolsep");
      for (let i = 0; i < 3; i++) await q.post("/api/ai/flashcards", PAYLOAD.flashcards, v);
      const blocked = await q.post("/api/ai/flashcards", PAYLOAD.flashcards, v);
      assert.strictEqual(blocked.status, 429, "flashcards should be exhausted");
      const other = await q.post("/api/ai/quiz", PAYLOAD.quiz, v);
      assert.strictEqual(other.status, 200, "quiz must have its own allowance");
    });

    /* D + E — global cap across tools / pages */
    await test("D+E: 10 successful runs exhaust the global allowance for every tool", async () => {
      const v = visitor("global");
      for (let i = 0; i < 5; i++) {
        const r = await q.post("/api/ai/chat", PAYLOAD.chat, v);
        assert.strictEqual(r.status, 200, "chat run " + (i + 1));
      }
      for (let i = 0; i < 5; i++) {
        const r = await q.post("/api/ai/paraphrase", PAYLOAD.paraphrase, v);
        assert.strictEqual(r.status, 200, "paraphrase run " + (i + 1));
      }
      /* Quiz has an untouched per-tool allowance, so only the global cap can
         stop it — i.e. moving to another AI page grants nothing. */
      const blocked = await q.post("/api/ai/quiz", PAYLOAD.quiz, v);
      assert.strictEqual(blocked.status, 429);
      const j = await blocked.json();
      assert.strictEqual(j.error, MSG.globalLimit, "wrong copy: " + j.error);
      assert.ok(j.quota && j.quota.scope === "global", "global scope not reported");
      assert.strictEqual(num(blocked, "X-AI-Quota-Global-Remaining"), 0);

      const alsoBlocked = await q.post("/api/ai/study-plan", PAYLOAD["study-plan"], v);
      assert.strictEqual(alsoBlocked.status, 429, "study plan must be blocked too");
      assert.strictEqual((await alsoBlocked.json()).error, MSG.globalLimit);
    });

    /* F — validation failures are free */
    await test("F: invalid requests never consume quota", async () => {
      const v = visitor("invalid");
      for (let i = 0; i < 12; i++) {
        const r = await q.post("/api/ai/quiz", {}, v); /* no topic and no text */
        assert.strictEqual(r.status, 400, "invalid request " + (i + 1) + " should be 400");
      }
      /* 12 rejects is beyond both the tool (3) and global (10) allowance —
         if any of them had been charged this would now be a 429. */
      const good = await q.post("/api/ai/quiz", PAYLOAD.quiz, v);
      assert.strictEqual(good.status, 200, "quota was charged for invalid input");
      assert.strictEqual(num(good, "X-AI-Quota-Tool-Remaining"), 2, "full allowance should have been intact");
      assert.strictEqual(num(good, "X-AI-Quota-Global-Remaining"), 9);
    });

    /* Per-tool kill switch (AI_DISABLED_TOOLS=coach on this server) */
    await test("H2: a per-tool switch disables just that tool, with friendly copy", async () => {
      const v = visitor("tooloff");
      const off = await q.post("/api/ai/coach", PAYLOAD.coach, v);
      assert.strictEqual(off.status, 503);
      const j = await off.json();
      assert.strictEqual(j.error, MSG.toolOff, "wrong copy: " + j.error);
      assert.strictEqual(j.aiDisabled, true);
      const on = await q.post("/api/ai/quiz", PAYLOAD.quiz, v);
      assert.strictEqual(on.status, 200, "other tools must stay available");
    });

    await test("health endpoint reports AI as available while the switch is on", async () => {
      const j = await (await fetch(q.base + "/api/ai/health")).json();
      assert.strictEqual(j.ok, true);
      assert.strictEqual(j.aiAvailable, true);
    });

    /* ── Server 2: tight burst limit ────────────────────────────────────── */
    console.error("[ai-quota] booting burst-limit server...");
    const burst = await startServer(Object.assign({}, MOCK, {
      RATE_LIMIT: "10000", AI_RATE_LIMIT: "3", AI_RATE_WINDOW_MS: "60000",
      AI_DAILY_QUIZ: "1000", AI_DAILY_GLOBAL: "1000", AI_IP_MULTIPLIER: "1000",
      AI_QUOTA_SALT: "test-salt"
    }));
    servers.push(burst);

    /* B — short-term rate limit */
    await test("B: rapid AI requests are throttled by the per-minute burst limit", async () => {
      const v = visitor("burst");
      const results = [];
      for (let i = 0; i < 6; i++) {
        const r = await burst.post("/api/ai/quiz", PAYLOAD.quiz, v);
        results.push({ status: r.status, body: await r.json(), retry: r.headers.get("Retry-After") });
      }
      const ok = results.filter((r) => r.status === 200);
      const throttled = results.filter((r) => r.status === 429);
      assert.ok(ok.length >= 1, "no request got through");
      assert.ok(throttled.length >= 2, "burst limit did not trigger: " + JSON.stringify(results.map((r) => r.status)));
      assert.strictEqual(throttled[0].body.error, MSG.tooFast, "wrong copy: " + throttled[0].body.error);
      assert.strictEqual(throttled[0].retry, "60", "Retry-After header missing");
    });

    await test("B2: the AI burst limit does not throttle non-AI endpoints", async () => {
      /* The AI limiter is an addition to the general per-IP protection, not a
         replacement — the previous test just exhausted the AI burst budget for
         this IP, and the calculators' own API must keep answering. */
      const res = await fetch(burst.base + "/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops"
      });
      assert.strictEqual(res.status, 400, "non-AI endpoint was caught by the AI limiter (" + res.status + ")");
    });

    /* ── Server 3: IP allowance (browser id alone is not trusted) ───────── */
    console.error("[ai-quota] booting shared-IP server...");
    const ipsrv = await startServer(Object.assign({}, MOCK, {
      RATE_LIMIT: "10000", AI_RATE_LIMIT: "10000", AI_IP_MULTIPLIER: "1",
      AI_DAILY_GLOBAL: "3", AI_DAILY_QUIZ: "3", AI_QUOTA_SALT: "test-salt"
    }));
    servers.push(ipsrv);

    await test("clearing the browser id does not grant a fresh allowance (IP is counted too)", async () => {
      for (let i = 0; i < 3; i++) {
        const r = await ipsrv.post("/api/ai/quiz", PAYLOAD.quiz, visitor("rotate"));
        assert.strictEqual(r.status, 200, "run " + (i + 1) + " should succeed");
      }
      const blocked = await ipsrv.post("/api/ai/quiz", PAYLOAD.quiz, visitor("rotate"));
      assert.strictEqual(blocked.status, 429, "a brand-new browser id bypassed the IP allowance");
      assert.strictEqual((await blocked.json()).error, MSG.globalLimit);
    });

    await test("a request with no browser id at all is still counted", async () => {
      const r = await ipsrv.post("/api/ai/flashcards", PAYLOAD.flashcards, null);
      /* the IP allowance was already spent by the previous test */
      assert.strictEqual(r.status, 429, "anonymous request escaped the daily cap");
    });

    /* ── Server 4: upstream Gemini failure (unreachable endpoint) ───────── */
    console.error("[ai-quota] booting upstream-failure server...");
    const dead = await startServer({
      GEMINI_API_KEY: "not-a-real-key", GEMINI_API_BASE: DEAD_GEMINI,
      RATE_LIMIT: "10000", AI_RATE_LIMIT: "10000", AI_IP_MULTIPLIER: "1000",
      AI_QUOTA_SALT: "test-salt"
    });
    servers.push(dead);

    /* G — upstream/server errors are free */
    await test("G: a Gemini failure never consumes quota and never leaks details", async () => {
      const v = visitor("upstream");
      let last = null;
      for (let i = 0; i < 12; i++) {
        const r = await dead.post("/api/ai/quiz", PAYLOAD.quiz, v);
        last = { status: r.status, body: await r.json() };
        assert.ok(last.status >= 500, "expected an upstream failure, got " + last.status);
      }
      /* 12 failures is past both the tool and global allowance — a 429 here
         would mean failed generations had been charged. */
      assert.ok(last.status !== 429, "quota was charged for a failed generation");
      const text = JSON.stringify(last.body);
      assert.ok(text.indexOf("127.0.0.1") === -1, "upstream endpoint leaked");
      assert.ok(!/GEMINI|api[_-]?key|generativelanguage|workerd|at .*\.js:/i.test(text),
        "backend detail leaked to the client: " + text);
    });

    /* ── Server 5: global kill switch ───────────────────────────────────── */
    console.error("[ai-quota] booting kill-switch server...");
    const off = await startServer({
      AI_GLOBAL_ENABLED: "0", GEMINI_API_KEY: "not-a-real-key", GEMINI_API_BASE: DEAD_GEMINI,
      RATE_LIMIT: "10000", AI_QUOTA_SALT: "test-salt"
    });
    servers.push(off);

    /* H — kill switch */
    await test("H: the kill switch closes every AI endpoint without calling Gemini", async () => {
      const routes = ["chat", "paraphrase", "study-plan", "coach", "flashcards", "quiz"];
      for (const route of routes) {
        const r = await off.post("/api/ai/" + route, PAYLOAD[route], visitor("off"));
        /* If Gemini had been called, the unreachable endpoint would surface a
           502 instead of the friendly 503. */
        assert.strictEqual(r.status, 503, route + " returned " + r.status);
        const j = await r.json();
        assert.strictEqual(j.error, MSG.disabled, route + " copy: " + j.error);
        assert.strictEqual(j.aiDisabled, true, route + " missing aiDisabled flag");
      }
    });

    await test("H3: health reports AI as unavailable while the kill switch is off", async () => {
      const j = await (await fetch(off.base + "/api/ai/health")).json();
      assert.strictEqual(j.ok, true);
      assert.strictEqual(j.aiAvailable, false);
    });

    /* ── Server 6: missing Gemini configuration ─────────────────────────── */
    console.error("[ai-quota] booting missing-config server...");
    const missing = await startServer({
      RATE_LIMIT: "10000", AI_RATE_LIMIT: "10000", AI_IP_MULTIPLIER: "1000",
      AI_QUOTA_SALT: "test-salt"
    });
    servers.push(missing);

    await test("missing key is reported safely by health and every AI endpoint", async () => {
      const health = await (await fetch(missing.base + "/api/ai/health")).json();
      assert.strictEqual(health.aiAvailable, false);
      assert.strictEqual(health.gemini.configured, false);
      assert.strictEqual(health.gemini.model, "gemini-3.6-flash");
      const routes = ["chat", "paraphrase", "study-plan", "coach", "flashcards", "quiz"];
      for (const route of routes) {
        const r = await missing.post("/api/ai/" + route, PAYLOAD[route], visitor("missing"));
        assert.strictEqual(r.status, 503, route + " returned " + r.status);
        const j = await r.json();
        assert.strictEqual(j.code, "AI_NOT_CONFIGURED");
        const text = JSON.stringify(j);
        assert.ok(!/stack|GEMINI_API_KEY|api[_-]?key|at .*\.js:/i.test(text), route + " leaked details: " + text);
      }
    });

    /* ── I: nothing the browser downloads contains the key ──────────────── */
    await test("I: the Gemini API key is absent from every client-side file", async () => {
      const files = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === "node_modules" || entry.name === ".git" ||
              entry.name === ".wrangler" || entry.name === "functions" || entry.name === "tests") continue;
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (/\.(html|js|css|json)$/i.test(entry.name)) files.push(p);
        }
      };
      walk(ROOT);
      assert.ok(files.length > 50, "expected to scan the whole site, found " + files.length);
      const offenders = [];
      for (const f of files) {
        const src = fs.readFileSync(f, "utf8");
        if (/GEMINI_API_KEY|generativelanguage\.googleapis\.com|AIza[0-9A-Za-z_-]{20,}/.test(src)) {
          offenders.push(path.relative(ROOT, f));
        }
      }
      assert.deepStrictEqual(offenders, [], "client files reference the AI provider/key: " + offenders.join(", "));
    });

    /* ── J: restored panels exist and are mobile-ready ──────────────────── */
    await test("J: the restored AI panels are present, unhidden and responsive", async () => {
      const pages = {
        "ai.html": ["chat-messages", "chat-textarea", "chat-send-btn"],
        "paraphraser.html": ["db-cols"],
        "flashcards.html": ["fcDeckListView", "fcAiTopic", "fcAiGenerate"],
        "ai-quiz-generator.html": ["qzTopic", "qzGenerate", "qzResult"],
        "study-schedule.html": ["spGoal", "spGenerate", "spPlan"]
      };
      for (const page of Object.keys(pages)) {
        const html = fs.readFileSync(path.join(ROOT, page), "utf8");
        for (const id of pages[page]) {
          assert.ok(html.indexOf(id) !== -1, page + " is missing " + id);
        }
        assert.ok(/name="viewport"[^>]*width=device-width/.test(html), page + " lost its viewport meta");
        /* Responsive rules live either inline or in the page's own bundles. */
        let css = html;
        for (const m of html.matchAll(/href="(assets\/css\/[^"]+\.css)"/g)) {
          const f = path.join(ROOT, m[1]);
          if (fs.existsSync(f)) css += fs.readFileSync(f, "utf8");
        }
        assert.ok(/@media[^{]*max-width/i.test(css), page + " has no responsive rules");
        /* the free tool must not be replaced by an upsell */
        assert.ok(!/window\.location\s*(\.href)?\s*=\s*['"]premium\.html/.test(html),
          page + " still redirects to premium.html");
        assert.ok(!/Unlimited AI/i.test(html), page + " advertises unlimited AI");
        /* SEO essentials survive */
        assert.ok(/<link[^>]+rel="canonical"/.test(html), page + " lost its canonical link");
        assert.ok(/<meta[^>]+name="description"/.test(html), page + " lost its meta description");
      }
    });

    await test("every AI endpoint routes through the one central quota helper", async () => {
      const dir = path.join(ROOT, "functions/api/ai");
      for (const f of fs.readdirSync(dir)) {
        if (f === "health.js") continue;
        const src = fs.readFileSync(path.join(dir, f), "utf8");
        assert.ok(/aiTool:\s*'[a-z-]+'/.test(src), f + " does not declare an aiTool for withApi()");
        assert.ok(src.indexOf("aiQuota.js") === -1, f + " re-implements quota logic instead of using withApi()");
      }
    });
  } finally {
    servers.forEach((s) => s.stop());
    tmpDirs.forEach((d) => { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} });
  }

  console.log("\nAI quota: " + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); process.exit(1); });
