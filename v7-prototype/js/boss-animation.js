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
