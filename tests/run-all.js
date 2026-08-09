/* Scholarics — run every GPA Simulator test suite in sequence.
     node tests/run-all.js
   Exits non-zero if any suite fails. */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const suites = [
  { file: "core.test.js",            label: "Core maths (scales, GPA, needed-grade, sanitise)" },
  { file: "simulator-ui.test.js",    label: "Simulator UI (jsdom, full page)" },
  { file: "backend.test.js",         label: "Backend API (wrangler, AI mock)" },
  { file: "integration.test.js",     label: "Site integration (links, search, SEO, footer)" },
  { file: "global-actions.test.js",  label: "Global Calculator Actions (Share, Copy Link, PDF, State Restoration)" }
];

let failed = 0;
for (const s of suites) {
  console.log("\n=== " + s.label + " ===");
  const r = spawnSync(process.execPath, [path.join(__dirname, s.file)], { stdio: "inherit", timeout: 300000 });
  if (r.status !== 0) { failed++; console.error("SUITE FAILED: " + s.file); }
}
console.log(failed ? "\n" + failed + " suite(s) FAILED" : "\nAll suites passed");
process.exit(failed ? 1 : 0);
