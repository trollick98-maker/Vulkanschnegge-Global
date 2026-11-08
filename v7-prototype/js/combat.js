/* Boss chase and platform arena share an encounter and a soundtrack. */
(function () {
  'use strict';
  const V = window.VS7;
  const attacks = V.bossAttacks;
  const decks = {
    reef: [[305, 364, 172], [600, 312, 155], [879, 363, 174], [1344, 356, 188]],
    greed: [[260, 354, 162], [507, 309, 167], [852, 348, 184], [1356, 375, 173]],
    diva: [[338, 361, 156], [591, 303, 179], [918, 347, 146], [1376, 339, 154]],
    vortex: [[239, 377, 165], [513, 324, 181], [820, 355, 190], [1350, 368, 178]],
    god: [[271, 354, 146], [537, 305, 173], [849, 339, 176], [1378, 347, 160]]
  };

  V.newCombat = function (node, character, build, seed) {
    const definition = V.bosses[node.biome];
    const s = V.newSection({ kind: 'boss', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 5, title: definition.name });
    s.node = node;
    s.spawnCursor = { terrain: 0, coins: 0 };
    s.wind = 0;
    s.windTime = 0;
    s.speed = 355 + V.characters[character].speed * .25;
    s.boss = { definition, stage: 'chase', chaseDistance: 355 * (14 + node.tier * 2),
      x: 756, y: 156, w: 188, h: 235, hp: definition.hp, maxHp: definition.hp,
      phase: 0, cursor: 0, attacks: 0, wait: .65, tell: null, flash: 0 };
    V.spawnCourse(s);
    V.say(s, definition.counter);
    return s;
  };

  V.enterBossArena = function (s) {
    const b = s.boss;
    if (b.stage === 'arena') return;
    const hp = 650 + (s.node.tier - 1) * 155;
    Object.assign(b, { stage: 'arena', x: 1136, y: V.GROUND - 128, w: 164, h: 128,
      hp, maxHp: hp, phase: 0, cursor: 0, attacks: 0, wait: 1.25, tell: null, flash: 0, open: false, touching: false });
    Object.assign(s, { worldWidth: 1620, cameraX: 0, cameraY: 0, speed: 0, wind: 0, windTime: 0,
      platforms: [{ worldX: 0, y: V.GROUND, w: 1620, h: 17, ground: true }],
      projectiles: [], obstacles: [], coins: [], effects: [] });
    for (const [worldX, y, w] of decks[s.biome]) s.platforms.push({ worldX, y, w, h: 17 });
    const p = s.player;
    Object.assign(p, { x: 76, y: V.GROUND - p.h, vx: 0, vy: 0, angle: 0, grounded: true, jumps: 0, airDash: true,
      coyote: 0, dashTime: 0, dashLeft: 0, dashCooldown: 0, dashBuffer: 0, jumpBuffer: 0, invuln: 0, landTime: 0 });
    V.say(s, 'Arena erreicht · Nach der Salve mit Anlauf dashen');
  };

  function prepare(s) {
    const b = s.boss;
    const p = s.player;
    const pattern = b.definition.phases[b.phase];
    const key = pattern[b.cursor++ % pattern.length];
    const attack = attacks[key];
    const total = Math.max(.41, attack.tell - b.phase * .045);
    if (b.stage === 'arena') {
      const targetX = p.x + p.w * .5;
      const targetY = p.y + p.h * .5;
      const sourceX = targetX < b.x + b.w * .5 ? b.x : b.x + b.w;
      const sourceY = attack.low ? V.GROUND - 19 : b.y + b.h * .48;
      b.tell = { key, left: total, total, targetX, targetY: attack.low ? sourceY : targetY, sourceX, sourceY };
      b.open = false;
      b.attacks++;
      return;
    }
    let lane = V.clamp(p.y + p.h * .5, 170, V.GROUND - 21);
    if (attack.low) lane = V.GROUND - 23;
    if (key === 'toxic') lane = b.attacks % 2 ? 353 : 300;
    const targetX = V.clamp(p.x + p.w * .5, 145, 435);
    b.tell = { key, left: total, total, lane, targetX };
    b.attacks++;
  }

  function fireArena(s, tell, attack) {
    const b = s.boss;
    if (attack.wind) {
      s.wind = (tell.targetX < b.x ? 1 : -1) * attack.wind * 3;
      s.windTime = 1.25;
    } else if (attack.zone) {
      s.projectiles.push({ key: tell.key, zone: true, x: tell.targetX - attack.width / 2, w: attack.width, life: .32, top: 0 });
    } else {
      const count = attack.fan || 1;
      const angle = Math.atan2(tell.targetY - tell.sourceY, tell.targetX - tell.sourceX);
      for (let i = 0; i < count; i++) {
        const aim = angle + (i - (count - 1) / 2) * .23;
        const speed = attack.speed + b.phase * 26;
        s.projectiles.push({ key: tell.key, x: tell.sourceX, y: tell.sourceY, r: attack.radius,
          vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed, counter: false });
      }
    }
    b.open = true;
    b.wait = 1.5 - b.phase * .15;
    V.say(s, 'Deckung offen · Dash!');
  }

  function fire(s, tell) {
    const b = s.boss;
    const { key, targetX, lane } = tell;
    const attack = attacks[key];
    if (b.stage === 'arena') return fireArena(s, tell, attack);
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
          b.hp = Math.max(0, b.hp - (q.damage ?? 1));
          b.flash = .22;
          V.impact(s, b.x + 21, q.y, '#ffd896', .047);
          s.score += 240;
          V.say(s, 'Volltreffer!');
        }
        continue;
      }
      if (attacks[q.key].reflect && p.dashTime > 0 && V.projectileHits(p, q, s.parryReach)) {
        q.reflected = true;
        q.vx = 950;
        q.damage = 1 + s.strikeBonus;
        p.vx *= .45;
        p.vy = -145;
        p.dashTime = Math.min(p.dashTime, .08);
        p.invuln = Math.max(p.invuln, .16);
        p.jumps = Math.min(p.jumps, 1);
        p.dashCooldown = s.chainDash ? 0 : Math.min(p.dashCooldown, .29 * s.dashFactor);
        V.impact(s, q.x, q.y, '#a9fff0', .042);
        s.score += 80;
        V.say(s, 'Konter!');
      } else if (V.projectileHits(p, q)) {
        q.dead = true;
        V.hurt(s, Math.sign(q.vx));
      }
    }
    s.projectiles = s.projectiles.filter(q => !q.dead && (q.zone || (q.x > -65 && q.x < V.W + 70)));
  }

  function updateArenaProjectiles(s, dt) {
    const p = s.player;
    for (const q of s.projectiles) {
      if (s.outcome !== null) break;
      if (q.zone) {
        q.life -= dt;
        q.dead = q.life <= 0;
        if (!q.dead && V.movementContact(p, { x: q.x, y: q.top, w: q.w, h: V.H - q.top }) < Infinity) V.hurt(s);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const radius = q.r * .77;
      const relative = { ...p, previousX: p.previousX + q.vx * dt, previousY: p.previousY + q.vy * dt };
      if (V.movementContact(relative, { x: q.x - radius, y: q.y - radius, w: 2 * radius, h: 2 * radius }) < Infinity) {
        q.dead = true;
        V.hurt(s);
      }
    }
    s.projectiles = s.projectiles.filter(q => !q.dead &&
      (q.zone || (q.x > -65 && q.x < s.worldWidth + 65 && q.y > -100 && q.y < V.GROUND + 55)));
  }

  function updateFinale(s, dt, actions) {
    const b = s.boss;
    const p = s.player;
    V.movePlayer(s, dt, actions);
    s.cameraX = V.lerp(s.cameraX, V.arenaCameraTarget(s), Math.min(1, dt * 8));
    updateAttacks(s, dt);
    updateArenaProjectiles(s, dt);
    if (s.outcome !== null) return;
    if (V.movementContact(p, b) < Infinity) {
      if (p.dashTime > 0) {
        const damage = b.open ? p.dashPower : 0;
        V.rebound(s);
        b.hp = Math.max(0, b.hp - damage);
        if (damage > 0) {
          b.open = false;
          b.flash = .22;
          s.score += damage;
          V.impact(s, b.x + b.w / 2, b.y + b.h / 2, '#ffd896', .055);
          V.say(s, 'Volltreffer · −' + damage + ' HP');
          if (b.hp === 0) s.outcome = true;
        } else {
          V.say(s, b.open ? 'Mehr Anlauf!' : 'Deckung geschlossen · Auf die Salve warten');
        }
      } else if (!b.touching) V.slowOnImpact(s);
    }
    b.touching = V.overlap(p, b);
    s.speed = Math.abs(p.vx);
    s.score += s.speed * .1 * dt;
  }

  V.updateCombat = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    s.windTime = Math.max(0, s.windTime - dt);
    if (s.windTime <= 0) s.wind = 0;
    s.boss.flash = Math.max(0, s.boss.flash - dt);
    if (s.boss.stage === 'arena') {
      updateFinale(s, dt, actions);
      return;
    }
    V.movePlayer(s, dt, actions);
    s.dist += s.speed * dt;
    s.score += s.speed * .1 * dt;
    updateAttacks(s, dt);
    updateProjectiles(s, dt);
    if (s.outcome === null) V.updateCourse(s);
    if (s.outcome === null && s.boss.hp === 0 && s.dist >= s.boss.chaseDistance) V.enterBossArena(s);
  };
})();
