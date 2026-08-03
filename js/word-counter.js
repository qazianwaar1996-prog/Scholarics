(function () {
  "use strict";
  var $ = SM.$, store = SM.store;
  var KEY = "sm_wordcount";
  document.addEventListener("DOMContentLoaded", function () {
    var editor = $("#editor");
    if (!editor) return;
    editor.value = store.get(KEY, "");
    function count() {
      var t = editor.value;
      store.set(KEY, t);
      var wordsMatch = t.trim().split(/\s+/).filter(function(word) {
        return word.length > 0;
      });
      var wordCount = wordsMatch.length;
      var charCount = t.length;
      var noSpaceCount = t.replace(/\s/g, "").length;
      var sentMatch = t.match(/[^\.!\?]+[\.!\?]+/g) || [];
      var sentCount = sentMatch.length;
      if (sentCount === 0 && t.trim().length > 0) sentCount = 1;
      var paraCount = t.split(/\n+/).filter(function(p) {
        return p.trim().length > 0;
      }).length;
      var readSec = Math.round((wordCount / 200) * 60);
      var timeStr = "0s";
      if (readSec > 0) {
        if (readSec < 60) {
          timeStr = readSec + "s";
        } else {
          timeStr = Math.floor(readSec / 60) + "m " + (readSec % 60) + "s";
        }
      }
      var longest = "";
      wordsMatch.forEach(function(word) {
        var cleanWord = word.replace(/[^\w-]/g, "");
        if (cleanWord.length > longest.length) {
          longest = cleanWord;
        }
      });
      var elWords = $("#s_words");
      var elChars = $("#s_chars");
      var elNoSpace = $("#s_nospace");
      var elSent = $("#s_sent");
      var elPara = $("#s_para");
      var elRead = $("#s_read");
      var elAvg = $("#s_avg");
      var elLong = $("#s_long");
      if (elWords) elWords.textContent = wordCount.toLocaleString();
      if (elChars) elChars.textContent = charCount.toLocaleString();
      if (elNoSpace) elNoSpace.textContent = noSpaceCount.toLocaleString();
      if (elSent) elSent.textContent = sentCount.toLocaleString();
      if (elPara) elPara.textContent = paraCount.toLocaleString();
      if (elRead) elRead.textContent = timeStr;
      if (elAvg) {
        elAvg.textContent = sentCount > 0 ? Math.round(wordCount / sentCount) : 0;
      }
      if (elLong) {
        elLong.textContent = longest ? longest + " (" + longest.length + ")" : "—";
      }
    }
    editor.addEventListener("input", count);
    var copyBtn = $("#copyBtn");
    if (copyBtn) {
      copyBtn.onclick = function () {
        if (!editor.value.trim()) {
          SM.toast("Nothing to copy", "info");
          return;
        }
        SM.copy(editor.value);
      };
    }
    var clearBtn = $("#clearBtn");
    if (clearBtn) {
      clearBtn.onclick = function () {
        if (!editor.value) return;
        if (confirm("Clear all text?")) {
          editor.value = "";
          count();
          editor.focus();
          SM.toast("Editor cleared", "info");
        }
      };
    }
    count();
  });
})();