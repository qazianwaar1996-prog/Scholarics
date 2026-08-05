#!/usr/bin/env node
/* =============================================================================
   Scholarics — static asset build (CSS/JS minify + bundle + fingerprint)

     node tools/build-assets.mjs            # build
     node tools/build-assets.mjs --check    # build into memory, fail if the
                                            # committed output is out of date

   What it does
   ------------
   1. Minifies every stylesheet/script that a page actually references (esbuild).
   2. Concatenates them into a handful of shared bundles **in the exact order the
      page already loaded them**, so the cascade and script execution order are
      byte-for-byte equivalent to the unbundled site.
   3. Fingerprints each bundle (`core.9f2a1c04.css`) and writes it to `assets/`,
      which `_headers` serves with `max-age=31536000, immutable`.
   4. Rewrites the <link>/<script> tags in every page and regenerates the
      service-worker pre-cache list.
   5. Strips provably-dead CSS (see DEAD_SELECTORS below).

   Re-running is safe: pages already pointing at `assets/…` are simply re-pointed
   at the new fingerprints, so a source edit + rebuild is a two-command change.
   `npm run deploy` runs this automatically.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import esbuild from 'esbuild';

const CHECK_ONLY = process.argv.includes('--check');
const OUT_DIR = 'assets';
const OUT_CSS = `${OUT_DIR}/css`;
const OUT_JS = `${OUT_DIR}/js`;

/* Stylesheets shared by (almost) every page, in their canonical cascade order.
   A page's leading run that matches CORE and trailing run that matches SHELL are
   bundled together so the same file is reused across pages; anything in between
   (page-specific stylesheets) becomes its own small bundle. */
const CSS_CORE = ['css/style.css', 'css/premium.css', 'css/personalization.css', 'css/content-platform.css'];
const CSS_SHELL = ['css/consent.css', 'css/scholarics-v2.css', 'css/sc-prelaunch-fixes.css'];

/* A script referenced by at least this many pages is treated as "shared" and
   grouped with its neighbours into a cross-page bundle. */
const SHARED_MIN_PAGES = 8;

/* Selectors that can never match: no page carries `class="premium"` on <body>,
   no script adds it, and js/premium.js documents that the legacy skin is
   intentionally not applied (index.html even strips the class defensively).
   Rules gated behind it are removed from the built CSS only — the sources in
   css/ are left untouched. */
const DEAD_SELECTORS = [/(^|[\s>+~])body\.premium(?![\w-])/];

const ABBR = {
  script: 'core', 'sc-shell': 'shell', personalization: 'person', premium: 'prem',
  'content-platform': 'content', 'email-capture': 'email', analytics: 'ga',
  'sc-v2-features': 'v2feat', 'share-links': 'share', 'grading-systems': 'grading',
  'country-selector': 'country', 'ai-assistant': 'ai', 'ai-service': 'aisvc',
  calculators: 'calc', 'gpa-converter': 'gpaconv', dashboard: 'dash',
  'scholarics-v2': 'v2', 'sc-prelaunch-fixes': 'fixes', style: 'style',
};

const log = (...a) => console.log(...a);
const bytes = (n) => `${(n / 1024).toFixed(1)} kB`;
const sha = (buf, n = 8) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, n);
const base = (p) => path.basename(p).replace(/\.(css|js)$/, '');
const abbr = (p) => ABBR[base(p)] || base(p);

/* ── CSS: drop rules whose every selector is provably dead ─────────────────── */
function pruneDeadCss(css) {
  const GROUP_AT = /^@(media|supports|layer|container|document|scope)\b/i;
  let removed = 0;

  const splitTop = (str, sep) => {
    const out = [];
    let depth = 0, quote = null, buf = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (quote) { buf += c; if (c === '\\') { buf += str[++i] || ''; } else if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; buf += c; continue; }
      if (c === '(' || c === '[') depth++;
      if (c === ')' || c === ']') depth--;
      if (c === sep && depth === 0) { out.push(buf); buf = ''; continue; }
      buf += c;
    }
    out.push(buf);
    return out;
  };

  const walk = (src) => {
    let out = '', i = 0, prelude = '';
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); prelude += src.slice(i, e < 0 ? src.length : e + 2); i = e < 0 ? src.length : e + 2; continue; }
      if (c === '"' || c === "'") { let j = i + 1; while (j < src.length) { if (src[j] === '\\') j += 2; else if (src[j] === c) break; else j++; } prelude += src.slice(i, j + 1); i = j + 1; continue; }
      if (c === ';') { out += prelude + c; prelude = ''; i++; continue; }
      if (c === '{') {
        let depth = 1, j = i + 1, quote = null;
        while (j < src.length && depth > 0) {
          const d = src[j];
          if (quote) { if (d === '\\') j++; else if (d === quote) quote = null; }
          else if (d === '"' || d === "'") quote = d;
          else if (d === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? src.length : e + 1; }
          else if (d === '{') depth++;
          else if (d === '}') depth--;
          j++;
        }
        const body = src.slice(i + 1, j - 1);
        const sel = prelude.trim();
        prelude = '';
        if (GROUP_AT.test(sel)) {
          const inner = walk(body);
          if (inner.trim()) out += `${sel}{${inner}}`; else removed++;
        } else if (sel.startsWith('@')) {
          out += `${sel}{${body}}`;
        } else {
          const kept = splitTop(sel, ',').filter((s) => s.trim() && !DEAD_SELECTORS.some((re) => re.test(s.trim())));
          if (kept.length) out += `${kept.join(',')}{${body}}`;
          else removed++;
        }
        i = j;
        continue;
      }
      prelude += c;
      i++;
    }
    return out + prelude;
  };

  return { css: walk(css), removed };
}

