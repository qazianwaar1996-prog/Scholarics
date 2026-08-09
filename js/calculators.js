(function () {
  'use strict';
  if (typeof window.SC === 'undefined') return;
  var qs  = SC.$;
  var qsa = SC.$$;
  var pRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initFieldActive () {
    qsa('.field').forEach(function (field) {
      var inp = qs('input, select, textarea', field);
      if (!inp) return;
      inp.addEventListener('focus', function () { field.classList.add('field-active'); });
      inp.addEventListener('blur',  function () { field.classList.remove('field-active'); });
    });
  }
  function initValidationStates () {
    qsa('.input.lg[type=number]').forEach(function (inp) {
      function check () {
        if (inp.value === '') {
          inp.classList.remove('is-valid', 'is-error');
          return;
        }
        var val = parseFloat(inp.value);
        var min = parseFloat(inp.min);
        var max = parseFloat(inp.max);
        var valid = !isNaN(val);
        if (!isNaN(min)) valid = valid && val >= min;
        if (!isNaN(max)) valid = valid && val <= max;
        if (valid) {
          inp.classList.add('is-valid');
          inp.classList.remove('is-error');
        } else {
          inp.classList.add('is-error');
          inp.classList.remove('is-valid');
        }
      }
      inp.addEventListener('input',  check);
      inp.addEventListener('blur',   check);
      inp.addEventListener('change', check);
      if (inp.value !== '') check();
    });
  }
  function initResultFlash () {
    if (pRM) return;
    var cardMap = [
      { num: '.gpa-big',      card: '.gpa-hero' },
      { num: '.res-big',      card: '.res-hero' },
      { num: '.grade-big',    card: '.grade-hero' },
      { num: '.gauge-num .n', card: '.gauge-card' },
      { num: '.ring .pct',    card: '.ring-card' }
    ];
    cardMap.forEach(function (pair) {
      var num  = qs(pair.num);
      var card = qs(pair.card);
      if (!num || !card) return;
      var prev = num.textContent;
      new MutationObserver(function () {
        if (num.textContent !== prev && num.textContent !== '—') {
          prev = num.textContent;
          card.classList.remove('result-flash');
          void card.offsetWidth;
          card.classList.add('result-flash');
          setTimeout(function () { card.classList.remove('result-flash'); }, 600);
        }
      }).observe(num, { childList: true, characterData: true, subtree: true });
    });
  }
  function initSliderFill () {
    qsa('input[type=range]').forEach(function (slider) {
      function fill () {
        var min = parseFloat(slider.min) || 0;
        var max = parseFloat(slider.max) || 100;
        var val = parseFloat(slider.value) || 0;
        var pct = ((val - min) / (max - min)) * 100;
        slider.style.setProperty('--pct', pct.toFixed(1) + '%');
      }
      slider.addEventListener('input', fill);
      fill();
    });
  }
  function announceSr(msg) {
    var announce = document.createElement('div');
    announce.setAttribute('aria-live', 'polite');
    announce.setAttribute('aria-atomic', 'true');
    announce.className = 'sr-only';
    announce.textContent = msg;
    document.body.appendChild(announce);
    setTimeout(function () { if (announce.parentNode) announce.parentNode.removeChild(announce); }, 2000);
  }

  function getToolName() {
    var h1 = qs('h1');
    var name = h1 ? h1.textContent.trim() : document.title.split('|')[0].trim();
    if (!name.toLowerCase().startsWith('scholarics')) {
      name = 'Scholarics ' + name;
    }
    return name;
  }

  function getCalculatorSummary() {
    var toolName = getToolName();
    var resultEl = qs('.gpa-big, .res-big, .grade-big, .gauge-num .n, .ring .pct, #caMean, #g2pOut, #p2gOut, #ssTotalHours, #stWeeklyHours, #need, #feNeedOut, #awAvgOut, #agMustAttend, #apPctOut, #chSemOut, #giRequired, #gpPredOut, #rmReqOut, #sgOut');
    var labelEl  = qs('.gpa-hero .label, .res-hero .label, .grade-hero .label, .gauge-label, .ring-status, .result-box .label, .label');
    var result   = resultEl ? resultEl.textContent.trim() : '';
    var label    = labelEl  ? labelEl.textContent.trim()  : 'Result';

    if (!result || result === '—' || result === 'Enter values first' || result === 'Enter your numbers') {
      return null;
    }

    var isGpaTool = /gpa/i.test(toolName) || /gpa/i.test(label);
    if (isGpaTool && /^[0-9.]+$/.test(result)) {
      var scaleMax = '4.0';
      var scaleInput = qs('#scale, #scaleSel, select[id*="scale"]');
      if (scaleInput && scaleInput.value === 'percent') scaleMax = '100';
      else if (scaleInput && scaleInput.value === '10.0') scaleMax = '10.0';
      else if (scaleInput && scaleInput.value === '5.0') scaleMax = '5.0';
      else if (scaleInput && scaleInput.value === '7.0') scaleMax = '7.0';
      else if (label.indexOf('10.0') !== -1) scaleMax = '10.0';
      else if (label.indexOf('5.0') !== -1) scaleMax = '5.0';
      else if (label.indexOf('7.0') !== -1) scaleMax = '7.0';

      var gpaLabel = /cgpa/i.test(toolName) || /cgpa/i.test(label) ? 'CGPA' : 'GPA';
      return toolName + ' — ' + gpaLabel + ': ' + result + ' / ' + scaleMax;
    }

    var cleanLabel = label.replace(/\s*[·•\-]\s*.*$/, '').trim();
    if (!cleanLabel) cleanLabel = 'Result';
    return toolName + ' — ' + cleanLabel + ': ' + result;
  }

  function getCalculatorStateUrl() {
    if (window.SC_LAST_STATE_URL) return window.SC_LAST_STATE_URL;
    if (!window.SCShare || typeof SCShare.buildUrl !== 'function') {
      return window.location.href.split('#')[0];
    }
    var path = window.location.pathname;
    var page = path.replace(/^\/|\/$/g, '').replace(/\.html$/i, '');

    if (page === 'gpa') {
      var scale = (qs('#scale') && qs('#scale').value) || 'letter';
      var rows = [];
      qsa('#rows .crow').forEach(function (r) {
        var name = (qs('[data-f="name"]', r) && qs('[data-f="name"]', r).value) || '';
        var grade = (qs('[data-f="grade"]', r) && qs('[data-f="grade"]', r).value) || 'A';
        var credits = parseFloat((qs('[data-f="credits"]', r) && qs('[data-f="credits"]', r).value) || '3') || 0;
        rows.push([name, grade, credits]);
      });
      if (rows.length) return SCShare.buildUrl({ scale: scale, rows: JSON.stringify(rows) });
    } else if (page === 'cgpa') {
      if (window.SC && SC.store) {
        var cgRows = SC.store.get('sc_cgpa_rows', []);
        if (cgRows && cgRows.length) {
          var compact = cgRows.map(function (r) { return [r.name, r.gpa, r.credits]; });
          return SCShare.buildUrl({ rows: JSON.stringify(compact) });
        }
      }
    } else if (page === 'attendance-calculator') {
      var a = qs('#attended') ? qs('#attended').value : (qs('#att') ? qs('#att').value : '');
      var h = qs('#held') ? qs('#held').value : '';
      var r = qs('#req') ? qs('#req').value : '';
      if (a || h || r) return SCShare.buildUrl({ a: a, h: h, r: r });
    } else if (page === 'final-exam-calculator') {
      var cur = qs('#feCurrentGrade') ? qs('#feCurrentGrade').value : '';
      var goal = qs('#feTargetGrade') ? qs('#feTargetGrade').value : '';
      var weight = qs('#feWeight') ? qs('#feWeight').value : '';
      if (cur || goal || weight) return SCShare.buildUrl({ cur: cur, goal: goal, weight: weight });
    } else if (page === 'grade-calculator') {
      if (window.SC && SC.store) {
        var gRows = SC.store.get('sc_grade_rows', []);
        if (gRows && gRows.length) {
          var compact = gRows.map(function (r) { return [r.name, r.score, r.weight]; });
          return SCShare.buildUrl({ rows: JSON.stringify(compact) });
        }
      }
    } else if (page === 'final-grade') {
      var curVal = qs('#cur') ? qs('#cur').value : '';
      var goalVal = qs('#goal') ? qs('#goal').value : '';
      var wVal = qs('#weight') ? qs('#weight').value : '';
      if (curVal || goalVal || wVal) return SCShare.buildUrl({ cur: curVal, goal: goalVal, w: wVal });
    } else if (page === 'target-gpa') {
      var curGpa = qs('#curGpa') ? qs('#curGpa').value : '';
      var curCred = qs('#curCredits') ? qs('#curCredits').value : '';
      var remCred = qs('#remCredits') ? qs('#remCredits').value : '';
      var goalGpa = qs('#goalGpa') ? qs('#goalGpa').value : '';
      if (curGpa || curCred || remCred || goalGpa) return SCShare.buildUrl({ cur: curGpa, cc: curCred, rc: remCred, goal: goalGpa });
    } else if (page === 'gpa-simulator' && window.SCGetSimulatorState) {
      return SCShare.buildUrl(window.SCGetSimulatorState());
    }

    var data = {};
    var hasData = false;
    qsa('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').forEach(function(el) {
      if (el.id && el.value && el.value !== el.placeholder && el.value !== '') {
        data[el.id] = el.value;
        hasData = true;
      }
    });
    if (hasData) return SCShare.buildUrl(data);

    return window.location.href.split('#')[0];
  }

  function showButtonSuccess(btn, text) {
    if (!btn) return;
    var orig = btn.getAttribute('data-orig-html') || btn.innerHTML;
    btn.setAttribute('data-orig-html', orig);
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> ' + text;
    btn.classList.add('btn-copied');
    setTimeout(function () {
      btn.innerHTML = orig;
      btn.classList.remove('btn-copied');
    }, 2000);
  }

  function loadJsPDF() {
    return new Promise(function(resolve, reject) {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
        return;
      }
      var script = document.createElement('script');
      script.src = '/js/vendor/jspdf.min.js';
      script.onload = function() {
        if (window.jspdf && window.jspdf.jsPDF) {
          resolve(window.jspdf.jsPDF);
          return;
        }
        var autoScript = document.createElement('script');
        autoScript.src = '/js/vendor/jspdf-autotable.min.js';
        autoScript.onload = function() {
          if (window.jspdf && window.jspdf.jsPDF) {
            resolve(window.jspdf.jsPDF);
          } else {
            reject(new Error('jsPDF failed to load'));
          }
        };
        autoScript.onerror = function() { reject(new Error('Failed to load jsPDF autotable')); };
        document.head.appendChild(autoScript);
      };
      script.onerror = function() { reject(new Error('Failed to load jsPDF')); };
      document.head.appendChild(script);
    });
  }

  function generatePrintFallbackReport(btn, origHTML) {
    var toolName = getToolName();
    var summary  = getCalculatorSummary() || (toolName + ' Report');
    var dateStr  = new Date().toLocaleDateString();

    var resultEl = qs('.gpa-big, .res-big, .grade-big, .gauge-num .n, .ring .pct, #caMean, #g2pOut, #p2gOut, #ssTotalHours, #stWeeklyHours, #need, #feNeedOut, #awAvgOut, #agMustAttend, #apPctOut, #chSemOut, #giRequired, #gpPredOut, #rmReqOut, #sgOut');
    var labelEl  = qs('.gpa-hero .label, .res-hero .label, .grade-hero .label, .gauge-label, .ring-status, .result-box .label, .label');
    var resVal   = resultEl ? resultEl.textContent.trim() : '—';
    var resLbl   = labelEl  ? labelEl.textContent.trim()  : 'Result';

    var metaHTML = '';
    var metaItems = qsa('.gpa-meta div, .res-meta div, .stats div, .hero-stats div, .res-sub, .gpa-sub, .grade-letter, .ring-status');
    metaItems.forEach(function (m) {
      var nEl = qs('.n, .val', m);
      var lEl = qs('.l, .lbl', m);
      if (nEl && lEl) {
        metaHTML += '<div class="meta-item"><div class="val">' + SC.esc(nEl.textContent.trim()) + '</div><div class="lbl">' + SC.esc(lEl.textContent.trim()) + '</div></div>';
      } else if (m.textContent && !nEl) {
        var txt = m.textContent.trim();
        if (txt && txt !== '—' && txt !== 'Enter values first' && txt !== 'Add a course to begin' && txt !== 'Add a semester to begin') {
          metaHTML += '<div class="meta-item"><div class="val">' + SC.esc(txt) + '</div><div class="lbl">Details</div></div>';
        }
      }
    });

    var settingsHTML = '';
    var scaleSelect = qs('#scale, #scaleSel, select[id*="scale"]');
    if (scaleSelect && scaleSelect.options && scaleSelect.selectedIndex >= 0) {
      settingsHTML = '<div style="margin-bottom:16px;font-size:14px;color:#475569"><b>Grading scale:</b> ' + SC.esc(scaleSelect.options[scaleSelect.selectedIndex].textContent.trim()) + '</div>';
    }

    var tableHTML = '';
    var rowsContainer = qs('#rows, #awRows, #cgpaRows, .rows-gpa');
    var crows = rowsContainer ? qsa('.crow', rowsContainer) : [];

    if (crows.length > 0) {
      var headers = [];
      qsa('.rows-head span, thead th').forEach(function (th) {
        var t = th.textContent.trim();
        if (t) headers.push(t);
      });
      if (headers.length === 0) {
        headers = ['Name', 'Grade / Value', 'Credits / Weight'];
      }
      tableHTML += '<table><thead><tr>';
      headers.forEach(function (h) {
        tableHTML += '<th>' + SC.esc(h) + '</th>';
      });
      tableHTML += '</tr></thead><tbody>';

      crows.forEach(function (row) {
        tableHTML += '<tr>';
        var cols = 0;
        qsa('input:not([type="hidden"]), select', row).forEach(function (field) {
          if (cols >= headers.length) return;
          var val = '';
          if (field.tagName.toLowerCase() === 'select') {
            val = field.options && field.selectedIndex >= 0 ? field.options[field.selectedIndex].textContent.trim() : '';
          } else {
            val = field.value ? field.value.trim() : '';
          }
          tableHTML += '<td>' + SC.esc(val || '—') + '</td>';
          cols++;
        });
        tableHTML += '</tr>';
      });
      tableHTML += '</tbody></table>';
    } else {
      var paramRows = [];
      qsa('.field, .form-group, .input-wrap').forEach(function (field) {
        var lblEl = qs('label', field);
        var inpEl = qs('input:not([type="hidden"]), select', field);
        if (lblEl && inpEl) {
          var labelTxt = lblEl.textContent.trim();
          var valTxt = '';
          if (inpEl.tagName.toLowerCase() === 'select') {
            valTxt = inpEl.options && inpEl.selectedIndex >= 0 ? inpEl.options[inpEl.selectedIndex].textContent.trim() : '';
          } else {
            valTxt = inpEl.value ? inpEl.value.trim() : '';
          }
          if (labelTxt && valTxt) {
            paramRows.push([labelTxt, valTxt]);
          }
        }
      });
      if (paramRows.length > 0) {
        tableHTML += '<table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>';
        paramRows.forEach(function (r) {
          tableHTML += '<tr><td>' + SC.esc(r[0]) + '</td><td><b>' + SC.esc(r[1]) + '</b></td></tr>';
        });
        tableHTML += '</tbody></table>';
      }
    }

    var fullHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + SC.esc(toolName) + ' Report</title>' +
      '<style>' +
      '@page { margin: 20mm; }' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1815; margin: 0; padding: 24px; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
      '.header { border-bottom: 2px solid #1a1815; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; }' +
      '.title { font-size: 24px; font-weight: 800; margin: 0; }' +
      '.date { font-size: 13px; color: #6b7280; }' +
      '.hero-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 20px; margin-bottom: 24px; }' +
      '.hero-main { font-size: 32px; font-weight: 800; color: #1a1815; margin-bottom: 4px; }' +
      '.hero-label { font-size: 14px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }' +
      '.meta-grid { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }' +
      '.meta-item .val { font-size: 18px; font-weight: 700; color: #1e293b; }' +
      '.meta-item .lbl { font-size: 12px; color: #64748b; margin-top: 2px; }' +
      '.section-title { font-size: 16px; font-weight: 700; margin: 24px 0 12px; color: #1a1815; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }' +
      'th { background: #1a1815; color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; font-size: 13px; }' +
      'td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }' +
      'tr:nth-child(even) { background: #f8fafc; }' +
      '.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }' +
      '</style></head><body>' +
      '<div class="header">' +
        '<h1 class="title">' + SC.esc(toolName) + ' Report</h1>' +
        '<div class="date">' + SC.esc(dateStr) + '</div>' +
      '</div>' +
      '<div class="hero-box">' +
        '<div class="hero-label">' + SC.esc(resLbl) + '</div>' +
        '<div class="hero-main">' + SC.esc(resVal) + '</div>' +
        (metaHTML ? '<div class="meta-grid">' + metaHTML + '</div>' : '') +
      '</div>' +
      settingsHTML +
      (tableHTML ? '<div class="section-title">Calculation Details</div>' + tableHTML : '') +
      '<div class="footer">Generated by Scholarics · scholarics.com · Free academic calculators &amp; tools for students</div>' +
      '</body></html>';

    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow || iframe.contentDocument;
    if (doc && doc.document) doc = doc.document;
    if (doc) { doc.open(); doc.write(fullHTML); doc.close(); }
    setTimeout(function () {
      try {
        if (iframe.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      } catch (e) {
        var win = window.open('', '_blank', 'width=800,height=600');
        if (win) { win.document.write(fullHTML); win.document.close(); win.focus(); setTimeout(function () { win.print(); }, 400); }
        else { SC.toast('Allow popups to download PDF report', 'error'); }
      }
      setTimeout(function () { if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 3000);
    }, 350);

    btn.innerHTML = origHTML;
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }

  function generateDynamicPDFReport(btn) {
    var origHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Generating…';
    btn.classList.add('btn-loading');
    btn.disabled = true;

    loadJsPDF().then(function(jsPDF) {
      var toolName = getToolName();
      var summary  = getCalculatorSummary() || (toolName + ' Report');
      var dateStr  = new Date().toLocaleDateString();

      var resultEl = qs('.gpa-big, .res-big, .grade-big, .gauge-num .n, .ring .pct, #caMean, #g2pOut, #p2gOut, #ssTotalHours, #stWeeklyHours, #need, #feNeedOut, #awAvgOut, #agMustAttend, #apPctOut, #chSemOut, #giRequired, #gpPredOut, #rmReqOut, #sgOut');
      var labelEl  = qs('.gpa-hero .label, .res-hero .label, .grade-hero .label, .gauge-label, .ring-status, .result-box .label, .label');
      var resVal   = resultEl ? resultEl.textContent.trim() : '—';
      var resLbl   = labelEl  ? labelEl.textContent.trim()  : 'Result';

      var doc = new jsPDF({ unit: 'pt', format: 'a4' });
      var pageWidth = doc.internal.pageSize.getWidth();
      var margin = 40;
      var contentWidth = pageWidth - margin * 2;
      var y = margin;

      doc.setFillColor(26, 24, 21);
      doc.rect(0, 0, pageWidth, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Scholarics', margin, 38);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('scholarics.com', pageWidth - margin, 38, { align: 'right' });

      y = 80;
      doc.setTextColor(26, 24, 21);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(toolName + ' Report', margin, y);
      y += 18;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(dateStr, margin, y);
      y += 30;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 70, 'FD');
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(3);
      doc.line(margin, y, margin, y + 70);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(resLbl.toUpperCase(), margin + 12, y + 18);
      doc.setTextColor(26, 24, 21);
      doc.setFontSize(28);
      doc.text(resVal, margin + 12, y + 50);
      y += 90;

      var metaItems = [];
      qsa('.gpa-meta div, .res-meta div, .stats div, .hero-stats div, .res-sub, .gpa-sub, .grade-letter, .ring-status').forEach(function (m) {
        var nEl = qs('.n, .val', m);
        var lEl = qs('.l, .lbl', m);
        if (nEl && lEl) {
          metaItems.push([lEl.textContent.trim(), nEl.textContent.trim()]);
        } else if (m.textContent && !nEl) {
          var txt = m.textContent.trim();
          if (txt && txt !== '—' && txt !== 'Enter values first' && txt !== 'Add a course to begin' && txt !== 'Add a semester to begin') {
            metaItems.push(['Details', txt]);
          }
        }
      });

      if (metaItems.length > 0) {
        doc.autoTable({
          startY: y,
          margin: { left: margin, right: margin },
          body: metaItems,
          theme: 'plain',
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 0: { fontStyle: 'bold', textColor: [71, 85, 105] } }
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      var scaleSelect = qs('#scale, #scaleSel, select[id*="scale"]');
      if (scaleSelect && scaleSelect.options && scaleSelect.selectedIndex >= 0) {
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('Grading scale: ', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(scaleSelect.options[scaleSelect.selectedIndex].textContent.trim(), margin + 70, y);
        y += 20;
      }

      var rowsContainer = qs('#rows, #awRows, #cgpaRows, .rows-gpa');
      var crows = rowsContainer ? qsa('.crow', rowsContainer) : [];
      var tableData = [];
      var tableHeaders = [];

      if (crows.length > 0) {
        qsa('.rows-head span, thead th').forEach(function (th) {
          var t = th.textContent.trim();
          if (t) tableHeaders.push(t);
        });
        if (tableHeaders.length === 0) {
          tableHeaders = ['Name', 'Grade / Value', 'Credits / Weight'];
        }
        crows.forEach(function (row) {
          var rowData = [];
          var cols = 0;
          qsa('input:not([type="hidden"]), select', row).forEach(function (field) {
            if (cols >= tableHeaders.length) return;
            var val = '';
            if (field.tagName.toLowerCase() === 'select') {
              val = field.options && field.selectedIndex >= 0 ? field.options[field.selectedIndex].textContent.trim() : '';
            } else {
              val = field.value ? field.value.trim() : '';
            }
            rowData.push(val || '—');
            cols++;
          });
          if (rowData.length) tableData.push(rowData);
        });
      } else {
        qsa('.field, .form-group, .input-wrap').forEach(function (field) {
          var lblEl = qs('label', field);
          var inpEl = qs('input:not([type="hidden"]), select', field);
          if (lblEl && inpEl) {
            var labelTxt = lblEl.textContent.trim();
            var valTxt = '';
            if (inpEl.tagName.toLowerCase() === 'select') {
              valTxt = inpEl.options && inpEl.selectedIndex >= 0 ? inpEl.options[inpEl.selectedIndex].textContent.trim() : '';
            } else {
              valTxt = inpEl.value ? inpEl.value.trim() : '';
            }
            if (labelTxt && valTxt) {
              tableData.push([labelTxt, valTxt]);
            }
          }
        });
        if (tableData.length > 0) {
          tableHeaders = ['Parameter', 'Value'];
        }
      }

      if (tableData.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(26, 24, 21);
        doc.setFont('helvetica', 'bold');
        doc.text('Calculation Details', margin, y);
        y += 14;
        doc.autoTable({
          startY: y,
          head: [tableHeaders],
          body: tableData,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [26, 24, 21], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 5 },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      var pageCount = doc.internal.getNumberOfPages();
      for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('Generated by Scholarics · scholarics.com · Free academic calculators & tools for students', pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
      }

      var safeName = toolName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(safeName + '_report.pdf');

      showButtonSuccess(btn, 'PDF saved!');
      announceSr('PDF report downloaded.');
    }).catch(function(err) {
      console.warn('jsPDF failed, falling back to print:', err);
      generatePrintFallbackReport(btn, origHTML);
    });
  }

  function initGlobalCalculatorActions() {
    if (window.SC_ACTIONS_INITIALIZED) return;
    window.SC_ACTIONS_INITIALIZED = true;

    function fallbackShare(summary, url, btn) {
      var textToCopy = summary + ' — ' + url;
      SC.copy(textToCopy).then(function() {
        showButtonSuccess(btn, 'Copied!');
        announceSr('Result copied to clipboard.');
      }).catch(function() {
        SC.toast('Copy failed', 'error');
      });
    }

    /* 1. Share Buttons */
    qsa('#shareBtn, [id$="Share"]').forEach(function (btn) {
      if (btn.id === 'simShareBtn') return;
      if (btn.getAttribute('data-sc-action')) return;
      btn.setAttribute('data-sc-action', 'share');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var summary = getCalculatorSummary();
        if (!summary) {
          SC.toast('Enter values first', 'info');
          return;
        }
        var url = getCalculatorStateUrl();
        if (navigator.share) {
          navigator.share({
            title: getToolName(),
            text: summary,
            url: url
          }).then(function () {
            showButtonSuccess(btn, 'Shared!');
            announceSr('Result shared.');
          }).catch(function (err) {
            if (err && err.name !== 'AbortError') {
              fallbackShare(summary, url, btn);
            }
          });
        } else {
          fallbackShare(summary, url, btn);
        }
      });
    });

    /* 2. Copy Link Buttons */
    qsa('#copyLinkBtn, #attCopyLink, #feCopyLink, #simShareBtn, .copy-link-btn').forEach(function (btn) {
      if (btn.getAttribute('data-sc-action')) return;
      btn.setAttribute('data-sc-action', 'copylink');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var url = getCalculatorStateUrl();
        if (!url) {
          SC.toast('No link to copy', 'info');
          return;
        }
        SC.copy(url).then(function() {
          showButtonSuccess(btn, 'Copied link!');
          SC.toast('Link copied to clipboard!', 'success');
          announceSr('Link copied to clipboard.');
        }).catch(function() {
          SC.toast('Failed to copy link', 'error');
        });
      });
    });

    /* 3. PDF Buttons */
    qsa('#pdfBtn, #simPdfBtn').forEach(function (btn) {
      if (btn.getAttribute('data-sc-action')) return;
      btn.setAttribute('data-sc-action', 'pdf');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        try {
          generateDynamicPDFReport(btn);
        } catch (err) {
          console.error('PDF export error:', err);
          SC.toast('Unable to generate PDF report', 'error');
        }
      });
    });
  }
  function initVerdictAnim () {
    if (pRM) return;
    var verdict = qs('#verdict');
    if (!verdict) return;
    var prevClass = verdict.className;
    new MutationObserver(function () {
      if (verdict.className !== prevClass) {
        prevClass = verdict.className;
        verdict.style.animation = 'none';
        void verdict.offsetWidth;
        verdict.style.animation = '';
      }
    }).observe(verdict, { attributes: true, attributeFilter: ['class'] });
  }
  function initRowFocus () {
    function attachRowFocus () {
      qsa('.crow').forEach(function (row) {
        qsa('input, select', row).forEach(function (inp) {
          inp.addEventListener('focus', function () { row.classList.add('crow-focus'); });
          inp.addEventListener('blur',  function () { row.classList.remove('crow-focus'); });
        });
      });
    }
    attachRowFocus();
    var rowsContainer = qs('#rows');
    if (!rowsContainer) return;
    new MutationObserver(function () {
      attachRowFocus();
    }).observe(rowsContainer, { childList: true });
  }
  function initRowKeyNav () {
    var rowsContainer = qs('#rows');
    if (!rowsContainer) return;
    rowsContainer.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var inp = e.target;
      if (!inp.matches('input, select')) return;
      var all = qsa('input:not([type=hidden]), select', rowsContainer);
      var idx = all.indexOf(inp);
      if (idx === -1) return;
      var next = all[idx + 1];
      if (next) {
        e.preventDefault();
        next.focus();
        next.select && next.select();
      }
    });
  }
  function initAttendanceRingColors () {
    var verdict = qs('#verdict');
    var arc     = qs('#ringArc');
    var pctEl   = qs('.ring .pct');
    if (!verdict || !arc) return;
    var colorMap = {
      ok:   '#10b981',
      bad:  '#ef4444',
      warn: '#f59e0b',
      info: '#3b82f6'
    };
    new MutationObserver(function () {
      var cls = verdict.className;
      var match = cls.match(/\b(ok|bad|warn|info)\b/);
      if (match) {
        var color = colorMap[match[1]] || '#3b82f6';
        arc.style.stroke = color;
        if (pctEl) pctEl.style.color = '#fff';
      }
    }).observe(verdict, { attributes: true, attributeFilter: ['class'] });
  }
  function initResetBtnAnim () {
    var btn = qs('#resetBtn');
    if (!btn || pRM) return;
    btn.addEventListener('click', function () {
      btn.classList.add('btn-spring');
      setTimeout(function () { btn.classList.remove('btn-spring'); }, 400);
    });
  }
  /* initCopyFeedback removed (handled by initGlobalCalculatorActions) */
  function initScaleNoteLinks () {
    qsa('.scale-note a').forEach(function (link) {
      link.addEventListener('click', function () {
        link.style.opacity = '.6';
        setTimeout(function () { link.style.opacity = ''; }, 200);
      });
    });
  }
  function initPercentageIcons () {
    if (!qs('#m_got')) return;
    var iconMap = {
      'm_got': '✓', 'm_max': '/',
      'x_a': '#', 'x_b': '/',
      'p_pct': '%', 'p_num': 'n',
      'c_from': '↑', 'c_to': '→'
    };
    Object.keys(iconMap).forEach(function (id) {
      var el = qs('#' + id);
      if (!el || el.parentElement.classList.contains('input-icon-wrap')) return;
      var parent = el.parentElement;
      var wrap = document.createElement('div');
      wrap.className = 'input-icon-wrap';
      parent.insertBefore(wrap, el);
      wrap.appendChild(el);
      var ico = document.createElement('span');
      ico.className = 'ico-left';
      ico.textContent = iconMap[id];
      ico.style.cssText = 'font-size:.75rem;font-weight:700;font-family:var(--font-display)';
      wrap.insertBefore(ico, el);
      el.classList.add('has-icon');
      el.style.paddingLeft = '36px';
    });
  }
  function init () {
    initFieldActive();
    initValidationStates();
    initResultFlash();
    initSliderFill();
    initVerdictAnim();
    initRowFocus();
    initRowKeyNav();
    initAttendanceRingColors();
    initResetBtnAnim();
    initScaleNoteLinks();
    initPercentageIcons();
    initGlobalCalculatorActions();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
(function () {
  var rv = document.querySelector('.result-box .rv');
  if (!rv) return;
  var prev = rv.textContent;
  new MutationObserver(function () {
    if (rv.textContent !== prev) {
      prev = rv.textContent;
      rv.classList.remove('num-updated');
      void rv.offsetWidth;
      rv.classList.add('num-updated');
      setTimeout(function () { rv.classList.remove('num-updated'); }, 500);
    }
  }).observe(rv, { childList: true, characterData: true, subtree: true });
})();
(function () {
  var tabs = document.querySelectorAll('.tabs button');
  if (!tabs.length) return;
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      var panel = document.getElementById('panel-' + target);
      if (!panel) return;
      panel.style.animation = 'none';
      void panel.offsetWidth;
      panel.style.animation = '';
    });
  });
})();