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


