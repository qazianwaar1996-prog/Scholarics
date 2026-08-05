# GPA Simulator — Improvement Report

**Date:** 2026-08-05 · **Scope:** `gpa-simulator.html`, `js/gpa-simulator.js`, `js/gpa-simulator-core.js` (new), `functions/api/ai/coach.js` (new), `functions/_lib/gemini.js`, `functions/_lib/prompts.js`, `README-CLOUDFLARE.md`, `package.json`, `tests/`

The GPA Simulator was **improved in place** — the UI, architecture, and Scholarics SC-namespace integration are preserved, no features were removed, and all existing functionality (multi-semester tracking, what-if simulation, target reverse-calculation, sparkline, share links, PDF export, AI coaching panel, auto-save) still works. Verdict at the end: **77 automated checks pass, zero console errors, zero regressions, math verified against hand calculations.**

---

## 1. AI Coach routed through the Cloudflare backend (security)

**Before:** the simulator called `generativelanguage.googleapis.com` directly from the browser with `window.SCHOLARICS_GEMINI_KEY` — the key lived in frontend JS and the call was also blocked by the site's CSP (`connect-src 'self'`).

**After:**
- New endpoint **`POST /api/ai/coach`** (Cloudflare Pages Function) — the client sends only simulator state (`scaleId`, `target`, semesters/courses); the **server recomputes all analytics** (CGPA, semester GPAs, strengths, weaknesses, priorities, progress %) and asks Gemini for a structured JSON coaching report. The Gemini key is read from `env.GEMINI_API_KEY` inside the Worker only.
- The frontend posts to the same-origin `/api/ai/coach` with a 30 s `AbortController` timeout and a **deterministic local fallback** (same report schema, computed client-side) when the backend is unreachable — the button always delivers value.
- Verified: UI test asserts no request ever contains `generativelanguage.googleapis.com`, `AIza…`, or a key name; backend tests confirm responses never include the key. Existing `AI_MOCK=1` mode now echoes the real analytics from the prompt so local/CI tests exercise true numbers.

## 2. Multiple GPA scales with a modular grading system

New pure module **`js/gpa-simulator-core.js`** (`window.SCSimCore`) — no DOM, no storage, unit-testable in Node:

| Scale | Type | Grade entry | Example |
|---|---|---|---|
| 4.0 (USA) | letter | A+, A, A− … F | A = 4.0 |
| 4.3 (A+ premium) | letter | A+ = 4.3 | A+ = 4.3 |
| 5.0 | letter | 0.5-step points | B+ = 4.0 |
| 7.0 (Australia) | letter | HD, D, C, P, N | HD = 7.0 |
| 10.0 (India) | number | 0–10, step 0.01 | 8.5 → 8.5 pts |
| Percentage | number | 0–100, step 0.1 | 85 → 85% |

- **Scale selector** in the existing panel; switching **converts every existing grade** (ratio of scale maxima, nearest-letter for letter targets) so no data is lost.
- Target input + slider **re-range per scale** (`/ 10.0`, `/ 100%` labels), the "needed grade" reverse-calc works on every scale (e.g. "Need 9.31", "Need 85%", "Need HD"), the sidebar **scale reference** renders dynamically, and classification ("Excellent standing", …) is scale-relative.
- Share links, CSV, PDF, copy-results and the AI coach all carry the scale.

## 3. New features (UI preserved)

- **Undo** button (in the existing row toolbar) — restores deleted courses, cleared semesters and deleted semesters (stack of 20, disabled state, focus-safe).
- **Export CSV** — one row per course with semester/grade/points/credits + scale/CGPA/target summary; BOM + RFC-4180 quoting for Excel.
- **Copy results** — plain-text summary (CGPA, target, credits, per-semester GPAs) via `SC.copy`.
- **Keyboard accessibility** — semester tabs are a real tablist: roving `tabindex`, `aria-selected`, Arrow keys/Home/End (with focus moved to the *fresh* node after re-render); Enter commits / Escape reverts the semester-name editor; focus is moved sensibly after deleting a course; `role="cell"` on row cells.
- **Dark mode** — fixed the two components the global dark theme broke: `.sim-result-card` (was light background + white text) and the footer (was light background + light text); tab GPA badge contrast. Everything else already used CSS variables.
- **Mobile** — semester tabs scroll horizontally on ≤640 px (touch scrolling, hidden scrollbar), scale selector stacks, toolbar buttons flex, priority list collapses to one column.

## 4. Performance

| Issue | Fix |
|---|---|
| Every keystroke rebuilt **all** course rows via `innerHTML` (and destroyed the focused input mid-typing) | Event delegation on `#simRows` (bound once, `input` + `change` + `click`), state updates + **targeted tag updates** only — the input node is never replaced while typing |
| Per-row `onclick`/`oninput` closures re-attached on every render | Single delegated listeners; `renderTabs`/`renderRows` no longer attach anything |
| `localStorage` write on every keystroke | 300 ms debounced `saveSoon()` + flush on `pagehide`/`visibilitychange`; unchanged values are skipped |
| Redundant recomputation of needed-grade tags for the whole table on each edit | `updateNeededTags()` only rewrites `.c-need` cells (no DOM rebuild); sparkline/hero updates are cheap, targeted |

Verified by tests: typing four characters produces **exactly one** `sc_sim_semesters` write, and the input element stays connected/focused throughout.

## 5. Reliability

