/* Test all Gemini 3.6 Flash endpoints and request generation */
"use strict";
const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { failed++; console.error("  ✗ " + name + "\n    " + (e && e.message || e)); }
}

(async () => {
  const gemini = await import(pathToFileURL(path.join(__dirname, "../functions/_lib/gemini.js")));
  const chatHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/chat.js")))).onRequestPost;
  const paraphraseHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/paraphrase.js")))).onRequestPost;
  const studyPlanHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/study-plan.js")))).onRequestPost;
  const flashcardsHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/flashcards.js")))).onRequestPost;
  const quizHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/quiz.js")))).onRequestPost;
  const coachHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/coach.js")))).onRequestPost;
  const healthHandler = (await import(pathToFileURL(path.join(__dirname, "../functions/api/ai/health.js")))).onRequestGet;

  const originalFetch = global.fetch;

  try {
    // 1. Test GET /api/ai/health
    await test("GET /api/ai/health returns valid diagnostics with gemini-3.6-flash", async () => {
      const res = await healthHandler({
        env: { GEMINI_API_KEY: "test-secret" },
        request: new Request("http://localhost/api/ai/health")
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.ok, true);
      assert.strictEqual(data.aiAvailable, true);
      assert.strictEqual(data.gemini.configured, true);
      assert.strictEqual(data.gemini.model, "gemini-3.6-flash");
      assert.strictEqual(data.gemini.modelValid, true);
      assert.ok(!JSON.stringify(data).includes("test-secret"));
    });

    // Helper to test each endpoint's generated upstream fetch
    async function testEndpointUpstream(name, handler, body, expectedMimeType) {
      let interceptedUrl = null;
      let interceptedInit = null;

      global.fetch = async (url, init) => {
        interceptedUrl = String(url);
        interceptedInit = init;
        const respPayload = expectedMimeType === "application/json"
          ? { candidates: [{ content: { parts: [{ text: JSON.stringify({
              flashcards: [{ front: "Q", back: "A" }],
              quiz: [{ question: "Q", options: ["1", "2"], answer: "1", explanation: "E" }],
              strengths: ["S"], weaknesses: ["W"], priorities: [], weeklyPlan: [], advice: "A"
            }) }] } }] }
          : { candidates: [{ content: { parts: [{ text: "Optimized sample response text" }] } }] };

        return new Response(JSON.stringify(respPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      };

      const env = {
        GEMINI_API_KEY: "test-api-key-123",
        AI_RATE_LIMIT: "100",
        AI_DAILY_GLOBAL: "100",
        AI_DAILY_COACH: "100",
        AI_DAILY_CHAT: "100",
        AI_DAILY_STUDY_PLAN: "100",
        AI_DAILY_PARAPHRASE: "100",
        AI_DAILY_FLASHCARDS: "100",
        AI_DAILY_QUIZ: "100"
      };
      const req = new Request("http://localhost/api/ai/" + name, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SC-Visitor": "testvisitor" + name },
        body: JSON.stringify(body)
      });

      const res = await handler({ env, request: req });
      assert.strictEqual(res.status, 200, name + " status was " + res.status);
      const resJson = await res.json();
      assert.ok(resJson, name + " returned empty json");

      // Verify URL & Header
      assert.strictEqual(interceptedUrl, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent");
      assert.strictEqual(interceptedInit.headers["x-goog-api-key"], "test-api-key-123");
      assert.strictEqual(interceptedInit.headers["Content-Type"], "application/json");

      // Verify Body
      const reqBody = JSON.parse(interceptedInit.body);
      assert.ok(reqBody.generationConfig, name + " missing generationConfig");
      assert.ok(typeof reqBody.generationConfig.maxOutputTokens === "number", name + " missing maxOutputTokens");

      // VERIFY ALL DEPRECATED SAMPLING PARAMS ARE ABSENT
      assert.strictEqual("temperature" in reqBody.generationConfig, false, name + " contained temperature!");
      assert.strictEqual("topP" in reqBody.generationConfig, false, name + " contained topP!");
      assert.strictEqual("top_p" in reqBody.generationConfig, false, name + " contained top_p!");
      assert.strictEqual("topK" in reqBody.generationConfig, false, name + " contained topK!");
      assert.strictEqual("top_k" in reqBody.generationConfig, false, name + " contained top_k!");
      assert.strictEqual("candidateCount" in reqBody.generationConfig, false, name + " contained candidateCount!");
      assert.strictEqual("candidate_count" in reqBody.generationConfig, false, name + " contained candidate_count!");
      assert.strictEqual("thinkingBudget" in reqBody.generationConfig, false, name + " contained thinkingBudget!");
      assert.strictEqual("thinking_budget" in reqBody.generationConfig, false, name + " contained thinking_budget!");

      if (expectedMimeType) {
        assert.strictEqual(reqBody.generationConfig.responseMimeType, expectedMimeType);
      }
    }

    await test("POST /api/ai/chat sends clean Gemini 3.6 config", async () => {
      await testEndpointUpstream("chat", chatHandler, {
        messages: [{ role: "user", content: "Hello tutor" }]
      });
    });

    await test("POST /api/ai/paraphrase sends clean Gemini 3.6 config", async () => {
      await testEndpointUpstream("paraphrase", paraphraseHandler, {
        text: "The student completed the assignment early."
      });
    });

    await test("POST /api/ai/study-plan sends clean Gemini 3.6 config", async () => {
      await testEndpointUpstream("study-plan", studyPlanHandler, {
        subject: "Linear Algebra",
        timeframe: "3 weeks"
      });
    });

    await test("POST /api/ai/flashcards sends clean Gemini 3.6 config with JSON mode", async () => {
      await testEndpointUpstream("flashcards", flashcardsHandler, {
        topic: "Photosynthesis",
        count: 5
      }, "application/json");
    });

    await test("POST /api/ai/quiz sends clean Gemini 3.6 config with JSON mode", async () => {
      await testEndpointUpstream("quiz", quizHandler, {
        topic: "Calculus Limits",
        count: 3
      }, "application/json");
    });

    await test("POST /api/ai/coach sends clean Gemini 3.6 config with JSON mode", async () => {
      await testEndpointUpstream("coach", coachHandler, {
        scaleId: "us40",
        target: 3.8,
        semesters: [{
          name: "Semester 1",
          courses: [{ name: "Calculus", grade: "A", credits: 4 }]
        }]
      }, "application/json");
    });

    await test("Upstream HTTP 400 error returns safe 502 with upstreamStatus: 400", async () => {
      global.fetch = async () => new Response(JSON.stringify({
        error: { code: 400, message: "Invalid argument: sampling parameter not allowed" }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });

      const env = {
        GEMINI_API_KEY: "test-api-key-123",
        AI_RATE_LIMIT: "100",
        AI_DAILY_GLOBAL: "100",
        AI_DAILY_CHAT: "100"
      };
      const req = new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-SC-Visitor": "testvisitorextra" },
        body: JSON.stringify({ messages: [{ role: "user", content: "test" }] })
      });

      const res = await chatHandler({ env, request: req });
      assert.strictEqual(res.status, 502);
      const json = await res.json();
      assert.strictEqual(json.code, "AI_REQUEST_REJECTED");
      assert.strictEqual(json.upstreamStatus, 400);
      assert.ok(!JSON.stringify(json).includes("test-api-key-123"));
      assert.ok(!JSON.stringify(json).includes("Invalid argument"));
    });

  } finally {
    global.fetch = originalFetch;
  }

  console.log("\nGemini 3.6 Endpoints Suite: " + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("FATAL ERROR", e);
  process.exit(1);
});
