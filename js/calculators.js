(function () {
  'use strict';
  if (typeof window.SM === 'undefined') return;
  var qs  = SM.$;
  var qsa = SM.$$;
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
  function initWebShare () {
    var shareBtn = qs('#shareBtn');
    if (!shareBtn || !navigator.share) return;
    var origOnClick = shareBtn.onclick;
    var origListeners = [];
    shareBtn.onclick = null;
    shareBtn.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      var resultEl = qs('.gpa-big, .res-big, .grade-big, .gauge-num .n, .ring .pct');
      var labelEl  = qs('.gpa-hero .label, .res-hero .label, .grade-hero .label, .gauge-label, .ring-status');
      var result   = resultEl ? resultEl.textContent.trim() : '';
      var label    = labelEl  ? labelEl.textContent.trim()  : 'Result';
      if (!result || result === '—') {
        SM.toast('Enter values first', 'info');
        return;
      }
      var text = label + ': ' + result + ' — Calculated on Study Metrics (studymetrics.app)';
      navigator.share({ title: 'Study Metrics', text: text, url: window.location.href })
        .catch(function (err) {
          if (err.name !== 'AbortError') SM.copy(text);
        });
    });
    var txt = shareBtn.lastChild;
    if (txt && txt.nodeType === 3) txt.textContent = ' Share';
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
  function initCopyFeedback () {
    var btn = qs('#shareBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var pctEl = qs('.ring .pct, .gpa-big, .res-big, .grade-big, .gauge-num .n');
      if (!pctEl || pctEl.textContent === '—') return;
      var announce = document.createElement('div');
      announce.setAttribute('aria-live', 'polite');
      announce.setAttribute('aria-atomic', 'true');
      announce.className = 'sr-only';
      announce.textContent = 'Result copied to clipboard.';
      document.body.appendChild(announce);
      setTimeout(function () { announce.remove(); }, 2000);
    });
  }
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
    initCopyFeedback();
    initScaleNoteLinks();
    initPercentageIcons();
    if (typeof navigator.share === 'function') {
      initWebShare();
    }
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