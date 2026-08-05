/* Scholarics — GPA Simulator backend tests (Cloudflare Pages Functions)
   Spawns `wrangler pages dev` with the AI in mock mode (no real Gemini),
   then exercises /api/ai/coach plus regressions on /api/ai/study-plan and
   /api/ai/health. Run from the repo root:
     node tests/backend.test.js
*/
"use strict";
const assert = require("assert");
const { spawn } = require("child_process");
const path = require("path");

const PORT = 8788;
const BASE = "http://127.0.0.1:" + PORT;
const ROOT = path.join(__dirname, "..");

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn)
    .then(() => { passed++; console.log("  \u2713 " + name); })
    .catch((e) => { failed++; console.error("  \u2717 " + name + "\n    " + (e && e.message || e)); });
}

async function waitForServer(proc, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error("wrangler exited early: " + proc.exitCode);
    try {
      const res = await fetch(BASE + "/api/ai/health");
      if (res.ok) return;
    } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("wrangler did not start within " + ms + "ms");
}

function post(p, body) {
  return fetch(BASE + p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const VALID_PAYLOAD = {
  scaleId: "us40",
  target: 3.5,
  semesters: [
    {
      name: "Semester 1",
      courses: [
        { name: "English 101", grade: "A", credits: 3 },
        { name: "Calculus I", grade: "B+", credits: 4 },
        { name: "History 101", grade: "A-", credits: 3 }
      ]
    }
  ]
};

async function portFree(ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + "/api/ai/health");
      if (res.ok) throw new Error("port " + PORT + " is already serving a wrangler — kill the orphan and rerun");
    } catch (e) {
      if (e.message.indexOf("already serving") !== -1) throw e;
      return; /* connection refused — port free */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("could not confirm port " + PORT + " is free");
}

(async () => {
  console.error("[backend] starting wrangler pages dev (AI mock mode)...");
  await portFree(5000);
  const proc = spawn("npx", ["wrangler", "pages", "dev", ".", "--port", String(PORT),
    "--binding", "AI_MOCK=1", "--binding", "GEMINI_API_KEY=mock",
    "--binding", "RATE_LIMIT=1000", /* the suite makes ~15 requests */
    "--compatibility-date=2024-11-01"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  proc.stdout.on("data", (d) => { log += d; });
  proc.stderr.on("data", (d) => { log += d; });

  try {
    await waitForServer(proc, 90000);

    await test("health endpoint reports mock mode", async () => {
      const res = await fetch(BASE + "/api/ai/health");
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.strictEqual(j.ok, true);
      assert.strictEqual(j.mock, true);
    });

    await test("coach returns structured report (200)", async () => {
      const res = await post("/api/ai/coach", VALID_PAYLOAD);
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(j.coach, "no coach object");
      assert.ok(Array.isArray(j.coach.strengths) && j.coach.strengths.length, "no strengths");
      assert.ok(Array.isArray(j.coach.weaknesses) && j.coach.weaknesses.length, "no weaknesses");
      assert.ok(j.coach.progress && typeof j.coach.progress.pct === "number", "no progress");
      assert.ok(Array.isArray(j.coach.priorities) && j.coach.priorities.length, "no priorities");
      assert.ok(Array.isArray(j.coach.weeklyPlan) && j.coach.weeklyPlan.length === 7, "weekly plan not 7 days");
      assert.ok(j.coach.advice && j.coach.advice.length > 10, "no advice");
      /* mock echoes the analytics we computed */
      assert.ok(Math.abs(j.coach.progress.current - 3.63) < 0.01, "current mismatch: " + JSON.stringify(j.coach.progress));
      /* the Gemini key must never appear in responses */
      assert.ok(JSON.stringify(j).indexOf("GEMINI") === -1, "key leaked in response");
    });

    await test("coach accepts 10.0 scale and numeric grades", async () => {
      const res = await post("/api/ai/coach", {
        scaleId: "in10",
        target: 9,
        semesters: [{ name: "S1", courses: [{ name: "Math", grade: "8.5", credits: 3 }, { name: "CS", grade: "9.5", credits: 3 }] }]
      });
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(Math.abs(j.coach.progress.current - 9.0) < 0.01, JSON.stringify(j.coach.progress));
      assert.ok(Math.abs(j.coach.progress.target - 9) < 0.01);
    });

    await test("coach with unknown scale id falls back to 4.0", async () => {
      const res = await post("/api/ai/coach", Object.assign({}, VALID_PAYLOAD, { scaleId: "bogus!" }));
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(Math.abs(j.coach.progress.current - 3.63) < 0.01);
    });

    await test("coach rejects empty semesters (400)", async () => {
      const res = await post("/api/ai/coach", { scaleId: "us40", target: 3.5, semesters: [] });
      assert.strictEqual(res.status, 400);
      const j = await res.json();
      assert.ok(j.error && j.error.length > 0);
    });

    await test("coach rejects missing body fields (400)", async () => {
      const res = await post("/api/ai/coach", {});
      assert.strictEqual(res.status, 400);
    });

    await test("coach rejects courses with zero credits (400)", async () => {
      const res = await post("/api/ai/coach", {
        scaleId: "us40", target: 3.5,
        semesters: [{ name: "S1", courses: [{ name: "X", grade: "A", credits: 0 }] }]
      });
      assert.strictEqual(res.status, 400);
    });

    await test("coach caps oversized semesters/courses without crashing", async () => {
      const big = {
        scaleId: "us40", target: 3.5,
        semesters: Array.from({ length: 40 }, (_, i) => ({
          name: "S" + i,
          courses: Array.from({ length: 50 }, (_, j) => ({ name: "C" + j, grade: "A", credits: 3 }))
        }))
      };
      const res = await post("/api/ai/coach", big);
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(j.coach && j.coach.weeklyPlan.length === 7);
    });

    await test("coach rejects garbage JSON body (400)", async () => {
      const res = await fetch(BASE + "/api/ai/coach", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops"
      });
      assert.strictEqual(res.status, 400);
    });

    await test("coach GET is not a usable route (>= 400)", async () => {
      /* local wrangler reports 404 or 500 depending on version — either way
         the route is POST-only and must never serve a GET */
      const res = await fetch(BASE + "/api/ai/coach");
      assert.ok(res.status >= 400, "status " + res.status);
    });

    /* ── Regressions on existing endpoints ─────────────────────────────── */
    await test("study-plan endpoint still works (regression)", async () => {
      const res = await post("/api/ai/study-plan", { subject: "Calculus", timeframe: "2 weeks" });
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(j.plan && j.plan.length > 0, "no plan text");
      /* mock echoes the request; plan must never leak the key */
      assert.ok(JSON.stringify(j).indexOf("GEMINI") === -1);
    });

    await test("chat endpoint still works (regression)", async () => {
      const res = await post("/api/ai/chat", { messages: [{ role: "user", content: "Hi" }] });
      assert.strictEqual(res.status, 200);
      const j = await res.json();
      assert.ok(j.reply && j.reply.length > 0);
    });

    await test("static page is served by wrangler", async () => {
      const res = await fetch(BASE + "/gpa-simulator.html");
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert.ok(html.indexOf("GPA Simulator") !== -1);
      assert.ok(html.indexOf("gpa-simulator-core.js") !== -1);
    });
  } finally {
    /* kill the whole process group so workerd children never orphan */
    try { process.kill(-proc.pid, "SIGTERM"); } catch (e) {}
    setTimeout(() => { try { process.kill(-proc.pid, "SIGKILL"); } catch (e) {} }, 2500).unref();
  }

  console.log("\nBackend: " + passed + " passed, " + failed + " failed");
  if (log.indexOf("Error") !== -1) console.error("[wrangler log tail]\n" + log.slice(-1500));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS FAIL", e); process.exit(1); });
