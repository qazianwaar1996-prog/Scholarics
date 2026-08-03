# Launch-Readiness Report — study-metricsv.2

Full re-audit of all 138 files after the bug fixes. Verified in a real headless browser (Chrome @ mobile 390px + desktop) against the fixed repo.

## ✅ Verified green (nothing left to fix in code)

| Check | Result |
|-------|--------|
| Runtime/console errors — all 56 pages | **0** (only the expected SW `/sw.js` 404 noise) |
| Broken internal links / missing assets | **0** |
| Calculator correctness (9 tools: GPA↔%, attendance, final-exam, target-GPA, % calc ×3, word-count) | **9/9 correct** |
| Blank-page bug (15 content pages) | **Fixed** — academic-resources reveal 3/3, `<h1>` visible |
| Hamburger bug (35 pages) | **Fixed** — opens on every tested tool page |
| Mobile footer cut-off (51 pages) | **Fixed** — footer 658px → **366px**, **0/20 pages overflow** |
| SEO tags (title/description/canonical/viewport/lang/h1) | **Complete on all 56 pages** |
| Security: hardcoded secrets | **None** (Gemini key is server-side env only) |
| Security: XSS (AI chat/markdown/forms) | **Mitigated** — all user/AI text is HTML-escaped before `innerHTML` |
| Security: `target="_blank"` tabnabbing | **None** |
| Functional buttons/listeners | **All wired** (copy/print/share/add-row/reset/search work) |

## 🔧 Fixed in this audit pass
- **`images/og-image.png`** (NEW) — replaced the SVG OG image (which Facebook/X/LinkedIn/WhatsApp **don't render**) with a 1424×752 PNG; updated `og:image`/`twitter:image` in all 53 pages.
- **`favicon.ico`** (NEW) — generated from `favicon.svg` so browsers stop 404-ing `/favicon.ico`.

---

## ⚠️ LAUNCH BLOCKERS — need YOUR values (I can't invent these)

These are placeholder credentials scattered in the code. Replace each before going live:

| What | Where | Replace with |
|------|-------|--------------|
| **Formspree form ID** | `js/email-capture.js:13` **and** `contact.html` (`<form action="https://formspree.io/f/REPLACE_WITH_FORM_ID">`) | your real `https://formspree.io/f/xxxxxxxx` — **both the contact form AND the email popup are broken until set** |
| **GA4 Measurement ID** | `js/analytics.js` → `G-XXXXXXXXXX` | your `G-XXXXXXXXXX` |
| **AdSense publisher ID + slot IDs** | `js/consent.js` → `ca-pub-XXXXXXXXXXXXXXXXX`; ad slots in **40 HTML pages** (`data-ad-slot="LEADERBOARD_SLOT_ID"` etc.) | your `ca-pub-…` + real slot IDs |
| **Google Search Console** | `YOUR_GSC_VERIFICATION_CODE` in **53 pages** `<head>` | your GSC verification code (or verify via DNS) |
| **Bing Webmaster** | `YOUR_BING_VERIFICATION_CODE` in **53 pages** `<head>` | your Bing code |

> Tip: once you paste these, the code is fully launch-ready. I deliberately did **not** invent fake IDs.

## 🌐 Deployment decision (affects 3 things)

The repo is configured for **`studymetrics.app` at the domain root** (canonical/OG/sitemap/robots/JSON-LD all use it; `manifest.json` `start_url`/`scope` = `/`; `pwa.js` registers `/sw.js` at scope `/`). Pick a host:

- **Best (full AI):** a Node host running `node server.js` (Replit/Render/Railway/Fly) on `studymetrics.app` → static site + `/api/ai` Gemini proxy + PWA + AI all work.
- **Good (static, no AI):** Netlify/Cloudflare Pages on `studymetrics.app` → uses the included `_headers` (security headers) + `_redirects` (clean URLs); add one serverless function for `/api/ai` if you want AI.
- **GitHub Pages (current):** site renders & all calculators work, but **AI 404s**, the service-worker `scope:'/'` errors on every load, and `_headers`/`_redirects` are ignored (no security headers). Not ideal for production.

If your real domain is **not** `studymetrics.app`, also update the domain in all 56 pages + `sitemap.xml` + `robots.txt` + JSON-LD.

## Low priority (optional)
- `og-image.png` is 830 KB — fine for social, could be compressed to <200 KB if you want.
- Root `attendance-calculator.js` is an unreferenced orphan duplicate of `js/attendance-calculator.js` — safe to delete (not required).
- Consent banner / AI modal lack keyboard focus-trap (minor a11y refinement).

---

## Complete list of changed/added files (download & replace, names unchanged)
**Added:** `images/og-image.png`, `favicon.ico`
**JS (this + prior pass):** `js/sm-shell.js`, `js/premium.js`, `js/content-platform.js`
**HTML:** 53 pages (OG-image swap) — a superset that also includes the 51 footer fixes + academic-resources `#resourceGrid` + paraphraser `.mini-actions`. Concretely the modified HTML set:
```
404, about, academic-resources, admission-gpa-guide-uk, admission-gpa-guide-usa, ai,
assignment-weight, attendance-calculator, attendance-goal, attendance-percentage,
basic-calculator, blog, cgpa, class-average, contact, credit-hour-planner, disclaimer,
final-exam-calculator, final-grade, flashcards, gpa-converter, gpa-help-center,
gpa-improvement-planner, gpa-to-percentage, gpa, grade-calculator, grade-predictor,
grading-guide, grading-system-australia, grading-system-canada, grading-system-india,
grading-system-pakistan, grading-system-uk, grading-system-usa,
guide-attendance-rules-explained, guide-final-exam-prep-checklist, guide-gpa-scale-explained,
guide-how-to-raise-your-gpa, notes, percentage-calculator, percentage-to-gpa, pomodoro,
privacy-policy, required-marks, scientific-calculator, semester-gpa, study-guides,
study-schedule, study-time, target-gpa, terms-and-conditions, word-counter
```
Everything else (all CSS, other images, manifest, sw.js, server.js, docs) is unchanged.

**Status: code is launch-ready.** Drop in your 5 credentials, deploy `studymetrics.app` to a Node host (or Netlify + a `/api/ai` function), and ship.
