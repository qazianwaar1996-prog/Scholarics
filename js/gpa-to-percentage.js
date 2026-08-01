(function(){
"use strict";
var $=SM.$, store=SM.store, KEY="sm_g2p";
var SCALES={
  us4:{name:"US 4.0",max:4,fn:function(g){
    if(g>=4.0)return{pct:97,cls:"A / Excellent"};
    if(g>=3.7)return{pct:90,cls:"A- / Excellent"};
    if(g>=3.3)return{pct:87,cls:"B+ / Good"};
    if(g>=3.0)return{pct:83,cls:"B / Good"};
    if(g>=2.7)return{pct:80,cls:"B- / Good"};
    if(g>=2.3)return{pct:77,cls:"C+ / Average"};
    if(g>=2.0)return{pct:73,cls:"C / Average"};
    if(g>=1.7)return{pct:70,cls:"C- / Average"};
    if(g>=1.3)return{pct:67,cls:"D+ / Below Average"};
    if(g>=1.0)return{pct:63,cls:"D / Below Average"};
    if(g>=0.7)return{pct:60,cls:"D- / Below Average"};
    return{pct:0,cls:"F / Failing"};
  }},
  pak4:{name:"Pakistan 4.0",max:4,fn:function(g){
    var pct=Math.round(50 + (g/4)*50);
    var cls=g>=3.7?'Excellent':g>=3.0?'Good':g>=2.0?'Average':g>=1.0?'Pass':'Failing';
    return{pct:Math.min(100,pct),cls:cls};
  }},
  india10:{name:"India 10-point",max:10,fn:function(g){
    var pct=Math.round(g*9.5);
    var cls=g>=9?'Outstanding':g>=8?'Excellent':g>=7?'Very Good':g>=6?'Good':g>=5?'Average':g>=4?'Pass':'Failing';
    return{pct:Math.min(100,pct),cls:cls};
  }},
  nigeria5:{name:"Nigeria 5.0",max:5,fn:function(g){
    var pct=Math.round((g/5)*100);
    var cls=g>=4.5?'First Class':g>=3.5?'Second Class Upper':g>=2.4?'Second Class Lower':g>=1.5?'Third Class':g>=1?'Pass':'Failing';
    return{pct:Math.min(100,pct),cls:cls};
  }}
};
function compute(){
  var gEl=$('#g2pGpa'), sEl=$('#g2pScale');
  if(!gEl||!sEl) return;
  var gpa=parseFloat(gEl.value), scaleKey=sEl.value;
  var scale=SCALES[scaleKey]||SCALES.us4;
  store.set(KEY,{gpa:gEl.value,scale:scaleKey});
  var out=$('#g2pOut'), cls=$('#g2pClass');
  if(isNaN(gpa)||gpa<0||gpa>scale.max){
    if(out) out.textContent='—'; return;
  }
  var res=scale.fn(gpa);
  if(out) out.textContent=res.pct+'%';
  if(cls) cls.textContent=res.cls;
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){var g=$('#g2pGpa');if(g)g.value=saved.gpa||'';var s=$('#g2pScale');if(s)s.value=saved.scale||'us4';}
  ['#g2pGpa','#g2pScale'].forEach(function(s){var e=$(s);if(e)e.addEventListener('input',compute);});
  var rs=$('#g2pReset');
  if(rs){rs.onclick=function(){var e=$('#g2pGpa');if(e)e.value='';store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#g2pShare');
  if(sh){sh.onclick=function(){var v=$('#g2pOut');if(!v||v.textContent==='—')return SM.toast('Enter a GPA first','info');SM.copy('My GPA of '+$('#g2pGpa').value+' equals '+v.textContent+' — Study Metrics');};}
  compute();
});
})();