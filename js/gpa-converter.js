(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round, clamp = SM.clamp, uid = SM.uid, esc = SM.esc, store = SM.store;
  var SCALES = [
    {id:"us40",country:"United States",system:"4.0 Letter Scale",type:"select",rows:[{g:"A+",p:4,l:"A+"},{g:"A",p:4,l:"A"},{g:"A-",p:3.7,l:"A-"},{g:"B+",p:3.3,l:"B+"},{g:"B",p:3,l:"B"},{g:"B-",p:2.7,l:"B-"},{g:"C+",p:2.3,l:"C+"},{g:"C",p:2,l:"C"},{g:"C-",p:1.7,l:"C-"},{g:"D+",p:1.3,l:"D+"},{g:"D",p:1,l:"D"},{g:"D-",p:0.7,l:"D-"},{g:"F",p:0,l:"F"}]},
    {id:"uk",country:"United Kingdom",system:"Honours Classification",type:"select",rows:[{g:"First (1st)",p:4.0,l:"A"},{g:"Upper Second (2:1)",p:3.7,l:"A-"},{g:"Lower Second (2:2)",p:3.0,l:"B"},{g:"Third (3rd)",p:2.3,l:"C+"},{g:"Fail",p:0,l:"F"}]},
    {id:"india10",country:"India",system:"10-point CGPA",type:"number",max:10,step:"0.01",rows:[{g:"9.0\u201310",min:9.0,p:4.0,l:"A"},{g:"8.0\u20138.9",min:8.0,p:3.7,l:"A-"},{g:"7.0\u20137.9",min:7.0,p:3.3,l:"B+"},{g:"6.0\u20136.9",min:6.0,p:3.0,l:"B"},{g:"5.0\u20135.9",min:5.0,p:2.3,l:"C+"},{g:"4.0\u20134.9",min:4.0,p:2.0,l:"C"},{g:"< 4.0",min:0,p:0,l:"F"}]},
    {id:"pakpct",country:"Pakistan",system:"Percentage Scale",type:"number",max:100,step:"0.1",rows:[{g:"85\u2013100%",min:85,p:4.0,l:"A"},{g:"80\u201384%",min:80,p:3.7,l:"A-"},{g:"75\u201379%",min:75,p:3.3,l:"B+"},{g:"71\u201374%",min:71,p:3.0,l:"B"},{g:"68\u201370%",min:68,p:2.7,l:"B-"},{g:"64\u201367%",min:64,p:2.3,l:"C+"},{g:"61\u201363%",min:61,p:2.0,l:"C"},{g:"< 60%",min:0,p:0,l:"F"}]},
    {id:"canada",country:"Canada",system:"Standard Percentage",type:"number",max:100,step:"0.1",rows:[{g:"90\u2013100",min:90,p:4.0,l:"A+"},{g:"85\u201389",min:85,p:4.0,l:"A"},{g:"80\u201384",min:80,p:3.7,l:"A-"},{g:"77\u201379",min:77,p:3.3,l:"B+"},{g:"73\u201376",min:73,p:3.0,l:"B"},{g:"70\u201372",min:70,p:2.7,l:"B-"},{g:"< 50",min:0,p:0,l:"F"}]},
    {id:"nigeria",country:"Nigeria",system:"5.0 Scale",type:"number",max:5,step:"0.01",rows:[{g:"4.5\u20135.0",min:4.5,p:4.0,l:"A"},{g:"3.5\u20134.49",min:3.5,p:3.5,l:"B+"},{g:"2.4\u20133.49",min:2.4,p:3.0,l:"B"},{g:"1.5\u20132.39",min:1.5,p:2.0,l:"C"},{g:"1.0\u20131.49",min:1.0,p:1.0,l:"D"},{g:"< 1.0",min:0,p:0,l:"F"}]}
  ];
  var KEY = "sm_conv_rows", SKEY = "sm_conv_meta";
  var meta = store.get(SKEY, { country: "India", scaleId: "india10" });
  var rows = store.get(KEY, [{ id: uid(), name: "Course 1", grade: "8.5", credits: 3 }]);
  function getScale() {
    return SCALES.find(function(s) { return s.id === meta.scaleId; }) || SCALES[0];
  }
  function getPts(scale, val) {
    var v = parseFloat(val) || 0;
    if (scale.type === "select") {
      var found = scale.rows.find(function(x) { return x.g === val; });
      return found ? found.p : 0;
    }
    var sorted = scale.rows.slice().sort(function(a, b) { return (b.min || 0) - (a.min || 0); });
    for (var i = 0; i < sorted.length; i++) {
      if (v >= sorted[i].min) return sorted[i].p;
    }
    return 0;
  }
  function compute() {
    var scale = getScale(), tCr = 0, tQp = 0, breakdownHtml = "";
    rows.forEach(function (r) {
      var cr = parseFloat(r.credits) || 0;
      var pts = getPts(scale, r.grade);
      if (cr > 0) {
        tCr += cr;
        tQp += (pts * cr);
        breakdownHtml += '<div class="bd-row"><span class="bd-name">' + esc(r.name || "Course") + '</span><span class="bd-qp">' + pts.toFixed(2) + ' pts</span></div>';
      }
    });
    var res = tCr ? (tQp / tCr).toFixed(2) : "0.00";
    if ($("#gpaOut")) $("#gpaOut").textContent = res;
    if ($("#mCourses")) $("#mCourses").textContent = rows.length;
    if ($("#mCredits")) $("#mCredits").textContent = tCr.toFixed(1);
    if ($("#mQp")) $("#mQp").textContent = tQp.toFixed(1);
    if ($("#breakdown")) $("#breakdown").innerHTML = breakdownHtml || '<div class="hint">Add courses to see points</div>';
    renderReference(scale);
  }
  function renderReference(scale) {
    var body = $("#refBody");
    var badge = $("#refBadge");
    if (!body || !badge) return;
    badge.textContent = scale.country;
    body.innerHTML = scale.rows.map(function(r) {
      return "<tr><td>" + r.g + "</td><td>" + r.l + "</td><td class=\"tnum\">" + r.p.toFixed(2) + "</td></tr>";
    }).join("");
  }
  function render() {
    var container = $("#rows");
    var scale = getScale();
    if (!container) return;
    container.innerHTML = rows.map(function(r) {
      var gIn = scale.type === "select"
        ? '<select class="select" data-f="grade">' + scale.rows.map(function(x) {
            return '<option value="' + x.g + '"' + (r.grade === x.g ? ' selected' : '') + '>' + x.g + '</option>';
          }).join("") + '</select>'
        : '<input class="input tnum" data-f="grade" type="number" step="' + scale.step + '" value="' + esc(r.grade) + '">';
      return '<div class="crow" data-id="' + r.id + '">' +
        '<div class="c-name"><input class="input" data-f="name" value="' + esc(r.name) + '" placeholder="Course name"></div>' +
        '<div class="c-grade">' + gIn + '</div>' +
        '<div class="c-credit"><input class="input tnum" data-f="credits" type="number" value="' + esc(r.credits) + '"></div>' +
        '<div class="c-del"><button class="row-del" data-del="' + r.id + '">\u2715</button></div>' +
        '</div>';
    }).join("");
    attachEvents();
    compute();
  }
  function attachEvents() {
    $$(".crow").forEach(function(row) {
      var id = row.getAttribute("data-id");
      row.querySelectorAll("[data-f]").forEach(function(inp) {
        inp.oninput = function() {
          var r = rows.find(function(x) { return x.id === id; });
          if (r) {
            r[this.getAttribute("data-f")] = this.value;
            store.set(KEY, rows);
            compute();
          }
        };
      });
    });
    $$("[data-del]").forEach(function(btn) {
      btn.onclick = function() {
        var delId = this.getAttribute("data-del");
        rows = rows.filter(function(r) { return r.id !== delId; });
        store.set(KEY, rows);
        render();
      };
    });
  }
  function runReverse() {
    var val = parseFloat($("#revGpa").value) || 0;
    var grid = $("#revGrid");
    if (!grid) return;
    var usLetter = val >= 4.0 ? "A" : val >= 3.7 ? "A-" : val >= 3.3 ? "B+" : val >= 3.0 ? "B" : val >= 2.7 ? "B-" : val >= 2.3 ? "C+" : val >= 2.0 ? "C" : val >= 1.0 ? "D" : "F";
    $("#revUsLetter").textContent = "US Letter \u2248 " + usLetter;
    grid.innerHTML = SCALES.filter(function(s) { return s.id !== "us40"; }).map(function(s) {
      var match = s.rows.reduce(function(prev, curr) {
        return (Math.abs(curr.p - val) < Math.abs(prev.p - val) ? curr : prev);
      });
      return '<div class="rev-card"><div class="sys">' + s.country + '</div><div class="val">' + match.g + '</div><div class="desc">' + s.system + '</div></div>';
    }).join("");
  }
  function exportReport() {
    var scale = getScale();
    var tCr = 0, tQp = 0;
    var rowsHtml = "";
    rows.forEach(function (r) {
      var cr = parseFloat(r.credits) || 0;
      var pts = getPts(scale, r.grade);
      var qp = (pts * cr);
      tCr += cr;
      tQp += qp;
      rowsHtml += '<tr>' +
        '<td style="border:1px solid #ddd;padding:8px">' + esc(r.name || "Course") + '</td>' +
        '<td style="border:1px solid #ddd;padding:8px">' + esc(r.grade) + '</td>' +
        '<td style="border:1px solid #ddd;padding:8px">' + pts.toFixed(2) + '</td>' +
        '<td style="border:1px solid #ddd;padding:8px">' + cr + '</td>' +
        '<td style="border:1px solid #ddd;padding:8px;text-align:right">' + qp.toFixed(2) + '</td>' +
        '</tr>';
    });
    if (tCr === 0) { SM.toast("Add courses first", "error"); return; }
    var finalGpa = (tQp / tCr).toFixed(2);
    var report = $("#report");
    if (!report) return;
    report.innerHTML = '<div style="font-family:sans-serif;padding:40px;color:#000;background:#fff">' +
      '<h1 style="margin-bottom:10px">GPA Conversion Report</h1>' +
      '<p><b>Original System:</b> ' + scale.country + ' - ' + scale.system + '</p>' +
      '<p style="font-size:24px;color:#2ecc71"><b>Converted US GPA: ' + finalGpa + ' / 4.0</b></p>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:20px">' +
      '<thead><tr style="background:#f2f2f2">' +
      '<th style="border:1px solid #ddd;padding:8px;text-align:left">Course</th>' +
      '<th style="border:1px solid #ddd;padding:8px;text-align:left">Grade</th>' +
      '<th style="border:1px solid #ddd;padding:8px;text-align:left">US Points</th>' +
      '<th style="border:1px solid #ddd;padding:8px;text-align:left">Credits</th>' +
      '<th style="border:1px solid #ddd;padding:8px;text-align:right">Quality Points</th>' +
      '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
      '<p style="margin-top:30px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:10px">' +
      'Generated by Study Metrics. This is an unofficial conversion for guidance only.' +
      '</p></div>';
    window.print();
  }
  document.addEventListener("DOMContentLoaded", function () {
    var cSel = $("#country");
    var sSel = $("#scaleSel");
    var rIn = $("#revGpa");
    if (cSel) {
      var countries = Array.from(new Set(SCALES.map(function(s) { return s.country; })));
      cSel.innerHTML = countries.map(function(c) {
        return '<option' + (c === meta.country ? ' selected' : '') + '>' + c + '</option>';
      }).join("");
      cSel.onchange = function() {
        meta.country = this.value;
        var list = SCALES.filter(function(s) { return s.country === meta.country; });
        meta.scaleId = list[0].id;
        store.set(SKEY, meta);
        updateScaleDropdown(list);
      };
    }
    function updateScaleDropdown(list) {
      if (!sSel) return;
      sSel.innerHTML = list.map(function(s) {
        return '<option value="' + s.id + '"' + (s.id === meta.scaleId ? ' selected' : '') + '>' + s.system + '</option>';
      }).join("");
      render();
    }
    if (sSel) {
      updateScaleDropdown(SCALES.filter(function(s) { return s.country === meta.country; }));
      sSel.onchange = function() {
        meta.scaleId = this.value;
        store.set(SKEY, meta);
        render();
      };
    }
    if (rIn) { rIn.oninput = runReverse; runReverse(); }
    var addFn = function() {
      var sc = getScale();
      var def = sc.type === "select" ? sc.rows[0].g : (sc.max / 1.2).toString();
      rows.push({ id: uid(), name: "", grade: def, credits: 3 });
      render();
    };
    if ($("#addRow")) $("#addRow").onclick = addFn;
    if ($("#addRow2")) $("#addRow2").onclick = addFn;
    if ($("#exportBtn")) $("#exportBtn").onclick = exportReport;
    if ($("#clearAll")) $("#clearAll").onclick = function() {
      if (confirm("Clear all rows?")) { rows = []; store.set(KEY, rows); render(); }
    };
    $$(".mode-seg button").forEach(function(btn) {
      btn.onclick = function() {
        var m = this.getAttribute("data-mode");
        $$(".mode-seg button").forEach(function(b) { b.classList.toggle("on", b === btn); });
        $("#panel-toUS").classList.toggle("hidden", m !== "toUS");
        $("#panel-toLocal").classList.toggle("hidden", m !== "toLocal");
        if (m === "toLocal") runReverse();
      };
    });
    render();
  });
})();