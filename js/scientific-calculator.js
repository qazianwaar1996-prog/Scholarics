(function(){
"use strict";
var $=SM.$;
var expr='', isDeg=true, history=[], MAX_HIST=20;
var BTNS=[
  ['Deg','Rad','','(',')','CE'],
  ['sin','cos','tan','log','ln','xʸ'],
  ['sin⁻¹','cos⁻¹','tan⁻¹','√','³√','x²'],
  ['π','e','|x|','n!','1/x','mod'],
  ['7','8','9','÷','⌫','AC'],
  ['4','5','6','×','',''],
  ['1','2','3','−','',''],
  ['0','.','±','%','+','=']
];
function display(){ var r=$('#sciResult'),ex=$('#sciExpr'); if(r) r.textContent=expr||'0'; if(ex) ex.textContent=''; }
function safeEval(str){
  var s=String(str).trim();
  if(!/^[\d\s\+\-\*\/\%\.\(\)\^eE]+$/.test(s)) return NaN;
  try{
    return Function('"use strict";return ('+s+')')();
  } catch(_){ return NaN; }
}
function press(v){
  try{
    if(v==='AC'){expr='';display();return;}
    if(v==='CE'||v==='⌫'){expr=expr.slice(0,-1);display();return;}
    if(v==='='){
      var raw=expr
        .replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-')
        .replace(/π/g,String(Math.PI)).replace(/\be\b/g,String(Math.E))
        .replace(/mod/g,'%');
      raw=raw.replace(/sin⁻¹\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(isDeg?Math.asin(v)*180/Math.PI:Math.asin(v));});
      raw=raw.replace(/cos⁻¹\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(isDeg?Math.acos(v)*180/Math.PI:Math.acos(v));});
      raw=raw.replace(/tan⁻¹\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(isDeg?Math.atan(v)*180/Math.PI:Math.atan(v));});
      raw=raw.replace(/sin\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(Math.sin(isDeg?v*Math.PI/180:v));});
      raw=raw.replace(/cos\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(Math.cos(isDeg?v*Math.PI/180:v));});
      raw=raw.replace(/tan\(([^)]+)\)/g,function(_,a){var v=safeEval(a);return String(Math.tan(isDeg?v*Math.PI/180:v));});
      raw=raw.replace(/log\(([^)]+)\)/g,function(_,a){return String(Math.log10(safeEval(a)));});
      raw=raw.replace(/ln\(([^)]+)\)/g,function(_,a){return String(Math.log(safeEval(a)));});
      raw=raw.replace(/√\(([^)]+)\)/g,function(_,a){return String(Math.sqrt(safeEval(a)));});
      raw=raw.replace(/³√\(([^)]+)\)/g,function(_,a){return String(Math.cbrt(safeEval(a)));});
      raw=raw.replace(/\|([^|]+)\|/g,function(_,a){return String(Math.abs(safeEval(a)));});
      raw=raw.replace(/([0-9.]+)!/g,function(_,n){var x=parseInt(n);if(x<0||x>170)return'Infinity';var f=1;for(var i=2;i<=x;i++)f*=i;return String(f);});
      raw=raw.replace(/xʸ/g,'**');
      raw=raw.replace(/x²/g,'**2');
      raw=raw.replace(/1\/x/g,'1/');
      var result=safeEval(raw);
      if(isNaN(result)||!isFinite(result)){expr=isFinite(result)?String(result):'Error';display();return;}
      result=parseFloat(result.toPrecision(12));
      var histEntry={expr:expr, result:String(result)};
      history.unshift(histEntry); if(history.length>MAX_HIST) history.pop();
      renderHistory();
      var ex=$('#sciExpr'); if(ex) ex.textContent=expr+' =';
      expr=String(result); display(); return;
    }
    if(v==='Deg'||v==='Rad'){isDeg=(v==='Deg');display();return;}
    if(v==='±'){expr=expr?String(-parseFloat(expr)||0):'';display();return;}
    if(['sin','cos','tan','log','ln','√','³√','sin⁻¹','cos⁻¹','tan⁻¹'].includes(v)){expr+=v+'(';display();return;}
    if(v==='|x|'){expr+='|(';display();return;}
    if(v===''){return;}
    expr+=v; display();
  } catch(err){ expr='Error'; display(); setTimeout(function(){expr='';display();},1200); }
}
function renderHistory(){
  var hist=$('#sciHistory'); if(!hist) return;
  hist.innerHTML=history.map(function(h){
    var safeExpr=h.expr.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var safeRes=h.result.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-soft);font-size:var(--step-sm);cursor:pointer" data-result="'+safeRes+'">'
      +'<span style="color:var(--ink-3);font-size:.75rem">'+safeExpr+'</span>'
      +'<span class="tnum" style="font-weight:600">'+safeRes+'</span>'
      +'</div>';
  }).join('');
  hist.querySelectorAll('[data-result]').forEach(function(el){
    el.onclick=function(){expr=el.getAttribute('data-result');display();};
  });
}
function buildKeypad(){
  var kp=$('#sciKeypad'); if(!kp) return;
  var flat=[];
  BTNS.forEach(function(row){row.forEach(function(v){flat.push(v);});});
  kp.innerHTML=flat.map(function(v){
    if(!v) return '<div></div>';
    var isEq=v==='=';
    var cls='btn btn-ghost';
    if(isEq) cls='btn btn-primary';
    var safeV=v.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return '<button class="'+cls+'" data-v="'+safeV+'" aria-label="'+safeV+'" style="padding:10px 4px;font-size:.85rem;font-family:var(--font-display)">'+safeV+'</button>';
  }).join('');
  kp.querySelectorAll('[data-v]').forEach(function(btn){
    btn.onclick=function(){press(btn.getAttribute('data-v'));};
  });
}
document.addEventListener('DOMContentLoaded',function(){
  buildKeypad(); display();
  var ch=$('#sciClearHistory'); if(ch){ch.onclick=function(){history=[];renderHistory();SM.toast('History cleared','info');};}
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    var map={'Enter':'=','Backspace':'⌫','Escape':'AC'};
    var v=map[e.key]||e.key;
    if(/[0-9+\-*/.()%]/.test(v)||['=','⌫','AC'].includes(v)){e.preventDefault();press(v==='*'?'×':v==='/'?'÷':v);}
  });
});
})();