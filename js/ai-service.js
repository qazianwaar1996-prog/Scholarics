/**
 * Scholarics AI — frontend API client.
 *
 * Talks ONLY to our own backend (/api/ai/*). The Gemini key never appears in
 * the browser — every request is proxied through the server.
 *
 * Backward compatible: SCAI.send(history, onSuccess, onError) still works for
 * the AI Tutor / dashboard assistant (now hitting /api/ai/chat).
 * New Promise-based helpers are added for the other endpoints.
 */
(function () {
  'use strict';

  var BASE = '/api/ai';

  /* Anonymous device id for the free daily AI allowance. Provided by SC
     (js/script.js); the server also falls back to a hashed IP bucket, so the
     header is a hint only and is never trusted on its own. */
  function visitorId() {
    try {
      if (window.SC && typeof SC.visitorId === 'function') return SC.visitorId();
      return localStorage.getItem('sc_vid') || '';
    } catch (e) { return ''; }
  }

  /** Remaining free runs from the most recent response, for UI hints. */
  var quota = { tool: null, toolRemaining: null, global: null, globalRemaining: null };

  function readQuota(res) {
    function num(name) {
      var v = res.headers.get(name);
      if (v === null || v === '') return null;
      var n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }
    var t = num('X-AI-Quota-Tool');
    if (t === null) return;
    quota = {
      tool: t,
      toolRemaining: num('X-AI-Quota-Tool-Remaining'),
      global: num('X-AI-Quota-Global'),
      globalRemaining: num('X-AI-Quota-Global-Remaining')
    };
    try {
      document.dispatchEvent(new CustomEvent('sc:ai-quota', { detail: quota }));
    } catch (e) {}
  }

  /** Core request helper -> Promise that resolves to parsed JSON or rejects. */
  function request(path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var vid = visitorId();
    if (vid) headers['X-SC-Visitor'] = vid;

    return fetch(BASE + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {})
    }).then(function (res) {
      readQuota(res);
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (result) {
      if (!result.ok) {
        var msg = (result.data && result.data.error) || ('Request failed (' + result.status + ').');
        var err = new Error(msg);
        err.status = result.status;
        /* Limit / availability info so a caller can show the right UI state
           without ever surfacing backend or provider details. */
        err.quota = (result.data && result.data.quota) || null;
        err.aiDisabled = !!(result.data && result.data.aiDisabled);
        throw err;
      }
      return result.data;
    });
  }

  window.SCAI = {
    /* ── AI Tutor (multi-turn chat) — callback API for existing callers ── */
    send: function (history, onSuccess, onError) {
      request('/chat', { messages: history })
        .then(function (data) {
          if (!data || !data.reply) throw new Error('Empty response from AI. Please try again.');
          onSuccess(data.reply);
        })
        .catch(function (err) { onError(err.message || 'Something went wrong. Please try again.'); });
    },

    /* ── Promise-based API (for new/optional integrations) ── */
    request: request,

    /** Remaining free AI runs reported by the last response (may be nulls). */
    quota: function () { return quota; },

    chat: function (messages, opts) {
      return request('/chat', Object.assign({ messages: messages }, opts || {}));
    },

    paraphrase: function (payload) {
      return request('/paraphrase', payload).then(function (d) { return d.reply; });
    },

    studyPlan: function (payload) {
      return request('/study-plan', payload).then(function (d) { return d.plan; });
    },

    flashcards: function (payload) {
      return request('/flashcards', payload).then(function (d) { return d.flashcards; });
    },

    quiz: function (payload) {
      return request('/quiz', payload).then(function (d) { return d.quiz; });
    }
  };
})();
