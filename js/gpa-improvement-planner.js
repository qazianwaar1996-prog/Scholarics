(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_gip";
function compute(){
  var cur=parseFloat($('#giCurrent').value);
  var tgt=parseFloat($('#giTarget').value);
  var earned=parseFloat($('#giCreditsEarned').value);
  var left=parseFloat($('#giCreditsLeft').value);
  store.set(KEY,{cur:$('#giCurrent').value,tgt:$('#giTarget').value,earned:$('#giCreditsEarned').value,left:$('#giCreditsLeft').value});
  var reqOut=$('#giRequired'), subOut=$('#giSubOut'), gapOut=$('#giGap'), diffOut=$('#giDifficulty'), verdict=$('#giVerdict');
  if([cur,tgt,earned,left].some(isNaN)){
    if(reqOut) reqOut.textContent='—'; return;
  }
  var total=earned+left;
  var req=round((tgt*total - cur*earned)/left,2);
  var gap=round(tgt-cur,2);
  if(reqOut) reqOut.textContent=req>4?'>4.0 (impossible)':req<=0?'Already achieved':req.toFixed(2);
  if(gapOut) gapOut.textContent=(gap>0?'+':'')+gap;
  if(subOut) subOut.textContent=req<=0?'Target already met!':req>4?'Not achievable — adjust target':'needed average per remaining credit';
  var diff='',cls='info';
  if(req<=0){diff='Already done';cls='ok';}
  else if(req<=3.0){diff='Moderate';cls='ok';}
  else if(req<=3.5){diff='Challenging';cls='info';}
  else if(req<=4.0){diff='Very hard';cls='warn';}
  else{diff='Impossible';cls='bad';}
  if(diffOut) diffOut.textContent=diff;
  if(verdict){
    var msgs={ok:'You are on track. Maintain your current pace or better.',info:'Requires consistent strong performance across remaining credits.',warn:'Near-perfect grades needed every semester. Maximise every credit.',bad:'This target cannot be reached mathematically. Consider lowering your target or exploring grade replacement options.'};
    var titles={ok:'Achievable',info:'Requires effort',warn:'Very demanding',bad:'Not reachable'};
    verdict.className='verdict '+cls;
    verdict.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><b>'+(titles[cls]||'')+'</b> '+(msgs[cls]||'')+'</div>';
  }
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){['#giCurrent','#giTarget','#giCreditsEarned','#giCreditsLeft'].forEach(function(s,i){var e=$(s);if(e){var keys=['cur','tgt','earned','left'];e.value=saved[keys[i]]||'';}});}
  ['#giCurrent','#giTarget','#giCreditsEarned','#giCreditsLeft'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#giReset');
  if(rs){rs.onclick=function(){['#giCurrent','#giTarget','#giCreditsEarned','#giCreditsLeft'].forEach(function(s){var e=$(s);if(e)e.value='';});store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#giShare');
  if(sh){sh.onclick=function(){var v=$('#giRequired');if(!v||v.textContent==='—')return SM.toast('Enter data first','info');SM.copy('I need a '+v.textContent+' GPA for my remaining credits to reach my target — Study Metrics');};}
  compute();
});
})();