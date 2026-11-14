(function () {
  'use strict';
  const V = window.VS7;
  const abilities = {
    katana: { name: 'Nullschnitt', damage: 460, bossDamage: 500, color: '#fff1bd', hits: 8, sound: 'ultimate-katana' },
    'reef-spear': { name: 'Flutlanze', damage: 390, bossDamage: 580, color: '#a3fff2', hits: 3, sound: 'ultimate-spear',
      reaches: (dx, dy, facing) => dx * facing >= -25 && Math.abs(dy) <= 120 },
    'war-hammer': { name: 'Donnerschlag', color: '#a7eeff', hammer: true, sound: 'ultimate-hammer' },
    'anchor-axe': { name: 'Ankerbeben', damage: 540, bossDamage: 620, color: '#ffac79', hits: 4, sound: 'ultimate-axe',
      reaches: (dx, dy) => Math.hypot(dx, dy * 1.25) <= 290 }
  };
  const hammerTiming = V.hammerTiming = { rise: .25, lock: 1.24, impact: 1.47, end: 1.88 };
  V.ultimateTiming = { focus: .24, swing: .76, retreat: .92, end: 1.19 };
  V.ultimateAbility = s => V.usesMomentum(s) ? abilities[s.weapon.id] : null;
  V.chargeUltimate = function (s, points) {
    if (V.ultimateAbility(s) && !s.ultimate) s.ultimateCharge = Math.min(100, (s.ultimateCharge ?? 0) + points);
  };
  V.chargeDash = (s, damage) => V.chargeUltimate(s, 10 + Math.min(10, Math.floor(damage / 24)));

  V.beginUltimate = function (s) {
    const ability = V.ultimateAbility(s);
    if (!ability || s.ultimate || (s.ultimateCharge ?? 0) < 100 || s.outcome !== null || s.boss?.state === 'defeated') return false;
    const p = s.player;
    const cut = { ability, time: 0, facing: p.facing };
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

  function release(s) {
    const { ability, facing } = s.ultimate;
    s.ultimateMarks = [];
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0 || !targetable(s, enemy)) continue;
      s.ultimateMarks.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
        facing, start: s.elapsed, size: 88, color: ability.color });
      V.damageEnemy(s, enemy, ability.damage);
    }
    const boss = s.boss;
    if (boss?.hp > 0 && targetable(s, V.bossHitboxes(boss).body)) {
      for (let i = 0; i < ability.hits; i++) {
        s.ultimateMarks.push({ boss, x: .23 + (i * 3 % 7) * .09, y: .27 + (i * 5 % 7) * .085,
          facing: i % 2 ? -facing : facing, start: s.elapsed + i * .055, size: 56 + i % 3 * 12, color: ability.color });
      }
      V.damageBoss(s, ability.bossDamage);
      if (boss.hp === 0) V.defeatBoss(s);
    }
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
    if (previous < V.ultimateTiming.swing && cut.time >= V.ultimateTiming.swing) V.audio?.effect?.(cut.ability.sound);
    if (cut.time < V.ultimateTiming.end) return;
    V.audio?.cinematic?.(false);
    V.say(s, cut.ability.name);
    release(s);
    s.ultimate = null;
  };
})();
