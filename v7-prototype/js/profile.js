/* Save game/character selection and local records, never write prototype scores to 6.4 Firestore. */
(function(){
  'use strict';
  const V=window.VS7;
  V.characters={
    snail:{name:'Schnegg',detail:'❤️ +1 HP · 🐢 Schwerer Antritt · 🌎 +10% Schwerkraft',hp:1,speed:-80,acceleration:1700,gravity:1.10,magnet:1},
    otter:{name:'Otter im Eimer',detail:'🧲 +20% Münz-Reichweite · 🐬 Schneller Antritt',hp:0,speed:0,acceleration:2150,gravity:1,magnet:1.2},
    frog:{name:'Frogo',detail:'🦘 −20% Schwerkraft · 🐇 Mittlerer Antritt',hp:0,speed:0,acceleration:1900,gravity:.8,magnet:1}
  };
  const KEY='vulkanschnegge-v7-profile-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_ignored){}
  const oldName=(()=>{try{return localStorage.getItem('vulkanschneggePlayerName')||'';}catch(_ignored){return '';}})();
  V.profile={name:typeof saved.name==='string'?saved.name.slice(0,24):oldName.slice(0,24),character:Object.hasOwn(V.characters,saved.character)?saved.character:'snail'};
  V.classicHighscore=(()=>{try{return Number(localStorage.getItem('vulkanschneckeHighscore'))||0;}catch(_ignored){return 0;}})();
  V.records=Array.isArray(saved.records)?saved.records.filter(r=>r&&typeof r.score==='number'&&Number.isFinite(r.score)).slice(0,30):[];
  V.saveProfile=()=>{try{localStorage.setItem(KEY,JSON.stringify({name:V.profile.name,character:V.profile.character,records:V.records}));}catch(_ignored){}};
  V.recordRun=(mode,level)=>{
    const score=Math.max(0,Math.floor(level.score||0));
    const record={name:V.profile.name.trim()||'Unbenannt',character:level.character||V.profile.character,mode,score,coins:level.coinsTaken||0,time:new Date().toISOString().slice(0,10)};
    V.records.push(record);V.records.sort((a,b)=>b.score-a.score);
    V.records=V.records.slice(0,20);V.saveProfile();
    return record;
  };
})();
