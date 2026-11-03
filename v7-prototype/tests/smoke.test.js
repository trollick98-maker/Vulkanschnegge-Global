const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const files=['js/config.js','js/input.js','js/runner.js','js/combat.js','js/render.js','js/main.js'];

test('all scripts are present and parse, legacy 6.4 unaffected',()=>{
  const html=read('index.html');
  assert.ok(!html.includes('firebase'));
  for(const file of files){assert.ok(html.includes(`src="${file}"`));assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));}
});

function logic(){
  const storage=new Map();
  const sandbox=vm.createContext({window:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console});
  sandbox.window=sandbox;
  for(const file of ['js/config.js','js/runner.js','js/combat.js'])vm.runInContext(read(file),sandbox,{filename:file});
  const V=sandbox.VS7;
  let result;
  V.finish=x=>{result=x};V.notify=()=>{};V.input={left:false,right:false};
  return {V,lastResult:()=>result};
}
test('runner initializes and ends when finish line is reached',()=>{
  const {V,lastResult}=logic();const s=V.newRunner();
  assert.equal(s.hp,3);assert.ok(s.obstacles.length>=10);
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
  assert.equal(o.dead,true);assert.equal(s2.hp,3);
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
