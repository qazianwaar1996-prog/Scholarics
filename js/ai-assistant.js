(function () {
  'use strict';
  var CALCULATORS = {
    'gpa.html': function () {
      var gpa     = text('#gpaOut')  || text('.gpa-big');
      var letter  = text('#gpaLetter');
      var courses = text('#mCourses');
      var credits = text('#mCredits');
      if (!gpa || gpa === '0.00') return null;
      return {
        title: 'GPA Calculator Result',
        summary: 'GPA: ' + gpa + ' (' + (letter || 'N/A') + ') across ' + (courses || '?') + ' courses, ' + (credits || '?') + ' credit hours.',
        details: [
          'GPA value: ' + gpa + ' out of 4.0',
          'Nearest letter grade: ' + (letter || 'unknown'),
          'Number of courses: ' + (courses || '?'),
          'Total credit hours: ' + (credits || '?')
        ]
      };
    },
    'semester-gpa.html': function () {
      var gpa     = text('#sgOut') || text('#gpaOut') || text('.gpa-big');
      var letter  = text('#sgLetter') || text('#gpaLetter');
      var courses = text('#sgCourses') || text('#mCourses');
      var credits = text('#sgCredits') || text('#mCredits');
      if (!gpa || gpa === '0.00') return null;
      return {
        title: 'Semester GPA Result',
        summary: 'Semester GPA: ' + gpa + ' / 4.0 across ' + (courses || '?') + ' courses (' + (credits || '?') + ' credits).',
        details: [
          'Semester GPA: ' + gpa,
          'Letter classification: ' + (letter || 'N/A'),
          'Courses this semester: ' + (courses || '?'),
          'Total credits: ' + (credits || '?')
        ]
      };
    },
    'cgpa.html': function () {
      var cgpa    = text('#cgpaOut') || text('.gpa-big');
      var cls     = text('#cgpaClass') || text('.gpa-sub');
      var sems    = text('#mSem');
      var credits = text('#mCredits');
      if (!cgpa || cgpa === '0.00') return null;
      return {
        title: 'CGPA (Cumulative GPA) Result',
        summary: 'CGPA: ' + cgpa + ' / 4.0 — ' + (cls || '') + '. Across ' + (sems || '?') + ' semesters, ' + (credits || '?') + ' total credits.',
        details: [
          'Cumulative GPA (CGPA): ' + cgpa + ' out of 4.0',
          'Academic standing: ' + (cls || 'N/A'),
          'Semesters included: ' + (sems || '?'),
          'Total credits earned: ' + (credits || '?')
        ]
      };
    },
    'gpa-converter.html': function () {
      var gpa     = text('#gpaOut');
      var country = text('#refBadge') || attr('.country-select', 'value') || 'unknown country';
      var courses = text('#mCourses');
      var credits = text('#mCredits');
      var qp      = text('#mQp');
      if (!gpa) return null;
      return {
        title: 'Global GPA Converter Result',
        summary: 'Converted GPA: ' + gpa + ' / 4.0 (US scale). Source grading system: ' + country + '.',
        details: [
          'Converted US GPA: ' + gpa + ' / 4.0',
          'Source country / grading system: ' + country,
          'Courses: ' + (courses || '?'),
          'Total credits: ' + (credits || '?'),
          'Total quality points: ' + (qp || '?')
        ]
      };
    },
    'target-gpa.html': function () {
      var need  = text('#need');
      var sub   = text('#needSub');
      var vText = text('#verdictText');
      if (!need || need === '—') return null;
      return {
        title: 'Target GPA Result',
        summary: 'Required average GPA in remaining credits: ' + need + ' (' + (sub || '') + ').',
        details: [
          'GPA needed in remaining credits: ' + need,
          'Status: ' + (sub || ''),
          'Verdict: ' + (vText || '')
        ]
      };
    },
    'gpa-improvement-planner.html': function () {
      var req   = text('#giRequired');
      var sub   = text('#giSubOut');
      var gap   = text('#giGap');
      var diff  = text('#giDifficulty');
      if (!req || req === '—') return null;
      return {
        title: 'GPA Improvement Planner Result',
        summary: 'Required GPA for remaining credits: ' + req + '. Difficulty: ' + (diff || '') + '. Gap to target: ' + (gap || '') + '.',
        details: [
          'Required average for remaining credits: ' + req,
          'Status: ' + (sub || ''),
          'Gap between current and target GPA: ' + (gap || ''),
          'Difficulty assessment: ' + (diff || '')
        ]
      };
    },
    'grade-calculator.html': function () {
      var grade  = text('#gradeOut');
      var letter = text('#gradeLetter');
      var note   = text('#weightNote');
      if (!grade || grade === '—') return null;
      return {
        title: 'Grade Calculator Result',
        summary: 'Weighted course grade: ' + grade + ' (' + (letter || '') + ').',
        details: [
          'Overall weighted grade: ' + grade,
          'Letter grade: ' + (letter || 'N/A'),
          'Weight note: ' + (note || '')
        ]
      };
    },
    'final-exam-calculator.html': function () {
      var need   = text('#feNeedOut');
      var letter = text('#feLetterOut');
      var sub    = text('#feSubOut');
      if (!need || need === '—') return null;
      return {
        title: 'Final Exam Score Needed',
        summary: 'Score needed on final exam: ' + need + ' (' + (letter || '') + '). ' + (sub || '') + '.',
        details: [
          'Score required on final exam: ' + need,
          'Letter grade of that score: ' + (letter || 'N/A'),
          'Context: ' + (sub || '')
        ]
      };
    },
    'final-grade.html': function () {
      var need  = text('#need');
      var sub   = text('#needSub') || text('#verdictText');
      if (!need || need === '—') return null;
      return {
        title: 'Final Grade Calculator Result',
        summary: 'Score needed on final: ' + need + '%. ' + (sub || '') + '.',
        details: [
          'Required final exam score: ' + need + '%',
          'Verdict: ' + (sub || '')
        ]
      };
    },
    'percentage-to-gpa.html': function () {
      var gpa    = text('#p2gOut');
      var letter = text('#p2gLetter');
      var scale  = text('#p2gScaleName');
      var cls    = text('#p2gClass');
      var pct    = val('#p2gPct');
      if (!gpa || gpa === '—') return null;
      return {
        title: 'Percentage to GPA Conversion',
        summary: pct + '% converts to ' + gpa + ' GPA (' + (letter || '') + ') on the ' + (scale || '') + ' scale. Classification: ' + (cls || '') + '.',
        details: [
          'Input percentage: ' + (pct || '?') + '%',
          'Converted GPA: ' + gpa,
          'Letter grade: ' + (letter || 'N/A'),
          'Grading scale used: ' + (scale || 'US 4.0'),
          'Classification: ' + (cls || '')
        ]
      };
    },
    'gpa-to-percentage.html': function () {
      var pct    = text('#g2pOut');
      var letter = text('#g2pLetter') || text('#g2pGrade');
      var scale  = text('#g2pScaleName') || text('#g2pScale');
      if (!pct || pct === '—') return null;
      return {
        title: 'GPA to Percentage Conversion',
        summary: 'GPA converts to approximately ' + pct + '% (' + (letter || '') + ') on the ' + (scale || '') + ' scale.',
        details: [
          'Converted percentage: ' + pct,
          'Grade: ' + (letter || 'N/A'),
          'Scale: ' + (scale || '')
        ]
      };
    },
    'attendance-calculator.html': function () {
      var pct     = text('#pct');
      var status  = text('#status');
      var verdict = text('#verdictText');
      var req     = val('#req');
      var attended = val('#attended');
      var held    = val('#held');
      if (!pct || pct === '—') return null;
      return {
        title: 'Attendance Calculator Result',
        summary: 'Attendance: ' + pct + ' (required: ' + (req || '?') + '%). Attended ' + (attended || '?') + ' of ' + (held || '?') + ' classes. Status: ' + (status || '') + '.',
        details: [
          'Attendance percentage: ' + pct,
          'Required minimum: ' + (req || '?') + '%',
          'Classes attended: ' + (attended || '?'),
          'Total classes held: ' + (held || '?'),
          'Status: ' + (status || ''),
          'Verdict: ' + (verdict || '')
        ]
      };
    },
    'attendance-percentage.html': function () {
      var pct = text('#apOut') || text('#attendPct');
      if (!pct || pct === '—') return null;
      return {
        title: 'Attendance Percentage Result',
        summary: 'Calculated attendance: ' + pct + '.',
        details: ['Attendance percentage: ' + pct]
      };
    },
    'attendance-goal.html': function () {
      var out  = text('#agOut') || text('#goalOut');
      var sub  = text('#agSub') || text('#goalSub');
      if (!out || out === '—') return null;
      return {
        title: 'Attendance Goal Result',
        summary: out + '. ' + (sub || '') + '.',
        details: ['Result: ' + out, 'Detail: ' + (sub || '')]
      };
    },
    'required-marks.html': function () {
      var req  = text('#rmReqOut') || text('#rmRequired');
      var sub  = text('#rmSub') || text('#rmSubtext');
      var pct  = text('#rmTargetPct') || val('#rmTarget');
      if (!req || req === '—') return null;
      return {
        title: 'Required Marks Calculator',
        summary: 'Marks needed per remaining subject: ' + req + '. Target: ' + (pct || '?') + '%.',
        details: [
          'Required marks per subject: ' + req,
          'Target overall percentage: ' + (pct || '?') + '%',
          'Note: ' + (sub || '')
        ]
      };
    },
    'assignment-weight.html': function () {
      var out   = text('#awOut') || text('#weightedOut');
      var grade = text('#awGrade') || text('#awLetter');
      if (!out || out === '—') return null;
      return {
        title: 'Assignment Weight Calculator',
        summary: 'Weighted score: ' + out + ' (' + (grade || '') + ').',
        details: [
          'Weighted result: ' + out,
          'Letter grade: ' + (grade || 'N/A')
        ]
      };
    },
    'class-average.html': function () {
      var avg   = text('#caOut') || text('#avgOut');
      var high  = text('#caHigh') || text('#highest');
      var low   = text('#caLow') || text('#lowest');
      if (!avg || avg === '—') return null;
      return {
        title: 'Class Average Result',
        summary: 'Class average: ' + avg + '. Highest: ' + (high || '?') + ', Lowest: ' + (low || '?') + '.',
        details: [
          'Class average: ' + avg,
          'Highest score: ' + (high || '?'),
          'Lowest score: ' + (low || '?')
        ]
      };
    },
    'grade-predictor.html': function () {
      var pred   = text('#gpPredOut') || text('#predOut');
      var letter = text('#gpPredLetter') || text('#predLetter');
      if (!pred || pred === '—') return null;
      return {
        title: 'Grade Predictor Result',
        summary: 'Predicted final grade: ' + pred + ' (' + (letter || '') + ').',
        details: [
          'Predicted grade: ' + pred,
          'Letter grade: ' + (letter || 'N/A')
        ]
      };
    },
    'credit-hour-planner.html': function () {
      var total = text('#chTotal') || text('#creditTotal');
      var rem   = text('#chRemaining') || text('#creditRem');
      if (!total) return null;
      return {
        title: 'Credit Hour Planner Result',
        summary: 'Total credits planned: ' + (total || '?') + '. Remaining to graduation: ' + (rem || '?') + '.',
        details: [
          'Total credits planned: ' + (total || '?'),
          'Remaining credits: ' + (rem || '?')
        ]
      };
    },
    'study-time.html': function () {
      var out = text('#stOut') || text('#studyTimeOut');
      var sub = text('#stSub');
      if (!out || out === '—') return null;
      return {
        title: 'Study Time Calculator Result',
        summary: 'Recommended study time: ' + out + '. ' + (sub || '') + '.',
        details: ['Recommended hours: ' + out, 'Note: ' + (sub || '')]
      };
    },
    'study-schedule.html': function () {
      var subjects = SM.$$('.ss-subject-name, .sched-subject').map(function (el) { return el.textContent.trim(); }).filter(Boolean).slice(0, 6);
      if (!subjects.length) return null;
      return {
        title: 'Study Schedule Result',
        summary: 'Study schedule generated for ' + subjects.length + ' subjects: ' + subjects.join(', ') + '.',
        details: ['Subjects: ' + subjects.join(', ')]
      };
    },
    'percentage-calculator.html': function () {
      var out = text('#pcOut') || text('#percentOut');
      if (!out || out === '—') return null;
      return {
        title: 'Percentage Calculator Result',
        summary: 'Result: ' + out + '.',
        details: ['Calculated value: ' + out]
      };
    }
  };
  function text(sel) {
    var el = document.querySelector(sel);
    return el ? el.textContent.trim() : null;
  }
  function val(sel) {
    var el = document.querySelector(sel);
    return el ? el.value.trim() : null;
  }
  function attr(sel, a) {
    var el = document.querySelector(sel);
    return el ? el.getAttribute(a) : null;
  }
  function renderMD(text) {
    var s = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    s = s.replace(/```([^`]*?)```/gs, function(_, c){ return '<pre>' + c.trim() + '</pre>'; });
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    s = s.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[^]*?<\/li>)/g, function(m){ return '<ul>' + m + '</ul>'; });
    s = s.replace(/\n{2,}/g, '</p><p>');
    s = '<p>' + s + '</p>';
    s = s.replace(/(<p>[\s\S]*?<\/p>)/g, function(m){ return m.replace(/\n/g,'<br>'); });
    s = s.replace(/<p>\s*<\/p>/g, '');
    return s;
  }
  function buildPrompt(ctx) {
    return [
      'A student has just used the StudyMetrics ' + ctx.title + ' and received these results:',
      '',
      ctx.details.map(function(d){ return '• ' + d; }).join('\n'),
      '',
      'Your job is ONLY to explain and give insight about these results.',
      'Do NOT recalculate or repeat the numbers — the calculator already did that.',
      '',
      'Please provide:',
      '1. A brief plain-English interpretation of what this result means academically',
      '2. Whether this is a strong, average, or weak result (with context)',
      '3. One or two specific, practical next steps the student should take',
      '4. If relevant, how this metric affects GPA, graduation, or academic standing',
      '',
      'Keep it concise (under 200 words), encouraging, and actionable.',
      'Format with short paragraphs or bullet points — no lengthy headers.'
    ].join('\n');
  }
  function injectButton(rail, ctx) {
    if (rail.querySelector('.ask-ai-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'ask-ai-btn';
    btn.setAttribute('aria-label', 'Ask StudyMetrics AI to explain this result');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg>' +
      '<span class="ask-ai-sparkle">✦</span> Ask AI to explain this result';
    btn.addEventListener('click', function () {
      var page  = location.pathname.split('/').pop() || 'index.html';
      var builder = CALCULATORS[page];
      var liveCtx = builder ? builder() : null;
      if (!liveCtx) {
        SM.toast('Calculate a result first, then ask AI.', 'info');
        return;
      }
      openPanel(rail, liveCtx, btn);
    });
    rail.appendChild(btn);
  }
  function openPanel(rail, ctx, triggerBtn) {
    var existing = rail.querySelector('.calc-ai-panel');
    if (existing) existing.remove();
    if (triggerBtn) triggerBtn.style.display = 'none';
    var panel = document.createElement('div');
    panel.className = 'calc-ai-panel';
    panel.innerHTML =
      '<div class="calc-ai-head">' +
        '<div class="calc-ai-head-left">' +
          '<span class="calc-ai-dot loading" id="calc-ai-dot"></span>' +
          '<span class="calc-ai-title">StudyMetrics AI — Explaining your result…</span>' +
        '</div>' +
        '<button class="calc-ai-close" aria-label="Close AI explanation" id="calc-ai-close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="calc-ai-body" id="calc-ai-body">' +
        '<div class="calc-ai-typing"><span></span><span></span><span></span></div>' +
      '</div>';
    rail.appendChild(panel);
    panel.querySelector('#calc-ai-close').addEventListener('click', function () {
      panel.remove();
      if (triggerBtn) triggerBtn.style.display = '';
    });
    var prompt = buildPrompt(ctx);
    window.SMAI.send(
      [{ role: 'user', content: prompt }],
      function (response) {
        var body = panel.querySelector('#calc-ai-body');
        var dot  = panel.querySelector('#calc-ai-dot');
        if (body) body.innerHTML = renderMD(response);
        if (dot)  dot.className = 'calc-ai-dot';
        setTitle(panel, 'StudyMetrics AI — ' + ctx.title);
        appendFooter(panel, response);
      },
      function (errMsg) {
        var body = panel.querySelector('#calc-ai-body');
        var dot  = panel.querySelector('#calc-ai-dot');
        if (body) {
          body.innerHTML =
            '<div class="calc-ai-error">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
              '<span>' + (errMsg || 'Could not get explanation. Please try again.').replace(/</g,'&lt;') + '</span>' +
            '</div>';
        }
        if (dot) dot.className = 'calc-ai-dot';
        setTitle(panel, 'StudyMetrics AI — Error');
      }
    );
  }
  function setTitle(panel, t) {
    var el = panel.querySelector('.calc-ai-title');
    if (el) el.textContent = t;
  }
  function appendFooter(panel, responseText) {
    if (panel.querySelector('.calc-ai-foot')) return;
    var foot = document.createElement('div');
    foot.className = 'calc-ai-foot';
    foot.innerHTML =
      '<button class="calc-ai-copy-btn" aria-label="Copy AI explanation">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        ' Copy explanation' +
      '</button>' +
      '<a href="ai.html" class="calc-ai-chat-link" title="Open full AI chat">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        ' Open full AI chat' +
      '</a>';
    foot.querySelector('.calc-ai-copy-btn').addEventListener('click', function () {
      SM.copy(responseText);
    });
    panel.appendChild(foot);
  }
  function init() {
    var page = location.pathname.split('/').pop() || 'index.html';
    if (!CALCULATORS[page]) return;
    var rails = SM.$$('.result-rail');
    if (!rails.length) {
      rails = SM.$$('.gpa-hero, .res-hero, .grade-hero');
    }
    if (!rails.length) return;
    rails.forEach(function (rail) {
      injectButton(rail, null);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 120);
    });
  } else {
    setTimeout(init, 120);
  }
})();