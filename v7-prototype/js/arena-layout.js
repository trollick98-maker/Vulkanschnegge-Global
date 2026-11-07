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
    const islandCount = node.tier >= 3 ? 4 : 3;
    const platforms = [{ worldX: 0, y: V.GROUND, w: between(315, 400), h: 17, ground: true }];
    let previous = platforms[0];

    function append(y, w, ground) {
      const gap = Math.floor(V.arenaJumpGap(previous.y, y) * between(69, 96) / 100);
      previous = { worldX: previous.worldX + previous.w + gap, y, w, h: 17, ground };
      platforms.push(previous);
    }

    const firstShape = between(0, shapes.length - 1);
    for (let island = 1; island < islandCount; island++) {
      const shape = shapes[(firstShape + island - 1) % shapes.length];
      for (const height of shape) {
        const y = Math.round(V.GROUND - jumpHeight * (height + between(-4, 4) / 100));
        append(y, between(100, 156), false);
      }
      append(V.GROUND, between(395, 535), true);
    }

    const worldWidth = previous.worldX + previous.w;
    return { platforms, worldWidth, exitX: worldWidth - 100 };
  };
})();
