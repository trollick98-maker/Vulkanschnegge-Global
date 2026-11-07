(function () {
  'use strict';
  const V = window.VS7;
  const canvas = document.getElementById('game');
  const g = canvas.getContext('2d', { alpha: false });
  const { W, H, GROUND: G } = V;
  const backdrops = new Map();
  // Y coordinate of each walkable deck in its source PNG.
  const deckY = { reef: 17, greed: 2, diva: 2, vortex: 2 };
  const atlas = {
    greed: [26, 0, 335, 239], diva: [418, 0, 311, 247],
    vortex: [47, 239, 279, 273], god: [394, 260, 328, 236]
  };
  g.imageSmoothingEnabled = false;

  function background(key, time, dist) {
    const colors = V.biomes[key];
    if (!backdrops.has(key)) {
      const plate = document.createElement('canvas');
      plate.width = W;
      plate.height = H;
      const paint = plate.getContext('2d');
      const sky = paint.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, colors.top);
      sky.addColorStop(1, colors.bottom);
      paint.fillStyle = sky;
      paint.fillRect(0, 0, W, G);
      paint.fillStyle = colors.ground;
      paint.fillRect(0, G, W, H - G);
      backdrops.set(key, plate);
    }
    g.drawImage(backdrops.get(key), 0, 0);
    g.fillStyle = colors.far;
    g.beginPath();
    g.moveTo(0, G);
    for (let i = -1; i < 10; i++) {
      const x = i * 132 - (dist * .19) % 132;
      g.lineTo(x, 389);
      g.lineTo(x + 38, 309 + i % 3 * 22);
      g.lineTo(x + 78, 326);
      g.lineTo(x + 119, 389);
    }
    g.lineTo(W, G);
    g.closePath();
    g.fill();
    g.globalAlpha = .18;
    g.fillStyle = colors.accent;
    for (let i = 0; i < 30; i++) {
      const x = (i * 127 + 67) % W + Math.sin(time * .8 + i) * 14;
      const y = (i * 83 + H - time * (8 + i % 5) % H + H) % H;
      if (y < G) g.fillRect(x, y, 2 + i % 4, 2 + i % 4);
    }
    for (let i = -1; i < 12; i++) {
      const x = i * 94 - (dist % 94);
      g.fillRect(x, G + 12 + 8 * (i & 1), 52, 2);
      g.fillRect(x + 18, G + 50, 22, 2);
    }
    g.globalAlpha = .45;
    g.fillRect(0, G, W, 3);
    g.globalAlpha = 1;
  }

  function sprite(name, x, y, w, h) {
    const image = V.readyImage(name);
    if (!image) return false;
    g.drawImage(image, x, y, w, h);
    return true;
  }

  function fittedSprite(name, x, y, w, h, bottom = false) {
    const image = V.readyImage(name);
    if (!image) return false;
    const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    g.drawImage(image, x + (w - width) / 2, y + (h - height) * (bottom ? 1 : .5), width, height);
    return true;
  }

  function drawPlayer(s) {
    const p = s.player;
    g.save();
    g.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.dashTime > 0) {
      g.fillStyle = '#a4f9e06e';
      g.fillRect(-p.facing * p.w * 1.13 - p.w / 2, -3, p.w, 5);
      g.fillRect(-p.facing * p.w * .80 - p.w / 2, 8, p.w, 3);
    }
    if (p.invuln > 0 && Math.floor(s.elapsed * 13) % 2 === 0) g.globalAlpha = .42;
    g.rotate(p.angle * p.facing * Math.PI / 180);
    g.scale(p.facing, 1);
    if (!sprite(s.character, -p.w / 2, -p.h / 2, p.w, p.h)) {
      g.fillStyle = '#ffb966';
      g.fillRect(-p.w * .37, -p.h * .33, p.w * .67, p.h * .68);
      g.fillStyle = '#f6e5bb';
      g.fillRect(0, p.h * .18, p.w * .5, p.h * .27);
    }
    g.restore();
  }

  function drawCourse(s) {
    const platformArt = V.readyImage('platform-' + s.biome);
    for (const platform of s.platforms) {
      const x = V.stageX(s, platform.worldX);
      if (x + platform.w < 0 || x > W) continue;
      if (platformArt) {
        const scale = platform.w / platformArt.naturalWidth;
        g.drawImage(platformArt, x, platform.y - deckY[s.biome] * scale, platform.w, platformArt.naturalHeight * scale);
      } else if (!sprite('platform', x, platform.y - 13, platform.w, 48)) {
        g.fillStyle = '#3c6871';
        g.fillRect(x, platform.y, platform.w, platform.h);
      }
      g.fillStyle = V.biomes[s.biome].accent;
      g.globalAlpha = .55;
      g.fillRect(x + 6, platform.y, platform.w - 12, 2);
      g.globalAlpha = 1;
    }
    for (const item of s.obstacles) {
      const x = V.scrollX(s, item.worldX);
      if (item.dead || x < -65 || x > W || (s.boss && x > s.boss.x - 45)) continue;
      if (!sprite(item.fragile ? 'crate' : 'mine', x - 3, G - item.h - 3, item.w + 6, item.h + 6)) {
        g.fillStyle = item.fragile ? '#bd7eaa' : '#ea776a';
        g.fillRect(x, G - item.h, item.w, item.h);
      }
    }
    for (const coin of s.coins) {
      if (coin.taken) continue;
      const x = V.stageX(s, coin.worldX);
      if (x < -20 || x > W + 20) continue;
      const width = 6 + Math.abs(Math.cos(s.elapsed * 5.5)) * 8;
      g.fillStyle = '#9e663f';
      g.fillRect(x - width / 2 - 1, coin.y - 9, width + 2, 18);
      g.fillStyle = '#ffda78';
      g.fillRect(x - width / 2 + 1, coin.y - 7, width - 2, 14);
      g.fillStyle = '#fff4ae';
      g.fillRect(x - 1, coin.y - 5, 2, 10);
    }
  }

  function drawEnemies(s) {
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      const { x, y, w, h } = enemy;
      if (!fittedSprite(s.biome + '-' + enemy.key, x, y, w, h, true)) {
        g.fillStyle = '#14233d';
        g.fillRect(x + 1, y + 9, w - 2, h - 8);
        g.fillStyle = enemy.color;
        g.fillRect(x + 6, y + 7, w - 12, h - 13);
        g.fillRect(x + 13, y + 2, w - 24, h - 5);
        g.fillRect(x + 3, y + h - 5, 12, 5);
        g.fillRect(x + w - 14, y + h - 5, 11, 5);
        g.fillStyle = '#15253c';
        g.fillRect(x + 12, y + 11, 5, 5);
        g.fillRect(x + 22, y + 11, 5, 5);
      }
      if (enemy.key === 'armored' && enemy.hp > 1) {
        g.fillStyle = '#d1fff7';
        g.fillRect(x + 11, y - 4, w - 22, 3);
      }
    }
  }

  function drawTell(s) {
    const tell = s.boss.tell;
    if (!tell) return;
    const attack = V.bossAttacks[tell.key];
    g.save();
    g.fillStyle = attack.color;
    g.globalAlpha = .22;
    if (attack.zone) {
      g.fillRect(tell.targetX - attack.width / 2, 122, attack.width, G - 122);
      g.globalAlpha = .78;
      g.fillRect(tell.targetX - attack.width / 2, G - 5, attack.width * (1 - tell.left / tell.total), 5);
    } else if (attack.wind) {
      g.globalAlpha = .7;
      g.font = '800 22px monospace';
      g.fillText('» » »', 475, 344);
    } else {
      g.fillRect(110, tell.lane - 1, s.boss.x - 110, 2);
      g.globalAlpha = .85;
      g.fillRect(s.boss.x - 36, tell.lane - 6, 12, 12);
    }
    g.restore();
  }

  function drawProjectile(q) {
    const attack = V.bossAttacks[q.key];
    if (q.zone) {
      g.fillStyle = attack.color;
      g.globalAlpha = .40;
      g.fillRect(q.x, 122, q.w, G - 122);
      g.globalAlpha = 1;
      g.fillRect(q.x, G - 3, q.w, 3);
      return;
    }
    const { x, y, r } = q;
    if (!fittedSprite(attack.sprite ?? q.key, x - r * 1.35, y - r * 1.35, r * 2.7, r * 2.7)) {
      g.fillStyle = attack.color;
      if (q.key === 'net') {
        g.strokeStyle = attack.color;
        g.lineWidth = 3;
        g.strokeRect(x - r, y - r, r * 2, r * 2);
        g.fillRect(x - r, y - 2, r * 2, 4);
        g.fillRect(x - 2, y - r, 4, r * 2);
      } else if (q.key === 'anchor') {
        g.fillRect(x - 4, y - r, 8, r * 2);
        g.fillRect(x - r, y + 3, r * 2, 8);
        g.fillRect(x - r, y - 4, 6, 13);
        g.fillRect(x + r - 6, y - 4, 6, 13);
      } else {
        g.fillRect(x - r + 4, y - r + 4, r * 2 - 8, r * 2 - 8);
        g.fillRect(x - r, y - 4, r * 2, 8);
        g.fillRect(x - 4, y - r, 8, r * 2);
        g.fillStyle = '#fff4d7';
        g.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    if (attack.reflect || q.reflected) {
      g.strokeStyle = q.reflected ? '#fff1a8' : '#fbffec';
      g.lineWidth = q.reflected ? 3 : 1.5;
      const halo = r + (q.reflected ? 6 : 4);
      g.strokeRect(x - halo, y - halo, halo * 2, halo * 2);
    }
  }

  function drawBoss(s) {
    const b = s.boss;
    const art = atlas[b.definition.sprite];
    const aura = V.biomes[s.biome].accent;
    g.globalAlpha = .12;
    g.fillStyle = aura;
    g.beginPath();
    g.ellipse(b.x + b.w / 2, 288, 104, 138, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    if (art) {
      const image = V.readyImage('atlas');
      const width = b.w;
      const height = Math.min(231, width * art[3] / art[2]);
      if (image) g.drawImage(image, ...art, b.x, 286 - height / 2, width, height);
      else {
        g.fillStyle = aura;
        g.fillRect(b.x + 37, 232, b.w - 74, 118);
      }
    } else {
      g.save();
      g.translate(b.x + b.w, 0);
      g.scale(-1, 1);
      if (!sprite('bossEel', 0, b.y, b.w, b.h)) {
        g.fillStyle = aura;
        g.fillRect(40, b.y + 25, b.w - 80, 130);
      }
      g.restore();
    }
    if (b.flash > 0) {
      g.globalAlpha = b.flash;
      g.fillStyle = '#fff6c3';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.globalAlpha = 1;
    }
    if (s.windTime > 0 || (s.biome === 'god' && b.phase > 0)) {
      g.globalAlpha = .32;
      g.fillStyle = aura;
      for (let i = 0; i < 9; i++) {
        g.fillRect((i * 109 + s.elapsed * 113) % W, 142 + (i * 77) % 252, s.windTime > 0 ? 28 : 11, 2);
      }
      g.globalAlpha = 1;
    }
    drawTell(s);
    for (const q of s.projectiles) drawProjectile(q);
  }

  V.render = function (section) {
    background(section.biome, section.elapsed, section.dist);
    drawCourse(section);
    if (section.kind === 'arena') drawEnemies(section);
    if (section.kind === 'boss') drawBoss(section);
    drawPlayer(section);
  };
})();
