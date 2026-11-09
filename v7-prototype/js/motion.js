(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  const motion = V.arenaMotion;
  const hitLooks = {
    hit: { color: '#ffd47a', size: 70, stop: .045 },
    hurt: { color: '#ff7298', size: 86, stop: .038 },
    guard: { color: '#a9b8ff', size: 62, stop: .028 },
    parry: { color: '#96fff0', size: 76, stop: .045 }
  };

  V.newSection = function ({ kind, character, build = {}, biome = 'reef', seed, hp = 3, title }) {
    const traits = V.characters[character];
    const section = {
      kind, character, title, biome, seed, elapsed: 0, dist: 0, speed: 0, score: 0,
      maxHp: hp + traits.hp, magnetRange: traits.magnet, coinsTaken: 0, coinSerial: 0,
      coins: [], obstacles: [], platforms: [], projectiles: [], effects: [], hitStop: 0, outcome: null, feedback: '', feedbackTime: 0,
      player: { x: V.START_X, y: G - 43, w: 44, h: 43, vx: 0, vy: 0, facing: 1, jumps: 0,
        gravity: motion.gravity * traits.gravity, invuln: 0, dashTime: 0, dashCooldown: 0, angle: 0,
        grounded: true, airDash: true, skidding: false, dashPower: 0, dashLeft: 0, dashVelocity: 0, dashBuffer: 0, jumpBuffer: 0,
        coyote: 0, landTime: 0 }
    };
    V.applyBuild(section, build);
    return section;
  };

  V.say = function (section, message) {
    section.feedback = message;
    section.feedbackTime = 1.8;
  };

  function addEffect(s, effect, stop) {
    if (s.effects.length === 12) s.effects.shift();
    s.effects.push(effect);
    s.hitStop = Math.max(s.hitStop, stop);
  }

  V.impact = function (s, x, y, color) {
    addEffect(s, { x, y, color, left: .3, life: .3 }, 0);
  };

  V.hitFeedback = function (s, kind, x, y, { amount, heavy = false, direction = 1 } = {}) {
    const look = hitLooks[kind];
    const life = kind === 'hurt' ? .46 : .39;
    const size = look.size * (heavy ? 1.36 : 1);
    const stop = s.kind === 'arena' ? look.stop + (heavy ? .013 : 0) : 0;
    addEffect(s, { kind, x, y, color: look.color, size, amount, direction, left: life, life }, stop);
    V.audio?.effect?.(kind, heavy);
  };

  function movementFeedback(s, kind, direction, speed) {
    const p = s.player;
    const skid = kind === 'skid';
    const life = skid ? .34 : .24;
    const size = skid ? V.clamp(65 + (speed - 380) * .07, 65, 106) : kind === 'dash-fast' ? 111 : 82;
    addEffect(s, {
      kind, movement: true, direction, size, life, left: life,
      x: p.x + p.w / 2 - direction * (skid ? p.w * .12 : p.w * .39),
      y: p.y + p.h * (skid ? 1 : .55)
    }, 0);
    V.audio?.effect?.(kind);
  }

  function updateSkid(s, canBrake, direction) {
    const p = s.player;
    const speed = Math.abs(p.vx);
    const skidding = canBrake && p.grounded && p.vx * direction <= 0 &&
      speed >= (p.skidding ? 185 : 380);
    if (skidding && !p.skidding && !s.effects.some(effect => effect.kind === 'skid')) {
      movementFeedback(s, 'skid', Math.sign(p.vx), speed);
    }
    p.skidding = skidding;
  }

  V.projectileHits = function (player, shot, reach = 0) {
    const rx = shot.r * .77 + reach;
    const ry = shot.r * .77 + reach * .55;
    return player.x < shot.x + rx && player.x + player.w > shot.x - rx &&
      player.y < shot.y + ry && player.y + player.h > shot.y - ry;
  };

  V.usesMomentum = s => s.kind === 'arena' || s.boss?.stage === 'arena';
  V.scrollX = (section, worldX) => V.START_X + worldX - section.dist;
  V.stageX = (section, worldX) => V.usesMomentum(section) ? worldX : V.scrollX(section, worldX);
  V.dashDamage = (s, speed) => Math.round(speed / 3 * (1 + .25 * s.strikeBonus));
  V.slowOnImpact = s => { s.player.vx *= motion.retainedSpeed; };

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
        s.score += 10 * s.multiplier * s.coinValue;
        s.multiplier++;
        if (s.healAtCoins && s.coinsTaken >= s.healAtCoins && s.hp < s.maxHp) {
          s.hp++;
          s.healAtCoins = 0;
          V.impact(s, x, coin.y, '#83ffc4');
          V.say(s, 'Münzschwarm · +1 HP');
        }
      } else if (!V.usesMomentum(s) && !coin.missed && x + reach < p.x - 30) {
        coin.missed = true;
        s.multiplier = 1;
      }
    }
  };

  V.hurt = function (s, direction = -1) {
    const p = s.player;
    if (p.invuln > 0 || s.outcome !== null) return;
    s.hp--;
    p.invuln = 1.18;
    p.vy = -245;
    if (V.usesMomentum(s)) V.slowOnImpact(s);
    else p.vx = direction * 220;
    p.dashTime = 0;
    V.hitFeedback(s, 'hurt', p.x + p.w / 2, p.y + p.h / 2, { amount: 1, direction });
    V.say(s, 'Treffer!');
    if (s.hp <= 0) s.outcome = false;
  };

  V.rebound = function (s) {
    const p = s.player;
    p.dashTime = 0;
    p.dashCooldown = s.chainDash ? 0 : .12 * s.dashFactor;
    p.airDash = true;
    p.vy = -265;
    V.slowOnImpact(s);
    p.jumps = Math.min(p.jumps, 1);
    p.invuln = Math.max(p.invuln, .23);
  };

  function moveVertical(s, dt) {
    const p = s.player;
    const local = V.usesMomentum(s);
    const wasGrounded = p.grounded;
    const previousBottom = p.y + p.h;
    p.grounded = false;
    p.vy += p.gravity * dt;
    p.y += p.vy * dt;
    let floor = s.kind === 'arena' ? Infinity : G;
    let landed;
    if (p.vy >= 0) {
      for (const platform of s.platforms) {
        const x = V.stageX(s, platform.worldX);
        if (platform.y <= floor && p.x + p.w > x + 4 && p.x < x + platform.w - 4 &&
          previousBottom <= platform.y + 2 && p.y + p.h >= platform.y) {
          floor = platform.y;
          landed = platform;
        }
      }
    }
    if (p.y + p.h >= floor) {
      if (!wasGrounded && p.vy > 220) p.landTime = .16;
      p.y = floor - p.h;
      p.vy = 0;
      p.jumps = 0;
      p.grounded = true;
      p.airDash = true;
      if (s.kind === 'arena') {
        s.supportY = floor;
        if (landed?.ground) {
          s.checkpointX = landed.worldX + 54;
          s.checkpointY = floor;
        }
      }
    }
    if (!local && p.y < -70) {
      p.y = -70;
      p.vy = Math.max(0, p.vy);
    }
  }

  function accelerate(s, direction, dt) {
    const p = s.player;
    if (!direction) {
      p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - motion.brake * dt);
    } else {
      const trait = V.characters[s.character];
      const excess = Math.max(0, p.vx * direction - motion.run - trait.speed);
      const acceleration = trait.acceleration / (1 + excess / 95) ** 2;
      p.vx += direction * acceleration * dt;
      p.facing = direction;
    }
    p.vx += (s.wind || 0) * dt;
  }

  // Find the first contact along this frame's movement, even if the player crosses a whole hitbox.
  V.movementContact = function (p, target) {
    let entry = 0;
    let exit = 1;
    for (const [from, to, low, high] of [
      [p.previousX, p.x, target.x - p.w, target.x + target.w],
      [p.previousY, p.y, target.y - p.h, target.y + target.h]
    ]) {
      if (from === to) {
        if (from <= low || from >= high) return Infinity;
        continue;
      }
      const a = (low - from) / (to - from);
      const b = (high - from) / (to - from);
      entry = Math.max(entry, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (entry >= exit) return Infinity;
    }
    return entry;
  };

  V.movePlayer = function (s, dt, actions) {
    const p = s.player;
    const local = V.usesMomentum(s);
    const boss = s.kind === 'boss' && !local;
    const direction = Number(Boolean(actions.right)) - Number(Boolean(actions.left));
    p.previousX = p.x;
    p.previousY = p.y;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashTime = local && p.dashLeft <= 0 ? 0 : Math.max(0, p.dashTime - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.landTime = Math.max(0, p.landTime - dt);
    p.coyote = p.grounded ? .10 : Math.max(0, p.coyote - dt);
    p.jumpBuffer = actions.jump ? s.inputGrace : Math.max(0, p.jumpBuffer - dt);
    p.dashBuffer = actions.dash ? s.inputGrace : Math.max(0, p.dashBuffer - dt);
    s.feedbackTime = Math.max(0, s.feedbackTime - dt);
    for (let i = s.effects.length - 1; i >= 0; i--) {
      s.effects[i].left -= dt;
      if (s.effects[i].left <= 0) s.effects.splice(i, 1);
    }
    if (p.jumpBuffer > 0 && p.jumps < 2 + s.extraJumps) {
      if (!p.grounded && p.coyote <= 0 && p.jumps === 0) p.jumps = 1;
      if (s.airSpring && p.jumps === 1) p.airDash = true;
      p.vy = p.jumps === 0 ? -motion.jump : -660 * p.doubleJumpBoost;
      p.grounded = false;
      p.coyote = p.jumpBuffer = p.landTime = 0;
      p.jumps++;
    }
    const launch = p.dashBuffer > 0 && p.dashCooldown <= 0 && p.dashTime <= 0 && (!local || p.airDash);
    updateSkid(s, local && p.dashTime <= 0 && !launch, direction);
    if (local && p.dashTime <= 0 && !launch) accelerate(s, direction, dt);
    if (launch) {
      p.dashBuffer = 0;
      p.dashTime = (boss ? .31 : .24) + s.dashExtension;
      p.dashCooldown = (local ? .50 : boss ? .73 : 1.35) * s.dashFactor;
      if (boss) {
        p.facing = direction || 1;
        p.vx = p.facing * 580;
        p.vy *= .55;
      }
      if (local) {
        p.facing = direction || Math.sign(p.vx) || p.facing;
        const momentum = Math.abs(p.vx);
        p.dashPower = V.dashDamage(s, momentum);
        p.dashVelocity = 650 + momentum * .95;
        p.dashLeft = motion.dashRange + 600 * s.dashExtension;
        p.vy *= .34;
        p.airDash = false;
      }
      const fast = local ? Math.abs(p.vx) >= 460 : !boss && s.speed >= 625;
      movementFeedback(s, fast ? 'dash-fast' : 'dash', p.facing);
    }
    if (local) {
      const dashing = p.dashTime > 0;
      const distance = dashing ? Math.min(p.dashLeft, p.dashVelocity * dt) : 0;
      const next = p.x + (dashing ? p.facing * distance : p.vx * dt);
      p.x = V.clamp(next, 22, s.worldWidth - p.w - 22);
      if (dashing) p.dashLeft -= distance;
      if (p.x !== next) {
        p.vx = 0;
        p.dashLeft = 0;
      }
    } else if (boss) {
      if (direction && p.dashTime <= 0) p.facing = direction;
      const swim = direction * 245 + (s.wind || 0);
      p.vx = V.lerp(p.vx, swim, Math.min(1, dt * (p.dashTime > 0 ? 6 : 15)));
      p.x = V.clamp(p.x + p.vx * dt, 104, 466);
    } else {
      const steer = direction * 165;
      const pull = direction ? 0 : (V.START_X - p.x) * .65;
      p.x = V.clamp(p.x + (steer + pull) * dt, 104, 425);
    }
    moveVertical(s, dt);
    const spin = p.dashTime > 0 ? 1050 : p.jumps > 1 ? 680 : 0;
    if (spin) {
      p.angle = (p.angle + spin * p.spinBoost * dt) % 360;
    } else {
      const upright = p.angle > 180 ? 360 : 0;
      p.angle = Math.abs(p.angle - upright) < 1 ? 0 : V.lerp(p.angle, upright, Math.min(1, dt * 20)) % 360;
    }
  };
})();
