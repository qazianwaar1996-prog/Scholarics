/* ==========================================================================
   Scholarics — GPA Simulator
   gpa-simulator.js · v1.0
   Features:
     • Live GPA calculation with multi-semester persistence (localStorage)
     • What-if simulation: adjust any course grade to see instant GPA impact
     • Semester-by-semester trend sparkline (pure SVG, zero dependencies)
     • Target GPA reverse-calculation: shows required grade for each course
     • Shareable URL encoding full simulator state (via SCShare)
     • PDF export via browser print (no library needed)
     • AI Study Coaching via Gemini API (optional, fails gracefully)
     • Full keyboard navigation & ARIA live regions
   ========================================================================== */
(function () {
  "use strict";

  /* ── Utilities from SC namespace ─────────────────────────────────────── */
  var $ = SC.$, $$ = SC.$$, round = SC.round, clamp = SC.clamp,
      uid = SC.uid, esc = SC.esc, store = SC.store;

  /* ── Constants ───────────────────────────────────────────────────────── */
  var LETTERS  = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"];
  var L2P      = {"A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,
                  "C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"D-":0.7,"F":0};
  var KEY_SEM  = "sc_sim_semesters";   /* array of semester objects */
  var KEY_TGT  = "sc_sim_target";      /* target GPA float */
  var MAX_SEM  = 12;
  var MAX_ROWS = 20;

  /* ── State ───────────────────────────────────────────────────────────── */
  var semesters = store.get(KEY_SEM, null);
  var targetGpa = parseFloat(localStorage.getItem(KEY_TGT)) || 3.5;

  if (!semesters || !semesters.length) {
    semesters = [makeSem("Semester 1", [
      { id: uid(), name: "English 101",   grade: "A",  credits: 3 },
      { id: uid(), name: "Calculus I",    grade: "B+", credits: 4 },
      { id: uid(), name: "History 101",   grade: "A-", credits: 3 },
    ])];
  }

  var activeSem = 0; /* index of currently displayed semester */

  /* ── URL share: restore state from query params ──────────────────────── */
  var sharedFromLink = false;
  (function () {
    if (!window.SCShare) return;
    var p = SCShare.params();
    var raw = p.get("sim");
    var tgt = p.get("tgt");
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        semesters = parsed.map(function (s, si) {
          return makeSem(s.n || ("Semester " + (si + 1)), (s.c || []).map(function (r) {
            return { id: uid(), name: String(r[0] || ""), grade: r[1] || "A", credits: r[2] || 3 };
          }));
        });
        if (tgt) targetGpa = clamp(parseFloat(tgt) || 3.5, 0, 4);
        sharedFromLink = true;
      }
    } catch (e) {}
  })();

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function makeSem(name, courses) {
    return { id: uid(), name: name, courses: courses || [] };
  }

  function gradePoints(grade) {
    return L2P.hasOwnProperty(grade) ? L2P[grade] : 0;
  }

  function calcGpa(courses) {
    var totalCr = 0, totalQp = 0;
    courses.forEach(function (c) {
      var cr = clamp(parseFloat(c.credits) || 0, 0, 50);
      if (cr > 0) { totalCr += cr; totalQp += gradePoints(c.grade) * cr; }
    });
    return totalCr > 0 ? round(totalQp / totalCr, 3) : null;
  }

  function calcCgpa() {
    var totalCr = 0, totalQp = 0;
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) {
        var cr = clamp(parseFloat(c.credits) || 0, 0, 50);
        if (cr > 0) { totalCr += cr; totalQp += gradePoints(c.grade) * cr; }
      });
    });
    return totalCr > 0 ? round(totalQp / totalCr, 3) : null;
  }

  function classify(g) {
    if (g === null) return "";
    if (g >= 3.7) return "Excellent standing";
    if (g >= 3.3) return "Very good";
    if (g >= 3.0) return "Good standing";
    if (g >= 2.0) return "Satisfactory";
    if (g > 0)   return "Needs improvement";
    return "";
  }

  function nearestLetter(g) {
    var best = "F", bd = 99;
    LETTERS.forEach(function (l) {
      var d = Math.abs(L2P[l] - g);
      if (d < bd) { bd = d; best = l; }
    });
    return best;
  }

  /* Needed grade in a course to hit the target CGPA after changing that course */
  function neededGrade(courseId) {
    var tgt = targetGpa;
    /* sum all quality points and credits EXCEPT this course */
    var otherCr = 0, otherQp = 0;
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) {
        if (c.id === courseId) return;
        var cr = clamp(parseFloat(c.credits) || 0, 0, 50);
        if (cr > 0) { otherCr += cr; otherQp += gradePoints(c.grade) * cr; }
      });
    });
    /* find this course's credits */
    var thisCourse = null;
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) { if (c.id === courseId) thisCourse = c; });
    });
    if (!thisCourse) return null;
    var thisCr = clamp(parseFloat(thisCourse.credits) || 0, 0, 50);
    if (thisCr === 0) return null;
    var needed = ((tgt * (otherCr + thisCr)) - otherQp) / thisCr;
    return needed;
  }

  function save() {
    store.set(KEY_SEM, semesters);
    try { localStorage.setItem(KEY_TGT, targetGpa); } catch(e) {}
  }

  /* ── Sparkline SVG ───────────────────────────────────────────────────── */
  function buildSparkline() {
    var gpas = [];
    var running = { cr: 0, qp: 0 };
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) {
        var cr = clamp(parseFloat(c.credits) || 0, 0, 50);
        if (cr > 0) { running.cr += cr; running.qp += gradePoints(c.grade) * cr; }
      });
      if (running.cr > 0) gpas.push(round(running.qp / running.cr, 3));
    });
    if (gpas.length < 1) return "";

    var W = 260, H = 80;
    var minG = Math.max(0, Math.min.apply(null, gpas) - 0.3);
    var maxG = Math.min(4, Math.max.apply(null, gpas) + 0.3);
    var range = maxG - minG || 0.1;

    function px(i)  { return gpas.length === 1 ? W / 2 : (i / (gpas.length - 1)) * W; }
    function py(g)  { return H - ((g - minG) / range) * (H - 12) - 4; }

    var pts = gpas.map(function (g, i) { return px(i) + "," + py(g); }).join(" ");
    var last = gpas[gpas.length - 1];
    var lx = px(gpas.length - 1), ly = py(last);

    /* gradient fill area */
    var area = "M" + px(0) + "," + H +
               " L" + gpas.map(function (g, i) { return px(i) + "," + py(g); }).join(" L") +
               " L" + px(gpas.length - 1) + "," + H + " Z";

    var tgtY = py(clamp(targetGpa, minG, maxG));

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" fill="none" aria-hidden="true" class="sim-sparkline">' +
      '<defs>' +
        '<linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>' +
          '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>' +
        '</linearGradient>' +
      '</defs>' +
      /* target line */
      (gpas.length > 0 ? '<line x1="0" y1="' + tgtY + '" x2="' + W + '" y2="' + tgtY + '" stroke="var(--gold)" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7"/>' : '') +
      /* fill */
      '<path d="' + area + '" fill="url(#simGrad)"/>' +
      /* line */
      '<polyline points="' + pts + '" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      /* dots */
      gpas.map(function (g, i) {
        return '<circle cx="' + px(i) + '" cy="' + py(g) + '" r="3" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>';
      }).join("") +
      /* last value label */
      '<text x="' + (lx + 6) + '" y="' + (ly + 4) + '" font-size="10" fill="var(--accent)" font-weight="600" font-family="inherit">' + last.toFixed(2) + '</text>' +
      '</svg>';
  }

  /* ── Tab rendering ───────────────────────────────────────────────────── */
  function renderTabs() {
    var wrap = $("#semTabs");
    if (!wrap) return;
    wrap.innerHTML = semesters.map(function (s, i) {
      var gpa = calcGpa(s.courses);
      return '<button class="sim-tab' + (i === activeSem ? " on" : "") + '" data-sem="' + i + '" aria-selected="' + (i === activeSem) + '">' +
        '<span class="sim-tab-name">' + esc(s.name) + '</span>' +
        (gpa !== null ? '<span class="sim-tab-gpa">' + gpa.toFixed(2) + '</span>' : '') +
      '</button>';
    }).join("") +
    (semesters.length < MAX_SEM ?
      '<button class="sim-tab sim-tab-add" id="addSemBtn" aria-label="Add new semester">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
      '</button>' : '');

    /* tab click events */
    $$(".sim-tab[data-sem]", wrap).forEach(function (btn) {
      btn.onclick = function () {
        activeSem = parseInt(btn.getAttribute("data-sem"), 10);
        render();
      };
    });
    var addBtn = $("#addSemBtn");
    if (addBtn) {
      addBtn.onclick = function () {
        var n = semesters.length + 1;
        semesters.push(makeSem("Semester " + n, [
          { id: uid(), name: "", grade: "A", credits: 3 }
        ]));
        activeSem = semesters.length - 1;
        save();
        render();
        SC.toast("Semester " + n + " added", "success");
      };
    }
  }

  /* ── Course rows rendering ───────────────────────────────────────────── */
  function renderRows() {
    var sem = semesters[activeSem];
    if (!sem) return;
    var container = $("#simRows");
    if (!container) return;
    var cgpa = calcCgpa();

    container.innerHTML = sem.courses.map(function (r) {
      var needed = neededGrade(r.id);
      var needTag = "";
      if (needed !== null && cgpa !== null) {
        if (needed > 4.0) {
          needTag = '<span class="sim-need sim-need-bad" title="Impossible to reach target with this course alone">Impossible</span>';
        } else if (needed <= 0) {
          needTag = '<span class="sim-need sim-need-ok">Already met</span>';
        } else {
          var nearL = nearestLetter(needed);
          needTag = '<span class="sim-need sim-need-info" title="Grade needed in this course to reach your target CGPA">Need ' + esc(nearL) + '</span>';
        }
      }
      var opts = LETTERS.map(function (l) {
        return '<option value="' + l + '"' + (r.grade === l ? " selected" : "") + ">" + l + " (" + L2P[l].toFixed(1) + ")" + "</option>";
      }).join("");

      return '<div class="crow sim-crow" data-id="' + r.id + '" role="row">' +
        '<div class="c-name"><input class="input" data-f="name" value="' + esc(r.name) + '" placeholder="Course name" aria-label="Course name"></div>' +
        '<div class="c-grade-wrap"><select class="select c-grade" data-f="grade" aria-label="Grade">' + opts + '</select></div>' +
        '<div class="c-credit"><input class="input tnum" data-f="credits" type="number" min="0" max="50" step="0.5" value="' + r.credits + '" aria-label="Credits"></div>' +
        '<div class="c-need">' + needTag + '</div>' +
        '<div class="c-del"><button class="row-del" data-del="' + r.id + '" title="Remove course" aria-label="Remove course"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '</div>';
    }).join("");

    attachRowEvents();
  }

  function attachRowEvents() {
    var sem = semesters[activeSem];
    if (!sem) return;
    $$(".sim-crow").forEach(function (row) {
      var id = row.getAttribute("data-id");
      $$("input,select", row).forEach(function (inp) {
        var field = inp.getAttribute("data-f");
        if (!field) return;
        inp.oninput = inp.onchange = function () {
          var course = sem.courses.find(function (c) { return c.id === id; });
          if (course) { course[field] = inp.value; save(); compute(); }
        };
      });
    });
    $$("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-del");
        sem.courses = sem.courses.filter(function (c) { return c.id !== id; });
        save();
        render();
        SC.toast("Course removed", "info");
      };
    });
  }

  /* ── Compute & update result panel ──────────────────────────────────── */
  function compute() {
    var sem   = semesters[activeSem];
    var semGpa  = sem ? calcGpa(sem.courses) : null;
    var cgpa    = calcCgpa();

    /* result hero */
    var cgpaOut = $("#simCgpa");
    var semOut  = $("#simSemGpa");
    var statusOut = $("#simStatus");
    var creditsOut = $("#simTotalCredits");
    var sparkWrap = $("#simSparkWrap");

    if (cgpaOut) cgpaOut.textContent = cgpa !== null ? cgpa.toFixed(2) : "—";
    if (semOut)  semOut.textContent  = semGpa !== null ? semGpa.toFixed(2) : "—";
    if (statusOut) statusOut.textContent = cgpa !== null ? classify(cgpa) : "Add courses to begin";

    /* total credits across all semesters */
    var totalCr = 0;
    semesters.forEach(function (s) {
      s.courses.forEach(function (c) { totalCr += clamp(parseFloat(c.credits) || 0, 0, 50); });
    });
    if (creditsOut) creditsOut.textContent = totalCr;

    /* target delta badge */
    var deltaEl = $("#simTargetDelta");
    if (deltaEl && cgpa !== null) {
      var delta = round(targetGpa - cgpa, 2);
      if (delta <= 0) {
        deltaEl.className = "sim-delta sim-delta-ok";
        deltaEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Target reached!';
      } else {
        deltaEl.className = "sim-delta sim-delta-warn";
        deltaEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg> ' + delta.toFixed(2) + ' to go';
      }
    }

    /* sparkline */
    if (sparkWrap) sparkWrap.innerHTML = buildSparkline();

    /* update semester tabs (GPA labels change) */
    $$(".sim-tab[data-sem]").forEach(function (btn, i) {
      var s = semesters[i];
      if (!s) return;
      var g = calcGpa(s.courses);
      var tag = btn.querySelector(".sim-tab-gpa");
      if (tag) tag.textContent = g !== null ? g.toFixed(2) : "";
    });

    /* refresh needed-grade tags without full re-render */
    renderRows();
  }

  /* ── Full render ─────────────────────────────────────────────────────── */
  function render() {
    renderTabs();
    renderRows();
    compute();

    /* active semester name inline edit */
    var nameEl = $("#activeSemName");
    if (nameEl) {
      nameEl.textContent = semesters[activeSem] ? semesters[activeSem].name : "";
      nameEl.oninput = function () {
        if (semesters[activeSem]) {
          semesters[activeSem].name = nameEl.textContent.trim() || ("Semester " + (activeSem + 1));
          save();
          renderTabs();
        }
      };
    }

    /* delete active semester button */
    var delSem = $("#delSemBtn");
    if (delSem) {
      delSem.style.display = semesters.length > 1 ? "" : "none";
      delSem.onclick = function () {
        if (semesters.length <= 1) return;
        if (!confirm("Delete "" + semesters[activeSem].name + "" and all its courses?")) return;
        semesters.splice(activeSem, 1);
        activeSem = Math.max(0, activeSem - 1);
        save();
        render();
        SC.toast("Semester deleted", "info");
      };
    }
  }

  /* ── AI Study Coaching (Gemini) ──────────────────────────────────────── */
  function requestAiCoach() {
    var btn    = $("#aiCoachBtn");
    var out    = $("#aiCoachOut");
    var loader = $("#aiCoachLoader");
    if (!btn || !out) return;

    var cgpa  = calcCgpa();
    var sem   = semesters[activeSem];
    var weakest = (sem ? sem.courses.slice().sort(function (a, b) {
      return gradePoints(a.grade) - gradePoints(b.grade);
    }) : []).slice(0, 3);

    var prompt = "You are an academic coach. A student has a CGPA of " +
      (cgpa !== null ? cgpa.toFixed(2) : "unknown") + " out of 4.0 and a target CGPA of " + targetGpa.toFixed(2) + ". " +
      "Their weakest courses this semester are: " +
      (weakest.map(function (c) { return c.name + " (" + c.grade + ")"; }).join(", ") || "none yet") + ". " +
      "Give a short, specific, encouraging 3-point study action plan. Use plain text, no markdown headers. Keep it under 100 words.";

    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    if (loader) loader.style.display = "";
    out.textContent = "";

    fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + window.SCHOLARICS_GEMINI_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var text = "";
      try { text = data.candidates[0].content.parts[0].text || ""; } catch (e) {}
      out.textContent = text || "Great work tracking your GPA! Keep attending classes consistently and review your notes within 24 hours of each lecture for the biggest retention gains.";
    })
    .catch(function () {
      out.textContent = "Focus on your " +
        (weakest[0] ? weakest[0].name : "weakest") +
        " course first. Create a study schedule, review past exams, and seek help early — consistency beats cramming every time.";
    })
    .finally(function () {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      if (loader) loader.style.display = "none";
    });
  }

  /* ── Share URL ───────────────────────────────────────────────────────── */
  function buildShareData() {
    var compact = semesters.map(function (s) {
      return { n: s.name, c: s.courses.map(function (c) { return [c.name, c.grade, c.credits]; }) };
    });
    return { sim: JSON.stringify(compact), tgt: targetGpa.toString() };
  }

  /* ── Print / PDF ─────────────────────────────────────────────────────── */
  function printReport() {
    var cgpa = calcCgpa();
    var win  = window.open("", "_blank", "width=800,height=600");
    if (!win) { SC.toast("Allow pop-ups to download the PDF", "info"); return; }
    var rows = [];
    semesters.forEach(function (s) {
      var sg = calcGpa(s.courses);
      rows.push("<tr><td colspan='4' style='background:#f6f5f2;font-weight:700;padding:8px 12px;font-size:13px'>" + esc(s.name) + (sg !== null ? " — GPA: " + sg.toFixed(2) : "") + "</td></tr>");
      s.courses.forEach(function (c) {
        rows.push("<tr><td style='padding:7px 12px'>" + esc(c.name || "—") + "</td><td>" + esc(c.grade) + "</td><td>" + gradePoints(c.grade).toFixed(1) + "</td><td>" + c.credits + "</td></tr>");
      });
    });
    win.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Scholarics GPA Report</title>" +
      "<style>body{font-family:Inter,system-ui,sans-serif;color:#1a1815;padding:32px;max-width:700px;margin:0 auto}" +
      "h1{font-size:22px;margin:0 0 4px}p.sub{color:#6b7280;margin:0 0 24px;font-size:13px}" +
      "table{width:100%;border-collapse:collapse;font-size:13px}" +
      "th{background:#1a1815;color:#fff;padding:9px 12px;text-align:left;font-weight:600}" +
      "td{padding:7px 12px;border-bottom:1px solid #e5e0d8}" +
      ".hero{background:#1a1815;color:#fff;border-radius:12px;padding:20px 24px;margin-bottom:24px;display:flex;gap:40px}" +
      ".hero .n{font-size:38px;font-weight:700;letter-spacing:-.02em;line-height:1}" +
      ".hero .l{font-size:12px;opacity:.7;margin-top:4px}" +
      "@media print{body{padding:16px}}</style></head><body>" +
      "<h1>GPA Simulator Report</h1>" +
      "<p class='sub'>Generated by Scholarics &middot; scholarics.com &middot; " + new Date().toLocaleDateString() + "</p>" +
      "<div class='hero'>" +
        "<div><div class='n'>" + (cgpa !== null ? cgpa.toFixed(2) : "—") + "</div><div class='l'>Cumulative GPA</div></div>" +
        "<div><div class='n'>" + targetGpa.toFixed(2) + "</div><div class='l'>Target GPA</div></div>" +
        "<div><div class='n'>" + semesters.length + "</div><div class='l'>Semesters</div></div>" +
      "</div>" +
      "<table><thead><tr><th>Course</th><th>Grade</th><th>Points</th><th>Credits</th></tr></thead><tbody>" +
      rows.join("") +
      "</tbody></table></body></html>");
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 400);
  }

  /* ── DOMContentLoaded ────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    /* initial render */
    render();

    /* target GPA input */
    var tgtInput = $("#simTarget");
    var tgtSlider = $("#simTargetSlider");
    if (tgtInput) {
      tgtInput.value = targetGpa.toFixed(2);
      tgtInput.oninput = function () {
        var v = clamp(parseFloat(tgtInput.value) || 0, 0, 4);
        targetGpa = v;
        if (tgtSlider) tgtSlider.value = v;
        save();
        compute();
      };
    }
    if (tgtSlider) {
      tgtSlider.value = targetGpa;
      tgtSlider.oninput = function () {
        var v = clamp(parseFloat(tgtSlider.value) || 0, 0, 4);
        targetGpa = v;
        if (tgtInput) tgtInput.value = v.toFixed(2);
        save();
        compute();
      };
    }

    /* add course button */
    var addCourseBtn = $("#addCourseBtn");
    if (addCourseBtn) {
      addCourseBtn.onclick = function () {
        var sem = semesters[activeSem];
        if (!sem || sem.courses.length >= MAX_ROWS) {
          SC.toast("Maximum " + MAX_ROWS + " courses per semester", "info");
          return;
        }
        sem.courses.push({ id: uid(), name: "", grade: "A", credits: 3 });
        save();
        render();
        /* focus new name input */
        var rows = $$(".sim-crow");
        var last = rows[rows.length - 1];
        if (last) { var inp = $("input[data-f='name']", last); if (inp) inp.focus(); }
      };
    }

    /* clear semester */
    var clearBtn = $("#clearSemBtn");
    if (clearBtn) {
      clearBtn.onclick = function () {
        var sem = semesters[activeSem];
        if (!sem || !sem.courses.length) return;
        if (!confirm("Clear all courses from " + sem.name + "?")) return;
        sem.courses = [];
        save();
        render();
        SC.toast("Semester cleared", "info");
      };
    }

    /* share button */
    var shareBtn = $("#simShareBtn");
    if (shareBtn && window.SCShare) {
      shareBtn.onclick = function () {
        SCShare.copyLink(buildShareData());
      };
    } else if (shareBtn) {
      shareBtn.style.display = "none";
    }

    /* PDF button */
    var pdfBtn = $("#simPdfBtn");
    if (pdfBtn) pdfBtn.onclick = printReport;

    /* AI coach button */
    var aiBtn = $("#aiCoachBtn");
    if (aiBtn) aiBtn.onclick = requestAiCoach;

    /* shared from link banner */
    if (sharedFromLink && window.SCShare) {
      save();
      var cgpaVal = calcCgpa();
      SCShare.showBanner({
        message: "You're viewing a shared GPA result" +
          (cgpaVal !== null ? " of <b>" + cgpaVal.toFixed(2) + " CGPA</b>" : "") +
          ". Edit any course to make it your own.",
        host: document.querySelector(".tool-layout")
      });
    }
  });
})();
