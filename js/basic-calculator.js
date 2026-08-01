(function(){
"use strict";
var $=SM.$;
var state={display:'0',expr:'',operator:null,prevVal:null,reset:false};
var KEYS=[
  ['AC','±','%','÷'],['7','8','9','×'],['4','5','6','−'],
  ['1','2','3','+'],['0','.','⌫','=']
];
function updateDisplay(){
  var r=$('#bcResult'),ex=$('#bcExpr');
  if(r) r.textContent=state.display;
  if(ex) ex.textContent=state.expr;
}
function press(v){
  if(v==='AC'){state={display:'0',expr:'',operator:null,prevVal:null,reset:false};updateDisplay();return;}
  if(v==='⌫'){state.display=state.display.length>1?state.display.slice(0,-1):'0';updateDisplay();return;}
  if(v==='±'){state.display=String(-parseFloat(state.display)||0);updateDisplay();return;}
  if(v==='%'){state.display=String(parseFloat(state.display)/100);updateDisplay();return;}
  if(['+','−','×','÷'].includes(v)){
    state.prevVal=parseFloat(state.display);
    state.operator=v;
    state.expr=state.display+' '+v;
    state.reset=true;
    updateDisplay(); return;
  }
  if(v==='='){
    if(state.operator===null||state.prevVal===null){updateDisplay();return;}
    var cur=parseFloat(state.display), res;
    var op=state.operator;
    if(op==='+') res=state.prevVal+cur;
    else if(op==='−') res=state.prevVal-cur;
    else if(op==='×') res=state.prevVal*cur;
    else if(op==='÷') res=cur===0?'Error':state.prevVal/cur;
    state.expr=state.expr+' '+state.display+' =';
    state.display=String(typeof res==='number'?parseFloat(res.toPrecision(12)):res);
    state.operator=null; state.prevVal=null; state.reset=true;
    updateDisplay(); return;
  }
  if(state.reset){state.display='';state.reset=false;}
  if(v==='.'){if(state.display.includes('.')) return; if(!state.display) state.display='0';}
  state.display=(state.display==='0'&&v!=='.')?v:(state.display+v);
  updateDisplay();
}
function buildKeypad(){
  var kp=$('#bcKeypad'); if(!kp) return;
  kp.innerHTML=KEYS.map(function(row){
    return row.map(function(v){
      var isEq=v==='=', isOp=['+','−','×','÷'].includes(v);
      var wide=v==='0'?'grid-column:span 1':'';
      return '<button class="btn '+(isEq?'btn-primary':isOp?'btn-ghost':'btn-ghost')+'" data-v="'+v+'" aria-label="'+v+'" style="padding:16px 8px;font-size:1.1rem;font-family:var(--font-display);'+wide+'">'+v+'</button>';
    }).join('');
  }).join('');
  kp.querySelectorAll('[data-v]').forEach(function(btn){
    btn.onclick=function(){press(btn.getAttribute('data-v'));};
  });
}
document.addEventListener('DOMContentLoaded',function(){
  buildKeypad(); updateDisplay();
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT') return;
    var map={'Enter':'=','Backspace':'⌫','Escape':'AC','*':'×','/':'÷','-':'−'};
    var v=map[e.key]||e.key;
    if(/[0-9+.%]/.test(v)||['=','⌫','AC','×','÷','−'].includes(v)){e.preventDefault();press(v);}
  });
});
})();