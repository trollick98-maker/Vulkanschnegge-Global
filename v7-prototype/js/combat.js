/* Right-anchored Bossrunner, extended from the Muränenring. */
(function () {
  'use strict';
  const V = window.VS7;
  const attacks = V.bossAttacks;

  V.newCombat = function (node, character, build, seed) {
    const definition = V.bosses[node.biome];
    const s = V.newSection({ kind: 'boss', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 5, title: definition.name });
    s.node = node;
    s.spawnCursor = { terrain: 0, coins: 0 };
    s.wind = 0;
    s.windTime = 0;
    s.boss = { definition, x: 756, y: 156, w: 188, h: 235, hp: definition.hp, maxHp: definition.hp,
      phase: 0, cursor: 0, attacks: 0, wait: .65, tell: null, flash: 0 };
    V.spawnCourse(s);
    V.say(s, definition.counter);
    return s;
  };

  function prepare(s) {
    const b = s.boss;
    const p = s.player;
    const pattern = b.definition.phases[b.phase];
    const key = pattern[b.cursor++ % pattern.length];
    const attack = attacks[key];
    const total = Math.max(.41, attack.tell - b.phase * .045);
    let lane = V.clamp(p.y + p.h * .5, 170, V.GROUND - 21);
    if (attack.low) lane = V.GROUND - 23;
    if (key === 'toxic') lane = b.attacks % 2 ? 353 : 300;
    const targetX = V.clamp(p.x + p.w * .5, 145, 435);
    b.tell = { key, left: total, total, lane, targetX };
    b.attacks++;
  }

  function fire(s, tell) {
    const b = s.boss;
    const { key, targetX, lane } = tell;
    const attack = attacks[key];
    if (attack.wind) {
      s.wind = attack.wind;
      s.windTime = 1.55;
    } else if (attack.zone) {
      s.projectiles.push({ key, zone: true, x: targetX - attack.width / 2, w: attack.width, life: .32 });
    } else {
      const count = attack.fan || 1;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * (key === 'fault' && b.phase > 0 ? 76 : 47);
        s.projectiles.push({ key, x: b.x - 16, y: V.clamp(lane + offset, 153, V.GROUND - 14),
          r: attack.radius, vx: -(attack.speed + b.phase * 23),
          reflected: false, dead: false });
      }
    }
    b.wait = Math.max(.42, attack.rest - b.phase * .16);
  }

  function updateAttacks(s, dt) {
    const b = s.boss;
    const phase = b.hp * 3 <= b.maxHp ? 2 : b.hp * 3 <= 2 * b.maxHp ? 1 : 0;
    if (phase !== b.phase) {
      b.phase = phase;
      b.cursor = 0;
      V.say(s, s.biome === 'god' ? ['RUN THE LOOP', 'YOU ARE NOT STRONG ENOUGH', 'I AM NOT STRONG ENOUGH'][phase] :
        'Phase ' + (phase + 1));
    }
    if (b.tell) {
      b.tell.left -= dt;
      if (b.tell.left <= 0) {
        fire(s, b.tell);
        b.tell = null;
      }
    } else {
      b.wait -= dt;
      if (b.wait <= 0) prepare(s);
    }
  }

  function updateProjectiles(s, dt) {
    const p = s.player;
    const b = s.boss;
    for (const q of s.projectiles) {
      if (s.outcome !== null) break;
      if (q.dead) continue;
      if (q.zone) {
        q.life -= dt;
        if (q.life <= 0) q.dead = true;
        else if (p.x < q.x + q.w && p.x + p.w > q.x) V.hurt(s);
        continue;
      }
      q.x += q.vx * dt;
      if (q.reflected) {
        if (q.x + q.r >= b.x + 8) {
          q.dead = true;
          b.hp = Math.max(0, b.hp - 1);
          b.flash = .22;
          s.score += 240;
          V.say(s, 'Volltreffer!');
          if (b.hp === 0) s.outcome = true;
        }
        continue;
      }
      const r = q.r * .77;
      if (p.x >= q.x + r || p.x + p.w <= q.x - r || p.y >= q.y + r || p.y + p.h <= q.y - r) continue;
      if (attacks[q.key].reflect && p.dashTime > 0) {
        q.reflected = true;
        q.vx = 780;
        p.vy = -260;
        p.jumps = Math.min(p.jumps, 1);
        p.dashCooldown = Math.min(p.dashCooldown, .36 * s.dashFactor);
        s.score += 80;
        V.say(s, 'Konter!');
      } else {
        q.dead = true;
        V.hurt(s);
      }
    }
    s.projectiles = s.projectiles.filter(q => !q.dead && (q.zone || (q.x > -65 && q.x < V.W + 70)));
  }

  V.updateCombat = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    s.windTime = Math.max(0, s.windTime - dt);
    if (s.windTime <= 0) s.wind = 0;
    s.boss.flash = Math.max(0, s.boss.flash - dt);
    s.speed = V.clamp((355 + V.characters[s.character].speed * .25 + s.bonusSpeed * .55) * s.speedFactor, 250, 535);
    V.movePlayer(s, dt, actions);
    s.dist += s.speed * dt;
    s.score += s.speed * s.scoreRate * dt;
    V.updateCourse(s);
    if (s.outcome === null) {
      updateAttacks(s, dt);
      updateProjectiles(s, dt);
    }
  };
})();
