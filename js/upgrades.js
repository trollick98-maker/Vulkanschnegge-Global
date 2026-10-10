// ======== Upgrades ========
let upgrades = [
  { id:"jump", name:"+1 Jump", effect:()=>extraJump++, uses:2, allowed:0 },
  { id:"gold", name:"Gold-Multiplier + 1 | Speed + 300", effect:()=>{goldMultiplier++; speed+=5*TARGET_FPS;}, uses:1, allowed:0 },
  { id:"freehit", name:"+1 HP", effect:()=>{freeHit++; renderHP();}, uses:0, allowed:0 },
  { id:"gravityBoost", name:"Jump Boost (-20% Gravity)", effect:()=>{player.gravity*=0.8;}, uses:0, allowed:0 },
  { id:"slowMo", name:"Zeitkrümmung (-400 Speed)", effect:()=>{speed -=400;}, uses:2, allowed:0 },
  { id:"hyperMode", name:"Hypermodus (+25% Speed, +2 Multiplier)", effect:()=>{speed*=1.25; multiplier+=2;}, uses:1, allowed:0 },
  { id:"tinyMode", name:"Kleiner Körper (-50% Größe -40% Gravity)", effect:()=>{player.width*=0.5; player.height*=0.5; player.gravity*=0.6;}, uses:1, allowed:0 },
  { id:"fatMode", name:"Fettmodus (+50% Größe, +3 HP)", effect:()=>{player.width*=1.5; player.height*=1.5; freeHit+=3; renderHP();}, uses:1, allowed:0 },
  { id:"spinGod", name:"Spin-Gott (+200% Spin-Speed, -10% Gravity, +12,5% Coin Reichweite)", effect:()=>{player.spinBoost=(player.spinBoost||1)*3; player.gravity*=0.9; magnetLevel+=0.5;}, uses:0, allowed:0 },
  { id:"magnet", name:"Magnet (+25% Coin-Reichweite)", effect:()=>{magnetLevel++;}, uses:3, allowed:0 },
  { id:"coinSpawnBoost", name:"Coin-Spawnrate + 25%", effect:()=>{bonusSpawnInterval*=0.75;}, uses:1, allowed:0 },
  { id:"sisyphos", name:"Sisyphos (+3 Jump, +50% Gravity)", effect:()=>{extraJump+=3; player.gravity*=1.5;}, uses:1, allowed:0 },
  { id:"turboHunter", name:"Turbo-Jäger (2× Speed-Score, 50% Coin-Wert)", effect:()=>{ SCORE_PER_SPEED*=2; goldMultiplier*=0.5; }, uses:1, allowed:0 },
  { id:"hardplastic", name:"Eimer aus Hartplastik (+ 2HP)", effect:()=>{freeHit+=2; renderHP();}, uses:1, allowed:2 },
  { id:"springLegs", name:"Federnde Beine (+25% Double Jump)", effect:()=>{player.vy*=1.25;}, uses:1, allowed:3 },
  { id:"snailRage", name:"Schneckenzorn (+20% Speed, + 15 Upgrade Punkte)", effect:()=>{speed *= 1.2; obstacleCleared += 15}, uses:1, allowed:1 },
];

// 🧠 Original ohne JSON – Funktionen bleiben erhalten!
const originalUpgrades = upgrades.map(u => ({...u}));

// 🔁 Upgrades resetten aber effect() behalten
function resetUpgrades(){
  upgrades = originalUpgrades.map(orig => {
    return {
      ...orig,
      selected: 0,
      effect: orig.effect // ✅ Funktion bleibt erhalten!
    };
  });
}



function getRandomUpgrades(count){
  const charMap = {
    snail: 1,
    otter: 2,
    frog: 3
  };

  let charCode = charMap[selectedCharacter] ?? 0;

  const available = upgrades.filter(u => {
    let allowed = (u.allowed === 0 || u.allowed === charCode);
    let remaining = (u.uses === 0 || (u.selected || 0) < u.uses);
    return allowed && remaining;
  });

  const shuffled = available.sort(()=>Math.random()-0.5);
  return shuffled.slice(0,count);
}


function showUpgradeScreen(){
  paused = true;
  obstacles = []; 
  const choices = getRandomUpgrades(3);
  const container = document.getElementById('upgradeChoices');
  container.innerHTML = "";
  choices.forEach(up=>{
    const btn = document.createElement('button');
    btn.textContent = up.name;
    btn.onclick = ()=>chooseUpgrade(up);
    container.appendChild(btn);
  });
  document.getElementById('upgradeScreen').style.display = "flex";
}
function chooseUpgrade(up){
  up.effect();
  up.selected = (up.selected || 0) + 1;
  if(up.uses > 0 && up.selected >= up.uses) upgrades = upgrades.filter(u=>u.id!==up.id);
  hideUpgrade();
}
function hideUpgrade(){
  paused = false;
  document.getElementById('upgradeScreen').style.display="none";
}
