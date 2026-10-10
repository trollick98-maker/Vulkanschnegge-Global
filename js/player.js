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
  particles = []; // Clear visual effects left from the previous run.
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
