/* Arena attacks lock their targets during the wind-up. */
(function () {
  'use strict';
  const V = window.VS7;
  const kinds = {
    crawler: { w: 42, h: 30, hp: 1, color: '#f7a665', range: 155, windup: .42, active: .29, recovery: .58, travel: 132 },
    jumper: { w: 34, h: 38, hp: 1, color: '#e3a3fc', range: 208, windup: .50, active: .60, recovery: .56, travel: 198 },
    armored: { w: 51, h: 40, hp: 2, color: '#82dadd', range: 245, windup: .68, active: .20, recovery: .85, travel: 0 }
  };

  function populate(s) {
    const random = V.randomFor(s.seed + ':enemies');
    const islands = s.platforms.filter(platform => platform.ground).slice(1);
    islands.forEach((island, index) => {
      const count = s.node.tier >= 3 && index % 2 === 1 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const tunnelGuard = s.node.id === 'reef-side' && index === islands.length - 1 && i === count - 1;
        const key = s.node.tier === 1 && i === 0 ? 'crawler' :
          (tunnelGuard || random() < (s.node.tier - 1) * .19) ? 'armored' : random() < .48 ? 'jumper' : 'crawler';
        const type = kinds[key];
        const x = island.worldX + island.w * (i + 1) / (count + 1) - type.w / 2;
        s.enemies.push({ ...type, key, x, y: V.GROUND - type.h, facing: -1, attackState: 'ready',
          left: island.worldX + 15, right: island.worldX + island.w - type.w - 15,
          attackLeft: .30 + i * .19 + random() * .20 });
      }
    });
  }

  V.newArena = function (node, character, build, seed) {
    const s = V.newSection({ kind: 'arena', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 4, title: node.name });
    s.node = node;
    s.player.x = 76;
    Object.assign(s, V.generateArena(node, seed));
    s.cameraX = 0;
    s.checkpointX = s.player.x;
    s.exitOpen = false;
    s.enemies = [];
    s.kills = 0;
    for (const platform of s.platforms) {
      V.addCoin(s, platform.worldX + platform.w * .50, platform.y - 23);
      V.addCoin(s, platform.worldX + platform.w * .68, platform.y - 23);
    }
    populate(s);
    V.say(s, 'Räume den Weg frei · Ausgang rechts');
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
        s.projectiles.push({ key: 'surge', x, y: V.GROUND - 15, vx: enemy.facing * 350, r: 19,
          left: enemy.left - 15, right: enemy.right + enemy.w + 15 });
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

    if (s.player.x + s.player.w < enemy.left - 68 || s.player.x > enemy.right + enemy.w + 68) return;
    const target = s.player.x + (s.player.w - enemy.w) / 2;
    const distance = target - enemy.x;
    enemy.facing = Math.sign(distance) || enemy.facing;
    if (Math.abs(distance) > enemy.range * .7) enemy.x = V.clamp(enemy.x + enemy.facing * 69 * dt, enemy.left, enemy.right);
    if (enemy.attackLeft <= 0 && Math.abs(distance) <= enemy.range) {
      enemy.attackState = 'tell';
      enemy.attackLeft = enemy.windup;
      enemy.attackX = enemy.x;
      enemy.targetX = V.clamp(enemy.x + V.clamp(distance, -enemy.travel, enemy.travel), enemy.left, enemy.right);
    }
  }

  function cameraTarget(s) {
    return V.clamp(s.player.x + s.player.w / 2 - V.W * .42, 0, s.worldWidth - V.W);
  }

  V.updateArena = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    V.movePlayer(s, dt, actions);
    const p = s.player;
    if (p.y > V.H + 22) {
      p.invuln = 0;
      V.hurt(s);
      Object.assign(p, { x: s.checkpointX, y: V.GROUND - p.h, vx: 0, vy: 0, grounded: true,
        jumps: 0, airDash: true, dashBuffer: 0, jumpBuffer: 0, dashCooldown: 0, angle: 0, landTime: 0 });
      s.cameraX = cameraTarget(s);
      if (s.outcome === null) V.say(s, 'Abgrund · zurück auf die letzte Insel');
      return;
    }
    s.cameraX = V.lerp(s.cameraX, cameraTarget(s), Math.min(1, dt * 7.5));
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
      if (shot.x < shot.left || shot.x > shot.right) shot.dead = true;
      else if (V.projectileHits(p, shot)) {
        shot.dead = true;
        V.hurt(s, Math.sign(shot.vx));
      }
    }
    s.projectiles = s.projectiles.filter(shot => !shot.dead);
    V.collectCoins(s);
    if (s.outcome !== null) return;
    s.exitOpen = s.enemies.every(enemy => enemy.hp <= 0);
    if (!p.grounded || p.y + p.h < V.GROUND - 1 || p.x + p.w / 2 < s.exitX) return;
    if (s.exitOpen) s.outcome = true;
    else if (s.feedbackTime <= 0) V.say(s, 'Tor gesperrt · Gegner auf den Inseln besiegen');
  };
})();
