import { withApi, json } from '../../_lib/http.js';
import { generateJSON } from '../../_lib/gemini.js';
import { QUIZ_SYSTEM, buildQuizUserPrompt } from '../../_lib/prompts.js';
import { clean, int, oneOf } from '../../_lib/validate.js';
import { bad as badErr } from '../../_lib/errors.js';

// POST /api/ai/quiz -> { quiz: [{question, options, answer, explanation}] }
export const onRequestPost = withApi(async ({ body, env }) => {
  const topic = clean(body.topic);
  const text = clean(body.text);
  if (!topic && !text) throw badErr('Provide a "topic" or "text" to generate a quiz.');

  const count = int(body.count, 1, 20, 5);
  const difficulty = oneOf(body.difficulty, ['easy', 'medium', 'hard'], 'medium');
  const userPrompt = buildQuizUserPrompt({ topic: topic || null, text: text ? text.slice(0, 8000) : null, count, difficulty });

  const obj = await generateJSON(env, {
    systemInstruction: QUIZ_SYSTEM,
    userContent: userPrompt,
    generationConfig: { temperature: 0.5, maxOutputTokens: 3072 }
  });

  const quiz = Array.isArray(obj.quiz)
    ? obj.quiz
        .filter((q) => q && typeof q.question === 'string')
        .map((q) => ({
          question: String(q.question).trim(),
          options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : [],
          answer: q.answer == null ? '' : String(q.answer).trim(),
          explanation: q.explanation == null ? '' : String(q.explanation).trim()
        }))
    : [];
  if (!quiz.length) throw badErr('The AI returned no usable questions. Please try again.');
  return json({ quiz });
});
