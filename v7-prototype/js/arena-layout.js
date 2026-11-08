/* Seeded, bidirectional platform links calibrated to the base movement physics. */
(function () {
  'use strict';
  const V = window.VS7;
  const motion = V.arenaMotion;
  const characters = Object.values(V.characters);
  const gravity = motion.gravity * Math.max(...characters.map(character => character.gravity));
  const run = motion.run + Math.min(...characters.map(character => character.speed));
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
    const accelerationTime = Math.min(time, run / motion.acceleration);
    return .72 * (motion.acceleration * accelerationTime ** 2 / 2 + run * (time - accelerationTime));
  }

  V.arenaJumpGap = (fromY, toY) => Math.min(landingDistance(fromY, toY), landingDistance(toY, fromY));

  V.generateArena = function (node, seed) {
    const random = V.randomFor(seed + ':' + node.id + ':terrain');
    const between = (low, high) => low + Math.floor(random() * (high - low + 1));
    const shapes = patterns[node.biome];
    const elevations = terraces[node.biome];
    const islandCount = node.tier >= 3 ? 8 : 7;
    const platforms = [{ worldX: 0, y: V.GROUND, w: between(370, 465), h: 17, ground: true }];
    const traps = [];
    let previous = platforms[0];

    function append(y, w, ground) {
      const gap = Math.floor(V.arenaJumpGap(previous.y, y) * between(69, 96) / 100);
      previous = { worldX: previous.worldX + previous.w + gap, y, w, h: 17, ground };
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
        append(y, between(100, 156), false);
      }
      append(targetY, between(420, 565), true);
      if (island < islandCount - 1 && (island % 2 === 0 || (node.tier >= 3 && island > 2))) {
        const x = previous.worldX + Math.round(previous.w * between(46, 54) / 100);
        traps.push({ kind: node.biome, x, y: targetY, state: 'idle', left: 0, hit: false });
      }
    }

    const worldWidth = previous.worldX + previous.w;
    return { platforms, traps, worldWidth, exitX: worldWidth - 100, exitY: previous.y };
  };
})();
