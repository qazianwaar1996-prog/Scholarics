(function () {
  "use strict";
  var $ = SM.$, $$ = SM.$$, round = SM.round;
  document.addEventListener("DOMContentLoaded", function () {
    var tabs = $$(".tabs button");
    var panels = $$(".panel-lg");
    if (tabs.length) {
      tabs.forEach(function (btn) {
        btn.onclick = function () {
          var target = btn.getAttribute("data-tab");
          tabs.forEach(function (b) { b.classList.toggle("on", b === btn); });
          panels.forEach(function (p) {
            p.style.display = p.id === "panel-" + target ? "block" : "none";
          });
        };
      });
    }
    function marks() {
      var g = parseFloat($("#m_got").value) || 0;
      var m = parseFloat($("#m_max").value) || 0;
      var p = m !== 0 ? round((g / m) * 100, 2) : 0;
      var out = $("#m_out");
      var note = $("#m_note");
      if (out) out.textContent = p + "%";
      if (note) {
        if (m === 0) note.textContent = "Enter total possible marks";
        else if (p >= 90) note.textContent = "Excellent result.";
        else if (p >= 70) note.textContent = "Good performance.";
        else if (p >= 40) note.textContent = "Passing score.";
        else note.textContent = "Needs improvement.";
      }
    }
    function xofy() {
      var a = parseFloat($("#x_a").value) || 0;
      var b = parseFloat($("#x_b").value) || 0;
      var res = b !== 0 ? round((a / b) * 100, 2) : 0;
      var out = $("#x_out");
      if (out) out.textContent = res + "%";
    }
    function pctOf() {
      var p = parseFloat($("#p_pct").value) || 0;
      var n = parseFloat($("#p_num").value) || 0;
      var res = round((p / 100) * n, 2);
      var out = $("#p_out");
      if (out) out.textContent = res;
    }
    function change() {
      var f = parseFloat($("#c_from").value) || 0;
      var t = parseFloat($("#c_to").value) || 0;
      var diff = t - f;
      var pct = f !== 0 ? round((diff / Math.abs(f)) * 100, 2) : 0;
      var out = $("#c_out");
      var note = $("#c_note");
      if (out) out.textContent = (pct > 0 ? "+" : "") + pct + "%";
      if (note) {
        if (f === 0) {
          note.textContent = "Enter starting value";
          note.style.color = "inherit";
        } else {
          note.textContent = pct > 0 ? "Increase" : pct < 0 ? "Decrease" : "No change";
          note.style.color = pct > 0 ? "var(--ok)" : pct < 0 ? "var(--danger)" : "inherit";
        }
      }
    }
    var config = [
      { ids: ["m_got", "m_max"], fn: marks },
      { ids: ["x_a", "x_b"], fn: xofy },
      { ids: ["p_pct", "p_num"], fn: pctOf },
      { ids: ["c_from", "c_to"], fn: change }
    ];
    config.forEach(function (group) {
      group.ids.forEach(function (id) {
        var el = $("#" + id);
        if (el) el.oninput = group.fn;
      });
      group.fn();
    });
  });
})();