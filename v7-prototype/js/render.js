(function () {
  'use strict';
  const V = window.VS7;
  const canvas = document.getElementById('game');
  const glitchOverlay = document.getElementById('dimension-glitch');
  const g = canvas.getContext('2d', { alpha: false });
  const { W, H, GROUND: G } = V;
  const backdrops = new Map();
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference?.matches;
  let skinKey;
  let skin;
  let glitchBuffer;
  const skinRoles = {
    'platform-god': 'deck', 'boss-stage-god-deck': 'deck', 'boss-stage-god-deck-final': 'deck',
    'boss-stage-god-arch': 'prop-a', 'boss-stage-god-pillar': 'prop-b', 'boss-stage-god-emitter': 'prop-b',
    'scenery-split-terminal': 'prop-a', 'scenery-fractured-column': 'prop-b',
    'boss-stage-god-warning': 'warning', 'warn-fault': 'warning', 'warn-target': 'warning',
    'fx-weak-reticle': 'warning', 'boss-stage-god-phase-two': 'prop-a', 'boss-stage-god-phase-three': 'prop-b',
    'fx-katana-cut': 'burst', 'fx-parry': 'burst', coin: 'shot'
  };
  const glitchArt = part => 'glitch-' + skinKey + '-' + part;
  function imageFor(name) {
    if (!skin) return V.readyImage(name);
    const role = skinRoles[name] ??
      (/^(impact-|movement-|ambient-fx-)/.test(name) ? 'burst' : null);
    return V.readyImage(role ? glitchArt(role) : name);
  }
  // Y coordinate of each walkable deck in its source PNG.
  const deckY = { reef: 17, greed: 2, diva: 2, vortex: 2, god: 0 };
  const atlas = {
    greed: [26, 0, 335, 239], diva: [418, 0, 311, 247],
    vortex: [47, 239, 279, 273]
  };
  g.imageSmoothingEnabled = false;

  function background(key, time, dist, arena, cameraY, worldWidth) {
    const colors = skin ?? V.biomes[key];
    const cacheKey = skinKey ?? (arena ? key + ':arena' : key);
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
    const panorama = V.readyImage(skin ? glitchArt('panorama') : 'panorama-' + key);
    if (panorama) {
      const height = H * 1.18;
      const width = Math.max(W, height * panorama.naturalWidth / panorama.naturalHeight);
      const progress = V.clamp(dist / Math.max(W, worldWidth - W), 0, 1);
      const drift = reducedMotion ? .5 : arena ? .12 + .76 * progress : .5 - Math.cos(dist / 3100) * .5;
      const lift = reducedMotion ? 0 : V.clamp((cameraY ?? 0) * .12, -36, 36);
      g.globalAlpha = .89;
      g.drawImage(panorama, (W - width) * drift, (H - height) / 2 - lift, width, height);
      g.globalAlpha = 1;
    } else {
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
    }
    if (!arena && panorama) {
      g.fillStyle = colors.ground;
      g.fillRect(0, G, W, H - G);
    }
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
    const image = imageFor(name);
    if (!image) return false;
    g.drawImage(image, x, y, w, h);
    return true;
  }

  function fittedSprite(name, x, y, w, h, bottom = false) {
    const image = imageFor(name);
    if (!image) return false;
    const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    g.drawImage(image, x + (w - width) / 2, y + (h - height) * (bottom ? 1 : .5), width, height);
    return true;
  }

  function surgeSprite(atlas, index, x, y, w, h, bottom = false) {
    if (skin) return fittedSprite(glitchArt(index % 2 ? 'shot' : 'burst'), x, y, w, h, bottom);
    const frame = V.surgeFrames[atlas]?.[index];
    const image = V.readyImage('surge-atlas-' + atlas);
    if (!frame || !image) return false;
    const [sourceWidth, sourceHeight] = frame;
    const scale = Math.min(w / sourceWidth, h / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    g.drawImage(image, index % 3 * V.surgeCell, Math.floor(index / 3) * V.surgeCell,
      sourceWidth, sourceHeight, x + (w - width) / 2, y + (h - height) * (bottom ? 1 : .5), width, height);
    return true;
  }

  const animationCells = {
    bosses: [5, 144], shadow: [5, 144], dimensions: [4, 144], reinforcements: [6, 84], variants: [9, 84],
    reef: [4, 84], greed: [4, 84], diva: [4, 84], vortex: [4, 84]
  };

  function animationSprite(frame, x, y, w, h) {
    if (!frame) return false;
    const image = V.readyImage('anim-' + frame.sheet);
    if (!image) return false;
    const [columns, cell] = animationCells[frame.sheet];
    g.drawImage(image, frame.index % columns * cell, Math.floor(frame.index / columns) * cell,
      cell, cell, x, y, w, h);
    return true;
  }

  function drawScenery(s, local) {
    const props = V.sceneryProps[s.biome];
    const spacing = 190;
    const left = local ? s.cameraX : s.dist - V.START_X;
    const first = Math.floor((left - 60) / spacing);
    const last = Math.ceil((left + W + 60) / spacing);
    const count = s.biome === 'god' ? 6 : 3;
    const drawProp = (slot, floor) => {
      const index = (slot % count + count) % count + 6 - count;
      const size = 58 + (index % 3) * 11;
      const x = V.stageX(s, slot * spacing);
      const prop = props[(slot % props.length + props.length) % props.length];
      const painted = slot % 5 !== 4 && fittedSprite('scenery-' + prop, x - size / 2, floor - size, size, size, true);
      if (!painted && s.biome !== 'god') surgeSprite(s.biome, index, x - size / 2, floor - size, size, size, true);
    };
    g.save();
    g.globalAlpha = .68;
    if (local) {
      for (const platform of s.platforms) {
        if (!platform.ground || platform.enabled === false ||
          platform.y < s.cameraY || platform.y - 84 > s.cameraY + H) continue;
        const start = Math.max(first, Math.ceil((platform.worldX + 44) / spacing));
        const end = Math.min(last, Math.floor((platform.worldX + platform.w - 44) / spacing));
        for (let slot = start; slot <= end; slot++) drawProp(slot, platform.y);
      }
    } else {
      for (let slot = first; slot <= last; slot++) drawProp(slot, G);
    }
    g.restore();
  }

  function drawParticles(s, background) {
    const left = s.cameraX ?? 0;
    const top = s.cameraY ?? 0;
    g.save();
    for (const p of s.particles) {
      if (Boolean(p.background) !== background) continue;
      const margin = p.ring ?? p.size;
      if (p.x + margin < left || p.x - margin > left + W ||
        p.y + margin < top || p.y - margin > top + H) continue;
      const remaining = p.left / p.life;
      g.globalAlpha = remaining * (background ? .48 : .86);
      if (p.ring) {
        g.strokeStyle = skin?.accent ?? p.tint;
        g.lineWidth = 1 + remaining * 2;
        g.beginPath();
        g.arc(p.x, p.y, p.ring * (1 - .85 * remaining), 0, Math.PI * 2);
        g.stroke();
        continue;
      }
      const size = p.size * (.5 + remaining * .5);
      if (p.newArt) {
        const art = p.atlas === 'action' ? 'ember-streak' : V.regionalEffects[p.atlas][p.frame - 6];
        const span = size * 1.3;
        if (fittedSprite('ambient-fx-' + art, p.x - span / 2, p.y - span / 2, span, span)) continue;
      }
      if (!surgeSprite(p.atlas, p.frame, p.x - size / 2, p.y - size / 2, size, size)) {
        g.fillStyle = p.tint;
        g.fillRect(p.x - 1, p.y - 1, 3, 3);
      }
    }
    g.restore();
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
    g.shadowColor = s.character === 'snail' ? '#f9a05ec9' : '#c8f6ffc9';
    g.shadowBlur = 7;
    if (!sprite(s.character, -p.w / 2, -p.h / 2, p.w, p.h)) {
      g.fillStyle = '#ffb966';
      g.fillRect(-p.w * .37, -p.h * .33, p.w * .67, p.h * .68);
      g.fillStyle = '#f6e5bb';
      g.fillRect(0, p.h * .18, p.w * .5, p.h * .27);
    }
    g.restore();
  }

  function drawStageBackdrop(s) {
    const b = s.boss;
    const left = s.cameraX;
    g.save();
    if (b.phase) {
      g.fillStyle = skin?.accent ?? b.definition.color;
      g.globalAlpha = b.phase === 2 ? .13 : .07;
      g.fillRect(left, 0, W, G);
    }
    g.globalAlpha = b.phase ? .56 : .40;
    const gap = 328;
    const start = Math.max(0, Math.floor((left - 220) / gap));
    const end = Math.min(6, Math.ceil((left + W) / gap));
    for (let i = start; i <= end; i++) {
      const arch = i % 2 === 0;
      fittedSprite(V.bossStageArt(s, arch ? 'arch' : 'pillar'),
        75 + i * gap, G - 204, arch ? 224 : 172, 204, true);
    }
    g.restore();
  }

  function drawStageDeck(s, deck, x) {
    const final = s.boss.phase === 2;
    const art = imageFor(V.bossStageArt(s, final ? 'deck-final' : 'deck'));
    if (!art) return false;
    const height = V.clamp(deck.w * art.naturalHeight / art.naturalWidth, 30, 96);
    const edge = skin ? .08 : s.biome === 'god' ? .36 : s.biome === 'greed' && !final ? .73 : .11;
    g.drawImage(art, x, deck.y - height * edge, deck.w, height);
    if (deck.stageWarning) {
      g.fillStyle = skin?.danger ?? '#ff7c9d';
      g.globalAlpha = .78;
      g.fillRect(x, deck.y - 6, deck.w, 5);
      fittedSprite(V.bossStageArt(s, 'warning'), x + deck.w / 2 - 15, deck.y - 34, 30, 24);
    }
    return true;
  }

  function drawArenaDeck(platform, x, time) {
    const { y, w } = platform;
    if (platform.mover) {
      const vertical = platform.mover.y !== 0;
      const center = platform.homeX + w / 2;
      g.strokeStyle = '#7d9eaa73';
      g.lineWidth = 2;
      g.beginPath();
      if (vertical) {
        g.moveTo(center, platform.homeY - 37);
        g.lineTo(center, platform.homeY + 95);
      } else {
        g.moveTo(platform.homeX - 37, y + 16);
        g.lineTo(platform.homeX + w + 37, y + 16);
      }
      g.stroke();
      return sprite(vertical ? 'exp-lift' : 'exp-shuttle', x, y - (vertical ? 16 : 2), w, vertical ? 65 : 38);
    }
    if (platform.upper) return sprite('exp-upper', x, y - 9, w, 42);
    if (platform.conveyor) {
      const segments = Math.ceil(w / 114);
      const width = w / segments;
      for (let i = 0; i < segments; i++) {
        g.save();
        g.translate(x + width * (i + .5), y);
        g.scale(Math.sign(platform.conveyor), 1);
        sprite('exp-belt', -width / 2, -3, width, 32);
        const slide = reducedMotion ? 0 : ((time * Math.abs(platform.conveyor) / 35) % 1 - .5) * 21;
        sprite('exp-arrow', slide - 8, 2, 16, 15);
        g.restore();
      }
    }
    return false;
  }

  function drawCaves(s) {
    for (const cave of s.caves) {
      if (cave.x + cave.w < s.cameraX || cave.x > s.cameraX + W) continue;
      sprite('exp-cave', cave.x, cave.y, cave.w, cave.h);
      sprite('exp-stalactites', cave.x + 22, cave.y + 36, Math.min(114, cave.w * .55), 41);
    }
  }

  function drawCourse(s) {
    const left = s.cameraX ?? 0;
    const top = s.cameraY ?? 0;
    const colors = skin ?? V.biomes[s.biome];
    const platformArt = imageFor('platform-' + s.biome);
    const groundArt = skin ? V.readyImage(glitchArt('ground')) : s.biome === 'god' ? platformArt : V.readyImage('ground-' + s.biome);
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
      if (platform.enabled === false) {
        g.strokeStyle = colors.accent;
        g.globalAlpha = .42;
        g.strokeRect(x, platform.y, platform.w, 6);
        g.globalAlpha = 1;
        continue;
      }
      if (s.kind === 'arena' && !platform.ground && drawArenaDeck(platform, x, s.elapsed)) continue;
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
      } else if (s.boss && drawStageDeck(s, platform, x)) {
        // Boss decks have their own art and walking edge.
      } else if (platformArt) {
        const scale = platform.w / platformArt.naturalWidth;
        g.drawImage(platformArt, x, platform.y - deckY[s.biome] * scale, platform.w, platformArt.naturalHeight * scale);
      } else if (!sprite('platform', x, platform.y - 13, platform.w, 48)) {
        g.fillStyle = '#3c6871';
        g.fillRect(x, platform.y, platform.w, platform.h);
      }
      if (platform.conveyor) drawArenaDeck(platform, x, s.elapsed);
      g.fillStyle = colors.accent;
      g.globalAlpha = .55;
      g.fillRect(x + 6, platform.y, platform.w - 12, 2);
      g.globalAlpha = 1;
    }
    for (const item of s.obstacles) {
      const x = V.scrollX(s, item.worldX);
      if (item.dead || x < -65 || x > W) continue;
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

  const variantFrames = { crawler: 0, jumper: 1, armored: 2 };
  function drawEnemies(s) {
    for (const enemy of s.enemies) {
      const death = enemy.hp <= 0;
      const fade = death ? V.clamp((s.elapsed - (enemy.defeatedAt ?? -1)) / .27, 0, 1) : 0;
      if (death && (reducedMotion || fade >= 1)) continue;
      const { x, y, w, h } = enemy;
      if (x + w < s.cameraX || x > s.cameraX + W || y + h < s.cameraY || y > s.cameraY + H) continue;
      const windingUp = enemy.attackState === 'tell';
      const crouch = windingUp && !reducedMotion ? .18 * (1 - enemy.attackLeft / enemy.windup) : 0;
      const settling = enemy.attackState === 'recover' && !reducedMotion ?
        .12 * V.clamp(enemy.attackLeft / enemy.recovery, 0, 1) : 0;
      g.save();
      g.translate(x + w / 2, y + h);
      const variant = enemy.variant && !enemy.reinforcement;
      const art = enemy.reinforcement ? V.reinforcementArt(s) : s.biome + '-' + enemy.key;
      const frame = V.enemySpriteFrame(s, enemy, art, reducedMotion);
      const orientation = enemy.variant && !enemy.reinforcement ? enemy.facing : -enemy.facing;
      g.scale(orientation * (1 + crouch * .4 + settling * .5 - fade * .16), 1 - crouch - settling - fade * .56);
      if (death) g.globalAlpha = 1 - fade;
      if (!reducedMotion && enemy.flash > 0) g.filter = 'brightness(1.55)';
      const drawn = animationSprite(frame, -w / 2, -h, w, h) || (variant
        ? surgeSprite(s.biome, variantFrames[enemy.key], -w / 2, -h, w, h, true)
        : fittedSprite(art, -w / 2, -h, w, h, true));
      g.restore();
      if (death) continue;
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

  const projectileSprites = { toxic: 'shot-bubble', wave: 'shot-wave', weight: 'shot-weight', fault: 'shot-fault' };
  const warningSprites = {
    electric: 'warn-electric', current: 'warn-electric', rush: 'warn-jump', gold: 'warn-jump', slam: 'warn-jump',
    light: 'warn-target', hand: 'warn-target', laser: 'warn-target', mirror: 'warn-target', weights: 'warn-target',
    glitch: 'warn-fault', replay: 'warn-fault', reset: 'warn-fault'
  };

  function drawProjectile(q) {
    const { x, y, r } = q;
    const look = V.bossShots[q.key];
    const size = r * 2.74;
    const art = skin ? glitchArt(look.reflect ? 'shot' : 'hazard') : q.art ?? projectileSprites[q.key] ?? q.key;
    const flip = q.vx < 0 && (q.art || q.key === 'wave' || q.key === 'fault');
    g.save();
    if (flip) {
      g.translate(2 * x, 0);
      g.scale(-1, 1);
    }
    const drawn = fittedSprite(art, x - size / 2, y - size / 2, size, size);
    g.restore();
    if (!drawn) {
      g.fillStyle = look.color;
      if (q.key === 'wave') {
        g.strokeStyle = look.color;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, y, r, q.vx < 0 ? .6 * Math.PI : -.4 * Math.PI, q.vx < 0 ? 1.4 * Math.PI : .4 * Math.PI);
        g.stroke();
      } else if (q.key === 'weight') {
        g.fillRect(x - r, y - 4, r * 2, 8);
        g.fillRect(x - r + 2, y - 12, 8, 24);
        g.fillRect(x + r - 10, y - 12, 8, 24);
        g.fillStyle = '#264364';
        g.fillRect(x - r + 5, y - 9, 3, 18);
        g.fillRect(x + r - 8, y - 9, 3, 18);
      } else {
        g.fillRect(x - r + 5, y - r + 5, r * 2 - 10, r * 2 - 10);
        g.fillStyle = '#fff7e3';
        g.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    if (look.reflect) {
      if (skin) {
        g.strokeStyle = '#232039';
        g.lineWidth = 4;
        g.strokeRect(x - r - 4, y - r - 4, (r + 4) * 2, (r + 4) * 2);
      }
      g.strokeStyle = q.reflected ? '#fff1a8' : '#fbffec';
      g.lineWidth = q.reflected ? 3 : 1.5;
      const halo = r + (q.reflected ? 7 : 4);
      g.strokeRect(x - halo, y - halo, halo * 2, halo * 2);
    }
  }

  const shadowBandOrder = [4, 1, 8, 2, 7, 0, 9, 5, 3, 6];
  const shadowRhythms = [[10, 19, 2, 4], [14, 12, 5, 9], [18, 8, 5, 13]];

  function drawShadow(b, image, elapsed, death) {
    const age = elapsed - b.phaseAt;
    const shifting = !death && b.phaseFrom !== undefined && elapsed < b.phaseUntil;
    const progress = shifting ? V.clamp(age / (b.phaseUntil - b.phaseAt), 0, 1) : 1;
    const previous = shifting && !reducedMotion ? skin ? image : V.readyImage(V.godForms[b.phaseFrom]) : null;
    const [rate, period, beats, amplitude] = shadowRhythms[b.phase ?? 0];
    const frame = Math.floor(elapsed * rate);
    const tearing = frame % period < beats;
    const tear = reducedMotion ? 0 : death ? 8 + death * 29 :
      previous ? Math.sin(Math.PI * progress) * 32 : tearing ? amplitude : 0;
    if (!tear && !previous) {
      g.drawImage(image, 0, 0, b.w, b.h);
      return;
    }
    const bands = shadowBandOrder.length;
    for (let i = 0; i < bands; i++) {
      const rank = shadowBandOrder[i];
      if (death && !reducedMotion && death * bands > rank + 1) continue;
      const from = previous && progress < .10 + rank * .078 ? previous : image;
      const y1 = Math.round(i * from.naturalHeight / bands);
      const y2 = Math.round((i + 1) * from.naturalHeight / bands);
      const dy = Math.round(i * b.h / bands);
      const height = Math.round((i + 1) * b.h / bands) - dy;
      const offset = previous || death || (i + frame) % 4 === 0
        ? Math.round(tear * Math.sin((rank + 1) * 2.1 + frame * .9)) : 0;
      if (offset && (i + frame) % 3 === 0) {
        g.fillStyle = skin?.accent ?? (i % 2 ? '#96333e' : '#c56467');
        g.fillRect(offset > 0 ? -Math.abs(offset) : b.w - Math.abs(offset) / 2, dy + 2, Math.abs(offset) + 7, 2);
      }
      g.drawImage(from, 0, y1, from.naturalWidth, y2 - y1, offset, dy, b.w, height);
    }
  }

  function rigPath(part, w, h) {
    g.moveTo(part[0][0] * w, part[0][1] * h);
    for (let i = 1; i < part.length; i++) g.lineTo(part[i][0] * w, part[i][1] * h);
    g.closePath();
  }

  function drawRig(image, clip, b, pose) {
    const { w, h } = b;
    const source = clip ?? [0, 0, image.naturalWidth, image.naturalHeight];
    const part = pose?.rig.part;
    if (!part) {
      g.drawImage(image, ...source, 0, 0, w, h);
      return;
    }
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    rigPath(part, w, h);
    g.clip('evenodd');
    g.drawImage(image, ...source, 0, 0, w, h);
    g.restore();
    g.save();
    const [px, py] = pose.rig.pivot;
    g.translate(px * w, py * h);
    g.rotate(pose.limb);
    g.translate(-px * w, -py * h);
    g.beginPath();
    rigPath(part, w, h);
    g.clip();
    g.drawImage(image, ...source, 0, 0, w, h);
    g.restore();
  }

  function drawPanicCore(b, elapsed) {
    const x = b.w * .62;
    const y = b.h * .52;
    const pulse = .5 + .5 * Math.sin(elapsed * 12);
    const radius = 14 + pulse * 8;
    const light = g.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, '#ff755c');
    light.addColorStop(1, '#ff1c1600');
    g.save();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha *= .30 + pulse * .26;
    g.fillStyle = light;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    g.restore();
  }

  const gladiatorGrips = [[39, 85], [43, 85], [39, 86], [38, 84], [37, 68],
    [20, 74], [27, 96], [18, 87], [36, 96], [20, 83], [31, 55], [48, 111]];

  function drawGladiatorArt(b, elapsed) {
    const tile = 144;
    const frame = V.gladiatorFrame(b, elapsed, reducedMotion);
    const image = V.readyImage('gladiator-atlas');
    const [gripX, gripY] = gladiatorGrips[frame];
    const hold = !b.gladiator?.spear;
    const melee = b.gladiator?.melee;
    const stance = frame === 4 ? .58 : frame === 9 ? .07 : frame === 10 ? .84 : frame === 11 ? -.58 : .48;
    if (hold) {
      const x = gripX * b.w / tile;
      const y = gripY * b.h / tile - (frame === 0 ? 1 : 0);
      const angle = Math.PI + stance;
      const reach = frame === 9 ? 103 : melee?.key === 'slam' && frame === 11 ? 47 : 54;
      drawSpear(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, angle, reach + 33);
    }
    if (image) {
      g.drawImage(image, frame % 4 * tile, Math.floor(frame / 4) * tile, tile, tile, 0, 0, b.w, b.h);
    } else sprite('glitch-inferno-boss', 0, 0, b.w, b.h);
  }

  function drawBossArt(b, x, y, facing, opacity = 1, elapsed = 0, death = 0) {
    const shadow = b.definition.sprite === 'god';
    const clip = atlas[b.definition.sprite];
    const image = V.readyImage(shadow ? skin ? glitchArt('boss') : V.godForms[b.phase ?? 0] : clip ? 'atlas' : b.definition.sprite);
    const nativeLeft = shadow || b.definition.sprite === 'greed' || b.definition.sprite === 'diva';
    const mirror = nativeLeft ? facing > 0 : facing < 0;
    g.save();
    g.globalAlpha *= opacity;
    g.translate(x + (mirror ? b.w : 0), y);
    if (mirror) g.scale(-1, 1);
    if (shadow && skinKey === 'inferno') {
      drawGladiatorArt(b, elapsed);
      g.restore();
      return;
    }
    const pose = reducedMotion ? null : V.bossPose(b, elapsed, skinKey);
    if (pose) {
      g.translate(b.w / 2 + pose.x, b.h + pose.y);
      g.rotate(pose.roll);
      g.scale(pose.sx, pose.sy);
      g.translate(-b.w / 2, -b.h);
    }
    const frame = V.bossSpriteFrame(b, elapsed, skinKey, reducedMotion);
    const drawn = !death && animationSprite(frame, 0, 0, b.w, b.h);
    if (drawn) {
      if (!skin && shadow && b.phase === 2 && opacity === 1 && !reducedMotion) drawPanicCore(b, elapsed);
    } else if (image && shadow && (!skin || elapsed < b.phaseUntil || death)) {
      drawShadow(b, image, elapsed, death);
      if (!skin && b.phase === 2 && opacity === 1 && !death && !reducedMotion) drawPanicCore(b, elapsed);
    } else if (image) drawRig(image, clip, b, pose);
    else {
      g.fillStyle = b.definition.color;
      g.fillRect(b.w * .08, b.h * .17, b.w * .84, b.h * .78);
    }
    g.restore();
  }

  function drawChase(s) {
    const b = s.chase;
    drawBossArt(b, b.x, b.y, -1, 1, s.elapsed);
    if (b.warning) {
      const lead = b.warning.at - s.elapsed;
      g.save();
      g.globalAlpha = V.clamp(.63 - lead * .68, .22, .63);
      g.lineWidth = 2;
      g.setLineDash([7, 8]);
      for (const q of b.warning.shots) {
        const time = (q.x - 104) / -q.vx;
        g.strokeStyle = q.color;
        g.beginPath();
        g.moveTo(q.x, q.y);
        g.lineTo(q.x + q.vx * time, q.y + q.vy * time);
        g.stroke();
      }
      g.restore();
    }
    for (const shot of s.projectiles) drawProjectile(shot);
  }

  function drawBossFloor(s) {
    const fx = s.arenaFX;
    const left = s.cameraX;
    g.save();
    if (s.tideY < G) {
      g.fillStyle = '#5fdcfc22';
      g.fillRect(left, s.tideY ?? G, W, G - (s.tideY ?? G));
      g.fillStyle = '#81e5ffa6';
      g.fillRect(left, s.tideY ?? G, W, 3);
    }
    const current = fx.current?.direction ?? (s.biome === 'reef' && s.boss.phase === 2 ? Math.sign(s.wind) : 0);
    if (current) {
      g.fillStyle = '#a3fff59b';
      for (let i = 0; i < 18; i++) {
        const x = (i * 173 + 1000 + (current * s.elapsed * 255) % W) % W;
        g.fillRect(left + x, 185 + i * 71 % 237, 29, 3);
      }
    }
    if (fx.gilded) {
      g.fillStyle = '#ffb6369c';
      g.fillRect(left, G - 13, W, 13);
    }
    if (fx.stage) {
      g.globalAlpha = .57;
      fittedSprite('prop-stage-curtain', left + W * .05, -122, W * .90, 366);
      g.globalAlpha = 1;
      g.fillStyle = '#ffa9ce75';
      g.fillRect(left, G - 4, W, 4);
    }
    if (fx.belt || (s.biome === 'vortex' && s.boss.phase > 0)) {
      g.font = 'bold 25px monospace';
      g.fillStyle = '#94e4fc';
      for (let x = Math.floor(left / 48) * 48; x < left + W; x += 48) {
        g.fillText(Math.floor(x / 265) % 2 ? '›' : '‹', x, G - 8);
      }
    }
    if (fx.quake) {
      g.strokeStyle = '#85d8ff';
      g.lineWidth = 2;
      for (const p of s.platforms.slice(1)) g.strokeRect(p.worldX, p.y - 3, p.w, 4);
    }
    if (fx.blackout) {
      g.fillStyle = '#060e1d9c';
      g.fillRect(left, 0, W, G);
      g.fillStyle = skin ? skin.accent + '60' : '#db676f60';
      for (let i = 0; i < 12; i++) g.fillRect(left + i * 88, i * 73 % 329, 23, 3);
    }
    g.restore();
  }

  const zoneSymbols = { electric: '↑', current: '↝', rush: '›', gold: '↑', hand: '!', laser: '║', light: '◇',
    mirror: '◇', scream: '≈', slam: '↑', weights: '↓', glitch: '×', replay: '↶', reset: '!' };

  function drawZones(s) {
    for (const z of s.zones) {
      const wait = z.at - s.elapsed;
      if (wait > 1.65 || z.x + z.w < s.cameraX || z.x > s.cameraX + W) continue;
      const active = wait <= 0 && !z.preview;
      const color = skin?.danger ?? (z.stage ? s.boss.definition.color : V.bossZoneColors[z.style]);
      g.save();
      g.fillStyle = color;
      g.globalAlpha = active ? .37 : .13 + .19 * (1 - V.clamp(wait / 1.5, 0, 1));
      g.fillRect(z.x, z.y, z.w, z.h);
      g.globalAlpha = active ? .94 : .84;
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.strokeRect(z.x, z.y, z.w, z.h);
      g.fillRect(z.x, z.y + z.h - 4, z.w * (active ? 1 : V.clamp(1 - wait / 1.45, 0, 1)), 4);
      if (z.stage) {
        const center = z.x + z.w / 2;
        const bottom = z.y + z.h;
        const emitterY = s.biome === 'vortex' ? z.y : bottom - 29;
        fittedSprite(V.bossStageArt(s, 'emitter'), center - 25, emitterY, 50, 33);
        if (active) {
          g.globalAlpha = .89;
          if (skin) {
            const count = Math.max(1, Math.ceil(z.h / 65));
            for (let i = 0; i < count; i++) {
              fittedSprite(glitchArt('burst'), z.x, z.y + i * z.h / count, z.w, z.h / count);
            }
          } else sprite(V.bossStageArt(s, 'burst'), z.x + z.w * .12, z.y, z.w * .76, z.h);
        } else {
          fittedSprite(V.bossStageArt(s, 'warning'), center - 20, bottom - 57, 40, 29);
          if (z.drift) {
            g.textAlign = 'center';
            g.font = 'bold 23px monospace';
            g.fillText(z.drift > 0 ? '›' : '‹', center + Math.sign(z.drift) * 31, bottom - 35);
          }
        }
        g.restore();
        continue;
      }
      g.textAlign = 'center';
      g.font = '900 23px monospace';
      const marker = warningSprites[z.style];
      for (let i = 0, count = Math.max(1, Math.floor(z.w / 76)); i < count; i++) {
        const x = z.x + (i + .5) * z.w / count;
        if (!marker || !fittedSprite(marker, x - 14, z.y + z.h - 34, 28, 27)) {
          g.fillText(zoneSymbols[z.style], x, z.y + z.h - 12);
        }
      }
      const handSize = Math.min(z.w * .80, 112);
      if (z.style === 'hand') {
        const progress = active ? V.clamp((s.elapsed - z.at) / .11, 0, 1) : 0;
        g.globalAlpha = active ? .97 : .36;
        if (fittedSprite('prop-gold-gauntlet', z.x + (z.w - handSize) / 2,
          z.y + (z.h - 180) * progress, handSize, 180, true)) {
          g.restore();
          continue;
        }
      }
      if (active && z.style === 'hand') {
        g.fillRect(z.x + z.w * .30, z.y, z.w * .4, z.h * .68);
        g.fillRect(z.x + z.w * .15, z.y + z.h * .54, z.w * .7, z.h * .28);
        for (let i = 0; i < 4; i++) g.fillRect(z.x + z.w * (.19 + i * .16), z.y + z.h * .77, z.w * .12, z.h * .19);
      }
      g.restore();
    }
    for (const chest of s.chests) {
      g.save();
      const art = chest.trap ? 'prop-trap-chest' : 'prop-gold-chest';
      if (!fittedSprite(art, chest.x, chest.y, chest.w, chest.h, true) &&
          !sprite('crate', chest.x, chest.y, chest.w, chest.h)) {
        g.fillStyle = '#9c5836';
        g.fillRect(chest.x, chest.y, chest.w, chest.h);
      }
      g.strokeStyle = chest.trap ? '#ff716c' : '#fff091';
      g.lineWidth = 2;
      g.strokeRect(chest.x, chest.y, chest.w, chest.h);
      if (chest.trap) {
        g.fillStyle = '#ffab73';
        g.fillRect(chest.x, chest.y - 6, chest.w * V.clamp((chest.end - s.elapsed) / 1.75, 0, 1), 3);
      }
      g.restore();
    }
  }

  function drawRaceCues(s) {
    const b = s.boss;
    if (skinKey !== 'race' || !b.racer) return;
    const target = b.racer.volley;
    g.save();
    if (b.skidding && !reducedMotion) {
      const rear = b.x + b.w * (b.facing > 0 ? .22 : .78);
      const length = Math.min(78, Math.abs(b.vx) * .14);
      const x = Math.min(rear, rear - b.facing * length);
      g.globalAlpha = .52;
      g.fillStyle = skin.accent;
      g.fillRect(x, G - 4, length, 2);
      g.fillRect(x + 3, G - 1, length, 1);
      g.globalAlpha = 1;
    }
    if (target) {
      const muzzle = V.raceMuzzle(b);
      g.strokeStyle = skin.danger;
      g.lineWidth = 2;
      g.setLineDash([8, 7]);
      g.beginPath();
      g.moveTo(muzzle.x, muzzle.y);
      g.lineTo(target.x, target.y);
      g.stroke();
      g.setLineDash([]);
      g.strokeRect(target.x - 14, target.y - 14, 28, 28);
      g.fillStyle = skin.light;
      g.fillRect(target.x - 2, target.y - 2, 4, 4);
    }
    if (b.x + b.w < s.cameraX || b.x > s.cameraX + W) {
      const fromLeft = b.x < s.cameraX;
      const x = s.cameraX + (fromLeft ? 26 : W - 26);
      g.fillStyle = '#141c3d';
      g.fillRect(x - 20, G - 57, 40, 35);
      g.fillStyle = skin.light;
      g.font = 'bold 26px monospace';
      g.textAlign = 'center';
      g.fillText(fromLeft ? '→' : '←', x, G - 30);
    }
    g.restore();
  }

  function drawSpear(x, y, angle, length = 83) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.fillStyle = '#2d1b20';
    g.fillRect(-length, -4, length - 14, 8);
    g.fillStyle = '#ac6847';
    g.fillRect(3 - length, -2, length - 20, 4);
    g.fillStyle = '#e3a567';
    g.fillRect(5 - length, -2, length - 24, 1);
    g.fillStyle = '#713b39';
    g.fillRect(-25, -5, 12, 10);
    g.fillStyle = '#3d222d';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-17, -8);
    g.lineTo(-23, 0);
    g.lineTo(-17, 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffca7c';
    g.beginPath();
    g.moveTo(-2, 0);
    g.lineTo(-17, -5);
    g.lineTo(-20, 0);
    g.lineTo(-16, 4);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawGladiatorMelee(s, melee) {
    const b = s.boss;
    const warning = melee.start === undefined;
    const ground = melee.y;
    g.save();
    g.strokeStyle = '#ffe4a9';
    g.fillStyle = '#ff8749';
    g.lineWidth = 2;
    if (melee.key === 'thrust') {
      const box = V.gladiatorThrust(b);
      const start = Math.min(box.x, box.x + melee.x - b.x - b.w / 2);
      if (warning) {
        const width = box.w + Math.abs(melee.x - b.x - b.w / 2);
        const progress = V.clamp((s.elapsed - melee.tellAt) / melee.lead, 0, 1);
        g.globalAlpha = .42 + progress * .25;
        g.setLineDash([7, 5]);
        g.strokeRect(start, box.y, width, box.h);
        g.fillRect(start, box.y + box.h - 3, width * progress, 3);
      } else {
        g.globalAlpha = .88;
        g.fillRect(box.x, box.y + box.h * .45, box.w, 4);
        g.globalAlpha = .40;
        g.fillRect(box.x + 6, box.y + box.h * .2, box.w - 12, box.h * .68);
      }
    } else if (melee.impactAt === undefined) {
      g.globalAlpha = .85;
      g.beginPath();
      g.ellipse(melee.x, ground - 1, 53, 11, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillRect(melee.x - 12, ground - 4, 24, 4);
      if (!reducedMotion) {
        g.globalAlpha = .24;
        g.fillRect(melee.x - 43, ground - 75, 86, 75);
      }
    } else {
      const time = V.clamp((s.elapsed - melee.impactAt) / .34, 0, 1);
      const spread = 36 + time * 152;
      g.globalAlpha = .87 - .33 * time;
      for (const side of [-1, 1]) {
        const x = melee.x + side * spread;
        g.fillRect(x - 14, ground - 4, 28, 4);
        g.beginPath();
        g.moveTo(x - side * 18, ground);
        g.lineTo(x + side * 4, ground - 24 + 8 * time);
        g.lineTo(x + side * 12, ground);
        g.stroke();
        if (!reducedMotion) fittedSprite(glitchArt('burst'), x - 19, ground - 33, 38, 34);
      }
    }
    g.restore();
  }

  function drawGladiatorCues(s) {
    const b = s.boss;
    const attack = b.gladiator;
    if (skinKey !== 'inferno' || !attack) return;
    if (attack.melee) drawGladiatorMelee(s, attack.melee);
    if (attack.aim) {
      const { x, y, at } = attack.aim;
      const launch = V.gladiatorSpearLaunch(b, attack.aim);
      const time = V.clamp(1 - (at - s.elapsed) / .48, 0, 1);
      g.save();
      g.globalAlpha = .45 + time * .35;
      g.strokeStyle = '#ffd899';
      g.lineWidth = 2;
      if (!reducedMotion) {
        g.setLineDash([4, 7]);
        g.beginPath();
        g.moveTo(launch.x, launch.y);
        for (let i = 1; i <= 18; i++) {
          const point = V.gladiatorSpearPoint(launch, launch.flight * i / 18);
          g.lineTo(point.x, point.y);
        }
        g.stroke();
        g.setLineDash([]);
      }
      g.strokeRect(x - 15, y - 11, 30, 11);
      g.restore();
    }
    const spear = attack.spear;
    if (!spear) return;
    if (!spear.deck && !reducedMotion) {
      g.save();
      g.globalAlpha = .45;
      g.strokeStyle = '#ffae63';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(spear.x - Math.cos(spear.angle) * 50, spear.y - Math.sin(spear.angle) * 50);
      g.lineTo(spear.x - Math.cos(spear.angle) * 119, spear.y - Math.sin(spear.angle) * 119);
      g.stroke();
      g.restore();
    }
    if (spear.deck && !attack.dash) {
      const charge = V.clamp((s.elapsed - spear.chargeAt) / (spear.chargeUntil - spear.chargeAt), 0, 1);
      const centerY = spear.y - b.h * .45;
      g.save();
      g.strokeStyle = '#401f28';
      g.globalAlpha = .80;
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(b.x + b.w / 2, b.y + b.h * .55);
      g.lineTo(spear.x, centerY);
      g.stroke();
      g.strokeStyle = skin.light;
      g.lineWidth = 3;
      g.setLineDash([10, 7]);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = .86;
      g.strokeRect(spear.x - 17, spear.y - 12, 34, 12);
      g.fillStyle = skin.accent;
      g.fillRect(spear.x - 17, spear.y - 3, 34 * charge, 3);
      g.restore();
    }
    drawSpear(spear.x, spear.y, spear.angle);
  }

  function drawBoss(s) {
    const b = s.boss;
    const shadow = b.definition.sprite === 'god';
    const plan = b.plan;
    const windup = b.state === 'windup';
    const death = b.state === 'defeated' ? V.clamp((s.elapsed - b.defeatedAt) / 1.25, 0, 1) : 0;
    const charge = windup ? 1 - V.clamp((plan.strike - s.elapsed) / plan.lead, 0, 1) : 0;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    g.save();
    g.globalAlpha = .28 * (1 - death);
    g.fillStyle = '#04111c';
    g.beginPath();
    g.ellipse(cx, G + 2, 64, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = shadow ? (.08 + charge * .13) * (1 - death) : .14 + charge * .25;
    g.fillStyle = skin?.accent ?? b.definition.color;
    g.beginPath();
    g.ellipse(cx, cy, 90 + 14 * b.phase, 67 + charge * 18, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    for (const echo of s.echoes) drawBossArt(b, echo.x - b.w / 2, echo.y - 30, b.facing, .42, s.elapsed);
    const movement = b.rush ?? b.flank;
    if (movement && !reducedMotion) {
      const direction = Math.sign(movement.toX - movement.x);
      for (let i = 1; i < 4; i++) drawBossArt(b, b.x - direction * i * 34, b.y + i * 3, b.facing, .22 / i, s.elapsed);
    }
    const dash = b.gladiator?.dash;
    if (dash && !reducedMotion) {
      for (let i = 3; i > 0; i--) {
        const time = V.clamp((s.elapsed - dash.start - i * .024) / dash.duration, 0, 1);
        drawBossArt(b, V.lerp(dash.fromX, dash.x, time), V.lerp(dash.fromY, dash.y, time),
          b.facing, .30 / i, s.elapsed);
      }
    }
    g.save();
    g.globalAlpha = windup && plan.attack.hide && charge > .43 ? .28 : 1 - death;
    if ((!shadow || !reducedMotion) && (b.flash > .05 || windup && charge > .72 && !reducedMotion)) {
      g.filter = shadow ? 'brightness(1.23)' : 'brightness(1.48)';
    }
    if (death && !reducedMotion) {
      g.translate(cx, cy);
      g.rotate(shadow ? 0 : death * .62);
      g.translate(-cx, -cy + death * (shadow ? -9 : 47));
    }
    const recoil = reducedMotion ? 0 : (b.hitSide ?? 0) * b.flash * 39;
    drawBossArt(b, b.x + recoil, b.y, b.facing, 1, s.elapsed, death);
    g.restore();
    drawRaceCues(s);
    drawGladiatorCues(s);

    const weak = (windup && plan.attack.interrupt) || (b.state === 'recovery' && b.exposed > 1);
    if (weak) {
      const box = V.bossHitboxes(b).weak;
      if (!fittedSprite('fx-weak-reticle', box.x, box.y, box.w, box.h) || skin) {
        g.strokeStyle = skin?.danger ?? '#fff39a';
        g.lineWidth = 3;
        g.strokeRect(box.x, box.y, box.w, box.h);
      }
      g.fillStyle = '#fff8be';
      g.fillRect(box.x + box.w / 2 - 3, box.y + box.h / 2 - 3, 6, 6);
    }
    if (windup) {
      const shot = plan.events.find(event => event.type === 'shot');
      if (shot && plan.zones.length === 0) {
        const q = shot.data;
        g.save();
        g.globalAlpha = .23 + charge * .44;
        g.strokeStyle = skin?.danger ?? b.definition.color;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(q.x, q.y);
        g.lineTo(q.x + q.vx * .39, q.y + q.vy * .39);
        g.stroke();
        g.restore();
      }
      g.fillStyle = skin?.danger ?? b.definition.color;
      g.fillRect(cx - 49, b.y - 12, 98 * charge, 4);
    }
    if (death > 0 && !shadow) {
      g.save();
      const burst = reducedMotion ? 105 : 104 + death * 109;
      g.globalAlpha = Math.max(0, .84 - death * .88);
      fittedSprite('fx-boss-defeat', cx - burst / 2, cy - burst / 2, burst, burst);
      g.restore();
    }
    if (death > 0 && !reducedMotion && !shadow) {
      g.fillStyle = b.definition.color;
      g.globalAlpha = 1 - death;
      for (let i = 0; i < 18; i++) {
        const angle = i * 2.4;
        g.fillRect(cx + Math.cos(angle) * death * (68 + i * 5), cy + Math.sin(angle) * death * 120, 3 + i % 5, 5);
      }
      g.globalAlpha = 1;
    }
    for (const q of s.projectiles) drawProjectile(q);
  }

  function drawWeapon(s) {
    const p = s.player;
    const weapon = s.weapon;
    if (!weapon.sprite) return;
    const swing = p.swing;
    const pose = V.weaponPose(s, swing?.time ?? 0);
    const length = swing ? weapon.reach : weapon.reach * .68;
    g.save();
    g.translate(pose.x, pose.y);
    g.scale(pose.facing, 1);
    if (swing) {
      const from = V.weaponPose(s, Math.max(0, swing.time - .054)).angle;
      const span = Math.max(.16, pose.angle - from);
      const start = pose.angle - span;
      g.strokeStyle = skin?.accent ?? weapon.color;
      g.globalAlpha = .37;
      g.lineWidth = 10;
      g.beginPath();
      g.arc(0, 0, length - 4, start, pose.angle);
      g.stroke();
      g.globalAlpha = .96;
      g.strokeStyle = '#fff9de';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, length, start, pose.angle);
      g.stroke();
      if (!reducedMotion) {
        g.fillStyle = skin?.accent ?? weapon.color;
        for (let i = 0; i < 5; i++) {
          const angle = start + span * i / 5;
          g.fillRect(Math.cos(angle) * (length + i * 2), Math.sin(angle) * (length + i * 2), 3, 3);
        }
      }
    } else g.globalAlpha = .78;
    g.rotate(pose.angle);
    const blade = skin ? null : V.readyImage(weapon.sprite);
    if (skin) {
      g.fillStyle = '#232039';
      g.fillRect(-weapon.grip, -4, length + weapon.grip, 8);
      g.fillStyle = skin.accent;
      g.fillRect(-weapon.grip + 2, -2, length + weapon.grip - 3, 4);
      fittedSprite(glitchArt('warning'), length - 15, -9, 18, 18);
    } else if (blade) {
      const width = length + weapon.grip;
      const height = width * blade.naturalHeight / blade.naturalWidth;
      g.drawImage(blade, -weapon.grip, -height / 2, width, height);
    }
    if (swing) {
      g.globalAlpha = .85 * (1 - swing.time / weapon.duration);
      fittedSprite('fx-katana-cut', length - 19, -18, 34, 36);
    }
    g.restore();
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
        const parry = effect.kind === 'parry' && fittedSprite('fx-parry', -size / 2, -size / 2, size, size);
        if (!parry && !fittedSprite('impact-' + effect.kind, -size / 2, -size / 2, size, size)) {
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

  function drawPhaseBanner(s) {
    const b = s.boss;
    if (!b?.phase || b.state === 'defeated' || s.elapsed - b.phaseAt >= 1.8) return;
    const badge = V.bossStageArt(s, b.phase === 1 ? 'phase-two' : 'phase-three');
    const x = W / 2 - 254;
    const y = 79;
    g.save();
    g.fillStyle = '#091723f5';
    g.fillRect(x, y, 508, 81);
    g.strokeStyle = b.definition.color;
    g.lineWidth = 2;
    g.strokeRect(x, y, 508, 81);
    fittedSprite(badge, x + 12, y + 9, 63, 63);
    g.fillStyle = b.definition.color;
    g.font = 'bold 16px monospace';
    g.textAlign = 'left';
    g.fillText('PHASE ' + (b.phase === 1 ? 'II' : 'III'), x + 90, y + 22);
    g.fillStyle = '#fff6df';
    g.font = 'bold 24px system-ui, sans-serif';
    g.fillText(b.definition.phases[b.phase], x + 90, y + 48, 400);
    g.fillStyle = '#d2e5e6';
    g.font = '14px system-ui, sans-serif';
    g.fillText(V.bossStages[s.biome].hints[b.phase - 1], x + 90, y + 69, 400);
    g.restore();
  }

  function drawCameraCue(s, view) {
    const compact = canvas.clientWidth > 0 && canvas.clientWidth < 600;
    const y = compact ? 144 : 99;
    const shade = g.createRadialGradient(W / 2, H / 2, H * .18, W / 2, H / 2, W * .60);
    shade.addColorStop(0, 'transparent');
    shade.addColorStop(1, '#020911');
    g.save();
    g.globalAlpha = view.alpha * .5;
    g.fillStyle = shade;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = view.alpha;
    g.textAlign = 'center';
    g.shadowColor = '#020911';
    g.shadowBlur = 10;
    g.fillStyle = V.biomes[s.biome].accent;
    g.font = compact ? 'bold 18px monospace' : 'bold 15px monospace';
    g.fillText(view.title, W / 2, y);
    g.fillStyle = '#fff7e3';
    g.font = compact ? 'bold 30px system-ui, sans-serif' : 'bold 27px system-ui, sans-serif';
    g.fillText(s.chase ? s.node.name : s.title, W / 2, y + 31, W * .60);
    g.restore();
  }

  function drawGlitchCut(s) {
    const age = s.elapsed - (s.arenaGlitch?.changedAt ?? -Infinity);
    const active = !reducedMotion && s.outcome === null && age >= 0 && age < .64;
    const power = active ? (1 - age / .64) ** 1.6 : 0;
    if (glitchOverlay?.style) {
      glitchOverlay.classList.toggle('hidden', !active);
      if (active) glitchOverlay.style.opacity = (power * .63).toFixed(3);
    }
    if (!active) return;
    if (!glitchBuffer) {
      glitchBuffer = document.createElement('canvas');
      glitchBuffer.width = W;
      glitchBuffer.height = H;
    }
    glitchBuffer.getContext('2d').drawImage(canvas, 0, 0);
    const tick = Math.floor(age * 21);
    g.save();
    g.globalAlpha = .92 * power;
    for (let i = 0; i < 18; i++) {
      const y = i * 30;
      const offset = Math.round(Math.sin(i * 2.7 + tick * .82) * (36 + (i % 5) * 11) * power);
      g.drawImage(glitchBuffer, 0, y, W, 30, offset, y, W, 30);
      if (offset) g.drawImage(glitchBuffer, 0, y, W, 30, offset - Math.sign(offset) * W, y, W, 30);
    }
    g.globalAlpha = .28 * power;
    g.fillStyle = '#1d173d';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 13; i++) {
      g.fillStyle = i % 2 ? skin?.accent ?? '#d5487c' : skin?.light ?? '#6fcddd';
      g.fillRect((i * 119 + tick * 43) % W - 40, (i * 47 + tick * 13) % H, 135 + (i % 3) * 68, 3 + i % 5);
    }
    g.restore();
  }

  function ultimateView(s) {
    const { focus, retreat, end } = V.ultimateTiming;
    const time = s.ultimate.time;
    const progress = V.clamp(Math.min(time / focus, (end - time) / (end - retreat)), 0, 1);
    const amount = progress * progress * (3 - 2 * progress);
    const p = s.player;
    const x = p.x + p.w / 2 - Math.round(s.cameraX);
    const y = p.y + p.h / 2 - Math.round(s.cameraY);
    const travel = reducedMotion ? 0 : amount;
    const zoom = 1 + travel * 2.55;
    const focusX = V.lerp(x, W / 2, travel);
    const focusY = V.lerp(y, H * .54, travel);
    return { amount, zoom, focusX, focusY, x: focusX - W / 2 - (x - W / 2) * zoom,
      y: focusY - H / 2 - (y - H / 2) * zoom };
  }

  function drawUltimate(s, view) {
    const cut = s.ultimate;
    const { focus, swing } = V.ultimateTiming;
    const p = s.player;
    const weapon = s.weapon;
    const wind = V.clamp((cut.time - focus * .65) / (swing - focus * .65), 0, 1);
    const strike = V.clamp((cut.time - swing) / .10, 0, 1);
    const spear = weapon.id === 'reef-spear';
    const cock = spear ? -.25 : V.lerp(-1.30, -2.97, wind ** 1.2);
    const angle = V.lerp(cock, spear ? .035 : .92, 1 - (1 - strike) ** 3);
    g.save();
    g.globalAlpha = view.amount;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.translate(view.focusX, view.focusY);
    g.scale(view.zoom * cut.facing, view.zoom);
    g.save();
    g.shadowColor = cut.ability.color;
    g.shadowBlur = view.zoom * 2.5;
    g.filter = 'brightness(1.55)';
    const drawn = sprite(s.character, -p.w / 2, -p.h / 2, p.w, p.h);
    g.restore();
    if (!drawn) {
      g.fillStyle = '#dfad76';
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    g.translate(spear ? 8 - wind * 13 + strike * 33 : 10, -1);
    if (cut.time >= swing && cut.time < swing + .23) {
      g.save();
      g.globalAlpha = view.amount * (1 - (cut.time - swing) / .23);
      if (weapon.id === 'katana') fittedSprite('exp-arc', -23, -55, 110, 112);
      else if (spear) {
        g.fillStyle = cut.ability.color;
        g.fillRect(5, -2, 125, 4);
      } else fittedSprite('exp-spark', 6, -21, 88, 65);
      g.restore();
    }
    g.rotate(angle);
    const blade = V.readyImage(weapon.sprite);
    const length = weapon.reach + weapon.grip;
    if (blade) {
      const height = length * blade.naturalHeight / blade.naturalWidth;
      g.drawImage(blade, -weapon.grip, -height / 2, length, height);
    } else {
      g.fillStyle = cut.ability.color;
      g.fillRect(-weapon.grip, -2, length, 4);
    }
    g.restore();
  }

  function drawUltimateMarks(s) {
    for (const mark of s.ultimateMarks ?? []) {
      const age = s.elapsed - mark.start;
      if (age < 0 || age > .32) continue;
      const { boss, size } = mark;
      const x = boss ? boss.x + boss.w * mark.x : mark.x;
      const y = boss ? boss.y + boss.h * mark.y : mark.y;
      g.save();
      g.translate(x, y);
      g.scale(mark.facing, 1);
      g.globalAlpha = (1 - age / .32) ** .72;
      fittedSprite('exp-slash', -size * .50, -size * .50, size, size);
      g.rotate(-.47);
      g.fillStyle = mark.color;
      g.fillRect(-size * .43, -1, size * .86, 2);
      if (!boss && !reducedMotion) fittedSprite('exp-spark', -size * .38, -size * .26, size * .76, size * .52);
      g.restore();
    }
  }

  V.render = function (section) {
    reducedMotion = motionPreference?.matches;
    skinKey = section.arenaGlitch?.active;
    skin = V.arenaGlitchThemes[skinKey];
    const arena = section.kind === 'arena';
    const local = V.usesMomentum(section);
    const ultimate = section.ultimate ? ultimateView(section) : null;
    const view = ultimate ?? V.cameraView(section);
    if (view) {
      g.save();
      g.translate(W / 2 + view.x, H / 2 + view.y);
      g.scale(view.zoom, view.zoom);
      g.translate(-W / 2, -H / 2);
    }
    background(section.biome, section.elapsed, local ? section.cameraX : section.dist, local, section.cameraY, section.worldWidth);
    if (local) {
      g.save();
      g.translate(-Math.round(section.cameraX), -Math.round(section.cameraY));
    }
    drawParticles(section, true);
    if (section.boss) drawStageBackdrop(section);
    drawScenery(section, local);
    if (arena) drawCaves(section);
    drawCourse(section);
    if (arena) {
      drawExit(section);
      drawTraps(section);
      drawEnemies(section);
      for (const shot of section.projectiles) {
        if (shot.x + shot.r >= section.cameraX && shot.x - shot.r <= section.cameraX + W) drawProjectile(shot);
      }
    }
    if (section.chase) drawChase(section);
    if (section.boss) {
      drawBossFloor(section);
      drawZones(section);
      drawEnemies(section);
      drawBoss(section);
    }
    drawMovementEffects(section);
    drawPlayer(section);
    drawWeapon(section);
    drawParticles(section, false);
    drawImpacts(section);
    drawUltimateMarks(section);
    if (local) g.restore();
    if (view) {
      g.restore();
      if (!ultimate) drawCameraCue(section, view);
    }
    drawDamageEdge(section);
    drawPhaseBanner(section);
    drawGlitchCut(section);
    if (ultimate) drawUltimate(section, ultimate);
  };
})();
