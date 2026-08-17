/**
 * Reusable Google Gemini service for Cloudflare Workers.
 * The API key is read from `env.GEMINI_API_KEY` and NEVER exposed to the client.
 * Uses the native global fetch (Workers runtime). No Node dependencies.
 */
import { aiError } from './errors.js';

export var DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

var SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

/* Unsupported/deprecated parameters for Gemini 3.6 Flash.
   These MUST NOT be present in generationConfig (can cause HTTP 400). */
var DISALLOWED_GENERATION_PARAMS = [
  'temperature',
  'topP',
  'top_p',
  'topK',
  'top_k',
  'candidateCount',
  'candidate_count',
  'thinkingBudget',
  'thinking_budget'
];

/**
 * Defensively clean and build generationConfig for Gemini 3.6 Flash.
 * Strips sampling and thinking parameters that are deprecated/unsupported.
 */
export function cleanGenerationConfig(config, jsonMode) {
  var out = {};
  if (config && typeof config === 'object') {
    for (var k in config) {
      if (Object.prototype.hasOwnProperty.call(config, k)) {
        if (DISALLOWED_GENERATION_PARAMS.indexOf(k) === -1 && config[k] !== undefined && config[k] !== null) {
          out[k] = config[k];
        }
      }
    }
  }
  if (typeof out.maxOutputTokens === 'string') {
    out.maxOutputTokens = parseInt(out.maxOutputTokens, 10);
  }
  if (typeof out.maxOutputTokens !== 'number' || !Number.isFinite(out.maxOutputTokens) || out.maxOutputTokens <= 0) {
    out.maxOutputTokens = 1024;
  }
  if (jsonMode) {
    out.responseMimeType = 'application/json';
  }
  return out;
}

/** Return the configured model without ever inspecting or exposing the key. */
export function getGeminiModel(env, override) {
  var model = String(override || (env && env.GEMINI_MODEL) || DEFAULT_GEMINI_MODEL).trim();
  /* Model is inserted into a URL path. Reject malformed configuration rather
     than allowing an environment value to alter the upstream URL. */
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(model)) {
    throw aiError('AI_MODEL_INVALID');
  }
  return model;
}

