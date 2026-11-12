const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const modules = [
  'config', 'assets', 'profile', 'upgrades', 'campaign', 'course-data', 'boss-data', 'boss-beats',
  'motion', 'runner', 'arena-layout', 'arena-traps', 'arena', 'combat', 'audio', 'online-board', 'input', 'story', 'render', 'ui', 'main'
];
const rules = ['config', 'profile', 'upgrades', 'campaign', 'course-data', 'boss-data', 'boss-beats', 'motion', 'runner', 'arena-layout', 'arena-traps', 'arena', 'combat', 'story'];
const idle = {};

function logic(storage = new Map(), files = rules, extra = {}) {
  const environment = vm.createContext({
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    ...extra
  });
  environment.window = environment;
  for (const file of files) vm.runInContext(read('js/' + file + '.js'), environment, { filename: file });
  return { V: environment.VS7, storage };
}

test('the lightweight HTML entry loads each separate JS module in dependency order', () => {
  const html = read('index.html');
  assert.deepEqual([...html.matchAll(/<script src="js\/([^"]+)\.js"><\/script>/g)].map(match => match[1]), modules);
  assert.match(html, /<link rel="stylesheet" href="styles.css">/);
  for (const file of modules) assert.doesNotThrow(() => new vm.Script(read('js/' + file + '.js'), { filename: file }));
});

test('same seed reproduces the map, directions and durations, other seeds vary them', () => {
  const { V } = logic();
  const map = V.generateMap('Tiefsee');
  assert.deepEqual(plain(map), plain(V.generateMap('Tiefsee')));
  assert.notDeepEqual(plain(map), plain(V.generateMap('Asche')));
  assert.ok(map.edges.every(edge => edge.seconds >= 120 && edge.seconds <= 180));
  assert.equal(new Set(map.nodes.map(node => node.id)).size, map.nodes.length);
  assert.equal(new Set(map.edges.map(edge => edge.id)).size, map.edges.length);
});

function visit(V, campaign, graph, route) {
  assert.ok(V.arrive(campaign, graph, route));
  assert.equal(campaign.pending, null, 'travel does not award a perk');
  assert.ok(V.completeNode(campaign, graph, route.to, () => .1));
  assert.ok(V.claimPerk(campaign, campaign.pending.choices[0]));
}

test('all five bosses are reachable over 100 seeds, with the last fight gated by the rift', () => {
  const { V } = logic();
  for (let i = 0; i < 100; i++) {
    const campaign = V.createCampaign('seed-' + i, 'snail');
    const graph = V.generateMap(campaign.seed);
    for (let stage = 1; stage <= 4; stage++) {
      const routes = V.routesFrom(campaign, graph);
      const route = routes.find(item => item.node.tier === stage && item.node.kind === 'arena' && !item.node.optional);
      assert.ok(route, 'stage ' + stage);
      assert.ok(routes.some(item => item.node.tier === stage && item.node.optional));
      assert.ok(!V.edgeVisible(graph.edges.find(edge => edge.b === route.to.replace('-arena', '-side') && edge.hidden), campaign));
      visit(V, campaign, graph, route);
      const choices = V.routesFrom(campaign, graph);
      const tunnel = choices.find(item => item.edge.hidden);
      assert.ok(tunnel && tunnel.node.optional);
      const boss = choices.find(item => item.node.kind === 'boss' && item.node.tier === stage);
      visit(V, campaign, graph, boss);
    }
    assert.ok(!V.routesFrom(campaign, graph).some(route => route.to === graph.final));
    campaign.story.rift = true;
    const final = V.routesFrom(campaign, graph).find(route => route.to === graph.final);
    visit(V, campaign, graph, final);
    assert.equal(campaign.cleared.filter(id => graph.byId[id].kind === 'boss').length, 5);
  }
});

test('arrival survives reload, retreats are real routes and do not clear an encounter', () => {
  const { V, storage } = logic();
  const campaign = V.createCampaign('return', 'otter');
  const graph = V.generateMap(campaign.seed);
  const forward = V.routesFrom(campaign, graph)[0];
  assert.ok(V.arrive(campaign, graph, forward));
  const { V: reopened } = logic(storage);
  const restored = reopened.loadCampaign();
  assert.equal(restored.position, forward.to);
  assert.deepEqual(plain(restored.arrival), plain(campaign.arrival));
  const routes = reopened.routesFrom(restored, graph);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].to, forward.from);
  assert.ok(reopened.arrive(restored, graph, routes[0]));
  assert.equal(restored.arrival, null);
  assert.ok(!restored.cleared.includes(forward.to));
});

test('a saved victory preserves the exact options and grants the same victory only once', () => {
  const { V, storage } = logic();
  const campaign = V.createCampaign('choice', 'snail');
  const graph = V.generateMap(campaign.seed);
  const route = V.routesFrom(campaign, graph)[0];
  assert.ok(V.arrive(campaign, graph, route));
  assert.ok(V.completeNode(campaign, graph, route.to, () => .42));
  const original = plain(campaign.pending.choices);
  assert.equal(V.completeNode(campaign, graph, route.to), false);
  const { V: reopened } = logic(storage);
  const restored = reopened.loadCampaign();
  assert.deepEqual(plain(restored.pending.choices), original);
  assert.equal(reopened.claimPerk(restored, '__proto__'), false);
  assert.ok(reopened.claimPerk(restored, original[0]));
  assert.equal(reopened.claimPerk(restored, original[0]), false);
  assert.equal(reopened.completeNode(restored, graph, route.to), false);
  assert.equal(reopened.loadCampaign().build[original[0]], 1);
  assert.equal(storage.has('vulkanschnegge-v7-demo-v1'), false);
});

