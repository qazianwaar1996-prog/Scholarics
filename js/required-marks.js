(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round, uid = SM.uid,
      esc = SM.esc, store = SM.store;
  var KEY = "sm_required_marks";
  var subjects = store.get(KEY, []);
  if (!subjects.length) {
    subjects = [
      { id: uid(), name: "Mathematics",  obtained: 78,  max: 100, done: true  },
      { id: uid(), name: "Physics",      obtained: "",  max: 100, done: false },
      { id: uid(), name: "Chemistry",    obtained: "",  max: 100, done: false },
      { id: uid(), name: "English",      obtained: 82,  max: 100, done: true  },
      { id: uid(), name: "Computer Sci", obtained: "",  max: 100, done: false }
    ];
  }
  function verdict(required, maxPerSubject) {
    if (isNaN(required) || maxPerSubject === 0) return null;
    if (required <= 0)              return { cls: "ok",   title: "Already secured!", msg: "Your current marks are enough to hit your target — you're good to go." };
    if (required <= maxPerSubject * 0.6) return { cls: "ok",   title: "Very achievable",  msg: "You need a below-average score in remaining subjects. Stay consistent." };
    if (required <= maxPerSubject * 0.75) return { cls: "info", title: "On track",          msg: "A moderate performance in remaining subjects will get you there." };
    if (required <= maxPerSubject * 0.9)  return { cls: "warn", title: "Challenging",       msg: "Strong performance needed across remaining subjects. Plan your revision." };
    if (required <= maxPerSubject)        return { cls: "warn", title: "Very demanding",     msg: "Near-perfect scores required. Prioritise every remaining subject." };
    return { cls: "bad", title: "Not reachable", msg: "Target is mathematically out of reach. Try lowering your target percentage." };
  }
  var VERDICT_ICONS = {
    ok:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 22h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    bad:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
  };
  function render() {
    var container = $("#rmRows");
    if (!container) return;
    container.innerHTML = subjects.map(function (s) {
      return '<div class="crow" data-id="' + s.id + '">'
        + '<div class="c-name">'
        +   '<input class="input" data-f="name" value="' + esc(s.name) + '" placeholder="Subject name" aria-label="Subject name">'
        + '</div>'
        + '<div class="c-obtained">'
        +   '<input class="input tnum" data-f="obtained" type="number" min="0" '
        +   'value="' + (s.obtained !== "" ? s.obtained : "") + '" '
        +   'placeholder="Marks obtained" aria-label="Marks obtained" '
        +   (s.done ? "" : 'placeholder="Pending"') + '>'
        + '</div>'
        + '<div class="c-max">'
        +   '<input class="input tnum" data-f="max" type="number" min="1" value="' + s.max + '" aria-label="Max marks">'
        + '</div>'
        + '<div class="c-status">'
        +   '<button class="btn btn-ghost btn-sm rm-toggle" data-id="' + s.id + '" '
        +   'aria-label="' + (s.done ? "Mark as pending" : "Mark as done") + '" '
        +   'title="' + (s.done ? "Done — click to mark pending" : "Pending — click to mark done") + '">'
        +   (s.done
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>')
        + '</button>'
        + '</div>'
        + '<div class="c-del">'
        +   '<button class="row-del" data-del="' + s.id + '" aria-label="Remove ' + esc(s.name || "subject") + '">'
        +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
        +   '</button>'
        + '</div>'
        + '</div>';
    }).join("");
    attachEvents();
    compute();
  }
  function attachEvents() {
    $$(".crow").forEach(function (row) {
      var id = row.getAttribute("data-id");
      $$("input", row).forEach(function (inp) {
        var field = inp.getAttribute("data-f");
        if (!field) return;
        inp.oninput = function () {
          var s = subjects.find(function (x) { return x.id === id; });
          if (!s) return;
          s[field] = field === "name" ? inp.value : (inp.value === "" ? "" : parseFloat(inp.value));
          save(); compute();
        };
      });
    });
    $$(".rm-toggle").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-id");
        var s  = subjects.find(function (x) { return x.id === id; });
        if (!s) return;
        s.done = !s.done;
        if (s.done && s.obtained === "") s.obtained = "";
        save(); render();
      };
    });
    $$("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        subjects = subjects.filter(function (s) { return s.id !== btn.getAttribute("data-del"); });
        save(); render();
        SM.toast("Subject removed", "info");
      };
    });
  }
  function compute() {
    var targetEl = $("#rmTarget");
    var targetPct = targetEl ? (parseFloat(targetEl.value) || 0) : 0;
    var totalMax       = 0, obtainedSum = 0;
    var pendingSubjects = [];
    subjects.forEach(function (s) {
      var max = parseFloat(s.max) || 0;
      totalMax += max;
      if (s.done && s.obtained !== "" && !isNaN(parseFloat(s.obtained))) {
        obtainedSum += parseFloat(s.obtained);
      } else {
        pendingSubjects.push(s);
      }
    });
    var targetTotal    = (targetPct / 100) * totalMax;
    var stillNeeded    = targetTotal - obtainedSum;
    var pendingMax     = pendingSubjects.reduce(function (acc, s) { return acc + (parseFloat(s.max) || 0); }, 0);
    var avgRequired    = pendingMax > 0 ? round(stillNeeded / pendingSubjects.length, 1) : 0;
    var pctRequired    = pendingMax > 0 ? round((stillNeeded / pendingMax) * 100, 1) : 0;
    var currentPct     = totalMax > 0   ? round((obtainedSum / totalMax) * 100, 1) : 0;
    var reqOut    = $("#rmRequired");
    var pctOut    = $("#rmPctRequired");
    var curOut    = $("#rmCurrentPct");
    var pendOut   = $("#rmPending");
    var verdEl    = $("#rmVerdict");
    if (reqOut)  reqOut.textContent  = pendingSubjects.length > 0 ? avgRequired + " avg" : "—";
    if (pctOut)  pctOut.textContent  = pendingSubjects.length > 0 ? pctRequired + "%" : "—";
    if (curOut)  curOut.textContent  = currentPct + "%";
    if (pendOut) pendOut.textContent = pendingSubjects.length;
    if (verdEl && pendingSubjects.length > 0 && totalMax > 0 && targetPct > 0) {
      var maxPer  = pendingSubjects.length > 0 ? (pendingMax / pendingSubjects.length) : 100;
      var v       = verdict(avgRequired, maxPer);
      if (v) {
        verdEl.className = "verdict " + v.cls;
        verdEl.innerHTML = VERDICT_ICONS[v.cls]
          + '<div><b>' + v.title + '</b> ' + v.msg + '</div>';
      }
    } else if (verdEl) {
      verdEl.className = "verdict info";
      verdEl.innerHTML = VERDICT_ICONS["info"]
        + '<div><b>How to use</b> Enter target %, add subjects with marks obtained. Pending subjects show required marks.</div>';
    }
  }
  function save() { store.set(KEY, subjects); }
  function addSubject() {
    subjects.push({ id: uid(), name: "", obtained: "", max: 100, done: false });
    save(); render();
    SM.toast("Subject added", "success");
  }
  document.addEventListener("DOMContentLoaded", function () {
    var add1  = $("#rmAddRow");
    var add2  = $("#rmAddRow2");
    var clear = $("#rmClear");
    var share = $("#rmShare");
    var reset = $("#rmReset");
    var targetEl = $("#rmTarget");
    if (targetEl) targetEl.addEventListener("input", compute);
    if (add1)     add1.onclick  = addSubject;
    if (add2)     add2.onclick  = addSubject;
    if (clear) {
      clear.onclick = function () {
        if (confirm("Clear all subjects?")) {
          subjects = []; save(); render();
          SM.toast("Cleared", "info");
        }
      };
    }
    if (reset) {
      reset.onclick = function () {
        store.set(KEY, null);
        subjects = [
          { id: uid(), name: "Mathematics",  obtained: 78, max: 100, done: true  },
          { id: uid(), name: "Physics",      obtained: "", max: 100, done: false },
          { id: uid(), name: "Chemistry",    obtained: "", max: 100, done: false },
          { id: uid(), name: "English",      obtained: 82, max: 100, done: true  },
          { id: uid(), name: "Computer Sci", obtained: "", max: 100, done: false }
        ];
        save(); render();
        SM.toast("Reset to example", "info");
      };
    }
    if (share) {
      share.onclick = function () {
        var req = $("#rmRequired") ? $("#rmRequired").textContent : "—";
        if (req === "—") return SM.toast("Enter data first", "info");
        var tgt = $("#rmTarget") ? $("#rmTarget").value : "";
        SM.copy("I need " + req + " per subject to reach " + tgt + "% — calculated on Study Metrics (studymetrics.app)");
      };
    }
    render();
  });
})();