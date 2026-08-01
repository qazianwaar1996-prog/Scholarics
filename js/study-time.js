(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_st";
function compute(){
  var cr=parseFloat($('#stCredits').value)||0;
  var mult=parseFloat($('#stMultiplier').value)||2;
  var days=Math.max(1,parseFloat($('#stDaysAvail').value)||5);
  store.set(KEY,{cr:$('#stCredits').value,mult:$('#stMultiplier').value,days:$('#stDaysAvail').value});
  var weekly=round(cr*mult,1);
  var daily=round(weekly/days,1);
  var semesterHours=round(weekly*16,0);
  var wo=$('#stWeeklyHours'),sub=$('#stSubOut'),do_=$('#stDailyHours'),so=$('#stSemesterHours');
  if(wo) wo.textContent=cr>0?weekly+'h':'—';
  if(sub) sub.textContent=cr>0?('per week · '+mult+'h per credit hr'):'Enter your credit load';
  if(do_) do_.textContent=cr>0?daily+'h':'—';
  if(so) so.textContent=cr>0?(semesterHours+'h'):'—';
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){var c=$('#stCredits');if(c)c.value=saved.cr||'15';var m=$('#stMultiplier');if(m)m.value=saved.mult||'2';var d=$('#stDaysAvail');if(d)d.value=saved.days||'5';}
  ['#stCredits','#stMultiplier','#stDaysAvail'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#stReset');
  if(rs){rs.onclick=function(){var c=$('#stCredits');if(c)c.value='15';var m=$('#stMultiplier');if(m)m.value='2';var d=$('#stDaysAvail');if(d)d.value='5';store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#stShare');
  if(sh){sh.onclick=function(){var v=$('#stWeeklyHours');if(!v||v.textContent==='—')return SM.toast('Enter credits first','info');SM.copy('I should study '+v.textContent+' per week for my '+$('#stCredits').value+'-credit load — Study Metrics');};}
  compute();
});
})();