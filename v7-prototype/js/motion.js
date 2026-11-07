(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;

  V.newSection = function ({ kind, character, build = {}, biome = 'reef', seed, hp = 3, title }) {
    const traits = V.characters[character];
    const section = {
      kind, character, title, biome, seed, elapsed: 0, dist: 0, speed: 0, score: 0,
      maxHp: hp + traits.hp, magnetRange: traits.magnet, coinsTaken: 0, coinSerial: 0,
      coins: [], obstacles: [], platforms: [], projectiles: [], outcome: null, feedback: '', feedbackTime: 0,
      player: { x: V.START_X, y: G - 43, w: 44, h: 43, vx: 0, vy: 0, facing: 1, jumps: 0,
        gravity: 1790 * traits.gravity, invuln: 0, dashTime: 0, dashCooldown: 0, angle: 0,
        grounded: true, airDash: true, dashPower: 1 }
    };
    V.applyBuild(section, build);
    return section;
  };

  V.say = function (section, message) {
    section.feedback = message;
    section.feedbackTime = 1.8;
  };

  V.scrollX = (section, worldX) => V.START_X + worldX - section.dist;
  V.stageX = (section, worldX) => section.kind === 'arena' ? worldX : V.scrollX(section, worldX);

  V.addCoin = function (s, x, y) {
    s.coins.push({ worldX: x, y, r: 9, taken: false, missed: false });
    s.coinSerial++;
    if (s.coinBonus && s.coinSerial % 4 === 0) {
      s.coins.push({ worldX: x + 27, y: y - 13, r: 8, taken: false, missed: false });
    }
  };

  V.collectCoins = function (s) {
    const p = s.player;
    for (const coin of s.coins) {
      if (coin.taken) continue;
      const x = V.stageX(s, coin.worldX);
      const reach = coin.r * s.magnetRange;
      if (p.x < x + reach && p.x + p.w > x - reach && p.y < coin.y + reach && p.y + p.h > coin.y - reach) {
        coin.taken = true;
        s.coinsTaken++;
        s.score += 10 * s.multiplier * s.goldMultiplier * s.coinValue;
        s.multiplier++;
      } else if (s.kind !== 'arena' && !coin.missed && x + reach < p.x - 30) {
        coin.missed = true;
        s.multiplier = s.baseMultiplier;
      }
    }
  };

  V.hurt = function (s, direction = -1) {
    const p = s.player;
    if (p.invuln > 0 || s.outcome !== null) return;
    s.hp--;
    p.invuln = 1.18;
    p.vy = -245;
    p.vx = direction * 220;
    p.dashTime = 0;
    V.say(s, 'Treffer!');
    if (s.hp <= 0) s.outcome = false;
  };

  V.rebound = function (s, direction) {
    const p = s.player;
    p.dashTime = 0;
    p.dashCooldown = .12 * s.dashFactor;
    p.airDash = true;
    p.vy = -410;
    p.vx = -direction * 245;
    p.jumps = Math.min(p.jumps, 1);
    p.invuln = Math.max(p.invuln, .23);
  };

  function moveVertical(s, dt) {
    const p = s.player;
    const previousBottom = p.y + p.h;
    p.grounded = false;
    p.vy += p.gravity * dt;
    p.y += p.vy * dt;
    let floor = G;
    if (p.vy >= 0) {
      for (const platform of s.platforms) {
        const x = V.stageX(s, platform.worldX);
        if (p.x + p.w > x + 4 && p.x < x + platform.w - 4 &&
          previousBottom <= platform.y + 2 && p.y + p.h >= platform.y) floor = Math.min(floor, platform.y);
      }
    }
    if (p.y + p.h >= floor) {
      p.y = floor - p.h;
      p.vy = 0;
      p.jumps = 0;
      p.grounded = true;
      p.airDash = true;
    }
    if (p.y < -70) {
      p.y = -70;
      p.vy = Math.max(0, p.vy);
    }
  }

  V.movePlayer = function (s, dt, actions) {
    const p = s.player;
    const arena = s.kind === 'arena';
    const boss = s.kind === 'boss';
    const direction = Number(Boolean(actions.right)) - Number(Boolean(actions.left));
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    s.feedbackTime = Math.max(0, s.feedbackTime - dt);
    if (actions.jump && p.jumps < 2 + s.extraJumps) {
      p.vy = p.jumps === 0 ? -730 : -660 * p.doubleJumpBoost;
      p.jumps++;
    }
    if (arena && p.dashTime <= 0) {
      const cap = V.clamp((330 + V.characters[s.character].speed + s.bonusSpeed) * s.speedFactor, 190, 540);
      if (direction) {
        p.facing = direction;
        p.vx = V.clamp(p.vx + direction * 1900 * dt, -cap, cap);
      } else {
        p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - 1750 * dt);
      }
    }
    if (actions.dash && p.dashCooldown <= 0 && (!arena || p.airDash)) {
      p.dashTime = boss ? .31 : .24;
      p.dashCooldown = (arena ? .52 : boss ? .85 : 1.35) * s.dashFactor;
      if (arena) {
        const momentum = Math.abs(p.vx);
        p.dashPower = momentum >= 185 ? 2 : 1;
        p.facing = momentum > 55 ? Math.sign(p.vx) : p.facing;
        p.vx = p.facing * (510 + Math.min(500, momentum) * .72);
        p.vy *= .34;
        p.airDash = false;
      }
    }
    if (arena) {
      p.x = V.clamp(p.x + p.vx * dt, 22, V.W - p.w - 22);
    } else {
      const steer = direction * (boss ? 225 : 165);
      const pull = direction ? 0 : (V.START_X - p.x) * .65;
      p.x = V.clamp(p.x + (steer + pull + (s.wind || 0)) * dt, 104, boss ? 466 : 425);
    }
    moveVertical(s, dt);
    const spin = p.dashTime > 0 ? 1050 : p.jumps > 1 ? 680 : 0;
    p.angle = spin ? (p.angle + spin * p.spinBoost * dt) % 360 : 0;
  };
})();
