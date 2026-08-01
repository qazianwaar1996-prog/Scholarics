# Study Metrics — Maintenance Guide
**Version 1.0**

---

## Monthly Maintenance Tasks

### Analytics Review
1. Open Google Analytics 4 → Reports → Acquisition
2. Check top pages by users — ensure calculators dominate
3. Review bounce rate on calculator pages (target < 40%)
4. Note any sudden traffic drops (algorithm updates)

### Search Console Review
1. Open Google Search Console → Performance
2. Check for pages with declining impressions
3. Review Core Web Vitals report — fix any "Poor" pages
4. Check Coverage → Errors for any new 404s or crawl issues
5. Submit new/updated pages via URL Inspection → Request indexing

### Link Check
```bash
# Install link checker
npm install -g broken-link-checker
blc https://studymetrics.app --recursive --exclude-external
```

### Sitemap Update
When adding or removing pages, update `sitemap.xml`:
1. Add/remove `<url>` entries
2. Update `<lastmod>` to today's date
3. Re-submit sitemap in Google Search Console

---

## Quarterly Maintenance Tasks

### Content Refresh
- Update grading-system pages if country grading scales change
- Refresh GPA admission guides with current university data
- Review blog posts for accuracy
- Update copyright year in footer (search for `© 2024`)

### Dependency Audit
- Google Fonts: verify font family still available
- Formspree: confirm plan limits not exceeded
- AdSense: review ad performance and placement

### Performance Audit
Run Google PageSpeed Insights on top 5 pages:
- https://studymetrics.app/
- https://studymetrics.app/gpa-converter.html
- https://studymetrics.app/gpa.html
- https://studymetrics.app/dashboard.html
- https://studymetrics.app/ai.html

Target: mobile ≥ 85, desktop ≥ 95

### Security Headers Check
Run https://securityheaders.com — target grade A or higher.
If CSP errors appear (blocked resources), update `Content-Security-Policy` in `.htaccess`.

---

## Adding New Pages

1. Copy the closest existing page as a template
2. Update: `<title>`, `<meta name="description">`, `<link rel="canonical">`
3. Update all `og:` and `twitter:` meta tags
4. Add appropriate `<script type="application/ld+json">` structured data
5. Add the new URL to `sitemap.xml` with today's date
6. Add navigation links from related pages
7. Test the page locally, then deploy
8. Submit URL in Google Search Console for fast indexing

### Required meta tags for every new page:
```html
<meta charset="UTF-8">
<meta name="google-site-verification" content="YOUR_CODE">
<meta name="msvalidate.01" content="YOUR_CODE">
<meta name="theme-color" content="#0a0a0a">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page Title — Study Metrics</title>
<meta name="description" content="50–160 char description">
<link rel="canonical" href="https://studymetrics.app/page.html">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="website">
<meta property="og:title" content="Page Title — Study Metrics">
<meta property="og:description" content="...">
<meta property="og:url" content="https://studymetrics.app/page.html">
<meta property="og:image" content="https://studymetrics.app/images/og-image.svg">
<meta name="twitter:site" content="@studymetrics">
<meta name="twitter:card" content="summary_large_image">
```

---

## Updating the AI Feature

The AI assistant uses the Google Gemini API (`js/ai-service.js`).

If the API key needs rotating:
1. Open `js/ai-service.js`
2. Update the `API_KEY` constant
3. Re-deploy the file only

If the model name changes (e.g., `gemini-2.0-flash` → `gemini-3.0-flash`):
1. Update `MODEL` constant in `js/ai-service.js`
2. Test all AI features before deploying

---

## Updating Google Analytics

If the GA4 Measurement ID changes:
1. Open `js/analytics.js`
2. Update `var GA_ID = 'G-NEWID';`
3. Re-deploy only `js/analytics.js`

---

## Emergency: Rolling Back a Deploy

### Netlify
```
netlify rollback
```
Or via the Netlify dashboard: Deploys → select previous deploy → Publish deploy.

### Cloudflare Pages
Dashboard → Pages project → Deployments → select previous → Rollback.

### Apache/FTP
Keep a dated backup of the previous version. Re-upload the backup folder.
See `BACKUP-INSTRUCTIONS.md`.

---

## CSS Architecture Notes

| File | Purpose |
|---|---|
| `css/style.css` | Global tokens, layout, typography, nav, footer |
| `css/premium.css` | Premium badge, upgrade UI, animations |
| `css/calculators.css` | Calculator card layout, input/output panels |
| `css/personalization.css` | User dashboard, streaks, progress bars |
| `css/content-platform.css` | Blog, guides, article layout |
| `css/country-selector.css` | GPA converter country dropdown |
| `css/dashboard.css` | Student dashboard specific |
| `css/ai-assistant.css` | AI panel embedded in calculators |
| `css/ai-chat.css` | Full AI chat page |
| `css/consent.css` | Cookie consent banner |
| `css/print.css` | Print stylesheet |

**Do not combine these files** — they are intentionally split for page-specific loading.

---

## JS Architecture Notes

| File | Purpose |
|---|---|
| `js/script.js` | Core utility (`SM` namespace, nav, toast, etc.) |
| `js/gpa.js` | GPA calculator logic |
| `js/calculators.js` | Shared calculator utilities |
| `js/grading-systems.js` | 30+ country grading data |
| `js/country-selector.js` | Country picker UI for GPA converter |
| `js/dashboard.js` | Student dashboard |
| `js/personalization.js` | User progress persistence |
| `js/premium.js` | Premium feature gates |
| `js/content-platform.js` | Blog/guides reading time, search |
| `js/ai-service.js` | Gemini API integration |
| `js/ai-assistant.js` | AI panel in calculators |
| `js/ai-coach.js` | AI study coach topic selector |
| `js/ai-chat.js` | Full AI chat interface |
| `js/analytics.js` | GA4 consent-aware loader |
| `js/consent.js` | Cookie consent banner |

**Load order matters:** `script.js` must load before any calculator JS (it defines the `SM` namespace).

