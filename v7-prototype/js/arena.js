/* Arena attacks lock their targets during the wind-up. */
(function () {
  'use strict';
  const V = window.VS7;
  const kinds = {
    crawler: { w: 42, h: 30, baseHp: 100, color: '#f7a665', range: 155, windup: .42, active: .29, recovery: .58, travel: 132 },
    jumper: { w: 34, h: 38, baseHp: 80, color: '#e3a3fc', range: 208, windup: .50, active: .60, recovery: .56, travel: 198 },
    armored: { w: 51, h: 40, baseHp: 175, color: '#82dadd', range: 245, windup: .68, active: .20, recovery: .85, travel: 0 }
  };
  const healthByTier = [1, 1.35, 1.75, 2.25];

  function populate(s) {
    const random = V.randomFor(s.seed + ':enemies');
    const islands = s.platforms.filter(platform => platform.ground).slice(1);
    islands.forEach((island, index) => {
      if (index % 3 === 2 && index !== islands.length - 1) return;
      const hasTrap = s.traps.some(trap => trap.x > island.worldX && trap.x < island.worldX + island.w);
      const count = !hasTrap && s.node.tier >= 3 && index % 2 === 1 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const tunnelGuard = s.node.id === 'reef-side' && index === islands.length - 1 && i === count - 1;
        const key = s.node.tier === 1 && i === 0 ? 'crawler' :
          (tunnelGuard || random() < (s.node.tier - 1) * .19) ? 'armored' : random() < .48 ? 'jumper' : 'crawler';
        const type = kinds[key];
        const fraction = hasTrap ? (i === 0 ? .25 : .78) : (i + 1) / (count + 1);
        const x = island.worldX + island.w * fraction - type.w / 2;
        const hp = Math.round(type.baseHp * healthByTier[s.node.tier - 1]);
        s.enemies.push({ ...type, key, x, y: island.y - type.h, floorY: island.y, facing: -1,
          hp, maxHp: hp, touching: false, attackState: 'ready',
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
    s.cameraY = V.GROUND - 405;
    s.checkpointX = s.player.x;
    s.checkpointY = s.supportY = V.GROUND;
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
    const ground = enemy.floorY - enemy.h;
    enemy.flash = Math.max(0, (enemy.flash ?? 0) - dt);
    enemy.attackLeft -= dt;
    if (enemy.attackState === 'tell') {
      if (enemy.attackLeft > 0) return;
      enemy.attackState = 'active';
      enemy.attackLeft = enemy.active;
      if (enemy.key === 'armored') {
        const x = enemy.x + enemy.w / 2 + enemy.facing * (enemy.w / 2 + 14);
        s.projectiles.push({ key: 'surge', x, y: enemy.floorY - 15, vx: enemy.facing * 350, r: 19,
          left: enemy.left - 15, right: enemy.right + enemy.w + 15 });
        V.impact(s, x, enemy.floorY - 3, '#85dcff');
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
      if (enemy.key === 'jumper') V.impact(s, enemy.x + enemy.w / 2, enemy.floorY - 3, enemy.color);
      return;
    }
    if (enemy.attackState === 'recover') {
      enemy.y = Math.min(ground, enemy.y + 280 * dt);
      if (enemy.attackLeft <= 0) enemy.attackState = 'ready';
      return;
    }

    if (s.player.x + s.player.w < enemy.left - 68 || s.player.x > enemy.right + enemy.w + 68 ||
        Math.abs(s.player.y + s.player.h - enemy.floorY) > 155) return;
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

  V.arenaCameraTarget = function (s) {
    return V.clamp(s.player.x + s.player.w / 2 - V.W * .42, 0, s.worldWidth - V.W);
  };

  function hitEnemy(s, enemy, damage) {
    const amount = Math.min(enemy.hp, damage);
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (!s.player.swing) V.rebound(s);
    else if (s.chainDash) {
      s.player.dashCooldown = 0;
      s.player.airDash = true;
    }
    enemy.attackState = 'recover';
    enemy.attackLeft = .56;
    if (amount > 0) enemy.flash = .13;
    V.hitFeedback(s, amount > 0 ? 'hit' : 'guard', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2,
      { amount, direction: s.player.facing, heavy: enemy.hp === 0 });
    if (enemy.hp === 0) {
      s.kills++;
      s.score += 75 + damage;
      V.addCoin(s, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    }
    V.say(s, damage > 0 ? s.weapon.name + ' · −' + amount + ' HP' : 'Mehr Anlauf!');
  }

  V.updateArena = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    V.movePlayer(s, dt, actions);
    const p = s.player;
    if (p.y > s.supportY + 300) {
      p.invuln = 0;
      V.hurt(s);
      Object.assign(p, { x: s.checkpointX, y: s.checkpointY - p.h, vx: 0, vy: 0, grounded: true,
        jumps: 0, airDash: true, dashBuffer: 0, jumpBuffer: 0, dashCooldown: 0, angle: 0, landTime: 0, swing: null });
      s.cameraX = V.arenaCameraTarget(s);
      s.cameraY = s.checkpointY - 405;
      s.supportY = s.checkpointY;
      s.speed = 0;
      if (s.outcome === null) V.say(s, 'Abgrund · zurück auf die letzte Insel');
      return;
    }
    s.cameraX = V.lerp(s.cameraX, V.arenaCameraTarget(s), Math.min(1, dt * 7.5));
    const targetY = p.grounded ? p.y + p.h - 405 : V.clamp(s.cameraY, p.y + p.h - 475, p.y - 115);
    s.cameraY = V.lerp(s.cameraY, targetY, Math.min(1, dt * 6));
    let firstHit = Infinity;
    let target;
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      const oldX = enemy.x;
      const oldY = enemy.y;
      updateEnemy(s, enemy, dt);
      const contact = V.movementContact(p, enemy);
      const strike = s.weapon.angles ? V.weaponContact(s, enemy, enemy.x - oldX, enemy.y - oldY) :
        p.dashTime > 0 ? contact : Infinity;
      if (strike < Infinity) {
        if (strike < firstHit) {
          firstHit = strike;
          target = enemy;
        }
      } else if (contact < Infinity) {
        if (enemy.attackState === 'active' && enemy.key !== 'armored' && p.invuln <= 0) V.hurt(s);
        else if (!enemy.touching) V.slowOnImpact(s);
      }
      enemy.touching = V.overlap(p, enemy);
    }
    if (target && s.outcome === null) {
      p.swing?.hits.add(target);
      hitEnemy(s, target, p.dashPower);
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
    if (s.outcome === null) V.updateArenaTraps(s, dt);
    s.speed = Math.abs(p.vx);
    s.score += s.speed * .1 * dt;
    V.collectCoins(s);
    if (s.outcome !== null) return;
    s.exitOpen = s.enemies.every(enemy => enemy.hp <= 0);
    if (!p.grounded || Math.abs(p.y + p.h - s.exitY) > 1 || p.x + p.w / 2 < s.exitX) return;
    if (s.exitOpen) s.outcome = true;
    else if (s.feedbackTime <= 0) V.say(s, 'Tor gesperrt · Gegner auf den Inseln besiegen');
  };
})();
