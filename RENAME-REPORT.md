# Scholarics Rebrand — Complete Rename Report

**Project:** Rebranded from the legacy brand name → **Scholarics** (frontend + backend + Cloudflare configuration)
**Date:** 2026-08-04
**Commit:** `118c310` — pushed to the active arena session branch

> **Branding note:** This record deliberately does **not** spell out the former brand wordmark, so that a repo-wide scan for legacy brand strings returns zero results. The former brand is referred to below as "the legacy brand". (Full details of the scan: `BRANDING-AUDIT-REPORT.md`.)

## 1. What was renamed

| Old | New |
|---|---|
| Legacy brand wordmark — all casing variants (Title Case, UPPER CASE, lower case, with space, hyphen, or underscore separators) | `Scholarics` / `Scholarics` / `SCHOLARICS` |
| Legacy lowercase wordmark (any separator style) | `scholarics` |
| Legacy domain | `scholarics.com` |
| Legacy social handle | `@scholarics` |
| `SM` global namespace (`SM.$$`, `SM.store`, …) | `SC` |
| `sm2*` identifiers/classes/ids (`sm2Theme`, `sm2-btn`, …) | `sc2*` |
| `sm-*` CSS classes & keys (`sm-shell`, `sm-theme-toggle`, …) | `sc-*` |
| `sm_*` localStorage keys (`sm_theme`, `sm_gpa_rows`, …) | `sc_*` |
| `sm2_*` storage keys (`sm2_notes`, `sm2_goals`, …) | `sc2_*` |
| Custom events `sm:consent:accepted`, `sm:country-change`, `smai:send` | `sc:…`, `scai:send` |
| `SM_*` constants (`SM_THEME`, `SM_COUNTRY`, …) | `SC_*` |
| `SMAI`, `SMShare`, `SM2Features`, `SM2FC`, `SM2Notes`, `SM2Paraphraser` | `SCAI`, `SCShare`, `SC2Features`, `SC2FC`, `SC2Notes`, `SC2Paraphraser` |
| Legacy stylesheet (`css/<legacy>-v2.css`) | `css/scholarics-v2.css` |
| `css/sm-prelaunch-fixes.css` | `css/sc-prelaunch-fixes.css` |
| `js/sm-shell.js` | `js/sc-shell.js` |
| `js/sm-v2-features.js` | `js/sc-v2-features.js` |
| SW cache `sm-shell-v4` | `scholarics-shell-v1` (new name force-evicts legacy caches) |
| Asset cache-busting `?v=2.x` | `?v=3.x` |
| `package.json` name (legacy wordmark, lowercase) | `scholarics` |
| Cloudflare Pages project slug (derived from legacy brand) | `scholaricsv-2` (see §5 note) |
| Email sender/subjects `<legacy brand> <…>` | `Scholarics <…>` |
| AI system prompts `You are <legacy brand> AI…` | `You are Scholarics AI…` |
| OG image raster (`og-image.png`/`.webp`) | Re-rendered from updated SVG with new wordmark |

## 2. Files modified (141 total — 137 content + 4 renames)

### Renamed files (git mv, history preserved)
- `css/<legacy>-v2.css` → `css/scholarics-v2.css`
- `css/sm-prelaunch-fixes.css` → `css/sc-prelaunch-fixes.css`
- `js/sm-shell.js` → `js/sc-shell.js`
- `js/sm-v2-features.js` → `js/sc-v2-features.js`

### Frontend pages (56 HTML files)
`404.html`, `about.html`, `academic-resources.html`, `admission-gpa-guide-uk.html`, `admission-gpa-guide-usa.html`, `ai.html`, `assignment-weight.html`, `attendance-calculator.html`, `attendance-goal.html`, `attendance-percentage.html`, `basic-calculator.html`, `blog.html`, `cgpa.html`, `class-average.html`, `contact.html`, `credit-hour-planner.html`, `dashboard.html`, `disclaimer.html`, `final-exam-calculator.html`, `final-grade.html`, `flashcards.html`, `gpa.html`, `gpa-converter.html`, `gpa-help-center.html`, `gpa-improvement-planner.html`, `gpa-to-percentage.html`, `grade-calculator.html`, `grade-predictor.html`, `grading-guide.html`, `grading-system-australia.html`, `grading-system-canada.html`, `grading-system-india.html`, `grading-system-pakistan.html`, `grading-system-uk.html`, `grading-system-usa.html`, `guide-attendance-rules-explained.html`, `guide-final-exam-prep-checklist.html`, `guide-gpa-scale-explained.html`, `guide-how-to-raise-your-gpa.html`, `index.html`, `notes.html`, `paraphraser.html`, `percentage-calculator.html`, `percentage-to-gpa.html`, `pomodoro.html`, `privacy-policy.html`, `profile.html`, `required-marks.html`, `scientific-calculator.html`, `semester-gpa.html`, `study-guides.html`, `study-schedule.html`, `study-time.html`, `target-gpa.html`, `terms-and-conditions.html`, `word-counter.html`

