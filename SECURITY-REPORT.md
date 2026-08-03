# Study Metrics — Security Report
**Phase 10 | Version 1.0 | July 2026**

---

## Summary

| Category | Status | Notes |
|---|---|---|
| eval() / code injection | ✅ Fixed | scientific-calculator.js — eval replaced |
| XSS prevention | ✅ Fixed | History rendering escaped |
| HTTPS enforcement | ✅ Configured | .htaccess 301 redirect |
| Security headers | ✅ Configured | 6 headers via .htaccess + _headers |
| Content Security Policy | ✅ Configured | Strict allowlist |
| Clickjacking | ✅ Protected | X-Frame-Options: SAMEORIGIN |
| MIME sniffing | ✅ Protected | X-Content-Type-Options: nosniff |
| Mixed content | ✅ None | All external resources use HTTPS |
| Directory listing | ✅ Disabled | Options -Indexes in .htaccess |
| Sensitive file exposure | ✅ Blocked | .md and .htaccess files denied |
| Form spam protection | ✅ Present | Honeypot field in contact.html |
| API key exposure | ⚠️ Low risk | Gemini key client-side (see notes) |
| HSTS | ⚠️ Ready | Uncomment after confirming HTTPS |

---

## Issues Found & Fixed

### 1. eval() in scientific-calculator.js — FIXED ✅
**Risk:** Medium — user-controlled input passed to `eval()` could run arbitrary JS in the user's own browser (self-XSS). No server-side execution possible.

**Fix:** Replaced all `eval(argument)` calls with `safeEval(str)`:
```javascript
function safeEval(str) {
  var s = String(str).trim();
  // Whitelist: only digits, operators, parens, dot, scientific notation
  if (!/^[\d\s\+\-\*\/\%\.\(\)\^eE]+$/.test(s)) return NaN;
  try {
    return Function('"use strict"; return (' + s + ')')();
  } catch(_) { return NaN; }
}
```
The regex whitelist ensures only numeric expressions reach `Function()`. Non-numeric input returns `NaN`.

### 2. Unescaped innerHTML in history rendering — FIXED ✅
**Risk:** Low — the expression stored in history came from button clicks (predefined values), not free text input. However, the `data-result` attribute was being read back via `getAttribute` and injected via `innerHTML`.

**Fix:** Added HTML entity escaping before inserting into `innerHTML`:
```javascript
var safeExpr = h.expr.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
var safeRes  = h.result.replace(/&/g,'&amp;').replace(/</g,'&lt;');
```

---

## Security Headers (configured in .htaccess and _headers)

### X-Frame-Options: SAMEORIGIN
Prevents the site from being embedded in an iframe on another domain. Protects against clickjacking attacks.

### X-Content-Type-Options: nosniff
Prevents browsers from MIME-sniffing responses. Ensures CSS is rendered as CSS, JS as JS.

### Referrer-Policy: strict-origin-when-cross-origin
Sends the full URL as referrer on same-origin requests. Sends only the origin (no path) on cross-origin HTTPS→HTTPS. Sends nothing on HTTPS→HTTP. Protects user privacy on external links.

### Permissions-Policy
Explicitly disables camera, microphone, geolocation, and payment APIs. Study Metrics does not use these browser features — preventing them reduces attack surface.

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' [Google Analytics, AdSense domains];
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: [Google Analytics domains];
connect-src 'self' [GA, Analytics, Formspree, Gemini API];
frame-src [Google ad domains];
frame-ancestors 'self';
base-uri 'self';
form-action 'self' https://formspree.io;
```

`'unsafe-inline'` is required for inline `<style>` and `<script>` blocks. To eliminate it in a future version, move inline scripts to external files and add script nonces.

### HSTS (Strict-Transport-Security)
**Status:** Commented out — uncomment after HTTPS is confirmed stable.
```apache
# Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```
**Warning:** Once enabled and submitted to the HSTS preload list, HTTPS is enforced by browsers for all subdomains for 1 year minimum. Only enable when certain HTTPS is permanent.

---

## Remaining Low-Risk Items

### Gemini API Key — Client-Side
**Risk:** Low — the Google Gemini API key is embedded in `js/ai-service.js` (client-visible). Google's API key restrictions (allowed HTTP referrers, API quotas) mitigate this significantly.

**Mitigation already in place:** Restrict the key in Google Cloud Console to `studymetrics.app` referrers only.

**Future improvement:** Proxy Gemini calls through a serverless function (Netlify Function / Cloudflare Worker) so the key is never exposed to the browser.

### No Rate Limiting on Contact Form
**Risk:** Low — Formspree handles rate limiting and spam filtering on their end.

### localStorage for User Data
**Risk:** Informational — user progress, GPA history, and preferences are stored in `localStorage`. This is not sensitive data, but users should be aware it's lost if they clear browser storage or use a different device.

---

## Recommendations Post-Launch

1. Enable HSTS after 30 days of confirmed HTTPS stability
2. Upgrade CSP to remove `'unsafe-inline'` by nonce-ing inline scripts
3. Move Gemini API calls to a serverless proxy for key protection
4. Run monthly: https://securityheaders.com (target A or A+)
5. Run quarterly: https://www.ssllabs.com/ssltest/ (target A+)
6. Monitor for dependency vulnerabilities (Google Fonts CDN, Formspree)

