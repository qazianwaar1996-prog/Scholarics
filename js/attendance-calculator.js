(function () {
  "use strict";
  var $ = SC.$;
  var $$ = SC.$$;
  var store = SC.store;
  var CIRC = 490;
  var KEY = "sc_attend";
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

    /* Shareable link: auto-fill from URL query params (?a=...&h=...&r=...) */
    var sharedFromLink = false;
    if (window.SCShare) {
      var qp = SCShare.params();
      if (qp.has("a") || qp.has("h") || qp.has("r")) {
        if (qp.get("a") !== null) attendedInput.value = qp.get("a");
        if (qp.get("h") !== null) heldInput.value = qp.get("h");
        if (qp.get("r") !== null) reqInput.value = qp.get("r");
        sharedFromLink = true;
      }
    }
    var saved = sharedFromLink ? null : store.get(KEY, null);
    if (saved) {
      attendedInput.value = saved.a;
      heldInput.value = saved.h;
      reqInput.value = saved.r;
    }
    function showFieldError(el, msg) {
      el.classList.add('input-error');
      var next = el.parentNode.querySelector('.field-error-msg');
      if (!next) {
        next = document.createElement('span');
        next.className = 'field-error-msg';
        el.parentNode.appendChild(next);
      }
      next.textContent = msg;
    }
    function clearFieldError(el) {
      el.classList.remove('input-error');
      var next = el.parentNode.querySelector('.field-error-msg');
      if (next) next.remove();
    }
    function calc() {
      var aRaw = attendedInput.value.trim();
      var hRaw = heldInput.value.trim();
      var rRaw = reqInput.value.trim();

      clearFieldError(attendedInput);
      clearFieldError(heldInput);
      clearFieldError(reqInput);

      var a = parseInt(aRaw, 10);
      var h = parseInt(hRaw, 10);
      var r = parseInt(rRaw, 10) || 75;

      // Validate attended
      if (aRaw !== '' && (isNaN(a) || a < 0)) {
        showFieldError(attendedInput, 'Must be a non-negative whole number');
        a = 0;
      } else if (!isNaN(a) && a > 100000) {
        showFieldError(attendedInput, 'Value seems too large');
      }

      // Validate held
      if (hRaw !== '' && (isNaN(h) || h < 0)) {
        showFieldError(heldInput, 'Must be a non-negative whole number');
        h = 0;
      } else if (!isNaN(h) && h > 100000) {
        showFieldError(heldInput, 'Value seems too large');
      }

      // Validate required %
      if (rRaw !== '' && (isNaN(r) || r < 0 || r > 100)) {
        showFieldError(reqInput, 'Must be between 0 and 100');
        r = SC.clamp(r || 75, 0, 100);
      }

      if (isNaN(a)) a = 0;
      if (isNaN(h)) h = 0;
      r = SC.clamp(r || 75, 0, 100);
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
      var pct = SC.round((a / h) * 100, 1);
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
        SC.toast("Reset successfully", "info");
      });
    }
    var shareBtn = $("#shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function() {
        if (pctEl.textContent === "—") {
            SC.toast("No results to copy", "info");
            return;
        }
        var text = "My attendance is " + pctEl.textContent + ". Calculated on Scholarics.";
        SC.copy(text);
      });
    }
    var copyLinkBtn = $("#attCopyLink");
    if (copyLinkBtn && window.SCShare) {
      copyLinkBtn.addEventListener("click", function () {
        SCShare.copyLink({
          a: attendedInput.value,
          h: heldInput.value,
          r: reqInput.value
        });
      });
    }
    calc();

    if (sharedFromLink && window.SCShare) {
      SCShare.showBanner({
        message: "Shared attendance result — <b>" + pctEl.textContent + "</b> attendance.",
        host: document.querySelector(".tool-layout")
      });
    }
  });
})();