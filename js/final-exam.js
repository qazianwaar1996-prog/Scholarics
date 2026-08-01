(function () {
  "use strict";
  var $ = SM.$, round = SM.round, clamp = SM.clamp, store = SM.store;
  var KEY = "sm_final_exam";
  var GRADE_MINS = {
    "A+": 97, "A": 93, "A-": 90,
    "B+": 87, "B": 83, "B-": 80,
    "C+": 77, "C": 73, "C-": 70,
    "D+": 67, "D": 63, "D-": 60,
    "F":   0
  };
  var SCENARIOS = [100, 90, 80, 70, 60, 50];
  function letterGrade(pct) {
    if (pct >= 97) return "A+";
    if (pct >= 93) return "A";
    if (pct >= 90) return "A-";
    if (pct >= 87) return "B+";
    if (pct >= 83) return "B";
    if (pct >= 80) return "B-";
    if (pct >= 77) return "C+";
    if (pct >= 73) return "C";
    if (pct >= 70) return "C-";
    if (pct >= 67) return "D+";
    if (pct >= 63) return "D";
    if (pct >= 60) return "D-";
    return "F";
  }
  function verdictContent(need) {
    if (need <= 0)   return { cls: "ok",   icon: "check", title: "Already secured!", msg: "You've already locked in your target grade — even a 0 on the final won't drop you below it." };
    if (need <= 60)  return { cls: "ok",   icon: "check", title: "Very achievable",  msg: "A comfortable score on the final will get you there. Keep up your current effort." };
    if (need <= 75)  return { cls: "info", icon: "info",  title: "Reachable",        msg: "Solid preparation should get you across the line. Focus your study on key topics." };
    if (need <= 90)  return { cls: "warn", icon: "warn",  title: "Challenging",      msg: "A strong performance is required. Make your remaining study time count." };
    if (need <= 100) return { cls: "warn", icon: "warn",  title: "Very demanding",   msg: "Near-perfect score needed. Every point matters — cover every topic thoroughly." };
    return { cls: "bad", icon: "x", title: "Not reachable", msg: "The target grade is mathematically out of reach with this final weight. Try adjusting your goal." };
  }
  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    info:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    warn:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 22h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    x:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
  };
  function compute() {
    var curEl    = $("#feCurrentGrade");
    var goalEl   = $("#feTargetGrade");
    var weightEl = $("#feWeight");
    if (!curEl || !goalEl || !weightEl) return;
    var cur    = parseFloat(curEl.value);
    var weight = parseFloat(weightEl.value);
    var goal;
    var goalMode = goalEl.tagName === "SELECT" ? "letter" : "number";
    if (goalMode === "letter") {
      goal = GRADE_MINS[goalEl.value];
    } else {
      goal = parseFloat(goalEl.value);
    }
    var needEl   = $("#feNeedOut");
    var letterEl = $("#feLetterOut");
    var subEl    = $("#feSubOut");
    var verdictEl= $("#feVerdict");
    var scenEl   = $("#feScenarios");
    store.set(KEY, { cur: curEl.value, goal: goalEl.value, weight: weightEl.value });
    if (isNaN(cur) || isNaN(goal) || isNaN(weight) || weight <= 0 || weight > 100) {
      if (needEl)   needEl.textContent   = "—";
      if (letterEl) letterEl.textContent = "";
      if (subEl)    subEl.textContent    = "Enter your numbers above";
      if (verdictEl) verdictEl.className = "verdict info";
      return;
    }
    var w    = weight / 100;
    var need = round((goal - cur * (1 - w)) / w, 1);
    if (needEl)   needEl.textContent   = need <= 0 ? "0%" : need > 100 ? need + "%" : need + "%";
    if (letterEl) letterEl.textContent = need <= 100 && need >= 0 ? letterGrade(need) : "";
    if (subEl)    subEl.textContent    = need <= 0
      ? "Already secured"
      : need > 100
      ? "Not achievable"
      : "required on final exam";
    if (verdictEl) {
      var v = verdictContent(need);
      verdictEl.className = "verdict " + v.cls;
      verdictEl.innerHTML = ICONS[v.icon]
        + '<div><b>' + v.title + '</b>' + v.msg + '</div>';
    }
    if (scenEl) {
      scenEl.innerHTML = SCENARIOS.map(function (examScore) {
        var finalGrade = round(cur * (1 - w) + examScore * w, 1);
        var letter     = letterGrade(finalGrade);
        return '<div class="srow">'
          + '<span class="g">Score ' + examScore + '% on exam</span>'
          + '<span class="s tnum">' + finalGrade + '% &nbsp;<b>' + letter + '</b></span>'
          + '</div>';
      }).join("");
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    /* Shareable link: auto-fill from URL query params (?cur=...&goal=...&weight=...) */
    var sharedFromLink = false;
    if (window.SMShare) {
      var qp = SMShare.params();
      if (qp.has("cur") || qp.has("goal") || qp.has("weight")) {
        var sce = $("#feCurrentGrade"); if (sce && qp.get("cur") !== null) sce.value = qp.get("cur");
        var sge = $("#feTargetGrade");  if (sge && qp.get("goal") !== null) sge.value = qp.get("goal");
        var swe = $("#feWeight");       if (swe && qp.get("weight") !== null) swe.value = qp.get("weight");
        sharedFromLink = true;
      }
    }
    var saved = sharedFromLink ? null : store.get(KEY, null);
    if (saved) {
      var ce = $("#feCurrentGrade"); if (ce) ce.value = saved.cur || "";
      var ge = $("#feTargetGrade");  if (ge) ge.value = saved.goal || "";
      var we = $("#feWeight");       if (we) we.value = saved.weight || "";
    }
    ["#feCurrentGrade", "#feTargetGrade", "#feWeight"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("input", compute);
    });
    var resetBtn = $("#feReset");
    if (resetBtn) {
      resetBtn.onclick = function () {
        ["#feCurrentGrade", "#feTargetGrade", "#feWeight"].forEach(function (sel) {
          var el = $(sel); if (el) el.value = "";
        });
        store.set(KEY, null);
        compute();
        SM.toast("Fields cleared", "info");
      };
    }
    var shareBtn = $("#feShare");
    if (shareBtn) {
      shareBtn.onclick = function () {
        var val = $("#feNeedOut") ? $("#feNeedOut").textContent : "—";
        if (val === "—") return SM.toast("Enter values first", "info");
        SM.copy("I need " + val + " on my final exam to hit my grade goal — calculated on Study Metrics (studymetrics.app)");
      };
    }
    var copyLinkBtn = $("#feCopyLink");
    if (copyLinkBtn && window.SMShare) {
      copyLinkBtn.onclick = function () {
        var curEl = $("#feCurrentGrade"), goalEl = $("#feTargetGrade"), weightEl = $("#feWeight");
        SMShare.copyLink({
          cur: curEl ? curEl.value : "",
          goal: goalEl ? goalEl.value : "",
          weight: weightEl ? weightEl.value : ""
        });
      };
    }
    compute();

    if (sharedFromLink && window.SMShare) {
      var needVal = $("#feNeedOut") ? $("#feNeedOut").textContent : "—";
      SMShare.showBanner({
        message: "Shared final exam scenario — score needed on the final: <b>" + needVal + "</b>.",
        host: document.querySelector(".tool-layout")
      });
    }
  });
})();