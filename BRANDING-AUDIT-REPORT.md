# Scholarics — Complete Branding Audit Report

**Task:** Eliminate every remaining occurrence of the legacy brand (all casing/separator variants) across the entire project.
**Audit date:** 2026-08-04
**Scope:** All 171 files in the repository — frontend (HTML/CSS/JS/SVG/PNG/ICO), backend (Cloudflare Functions), config, PWA, SEO, docs (MD), package files, and binaries.

> **Note on wording:** to guarantee that a repo-wide search returns zero hits, this report (like `RENAME-REPORT.md`) never spells out the former brand wordmark. The former wordmark is referred to as "the legacy wordmark", and its variants as "solid", "space-separated", "hyphen-separated", "underscore-separated", "title case", "lowercase", and "ALL CAPS" forms.

---

## 1. Every file that contained old branding

A raw **byte-level, case-insensitive** scan of every file (all 171, including binary images) was run for the six required terms —
the legacy wordmark in: (1) title-case solid form, (2) ALL-CAPS solid form, (3) lowercase solid form, (4) hyphen-separated lowercase form,
(5) underscore-separated lowercase form, (6) title-case space-separated form — plus extended variants (singular form, slug forms,
legacy domain, legacy social handle) to catch substrings.

**Only 2 files contained any occurrence of the old branding:**

### 1.1 `RENAME-REPORT.md` — 26 occurrences (the rename record itself)
| Form found in the file | Occurrences |
|---|---|
| Title-case solid form (e.g. in the project line and mapping table) | 5 |
| Lowercase solid form (package name, filenames, scan row) | 9 |
| Hyphen-separated lowercase form (filenames, scan row) | 3 |
| Underscore-separated lowercase form (scan row) | 2 |
| Title-case space-separated form (mapping table) | 2 |
| ALL-CAPS solid form (mapping table) | 1 |
| ALL-CAPS space-separated form (mapping table) | 1 |
| Legacy domain (lowercase solid form + `.app`) | 1 |
| Legacy social handle (`@` + lowercase solid form) | 1 |
| Legacy Cloudflare project slug (hyphen-separated form + `v-2`) | 1 |
| Session branch name (embeds the hyphen-separated form) | 1 |
| **Total** | **26** |

### 1.2 `FINAL-AUDIT-REPORT.md` — 1 occurrence
| Form found in the file | Occurrences |
|---|---|
| Session branch name (embeds the hyphen-separated form) — line 5 | 1 |
| **Total** | **1** |

### 1.3 Files with zero occurrences (verified clean — the entire production codebase)
All **169 other files** returned **zero** matches, including:
- **All 56 HTML pages** (incl. every calculator page, dashboard, AI tools, header/footer content, meta tags, JSON-LD structured data)
- **All 66 browser JS files** (incl. `js/calculators.js` and every calculator script, `js/sc-shell.js`, `js/sc-v2-features.js`)
- **All CSS files** (incl. `css/scholarics-v2.css`, `css/sc-prelaunch-fixes.css`)
- **All 12 Cloudflare Functions** (API routes, `_lib` email/prompts/gemini, email templates/senders)
- `manifest.json`, `sw.js` (cache name `scholarics-shell-v1`), `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`, `_routes.json` (×2)
- `package.json`, `package-lock.json`, `wrangler.toml`, `.env.example`, `.gitignore`
- Images/SVG: `og-image.svg` (wordmark = "Scholarics"), `favicon.svg`, `avatar.svg`, `icon-180/192/512.png`, `og-image.png`, `og-image.webp`, `favicon.ico` (binary byte-scan: 0)
- All other documentation (MD): `FIXES-APPLIED.md`, `QA-REPORT.md`, `LAUNCH-CHECKLIST.md`, `LAUNCH-READY.md`, `MAINTENANCE-GUIDE.md`, `PERFORMANCE-REPORT.md`, `README-CLOUDFLARE.md`, `RELEASE-NOTES-v1.0.md`, `SECURITY-REPORT.md`, `BACKUP-INSTRUCTIONS.md`

---

## 2. Every replacement made

### 2.1 `RENAME-REPORT.md` (rewritten — 26 occurrences removed)
| Old content (described) | Replacement |
|---|---|
| Project line spelling out the legacy wordmark | `Rebranded from the legacy brand name → **Scholarics**` |
| Commit line with session branch name | `the active arena session branch` |
| Mapping-table rows spelling out all six wordmark variants | `Legacy brand wordmark — all casing variants (Title Case, UPPER CASE, lower case, with space, hyphen, or underscore separators)` → `Scholarics` / `SCHOLARICS` |
| Lowercase solid wordmark row | `Legacy lowercase wordmark (any separator style)` → `scholarics` |
| Legacy domain (solid form + `.app`) | `Legacy domain` → `scholarics.com` |
| Legacy social handle | `Legacy social handle` → `@scholarics` |
| Legacy stylesheet filename (hyphen-separated form + `-v2.css`) | `Legacy stylesheet (css/<legacy>-v2.css)` → `css/scholarics-v2.css` |
| `package.json` name (lowercase solid form) | `package.json` name (legacy wordmark, lowercase) → `scholarics` |
| Cloudflare project slug (hyphen-separated form + `v-2`) | `Cloudflare Pages project slug (derived from legacy brand)` → `scholaricsv-2` |
| Email sender row spelling the wordmark | `Scholarics <…>` (already new; row reworded) |
| AI system-prompt row spelling the wordmark | `You are Scholarics AI…` (already new; row reworded) |
| Legacy asset names in the verification table | `Legacy asset paths (e.g. the old css/*-v2.css and js/sm-* files)` |
| Brand-scan row (previously claimed 0 while the file itself contained the wordmark) | Updated: scan now genuinely 0 — references `BRANDING-AUDIT-REPORT.md` |
| Added a branding note explaining the record intentionally avoids spelling out the former wordmark | — |

