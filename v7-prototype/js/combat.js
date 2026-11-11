/* Boss encounters use a scrolling arena from the first frame. */
(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  const deathLength = 1.25;

  V.newCombat = function (node, character, build, seed) {
    const definition = V.bosses[node.biome];
    const s = V.newSection({ kind: 'boss', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: V.rules.bossPlayerHp, title: definition.name });
    const maxHp = definition.hp + 270 * (node.tier - 1);
    Object.assign(s, { node, wind: 0 });
    s.boss = { definition, x: 610, y: G - 133, w: 172, h: 133, hp: maxHp, maxHp,
      state: 'approach', phase: 0, phaseAt: 0, phaseUntil: 0, stageNext: Infinity, stageTurns: 0, readyAt: .75, hurtAt: 0, flash: 0, facing: -1, side: 1, turns: 0,
      random: V.randomFor(s.seed + ':boss-ai'), bag: [] };
    V.initBossArena(s);
    V.say(s, 'Dash mit dem Glutkatana · ' + definition.tip);
    return s;
  };

  function beatDelay(s, clock, minimum) {
    const rhythm = V.bossRhythms[s.biome];
    const duration = clock?.duration || rhythm.duration;
    const earliest = ((clock?.time ?? s.elapsed + (s.trackOffset ?? 0)) + minimum) % duration;
    const beat = rhythm.beats.find(ms => ms >= earliest * 1000 && ms < duration * 1000);
    const extra = beat === undefined ? duration - earliest + rhythm.beats[0] / 1000 : beat / 1000 - earliest;
    return minimum + V.clamp(extra, 0, .85);
  }

  function choose(s) {
    const b = s.boss;
    const attacks = b.definition.attacks;
    const distance = Math.abs(b.x + b.w / 2 - (s.player.x + s.player.w / 2));
    const special = b.forceSpecial || (b.turns > 0 && b.turns % (b.phase === 2 ? 3 : 4) === 0);
    if (special) {
      const options = attacks.filter(attack => attack.special && attack !== b.last);
      b.forceSpecial = false;
      const choice = options[(b.specialTurn ?? 0) % options.length];
      b.specialTurn = (b.specialTurn ?? 0) + 1;
      return choice;
    }
    if (!b.bag.length) b.bag = attacks.filter(attack => !attack.special);
    const varied = b.bag.filter(attack => attack !== b.last && (!attack.close || distance < 400));
    const pool = varied.length ? varied : b.bag;
    const attack = pool[Math.floor(b.random() * pool.length)];
    b.bag = b.bag.filter(item => item !== attack);
    return attack;
  }

  function prepare(s, clock, followUp) {
    const b = s.boss;
    const attack = followUp ?? choose(s);
    if (followUp) b.bag = b.bag.filter(item => item !== attack);
    const lead = beatDelay(s, clock, Math.max(.62, attack.tell - b.phase * .07 - (followUp ? .18 : 0)));
    const combo = followUp ? undefined : b.definition.combos.find(([opener], index) => index < b.phase && opener === attack);
    const strike = s.elapsed + lead;
    b.last = attack;
    b.turns++;
    b.state = 'windup';
    b.plan = { attack, strike, lead, events: [], zones: [], activeUntil: strike + .24, initialHp: s.hp,
      nextAttack: combo?.[1], followUp: Boolean(followUp) };
    V.planBossArena(s, b.plan);
    V.emitParticles(s, 'charge', b.x + b.w / 2, b.y + b.h * .48);
    V.audio?.effect?.(b.definition.sound);
  }

  function recover(s, interrupted = false) {
    const b = s.boss;
    const { attack, zones, initialHp } = b.plan;
    if (interrupted) s.zones = s.zones.filter(zone => !zones.includes(zone));
    b.state = 'recovery';
    b.readyAt = s.elapsed + Math.max(.40, attack.recover - .16 - b.phase * .12 - .035 * s.node.tier);
    b.exposed = attack.exposed ?? (s.hp === initialHp ? 1.18 : 1);
    b.plan = null;
    if (!interrupted && !b.rush && b.turns % 2 === 0) reposition(s);
  }

  function reposition(s) {
    const b = s.boss;
    const p = s.player;
    const center = p.x + p.w / 2;
    const currentSide = b.x + b.w / 2 < center ? -1 : 1;
    const canCross = center > 320 && center < s.worldWidth - 320;
    const side = center <= 320 ? 1 : center >= s.worldWidth - 320 ? -1 : -currentSide;
    const distance = canCross ? 165 : Math.abs(b.x + b.w / 2 - center) < 190 ? 275 : 120;
    const toX = V.clamp(center + side * distance - b.w / 2, 35, s.worldWidth - b.w - 35);
    if (Math.abs(toX - b.x) < 60) return;
    const life = .62 - b.phase * .055;
    b.flank = { x: b.x, y: b.y, toX, toY: b.y, start: s.elapsed, life, lift: b.definition.sidestepLift };
    b.side = side;
    b.readyAt = Math.max(b.readyAt, s.elapsed + life + V.rules.step);
    V.emitParticles(s, 'trail', b.x + b.w / 2, b.y + b.h * .7, { direction: Math.sign(b.x - toX) });
  }

  function positionBoss(s, dt) {
    const b = s.boss;
    const p = s.player;
    const move = b.rush ?? b.flank;
    if (move) {
      const m = move;
      const t = V.clamp((s.elapsed - m.start) / m.life, 0, 1);
      const envelope = Math.sin(Math.PI * t);
      const spin = t * 4 * Math.PI;
      const swirl = m.spiral ? Math.sin(spin) * envelope * m.lift * .72 : 0;
      const lift = envelope * m.lift * (m.spiral ? .68 + .32 * Math.cos(spin) : 1);
      const progress = b.rush ? t : t * t * (3 - 2 * t);
      b.x = V.clamp(V.lerp(m.x, m.toX, progress) + swirl, 35, s.worldWidth - b.w - 35);
      b.y = V.lerp(m.y, m.toY, progress) - lift;
      if (t === 1) {
        if (b.rush) b.rush = null;
        else b.flank = null;
      }
      return;
    }
    if (b.plan?.events.some(event => event.type === 'shot' || event.type === 'rush')) return;
    const center = p.x + p.w / 2;
    const side = center < 320 ? 1 : center > s.worldWidth - 320 ? -1 : b.side;
    const stride = 210 + Math.sin(s.elapsed * (2.3 + b.phase * .25)) * 38;
    const target = V.clamp(center + side * stride - b.w / 2, 35, s.worldWidth - b.w - 35);
    const speed = b.definition.speed * (1 + b.phase * .17) * (b.state === 'recovery' ? .62 : 1);
    b.x += V.clamp((target - b.x) * dt * 2.65, -speed * dt, speed * dt);
    const flight = (Math.sin(s.elapsed * (2.6 + b.phase * .35)) * .43 + .48) * b.definition.lift;
    b.y = V.lerp(b.y, G - b.h - flight, dt * 6);
  }

  function facePlayer(s) {
    const b = s.boss;
    const p = s.player;
    b.facing = Math.sign(p.x + p.w / 2 - b.x - b.w / 2) || b.facing;
  }

  function nextPhase(s) {
    const b = s.boss;
    const phase = b.hp <= b.maxHp / 3 ? 2 : b.hp <= b.maxHp * 2 / 3 ? 1 : 0;
    if (phase <= b.phase) return;
    b.phase = phase;
    b.phaseAt = s.elapsed;
    b.phaseUntil = s.elapsed + 1.18;
    b.readyAt = b.phaseUntil;
    b.stageNext = s.elapsed + 1.62;
    b.forceSpecial = true;
    b.state = 'shift';
    b.plan = b.rush = b.flank = null;
    b.exposed = 1;
    s.zones.length = s.projectiles.length = s.echoes.length = s.chests.length = 0;
    s.arenaFX = {};
    V.emitParticles(s, 'parry', b.x + b.w / 2, b.y + b.h / 2, { color: b.definition.color, heavy: true });
    V.audio?.effect?.(b.definition.sound, true);
    V.say(s, 'PHASE ' + (phase + 1) + ' · ' + b.definition.phases[phase]);
  }

  function updateBoss(s, dt, clock) {
    const b = s.boss;
    const oldX = b.x;
    const oldY = b.y;
    facePlayer(s);
    const plan = b.plan;
    if (plan && s.elapsed >= plan.strike - 1e-7) {
      if (b.state === 'windup') {
        b.state = 'active';
        V.audio?.effect?.(b.definition.sound, true);
      }
      V.triggerBossEvents(s, plan);
      if (s.elapsed >= plan.activeUntil) {
        if (plan.nextAttack) prepare(s, clock, plan.nextAttack);
        else recover(s);
      }
    } else if (!plan && s.elapsed >= b.readyAt) {
      b.exposed = 1;
      prepare(s, clock);
    }
    const rushing = Boolean(b.rush);
    positionBoss(s, dt);
    facePlayer(s);
    const relative = { ...s.player, previousX: s.player.previousX + b.x - oldX, previousY: s.player.previousY + b.y - oldY };
    if (rushing && V.movementContact(relative, { x: b.x + 22, y: b.y + b.h * .40, w: b.w - 44, h: b.h * .58 }) < Infinity) {
      V.hurt(s, Math.sign(b.x - oldX));
    }
    return [b.x - oldX, b.y - oldY];
  }

  V.bossHitboxes = function (b) {
    const weakX = b.x + b.w * (b.facing < 0 ? .40 : .60);
    const weakY = b.y + b.h * .60;
    return {
      body: { x: b.x + b.w * .08, y: b.y + b.h * .17, w: b.w * .84, h: b.h * .78 },
      weak: { x: weakX - 25, y: weakY - 23, w: 50, h: 46 }
    };
  };

  V.defeatBoss = function (s) {
    const b = s.boss;
    b.hp = 0;
    b.state = 'defeated';
    b.defeatedAt = s.elapsed;
    b.plan = b.rush = b.flank = null;
    s.projectiles.length = s.zones.length = s.echoes.length = s.chests.length = 0;
    s.arenaFX = {};
    s.wind = 0;
    s.gravityFactor = 1;
    V.emitParticles(s, 'defeat', b.x + b.w / 2, b.y + b.h * .45, { color: b.definition.color });
    V.say(s, b.definition.name + ' besiegt');
    V.audio?.effect?.('boss-break', true);
  };

  function strikeBoss(s, dx, dy) {
    const b = s.boss;
    const p = s.player;
    if (s.elapsed < Math.max(b.hurtAt, b.phaseUntil)) return;
    const { body, weak } = V.bossHitboxes(b);
    const canInterrupt = b.state === 'windup' && b.plan.attack.interrupt;
    const mark = b.state === 'recovery' && b.exposed > 1;
    const weakHit = (canInterrupt || mark) && V.weaponContact(s, weak, dx, dy, b) < Infinity;
    const relative = { ...p, previousX: p.previousX + dx, previousY: p.previousY + dy };
    const bodyHit = s.weapon.angles ? V.weaponContact(s, body, dx, dy, b) < Infinity :
      p.dashTime > 0 && p.dashTarget !== b && V.movementContact(relative, body) < Infinity;
    if (!weakHit && !bodyHit) return;
    if (p.swing) p.swing.hits.add(b);
    else p.dashTarget = b;
    const bonus = weakHit ? (canInterrupt ? b.plan.attack.exposed : b.exposed) : 1;
    const floor = Math.floor(b.maxHp * (2 - b.phase) / 3);
    const damage = Math.min(b.hp - floor, Math.round(p.dashPower * bonus));
    if (damage <= 0) return;
    b.hp -= damage;
    b.hurtAt = s.elapsed + .12;
    b.flash = .17;
    b.hitSide = p.facing;
    s.score += damage;
    if (s.chainDash) {
      p.dashCooldown = 0;
      p.airDash = true;
    }
    const impact = weakHit ? weak : body;
    V.hitFeedback(s, 'hit', impact.x + impact.w / 2, impact.y + impact.h / 2,
      { amount: damage, heavy: weakHit || !b.hp, direction: p.facing });
    if (!b.hp) V.defeatBoss(s);
    else if (weakHit && canInterrupt) {
      recover(s, true);
      V.say(s, 'Unterbrochen · −' + damage + ' HP');
    } else V.say(s, (weakHit ? 'Schwachstelle' : s.weapon.name) + ' · −' + damage + ' HP');
  }

  function contactShot(p, q, reach = 0) {
    const r = q.r * .78 + reach;
    const relative = { ...p, previousX: p.previousX + q.x - q.oldX, previousY: p.previousY + q.y - q.oldY };
    return V.movementContact(relative, { x: q.x - r, y: q.y - r, w: 2 * r, h: 2 * r });
  }

  V.updateBossShots = function (s, dt) {
    const p = s.player;
    for (const q of s.projectiles) {
      q.oldX = q.x;
      q.oldY = q.y;
      q.vy += (q.gravity ?? 0) * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.bounces > 0 && q.vy > 0) {
        for (const deck of s.platforms) {
          if (deck.enabled === false || q.x < deck.worldX || q.x > deck.worldX + deck.w ||
            q.oldY + q.r > deck.y || q.y + q.r < deck.y) continue;
          q.y = deck.y - q.r;
          q.vy *= -.82;
          q.bounces--;
          break;
        }
      }
      if (q.reflect && !q.reflected && p.dashTime > 0 && contactShot(p, q, s.parryReach) < Infinity) {
        q.reflected = true;
        const scale = 850 / Math.max(1, Math.hypot(q.vx, q.vy));
        q.vx *= -scale;
        q.vy *= -scale;
        q.gravity = 0;
        q.intercepts = 1 + s.strikeBonus;
        if (s.chainDash) {
          p.dashCooldown = 0;
          p.airDash = true;
        }
        V.hitFeedback(s, 'parry', q.x, q.y);
        s.score += 80;
      }
    }
    for (const q of s.projectiles) {
      if (!q.reflected || q.dead) continue;
      const r = q.r * .76;
      const body = { x: q.x - r, y: q.y - r, w: 2 * r, h: 2 * r, previousX: q.oldX - r, previousY: q.oldY - r };
      const hit = s.projectiles.find(other => !other.reflected && !other.dead && contactShot(body, other) < Infinity);
      if (hit) {
        hit.dead = true;
        q.dead = --q.intercepts <= 0;
        V.hitFeedback(s, 'guard', hit.x, hit.y);
      }
    }
    for (const q of s.projectiles) {
      if (q.dead || q.reflected || contactShot(p, q) === Infinity) continue;
      q.dead = true;
      if (q.snare && p.invuln <= 0) s.snaredUntil = s.elapsed + q.snare;
      V.hurt(s, Math.sign(q.vx));
    }
    s.projectiles = s.projectiles.filter(q => !q.dead && q.x > -68 && q.x < s.worldWidth + 68 && q.y > -155 && q.y < G + 100);
  };

  V.updateCombat = function (s, dt, actions, clock = null) {
    if (s.outcome !== null) return;
    const b = s.boss;
    s.elapsed += dt;
    b.flash = Math.max(0, b.flash - dt);
    if (b.state === 'defeated') {
      V.movePlayer(s, dt, {});
      if (s.elapsed - b.defeatedAt >= deathLength) s.outcome = true;
      return;
    }
    nextPhase(s);
    V.moveBossDecks(s, dt);
    V.movePlayer(s, dt, actions);
    if (s.snaredUntil > s.elapsed) s.player.vx *= .90;
    s.cameraX = V.lerp(s.cameraX, V.arenaCameraTarget(s), Math.min(1, dt * 8));
    const [dx, dy] = updateBoss(s, dt, clock);
    if (s.outcome !== null) return;
    strikeBoss(s, dx, dy);
    if (b.state === 'defeated') return;
    V.updateBossZones(s, dt);
    if (s.outcome === null) V.updateBossShots(s, dt);
    s.speed = Math.abs(s.player.vx);
    s.score += s.speed * .1 * dt;
  };
})();
