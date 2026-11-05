/* Original character/obstacle sprites from Vulkanschnegge 6.4. */
(function(){
  'use strict';
  const V=window.VS7;
  const urls={
    snail:'assets/images/snail.png',
    otter:'assets/images/otter.png',
    frog:'assets/images/frog.png',
    obstacle:'https://i.imgur.com/8gsW8Y5.png'
  };
  V.assets={};
  for(const [name,url] of Object.entries(urls)){
    const img=new Image();
    if(name!=='obstacle'){
      const remote={snail:'https://i.imgur.com/NqwMXsb.png',otter:'https://i.imgur.com/66Den9G.png',frog:'https://i.imgur.com/gLAdS1x.png'};
      let fallback=false;
      img.addEventListener('error',()=>{if(!fallback){fallback=true;img.src=remote[name];}});
    }
    img.src=url; V.assets[name]=img;
  }
  // Fallback artwork is kept when image hosts are unavailable.
  V.readyImage=(name)=>{const img=V.assets[name];return !!(img && img.complete && img.naturalWidth>0);};
})();
