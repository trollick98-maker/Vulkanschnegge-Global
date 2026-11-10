/* Shared arena simulation. Attack recipes schedule geometry and effects here. */
(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  const decks = {
    reef: [[205, 359, 176], [514, 309, 168], [865, 359, 196], [1220, 330, 180], [1630, 360, 206]],
    greed: [[238, 373, 195], [605, 338, 171], [955, 306, 175], [1280, 349, 215], [1635, 370, 181]],
    diva: [[195, 352, 185], [529, 298, 193], [870, 355, 221], [1227, 298, 174], [1585, 352, 220]],
    vortex: [[215, 372, 150], [460, 333, 185], [845, 362, 164], [1115, 325, 164], [1454, 360, 239]],
    god: [[228, 362, 148], [502, 308, 157], [784, 359, 164], [1080, 301, 169], [1415, 363, 173], [1730, 326, 157]]
  };
  V.bossArenaEffects = {
    current: 'Strömung', tide: 'Hochwasser', gilded: 'Goldflut · Hebedecks',
    treasure: 'Truhen auf dem Deck', stage: 'Bühnenaufzüge', limelight: 'Wandernder Spot', belt: 'Laufbänder', quake: 'Bebende Decks',
    patch: 'Plattformfehler', blackout: 'Notbeleuchtung'
  };

  V.initBossArena = function (s) {
    Object.assign(s, { worldWidth: 2060, cameraX: 0, cameraY: 0, runDirection: 1,
      zones: [], echoes: [], chests: [], arenaFX: {}, history: [], historyAt: 0 });
    s.platforms = [{ worldX: 0, y: G, w: s.worldWidth, h: 17, ground: true },
      ...decks[s.biome].map(([worldX, y, w]) => ({ worldX, y, homeY: y, w, h: 17 }))];
  };

  V.bossZone = function (s, x, y, w, h, at, life, style, drift = 0, preview = false) {
    const zone = { x: V.clamp(x - w / 2, 0, s.worldWidth - w), y, w, h, at, life, style, drift, preview };
    s.zones.push(zone);
    return zone;
  };

  V.planBossArena = function (s, plan) {
    const b = s.boss;
    const p = s.player;
    const events = plan.events;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h * .47;
    const dir = px < bx ? -1 : 1;
    const { phase } = b;
    const decksByDistance = s.platforms.slice(1).sort((a, b) =>
      Math.abs(a.worldX + a.w / 2 - px) - Math.abs(b.worldX + b.w / 2 - px));
    const queue = (at, type, data) => events.push({ at: plan.strike + at, type, data });
    const zone = (x, y, w, h, at, life, style, drift = 0, preview = false) => {
      plan.zones.push(V.bossZone(s, x, y, w, h, plan.strike + at, life, style, drift, preview));
      plan.activeUntil = Math.max(plan.activeUntil, plan.strike + at + life);
    };
    plan.attack.plan({
      b, phase, px, py, bx, by, dir, shotSpeed: 360 + 45 * phase,
      nearDecks: decksByDistance.slice(0, 2 + Number(phase > 1)),
      history: s.history.length > 1 ? s.history.slice(-3) : [px - 137, px, px + 137],
      zone,
      shot: (key, x, y, vx, vy, at, extra = {}) => {
        queue(at, 'shot', { key, x: V.clamp(x, 22, s.worldWidth - 22), y, vx, vy, ...V.bossShots[key], ...extra });
        plan.activeUntil = Math.max(plan.activeUntil, plan.strike + at + .12);
      },
      rush: (x, y, life, style, lift = 0) => {
        const toX = V.clamp(x, 35, s.worldWidth - b.w - 35);
        const width = Math.abs(toX - b.x) + b.w;
        zone((toX + b.x + b.w) / 2, G - 75, width, 75, 0, life, style, 0, true);
        queue(0, 'rush', { toX, toY: y, life, lift, spiral: style === 'current' });
      },
      fx: (key, life, direction = 1) => queue(0, 'effect', { key, life, direction }),
      echo: (x, y, at) => {
        zone(x, y, 64, 73, at, .44, 'mirror', 0, true);
        queue(at, 'echo', { x, y, life: .63 });
      },
      chest: (x, trap, at) => {
        zone(x, G - 45, 54, 45, at, .27, 'gold', 0, true);
        queue(at, 'chest', { x: V.clamp(x - 25, 20, s.worldWidth - 72), y: G - 39, w: 50, h: 39, trap });
      }
    });
    events.sort((a, b) => a.at - b.at);
  };

  V.triggerBossEvents = function (s, plan) {
    const b = s.boss;
    while (plan.events.length && plan.events[0].at <= s.elapsed + 1e-7) {
      const { type, data } = plan.events.shift();
      if (type === 'shot') {
        s.projectiles.push(data);
        V.emitParticles(s, 'shot', data.x, data.y, { color: data.color, direction: Math.sign(data.vx) || 1 });
      }
      else if (type === 'effect') s.arenaFX[data.key] = { start: s.elapsed, end: s.elapsed + data.life, direction: data.direction };
      else if (type === 'rush') b.rush = { ...data, x: b.x, y: b.y, start: s.elapsed };
      else if (type === 'echo') s.echoes.push({ ...data, end: s.elapsed + data.life });
      else if (type === 'chest') s.chests.push({ ...data, end: s.elapsed + (data.trap ? 1.75 : 4.8) });
    }
  };

  V.moveBossDecks = function (s, dt) {
    const p = s.player;
    for (const [key, fx] of Object.entries(s.arenaFX)) {
      if (s.elapsed >= fx.end) delete s.arenaFX[key];
    }
    const fx = s.arenaFX;
    s.wind = (fx.current?.direction ?? 0) * 490;
    if (fx.belt && p.grounded && p.y + p.h >= G - 2) {
      s.wind += Math.floor((p.x + p.w / 2) / 265) % 2 ? 570 : -570;
    }
    const tide = fx.tide;
    s.tideY = tide ? G - 234 * Math.min(1, (s.elapsed - tide.start) / 1.15, tide.end - s.elapsed) : G;
    s.gravityFactor = tide && p.y + p.h / 2 >= s.tideY ? .62 : 1;
    for (let i = 1; i < s.platforms.length; i++) {
      const deck = s.platforms[i];
      const lift = fx.gilded ? 38 : fx.stage ? (i % 2 ? 42 : -33) :
        fx.quake ? Math.sin(s.elapsed * 7 + i * 1.6) * 27 : fx.patch ? (i % 2 ? -23 : 23) : 0;
      const oldY = deck.y;
      const wasEnabled = deck.enabled !== false;
      const ghost = fx.patch && (i + Math.floor((s.elapsed - fx.patch.start) * 1.3)) % 4 === 0;
      deck.enabled = !ghost;
      deck.y = V.lerp(oldY, deck.homeY - lift, Math.min(1, dt * 6));
      if (wasEnabled && deck.enabled && p.grounded && Math.abs(p.y + p.h - oldY) < 2 &&
        p.x + p.w > deck.worldX + 4 && p.x < deck.worldX + deck.w - 4) p.y += deck.y - oldY;
    }
    if (p.x <= 24) s.runDirection = 1;
    else if (p.x + p.w >= s.worldWidth - 24) s.runDirection = -1;
    if (s.elapsed >= s.historyAt) {
      s.history.push(p.x + p.w / 2);
      if (s.history.length > 3) s.history.shift();
      s.historyAt = s.elapsed + .65;
    }
  };

  V.updateBossZones = function (s, dt) {
    const p = s.player;
    for (const z of s.zones) {
      if (s.elapsed < z.at || z.preview) continue;
      if (!z.flared) {
        z.flared = true;
        V.emitParticles(s, 'zone', z.x + z.w / 2, z.y + z.h - 11, { color: V.bossZoneColors[z.style], spread: z.w });
      }
      const oldX = z.x;
      z.x += z.drift * dt;
      const relative = { ...p, previousX: p.previousX + z.x - oldX };
      if (V.movementContact(relative, z) < Infinity) V.hurt(s);
      if (s.outcome !== null) return;
    }
    s.zones = s.zones.filter(z => s.elapsed < z.at + z.life);
    s.echoes = s.echoes.filter(echo => s.elapsed < echo.end);
    for (const chest of s.chests) {
      if (V.weaponContact(s, chest) < Infinity) {
        p.swing.hits.add(chest);
        chest.dead = true;
        if (!chest.trap) V.addCoin(s, chest.x + chest.w / 2, chest.y);
        V.hitFeedback(s, 'hit', chest.x + chest.w / 2, chest.y + chest.h / 2);
      } else if (s.elapsed >= chest.end) {
        chest.dead = true;
        if (chest.trap) V.bossZone(s, chest.x + chest.w / 2, G - 96, 144, 96, s.elapsed, .32, 'gold');
      } else if (V.overlap(p, chest)) V.slowOnImpact(s);
    }
    s.chests = s.chests.filter(chest => !chest.dead);
    V.collectCoins(s);
  };
})();
