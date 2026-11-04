const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const files=['js/config.js','js/assets.js','js/profile.js','js/upgrades.js','js/audio.js','js/online-board.js','js/input.js','js/runner.js','js/combat.js','js/render.js','js/main.js'];

test('all scripts are present and parse, legacy 6.4 unaffected',()=>{
  const html=read('index.html');
  assert.ok(!html.includes('firebase'));
  for(const file of files){assert.ok(html.includes(`src="${file}"`));assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));}
});

function logic(){
  const storage=new Map();
  const sandbox=vm.createContext({window:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console});
  sandbox.window=sandbox;
  for(const file of ['js/config.js','js/profile.js','js/upgrades.js','js/runner.js','js/combat.js'])vm.runInContext(read(file),sandbox,{filename:file});
  const V=sandbox.VS7;
  let result;
  V.finish=x=>{result=x};V.notify=()=>{};V.input={left:false,right:false};
  return {V,lastResult:()=>result};
}
test('runner initializes and ends when finish line is reached',()=>{
  const {V,lastResult}=logic();const s=V.newRunner();
  assert.equal(s.hp,4);assert.ok(s.obstacles.length>=10);
  s.dist=s.course-1;V.updateRunner(s,.02,{jump:false,dash:false});
  assert.equal(lastResult(),true);
});
test('runner stops on zero hearts; dash destroys fragile obstacles',()=>{
  const {V,lastResult}=logic();const s=V.newRunner();
  s.hp=1;s.dist=s.obstacles[0].worldX;s.player.invuln=0;
  V.updateRunner(s,.015,{jump:false,dash:false});
  assert.equal(lastResult(),false);
  const s2=V.newRunner();const o=s2.obstacles.find(o=>o.fragile);s2.dist=o.worldX;
  V.updateRunner(s2,.015,{jump:false,dash:true});
  assert.equal(o.dead,true);assert.equal(s2.hp,4);
});
test('one dash kills normal enemy, restores air dash and increments KO',()=>{
  const {V}=logic();const s=V.newCombat(),p=s.player,e=s.enemies[0];
  p.x=e.x-35;p.y=e.y;p.vx=280;p.dashCooldown=0;
  V.updateCombat(s,.016,{jump:false,dash:true});
  assert.equal(e.alive,false);
  assert.equal(s.kills,1);assert.equal(p.airDash,true);
});
test('boss only takes damage while vulnerable, momentum rewards speed',()=>{
  const {V}=logic();const s=V.newCombat(),p=s.player,b=s.boss;
  p.x=b.x-35;p.y=b.y+40;p.vx=260;b.phase='open';b.timer=1.3;
  V.updateCombat(s,.016,{jump:false,dash:true});
  assert.equal(b.hp,6);
  assert.equal(b.hitWindow,true);
  const s2=V.newCombat(),p2=s2.player,b2=s2.boss;
  p2.x=b2.x-35;p2.y=b2.y+40;p2.vx=260;b2.phase='windup';b2.timer=1.2;
  V.updateCombat(s2,.016,{jump:false,dash:true});
  assert.equal(b2.hp,8);
});
test('collision rectangles treat edges as non-overlapping',()=>{
  const {V}=logic();assert.equal(V.overlap({x:0,y:0,w:10,h:10},{x:10,y:0,w:10,h:10}),false);
});

test('original three characters and sixteen classic perks are available',()=>{
  const {V}=logic();
  assert.deepEqual(Object.keys(V.characters).sort(),['frog','otter','snail']);
  assert.equal(V.upgradeCatalogue.length,16);
  V.profile.character='frog';
  assert.equal(V.newRunner().player.gravity,1790*.8);
  V.profile.character='otter';
  assert.equal(V.newRunner().magnetRange,1.2);
  V.profile.character='snail';
  assert.equal(V.newRunner().hp,4);
});
test('perks modify only current run and respect character restrictions',()=>{
  const {V}=logic();const s=V.newRunner();
  assert.equal(V.applyUpgrade(s,'jump'),true);
  assert.equal(s.extraJumps,1);
  assert.equal(V.applyUpgrade(s,'springLegs'),false);
  assert.equal(V.applyUpgrade(s,'freehit'),true);
  assert.equal(s.hp,5);
  const fresh=V.newRunner();
  assert.equal(fresh.hp,4);
  assert.equal(fresh.extraJumps,0);
});
test('runner records multiplier, coin score and resets missed streak',()=>{
  const {V}=logic();const s=V.newRunner();
  const c=s.coins[0];s.dist=c.worldX;s.player.y=c.y-20;
  V.updateRunner(s,.01,{jump:false,dash:false});
  assert.ok(s.coinsTaken>=1);assert.ok(s.score>10);assert.equal(s.multiplier,1+s.coinsTaken);
  s.dist=s.coins[1].worldX+200;V.updateRunner(s,.01,{jump:false,dash:false});
  assert.equal(s.multiplier,1);
});

test('endless arcade keeps spawning and remains finish-free',()=>{
  const {V,lastResult}=logic();const s=V.newRunner(true);
  assert.equal(s.endless,true);assert.equal(s.course,Infinity);
  s.hp=9999;s.player.invuln=1e9;
  V.offerUpgrades=()=>{};
  for(let i=0;i<2000;i++)V.updateRunner(s,.02,{jump:false,dash:false});
  assert.ok(s.dist>8000);
  assert.ok(s.obstacles.some(o=>o.worldX>8200));
  assert.ok(s.obstacles.length<80 && s.coins.length<110);
  assert.ok(s.score>1000);
  assert.equal(lastResult(),undefined);
});

test('V7 saves profile and runs separately from the original game',()=>{
  const {V}=logic();V.profile.name='Testspieler';
  V.profile.character='otter';
  V.recordRun('arcade',{score:525.9,coinsTaken:15});
  assert.equal(V.records[0].name,'Testspieler');
  assert.equal(V.records[0].mode,'arcade');
  assert.equal(V.records[0].score,525);
});

test('endless spawn cursors survive pruned or reordered object lists',()=>{
  const {V,lastResult}=logic();
  const s=V.newRunner(true);
  const initialCoinCursor=s.spawnCursor.coin;
  assert.equal(V.applyUpgrade(s,'coinSpawnBoost'),true);
  assert.equal(s.spawnCursor.coin,initialCoinCursor,'the bonus perk must not advance regular spawn cursor');
  s.dist=8000;
  s.obstacles=[];s.coins=[];
  s.player.invuln=100;
  V.offerUpgrades=()=>{};
  assert.doesNotThrow(()=>V.updateRunner(s,.016,{jump:false,dash:false}));
  assert.ok(s.obstacles.length>0&&s.coins.length>0);
  assert.ok(s.spawnCursor.obstacle>=8000+1800);
  assert.ok(s.spawnCursor.coin>=8000+1550);
  assert.equal(lastResult(),undefined);
});

test('music begins audibly on first start and stops on map transition',()=>{
  const players=[];
  class FakeAudio{
    constructor(src){this.src=src;this.loop=false;this.preload='none';this.volume=0;this.paused=true;players.push(this);}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const env=vm.createContext({window:{VS7:{}},Audio:FakeAudio,
    document:{hidden:false,addEventListener(){}},console});
  vm.runInContext(read('js/audio.js'),env,{filename:'js/audio.js'});
  const a=env.window.VS7.audio;
  a.start();
  a.tick(.5);
  assert.equal(players.filter(p=>!p.paused).length,1);
  assert.ok(players.some(p=>p.volume>0),'the first track must not remain muted');
  a.stop();
  assert.ok(players.every(p=>p.paused));
});
