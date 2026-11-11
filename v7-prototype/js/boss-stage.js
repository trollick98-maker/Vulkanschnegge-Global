/* Persistent terrain changes and warned hazards for each boss's later phases. */
(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  V.arenaGlitchThemes = {
    garden: { title: 'Zuckerwiese', top: '#ecd4f0', bottom: '#b8dcd1', ground: '#6f607c', far: '#c4a1cc',
      accent: '#a13c7d', danger: '#821337', light: '#fff1fa' },
    inferno: { title: 'Glutarena', top: '#1e141b', bottom: '#683025', ground: '#312027', far: '#472326',
      accent: '#ffaa65', danger: '#ff975b', light: '#fff1b3' },
    race: { title: 'Neon-Grand-Prix', top: '#161b37', bottom: '#33365f', ground: '#252944', far: '#292b4d',
      accent: '#89e7fa', danger: '#ff9cdf', light: '#bff5ff' }
  };

  V.initArenaGlitch = function (s) {
    if (s.biome !== 'god') return;
    const random = V.randomFor(s.seed + ':arena-glitch');
    const order = random() < .5 ? ['garden', 'inferno', 'race'] : ['garden', 'race', 'inferno'];
    s.arenaGlitch = { random, order, index: 0, active: null, nextAt: null, endsAt: 0, changedAt: -Infinity };
  };

  V.updateArenaGlitch = function (s) {
    const glitch = s.arenaGlitch;
    if (!glitch || !s.boss.phase || s.boss.state === 'defeated') return;
    if (glitch.active) {
      if (s.elapsed < glitch.endsAt) return;
      V.restoreArenaGlitch(s);
      glitch.nextAt = s.elapsed + 7 + glitch.random() * 7;
    } else {
      glitch.nextAt ??= s.boss.phaseAt + 3.4;
      if (s.elapsed < glitch.nextAt) return;
      glitch.active = glitch.order[glitch.index++ % glitch.order.length];
      glitch.changedAt = s.elapsed;
      glitch.endsAt = s.elapsed + 10 + glitch.random() * 20;
    }
    V.audio?.effect?.('god-arena-glitch');
  };

  V.restoreArenaGlitch = function (s) {
    if (!s.arenaGlitch?.active) return;
    s.arenaGlitch.active = null;
    s.arenaGlitch.changedAt = s.elapsed;
  };

  V.raceBody = b => ({ x: b.x + b.w * .10, y: b.y + b.h * .23, w: b.w * .80, h: b.h * .75 });
  V.raceMuzzle = b => ({ x: b.x + b.w * .50, y: b.y + b.h * .32 });

  function raceTarget(s) {
    const p = s.player;
    const center = p.x + p.w / 2;
    if (p.y + p.h < G - 38) {
      return { x: V.clamp(center + p.vx * .14, 24, s.worldWidth - 24), y: p.y + p.h / 2 };
    }
    let nearest = null;
    let distance = Infinity;
    for (const deck of s.platforms) {
      if (deck.ground || deck.enabled === false) continue;
      const x = deck.worldX + deck.w / 2;
      const delta = Math.abs(center - x);
      if (delta >= distance) continue;
      nearest = { x, y: deck.y - 19 };
      distance = delta;
    }
    return nearest ?? { x: center, y: p.y - 70 };
  }

  function raceVolley(s, racer) {
    if (s.elapsed < s.boss.phaseUntil) {
      racer.volley = null;
      racer.shootAt = Math.max(racer.shootAt, s.boss.phaseUntil + .45);
      return;
    }
    if (!racer.volley) {
      if (s.elapsed >= racer.shootAt) racer.volley = { ...raceTarget(s), at: s.elapsed + .68 };
      return;
    }
    if (s.elapsed < racer.volley.at) return;
    const b = s.boss;
    const { x, y } = V.raceMuzzle(b);
    const aim = Math.atan2(racer.volley.y - y, racer.volley.x - x);
    const speed = b.phase === 2 ? 485 : 425;
    s.projectiles.push({ key: 'packet', ...V.bossShots.packet, x, y,
      vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed });
    V.emitParticles(s, 'shot', x, y, { color: '#89e7fa', direction: Math.sign(Math.cos(aim)) || 1 });
    V.audio?.effect?.(b.definition.sound);
    racer.volley = null;
    racer.shootAt = s.elapsed + (b.phase === 2 ? 1.6 : 2.05);
  }

  V.updateRaceBoss = function (s, dt) {
    const b = s.boss;
    const p = s.player;
    if (!b.racer) {
      b.racer = { enteredAt: s.elapsed, shootAt: s.elapsed + .85, backoffUntil: 0, backoff: 0, volley: null };
      b.plan = b.rush = b.flank = null;
      b.vx = b.vy = 0;
      b.skidding = false;
    }
    b.state = 'racing';
    const racer = b.racer;
    const oldX = b.x;
    const oldY = b.y;
    const floor = G - b.h;
    b.grounded = b.y >= floor;
    const delta = p.x + p.w / 2 - (b.x + b.w / 2);
    const duringShift = s.elapsed < b.phaseUntil;
    let drive = Math.abs(delta) > 32 ? Math.sign(delta) : Math.sign(b.vx) || b.facing;
    if (s.elapsed < racer.backoffUntil) drive = racer.backoff;
    if (duringShift) drive = 0;
    V.updateSkid(s, b, b.grounded, drive);
    V.accelerateBody(b, drive, dt, 2150, 145, 875, 925);
    b.vx = V.clamp(b.vx, -590, 590);
    if (Math.abs(b.vx) > 18) b.facing = Math.sign(b.vx);
    const next = b.x + b.vx * dt;
    b.x = V.clamp(next, 35, s.worldWidth - b.w - 35);
    if (b.x !== next) {
      racer.backoff = -Math.sign(b.vx);
      racer.backoffUntil = s.elapsed + .48;
      b.vx = 0;
    }
    b.vy += V.arenaMotion.gravity * dt;
    b.y = Math.min(floor, b.y + b.vy * dt);
    b.grounded = b.y === floor;
    if (b.grounded) b.vy = 0;
    if (!duringShift && b.grounded && s.elapsed >= racer.enteredAt + .30 && Math.abs(b.x - oldX) / dt >= 120) {
      const relative = { ...p, previousX: p.previousX + b.x - oldX, previousY: p.previousY + b.y - oldY };
      if (V.movementContact(relative, V.raceBody(b)) < Infinity) V.hurt(s, Math.sign(b.x - oldX));
    }
    if (s.outcome === null) raceVolley(s, racer);
  };

  const spearGravity = 1150;
  const spearCharge = .68;
  const gladiatorDashSpeed = 1850;

  V.gladiatorHand = b => ({ x: b.x + b.w * (b.facing < 0 ? .35 : .65), y: b.y + b.h * .39 });

  function aimSpear(s) {
    const p = s.player;
    const edge = 35 + s.boss.w / 2;
    const x = V.clamp(p.x + p.w / 2 + p.vx * .12, edge, s.worldWidth - edge);
    const feet = p.y + p.h;
    const deck = s.platforms.find(d => !d.ground && d.enabled !== false &&
      x >= d.worldX && x <= d.worldX + d.w && Math.abs(d.y - feet) < 46);
    return { x, y: deck?.y ?? G, at: s.elapsed + .48 };
  }

  function flySpear(s, spear, dt) {
    const oldX = spear.x;
    const oldY = spear.y;
    const edge = 35 + s.boss.w / 2;
    const x = V.clamp(oldX + spear.vx * dt, edge, s.worldWidth - edge);
    const y = oldY + spear.vy * dt + spearGravity * dt * dt / 2;
    let first = Infinity;
    let landed;
    if (y > oldY) {
      for (const deck of s.platforms) {
        if (deck.enabled === false || oldY > deck.y || y < deck.y) continue;
        const time = (deck.y - oldY) / (y - oldY);
        const contactX = V.lerp(oldX, x, time);
        if (time < first && contactX >= deck.worldX && contactX <= deck.worldX + deck.w) {
          first = time;
          landed = deck;
        }
      }
    }
    if (!spear.hit) {
      const p = s.player;
      const relative = { ...p, previousX: p.previousX + x - oldX, previousY: p.previousY + y - oldY };
      const hit = V.movementContact(relative, { x: x - 8, y: y - 8, w: 16, h: 16 });
      if (hit < Infinity && hit <= first) {
        spear.hit = true;
        V.hurt(s, Math.sign(spear.vx));
      }
    }
    spear.x = x;
    spear.y = y;
    spear.vy += spearGravity * dt;
    spear.angle = Math.atan2(spear.vy, spear.vx);
    if (landed) {
      spear.x = V.lerp(oldX, x, first);
      spear.y = landed.y;
      spear.deck = landed;
      spear.offset = spear.x - landed.worldX;
      spear.chargeAt = s.elapsed;
      spear.chargeUntil = s.elapsed + spearCharge;
      s.boss.state = 'spear-charge';
      V.emitParticles(s, 'charge', spear.x, spear.y - 12, { color: '#ffab66' });
      V.audio?.effect?.(s.boss.definition.sound);
    } else if (x === edge || x === s.worldWidth - edge) spear.vx = 0;
  }

  function startGladiatorDash(s, attack) {
    const b = s.boss;
    const spear = attack.spear;
    const x = spear.x - b.w / 2;
    const y = spear.y - b.h;
    attack.dash = { fromX: b.x, fromY: b.y, x, y, start: s.elapsed, hit: false,
      duration: Math.max(V.rules.step, Math.hypot(x - b.x, y - b.y) / gladiatorDashSpeed) };
    b.facing = Math.sign(x - b.x) || b.facing;
    b.state = 'spear-dash';
    V.audio?.effect?.(b.definition.sound, true);
  }

  function dashToSpear(s, attack) {
    const b = s.boss;
    const dash = attack.dash;
    const p = s.player;
    const oldX = b.x;
    const oldY = b.y;
    const time = V.clamp((s.elapsed - dash.start) / dash.duration, 0, 1);
    b.x = V.lerp(dash.fromX, dash.x, time);
    b.y = V.lerp(dash.fromY, dash.y, time);
    if (!dash.hit) {
      const relative = { ...p, previousX: p.previousX + b.x - oldX, previousY: p.previousY + b.y - oldY };
      if (V.movementContact(relative, V.bossHitboxes(b).body) < Infinity) {
        dash.hit = true;
        V.hurt(s, b.facing, 2);
      }
    }
    if (time < 1) return;
    const deck = attack.spear.deck;
    attack.support = deck.enabled === false ? null : deck;
    attack.supportX = b.x - deck.worldX;
    attack.spear = attack.dash = null;
    attack.nextAt = s.elapsed + .98;
    b.state = 'spear-recover';
  }

  V.updateGladiator = function (s, dt) {
    const b = s.boss;
    if (!b.gladiator) {
      b.gladiator = { nextAt: Math.max(s.elapsed + .46, b.phaseUntil + .25), fallSpeed: 0 };
      b.plan = b.rush = b.flank = null;
      b.exposed = 1;
      if (s.elapsed >= b.phaseUntil) b.state = 'spear-recover';
    }
    if (s.elapsed < b.phaseUntil) return;
    const attack = b.gladiator;
    if (attack.dash) {
      dashToSpear(s, attack);
      return;
    }
    if (attack.support && attack.support.enabled !== false) {
      b.x = V.clamp(attack.support.worldX + attack.supportX, 35, s.worldWidth - b.w - 35);
      b.y = attack.support.y - b.h;
    } else {
      attack.support = null;
      attack.fallSpeed += V.arenaMotion.gravity * dt;
      b.y = Math.min(G - b.h, b.y + attack.fallSpeed * dt);
      if (b.y === G - b.h) attack.fallSpeed = 0;
    }
    if (attack.spear) {
      const spear = attack.spear;
      if (!spear.deck) flySpear(s, spear, dt);
      else {
        spear.x = spear.deck.worldX + spear.offset;
        spear.y = spear.deck.y;
        if (s.elapsed >= spear.chargeUntil) startGladiatorDash(s, attack);
      }
    } else if (attack.aim && s.elapsed >= attack.aim.at) {
      const start = V.gladiatorHand(b);
      const aim = attack.aim;
      const time = .90 + Math.min(.32, Math.abs(aim.x - start.x) / 3000);
      const vx = (aim.x - start.x) / time;
      const vy = (aim.y - start.y) / time - spearGravity * time / 2;
      attack.spear = { ...start, vx, vy, angle: Math.atan2(vy, vx), hit: false };
      attack.aim = null;
      b.state = 'spear-flight';
      V.audio?.effect?.(b.definition.sound);
    } else if (!attack.aim && s.elapsed >= attack.nextAt) {
      attack.aim = aimSpear(s);
      b.facing = Math.sign(attack.aim.x - b.x - b.w / 2) || b.facing;
      b.state = 'spear-windup';
    }
  };

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
