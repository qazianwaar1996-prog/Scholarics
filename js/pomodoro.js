/* ============================================================
   StudyMetrics — Pomodoro Timer  v2.1
   Features:
     • Persistent state via localStorage (survives page reload)
     • Resume after refresh using wall-clock drift compensation
     • Page Visibility API: re-sync on tab focus
     • Notification API: explicit permission button
     • Notification permission status shown in UI
     • Clear all state on Reset (no stale data)
   ============================================================ */
(function () {
  'use strict';

  var $ = SM.$;

  /* ── localStorage keys ── */
  var KEY = {
    state:    'sm_pom_state',
    settings: 'sm_pom_settings'
  };

  /* ── Default state ── */
  function defaultState() {
    return {
      running:           false,
      phase:             'focus',
      round:             1,
      maxRounds:         4,
      remaining:         null,
      completedSessions: 0,
      focusMinutes:      0,
      startedAt:         null,
      _baseRemaining:    null
    };
  }

  /* ── Load / save settings ── */
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY.settings) || 'null');
      return s && s.focus ? s : { focus: 25, short: 5, long: 15 };
    } catch (e) { return { focus: 25, short: 5, long: 15 }; }
  }

  function saveSettings(s) {
    try { localStorage.setItem(KEY.settings, JSON.stringify(s)); } catch (e) {}
  }

  /* ── Load / save timer state ── */
  function loadState() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY.state) || 'null');
      if (!raw || typeof raw.remaining !== 'number') return null;
      return raw;
    } catch (e) { return null; }
  }

  function saveState(s) {
    try { localStorage.setItem(KEY.state, JSON.stringify(s)); } catch (e) {}
  }

  function clearState() {
    try { localStorage.removeItem(KEY.state); } catch (e) {}
  }

  /* ── Runtime ── */
  var settings = loadSettings();
  var state    = defaultState();
  var ticker   = null;

  function getFocusSec() { return (parseInt(($('#pomFocus')  || {}).value) || settings.focus)  * 60; }
  function getShortSec() { return (parseInt(($('#pomShort')  || {}).value) || settings.short)  * 60; }
  function getLongSec()  { return (parseInt(($('#pomLong')   || {}).value) || settings.long)   * 60; }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ── Update DOM ── */
  function updateDisplay() {
    var remaining = clamp(state.remaining || 0, 0, 99 * 60);
    var d  = $('#pomDisplay'), lbl = $('#pomLabel'), rnd = $('#pomRound');
    var sc = $('#pomCompleted'), ft = $('#pomFocusTime');
    var startBtn = $('#pomStart'), pauseBtn = $('#pomPause');

    if (d)   d.textContent = fmt(remaining);
    if (lbl) lbl.textContent = state.phase === 'focus' ? 'Focus Session'
                             : state.phase === 'short' ? 'Short Break' : 'Long Break';
    if (rnd) rnd.textContent = 'Round ' + state.round + ' of ' + state.maxRounds;
    if (sc)  sc.textContent  = state.completedSessions;
    if (ft)  ft.textContent  = state.focusMinutes;

    document.title = fmt(remaining) + ' — ' +
      (state.phase === 'focus' ? 'Focus' : 'Break') + ' · Study Metrics';

    if (startBtn) {
      startBtn.disabled = state.running;
      startBtn.innerHTML = state.running
        ? 'Running…'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start';
    }
    if (pauseBtn) pauseBtn.disabled = !state.running;
    updateNotifBtnUI();
  }

  /* ── Phase transition ── */
  function nextPhase() {
    if (state.phase === 'focus') {
      state.completedSessions++;
      state.focusMinutes += Math.round(getFocusSec() / 60);
      if (state.round >= state.maxRounds) {
        state.phase = 'long'; state.remaining = getLongSec();
      } else {
        state.phase = 'short'; state.remaining = getShortSec();
      }
    } else {
      state.round = (state.phase === 'long') ? 1 : state.round + 1;
      state.phase = 'focus'; state.remaining = getFocusSec();
    }
    state.running = false; state.startedAt = null; state._baseRemaining = null;
    sendNotification();
    saveState(state);
    updateDisplay();
  }

  /* ── Tick ── */
  function tick() {
    if (!state.running) return;
    if (state.startedAt !== null && state._baseRemaining !== null) {
      var elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      state.remaining = clamp(state._baseRemaining - elapsed, 0, 99 * 60);
    } else {
      state.remaining = clamp((state.remaining || 0) - 1, 0, 99 * 60);
    }
    if (state.remaining <= 0) { stopTicker(); nextPhase(); return; }
    saveState(state);
    updateDisplay();
  }

  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ── Start ── */
  function startTimer() {
    if (state.running) return;
    state.running        = true;
    state.startedAt      = Date.now();
    state._baseRemaining = state.remaining;
    saveState(state);
    ticker = setInterval(tick, 1000);
    updateDisplay();
  }

  /* ── Pause ── */
  function pauseTimer() {
    if (!state.running) return;
    stopTicker();
    state.running = false; state.startedAt = null;
    saveState(state);
    updateDisplay();
  }

  /* ── Reset — clears ALL persisted state ── */
  function resetTimer() {
    stopTicker();
    clearState();
    settings = loadSettings();
    state = defaultState();
    state.remaining = getFocusSec();
    document.title = 'Study Metrics';
    updateDisplay();
  }

  /* ── Resume from storage after refresh ── */
  function resumeFromStorage() {
    var saved = loadState();
    if (!saved) return;

    state.phase             = saved.phase             || 'focus';
    state.round             = saved.round             || 1;
    state.maxRounds         = saved.maxRounds         || 4;
    state.completedSessions = saved.completedSessions || 0;
    state.focusMinutes      = saved.focusMinutes      || 0;

    if (saved.running && saved.startedAt && saved._baseRemaining != null) {
      var elapsed  = Math.floor((Date.now() - saved.startedAt) / 1000);
      var newRem   = clamp(saved._baseRemaining - elapsed, 0, 99 * 60);
      state.remaining = newRem;

      if (newRem <= 0) {
        clearState(); nextPhase(); return;
      }

      state.running        = true;
      state.startedAt      = saved.startedAt;
      state._baseRemaining = newRem;

      var upd = saved; upd._baseRemaining = newRem; saveState(upd);
      ticker = setInterval(tick, 1000);
    } else {
      state.remaining = saved.remaining != null ? saved.remaining : getFocusSec();
      state.running   = false;
    }
  }

  /* ── Page Visibility: re-sync when tab becomes visible ── */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !state.running) return;
    var saved = loadState();
    if (!saved || !saved.startedAt || saved._baseRemaining == null) return;
    var elapsed   = Math.floor((Date.now() - saved.startedAt) / 1000);
    var corrected = clamp(saved._baseRemaining - elapsed, 0, 99 * 60);
    if (corrected <= 0) { stopTicker(); state.remaining = 0; nextPhase(); }
    else { state.remaining = corrected; updateDisplay(); }
  });

  /* ── Notification API ── */
  function notifPermission() {
    return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  }

  function updateNotifBtnUI() {
    var btn = $('#pomNotifBtn');
    if (!btn) return;
    var p = notifPermission();
    if (p === 'granted') {
      btn.textContent = '🔔 Notifications On';
      btn.style.color = 'var(--ok, #22c55e)';
      btn.disabled = true;
    } else if (p === 'denied') {
      btn.textContent = '🔕 Notifications Blocked — enable in browser settings';
      btn.style.color = 'var(--danger, #d1503c)';
      btn.disabled = true;
    } else if (p === 'unsupported') {
      btn.textContent = 'Notifications not supported in this browser';
      btn.disabled = true;
    } else {
      btn.textContent = '🔔 Enable Session Notifications';
      btn.style.color = '';
      btn.disabled = false;
    }
  }

  function requestNotifPermission() {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then(function () {
      updateNotifBtnUI();
      if (notifPermission() === 'granted' && window.SM && SM.toast) {
        SM.toast('Notifications enabled! You\'ll be alerted between sessions.', 'success');
      }
    });
  }

  function sendNotification() {
    if (notifPermission() !== 'granted') return;
    var msg = state.phase === 'focus'
      ? 'Break over! Time to focus. 🎯'
      : 'Focus session complete! Take a break. ☕';
    try {
      new Notification('Study Metrics', {
        body: msg, icon: '/images/favicon.svg',
        badge: '/images/icon-192.png', tag: 'sm-pomodoro', renotify: true
      });
    } catch (e) {}
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    /* Sync inputs from saved settings */
    var fi = $('#pomFocus'), si = $('#pomShort'), li = $('#pomLong');
    if (fi) fi.value = settings.focus;
    if (si) si.value = settings.short;
    if (li) li.value = settings.long;

    /* Inject notification button after stats section if not already in HTML */
    if (!$('#pomNotifBtn')) {
      var stats = $('#pomStats');
      if (stats) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'margin-top:var(--s5,16px);display:flex;justify-content:center';
        wrap.innerHTML = '<button id="pomNotifBtn" class="btn btn-ghost" type="button" style="font-size:var(--step-sm,13px)">🔔 Enable Session Notifications</button>';
        stats.parentNode.insertBefore(wrap, stats.nextSibling);
      }
    }

    /* Wire buttons */
    var sb = $('#pomStart'), pb = $('#pomPause'), rb = $('#pomReset'), nb = $('#pomNotifBtn');
    if (sb) sb.addEventListener('click', startTimer);
    if (pb) pb.addEventListener('click', pauseTimer);
    if (rb) rb.addEventListener('click', resetTimer);
    if (nb) nb.addEventListener('click', requestNotifPermission);

    /* Duration inputs */
    ['#pomFocus', '#pomShort', '#pomLong'].forEach(function (sel) {
      var el = $(sel); if (!el) return;
      el.addEventListener('change', function () {
        settings.focus = parseInt($('#pomFocus').value) || 25;
        settings.short = parseInt($('#pomShort').value) || 5;
        settings.long  = parseInt($('#pomLong').value)  || 15;
        saveSettings(settings);
        if (!state.running) resetTimer();
      });
    });

    /* Keyboard shortcuts */
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); state.running ? pauseTimer() : startTimer(); }
      if (e.code === 'KeyR')  resetTimer();
    });

    /* Resume and render */
    resumeFromStorage();
    if (state.remaining === null) state.remaining = getFocusSec();
    updateDisplay();
  });

  /* Save running state on unload */
  window.addEventListener('pagehide', function () {
    if (state.running) saveState(state);
    document.title = 'Study Metrics';
  });

})();
