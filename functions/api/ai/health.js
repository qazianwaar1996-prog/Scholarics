// GET /api/ai/health
// Read-only deployment diagnostics. If ?diag=1 is requested, safely tests connectivity.
import { aiAvailability, AI_TOOLS } from '../../_lib/aiQuota.js';
import { getGeminiModel, DEFAULT_GEMINI_MODEL, generate } from '../../_lib/gemini.js';

export async function onRequestGet(context) {
  var env = (context && context.env) || {};
  var request = context && context.request;
  var configured = !!(typeof env.GEMINI_API_KEY === 'string' && env.GEMINI_API_KEY.trim()) || env.AI_MOCK === '1';
  var globalAvailability = aiAvailability(env, null);
  var model;
  var modelValid = true;
  try { model = getGeminiModel(env); }
  catch (e) { model = DEFAULT_GEMINI_MODEL; modelValid = false; }

  var endpoints = { health: { available: true, method: 'GET' } };
  Object.keys(AI_TOOLS).forEach(function (tool) {
    endpoints[tool] = {
      available: configured && modelValid && aiAvailability(env, tool).enabled,
      method: 'POST'
    };
  });

  var out = {
    ok: true,
    aiAvailable: configured && modelValid && globalAvailability.enabled,
    gemini: {
      configured: configured,
      model: model,
      modelValid: modelValid
    },
    aiGlobalEnabled: globalAvailability.enabled,
    endpoints: endpoints
  };

  var url = request && request.url ? new URL(request.url) : null;
  if (url && url.searchParams.get('diag') === '1') {
    if (!configured) {
      out.liveCheck = { ok: false, error: 'GEMINI_API_KEY not configured' };
    } else if (env.AI_MOCK === '1') {
      out.liveCheck = { ok: true, mock: true };
    } else {
      try {
        var reply = await generate(env, {
          contents: [{ role: 'user', parts: [{ text: 'Respond with the word OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        });
        out.liveCheck = {
          ok: true,
          model: model,
          keyConfigured: true,
          reachable: true,
          candidateReceived: true,
          parsed: typeof reply === 'string' && reply.length > 0
        };
      } catch (err) {
        out.liveCheck = {
          ok: false,
          model: model,
          keyConfigured: true,
          upstreamStatus: err.upstreamStatus || null,
          code: err.code || 'AI_ERROR'
        };
      }
    }
  }

  return Response.json(out);
}
