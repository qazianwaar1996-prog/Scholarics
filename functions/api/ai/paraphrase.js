import { withApi, json } from '../../_lib/http.js';
import { generate } from '../../_lib/gemini.js';
import { PARAPHRASE_SYSTEM, buildParaphraseUserPrompt, VALID_PARAPHRASE_MODES, VALID_PARAPHRASE_OPTIONS } from '../../_lib/prompts.js';
import { requireText, requirePrompt, clean, oneOf } from '../../_lib/validate.js';

// POST /api/ai/paraphrase — accepts {prompt} (raw) OR {text, mode, options, ...}
export const onRequestPost = withApi(async ({ body, env }) => {
  let payload;
  if (typeof body.prompt === 'string') {
    payload = { prompt: requirePrompt(body.prompt, 12000) };
  } else {
    const text = requireText(body.text, 'text', 12000);
    let options = Array.isArray(body.options)
      ? body.options.filter((o) => VALID_PARAPHRASE_OPTIONS.indexOf(o) !== -1) : [];
    if (body.preserve && options.indexOf('preserve') === -1) options.push('preserve');
    payload = {
      text,
      mode: oneOf(body.mode, VALID_PARAPHRASE_MODES, 'Academic'),
      options,
      customPrompt: clean(body.customPrompt) || null,
      langLevel: clean(body.langLevel) || null,
      preserve: !!body.preserve
    };
  }

  const userPrompt = buildParaphraseUserPrompt(payload);
  const reply = await generate(env, {
    systemInstruction: PARAPHRASE_SYSTEM,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
  });
  return json({ reply });
});
