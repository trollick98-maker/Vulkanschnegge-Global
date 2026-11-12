/* Seeded, bidirectional platform links calibrated to the base movement physics. */
(function () {
  'use strict';
  const V = window.VS7;
  const motion = V.arenaMotion;
  const characters = Object.values(V.characters);
  const gravity = motion.gravity * Math.max(...characters.map(character => character.gravity));
  const run = motion.run + Math.min(...characters.map(character => character.speed));
  const acceleration = Math.min(...characters.map(character => character.acceleration));
  const jumpHeight = motion.jump ** 2 / (2 * gravity);
  const patterns = {
    reef: [[.25, .48], [.38, .32, .16]],
    greed: [[.36, .58, .51], [.23, .54, .31, .18]],
    diva: [[.54, .31], [.48, .19, .52]],
    vortex: [[.22, .53, .60], [.46, .26, .55, .24]]
  };
  const terraces = {
    reef: [0, -125, -245, -95, 95, 175, 35, -120],
    greed: [0, 155, 320, 210, 35, -145, -275, -95],
    diva: [0, -155, -315, -225, -45, 120, -30, -200],
    vortex: [0, -150, 30, 220, 60, -155, -300, -110]
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
    const shapes = patterns[node.biome];
    const elevations = terraces[node.biome];
    const islandCount = node.tier >= 3 ? 8 : 7;
    const upperDecks = [];
    const caves = [];
    const platforms = [{ worldX: 0, y: V.GROUND, w: between(370, 465), h: 17, ground: true }];
    const traps = [];
    let previous = platforms[0];

    function append(y, w, ground, mover) {
      const motionX = (previous.mover?.x ?? 0) + (mover?.x ?? 0);
      const motionY = (previous.mover?.y ?? 0) + (mover?.y ?? 0);
      const reach = V.arenaJumpGap(previous.y, y + Math.sign(y - previous.y || 1) * motionY);
      const gap = Math.floor(reach * between(84, 99) / 100 - motionX);
      const worldX = previous.worldX + previous.w + gap;
      previous = { worldX, y, w, h: 17, ground };
      if (mover) Object.assign(previous, { mover, homeX: worldX, homeY: y });
      platforms.push(previous);
    }

    const firstShape = between(0, shapes.length - 1);
    for (let island = 1; island < islandCount; island++) {
      const shape = shapes[(firstShape + island - 1) % shapes.length];
      const fromY = previous.y;
      const targetY = V.GROUND + elevations[island] + between(-18, 18);
      const links = Math.max(shape.length + 1, Math.ceil(Math.abs(targetY - fromY) / (jumpHeight * .37)));
      for (let step = 1; step < links; step++) {
        const relief = (shape[(step - 1) % shape.length] - .35) * jumpHeight * .42;
        const y = Math.round(V.lerp(fromY, targetY, step / links) - relief + between(-5, 5));
        const mover = step === 1 && island < islandCount - 1 ? {
          x: island % 2 ? 36 : 0, y: island % 2 ? 0 : 37,
          rate: island % 3 === 0 ? 2.8 : 1.32, phase: between(0, 100) * .063
        } : null;
        append(y, between(112, 156), false, mover);
      }
      append(targetY, between(420, 565), true);
      if (island < islandCount - 1 && (island % 2 === 0 || (node.tier >= 3 && island > 2))) {
        const x = previous.worldX + Math.round(previous.w * between(46, 54) / 100);
        traps.push({ kind: node.biome, x, y: targetY, state: 'idle', left: 0, hit: false });
      }
    }

    const islands = platforms.filter(platform => platform.ground);
    for (const [index, island] of islands.entries()) {
      if (index === 0 || index === islandCount - 1) continue;
      if ((index + node.tier) % 3 === 0) island.conveyor = index % 2 ? 114 : -150;
      const cave = (node.biome === 'reef' || node.biome === 'vortex') && index === 2;
      const secondFloor = index === (node.biome === 'greed' ? 3 : 4);
      if (!cave && !secondFloor) continue;
      const { worldX, y, w } = island;
      upperDecks.push(
        { worldX: worldX + 28, y: y - 89, w: 105, h: 17, upper: 'step' },
        { worldX: worldX + 163, y: y - 174, w: w - 319, h: 17, upper: 'floor' },
        { worldX: worldX + w - 122, y: y - 88, w: 99, h: 17, upper: 'step' });
      if (cave) caves.push({ x: worldX + 130, y: y - 177, w: w - 260, h: 178 });
    }
    const worldWidth = previous.worldX + previous.w;
    return { platforms, upperDecks, caves, traps, worldWidth, exitX: worldWidth - 100, exitY: previous.y };
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