test('three original characters and sixteen perks obey rarity, use limits and character filters', () => {
  const { V } = logic();
  assert.deepEqual(Object.keys(V.characters).sort(), ['frog', 'otter', 'snail']);
  assert.equal(V.upgradeCatalogue.length, 16);
  assert.equal(V.canTakePerk('springLegs', {}, 'snail'), false);
  assert.equal(V.canTakePerk('springLegs', { springLegs: 1 }, 'frog'), false);
  assert.equal(V.canTakePerk('springLegs', {}, 'frog'), true);
  const exhausted = Object.fromEntries(V.upgradeCatalogue.map(perk => [perk.id, perk.uses || 20]));
  assert.ok(V.chooseUpgrades(exhausted, 'snail', false).length >= 1);
  function strong(boss) {
    const random = V.randomFor('rarity-test');
    let count = 0;
    for (let i = 0; i < 1600; i++) {
      const offer = V.chooseUpgrades({}, 'snail', boss, random);
      assert.equal(new Set(offer.map(perk => perk.id)).size, offer.length);
      count += offer.filter(perk => perk.tier !== 'common').length;
    }
    return count;
  }
  assert.ok(strong(true) > strong(false) * 1.4);
});

test('test campaign progression leaves the regular save untouched', () => {
  const { V, storage } = logic();
  const regular = V.createCampaign('Tiefsee', 'snail');
  V.saveCampaign(regular);
  const before = [...storage];
  const campaign = V.loadCampaign();
  const graph = V.generateMap(campaign.seed);
  const route = V.routesFrom(campaign, graph)[0];
  V.state = { testMode: true };
  visit(V, campaign, graph, route);
  assert.ok(campaign.cleared.includes(route.to));
  assert.deepEqual([...storage], before);
  V.state.testMode = false;
  V.saveCampaign(campaign);
  assert.equal(V.loadCampaign().position, route.to);
});

test('the campaign build modifies runner, arena and boss consistently on every restart', () => {
  const { V } = logic();
  const campaign = V.createCampaign('build', 'snail');
  const graph = V.generateMap(campaign.seed);
  const route = V.routesFrom(campaign, graph)[0];
  campaign.build = { jump: 2, freehit: 1, snailRage: 1, tinyMode: 1, magnet: 1, hyperMode: 1, turboHunter: 1, coinSpawnBoost: 1, slowMo: 1, gold: 1 };
  V.saveCampaign(campaign);
  const build = V.loadCampaign().build;
  const sections = [
    V.newRunner(route, 'snail', build),
    V.newArena(route.node, 'snail', build, campaign.seed),
    V.newCombat(graph.byId.reef, 'snail', build, campaign.seed),
    V.newRunner(route, 'snail', build)
  ];
  assert.deepEqual(sections.map(section => section.hp), [5, 6, 7, 5]);
  for (const section of sections) {
    assert.equal(section.extraJumps, 2);
    assert.equal(section.player.w, 33);
    assert.equal(section.dashFactor, .7);
    assert.equal(section.multiplier, 1);
    assert.equal(section.magnetRange, 1.75);
    assert.equal(section.inputGrace, .18);
    assert.equal(section.chainDash, true);
    assert.equal(section.strikeBonus, 1);
    assert.equal(section.coinValue, 2);
  }
  assert.deepEqual(plain(sections[0].coins), plain(sections[3].coins));
  const normal = V.newRunner(route, 'snail');
  V.updateRunner(normal, V.rules.step, idle);
  V.updateRunner(sections[0], V.rules.step, idle);
  assert.equal(sections[0].speed, normal.speed);
  assert.equal(V.newRunner(null, 'snail').extraJumps, 0);
  assert.equal(V.newRunner(null, 'otter').magnetRange, 1.2);
});

test('the timed route runs the full active duration and arcade stays endless', () => {
  const { V } = logic();
  const c = V.createCampaign('road', 'snail');
  const route = V.routesFrom(c, V.generateMap(c.seed))[0];
  const s = V.newRunner(route, 'snail', {});
  const arcade = V.newRunner(null, 'snail');
  s.player.invuln = 1e6;
  arcade.player.invuln = 1e6;
  const steps = s.duration / V.rules.step;
  for (let i = 0; i < steps - 1; i++) V.updateRunner(s, V.rules.step, idle);
  assert.equal(s.outcome, null);
  V.updateRunner(s, V.rules.step, idle);
  assert.equal(s.outcome, true);
  assert.equal(s.elapsed, s.duration);
  for (let i = 0; i < 18000; i++) V.updateRunner(arcade, V.rules.step, idle);
  assert.equal(arcade.outcome, null);
  assert.equal(arcade.duration, Infinity);
  assert.ok(arcade.dist > 200000);
  assert.ok(arcade.coins.length < 55 && arcade.obstacles.length < 12 && arcade.platforms.length < 15);
});

test('course spawns stay independent of bonus coins and pruned arrays', () => {
  const { V } = logic();
  const c = V.createCampaign('coins', 'frog');
  const route = V.routesFrom(c, V.generateMap(c.seed))[0];
  const a = V.newRunner(route, 'frog', {});
  const b = V.newRunner(route, 'frog', { coinSpawnBoost: 1 });
  a.dist = b.dist = 7700;
  b.coins = [];
  b.obstacles = [];
  V.updateCourse(a);
  V.updateCourse(b);
  assert.equal(a.spawnCursor.terrain, b.spawnCursor.terrain);
  assert.equal(a.spawnCursor.coins, b.spawnCursor.coins);
  assert.deepEqual(plain(a.platforms), plain(b.platforms));
  const lateCoins = b.coins.filter(coin => coin.worldX > b.dist && !coin.taken && !coin.missed);
  assert.ok(lateCoins.length > 5);
  assert.ok(a.coins.length < b.coins.length);
});

test('runner can dash through a crate, loses on zero HP and handles a platform landing', () => {
  const { V } = logic();
  const s = V.newRunner(null, 'snail');
  const p = s.player;
  s.obstacles = [{ worldX: 0, w: 44, h: 46, fragile: true, dead: false }];
  V.updateRunner(s, V.rules.step, { dash: true });
  assert.equal(s.obstacles[0].dead, true);
  assert.equal(s.hp, 4);
  s.obstacles = [];
  s.platforms = [{ worldX: 0, y: 350, w: 200, h: 18 }];
  p.y = 350 - p.h - 1;
  p.vy = 180;
  p.jumps = 2;
  V.updateRunner(s, V.rules.step, idle);
  assert.equal(p.y + p.h, 350);
  assert.equal(p.jumps, 0);
  s.platforms = [];
  s.obstacles = [{ worldX: s.dist, w: 45, h: 60, fragile: false, dead: false }];
  p.y = V.GROUND - p.h;
  s.hp = 1;
  V.updateRunner(s, V.rules.step, idle);
  assert.equal(s.outcome, false);
});

