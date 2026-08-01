(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round, uid = SM.uid, esc = SM.esc, store = SM.store;
  function letter(p) {
    if (p >= 93) return "A";
    if (p >= 90) return "A-";
    if (p >= 87) return "B+";
    if (p >= 83) return "B";
    if (p >= 80) return "B-";
    if (p >= 77) return "C+";
    if (p >= 73) return "C";
    if (p >= 70) return "C-";
    if (p >= 67) return "D+";
    if (p >= 63) return "D";
    if (p >= 60) return "D-";
    return "F";
  }
  var KEY = "sm_grade_rows";
  var rows = store.get(KEY, []);
  if (!rows.length) {
    rows = [
      { id: uid(), name: "Assignments", score: 90, weight: 20 },
      { id: uid(), name: "Midterm", score: 85, weight: 30 },
      { id: uid(), name: "Final Exam", score: 88, weight: 50 }
    ];
  }
  function render() {
    var container = $("#rows");
    if (!container) return;
    container.innerHTML = rows.map(function (r) {
      return `
        <div class="crow" data-id="${r.id}">
          <div class="c-name">
            <input class="input" data-f="name" value="${esc(r.name)}" placeholder="Item name">
          </div>
          <div class="c-a">
            <input class="input tnum" data-f="score" type="number" min="0" step="0.1" value="${r.score}" placeholder="Score %">
          </div>
          <div class="c-b">
            <input class="input tnum" data-f="weight" type="number" min="0" step="0.5" value="${r.weight}" placeholder="Weight %">
          </div>
          <div class="c-del">
            <button class="row-del" data-del="${r.id}" title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>`;
    }).join("");
    attachEvents();
    compute();
  }
  function attachEvents() {
    $$(".crow").forEach(function (row) {
      var id = row.getAttribute("data-id");
      var inputs = $$("input", row);
      inputs.forEach(function (inp) {
        var field = inp.getAttribute("data-f");
        if (!field) return;
        inp.oninput = function () {
          var r = rows.find(function(x) { return x.id === id; });
          if (r) {
            r[field] = inp.value;
            save();
            compute();
          }
        };
      });
    });
    $$("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-del");
        rows = rows.filter(function (r) { return r.id !== id; });
        save();
        render();
        SM.toast("Item removed", "info");
      };
    });
  }
  function compute() {
    var totalWeight = 0, weightedSum = 0;
    rows.forEach(function (r) {
      var w = parseFloat(r.weight) || 0;
      var s = parseFloat(r.score) || 0;
      if (w > 0) {
        totalWeight += w;
        weightedSum += (s * w);
      }
    });
    var grade = totalWeight > 0 ? round(weightedSum / totalWeight, 2) : 0;
    var out = $("#gradeOut");
    var letBox = $("#gradeLetter");
    var note = $("#weightNote");
    if (out) out.textContent = totalWeight > 0 ? grade.toFixed(2) + "%" : "—";
    if (letBox) letBox.textContent = totalWeight > 0 ? letter(grade) : "—";
    if (note) {
      if (!totalWeight) {
        note.className = "weight-note ok";
        note.innerHTML = "<b>Ready to calculate?</b> Add your first graded item.";
      } else {
        var twR = round(totalWeight, 1);
        if (Math.abs(totalWeight - 100) < 0.1) {
          note.className = "weight-note ok";
          note.innerHTML = "<b>Weights total 100%.</b> Your overall grade is accurate.";
        } else if (totalWeight < 100) {
          note.className = "weight-note warn";
          note.innerHTML = "<b>Weights total " + twR + "%.</b> This is your grade based on work done so far.";
        } else {
          note.className = "weight-note warn";
          note.innerHTML = "<b>Weights total " + twR + "%.</b> Total exceeds 100%, please check your weights.";
        }
      }
    }
  }
  function save() { store.set(KEY, rows); }
  function addItem() {
    rows.push({ id: uid(), name: "", score: "", weight: "" });
    save();
    render();
    SM.toast("Item added", "success");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var add1 = $("#addRow");
    var add2 = $("#addRow2");
    var clear = $("#clearAll");
    var share = $("#shareBtn");
    if (add1) add1.onclick = addItem;
    if (add2) add2.onclick = addItem;
    if (clear) {
      clear.onclick = function () {
        if (confirm("Clear all items?")) {
          rows = [];
          save();
          render();
          SM.toast("Cleared all entries", "info");
        }
      };
    }
    if (share) {
      share.onclick = function() {
        var g = $("#gradeOut") ? $("#gradeOut").textContent : "—";
        if (g === "—") return SM.toast("Enter items first", "error");
        SM.copy("My current course grade is " + g + "! Calculated on Study Metrics.");
      };
    }
    render();
  });
})();