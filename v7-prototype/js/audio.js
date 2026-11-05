/* Original three tracks, now bundled locally for offline play. */
(function(){
  'use strict';
  const V=window.VS7;
  const tracks={
    slow:{local:'assets/music/pixel-depths-slow.mp3',fallback:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Pixel%20Depths.mp3?raw=1'},
    mid:{local:'assets/music/into-the-deep-mid.mp3',fallback:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Into%20the%20Deep.mp3?raw=1'},
    fast:{local:'assets/music/vulkanschnegge-theme-fast.mp3',fallback:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Vulkanschnegge%20Theme.mp3?raw=1'}
  };
  const audio={};
  for(const [key,source] of Object.entries(tracks)){
    const a=new Audio(source.local);
    a.loop=true;a.preload='none';a.volume=0;
    let triedFallback=false;
    a.addEventListener('error',()=>{
      if(!triedFallback){
        triedFallback=true;
        a.src=source.fallback;
        if(current===key&&allowed&&enabled&&!document.hidden)play(a);
      }
    });
    audio[key]=a;
  }
  let wanted='slow',current=null,fade=0,allowed=false,enabled=true,volume=.30,zoneTime=0;
  function pauseAll(){for(const a of Object.values(audio))a.pause();current=null;}
  function play(a){if(!allowed||!enabled||document.hidden)return;a.play().catch(()=>{});}
  V.audio={
    startLevel(mode){zoneTime=0;V.audio.zone(mode==='combat'?'mid':'slow');V.audio.start();},
    runner(speed){
      if(!allowed||!enabled)return;
      if(wanted==='slow'&&speed>=490&&zoneTime>=28)V.audio.zone('mid');
      else if(wanted==='mid'&&speed>=625&&zoneTime>=37)V.audio.zone('fast');
    },
    start(){
      allowed=true;
      if(current!==wanted)V.audio.zone(wanted);
      else play(audio[wanted]);
    },
    setEnabled(on){enabled=!!on;if(!enabled)pauseAll();else{current=null;V.audio.zone(wanted);}},
    isEnabled(){return enabled;},
    volume(v){volume=Math.max(0,Math.min(1,v));},
    stop(){pauseAll();zoneTime=0;},
    zone(z){if(!audio[z])z='slow';wanted=z;
      if(!allowed||!enabled||document.hidden)return;
      if(current===z)return;
      current=z;fade=0;zoneTime=0;audio[z].volume=0;play(audio[z]);
    },
    tick(dt){if(!allowed||!enabled||!current||document.hidden)return;
      zoneTime+=dt;
      fade=Math.min(1,fade+dt/1.3);
      for(const [key,a] of Object.entries(audio)){
        a.volume=key===current?volume*fade:volume*(1-fade);
        if(key!==current&&fade>=1)a.pause();
      }
    }
  };
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)pauseAll();else if(allowed&&enabled)V.audio.zone(wanted);
  });
})();
