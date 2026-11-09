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
  const patrols = {
    reef: { stops: [1136, 800, 1000, 545], speed: 430, lift: 18 },
    greed: { stops: [1136, 908, 1238, 694], speed: 335, lift: 0 },
    diva: { stops: [1136, 822, 1080, 532], speed: 445, lift: 105 },
    vortex: { stops: [1136, 724, 990, 492], speed: 565, lift: 26 },
    god: { stops: [1136, 620, 970, 763, 1220], speed: 480, lift: 110 }
  };

  const beatsBetweenSalvos = [8, 6, 4];
  const beatTime = (b, index) => b.beats[index] / 1000;

  function schedule(s, firstBeat, earliest) {
    const b = s.boss;
    let beat = firstBeat;
    while (beat < b.beats.length && beatTime(b, beat) < earliest) beat++;
    if (beat >= b.beats.length || beatTime(b, beat) >= s.duration - .4) return null;
    const at = beatTime(b, beat);
    const phase = Math.min(2, Math.floor(3 * at / s.duration));
    const pattern = b.definition.phases[phase];
    if (phase !== b.patternPhase) {
      b.patternPhase = phase;
      b.cursor = 0;
    }
    const key = pattern[b.cursor++ % pattern.length];
    let warningBeat = beat;
    while (warningBeat > 0 && at - beatTime(b, warningBeat) < attacks[key].tell) warningBeat--;
    return { beat, at, key, phase, warningAt: Math.max(s.songTime, beatTime(b, warningBeat)) };
  }

  V.newCombat = function (node, character, build, seed) {
    const definition = V.bosses[node.biome];
    const { duration, beats } = V.bossRhythms[node.biome];
    const s = V.newSection({ kind: 'boss', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 5, title: definition.name });
    Object.assign(s, { node, duration, songTime: 0, spawnCursor: { terrain: 0, coins: 0 },
      wind: 0, windTime: 0, speed: 355 + V.characters[character].speed * .25 });
    const b = s.boss = { definition, beats, stage: 'chase', chaseDistance: 355 * (14 + node.tier * 2),
      x: 756, y: 156, w: 188, h: 235, phase: 0, patternPhase: 0, cursor: 0, tell: null, flash: 0 };
    b.cue = schedule(s, 0, 1.5);
    V.spawnCourse(s);
    V.say(s, definition.tip);
    return s;
  };

  V.enterBossArena = function (s) {
    const b = s.boss;
    if (b.stage === 'arena') return;
    Object.assign(b, { stage: 'arena', x: patrols[s.biome].stops[0], y: V.GROUND - 128, w: 164, h: 128,
      tell: null, flash: 0, touching: false, facing: -1, stopIndex: 0, move: null });
    b.cue = schedule(s, b.cue?.beat ?? 0, s.songTime + 1.6);
    Object.assign(s, { worldWidth: 1620, cameraX: 0, cameraY: 0, speed: 0, wind: 0, windTime: 0,
      platforms: [{ worldX: 0, y: V.GROUND, w: 1620, h: 17, ground: true }],
      projectiles: [], obstacles: [], coins: [], effects: [] });
    for (const [worldX, y, w] of decks[s.biome]) s.platforms.push({ worldX, y, w, h: 17 });
    const p = s.player;
    Object.assign(p, { x: 76, y: V.GROUND - p.h, vx: 0, vy: 0, angle: 0, grounded: true, jumps: 0, airDash: true,
      coyote: 0, dashTime: 0, dashLeft: 0, dashCooldown: 0, dashBuffer: 0, jumpBuffer: 0, landTime: 0 });
    V.say(s, 'Arena erreicht · Überlebe bis zum letzten Beat');
  };

  function prepare(s, cue) {
    const b = s.boss;
    const p = s.player;
    const attack = attacks[cue.key];
    const total = cue.at - cue.warningAt;
    const tell = b.tell = { key: cue.key, total, left: cue.at - s.songTime };
    const arena = b.stage === 'arena';
    if (attack.height) {
      Object.assign(tell, { width: arena ? s.worldWidth : V.W, targetX: (arena ? s.worldWidth : V.W) / 2 });
    } else if (arena) {
      const targetX = p.x + p.w * .5;
      const targetY = p.y + p.h * .5;
      b.facing = targetX < b.x + b.w * .5 ? -1 : 1;
      const sourceX = b.facing < 0 ? b.x : b.x + b.w;
      const sourceY = attack.low ? V.GROUND - 19 : b.y + b.h * .48;
      Object.assign(tell, { targetX, targetY: attack.low ? sourceY : targetY, sourceX, sourceY, width: attack.width });
    } else {
      let lane = V.clamp(p.y + p.h * .5, 165, V.GROUND - 21);
      if (attack.low) lane = V.GROUND - 23;
      if (cue.key === 'toxic') lane = p.grounded ? 391 : 305;
      Object.assign(tell, { lane, targetX: V.clamp(p.x + p.w * .5, 130, 495), width: attack.width });
    }
  }

  function fire(s, tell, phase) {
    const b = s.boss;
    const { key, targetX, lane, width } = tell;
    const attack = attacks[key];
    const arena = b.stage === 'arena';
    b.flash = .14;
    if (attack.wind) {
      s.wind = arena ? (targetX < b.x ? 1 : -1) * attack.wind * 3 : attack.wind;
      s.windTime = arena ? 1.25 : 1.55;
    } else if (attack.zone) {
      const top = attack.height ? V.GROUND - attack.height : arena ? 0 : 122;
      s.projectiles.push({ key, zone: true, x: targetX - width / 2, w: width, top, life: .32 });
    } else {
      const count = (attack.fan || 1) + phase;
      const speed = attack.speed + phase * 24;
      const angle = arena ? Math.atan2(tell.targetY - tell.sourceY, targetX - tell.sourceX) : 0;
      for (let i = 0; i < count; i++) {
        const spread = i - (count - 1) / 2;
        const aim = angle + spread * .23;
        s.projectiles.push({ key, r: attack.radius, x: arena ? tell.sourceX : b.x - 16,
          y: arena ? tell.sourceY : V.clamp(lane + spread * 43, 153, V.GROUND - 14),
          vx: arena ? Math.cos(aim) * speed : -speed, vy: arena ? Math.sin(aim) * speed : 0 });
      }
    }
  }

  function startPatrol(s, until) {
    const b = s.boss;
    const patrol = patrols[s.biome];
    const window = until - s.songTime;
    if (window < .32) return;
    b.stopIndex = (b.stopIndex + 1) % patrol.stops.length;
    const speed = patrol.speed * (1 + b.phase * .12);
    const delta = V.clamp(patrol.stops[b.stopIndex] - b.x, -speed * window, speed * window);
    const duration = Math.min(window, Math.max(.52, Math.abs(delta) / speed));
    b.facing = Math.sign(delta) || b.facing;
    b.move = { fromX: b.x, toX: b.x + delta, duration, start: s.songTime, lift: patrol.lift };
  }

  function advancePatrol(s) {
    const b = s.boss;
    const move = b.move;
    const t = Math.min(1, (s.songTime - move.start) / move.duration);
    b.x = V.lerp(move.fromX, move.toX, t * t * (3 - 2 * t));
    b.y = V.GROUND - b.h - Math.sin(Math.PI * t) * move.lift;
    if (t === 1) b.move = null;
  }

  function updateAttacks(s) {
    const b = s.boss;
    const phase = Math.min(2, Math.floor(3 * s.songTime / s.duration));
    if (phase !== b.phase) {
      b.phase = phase;
      V.say(s, phase === 2 ? 'Finale · Dichtere Salven' : 'Phase 2 · Der Takt zieht an');
    }
    if (b.move) advancePatrol(s);
    const cue = b.cue;
    if (!cue || s.songTime < cue.warningAt) return;
    if (!b.tell && cue.at - s.songTime >= .23) prepare(s, cue);
    if (b.tell) b.tell.left = Math.max(0, cue.at - s.songTime);
    if (s.songTime + 1e-7 < cue.at) return;
    // A skipped or stalled frame must not send a stack of unannounced attacks.
    if (b.tell && s.songTime - cue.at < .26) fire(s, b.tell, cue.phase);
    b.tell = null;
    b.cue = schedule(s, cue.beat + beatsBetweenSalvos[b.phase], s.songTime + 1.28);
    if (b.stage === 'arena' && b.cue) startPatrol(s, b.cue.warningAt);
  }

  function shotContact(body, shot, reach = 0) {
    const rx = shot.r * .77 + reach;
    const ry = shot.r * .77 + reach * .55;
    const relative = { x: body.x, y: body.y, w: body.w, h: body.h, previousX: body.previousX + shot.x - shot.previousX,
      previousY: body.previousY + shot.y - shot.previousY };
    return V.movementContact(relative, { x: shot.x - rx, y: shot.y - ry, w: 2 * rx, h: 2 * ry });
  }

  function parry(s, q) {
    const p = s.player;
    const factor = 950 / Math.hypot(q.vx, q.vy);
    q.vx *= -factor;
    q.vy *= -factor;
    q.reflected = true;
    q.intercepts = 1 + s.strikeBonus;
    if (s.boss.stage === 'chase') {
      p.vx *= .45;
      p.vy = -145;
      p.dashTime = Math.min(p.dashTime, .08);
      p.jumps = Math.min(p.jumps, 1);
    }
    p.invuln = Math.max(p.invuln, .16);
    p.dashCooldown = s.chainDash ? 0 : Math.min(p.dashCooldown, .29 * s.dashFactor);
    if (s.chainDash) p.airDash = true;
    V.hitFeedback(s, 'parry', q.x, q.y);
    s.score += 80;
    V.say(s, 'Geschoss zurückgeworfen');
  }

  function intercept(s, q) {
    const r = q.r * .77;
    const body = { x: q.x - r, y: q.y - r, w: 2 * r, h: 2 * r,
      previousX: q.previousX - r, previousY: q.previousY - r };
    let next = null;
    let first = Infinity;
    for (const hostile of s.projectiles) {
      if (hostile.dead || hostile.zone || hostile.reflected) continue;
      const time = shotContact(body, hostile);
      if (time < first) {
        first = time;
        next = hostile;
      }
    }
    if (!next) return;
    next.dead = true;
    if (--q.intercepts <= 0) q.dead = true;
    V.hitFeedback(s, 'guard', next.x, next.y);
    s.score += 100;
    V.say(s, 'Geschoss abgefangen!');
  }

  function updateProjectiles(s, dt) {
    const p = s.player;
    for (const q of s.projectiles) {
      if (q.dead) continue;
      if (q.zone) {
        q.life -= dt;
        q.dead = q.life <= 0;
      } else {
        q.previousX = q.x;
        q.previousY = q.y;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (!q.reflected && p.dashTime > 0 && attacks[q.key].reflect && shotContact(p, q, s.parryReach) < Infinity) parry(s, q);
      }
    }
    for (const q of s.projectiles) {
      if (q.reflected && !q.dead) intercept(s, q);
    }
    for (const q of s.projectiles) {
      if (s.outcome !== null) break;
      if (q.dead || q.reflected) continue;
      if (q.zone) {
        const top = q.top ?? 122;
        if (V.movementContact(p, { x: q.x, y: top, w: q.w, h: V.GROUND - top }) < Infinity) V.hurt(s);
      } else if (shotContact(p, q) < Infinity) {
        q.dead = true;
        V.hurt(s, Math.sign(q.vx));
      }
    }
    const width = s.worldWidth ?? V.W;
    s.projectiles = s.projectiles.filter(q => !q.dead &&
      (q.zone || (q.x > -65 && q.x < width + 65 && q.y > -100 && q.y < V.GROUND + 55)));
  }

  function updateArena(s, dt, actions) {
    const b = s.boss;
    const p = s.player;
    V.movePlayer(s, dt, actions);
    s.cameraX = V.lerp(s.cameraX, V.arenaCameraTarget(s), Math.min(1, dt * 8));
    const bossX = b.x;
    const bossY = b.y;
    updateAttacks(s);
    updateProjectiles(s, dt);
    if (s.outcome !== null) return;
    const relative = { ...p, previousX: p.previousX + b.x - bossX, previousY: p.previousY + b.y - bossY };
    if (!b.touching && V.movementContact(relative, b) < Infinity) {
      if (p.dashTime > 0) {
        V.rebound(s);
        V.hitFeedback(s, 'guard', p.x + p.w / 2, p.y + p.h / 2, { direction: p.facing });
      } else V.slowOnImpact(s);
    }
    b.touching = V.overlap(p, b);
    s.speed = Math.abs(p.vx);
    s.score += s.speed * .1 * dt;
  }

  V.updateCombat = function (s, dt, actions, clock = null) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    if (clock) {
      s.songTime = Math.max(s.songTime, clock.time);
      if (clock.duration > 0) s.duration = clock.duration;
    } else s.songTime += dt;
    if (clock ? clock.ended : s.songTime + 1e-7 >= s.duration) {
      s.songTime = s.duration;
      s.outcome = true;
      return;
    }
    s.windTime = Math.max(0, s.windTime - dt);
    if (s.windTime <= 0) s.wind = 0;
    s.boss.flash = Math.max(0, s.boss.flash - dt);
    if (s.boss.stage === 'arena') {
      updateArena(s, dt, actions);
      return;
    }
    V.movePlayer(s, dt, actions);
    s.dist += s.speed * dt;
    s.score += s.speed * .1 * dt;
    updateAttacks(s);
    updateProjectiles(s, dt);
    if (s.outcome === null) V.updateCourse(s);
    if (s.outcome === null && s.dist >= s.boss.chaseDistance) V.enterBossArena(s);
  };
})();
