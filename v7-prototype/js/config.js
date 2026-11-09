(function () {
  'use strict';
  const V = window.VS7 = {};
  V.W = 960;
  V.H = 540;
  V.GROUND = 450;
  V.START_X = 214;
  V.rules = Object.freeze({ travelMin: 120, travelMax: 180, step: 1 / 60 });
  V.arenaMotion = Object.freeze({ jump: 730, gravity: 1790, run: 330, brake: 1750, retainedSpeed: .65, dashRange: 144 });
  V.clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  V.lerp = (a, b, amount) => a + (b - a) * amount;
  V.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  V.randomFor = function (seed) {
    let value = 2166136261;
    for (const char of String(seed)) value = Math.imul(value ^ char.codePointAt(0), 16777619);
    return function () {
      value = (value + 0x6D2B79F5) | 0;
      let bits = Math.imul(value ^ value >>> 15, value | 1);
      bits ^= bits + Math.imul(bits ^ bits >>> 7, bits | 61);
      return ((bits ^ bits >>> 14) >>> 0) / 4294967296;
    };
  };
})();
