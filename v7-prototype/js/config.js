/* Shared rules, constants and save data. The 6.4 game never imports this file. */
(function () {
  'use strict';
  const V = window.VS7 = window.VS7 || {};
  V.W = 960; V.H = 540; V.GROUND = 450;
  V.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  V.lerp = (a,b,t) => a + (b-a)*t;
  V.overlap = (a,b) => a.x < b.x+b.w && a.x+a.w>b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  V.levels = {runner:{name:'Strömungskanal',kind:'RUNNER'},arcade:{name:'Endlos-Modus',kind:'ARCADE'},combat:{name:'Muränenring',kind:'COMBAT'}};
  const SAVE_KEY = 'vulkanschnegge-v7-demo-v1';
  V.progress = {runner:false,combat:false,bestCoins:0};
  try { const saved = JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); if(saved && typeof saved==='object') {
    V.progress.runner = saved.runner === true; V.progress.combat = saved.combat === true;
    V.progress.bestCoins = Number.isFinite(saved.bestCoins)?saved.bestCoins:0;
  }} catch(_ignored) { /* local file / restricted browser storage */ }
  V.saveProgress = () => { try { localStorage.setItem(SAVE_KEY,JSON.stringify(V.progress)); } catch(_ignored) {} };
})();
