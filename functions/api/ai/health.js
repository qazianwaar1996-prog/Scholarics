// GET /api/ai/health
// Read-only deployment diagnostics. This does not call Gemini or consume quota.
import { aiAvailability, AI_TOOLS } from '../../_lib/aiQuota.js';
import { getGeminiModel, DEFAULT_GEMINI_MODEL } from '../../_lib/gemini.js';

export async function onRequestGet({ env }) {
  env = env || {};
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

  return Response.json({
    ok: true,
    aiAvailable: configured && modelValid && globalAvailability.enabled,
    gemini: {
      configured: configured,
      model: model,
      modelValid: modelValid
    },
    aiGlobalEnabled: globalAvailability.enabled,
    endpoints: endpoints
  });
}
