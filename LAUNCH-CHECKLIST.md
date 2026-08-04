# Scholarics — Launch Checklist
**Version 1.0 | Production Release**

---

## 🔑 BEFORE YOU DEPLOY — Configure Services

Analytics, ads and webmaster verification are **disabled by default** (guards in
`js/analytics.js` and `js/consent.js` reject placeholder IDs, so nothing is
loaded or tracked until you set real IDs).

| Service | Where to configure | Notes |
|---|---|---|
| GA4 Measurement ID | `js/analytics.js` → `GA_ID` | Analytics stays off until a real `G-XXXXXXX` ID is set |
| AdSense Publisher ID | `js/consent.js` → `PUB_ID` + `data-ad-slot` values in the 40 ad-holder pages | Ads stay off until a real `ca-pub-…` ID is set |
| Search Console / Bing verification | Add the meta tags to each `<head>` (currently absent) | Add after claiming the property in GSC/Bing |
| Contact/bug-report inbox | Cloudflare dashboard → Pages → `scholaricsv-2` → Settings → Environment variables → `EMAIL_TO` | Submissions fall back to KV storage when unset |
| Resend API key | `wrangler pages secret put RESEND_API_KEY` | Enables real email delivery |
| Gemini API key | `wrangler pages secret put GEMINI_API_KEY` | Enables the AI features |

**Verify nothing is left to configure in code:**
```bash
grep -rn "G-XXXXXXXXXX\|ca-pub-XXXX\|PASTE_" js/ *.html
# → no matches expected
```

---

## ✅ Pre-Deploy Checklist

### Domain & Hosting
- [ ] Domain pointed to hosting (DNS propagated)
- [ ] HTTPS/SSL certificate installed and working
- [ ] www → non-www redirect confirmed
- [ ] http → https redirect confirmed
- [ ] HSTS is already sent via `_headers` (Cloudflare Pages)

### Services Configured (as needed)
- [ ] GA4 Measurement ID set in `js/analytics.js` (optional — off until set)
- [ ] AdSense Publisher ID set in `js/consent.js` (optional — off until set)
- [ ] Search Console / Bing verification meta tags added (optional)
- [ ] `EMAIL_TO` set in Cloudflare dashboard (contact form inbox)
- [ ] `RESEND_API_KEY` + `GEMINI_API_KEY` secrets set (`wrangler pages secret put`)

### Files Uploaded
- [ ] All 56 HTML pages
- [ ] `css/` directory (12 files)
- [ ] `js/` directory (all .js files)
- [ ] `images/` directory (favicon.svg, og-image.svg)
- [ ] `sitemap.xml`
- [ ] `robots.txt`
- [ ] `.htaccess` (Apache) OR `_headers` + `_redirects` (Netlify/Cloudflare)

### Third-Party Setup
- [ ] Google Search Console: domain verified, sitemap submitted
- [ ] Bing Webmaster Tools: domain verified, sitemap submitted
- [ ] Google Analytics 4: property created, data flowing
- [ ] Google AdSense: account approved, ads.txt uploaded
- [ ] Formspree: form created, email notifications configured

---

## ✅ Post-Deploy Verification

### Core Pages
- [ ] https://scholarics.com/ loads (homepage)
- [ ] https://scholarics.com/gpa.html (GPA calculator works)
- [ ] https://scholarics.com/cgpa.html (CGPA calculator works)
- [ ] https://scholarics.com/gpa-converter.html (country selector works)
- [ ] https://scholarics.com/dashboard.html (student dashboard works)
- [ ] https://scholarics.com/ai.html (AI assistant works)
- [ ] https://scholarics.com/contact.html (form submits successfully)
- [ ] https://scholarics.com/404 (custom 404 page shows)

### Technical
- [ ] robots.txt accessible: https://scholarics.com/robots.txt
- [ ] Sitemap accessible: https://scholarics.com/sitemap.xml
- [ ] No mixed content warnings (HTTP resources on HTTPS page)
- [ ] Console shows no JavaScript errors on any page
- [ ] Cookie consent banner appears on first visit
- [ ] Cookie consent banner does NOT appear on return visit (accepted)
- [ ] Back-to-top button works on all long pages

### Performance (run after deploy)
- [ ] Google PageSpeed Insights: https://pagespeed.web.dev/
  - Mobile score ≥ 85
  - Desktop score ≥ 95
- [ ] GTmetrix Grade A or B
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms

### SEO
- [ ] Google Search Console: no coverage errors
- [ ] Validate structured data: https://search.google.com/test/rich-results
  - GPA calculator → WebApplication schema ✓
  - Grading guides → Article schema ✓
  - Breadcrumbs on all inner pages ✓
- [ ] Open Graph preview: https://opengraph.xyz/
- [ ] Twitter Card preview: https://cards-dev.twitter.com/validator

### Security (run after deploy)
- [ ] Security headers: https://securityheaders.com
  - X-Frame-Options: SAMEORIGIN ✓
  - X-Content-Type-Options: nosniff ✓
  - CSP header present ✓
- [ ] SSL rating A or A+: https://www.ssllabs.com/ssltest/

---

## 🔧 Netlify / Cloudflare Pages Deploy

```bash
# Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --dir=. --prod

# Or drag-and-drop the folder at app.netlify.com
```

For Cloudflare Pages: Connect GitHub repo → set build output to `/` → deploy.

---

## 🔧 Traditional Apache Hosting Deploy

```bash
# From project root
rsync -avz --delete \
  --exclude='.git' \
  --exclude='*.md' \
  ./ user@yourserver.com:/var/www/html/scholarics/
```

Verify `.htaccess` is uploaded and Apache `mod_rewrite` is enabled.

