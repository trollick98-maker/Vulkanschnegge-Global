
// ======== Device helpers ========
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
// ✅ iOS: UI stabil halten, wenn Tastatur erscheint
document.getElementById("playerNameInput").addEventListener("focus", () => {
  document.body.style.zoom = "1";
  window.scrollTo(0, 0);
});

function isPortrait(){ return window.innerHeight > window.innerWidth; }

// ======== Responsive Fit (2:1 Ratio) ========
const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleBar = document.getElementById('titleBar');
const rotateOverlay = document.getElementById('rotateOverlay');

function fitToScreen(){
  const overlayShouldShow = isMobile && isPortrait();
  rotateOverlay.style.display = overlayShouldShow ? 'flex' : 'none';

  // On mobile landscape: use almost the full viewport height for max size
  const maxW = window.innerWidth;
  const headH = overlayShouldShow ? 0 : titleBar.offsetHeight;
  const maxH = window.innerHeight - headH - 4;

  // Keep 2:1 ratio
  const scale = Math.min(maxW / 800, maxH / 400);
  const w = Math.max(320, Math.floor(800 * scale));
  const h = Math.max(160, Math.floor(400 * scale));

  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
}
window.addEventListener('resize', fitToScreen);
window.addEventListener('orientationchange', fitToScreen);
document.addEventListener('visibilitychange', fitToScreen);
fitToScreen();

// Block inputs when overlay is shown (portrait on mobile)
function inputBlocked(){ return rotateOverlay.style.display === 'flex'; }



// ======== Assets ========
const snailImg = new Image(); snailImg.src = "https://i.imgur.com/NqwMXsb.png";
const otterImg = new Image(); otterImg.src = "https://i.imgur.com/66Den9G.png";
const frogImg = new Image(); frogImg.src = "https://i.imgur.com/gLAdS1x.png";

const obstacleImg = new Image(); obstacleImg.src = "https://i.imgur.com/8gsW8Y5.png";

let playerImg = snailImg; // Standardcharakter
const selectMenu = document.getElementById("playerSelect");

function updateCharacterStatsPreview(char) {
  let stats = "";
  if(char === "snail"){
    stats = `
      <strong>🐌 Schnegg</strong><br>
      ❤️ HP: <span style="color:#55ff55;">+1</span><br>
      🐢 Speed: <span style="color:#ff5555;">-300 px/s</span><br>
      🧲 Magnet: Standard<br>
      🦘 Gravity: <span style="color:#ffaa00;">+10%</span><br>
      ➕ Dafür extrem robust!
    `;
  }
  if(char === "otter"){
    stats = `
      <strong>🦦 Otter im Eimer</strong><br>
      ❤️ HP: Standard<br>
      🐬 Speed: Standard<br>
      🧲 Magnet: <span style="color:#00ddff;">+20%</span><br>
      🦘 Gravity: Standard<br>
      💰 Perfekt für Coin-Farming!
    `;
  }
  if(char === "frog"){
    stats = `
      <strong>🐸 Frogo</strong><br>
      ❤️ HP: Standard<br>
      🐇 Speed: Standard<br>
      🧲 Magnet: Standard<br>
      🦘 Gravity: <span style="color:#55ff55;">-20%</span><br>
      🚀 Beste Sprunghöhe – Trickjump King!
    `;
  }
  document.getElementById("charStats").innerHTML = stats;
}


// Start-Menü Buttons
document.getElementById('openLeaderboard').addEventListener('click', async ()=>{
  lbOverlay.style.display = 'flex';
  await loadLeaderboard();
});
document.getElementById('closeLeaderboard').addEventListener('click', ()=>{
  lbOverlay.style.display = 'none';
});

document.getElementById('startToChars').addEventListener('click', ()=>{
  const name = (document.getElementById('playerNameInput').value||"").trim();
  if (!name){ alert("Bitte Name eingeben 😊"); return; }
  setPlayerName(name);
  hideStartMenu();
  // Charaktermenü öffnen
  selectMenu.style.display = "flex";
  updateCharacterStatsPreview(selectedCharacter);
});


