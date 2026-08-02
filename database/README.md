# Waitlist Feature — Deployment & Testing Guide

## 1. Database Setup

The waitlist uses a Cloudflare KV namespace (`WAITLIST_KV` preferred; falls back to `SUBMISSIONS`).

### Create the namespace (one-time):
```bash
npx wrangler kv namespace create WAITLIST_KV
```

### Bind it to the project (two options):
- **Option A — Dashboard:** Settings → Functions → KV namespace bindings → Add `WAITLIST_KV`
- **Option B — wrangler.toml:** Uncomment and fill the `[[kv_namespaces]]` block for `WAITLIST_KV` (done in this repo).

### Verify initialization:
The `POST /api/waitlist` endpoint calls `initWaitlistDB()` automatically. If `WAITLIST_KV` is bound, it writes `waitlist:__schema__` to KV. If not bound, it logs a clear message instructing you to bind a KV namespace.

If running locally without KV (`wrangler pages dev .`), the endpoint will respond with:
```json
{"ok":false,"error":"Waitlist database not configured. Please bind a KV namespace (WAITLIST_KV or SUBMISSIONS) in wrangler.toml or the Cloudflare dashboard."}
```

To test locally with a mock database, bind `SUBMISSIONS` (if you already have it) or create a temporary KV namespace and reference it in `.env` or `wrangler.toml`.

## 2. Files Created

- `database/waitlist.schema.json` — Minimum database schema definition (email, timestamp, source, page, id, ip; indexes; KV binding instructions).
- `database/README.md` — This file.
- `functions/_lib/waitlistStore.js` — Database library: duplicate check, storage, logging, initialization.
- `functions/api/waitlist.js` — API endpoint (`POST /api/waitlist`).

## 3. Files Modified

- `index.html` — Updated `submitPremiumEmail()` to call `/api/waitlist` via `fetch()` with proper JSON payload. The modal HTML and CSS remain unchanged; only the connection logic was updated.
- `wrangler.toml` — Added `WAITLIST_KV` binding documentation and uncommented KV namespace blocks.

## 4. Schema

### Primary key (duplicate check):
- Key: `waitlist:<normalized_email>`
- Value (JSON): `{ email, timestamp, source, page, id, ip }`
- TTL: 10 years (`expirationTtl: 315360000`)

### Secondary index (lookup by record ID):
- Key: `waitlist:record:<id>`
- Value: same JSON record
- TTL: 10 years

### Schema meta (initialized by endpoint):
- Key: `waitlist:__schema__`
- Value: `{ schema_version: "1.0.0", initialized_at: <ISO>, namespace: <binding_name> }`

## 5. API Endpoint

### `POST /api/waitlist`

**Request body (JSON):**
```json
{
  "email": "user@example.com",
  "source": "premium-modal",
  "page": "/index.html"
}
```

**Success response (`201 Created`):**
```json
{
  "ok": true,
  "message": "Thanks! You're on the Premium waitlist.",
  "id": "wl_1691234567890_abc123",
  "stored": true
}
```

**Duplicate response (`200 OK`):**
```json
{
  "ok": true,
  "duplicate": true,
  "message": "Thanks! You're on the Premium waitlist. (You're already subscribed — we'll notify you at launch.)"
}
```

**Validation error (`400 Bad Request`):**
```json
{"ok": false, "error": "Please enter a valid email address."}
```

**Rate limit (`429 Too Many Requests`):**
Handled by `withApi` ({ limit: 5 }) — returns standard rate-limit response with `Retry-After: 60`.

**Server error (`500 Internal Server Error`):**
```json
{"ok": false, "error": "Could not save to the waitlist database. Please try again shortly."}
```

### Security & Sanitization:
- All inputs are sanitized via `clean()`, `str()`, and `requireEmail()`.
- Email is normalized to lowercase and trimmed.
- Source and page are truncated to safe lengths (`128` and `256` chars).
- No API keys or secrets are included in responses.
- Rate limiting is per client IP (`cf-connecting-ip` → `x-forwarded-for` fallback).

## 6. How to Deploy and Test the Feature

### Local development:
```bash
npm install          # install wrangler
npx wrangler pages dev . --compatibility-date=2024-11-01 --port 8788
```

Then visit `http://localhost:8788/` and open the Premium modal (click "Go Premium").

### Test with curl:
```bash
# Success
curl -X POST http://localhost:8788/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"premium-modal","page":"/index.html"}'

# Duplicate (run again with same email after binding KV)
curl -X POST ... -d '{"email":"test@example.com"}'

# Validation error
curl -X POST ... -d '{"email":"not-an-email"}'
```

### Production deploy:
```bash
npx wrangler pages deploy .
```

### Verify in production:
1. Ensure `WAITLIST_KV` is bound to the Pages project (Dashboard → Settings → Functions → KV namespace bindings).
2. Visit the live site, click "Go Premium", enter an email, click "Notify Me".
3. Check Cloudflare Pages Functions logs (`wrangler pages functions tail` or dashboard) for `[WAITLIST]` log lines.
4. Confirm `waitlist:<email>` key exists in KV via dashboard or CLI:
   ```bash
   npx wrangler kv key get --binding=WAITLIST_KV "waitlist:test@example.com"
   ```

## 7. Logging

Every event is logged to the console (visible in Cloudflare dashboard):
- `[WAITLIST] DB initialized in KV namespace: ...`
- `[WAITLIST] waitlist_subscribed ...`
- `[WAITLIST] waitlist_duplicate_blocked ...`
- `[WAITLIST] waitlist_validation_failed ...`
- `[WAITLIST] waitlist_storage_failed ...`

No secrets, emails, or PII are logged in plain text beyond the normalized email (required for duplicate tracking).
