
// 💤 Mobile Battery Saver: Stoppe Musik, wenn Seite nicht aktiv ist
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    currentMusic.pause();   // Stoppe Musik wenn Tab/Seite im Hintergrund
  } else {
    // Nur wieder starten, wenn Nutzer zurückkehrt UND nicht gemutet
    if (!currentMusic.muted) {
      currentMusic.play().catch(()=>{});
    }
  }
});

// Charakter-Auswahl Button
document.getElementById("charBtn").addEventListener("click", () => {
  paused = true;
  gameOver = false;  

  

  // Menü anzeigen
  selectMenu.style.display = "flex";
  
    currentCharIndex = characters.findIndex(c => c.id === selectedCharacter);
if(currentCharIndex < 0) currentCharIndex = 0;
updateCharPreview();


  // Bewegung stoppen
  player.angle = 0;
  player.vy = 0;
});

document.getElementById('leaderBtn').addEventListener('click', async ()=>{
  lbOverlay.style.display = 'flex';
  await loadLeaderboard();
});


