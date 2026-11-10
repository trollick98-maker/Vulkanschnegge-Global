/* Persistent terrain changes and warned hazards for each boss's later phases. */
(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  V.bossStages = {
    reef: { shot: 'plasma', width: 94, height: 190, interval: 4.25,
      hints: ['Das Wasser steigt · längere Sprünge unter Wasser', 'Die Strömung dreht · zwischen den Fontänen bleiben'] },
    greed: { shot: 'coin', width: 146, height: 72, interval: 4.45,
      hints: ['Die Hebedecks fahren seitwärts · mitfahren oder abspringen', 'Gold schießt aus den Öfen · auf die Hebedecks'] },
    diva: { shot: 'feathers', width: 87, height: 283, interval: 4.45,
      hints: ['Die Bühnenlifte wechseln die Höhe · dem Spot ausweichen', 'Zwei Spots wandern über die Bühne · durch die Lücke'] },
    vortex: { shot: 'weight', width: 98, height: 302, interval: 4.05,
      hints: ['Laufbänder ziehen am Boden · gegenlenken oder springen', 'Die Decks federn · markierte Gewichte meiden'] },
    god: { shot: 'packet', width: 92, height: 352, interval: 3.45,
      hints: ['Decks mit rotem Rahmen fallen aus · weiter springen', 'Firewall-Lücken wechseln · markierte Felder räumen'] }
  };

  V.bossStageArt = (s, part) => 'boss-stage-' + s.biome + '-' + part;

  V.updateBossStage = function (s) {
    const b = s.boss;
    if (!b.phase || b.state === 'defeated') return;
    const age = s.elapsed - b.phaseAt;
    const blend = V.clamp(age / 1.15, 0, 1);
    if (s.biome === 'reef') {
      const water = G - (b.phase === 1 ? 106 : 179) * blend - (1 + Math.sin(age * 1.7)) * 11 * blend;
      s.tideY = Math.min(s.tideY, water);
      if (s.player.y + s.player.h / 2 >= s.tideY) s.gravityFactor = .62;
      if (b.phase === 2) s.wind += (Math.floor(age / 3.4) % 2 ? 1 : -1) * 420 * blend;
    }
    if (s.biome === 'vortex' && !s.arenaFX.belt && s.player.grounded && s.player.y + s.player.h >= G - 2) {
      s.wind += (Math.floor((s.player.x + s.player.w / 2) / 265) % 2 ? 1 : -1) * 480 * blend;
    }
    if (s.elapsed < b.stageNext || s.zones.length >= 12) return;
    const def = V.bossStages[s.biome];
    const final = b.phase === 2;
    const x = s.player.x + s.player.w / 2;
    const count = final ? s.biome === 'god' ? 3 : 2 : 1;
    const spacing = s.biome === 'greed' ? 250 : 192;
    const width = def.width + (final ? 14 : 0);
    const start = V.clamp(x - (count - 1) * spacing / 2, width / 2,
      s.worldWidth - width / 2 - (count - 1) * spacing);
    const drift = s.biome === 'diva' ? (b.stageTurns % 2 ? -1 : 1) * (final ? 126 : 65) : 0;
    const height = def.height + (final && s.biome === 'greed' ? 48 : 0);
    for (let i = 0; i < count; i++) {
      const z = V.bossZone(s, start + i * spacing, G - height, width, height,
        s.elapsed + .94 + (s.biome === 'god' && final ? i * .14 : 0), drift ? .77 : .42,
        'stage', i % 2 ? -drift : drift);
      z.stage = true;
    }
    b.stageTurns++;
    b.stageNext = s.elapsed + def.interval - (final ? .85 : 0);
  };

  V.bossStageDeck = function (s, i) {
    const b = s.boss;
    if (!b.phase) return { lift: 0, shift: 0, ghost: false, warn: false };
    const age = s.elapsed - b.phaseAt;
    const blend = V.clamp(age / 1.15, 0, 1);
    const wave = Math.sin(age * (b.phase === 2 ? 1.88 : 1.31) + i * 1.26);
    const alternate = i % 2 ? 1 : -1;
    const patchTime = Math.max(0, age - 1.5);
    const patchCycle = 2.9 - b.phase * .35;
    const patchIndex = 1 + Math.floor(patchTime / patchCycle) % (s.platforms.length - 1);
    const patch = s.biome === 'god' && i === patchIndex && age >= 1.5;
    const beat = patchTime % patchCycle;
    const warn = patch && beat < .68;
    const ghost = patch && beat >= .68 && beat < 1.43;
    let lift = 0;
    let shift = 0;
    switch (s.biome) {
      case 'reef': lift = 23 + wave * (b.phase === 2 ? 30 : 18); break;
      case 'greed': shift = wave * (b.phase === 2 ? 84 : 66); lift = b.phase === 2 ? 38 + wave * 14 : 7; break;
      case 'diva': lift = wave * (b.phase === 2 ? 67 : 49); shift = b.phase === 2 ? alternate * 33 : 0; break;
      case 'vortex': lift = b.phase === 2 ? 35 + wave * 39 : alternate * 21; shift = wave * 21; break;
      case 'god': lift = wave * (b.phase === 2 ? 58 : 28); shift = b.phase === 2 ? wave * 48 : 0; break;
    }
    return { lift: lift * blend, shift: shift * blend, warn, ghost };
  };
})();