function endpoint(env, model) {
  /* GEMINI_API_BASE exists for isolated local tests. Production uses Google's
     v1beta REST endpoint below; the API key is sent only as a request header. */
  var base = String((env && env.GEMINI_API_BASE) || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  return base + '/models/' + encodeURIComponent(getGeminiModel(env, model)) + ':generateContent';
}

function upstreamError(status) {
  var err;
  if (status === 400) err = aiError('AI_REQUEST_REJECTED');
  else if (status === 401 || status === 403) err = aiError('AI_AUTH_FAILED');
  else if (status === 404) err = aiError('AI_MODEL_NOT_FOUND');
  else if (status === 429) err = aiError('AI_RATE_LIMITED');
  else if (status >= 500) err = aiError('AI_UPSTREAM_UNAVAILABLE');
  else err = aiError('AI_UPSTREAM');
  err.upstreamStatus = status;
  return err;
}

/**
 * Core call -> model text reply.
 * opts: { systemInstruction, contents, generationConfig, jsonMode, model }
 */
export async function generate(env, opts) {
  env = env || {};
  opts = opts || {};

  // Explicit test mode only — never enable AI_MOCK in production.
  if (env.AI_MOCK === '1') return mockReply(opts);

  var key = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
  if (!key) throw aiError('AI_NOT_CONFIGURED');

  var selectedModel = getGeminiModel(env, opts.model);
  var genConfig = cleanGenerationConfig(opts.generationConfig, !!opts.jsonMode);

  var body = {
    contents: opts.contents || [],
    generationConfig: genConfig,
    safetySettings: SAFETY_SETTINGS
  };
  if (opts.systemInstruction) body.system_instruction = { parts: [{ text: opts.systemInstruction }] };

  var res;
  try {
    res = await fetch(endpoint(env, opts.model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    /* Server-side diagnostic log without exposing secret values */
    console.error('[Gemini Network Error]', JSON.stringify({
      model: selectedModel,
      keyConfigured: !!key,
      error: 'Could not reach Gemini endpoint'
    }));
    throw aiError('AI_UNREACHABLE');
  }

  if (!res.ok) {
    var upstreamMessage = '';
    try {
      var errData = await res.json();
      if (errData && errData.error && typeof errData.error.message === 'string') {
        upstreamMessage = errData.error.message;
      }
    } catch (_) {
      try {
        upstreamMessage = (await res.text()).slice(0, 300);
      } catch (_) {}
    }

    /* Safe server-side diagnostic log: captures status, message, model, key presence */
    console.error('[Gemini Upstream Failure]', JSON.stringify({
      upstreamStatus: res.status,
      upstreamMessage: upstreamMessage,
      model: selectedModel,
      keyConfigured: !!key
    }));

    var err = upstreamError(res.status);
    err.upstreamStatus = res.status;
    err.upstreamMessage = upstreamMessage;
    err.model = selectedModel;
    throw err;
  }

  var data;
  try {
    data = await res.json();
  } catch (e) {
    throw aiError('AI_BAD_RESPONSE');
  }

  var cand = data && Array.isArray(data.candidates) && data.candidates[0];
  if (!cand) {
    var blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    if (blockReason) throw aiError('AI_BLOCKED');
    throw aiError('AI_EMPTY');
  }
  var reason = cand.finishReason || '';
  if (/SAFETY|RECITATION|BLOCK/i.test(reason)) throw aiError('AI_BLOCKED');

  var parts = cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
  var text = parts.map(function (p) { return p && typeof p.text === 'string' ? p.text : ''; }).join('').trim();
  if (!text) throw aiError('AI_EMPTY');
  return text;
}

/** Multi-turn conversation. messages: [{role:'user'|'assistant', content}] */
export async function chat(env, opts) {
  var contents = (opts.messages || []).map(function (m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });
  return generate(env, {
    systemInstruction: opts.systemInstruction,
    contents: contents,
    generationConfig: opts.generationConfig
  });
}

/** Single-turn request returning parsed JSON (Gemini JSON mode). */
export async function generateJSON(env, opts) {
  var text = await generate(env, {
    systemInstruction: opts.systemInstruction,
    contents: [{ role: 'user', parts: [{ text: opts.userContent }] }],
    generationConfig: opts.generationConfig,
    jsonMode: true
  });
  return safeParseJSON(text);
}

export function safeParseJSON(text) {
  if (!text) throw aiError('AI_BAD_JSON');
  var cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  var first = cleaned.indexOf('{'), last = cleaned.lastIndexOf('}');
  if (first > 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  try { return JSON.parse(cleaned); }
  catch (e) { throw aiError('AI_BAD_JSON'); }
}

/* Mock reply for offline testing (AI_MOCK=1). Never used unless explicitly set. */
function mockReply(opts) {
  var last = opts.contents && opts.contents[opts.contents.length - 1];
  var q = (last && last.parts && last.parts[0] && last.parts[0].text) || '';
  if (opts.jsonMode) {
    if (q.indexOf('GPA analytics') !== -1 || q.indexOf('coaching report') !== -1) {
      var cur = parseFloat((q.match(/Current CGPA: ([0-9.]+|not available)/) || [])[1]);
      var tgt = parseFloat((q.match(/Target: ([0-9.]+|not set)/) || [])[1]);
      var pct = parseInt((q.match(/Progress toward target: ([0-9]+)%/) || [])[1], 10);
      if (!Number.isFinite(cur)) cur = 0;
      if (!Number.isFinite(tgt)) tgt = cur;
      if (!Number.isFinite(pct)) pct = Math.round(cur > 0 && tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0);
      var day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return Promise.resolve(JSON.stringify({
        strengths: ['Calculus I (B+) — solid quantitative foundation', 'English 101 (A) — strong written communication'],
        weaknesses: ['History 101 (A-) — essays need stronger argument structure'],
        progress: { current: cur, target: tgt, gap: Math.round((tgt - cur) * 100) / 100, pct: pct },
        priorities: [
          { subject: 'Calculus I', reason: '4 credits — biggest lever on your CGPA', urgency: 'high' },
          { subject: 'History 101', reason: 'Below your average — easy essay-score gains', urgency: 'medium' }
        ],
        weeklyPlan: day.map(function (d) {
          return { day: d, focus: 'Focused study block', tasks: ['Attempt 5 practice problems', 'Review notes and mark errors'] };
        }),
        advice: 'You are ' + pct + '% of the way to your target — protect it with weekly practice and steady revision.'
      }));
    }
    if (q.indexOf('flashcards') !== -1) {
      return Promise.resolve(JSON.stringify({ flashcards: [
        { front: 'What is photosynthesis?', back: 'The process by which plants convert light into chemical energy.' },
        { front: 'Define mitochondria.', back: 'The organelle that produces most of the cell’s ATP.' }
      ] }));
    }
    if (q.indexOf('quiz') !== -1) {
      return Promise.resolve(JSON.stringify({ quiz: [
        { question: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: '56', explanation: '7 times 8 equals 56.' }
      ] }));
    }
    return Promise.resolve('{}');
  }
  if (q.indexOf('Text to edit:') !== -1) {
    var src = q.split('Text to edit:')[1] || '';
    return Promise.resolve('[MOCK] ' + src.trim().slice(0, 120) + '\n[STUDIO_METRICS: Essay, 92, 88, 95, 90, 14.2]');
  }
  return Promise.resolve('[MOCK AI reply] You asked: ' + q.slice(0, 100));
}