test('coins score with multiplier and missed coins reset the streak', () => {
  const { V } = logic();
  const s = V.newRunner(null, 'snail');
  s.coins = [];
  V.addCoin(s, 15, s.player.y + 22);
  V.collectCoins(s);
  assert.equal(s.coinsTaken, 1);
  assert.equal(s.score, 10);
  assert.equal(s.multiplier, 2);
  V.addCoin(s, -105, 360);
  V.collectCoins(s);
  assert.equal(s.multiplier, 1);
});

test('an arena dash deals one third of launch speed and contact retains 65 percent of it', () => {
  const { V } = logic();
  const c = V.createCampaign('arena', 'snail');
  const node = V.routesFrom(c, V.generateMap(c.seed))[0].node;
  const s = V.newArena(node, 'snail', {}, c.seed);
  const p = s.player;
  s.enemies = [{ key: 'armored', x: 300, y: V.GROUND - 40, floorY: V.GROUND, w: 51, h: 40, hp: 175, maxHp: 175,
    attackState: 'ready', attackLeft: 10, range: 245, left: 22, right: 400 }];
  p.x = 281;
  p.vx = 300;
  V.updateArena(s, V.rules.step, { dash: true, right: true });
  assert.equal(s.enemies[0].hp, 75);
  assert.equal(p.dashPower, 100);
  assert.equal(s.speed, 195);
  assert.ok(p.vy < 0 && p.airDash);
  assert.equal(s.exitOpen, false);
  Object.assign(p, { x: 281, y: V.GROUND - p.h, vx: 300, vy: 0, dashCooldown: 0 });
  V.updateArena(s, V.rules.step, { dash: true, right: true });
  assert.equal(s.enemies[0].hp, 0);
  assert.equal(s.exitOpen, true);
  assert.equal(s.outcome, null);
  const enemy = s.enemies[0];
  Object.assign(enemy, { hp: 175, touching: false });
  Object.assign(p, { x: 290, y: V.GROUND - p.h, vx: 300, vy: 0, invuln: 0 });
  V.updateArena(s, V.rules.step, idle);
  const slowed = (300 - V.arenaMotion.brake * V.rules.step) * .65;
  assert.equal(p.vx, slowed);
  V.updateArena(s, V.rules.step, idle);
  assert.equal(p.vx, slowed - V.arenaMotion.brake * V.rules.step);
});

test('arena acceleration varies by character without a speed cap and dash distance stays fixed', () => {
  const { V } = logic();
  const node = V.generateMap('momentum').byId['reef-arena'];
  const step = V.rules.step;
  const players = Object.keys(V.characters).map(character => V.newArena(node, character, {}, 'momentum'));
  for (const s of players) {
    s.worldWidth = 1e7;
    for (let i = 0; i < 8; i++) V.movePlayer(s, step, { right: true });
  }
  const [snail, otter, frog] = players.map(s => s.player.vx);
  assert.ok(snail < frog && frog < otter);
  const s = players[1];
  const p = s.player;
  for (let i = 0; i < 240; i++) V.movePlayer(s, step, { right: true });
  const early = p.vx;
  for (let i = 0; i < 480; i++) V.movePlayer(s, step, { right: true });
  assert.ok(p.vx > early && early > V.arenaMotion.run * 2);
  const dash = vx => {
    Object.assign(p, { x: 300, vx, dashCooldown: 0, dashTime: 0, airDash: true });
    V.movePlayer(s, step, { dash: true, right: true });
    let frames = 1;
    while (p.dashLeft > 0 && frames < 30) {
      V.movePlayer(s, step, idle);
      frames++;
    }
    assert.ok(Math.abs(p.x - 300 - V.arenaMotion.dashRange) < 1e-8);
    return frames;
  };
  assert.ok(dash(900) < dash(300));
});

test('movement feedback follows actual dashes and fast ground braking', () => {
  const { V } = logic();
  const calls = [];
  V.audio = { effect: kind => calls.push(kind) };
  const step = V.rules.step;
  const node = V.generateMap('movement-feedback').byId['reef-arena'];
  const setup = vx => {
    const s = V.newArena(node, 'snail', {}, 'movement-feedback');
    Object.assign(s.player, { x: 180, vx });
    return s;
  };
  const buffered = setup(0);
  buffered.player.dashCooldown = .06;
  V.movePlayer(buffered, step, { dash: true });
  assert.deepEqual(calls, []);
  for (let i = 0; i < 6; i++) V.movePlayer(buffered, step, {});
  assert.deepEqual(calls, ['dash']);
  assert.equal(buffered.effects.at(-1).kind, 'dash');

  const fast = setup(-520);
  V.movePlayer(fast, step, { left: true, dash: true });
  assert.equal(fast.effects.at(-1).kind, 'dash-fast');
  assert.equal(fast.effects.at(-1).direction, -1);
  assert.equal(fast.player.dashPower, V.dashDamage(fast, 520));

  const braking = setup(520);
  V.movePlayer(braking, step, { right: true });
  assert.equal(braking.effects.length, 0);
  V.movePlayer(braking, step, { left: true });
  assert.equal(braking.effects.at(-1).kind, 'skid');
  assert.equal(braking.effects.at(-1).direction, 1);
  for (let i = 0; i < 10; i++) V.movePlayer(braking, step, { left: true });
  assert.deepEqual(calls, ['dash', 'dash-fast', 'skid']);
  V.movePlayer(setup(520), step, { left: true, jump: true });
  V.movePlayer(setup(190), step, {});
  assert.deepEqual(calls, ['dash', 'dash-fast', 'skid']);
});

