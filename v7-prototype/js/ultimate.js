(function () {
  'use strict';
  const V = window.VS7;
  const abilities = {
    katana: { name: 'Nullschnitt', sequence: true, bossDamage: 500, color: '#fff1bd', hits: 8, sound: 'ultimate-katana' },
    'reef-spear': { name: 'Flutlanze', damage: 390, bossDamage: 580, color: '#a3fff2', hits: 3, sound: 'ultimate-spear',
      reaches: (dx, dy, facing) => dx * facing >= -25 && Math.abs(dy) <= 120 },
    'war-hammer': { name: 'Donnerschlag', color: '#a7eeff', hammer: true, sound: 'ultimate-hammer' },
    'anchor-axe': { name: 'Ankerbeben', damage: 540, bossDamage: 620, color: '#ffac79', hits: 4, sound: 'ultimate-axe',
      reaches: (dx, dy) => Math.hypot(dx, dy * 1.25) <= 290 }
  };
  const hammerTiming = V.hammerTiming = { rise: .25, lock: 2.20, impact: 2.45, end: 2.86 };
  const defaultTiming = { focus: .24, swing: .76, retreat: .92, end: 1.19, strike: .10 };
  const katanaTiming = { dark: .68, focus: 1.48, swing: 2.36, retreat: 2.75, end: 3.63, strike: .15 };
  V.ultimateMarkDuration = .32;
  V.ultimateAbility = s => V.usesMomentum(s) ? abilities[s.weapon.id] : null;
  V.chargeUltimate = function (s, points) {
    if (V.ultimateAbility(s) && !s.ultimate) s.ultimateCharge = Math.min(100, (s.ultimateCharge ?? 0) + points);
  };
  V.chargeDash = (s, damage) => V.chargeUltimate(s, 10 + Math.min(10, Math.floor(damage / 24)));

  V.beginUltimate = function (s) {
    const ability = V.ultimateAbility(s);
    if (!ability || s.ultimate || (s.ultimateCharge ?? 0) < 100 || s.outcome !== null || s.boss?.state === 'defeated') return false;
    const p = s.player;
    const cut = { ability, time: 0, facing: p.facing, timing: ability.sequence ? katanaTiming : defaultTiming };
    if (ability.hammer) {
      const origin = p.x + p.w / 2;
      const target = hammerTarget(s, origin, p.y + p.h);
      if (!target) return false;
      cut.hammer = { target, origin, y: p.y, sky: (s.cameraY ?? 0) - V.H * .66 };
      p.hammerDive = false;
      p.dashTime = p.dashLeft = p.dashBuffer = p.jumpBuffer = 0;
      p.swing = null;
      p.angle = 0;
    }
    s.ultimateCharge = 0;
    s.cameraCue = null;
    s.ultimate = cut;
    if (ability.sequence) prepareSequence(s, cut);
    V.audio?.cinematic?.(true, ability.sound);
    return true;
  };

  function targetable(s, box) {
    if (box.x + box.w <= s.cameraX || box.x >= s.cameraX + V.W ||
        box.y + box.h <= s.cameraY || box.y >= s.cameraY + V.H) return false;
    const p = s.player;
    return s.ultimate.ability.reaches?.(box.x + box.w / 2 - p.x - p.w / 2,
      box.y + box.h / 2 - p.y - p.h / 2, s.ultimate.facing) ?? true;
  }

  function visibleTargets(s) {
    const enemies = s.enemies.filter(enemy => enemy.hp > 0 && targetable(s, enemy));
    const boss = s.boss;
    return { enemies, boss: boss?.hp > 0 && targetable(s, V.bossHitboxes(boss).body) ? boss : null };
  }

  function enemyMark(enemy, cut, start) {
    return { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
      facing: cut.facing, start, size: 88, color: cut.ability.color };
  }

  function bossMarks(boss, cut, start) {
    return Array.from({ length: cut.ability.hits }, (_, i) => ({
      boss, x: .23 + (i * 3 % 7) * .09, y: .27 + (i * 5 % 7) * .085,
      facing: i % 2 ? -cut.facing : cut.facing, start: start + i * .055, size: 56 + i % 3 * 12, color: cut.ability.color
    }));
  }

  function prepareSequence(s, cut) {
    const targets = visibleTargets(s);
    const ordered = targets.boss ? [...targets.enemies, targets.boss] : [...targets.enemies];
    ordered.sort((a, b) => cut.facing * (a.x + a.w / 2 - b.x - b.w / 2) || a.y - b.y);
    let next = cut.timing.end;
    const marks = [];
    for (const target of ordered) {
      const cuts = target === targets.boss ? bossMarks(target, cut, next) : [enemyMark(target, cut, next)];
      marks.push(...cuts);
      next = cuts.at(-1).start + V.ultimateMarkDuration + .09;
    }
    const last = marks.at(-1);
    cut.sequence = { ...targets, marks, damageAt: last ? last.start + V.ultimateMarkDuration + 2 : cut.timing.end };
  }

  function strikeBoss(s, boss, ability) {
    if (!boss) return;
    V.damageBoss(s, ability.bossDamage);
    if (boss.hp === 0) V.defeatBoss(s);
  }

  function release(s, cut) {
    const { ability, sequence } = cut;
    if (sequence) {
      for (const enemy of sequence.enemies) {
        if (!V.damageEnemy(s, enemy, enemy.hp)) continue;
        V.emitParticles(s, 'hit', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, { color: ability.color });
      }
      strikeBoss(s, sequence.boss, ability);
      return;
    }
    const { enemies, boss } = visibleTargets(s);
    s.ultimateMarks = enemies.map(enemy => enemyMark(enemy, cut, s.elapsed));
    for (const enemy of enemies) V.damageEnemy(s, enemy, ability.damage);
    if (boss) s.ultimateMarks.push(...bossMarks(boss, cut, s.elapsed));
    strikeBoss(s, boss, ability);
  }

  function hammerTarget(s, x, feet, requireUnderfoot = false) {
    const p = s.player;
    const margin = p.w / 2 + 6;
    let best;
    let bestDistance = Infinity;
    for (const deck of s.platforms) {
      if (deck.enabled === false || deck.y < s.cameraY + 65 || deck.y > s.cameraY + V.H - 20 ||
          deck.worldX + deck.w < s.cameraX + margin || deck.worldX > s.cameraX + V.W - margin) continue;
      const half = Math.min(p.w * .34, deck.w / 2);
      const left = Math.max(deck.worldX + half, s.cameraX + margin);
      const right = Math.min(deck.worldX + deck.w - half, s.cameraX + V.W - margin);
      if (right < left || (requireUnderfoot && (x < left || x > right))) continue;
      const center = V.clamp(x, left, right);
      const distance = Math.abs(center - x) * 2 + Math.abs(deck.y - feet) + (deck.y + 2 < feet ? 75 : 0);
      if (distance >= bestDistance) continue;
      best = { x: center, y: deck.y, ground: deck.ground, checkpoint: deck.worldX + 54 };
      bestDistance = distance;
    }
    return best;
  }

  function updateHammer(s, dt, input) {
    const { hammer, time } = s.ultimate;
    const p = s.player;
    if (time < hammerTiming.lock) {
      const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
      if (direction) {
        const target = hammerTarget(s, hammer.target.x + direction * 275 * dt, hammer.target.y, true);
        if (target) hammer.target = target;
      }
    }
    const target = hammer.target;
    const pastRise = time >= hammerTiming.rise;
    const rise = V.clamp(time / hammerTiming.rise, 0, 1);
    const fall = V.clamp((time - hammerTiming.lock) / (hammerTiming.impact - hammerTiming.lock), 0, 1);
    p.x = V.lerp(hammer.origin, target.x, rise) - p.w / 2;
    const end = target.y - p.h;
    if (fall >= 1) p.y = end;
    else if (pastRise) p.y = V.lerp(hammer.sky, end, fall ** 1.45);
    else p.y = V.lerp(hammer.y, hammer.sky, 1 - (1 - rise) ** 2);
    p.vx = p.vy = 0;
    p.grounded = time >= hammerTiming.impact;
    if (p.grounded && hammer.landedAt === undefined) {
      hammer.landedAt = time;
      p.airDash = true;
      p.jumps = 0;
      p.coyote = 0;
      p.landTime = .13;
      p.invuln = Math.max(p.invuln, .26);
      if (s.kind === 'arena') {
        s.supportY = target.y;
        if (target.ground) {
          s.checkpointX = target.checkpoint;
          s.checkpointY = target.y;
        }
      }
      V.hammerImpact(s, target.x, target.y, 0, true);
    }
    if (time < hammerTiming.end) return;
    s.hammerImpactFx.at = s.elapsed - (time - hammer.landedAt);
    V.audio?.cinematic?.(false);
    s.ultimate = null;
  }

  V.updateUltimate = function (s, dt, input = {}) {
    const cut = s.ultimate;
    const previous = cut.time;
    cut.time += dt;
    if (cut.hammer) {
      updateHammer(s, dt, input);
      return;
    }
    const { swing, end } = cut.timing;
    if (previous < swing && cut.time >= swing) V.audio?.effect?.(cut.ability.sound);
    if (cut.time < (cut.sequence?.damageAt ?? end)) return;
    V.audio?.cinematic?.(false);
    V.say(s, cut.ability.name);
    release(s, cut);
    s.ultimate = null;
  };
})();
