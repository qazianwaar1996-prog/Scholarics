/**
 * StudyMetrics AI — frontend API client.
 *
 * Talks ONLY to our own backend (/api/ai/*). The Gemini key never appears in
 * the browser — every request is proxied through the server.
 *
 * Backward compatible: SMAI.send(history, onSuccess, onError) still works for
 * the AI Tutor / dashboard assistant (now hitting /api/ai/chat).
 * New Promise-based helpers are added for the other endpoints.
 */
(function () {
  'use strict';

  var BASE = '/api/ai';

  /** Core request helper -> Promise that resolves to parsed JSON or rejects. */
  function request(path, body) {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (result) {
      if (!result.ok) {
        var msg = (result.data && result.data.error) || ('Request failed (' + result.status + ').');
        var err = new Error(msg);
        err.status = result.status;
        throw err;
      }
      return result.data;
    });
  }

  window.SMAI = {
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
