(function(){
  'use strict';
  const V=window.VS7;
  const I=V.input={left:false,right:false,jump:false,dash:false,jumpQueued:false,dashQueued:false};
  const translate={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyJ:'dash'};
  function set(key,on){
    if(!key) return;
    if(on&&!I[key]) { if(key==='jump')I.jumpQueued=true; if(key==='dash')I.dashQueued=true; }
    I[key]=on;
  }
  window.addEventListener('keydown',e=>{
    if(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
    if(e.code==='Escape' && !e.repeat){ V.backToMap?.(); return; }
    const key=translate[e.code];if(key){e.preventDefault();set(key,true);}
  });
  window.addEventListener('keyup',e=>{const key=translate[e.code];if(key){e.preventDefault();set(key,false);}});
  window.addEventListener('blur',()=>I.reset());
  I.consume=()=>{const x={jump:I.jumpQueued,dash:I.dashQueued};I.jumpQueued=false;I.dashQueued=false;return x;};
  I.reset=()=>{for(const k of ['left','right','jump','dash','jumpQueued','dashQueued'])I[k]=false;};
  // Pointer controls for touch screens.
  for(const button of document.querySelectorAll('[data-key]')){
    const key=button.dataset.key;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);set(key,true);});
    button.addEventListener('pointerup',e=>{e.preventDefault();set(key,false);});
    button.addEventListener('pointercancel',()=>set(key,false));
    button.addEventListener('lostpointercapture',()=>set(key,false));
  }
})();
