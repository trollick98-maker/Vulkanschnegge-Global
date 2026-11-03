/* Port of the original 16 Vulkanschnegge 6.4 perk concepts, adapted to short 7.0 runner. */
(function(){
  'use strict';
  const V=window.VS7;
  const catalogue=[
    {id:'jump',name:'+1 Jump',uses:2},
    {id:'gold',name:'Gold-Multiplier +1 | Speed +100',uses:1},
    {id:'freehit',name:'+1 HP',uses:0},
    {id:'gravityBoost',name:'Jump Boost (−20% Gravity)',uses:0},
    {id:'slowMo',name:'Zeitkrümmung (−100 Speed)',uses:2},
    {id:'hyperMode',name:'Hypermodus (+25% Speed, +2 Multiplikator)',uses:1},
    {id:'tinyMode',name:'Kleiner Körper (−50% Größe, −40% Gravity)',uses:1},
    {id:'fatMode',name:'Fettmodus (+50% Größe, +3 HP)',uses:1},
    {id:'spinGod',name:'Spin-Gott (+200% Drehung, −10% Gravity, Magnet)',uses:0},
    {id:'magnet',name:'Magnet (+25% Münz-Reichweite)',uses:3},
    {id:'coinSpawnBoost',name:'Coin-Spawnrate +25%',uses:1},
    {id:'sisyphos',name:'Sisyphos (+3 Jump, +50% Gravity)',uses:1},
    {id:'turboHunter',name:'Turbo-Jäger (2× Speed-Score, 50% Coin-Wert)',uses:1},
    {id:'hardplastic',name:'Eimer aus Hartplastik (+2 HP)',uses:1,allowed:'otter'},
    {id:'springLegs',name:'Federnde Beine (+25% Double Jump)',uses:1,allowed:'frog'},
    {id:'snailRage',name:'Schneckenzorn (+20% Speed, +15 Upgrade-Punkte)',uses:1,allowed:'snail'}
  ];
  V.upgradeCatalogue=catalogue;
  V.createUpgradeState=()=>({selected:{},cleared:0,nextCost:3,bonusChoices:0});
  V.chooseUpgrades=(s,count=3)=>{
    const possible=catalogue.filter(u=>(!u.allowed||u.allowed===V.profile.character)&&(!u.uses||(s.upgrades.selected[u.id]||0)<u.uses));
    for(let i=possible.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[possible[i],possible[j]]=[possible[j],possible[i]];}
    return possible.slice(0,count);
  };
  V.applyUpgrade=(s,id)=>{
    const u=catalogue.find(x=>x.id===id);
    if(!u || (u.allowed&&u.allowed!==V.profile.character))return false;
    const owned=s.upgrades.selected[id]||0;
    if(u.uses&&owned>=u.uses)return false;
    s.upgrades.selected[id]=owned+1;
    const p=s.player;
    switch(id){
      case 'jump':s.extraJumps++;break;
      case 'gold':s.goldMultiplier++;s.bonusSpeed+=100;break;
      case 'freehit':s.hp++;break;
      case 'gravityBoost':p.gravity*=.8;break;
      case 'slowMo':s.bonusSpeed-=100;break;
      case 'hyperMode':s.speedFactor*=1.25;s.multiplier+=2;break;
      case 'tinyMode':{const floor=p.y+p.h;p.w*=.5;p.h*=.5;p.y=floor-p.h;p.gravity*=.6;break;}
      case 'fatMode':{const floor=p.y+p.h;p.w*=1.5;p.h*=1.5;p.y=floor-p.h;s.hp+=3;break;}
      case 'spinGod':p.spinBoost*=3;p.gravity*=.9;s.magnetRange+=.125;break;
      case 'magnet':s.magnetRange+=.25;break;
      case 'coinSpawnBoost':{
        s.coins.push(...s.coins.filter(c=>!c.taken).filter((c,i)=>i%4===0).map(c=>({...c,worldX:c.worldX+85,taken:false})));
        break;
      }
      case 'sisyphos':s.extraJumps+=3;p.gravity*=1.5;break;
      case 'turboHunter':s.scoreRate*=2;s.coinValue*=.5;break;
      case 'hardplastic':s.hp+=2;break;
      case 'springLegs':p.doubleJumpBoost*=1.25;break;
      case 'snailRage':s.speedFactor*=1.2;s.upgrades.cleared+=15;break;
    }
    return true;
  };
})();
