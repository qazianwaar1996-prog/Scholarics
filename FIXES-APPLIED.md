# Fixes Applied & Verified — scholaricsv.2

All fixes applied to the mirrored repo in **`/home/user/repo`**. **No filenames were changed.** Verified with a real headless-Chromium mobile render (@390px) against a local serve of the fixed files.

## Verification results (real browser)
| Check | Before | After |
|-------|--------|-------|
| `academic-resources.html` reveal visible | 0/3 (blank) | **3/3 ✅** `<h1>` opacity 1 |
| Hamburger opens (8 tool pages tested) | ❌ no-op | **✅ opens on all** |
| Footer mobile overflow (gpa, etc.) | x=658px | **366px ✅** |
| `word-counter.html` install-button nav overflow | 455px | **366px ✅** |
| Full sample (20 pages) horizontal overflow | 1 page | **0 pages ✅** |
| `index.html` (sc2) hamburger | works | **still works ✅** |
| Desktop install button | visible | **still visible ✅** |
| Edited JS syntax (`node --check`) | — | **all 3 OK ✅** |

## Changed files — download & replace (names unchanged)

### 3 JavaScript files
1. **`js/sc-shell.js`** — (a) marks the toggle `toggle.dataset.scBound='1'` after binding so premium.js can't double-bind it; (b) adds `.sc-install-btn` to the ≤860px nav hide-rule so the PWA install button can't overflow the mobile header.
2. **`js/premium.js`** — guards the `#menuToggle` binding: `if (toggle && navLinks && !toggle.dataset.scBound)`.
3. **`js/content-platform.js`** — adds scroll-reveal activation (`.reveal` → `.active` via IntersectionObserver), so the 15 content pages that load this file instead of premium.js are no longer blank. *(Chosen over importing premium.js because it avoids the `body.premium` skin change and a duplicate progress bar — no side effects.)*

### 51 HTML files — footer fix
On each, the hardcoded inline style was removed:
`<div class="foot-grid" style="grid-template-columns:1.2fr 1fr 1fr 1fr 1fr">` → `<div class="foot-grid">`
so the responsive media queries in `css/style.css` (1100px→3col, 860px→2col, 560px→1col) finally apply.

```
404.html, about.html, academic-resources.html, admission-gpa-guide-uk.html,
admission-gpa-guide-usa.html, ai.html, assignment-weight.html, attendance-calculator.html,
attendance-goal.html, attendance-percentage.html, basic-calculator.html, blog.html,
cgpa.html, class-average.html, contact.html, credit-hour-planner.html, disclaimer.html,
final-exam-calculator.html, final-grade.html, flashcards.html, gpa-converter.html,
gpa-help-center.html, gpa-improvement-planner.html, gpa-to-percentage.html, gpa.html,
grade-calculator.html, grade-predictor.html, grading-guide.html, grading-system-australia.html,
grading-system-canada.html, grading-system-india.html, grading-system-pakistan.html,
grading-system-uk.html, grading-system-usa.html, guide-attendance-rules-explained.html,
guide-final-exam-prep-checklist.html, guide-gpa-scale-explained.html,
guide-how-to-raise-your-gpa.html, notes.html, percentage-calculator.html,
percentage-to-gpa.html, pomodoro.html, privacy-policy.html, required-marks.html,
scientific-calculator.html, semester-gpa.html, study-guides.html, study-schedule.html,
study-time.html, target-gpa.html, terms-and-conditions.html, word-counter.html
```

### 2 page-specific extras (within the 51 above, same files)
- **`academic-resources.html`** — `#resourceGrid` inline `grid-template-columns:1fr 1fr 1fr` → `repeat(auto-fit,minmax(min(220px,100%),1fr))` (responsive).
- **`paraphraser.html`** — `.mini-actions` inline style → added `flex-wrap:wrap`.

## Not changed (intentionally)
- Everything else in the repo is **byte-identical** to your GitHub `main` — including `css/`, images, `manifest.json`, `sw.js`, `server.js`, docs, and the 6 sc2 pages' footers.
- **AI `/api/ai` 404** is left as-is — that's a deployment issue (works under `node server.js` / Replit, not on static GitHub Pages). Not a code bug.
- **Root `attendance-calculator.js`** (orphan duplicate) left untouched — safe to delete yourself if you want, but not required.

## How to use
Download the 3 JS files + the 51 HTML files from `/home/user/repo` (or the whole folder — nothing else changed) and replace them in your repo. Filenames are identical, so it's a straight drop-in.

---

## Round 3 — design-system unification (purple removal + Related cards + hamburger verify)

Root cause of the "old purple UI" on calculator pages: `js/premium.js` added
`body.premium` to every non-sc2 page, which switched on the legacy purple/glass
skin in `css/calculators.css` + `css/scholarics-v2.css` (focus rings, field
labels, grade letters, result heros all turned purple `#a78bfa`/`rgba(124,58,237)`).
The homepage (sc2) never gets that class, so it stayed gold/black.

