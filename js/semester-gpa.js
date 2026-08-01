(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round, clamp = SM.clamp,
      uid = SM.uid, esc = SM.esc, store = SM.store;
  var KEY = "sm_semester_gpa";
  var LETTERS = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"];
  var L2P = {"A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,
             "C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"D-":0.7,"F":0};
  function classify(g) {
    if (g >= 3.7) return "Dean's List · Excellent";
    if (g >= 3.3) return "Very Good";
    if (g >= 3.0) return "Good Standing";
    if (g >= 2.0) return "Satisfactory";
    if (g > 0)   return "Needs Improvement";
    return "";
  }
  function nearestLetter(g) {
    return LETTERS.reduce(function (best, l) {
      return Math.abs(L2P[l] - g) < Math.abs(L2P[best] - g) ? l : best;
    }, "F");
  }
  var rows = store.get(KEY, []);
  if (!rows.length) {
    rows = [
      { id: uid(), name: "Course 1", grade: "A",  credits: 3 },
      { id: uid(), name: "Course 2", grade: "B+", credits: 3 },
      { id: uid(), name: "Course 3", grade: "A-", credits: 4 }
    ];
  }
  function gradeOptions(current) {
    return LETTERS.map(function (l) {
      return '<option value="' + l + '"' + (current === l ? ' selected' : '') + '>'
           + l + ' (' + L2P[l].toFixed(1) + ')</option>';
    }).join("");
  }
  function render() {
    var container = $("#sgRows");
    if (!container) return;
    container.innerHTML = rows.map(function (r) {
      return '<div class="crow" data-id="' + r.id + '">'
        + '<div class="c-name"><input class="input" data-f="name" value="' + esc(r.name) + '" placeholder="Course name" aria-label="Course name"></div>'
        + '<div class="c-grade-wrap"><select class="select c-grade" data-f="grade" aria-label="Grade">' + gradeOptions(r.grade) + '</select></div>'
        + '<div class="c-credit"><input class="input tnum" data-f="credits" type="number" min="0.5" max="12" step="0.5" value="' + r.credits + '" placeholder="Cr" aria-label="Credit hours"></div>'
        + '<div class="c-del"><button class="row-del" data-del="' + r.id + '" aria-label="Remove ' + esc(r.name || 'course') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>'
        + '</div>';
    }).join("");
    attachRowEvents();
    compute();
  }
  function attachRowEvents() {
    $$(".crow").forEach(function (row) {
      var id = row.getAttribute("data-id");
      $$("input, select", row).forEach(function (inp) {
        var field = inp.getAttribute("data-f");
        if (!field) return;
        inp.oninput = function () {
          var r = rows.find(function (x) { return x.id === id; });
          if (r) { r[field] = inp.value; save(); compute(); }
        };
      });
    });
    $$("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        rows = rows.filter(function (r) { return r.id !== btn.getAttribute("data-del"); });
        save();
        render();
        SM.toast("Course removed", "info");
      };
    });
  }
  function compute() {
    var totalCr = 0, totalQP = 0;
    rows.forEach(function (r) {
      var cr = parseFloat(r.credits) || 0;
      var pts = L2P[r.grade] !== undefined ? L2P[r.grade] : 0;
      if (cr > 0) { totalCr += cr; totalQP += pts * cr; }
    });
    var gpa = totalCr > 0 ? round(totalQP / totalCr, 2) : 0;
    var letter = totalCr > 0 ? nearestLetter(gpa) : "—";
    var gpaOut    = $("#sgGpaOut");
    var gpaSub    = $("#sgGpaSub");
    var crOut     = $("#sgCredits");
    var courseOut = $("#sgCourses");
    if (gpaOut)    gpaOut.textContent    = totalCr > 0 ? gpa.toFixed(2) : "—";
    if (gpaSub)    gpaSub.textContent    = totalCr > 0 ? letter + " average · " + classify(gpa) : "Add a course to begin";
    if (crOut)     crOut.textContent     = totalCr;
    if (courseOut) courseOut.textContent = rows.length;
  }
  function save() { store.set(KEY, rows); }
  function addCourse() {
    rows.push({ id: uid(), name: "", grade: "B", credits: 3 });
    save();
    render();
    SM.toast("Course added", "success");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var add1  = $("#sgAddRow");
    var add2  = $("#sgAddRow2");
    var clear = $("#sgClear");
    var share = $("#sgShare");
    var reset = $("#sgReset");
    if (add1)  add1.onclick  = addCourse;
    if (add2)  add2.onclick  = addCourse;
    if (clear) {
      clear.onclick = function () {
        if (confirm("Clear all courses?")) {
          rows = []; save(); render();
          SM.toast("All courses cleared", "info");
        }
      };
    }
    if (reset) {
      reset.onclick = function () {
        store.set(KEY, null);
        rows = [
          { id: uid(), name: "Course 1", grade: "A",  credits: 3 },
          { id: uid(), name: "Course 2", grade: "B+", credits: 3 },
          { id: uid(), name: "Course 3", grade: "A-", credits: 4 }
        ];
        save(); render();
        SM.toast("Reset to example data", "info");
      };
    }
    if (share) {
      share.onclick = function () {
        var val = $("#sgGpaOut") ? $("#sgGpaOut").textContent : "—";
        if (val === "—") return SM.toast("Enter courses first", "info");
        SM.copy("My semester GPA is " + val + " — calculated on Study Metrics (studymetrics.app)");
      };
    }
    render();
  });
})();