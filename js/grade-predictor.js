(function(){
"use strict";
var $=SM.$, $$=SM.$$, round=SM.round, uid=SM.uid, esc=SM.esc, store=SM.store, KEY="sm_gp";
function letterGrade(p){
  if(p>=97)return'A+';if(p>=93)return'A';if(p>=90)return'A-';
  if(p>=87)return'B+';if(p>=83)return'B';if(p>=80)return'B-';
  if(p>=77)return'C+';if(p>=73)return'C';if(p>=70)return'C-';
  if(p>=67)return'D+';if(p>=63)return'D';if(p>=60)return'D-';
  return'F';
}
var rows=store.get(KEY,[]);
if(!rows.length) rows=[
  {id:uid(),name:'Midterm Exam',score:'78',weight:'30'},
  {id:uid(),name:'Assignments',score:'85',weight:'20'},
  {id:uid(),name:'Final Exam',score:'',weight:'50'}
];
function render(){
  var c=$('#gpRows'); if(!c) return;
  c.innerHTML=rows.map(function(r){
    return '<div class="crow" data-id="'+r.id+'" style="display:grid;grid-template-columns:1fr 90px 90px 44px;gap:var(--s3);align-items:center">'
      +'<input class="input" data-f="name" value="'+esc(r.name)+'" placeholder="e.g. Midterm" aria-label="Component name">'
      +'<input class="input tnum" data-f="score" type="number" min="0" max="100" value="'+esc(r.score)+'" placeholder="—" aria-label="Score %">'
      +'<input class="input tnum" data-f="weight" type="number" min="0" max="100" value="'+esc(r.weight)+'" placeholder="%" aria-label="Weight %">'
      +'<button class="row-del" data-del="'+r.id+'" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
      +'</div>';
  }).join('');
  attach(); compute();
}
function attach(){
  $$('.crow').forEach(function(row){
    var id=row.getAttribute('data-id');
    $$('input',row).forEach(function(inp){
      var f=inp.getAttribute('data-f'); if(!f) return;
      inp.oninput=function(){var r=rows.find(function(x){return x.id===id;});if(r){r[f]=inp.value;store.set(KEY,rows);compute();}};
    });
  });
  $$('[data-del]').forEach(function(btn){
    btn.onclick=function(){rows=rows.filter(function(r){return r.id!==btn.getAttribute('data-del');});store.set(KEY,rows);render();};
  });
}
function compute(){
  var totalW=0,totalWS=0,covered=0,count=0;
  rows.forEach(function(r){
    var w=parseFloat(r.weight)||0; totalW+=w;
    if(r.score!==''&&!isNaN(parseFloat(r.score))){
      totalWS+=(parseFloat(r.score)*w); covered+=w; count++;
    }
  });
  var pred=covered>0?round(totalWS/covered,1):0;
  var letter=covered>0?letterGrade(pred):'';
  var pred2=$('#gpPredOut'),lett=$('#gpLetterOut'),wc=$('#gpWeightCovered'),comp=$('#gpComponents'),wn=$('#gpWeightNote');
  if(pred2) pred2.textContent=covered>0?pred+'%':'—';
  if(lett) lett.textContent=letter;
  if(wc) wc.textContent=round(covered,1)+'%';
  if(comp) comp.textContent=count;
  if(wn){
    var sum=round(totalW,1);
    wn.className='weight-note '+(Math.abs(sum-100)<0.5?'ok':'warn');
    wn.textContent='Weight total: '+sum+'% '+(Math.abs(sum-100)<0.5?'✓ Adds up to 100%':'— weights should sum to 100%');
  }
}
document.addEventListener('DOMContentLoaded',function(){
  var add=$('#gpAddRow'),rs=$('#gpReset'),sh=$('#gpShare');
  if(add) add.onclick=function(){rows.push({id:uid(),name:'',score:'',weight:''});store.set(KEY,rows);render();SM.toast('Component added','success');};
  if(rs) rs.onclick=function(){store.set(KEY,null);rows=[{id:uid(),name:'Midterm Exam',score:'78',weight:'30'},{id:uid(),name:'Assignments',score:'85',weight:'20'},{id:uid(),name:'Final Exam',score:'',weight:'50'}];render();SM.toast('Reset','info');};
  if(sh) sh.onclick=function(){var v=$('#gpPredOut');if(!v||v.textContent==='—')return SM.toast('Enter scores first','info');SM.copy('My predicted grade is '+v.textContent+' ('+$('#gpLetterOut').textContent+') — Study Metrics');};
  render();
});
})();