# Scholarics on Cloudflare Pages


The entire site runs on **Cloudflare Pages**: static assets from the repo root +
edge API from the `functions/` directory. **No Express, no Node server, no
Railway/Render/Formspree** — only Cloudflare + Google Gemini.

## Project layout
```
/ (repo root)        ← static site served by Pages (index.html, *.html, css/, js/, images/)
functions/
  _lib/              ← shared edge modules (imported by endpoints, "_" = not a route)
    gemini.js        ← Google Gemini service (ONLY place the API key is used)
    prompts.js       ← system prompts + per-endpoint prompt builders
    validate.js      ← input validation + sanitisation
    rateLimit.js     ← per-IP rate limiter (KV-backed, in-memory fallback)
    email.js         ← Resend email sender (+ KV fallback)
    emailList.js     ← shared secure email-list + duplicate-prevention pipeline
    errors.js        ← error codes → HTTP mapping
    http.js          ← json(), withApi() wrapper, client IP
  api/
    ai/{chat,paraphrase,study-plan,flashcards,quiz,health}.js
    subscribe.js     ← email-capture modal / newsletter (`subscriber:` KV keys)
    waitlist.js      ← premium Notify Me waitlist (`waitlist:` KV keys)
    contact.js       ← contact form
    bug-report.js    ← bug reports / quick feedback
  _routes.json       ← only /api/* runs as Functions; everything else is static
wrangler.toml        ← Pages config + optional KV bindings
```

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/ai/health` | `{ ok, model, keyConfigured, emailConfigured, mock }` |
| POST | `/api/ai/chat` | AI Tutor (multi-turn, subject-aware) → `{reply}` |
| POST | `/api/ai/paraphrase` | AI Paraphraser (8 modes + options) → `{reply}` |
| POST | `/api/ai/study-plan` | Study plan → `{plan}` |
| POST | `/api/ai/flashcards` | Flashcards → `{flashcards:[{front,back}]}` |
| POST | `/api/ai/quiz` | Quiz → `{quiz:[{question,options,answer,explanation}]}` |
| POST | `/api/subscribe` | Newsletter subscription |
| POST | `/api/waitlist` | Premium Notify Me waitlist |
| POST | `/api/contact` | Contact form |
| POST | `/api/bug-report` | Bug reports / feedback |

The frontend already posts to these exact URLs (relative), so **no AI frontend
change was needed**; the email-capture modal and contact form were retargeted
from Formspree to `/api/subscribe` and `/api/contact`.

## 1) Add secrets (Gemini + email)
Set these as Cloudflare **environment variables / secrets** (dashboard → your
Pages project → Settings → Environment variables, or CLI):

```
GEMINI_API_KEY   (secret)  — https://aistudio.google.com/app/apikey
RESEND_API_KEY   (secret)  — https://resend.com  (optional; for email delivery)
```
CLI:
```bash
npx wrangler pages secret put GEMINI_API_KEY
npx wrangler pages secret put RESEND_API_KEY
```
Optional plain vars (`wrangler.toml [vars]` or dashboard): `GEMINI_MODEL`
(default `gemini-2.0-flash`), `EMAIL_FROM`, `EMAIL_TO`, `RATE_LIMIT`,
`RATE_WINDOW_MS`, `AI_MOCK` (testing).

> The Gemini key is read from `env.GEMINI_API_KEY` inside the Worker only — it is
> never sent to the browser.

## 2) Deploy
**Option A — Git (recommended):** push this repo to GitHub, in the Cloudflare
dashboard create a Pages project connected to the repo. Framework preset: *None*,
build command: *(leave empty)*, build output: *(root)*. Cloudflare auto-detects
`functions/`. Add the secrets above, then Save & Deploy.

**Option B — Wrangler CLI:**
```bash
npm install
npx wrangler pages deploy .
```

After deploy: `curl https://scholaricsv-2.pages.dev/api/ai/health`
→ `{"ok":true,"keyConfigured":true,...}`

## 3) Local development
```bash
npm install
npm run dev          # wrangler pages dev .  ->  http://localhost:8788
```
Run in mock mode (no key): `AI_MOCK=1 npm run dev`

## 4) Optional: durable rate limiting + submission storage
The rate limiter works in-memory by default (per-isolate). For durable,
cross-isolate limiting, create a KV namespace and bind it:
```bash
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create SUBMISSIONS     # stores emails if no Resend key
```
Then uncomment the `[[kv_namespaces]]` blocks in `wrangler.toml`. For the
strongest protection, also enable a WAF Rate Limiting Rule on `/api/*`.

Newsletter and Notify Me addresses share the bound namespace but are separate
logical collections: newsletter records use `subscriber:<email>` keys and
Notify Me records use `waitlist:<email>` keys. An address can therefore join
both lists, while duplicates are prevented independently within each list.

## Email behaviour
- `RESEND_API_KEY` set → emails are sent to `EMAIL_TO` via Resend.
- No Resend key but `SUBMISSIONS` KV bound → submissions are stored (nothing lost).
- A new `/api/subscribe` or `/api/waitlist` record triggers one owner notification;
  duplicate records trigger neither a write nor another notification.
- Without the required storage binding, list endpoints fail closed with 503 so
  they cannot send duplicate notifications when persistence is unavailable.

## Security
- Gemini key & Resend key are server-side only (Workers `env`).
- Per-IP rate limiting, request-size cap, strict validation + sanitisation,
  safety-filter handling, central JSON errors that never leak internals.
- Same-origin by default (frontend == backend on Pages).