/* Scripts that other scripts fetch at runtime. They are emitted as standalone
   fingerprinted files and the literal path inside the source is rewritten to
   that URL, so the lazy path gets minified + immutably cached too. */
const RUNTIME_LOADED = ['js/sc-v2-features.js'];
const runtimeUrls = new Map();

/* ── minify ────────────────────────────────────────────────────────────────── */
const cache = new Map();
function minify(file) {
  if (cache.has(file)) return cache.get(file);
  let raw = fs.readFileSync(file, 'utf8');
  const isCss = file.endsWith('.css');
  for (const [from, to] of runtimeUrls) {
    if (raw.includes(`'${from}'`)) raw = raw.split(`'${from}'`).join(`'${to}'`);
  }
  const src = isCss ? pruneDeadCss(raw).css : raw;
  /* No `target` on purpose: esbuild then only minifies, it never lowers syntax
     (so oklch(), nesting, etc. reach the browser exactly as authored). */
  const res = esbuild.transformSync(src, {
    loader: isCss ? 'css' : 'js',
    minify: true,
    legalComments: 'none',
  });
  if (res.warnings.length) res.warnings.forEach((w) => log(`  ! ${file}: ${w.text}`));
  const out = { code: res.code, raw: raw.length };
  cache.set(file, out);
  return out;
}

/* ── HTML parsing helpers ──────────────────────────────────────────────────── */
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

/* Sequential scanner rather than a global regex: the body of an inline <script>
   may legitimately contain markup in a string (notes.html builds a print window
   with a `<script src=…><\/script>` literal), and that must never be mistaken
   for a real tag. Comments, <style> and inline <script> bodies are skipped. */
function parsePage(html) {
  const styles = [];
  const scripts = [];
  const lower = html.toLowerCase();
  let i = 0;

  const tagEnd = (from) => {
    let quote = null;
    for (let k = from; k < html.length; k++) {
      const c = html[k];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '>') return k + 1;
    }
    return html.length;
  };

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    if (lower.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt); i = e < 0 ? html.length : e + 3; continue; }
    const m = /^<(script|link|style)[\s/>]/i.exec(lower.slice(lt, lt + 9));
    if (!m) { i = lt + 1; continue; }

    const name = m[1].toLowerCase();
    const openEnd = tagEnd(lt);
    const tag = html.slice(lt, openEnd);

    if (name === 'link') {
      const rel = (attr(tag, 'rel') || '').toLowerCase();
      const href = attr(tag, 'href') || '';
      if (rel === 'stylesheet' && /^(css\/|assets\/css\/)/.test(href)) {
        styles.push({ tag, href: href.split('?')[0], media: attr(tag, 'media'), start: lt, end: openEnd });
      }
      i = openEnd;
      continue;
    }

    const close = lower.indexOf(`</${name}`, openEnd);
    const end = close < 0 ? html.length : tagEnd(close);
    if (name === 'script') {
      const src = attr(tag, 'src') || '';
      if (/^(js\/|assets\/js\/)/.test(src)) {
        const body = html.slice(openEnd, close < 0 ? openEnd : close);
        if (body.trim()) throw new Error(`external <script src="${src}"> has a body — refusing to rewrite ${src}`);
        scripts.push({ tag, src: src.split('?')[0], defer: /\bdefer\b/.test(tag), start: lt, end });
      }
    }
    i = end;
  }
  return { styles, scripts };
}

