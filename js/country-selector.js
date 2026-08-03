window.SM_COUNTRY = (function () {
  "use strict";
  if (typeof window.SM_GRADING === "undefined") {
    console.warn("country-selector: SM_GRADING not loaded.");
    return { current: function() { return null; }, onChange: function() {} };
  }
  var G        = window.SM_GRADING;
  var PREF_KEY = "sm_country";
  var _current = G.get(G.load()) || G.all[0];
  var _listeners = [];
  function _emit(sys) {
    _current = sys;
    G.save(sys.id);
    document.querySelectorAll(".sm-country-select").forEach(function(sel) {
      if (sel.value !== sys.id) sel.value = sys.id;
    });
    _listeners.forEach(function(fn) { try { fn(sys); } catch(e) {} });
    document.dispatchEvent(new CustomEvent("sm:country-change", { detail: { system: sys } }));
  }
  function _buildSelect(assignId) {
    var sel = document.createElement("select");
    sel.className  = "select sm-country-select";
    sel.setAttribute("aria-label", "Select your country grading system");
    if (assignId) sel.id = "smCountrySelect";
    Object.keys(G.regions).sort().forEach(function(region) {
      var og = document.createElement("optgroup");
      og.label = region;
      G.regions[region].forEach(function(sys) {
        var opt = document.createElement("option");
        opt.value       = sys.id;
        opt.textContent = sys.flag + " " + sys.name;
        if (sys.id === _current.id) opt.selected = true;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    sel.addEventListener("change", function() {
      var sys = G.get(sel.value);
      if (!sys) return;
      _emit(sys);
      _updateBadge(sys);
      _updateScaleNote(sys);
      if (typeof SM !== "undefined" && SM.toast) {
        SM.toast(sys.flag + " " + sys.name + " grading system selected", "success");
      }
    });
    return sel;
  }
  function _updateBadge(sys) {
    document.querySelectorAll(".sm-scale-badge").forEach(function(el) {
      el.textContent = sys.flag + " " + sys.scale;
    });
  }
  function _updateScaleNote(sys) {
    var note = document.getElementById("smScaleNote");
    if (!note) return;
    var rows = sys.grades.slice(0, 5).map(function(g) {
      return g.label + " → " + (g.gpa4 >= 4 ? "4.0" : g.gpa4.toFixed(1));
    }).join(" &nbsp;·&nbsp; ");
    note.innerHTML =
      "<b>" + sys.flag + " " + sys.name + " — " + sys.scale + "</b><br>" +
      rows + (sys.grades.length > 5 ? " &nbsp;…" : "") +
      "<br><small>" + sys.tip + "</small>";
    note.classList.add("info");
  }
  function _injectNav() {
    if (document.getElementById("smCountrySelect")) return;
    var navCta = document.querySelector(".nav-cta");
    if (navCta) {
      var wrap = document.createElement("div");
      wrap.className = "sm-country-wrap";
      wrap.setAttribute("aria-label", "Country grading system selector");
      wrap.appendChild(_buildSelect(true));
      navCta.insertBefore(wrap, navCta.firstChild);
    }
    var toolHead = document.querySelector(".tool-head .wrap");
    if (toolHead && !toolHead.querySelector(".sm-country-inline")) {
      var mobileWrap = document.createElement("div");
      mobileWrap.className = "sm-country-inline";
      mobileWrap.setAttribute("aria-label", "Select country grading system");
      mobileWrap.appendChild(_buildSelect(false));
      toolHead.appendChild(mobileWrap);
    }
  }
  function _injectPlaceholders() {
    document.querySelectorAll(".sm-country-picker").forEach(function(el) {
      if (el.querySelector(".sm-country-select")) return;
      el.appendChild(_buildSelect());
    });
  }
  function _renderGuidePanel(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = _buildGuidePanelHTML(_current);
    document.addEventListener("sm:country-change", function(e) {
      container.innerHTML = _buildGuidePanelHTML(e.detail.system);
    });
  }
  function _buildGuidePanelHTML(sys) {
    var rows = sys.grades.map(function(g) {
      var bar = Math.round((g.gpa4 / 4) * 100);
      return "<tr>" +
        "<td><strong>" + g.label + "</strong></td>" +
        "<td>" + g.cls + "</td>" +
        "<td class='tnum'>" + g.gpa4.toFixed(2) + "</td>" +
        "<td style='width:120px'>" +
          "<div style='height:8px;border-radius:4px;background:var(--accent-dim)'>" +
            "<div style='width:" + bar + "%;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--g1),var(--g2))'></div>" +
          "</div>" +
        "</td>" +
        "</tr>";
    }).join("");
    return "<div class='scale-note info' style='margin-bottom:var(--s4)'>" +
      "<b>" + sys.flag + " " + sys.name + "</b> — " + sys.scale + "<br>" +
      "<small>Credit unit: <b>" + sys.creditUnit + "</b> &nbsp;·&nbsp; " +
      "Term: <b>" + sys.termName + "</b> &nbsp;·&nbsp; " +
      "Pass mark: <b>" + sys.passMark + "</b> &nbsp;·&nbsp; " +
      "Native scale max: <b>" + sys.scaleMax + "</b></small><br>" +
      "<small style='color:var(--ink-3)'>" + sys.tip + "</small>" +
      "</div>" +
      "<div style='overflow-x:auto'>" +
      "<table class='ref-table' style='width:100%;border-collapse:collapse'>" +
      "<thead><tr style='font-size:var(--step-xs);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3)'>" +
      "<th style='text-align:left;padding:8px 4px'>Grade</th>" +
      "<th style='text-align:left;padding:8px 4px'>Classification</th>" +
      "<th style='text-align:left;padding:8px 4px'>US GPA</th>" +
      "<th style='text-align:left;padding:8px 4px'>GPA Bar</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function _liveConversion() {
    var resultEls = document.querySelectorAll(".gpa-big, .res-big, #gpaOut, #sgGpaOut");
    if (!resultEls.length) return;
    var convEl = document.getElementById("smConvResult");
    if (!convEl) return;
    function update() {
      var sys = _current;
      var gpaStr = "";
      resultEls.forEach(function(el) {
        var t = el.textContent.trim();
        if (t && t !== "—" && !isNaN(parseFloat(t))) gpaStr = t;
      });
      if (!gpaStr) { convEl.textContent = ""; return; }
      var gpa4 = parseFloat(gpaStr);
      var native = sys.toNative(gpa4);
      var nativeLabel = sys.scaleType === "numeric5inv"
        ? native.toFixed(1) + " (German)"
        : sys.scaleType === "numeric20" ? native.toFixed(1) + "/20"
        : sys.scaleType === "numeric30" ? native + "/30"
        : sys.scaleType === "numeric7"  ? native + " (Danish)"
        : sys.scaleType === "numeric10" ? native.toFixed(1) + "/10"
        : sys.scaleType === "gpa10"     ? native.toFixed(2) + "/10"
        : native + "%";
      convEl.textContent = sys.flag + " " + sys.name + ": ≈ " + nativeLabel + " (" + sys.scale + ")";
    }
    resultEls.forEach(function(el) {
      new MutationObserver(update).observe(el, { childList: true, characterData: true, subtree: true });
    });
    document.addEventListener("sm:country-change", update);
    setTimeout(update, 500);
  }
  function _init() {
    _injectNav();
    _injectPlaceholders();
    _updateBadge(_current);
    _updateScaleNote(_current);
    _liveConversion();
    _renderGuidePanel("smGuidePanel");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    _init();
  }
  return {
    current:  function()   { return _current; },
    onChange: function(fn) { _listeners.push(fn); },
    renderGuidePanel: _renderGuidePanel
  };
})();