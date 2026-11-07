(function () {
  'use strict';
  const V = window.VS7;
  const voices = new Map();
  const playing = new Set();
  const failed = new Set();
  let scene = null;
  let wanted = null;
  let active = null;
  let enabled = true;
  let volume = .30;
  let zoneTime = 0;

  function pause() {
    for (const voice of playing) voice.audio.pause();
  }

  function play(voice) {
    if (scene && enabled && !document.hidden) voice.audio.play().catch(() => {});
  }

  function voiceFor(key) {
    if (voices.has(key)) return voices.get(key);
    const track = V.soundtracks[key];
    const audio = new Audio();
    const voice = { audio, gain: 0 };
    audio.preload = 'none';
    audio.loop = !track.once;
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
    if (!active || !enabled || document.hidden) return;
    const voice = voiceFor(active);
    if (!playing.has(voice)) {
      voice.gain = 0;
      voice.audio.volume = 0;
      playing.add(voice);
    }
    play(voice);
  }

  V.audio = {
    startLevel(mode, track = 'slow') {
      this.stop();
      scene = mode;
      select(Object.hasOwn(V.soundtracks, track) ? track : 'slow');
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
    current: () => active,
    isEnabled: () => enabled,
    setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled) pause();
      else if (scene && wanted) select(wanted);
    },
    volume(value) { volume = V.clamp(value, 0, 1); },
    stop() {
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
      if (!scene || !enabled || document.hidden) return;
      for (const voice of playing) {
        const target = voices.get(active) === voice ? 1 : 0;
        voice.gain = V.clamp(voice.gain + (target ? 1 : -1) * dt / 1.1, 0, 1);
        voice.audio.volume = volume * voice.gain;
        if (!target && voice.gain === 0) {
          voice.audio.pause();
          if (voice.audio.readyState > 0) voice.audio.currentTime = 0;
          playing.delete(voice);
        }
      }
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (scene && enabled && active) {
      const voice = voices.get(active);
      if (voice && (voice.audio.loop || !voice.audio.ended)) play(voice);
    }
  });
})();
