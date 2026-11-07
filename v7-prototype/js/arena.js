/* The momentum dash and rebounds of the first V7 fight prototype. */
(function () {
  'use strict';
  const V = window.VS7;
  const kinds = {
    crawler: { w: 42, h: 30, hp: 1, color: '#f7a665' },
    jumper: { w: 34, h: 38, hp: 1, color: '#e3a3fc' },
    armored: { w: 51, h: 40, hp: 2, color: '#82dadd' }
  };

  function startWave(s) {
    const count = (s.node.tier === 1 ? 3 : 4) + (s.wave > 1 ? 1 : 0);
    const random = V.randomFor(s.seed + ':' + s.wave);
    s.enemies = [];
    for (let i = 0; i < count; i++) {
      const tunnelGuard = s.node.id === 'reef-side' && i === count - 1;
      const key = s.node.tier === 1 && i === 0 ? 'crawler' :
        (tunnelGuard || random() < (s.node.tier - 1) * .19) ? 'armored' : random() < .48 ? 'jumper' : 'crawler';
      const type = kinds[key];
      const x = 325 + i * (520 / count) + Math.floor(random() * 37);
      s.enemies.push({ ...type, key, x, origin: x, y: V.GROUND - type.h, phase: random() * 6.28 });
    }
    V.say(s, 'Welle ' + s.wave + ' / ' + s.waves);
  }

  V.newArena = function (node, character, build, seed) {
    const s = V.newSection({ kind: 'arena', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 4, title: node.name });
    s.node = node;
    s.player.x = 76;
    s.platforms = [{ worldX: 245, y: 347, w: 147, h: 17 }, { worldX: 595, y: 333, w: 167, h: 17 }];
    s.wave = 1;
    s.waves = node.tier >= 3 ? 2 : 1;
    s.waveDelay = 0;
    s.kills = 0;
    for (const [x, y] of [[178, 410], [290, 317], [633, 302], [836, 410]]) V.addCoin(s, x, y);
    startWave(s);
    return s;
  };

  V.updateArena = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    V.movePlayer(s, dt, actions);
    const p = s.player;
    s.speed = Math.abs(p.vx);
    s.score += s.speed * s.scoreRate * dt;
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.phase += dt * (1.75 + .14 * s.node.tier);
      enemy.x = enemy.origin + Math.sin(enemy.phase) * (enemy.key === 'crawler' ? 41 : 27);
      const hop = enemy.key === 'jumper' ? Math.max(0, Math.sin(enemy.phase - 1)) ** 2 * 75 : 0;
      enemy.y = V.GROUND - enemy.h - hop;
      if (!V.overlap(p, enemy)) continue;
      if (p.dashTime > 0) {
        enemy.hp -= p.dashPower;
        V.rebound(s, p.facing);
        if (enemy.hp <= 0) {
          s.kills++;
          s.score += 75 + 25 * p.dashPower;
          V.addCoin(s, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        } else {
          V.say(s, 'Panzer getroffen · mehr Anlauf!');
        }
      } else {
        V.hurt(s, p.x < enemy.x ? -1 : 1);
      }
    }
    V.collectCoins(s);
    if (s.outcome !== null || s.enemies.some(enemy => enemy.hp > 0)) return;
    if (s.wave === s.waves) {
      s.outcome = true;
    } else {
      s.waveDelay += dt;
      if (s.waveDelay >= 1.05) {
        s.waveDelay = 0;
        s.wave++;
        startWave(s);
      }
    }
  };
})();
