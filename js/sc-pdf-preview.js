/**
 * sc-pdf-preview.js
 * Overrides jsPDF's .save() so PDFs open in a new tab for preview
 * instead of forcing an immediate download.
 * The user can then use the browser's built-in "Download" button.
 *
 * Strategy: poll for window.jspdf and wrap jsPDF.prototype.save
 * using output('blob') + URL.createObjectURL + window.open.
 * Falls back to normal save() if blob/window.open is unavailable.
 */
(function () {
  'use strict';

  function patchJsPDF(jsPDFCtor) {
    if (!jsPDFCtor || !jsPDFCtor.prototype) return;
    if (jsPDFCtor.prototype.__scPreviewPatched) return; // already patched

    var originalSave = jsPDFCtor.prototype.save;

    jsPDFCtor.prototype.save = function (filename) {
      try {
        var blob = this.output('blob');
        var url  = URL.createObjectURL(blob);
        var win  = window.open(url, '_blank');
        if (win) {
          // Revoke the object URL after 60 s to free memory
          setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          return; // success — don't fall through to download
        }
        // window.open blocked (popup blocker) — fall back to download
        originalSave.call(this, filename || 'report.pdf');
      } catch (e) {
        // Any error — fall back to original download behaviour
        originalSave.call(this, filename || 'report.pdf');
      }
    };

    jsPDFCtor.prototype.__scPreviewPatched = true;
  }

  // jsPDF is loaded lazily by the main bundle. Poll until it appears.
  var attempts = 0;
  var maxAttempts = 120; // 120 × 250ms = 30s max

  function tryPatch() {
    if (window.jspdf && window.jspdf.jsPDF) {
      patchJsPDF(window.jspdf.jsPDF);
      return;
    }
    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(tryPatch, 250);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    tryPatch();
  }
})();