// ======== Physik/Timing (frame-unabhängig) ========
const TARGET_FPS = 60;
const SPEED_ZONE_SLOW = 1000;
const SPEED_ZONE_MID = 1500;
const BASE_SPEED_PXS = 10 * TARGET_FPS;               // 600 px/s
const GRAVITY_PXSS = 0.8 * TARGET_FPS * TARGET_FPS;   // 2880 px/s^2
const JUMP_VY1_PXS = -13 * TARGET_FPS;                // -780 px/s
const JUMP_VY2_PXS = -12 * TARGET_FPS;                // -720 px/s
const SPEED_GROWTH_PER_SEC = (0.001 * TARGET_FPS) * TARGET_FPS; 
let SCORE_PER_SPEED = 0.10; // 100px/s → 10 Punkte/s
const ANGLE_DEG_PER_SEC_BASE = 15 * TARGET_FPS;       // 900°/s

const OBSTACLE_SPAWN_INTERVAL = 65 / TARGET_FPS;  // ≈ 1.083 s
let bonusSpawnInterval = 160 / TARGET_FPS;    // ≈ 2.667 s (kann verändert werden)

let player = {};
// Spielername
const NAME_KEY = "vulkanschneggePlayerName";
function getPlayerName(){ return localStorage.getItem(NAME_KEY) || ""; }
function setPlayerName(n){ localStorage.setItem(NAME_KEY, (n||"").trim().slice(0,24)); }

// Overlays
const startMenu = document.getElementById('startMenu');
const lbOverlay = document.getElementById('leaderboardOverlay');
const lbList = document.getElementById('leaderboardList');

// Start-Flow: beim Laden zeigen wir Startmenü (Name + Buttons)
function showStartMenu(){
  paused = true;
  gameOver = false;
  // vorbefüllen wenn schon Name existiert
  const existing = getPlayerName();
  const input = document.getElementById('playerNameInput');
  input.value = existing;
  startMenu.style.display = 'flex';
}

function hideStartMenu(){
  startMenu.style.display = 'none';
  paused = false;
}

// Leaderboard laden (Top 10, nach Score absteigend)
async function loadLeaderboard(){
  lbList.innerHTML = "Lade...";
  try{
    const snap = await db.collection('scores')
      .orderBy('score', 'desc').limit(10).get();
    if (snap.empty){ lbList.innerHTML = "<em>Noch keine Einträge.</em>"; return; }
    let html = "<ol style='margin:0;padding-left:18px'>";
    snap.forEach(doc=>{
      const d = doc.data();
      const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : "";
      html += `<li><strong>${escapeHTML(d.name||"?" )}</strong> — ${d.score} <span style="opacity:.8">(${dateStr})</span></li>`;
    });
    html += "</ol>";
    lbList.innerHTML = html;
  }catch(e){
    lbList.innerHTML = "Fehler beim Laden.";
    console.warn(e);
  }
}

