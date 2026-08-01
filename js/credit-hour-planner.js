(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_chp";
function compute(){
  var tot=parseFloat($('#chTotal').value)||0;
  var earned=parseFloat($('#chEarned').value)||0;
  var perSem=parseFloat($('#chPerSem').value)||0;
  var semLen=parseFloat($('#chSemLen').value)||4;
  store.set(KEY,{tot:$('#chTotal').value,earned:$('#chEarned').value,perSem:$('#chPerSem').value,semLen:$('#chSemLen').value});
  var remaining=Math.max(0,tot-earned);
  var semsLeft=perSem>0?Math.ceil(remaining/perSem):0;
  var months=semsLeft*semLen;
  var pct=tot>0?round((earned/tot)*100,1):0;
  var semOut=$('#chSemOut'), timeOut=$('#chTimeOut'), remOut=$('#chRemaining'), progOut=$('#chProgress');
  var verdict=$('#chVerdict');
  if(semOut) semOut.textContent=remaining>0?(semsLeft||'—'):'0';
  if(timeOut) timeOut.textContent=remaining===0?'Degree complete!':(months>0?(months+' months remaining'):'Enter details above');
  if(remOut) remOut.textContent=remaining;
  if(progOut) progOut.textContent=pct+'%';
  if(verdict&&tot>0&&earned>=0&&perSem>0){
    var v;
    if(earned>=tot){v={cls:'ok',t:'Degree Complete!',m:'You have earned all required credits. Congratulations!'};}
    else if(semsLeft<=2){v={cls:'ok',t:'Almost there',m:'Just '+semsLeft+' semester(s) left. Keep your current pace.'};}
    else if(semsLeft<=4){v={cls:'info',t:'On track',m:semsLeft+' semesters remaining at '+perSem+' credits/semester.'};}
    else{v={cls:'warn',t:'Long road ahead',m:semsLeft+' semesters remaining. Consider increasing credits per semester if possible.'};}
    verdict.className='verdict '+v.cls;
    verdict.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><b>'+v.t+'</b> '+v.m+'</div>';
  }
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){['chTotal','chEarned','chPerSem','chSemLen'].forEach(function(id){var e=$(('#'+id));if(e&&saved[id.replace('ch','').toLowerCase()!==undefined])e.value=saved[id.slice(2).toLowerCase()]||e.value;});}
  ['#chTotal','#chEarned','#chPerSem','#chSemLen'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#chReset');
  if(rs){rs.onclick=function(){store.set(KEY,null);location.reload();};}
  var sh=$('#chShare');
  if(sh){sh.onclick=function(){var s=$('#chSemOut');if(!s||s.textContent==='—')return SM.toast('Enter details first','info');SM.copy('I have '+$('#chRemaining').textContent+' credits left and '+s.textContent+' semesters to go — Study Metrics');};}
  compute();
});
})();