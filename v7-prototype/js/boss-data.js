(function () {
  'use strict';
  const V = window.VS7;
  V.bosses = {
    reef: { name: 'Don Moray', sprite: 'bossEel', hp: 7, track: 'reef-tax', counter: 'Rotes Plasma mit Dash zurückwerfen. Giftblasen meiden.',
      phases: [['plasma', 'toxic', 'plasma'], ['plasma', 'toxic', 'plasma', 'toxic'], ['plasma', 'plasma', 'toxic']] },
    greed: { name: 'God of Greed', sprite: 'greed', hp: 7, track: 'a-little-more', counter: 'Netzen ausweichen. Goldbarren in die offene Luke kontern.',
      phases: [['net', 'ingot', 'gold', 'ingot'], ['net', 'gold', 'ingot'], ['gold', 'net', 'ingot', 'ingot']] },
    diva: { name: 'Diva-Schwänin', sprite: 'diva', hp: 7, track: 'pretty-things', counter: 'Raus aus dem Spotlight. Stern nach der Pose zurückschlagen.',
      phases: [['spotlight', 'star', 'feathers', 'star'], ['feathers', 'spotlight', 'star'], ['spotlight', 'star', 'feathers', 'star']] },
    vortex: { name: 'Pumper Vortex', sprite: 'vortex', hp: 8, track: 'one-more-wreck', counter: 'Gegen den Sog steuern. Geworfene Anker per Dash kontern.',
      phases: [['suction', 'anchor', 'surge', 'anchor'], ['surge', 'suction', 'anchor'], ['suction', 'anchor', 'surge', 'anchor']] },
    god: { name: 'GOD.EXE', sprite: 'god', hp: 9, track: 'run-the-loop', counter: 'Fehlerpakete ausweichen. Grüne Pakete mit Rahmen kontern.',
      phases: [['fault', 'packet', 'fault', 'packet'], ['fault', 'overwrite', 'packet', 'packet'], ['overwrite', 'packet', 'fault', 'packet']] }
  };
  V.bossAttacks = {
    plasma:    { warning: 'Plasma',             tell: .58, rest: .95, speed: 406, radius: 16, color: '#ff6e83', reflect: true, sprite: 'plasma' },
    toxic:     { warning: 'Giftblase',          tell: .60, rest: .75, speed: 310, radius: 17, color: '#65f4ad', sprite: 'toxic' },
    net:       { warning: 'Fangnetz',           tell: .74, rest: .72, speed: 325, radius: 23, color: '#ffe1a4' },
    ingot:     { warning: 'Luke offen',        tell: .64, rest: .86, speed: 396, radius: 15, color: '#ffd171', reflect: true },
    gold:      { warning: 'Goldsalve',         tell: .64, rest: .77, speed: 350, radius: 11, color: '#ffb75a', fan: 3 },
    spotlight: { warning: 'Spotlight',         tell: .88, rest: .77, width: 84, color: '#ff88d3', zone: true },
    star:      { warning: 'Pose · Konter',     tell: .62, rest: .88, speed: 411, radius: 15, color: '#f9aaff', reflect: true },
    feathers:  { warning: 'Federfächer',       tell: .67, rest: .77, speed: 354, radius: 11, color: '#ffcff0', fan: 3 },
    suction:   { warning: 'Sog · Gegenlenken', tell: .72, rest: .65, wind: 138, color: '#7ce9fc' },
    anchor:    { warning: 'Ankerwurf',         tell: .68, rest: .87, speed: 390, radius: 18, color: '#8cdbff', reflect: true },
    surge:     { warning: 'Bodenwelle',        tell: .66, rest: .70, speed: 425, radius: 23, color: '#5abaff', low: true },
    fault:     { warning: 'FAULT //',          tell: .64, rest: .73, speed: 384, radius: 13, color: '#ff858b', fan: 2 },
    packet:    { warning: 'RETURN PACKET',     tell: .56, rest: .88, speed: 435, radius: 16, color: '#b8ff7e', reflect: true },
    overwrite: { warning: 'OVERWRITE //',      tell: .82, rest: .76, width: 74, color: '#b9ff91', zone: true }
  };
})();
