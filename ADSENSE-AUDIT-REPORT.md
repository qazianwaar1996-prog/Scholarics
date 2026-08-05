# Scholarics — Google AdSense Readiness Audit Report

**Date:** 5 August 2026
**Scope:** Full AdSense readiness audit of the production site (57 HTML pages, 27 calculators, 40 ad-slot holders)
**Constraint respected:** No redesign, no branding/routing/calculator/backend changes. Only compliance-driven changes were made.

---

## 1. Executive summary

The site is **structurally well-positioned for AdSense approval**: it has real, functional tools, a complete legal stack, mobile-first layouts, no signup walls, and honest, non-misleading UI. The audit found **6 issues that would hurt approval or block monetisation**, all now fixed:

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | `index.html` (homepage) had **no footer and no legal links** | High | ✅ Fixed |
| 2 | `dashboard.html`, `profile.html`, `paraphraser.html` had no footer/legal links | High | ✅ Fixed |
| 3 | `notes.html` and `flashcards.html` footers omitted Privacy/Terms/Contact | Medium | ✅ Fixed |
| 4 | **Disclaimer page not linked from the footer** on ~52 pages | Medium | ✅ Fixed (all 57 pages now link it) |
| 5 | **`ads.txt` missing** (required before ad serving) | High | ✅ Created |
| 6 | Indexable **placeholder pages** (`ai.html`, `paraphraser.html`, `blog.html` said "Coming Soon") | Medium | ✅ Fixed / de-indexed |
| 7 | CSP in `_headers` would **block AdSense scripts** once enabled | High (future) | ✅ Fixed |

One pre-existing test-suite failure (`tests/backend.test.js` "health endpoint reports mock mode") exists on the pristine checkout too — it is a test/endpoint contract mismatch, **not** a production defect (details in §9).

---

## 2. Required pages — exist, accessible, linked from the footer

All five required pages exist, return HTTP 200, are canonicalised, and are **now linked from the footer of every page**:

| Page | Exists | Linked in footer (all 57 pages) | Notes |
|------|--------|---------------------------------|-------|
| Privacy Policy (`privacy-policy.html`) | ✅ | ✅ | 691 words; covers data collection, cookies, **Advertising & Google AdSense**, GDPR/CCPA, opt-outs, children's privacy, contact. Last updated 19 Jul 2026. |
| Terms & Conditions (`terms-and-conditions.html`) | ✅ | ✅ | 508 words; "as-is" tool disclaimer, links to Disclaimer. |
| About Us (`about.html`) | ✅ | ✅ | 294 words; mission + values. |
| Contact Us (`contact.html`) | ✅ | ✅ | Working form (`POST /api/contact`) + direct email `hello@scholarics.com` + stated response time. AdSense reviewers require a reachable contact path — this satisfies it. |
| Disclaimer (`disclaimer.html`) | ✅ | ✅ | 379 words; results-are-estimates disclaimer. **Was missing from the site footer** — now linked on every page. |

Before this audit, the homepage and the three app-shell pages (`dashboard`, `profile`, `paraphraser`) had **no footer at all**, and the Disclaimer was only reachable via the 404 page, the Terms page, and profile settings. All fixed.

---

## 3. Thin or low-value content

### 3.1 Fixed during this audit

- **`blog.html`** — was an indexable page whose entire body read *"Articles Coming Soon"* (~148 words of placeholder). Replaced with a real content hub linking the site's **12 existing, substantial articles** (4 study guides, 6 country grading guides, 2 admission guides) using the site's existing card design. No new files were needed; the articles already existed.

### 3.2 De-indexed (pre-launch features — not launchable by an audit)

