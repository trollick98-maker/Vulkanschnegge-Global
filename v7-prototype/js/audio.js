(function () {
  'use strict';
  const V = window.VS7;
  const voices = new Map();
  const playing = new Set();
  const failed = new Set();
  const effects = new Map();
  const effectNames = ['hit', 'hurt', 'guard', 'parry', 'dash', 'dash-fast', 'skid', 'katana',
    'reef-charge', 'greed-strike', 'diva-note', 'vortex-slam', 'god-fault', 'god-morph', 'god-collapse', 'god-arena-glitch', 'boss-break',
    'ultimate-katana', 'ultimate-spear', 'ultimate-axe', 'clear-travel', 'clear-arena', 'clear-boss', 'clear-finale'];
  let scene = null;
  let wanted = null;
  let active = null;
  let enabled = true;
  let effectsEnabled = true;
  let volume = .30;
  let zoneTime = 0;
  let cinematicSound = null;

  function pause() {
    for (const voice of playing) voice.audio.pause();
  }

  function pauseEffects() {
    for (const pool of effects.values()) {
      for (const audio of pool) audio.pause();
    }
  }

  function createEffect(key) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = 'assets/sfx/' + key + '.wav';
    return audio;
  }

  function play(voice) {
    if (cinematicSound || !scene || (!enabled && scene !== 'boss') || document.hidden) return Promise.resolve(false);
    return voice.audio.play().then(() => true, () => false);
  }

  function voiceFor(key) {
    if (voices.has(key)) return voices.get(key);
    const track = V.soundtracks[key];
    const audio = new Audio();
    const voice = { audio, gain: 0 };
    audio.preload = key === 'home-at-last' ? 'auto' : 'none';
    audio.volume = 0;
    audio.addEventListener('error', () => {
      if (track.remote && !voice.remote) {
        voice.remote = true;
        audio.src = track.remote;
        if (key === active) play(voice);
      } else {
        failed.add(key);
        audio.pause();
        playing.delete(voice);
        if (key === active) select(wanted);
      }
    });
    audio.src = 'assets/music/' + track.file;
    voices.set(key, voice);
    return voice;
  }

  function select(key) {
    wanted = key;
    const fallback = scene === 'boss' ? 'mid' : 'slow';
    active = failed.has(key) ? (failed.has(fallback) ? null : fallback) : key;
    if (!active || (!enabled && scene !== 'boss') || document.hidden) return Promise.resolve(false);
    const voice = voiceFor(active);
    const bossTrack = scene === 'boss' && active === wanted;
    voice.audio.muted = !enabled;
    voice.audio.loop = scene === 'menu' || scene === 'boss' || !V.soundtracks[active].once;
    if (!playing.has(voice)) {
      voice.gain = scene === 'menu' || bossTrack ? 1 : 0;
      voice.audio.volume = enabled ? volume * voice.gain : 0;
      playing.add(voice);
    }
    return play(voice);
  }

  V.audio = {
    startLevel(mode, track = 'slow') {
      this.stop();
      scene = mode;
      return select(Object.hasOwn(V.soundtracks, track) ? track : 'slow');
    },
    startMenu() {
      if (scene !== 'menu') return this.startLevel('menu', 'home-at-last');
      const voice = voices.get(active);
      if (voice && !voice.audio.paused) return Promise.resolve(true);
      return select(wanted);
    },
    startClear(kind) {
      this.stop();
      scene = 'clear';
      this.effect('clear-' + kind);
    },
    updateRunner(speed, dt) {
      if (scene !== 'arcade') return;
      zoneTime += dt;
      if (wanted === 'slow' && speed >= 490 && zoneTime >= 28) {
        zoneTime = 0;
        select('mid');
      } else if (wanted === 'mid' && speed >= 625 && zoneTime >= 37) {
        zoneTime = 0;
        select('fast');
      }
    },
    cinematic(on, sound) {
      cinematicSound = on ? sound : null;
      if (on) {
        pause();
        pauseEffects();
        if (effectsEnabled && !effects.has(sound)) effects.set(sound, [createEffect(sound)]);
        return;
      }
      const voice = voices.get(active);
      if (voice) {
        voice.gain = 0;
        voice.audio.volume = 0;
        play(voice);
      }
    },
    current: () => active,
    bossClock() {
      if (scene !== 'boss' || active !== wanted) return null;
      const audio = voices.get(active)?.audio;
      if (!audio || audio.paused || audio.readyState < 2) return null;
      return { time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 };
    },
    isEnabled: () => enabled,
    effectsEnabled: () => effectsEnabled,
    setEffectsEnabled(on) {
      effectsEnabled = Boolean(on);
      if (!effectsEnabled) pauseEffects();
    },
    effect(key, heavy = false) {
      if ((cinematicSound && key !== cinematicSound) || !scene || scene === 'story' || scene === 'menu' || !effectsEnabled || volume === 0 || document.hidden || !effectNames.includes(key)) return;
      if (!effects.has(key)) effects.set(key, []);
      const pool = effects.get(key);
      const idle = pool.findIndex(voice => voice.paused);
      let audio;
      if (idle >= 0) audio = pool.splice(idle, 1)[0];
      else if (pool.length === 2) audio = pool.shift();
      else audio = createEffect(key);
      pool.push(audio);
      if (audio.readyState > 0) audio.currentTime = 0;
      audio.volume = volume * .92;
      audio.playbackRate = heavy ? .82 : 1;
      audio.play().catch(() => {});
    },
    setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled && scene === 'boss') {
        for (const voice of playing) {
          voice.audio.muted = true;
          voice.audio.volume = 0;
        }
      } else if (!enabled) pause();
      else if (scene && wanted) select(wanted);
    },
    volume(value) {
      volume = V.clamp(value, 0, 1);
      for (const pool of effects.values()) {
        for (const audio of pool) audio.volume = volume * .92;
      }
    },
    stop() {
      pauseEffects();
      cinematicSound = null;
      scene = null;
      wanted = null;
      active = null;
      zoneTime = 0;
      for (const voice of playing) {
        voice.audio.pause();
        if (voice.audio.readyState > 0) voice.audio.currentTime = 0;
        voice.gain = 0;
      }
      playing.clear();
    },
    tick(dt) {
      if (cinematicSound || !scene || (!enabled && scene !== 'boss') || document.hidden) return;
      for (const voice of playing) {
        const target = voices.get(active) === voice ? 1 : 0;
        voice.gain = V.clamp(voice.gain + (target ? 1 : -1) * dt / 1.1, 0, 1);
        voice.audio.volume = enabled ? volume * voice.gain : 0;
        if (!target && voice.gain === 0) {
          voice.audio.pause();
          if (voice.audio.readyState > 0) voice.audio.currentTime = 0;
          playing.delete(voice);
        }
      }
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      pauseEffects();
    } else if (scene && (enabled || scene === 'boss') && active) {
      const voice = voices.get(active);
      if (voice && (voice.audio.loop || !voice.audio.ended)) play(voice);
    }
  });
})();
