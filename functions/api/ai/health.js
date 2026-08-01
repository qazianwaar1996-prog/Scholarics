// GET /api/ai/health
export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    platform: 'cloudflare-pages',
    model: env.GEMINI_MODEL || 'gemini-2.0-flash',
    keyConfigured: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'mock'),
    emailConfigured: !!env.RESEND_API_KEY,
    mock: env.AI_MOCK === '1' || env.GEMINI_API_KEY === 'mock'
  });
}
