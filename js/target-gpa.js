(function () {
  "use strict";
  var $ = SM.$, round = SM.round, clamp = SM.clamp, store = SM.store;
  var KEY = "sm_target";
  document.addEventListener("DOMContentLoaded", function () {
    var curGpaEl = $("#curGpa");
    var curCredEl = $("#curCredits");
    var remCredEl = $("#remCredits");
    var goalGpaEl = $("#goalGpa");
    var goalSlideEl = $("#goalSlide");
    var goalSlideValEl = $("#goalSlideVal");
    var v = $("#verdict");
    var vt = $("#verdictText");
    var ne = $("#need");
    var ns = $("#needSub");
    var saved = store.get(KEY, null);
    if (saved) {
      curGpaEl.value = saved.cur;
      curCredEl.value = saved.cc;
      remCredEl.value = saved.rc;
      goalGpaEl.value = saved.goal;
    }
    function calc() {
      var cur = clamp(parseFloat(curGpaEl.value) || 0, 0, 4);
      var cc = Math.max(0, parseFloat(curCredEl.value) || 0);
      var rc = Math.max(0, parseFloat(remCredEl.value) || 0);
      var goal = clamp(parseFloat(goalGpaEl.value) || 0, 0, 4);
      store.set(KEY, { cur: cur, cc: cc, rc: rc, goal: goal });
      var tot = cc + rc;
      var segDone = $("#segDone");
      var segNeed = $("#segNeed");
      var legDone = $("#legDone");
      var legNeed = $("#legNeed");
      if (segDone) segDone.style.width = tot > 0 ? (cc / tot * 100) + "%" : "0%";
      if (segNeed) segNeed.style.width = tot > 0 ? (rc / tot * 100) + "%" : "0%";
      if (legDone) legDone.textContent = cc + " cr";
      if (legNeed) legNeed.textContent = rc + " cr";
      function setV(cls, title, text) {
        if (v && vt) {
          v.className = "verdict " + cls;
          vt.innerHTML = "<b>" + title + "</b><br>" + text;
        }
      }
      if (rc <= 0 || isNaN(rc)) {
        if (ne) ne.textContent = "—";
        if (ns) ns.textContent = "waiting for credits";
        setV("info", "Enter remaining credits", "We need to know how many credits you have left to calculate the requirement.");
        return;
      }
      var need = (goal * (cc + rc) - (cur * cc)) / rc;
      var finalNeeded = round(need, 2);
      if (ne) ne.textContent = finalNeeded <= 0 ? "0.00" : finalNeeded.toFixed(2);
      if (finalNeeded <= 0) {
        if (ns) ns.textContent = "goal already met";
        setV("ok", "Goal secured 🎉", "Your current standing is already at or above your target GPA.");
      } else if (finalNeeded > 4.0) {
        if (ns) ns.textContent = "mathematically impossible";
        setV("bad", "Out of reach", "Even with a perfect 4.0 in all remaining classes, you cannot reach this goal.");
      } else {
        if (ns) ns.textContent = "required average";
        if (finalNeeded <= 3.0) {
          setV("ok", "Very achievable", "This target is well within reach with steady performance.");
        } else if (finalNeeded <= 3.5) {
          setV("info", "Doable with effort", "You'll need to stay focused and aim for mostly A's and B's.");
        } else {
          setV("warn", "High performance needed", "You'll need to maintain near-perfect grades to hit this target.");
        }
      }
    }
    if (curGpaEl) curGpaEl.oninput = calc;
    if (curCredEl) curCredEl.oninput = calc;
    if (remCredEl) remCredEl.oninput = calc;
    if (goalGpaEl) {
      goalGpaEl.oninput = function() {
        var val = clamp(parseFloat(this.value) || 0, 0, 4);
        if (goalSlideEl) goalSlideEl.value = val;
        if (goalSlideValEl) goalSlideValEl.textContent = val.toFixed(2);
        calc();
      };
    }
    if (goalSlideEl) {
      goalSlideEl.oninput = function() {
        var val = parseFloat(this.value);
        if (goalGpaEl) goalGpaEl.value = val.toFixed(2);
        if (goalSlideValEl) goalSlideValEl.textContent = val.toFixed(2);
        calc();
      };
    }
    var resetBtn = $("#resetBtn");
    if (resetBtn) {
      resetBtn.onclick = function() {
        curGpaEl.value = "3.00";
        curCredEl.value = "60";
        remCredEl.value = "60";
        goalGpaEl.value = "3.50";
        if (goalSlideEl) goalSlideEl.value = "3.50";
        if (goalSlideValEl) goalSlideValEl.textContent = "3.50";
        calc();
        SM.toast("Reset to defaults", "info");
      };
    }
    var shareBtn = $("#shareBtn");
    if (shareBtn) {
      shareBtn.onclick = function() {
        var val = ne ? ne.textContent : "—";
        if (val === "—") return;
        SM.copy("I need to average a " + val + " to reach my goal! Check yours on Study Metrics.");
      };
    }
    if (goalSlideValEl && goalGpaEl) {
        goalSlideValEl.textContent = (parseFloat(goalGpaEl.value) || 0).toFixed(2);
    }
    calc();
  });
})();