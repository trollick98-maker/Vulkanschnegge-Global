/* Original character sprites are bundled locally for offline play. */
(function(){
  'use strict';
  const V=window.VS7;
  const sources={
    snail:{local:'assets/images/snail.png',fallback:'https://i.imgur.com/NqwMXsb.png'},
    otter:{local:'assets/images/otter.png',fallback:'https://i.imgur.com/66Den9G.png'},
    frog:{local:'assets/images/frog.png',fallback:'https://i.imgur.com/gLAdS1x.png'},
    // The original 6.4 obstacle picture has not been provided as a local file.
    // It remains optional: rendering has a built-in Canvas fallback offline.
    obstacle:{local:null,fallback:'https://i.imgur.com/8gsW8Y5.png'},
    bossEel:{local:'assets/images/boss-eel.png'},
    plasma:{local:'assets/images/plasma.png'},
    toxic:{local:'assets/images/toxic.png'},
    platform:{local:'assets/images/platform.png'},
    mine:{local:'assets/images/mine.png'},
    crate:{local:'assets/images/crate.png'}
  };
  V.assets={};
  for(const [name,source] of Object.entries(sources)){
    const img=new Image();
    if(source.local){
      let triedFallback=false;
      img.addEventListener('error',()=>{
        if(!triedFallback && source.fallback){triedFallback=true;img.src=source.fallback;}
      });
      img.src=source.local;
    } else img.src=source.fallback;
    V.assets[name]=img;
  }
  V.readyImage=name=>{
    const img=V.assets[name];
    return !!(img&&img.complete&&img.naturalWidth>0);
  };
})();
