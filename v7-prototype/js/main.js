/* V7 hybrid game controller: level navigation, legacy systems, UI and sound. */
(function(){
  'use strict';
  const V=window.VS7;
  const find=id=>document.getElementById(id);
  const dom={world:find('world-ui'),hud:find('hud'),bottom:find('game-bottom'),touch:find('touch-controls'),result:find('result'),
    kind:find('level-kind'),title:find('level-title'),stats:find('hud-stats'),score:find('hud-score'),perk:find('hud-perk'),speed:find('hud-speed'),
    number:find('hud-number'),meter:find('hud-meter'),label:find('hud-label'),tip:find('level-tip'),message:find('level-message'),
    upgrade:find('upgrade-overlay'),choices:find('upgrade-choices'),board:find('leaderboard-overlay'),records:find('leaderboard-rows')};
  V.state={mode:'map',level:null,time:0,lastFrame:0,upgrading:false,resultMode:null};
  let messageTime=0;
  function show(el,on){el.classList.toggle('hidden',!on);}
  V.notify=text=>{dom.message.textContent=text;messageTime=2.5;};

  const nameInput=find('player-name');nameInput.value=V.profile.name;
  nameInput.addEventListener('input',()=>{V.profile.name=nameInput.value.trim().slice(0,24);V.saveProfile();});
  const characterButtons=[...document.querySelectorAll('[data-character]')];
  for(const button of characterButtons){
    const id=button.dataset.character;
    const img=button.querySelector('img');if(img)img.src=V.assets[id].src;
    button.addEventListener('click',()=>{V.profile.character=id;V.saveProfile();refreshCharacter();});
  }
  function refreshCharacter(){
    for(const b of characterButtons){b.classList.toggle('selected',b.dataset.character===V.profile.character);b.setAttribute('aria-pressed',b.dataset.character===V.profile.character?'true':'false');}
    find('character-detail').textContent=V.characters[V.profile.character].detail;
  }
  refreshCharacter();
  function board(open){
    if(!open){show(dom.board,false);return;}
    dom.records.replaceChildren();
    if(V.classicHighscore>0){const old=document.createElement('p');old.className='classic-best';old.textContent='6.4-Bestwert (dieser Browser): '+V.classicHighscore;dom.records.appendChild(old);}
    if(!V.records.length){const p=document.createElement('p');p.textContent='Noch keine Runs aufgezeichnet. Spiel zuerst einen Level!';dom.records.appendChild(p);}
    else for(const [i,entry] of V.records.slice(0,10).entries()){
      const line=document.createElement('div');line.className='record-row';
      const who=document.createElement('span');who.textContent=`${i+1}. ${entry.name} · ${V.characters[entry.character]?.name||'Schnegg'}`;
      const value=document.createElement('strong');value.textContent=`${entry.score} P · ${entry.mode==='runner'?'Runner':entry.mode==='arcade'?'Endlos':'Combat'}`;
      line.append(who,value);dom.records.appendChild(line);
    }
    show(dom.board,true);
  }
  find('board-btn').addEventListener('click',()=>board(true));
  find('board-close').addEventListener('click',()=>board(false));
  find('online-board-btn').addEventListener('click',async()=>{
    const section=find('online-board-rows');section.replaceChildren();
    const status=document.createElement('p');status.textContent='Lade Online-Rangliste (nur lesend) ...';section.appendChild(status);
    try{
      const rows=await V.loadLegacyLeaderboard();section.replaceChildren();
      if(!rows.length){status.textContent='Noch keine Einträge.';section.appendChild(status);}
      rows.forEach((entry,i)=>{
        const row=document.createElement('div');row.className='record-row';
        const name=document.createElement('span');name.textContent=`${i+1}. ${entry.name} · ${entry.character}`;
        const score=document.createElement('strong');score.textContent=`${entry.score} Punkte`;
        row.append(name,score);section.appendChild(row);
      });
    }catch(err){status.textContent='Online-Schneggboard derzeit nicht erreichbar (Netzwerk oder Firestore-Regeln).';console.warn(err);}
  });
  dom.board.addEventListener('click',e=>{if(e.target===dom.board)board(false);});
  find('fullscreen-btn').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch(err){console.warn('Vollbild nicht verfügbar',err);}
  });
  find('sound-btn').addEventListener('click',()=>{
    const enabled=!V.audio.isEnabled();V.audio.setEnabled(enabled);if(enabled)V.audio.start();
    find('sound-btn').textContent=enabled?'♫ MUSIK AN':'♫ MUSIK AUS';
  });
  find('volume').addEventListener('input',e=>V.audio.volume(Number(e.target.value)));

  function map(){
    V.input.reset();V.audio.stop();V.state.mode='map';V.state.level=null;V.state.upgrading=false;
    show(dom.world,true);show(dom.hud,false);show(dom.bottom,false);show(dom.touch,false);show(dom.result,false);show(dom.upgrade,false);board(false);
    find('runner-done').textContent=V.progress.runner?'✓':'';
    find('combat-done').textContent=V.progress.combat?'✓':'';
  }
  V.backToMap=map;
  function start(mode){
    if(mode!=='runner'&&mode!=='combat'&&mode!=='arcade')return;
    V.input.reset();V.state.mode=mode;V.state.upgrading=false;
    V.state.level=mode==='combat'?V.newCombat():V.newRunner(mode==='arcade');
    show(dom.world,false);show(dom.hud,true);show(dom.bottom,true);show(dom.touch,true);show(dom.result,false);show(dom.upgrade,false);board(false);
    dom.kind.textContent=mode==='runner'?'LEVEL 01 · RUNNER':mode==='arcade'?'ARCADE · ENDLOS':'LEVEL 02 · COMBAT';
    dom.title.textContent=V.levels[mode].name;
    dom.tip.textContent=mode==='combat'?'A / D: LAUFEN · SPACE: SPRINGEN · SHIFT: PANZER-DASH':'SPACE: SPRINGEN · SHIFT: PANZER-BOOST · PERKS WÄHLEN';
    dom.message.textContent=mode==='combat'?'TEMPO AUFBAUEN, DANN DASHEN!':mode==='arcade'?'ENDLOS · SAMMLE MÜNZEN UND UPGRADES':'ROT = SPRINGEN · LILA = ZERSTÖRBAR';
    messageTime=4;updateHUD();V.audio.zone('slow');V.audio.start();
  }
  V.offerUpgrades=s=>{
    if(!['runner','arcade'].includes(V.state.mode)||V.state.upgrading)return;
    const options=V.chooseUpgrades(s,3);
    if(!options.length)return;
    V.state.upgrading=true;V.input.reset();dom.choices.replaceChildren();
    for(const option of options){
      const button=document.createElement('button');button.className='upgrade-choice';button.textContent=option.name;
      button.addEventListener('click',()=>{
        if(!V.applyUpgrade(s,option.id))return;
        V.state.upgrading=false;show(dom.upgrade,false);V.input.reset();V.notify('PERK ERHALTEN: '+option.name);
      });
      dom.choices.appendChild(button);
    }
    show(dom.upgrade,true);
  };
  V.finish=function(won){
    const mode=V.state.mode;if(mode!=='runner'&&mode!=='combat'&&mode!=='arcade')return;
    const s=V.state.level;V.recordRun(mode,s);
    V.state.mode='result';V.state.resultMode=mode;V.state.won=won;V.audio.stop();V.state.upgrading=false;
    show(dom.hud,false);show(dom.bottom,false);show(dom.touch,false);show(dom.upgrade,false);show(dom.result,true);
    find('result-symbol').textContent=won?'🏆':'💥';
    find('result-tag').textContent=won?'LEVEL ABGESCHLOSSEN':'RUN VORBEI';
    find('result-title').textContent=won?(mode==='runner'?'Strömung bezwungen!':'Boss besiegt!'):'Die Schnecke gibt nicht auf.';
    find('result-description').textContent=(mode==='arcade'?`Endlos-Run beendet. ${Math.floor(s.dist)} Meter · ${s.coinsTaken} Münzen.`:mode==='runner'
      ?(won?`Du hast den Strömungskanal geschafft und ${s.coinsTaken} Münzen eingesammelt.`:`Du bist ${Math.round(s.dist/s.course*100)} % der Strecke gekommen.`)
      :(won?`Die Muräne ist geschlagen. ${s.kills} kleine Gegner wurden weggefegt.`:`Du hast ${s.kills} Gegner besiegt. Warte, bis der Boss golden leuchtet.`))
      +`   SCORE: ${Math.floor(s.score||0)} · Persönliche Rekorde im Schneggboard.`;
    if(won){V.progress[mode]=true;if(mode==='runner')V.progress.bestCoins=Math.max(V.progress.bestCoins,s.coinsTaken);V.saveProgress();}
    V.input.reset();
  };
  function updateHUD(){
    const mode=V.state.mode,s=V.state.level;if(!s||!(['runner','arcade','combat'].includes(mode)))return;
    dom.stats.textContent='♥ '.repeat(Math.max(0,s.hp))+'  '+(mode!=='combat'?'✦ '+s.coinsTaken+' Münzen':'⚡ '+s.kills+'/3 Gegner');
    dom.score.textContent='SCORE '+Math.floor(s.score||0)+(mode!=='combat'?' · x'+s.multiplier:'');
    dom.perk.textContent=mode!=='combat'?'UPGRADES '+s.upgrades.cleared+'/'+s.upgrades.nextCost:'PANZER-DASH + REBOUND';
    dom.speed.textContent='SPEED '+Math.round(mode!=='combat'?s.speed:Math.abs(s.player.vx))+' px/s';
    if(mode==='arcade'){
      const per=Math.min(100,Math.floor(100*s.upgrades.cleared/s.upgrades.nextCost));
      dom.number.textContent=Math.floor(s.dist)+' M';dom.meter.style.width=per+'%';dom.label.textContent='NÄCHSTES UPGRADE';
    }else if(mode==='runner'){
      const percent=Math.min(100,Math.floor(s.dist/s.course*100));
      dom.number.textContent=percent+' %';dom.meter.style.width=percent+'%';dom.label.textContent='FORTSCHRITT';
    }else{
      const hp=s.boss.hp;
      dom.number.textContent='BOSS '+hp+'/'+s.boss.maxHp;dom.meter.style.width=100*hp/s.boss.maxHp+'%';dom.label.textContent=s.boss.phase==='open'?'VERWUNDBAR – JETZT DASH!':s.boss.phase==='windup'?'STOSSWELLE KOMMT!':'BOSSLEBEN';
    }
  }
  for(const node of document.querySelectorAll('[data-level]'))node.addEventListener('click',()=>start(node.dataset.level));
  find('back-btn').addEventListener('click',map);
  find('restart-btn').addEventListener('click',()=>start(V.state.mode));
  find('home').addEventListener('click',map);
  find('replay').addEventListener('click',()=>start(V.state.resultMode));
  function frame(ms){
    const state=V.state;
    const dt=state.lastFrame?Math.min(.035,Math.max(0,(ms-state.lastFrame)/1000)):0;
    state.lastFrame=ms;state.time+=dt;
    if(messageTime>0&&!state.upgrading){messageTime-=dt;if(messageTime<=0)dom.message.textContent='';}
    if(['runner','arcade','combat'].includes(state.mode)&&!state.upgrading){
      const actions=V.input.consume();
      if(state.mode==='combat')V.updateCombat(state.level,dt,actions);
      else V.updateRunner(state.level,dt,actions);
      if(['runner','arcade','combat'].includes(state.mode)){
        updateHUD();
        if(state.mode!=='combat')V.audio.zone(state.level.speed<340?'slow':state.level.speed<420?'mid':'fast');
        else V.audio.zone(state.level.boss.phase==='open'?'fast':'mid');
      }
    }else V.input.consume();
    V.audio.tick(dt);V.render();requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{V.state.lastFrame=0;V.input.reset();});
  map();requestAnimationFrame(frame);
})();
