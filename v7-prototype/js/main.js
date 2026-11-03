(function(){
  'use strict';
  const V=window.VS7;
  const find=id=>document.getElementById(id);
  const dom={world:find('world-ui'),hud:find('hud'),bottom:find('game-bottom'),touch:find('touch-controls'),result:find('result'),kind:find('level-kind'),title:find('level-title'),stats:find('hud-stats'),number:find('hud-number'),meter:find('hud-meter'),label:find('hud-label'),tip:find('level-tip'),message:find('level-message')};
  V.state={mode:'map',level:null,time:0,lastFrame:0};
  let messageTime=0;
  function show(el,on){el.classList.toggle('hidden',!on);}
  V.notify=(text)=>{dom.message.textContent=text;messageTime=2.3;};
  function map(){
    V.input.reset();V.state.mode='map';V.state.level=null;
    show(dom.world,true);show(dom.hud,false);show(dom.bottom,false);show(dom.touch,false);show(dom.result,false);
    find('runner-done').textContent=V.progress.runner?'✓':'';
    find('combat-done').textContent=V.progress.combat?'✓':'';
  }
  V.backToMap=map;
  function start(mode){
    if(mode!=='runner'&&mode!=='combat')return;
    V.input.reset();V.state.mode=mode;
    V.state.level=mode==='runner'?V.newRunner():V.newCombat();
    show(dom.world,false);show(dom.hud,true);show(dom.bottom,true);show(dom.touch,true);show(dom.result,false);
    dom.kind.textContent=mode==='runner'?'LEVEL 01 · RUNNER':'LEVEL 02 · COMBAT';
    dom.title.textContent=V.levels[mode].name;
    dom.tip.textContent=mode==='runner'?'LEERTASTE: SPRINGEN · SHIFT: BOOST':'A / D: LAUFEN · SPACE: SPRINGEN · SHIFT: PANZER-DASH';
    dom.message.textContent=mode==='runner'?'ROT = SPRINGEN · LILA = ZERSTÖRBAR':'ERST TEMPO AUFBAUEN, DANN DASHEN';
    messageTime=5;updateHUD();
  }
  V.finish=function(won){
    const mode=V.state.mode;if(mode!=='runner'&&mode!=='combat')return;
    const s=V.state.level;
    V.state.mode='result';V.state.resultMode=mode;V.state.won=won;
    show(dom.hud,false);show(dom.bottom,false);show(dom.touch,false);show(dom.result,true);
    find('result-symbol').textContent=won?'🏆':'💥';
    find('result-tag').textContent=won?'LEVEL ABGESCHLOSSEN':'RUN VORBEI';
    find('result-title').textContent=won?(mode==='runner'?'Strömung bezwungen!':'Boss besiegt!'):'Die Schnecke gibt nicht auf.';
    find('result-description').textContent=mode==='runner'
      ?(won?`Du hast den Strömungskanal geschafft und ${s.coinsTaken} Münzen eingesammelt.`:`Du bist ${Math.round(s.dist/s.course*100)} % der Strecke gekommen. Noch ein Versuch!`)
      :(won?`Die Muräne ist geschlagen. ${s.kills} kleine Gegner wurden weggefegt.`:`Du hast ${s.kills} Gegner besiegt. Beobachte die rote Warnung und dash, wenn der Boss gold leuchtet.`);
    if(won){V.progress[mode]=true;if(mode==='runner')V.progress.bestCoins=Math.max(V.progress.bestCoins,s.coinsTaken);V.saveProgress();}
    V.input.reset();
  };
  function updateHUD(){
    const mode=V.state.mode,s=V.state.level;
    if(!s||!(mode==='runner'||mode==='combat'))return;
    dom.stats.textContent='♥ '.repeat(Math.max(0,s.hp))+'  '+(mode==='runner'?'✦ '+s.coinsTaken+' Münzen':'⚡ '+s.kills+'/3 Gegner');
    if(mode==='runner'){
      const percent=Math.min(100,Math.floor(s.dist/s.course*100));
      dom.number.textContent=percent+' %';dom.meter.style.width=percent+'%';dom.label.textContent='FORTSCHRITT';
    }else{
      const hp=s.boss.hp;
      dom.number.textContent='BOSS '+hp+'/'+s.boss.maxHp;dom.meter.style.width=100*hp/s.boss.maxHp+'%';dom.label.textContent=s.boss.phase==='open'?'VERWUNDBAR – JETZT DASH!':s.boss.phase==='windup'?'STOSSWELLE KOMMT!':'BOSSLEBEN';
    }
  }
  for(const node of document.querySelectorAll('[data-level]'))node.addEventListener('click',()=>start(node.dataset.level));
  find('back-btn').addEventListener('click',map);
  find('home').addEventListener('click',map);
  find('replay').addEventListener('click',()=>start(V.state.resultMode));
  function frame(ms){
    const state=V.state;
    let dt=state.lastFrame?Math.min(.035,Math.max(0,(ms-state.lastFrame)/1000)):0;
    state.lastFrame=ms;
    state.time+=dt;
    if(messageTime>0){messageTime-=dt;if(messageTime<=0)dom.message.textContent='';}
    if(state.mode==='runner'||state.mode==='combat'){
      const actions=V.input.consume();
      if(state.mode==='runner')V.updateRunner(state.level,dt,actions);
      else V.updateCombat(state.level,dt,actions);
      if(state.mode==='runner'||state.mode==='combat')updateHUD();
    }else V.input.consume();
    V.render();
    requestAnimationFrame(frame);
  }
  // Do not accumulate an enormous simulation step after switching browser tabs.
  document.addEventListener('visibilitychange',()=>{V.state.lastFrame=0;V.input.reset();});
  map();requestAnimationFrame(frame);
})();