/* ── grouping ──────────────────────────────────────────────────────────────── */
function groupCss(files) {
  /* canonical shell order (one page lists scholarics-v2 before consent; the two
     files share no selector, so normalising the order cannot change rendering) */
  const tail = files.slice(-3);
  if (tail.length === 3 && CSS_SHELL.every((f) => tail.includes(f)) && tail.join() !== CSS_SHELL.join()) {
    files = files.slice(0, -3).concat(CSS_SHELL);
  }
  let i = 0;
  while (i < files.length && i < CSS_CORE.length && files[i] === CSS_CORE[i]) i++;
  const core = files.slice(0, i);

  let j = files.length;
  let k = CSS_SHELL.length;
  while (j > i && k > 0 && files[j - 1] === CSS_SHELL[k - 1]) { j--; k--; }
  const shell = files.slice(j);
  const middle = files.slice(i, j);

  const groups = [];
  if (core.length) groups.push({ name: core.length === CSS_CORE.length ? 'core' : `core-${core.length}`, files: core });
  if (middle.length) groups.push({ name: middle.map(abbr).join('-'), files: middle });
  if (shell.length) groups.push({ name: shell.length === CSS_SHELL.length ? 'shell' : `shell-${shell.length}`, files: shell });
  return groups;
}

function groupJs(files, shared, pageBase) {
  const runs = [];
  for (const f of files) {
    const isShared = shared.has(f);
    const last = runs[runs.length - 1];
    if (last && last.shared === isShared) last.files.push(f);
    else runs.push({ shared: isShared, files: [f] });
  }
  const pageRuns = runs.filter((r) => !r.shared);
  return runs.map((run) => {
    let name;
    if (run.shared) {
      name = run.files.map(abbr).join('-');
      if (name.length > 40) name = `g-${sha(run.files.join(','), 6)}`;
    } else {
      const nth = pageRuns.indexOf(run);
      name = `p-${pageBase}${nth > 0 ? `-${nth + 1}` : ''}`;
    }
    return { name, files: run.files };
  });
}

/* ── build ─────────────────────────────────────────────────────────────────── */
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const parsed = new Map();
const jsUsage = new Map();

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const p = parsePage(html);
  if (p.styles.some((s) => s.href.startsWith('assets/')) || p.scripts.some((s) => s.src.startsWith('assets/'))) {
    /* already migrated — rebuild from the bundle manifest instead */
    p.migrated = true;
  }
  parsed.set(page, { html, ...p });
  for (const s of p.scripts) if (s.src.startsWith('js/')) jsUsage.set(s.src, (jsUsage.get(s.src) || 0) + 1);
}

/* previous manifest lets us rebuild pages that already point at assets/ */
const MANIFEST = 'tools/assets.manifest.json';
const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { pages: {} };

const sharedJs = new Set([...jsUsage].filter(([, n]) => n >= SHARED_MIN_PAGES).map(([f]) => f));
if (prev.sharedJs) prev.sharedJs.forEach((f) => sharedJs.add(f));

const manifest = { generated: new Date().toISOString().slice(0, 10), sharedJs: [...sharedJs].sort(), pages: {} };
const bundles = new Map(); // name -> { type, files, code, hash, url }

function addBundle(type, name, files) {
  const key = `${type}:${name}`;
  const existing = bundles.get(key);
  if (existing) {
    if (existing.files.join() !== files.join()) throw new Error(`bundle name collision: ${key}`);
    return existing;
  }
  const joiner = type === 'js' ? ';\n' : '\n';
  const code = files.map((f) => minify(f).code.trim()).filter(Boolean).join(joiner) + '\n';
  const hash = sha(code);
  const url = `${type === 'js' ? OUT_JS : OUT_CSS}/${name}.${hash}.${type}`;
  const b = { type, name, files, code, hash, url, pages: 0 };
  bundles.set(key, b);
  return b;
}

/* runtime-loaded scripts are fingerprinted first: their URL is substituted into
   every source that fetches them, so it must exist before anything is minified */
for (const f of RUNTIME_LOADED) {
  if (fs.existsSync(f)) runtimeUrls.set(f, addBundle('js', base(f), [f]).url);
}

const stats = { pagesBefore: 0, pagesAfter: 0, reqBefore: 0, reqAfter: 0 };