- **`ai.html` (AI Tutor), `flashcards.html`, `paraphraser.html`** are fully built but **gated behind "Coming Soon" banners** (the chat UIs are hidden with `display:none`, and the backend requires a `GEMINI_API_KEY` that isn't configured). These are intentionally pre-launch pages.
  - `ai.html` and `paraphraser.html` were **indexable** — set to `noindex, follow`.
  - Removed all six `noindex` pages (`ai`, `dashboard`, `flashcards`, `notes`, `paraphraser`, `profile`) from `sitemap.xml` (noindexed URLs must not be in the sitemap).
  - The pages remain in the navigation (removing them would be a navigation/routing change outside this audit's scope). **Recommendation: launch these features or remove them from the nav before applying** — a reviewer clicking "AI Tutor" and landing on "Coming Soon" is the single largest remaining approval risk.

### 3.3 Monitored — acceptable as-is

- **Calculator pages** run 229–664 words each (see §4) — above the thin-content danger zone, and each has unique intro + formula + FAQ prose.
- **`profile.html` / `dashboard.html` / `notes.html`** are app pages (personal dashboards, not content pages) — correctly `noindex`.
- **`basic-calculator.html`** (229 words) is the thinnest calculator but has a real "About This Calculator" + usage FAQ; acceptable for a utility.

---

## 4. Calculator content — explanation, instructions, education

Audited all **27 calculator pages** for: (a) clear explanation, (b) usage instructions, (c) helpful educational content.

- **Every calculator** has a descriptive `<h1>` intro (e.g., *"Convert your percentage marks to any GPA scale — US 4.0, Pakistan, India 10-point, Nigeria 5.0, and more."*) and formula/explanation sections ("About", "How it works", "Formula", FAQs).
- 24 of 27 already contained "How to use"/FAQ/tips sections.
- **Two were table-only with zero educational prose** — improved without touching the calculators' logic or layout:
  - `gpa-converter.html` — added **"How GPA Conversion Works"** section (band-mapping explanation, WES-style examples, 3-question FAQ).
  - `percentage-to-gpa.html` — added **"How the Conversion Works"** section (band examples, 3-question FAQ).
- `gpa-simulator.html` (664 words, 12 educational markers) is the strongest page and is the site's flagship.

---

## 5. Navigation

- Global nav (all pages): Home, Calculators, GPA Simulator, Dashboard, AI Tutor, Notes, Resources — consistent across the app-shell and legacy pages; `js/sc-shell.js` unifies old-page navbars at runtime.
- Every page has: breadcrumbs, a "related tools" section, a 4-column site footer, and a search box (`⌘K`).
- **Footer now consistent site-wide**: every page's footer links About, Blog, Contact, Privacy, Terms, Disclaimer (previously the homepage and 3 app pages had none).
- Mobile: hamburger menu + fixed bottom nav on app pages.
- **Verdict:** intuitive; no dead-end pages.

---

## 6. Broken pages, placeholders, unfinished content

- **Broken links:** scripted crawl of all `href="*.html"` across all 57 pages — **0 broken links** (all 404s served by `/404.html`, which is `noindex` and links the full footer).
- **Placeholders found & handled:** `blog.html` (fixed with real content), `ai.html`/`paraphraser.html` (de-indexed; pre-launch), `flashcards.html` (already noindex; pre-launch), `notes.html` title duplication is a false positive (second `<title>` lives inside a JS print-window string, not the document head).
- **Empty AdSense `<ins>` slots** (40 pages, `data-ad-client="" data-ad-slot=""`): render nothing (0-height) until a publisher ID is configured — not user-visible, not misleading. Documented as a pre-launch step (§8).
- **"Premium" modal**: shows only when invoked, advertises features honestly as "coming soon" with an email waitlist — not misleading.

---

## 7. Duplicate content

Pairwise word-overlap analysis of all page bodies (nav/footer stripped):

- Only two pairs exceeded 60%: `cgpa ↔ gpa-converter` (63%) and `gpa-converter ↔ gpa` (67%) — the overlap is driven by shared "related tools" blocks and calculator vocabulary, not duplicated article text. The pages have distinct intros, formulas, and FAQs.
- The 12 guide articles are unique, substantive pieces; the 6 country grading guides share a template but each has country-specific content.
- **Verdict:** no duplicate-content policy risk.

---

## 8. Mobile-friendliness

- **All 57 pages** carry `<meta name="viewport">`.
- Responsive CSS with 30+ `@media` breakpoints across the stylesheets (grid → single column; app shell collapses to a hamburger drawer; fixed bottom nav on ≤1024px).
- All images have `width`/`height` or are CSS-scaled; `html,body{overflow-x:hidden}` prevents horizontal scroll.
- The new app-shell footer adds bottom padding on small screens so the fixed mobile nav never covers the legal links.
- Tests: UI suite (33) + integration suite (24) render every page with jsdom with zero console errors.

---

## 9. Popups / intrusive or misleading UI

- **Cookie-consent banner** (`js/consent.js`): a non-blocking **bottom bar**, shown only until the visitor chooses, with Accept/Decline, links the Privacy Policy, and **does not load any ad script until consent is given** (and only when a real `ca-pub-…` ID is set). GDPR/EEA-compliant, not intrusive. ✅
- **Email-capture modal** (`js/email-capture.js`): appears at **45 s or 3 pageviews** (never on load), once per session, dismissible (×, "No thanks", backdrop/Esc), with a **7-day cooldown** after any dismissal and permanent suppression after subscribing. This is within AdSense's interstitial guidelines, but it is the only overlay on the site — **recommendation:** keep it dismissible (already is) and consider raising the trigger to ≥60 s if the site is rejected on "poor ad experience."
- **No ad popups, no fake close buttons, no forced downloads, no autoplay media, no "surprise" redirects.** ✅
- **GTM/GA4** analytics present (G-X8E8T88FX8) — fine.

---

## 10. AdSense-specific readiness items

| Item | Status |
|------|--------|
| `ads.txt` at root | ✅ **Created** (`ads.txt`) — placeholder line must be replaced with the real publisher ID after account approval (see file comment; `#` lines are ignored by crawlers) |
| `robots.txt` | ✅ Allows `Mediapartners-Google` (Google's ad crawler) and `adidxbot`, disallows `/api/`, `/functions/`, `/*.md`, lists the sitemap |
| Privacy policy covers ads/cookies | ✅ Dedicated "Advertising, Google AdSense & your choices" section + cookie table + opt-outs |
| Consent before ad cookies (EEA) | ✅ Consent banner gates `pagead2.googlesyndication.com` script loading |
| CSP allows AdSense | ✅ **Fixed** — `_headers` CSP now permits `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com` in `script-src`/`connect-src`/`frame-src` (was blocked before) |
| Sitemap only indexable pages | ✅ 50 URLs, all indexable, all resolve |
| Canonical + robots meta on all pages | ✅ 57/57 pages |
| 404 page | ✅ Custom, `noindex`, with nav + full footer |
| Contact path | ✅ Form + email |
| Empty ad units | ⚠️ Ready but inert until `js/consent.js` `PUB_ID` and per-slot `data-ad-slot` values are filled in (pre-launch step, unchanged by design) |

---

## 11. Files modified

**Legal / footer compliance**
- `index.html`, `dashboard.html`, `profile.html`, `paraphraser.html` — added the app-shell footer (Company / Legal / Popular Tools / Resources; Privacy, Terms, Disclaimer, About, Contact, GPA Simulator links)
- `notes.html`, `flashcards.html` — added Contact, Privacy Policy, Terms & Conditions, Disclaimer to the footer
- All 50 remaining content pages — added `Disclaimer` link to the footer (next to Privacy/Terms)
- `css/scholarics-v2.css` — added `.sc2-footer` styles (matches existing shell design)
- `assets/css/shell.cc3a5b31.css` (new fingerprint, replaces `shell.67197acc.css`), `sw.js` — regenerated by `npm run build`

**Placeholder / thin content**
- `blog.html` — replaced "Articles Coming Soon" with a real hub of the 12 existing articles
- `gpa-converter.html`, `percentage-to-gpa.html` — added educational "How it works" + FAQ sections

**SEO (required by this audit)**
- `ai.html`, `paraphraser.html` — `robots` → `noindex, follow` (pre-launch pages)
- `sitemap.xml` — removed the 6 noindexed pages; still valid XML, 50 URLs

**AdSense infrastructure**
- `ads.txt` — created (root-level; fill in publisher ID after approval)
- `_headers` — CSP now allows AdSense script/connect/frame endpoints

**Regenerated by the repo's own build pipeline (fingerprint swap only):** the remaining 50-odd `.html` pages' `<link>` tags now point at `assets/css/shell.cc3a5b31.css`.

> No calculator logic, backend code, routing, branding, or page design was changed. `npm test`: Core 31/31, UI 33/33, Integration 24/24 pass.

---

## 12. Recommended pre-launch steps for the owner (outside audit scope — needs your values)

1. **After AdSense account approval:** put your publisher ID in `ads.txt` (`google.com, pub-XXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`) and in `js/consent.js` (`PUB_ID`).
2. Fill the per-slot `data-ad-client` / `data-ad-slot` on the 40 `ins.adsbygoogle` blocks (see `LAUNCH-CHECKLIST.md`).
3. **Decide the AI pages:** launch `ai.html`/`flashcards.html`/`paraphraser.html` (configure `GEMINI_API_KEY` and remove the "Coming Soon" banners), or remove them from the navigation before applying. They are currently honest "coming soon" pages, but a reviewer seeing them in the primary nav is the top remaining risk.
4. Keep adding ~1 substantive article per month to `blog.html`'s hub — AdSense favors sites with regularly updated, original content.
5. Consider raising the email-capture trigger (45 s → 60 s+) if you ever see a "poor ad experience" rejection.
6. Pre-existing test note: `tests/backend.test.js` expects `GET /api/ai/health` to return `{mock:true}`, but `functions/api/ai/health.js` intentionally omits infrastructure details (per its own comment). Either update the test to assert only `{ok:true, aiAvailable:true}` under `AI_MOCK=1`, or run the backend suite with the mock bindings the test already sets. Not a production issue.
