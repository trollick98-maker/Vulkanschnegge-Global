/* The pursuit uses screen-space projectiles while the road scrolls underneath. */
(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  const windup = .48;
  const patterns = {
    reef: { fan: 'plasma', lane: 'toxic', speed: 340, spacing: .15, lift: 16 },
    greed: { fan: 'coin', lane: 'gold', speed: 330, spacing: .12, lift: 0 },
    diva: { fan: 'star', lane: 'feathers', speed: 355, spacing: .18, lift: 46 },
    vortex: { fan: 'weight', lane: 'surge', speed: 375, spacing: .12, lift: 12 },
    god: { fan: 'packet', lane: 'fault', speed: 380, spacing: .16, lift: 58 }
  };

  V.newBossChase = function (node, character, build, seed) {
    const definition = V.bosses[node.biome];
    const s = V.newSection({ kind: 'boss-chase', character, build, biome: node.biome,
      seed: seed + ':' + node.id + ':chase', hp: V.rules.bossPlayerHp, title: 'Verfolgung · ' + definition.name });
    const pattern = patterns[node.biome];
    s.node = node;
    s.duration = V.rules.bossChaseSeconds;
    s.worldWidth = V.W;
    s.startSpeed = s.speed = 440 + (node.tier - 1) * 32 + V.characters[character].speed * .5;
    s.chase = { definition, pattern, x: V.W - 200, y: G - 121 - pattern.lift, w: 164, h: 121,
      next: .72, wave: 0, warning: null };
    s.spawnCursor = { terrain: 0, coins: 0 };
    V.spawnCourse(s);
    V.say(s, 'Bleib dran · die Bossarena ist voraus');
    return s;
  };

  function planVolley(s, pressure) {
    const b = s.chase;
    const p = s.player;
    const pattern = b.pattern;
    const originX = b.x + b.w * .25;
    const originY = b.y + b.h * .53;
    const speed = pattern.speed + 64 * pressure;
    const shots = [];
    const queue = (key, y, vx, vy) => shots.push({ key, ...V.bossShots[key], x: originX, y, vx, vy });
    const wave = b.wave++ % 3;
    if (wave === 1) {
      const laneCount = pressure < .44 ? 2 : 3;
      for (let i = 0; i < laneCount; i++) queue(pattern.lane, G - 21 - i * 73, -speed, 0);
    } else {
      const count = (wave === 0 ? 3 : 4) + Number(pressure >= .54);
      const aim = Math.atan2(originY - p.y - p.h / 2, originX - p.x - p.w / 2);
      for (let i = 0; i < count; i++) {
        const angle = aim + (i - (count - 1) / 2) * pattern.spacing;
        queue(pattern.fan, originY, -Math.cos(angle) * speed, -Math.sin(angle) * speed);
      }
    }
    b.warning = { at: s.elapsed + windup, shots, hint: wave === 1 ? 'Sperrfeuer · durch die Lücke springen' :
      'Zielsalve · Position wechseln oder helle Kugeln kontern' };
    V.emitParticles(s, 'charge', originX, originY, { color: b.definition.color });
  }

  V.updateChaseAttacks = function (s, dt) {
    const b = s.chase;
    const pressure = Math.min(1, s.elapsed / s.duration);
    if (!b.warning) {
      b.x = V.W - 200 + Math.sin(s.elapsed * 1.45) * 23;
      b.y = G - b.h - b.pattern.lift - (1 + Math.sin(s.elapsed * 2.2)) * 14;
      if (s.elapsed >= b.next && s.elapsed < s.duration - 1.1) planVolley(s, pressure);
    } else if (s.elapsed + 1e-7 >= b.warning.at) {
      for (const shot of b.warning.shots) {
        s.projectiles.push(shot);
        V.emitParticles(s, 'shot', shot.x, shot.y, { color: shot.color, direction: -1 });
      }
      V.audio?.effect?.(b.definition.sound);
      b.warning = null;
      b.next = s.elapsed + 1.18 - .45 * pressure;
    }
    V.updateBossShots(s, dt);
  };
})();
