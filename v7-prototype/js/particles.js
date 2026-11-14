/* Cosmetic particles have their own clock and random stream. */
(function () {
  'use strict';
  const V = window.VS7;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const limit = V.particleLimit = 220;
  const regionalBursts = new Set(['drift', 'charge', 'shot', 'zone']);
  const bursts = {
    dash: { count: 15, speed: 210, life: .37, size: 9, art: 0, aimed: true },
    'dash-fast': { count: 23, speed: 285, life: .43, size: 11, art: 0, aimed: true },
    trail: { count: 4, speed: 98, life: .28, size: 7, art: 0, aimed: true },
    sprint: { count: 3, speed: 81, life: .25, size: 8, aimed: true, background: true },
    skid: { count: 8, speed: 100, life: .37, size: 13, art: 1, aimed: true },
    land: { count: 11, speed: 126, life: .36, size: 12, art: 1, lift: 85 },
    coin: { count: 7, speed: 142, life: .45, size: 9, art: 2, lift: 92 },
    hit: { count: 14, speed: 212, life: .41, size: 11, art: 3, aimed: true },
    hurt: { count: 17, speed: 195, life: .48, size: 11, art: 4 },
    guard: { count: 10, speed: 180, life: .38, size: 9 },
    parry: { count: 18, speed: 247, life: .42, size: 10, ring: 72 },
    impact: { count: 10, speed: 151, life: .37, size: 9 },
    charge: { count: 7, speed: 76, life: .60, size: 9 },
    shot: { count: 4, speed: 127, life: .27, size: 7, aimed: true },
    zone: { count: 15, speed: 140, life: .55, size: 12, lift: 110 },
    defeat: { count: 42, speed: 294, life: .88, size: 15, art: 3, ring: 146 },
    drift: { count: 2, speed: 19, life: 1.38, size: 10, lift: 24, background: true }
  };

  V.initParticles = function (s) {
    s.particles = [];
    s.fxRandom = V.randomFor(s.seed + ':particle-visuals');
    s.fxSequence = 0;
    s.fxDriftAt = 0;
    s.fxTrailAt = 0;
  };

  V.emitParticles = function (s, kind, x, y, { color, direction = 1, heavy = false, spread = 0 } = {}) {
    if (reducedMotion?.matches) return;
    const profile = bursts[kind];
    const particles = s.particles;
    const rand = s.fxRandom;
    const count = profile.count + (heavy ? 8 : 0);
    const ring = profile.ring ?? (heavy ? 78 : 0);
    const overflow = particles.length + count + Number(ring > 0) - limit;
    if (overflow > 0) particles.splice(0, overflow);
    const tint = color ?? V.biomes[s.biome].accent;
    for (let i = 0; i < count; i++) {
      const angle = profile.aimed ? (direction > 0 ? 0 : Math.PI) + (rand() - .5) * 2.8 : rand() * Math.PI * 2;
      const speed = profile.speed * (.24 + rand() * .82);
      const life = profile.life * (.65 + rand() * .56);
      const generic = profile.art !== undefined && i % 2 === 0;
      particles.push({
        x: x + (rand() - .5) * spread, y: y + (rand() - .5) * 8,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (profile.lift ?? 0),
        gravity: profile.background ? 0 : 155, life, left: life, tint,
        size: profile.size * (.52 + rand() * .89),
        atlas: generic ? 'action' : s.biome, frame: generic ? profile.art : 6 + s.fxSequence++ % 3,
        newArt: generic ? kind === 'dash-fast' : regionalBursts.has(kind),
        background: Boolean(profile.background)
      });
    }
    if (ring) particles.push({ x, y, ring, life: .29, left: .29, tint });
  };

  V.tickParticles = function (s, dt) {
    const particles = s.particles;
    if (reducedMotion?.matches) {
      particles.length = 0;
      return;
    }
    const local = V.usesMomentum(s);
    const scroll = local ? 0 : s.speed * .42;
    let next = 0;
    for (const p of particles) {
      p.left -= dt;
      if (p.left <= 0) continue;
      if (!p.ring) {
        p.vy += p.gravity * dt;
        p.x += (p.vx - scroll) * dt;
        p.y += p.vy * dt;
      }
      particles[next++] = p;
    }
    particles.length = next;
    if (s.outcome !== null) return;
    const p = s.player;
    s.fxDriftAt -= dt;
    s.fxTrailAt -= dt;
    if (s.fxDriftAt <= 0) {
      s.fxDriftAt = .125;
      V.emitParticles(s, 'drift', (s.cameraX ?? 0) + s.fxRandom() * V.W,
        (s.cameraY ?? 0) + 80 + s.fxRandom() * (V.GROUND - 65));
    }
    if (p.dashTime > 0 && s.fxTrailAt <= 0) {
      s.fxTrailAt = .038;
      V.emitParticles(s, 'trail', p.x + p.w / 2 - p.facing * p.w * .38,
        p.y + p.h * .62, { direction: -p.facing });
    } else if (p.dashTime <= 0 && s.fxTrailAt <= 0 && (local ? Math.abs(p.vx) >= 440 : s.speed >= 620)) {
      const direction = local ? Math.sign(p.vx) : 1;
      s.fxTrailAt = .07;
      V.emitParticles(s, 'sprint', p.x + p.w / 2 - direction * p.w * .38,
        p.y + p.h * .83, { direction: -direction });
    }
  };
})();