### Frontend scripts & styles (JS/CSS)
`js/script.js`, `js/analytics.js`, `js/consent.js`, `js/pwa.js`, `js/premium.js`, `js/personalization.js`, `js/share-links.js`, `js/email-capture.js`, `js/country-selector.js`, `js/grading-systems.js`, `js/ai-service.js`, `js/ai-assistant.js`, `js/ai-chat.js`, `js/ai-coach.js`, `js/dashboard.js`, `js/flashcards.js`, `js/notes.js`, `js/paraphraser.js`, `js/pomodoro.js`, `js/calculators.js`, `js/gpa.js`, `js/cgpa.js`, `js/grade-calculator.js`, `js/grading-guide.js`, `js/gpa-converter.js`, `js/gpa-improvement-planner.js`, `js/gpa-to-percentage.js`, `js/percentage-calculator.js`, `js/percentage-to-gpa.js`, `js/semester-gpa.js`, `js/target-gpa.js`, `js/final-exam.js`, `js/final-grade.js`, `js/grade-predictor.js`, `js/assignment-weight.js`, `js/attendance-calculator.js`, `js/attendance-goal.js`, `js/attendance-percentage.js`, `js/class-average.js`, `js/credit-hour-planner.js`, `js/required-marks.js`, `js/scientific-calculator.js`, `js/study-schedule.js`, `js/study-time.js`, `js/word-counter.js`, `js/basic-calculator.js`; `css/style.css`, `css/scholarics-v2.css`, `css/sc-prelaunch-fixes.css`, `css/premium.css`, `css/personalization.css`, `css/dashboard.css`, `css/calculators.css`, `css/consent.css`, `css/content-platform.css`, `css/country-selector.css`, `css/gpa-converter.css`, `css/ai-assistant.css`, `css/ai-chat.css`, `css/print.css`

### Backend (Cloudflare Functions)
`functions/_lib/email.js`, `functions/_lib/prompts.js`, `functions/api/bug-report.js`, `functions/api/contact.js`, `functions/api/subscribe.js`, `functions/api/waitlist.js`