### 2.2 `FINAL-AUDIT-REPORT.md` (2 edits — 1 occurrence removed)
| Old content (described) | Replacement |
|---|---|
| Commit line containing the session branch name | `**Commit:** c62ad03 (pushed to the active arena session branch)` |
| Statement that historical docs "intentionally retain old-brand references" | Updated: docs contain **zero** legacy brand strings as of this audit; the record refers to the former wordmark only as "the legacy brand" |

### 2.3 Deliberately preserved (no brand text — safe, functional, NOT branding)
| Item | Why kept |
|---|---|
| `sm_*`, `sm2_*`, `sm-*` key prefixes in the one-time migration block of `js/script.js` | Exact string prefixes used to locate **legacy keys in returning users' browsers** and copy them to `sc_*`/`sc2_*`/`sc-*`. Contains no brand wordmark, is never rendered, and **removing it would lose users' saved data** (the "only if safe to rename" condition — it is *not* safe to remove). |
| `STUDIO_METRICS` internal AI-protocol token | Not branding; renaming would break the paraphraser feature. |
| `SMU` (Singapore Management University) grading data | Real third-party data, unrelated to the brand. |
| Non-brand tokens: `--step-sm`, `btn-sm`, `small`, `smooth`, `smart`, `sh,sm` (minutes var), `study plan`/`study-time` feature names | Generic CSS/variable/feature identifiers, none of which match any banned term. |

---

## 3. Confirmation: ZERO occurrences of old branding remain

### Verification commands and results (all run 2026-08-04, after replacements)

**A. Raw byte-level scan of all 171 files (Python, case-insensitive, incl. binaries):**
```
Scanned 171 files.
RESULT: ZERO occurrences of every banned term in the entire project. ✅
```

**B. Per-term grep over the whole repository** (each returned **0 files**):
```
legacy wordmark, title-case solid form        : 0 file(s)
legacy wordmark, lowercase solid form         : 0 file(s)
legacy wordmark, space-separated forms        : 0 file(s)
legacy wordmark, hyphen-separated form        : 0 file(s)
legacy wordmark, underscore-separated form    : 0 file(s)
legacy wordmark, ALL-CAPS forms               : 0 file(s)
```

**C. Extended-variant sweep** (each returned **0 files**):
```
singular form : 0   slug form : 0   legacy domain : 0   legacy handle : 0   "study metric" (space, singular) : 0
```

**D. `git grep` over the tracked working tree:** `0` matches.

**E. Post-commit:** `git grep -iE <all six legacy wordmark variants> HEAD` → `0` matches (re-verified after commit).

> **The audit is complete: the entire project contains ZERO occurrences of the legacy brand wordmark in any of the six required forms — title-case solid, ALL-CAPS solid, lowercase solid, hyphen-separated, underscore-separated, or space-separated — in every file type (HTML, CSS, JS, JSON, MD, TXT, XML, SVG, manifest, robots.txt, sitemap.xml, package files, config files, Cloudflare Functions, email templates, API code, structured data, meta tags, comments, assets, icons, calculator pages, dashboard, AI tools, header/footer).**

---

## 4. Notes / recommended follow-ups (outside project content)

1. **GitHub repository name:** the repo is still hosted under a repository slug derived from the legacy brand (`<legacy>` + `v.2`), which embeds the hyphen-separated form as a substring. This is a repository identifier, not project content, and cannot be changed from inside this sandbox session (the session is bound to it). **Recommended:** rename it on GitHub (Settings → Rename, or `gh repo rename`) once the session is complete.
2. **Live deployment:** this audit guarantees the repository is clean; the live site at `scholarics.com` may still show stale content until redeployed. **Run `npx wrangler pages deploy .`** (project `scholaricsv-2`) after this commit. Ask visitors with old pages to hard-refresh — `sw.js` now uses cache name `scholarics-shell-v1`, which force-evicts legacy caches on activate.
3. **Git history:** the local clone is a single squashed commit; if the full pre-rename history exists on GitHub it would contain the old wordmark. History is not deployed content; rewriting it (e.g. `git filter-repo`) is optional and not recommended.
4. **Banned-term rule going forward:** add a CI grep that scans for the six legacy wordmark variants (any casing/separator) to prevent regressions — e.g. a case-insensitive `grep -rE` over the repo in a GitHub Actions step, failing on any match.
