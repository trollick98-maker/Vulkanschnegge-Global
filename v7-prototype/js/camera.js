/* Render-only camera cues. The simulation retains its own camera and clock. */
(function () {
  'use strict';
  const V = window.VS7;
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const cues = {
    travel: { duration: 1.7, title: 'REISE', zoom: .115, pan: 29, rise: -19 },
    arena: { duration: 1.55, title: 'GEGNERLEVEL', zoom: .105, pan: 22, rise: -16 },
    arcade: { duration: 1.5, title: 'ENDLOS', zoom: .10, pan: 26, rise: -17 },
    'boss-chase': { duration: 1.15, title: 'VERFOLGUNG', zoom: .095, pan: 23, rise: -16 },
    boss: { duration: .72, title: 'BOSSARENA · PHASE I', zoom: .075, pan: 12, rise: -10 }
  };

  V.startCameraCue = function (s) {
    if (!preference?.matches) s.cameraCue = { ...cues[s.kind], age: 0 };
  };

  V.updateCameraCue = function (s, dt, input) {
    const cue = s.cameraCue;
    if (!cue) return;
    cue.age += dt;
    // Hand the camera back promptly when the player takes the controls.
    if (!cue.cut && (input.left || input.right || input.jumpQueued || input.dashQueued)) {
      cue.cut = { at: cue.age, remaining: Math.max(0, cue.duration - cue.age) };
    }
    if (preference?.matches || cue.age >= cue.duration || (cue.cut && cue.age >= cue.cut.at + .18)) {
      s.cameraCue = null;
    }
  };

  V.cameraView = function (s) {
    const cue = s.cameraCue;
    if (!cue || preference?.matches) return null;
    const t = V.clamp((cue.cut?.at ?? cue.age) / cue.duration, 0, 1);
    const settle = (1 - t) ** 2;
    const cut = cue.cut ? 1 - V.clamp((cue.age - cue.cut.at) / Math.min(.18, cue.cut.remaining || .18), 0, 1) : 1;
    return {
      zoom: 1 + cue.zoom * settle * cut,
      x: cue.pan * settle * cut,
      y: cue.rise * settle * cut,
      title: cue.title,
      alpha: Math.min(1, 3.8 * (1 - t)) * cut
    };
  };
})();
