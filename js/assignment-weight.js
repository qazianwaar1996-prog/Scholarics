(function(){
"use strict";
var $=SM.$, $$=SM.$$, round=SM.round, uid=SM.uid, esc=SM.esc, store=SM.store, KEY="sm_aw";
var rows=store.get(KEY,[]);
if(!rows.length) rows=[
  {id:uid(),name:'Homework 1',score:'18',max:'20'},
  {id:uid(),name:'Homework 2',score:'15',max:'20'},
  {id:uid(),name:'Quiz 1',score:'9',max:'10'}
];
function render(){
  var c=$('#awRows'); if(!c) return;
  c.innerHTML=rows.map(function(r){
    return '<div class="crow" data-id="'+r.id+'" style="display:grid;grid-template-columns:1fr 100px 100px 44px;gap:var(--s3);align-items:center">'
      +'<input class="input" data-f="name" value="'+esc(r.name)+'" placeholder="Assignment name" aria-label="Assignment name">'
      +'<input class="input tnum" data-f="score" type="number" min="0" value="'+esc(r.score)+'" placeholder="Your score" aria-label="Your score">'
      +'<input class="input tnum" data-f="max" type="number" min="1" value="'+esc(r.max)+'" placeholder="Max" aria-label="Max score">'
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
  var totalScore=0,totalMax=0,count=0;
  rows.forEach(function(r){
    var s=parseFloat(r.score),m=parseFloat(r.max)||0;
    if(!isNaN(s)&&m>0){totalScore+=s;totalMax+=m;count++;}
  });
  var avg=totalMax>0?round((totalScore/totalMax)*100,1):0;
  var catW=parseFloat($('#awTotalWeight').value)||0;
  var contrib=catW>0?round((avg/100)*catW,2):null;
  var ao=$('#awAvgOut'),sub=$('#awSubOut'),cc=$('#awCourseContrib'),cnt=$('#awCount');
  if(ao) ao.textContent=totalMax>0?avg+'%':'—';
  if(sub) sub.textContent=totalMax>0?(count+' assignment'+(count!==1?'s':'')+' · '+totalScore+' of '+totalMax+' points'):'Enter assignments above';
  if(cc) cc.textContent=contrib!==null?contrib+' pts':'—';
  if(cnt) cnt.textContent=count;
}
document.addEventListener('DOMContentLoaded',function(){
  var add=$('#awAddRow'),rs=$('#awReset'),sh=$('#awShare'),tw=$('#awTotalWeight');
  if(add) add.onclick=function(){rows.push({id:uid(),name:'',score:'',max:'100'});store.set(KEY,rows);render();SM.toast('Added','success');};
  if(rs) rs.onclick=function(){store.set(KEY,null);rows=[{id:uid(),name:'Homework 1',score:'18',max:'20'},{id:uid(),name:'Homework 2',score:'15',max:'20'},{id:uid(),name:'Quiz 1',score:'9',max:'10'}];render();SM.toast('Reset','info');};
  if(tw) tw.addEventListener('input',compute);
  if(sh) sh.onclick=function(){var v=$('#awAvgOut');if(!v||v.textContent==='—')return SM.toast('Enter data first','info');SM.copy('Assignment average: '+v.textContent+' — Study Metrics');};
  render();
});
})();