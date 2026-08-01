/**
 * ATTENDANCE CALCULATOR LOGIC - Optimized
 */

(function () {
  "use strict";

  var $ = SM.$;
  var $$ = SM.$$;
  var store = SM.store;
  
  // Circumference for r=78 is ~490
  var CIRC = 490; 
  var KEY = "sm_attend";

  document.addEventListener("DOMContentLoaded", function () {
    var attendedInput = $("#attended");
    var heldInput = $("#held");
    var reqInput = $("#req");
    var arc = $("#ringArc");
    var pctEl = $("#pct");
    var st = $("#status");
    var v = $("#verdict");
    var vt = $("#verdictText");

    if (!attendedInput || !heldInput || !reqInput) return;

    var saved = store.get(KEY, null);
    if (saved) {
      attendedInput.value = saved.a;
      heldInput.value = saved.h;
      reqInput.value = saved.r;
    }

    function calc() {
      var a = Math.max(0, parseInt(attendedInput.value));
      var h = Math.max(0, parseInt(heldInput.value));
      var r = SM.clamp(parseInt(reqInput.value) || 0, 0, 100);

      if (isNaN(a)) a = 0;
      if (isNaN(h)) h = 0;

      store.set(KEY, { a: a, h: h, r: r });

      if (h === 0) {
        pctEl.textContent = "—";
        st.textContent = "Enter class details";
        arc.style.strokeDashoffset = CIRC;
        v.className = "verdict info";
        vt.innerHTML = "Enter your class details to see your verdict.";
        return;
      }

      if (a > h) {
        pctEl.textContent = "—";
        st.textContent = "Error in numbers";
        arc.style.strokeDashoffset = CIRC;
        v.className = "verdict bad";
        vt.innerHTML = "<b>Invalid input</b>Attended classes cannot exceed total classes held.";
        return;
      }

      var pct = SM.round((a / h) * 100, 1);
      pctEl.textContent = pct + "%";
      
      var offset = CIRC - (CIRC * Math.min(pct, 100) / 100);
      arc.style.strokeDashoffset = offset;

      var rf = r / 100;

      if (pct >= r) {
        var canSkip = rf > 0 ? Math.floor(a / rf - h) : Infinity;
        arc.style.stroke = "var(--ok, #2ecc71)";
        st.textContent = "Safe: Above " + r + "%";
        v.className = "verdict ok";
        
        if (canSkip >= 1) {
          vt.innerHTML = "<b>You can skip " + canSkip + " more class" + (canSkip === 1 ? "" : "es") + "</b> and stay above the required " + r + "%.";
        } else {
          vt.innerHTML = "<b>Maintain your streak!</b> You're above " + r + "%, but missing the next class will put you below the limit.";
        }
      } else {
        var needAttend = rf < 1 ? Math.ceil((rf * h - a) / (1 - rf)) : Infinity;
        arc.style.stroke = "var(--danger, #e74c3c)";
        st.textContent = "Danger: Below " + r + "%";
        v.className = "verdict bad";

        if (isFinite(needAttend) && needAttend > 0) {
          vt.innerHTML = "<b>Attend the next " + needAttend + " class" + (needAttend === 1 ? "" : "es") + "</b> without fail to reach your " + r + "% goal.";
        } else {
          vt.innerHTML = "<b>Recovery impossible</b> with a 100% requirement. Lower your goal or check your inputs.";
        }
      }
    }

    [attendedInput, heldInput, reqInput].forEach(function (el) {
      el.addEventListener("input", calc);
    });

    var resetBtn = $("#resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        attendedInput.value = "";
        heldInput.value = "";
        reqInput.value = 75;
        calc();
        SM.toast("Reset successfully", "info");
      });
    }

    var shareBtn = $("#shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function() {
        if (pctEl.textContent === "—") {
            SM.toast("No results to copy", "info");
            return;
        }
        var text = "My attendance is " + pctEl.textContent + ". Calculated on Study Metrics.";
        SM.copy(text);
      });
    }

    calc();
  });
})();
