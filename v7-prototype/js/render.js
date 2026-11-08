(function () {
  'use strict';
  const V = window.VS7;
  const canvas = document.getElementById('game');
  const g = canvas.getContext('2d', { alpha: false });
  const { W, H, GROUND: G } = V;
  const backdrops = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Y coordinate of each walkable deck in its source PNG.
  const deckY = { reef: 17, greed: 2, diva: 2, vortex: 2, god: 1 };
  const atlas = {
    greed: [26, 0, 335, 239], diva: [418, 0, 311, 247],
    vortex: [47, 239, 279, 273], god: [394, 260, 328, 236]
  };
  g.imageSmoothingEnabled = false;

  function background(key, time, dist, arena, cameraY) {
    const colors = V.biomes[key];
    const cacheKey = arena ? key + ':arena' : key;
    if (!backdrops.has(cacheKey)) {
      const plate = document.createElement('canvas');
      plate.width = W;
      plate.height = H;
      const paint = plate.getContext('2d');
      const sky = paint.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, colors.top);
      sky.addColorStop(1, colors.bottom);
      paint.fillStyle = sky;
      paint.fillRect(0, 0, W, G);
      if (arena) {
        const depth = paint.createLinearGradient(0, G, 0, H);
        depth.addColorStop(0, colors.bottom);
        depth.addColorStop(1, '#050c16');
        paint.fillStyle = depth;
      } else {
        paint.fillStyle = colors.ground;
      }
      paint.fillRect(0, G, W, H - G);
      backdrops.set(cacheKey, plate);
    }
    g.drawImage(backdrops.get(cacheKey), 0, 0);
    const ridge = arena ? G - V.clamp(cameraY * .16, -75, 75) : G;
    g.fillStyle = colors.far;
    g.beginPath();
    g.moveTo(0, ridge);
    for (let i = -1; i < 10; i++) {
      const x = i * 132 - (dist * .19) % 132;
      g.lineTo(x, ridge - 61);
      g.lineTo(x + 38, ridge - 141 + i % 3 * 22);
      g.lineTo(x + 78, ridge - 124);
      g.lineTo(x + 119, ridge - 61);
    }
    g.lineTo(W, ridge);
    g.closePath();
    g.fill();
    g.globalAlpha = .18;
    g.fillStyle = colors.accent;
    for (let i = 0; i < 30; i++) {
      const x = (i * 127 + 67) % W + Math.sin(time * .8 + i) * 14;
      const y = (i * 83 + H - time * (8 + i % 5) % H + H) % H;
      if (y < G) g.fillRect(x, y, 2 + i % 4, 2 + i % 4);
    }
    if (arena) {
      g.globalAlpha = 1;
      return;
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
    const dashing = p.dashTime > 0;
    if (dashing && !reducedMotion) {
      const streak = V.usesMomentum(s) ? V.clamp(p.dashVelocity / 650, 1, 2) : 1;
      g.globalAlpha = .16;
      sprite(s.character, p.x - p.facing * 29 * streak, p.y + 4, p.w, p.h);
      g.globalAlpha = .32;
      sprite(s.character, p.x - p.facing * 15 * streak, p.y + 2, p.w, p.h);
      g.globalAlpha = .55;
      g.fillStyle = '#a6fff0';
      const trailX = p.facing > 0 ? p.x - 19 : p.x + p.w - 4;
      g.fillRect(trailX, p.y + p.h * .48, 23, 2);
      g.globalAlpha = .30;
      g.fillRect(trailX - p.facing * 9, p.y + p.h * .62, 19, 2);
      g.globalAlpha = 1;
    }
    const squash = reducedMotion ? 0 : p.landTime * .85 + (dashing ? .16 : 0);
    const stretch = reducedMotion || dashing ? 0 : Math.min(.13, Math.abs(p.vy) / 5200);
    g.translate(p.x + p.w / 2, p.y + p.h * (1 + squash - stretch) / 2);
    if (!reducedMotion && p.invuln > 0 && Math.floor(s.elapsed * 13) % 2 === 0) g.globalAlpha = .42;
    g.rotate(p.angle * p.facing * Math.PI / 180);
    g.scale(p.facing * (1 + squash - stretch * .5), 1 - squash + stretch);
    if (!sprite(s.character, -p.w / 2, -p.h / 2, p.w, p.h)) {
      g.fillStyle = '#ffb966';
      g.fillRect(-p.w * .37, -p.h * .33, p.w * .67, p.h * .68);
      g.fillStyle = '#f6e5bb';
      g.fillRect(0, p.h * .18, p.w * .5, p.h * .27);
    }
    g.restore();
  }

  function drawCourse(s) {
    const left = s.cameraX ?? 0;
    const top = s.cameraY ?? 0;
    const colors = V.biomes[s.biome];
    const platformArt = V.readyImage('platform-' + s.biome);
    const groundArt = s.biome === 'god' ? platformArt : V.readyImage('ground-' + s.biome);
    const tileSize = 150;
    if (groundArt && !V.usesMomentum(s)) {
      const height = tileSize * groundArt.naturalHeight / groundArt.naturalWidth;
      for (let x = -Math.floor(s.dist % tileSize); x < W; x += tileSize) {
        g.drawImage(groundArt, x, G, tileSize, height);
      }
    }
    for (const platform of s.platforms) {
      const x = V.stageX(s, platform.worldX);
      if (x + platform.w < left || x > left + W || platform.y < top - 130 || platform.y > top + H + 24) continue;
      if (platform.ground) {
        g.fillStyle = colors.ground;
        g.fillRect(x, platform.y, platform.w, 116);
        if (groundArt) {
          const count = Math.ceil(platform.w / tileSize);
          for (let i = 0; i < count; i++) {
            const start = Math.round(platform.w * i / count);
            const width = Math.round(platform.w * (i + 1) / count) - start;
            if (x + start + width < left || x + start > left + W) continue;
            g.drawImage(groundArt, x + start, platform.y, width, tileSize * groundArt.naturalHeight / groundArt.naturalWidth);
          }
        } else {
          g.fillStyle = colors.far;
          g.fillRect(x, platform.y + 9, platform.w, 5);
        }
      } else if (platformArt) {
        const scale = platform.w / platformArt.naturalWidth;
        g.drawImage(platformArt, x, platform.y - deckY[s.biome] * scale, platform.w, platformArt.naturalHeight * scale);
      } else if (!sprite('platform', x, platform.y - 13, platform.w, 48)) {
        g.fillStyle = '#3c6871';
        g.fillRect(x, platform.y, platform.w, platform.h);
      }
      g.fillStyle = colors.accent;
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
      if (x < left - 20 || x > left + W + 20 || coin.y < top - 14 || coin.y > top + H + 14) continue;
      const width = 6 + Math.abs(Math.cos(s.elapsed * 5.5)) * 8;
      if (sprite('coin', x - width / 2 - 1, coin.y - 9, width + 2, 18)) continue;
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
      if (x + w < s.cameraX || x > s.cameraX + W || y + h < s.cameraY || y > s.cameraY + H) continue;
      const windingUp = enemy.attackState === 'tell';
      const crouch = windingUp && !reducedMotion ? .18 * (1 - enemy.attackLeft / enemy.windup) : 0;
      g.save();
      g.translate(x + w / 2, y + h);
      g.scale((enemy.facing > 0 ? -1 : 1) * (1 + crouch * .4), 1 - crouch);
      if (!reducedMotion && enemy.flash > 0) g.filter = 'brightness(1.55)';
      const drawn = fittedSprite(s.biome + '-' + enemy.key, -w / 2, -h, w, h, true);
      g.restore();
      if (!drawn) {
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
      g.fillStyle = '#111827';
      g.fillRect(x - 1, y - 10, w + 2, 7);
      g.fillStyle = enemy.key === 'armored' ? '#85dcff' : '#ff7c97';
      g.fillRect(x + 1, y - 8, (w - 2) * (enemy.hp / enemy.maxHp), 3);
      if (windingUp) {
        const progress = 1 - enemy.attackLeft / enemy.windup;
        g.fillStyle = '#ffd080';
        g.fillRect(x + w / 2 - 12, y - 15, 24 * progress, 3);
        g.globalAlpha = .28 + progress * .46;
        if (enemy.key === 'jumper') {
          g.strokeStyle = '#ffb6d9';
          g.strokeRect(enemy.targetX - 6, enemy.floorY - 9, w + 12, 8);
        } else {
          const destination = enemy.key === 'armored' ? x + enemy.facing * 126 : enemy.targetX;
          g.fillRect(Math.min(x, destination) + w / 2, enemy.floorY - 4, Math.abs(destination - x), 3);
        }
        g.globalAlpha = 1;
      }
    }
  }

  function drawExit(s) {
    const x = s.exitX;
    const y = s.exitY;
    if (x + 56 < s.cameraX || x - 12 > s.cameraX + W) return;
    const color = s.exitOpen ? '#8bffcf' : '#f8b381';
    if (!fittedSprite(s.exitOpen ? 'exit-open' : 'exit-closed', x - 8, y - 74, 64, 74, true)) {
      g.fillStyle = '#102036';
      g.fillRect(x - 4, y - 64, 56, 64);
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.strokeRect(x - 4, y - 64, 56, 64);
    }
    g.fillStyle = color;
    g.font = 'bold 12px monospace';
    g.fillText(s.exitOpen ? 'ZIEL →' : 'ZU', x + 3, y - 79);
  }

  function drawTraps(s) {
    for (const trap of s.traps) {
      const type = V.arenaTrapTypes[trap.kind];
      const { x, y } = trap;
      if (x + 52 < s.cameraX || x - 52 > s.cameraX + W || y < s.cameraY || y - type.height - 65 > s.cameraY + H) continue;
      const spotlight = trap.kind === 'diva';
      const active = trap.state === 'active';
      const left = x - type.width / 2;
      if (trap.state !== 'idle') {
        g.fillStyle = type.color;
        if (spotlight) {
          g.globalAlpha = active ? .40 : .16;
          g.fillRect(left, y - type.height, type.width, type.height);
          g.globalAlpha = 1;
        }
        const progress = active ? 1 : 1 - trap.left / type.windup;
        g.strokeStyle = type.color;
        g.strokeRect(left, y - 8, type.width, 6);
        g.fillRect(left, y - 7, type.width * progress, 4);
      }
      const artY = spotlight ? y - type.height : y;
      const pose = active ? 'active' : 'idle';
      if (!fittedSprite('trap-' + trap.kind + '-' + pose, x - 45, artY - 89, 90, 89, true)) {
        g.fillStyle = type.color;
        g.fillRect(left, artY - (active ? 29 : 12), type.width, active ? 29 : 12);
      }
    }
  }

  function drawTell(s) {
    const tell = s.boss.tell;
    if (!tell) return;
    const attack = V.bossAttacks[tell.key];
    const progress = 1 - tell.left / tell.total;
    g.save();
    g.fillStyle = attack.color;
    g.globalAlpha = .16 + progress * .23;
    if (attack.zone) {
      const top = s.boss.stage === 'arena' ? 0 : 122;
      g.fillRect(tell.targetX - attack.width / 2, top, attack.width, G - top);
      g.globalAlpha = .78;
      g.fillRect(tell.targetX - attack.width / 2, G - 5, attack.width * progress, 5);
    } else if (attack.wind) {
      g.globalAlpha = .7;
      g.font = '800 22px monospace';
      const x = s.boss.stage === 'arena' ? tell.targetX : 475;
      g.fillText('» » »', x, 344);
    } else if (s.boss.stage === 'arena') {
      g.strokeStyle = attack.color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(tell.sourceX, tell.sourceY);
      g.lineTo(tell.targetX, tell.targetY);
      g.stroke();
      g.globalAlpha = .85;
      g.strokeRect(tell.targetX - 8, tell.targetY - 8, 16, 16);
    } else {
      g.fillRect(110, tell.lane - 1, s.boss.x - 110, 2);
      g.globalAlpha = .85;
      g.fillRect(s.boss.x - 36, tell.lane - 6, 12, 12);
      if (attack.reflect) {
        g.strokeStyle = '#ecfff2';
        const size = 17 + progress * 9;
        g.strokeRect(s.boss.x - 30 - size / 2, tell.lane - size / 2, size, size);
      }
    }
    g.restore();
  }

  function drawProjectile(q) {
    const attack = V.bossAttacks[q.key];
    if (q.zone) {
      g.fillStyle = attack.color;
      g.globalAlpha = .40;
      g.fillRect(q.x, q.top ?? 122, q.w, G - (q.top ?? 122));
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
    if ((attack.reflect && q.counter !== false) || q.reflected) {
      g.strokeStyle = q.reflected ? '#fff1a8' : '#fbffec';
      g.lineWidth = q.reflected ? 3 : 1.5;
      const halo = r + (q.reflected ? 6 : 4);
      g.strokeRect(x - halo, y - halo, halo * 2, halo * 2);
    }
  }

  function drawBoss(s) {
    const b = s.boss;
    const finale = b.stage === 'arena';
    const centerY = finale ? b.y + b.h / 2 : 288;
    const art = atlas[b.definition.sprite];
    const aura = V.biomes[s.biome].accent;
    const lean = b.tell ? (1 - b.tell.left / b.tell.total) * 8 : 0;
    const facing = b.facing ?? -1;
    const bodyX = b.x + (reducedMotion ? 0 : b.flash * 67 * (b.hitSide ?? 1) + facing * lean);
    const bob = reducedMotion ? 0 : Math.sin(s.elapsed * 3.3) * 3;
    if (finale) {
      g.fillStyle = '#04111c';
      g.globalAlpha = .36;
      g.beginPath();
      g.ellipse(b.x + b.w / 2, G + 2, b.w * .43, 7, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = .12;
    g.fillStyle = aura;
    g.beginPath();
    g.ellipse(b.x + b.w / 2, centerY, finale ? 96 : 104, finale ? 80 : 138, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.save();
    if (!reducedMotion && b.flash > .10) g.filter = 'brightness(1.36)';
    if (art) {
      const image = V.readyImage('atlas');
      const width = b.w;
      const height = Math.min(finale ? b.h : 231, width * art[3] / art[2]);
      const y = finale ? b.y + b.h - height : 286 - height / 2;
      if (image) {
        const mirror = facing > 0 && (s.biome === 'greed' || s.biome === 'diva');
        g.translate(bodyX + (mirror ? width : 0), 0);
        if (mirror) g.scale(-1, 1);
        g.drawImage(image, ...art, 0, y + bob, width, height);
      }
      else {
        g.fillStyle = aura;
        g.fillRect(b.x + 37, centerY - 54, b.w - 74, 108);
      }
    } else {
      g.save();
      g.translate(bodyX + (facing < 0 ? b.w : 0), bob);
      g.scale(facing < 0 ? -1 : 1, 1);
      if (!sprite('bossEel', 0, b.y, b.w, b.h)) {
        g.fillStyle = aura;
        g.fillRect(40, b.y + 25, b.w - 80, b.h * .55);
      }
      g.restore();
    }
    g.restore();
    if (s.windTime > 0 || (s.biome === 'god' && b.phase > 0)) {
      g.globalAlpha = .32;
      g.fillStyle = aura;
      for (let i = 0; i < 9; i++) {
        g.fillRect((s.cameraX ?? 0) + (i * 109 + s.elapsed * 113) % W, 142 + (i * 77) % 252, s.windTime > 0 ? 28 : 11, 2);
      }
      g.globalAlpha = 1;
    }
    if (finale && b.hp > 0) {
      const x = b.x + b.w / 2 - 62;
      const y = b.y - 28;
      g.fillStyle = '#101a2d';
      g.fillRect(x, y, 124, 18);
      g.fillStyle = b.open ? '#a6ffd4' : '#cad9f4';
      g.font = 'bold 11px monospace';
      g.textAlign = 'center';
      g.fillText(b.open ? 'OFFEN · DASH!' : b.move ? 'IN BEWEGUNG' : 'DECKUNG ZU', x + 62, y + 12);
      g.textAlign = 'start';
      g.fillRect(x, y + 17, 124 * b.hp / b.maxHp, 3);
    }
    drawTell(s);
    for (const q of s.projectiles) drawProjectile(q);
  }

  function drawMovementEffects(s) {
    if (reducedMotion) return;
    for (const effect of s.effects) {
      if (!effect.movement) continue;
      const age = 1 - effect.left / effect.life;
      const skid = effect.kind === 'skid';
      const width = effect.size * (.84 + age * .46);
      const height = width * (skid ? .30 : .43);
      g.save();
      g.globalAlpha = Math.min(1, effect.left * 9);
      g.translate(effect.x - effect.direction * age * (skid ? 26 : 38), effect.y);
      g.scale(effect.direction, 1);
      if (!fittedSprite('movement-' + effect.kind, -width * .82, skid ? -height : -height / 2, width, height, skid)) {
        g.fillStyle = skid ? '#d5c494' : effect.kind === 'dash-fast' ? '#ffb76d' : '#a6fff0';
        g.fillRect(-width * .62, skid ? -3 : -2, width * .52, 3);
      }
      g.restore();
    }
  }

  function drawImpacts(s) {
    for (const effect of s.effects) {
      if (effect.movement) continue;
      const progress = 1 - effect.left / effect.life;
      if (effect.kind) {
        const size = reducedMotion ? effect.size : effect.size * (.76 + .46 * Math.min(1, progress * 2.5));
        g.save();
        g.globalAlpha = Math.min(1, effect.left * 7);
        g.translate(effect.x, effect.y);
        g.save();
        g.scale(effect.direction < 0 ? -1 : 1, 1);
        if (!fittedSprite('impact-' + effect.kind, -size / 2, -size / 2, size, size)) {
          g.strokeStyle = effect.color;
          g.lineWidth = 3;
          g.strokeRect(-size * .23, -size * .23, size * .46, size * .46);
        }
        g.restore();
        if (effect.amount > 0) {
          const ownDamage = effect.kind === 'hurt';
          const x = ownDamage ? -18 : 0;
          const y = -size * .42 - (reducedMotion ? 0 : 26 * progress) - (ownDamage ? 12 : 0);
          g.textAlign = 'center';
          g.font = 'bold 19px monospace';
          g.lineWidth = 5;
          g.strokeStyle = '#12192a';
          g.strokeText('−' + effect.amount, x, y);
          g.fillStyle = effect.color;
          g.fillText('−' + effect.amount, x, y);
        }
        g.restore();
        continue;
      }
      if (reducedMotion) continue;
      const radius = 8 + progress * 32;
      g.globalAlpha = Math.max(0, 1 - progress);
      g.strokeStyle = effect.color;
      g.lineWidth = 2;
      g.strokeRect(effect.x - radius, effect.y - radius, radius * 2, radius * 2);
      g.fillStyle = effect.color;
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        g.fillRect(effect.x + Math.cos(angle) * radius * 1.25 - 2, effect.y + Math.sin(angle) * radius - 2, 4, 4);
      }
    }
    g.globalAlpha = 1;
  }

  function drawDamageEdge(s) {
    const damage = s.effects.findLast(effect => effect.kind === 'hurt');
    if (!damage) return;
    g.save();
    g.globalAlpha = Math.min(reducedMotion ? .55 : .84, damage.left * 3);
    g.strokeStyle = '#e44668';
    g.lineWidth = 11;
    g.strokeRect(3, 3, W - 6, H - 6);
    g.restore();
  }

  V.render = function (section) {
    const arena = section.kind === 'arena';
    const local = V.usesMomentum(section);
    background(section.biome, section.elapsed, local ? section.cameraX : section.dist, local, section.cameraY);
    if (local) {
      g.save();
      g.translate(-Math.round(section.cameraX), -Math.round(section.cameraY));
    }
    drawCourse(section);
    if (arena) {
      drawExit(section);
      drawTraps(section);
      drawEnemies(section);
      for (const shot of section.projectiles) {
        if (shot.x + shot.r >= section.cameraX && shot.x - shot.r <= section.cameraX + W) drawProjectile(shot);
      }
    }
    if (section.kind === 'boss') drawBoss(section);
    drawMovementEffects(section);
    drawPlayer(section);
    drawImpacts(section);
    if (local) g.restore();
    drawDamageEdge(section);
  };
})();
