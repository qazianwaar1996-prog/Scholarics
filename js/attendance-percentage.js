(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_ap";
function compute(){
  var att=parseFloat($('#apAttended').value), tot=parseFloat($('#apTotal').value), min=parseFloat($('#apMinRequired').value)||75;
  store.set(KEY,{att:$('#apAttended').value,tot:$('#apTotal').value,min:$('#apMinRequired').value});
  var pctEl=$('#apPctOut'),statusEl=$('#apStatusOut'),absentEl=$('#apAbsent'),canMissEl=$('#apCanMiss'),vEl=$('#apVerdict');
  if(isNaN(att)||isNaN(tot)||tot===0){if(pctEl) pctEl.textContent='—';return;}
  var pct=round((att/tot)*100,1);
  var absent=Math.round(tot-att);
  var canMiss=Math.max(0,Math.floor(tot-(min/100)*tot));
  var alreadyMissed=absent;
  var stillCanMiss=Math.max(0,canMiss-alreadyMissed);
  if(pctEl) pctEl.textContent=pct+'%';
  if(absentEl) absentEl.textContent=absent;
  if(canMissEl) canMissEl.textContent=stillCanMiss;
  var meetsMin=pct>=min;
  if(statusEl) statusEl.textContent=meetsMin?'Meeting '+min+'% requirement ✓':'Below '+min+'% minimum ✗';
  if(vEl){
    var cls=meetsMin?(pct>=min+10?'ok':'info'):'bad';
    var t=meetsMin?(pct>=min+10?'Good standing':'Borderline'):'Below minimum';
    var m=meetsMin?('Your attendance is '+pct+'%. You can miss '+stillCanMiss+' more class(es) and still meet the requirement.'):'Your attendance is '+pct+'%, below the required '+min+'%. '+(stillCanMiss===0?'You cannot afford any more absences.':'Attend the next '+Math.ceil((min/100*tot)-att)+' classes without missing any.');
    vEl.className='verdict '+cls;
    vEl.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><b>'+t+'</b> '+m+'</div>';
  }
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){var a=$('#apAttended');if(a)a.value=saved.att||'';var t=$('#apTotal');if(t)t.value=saved.tot||'';var m=$('#apMinRequired');if(m)m.value=saved.min||'75';}
  ['#apAttended','#apTotal','#apMinRequired'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#apReset');
  if(rs){rs.onclick=function(){['#apAttended','#apTotal'].forEach(function(s){var e=$(s);if(e)e.value='';});store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#apShare');
  if(sh){sh.onclick=function(){var v=$('#apPctOut');if(!v||v.textContent==='—')return SM.toast('Enter data first','info');SM.copy('My attendance is '+v.textContent+' — Study Metrics');};}
  compute();
});
})();