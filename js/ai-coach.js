(function () {
  'use strict';
  var page = location.pathname.split('/').pop() || '';
  if (page !== 'ai.html' && page !== '') return;
  var COACH_TOPICS = [
    {
      id:    'gpa',
      label: 'GPA Improvement',
      icon:  '📈',
      desc:  'Raise your GPA with a personalised plan',
      suggestions: [
        'My GPA is 2.8 and I want to reach 3.5. I have 60 credits remaining. What do I need?',
        'Which courses should I retake to improve my GPA the most?',
        'I failed 2 courses this semester. How do I recover my GPA?',
        'What GPA do I need this semester to graduate with honours?'
      ],
      tools: [
        { name: 'GPA Improvement Planner', url: 'gpa-improvement-planner.html' },
        { name: 'Target GPA Calculator',   url: 'target-gpa.html' },
        { name: 'GPA Calculator',          url: 'gpa.html' },
        { name: 'CGPA Calculator',         url: 'cgpa.html' }
      ]
    },
    {
      id:    'study',
      label: 'Study Planning',
      icon:  '📚',
      desc:  'Build an evidence-based study schedule',
      suggestions: [
        'Create a 4-week study plan for 3 exams: Maths, Biology, and History.',
        'I can study 2 hours a day. How should I split my time across 5 subjects?',
        'What is the best study technique for memorising large amounts of content?',
        'I keep procrastinating — how do I actually start studying?'
      ],
      tools: [
        { name: 'Study Schedule Builder', url: 'study-schedule.html' },
        { name: 'Study Time Calculator',  url: 'study-time.html' },
        { name: 'Pomodoro Timer',         url: 'pomodoro.html' }
      ]
    },
    {
      id:    'exam',
      label: 'Exam Prep',
      icon:  '✍️',
      desc:  'Targeted strategies for upcoming exams',
      suggestions: [
        'My final exam is in 3 days. What should I do right now?',
        'How do I revise effectively for a multiple-choice exam?',
        'Give me a checklist for preparing for my maths final.',
        'I get very anxious in exams. How can I manage it?'
      ],
      tools: [
        { name: 'Final Exam Calculator',    url: 'final-exam-calculator.html' },
        { name: 'Final Grade Calculator',   url: 'final-grade.html' },
        { name: 'Required Marks Calculator', url: 'required-marks.html' },
        { name: 'Grade Predictor',          url: 'grade-predictor.html' }
      ]
    },
    {
      id:    'time',
      label: 'Time Management',
      icon:  '⏱️',
      desc:  'Prioritise tasks and protect study time',
      suggestions: [
        'I work part-time 20 hours a week and take 5 courses. Help me manage my time.',
        'I always run out of time in exams — how do I practise time management?',
        'How should I use Sunday to prepare for a productive study week?',
        'I have 6 deadlines this week. Help me prioritise.'
      ],
      tools: [
        { name: 'Study Schedule Builder', url: 'study-schedule.html' },
        { name: 'Pomodoro Timer',         url: 'pomodoro.html' },
        { name: 'Study Time Calculator',  url: 'study-time.html' }
      ]
    },
    {
      id:    'subject',
      label: 'Subject Strategies',
      icon:  '🎯',
      desc:  'Subject-specific study techniques',
      suggestions: [
        'I struggle with Calculus. What are the best ways to study maths?',
        'How should I study for an essay-based History exam?',
        'Give me a study strategy for Organic Chemistry.',
        'I need to improve my essay writing for my English Literature course.'
      ],
      tools: [
        { name: 'Grade Calculator',         url: 'grade-calculator.html' },
        { name: 'Assignment Weight Calc',   url: 'assignment-weight.html' },
        { name: 'Study Guides',             url: 'study-guides.html' }
      ]
    },
    {
      id:    'country',
      label: 'Country Guidance',
      icon:  '🌍',
      desc:  'Grading systems & academic norms worldwide',
      suggestions: [
        'Explain how the UK degree classification system works (First, 2:1, 2:2).',
        'I have a 7.8 CGPA in India — what is my equivalent GPA in the US?',
        'What GPA do I need to get into a Canadian university for grad school?',
        'How does the Australian grading system (HD, D, C, P) map to GPA?'
      ],
      tools: [
        { name: 'GPA Converter',          url: 'gpa-converter.html' },
        { name: 'Percentage to GPA',      url: 'percentage-to-gpa.html' },
        { name: 'Grading Guide',          url: 'grading-guide.html' },
        { name: 'GPA Help Center',        url: 'gpa-help-center.html' }
      ]
    }
  ];
  var activeTopic = null;
  function buildTopicSelector() {
    var wrap = document.createElement('div');
    wrap.className = 'coach-topics';
    wrap.setAttribute('role', 'tablist');
    wrap.setAttribute('aria-label', 'Academic coaching topics');
    COACH_TOPICS.forEach(function (topic) {
      var btn = document.createElement('button');
      btn.className = 'coach-topic-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('data-topic', topic.id);
      btn.innerHTML =
        '<span class="coach-topic-icon" aria-hidden="true">' + topic.icon + '</span>' +
        '<span class="coach-topic-label">' + topic.label + '</span>';
      btn.addEventListener('click', function () {
        selectTopic(topic.id, btn);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }
  function selectTopic(id, clickedBtn) {
    activeTopic = id;
    var topic = COACH_TOPICS.find(function (t) { return t.id === id; });
    if (!topic) return;
    document.querySelectorAll('.coach-topic-btn').forEach(function (b) {
      var active = b.getAttribute('data-topic') === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    updateSuggestions(topic.suggestions);
    updateSidebarTools(topic.tools);
    updateCoachCard(topic);
  }
  function updateSuggestions(suggestions) {
    var container = document.querySelector('.chat-suggestions');
    if (!container) return;
    container.innerHTML = '';
    suggestions.forEach(function (q) {
      var btn = document.createElement('button');
      btn.className = 'chat-suggestion';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('data-q', q);
      btn.textContent = q;
      btn.addEventListener('click', function () {
        document.dispatchEvent(new CustomEvent('smai:send', { detail: { text: q } }));
      });
      container.appendChild(btn);
    });
  }
  function updateSidebarTools(tools) {
    var rail = document.querySelector('.ai-tool-links');
    if (!rail) return;
    var links = rail.querySelectorAll('a.ai-tool-link');
    links.forEach(function (a) { a.style.display = 'none'; });
    var existing = rail.querySelector('.coach-tool-links');
    if (existing) existing.remove();
    var frag = document.createDocumentFragment();
    var ul = document.createElement('div');
    ul.className = 'coach-tool-links';
    tools.forEach(function (tool) {
      var a = document.createElement('a');
      a.href = tool.url;
      a.className = 'ai-tool-link coach-injected';
      a.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><polyline points="18 17 13 12 9 16 5 12"/></svg>' +
        tool.name;
      ul.appendChild(a);
    });
    frag.appendChild(ul);
    if (!tools.length) {
      links.forEach(function (a) { a.style.display = ''; });
    }
    rail.appendChild(frag);
  }
  function updateCoachCard(topic) {
    var card = document.getElementById('coach-context-card');
    if (!card) return;
    card.innerHTML =
      '<div class="coach-card-icon">' + topic.icon + '</div>' +
      '<div class="coach-card-body">' +
        '<strong>' + topic.label + '</strong>' +
        '<p>' + topic.desc + '</p>' +
      '</div>';
    card.style.display = 'flex';
  }
  function buildCoachCard() {
    var card = document.createElement('div');
    card.id = 'coach-context-card';
    card.className = 'coach-context-card';
    card.style.display = 'none';
    return card;
  }
  function restoreSidebarLinks() {
    var rail = document.querySelector('.ai-tool-links');
    if (!rail) return;
    var injected = rail.querySelector('.coach-tool-links');
    if (injected) injected.remove();
    rail.querySelectorAll('a.ai-tool-link:not(.coach-injected)').forEach(function (a) {
      a.style.display = '';
    });
  }
  document.addEventListener('smai:send', function (e) {
    var text = e.detail && e.detail.text;
    if (!text) return;
    var ta  = document.getElementById('chat-textarea');
    var btn = document.getElementById('chat-send-btn');
    if (ta && btn) {
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      btn.click();
    }
  });
  function init() {
    var chatWindow = document.querySelector('.chat-window');
    if (chatWindow) {
      var topicBar = buildTopicSelector();
      chatWindow.parentNode.insertBefore(topicBar, chatWindow);
    }
    var rail = document.querySelector('.ai-rail');
    if (rail) {
      var proTip = rail.querySelector('.ai-info-card:last-child');
      var card = buildCoachCard();
      if (proTip) {
        rail.insertBefore(card, proTip);
      } else {
        rail.appendChild(card);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();