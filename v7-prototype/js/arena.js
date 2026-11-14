/* Arena attacks lock their targets during the wind-up. */
(function () {
  'use strict';
  const V = window.VS7;
  const kinds = {
    crawler: { w: 42, h: 30, baseHp: 180, color: '#f7a665', range: 155, windup: .42, active: .29, recovery: .58, travel: 132 },
    jumper: { w: 34, h: 38, baseHp: 155, color: '#e3a3fc', range: 208, windup: .50, active: .60, recovery: .56, travel: 198 },
    armored: { w: 51, h: 40, baseHp: 265, color: '#82dadd', range: 245, windup: .68, active: .20, recovery: .85, travel: 0 },
    hunter: { w: 43, h: 36, baseHp: 205, color: '#ff9161', range: 150, windup: .43, active: .49, recovery: .62, travel: 170 }
  };
  const healthByTier = [1, 1.35, 1.75, 2.25];

  function populate(s) {
    const random = V.randomFor(s.seed + ':enemies');
    const islands = [...s.platforms.filter(platform => platform.ground).slice(1), ...s.upperDecks.filter(deck => deck.upper === 'floor')];
    islands.forEach((island, index) => {
      const lastGround = island.worldX + island.w === s.worldWidth;
      if (!island.upper && index > 1 && index % 3 === 2 && !lastGround && random() < .48) return;
      const hasTrap = s.traps.some(trap => trap.y === island.y && trap.x > island.worldX && trap.x < island.worldX + island.w);
      const count = island.upper ? 1 : index === 0 ? 2 : !hasTrap && s.node.tier >= 3 && random() < .5 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const tunnelGuard = s.node.id === 'reef-side' && lastGround && i === count - 1;
        const hunter = index === 1 && i === 0 || index > 1 && i === 0 && random() < .27 + s.node.tier * .04;
        const key = tunnelGuard ? 'armored' : hunter ? 'hunter' : random() < .10 + (s.node.tier - 1) * .16 && index > 0 ?
          'armored' : i === 0 || random() < .38 ? 'crawler' : 'jumper';
        const type = kinds[key];
        const fraction = hasTrap ? (i === 0 ? .25 : .78) : (i + 1) / (count + 1);
        const x = island.worldX + island.w * fraction - type.w / 2;
        const hp = Math.round(type.baseHp * healthByTier[s.node.tier - 1]);
        const eliteSkin = s.node.optional ? 5 : s.node.tier >= 3 ? 4 : undefined;
        const hunterSkin = key === 'hunter' && random() < .22 ? eliteSkin : undefined;
        const variant = key !== 'hunter' && (tunnelGuard || random() < .24);
        s.enemies.push({ ...type, key, deck: island, hunterSkin, variant, x, y: island.y - type.h, floorY: island.y, facing: -1,
          hp, maxHp: hp, touching: false, attackState: 'ready',
          left: island.worldX + 15, right: island.worldX + island.w - type.w - 15,
          attackLeft: .30 + i * .19 + random() * .20 });
      }
    });
  }

  V.newArena = function (node, character, build, seed) {
    const s = V.newSection({ kind: 'arena', character, build, biome: node.biome,
      seed: seed + ':' + node.id, hp: 4, title: node.name });
    s.node = node;
    s.player.x = 76;
    Object.assign(s, V.generateArena(node, seed));
    s.platforms.push(...s.upperDecks);
    s.cameraX = 0;
    s.cameraY = V.GROUND - 405;
    s.checkpointX = s.player.x;
    s.checkpointY = s.supportY = V.GROUND;
    s.exitOpen = false;
    s.enemies = [];
    s.kills = 0;
    for (const platform of s.platforms) {
      const first = s.coins.length;
      V.addCoin(s, platform.worldX + platform.w * .50, platform.y - 23);
      V.addCoin(s, platform.worldX + platform.w * .68, platform.y - 23);
      if (platform.mover) {
        platform.coins = s.coins.slice(first);
        const phaseOffset = Math.sin(platform.mover.phase);
        platform.worldX += platform.mover.x * phaseOffset;
        platform.y += platform.mover.y * phaseOffset;
        for (const coin of platform.coins) {
          coin.worldX += platform.mover.x * phaseOffset;
          coin.y += platform.mover.y * phaseOffset;
        }
      }
    }
    populate(s);
    V.say(s, 'Räume den Weg frei · Ausgang rechts');
    return s;
  };

  function standOn(enemy, deck) {
    if (enemy.deck === deck && enemy.deckX !== undefined) enemy.x += deck.worldX - enemy.deckX;
    enemy.deck = deck;
    enemy.deckX = deck.worldX;
    enemy.floorY = deck.y;
    enemy.y = deck.y - enemy.h;
    enemy.left = deck.worldX + 5;
    enemy.right = deck.worldX + deck.w - enemy.w - 5;
    enemy.x = V.clamp(enemy.x, enemy.left, enemy.right);
  }

  // Hunters follow walkable platforms, including the side steps up to upper decks.
  function jumpEdge(from, to) {
    const gap = Math.max(0, from.worldX - to.worldX - to.w, to.worldX - from.worldX - from.w);
    return gap <= 205 && from.y - to.y <= 128 && to.y - from.y <= 208;
  }

  function nextDeck(decks, from, destination) {
    if (!from || !destination || from === destination) return null;
    const paths = new Map([[from, null]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i++) {
      const deck = queue[i];
      for (const other of decks) {
        if (paths.has(other) || !jumpEdge(deck, other)) continue;
        const first = paths.get(deck) ?? other;
        if (other === destination) return first;
        paths.set(other, first);
        queue.push(other);
      }
    }
    return null;
  }

  function pursue(s, enemy, dt) {
    const p = s.player;
    const center = p.x + p.w / 2;
    const own = enemy.x + enemy.w / 2;
    if (enemy.leap) {
      const leap = enemy.leap;
      const t = V.clamp((s.elapsed - leap.at) / leap.duration, 0, 1);
      const x = V.clamp(leap.x, leap.deck.worldX + enemy.w / 2 + 5, leap.deck.worldX + leap.deck.w - enemy.w / 2 - 5);
      enemy.x = V.lerp(leap.fromX, x - enemy.w / 2, t);
      enemy.y = V.lerp(leap.fromY, leap.deck.y - enemy.h, t) - Math.sin(Math.PI * t) * 135;
      if (t < 1) return true;
      standOn(enemy, leap.deck);
      enemy.leap = null;
      enemy.pathAt = s.elapsed;
      if (enemy.attackState === 'ready') enemy.attackLeft = .20;
      return true;
    }
    standOn(enemy, enemy.deck);
    if (enemy.attackState !== 'ready' || Math.abs(center - own) > 680 || Math.abs(p.y + p.h - enemy.floorY) > 415) return false;
    if (s.elapsed >= (enemy.pathAt ?? 0)) {
      const decks = s.platforms.filter(deck => deck.enabled !== false && Math.abs(deck.worldX + deck.w / 2 - own) < 940);
      const feet = p.y + p.h;
      const destination = decks.filter(deck => center >= deck.worldX - 7 && center <= deck.worldX + deck.w + 7 && deck.y >= feet - 14)
        .sort((a, b) => a.y - b.y)[0];
      enemy.nextDeck = nextDeck(decks, enemy.deck, destination);
      enemy.pathAt = s.elapsed + .32;
    }
    const next = enemy.nextDeck;
    if (!next || !jumpEdge(enemy.deck, next)) return false;
    const mid = enemy.deck.worldX + enemy.deck.w / 2;
    const toward = next.worldX + next.w / 2 >= mid ? 1 : -1;
    const overlaps = next.worldX < enemy.deck.worldX + enemy.deck.w && next.worldX + next.w > enemy.deck.worldX;
    const landing = V.clamp(own + toward * 150, next.worldX + enemy.w / 2 + 7, next.worldX + next.w - enemy.w / 2 - 7);
    const takeoff = overlaps ? V.clamp(landing, enemy.left + enemy.w / 2, enemy.right + enemy.w / 2) :
      (toward > 0 ? enemy.right : enemy.left) + enemy.w / 2;
    enemy.facing = Math.sign(landing - own) || toward;
    if (Math.abs(takeoff - own) > 7) {
      enemy.x += V.clamp(takeoff - own, -188 * dt, 188 * dt);
      return true;
    }
    enemy.leap = { deck: next, x: landing, fromX: enemy.x, fromY: enemy.y, at: s.elapsed,
      duration: V.clamp(Math.abs(landing - own) / 340, .39, .70) };
    enemy.nextDeck = null;
    return true;
  }

  function updateEnemy(s, enemy, dt) {
    enemy.flash = Math.max(0, (enemy.flash ?? 0) - dt);
    if (enemy.entering) {
      enemy.x += enemy.facing * 232 * dt;
      if ((enemy.entryX - enemy.x) * enemy.facing <= 0) {
        enemy.x = enemy.entryX;
        enemy.entering = false;
      }
      return;
    }
    enemy.attackLeft -= dt;
    if (enemy.key === 'hunter' && enemy.deck && (enemy.leap || enemy.attackState === 'ready') && pursue(s, enemy, dt)) return;
    const ground = enemy.floorY - enemy.h;
    if (enemy.attackState === 'tell') {
      if (enemy.attackLeft > 0) return;
      enemy.attackState = 'active';
      enemy.attackLeft = enemy.active;
      if (enemy.key === 'armored') {
        const x = enemy.x + enemy.w / 2 + enemy.facing * (enemy.w / 2 + 14);
        s.projectiles.push({ key: 'surge', x, y: enemy.floorY - 15, vx: enemy.facing * 350, r: 19,
          left: enemy.left - 15, right: enemy.right + enemy.w + 15 });
        V.impact(s, x, enemy.floorY - 3, '#85dcff');
      }
    }
    if (enemy.attackState === 'active') {
      const progress = 1 - Math.max(0, enemy.attackLeft) / enemy.active;
      enemy.x = V.lerp(enemy.attackX, enemy.targetX, progress);
      if (enemy.key === 'jumper' || enemy.key === 'hunter') enemy.y = ground - Math.sin(Math.PI * progress) * 103;
      if (enemy.attackLeft > 0) return;
      enemy.attackState = 'recover';
      enemy.attackLeft = enemy.recovery;
      enemy.y = ground;
      if (enemy.key === 'jumper') V.impact(s, enemy.x + enemy.w / 2, enemy.floorY - 3, enemy.color);
      return;
    }
    if (enemy.attackState === 'recover') {
      enemy.y = Math.min(ground, enemy.y + 280 * dt);
      if (enemy.attackLeft <= 0) enemy.attackState = 'ready';
      return;
    }

    if (s.player.x + s.player.w < enemy.left - 68 || s.player.x > enemy.right + enemy.w + 68 ||
        Math.abs(s.player.y + s.player.h - enemy.floorY) > 155) return;
    const target = s.player.x + (s.player.w - enemy.w) / 2;
    const distance = target - enemy.x;
    enemy.facing = Math.sign(distance) || enemy.facing;
    if (Math.abs(distance) > enemy.range * .7) enemy.x = V.clamp(enemy.x + enemy.facing * (enemy.key === 'hunter' ? 138 : 69) * dt, enemy.left, enemy.right);
    if (enemy.attackLeft <= 0 && Math.abs(distance) <= enemy.range) {
      enemy.attackState = 'tell';
      enemy.attackLeft = enemy.windup;
      enemy.attackX = enemy.x;
      enemy.targetX = V.clamp(enemy.x + V.clamp(distance, -enemy.travel, enemy.travel), enemy.left, enemy.right);
    }
  }

  V.arenaCameraTarget = function (s) {
    return V.clamp(s.player.x + s.player.w / 2 - V.W * .42, 0, s.worldWidth - V.W);
  };

  V.damageEnemy = function (s, enemy, damage) {
    const amount = Math.min(enemy.hp, damage);
    if (amount <= 0) return 0;
    enemy.hp -= amount;
    enemy.entering = false;
    enemy.attackState = 'recover';
    enemy.attackLeft = .56;
    enemy.flash = .13;
    if (enemy.hp === 0) {
      enemy.defeatedAt = s.elapsed;
      s.kills++;
      s.score += 75 + damage;
      if (!enemy.reinforcement) V.addCoin(s, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    }
    return amount;
  };

  function hitEnemy(s, enemy, damage) {
    const guarded = enemy.key === 'armored' && enemy.attackState !== 'recover' &&
      Math.sign(s.player.previousX + s.player.w / 2 - enemy.x - enemy.w / 2) === enemy.facing;
    const amount = V.damageEnemy(s, enemy, guarded ? Math.round(damage * .48) : damage);
    if (!s.player.swing) V.rebound(s);
    else if (s.chainDash) {
      s.player.dashCooldown = 0;
      s.player.airDash = true;
    }
    if (amount > 0) {
      V.chargeDash(s, amount);
      if (enemy.hp === 0) V.chargeUltimate(s, 4);
    }
    V.hitFeedback(s, amount > 0 ? 'hit' : 'guard', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2,
      { amount, direction: s.player.facing, heavy: enemy.hp === 0 });
    V.say(s, amount > 0 ? (guarded ? 'Panzer · ' : s.weapon.name + ' · ') + '−' + amount + ' HP' : 'Mehr Anlauf!');
  }

  const reinforcementArt = {
    reef: 'crab', greed: 'scarab', diva: 'diva', vortex: 'vortex', god: 'glitch',
    garden: 'bee', inferno: 'ember', race: 'car'
  };
  V.reinforcementArt = s => 'exp-' + reinforcementArt[s.arenaGlitch?.active ?? s.biome];

  V.updateReinforcements = function (s) {
    if (s.elapsed < s.reinforcementsAt) return;
    s.enemies = s.enemies.filter(enemy => enemy.hp > 0);
    s.reinforcementsAt = s.elapsed + (s.boss.phase === 0 ? 8 : 6.5);
    const cap = s.boss.phase === 0 ? 2 : 3;
    if (s.enemies.length >= cap) return;
    const p = s.player;
    const typeKey = (s.reinforcementCount++ + s.boss.phase) % 3 === 1 ? 'jumper' : 'crawler';
    const type = kinds[typeKey];
    let facing = s.reinforcementCount % 2 ? 1 : -1;
    const cameraLeft = s.cameraX;
    const cameraRight = cameraLeft + V.W;
    if (p.x < cameraLeft + 220) facing = -1;
    else if (p.x > cameraRight - 220) facing = 1;
    const x = facing === 1 ? cameraLeft - type.w - 12 : cameraRight + 12;
    const minAdvance = x + facing * (type.w + 55);
    const nearPlayer = p.x - facing * 295;
    const entryX = V.clamp(facing === 1 ? Math.max(minAdvance, nearPlayer) : Math.min(minAdvance, nearPlayer),
      14, s.worldWidth - type.w - 14);
    const hp = type.baseHp + s.boss.phase * 22;
    s.enemies.push({ ...type, key: typeKey, x, y: V.GROUND - type.h, floorY: V.GROUND, facing, hp, maxHp: hp,
      left: 14, right: s.worldWidth - type.w - 14, attackState: 'ready', attackLeft: .45, entering: true, entryX, reinforcement: true });
  };

  V.updateEnemies = function (s, dt) {
    const p = s.player;
    let firstHit = Infinity;
    let target;
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      const oldX = enemy.x;
      const oldY = enemy.y;
      updateEnemy(s, enemy, dt);
      enemy.moving = Math.abs(enemy.x - oldX) > .001;
      enemy.stride = (enemy.stride ?? 0) + Math.abs(enemy.x - oldX);
      const contact = V.movementContact(p, enemy);
      const strike = s.weapon.angles ? V.weaponContact(s, enemy, enemy.x - oldX, enemy.y - oldY) :
        p.dashTime > 0 ? contact : Infinity;
      if (strike < Infinity) {
        if (strike < firstHit) {
          firstHit = strike;
          target = enemy;
        }
      } else if (contact < Infinity) {
        if (enemy.attackState === 'active' && enemy.key !== 'armored' && p.invuln <= 0) V.hurt(s);
        else if (!enemy.touching) V.slowOnImpact(s);
      }
      enemy.touching = V.overlap(p, enemy);
    }
    if (target && s.outcome === null) {
      p.swing?.hits.add(target);
      hitEnemy(s, target, p.dashPower);
    }
  };

  V.updateArena = function (s, dt, actions) {
    if (s.outcome !== null) return;
    s.elapsed += dt;
    V.moveArenaDecks(s, dt);
    V.movePlayer(s, dt, actions);
    const p = s.player;
    if (p.y > s.supportY + 300 && p.y > V.arenaFallLimit(s)) {
      p.invuln = 0;
      V.hurt(s);
      Object.assign(p, { x: s.checkpointX, y: s.checkpointY - p.h, vx: 0, vy: 0, grounded: true,
        jumps: 0, airDash: true, dashBuffer: 0, jumpBuffer: 0, dashCooldown: 0, angle: 0, landTime: 0, swing: null, hammerDive: false, hammerApex: undefined });
      s.cameraX = V.arenaCameraTarget(s);
      s.cameraY = s.checkpointY - 405;
      s.supportY = s.checkpointY;
      s.speed = 0;
      if (s.outcome === null) V.say(s, 'Abgrund · zurück auf die letzte Insel');
      return;
    }
    s.cameraX = V.lerp(s.cameraX, V.arenaCameraTarget(s), Math.min(1, dt * 7.5));
    const targetY = p.grounded ? p.y + p.h - 405 : V.clamp(s.cameraY, p.y + p.h - 475, p.y - 115);
    s.cameraY = V.lerp(s.cameraY, targetY, Math.min(1, dt * 6));
    V.updateEnemies(s, dt);
    for (const shot of s.projectiles) {
      shot.x += shot.vx * dt;
      if (shot.x < shot.left || shot.x > shot.right) shot.dead = true;
      else if (V.projectileHits(p, shot)) {
        shot.dead = true;
        V.hurt(s, Math.sign(shot.vx));
      }
    }
    s.projectiles = s.projectiles.filter(shot => !shot.dead);
    if (s.outcome === null) V.updateArenaTraps(s, dt);
    s.speed = Math.abs(p.vx);
    s.score += s.speed * .1 * dt;
    V.collectCoins(s);
    if (s.outcome !== null) return;
    s.exitOpen = s.enemies.every(enemy => enemy.hp <= 0);
    if (!p.grounded || Math.abs(p.y + p.h - s.exitY) > 1 || p.x + p.w / 2 < s.exitX) return;
    if (s.exitOpen) s.outcome = true;
    else if (s.feedbackTime <= 0) V.say(s, 'Tor gesperrt · Gegner auf den Inseln besiegen');
  };
})();
