const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('V7 audio stays stopped across visibility changes until a new run starts',()=>{
  const listeners={};
  const players=[];
  class FakeAudio {
    constructor(src){this.src=src;this.paused=true;this.volume=0;players.push(this);}
    addEventListener(){}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const document={hidden:false,addEventListener(name,fn){listeners[name]=fn;}};
  const sandbox=vm.createContext({window:{VS7:{}},Audio:FakeAudio,document,console});
  const source=fs.readFileSync(path.join(__dirname,'../js/audio.js'),'utf8');
  vm.runInContext(source,sandbox);
  const audio=sandbox.window.VS7.audio;
  audio.start();
  assert.equal(players.filter(p=>!p.paused).length,1);
  audio.stop();
  assert.ok(players.every(p=>p.paused));
  document.hidden=true;listeners.visibilitychange();
  document.hidden=false;listeners.visibilitychange();
  assert.ok(players.every(p=>p.paused),'returning to map tab must not restart music');
  audio.start();
  assert.equal(players.filter(p=>!p.paused).length,1,'a new run must restart music');
});