for (const page of pages) {
  const info = parsed.get(page);
  const pageBase = page.replace(/\.html$/, '');
  let cssFiles, jsFiles, printFile = null;

  if (info.migrated) {
    const saved = prev.pages[page];
    if (!saved) throw new Error(`${page} points at assets/ but tools/assets.manifest.json has no entry — restore the manifest or revert the page.`);
    cssFiles = saved.css;
    jsFiles = saved.js;
    printFile = saved.print || null;
  } else {
    const blocking = info.styles.filter((s) => !(s.media && s.media.includes('print') && s.href.endsWith('print.css')));
    printFile = info.styles.find((s) => s.href.endsWith('print.css')) ? 'css/print.css' : null;
    cssFiles = blocking.map((s) => s.href);
    /* one page loads pwa.js twice — keep the last occurrence so the tail bundle
       stays identical to every other page's */
    const seen = new Set();
    jsFiles = info.scripts.map((s) => s.src).reverse().filter((f) => (seen.has(f) ? false : seen.add(f))).reverse();
  }

  const cssGroups = groupCss(cssFiles).map((g) => ({ ...g, bundle: addBundle('css', g.name, g.files) }));
  const jsGroups = groupJs(jsFiles, sharedJs, pageBase).map((g) => ({ ...g, bundle: addBundle('js', g.name, g.files) }));
  const printBundle = printFile ? addBundle('css', 'print', [printFile]) : null;
  [...cssGroups, ...jsGroups].forEach((g) => g.bundle.pages++);

  manifest.pages[page] = {
    css: cssFiles, js: jsFiles, print: printFile,
    bundles: { css: cssGroups.map((g) => g.name), js: jsGroups.map((g) => g.name) },
  };

  /* ── rewrite the page ───────────────────────────────────────────────────── */
  let html = info.html;
  const edits = [];

  const cssTagFor = (b, media) => `<link rel="stylesheet" href="${b.url}"${media ? ` media="${media}"` : ''}>`;
  /* data-sc-src lists what a bundle contains: it keeps the built page readable
     and lets runtime feature detection (js/sc-shell.js) still recognise a script
     that is now inlined into a bundle. */
  const jsTagFor = (b) => `<script defer src="${b.url}" data-sc-src="${b.files.map(base).join(' ')}"></script>`;

  if (info.migrated) {
    /* positional refresh: the Nth asset tag on the page is the Nth bundle, so a
       rebuild survives fingerprint *and* bundle-name changes */
    const printTag = info.styles.find((s) => s.media && s.media.includes('print'));
    const cssTags = info.styles.filter((s) => s !== printTag);
    if (cssTags.length !== cssGroups.length || info.scripts.length !== jsGroups.length) {
      throw new Error(`${page}: expected ${cssGroups.length} css + ${jsGroups.length} js bundle tags, found ${cssTags.length} + ${info.scripts.length}. Revert the page and rebuild.`);
    }
    cssTags.forEach((s, i) => edits.push([s.start, s.end, cssTagFor(cssGroups[i].bundle)]));
    if (printTag && printBundle) edits.push([printTag.start, printTag.end, cssTagFor(printBundle, 'print')]);
    info.scripts.forEach((s, i) => edits.push([s.start, s.end, jsTagFor(jsGroups[i].bundle)]));
    edits.sort((a, b) => b[0] - a[0]);
    for (const [start, end, text] of edits) html = html.slice(0, start) + text + html.slice(end);
  } else {
    const firstOf = new Map();
    cssGroups.forEach((g) => firstOf.set(g.files[0], g.bundle));
    const drop = new Set(cssGroups.flatMap((g) => g.files.slice(1)));

    for (const s of info.styles) {
      if (s.href.endsWith('print.css') && printBundle) { edits.push([s.start, s.end, cssTagFor(printBundle, 'print')]); continue; }
      const b = firstOf.get(s.href);
      if (b) edits.push([s.start, s.end, cssTagFor(b)]);
      else if (drop.has(s.href)) edits.push([s.start, s.end, '']);
    }

    const firstJs = new Map();
    jsGroups.forEach((g) => firstJs.set(g.files[0], g.bundle));
    const dropJs = new Set(jsGroups.flatMap((g) => g.files.slice(1)));
    const emitted = new Set();
    for (const s of info.scripts) {
      const b = firstJs.get(s.src);
      if (b && !emitted.has(b.url)) { emitted.add(b.url); edits.push([s.start, s.end, jsTagFor(b)]); }
      else if (b || dropJs.has(s.src)) edits.push([s.start, s.end, '']);
    }

    edits.sort((a, b) => b[0] - a[0]);
    for (const [start, end, text] of edits) html = html.slice(0, start) + text + html.slice(end);
    html = html.replace(/^[ \t]*\n/gm, (m, off) => (html[off - 1] === '\n' ? '' : m));
  }

  /* collapse the blank lines left behind by removed tags */
  html = html.replace(/\n{3,}/g, '\n\n');

  stats.reqBefore += cssFiles.length + (printFile ? 1 : 0) + jsFiles.length;
  stats.reqAfter += cssGroups.length + (printBundle ? 1 : 0) + jsGroups.length;
  stats.pagesBefore += [...cssFiles, ...jsFiles].reduce((n, f) => n + minify(f).raw, 0);
  stats.pagesAfter += [...cssGroups, ...jsGroups].reduce((n, g) => n + g.bundle.code.length, 0);

  if (!CHECK_ONLY && html !== info.html) fs.writeFileSync(page, html);
}

