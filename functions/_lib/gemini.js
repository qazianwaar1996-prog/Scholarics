/**
 * Reusable Google Gemini service for Cloudflare Workers.
 * The API key is read from `env.GEMINI_API_KEY` and NEVER exposed to the client.
 * Uses the native global fetch (Workers runtime). No Node dependencies.
 */
import { aiError } from './errors.js';

var SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

function endpoint(env, model) {
  var base = env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
  return base + '/models/' + (model || env.GEMINI_MODEL || 'gemini-2.0-flash') + ':generateContent';
}

/**
 * Core call -> model text reply.
 * opts: { systemInstruction, contents, generationConfig, jsonMode, model }
 */
export async function generate(env, opts) {
  opts = opts || {};

  // Test mode (set AI_MOCK=1) — never contact Gemini.
  if (env.AI_MOCK === '1' || env.GEMINI_API_KEY === 'mock') return mockReply(opts);

  var key = env.GEMINI_API_KEY;
  if (!key) throw aiError('AI_NOT_CONFIGURED');

  var body = {
    contents: opts.contents || [],
    generationConfig: Object.assign({ temperature: 0.7, topP: 0.95, maxOutputTokens: 1024 }, opts.generationConfig || {}),
    safetySettings: SAFETY_SETTINGS
  };
  if (opts.jsonMode) body.generationConfig.responseMimeType = 'application/json';
  if (opts.systemInstruction) body.system_instruction = { parts: [{ text: opts.systemInstruction }] };

  var res;
  try {
    res = await fetch(endpoint(env, opts.model) + '?key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (netErr) {
    throw aiError('AI_UNREACHABLE', netErr.message);
  }

  if (!res.ok) {
    var msg = 'Gemini HTTP ' + res.status;
    try { var j = await res.json(); if (j && j.error && j.error.message) msg = j.error.message; } catch (e) {}
    throw aiError(res.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UPSTREAM', msg);
  }

  var data = await res.json();
  var cand = data && data.candidates && data.candidates[0];
  if (!cand) throw aiError('AI_EMPTY');
  var reason = cand.finishReason || '';
  if (/SAFETY|RECITATION|BLOCK/i.test(reason)) throw aiError('AI_BLOCKED', reason);

  var text = (cand.content && cand.content.parts || []).map(function (p) { return p.text || ''; }).join('').trim();
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
  if (!text) throw aiError('AI_BAD_JSON', 'Empty JSON from model');
  var cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  var first = cleaned.indexOf('{'), last = cleaned.lastIndexOf('}');
  if (first > 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  try { return JSON.parse(cleaned); }
  catch (e) { throw aiError('AI_BAD_JSON', e.message); }
}

/* Mock reply for offline testing (AI_MOCK=1). */
function mockReply(opts) {
  var last = opts.contents && opts.contents[opts.contents.length - 1];
  var q = (last && last.parts && last.parts[0] && last.parts[0].text) || '';
  if (opts.jsonMode) {
    if (q.indexOf('GPA analytics') !== -1 || q.indexOf('coaching report') !== -1) {
      /* Echo the analytics embedded in the prompt so local tests exercise
         the real numbers (regex-safe: the prompt is built by our code). */
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
        { front: 'Define mitochondria.', back: 'The organelle that produces most of the cell\u2019s ATP.' }
      ] }));
    }
    if (q.indexOf('quiz') !== -1) {
      return Promise.resolve(JSON.stringify({ quiz: [
        { question: 'What is 7 \u00d7 8?', options: ['54', '56', '58', '64'], answer: '56', explanation: '7 times 8 equals 56.' }
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
