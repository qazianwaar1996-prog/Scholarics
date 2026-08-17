/* Gemini Worker client security/error-contract tests. */
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
  const originalFetch = global.fetch;
  try {
    await test("uses the supported production default model", async () => {
      assert.strictEqual(gemini.getGeminiModel({}), "gemini-3.6-flash");
    });

    await test("uses GEMINI_MODEL and sends the key only in x-goog-api-key", async () => {
      const secret = "unit-test-secret-value";
      let seen;
      global.fetch = async (url, init) => {
        seen = { url: String(url), init };
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      };
      const reply = await gemini.generate({ GEMINI_API_KEY: secret, GEMINI_MODEL: "gemini-custom-flash" }, {
        contents: [{ role: "user", parts: [{ text: "hello" }] }]
      });
      assert.strictEqual(reply, "ok");
      assert.strictEqual(seen.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-custom-flash:generateContent");
      assert.strictEqual(seen.init.headers["x-goog-api-key"], secret);
      assert.ok(seen.url.indexOf(secret) === -1);
      assert.ok(seen.init.body.indexOf(secret) === -1);
    });

    await test("strips deprecated temperature, topP, top_p, topK, top_k from request", async () => {
      let seenBody;
      global.fetch = async (url, init) => {
        seenBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      };
      await gemini.generate({ GEMINI_API_KEY: "test-key" }, {
        contents: [{ role: "user", parts: [{ text: "hello" }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          top_p: 0.95,
          topK: 40,
          top_k: 40,
          candidateCount: 1,
          candidate_count: 1,
          thinkingBudget: 0,
          thinking_budget: 0,
          maxOutputTokens: 2048
        }
      });
      assert.strictEqual(seenBody.generationConfig.maxOutputTokens, 2048);
      assert.strictEqual(seenBody.generationConfig.temperature, undefined);
      assert.strictEqual(seenBody.generationConfig.topP, undefined);
      assert.strictEqual(seenBody.generationConfig.top_p, undefined);
      assert.strictEqual(seenBody.generationConfig.topK, undefined);
      assert.strictEqual(seenBody.generationConfig.top_k, undefined);
      assert.strictEqual(seenBody.generationConfig.candidateCount, undefined);
      assert.strictEqual(seenBody.generationConfig.candidate_count, undefined);
      assert.strictEqual(seenBody.generationConfig.thinkingBudget, undefined);
      assert.strictEqual(seenBody.generationConfig.thinking_budget, undefined);
      assert.ok(!("temperature" in seenBody.generationConfig));
      assert.ok(!("topP" in seenBody.generationConfig));
      assert.ok(!("top_p" in seenBody.generationConfig));
      assert.ok(!("topK" in seenBody.generationConfig));
      assert.ok(!("top_k" in seenBody.generationConfig));
    });

    await test("jsonMode sets responseMimeType without sampling parameters", async () => {
      let seenBody;
      global.fetch = async (url, init) => {
        seenBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"result":"ok"}' }] } }] }), {
          status: 200, headers: { "Content-Type": "application/json" }
        });
      };
      const jsonRes = await gemini.generateJSON({ GEMINI_API_KEY: "test-key" }, {
        userContent: "return json",
        generationConfig: { temperature: 0.5, maxOutputTokens: 3072 }
      });
      assert.deepStrictEqual(jsonRes, { result: "ok" });
      assert.strictEqual(seenBody.generationConfig.responseMimeType, "application/json");
      assert.strictEqual(seenBody.generationConfig.maxOutputTokens, 3072);
      assert.strictEqual("temperature" in seenBody.generationConfig, false);
    });

    await test("missing configuration is controlled and does not fetch", async () => {
      let called = false;
      global.fetch = async () => { called = true; throw new Error("should not fetch"); };
      await assert.rejects(() => gemini.generate({}, {}), (e) => e.code === "AI_NOT_CONFIGURED");
      assert.strictEqual(called, false);
    });

    for (const pair of [[400, "AI_REQUEST_REJECTED"], [401, "AI_AUTH_FAILED"], [403, "AI_AUTH_FAILED"],
      [404, "AI_MODEL_NOT_FOUND"], [429, "AI_RATE_LIMITED"], [500, "AI_UPSTREAM_UNAVAILABLE"]]) {
      await test("maps Gemini HTTP " + pair[0] + " without returning provider details", async () => {
        global.fetch = async () => new Response(JSON.stringify({ error: { message: "secret provider detail" } }), {
          status: pair[0], headers: { "Content-Type": "application/json" }
        });
        await assert.rejects(
          () => gemini.generate({ GEMINI_API_KEY: "test-key" }, { contents: [] }),
          (e) => e.code === pair[1] && e.upstreamStatus === pair[0] && !e.detail && e.message.indexOf("secret provider detail") === -1
        );
      });
    }

    await test("maps malformed successful Gemini JSON", async () => {
      global.fetch = async () => new Response("not json", { status: 200 });
      await assert.rejects(() => gemini.generate({ GEMINI_API_KEY: "test-key" }, {}),
        (e) => e.code === "AI_BAD_RESPONSE");
    });
  } finally {
    global.fetch = originalFetch;
  }
  console.log("\nGemini client: " + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