/* ── service worker pre-cache ──────────────────────────────────────────────── */
function swAssets() {
  const shellPages = ['index.html', '404.html', 'gpa-simulator.html'];
  const urls = ['/', ...shellPages.map((p) => `/${p}`), '/images/favicon.svg'];
  const notes = [];
  for (const p of shellPages) {
    const m = manifest.pages[p];
    if (!m) continue;
    for (const kind of ['css', 'js']) {
      for (const name of m.bundles[kind]) {
        const b = bundles.get(`${kind}:${name}`);
        if (!b || urls.includes(`/${b.url}`)) continue;
        urls.push(`/${b.url}`);
        notes.push(`     /${b.url}  ←  ${b.files.join(', ').replace(/(css|js)\//g, '/$1/')}`);
      }
    }
  }
  return { urls, notes };
}

if (!CHECK_ONLY) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_CSS, { recursive: true });
  fs.mkdirSync(OUT_JS, { recursive: true });
  for (const b of bundles.values()) fs.writeFileSync(b.url, b.code);
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const { urls, notes } = swAssets();
  const sw = fs.readFileSync('sw.js', 'utf8');
  const list = urls.map((u) => `  '${u}'`).join(',\n');
  const block = `/* Assets to pre-cache on install (the app shell).\n   GENERATED by tools/build-assets.mjs — do not edit by hand.\n   Fingerprinted bundles contain:\n${notes.join('\n')}\n*/\nvar SHELL_ASSETS = [\n${list}\n];`;
  const next = sw
    .replace(/\/\* Assets to pre-cache[\s\S]*?var SHELL_ASSETS = \[[\s\S]*?\];/, block)
    .replace(/var CACHE_NAME = '[^']*';/, `var CACHE_NAME = 'scholarics-shell-${sha(urls.join(','), 8)}';`);
  fs.writeFileSync('sw.js', next);
}

/* ── report ────────────────────────────────────────────────────────────────── */
const cssB = [...bundles.values()].filter((b) => b.type === 'css');
const jsB = [...bundles.values()].filter((b) => b.type === 'js');
log('\nCSS bundles');
cssB.sort((a, b) => b.pages - a.pages).forEach((b) => log(`  ${b.url.padEnd(46)} ${bytes(b.code.length).padStart(9)}  ${String(b.pages).padStart(2)} pages  ← ${b.files.map(base).join(' + ')}`));
log('\nJS bundles');
jsB.sort((a, b) => b.pages - a.pages).forEach((b) => log(`  ${b.url.padEnd(46)} ${bytes(b.code.length).padStart(9)}  ${String(b.pages).padStart(2)} pages  ← ${b.files.map(base).join(' + ')}`));

const dead = [...cache.entries()].filter(([f]) => f.endsWith('.css'))
  .reduce((n, [f]) => n + pruneDeadCss(fs.readFileSync(f, 'utf8')).removed, 0);
log(`\nPages                 ${pages.length}`);
log(`Dead CSS rules pruned ${dead}`);
log(`Requests  ${stats.reqBefore} → ${stats.reqAfter}  (${(stats.reqBefore / pages.length).toFixed(1)} → ${(stats.reqAfter / pages.length).toFixed(1)} per page)`);
log(`Bytes     ${bytes(stats.pagesBefore)} → ${bytes(stats.pagesAfter)}  (−${(100 - (stats.pagesAfter / stats.pagesBefore) * 100).toFixed(1)}%, sum over all pages)`);

if (CHECK_ONLY) {
  let stale = 0;
  for (const b of bundles.values()) {
    if (!fs.existsSync(b.url) || fs.readFileSync(b.url, 'utf8') !== b.code) { stale++; log(`stale: ${b.url}`); }
  }
  if (stale) { console.error(`\n${stale} bundle(s) out of date — run: npm run build`); process.exit(1); }
  log('\nassets/ is up to date');
}
