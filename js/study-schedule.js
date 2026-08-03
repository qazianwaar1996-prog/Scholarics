(function(){
"use strict";
var $=SM.$, $$=SM.$$, round=SM.round, uid=SM.uid, esc=SM.esc, store=SM.store, KEY="sm_ss";
var DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var rows=store.get(KEY,[]);
if(!rows.length) rows=[
  {id:uid(),name:'Mathematics',diff:'hard',hrs:'4'},
  {id:uid(),name:'Physics',diff:'medium',hrs:'3'},
  {id:uid(),name:'English',diff:'easy',hrs:'2'}
];
function render(){
  var c=$('#ssRows'); if(!c) return;
  c.innerHTML=rows.map(function(r){
    return '<div class="crow" data-id="'+r.id+'" style="display:grid;grid-template-columns:1fr 80px 100px 44px;gap:var(--s3);align-items:center">'
      +'<input class="input" data-f="name" value="'+esc(r.name)+'" placeholder="Subject name" aria-label="Subject">'
      +'<select class="select" data-f="diff" aria-label="Difficulty">'
      +['easy','medium','hard'].map(function(d){return '<option value="'+d+'"'+(r.diff===d?' selected':'')+'>'+d.charAt(0).toUpperCase()+d.slice(1)+'</option>';}).join('')
      +'</select>'
      +'<div class="input-unit"><input class="input tnum" data-f="hrs" type="number" min="0.5" max="20" step="0.5" value="'+esc(r.hrs)+'" aria-label="Hours per week"><span class="unit">h/w</span></div>'
      +'<button class="row-del" data-del="'+r.id+'" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'
      +'</div>';
  }).join('');
  attachRows(); updateTotals();
}
function attachRows(){
  $$('.crow').forEach(function(row){
    var id=row.getAttribute('data-id');
    $$('input,select',row).forEach(function(inp){
      var f=inp.getAttribute('data-f'); if(!f) return;
      inp.oninput=function(){var r=rows.find(function(x){return x.id===id;});if(r){r[f]=inp.value;store.set(KEY,rows);updateTotals();}};
    });
  });
  $$('[data-del]').forEach(function(btn){
    btn.onclick=function(){rows=rows.filter(function(r){return r.id!==btn.getAttribute('data-del');});store.set(KEY,rows);render();};
  });
}
function updateTotals(){
  var total=rows.reduce(function(a,r){return a+(parseFloat(r.hrs)||0);},0);
  var days=Math.max(1,parseFloat($('#ssDays').value)||5);
  var tot=$('#ssTotalHours'),sub=$('#ssSubOut'),subs=$('#ssSubjects'),daily=$('#ssDailyAvg');
  if(tot) tot.textContent=total>0?round(total,1)+'h':'—';
  if(sub) sub.textContent=total>0?'across '+rows.length+' subject(s)':'Add subjects to begin';
  if(subs) subs.textContent=rows.length;
  if(daily) daily.textContent=total>0?round(total/days,1)+'h':'—';
}
function generate(){
  var days=Math.max(1,Math.min(7,parseFloat($('#ssDays').value)||5));
  var startTime=($('#ssStartTime')||{}).value||'09:00';
  var [sh,sm]=startTime.split(':').map(Number);
  var output=$('#ssOutput'), grid=$('#ssScheduleGrid'); if(!output||!grid) return;
  var diffW={hard:3,medium:2,easy:1};
  var sorted=rows.slice().sort(function(a,b){return (diffW[b.diff]||1)-(diffW[a.diff]||1);});
  var schedule=DAYS.slice(0,days).map(function(d){return{day:d,sessions:[]};});
  sorted.forEach(function(subj){
    var hrsLeft=parseFloat(subj.hrs)||0;
    var sessPerDay=round(hrsLeft/days,1);
    schedule.forEach(function(d){
      if(sessPerDay>=0.5) d.sessions.push({name:subj.name,hrs:Math.min(sessPerDay,hrsLeft),diff:subj.diff});
    });
  });
  grid.innerHTML=schedule.map(function(d){
    var time=sh*60+sm;
    var slots=d.sessions.map(function(s){
      var start=pad(Math.floor(time/60))+':'+pad(time%60);
      var dur=Math.round(s.hrs*60);
      time+=dur+15;
      var end=pad(Math.floor(time/60))+':'+pad(time%60);
      return '<div style="display:flex;align-items:center;gap:var(--s3);padding:var(--s2) 0;border-bottom:1px solid var(--border-soft)">'
        +'<span style="font-size:var(--step-xs);color:var(--ink-3);min-width:110px">'+start+' – '+end+'</span>'
        +'<span style="font-size:var(--step-sm);font-weight:500">'+esc(s.name)+'</span>'
        +'<span style="font-size:var(--step-xs);color:var(--ink-3)">('+s.hrs+'h)</span>'
        +'</div>';
    }).join('');
    return '<div style="margin-bottom:var(--s4)"><div style="font-weight:600;font-size:var(--step-sm);margin-bottom:var(--s2);color:var(--accent-strong)">'+d.day+'</div>'+slots+'</div>';
  }).join('');
  output.style.display='';
  SM.toast('Schedule generated!','success');
}
function pad(n){return String(n).padStart(2,'0');}
document.addEventListener('DOMContentLoaded',function(){
  var add=$('#ssAddRow'),gen=$('#ssGenerate'),rs=$('#ssReset'),sh=$('#ssShare'),days=$('#ssDays');
  if(add) add.onclick=function(){rows.push({id:uid(),name:'',diff:'medium',hrs:'2'});store.set(KEY,rows);render();SM.toast('Subject added','success');};
  if(gen) gen.onclick=generate;
  if(days) days.addEventListener('input',updateTotals);
  if(rs){rs.onclick=function(){store.set(KEY,null);rows=[{id:uid(),name:'Mathematics',diff:'hard',hrs:'4'},{id:uid(),name:'Physics',diff:'medium',hrs:'3'},{id:uid(),name:'English',diff:'easy',hrs:'2'}];render();var o=$('#ssOutput');if(o)o.style.display='none';SM.toast('Reset','info');};}
  if(sh){sh.onclick=function(){var v=$('#ssTotalHours');if(!v||v.textContent==='—')return SM.toast('Add subjects first','info');SM.copy('My study schedule: '+v.textContent+' per week across '+rows.length+' subjects — Study Metrics');};}
  render();
});
})();