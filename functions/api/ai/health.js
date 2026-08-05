// GET /api/ai/health
// Returns only the minimum information required by the frontend status indicator.
// Infrastructure details (platform, model name, mock mode) are intentionally omitted
// to avoid leaking implementation specifics to unauthenticated clients.
export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    aiAvailable: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'mock') || env.AI_MOCK === '1'
  });
}
