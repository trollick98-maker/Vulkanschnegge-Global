(function () {
  'use strict';
  const V = window.VS7;
  const data = V.courseData;
  const padding = 530;

  function segment(s, index) {
    const pool = s.kind === 'boss' ? data.boss : data.road;
    return pool[Math.floor(V.randomFor(s.seed + ':segment:' + index)() * pool.length)];
  }

  V.spawnCourse = function (s) {
    const horizon = s.dist + 1350;
    const cursors = s.spawnCursor;
    while (padding + cursors.terrain * data.span < horizon) {
      const n = cursors.terrain++;
      const x = padding + n * data.span;
      const piece = segment(s, n);
      for (const [offset, h, fragile] of piece.obstacles) {
        s.obstacles.push({ worldX: x + offset, w: fragile ? 51 : 45, h, fragile, dead: false });
      }
      for (const [offset, y, w] of piece.platforms) s.platforms.push({ worldX: x + offset, y, w, h: 17 });
    }
    while (padding + cursors.coins * data.span < horizon) {
      const n = cursors.coins++;
      const x = padding + n * data.span;
      for (const [offset, y] of segment(s, n).coins) {
        for (let i = 0; i < 3; i++) V.addCoin(s, x + offset + i * 32, y);
      }
    }
  };

  V.updateCourse = function (s) {
    if (s.obstacles.length && s.obstacles[0].worldX < s.dist - 360) {
      s.obstacles = s.obstacles.filter(item => item.worldX >= s.dist - 360 && !item.dead);
    }
    if (s.platforms.length && s.platforms[0].worldX + s.platforms[0].w < s.dist - 360) {
      s.platforms = s.platforms.filter(item => item.worldX + item.w >= s.dist - 360);
    }
    if (s.coins.length && s.coins[0].worldX < s.dist - 360) {
      s.coins = s.coins.filter(item => item.worldX >= s.dist - 360 && !item.taken);
    }
    V.spawnCourse(s);
    const p = s.player;
    for (const item of s.obstacles) {
      if (item.dead) continue;
      const x = V.scrollX(s, item.worldX);
      if (p.x >= x + item.w || p.x + p.w <= x || p.y + p.h <= V.GROUND - item.h) continue;
      if (item.fragile && p.dashTime > 0) {
        item.dead = true;
        s.score += 55;
        V.impact(s, x + item.w / 2, V.GROUND - item.h / 2, '#f8bf82');
        V.say(s, 'Trümmer zerlegt!');
      } else {
        item.dead = true;
        V.hurt(s);
      }
    }
    V.collectCoins(s);
  };

  V.newRunner = function (route, character, build) {
    const kind = route ? 'travel' : 'arcade';
    const edge = route?.edge;
    const section = V.newSection({
      kind, character, build, biome: edge?.biome || 'reef',
      seed: edge?.seed || 'arcade:' + Math.random().toString(36).slice(2),
      title: route ? 'Weg nach ' + route.node.name : 'Endlos-Modus'
    });
    section.duration = edge?.seconds || Infinity;
    section.startSpeed = 345 + V.characters[character].speed + (edge ? ((edge.tier ?? route.node.tier ?? 1) - 1) * 42 : 0);
    section.speed = section.startSpeed;
    section.spawnCursor = { terrain: 0, coins: 0 };
    V.spawnCourse(section);
    return section;
  };

  V.updateRunner = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    const speed = s.startSpeed + Math.min(520, s.elapsed * 6.4);
    s.speed = V.clamp(speed, 155, 900);
    V.movePlayer(s, dt, actions);
    s.dist += (s.speed + (s.player.dashTime > 0 ? 170 : 0)) * dt;
    s.score += s.speed * .1 * dt;
    V.updateCourse(s);
    if (s.outcome === null && s.elapsed + 1e-7 >= s.duration) {
      s.elapsed = s.duration;
      s.outcome = true;
    }
  };
})();
