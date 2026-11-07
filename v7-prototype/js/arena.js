/* Arena attacks lock their targets during the wind-up. */
(function () {
  'use strict';
  const V = window.VS7;
  const kinds = {
    crawler: { w: 42, h: 30, hp: 1, color: '#f7a665', range: 155, windup: .42, active: .29, recovery: .58, travel: 132 },
    jumper: { w: 34, h: 38, hp: 1, color: '#e3a3fc', range: 208, windup: .50, active: .60, recovery: .56, travel: 198 },
    armored: { w: 51, h: 40, hp: 2, color: '#82dadd', range: 245, windup: .68, active: .20, recovery: .85, travel: 0 }
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
      s.enemies.push({ ...type, key, x, y: V.GROUND - type.h, facing: -1, attackState: 'ready',
        attackLeft: .30 + i * .19 + random() * .20 });
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

  function updateEnemy(s, enemy, dt) {
    const ground = V.GROUND - enemy.h;
    enemy.attackLeft -= dt;
    if (enemy.attackState === 'tell') {
      if (enemy.attackLeft > 0) return;
      enemy.attackState = 'active';
      enemy.attackLeft = enemy.active;
      if (enemy.key === 'armored') {
        const x = enemy.x + enemy.w / 2 + enemy.facing * (enemy.w / 2 + 14);
        s.projectiles.push({ key: 'surge', x, y: V.GROUND - 15, vx: enemy.facing * 350, r: 19 });
        V.impact(s, x, V.GROUND - 3, '#85dcff');
      }
    }
    if (enemy.attackState === 'active') {
      const progress = 1 - Math.max(0, enemy.attackLeft) / enemy.active;
      enemy.x = V.lerp(enemy.attackX, enemy.targetX, progress);
      if (enemy.key === 'jumper') enemy.y = ground - Math.sin(Math.PI * progress) * 103;
      if (enemy.attackLeft > 0) return;
      enemy.attackState = 'recover';
      enemy.attackLeft = enemy.recovery;
      enemy.y = ground;
      if (enemy.key === 'jumper') V.impact(s, enemy.x + enemy.w / 2, V.GROUND - 3, enemy.color);
      return;
    }
    if (enemy.attackState === 'recover') {
      enemy.y = Math.min(ground, enemy.y + 280 * dt);
      if (enemy.attackLeft <= 0) enemy.attackState = 'ready';
      return;
    }

    const target = s.player.x + (s.player.w - enemy.w) / 2;
    const distance = target - enemy.x;
    enemy.facing = Math.sign(distance) || enemy.facing;
    if (Math.abs(distance) > enemy.range * .7) enemy.x += enemy.facing * 69 * dt;
    if (enemy.attackLeft <= 0 && Math.abs(distance) <= enemy.range) {
      enemy.attackState = 'tell';
      enemy.attackLeft = enemy.windup;
      enemy.attackX = enemy.x;
      enemy.targetX = V.clamp(enemy.x + V.clamp(distance, -enemy.travel, enemy.travel), 16, V.W - enemy.w - 16);
    }
  }

  V.updateArena = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    V.movePlayer(s, dt, actions);
    const p = s.player;
    s.speed = Math.abs(p.vx);
    s.score += s.speed * .1 * dt;
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      updateEnemy(s, enemy, dt);
      if (!V.overlap(p, enemy)) continue;
      if (p.dashTime > 0) {
        enemy.hp -= p.dashPower;
        V.rebound(s, p.facing);
        enemy.attackState = 'recover';
        enemy.attackLeft = .56;
        V.impact(s, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.color, .042);
        if (enemy.hp <= 0) {
          s.kills++;
          s.score += 75 + 25 * p.dashPower;
          V.addCoin(s, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        } else {
          V.say(s, 'Panzer getroffen · mehr Anlauf!');
        }
      } else if (enemy.attackState === 'active' && enemy.key !== 'armored') {
        V.hurt(s, p.x < enemy.x ? -1 : 1);
      }
    }
    for (const shot of s.projectiles) {
      shot.x += shot.vx * dt;
      if (V.projectileHits(p, shot)) {
        shot.dead = true;
        V.hurt(s, Math.sign(shot.vx));
      }
    }
    s.projectiles = s.projectiles.filter(shot => !shot.dead && shot.x > -40 && shot.x < V.W + 40);
    V.collectCoins(s);
    if (s.outcome !== null || s.enemies.some(enemy => enemy.hp > 0)) return;
    if (s.wave === s.waves) {
      s.outcome = true;
    } else {
      s.waveDelay += dt;
      if (s.waveDelay >= 1.05) {
        s.waveDelay = 0;
        s.wave++;
        s.projectiles.length = 0;
        startWave(s);
      }
    }
  };
})();
