(function () {
  "use strict";
  var $ = SM.$, clamp = SM.clamp, store = SM.store;
  function round(n) {
    var f = 10;
    return Math.round((n + Number.EPSILON) * f) / f;
  }
  var KEY = "sm_final";
  function courseGradeAt(score, cur, w) { return cur * (1 - w) + score * w; }
  document.addEventListener("DOMContentLoaded", function () {
    var curInput = $("#cur");
    var goalInput = $("#goal");
    var weightInput = $("#weight");
    var arc = $("#gaugeArc");
    var ne = $("#need");
    var v = $("#verdict");
    var vt = $("#verdictText");
    if (!curInput || !goalInput || !weightInput) return;
    var saved = store.get(KEY, null);
    if (saved) {
      curInput.value = saved.cur;
      goalInput.value = saved.goal;
      weightInput.value = saved.w;
    }
    function calc() {
      var cur = parseFloat(curInput.value);
      var goal = parseFloat(goalInput.value);
      var wValue = parseFloat(weightInput.value);
      if (isNaN(cur) || isNaN(goal) || isNaN(wValue) || wValue <= 0) {
        ne.textContent = "—";
        if (arc) arc.style.strokeDashoffset = 270;
        if (v) v.className = "verdict info";
        if (vt) vt.innerHTML = "Enter your numbers to begin";
        ["100", "90", "80", "70"].forEach(function(id) {
          var el = $("#sc" + id);
          if (el) el.textContent = "—";
        });
        return;
      }
      var w = clamp(wValue, 0.1, 100) / 100;
      store.set(KEY, { cur: cur, goal: goal, w: wValue });
      var need = round((goal - cur * (1 - w)) / w);
      if ($("#sc100")) $("#sc100").textContent = round(courseGradeAt(100, cur, w)) + "%";
      if ($("#sc90")) $("#sc90").textContent = round(courseGradeAt(90, cur, w)) + "%";
      if ($("#sc80")) $("#sc80").textContent = round(courseGradeAt(80, cur, w)) + "%";
      if ($("#sc70")) $("#sc70").textContent = round(courseGradeAt(70, cur, w)) + "%";
      var shown = clamp(need, 0, 100);
      if (arc) arc.style.strokeDashoffset = 270 - (270 * shown / 100);
      function setV(cls, color, title, text) {
        if (v) v.className = "verdict " + cls;
        if (vt) vt.innerHTML = "<b>" + title + "</b><br>" + text;
        if (arc) arc.style.stroke = color;
      }
      if (need <= 0) {
        ne.textContent = "0%";
        if (arc) arc.style.strokeDashoffset = 0;
        setV("ok", "#2ecc71", "Already secured 🎉", "Even a zero on the final keeps you above your goal.");
      } else if (need > 100) {
        ne.textContent = need + "%";
        setV("bad", "#e74c3c", "Not reachable", "You would need " + need + "% to hit this goal. Try adjusting your target.");
      } else {
        ne.textContent = need + "%";
        if (need <= 50) {
          setV("ok", "#2ecc71", "Highly achievable", "You're in a great spot. Comfortably within reach.");
        } else if (need <= 75) {
          setV("info", "#3498db", "Doable with effort", "A solid study session should get you there.");
        } else if (need <= 90) {
          setV("warn", "#f1c40f", "Time to study", "A strong performance is required to hit this mark.");
        } else {
          setV("warn", "#e67e22", "Very demanding", "Nearly a perfect score required. Every point counts.");
        }
      }
    }
    [curInput, goalInput, weightInput].forEach(function (el) {
      el.oninput = calc;
    });
    var resetBtn = $("#resetBtn");
    if (resetBtn) {
      resetBtn.onclick = function() {
        curInput.value = "";
        goalInput.value = "";
        weightInput.value = "";
        store.set(KEY, null);
        calc();
        SM.toast("Fields reset", "info");
      };
    }
    var shareBtn = $("#shareBtn");
    if (shareBtn) {
      shareBtn.onclick = function() {
        var score = ne.textContent;
        if (score === "—") return SM.toast("Enter numbers first", "error");
        SM.copy("I need a " + score + " on my final to reach my goal! Calculated on Study Metrics.");
      };
    }
    calc();
  });
})();