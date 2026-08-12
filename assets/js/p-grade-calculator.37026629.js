(function(){"use strict";var o=SC.$,v=SC.$$,m=SC.round,c=SC.uid,M=SC.esc,g=SC.store;function N(e){return e>=93?"A":e>=90?"A-":e>=87?"B+":e>=83?"B":e>=80?"B-":e>=77?"C+":e>=73?"C":e>=70?"C-":e>=67?"D+":e>=63?"D":e>=60?"D-":"F"}var w="sc_grade_rows",r=g.get(w,[]);r.length||(r=[{id:c(),name:"Assignments",score:90,weight:20},{id:c(),name:"Midterm",score:85,weight:30},{id:c(),name:"Final Exam",score:88,weight:50}]);function u(){var e=o("#rows");e&&(e.innerHTML=r.map(function(t){return`
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
        </div>`}).join(""),S(),b())}function S(){v(".crow").forEach(function(e){var t=e.getAttribute("data-id"),i=v("input",e);i.forEach(function(a){var s=a.getAttribute("data-f");s&&(a.oninput=function(){var n=r.find(function(f){return f.id===t});n&&(n[s]=a.value,l(),b())})})}),v("[data-del]").forEach(function(e){e.onclick=function(){var t=e.getAttribute("data-del");r=r.filter(function(i){return i.id!==t}),l(),u(),SC.toast("Item removed","info")}})}function k(e){var t=parseFloat(e.weight),i=parseFloat(e.score),a=[];return e.weight!==""&&e.weight!==void 0&&(isNaN(t)||t<0)?a.push("Weight must be 0\u2013100"):!isNaN(t)&&t>100&&a.push("Weight cannot exceed 100%"),e.score!==""&&e.score!==void 0&&(isNaN(i)||i<0)?a.push("Score must be non-negative"):!isNaN(i)&&i>200&&a.push("Score seems too large (max 200)"),a}function b(){var e=0,t=0;r.forEach(function(C){var d=parseFloat(C.weight)||0,h=parseFloat(C.score)||0;d=Math.max(0,Math.min(100,d)),h=Math.max(0,Math.min(200,h)),d>0&&(e+=d,t+=h*d)});var i=e>0?m(t/e,2):0,a=o("#gradeOut"),s=o("#gradeLetter"),n=o("#weightNote");if(a&&(a.textContent=e>0?i.toFixed(2)+"%":"\u2014"),s&&(s.textContent=e>0?N(i):"\u2014"),n)if(!e)n.className="weight-note ok",n.innerHTML="<b>Ready to calculate?</b> Add your first graded item.";else{var f=m(e,1);Math.abs(e-100)<.1?(n.className="weight-note ok",n.innerHTML="<b>Weights total 100%.</b> Your overall grade is accurate."):e<100?(n.className="weight-note warn",n.innerHTML="<b>Weights total "+f+"%.</b> This is your grade based on work done so far."):(n.className="weight-note warn",n.innerHTML="<b>Weights total "+f+"%.</b> Total exceeds 100%, please check your weights.")}}function l(){g.set(w,r)}function p(){r.push({id:c(),name:"",score:"",weight:""}),l(),u(),SC.toast("Item added","success")}document.addEventListener("DOMContentLoaded",function(){var e=o("#addRow"),t=o("#addRow2"),i=o("#clearAll");e&&(e.onclick=p),t&&(t.onclick=p),i&&(i.onclick=function(){confirm("Clear all items?")&&(r=[],l(),u(),SC.toast("Cleared all entries","info"))}),u()})})();
