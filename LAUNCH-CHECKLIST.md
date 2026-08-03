# Study Metrics — Launch Checklist
**Version 1.0 | Production Release**

---

## 🔑 BEFORE YOU DEPLOY — Replace All Placeholders

| Placeholder | File(s) | How to get it |
|---|---|---|
| `YOUR_GSC_VERIFICATION_CODE` | All 52 HTML `<head>` | Google Search Console → Add property → HTML tag verification |
| `YOUR_BING_VERIFICATION_CODE` | All 52 HTML `<head>` | Bing Webmaster Tools → Add site → Meta tag |
| `G-XXXXXXXXXX` | `js/analytics.js` | GA4 → Admin → Data streams → Web → Measurement ID |
| `ca-pub-XXXXXXXXXXXXXXXXX` | All HTML + `js/consent.js` | Google AdSense → Account → Publisher ID |
| `REPLACE_WITH_FORM_ID` | `contact.html` (2 places) | formspree.io → New form → Copy form ID |

**Find all placeholders at once:**
```bash
grep -rn "YOUR_GSC\|YOUR_BING\|G-XXXXXXXXXX\|ca-pub-XXXX\|REPLACE_WITH_FORM" .
```

---

## ✅ Pre-Deploy Checklist

### Domain & Hosting
- [ ] Domain pointed to hosting (DNS propagated)
- [ ] HTTPS/SSL certificate installed and working
- [ ] www → non-www redirect confirmed
- [ ] http → https redirect confirmed
- [ ] Uncomment HSTS header in `.htaccess` after confirming HTTPS

### All Placeholders Replaced
- [ ] Google Analytics Measurement ID (`G-XXXXXXXXXX`)
- [ ] Google Search Console verification code
- [ ] Bing Webmaster verification code
- [ ] AdSense Publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`)
- [ ] Formspree Form ID (contact.html — 2 occurrences)

### Files Uploaded
- [ ] All 52 HTML pages
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
- [ ] https://studymetrics.app/ loads (homepage)
- [ ] https://studymetrics.app/gpa.html (GPA calculator works)
- [ ] https://studymetrics.app/cgpa.html (CGPA calculator works)
- [ ] https://studymetrics.app/gpa-converter.html (country selector works)
- [ ] https://studymetrics.app/dashboard.html (student dashboard works)
- [ ] https://studymetrics.app/ai.html (AI assistant works)
- [ ] https://studymetrics.app/contact.html (form submits successfully)
- [ ] https://studymetrics.app/404 (custom 404 page shows)

### Technical
- [ ] robots.txt accessible: https://studymetrics.app/robots.txt
- [ ] Sitemap accessible: https://studymetrics.app/sitemap.xml
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
  ./ user@yourserver.com:/var/www/html/studymetrics/
```

Verify `.htaccess` is uploaded and Apache `mod_rewrite` is enabled.

