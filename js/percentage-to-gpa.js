(function(){
"use strict";
var $=SM.$, round=SM.round, store=SM.store, KEY="sm_p2g";
var SCALES={
  us4:{name:"US 4.0",max:4,fn:function(p){
    if(p>=97)return{gpa:4.0,letter:"A+",cls:"Excellent"};
    if(p>=93)return{gpa:4.0,letter:"A",cls:"Excellent"};
    if(p>=90)return{gpa:3.7,letter:"A-",cls:"Excellent"};
    if(p>=87)return{gpa:3.3,letter:"B+",cls:"Good"};
    if(p>=83)return{gpa:3.0,letter:"B",cls:"Good"};
    if(p>=80)return{gpa:2.7,letter:"B-",cls:"Good"};
    if(p>=77)return{gpa:2.3,letter:"C+",cls:"Average"};
    if(p>=73)return{gpa:2.0,letter:"C",cls:"Average"};
    if(p>=70)return{gpa:1.7,letter:"C-",cls:"Average"};
    if(p>=67)return{gpa:1.3,letter:"D+",cls:"Below Average"};
    if(p>=63)return{gpa:1.0,letter:"D",cls:"Below Average"};
    if(p>=60)return{gpa:0.7,letter:"D-",cls:"Below Average"};
    return{gpa:0.0,letter:"F",cls:"Failing"};
  }},
  pak4:{name:"Pakistan 4.0",max:4,fn:function(p){
    if(p>=85)return{gpa:4.0,letter:"A",cls:"Excellent"};
    if(p>=80)return{gpa:3.7,letter:"A-",cls:"Excellent"};
    if(p>=75)return{gpa:3.3,letter:"B+",cls:"Good"};
    if(p>=71)return{gpa:3.0,letter:"B",cls:"Good"};
    if(p>=68)return{gpa:2.7,letter:"B-",cls:"Good"};
    if(p>=64)return{gpa:2.3,letter:"C+",cls:"Average"};
    if(p>=61)return{gpa:2.0,letter:"C",cls:"Average"};
    if(p>=58)return{gpa:1.7,letter:"C-",cls:"Average"};
    if(p>=54)return{gpa:1.3,letter:"D+",cls:"Pass"};
    if(p>=50)return{gpa:1.0,letter:"D",cls:"Pass"};
    return{gpa:0.0,letter:"F",cls:"Failing"};
  }},
  india10:{name:"India 10-pt",max:10,fn:function(p){
    if(p>=91)return{gpa:10,letter:"O",cls:"Outstanding"};
    if(p>=81)return{gpa:9,letter:"A+",cls:"Excellent"};
    if(p>=71)return{gpa:8,letter:"A",cls:"Very Good"};
    if(p>=61)return{gpa:7,letter:"B+",cls:"Good"};
    if(p>=51)return{gpa:6,letter:"B",cls:"Above Average"};
    if(p>=45)return{gpa:5,letter:"C",cls:"Average"};
    if(p>=40)return{gpa:4,letter:"P",cls:"Pass"};
    return{gpa:0,letter:"F",cls:"Failing"};
  }},
  nigeria5:{name:"Nigeria 5.0",max:5,fn:function(p){
    if(p>=70)return{gpa:5.0,letter:"A",cls:"First Class"};
    if(p>=60)return{gpa:4.0,letter:"B",cls:"Second Class Upper"};
    if(p>=50)return{gpa:3.0,letter:"C",cls:"Second Class Lower"};
    if(p>=45)return{gpa:2.0,letter:"D",cls:"Third Class"};
    if(p>=40)return{gpa:1.0,letter:"E",cls:"Pass"};
    return{gpa:0.0,letter:"F",cls:"Failing"};
  }},
  uk:{name:"UK Classification",max:4,fn:function(p){
    if(p>=70)return{gpa:4.0,letter:"1st",cls:"First Class"};
    if(p>=60)return{gpa:3.3,letter:"2:1",cls:"Upper Second"};
    if(p>=50)return{gpa:2.7,letter:"2:2",cls:"Lower Second"};
    if(p>=40)return{gpa:2.0,letter:"3rd",cls:"Third Class"};
    return{gpa:0.0,letter:"Fail",cls:"Fail"};
  }}
};
function compute(){
  var pEl=$('#p2gPct'), sEl=$('#p2gScale');
  if(!pEl||!sEl) return;
  var pct=parseFloat(pEl.value), scaleKey=sEl.value;
  var scale=SCALES[scaleKey]||SCALES.us4;
  store.set(KEY,{pct:pEl.value,scale:scaleKey});
  var out=$('#p2gOut'), letter=$('#p2gLetter'), name=$('#p2gScaleName'), cls=$('#p2gClass');
  if(isNaN(pct)||pct<0||pct>100){
    if(out) out.textContent='—'; return;
  }
  var res=scale.fn(pct);
  if(out) out.textContent=res.gpa.toFixed(scale.max===10?1:2);
  if(letter) letter.textContent=res.letter;
  if(name) name.textContent=scale.name;
  if(cls) cls.textContent=res.cls;
}
document.addEventListener('DOMContentLoaded',function(){
  var saved=store.get(KEY,null);
  if(saved){var e=$('#p2gPct');if(e)e.value=saved.pct||'';var s=$('#p2gScale');if(s)s.value=saved.scale||'us4';}
  var inputs=['#p2gPct','#p2gScale'];
  inputs.forEach(function(sel){var el=$(sel);if(el)el.addEventListener('input',compute);});
  var rs=$('#p2gReset');
  if(rs){rs.onclick=function(){var e=$('#p2gPct');if(e)e.value='';store.set(KEY,null);compute();SM.toast('Reset','info');};}
  var sh=$('#p2gShare');
  if(sh){sh.onclick=function(){var v=$('#p2gOut');if(!v||v.textContent==='—')return SM.toast('Enter a percentage first','info');SM.copy('My '+$('#p2gPct').value+'% converts to '+v.textContent+' GPA — Study Metrics');};}
  compute();
});
})();