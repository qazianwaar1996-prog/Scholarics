(function () {
  "use strict";
  var $ = SC.$, $$ = SC.$$, round = SC.round, clamp = SC.clamp, uid = SC.uid, esc = SC.esc, store = SC.store;
  var KEY = "sc_cgpa_rows";
  var rows = store.get(KEY, []);
  function classify(g) {
    if (g >= 3.7) return "Excellent standing";
    if (g >= 3.3) return "Very good";
    if (g >= 3.0) return "Good";
    if (g >= 2.0) return "Satisfactory";
    if (g > 0) return "Needs improvement";
    return "";
  }
  if (!rows.length) {
    rows = [
      { id: uid(), name: "Semester 1", gpa: 3.50, credits: 15 },
      { id: uid(), name: "Semester 2", gpa: 3.60, credits: 15 }
    ];
  }

  /* Shareable link: auto-fill semesters from URL query params (?rows=...) */
  var sharedFromLink = false;
  (function () {
    if (!window.SCShare) return;
    var rowsParam = SCShare.params().get("rows");
    if (!rowsParam) return;
    try {
      var parsed = JSON.parse(rowsParam);
      if (Array.isArray(parsed) && parsed.length) {
        rows = parsed.slice(0, 60).map(function (r) {
          return { id: uid(), name: String((r && r[0]) || ""), gpa: r ? r[1] : 0, credits: r ? r[2] : 0 };
        });
        sharedFromLink = true;
      }
    } catch (e) {}
  })();
  function render() {
    var container = $("#rows");
    if (!container) return;
    container.innerHTML = rows.map(function (r) {
      return `
        <div class="crow" data-id="${r.id}">
          <div class="c-name">
            <input class="input" data-f="name" value="${esc(r.name)}" placeholder="e.g. Fall 2024">
          </div>
          <div class="c-a">
            <input class="input tnum" data-f="gpa" type="number" min="0" max="4" step="0.01" value="${r.gpa}" placeholder="GPA">
          </div>
          <div class="c-b">
            <input class="input tnum" data-f="credits" type="number" min="0" step="0.5" value="${r.credits}" placeholder="Credits">
          </div>
          <div class="c-del">
            <button class="row-del" data-del="${r.id}" title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
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
            // Validate GPA input range
            if (field === 'gpa') {
              var g = parseFloat(inp.value);
              inp.classList.remove('input-error');
              var errEl = inp.parentNode && inp.parentNode.querySelector('.field-error-msg');
              if (errEl) errEl.remove();
              if (inp.value.trim() !== '' && (isNaN(g) || g < 0)) {
                inp.classList.add('input-error');
                var err = document.createElement('span');
                err.className = 'field-error-msg';
                err.textContent = 'GPA must be 0.00 – 4.00';
                if (inp.parentNode) inp.parentNode.appendChild(err);
              } else if (!isNaN(g) && g > 4.0) {
                inp.classList.add('input-error');
                var err2 = document.createElement('span');
                err2.className = 'field-error-msg';
                err2.textContent = 'GPA cannot exceed 4.00';
                if (inp.parentNode) inp.parentNode.appendChild(err2);
              }
            }
            // Validate credits input
            if (field === 'credits') {
              var c = parseFloat(inp.value);
              inp.classList.remove('input-error');
              var cErrEl = inp.parentNode && inp.parentNode.querySelector('.field-error-msg');
              if (cErrEl) cErrEl.remove();
              if (inp.value.trim() !== '' && (isNaN(c) || c < 0)) {
                inp.classList.add('input-error');
                var cerr = document.createElement('span');
                cerr.className = 'field-error-msg';
                cerr.textContent = 'Credits must be non-negative';
                if (inp.parentNode) inp.parentNode.appendChild(cerr);
              } else if (!isNaN(c) && c > 500) {
                inp.classList.add('input-error');
                var cerr2 = document.createElement('span');
                cerr2.className = 'field-error-msg';
                cerr2.textContent = 'Value seems too large';
                if (inp.parentNode) inp.parentNode.appendChild(cerr2);
              }
            }
            r[field] = inp.value;
            save();
            compute();
          }
        };
      });
    });
    $$("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        var rowId = btn.getAttribute("data-del");
        rows = rows.filter(function (r) { return r.id !== rowId; });
        save();
        render();
        SC.toast("Semester removed", "info");
      };
    });
  }
  function compute() {
    var totalCredits = 0, totalQualityPoints = 0;
    rows.forEach(function (r) {
      var c = parseFloat(r.credits) || 0;
      var g = clamp(parseFloat(r.gpa) || 0, 0, 4);
      if (c > 0) {
        totalCredits += c;
        totalQualityPoints += (g * c);
      }
    });
    var cgpa = totalCredits > 0 ? round(totalQualityPoints / totalCredits, 2) : 0;
    var out = $("#cgpaOut");
    var semCount = $("#mSem");
    var credTotal = $("#mCredits");
    var subText = $("#cgpaClass");
    if (out) out.textContent = cgpa.toFixed(2);
    if (semCount) semCount.textContent = rows.length;
    if (credTotal) credTotal.textContent = round(totalCredits, 1);
    if (subText) subText.textContent = totalCredits > 0 ? classify(cgpa) : "Add a semester to begin";
  }
  function save() { store.set(KEY, rows); }
  function addSem() {
    rows.push({ id: uid(), name: "Semester " + (rows.length + 1), gpa: 4.0, credits: 15 });
    save();
    render();
    SC.toast("Semester added", "success");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var addBtn1 = $("#addRow");
    var addBtn2 = $("#addRow2");
    var clearBtn = $("#clearAll");
    var shareBtn = $("#shareBtn");
    if (addBtn1) addBtn1.onclick = addSem;
    if (addBtn2) addBtn2.onclick = addSem;
    if (clearBtn) {
      clearBtn.onclick = function () {
        if (confirm("Delete all data?")) {
          rows = [];
          save();
          render();
          SC.toast("Data cleared", "info");
        }
      };
    }
    if (shareBtn) {
      shareBtn.onclick = function() {
        var result = $("#cgpaOut") ? $("#cgpaOut").textContent : "0.00";
        SC.copy("My Cumulative GPA is " + result + ". Calculated on Scholarics!");
      };
    }
    var copyLinkBtn = $("#copyLinkBtn");
    if (copyLinkBtn && window.SCShare) {
      copyLinkBtn.onclick = function () {
        var compact = rows.map(function (r) { return [r.name, r.gpa, r.credits]; });
        SCShare.copyLink({ rows: JSON.stringify(compact) });
      };
    }
    render();

    if (sharedFromLink && window.SCShare) {
      save();
      var cgpaVal = $("#cgpaOut") ? $("#cgpaOut").textContent : "0.00";
      SCShare.showBanner({
        message: "You're viewing a shared CGPA result of <b>" + cgpaVal + "</b>. Edit any semester below to make it your own.",
        host: document.querySelector(".tool-layout")
      });
    }
  });
})();