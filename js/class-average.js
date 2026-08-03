(function(){
"use strict";
var $=SM.$, round=SM.round;
function letterGrade(p){
  if(p>=90)return'A';if(p>=80)return'B';if(p>=70)return'C';if(p>=60)return'D';return'F';
}
function parse(raw){
  return raw.split(/[\n,]+/).map(function(s){return parseFloat(s.trim());}).filter(function(n){return!isNaN(n)&&n>=0&&n<=100;});
}
function compute(){
  var raw=($('#caScores')||{}).value||'';
  var scores=parse(raw);
  var n=scores.length;
  var mean=$('#caMean'),med=$('#caMedian'),high=$('#caHigh'),low=$('#caLow'),std=$('#caStdDev'),rng=$('#caRange'),stu=$('#caStudents'),lett=$('#caLetter');
  if(n===0){
    if(mean) mean.textContent='—';if(med) med.textContent='—';if(high) high.textContent='—';if(low) low.textContent='—';if(std) std.textContent='—';if(rng) rng.textContent='—';if(stu) stu.textContent='0';return;
  }
  var sorted=scores.slice().sort(function(a,b){return a-b;});
  var avg=round(scores.reduce(function(a,b){return a+b;},0)/n,2);
  var median=n%2===0?(sorted[n/2-1]+sorted[n/2])/2:sorted[Math.floor(n/2)];
  var variance=scores.reduce(function(acc,s){return acc+Math.pow(s-avg,2);},0)/n;
  var stdDev=round(Math.sqrt(variance),2);
  var highest=sorted[n-1], lowest=sorted[0];
  if(mean) mean.textContent=avg+'%';
  if(lett) lett.textContent=letterGrade(avg)+' average';
  if(med) med.textContent=round(median,1)+'%';
  if(high) high.textContent=highest+'%';
  if(low) low.textContent=lowest+'%';
  if(std) std.textContent=stdDev;
  if(rng) rng.textContent=round(highest-lowest,1);
  if(stu) stu.textContent=n;
}
document.addEventListener('DOMContentLoaded',function(){
  var sc=$('#caScores'),btn=$('#caCalculate'),rs=$('#caReset'),sh=$('#caShare');
  if(sc) sc.addEventListener('input',compute);
  if(btn) btn.onclick=compute;
  if(rs) rs.onclick=function(){if(sc) sc.value='';compute();SM.toast('Cleared','info');};
  if(sh) sh.onclick=function(){var v=$('#caMean');if(!v||v.textContent==='—')return SM.toast('Enter scores first','info');SM.copy('Class average: '+v.textContent+' (n='+$('#caStudents').textContent+') — Study Metrics');};
  compute();
});
})();