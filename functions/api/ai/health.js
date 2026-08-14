// GET /api/ai/health
// Returns only the minimum information required by the frontend status indicator.
// Infrastructure details (platform, model name, mock mode) are intentionally omitted
// to avoid leaking implementation specifics to unauthenticated clients.
import { aiAvailability } from '../../_lib/aiQuota.js';

export async function onRequestGet({ env }) {
  const configured = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'mock') || env.AI_MOCK === '1';
  const availability = aiAvailability(env, null);
  return Response.json({
    ok: true,
    aiAvailable: configured && availability.enabled
  });
}
