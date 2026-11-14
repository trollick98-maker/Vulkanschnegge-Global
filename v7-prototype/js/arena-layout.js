/* Seeded, bidirectional platform links calibrated to the base movement physics. */
(function () {
  'use strict';
  const V = window.VS7;
  const motion = V.arenaMotion;
  const characters = Object.values(V.characters);
  const gravity = motion.gravity * Math.max(...characters.map(character => character.gravity));
  const run = motion.run + Math.min(...characters.map(character => character.speed));
  const acceleration = Math.min(...characters.map(character => character.acceleration));
  const terrain = {
    reef: { high: [225, 370], low: [150, 250], peakFirst: .68, conveyor: .17 },
    greed: { high: [250, 415], low: [240, 390], peakFirst: .28, conveyor: .52 },
    diva: { high: [285, 440], low: [135, 290], peakFirst: .66, conveyor: .28 },
    vortex: { high: [270, 430], low: [225, 375], peakFirst: .48, conveyor: .38 }
  };

  function landingDistance(fromY, toY) {
    const discriminant = motion.jump ** 2 - 2 * gravity * (fromY - toY);
    if (discriminant < 0) return 0;
    const time = (motion.jump + Math.sqrt(discriminant)) / gravity;
    const accelerationTime = Math.min(time, run / acceleration);
    return .72 * (acceleration * accelerationTime ** 2 / 2 + run * (time - accelerationTime));
  }

  V.arenaJumpGap = (fromY, toY) => Math.min(landingDistance(fromY, toY), landingDistance(toY, fromY));

  V.generateArena = function (node, seed) {
    const random = V.randomFor(seed + ':' + node.id + ':terrain');
    const between = (low, high) => low + Math.floor(random() * (high - low + 1));
    const region = terrain[node.biome];
    const islandCount = between(node.tier >= 3 ? 7 : 6, node.optional ? 8 : 9);
    const peakFirst = random() < region.peakFirst;
    const firstExtreme = between(1, 2);
    const secondExtreme = between(Math.max(firstExtreme + 2, islandCount - 4), islandCount - 2);
    const peak = -between(...region.high);
    const basin = between(...region.low);
    const ridge = [[0, 0], [firstExtreme, peakFirst ? peak : basin], [secondExtreme, peakFirst ? basin : peak],
      [islandCount - 1, between(-155, 145)]];
    const trapPositions = new Set([between(1, firstExtreme + 1), between(secondExtreme, islandCount - 2)]);
    const upperPositions = new Set([between(1, islandCount - 2), secondExtreme]);
    const cavePosition = peakFirst ? secondExtreme : firstExtreme;
    let segment = 0;
    const upperDecks = [];
    const caves = [];
    const platforms = [{ worldX: 0, y: V.GROUND, w: between(370, 465), h: 17, ground: true }];
    const traps = [];
    let previous = platforms[0];

    function append(y, w, ground, mover) {
      const motionX = (previous.mover?.x ?? 0) + (mover?.x ?? 0);
      const motionY = (previous.mover?.y ?? 0) + (mover?.y ?? 0);
      const reach = V.arenaJumpGap(previous.y, y + Math.sign(y - previous.y || 1) * motionY);
      const gap = Math.max(18, Math.floor(reach * between(78, 94) / 100 - motionX));
      const worldX = previous.worldX + previous.w + gap;
      previous = { worldX, y, w, h: 17, ground };
      if (mover) Object.assign(previous, { mover, homeX: worldX, homeY: y });
      platforms.push(previous);
    }

    for (let island = 1; island < islandCount; island++) {
      if (island > ridge[segment + 1][0]) segment++;
      const [start, startY] = ridge[segment];
      const [end, endY] = ridge[segment + 1];
      const fromY = previous.y;
      const emphasis = island === end ? 0 : between(-105, 105);
      const targetY = V.GROUND + Math.round(V.lerp(startY, endY, (island - start) / (end - start))) + emphasis;
      const links = Math.max(between(2, 4), Math.ceil(Math.abs(targetY - fromY) / 69));
      const movingStep = island < islandCount - 1 && (island <= 2 || random() < .56) ? between(1, links - 1) : 0;
      for (let step = 1; step < links; step++) {
        const y = Math.round(V.lerp(fromY, targetY, step / links) + between(-13, 13));
        const vertical = island === 2 || (island > 2 && random() < .5);
        const mover = step === movingStep ? {
          x: vertical ? 0 : between(20, 35), y: vertical ? between(16, 32) : 0,
          rate: island === 1 ? 1.25 : island === 2 ? 2.35 : between(11, 28) / 10, phase: random() * Math.PI * 2
        } : null;
        append(y, between(109, 170), false, mover);
      }
      append(targetY, between(418, 635), true);
      if (island < islandCount - 1 && (trapPositions.has(island) || random() < .23 + node.tier * .035)) {
        const x = previous.worldX + Math.round(previous.w * between(38, 62) / 100);
        traps.push({ kind: node.biome, x, y: targetY, state: 'idle', left: 0, hit: false });
      }
    }

    const islands = platforms.filter(platform => platform.ground);
    for (let index = 1; index < islandCount - 1; index++) {
      const island = islands[index];
      if (index === firstExtreme || random() < region.conveyor) island.conveyor = (random() < .5 ? -1 : 1) * between(98, 153);
      const cave = index === cavePosition;
      if (!cave && !upperPositions.has(index)) continue;
      const { worldX, y, w } = island;
      const left = between(25, 44);
      const right = between(23, 47);
      const step = between(86, 97);
      const roof = step + between(80, 99);
      upperDecks.push(
        { worldX: worldX + left, y: y - step, w: 107, h: 17, upper: 'step' },
        { worldX: worldX + 157, y: y - roof, w: w - 314, h: 17, upper: 'floor' },
        { worldX: worldX + w - right - 105, y: y - step, w: 105, h: 17, upper: 'step' });
      if (cave) caves.push({ x: worldX + 130, y: y - roof - 3, w: w - 260, h: roof + 4 });
    }
    const worldWidth = previous.worldX + previous.w;
    return { platforms, upperDecks, caves, traps, worldWidth, exitX: worldWidth - 100, exitY: previous.y };
  };

  V.arenaFallLimit = function (s) {
    const p = s.player;
    let limit = s.supportY + 300;
    for (const deck of s.platforms) {
      if (deck.worldX < p.x + p.w - 4 && p.x + 4 < deck.worldX + deck.w && deck.y < p.y + p.h + 190) {
        limit = Math.max(limit, deck.y + 72);
      }
    }
    return limit;
  };

  V.moveArenaDecks = function (s, dt) {
    const p = s.player;
    for (const deck of s.platforms) {
      if (!deck.mover) continue;
      const { x, y, rate, phase } = deck.mover;
      const wave = Math.sin(s.elapsed * rate + phase);
      const dx = deck.homeX + x * wave - deck.worldX;
      const dy = deck.homeY + y * wave - deck.y;
      if (p.grounded && Math.abs(p.y + p.h - deck.y) < 2 &&
          p.x + p.w > deck.worldX + 4 && p.x < deck.worldX + deck.w - 4) {
        p.x += dx;
        p.y += dy;
        s.supportY = deck.y + dy;
      } else if (dy < 0 && p.vy >= 0 && p.y + p.h <= deck.y && p.y + p.h >= deck.y + dy &&
          p.x + p.w > deck.worldX + dx + 4 && p.x < deck.worldX + dx + deck.w - 4) {
        p.y = deck.y + dy - p.h;
      }
      deck.worldX += dx;
      deck.y += dy;
      for (const coin of deck.coins) {
        coin.worldX += dx;
        coin.y += dy;
      }
    }
    const belt = p.grounded && s.platforms.find(deck => deck.conveyor && Math.abs(p.y + p.h - deck.y) < 2 &&
      p.x + p.w / 2 > deck.worldX && p.x + p.w / 2 < deck.worldX + deck.w);
    if (belt) p.x += belt.conveyor * dt;
  };
})();
