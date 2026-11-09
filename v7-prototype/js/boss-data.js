(function () {
  'use strict';
  const V = window.VS7;
  V.bosses = {
    reef: { name: 'Don Moray', sprite: 'bossEel', track: 'reef-tax', tip: 'Plasma per Dash abfangen · Giftblasen ausweichen',
      phases: [['plasma', 'toxic', 'plasma'], ['plasma', 'toxic', 'plasma', 'toxic'], ['plasma', 'plasma', 'toxic']] },
    greed: { name: 'God of Greed', sprite: 'greed', track: 'a-little-more', tip: 'Bei blauer Bodenmarkierung springen · Goldbarren abfangen',
      phases: [['net', 'ingot', 'wave', 'gold'], ['gold', 'wave', 'ingot', 'net'], ['wave', 'gold', 'ingot', 'net', 'ingot']] },
    diva: { name: 'Diva-Schwänin', sprite: 'diva', track: 'pretty-things', tip: 'Spotlight verlassen · Sterne per Dash abfangen',
      phases: [['spotlight', 'star', 'feathers', 'star'], ['feathers', 'spotlight', 'star'], ['spotlight', 'star', 'feathers', 'star']] },
    vortex: { name: 'Pumper Vortex', sprite: 'vortex', track: 'one-more-wreck', tip: 'Gegen den Sog steuern · Anker per Dash abfangen',
      phases: [['suction', 'anchor', 'surge', 'anchor'], ['surge', 'suction', 'anchor'], ['suction', 'anchor', 'surge', 'anchor']] },
    god: { name: 'GOD.EXE', sprite: 'god', track: 'run-the-loop', tip: 'Fehlerpakete meiden · Grüne Pakete per Dash abfangen',
      phases: [['fault', 'packet', 'fault', 'packet'], ['fault', 'overwrite', 'packet', 'packet'], ['overwrite', 'packet', 'fault', 'packet']] }
  };
  V.bossAttacks = {
    plasma:    { warning: 'Plasma',             tell: .58, speed: 406, radius: 16, color: '#ff6e83', reflect: true },
    toxic:     { warning: 'Giftblase',          tell: .60, speed: 310, radius: 17, color: '#65f4ad' },
    net:       { warning: 'Fangnetz',           tell: .74, speed: 325, radius: 23, color: '#ffe1a4' },
    ingot:     { warning: 'Goldbarren',        tell: .64, speed: 396, radius: 15, color: '#ffd171', reflect: true },
    gold:      { warning: 'Goldsalve',          tell: .64, speed: 350, radius: 11, color: '#ffb75a', fan: 3 },
    wave:      { warning: 'Flutwelle · Springen!', tell: 1, height: 58, color: '#75ddff', zone: true },
    spotlight: { warning: 'Spotlight',         tell: .88, width: 84, color: '#ff88d3', zone: true },
    star:      { warning: 'Sternwurf',         tell: .62, speed: 411, radius: 15, color: '#f9aaff', reflect: true },
    feathers:  { warning: 'Federfächer',        tell: .67, speed: 354, radius: 11, color: '#ffcff0', fan: 3 },
    suction:   { warning: 'Sog · Gegenlenken',  tell: .72, wind: 138, color: '#7ce9fc' },
    anchor:    { warning: 'Ankerwurf',          tell: .68, speed: 390, radius: 18, color: '#8cdbff', reflect: true },
    surge:     { warning: 'Bodenwelle',         tell: .66, speed: 425, radius: 23, color: '#5abaff', low: true },
    fault:     { warning: 'FAULT //',           tell: .64, speed: 384, radius: 13, color: '#ff858b', fan: 2 },
    packet:    { warning: 'RETURN PACKET',      tell: .56, speed: 435, radius: 16, color: '#b8ff7e', reflect: true },
    overwrite: { warning: 'OVERWRITE //',      tell: .82, width: 74, color: '#b9ff91', zone: true }
  };
})();
