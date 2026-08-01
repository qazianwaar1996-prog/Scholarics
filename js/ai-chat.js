(function () {
  'use strict';
  var history   = [];
  var isLoading = false;
  var messagesEl  = document.getElementById('chat-messages');
  var textareaEl  = document.getElementById('chat-textarea');
  var sendBtnEl   = document.getElementById('chat-send-btn');
  var clearBtnEl  = document.getElementById('chat-clear-btn');
  var statusDotEl = document.getElementById('chat-status-dot');
  var statusLblEl = document.getElementById('chat-status-label');
  var welcomeEl   = document.getElementById('chat-welcome');
  function renderMarkdown(text) {
    var s = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    s = s.replace(/```([^`]*?)```/gs, function (_, code) {
      return '<pre>' + code.trim() + '</pre>';
    });
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
    s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
    s = s.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    s = s.replace(/(<li>.*<\/li>)/s, function (m) {
      return '<ol>' + m + '</ol>';
    });
    s = s.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[^]*?<\/li>)(?!<\/[ou]l>)/g, function (m) {
      if (m.indexOf('<ol>') === -1) return '<ul>' + m + '</ul>';
      return m;
    });
    s = s.replace(/\n{2,}/g, '</p><p>');
    s = '<p>' + s + '</p>';
    s = s.replace(/(<p>[\s\S]*?<\/p>)/g, function (m) {
      return m.replace(/\n/g, '<br>');
    });
    s = s.replace(/<p>\s*<\/p>/g, '');
    return s;
  }
  function appendMessage(role, content) {
    if (welcomeEl) welcomeEl.style.display = 'none';
    var msg     = document.createElement('div');
    msg.className = 'msg ' + role;
    var isUser  = role === 'user';
    var avatarHTML = isUser
      ? '<div class="msg-avatar">U</div>'
      : '<div class="msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg></div>';
    var bubbleContent = isUser
      ? '<div class="msg-bubble">' + content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') + '</div>'
      : '<div class="msg-bubble">' + renderMarkdown(content) + '</div>';
    var actionsHTML = '';
    if (!isUser) {
      actionsHTML =
        '<div class="msg-actions">' +
          '<button class="msg-copy-btn" title="Copy response">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            'Copy' +
          '</button>' +
        '</div>';
    }
    msg.innerHTML = avatarHTML + '<div class="msg-body">' + bubbleContent + actionsHTML + '</div>';
    var copyBtn = msg.querySelector('.msg-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () { SM.copy(content); });
    }
    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  }
  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'msg assistant typing-indicator';
    typingEl.innerHTML =
      '<div class="msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg></div>' +
      '<div class="msg-body"><div class="msg-bubble">' +
        '<span class="typing-dot"></span>' +
        '<span class="typing-dot"></span>' +
        '<span class="typing-dot"></span>' +
      '</div></div>';
    messagesEl.appendChild(typingEl);
    scrollToBottom();
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
      typingEl = null;
    }
  }
  function showError(msg) {
    var el = document.createElement('div');
    el.className = 'chat-error';
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      '<span>' + msg.replace(/</g, '&lt;') + '</span>';
    messagesEl.appendChild(el);
    scrollToBottom();
  }
  function setStatus(loading) {
    if (statusDotEl) statusDotEl.className = 'chat-status-dot' + (loading ? ' loading' : '');
    if (statusLblEl) statusLblEl.textContent = loading ? 'Thinking…' : 'StudyMetrics AI Coach · Ready';
  }
  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function setInputDisabled(disabled) {
    if (textareaEl) textareaEl.disabled = disabled;
    if (sendBtnEl)  sendBtnEl.disabled  = disabled;
    if (sendBtnEl) {
      sendBtnEl.innerHTML = disabled
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
    }
  }
  function sendMessage(text) {
    if (!text || isLoading) return;
    text = text.trim();
    if (!text) return;
    isLoading = true;
    setInputDisabled(true);
    setStatus(true);
    history.push({ role: 'user', content: text });
    appendMessage('user', text);
    if (textareaEl) { textareaEl.value = ''; autoResizeTextarea(); }
    showTyping();
    window.SMAI.send(
      history,
      function (response) {
        hideTyping();
        history.push({ role: 'assistant', content: response });
        appendMessage('assistant', response);
        isLoading = false;
        setInputDisabled(false);
        setStatus(false);
        if (textareaEl) textareaEl.focus();
      },
      function (errMsg) {
        hideTyping();
        showError(errMsg);
        isLoading = false;
        setInputDisabled(false);
        setStatus(false);
        if (textareaEl) textareaEl.focus();
      }
    );
  }
  function autoResizeTextarea() {
    if (!textareaEl) return;
    textareaEl.style.height = 'auto';
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 160) + 'px';
  }
  document.querySelectorAll('.chat-suggestion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = btn.getAttribute('data-q') || btn.textContent.trim();
      sendMessage(q);
    });
  });
  if (clearBtnEl) {
    clearBtnEl.addEventListener('click', function () {
      if (!history.length) return;
      if (!confirm('Clear the conversation? This cannot be undone.')) return;
      history = [];
      messagesEl.innerHTML = '';
      if (welcomeEl) {
        welcomeEl.style.display = 'flex';
        messagesEl.appendChild(welcomeEl);
      }
      setStatus(false);
    });
  }
  if (textareaEl) {
    textareaEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(textareaEl.value);
      }
    });
    textareaEl.addEventListener('input', autoResizeTextarea);
  }
  if (sendBtnEl) {
    sendBtnEl.addEventListener('click', function () {
      if (textareaEl) sendMessage(textareaEl.value);
    });
  }
})();