test('mobs scale with zone and travel has progressively faster starts', () => {
  const { V } = logic();
  const graph = V.generateMap('tiers');
  const hp = tier => V.newArena({ ...graph.byId['reef-arena'], tier }, 'snail', {}, 'tiers').enemies;
  assert.ok(hp(1).some(e => e.key === 'crawler' && e.hp === 100));
  assert.ok(hp(4).every(e => e.hp === e.maxHp && e.hp >= 180));
  const starts = [1, 2, 3, 4, 5].map(tier => {
    const edge = graph.edges.find(e => e.tier === tier);
    const s = V.newRunner({ edge, node: graph.byId[edge.b] }, 'otter');
    const start = s.speed;
    V.updateRunner(s, V.rules.step, idle);
    assert.ok(s.speed > start);
    return start;
  });
  assert.deepEqual(starts, [345, 387, 429, 471, 513]);
  assert.equal(V.newRunner(null, 'otter').speed, 345);
});

test('arena routes vary by seed and keep every gap within bidirectional base jump range', () => {
  const { V } = logic();
  for (let index = 0; index < 40; index++) {
    const seed = 'platformer-' + index;
    const graph = V.generateMap(seed);
    for (const node of graph.nodes.filter(item => item.kind === 'arena')) {
      const route = V.generateArena(node, seed);
      assert.deepEqual(plain(route), plain(V.generateArena(node, seed)));
      assert.notDeepEqual(plain(route), plain(V.generateArena(node, seed + '-other')));
      assert.ok(route.worldWidth > V.W * 5);
      const islands = route.platforms.filter(platform => platform.ground);
      assert.equal(islands.length, node.tier >= 3 ? 8 : 7);
      assert.ok(islands.some(island => island.y < V.GROUND - 100));
      assert.ok(islands.some(island => island.y > V.GROUND + 60));
      assert.equal(route.exitY, islands.at(-1).y);
      assert.ok(route.traps.length >= 2 && route.traps.every(trap => trap.kind === node.biome));
      for (const trap of route.traps) {
        assert.ok(islands.slice(1, -1).some(island => island.y === trap.y && trap.x > island.worldX + 140 &&
          trap.x < island.worldX + island.w - 100));
      }
      for (let i = 1; i < route.platforms.length; i++) {
        const from = route.platforms[i - 1];
        const to = route.platforms[i];
        const gap = to.worldX - from.worldX - from.w;
        assert.ok(gap > 0 && gap <= V.arenaJumpGap(from.y, to.y));
      }
    }
  }
});

test('all base characters can single-jump generated platforms in both directions', () => {
  const { V } = logic();
  function cross(s, from, to) {
    const p = s.player;
    const direction = Math.sign(to.worldX - from.worldX);
    const center = to.worldX + (to.w - p.w) / 2;
    Object.assign(p, {
      x: direction > 0 ? from.worldX + from.w - p.w - 9 : from.worldX + 9,
      y: from.y - p.h, vx: 0, vy: 0, grounded: true, jumps: 0
    });
    for (let frame = 0; frame < 110; frame++) {
      const braking = p.vx ** 2 / (2 * 1750);
      const steer = direction * (center - p.x) > braking + 5;
      V.movePlayer(s, V.rules.step, { right: steer && direction > 0, left: steer && direction < 0, jump: frame === 0 });
      if (p.grounded) break;
    }
    assert.ok(p.grounded && Math.abs(p.y + p.h - to.y) < .01 &&
      p.x + p.w / 2 > to.worldX && p.x + p.w / 2 < to.worldX + to.w,
    s.seed + ' ' + s.character + ' from ' + from.worldX + ' to ' + to.worldX);
  }
  for (const seed of ['blue-reef', 'gold-vault', 'pink-stage', 'wreck-storm']) {
    const graph = V.generateMap(seed);
    for (const node of graph.nodes.filter(item => item.kind === 'arena' && !item.optional)) {
      for (const character of Object.keys(V.characters)) {
        const s = V.newArena(node, character, {}, seed);
        for (let i = 1; i < s.platforms.length; i++) {
          cross(s, s.platforms[i - 1], s.platforms[i]);
          cross(s, s.platforms[i], s.platforms[i - 1]);
        }
      }
    }
  }
});

test('the arena exit checks enemies and pits return the player to the last island', () => {
  const { V } = logic();
  const seed = 'exit-test';
  const s = V.newArena(V.generateMap(seed).byId['reef-arena'], 'snail', {}, seed);
  const p = s.player;
  const island = s.platforms.find(platform => platform.ground && platform.worldX > 0);
  p.x = island.worldX + 60;
  p.y = island.y - p.h;
  V.updateArena(s, V.rules.step, idle);
  const checkpoint = s.checkpointX;
  assert.equal(checkpoint, island.worldX + 54);
  assert.equal(s.checkpointY, island.y);
  assert.ok(s.cameraX > 0);
  assert.ok(s.cameraY < V.GROUND - 405);
  p.x = island.worldX + island.w + 15;
  p.y = s.supportY + 302;
  V.updateArena(s, V.rules.step, idle);
  assert.equal(s.hp, s.maxHp - 1);
  assert.equal(p.x, checkpoint);
  assert.equal(p.y + p.h, island.y);
  assert.ok(p.grounded);
  p.x = s.exitX + 5;
  p.y = s.exitY - p.h;
  V.updateArena(s, V.rules.step, idle);
  assert.equal(s.outcome, null);
  for (const enemy of s.enemies) enemy.hp = 0;
  V.updateArena(s, V.rules.step, idle);
  assert.equal(s.outcome, true);
});

test('arena enemies warn, lock direction and execute distinct attacks', () => {
  const { V } = logic();
  const graph = V.generateMap('arena-attacks');
  const step = V.rules.step;
  for (const role of ['crawler', 'jumper', 'armored']) {
    const node = graph.byId[role === 'armored' ? 'reef-side' : 'reef-arena'];
    let arena;
    let enemy;
    for (let attempt = 0; attempt < 12 && !enemy; attempt++) {
      arena = V.newArena(node, 'snail', {}, 'arena-' + attempt);
      enemy = arena.enemies.find(item => item.key === role);
    }
    assert.ok(enemy, role);
    arena.enemies = [enemy];
    arena.traps = [];
    arena.player.x = enemy.x - 110;
    arena.player.y = enemy.floorY - arena.player.h;
    enemy.attackLeft = 0;
    V.updateArena(arena, step, idle);
    assert.equal(enemy.attackState, 'tell', role);
    assert.equal(enemy.facing, -1);
    assert.equal(arena.hp, arena.maxHp);
    const x = enemy.x;
    const target = enemy.targetX;
    arena.player.x = enemy.x + 110;
    let minY = enemy.y;
    for (let frame = 0; frame < 80 && enemy.attackState !== 'recover'; frame++) {
      V.updateArena(arena, step, idle);
      minY = Math.min(minY, enemy.y);
    }
    assert.equal(enemy.attackState, 'recover', role);
    assert.equal(enemy.targetX, target);
    assert.equal(arena.hp, arena.maxHp);
    if (role === 'jumper') assert.ok(minY < enemy.floorY - enemy.h - 80);
    else assert.equal(minY, enemy.floorY - enemy.h);
    if (role === 'armored') {
      assert.equal(enemy.x, x);
      assert.ok(arena.projectiles.some(shot => shot.key === 'surge' && shot.vx < 0));
    } else {
      assert.ok(enemy.x < x - 60);
      assert.equal(arena.projectiles.length, 0);
    }
  }
});

