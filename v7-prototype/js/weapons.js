/* Each swing owns its hit list and uses the same poses for rendering and collision. */
(function () {
  'use strict';
  const V = window.VS7;
  V.weapons = {
    shell: { id: 'shell', name: 'Panzer-Dash', baseDamage: 0, multiplier: 1 },
    katana: { id: 'katana', name: 'Glutkatana', sprite: 'katana', baseDamage: 30, multiplier: 1.75,
      reach: 63, edgeStart: 8, radius: 7, grip: 12, duration: .12, cooldown: 0,
      angles: [-1.37, -.94, -.37, .29, .91, 1.23], color: '#ffe3a1', sound: 'katana' },
    'reef-spear': { id: 'reef-spear', name: 'Riffspieß', sprite: 'shop-spear', baseDamage: 25, multiplier: 1.35,
      reach: 103, edgeStart: 49, radius: 6, grip: 21, duration: .14, cooldown: 0,
      angles: [-.34, -.13, -.035, .03, .10], color: '#99fff2', sound: 'katana' },
    'anchor-axe': { id: 'anchor-axe', name: 'Ankerbeil', sprite: 'shop-axe', baseDamage: 35, multiplier: 2.05,
      reach: 53, edgeStart: 27, radius: 12, grip: 13, duration: .17, cooldown: 0,
      angles: [-1.65, -1.18, -.49, .36, 1.07, 1.42], color: '#ff9b7c', sound: 'katana' }
  };

  V.equippedWeapon = character => V.weapons[V.characters[character].weapon ?? 'katana'] ?? V.weapons.shell;

  V.weaponDamage = function (s, speed, bonus = 1) {
    const weapon = s.weapon;
    return V.dashDamage(s, speed, weapon.multiplier * bonus, weapon.baseDamage);
  };

  V.startWeaponSwing = function (s) {
    const p = s.player;
    const weapon = s.weapon;
    if (!weapon.angles || p.weaponCooldown > 0) return;
    p.swing = { time: 0, previousTime: 0, facing: p.facing, hits: new Set() };
    p.weaponCooldown = weapon.cooldown;
    V.audio?.effect?.(weapon.sound);
  };

  V.weaponPose = function (s, time, previous = false) {
    const p = s.player;
    const weapon = s.weapon;
    const facing = p.swing?.facing ?? p.facing;
    const frame = V.clamp(time / weapon.duration, 0, 1) * (weapon.angles.length - 1);
    const index = Math.min(weapon.angles.length - 2, Math.floor(frame));
    return {
      x: (previous ? p.previousX : p.x) + p.w * (.5 + facing * .25),
      y: (previous ? p.previousY : p.y) + p.h * .48,
      angle: p.swing ? V.lerp(weapon.angles[index], weapon.angles[index + 1], frame - index) : -2.23,
      facing
    };
  };

  V.weaponContact = function (s, target, dx = 0, dy = 0, key = target) {
    const p = s.player;
    const swing = p.swing;
    if (!swing || swing.hits.has(key)) return Infinity;
    const weapon = s.weapon;
    const from = V.weaponPose(s, swing.previousTime, true);
    const to = V.weaponPose(s, swing.time);
    const r = weapon.radius;
    let hit = Infinity;
    for (let length = weapon.edgeStart; ; length = Math.min(weapon.reach, length + r)) {
      const x = to.x + to.facing * Math.cos(to.angle) * length;
      const y = to.y + Math.sin(to.angle) * length;
      const previousX = from.x + from.facing * Math.cos(from.angle) * length + dx;
      const previousY = from.y + Math.sin(from.angle) * length + dy;
      hit = Math.min(hit, V.movementContact({ x: x - r, y: y - r, w: 2 * r, h: 2 * r,
        previousX: previousX - r, previousY: previousY - r }, target));
      if (length === weapon.reach) return hit;
    }
  };
})();
