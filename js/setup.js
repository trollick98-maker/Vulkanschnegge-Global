
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
  paused = true; // Character selection must not advance the run.
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
  selectMenu.style.display = "none";
  resetGame(); // A new character starts a clean run; no leftover perks or score.
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