Verified with rendered colors: WITH `body.premium` the Related-card foot was
`rgb(167,139,250)` (purple) and panels were translucent glass; WITHOUT it the
foot is `rgb(138,100,16)` (gold) and panels are solid white — matching the
homepage exactly.

### Changes
1. **`js/premium.js`** — removed the `document.body.classList.add('premium')`
   call (no JS depends on the class — confirmed by grep). Calculator pages now
   render with the unified gold/black design system in both light & dark themes.
   (The earlier `dataset.scBound` hamburger guard is retained.)
2. **36 HTML pages** — converted the legacy `.rel-card` / `.rel-grid` /
   `.rel-ico` "Related" sections to the real homepage tool-card component:
   `.tool live` / `.tools-grid` / `.tool-ico` + `<h3>` + `<p>` +
   `<span class="tool-foot">Open tool →</span>`. 144 cards total; 0 legacy refs
   remain. Now identical spacing, hover, icons, shadows, and a dedicated
   "Open tool" button per card — same component the homepage uses.

### Verification (real browser)
- `body.premium=false`, purple-styled elements = **0**, tool-foot = **gold**,
  panels = **solid white** (matches homepage).
- Related cards: `.tool-foot "Open tool"` present & visible.
- Hamburger: **0 failures across all 50 old-nav pages** (6 sc2 pages use the
  inline-onclick burger).
- Runtime/console errors: **0 on all 56 pages**. Dark mode intact.
  Calculators still compute correctly (no functional change).

---

## Round 4 — service-worker cache stale + resources-page cards

### Hamburger "still broken on mobile" — root cause: stale Service Worker cache
The fix from Round 2 IS deployed and works for fresh visitors (verified on the
live site with real mobile+touch: `nav-links.open=true`, menu displays). But
returning visitors had the **old** `sc-shell.js`/`premium.js` (pre-fix) stuck in
the Service Worker cache — `sw.js` serves JS **cache-first** (`sc-static-v2.4`)
and only drops old caches when its version string changes.

**Fix:** `sw.js` — bumped `CACHE_NAME`/`HTML_CACHE` `v2.4 → v2.5`. On next visit
the browser updates the SW, `skipWaiting()`+`clients.claim()` activate it, the
activate handler deletes the v2.4 caches, and the fixed JS is re-fetched.
(`pwa.js` then reloads on `controllerchange`.) No filename change.

### academic-resources.html calculators were plain links, not cards
The "View All Tools" directory listed calculators as bare `<a>` text links.
**Fix:** converted all 25 calculator links into the real homepage `.tool` card
component — each with an icon, title, short description, and a dedicated
`<span class="tool-foot">Open tool →</span>` button — grouped into category
card-grids (GPA & Grades, Grades & Exams, Attendance & Planning). Verified:
25 cards / 25 visible buttons on desktop and mobile, no overflow.

---

## Round 5 — the REAL hamburger root cause + exact card match

### Hamburger: root cause was CSS clipping, NOT the JS binding
Previous rounds fixed the JS double-binding (real) but the menu STILL appeared
to do nothing. The actual reason: `sc-shell.js` injected
`.site-head{max-width:100vw;overflow:hidden}`. Because `.site-head` is
`position:sticky` (the containing block) and `.nav-links.open` is
`position:absolute; top:64px` extending 263px below the 65px header, the
`overflow:hidden` CLIPPED the open menu to nothing — it toggled `.open` but was
invisible. (My earlier tests only checked the `.open` class / element rect, not
actual paint visibility via `elementFromPoint`, so they wrongly reported "works".)

**Fix:** `js/sc-shell.js` — removed `overflow:hidden` from the injected
`.site-head` rule (now `.site-head{max-width:100vw}`). Horizontal overflow is
still handled by the existing `html,body{overflow-x:hidden}`.
**Verified:** with the email-capture popup suppressed, all **50 old-nav pages**
open AND paint the menu (`elementFromPoint` returns a nav link) — 0 failures.

### Cards: exact homepage match
All "Related Calculators"/"Related Tools"/resources sections already use the
`.tool` component with a dedicated "Open tool" button (0 plain-link `.rel-card`
left). The only remaining difference vs the homepage `.sc2-tool` was a missing
resting shadow.
**Fix:** `css/style.css` — added the exact homepage resting shadow to `.tool`
(`0 1px 2px rgba(30,25,15,.04),0 2px 6px rgba(30,25,15,.05)`). Now byte-identical
styling to the homepage cards, plus the "Open tool" button.

### Why it looked unfixed on your device
`sw.js` serves JS/CSS **cache-first**; until the version bump (v2.5, Round 4)
propagates, your phone kept running the old clipped CSS. After deploying this
zip, visit once or twice (or clear site data) so the new service worker activates.
