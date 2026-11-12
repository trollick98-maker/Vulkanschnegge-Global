(function () {
  'use strict';
  const V = window.VS7;
  const abilities = {
    katana: { name: 'Nullschnitt', damage: 460, bossDamage: 500, color: '#fff1bd', hits: 8, sound: 'ultimate-katana' },
    'reef-spear': { name: 'Flutlanze', damage: 390, bossDamage: 580, color: '#a3fff2', hits: 3, sound: 'ultimate-spear',
      reaches: (dx, dy, facing) => dx * facing >= -25 && Math.abs(dy) <= 120 },
    'anchor-axe': { name: 'Ankerbeben', damage: 540, bossDamage: 620, color: '#ffac79', hits: 4, sound: 'ultimate-axe',
      reaches: (dx, dy) => Math.hypot(dx, dy * 1.25) <= 290 }
  };
  V.ultimateTiming = { focus: .24, swing: .76, retreat: .92, end: 1.19 };
  V.ultimateAbility = s => V.usesMomentum(s) ? abilities[s.weapon.id] : null;
  V.chargeUltimate = function (s, points) {
    if (V.ultimateAbility(s) && !s.ultimate) s.ultimateCharge = Math.min(100, (s.ultimateCharge ?? 0) + points);
  };
  V.chargeDash = (s, damage) => V.chargeUltimate(s, 10 + Math.min(10, Math.floor(damage / 24)));

  V.beginUltimate = function (s) {
    const ability = V.ultimateAbility(s);
    if (!ability || s.ultimate || (s.ultimateCharge ?? 0) < 100 || s.outcome !== null || s.boss?.state === 'defeated') return false;
    s.ultimateCharge = 0;
    s.cameraCue = null;
    s.ultimate = { ability, time: 0, facing: s.player.facing };
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

  V.updateUltimate = function (s, dt) {
    const cut = s.ultimate;
    const previous = cut.time;
    cut.time += dt;
    if (previous < V.ultimateTiming.swing && cut.time >= V.ultimateTiming.swing) V.audio?.effect?.(cut.ability.sound);
    if (cut.time < V.ultimateTiming.end) return;
    V.audio?.cinematic?.(false);
    V.say(s, cut.ability.name);
    release(s);
    s.ultimate = null;
  };
})();
