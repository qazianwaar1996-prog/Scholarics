import { withApi, json } from '../../_lib/http.js';
import { generateJSON } from '../../_lib/gemini.js';
import { FLASHCARDS_SYSTEM, buildFlashcardsUserPrompt } from '../../_lib/prompts.js';
import { clean, int } from '../../_lib/validate.js';
import { bad as badErr } from '../../_lib/errors.js';

// POST /api/ai/flashcards -> { flashcards: [{front, back}] }
export const onRequestPost = withApi(async ({ body, env }) => {
  const topic = clean(body.topic);
  const text = clean(body.text);
  if (!topic && !text) throw badErr('Provide a "topic" or "text" to generate flashcards.');

  const count = int(body.count, 1, 30, 10);
  const userPrompt = buildFlashcardsUserPrompt({ topic: topic || null, text: text ? text.slice(0, 8000) : null, count });

  const obj = await generateJSON(env, {
    systemInstruction: FLASHCARDS_SYSTEM,
    userContent: userPrompt,
    generationConfig: { temperature: 0.5, maxOutputTokens: 2048 }
  });

  const cards = Array.isArray(obj.flashcards)
    ? obj.flashcards
        .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string')
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }))
    : [];
  if (!cards.length) throw badErr('The AI returned no usable flashcards. Please try again.');
  return json({ flashcards: cards });
}, { aiTool: 'flashcards' });
