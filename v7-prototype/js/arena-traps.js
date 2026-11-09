(function () {
  'use strict';
  const V = window.VS7;
  V.arenaTrapTypes = Object.freeze({
    reef: { name: 'Schnappmuschel', width: 68, height: 55, windup: .58, active: .38, rest: 1.55, color: '#80ffe4' },
    greed: { name: 'Goldstacheln', width: 72, height: 57, windup: .72, active: .66, rest: 1.50, color: '#ffc465' },
    diva: { name: 'Spotlight', width: 50, height: 165, windup: .85, active: .48, rest: 1.75, color: '#ff81cd' },
    vortex: { name: 'Wasserfontäne', width: 62, height: 84, windup: .65, active: .62, rest: 1.65, color: '#8ae8ff', launch: 465 }
  });

  V.updateArenaTraps = function (s, dt) {
    const player = s.player;
    const center = player.x + player.w / 2;
    for (const trap of s.traps) {
      const type = V.arenaTrapTypes[trap.kind];
      trap.left = Math.max(0, trap.left - dt);
      if (trap.state === 'idle' && trap.left === 0 && Math.abs(center - trap.x) < 145 &&
          player.y + player.h >= trap.y - type.height - 45 && player.y < trap.y + 25) {
        trap.state = 'tell';
        trap.left = type.windup;
        V.say(s, type.name + ' · Vorsicht');
      } else if (trap.state === 'tell' && trap.left === 0) {
        trap.state = 'active';
        trap.left = type.active;
        trap.hit = false;
        V.impact(s, trap.x, trap.y - 12, type.color);
      } else if (trap.state === 'active' && trap.left === 0) {
        trap.state = 'idle';
        trap.left = type.rest;
      }
      if (trap.state !== 'active' || trap.hit || player.invuln > 0) continue;
      if (!V.overlap(player, { x: trap.x - type.width / 2, y: trap.y - type.height, w: type.width, h: type.height })) continue;
      V.hurt(s, center < trap.x ? -1 : 1);
      if (type.launch) player.vy = -type.launch;
      trap.hit = true;
      if (s.outcome !== null) return;
    }
  };
})();
