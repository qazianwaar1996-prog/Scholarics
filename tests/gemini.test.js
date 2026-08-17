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
          (e) => e.code === pair[1] && !e.detail && e.message.indexOf("secret provider detail") === -1
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
