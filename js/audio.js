
// 🎵 Adaptive Music System
let currentMusic = document.getElementById("bgMusic");
const slowMusic = document.getElementById("musicSlow");
const midMusic  = document.getElementById("musicMid");
const fastMusic = document.getElementById("bgMusic");

let activeTrack = "fast";

const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');

// ✅ adaptive Musik nach Speed wählen
function updateMusicBySpeed() {
  let newTrack = activeTrack;

  if (speed < SPEED_ZONE_SLOW) newTrack = "slow";
  else if (speed < SPEED_ZONE_MID) newTrack = "mid";
  else newTrack = "fast";

  if (newTrack !== activeTrack) {
    switchMusic(newTrack);
    activeTrack = newTrack;
  }
}

// ✅ Track-Wechsel MIT SMOOTH CROSSFADE ✨
function switchMusic(mode) {
  let newAudio = fastMusic;
  if (mode === "slow") newAudio = slowMusic;
  if (mode === "mid")  newAudio = midMusic;

  if (newAudio === currentMusic) return;

  const oldAudio = currentMusic;
  const startVolume = oldAudio.volume;
  const fadeTime = 2; // Dauer der Überblendung in Sekunden

  let t = 0;
  function fade() {
    t += 1/60;
    const p = Math.min(t / fadeTime, 1);

    oldAudio.volume = startVolume * (1 - p);
    newAudio.volume = startVolume * p;

    if (p < 1) {
      requestAnimationFrame(fade);
    } else {
      oldAudio.pause();
      oldAudio.volume = startVolume;
    }
  }

  newAudio.currentTime = 0;
  newAudio.muted = oldAudio.muted;
  newAudio.play().catch(()=>{});

  fade();

  currentMusic = newAudio;
}


// Lautstärke Startwert
currentMusic.volume = 0.3;

// Klick startet Musik (Autoplay umgehen)
document.addEventListener('click', () => {
  if (currentMusic.paused) currentMusic.play().catch(()=>{});
}, { once: true });

// Mute / Unmute
muteBtn.addEventListener('click', () => {
  currentMusic.muted = !currentMusic.muted;
  muteBtn.textContent = currentMusic.muted ? '🔈' : '🔇';
});

// Lautstärke ändern
volumeSlider.addEventListener('input', (e) => {
  currentMusic.volume = e.target.value;
});

// 🖥️ Fullscreen-Steuerung
const fsCheckbox = document.getElementById('fullscreenCheckbox');

fsCheckbox.addEventListener('change', async () => {
  try {
    if (fsCheckbox.checked) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (err) {
    console.warn('Fullscreen-Request fehlgeschlagen:', err);
  }
});

document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  fsCheckbox.checked = active;
  document.body.classList.toggle('fullscreen-active', active);

  // 🧠 Titel ausblenden UND Canvas anpassen
  if (active) {
    // Titel aus dem Layout „entfernen“, damit mehr Platz da ist
    titleBar.style.display = "none";
  } else {
    // Titel wieder anzeigen
    titleBar.style.display = "";
  }

  // Spiel neu an Fenstergröße anpassen
  fitToScreen();
});
