(function(){"use strict";var o=SC.$,h=SC.$$,m=SC.round,c=SC.uid,M=SC.esc,g=SC.store;function N(e){return e>=93?"A":e>=90?"A-":e>=87?"B+":e>=83?"B":e>=80?"B-":e>=77?"C+":e>=73?"C":e>=70?"C-":e>=67?"D+":e>=63?"D":e>=60?"D-":"F"}var w="sc_grade_rows",r=g.get(w,[]);r.length||(r=[{id:c(),name:"Assignments",score:90,weight:20},{id:c(),name:"Midterm",score:85,weight:30},{id:c(),name:"Final Exam",score:88,weight:50}]);function u(){var e=o("#rows");e&&(e.innerHTML=r.map(function(t){return`
        <div class="crow" data-id="${t.id}">
          <div class="c-name">
            <input class="input" data-f="name" value="${M(t.name)}" placeholder="Item name">
          </div>
          <div class="c-a">
            <input class="input tnum" data-f="score" type="number" min="0" step="0.1" value="${t.score}" placeholder="Score %">
          </div>
          <div class="c-b">
            <input class="input tnum" data-f="weight" type="number" min="0" step="0.5" value="${t.weight}" placeholder="Weight %">
          </div>
          <div class="c-del">
            <button class="row-del" data-del="${t.id}" title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>`}).join(""),S(),b())}function S(){h(".crow").forEach(function(e){var t=e.getAttribute("data-id"),a=h("input",e);a.forEach(function(i){var s=i.getAttribute("data-f");s&&(i.oninput=function(){var n=r.find(function(f){return f.id===t});n&&(n[s]=i.value,l(),b())})})}),h("[data-del]").forEach(function(e){e.onclick=function(){var t=e.getAttribute("data-del");r=r.filter(function(a){return a.id!==t}),l(),u(),SC.toast("Item removed","info")}})}function k(e){var t=parseFloat(e.weight),a=parseFloat(e.score),i=[];return e.weight!==""&&e.weight!==void 0&&(isNaN(t)||t<0)?i.push("Weight must be 0\u2013100"):!isNaN(t)&&t>100&&i.push("Weight cannot exceed 100%"),e.score!==""&&e.score!==void 0&&(isNaN(a)||a<0)?i.push("Score must be non-negative"):!isNaN(a)&&a>200&&i.push("Score seems too large (max 200)"),i}function b(){var e=0,t=0;r.forEach(function(C){var d=parseFloat(C.weight)||0,v=parseFloat(C.score)||0;d=Math.max(0,Math.min(100,d)),v=Math.max(0,Math.min(200,v)),d>0&&(e+=d,t+=v*d)});var a=e>0?m(t/e,2):0,i=o("#gradeOut"),s=o("#gradeLetter"),n=o("#weightNote");if(i&&(i.textContent=e>0?a.toFixed(2)+"%":"\u2014"),s&&(s.textContent=e>0?N(a):"\u2014"),n)if(!e)n.className="weight-note ok",n.innerHTML="<b>Ready to calculate?</b> Add your first graded item.";else{var f=m(e,1);Math.abs(e-100)<.1?(n.className="weight-note ok",n.innerHTML="<b>Weights total 100%.</b> Your overall grade is accurate."):e<100?(n.className="weight-note warn",n.innerHTML="<b>Weights total "+f+"%.</b> This is your grade based on work done so far."):(n.className="weight-note warn",n.innerHTML="<b>Weights total "+f+"%.</b> Total exceeds 100%, please check your weights.")}}function l(){g.set(w,r)}function p(){r.push({id:c(),name:"",score:"",weight:""}),l(),u(),SC.toast("Item added","success")}document.addEventListener("DOMContentLoaded",function(){var e=o("#addRow"),t=o("#addRow2"),a=o("#clearAll"),i=o("#shareBtn");e&&(e.onclick=p),t&&(t.onclick=p),a&&(a.onclick=function(){confirm("Clear all items?")&&(r=[],l(),u(),SC.toast("Cleared all entries","info"))}),u()})})();
