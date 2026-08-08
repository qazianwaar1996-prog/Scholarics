import { withApi, json } from '../../_lib/http.js';
import { chat } from '../../_lib/gemini.js';
import { TUTOR_SYSTEM_PROMPT } from '../../_lib/prompts.js';
import { requireMessages, clean } from '../../_lib/validate.js';

// POST /api/ai/chat — AI Tutor (multi-turn, subject-aware)
export const onRequestPost = withApi(async ({ body, env }) => {
  const messages = requireMessages(body.messages, { maxMessages: 40, maxLen: 4000 });

  let system = TUTOR_SYSTEM_PROMPT;
  const subject = clean(body.subject);
  const level = clean(body.level);
  if (subject || level) {
    system += '\n\nSTUDENT CONTEXT: ' + (subject ? 'Subject: ' + subject + '. ' : '') + (level ? 'Level: ' + level + '.' : '');
  }

  const reply = await chat(env, {
    messages,
    systemInstruction: system,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  });
  return json({ reply });
});
