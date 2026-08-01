(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round, clamp = SM.clamp, uid = SM.uid, esc = SM.esc, store = SM.store;
  var LETTERS = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"];
  var L2P = {"A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"D-":0.7,"F":0};
  function pct2points(p) {
    p = clamp(p, 0, 100);
    if (p >= 93) return 4.0; if (p >= 90) return 3.7; if (p >= 87) return 3.3;
    if (p >= 83) return 3.0; if (p >= 80) return 2.7; if (p >= 77) return 2.3;
    if (p >= 73) return 2.0; if (p >= 70) return 1.7; if (p >= 67) return 1.3;
    if (p >= 63) return 1.0; if (p >= 60) return 0.7; return 0;
  }
  function nearestLetter(g) {
    var best = "F", bd = 99;
    for (var i = 0; i < LETTERS.length; i++) {
      var d = Math.abs(L2P[LETTERS[i]] - g);
      if (d < bd) { bd = d; best = LETTERS[i]; }
    }
    return best;
  }
  function classify(g) {
    if (g >= 3.7) return "Excellent standing";
    if (g >= 3.3) return "Very good";
    if (g >= 3.0) return "Good";
    if (g >= 2.0) return "Satisfactory";
    if (g > 0) return "Needs improvement";
    return "";
  }
  var KEY = "sm_gpa_rows", SKEY = "sm_gpa_scale";
  var scale = localStorage.getItem(SKEY) || "letter";
  var rows = store.get(KEY, []);
  if (!rows.length) {
    rows = [
      { id: uid(), name: "Course 1", grade: "A", credits: 3 },
      { id: uid(), name: "Course 2", grade: "B", credits: 3 }
    ];
  }

  /* Shareable link: auto-fill rows/scale from URL query params (?rows=...&scale=...) */
  var sharedFromLink = false;
  (function () {
    if (!window.SMShare) return;
    var rowsParam = SMShare.params().get("rows");
    if (!rowsParam) return;
    try {
      var parsed = JSON.parse(rowsParam);
      if (Array.isArray(parsed) && parsed.length) {
        rows = parsed.slice(0, 60).map(function (r) {
          return { id: uid(), name: String((r && r[0]) || ""), grade: r ? r[1] : "A", credits: r ? r[2] : 0 };
        });
        var sharedScale = SMShare.params().get("scale");
        if (sharedScale && ["letter", "percent", "points"].indexOf(sharedScale) !== -1) {
          scale = sharedScale;
          localStorage.setItem(SKEY, scale);
        }
        sharedFromLink = true;
      }
    } catch (e) {}
  })();
  function gradeCell(r) {
    if (scale === "letter") {
      var opts = LETTERS.map(function(l){
        return `<option value="${l}" ${r.grade === l ? "selected" : ""}>${l}</option>`;
      }).join("");
      return `<select class="select c-grade" data-f="grade">${opts}</select>`;
    }
    var max = scale === "points" ? 4 : 100;
    return `<input class="input tnum c-grade" data-f="grade" type="number" min="0" max="${max}" step="${scale==="points"?"0.1":"1"}" value="${r.grade}" placeholder="Grade">`;
  }
  function render() {
    var container = $("#rows");
    if (!container) return;
    container.innerHTML = rows.map(function(r) {
      return `
        <div class="crow" data-id="${r.id}">
          <div class="c-name"><input class="input" data-f="name" value="${esc(r.name)}" placeholder="Course name"></div>
          <div class="c-grade-wrap">${gradeCell(r)}</div>
          <div class="c-credit"><input class="input tnum" data-f="credits" type="number" value="${r.credits}" placeholder="Cr"></div>
          <div class="c-del"><button class="row-del" data-del="${r.id}" title="Delete">✕</button></div>
        </div>`;
    }).join("");
    attachEvents();
    compute();
  }
  function attachEvents() {
    $$(".crow").forEach(function(row) {
      var id = row.getAttribute("data-id");
      var inputs = $$("input, select", row);
      inputs.forEach(function(inp) {
        var field = inp.getAttribute("data-f");
        if (!field) return;
        inp.oninput = function() {
          var r = rows.find(function(x) { return x.id === id; });
          if (r) {
            r[field] = inp.value;
            save();
            compute();
          }
        };
      });
    });
    $$("[data-del]").forEach(function(b) {
      b.onclick = function() {
        var id = b.getAttribute("data-del");
        rows = rows.filter(function(r) { return r.id !== id; });
        save();
        render();
        SM.toast("Course removed", "info");
      };
    });
  }
  function resolve(r) {
    if (scale === "letter") return L2P[r.grade] || 0;
    var val = parseFloat(r.grade) || 0;
    if (scale === "points") return clamp(val, 0, 4);
    return pct2points(val);
  }
  function compute() {
    var cr = 0, qp = 0;
    rows.forEach(function(r) {
      var c = parseFloat(r.credits) || 0;
      if (c > 0) {
        cr += c;
        qp += (resolve(r) * c);
      }
    });
    var gpa = cr > 0 ? round(qp / cr, 2) : 0;
    var out = $("#gpaOut");
    var sub = $("#gpaLetter");
    if (out) out.textContent = gpa.toFixed(2);
    if ($("#mCourses")) $("#mCourses").textContent = rows.length;
    if ($("#mCredits")) $("#mCredits").textContent = round(cr, 1);
    if (sub) {
      sub.textContent = cr > 0 ? (nearestLetter(gpa) + " average · " + classify(gpa)) : "Add a course to begin";
    }
  }
  function save() { store.set(KEY, rows); }
  function setScaleNote() {
    var el = $("#scaleNote");
    if (!el) return;
    var notes = {
      letter: "<b>Letter scale:</b> A=4.0, B=3.0, etc. Credits weight the average.",
      percent: "<b>Percentage:</b> 0–100 inputs are mapped to points.",
      points: "<b>Grade points:</b> Direct 0–4.0 input per course."
    };
    el.innerHTML = notes[scale];
  }
  document.addEventListener("DOMContentLoaded", function () {
    var scaleSelect = $("#scale");
    if (scaleSelect) {
      scaleSelect.value = scale;
      scaleSelect.onchange = function(e) {
        scale = e.target.value;
        localStorage.setItem(SKEY, scale);
        rows.forEach(function(r) {
          if (scale === "letter") r.grade = "A";
          else if (scale === "points") r.grade = "4.0";
          else r.grade = "95";
        });
        save();
        render();
        setScaleNote();
        SM.toast("Scale changed", "info");
      };
    }
    var add1 = $("#addRow");
    var add2 = $("#addRow2");
    var handler = function() {
      var defGrade = "A";
      if (scale === "points") defGrade = "4.0";
      if (scale === "percent") defGrade = "95";
      rows.push({ id: uid(), name: "", grade: defGrade, credits: 3 });
      save();
      render();
      SM.toast("Course added", "success");
    };
    if (add1) add1.onclick = handler;
    if (add2) add2.onclick = handler;
    var clear = $("#clearAll");
    if (clear) {
      clear.onclick = function() {
        if (confirm("Clear all data?")) {
          rows = [];
          save();
          render();
          SM.toast("Data cleared", "info");
        }
      };
    }
    var share = $("#shareBtn");
    if (share) {
      share.onclick = function() {
        var g = $("#gpaOut") ? $("#gpaOut").textContent : "0.00";
        SM.copy("My GPA is " + g + "! Calculated on Study Metrics.");
      };
    }
    var copyLink = $("#copyLinkBtn");
    if (copyLink && window.SMShare) {
      copyLink.onclick = function () {
        var compact = rows.map(function (r) { return [r.name, r.grade, r.credits]; });
        SMShare.copyLink({ scale: scale, rows: JSON.stringify(compact) });
      };
    }
    render();
    setScaleNote();

    if (sharedFromLink && window.SMShare) {
      save();
      var gpaVal = $("#gpaOut") ? $("#gpaOut").textContent : "0.00";
      SMShare.showBanner({
        message: "You're viewing a shared GPA result of <b>" + gpaVal + "</b>. Edit any course below to make it your own.",
        host: document.querySelector(".tool-layout")
      });
    }
  });
})();
(function patchGpaRing() {
  function updateRing(gpa) {
    var arc = document.getElementById('gpaRingArc');
    if (!arc) return;
    var pct = Math.min(Math.max(parseFloat(gpa) || 0, 0), 4) / 4;
    var circumference = 314;
    arc.style.strokeDashoffset = circumference - (circumference * pct);
  }
  var gpaBig = document.querySelector('.gpa-big');
  if (!gpaBig) return;
  new MutationObserver(function() {
    updateRing(gpaBig.textContent);
  }).observe(gpaBig, { childList: true, characterData: true, subtree: true });
  setTimeout(function() { updateRing(gpaBig.textContent); }, 300);
})();