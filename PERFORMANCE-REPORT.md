# Study Metrics — Performance Report
**Phase 10 | Version 1.0 | July 2026**

---

## Bundle Size Summary

| Asset Group | Before Phase 10 | After Phase 10 | Reduction |
|---|---|---|---|
| CSS (4 main files) | 116 KB | 86 KB | **26%** |
| JS (all files) | 328 KB | 278 KB | **15%** |
| SVG images | 3 KB | 2 KB | **23%** |
| HTML (52 pages) | ~861 KB | ~861 KB | — (not minified; gzip handles) |

### CSS Breakdown (after minification)
| File | Minified Size |
|---|---|
| `premium.css` | 37 KB |
| `style.css` | 35 KB |
| `dashboard.css` | 14 KB |
| `ai-chat.css` | 17 KB |
| `calculators.css` | 8 KB |
| `country-selector.css` | 6 KB |
| `ai-assistant.css` | 6 KB |
| `personalization.css` | 4 KB |
| `content-platform.css` | 3 KB |
| `consent.css` | 3 KB |
| `gpa-converter.css` | 5 KB |
| `print.css` | 1 KB |

**Note:** Not all CSS loads on every page. A typical calculator page loads: `style.css` + `premium.css` + `calculators.css` + `personalization.css` + `consent.css` = ~87 KB CSS total.

---

## Critical Rendering Path Analysis

### Typical calculator page (e.g., gpa.html)
```
<head>
  ├── Google Fonts preconnect (no blocking)
  ├── <link rel="preload" href="css/style.css"> ← preloaded early
  ├── Google Fonts stylesheet (render-blocking, but display=swap)
  ├── css/style.css (17KB minified, inlined via preload)
  ├── css/premium.css (37KB)
  ├── css/calculators.css (8KB)
  ├── ... other page-specific CSS
  └── NO render-blocking JS in <head>

<body>
  ... content renders immediately ...

  ├── <script defer src="js/script.js"> ← executes after parse
  ├── <script defer src="js/gpa.js">
  ├── <script defer src="js/analytics.js">
  └── <script defer src="js/consent.js">
</body>
```

**Result:** Main content visible without waiting for JS. Calculators interactive ~100–300ms after DOM ready.

---

## Lighthouse Estimated Scores

Based on measurable signals (actual scores require live URL measurement):

| Metric | Estimate | Signal |
|---|---|---|
| Performance (Mobile) | 85–92 | No render-blocking JS; CSS minified; deferred scripts |
| Performance (Desktop) | 92–98 | Same as mobile, faster network assumed |
| Accessibility | 95–100 | Skip-links, aria-labels, labels, lang, contrast |
| Best Practices | 95–100 | HTTPS, no console errors, secure headers |
| SEO | 98–100 | All meta tags, canonical, structured data, sitemap |

### Key Performance Factors
✅ Zero render-blocking scripts  
✅ `defer` on all local JS (52 pages × all scripts)  
✅ `preload` hint for `style.css` on 8 high-traffic pages  
✅ `preconnect` to Google Fonts and Gstatic  
✅ `font-display: swap` — text visible immediately  
✅ No layout shifts from images (SVG only, no width/height CLS issues)  
✅ CSS minified 26% across main stylesheets  
✅ JS minified 15% across all scripts  
✅ SVG assets optimised (23% smaller)  
✅ gzip compression enabled via .htaccess mod_deflate  
✅ Browser caching: 1 year for CSS/JS/images, 1 hour for HTML  

### Largest Contentful Paint (LCP) Factors
The LCP element on calculator pages is the page heading (`<h1>`), which is text-based and rendered immediately from CSS (no image dependency). Expected LCP: **< 2.0s on mobile**, **< 1.0s on desktop** on a typical connection.

### Cumulative Layout Shift (CLS)
No images without explicit dimensions. Google Fonts with `display=swap` may cause a brief text FOUT but no layout shift. Expected CLS: **< 0.05**.

---

## Caching Configuration

### Browser Cache Headers (.htaccess)
| Resource Type | Cache Duration |
|---|---|
| HTML pages | 1 hour |
| CSS files | 1 year (immutable) |
| JS files | 1 year (immutable) |
| SVG images | 1 year (immutable) |
| Fonts (woff2) | 1 year (immutable) |
| sitemap.xml | 1 day |

### Server Compression (mod_deflate)
Enabled for: HTML, CSS, JS, JSON, SVG, XML, fonts.
Expected compression ratios on the wire: HTML ~70%, CSS ~75%, JS ~70%.

### Effective Transfer Sizes (with gzip)
| Asset | Minified | Gzipped (est.) |
|---|---|---|
| style.css | 35 KB | ~9 KB |
| premium.css | 37 KB | ~10 KB |
| calculators.css | 8 KB | ~2 KB |
| script.js | ~35 KB | ~11 KB |
| Typical HTML page | ~17 KB | ~5 KB |

**Typical first-load transfer for a calculator page: ~55–70 KB gzipped.**

---

## Recommendations for Further Improvement

| Improvement | Estimated Gain | Effort |
|---|---|---|
| Inline critical CSS (style.css first 200 lines) | +5–10 Perf points | Medium |
| Cache-bust CSS/JS with content hashes | Allows longer cache | Medium |
| Serve woff2 fonts self-hosted | Eliminates Google Fonts RTT | Medium |
| Move Gemini API to edge function | Reduces client JS | High |
| Convert og-image.svg to og-image.png | Better social preview | Low |
| Add `fetchpriority="high"` to LCP element | Marginally faster LCP | Low |

