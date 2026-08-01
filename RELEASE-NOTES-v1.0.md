# Study Metrics — Version 1.0 Release Notes
**Release Date: July 2026**

---

## Overview

Study Metrics v1.0 is the official public launch of a free, privacy-respecting academic tools platform. It provides students worldwide with GPA calculators, grade trackers, attendance tools, study timers, an AI study assistant, and a personalised student dashboard.

---

## What's Included in v1.0

### Calculators & Tools (33 tools)
- **GPA Calculator** — 4.0, 5.0, and 10.0 scale support
- **CGPA Calculator** — cumulative GPA across multiple semesters
- **Semester GPA Calculator** — single-term calculation
- **GPA Converter** — 30+ country grading systems
- **Grade Calculator** — weighted assignments and coursework
- **Final Grade Calculator** — end-of-term grade projection
- **Final Exam Calculator** — score needed to hit a target grade
- **Target GPA Calculator** — GPA needed to reach a goal
- **Grade Predictor** — project final grade from current standing
- **Required Marks Calculator** — minimum marks to pass
- **Assignment Weight Calculator**
- **Class Average Calculator**
- **Credit Hour Planner**
- **GPA Improvement Planner** — semester-by-semester roadmap
- **Attendance Calculator** — percentage and goal tracking
- **Attendance Goal Calculator**
- **Attendance Percentage Calculator**
- **Percentage Calculator** — general-purpose
- **Percentage to GPA Converter**
- **GPA to Percentage Converter**
- **Study Time Estimator**
- **Study Schedule Builder**
- **Pomodoro Timer**
- **Word Counter**
- **Scientific Calculator**
- **Basic Calculator**

### Country Support (30+ grading systems)
USA, UK, India, Canada, Pakistan, Australia, Germany, France, China, and more via the GPA Converter.

### AI Features
- **AI Study Assistant** — embedded in every calculator, powered by Google Gemini
- **AI Study Coach** — topic-based study guidance
- **AI Chat Interface** — full conversational study help

### Student Dashboard
- GPA history tracking
- Study streak counter
- Tool usage analytics
- Personalised progress overview
- Local storage — no account required

### Content
- 8+ country-specific grading system guides
- 2 university admission GPA guides (US, UK)
- Study guides and academic resource library
- Blog platform

---

## Technical Highlights

### Performance
- All scripts loaded with `defer` — zero render-blocking JS
- CSS minified: 116 KB → 86 KB (26% reduction)
- JS minified: 328 KB → 278 KB (15% reduction)
- SVG assets optimised
- `preload` hints on 8 high-traffic pages
- Google Fonts with `display=swap`
- Estimated Lighthouse scores: Mobile 85+, Desktop 95+

### SEO
- Unique `<title>` and `<meta name="description">` on all 52 pages
- Complete Open Graph and Twitter Card tags everywhere
- `og:locale`, `theme-color`, `twitter:site` on all pages
- WebApplication structured data on all calculators
- BreadcrumbList structured data on all inner pages
- Article structured data on all guide/blog pages
- Valid JSON-LD on 100% of pages
- Sitemap: 51 URLs with accurate `lastmod` dates
- All canonical URLs correct

### Analytics & Monetisation
- Google Analytics 4 with Consent Mode v2
- Cookie consent banner (GDPR/CCPA compliant)
- AdSense integration with consent-gated ad loading
- Bing Webmaster Tools ready

### Security
- `eval()` replaced with `safeEval()` in scientific calculator
- XSS-safe history rendering in scientific calculator
- Security headers via `.htaccess` and `_headers`:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (camera, mic, geolocation, payment disabled)
  - Content Security Policy
- Directory listing disabled
- Sensitive files (`.md`, `.htaccess`) blocked from public access
- HTTPS enforcement with 301 redirects

### Accessibility
- `lang="en"` on all pages
- Skip-link on all pages
- `aria-label` on all icon-only buttons
- `role="button"` + `tabindex="0"` on back-to-top
- Proper `<label for>` on all form inputs
- `prefers-reduced-motion` media query support
- `prefers-contrast: high` media query support

### Hosting Compatibility
- **Apache:** `.htaccess` with mod_deflate, mod_expires, mod_rewrite
- **Netlify / Cloudflare Pages:** `_headers` + `_redirects`
- No build step required — pure HTML/CSS/JS

---

## Known Limitations & Post-Launch TODOs

- **Contact form:** Requires Formspree Form ID before going live
- **AdSense:** Requires approval and Publisher ID replacement
- **Analytics:** Requires GA4 Measurement ID replacement
- **HSTS:** Uncomment in `.htaccess` after confirming HTTPS is stable
- **ads.txt:** Create and upload once AdSense is approved
- **Gemini API key:** Stored client-side — consider proxying via serverless function for rate limiting
- **Dashboard data:** Stored in localStorage — data lost if browser storage is cleared

---

## Files Modified in Phase 10 (pre-launch)

**New files (3):**
`.htaccess`, `_headers`, `_redirects`

**Modified files (52):**
- `js/scientific-calculator.js` — eval() security fix, XSS hardening
- `contact.html` — Formspree placeholder labelled for deployment
- `css/style.css`, `premium.css`, `calculators.css`, `personalization.css` — minified
- All JS files — comments stripped, whitespace reduced
- `images/favicon.svg`, `og-image.svg` — SVG optimised
- 5 HTML pages — SEO title/description length fixes