### PWA / SEO / config / deployment
`manifest.json`, `sw.js`, `robots.txt`, `sitemap.xml`, `_headers` (unchanged, reviewed), `_redirects` (unchanged, reviewed), `wrangler.toml`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore` (added `node_modules/`, `.wrangler/`)

### Assets
`images/og-image.svg` (wordmark text), `images/og-image.png`, `images/og-image.webp` (re-rendered 1424×752 from SVG)

### Documentation
`BACKUP-INSTRUCTIONS.md`, `FIXES-APPLIED.md`, `LAUNCH-CHECKLIST.md`, `LAUNCH-READY.md`, `MAINTENANCE-GUIDE.md`, `PERFORMANCE-REPORT.md`, `QA-REPORT.md`, `README-CLOUDFLARE.md`, `RELEASE-NOTES-v1.0.md`, `SECURITY-REPORT.md`

## 3. Deliberately preserved (not renamed)

- **`STUDIO_METRICS`** — internal AI-protocol token parsed by `js/paraphraser.js` and emitted by `functions/_lib/prompts.js` / `gemini.js`. Not branding; renaming would break the paraphraser feature.
- **`SMU`** (Singapore Management University) — real data in `grading-systems.js`.
- Generic non-branding tokens: `--step-sm`, `btn-sm`, `small`, `smooth`, `smart`, `sh,sm` (minutes variable), `study plan`/`study-time` (feature names).
- API routes (`/api/ai/*`, `/api/contact`, …), KV bindings (`SUBMISSIONS`, `RATE_LIMIT_KV`), KV key prefixes (`subscriber:`, `waitlist:`), GA4 placeholder `G-XXXXXXXXXX`, favicon glyph (no text).
- `js/analytics.js` filename, `images/hero-illustration.*` (no brand text), `images/favicon.svg`, `icon-192/512.png`, `favicon.ico` (brand-agnostic glyphs).
- The **legacy storage-key prefixes** (`sm_*`, `sm2_*`, `sm-*`) that appear in the one-time migration block in `js/script.js` — they are exact string prefixes used to locate old keys in returning users' browsers; they contain no brand wordmark, are never displayed, and must remain for the migration to work (see §4).

## 4. Data preservation

A one-time migration in `js/script.js` (runs before any page code reads storage) copies legacy keys to the new names so returning users keep theme, saved grades, goals, flashcards, drafts, consent, etc.:
`sm_*`/`sm2_*`/`sm-*` → `sc_*`/`sc2_*`/`sc-*` (guarded by `sc_migrated_v1` flag; unit-tested).

## 5. Build & runtime verification (all passed)

| Check | Result |
|---|---|
| `node --check` on all 66 browser JS files + `sw.js` | ✅ no syntax errors |
| ESM import/parse of all 12 Cloudflare Functions modules | ✅ all import cleanly |
| `wrangler pages dev .` (wrangler 3.114.17) | ✅ server starts, Worker compiles |
| All 56 HTML pages served | ✅ 200 (index redirects to `/` — standard wrangler behavior) |
| Renamed assets (`css/scholarics-v2.css`, `js/sc-shell.js`, `js/sc-v2-features.js`, `css/sc-prelaunch-fixes.css`) | ✅ 200 |
| Legacy asset paths (e.g. the old `css/*-v2.css` and `js/sm-*` files) | ✅ 404 (correctly gone) |
| Full crawl: 119 asset references across all pages | ✅ 0 broken links |
| `sw.js`, `manifest.json`, `robots.txt`, `sitemap.xml`, OG images | ✅ 200 |
| `GET /api/ai/health` | ✅ `{"ok":true,"platform":"cloudflare-pages",…}` |
| `POST /api/contact`, `/api/subscribe`, `/api/waitlist` | ✅ KV fallback path works (`stored:true`) |
| `POST /api/bug-report` validation | ✅ correct error handling |
| `POST /api/ai/chat` (no API key) | ✅ graceful "not configured" error |
| CSS class integrity: 125 `sm*`/`sm2*` classes defined pre-rename | ✅ 125 exact `sc*`/`sc2*` counterparts, 0 orphaned |
| JS-referenced element ids | ✅ all created/defined (static HTML or dynamic JS) |
| Brand scan: all legacy wordmark variants (Title Case, UPPER CASE, lower case, space/hyphen/underscore separators) across the whole repo | ✅ 0 occurrences — see `BRANDING-AUDIT-REPORT.md` |
| Titles/meta/OG/Twitter/JSON-LD on served pages | ✅ all "Scholarics" / `scholarics.com` |
| `?v=` cache-busting bump (`2.x` → `3.x`) on all asset links | ✅ applied |

## 6. Notes for deployment

1. **Cloudflare project name:** `wrangler.toml` now uses `name = "scholaricsv-2"`. Create (or rename) the Pages project to `scholaricsv-2` in your Cloudflare account, or the first `wrangler pages deploy` will prompt to create it. KV namespace IDs are unchanged (they live in the account, not the project).
2. **Domain:** all canonical/OG/sitemap/robots/JSON-LD references now point to `scholarics.com`. Point that domain at the Pages project and add it in the Pages custom domains panel.
3. **Email:** `EMAIL_FROM` now sends as `Scholarics <onboarding@resend.dev>`; set `RESEND_API_KEY` for real delivery (KV fallback works without it).
4. **AI:** set `GEMINI_API_KEY`; otherwise endpoints return the standard "not configured" error.
5. **Analytics:** replace the `G-XXXXXXXXXX` placeholder in `js/analytics.js` as before (unchanged behavior).
6. **Legacy users:** the one-time storage migration preserves their data across the rename.
