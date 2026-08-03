(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.SM_GRADING === "undefined") return;
    var G = window.SM_GRADING;
    var round = SM.round;
    function renderAllCountries() {
      var container = document.getElementById("smAllCountries");
      if (!container) return;
      container.innerHTML = G.all.map(function (sys) {
        var topGrade = sys.grades[0];
        return '<a href="grading-guide.html?country=' + sys.id + '" class="rel-card" data-country="' + sys.id + '" style="text-decoration:none;cursor:pointer" role="button" aria-label="View ' + sys.name + ' grading system">'
          + '<div class="rel-ico" style="font-size:1.4rem;background:transparent;border:none">' + sys.flag + '</div>'
          + '<div><b>' + sys.name + '</b>'
          + '<span>' + sys.scale + '</span></div>'
          + '</a>';
      }).join("");
      container.querySelectorAll("[data-country]").forEach(function (card) {
        card.addEventListener("click", function (e) {
          e.preventDefault();
          var sys = G.get(card.getAttribute("data-country"));
          if (!sys) return;
          document.querySelectorAll(".sm-country-select").forEach(function (sel) {
            sel.value = sys.id;
            sel.dispatchEvent(new Event("change"));
          });
        });
      });
    }
    function renderRegionList() {
      var el = document.getElementById("smRegionList");
      if (!el) return;
      el.innerHTML = Object.keys(G.regions).sort().map(function (r) {
        var count = G.regions[r].length;
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-soft)">'
          + '<span style="font-size:var(--step-sm)">' + r + '</span>'
          + '<span style="font-size:var(--step-xs);color:var(--ink-3)">'
          + G.regions[r].map(function(s){ return s.flag; }).join(" ")
          + '</span></div>';
      }).join("");
    }
    function initConverter() {
      var inp   = document.getElementById("ggInput");
      var us4   = document.getElementById("ggUS4Out");
      var cls   = document.getElementById("ggClassOut");
      var lett  = document.getElementById("ggLetterOut");
      var nat   = document.getElementById("ggNativeOut");
      var unit  = document.getElementById("ggUnit");
      var share = document.getElementById("ggShare");
      if (!inp) return;
      function convert() {
        var sys = window.SM_COUNTRY ? window.SM_COUNTRY.current() : G.get("us");
        if (!sys) return;
        var val = parseFloat(inp.value);
        if (unit) {
          var unitMap = {
            numeric5inv: "grade (1–5)",
            numeric20:   "/ 20",
            numeric30:   "/ 30",
            numeric7:    "Danish",
            numeric5:    "/ 5",
            numeric10:   "/ 10",
            gpa10:       "/ 10"
          };
          unit.textContent = unitMap[sys.scaleType] || "%";
        }
        if (isNaN(val)) {
          if (us4)  us4.textContent = "—";
          if (cls)  cls.textContent = "Enter a grade above";
          if (lett) lett.textContent = "—";
          if (nat)  nat.textContent = "—";
          return;
        }
        var gpa4 = round(sys.toGPA4(val), 2);
        var matchGrade = sys.grades.find(function (g) {
          if (sys.scaleType === "numeric5inv") {
            return val >= g.min && val <= g.max;
          }
          return val >= g.min && val <= g.max;
        });
        if (us4)  us4.textContent  = gpa4.toFixed(2);
        if (cls)  cls.textContent  = matchGrade ? matchGrade.cls : "Unknown";
        if (lett) lett.textContent = matchGrade ? matchGrade.label : "—";
        if (nat)  nat.textContent  = gpa4.toFixed(2) + " / 4.0";
      }
      inp.addEventListener("input", convert);
      document.addEventListener("sm:country-change", function () {
        inp.value = "";
        convert();
      });
      if (share) {
        share.onclick = function () {
          var sys = window.SM_COUNTRY ? window.SM_COUNTRY.current() : G.get("us");
          var val = us4 ? us4.textContent : "—";
          if (val === "—" || !sys) return SM.toast("Enter a grade first", "info");
          SM.copy(sys.flag + " " + sys.name + " grade → US GPA " + val + " — Study Metrics (studymetrics.app/grading-guide.html)");
        };
      }
      try {
        var params = new URLSearchParams(window.location.search);
        var qCountry = params.get("country");
        if (qCountry && G.get(qCountry)) {
          setTimeout(function () {
            document.querySelectorAll(".sm-country-select").forEach(function (sel) {
              sel.value = qCountry;
              sel.dispatchEvent(new Event("change"));
            });
          }, 100);
        }
      } catch(e) {}
    }
    renderAllCountries();
    renderRegionList();
    initConverter();
  });
})();