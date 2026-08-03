(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_ag";
function compute(){
  var att=parseFloat($('#agAttended').value), tot=parseFloat($('#agTotal').value),
      rem=parseFloat($('#agRemaining').value)||0, req=parseFloat($('#agRequired').value)||75;
  store.set(KEY,{att:$('#agAttended').value,tot:$('#agTotal').value,rem:$('#agRemaining').value,req:$('#agRequired').value});
  var mustEl=$('#agMustAttend'),curEl=$('#agCurrentPct'),skipEl=$('#agCanSkip'),subEl=$('#agSubOut'),vEl=$('#agVerdict');
  if(isNaN(att)||isNaN(tot)||tot===0){if(mustEl) mustEl.textContent='—';return;}
  var curPct=round((att/tot)*100,1);
  var finalTotal=tot+rem;
  var needed=Math.ceil((req/100)*finalTotal-att);
  var must=Math.max(0,needed);
  var canSkip=Math.max(0,rem-must);
  if(mustEl) mustEl.textContent=must>rem?'Impossible':must;
  if(curEl) curEl.textContent=curPct+'%';
  if(skipEl) skipEl.textContent=must>rem?'0':canSkip;
  if(subEl) subEl.textContent=must===0?'Target already met!':must>rem?'Cannot reach '+req+'% — not enough classes left':'of '+rem+' remaining classes';
  if(vEl){
    var cls,t,m;
    if(curPct>=req&&rem>=0){cls='ok';t='Already compliant';m='Your current attendance meets the requirement. You can miss up to '+canSkip+' more class(es).';}
    else if(must>rem){cls='bad';t='Not achievable';m='Even attending every remaining class won\'t reach '+req+'%. Talk to your instructor.';}
    else if(must===rem){cls='warn';t='Cannot miss any more';m='You must attend all '+rem+' remaining classes to reach the target.';}
    else if(must/rem>0.8){cls='warn';t='Very tight';m='Attend '+must+' of '+rem+' remaining classes. Very little room to miss.';}
    else{cls='ok';t='Recoverable';m='Attend '+must+' of '+rem+' remaining classes to reach '+req+'%.';}
    vEl.className='verdict '+cls;
    vEl.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><b>'+t+'</b> '+m+'</div>';
  }
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){['agAttended','agTotal','agRemaining','agRequired'].forEach(function(id){var e=$('#'+id);if(e&&saved[id.slice(2).toLowerCase()]!==undefined)e.value=saved[id.slice(2).toLowerCase()]||e.value;});}
  ['#agAttended','#agTotal','#agRemaining','#agRequired'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#agReset');
  if(rs){rs.onclick=function(){['#agAttended','#agTotal','#agRemaining'].forEach(function(s){var e=$(s);if(e)e.value='';});store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#agShare');
  if(sh){sh.onclick=function(){var v=$('#agMustAttend');if(!v||v.textContent==='—')return SM.toast('Enter data first','info');SM.copy('I must attend '+v.textContent+' more classes to reach my attendance goal — Study Metrics');};}
  compute();
});
})();