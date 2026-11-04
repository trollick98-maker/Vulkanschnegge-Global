/* Original three tracks / zones from Vulkanschnegge 6.4. */
(function(){
  'use strict';
  const V=window.VS7;
  const tracks={
    slow:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Pixel%20Depths.mp3?raw=1',
    mid:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Into%20the%20Deep.mp3?raw=1',
    fast:'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/Vulkanschnegge%20Theme.mp3?raw=1'
  };
  const audio={};for(const [key,url] of Object.entries(tracks)){const a=new Audio(url);a.loop=true;a.preload='none';a.volume=0;audio[key]=a;}
  let wanted='slow',current=null,fade=0,allowed=false,enabled=true,volume=.30;
  function pauseAll(){for(const a of Object.values(audio))a.pause();current=null;}
  function play(a){if(!allowed||!enabled||document.hidden)return;a.play().catch(()=>{});}
  V.audio={
    start(){
      allowed=true;
      // Initialize the active track through zone(), otherwise tick() has no
      // current track and the first song can stay inaudible at volume 0.
      if(current!==wanted)V.audio.zone(wanted);
      else play(audio[wanted]);
    }
    setEnabled(on){enabled=!!on;if(!enabled)pauseAll();else {current=null;V.audio.zone(wanted);}},
    isEnabled(){return enabled;},
    volume(v){volume=Math.max(0,Math.min(1,v));},
    stop(){pauseAll();},
    zone(z){if(!audio[z])z='slow';wanted=z;
      if(!allowed||!enabled||document.hidden)return;
      if(current===z)return;
      current=z;fade=0;audio[z].volume=0;play(audio[z]);
    },
    tick(dt){if(!allowed||!enabled||!current||document.hidden)return;
      fade=Math.min(1,fade+dt/1.3);
      for(const [key,a] of Object.entries(audio)){
        a.volume=key===current?volume*fade:volume*(1-fade);
        if(key!==current && fade>=1)a.pause();
      }
    }
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();else if(allowed&&enabled)V.audio.zone(wanted);});
})();
