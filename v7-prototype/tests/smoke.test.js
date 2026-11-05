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
test('boss runner scrolls while boss stays fixed on the right',()=>{
  const {V}=logic();const s=V.newCombat();
  const bx=s.boss.x, initial=s.obstacles[0].worldX;
  assert.ok(bx>V.W*.7);
  assert.ok(s.platforms.length>0&&s.obstacles.length>0);
  s.player.invuln=100;s.hp=50;
  for(let i=0;i<200;i++)V.updateCombat(s,.016,{jump:false,dash:false});
  assert.equal(s.boss.x,bx);
  assert.ok(s.dist>900);
  assert.ok(s.obstacleCursor>initial);
  assert.ok(s.boss.attackCount>0);
});
test('red projectile can be reflected with a timed dash to damage boss',()=>{
  const {V}=logic();const s=V.newCombat(),p=s.player,b=s.boss;
  b.fireTimer=999;
  const q={x:p.x+18,y:p.y+21,r:17,vx:-410,vy:0,type:'plasma',reflected:false,dead:false};
  s.projectiles.push(q);
  V.updateCombat(s,.016,{jump:false,dash:true});
  assert.equal(q.reflected,true);
  assert.equal(q.vx,780);
  const hp=b.hp;
  q.x=b.x+6;
  V.updateCombat(s,.016,{jump:false,dash:false});
  assert.equal(b.hp,hp-1);
});
test('toxic projectiles must be dodged and do not reflect',()=>{
  const {V}=logic();const s=V.newCombat(),p=s.player;
  s.boss.fireTimer=999;
  const q={x:p.x+18,y:p.y+21,r:19,vx:-310,vy:0,type:'toxic',reflected:false,dead:false};
  s.projectiles.push(q);
  const initial=s.hp;
  V.updateCombat(s,.016,{jump:false,dash:true});
  assert.equal(q.reflected,false);
  assert.equal(s.hp,initial-1);
});
test('boss defeat completes the level after final reflected hit',()=>{
  const {V,lastResult}=logic();const s=V.newCombat();
  s.boss.hp=1;s.boss.fireTimer=999;
  s.projectiles.push({x:s.boss.x,y:300,r:17,vx:780,vy:0,type:'plasma',reflected:true,dead:false});
  V.updateCombat(s,.016,{jump:false,dash:false});
  assert.equal(lastResult(),true);
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
  assert.equal(s.spawnCursor.coin,initialCoinCursor,'bonus coins cannot alter regular spawn cursor');
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
    addEventListener(){}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const env=vm.createContext({window:{VS7:{}},Audio:FakeAudio,
    document:{hidden:false,addEventListener(){}},console});
  vm.runInContext(read('js/audio.js'),env,{filename:'js/audio.js'});
  const a=env.window.VS7.audio;
  a.start();a.tick(.5);
  assert.equal(players.filter(p=>!p.paused).length,1);
  assert.ok(players.some(p=>p.volume>0));
  a.stop();assert.ok(players.every(p=>p.paused));
});

test('extra upgrade points survive purchasing an upgrade',()=>{
  const {V}=logic();const s=V.newRunner(true);
  s.upgrades.nextCost=3;s.upgrades.cleared=17;
  let offered=0;V.offerUpgrades=()=>offered++;
  V.updateRunner(s,0,{jump:false,dash:false});
  assert.equal(offered,1);assert.equal(s.upgrades.cleared,14);assert.equal(s.upgrades.nextCost,4);
});

test('coin-spawn perk never resurrects missed or collected coins',()=>{
  const {V}=logic();const s=V.newRunner(true);s.dist=3000;
  s.coins[0].missed=true;s.coins[1].taken=true;
  const before=s.coins.length;
  assert.equal(V.applyUpgrade(s,'coinSpawnBoost'),true);
  const added=s.coins.slice(before);
  assert.ok(added.length>0);
  assert.ok(added.every(c=>c.worldX>s.dist&&!c.missed&&!c.taken));
  assert.ok(!added.some(c=>c.worldX===s.coins[0].worldX+85));
});

test('online board retries script loading after temporary network failure', async()=>{
  let appended=0;
  const firebase={apps:[],initializeApp(){this.apps.push({});},firestore(){return {
    collection(){return {orderBy(){return {limit(){return {get:async()=>({docs:[]})};}};}};}
  };}};
  const env={window:{VS7:{}},console,document:{head:{appendChild(tag){
    appended++;
    queueMicrotask(()=>{
      if(appended===1){tag.onerror();return;}
      if(tag.src.includes('firestore'))env.window.firebase=firebase;
      tag.onload();
    });
  }},createElement(){return {};}}};
  const context=vm.createContext(env);
  vm.runInContext(read('js/online-board.js'),context,{filename:'js/online-board.js'});
  await assert.rejects(env.window.VS7.loadLegacyLeaderboard());
  const rows=await env.window.VS7.loadLegacyLeaderboard();
  assert.equal(rows.length,0);
  assert.equal(appended,3);
});


test('offline character sprites and music tracks are packaged',()=>{
  const images=['snail.png','otter.png','frog.png'];
  for(const name of images){
    const f=path.join(root,'assets/images',name);
    assert.ok(fs.existsSync(f),`Missing ${name}`);
    const header=fs.readFileSync(f).subarray(0,8).toString('hex');
    assert.equal(header,'89504e470d0a1a0a',`${name} must be PNG`);
  }
  const music=['pixel-depths-slow.mp3','into-the-deep-mid.mp3','vulkanschnegge-theme-fast.mp3'];
  for(const name of music){
    const f=path.join(root,'assets/music',name);
    assert.ok(fs.existsSync(f),`Missing ${name}`);
    const fd=fs.openSync(f,'r');const buf=Buffer.alloc(4);
    try{fs.readSync(fd,buf,0,4,0);}finally{fs.closeSync(fd);}
    assert.ok(buf.toString('ascii',0,3)==='ID3'||(buf[0]===255&&(buf[1]&224)===224),`${name} must be MP3`);
  }
  const spriteCode=read('js/assets.js'),audioCode=read('js/audio.js');
  for(const name of images)assert.ok(spriteCode.includes('assets/images/'+name));
  for(const name of music)assert.ok(audioCode.includes('assets/music/'+name));
});


test('six new game sprites are referenced and bundled',()=>{
  const registry=read('js/assets.js');const render=read('js/render.js');
  const newFiles=['boss-eel','plasma','toxic','platform','mine','crate'];
  for(const key of newFiles){
    assert.ok(fs.existsSync(path.join(root,'assets/images',key+'.png')));
    assert.ok(registry.includes('assets/images/'+key+'.png'));
  }
  for(const key of ['bossEel','plasma','toxic','platform','mine','crate'])assert.ok(render.includes("'"+key+"'"));
});
test('soundtrack rules keep boss music fixed and runner changes spaced apart',()=>{
  const audio=read('js/audio.js'),main=read('js/main.js');
  assert.ok(audio.includes("mode==='combat'?'mid':'slow'"));
  assert.ok(audio.includes('zoneTime>=28'));
  assert.ok(audio.includes('zoneTime>=37'));
  assert.ok(!main.includes("state.level.boss.phase==='open'?'fast'"));
});
