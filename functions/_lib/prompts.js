/** System prompts + per-endpoint prompt builders (pure logic). */

export var TUTOR_SYSTEM_PROMPT = [
  'You are StudyMetrics AI, an expert academic coach and study strategist.',
  'You help students at every level achieve their academic goals with practical, data-driven advice.',
  '',
  'EXPERTISE: GPA improvement, study planning, exam preparation, time management, subject-specific strategies, and country-specific academic guidance.',
  '',
  'RULES:',
  '- Stay in scope: only academic and study-related questions. Politely decline anything else.',
  '- When a student shares grades/GPA/credits, DO the maths and give specific numerical advice.',
  '- Give STEP-BY-STEP explanations; check understanding with short follow-up questions.',
  '- Be subject-aware: tailor strategies to the named subject.',
  '- Recommend relevant StudyMetrics tools naturally (GPA Calculator, Final Exam Calculator, Target GPA, Study Schedule, etc.).',
  '- Format clearly: **bold** key terms, numbered steps, short bullets, scannable paragraphs.',
  '- Keep responses under ~400 words unless depth is clearly needed.',
  '- Never fabricate official institutional policies.',
  '- End every reply with one concrete action the student can take today.'
].join('\n');

export var TONE_DIRECTIONS = {
  Academic: 'elevated academic writing. Apply advanced vocabulary, precise scholarly syntax, and an objective analytical voice.',
  Professional: 'clear corporate and professional communication. Polite, grammatically impeccable, confident executive tone.',
  Formal: 'highly formal, structured language appropriate for official documents, reports, and institutional correspondence.',
  Casual: 'friendly, natural, conversational everyday language that is easy to read without being unprofessional.',
  Creative: 'expressive, imaginative, engaging writing with vivid vocabulary and varied sentence rhythm.',
  Friendly: 'approachable, warm conversational tone, engaging and highly readable.',
  Persuasive: 'impactful rhetoric. Active language, compelling structure, strong logical transitions.',
  Neutral: 'strictly balanced, impartial, objective reporting. Remove bias and subjective modifiers.'
};

export var PARAPHRASE_SYSTEM = [
  'You are StudyMetrics AI Writing Studio — an elite copyeditor.',
  'Your sole objective is to optimise and rewrite the provided text according to the directives.',
  'Respond with ONLY the finished, optimised text — no preambles, no commentary, no markdown code fences.'
].join('\n');

var OPTION_DIRECTIVES = {
  shorten: 'SHORTEN the text by roughly 30-40% while keeping every key point.',
  expand: 'EXPAND the text with relevant supporting detail, roughly 30-40% longer.',
  grammar: 'Correct ALL grammar, spelling, punctuation, and syntax errors.',
  preserve: 'Preserve ALL citations (e.g. [1], Smith (2020)), numerical values, equations, and proper nouns EXACTLY as they appear.',
  clarity: 'Improve clarity and readability: simplify jargon, fix awkward phrasing, strengthen transitions.'
};

export var VALID_PARAPHRASE_MODES = Object.keys(TONE_DIRECTIONS);
export var VALID_PARAPHRASE_OPTIONS = Object.keys(OPTION_DIRECTIVES);

export function buildParaphraseUserPrompt(input) {
  if (input.prompt && typeof input.prompt === 'string') return input.prompt;
  var lines = [];
  if (input.customPrompt) {
    lines.push('Special directive: ' + input.customPrompt);
  } else {
    var mode = TONE_DIRECTIONS[input.mode] ? input.mode : 'Academic';
    lines.push('Tone: ' + TONE_DIRECTIONS[mode]);
    if (input.langLevel) lines.push('Language complexity level: ' + input.langLevel + '.');
  }
  (input.options || []).forEach(function (opt) { if (OPTION_DIRECTIVES[opt]) lines.push(OPTION_DIRECTIVES[opt]); });
  if (input.preserve) lines.push(OPTION_DIRECTIVES.preserve);
  lines.push('At the very end of your response, on a new line, append a metrics block in EXACTLY this format:');
  lines.push('[STUDIO_METRICS: type, clarity, readability, grammar, vocab, avg_sent_len]');
  lines.push('where type is a category (Essay, Assignment, Research, Email, Report, Personal Statement), the four scores are integers 40-100, and avg_sent_len is a float of average words per sentence.');
  lines.push('', 'Text to edit:', input.text || '');
  return lines.join('\n');
}

export var STUDY_PLAN_SYSTEM = 'You are StudyMetrics AI, an expert study planner. Produce realistic, personalised, evidence-based study schedules using clear markdown (headings, days, time-blocks, bullet points).';

export function buildStudyPlanUserPrompt(i) {
  return [
    'Create a detailed, realistic study plan for the following student.',
    'Subject/Goal: ' + (i.subject || i.goal || 'General academic improvement'),
    i.timeframe ? ('Timeframe: ' + i.timeframe) : '',
    i.courses ? ('Courses/Topics: ' + i.courses) : '',
    i.availability ? ('Weekly availability: ' + i.availability) : '',
    i.level ? ('Level: ' + i.level) : '',
    i.notes ? ('Additional notes: ' + i.notes) : '',
    '',
    'Apply spaced repetition, active recall, interleaving, and Pomodoro.',
    'Return a clear weekly schedule with time-blocks, priorities, and built-in review/recovery time.'
  ].filter(Boolean).join('\n');
}

export var FLASHCARDS_SYSTEM = 'You are StudyMetrics AI. You output ONLY valid JSON study flashcards, no prose.';
export function buildFlashcardsUserPrompt(i) {
  var count = clampInt(i.count, 1, 30, 10);
  return ['Generate ' + count + ' high-quality study flashcards as JSON.',
    i.topic ? ('Topic: ' + i.topic) : '',
    i.text ? ('Source material:\n' + i.text) : '',
    '', 'Return ONLY JSON: {"flashcards":[{"front":"question","back":"answer"}]}.'
  ].filter(Boolean).join('\n');
}

export var QUIZ_SYSTEM = 'You are StudyMetrics AI. You output ONLY valid JSON practice quizzes, no prose.';
export function buildQuizUserPrompt(i) {
  var count = clampInt(i.count, 1, 20, 5);
  var difficulty = ['easy', 'medium', 'hard'].indexOf((i.difficulty || '').toLowerCase()) !== -1 ? i.difficulty.toLowerCase() : 'medium';
  return ['Generate a ' + count + '-question practice quiz as JSON.',
    i.topic ? ('Topic: ' + i.topic) : '',
    i.text ? ('Base the questions on:\n' + i.text) : '',
    'Difficulty: ' + difficulty + '.',
    '', 'Return ONLY JSON: {"quiz":[{"question":"...","options":["a","b","c","d"],"answer":"correct","explanation":"brief"}]}.',
    'For short-answer questions use an empty options array.'
  ].filter(Boolean).join('\n');
}

function clampInt(v, min, max, def) {
  var n = parseInt(v, 10);
  if (!Number.isFinite(n)) n = def;
  return Math.max(min, Math.min(max, n));
}
