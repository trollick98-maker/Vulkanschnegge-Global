const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const modules = [
  'config', 'assets', 'profile', 'upgrades', 'campaign', 'course-data', 'boss-data',
  'motion', 'runner', 'arena', 'combat', 'audio', 'online-board', 'input', 'story', 'render', 'ui', 'main'
];
const rules = ['config', 'profile', 'upgrades', 'campaign', 'course-data', 'boss-data', 'motion', 'runner', 'arena', 'combat', 'story'];
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

test('normal arena dashes reward momentum and use the original rebound loop', () => {
  const { V } = logic();
  const c = V.createCampaign('arena', 'snail');
  const node = V.routesFrom(c, V.generateMap(c.seed))[0].node;
  const s = V.newArena(node, 'snail', {}, c.seed);
  const p = s.player;
  s.enemies = [{ key: 'armored', x: 300, y: V.GROUND - 40, w: 51, h: 40, hp: 2,
    attackState: 'ready', attackLeft: 10, range: 245 }];
  p.x = 281;
  p.vx = 245;
  V.updateArena(s, V.rules.step, { dash: true, right: true });
  assert.equal(s.enemies[0].hp, 0);
  assert.equal(p.dashPower, 2);
  assert.ok(p.vy < 0 && p.airDash);
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
    arena.player.x = enemy.x - 110;
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
    if (role === 'jumper') assert.ok(minY < V.GROUND - enemy.h - 80);
    else assert.equal(minY, V.GROUND - enemy.h);
    if (role === 'armored') {
      assert.equal(enemy.x, x);
      assert.ok(arena.projectiles.some(shot => shot.key === 'surge' && shot.vx < 0));
    } else {
      assert.ok(enemy.x < x - 60);
      assert.equal(arena.projectiles.length, 0);
    }
  }
});

test('boss dash remembers a slightly early input, lunges and delivers the counter perk', () => {
  const { V } = logic();
  const graph = V.generateMap('lunge');
  const s = V.newCombat(graph.byId.reef, 'snail', { turboHunter: 1, hyperMode: 1 }, 'lunge');
  const p = s.player;
  const b = s.boss;
  const step = V.rules.step;
  const x = p.x;
  p.dashCooldown = .06;
  V.updateCombat(s, step, { dash: true });
  assert.equal(p.dashTime, 0);
  for (let i = 0; i < 6; i++) V.updateCombat(s, step, idle);
  assert.ok(p.dashTime > 0 && p.x > x + 20);
  const q = { key: 'plasma', x: p.x + p.w + 18, y: p.y + 22, r: 16, vx: -5 };
  s.projectiles.push(q);
  V.updateCombat(s, step, idle);
  assert.equal(q.reflected, true);
  assert.equal(p.dashCooldown, 0);
  assert.ok(s.hitStop > 0 && s.effects.length > 0);
  q.x = b.x;
  V.updateCombat(s, step, idle);
  assert.equal(b.hp, b.maxHp - 2);
});

test('every boss scrolls, telegraphs and provides a counter in every phase', () => {
  const { V } = logic();
  const graph = V.generateMap('boss');
  for (const [id, boss] of Object.entries(V.bosses)) {
    for (const phase of boss.phases) assert.ok(phase.some(key => V.bossAttacks[key].reflect), id);
    const s = V.newCombat(graph.byId[id], 'snail', {}, 'boss');
    const x = s.boss.x;
    s.player.invuln = 100;
    let telegraphs = 0;
    for (let i = 0; i < 900; i++) {
      V.updateCombat(s, V.rules.step, idle);
      if (s.boss.tell) telegraphs++;
    }
    assert.equal(s.boss.x, x);
    assert.ok(s.boss.x > V.W * .7);
    assert.ok(s.dist > 4000 && s.platforms.length > 0 && s.obstacles.length > 0);
    assert.ok(s.boss.attacks > 5 && telegraphs > 100);
    assert.ok(s.projectiles.length < 16);
  }
});

test('timed dash returns each boss counter and completes the fight on the last hit', () => {
  const { V } = logic();
  const graph = V.generateMap('counter');
  for (const [id, boss] of Object.entries(V.bosses)) {
    const s = V.newCombat(graph.byId[id], 'snail', {}, 'counter');
    const p = s.player;
    const b = s.boss;
    b.wait = 100;
    b.hp = 1;
    const key = boss.phases[0].find(attack => V.bossAttacks[attack].reflect);
    const q = { key, x: p.x + 28, y: p.y + 22, r: V.bossAttacks[key].radius, vx: -410, reflected: false, dead: false };
    s.projectiles.push(q);
    V.updateCombat(s, V.rules.step, { dash: true });
    assert.ok(q.reflected, id);
    for (let i = 0; i < 50 && s.outcome === null; i++) V.updateCombat(s, V.rules.step, idle);
    assert.equal(s.outcome, true, id);
    assert.equal(s.hp, s.maxHp);
  }
});

test('toxic shots hurt instead of reflecting and a spotlight has a dodgeable lane', () => {
  const { V } = logic();
  const map = V.generateMap('danger');
  const eel = V.newCombat(map.byId.reef, 'snail', {}, 'danger');
  const p = eel.player;
  eel.projectiles.push({ key: 'toxic', x: p.x + 27, y: p.y + 22, r: 17, vx: -310 });
  V.updateCombat(eel, V.rules.step, { dash: true });
  assert.equal(eel.hp, eel.maxHp - 1);
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
});

test('the biome spritepack covers arena roles, projectiles, platforms and map landmarks', () => {
  const { V } = logic(undefined, [...rules, 'assets']);
  const pngHeader = '89504e470d0a1a0a';
  const spriteIds = [];
  for (const biome of ['reef', 'greed', 'diva', 'vortex']) {
    for (const role of ['crawler', 'jumper', 'armored']) spriteIds.push(biome + '-' + role);
    spriteIds.push('platform-' + biome, 'landmark-' + biome);
  }
  spriteIds.push('landmark-god');
  for (const [id, attack] of Object.entries(V.bossAttacks)) {
    if (!attack.zone && !attack.wind) spriteIds.push(attack.sprite ?? id);
  }
  assert.equal(new Set(spriteIds.map(id => V.imagePath(id))).size, 32);
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

test('missing boss track falls back to a built-in runner loop', () => {
  const { audio, players } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  players[0].events.error();
  assert.equal(audio.current(), 'mid');
  assert.ok(players[1].src.endsWith('into-the-deep-mid.mp3'));
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
