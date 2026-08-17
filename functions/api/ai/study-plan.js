import { withApi, json } from '../../_lib/http.js';
import { generate } from '../../_lib/gemini.js';
import { STUDY_PLAN_SYSTEM, buildStudyPlanUserPrompt } from '../../_lib/prompts.js';
import { clean, str } from '../../_lib/validate.js';
import { bad } from '../../_lib/errors.js';

// POST /api/ai/study-plan
export const onRequestPost = withApi(async ({ body, env }) => {
  const subject = clean(body.subject) || clean(body.goal);
  if (!subject && !clean(body.notes)) throw bad('Provide a subject, goal, or notes for the study plan.');

  const userPrompt = buildStudyPlanUserPrompt({
    subject,
    timeframe: str(body.timeframe, null),
    courses: str(body.courses, null),
    availability: str(body.availability, null),
    level: str(body.level, null),
    notes: str(body.notes, null)
  });

  const plan = await generate(env, {
    systemInstruction: STUDY_PLAN_SYSTEM,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 2048 }
  });
  return json({ plan });
}, { aiTool: 'study-plan' });