test('biome traps telegraph, use local elevation, and hurt only during activation', () => {
  const { V } = logic(undefined, [...rules, 'assets']);
  const seed = 'hazards';
  const graph = V.generateMap(seed);
  for (const [kind, type] of Object.entries(V.arenaTrapTypes)) {
    const s = V.newArena(graph.byId[kind + '-arena'], 'snail', {}, seed);
    const trap = s.traps[0];
    const p = s.player;
    for (const pose of ['idle', 'active']) {
      const png = fs.readFileSync(path.join(root, V.imagePath('trap-' + kind + '-' + pose)));
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
    p.x = trap.x - p.w / 2;
    p.y = trap.y - type.height - p.h - 100;
    V.updateArenaTraps(s, .1);
    assert.equal(trap.state, 'idle');
    p.y = trap.y - p.h;
    V.updateArenaTraps(s, .1);
    assert.equal(trap.state, 'tell');
    assert.equal(s.hp, s.maxHp);
    p.x = trap.x - 95;
    V.updateArenaTraps(s, type.windup);
    assert.equal(trap.state, 'active');
    assert.equal(s.hp, s.maxHp);
    p.x = trap.x - p.w / 2;
    V.updateArenaTraps(s, .05);
    assert.equal(s.hp, s.maxHp - 1);
    p.invuln = 0;
    V.updateArenaTraps(s, .1);
    assert.equal(s.hp, s.maxHp - 1);
    if (kind === 'vortex') assert.equal(p.vy, -type.launch);
    V.updateArenaTraps(s, type.active);
    assert.equal(trap.state, 'idle');
  }
});

test('a buffered boss dash parries and intercepts projectiles without damaging the boss', () => {
  const { V } = logic();
  const graph = V.generateMap('lunge');
  const step = V.rules.step;
  for (const arena of [false, true]) {
    const s = V.newCombat(graph.byId.reef, 'snail', { turboHunter: 1, hyperMode: 1 }, 'lunge');
    if (arena) V.enterBossArena(s);
    const p = s.player;
    const x = p.x;
    p.dashCooldown = .06;
    V.updateCombat(s, step, { dash: true, right: true });
    assert.equal(p.dashTime, 0);
    for (let i = 0; i < 6; i++) V.updateCombat(s, step, idle);
    assert.ok(p.dashTime > 0 && p.x > x + 20);
    const q = { key: 'plasma', x: p.x + p.w + 18, y: p.y + 22, r: 16, vx: -5, vy: 0 };
    s.projectiles.push(q);
    V.updateCombat(s, step, idle);
    assert.equal(q.reflected, true);
    assert.equal(q.intercepts, 2);
    assert.equal(p.dashCooldown, 0);
    assert.equal(s.effects.at(-1).kind, 'parry');
    assert.equal(s.hitStop, 0);
    for (let i = 0; i < 2; i++) {
      const hostile = { key: 'toxic', x: q.x + 35, y: q.y, r: 17, vx: -500, vy: 0 };
      s.projectiles.push(hostile);
      V.updateCombat(s, step, idle);
      assert.ok(hostile.dead);
      assert.equal(q.intercepts, 1 - i);
      assert.equal(s.effects.at(-1).kind, 'guard');
    }
    assert.equal(s.projectiles.length, 0);
    assert.equal(s.outcome, null);
    assert.equal(s.hp, s.maxHp);
  }
});

test('all five bosses appear on the route and enter the arena without a shield gate', () => {
  const { V } = logic();
  const graph = V.generateMap('boss');
  const step = V.rules.step;
  for (const [id, boss] of Object.entries(V.bosses)) {
    for (const phase of boss.phases) assert.ok(phase.some(key => V.bossAttacks[key].reflect), id);
    const s = V.newCombat(graph.byId[id], 'snail', {}, 'boss');
    assert.ok(s.boss.x > V.W * .7 && s.boss.x < V.W);
    assert.equal(s.boss.stage, 'chase');
    assert.ok(s.platforms.length > 0 && s.obstacles.length > 0);
    s.hp -= 2;
    s.player.invuln = 100;
    let salvos = 0;
    while (s.boss.stage === 'chase' && s.songTime < 26) {
      V.updateCombat(s, step, idle);
      if (s.boss.flash === .14) salvos++;
    }
    assert.ok(salvos >= 2);
    assert.equal(s.boss.stage, 'arena', id);
    assert.ok(s.songTime > 10 && s.songTime < 26);
    assert.ok(s.platforms.length > 2);
    assert.equal(s.outcome, null);
    assert.equal(s.hp, s.maxHp - 2);
  }
});

test('the measured beat grid drives warnings and progressively denser salvos for the whole song', () => {
  const { V } = logic();
  const graph = V.generateMap('beats');
  const step = V.rules.step;
  for (const id of Object.keys(V.bosses)) {
    const rhythm = V.bossRhythms[id];
    assert.ok(rhythm.beats.length > 300 && rhythm.beats.at(-1) / 1000 < rhythm.duration);
    assert.ok(rhythm.beats.every((beat, i) => !i || beat > rhythm.beats[i - 1]));
    const s = V.newCombat(graph.byId[id], 'snail', {}, 'beats');
    V.enterBossArena(s);
    s.player.invuln = 500;
    const counts = [0, 0, 0];
    const fans = [0, 0, 0];
    while (s.outcome === null) {
      const { cue, tell } = s.boss;
      V.updateCombat(s, step, idle);
      if (s.boss.flash !== .14) continue;
      assert.ok(tell && cue);
      assert.equal(rhythm.beats[cue.beat] / 1000, cue.at);
      assert.ok(s.songTime >= cue.at - 1e-7 && s.songTime - cue.at <= step + 1e-7);
      counts[cue.phase]++;
      const attack = V.bossAttacks[cue.key];
      if (!attack.zone && !attack.wind) fans[cue.phase] = Math.max(fans[cue.phase], (attack.fan || 1) + cue.phase);
      assert.ok(s.projectiles.length < 22, id);
    }
    assert.ok(counts[0] < counts[1] && counts[1] < counts[2], id);
    assert.ok(fans[0] < fans[2], id);
    assert.equal(s.outcome, true);
    assert.equal(s.songTime, rhythm.duration);
  }
});

test('a stalled boss song holds the cues, the live end wins, and a loss stays a loss', () => {
  const { V } = logic();
  const s = V.newCombat(V.generateMap('clock').byId.reef, 'snail', {}, 'clock');
  const tick = (time, ended = false) => V.updateCombat(s, V.rules.step, idle, { time, duration: 207, ended });
  const cue = s.boss.cue;
  for (let i = 0; i < 160; i++) tick(cue.warningAt - .1);
  assert.equal(s.boss.tell, null);
  tick(cue.warningAt);
  assert.equal(s.boss.tell.key, cue.key);
  tick(cue.at);
  assert.ok(s.projectiles.length);
  tick(207);
  assert.equal(s.outcome, null);
  tick(207, true);
  assert.equal(s.outcome, true);
  const losing = V.newCombat(s.node, 'snail', {}, 'clock');
  losing.hp = 1;
  V.hurt(losing);
  V.updateCombat(losing, V.rules.step, idle, { time: 207, duration: 207, ended: true });
  assert.equal(losing.outcome, false);
});

test('boss arenas patrol between cues and lock the salvo direction during a warning', () => {
  const { V } = logic();
  const graph = V.generateMap('patrol');
  for (const id of Object.keys(V.bosses)) {
    const s = V.newCombat(graph.byId[id], 'snail', {}, 'patrol');
    V.enterBossArena(s);
    const b = s.boss;
    s.player.invuln = 100;
    const stops = new Set();
    let lift = 0;
    for (let i = 0; i < 2300; i++) {
      const lastTell = b.tell;
      const lastX = b.x;
      const lastY = b.y;
      V.updateCombat(s, V.rules.step, { right: i % 140 < 70, left: i % 140 >= 70 });
      assert.ok(b.x >= 0 && b.x + b.w <= s.worldWidth);
      lift = Math.max(lift, V.GROUND - (b.y + b.h));
      if (lastTell && b.tell === lastTell) {
        assert.equal(b.x, lastX, id);
        assert.equal(b.y, lastY, id);
      }
      if (b.flash === .14) stops.add(b.x);
    }
    assert.ok(stops.size >= 3, id);
    if (id === 'diva' || id === 'god') assert.ok(lift > 80, id);
    if (id === 'greed') assert.equal(lift, 0, id);
  }
});

test('the Trawler telegraphs its floor wave and jumping clears its damage zone', () => {
  const { V } = logic();
  const node = V.generateMap('flood').byId.greed;
  const step = V.rules.step;
  for (const arena of [false, true]) {
    for (const jump of [false, true]) {
      const s = V.newCombat(node, 'snail', {}, 'flood');
      if (arena) V.enterBossArena(s);
      s.boss.cue = { key: 'wave', warningAt: .08, at: 1.2, beat: 2, phase: 0 };
      for (let i = 0; i < 55; i++) V.updateCombat(s, step, idle);
      assert.equal(s.boss.tell.key, 'wave');
      assert.equal(s.boss.tell.width, arena ? s.worldWidth : V.W);
      assert.equal(s.hp, s.maxHp);
      for (let i = 55; i < 87; i++) V.updateCombat(s, step, { jump: jump && i === 61 });
      assert.equal(s.hp, s.maxHp - Number(!jump));
    }
  }
});

test('toxic shots hurt instead of reflecting and a spotlight has a dodgeable lane', () => {
  const { V } = logic();
  const map = V.generateMap('danger');
  const eel = V.newCombat(map.byId.reef, 'snail', {}, 'danger');
  const p = eel.player;
  eel.projectiles.push({ key: 'toxic', x: p.x + 27, y: p.y + 22, r: 17, vx: -310, vy: 0 });
  V.updateCombat(eel, V.rules.step, { dash: true });
  assert.equal(eel.hp, eel.maxHp - 1);
  assert.equal(eel.effects.at(-1).kind, 'hurt');
  V.hurt(eel);
  assert.equal(eel.effects.filter(effect => effect.kind === 'hurt').length, 1);
  const diva = V.newCombat(map.byId.diva, 'snail', {}, 'danger');
  diva.projectiles.push({ key: 'spotlight', x: diva.player.x, w: 84, zone: true, life: .3 });
  diva.player.x = 108;
  V.updateCombat(diva, V.rules.step, idle);
  assert.equal(diva.hp, diva.maxHp);
});

test('all supplied media are mapped to their scenes and packaged for offline playback', () => {
  const { V } = logic(undefined, ['config', 'assets', 'boss-data', 'story']);
  assert.equal(V.bosses.reef.track, 'reef-tax');
  assert.equal(V.bosses.greed.track, 'a-little-more');
  assert.equal(V.bosses.diva.track, 'pretty-things');
  assert.equal(V.bosses.vortex.track, 'one-more-wreck');
  assert.equal(V.bosses.god.track, 'run-the-loop');
  assert.equal(V.stories.source.track, 'i-am-the-source');
  assert.equal(V.stories.credits.track, 'home-at-last');
  assert.equal(V.stories.intro.slides.length, 5);
  const introArt = ['constellations.webp', 'logo.png'];
  for (const file of introArt) {
    assert.ok(read('index.html').includes('assets/images/intro/' + file));
    assert.ok(fs.statSync(path.join(root, 'assets/images/intro', file)).size > 1000);
  }
  for (const track of Object.values(V.soundtracks)) {
    const target = path.join(root, 'assets/music', track.file);
    if (!fs.existsSync(target)) {
      assert.notEqual(process.env.REQUIRE_OFFLINE_MEDIA, '1', 'missing ' + track.file);
      continue;
    }
    const data = fs.readFileSync(target);
    assert.ok(data.subarray(0, 3).toString() === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224), track.file);
  }
  for (const id of ['snail', 'otter', 'frog', 'bossEel', 'platform', 'plasma', 'toxic', 'mine', 'crate', 'atlas']) {
    assert.ok(fs.statSync(path.join(root, V.imagePath(id))).size > 1000, id);
  }
  const slides = Object.values(V.stories).flatMap(story => story.slides);
  const artwork = [
    ...slides.map(slide => {
      assert.ok(slide.alt, slide.art);
      return V.imagePath('story-' + slide.art);
    }),
    ...['harbor', 'reef', 'greed', 'diva', 'vortex', 'god'].map(place => V.imagePath('map-' + place)),
    ...Array.from(read('index.html').matchAll(/src="(assets\/images\/story\/[^"]+\.webp)"/g), match => match[1])
  ];
  assert.equal(new Set(artwork).size, artwork.length);
  for (const file of artwork) {
    const data = fs.readFileSync(path.join(root, file));
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', file);
  }
  for (const id of Object.keys(V.bosses)) {
    const data = fs.readFileSync(path.join(root, V.imagePath('boss-intro-' + id)));
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', id);
  }
  for (const kind of ['hit', 'hurt', 'guard', 'parry']) {
    const sprite = fs.readFileSync(path.join(root, V.imagePath('impact-' + kind)));
    const sound = fs.readFileSync(path.join(root, 'assets/sfx', kind + '.wav'));
    assert.equal(sprite.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', kind);
    assert.equal(sound.toString('ascii', 8, 12), 'WAVE', kind);
  }
  for (const kind of ['dash', 'dash-fast', 'skid']) {
    const sprite = fs.readFileSync(path.join(root, V.imagePath('movement-' + kind)));
    const sound = fs.readFileSync(path.join(root, 'assets/sfx', kind + '.wav'));
    assert.equal(sprite.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', kind);
    assert.equal(sound.toString('ascii', 8, 12), 'WAVE', kind);
  }
});

test('the biome spritepack covers arena roles, projectiles, platforms and map landmarks', () => {
  const { V } = logic(undefined, [...rules, 'assets']);
  const pngHeader = '89504e470d0a1a0a';
  const spriteIds = [];
  for (const biome of ['reef', 'greed', 'diva', 'vortex']) {
    for (const role of ['crawler', 'jumper', 'armored']) spriteIds.push(biome + '-' + role);
    spriteIds.push('platform-' + biome, 'landmark-' + biome, 'ground-' + biome);
  }
  spriteIds.push('landmark-god', 'platform-god', 'coin', 'exit-closed', 'exit-open');
  for (const [id, attack] of Object.entries(V.bossAttacks)) {
    if (!attack.zone && !attack.wind) spriteIds.push(attack.sprite ?? id);
  }
  assert.equal(new Set(spriteIds.map(id => V.imagePath(id))).size, 40);
  for (const id of spriteIds) {
    const png = fs.readFileSync(path.join(root, V.imagePath(id)));
    assert.equal(png.subarray(0, 8).toString('hex'), pngHeader, id);
  }
  const graph = V.generateMap('Tiefsee');
  const harbor = V.newArena(graph.byId['reef-side'], 'snail', {}, 'Tiefsee');
  assert.equal(harbor.enemies.filter(enemy => enemy.key === 'armored').length, 1);
});

function audioFixture() {
  const players = [];
  const listeners = {};
  class FakeAudio {
    constructor() { this.paused = true; this.readyState = 1; this.currentTime = 0; this.events = {}; players.push(this); }
    addEventListener(key, listener) { this.events[key] = listener; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const document = { hidden: false, addEventListener(key, listener) { listeners[key] = listener; } };
  const { V } = logic(undefined, ['config', 'assets', 'audio'], { Audio: FakeAudio, document });
  return { audio: V.audio, document, listeners, players };
}

test('endless audio loads lazily and crossfades after both speed thresholds', () => {
  const { audio, players } = audioFixture();
  assert.equal(players.length, 0);
  audio.startLevel('arcade');
  audio.tick(.6);
  assert.equal(players.length, 1);
  assert.ok(players[0].volume > 0);
  audio.updateRunner(650, 27.99);
  assert.equal(audio.current(), 'slow');
  audio.updateRunner(650, .02);
  assert.equal(audio.current(), 'mid');
  audio.tick(1.2);
  assert.ok(players[0].paused);
  audio.updateRunner(650, 36);
  assert.equal(audio.current(), 'mid');
  audio.updateRunner(650, 2);
  assert.equal(audio.current(), 'fast');
});

test('campaign music follows progression zones and stays locked at any speed', () => {
  const { V } = logic();
  const { audio } = audioFixture();
  for (const seed of ['Tiefsee', 'Asche']) {
    const graph = V.generateMap(seed);
    for (const node of graph.nodes.filter(node => node.kind === 'arena' || node.id === graph.final)) {
      const track = ['slow', 'mid', 'mid', 'fast', 'fast'][node.tier - 1];
      assert.equal(node.music, track);
      for (const mode of ['travel', 'arena']) {
        audio.startLevel(mode, node.music);
        audio.updateRunner(1000, 200);
        audio.updateRunner(150, 200);
        assert.equal(audio.current(), track);
      }
    }
  }
  audio.startLevel('boss', 'reef-tax');
  audio.updateRunner(1000, 200);
  assert.equal(audio.current(), 'reef-tax');
});

test('leaving a scene revokes playback across tab changes and later starts restore it', () => {
  const { audio, document, listeners, players } = audioFixture();
  audio.startLevel('boss', 'one-more-wreck');
  audio.tick(1.1);
  document.hidden = true;
  listeners.visibilitychange();
  assert.ok(players[0].paused);
  document.hidden = false;
  listeners.visibilitychange();
  assert.ok(!players[0].paused);
  audio.stop();
  listeners.visibilitychange();
  assert.ok(players.every(player => player.paused));
  audio.setEnabled(false);
  audio.setEnabled(true);
  assert.ok(players.every(player => player.paused));
  audio.startLevel('story', 'home-at-last');
  assert.equal(players[1].loop, false);
  assert.ok(!players[1].paused);
});

test('title and atlas share the menu song playhead, while the credits play once', async () => {
  const { audio, players } = audioFixture();
  assert.equal(await audio.startMenu(), true);
  assert.equal(audio.current(), 'home-at-last');
  assert.equal(players.length, 1);
  const song = players[0];
  assert.ok(song.loop);
  assert.equal(song.preload, 'auto');
  assert.equal(song.volume, .30);
  song.currentTime = 18;
  assert.equal(await audio.startMenu(), true);
  assert.equal(song.currentTime, 18);
  assert.ok(!song.paused);

  song.pause();
  assert.equal(await audio.startMenu(), true);
  assert.equal(song.currentTime, 18);
  audio.startLevel('story', 'home-at-last');
  assert.equal(song.currentTime, 0);
  assert.equal(song.loop, false);
});

test('missing boss track falls back to a built-in runner loop', () => {
  const { audio, players } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  players[0].events.error();
  assert.equal(audio.current(), 'mid');
  assert.ok(players[1].src.endsWith('into-the-deep-mid.mp3'));
  assert.ok(players[1].loop);
  assert.equal(audio.bossClock(10), null);
});

test('boss tracks play once and mute without stopping or rewinding the encounter clock', () => {
  const { audio, players, document, listeners } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  const track = players[0];
  assert.equal(track.loop, false);
  assert.ok(track.volume > 0);
  track.readyState = 4;
  track.duration = 206.36;
  track.currentTime = 3;
  assert.equal(audio.bossClock(3).time, 3);
  audio.setEnabled(false);
  assert.equal(track.paused, false);
  assert.equal(track.muted, true);
  assert.equal(track.volume, 0);
  track.currentTime = 4;
  assert.equal(audio.bossClock(4).time, 4);
  document.hidden = true;
  listeners.visibilitychange();
  assert.ok(track.paused);
  document.hidden = false;
  listeners.visibilitychange();
  assert.ok(!track.paused);
  audio.setEnabled(true);
  audio.tick(.1);
  assert.equal(track.muted, false);
  assert.ok(track.volume > 0);
  assert.equal(audio.bossClock(5).time, 5, 'late audio playback joins the encounter');
  track.currentTime = track.duration;
  track.ended = track.paused = true;
  assert.equal(audio.bossClock(5).ended, true);
  audio.stop();
  assert.equal(audio.bossClock(5), null);
});

test('hit sounds use a bounded pool, play with music muted and stop when effects are muted', () => {
  const { audio, players, document, listeners } = audioFixture();
  audio.effect('hit');
  assert.equal(players.length, 0);
  audio.startLevel('arena');
  audio.setEnabled(false);
  for (let i = 0; i < 9; i++) audio.effect('hit', true);
  assert.equal(players.length, 3);
  assert.ok(players[0].paused);
  assert.ok(players.slice(1).every(player => !player.paused && player.src === 'assets/sfx/hit.wav'));
  assert.equal(players[2].playbackRate, .82);
  audio.effect('hurt');
  assert.equal(players[3].src, 'assets/sfx/hurt.wav');
  assert.equal(players[3].playbackRate, 1);
  audio.setEffectsEnabled(false);
  audio.effect('parry');
  assert.equal(players.length, 4);
  assert.ok(players.every(player => player.paused));
  audio.setEffectsEnabled(true);
  audio.effect('guard');
  audio.effect('dash-fast');
  audio.effect('skid');
  assert.ok(players.at(-2).src.endsWith('/dash-fast.wav'));
  assert.ok(players.at(-1).src.endsWith('/skid.wav'));
  document.hidden = true;
  listeners.visibilitychange();
  assert.ok(players.every(player => player.paused));
});

test('leaving a scene immediately stops active sound effects', () => {
  const { audio, players } = audioFixture();
  audio.startLevel('arena');
  audio.effect('hit');
  assert.equal(players.length, 2);
  assert.ok(!players[1].paused);
  audio.stop();
  assert.ok(players.every(player => player.paused));
  audio.startLevel('boss', 'reef-tax');
  audio.effect('dash');
  assert.ok(!players.at(-1).paused);
  audio.startLevel('story', 'home-at-last');
  assert.ok(players.filter(player => player.src?.endsWith('.wav')).every(player => player.paused));
});

test('profile scores retain player name, run character, date and separate storage', () => {
  const { V, storage } = logic();
  V.profile.name = 'Testspieler';
  V.profile.character = 'otter';
  V.recordRun('arena', { character: 'frog', score: 525.9, coinsTaken: 15 });
  assert.equal(V.records[0].name, 'Testspieler');
  assert.equal(V.records[0].character, 'frog');
  assert.equal(V.records[0].score, 525);
  assert.match(V.records[0].time, /^\d{4}-\d\d-\d\d$/);
  assert.equal(storage.size, 1);
});

test('online board can retry a transient script failure and reads only scores', async () => {
  let appended = 0;
  let reads = 0;
  const env = { queueMicrotask };
  env.window = env;
  env.VS7 = {};
  env.document = {
    createElement: () => ({}),
    head: { appendChild(tag) {
      appended++;
      queueMicrotask(() => {
        if (appended === 1) return tag.onerror();
        if (tag.src.includes('firestore')) env.firebase = {
          apps: [], initializeApp() { this.apps.push({}); },
          firestore: () => ({ collection(name) {
            assert.equal(name, 'scores');
            return { orderBy: () => ({ limit: () => ({ get: async () => { reads++; return { docs: [] }; } }) }) };
          } })
        };
        tag.onload();
      });
    } }
  };
  vm.runInNewContext(read('js/online-board.js'), env);
  await assert.rejects(env.VS7.loadLegacyLeaderboard());
  assert.deepEqual(plain(await env.VS7.loadLegacyLeaderboard()), []);
  assert.equal(appended, 3);
  assert.equal(reads, 1);
});