function escapeHTML(s){ return (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }

let selectedCharacter = "snail"; // default
let tempSelectedCharacter = "snail"; // ✅ Default gesetzt
updateCharacterStatsPreview(selectedCharacter);

// ========== Neuer Charakter-Karussell-Selector ==========
const characters = [
  { id:"snail", img:snailImg },
  { id:"otter", img:otterImg },
  { id:"frog",  img:frogImg }
];

let currentCharIndex = 0;
const previewImg = document.getElementById("charPreviewImg");

function updateCharPreview(){
  const char = characters[currentCharIndex];
  tempSelectedCharacter = char.id;
  previewImg.src = char.img.src;
  updateCharacterStatsPreview(char.id);
}
updateCharPreview();

document.getElementById("charPrev").addEventListener("click", ()=>{
  currentCharIndex = (currentCharIndex - 1 + characters.length) % characters.length;
  updateCharPreview();
});

document.getElementById("charNext").addEventListener("click", ()=>{
  currentCharIndex = (currentCharIndex + 1) % characters.length;
  updateCharPreview();
});

document.getElementById("confirmCharBtn").addEventListener("click", ()=>{
  selectedCharacter = tempSelectedCharacter;
  playerImg = characters[currentCharIndex].img;  // ✅ NEU → Bild setzen!
  applyCharacterStats();
  selectMenu.style.display = "none";
});


let obstacles = [], bonuses = [];
let speed = BASE_SPEED_PXS; // px/s
let score = 0;
let multiplier = 1, multiplierScale=1, targetScale=1;
let distance = 0;
let totalTime = 0;
let gameOver = false;
let spawnAccum=0, bonusAccum=0, missedBonus=false, redTint=0, targetRedTint=0;

let upgradeAvailable=false, paused=false;
let freeHit=0, goldMultiplier=1, extraJump=0;
let coins = 0;
let magnetLevel = 0;
let obstacleCleared = 0;
let nextUpgradeCost = 15; // ✅ erstes Upgrade kostet 15



const MIN_DISTANCE_FROM_OBSTACLE = 400;
let highscore = localStorage.getItem('vulkanschneckeHighscore') || 0;
document.getElementById('highscoreDisplay').innerText = `Highscore: ${highscore}`;

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

// ======== Player/Reset ========
function initPlayer() {
  player = { x:100, y:360-64, width:64, height:64, vy:0, gravity:GRAVITY_PXSS, grounded:false, jumps:0, angle:0, spinBoost:1 };
}
function renderHP(animationType){
  const hpBox = document.getElementById('hpCanvasDisplay');
  hpBox.innerHTML = "";

  for(let i = 0; i < freeHit; i++){
    const heart = document.createElement('span');
    heart.innerText = "❤️";
    heart.classList.add("hpHeart");

    if(i === freeHit-1 && animationType){
      heart.classList.add(animationType);
      setTimeout(()=>heart.classList.remove(animationType), 180);
    }

    hpBox.appendChild(heart);
  }
}

function updateUpgradeBar() {
  const percentage = Math.min(100, (obstacleCleared / nextUpgradeCost) * 100);
  document.getElementById('upgradeFill').style.width = percentage + "%";
  document.getElementById('upgradeText').innerText =
  obstacleCleared + " / " + nextUpgradeCost;

}


function resetGame() {
  initPlayer();
  obstacles=[]; bonuses=[];
  speed=BASE_SPEED_PXS; score=0; multiplier=1; multiplierScale=1; targetScale=1;
  distance = 0;
  totalTime = 0;
  gameOver=false; spawnAccum=0; bonusAccum=0; redTint=0; targetRedTint=0;
  upgradeAvailable=false; paused=false; freeHit=0; goldMultiplier=1; extraJump=0;
  coins = 0; magnetLevel = 0;
  renderHP();
  document.getElementById('scoreDisplay').innerText="Score: 0";
  document.getElementById('speedDisplay').innerText=`Speed: ${speed.toFixed(2)} px/s`; 

  document.getElementById('upgradeScreen').style.display="none";
  player.gravity = GRAVITY_PXSS;
  applyCharacterStats();
  if (document.activeElement) document.activeElement.blur();
  resetUpgrades(); // ✅ der neue Weg
  nextUpgradeCost = 15; // ✅ Reset des Systems
  obstacleCleared = 0;
  updateUpgradeBar(); // ✅ Bar resetten
}
document.getElementById('resetBtn').addEventListener('click', resetGame);

// ======== Online Highscore Speicherung ========
async function submitGlobalScore(finalScore, extraData){
  try {
    const name = getPlayerName() || "Unbenannt";
    const char = extraData.character || "unknown";

    const newScore = {
      name,
      score: finalScore,
      distance: extraData.distance,
      duration: extraData.duration,
      character: char,
      createdAt: firebase.firestore.Timestamp.now()
    };

    // Highscore (optional)
    const snap = await db.collection('scores')
      .orderBy('score', 'desc').limit(1).get();

    let isNewRecord = (!snap || snap.empty || finalScore > (snap.docs[0].data().score || 0));

    if(isNewRecord){
      let message = prompt("NEUER WELTREKORD!\nSchreibe einen Satz, der oben angezeigt wird:");
      if(message){
        newScore.bestMessage = message.trim().slice(0,80);
      }
    }

    await db.collection('scores').add(newScore);

    if(isNewRecord){
      applyBestMessage();
    }

    /*console.log("✅ Score gespeichert:", newScore);*/

  } catch(e){
    console.error("❌ Score submit failed:", e);
  }
}


// ✅ SPEICHERT SICHERE RUN-DATEN
async function submitPendingRun(run){
  try{
    const name = getPlayerName() || "Unbenannt";

    await db.collection('pendingScores').add({
      name,
      distance: Math.floor(run.distance),
      duration: Math.floor(run.duration),
      character: run.character,
      createdAt: firebase.firestore.Timestamp.now()
    });

  } catch(e){
    console.warn("Pending score submit failed:", e);
  }
}



function applyCharacterStats(){
  freeHit = 0;
  speed = BASE_SPEED_PXS;
  player.gravity = GRAVITY_PXSS;
  magnetLevel = 0;

  if(selectedCharacter === "snail"){
    freeHit += 1;                       // +1 HP
    speed -= 5 * TARGET_FPS;            // -300px/s
    player.gravity *= 1.1;              // +10% Gravity
  }

  if(selectedCharacter === "otter"){
    magnetLevel += 0.8;                 // ~20% Coin Reichweite
  }

  if(selectedCharacter === "frog"){
    player.gravity *= 0.8;              // -20% Gravity
  }
  renderHP();
}


// ======== Input: Keyboard + Touch + Click (hybrid) ========
function jump(){
  if (inputBlocked()) return;
  if (!paused && !gameOver && player.jumps < 2 + extraJump) {
    player.vy = (player.jumps===0 ? JUMP_VY1_PXS : JUMP_VY2_PXS);
    player.jumps++;
  }
}
document.addEventListener("keydown", (e)=>{
  if (e.code === "Space") { e.preventDefault(); jump(); }
});
stage.addEventListener('pointerdown', (e)=>{
  if (e.target.closest('button') || e.target.closest('.modal')) return;
  e.preventDefault();
  jump();
}, {passive:false});

// ======== Spawns ========
function spawnObstacle() {
  let width=40+Math.random()*60, height=50+Math.random()*70;
  obstacles.push({x:canvas.width,y:360-height,width,height});
}
function spawnBonus() {
  let valid=false,x,y,attempts=0;
  while(!valid && attempts<20){
    x=canvas.width; y=200+Math.random()*100; valid=true; attempts++;
    for(let o of obstacles){
      if(Math.abs(o.x-x)<100 || (y>o.y-20 && y<o.y+o.height+20)){valid=false; break;}
    }
  }
  if(valid) bonuses.push({x,y,size:15,collected:false});
}

// ======== Game Loop ========
let lastTime = performance.now();

let particles = [];

function update(now){
  const dt = Math.min((now - lastTime)/1000, 0.05); // Sekunden; clamp
  lastTime = now;

// 🌊 Hintergrund – sanfter Unterwasserverlauf
ctx.clearRect(0,0,canvas.width,canvas.height);
const seaGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
seaGrad.addColorStop(0, "#0d3b66");  // oben dunkles Tiefseeblau
seaGrad.addColorStop(0.5, "#145DA0"); // mittleres Ozeanblau
seaGrad.addColorStop(1, "#0A2472");  // unten leicht violett-blau für Tiefe
ctx.fillStyle = seaGrad;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 🌊 Boden – sandiger Meeresgrund
const sandGrad = ctx.createLinearGradient(0, 340, 0, 400);
sandGrad.addColorStop(0, "#c2b280"); // heller Sand oben
sandGrad.addColorStop(1, "#9c8f65"); // dunkler Sand unten
ctx.fillStyle = sandGrad;
ctx.fillRect(0, 340, canvas.width, 60);

  // Hindernisse
  for(let i=obstacles.length-1;i>=0;i--){
    let o=obstacles[i];
    o.x -= (paused || gameOver || inputBlocked() ? 0 : speed*dt);
    ctx.drawImage(obstacleImg,o.x,o.y,o.width,o.height);

    let hitX = o.x + o.width * 0.2;
    let hitY = o.y + o.height * 0.15;
    let hitW = o.width * 0.6;
    let hitH = o.height * 0.7;

    if(player.x < hitX + hitW && player.x + player.width > hitX &&
       player.y < hitY + hitH && player.y + player.height > hitY){
      if(freeHit>0){
        freeHit--; renderHP("hpHit");
        obstacles.splice(i,1);
      } else if(!gameOver){
        gameOver = true;
        paused = true;
        player.vy = 0; player.gravity = 0;
        if(score>highscore){
          highscore = Math.floor(score);
          localStorage.setItem('vulkanschneckeHighscore', highscore);
          document.getElementById('highscoreDisplay').innerText = `Highscore: ${highscore}`;
          applyBestMessage();
        }
        // ✅ Score direkt speichern (validiert durch Firestore Regeln)
        submitGlobalScore(Math.floor(score), {
          distance: Math.floor(distance),
          duration: Math.floor(totalTime),
          character: selectedCharacter
        });



        break;
      }
    }

    if (o.x + o.width < 0) {
    obstacles.splice(i,1);
    obstacleCleared++;
    updateUpgradeBar(); // ✅ NEU

    if (obstacleCleared >= nextUpgradeCost) {
    paused = true;
    showUpgradeScreen();
    obstacleCleared = 0;
    nextUpgradeCost++; // ✅ nächstes Upgrade wird teurer
    updateUpgradeBar(); // ✅ Bar wieder zurücksetzen
    }

    }


  }

  // ✨ Partikel-Update
for (let i = particles.length - 1; i >= 0; i--) {
  const p = particles[i];
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;

  // Verblassen über Zeit
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.fillStyle = `rgba(${p.color},${alpha})`;
  ctx.fillRect(p.x, p.y, p.size, p.size);

  if (p.life <= 0) particles.splice(i, 1);
}

  if(!paused && !gameOver && !inputBlocked()){
    updateMusicBySpeed(); // 🎵 adaptive Musiksteuerung
    distance += speed * dt;
    totalTime += dt;

    // Physik
    player.vy += player.gravity * dt; 
    player.y  += player.vy * dt;

// === Spielerboden-Physik + Partikeleffekt ===
if (player.y >= 360 - player.height) {
  player.y = 360 - player.height;
  player.vy = 0;
  player.jumps = 0;
  player.grounded = true;
  player.angle = 0;

 // 🚀 Wenn auf Boden → Partikelrate skaliert mit Geschwindigkeit
// Mehr Speed = mehr Partikel, aber seltener bei niedriger Geschwindigkeit
const baseSpawnChance = 0.15; // Grundwahrscheinlichkeit bei geringer Geschwindigkeit
const maxSpawnChance = 0.6;   // Max bei sehr hoher Geschwindigkeit
const normalizedSpeed = Math.min(speed / 1500, 1); // 0–1 Skala, ab ~900px/s gesättigt
const spawnChance = baseSpawnChance + (maxSpawnChance - baseSpawnChance) * normalizedSpeed;

if (Math.random() < spawnChance) {
  // Partikelanzahl leicht mit Geschwindigkeit skalieren
  const particleCount = 1 + Math.floor(normalizedSpeed * 4); // max 4 pro Frame bei hohem Speed
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: player.x + player.width * 0.15 + (Math.random() * 6 - 3),
      y: player.y + player.height - 10 + (Math.random() * 4 - 2),
      vx: -100 - Math.random() * (150 + normalizedSpeed * 100),  // schneller Drift bei hohem Speed
      vy: (Math.random() - 0.5) * (20 + normalizedSpeed * 30),   // etwas stärkerer vertikaler Spread
      size: 2 + Math.random() * (1.5 + normalizedSpeed * 1.5),
      color: "255,255,255",
      life: 1.3 + Math.random() * 1.2,
      maxLife: 2
    });
  }

  // Limit
  if (particles.length > 250) particles.splice(0, particles.length - 250);
}






} else {
  player.grounded = false;
}


    if(player.jumps >= 2){
      const spinFactor = (1 + (multiplier-1)*0.1) * (player.spinBoost||1);
      player.angle += ANGLE_DEG_PER_SEC_BASE * spinFactor * dt;
    }

    missedBonus=false;
    for(let i=bonuses.length-1;i>=0;i--){
      let b=bonuses[i]; b.x -= speed*dt; 
      ctx.beginPath(); ctx.fillStyle="yellow"; ctx.arc(b.x,b.y,b.size,0,Math.PI*2); ctx.fill();

      let magnetRange = 1 + magnetLevel*0.25;
      let hitbox = b.size * magnetRange;

      if(player.x<b.x+hitbox && player.x+player.width>b.x-hitbox && player.y<b.y+hitbox && player.y+player.height>b.y-hitbox){
        coins++;
        score += 10*multiplier*goldMultiplier;
        multiplier++; targetScale=1+multiplier*0.1; targetRedTint=Math.min(255,multiplier*20);
        bonuses.splice(i,1);

        continue;
      }
      if(b.x+b.size<0 && !b.collected){ missedBonus=true; bonuses.splice(i,1);}
    }

    if(missedBonus){ multiplier=1; targetScale=1; targetRedTint=0; redTint=0; }

    redTint+=(targetRedTint-redTint)*0.05;
    multiplierScale+=(targetScale-multiplierScale)*0.1;

    // Spawns & Fortschritt zeitbasiert
    spawnAccum += dt;
    bonusAccum += dt;
    if(spawnAccum>OBSTACLE_SPAWN_INTERVAL){ spawnObstacle(); spawnAccum=0; }
    if(bonusAccum>bonusSpawnInterval){ spawnBonus(); bonusAccum=0; }

    speed += SPEED_GROWTH_PER_SEC * dt; 
    score += (speed * SCORE_PER_SPEED) * dt;
  }

  // Spieler
  ctx.save(); 
  ctx.translate(player.x+player.width/2, player.y+player.height/2); 
  ctx.rotate(player.angle*Math.PI/180);
  ctx.drawImage(playerImg,-player.width/2,-player.height/2,player.width,player.height); 
  ctx.restore();

  // HUD
  document.getElementById('scoreDisplay').innerText = "Score: " + Math.floor(score);
  document.getElementById('speedDisplay').innerText = "Speed: " + speed.toFixed(2) + " px/s";


  // Multiplier Anzeige
  ctx.save(); 
  ctx.translate(canvas.width-100,60); 
  ctx.scale(multiplierScale,multiplierScale); 
  ctx.fillStyle="#FFD700"; 
  ctx.font="24px Arial"; 
  ctx.textAlign="center"; 
  ctx.fillText("x"+multiplier,0,0); 
  ctx.restore();

  requestAnimationFrame(update);
}

function startGame(){
  initPlayer();
  lastTime = performance.now();
  requestAnimationFrame(update);
}
startGame();
showStartMenu();
paused = true;


