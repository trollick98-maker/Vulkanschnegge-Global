(function () {
  'use strict';
  const V = window.VS7;
  const godForms = ['echo', 'overwrite', 'panic'];
  const profiles = {
    bossEel: { rate: 4.9, sway: 4, lift: 3, roll: .045, attack: .16, stretch: .065,
      pivot: [.65, .49], part: [[.65,.42],[.99,.38],[1,.69],[.70,.67],[.60,.56]], swing: .16 },
    greed: { rate: 2.5, sway: 1, lift: 2, roll: .065, attack: .11, stretch: .045,
      pivot: [.39,.54], part: [[0,.28],[.31,.26],[.44,.45],[.40,.60],[0,.60]], swing: .15 },
    diva: { rate: 5.6, sway: 3, lift: 6, roll: .035, attack: .14, stretch: .075,
      pivot: [.62,.70], part: [[.63,0],[1,0],[1,.87],[.82,.91],[.55,.66]], swing: .21 },
    vortex: { rate: 7.3, sway: 4, lift: 4, roll: .06, attack: .24, stretch: .09,
      pivot: [.52,.39], part: [[0,0],[1,0],[1,.35],[.71,.40],[.54,.28],[.29,.44],[0,.43]], swing: .18 },
    echo: { rate: 2.7, sway: 3, lift: 2, roll: .025, attack: .11, stretch: .05 },
    overwrite: { rate: 9.2, sway: 5, lift: 3, roll: .035, attack: .14, stretch: .07 },
    panic: { rate: 15, sway: 6, lift: 5, roll: .055, attack: .19, stretch: .09 },
    garden: { rate: 19, sway: 2, lift: 4, roll: .055, attack: .09, stretch: .05,
      pivot: [.62,.44], part: [[.46,0],[.94,0],[.99,.50],[.81,.58],[.57,.46]], swing: .23 },
    inferno: { rate: 4.3, sway: 1, lift: 1, roll: .015, attack: .24, stretch: .055,
      pivot: [.56,.57], part: [[.56,.35],[1,.36],[1,.85],[.72,.90],[.52,.72]], swing: .14 },
    race: { rate: 16, sway: 0, lift: 1.7, roll: .018, attack: .07, stretch: .055 }
  };

  const gladiatorPoses = {
    'spear-windup': 4, 'spear-flight': 5, 'spear-charge': 6, 'spear-dash': 7,
    'spear-thrust-tell': 8, 'spear-thrust': 9, 'spear-slam-tell': 6, 'spear-slam': 10,
    'spear-slam-impact': 11, 'spear-recover': 11
  };
  const steps = [1, 2, 3, 2];
  V.gladiatorFrame = function (b, time, reduced) {
    const attack = b.gladiator;
    if (!attack) return 0;
    if (b.state === 'spear-walk') return reduced ? 0 : steps[Math.floor(attack.steps / 15) % steps.length];
    if (b.state === 'spear-flight' && time - attack.thrownAt >= .25) return 0;
    return gladiatorPoses[b.state] ?? 0;
  };

  const bossRows = { bossEel: 0, greed: 1, diva: 2, vortex: 3 };
  const enemyRows = { crawler: 0, jumper: 1, armored: 2 };
  const reinforcementRows = { 'exp-crab': 0, 'exp-scarab': 1, 'exp-diva': 2, 'exp-vortex': 3,
    'exp-glitch': 4, 'exp-bee': 5, 'exp-ember': 6, 'exp-car': 7 };
  const animationRates = { bossEel: 4, greed: 3, diva: 5, vortex: 6, god: 6 };

  V.bossSpriteFrame = function (b, elapsed, theme, reduced) {
    const key = b.definition.sprite;
    if (theme === 'inferno' || elapsed < b.phaseUntil || b.state === 'defeated') return null;
    const warning = b.state === 'windup' || Boolean(b.warning);
    const striking = b.state === 'active' || elapsed < (b.volleyFlashUntil ?? 0);
    const recovering = b.state === 'recovery' || b.state === 'defeated' || b.flash > .09;
    if (theme === 'garden') {
      const flap = Math.floor(elapsed * 10) % 4;
      const column = striking || b.rush ? 3 : warning ? 2 : reduced ? 0 : flap === 3 ? 1 : flap;
      return { sheet: 'dimensions', index: column };
    }
    if (theme === 'race') {
      const column = b.skidding && !reduced ? 2 : b.racer?.volley || striking ? 3 :
        !reduced && Math.floor((b.racer?.wheelTravel ?? 0) / 22) % 2 ? 1 : 0;
      return { sheet: 'dimensions', index: 4 + column };
    }
    const idling = !reduced && Math.floor(elapsed * animationRates[key]) % 2 === 1;
    const column = striking ? 2 : warning || b.state === 'shift' ? 1 : recovering ? 3 :
      idling || (!reduced && (b.rush || b.flank)) ? 0 : 4;
    return key === 'god' ? { sheet: 'shadow', index: (b.phase ?? 0) * 5 + column } :
      { sheet: 'bosses', index: bossRows[key] * 5 + column };
  };

  V.enemySpriteFrame = function (s, enemy, art, reduced) {
    const state = enemy.attackState;
    const moving = !reduced && enemy.moving && Math.floor((enemy.stride ?? 0) / 7) % 2 === 1;
    const attack = state === 'active' && enemy.defeatedAt === undefined;
    const tell = state === 'tell';
    if (enemy.reinforcement) {
      const row = reinforcementRows[art];
      return row === undefined ? null : { sheet: 'reinforcements', index: row * 3 + (attack ? 1 : moving ? 0 : 2) };
    }
    const row = enemyRows[enemy.key];
    if (row === undefined) return null;
    if (enemy.variant) {
      const biome = V.animationBiomes.indexOf(s.biome);
      if (biome < 0) return null;
      return { sheet: 'variants', index: biome * 9 + row * 3 + (attack ? 1 : moving ? 0 : 2) };
    }
    return { sheet: s.biome, index: row * 4 + (attack ? 2 : tell || enemy.flash > .05 ? 1 : moving ? 0 : 3) };
  };

  V.bossPose = function (b, elapsed, theme) {
    const phase = b.phase ?? 0;
    const key = b.definition.sprite === 'god' ? theme ?? godForms[phase] : b.definition.sprite;
    const rig = profiles[key];
    const wave = Math.sin(elapsed * rig.rate * (1 + phase * .12));
    const second = Math.sin(elapsed * rig.rate * 1.49);
    const tell = b.state === 'windup' && b.plan ? 1 - V.clamp((b.plan.strike - elapsed) / b.plan.lead, 0, 1) :
      b.gladiator?.aim ? 1 - V.clamp((b.gladiator.aim.at - elapsed) / .48, 0, 1) :
        b.warning ? 1 - V.clamp((b.warning.at - elapsed) / .48, 0, 1) : 0;
    const strike = b.state === 'active' && b.plan ? Math.exp(-Math.max(0, elapsed - b.plan.strike) * 5.5) :
      b.state === 'spear-dash' ? .92 : b.racer?.volley ? .24 : 0;
    const turn = b.rush || b.flank ? .28 : 0;
    const hit = V.clamp((b.flash ?? 0) / .17, 0, 1);
    const shift = elapsed < b.phaseUntil ?
      Math.sin(Math.PI * V.clamp((elapsed - b.phaseAt) / (b.phaseUntil - b.phaseAt), 0, 1)) : 0;
    const push = strike + turn - tell * .63;
    return {
      rig,
      x: wave * rig.sway,
      y: -rig.lift * (.5 + wave * .5) - shift * 5,
      roll: wave * rig.roll + rig.attack * push - hit * .09,
      sx: 1 + rig.stretch * (wave * .40 + push + hit * .55 + shift * .9),
      sy: 1 + rig.stretch * (-wave * .38 - push * .65 - hit + shift * .85),
      limb: (rig.swing ?? 0) * (second * .55 + tell * .48 - strike * 1.25 + shift * .5)
    };
  };
})();