- **Corrupted localStorage** (bad JSON, garbage target, unknown scale) → sanitised fallback to defaults, no crash, no console errors.
- **Duplicate IDs** in saved/share data are detected and regenerated; missing IDs are assigned; names/credits are length-capped and clamped (credits 0–50); semester/course counts capped (12 / 20).
- **Share links verified**: encode `sim` + `tgt` + `scale`; legacy v1 links (arrays without ids/scale) still restore; malformed/empty scenarios fall back to saved data instead of breaking; a "shared result" banner appears after restore.
- **Calculations verified**: every GPA/needed-grade formula is unit-tested against hand-computed values on all six scales; display rounding now happens in decimal space (`fmtGpa`), eliminating float artifacts like `9.075 → "9.07"`.
- New semesters/courses get collision-safe IDs (`timestamp + random`).

## 6. Enhanced AI Coach content

The coach report now covers exactly what was requested: **strengths**, **weaknesses**, **target-GPA progress** (current vs target, gap, % bar), **subject priorities** (with high/medium/low urgency chips and reasons), a **7-day weekly study plan** (day, focus, tasks), and a short closing **advice** paragraph. Same panel, same button — richer output. Server-side prompt builder + JSON-mode schema in `functions/_lib/prompts.js`; report shape is normalised server-side (never trust the model's JSON blindly).

## 7. SEO / accessibility / lightweight / SC namespace

- SEO: FAQ updated for multi-scale support, JSON-LD `featureList` and description updated, `<h1>`/description mention the six scales. Page stays dependency-free (no frameworks, pure SVG chart, no new network requests).
- Accessibility: tablist semantics + arrow keys, `aria-selected`/`aria-busy`/`aria-disabled`/`aria-live` maintained, `role="cell"`, labels on all new controls.
- Compatible with the Scholarics `SC` namespace: uses `SC.$/$$/round/clamp/esc/uid/store/toast/copy` and `SCShare` exactly as before; new shared math lives in `SCSimCore` (also usable by other tools later).

## 8. Dead code & comments

Removed: the frontend Gemini call + key plumbing, the per-render listener re-binding, an unused sparkline accumulator, stale `void` statements, and the old hard-coded letter tables (moved into the scale registry). Comments were kept only where they explain non-obvious intent (sanitisation rules, debounce, focus-safety, EPSILON-free rounding).

---

## Testing — 77 checks, all passing

Run with `npm test` (or `node tests/run-all.js`):

1. **`tests/core.test.js` — 31 unit tests** for `SCSimCore`: GPA maths on all six scales against hand calculations, needed-grade reverse maths (+ impossible/already-met/letter/numeric formatting), grade conversion between scales, scale-relative classification, sanitisation (garbage, dup IDs, caps, junk rows, empty-semester preservation), progress %, rounding.
2. **`tests/simulator-ui.test.js` — 33 jsdom tests** loading the **real page with every site script** against a local static server (stubbing only browser APIs jsdom lacks): zero console errors on load; default render (CGPA 3.63); focus retention while typing; live grade/credit updates; add/delete/undo for courses, semesters and clears; scale switching incl. grade conversion and target re-ranging (10.0 → CGPA 9.08, % → 90.75, 5.0 → 4.45, 7.0 → HD/C/D mapping); needed tags on numeric scales; share-link round-trip, legacy v1 link, malformed link; corrupted localStorage recovery; ID dedupe; CSV contents; copy-results text; PDF path; AI coach success, fallback and **no-key-leak**; arrow-key tab nav; Enter/Escape editor; debounced single localStorage write; dark-mode attribute + rules; scale persistence.
3. **`tests/backend.test.js` — 13 API tests** running `wrangler pages dev` with `AI_MOCK=1`: coach 200 + schema + analytics echo, 10.0-scale payload, unknown-scale fallback, 400s for empty/missing/zero-credit/garbage inputs, oversized payload caps, GET rejected, plus **regressions** on `/api/ai/study-plan`, `/api/ai/chat`, `/api/ai/health` and static page serving — all still green.

Also verified: no `SCHOLARICS_GEMINI_KEY` / `generativelanguage.googleapis.com` references remain in any frontend file; every ID referenced by the simulator JS exists in the HTML; no duplicate HTML IDs; all changed JS/ESM files pass `node --check`.

## Files changed

| File | Change |
|---|---|
| `js/gpa-simulator-core.js` | **new** — modular grading scales + pure GPA/needed/conversion/sanitisation maths (`SCSimCore`) |
| `js/gpa-simulator.js` | v2.0 rewrite on the same architecture: backend AI coach, multi-scale, undo, CSV/copy, debounced saves, delegated events, sanitised loading, a11y |
| `gpa-simulator.html` | scale selector, Undo/Copy/CSV buttons, dynamic scale reference + target suffix, coach copy, dark-mode & mobile CSS, FAQ/JSON-LD, script tags |
| `functions/api/ai/coach.js` | **new** — server-side analytics + Gemini JSON coaching report |
| `functions/_lib/prompts.js` | `GPA_COACH_SYSTEM` + prompt builder |
| `functions/_lib/gemini.js` | dynamic coach mock for `AI_MOCK=1` |
| `README-CLOUDFLARE.md` | documents `/api/ai/coach` |
| `package.json` | `npm test` → `node tests/run-all.js`; jsdom devDependency |
| `tests/` | three suites above |

## Compatibility notes

- Existing saved data (`sc_sim_semesters`, `sc_sim_target`) loads unchanged (defaults to the 4.0 scale when `sc_sim_scale` is absent).
- Old share links (no `scale` param) restore exactly as before; new links include `scale` and remain readable by the old page (it will ignore the scale param).
- Deployment needs no new secrets: the coach endpoint reuses the existing `GEMINI_API_KEY` secret and `RATE_LIMIT_KV` binding.
