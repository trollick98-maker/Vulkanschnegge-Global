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
  'weapons', 'shop', 'surge-art', 'particles', 'motion', 'runner', 'arena-layout', 'arena-traps', 'arena', 'boss-stage', 'boss-arena', 'combat', 'boss-chase', 'audio', 'online-board', 'input', 'story', 'camera', 'render', 'ui', 'main'
];
const rules = ['config', 'profile', 'upgrades', 'campaign', 'course-data', 'boss-data', 'boss-beats', 'weapons', 'shop', 'surge-art', 'particles', 'motion', 'runner', 'arena-layout', 'arena-traps', 'arena', 'boss-stage', 'boss-arena', 'combat', 'boss-chase', 'story'];
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

test('opening camera cues yield to input and follow the reduced-motion setting', () => {
  const preference = { matches: false };
  const { V } = logic(undefined, ['config', 'camera'], { matchMedia: () => preference });
  for (const kind of ['travel', 'arena', 'arcade', 'boss-chase', 'boss']) {
    const s = { kind, elapsed: 0, cameraX: 60, cameraY: 10 };
    V.startCameraCue(s);
    assert.ok(V.cameraView(s).zoom > 1, kind);
    V.updateCameraCue(s, .10, { dashQueued: true });
    assert.ok(V.cameraView(s).alpha > 0, kind);
    V.updateCameraCue(s, .19, {});
    assert.equal(V.cameraView(s), null, kind);
    assert.equal(s.elapsed, 0);
    assert.equal(s.cameraX, 60);
    assert.equal(s.cameraY, 10);
    V.startCameraCue(s);
    V.updateCameraCue(s, 2, {});
    assert.equal(V.cameraView(s), null, kind);
  }
  const boss = { kind: 'boss' };
  V.startCameraCue(boss);
  V.updateCameraCue(boss, .73, {});
  assert.equal(V.cameraView(boss), null, 'the camera settles before the first boss windup');
  V.startCameraCue(boss);
  preference.matches = true;
  assert.equal(V.cameraView(boss), null);
  V.updateCameraCue(boss, 0, {});
  V.startCameraCue(boss);
  assert.equal(boss.cameraCue, null);
});

test('cinematic art maps every new sprite and every story shot to an offline asset', () => {
  const { V } = logic(undefined, ['config', 'assets', 'story']);
  const biomes = ['reef', 'greed', 'diva', 'vortex', 'god'];
  const props = Object.values(V.sceneryProps).flat();
  const effects = [...Object.values(V.regionalEffects).flat(), 'ember-streak'];
  assert.equal(new Set(props).size, 16);
  assert.equal(new Set(effects).size, 16);
  for (const key of [...props.map(name => 'scenery-' + name), ...effects.map(name => 'ambient-fx-' + name)]) {
    const png = fs.readFileSync(path.join(root, V.imagePath(key)));
    assert.equal(png[25], 6, key);
  }
  for (const biome of biomes) assert.ok(fs.existsSync(path.join(root, V.imagePath('panorama-' + biome))), biome);
  for (const { slides } of Object.values(V.stories)) {
    for (const slide of slides) {
      assert.ok(V.storyShots[slide.art], slide.art);
      assert.ok(fs.existsSync(path.join(root, V.imagePath('story-' + slide.art))), slide.art);
    }
  }
});

test('level clear uses the regional art, with a separate image for each boss and chase preload', () => {
  const { V } = logic(undefined, ['config', 'assets', 'story']);
  const art = new Set();
  for (const biome of ['reef', 'greed', 'diva', 'vortex', 'god']) {
    const key = V.clearArt({ biome, boss: {} });
    assert.equal(V.clearArt({ biome, chase: {} }), key);
    assert.equal(key, 'boss-' + biome);
    art.add(key);
    if (biome !== 'god') art.add(V.clearArt({ biome }));
  }
  assert.equal(art.size, 9);
  for (const key of art) {
    assert.equal(V.clearShots[key].length, 6);
    const webp = fs.readFileSync(path.join(root, V.imagePath('clear-' + key)));
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  }
  for (const kind of ['travel', 'arena', 'boss', 'finale']) {
    const wave = fs.readFileSync(path.join(root, 'assets/sfx/clear-' + kind + '.wav'));
    assert.equal(wave.toString('ascii', 8, 12), 'WAVE');
  }
});

test('GOD.EXE ships three aligned transparent forms and two phase cues', () => {
  const { V } = logic(undefined, ['config', 'assets']);
  assert.deepEqual(plain(V.godForms), ['god-echo', 'god-overwrite', 'god-panic']);
  const frames = V.godForms.map(name => fs.readFileSync(path.join(root, V.imagePath(name))));
  assert.ok(frames.every(png => png.readUInt32BE(16) === 192 && png.readUInt32BE(20) === 144 && png[25] === 6));
  assert.equal(new Set(frames.map(png => png.toString('base64'))).size, 3);
  for (const cue of ['god-morph', 'god-collapse']) {
    const wave = fs.readFileSync(path.join(root, 'assets/sfx/' + cue + '.wav'));
    assert.equal(wave.toString('ascii', 8, 12), 'WAVE');
  }
});

test('the six surge atlases contain 50 transparent sprites with valid source frames', () => {
  const { V } = logic(undefined, ['config', 'assets', 'surge-art']);
  let sprites = 0;
  for (const [key, frames] of Object.entries(V.surgeFrames)) {
    assert.equal(frames.length, key === 'action' ? 5 : 9, key);
    sprites += frames.length;
    const png = fs.readFileSync(path.join(root, V.imagePath('surge-atlas-' + key)));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', key);
    assert.equal(png.readUInt32BE(16), 3 * V.surgeCell, key);
    assert.equal(png.readUInt32BE(20), Math.ceil(frames.length / 3) * V.surgeCell, key);
    assert.equal(png[25], 6, key); // RGBA
    for (const [w, h] of frames) assert.ok(w > 0 && h > 0 && w <= V.surgeCell && h <= V.surgeCell, key);
  }
  assert.equal(sprites, 50);
});

test('particle bursts use regional frames, stay bounded and honor reduced motion', () => {
  const preference = { matches: false };
  const { V } = logic(undefined, rules, { matchMedia: () => preference });
  const node = V.generateMap('particles').byId.diva;
  const s = V.newCombat(node, 'snail', {}, 'particles');
  const reference = V.newCombat(node, 'snail', {}, 'particles');
  V.hitFeedback(s, 'hurt', 150, 300, { amount: 1, heavy: true });
  assert.ok(s.particles.some(p => p.atlas === 'action' && p.frame === 4));
  assert.ok(s.particles.some(p => p.ring));
  for (let i = 0; i < 20; i++) V.emitParticles(s, 'defeat', 200, 300);
  assert.equal(s.particles.length, V.particleLimit);
  assert.deepEqual([...new Set(s.particles.filter(p => p.atlas === 'diva').map(p => p.frame))].sort(), [6, 7, 8]);
  assert.equal(s.boss.random(), reference.boss.random(), 'cosmetic particles preserve the fight RNG');
  V.tickParticles(s, 1.2);
  assert.ok(s.particles.length > 0 && s.particles.every(p => p.background));
  preference.matches = true;
  V.tickParticles(s, .016);
  V.hitFeedback(s, 'hit', 150, 300, { amount: 160 });
  assert.equal(s.particles.length, 0);
  assert.ok(s.effects.some(effect => effect.amount === 160), 'damage number remains readable');
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

test('shared keyboard and touch bindings stay held until the last source releases', () => {
  const win = new EventTarget();
  const right = new EventTarget();
  right.dataset = { key: 'right' };
  right.setPointerCapture = () => {};
  const { V } = logic(undefined, ['config', 'input'], {
    addEventListener: win.addEventListener.bind(win),
    document: { querySelectorAll: () => [right] }
  });
  V.state = { mode: 'play' };
  const key = (type, code) => win.dispatchEvent(Object.assign(new Event(type), { code }));
  const touch = (type, pointerId) => right.dispatchEvent(Object.assign(new Event(type), { pointerId }));
  key('keydown', 'KeyD');
  key('keydown', 'ArrowRight');
  key('keyup', 'KeyD');
  assert.equal(V.input.consume().right, true);
  touch('pointerdown', 1);
  touch('pointerdown', 2);
  key('keyup', 'ArrowRight');
  touch('pointerup', 1);
  assert.equal(V.input.consume().right, true);
  touch('pointercancel', 2);
  assert.equal(V.input.consume().right, false);
  key('keydown', 'Space');
  key('keydown', 'KeyW');
  assert.equal(V.input.consume().jump, true);
  key('keyup', 'Space');
  assert.equal(V.input.consume().jump, false);
  win.dispatchEvent(new Event('blur'));
  assert.equal(V.input.jump, false);
  for (const code of ['KeyJ', 'KeyX']) {
    key('keydown', code);
    assert.equal(V.input.consume().dash, true, code);
    assert.equal(V.input.consume().dash, false, code);
    key('keyup', code);
  }
  key('keydown', 'ShiftLeft');
  key('keydown', 'ShiftRight');
  assert.equal(V.input.consume().dash, false);
});

test('campaign coin rewards are banked on successful route and combat completion', () => {
  const { V } = logic();
  const campaign = V.createCampaign('shop-payout', 'snail');
  const graph = V.generateMap(campaign.seed);
  const route = V.routesFrom(campaign, graph)[0];
  assert.equal(V.sectionPayout({ kind: 'arcade', outcome: true, coinsTaken: 150 }), 0);
  assert.equal(V.sectionPayout({ kind: 'travel', outcome: false, coinsTaken: 150 }), 0);
  assert.ok(V.arrive(campaign, graph, route, V.sectionPayout({ kind: 'travel', outcome: true, coinsTaken: 12 })));
  assert.equal(campaign.coins, 32);
  assert.ok(V.completeNode(campaign, graph, route.to, () => .2, { coins: 45 }));
  assert.equal(V.completeNode(campaign, graph, route.to, () => .2, { coins: 45 }), false);
  assert.equal(campaign.coins, 77);
  assert.ok(V.claimPerk(campaign, campaign.pending.choices[0]));
  const boss = V.routesFrom(campaign, graph).find(route => V.isBossRoute(campaign, route));
  assert.ok(V.completeNode(campaign, graph, boss.to, () => .2, { route: boss, coins: 65 }));
  const saved = V.loadCampaign();
  assert.equal(saved.coins, 142);
  assert.equal(saved.position, boss.to);
  assert.equal(saved.pending.node, boss.to);
  assert.equal(V.completeNode(campaign, graph, boss.to, () => .2, { route: boss, coins: 65 }), false);
});

test('three traders gate stock by progression and equipment can be switched without paying again', () => {
  const { V } = logic();
  const campaign = V.createCampaign('shop-weapons', 'frog');
  const graph = V.generateMap(campaign.seed);
  campaign.coins = 255;
  assert.equal(V.shopStatus(campaign, graph, 'reef-spear'), 'locked');
  assert.equal(V.shopPurchase(campaign, graph, 'reef-spear'), false);
  assert.equal(V.shopPurchase(campaign, graph, 'basalt-amulet'), false);
  campaign.cleared.push('reef-arena');
  assert.ok(V.shopPurchase(campaign, graph, 'reef-spear'));
  assert.equal(campaign.coins, 190);
  const s = V.newCombat(graph.byId.reef, 'frog', {}, campaign.seed);
  V.applyShopLoadout(s, V.loadCampaign());
  assert.equal(s.weapon.name, 'Riffspieß');
  assert.equal(V.weaponDamage(s, 300), 135);
  assert.ok(V.shopPurchase(campaign, graph, 'anchor-axe'));
  assert.equal(campaign.coins, 85);
  V.applyShopLoadout(s, campaign);
  assert.equal(V.weaponDamage(s, 300), 205);
  assert.ok(V.shopPurchase(campaign, graph, 'katana'));
  assert.ok(V.shopPurchase(campaign, graph, 'reef-spear'));
  assert.equal(campaign.coins, 85);
  assert.equal(V.shopPurchase(campaign, graph, 'reef-spear'), false);
  assert.equal(V.shopStatus(campaign, graph, 'smith-seal'), 'poor');
  campaign.cleared.push('reef');
  assert.ok(V.shopPurchase(campaign, graph, 'magnet-pearl'));
  assert.equal(campaign.coins, 9);
  assert.equal(V.loadCampaign().build.magnet, 1);
  assert.equal(V.shopPurchase(campaign, graph, 'magnet-pearl'), false);
});

test('the bought Riffspieß reaches a target outside katana range', () => {
  const { V } = logic();
  const c = V.createCampaign('shop-hit', 'otter');
  const g = V.generateMap(c.seed);
  c.coins = 70;
  c.cleared.push('reef-arena');
  const s = V.newCombat(g.byId.reef, c.character, c.build, c.seed);
  const p = s.player;
  Object.assign(p, { x: 100, previousX: 100, y: 300, previousY: 300, facing: 1 });
  const target = { x: 214, y: 306, w: 15, h: 31 };
  V.startWeaponSwing(s);
  p.swing.time = .06;
  assert.equal(V.weaponContact(s, target), Infinity);
  assert.ok(V.shopPurchase(c, g, 'reef-spear'));
  V.applyShopLoadout(s, c);
  V.startWeaponSwing(s);
  p.swing.time = .08;
  assert.ok(V.weaponContact(s, target) < Infinity);
});

test('a purchased supply lasts through losses and is spent after the next combat victory', () => {
  const { V } = logic();
  const c = V.createCampaign('shop-supply', 'snail');
  const g = V.generateMap(c.seed);
  c.coins = 55;
  assert.ok(V.shopPurchase(c, g, 'ember-tonic'));
  assert.equal(V.shopPurchase(c, g, 'current-oil'), false);
  assert.equal(V.loadCampaign().supply, 'ember-tonic');
  const route = V.routesFrom(c, g)[0];
  const runner = V.newRunner(route, c.character);
  const runnerHp = runner.hp;
  V.applyShopLoadout(runner, c);
  assert.equal(runner.hp, runnerHp);
  assert.ok(V.arrive(c, g, route, 20));
  assert.equal(c.supply, 'ember-tonic');
  const s = V.newArena(route.node, c.character, c.build, c.seed);
  const hp = s.hp;
  V.applyShopLoadout(s, c);
  assert.equal(s.hp, hp + 2);
  assert.equal(s.maxHp, hp + 2);
  s.hp = 1;
  V.hurt(s);
  assert.equal(V.sectionPayout(s), 0);
  assert.equal(V.loadCampaign().supply, 'ember-tonic');
  assert.ok(V.completeNode(c, g, route.to));
  assert.equal(V.loadCampaign().supply, null);
  assert.equal(V.shopPurchase(c, g, 'current-oil'), false, 'claim the reward before shopping');
  assert.ok(V.claimPerk(c, c.pending.choices[0]));
  assert.ok(V.shopPurchase(c, g, 'current-oil'));
  const other = V.newCombat(g.byId.reef, c.character, c.build, c.seed);
  V.applyShopLoadout(other, c);
  assert.equal(other.accelerationFactor, 1.25);
});

test('older saves get a one-time progress-based balance without granting unowned gear', () => {
  const { V, storage } = logic();
  const c = V.createCampaign('shop-legacy', 'otter');
  const g = V.generateMap(c.seed);
  const route = V.routesFrom(c, g)[0];
  visit(V, c, g, route);
  delete c.coins;
  c.weapon = 'anchor-axe';
  c.supply = 'katana';
  storage.set('vulkanschnegge-v7-overhaul-campaign-v1', JSON.stringify(c));
  const migrated = V.loadCampaign();
  assert.equal(migrated.coins, 30);
  assert.equal(migrated.weapon, 'katana');
  assert.equal(migrated.supply, null);
  migrated.coins = 0;
  V.saveCampaign(migrated);
  assert.equal(V.loadCampaign().coins, 0);
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

test('every boss pursues for exactly 30 active seconds with bounded, telegraphed volleys', () => {
  const { V } = logic();
  const graph = V.generateMap('pursuit');
  const frames = Math.round(30 / V.rules.step);
  for (const id of Object.keys(V.bosses)) {
    const s = V.newBossChase(graph.byId[id], 'otter', {}, graph.seed);
    const shotTypes = new Set();
    s.player.invuln = 60;
    for (let i = 0; i < frames; i++) {
      assert.equal(s.outcome, null, id);
      V.updateRunner(s, V.rules.step, { jump: i % 74 === 4 });
      assert.ok(s.chase.x > V.W * .7 && s.chase.x + s.chase.w < V.W, id);
      assert.ok(s.projectiles.length < 28 && s.obstacles.length === 0, id);
      for (const shot of s.projectiles) {
        assert.ok(Number.isFinite(shot.x) && Number.isFinite(shot.y), id);
        shotTypes.add(shot.key);
      }
    }
    assert.equal(shotTypes.size, 2, id);
    assert.ok(s.chase.wave >= 17, id);
    assert.equal(s.elapsed, 30, id);
    assert.equal(s.outcome, true, id);
  }
});

test('the chase uses swept parries and a fatal hit takes priority over reaching the arena', () => {
  const { V } = logic();
  const node = V.generateMap('pursuit-hit').byId.reef;
  for (const dash of [true, false]) {
    const s = V.newBossChase(node, 'snail', {}, 'pursuit-hit');
    s.elapsed = s.duration - V.rules.step;
    s.hp = 1;
    const shot = { key: 'plasma', ...V.bossShots.plasma, x: s.player.x + s.player.w + 20,
      y: s.player.y + s.player.h / 2, vx: -3600, vy: 0 };
    s.projectiles.push(shot);
    V.updateRunner(s, V.rules.step, { dash });
    assert.equal(s.outcome, dash);
    assert.equal(s.hp, Number(dash));
    assert.equal(Boolean(shot.reflected), dash);
  }
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

test('a fatal hit prevents last-frame score and healing from a coin', () => {
  const { V } = logic();
  const s = V.newRunner(null, 'snail', { coinSpawnBoost: 1 });
  s.hp = 1;
  s.coinsTaken = 11;
  V.addCoin(s, s.player.x - V.START_X + s.player.w / 2, s.player.y + s.player.h / 2);
  V.hurt(s);
  const score = s.score;
  V.collectCoins(s);
  assert.equal(s.outcome, false);
  assert.equal(s.hp, 0);
  assert.equal(s.coinsTaken, 11);
  assert.equal(s.score, score);
});

test('a runner dash on the same frame as a turn swings in the new direction', () => {
  const { V } = logic();
  const s = V.newRunner(null, 'snail');
  V.updateRunner(s, V.rules.step, { left: true, dash: true });
  assert.equal(s.player.facing, -1);
  assert.equal(s.player.swing.facing, -1);
});

test('an arena dash deals one third of launch speed and contact retains 65 percent of it', () => {
  const { V } = logic();
  const c = V.createCampaign('arena', 'snail');
  const node = V.routesFrom(c, V.generateMap(c.seed))[0].node;
  const s = V.newArena(node, 'snail', {}, c.seed);
  s.weapon = V.weapons.shell;
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
  assert.deepEqual(calls, ['katana', 'dash']);
  assert.equal(buffered.effects.at(-1).kind, 'dash');

  const fast = setup(-520);
  V.movePlayer(fast, step, { left: true, dash: true });
  assert.equal(fast.effects.at(-1).kind, 'dash-fast');
  assert.equal(fast.effects.at(-1).direction, -1);
  assert.equal(fast.player.dashPower, V.weaponDamage(fast, 520));

  const braking = setup(520);
  V.movePlayer(braking, step, { right: true });
  assert.equal(braking.effects.length, 0);
  V.movePlayer(braking, step, { left: true });
  assert.equal(braking.effects.at(-1).kind, 'skid');
  assert.equal(braking.effects.at(-1).direction, 1);
  for (let i = 0; i < 10; i++) V.movePlayer(braking, step, { left: true });
  assert.deepEqual(calls, ['katana', 'dash', 'katana', 'dash-fast', 'skid']);
  V.movePlayer(setup(520), step, { left: true, jump: true });
  V.movePlayer(setup(190), step, {});
  assert.deepEqual(calls, ['katana', 'dash', 'katana', 'dash-fast', 'skid']);
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

test('the katana has a shared 120ms pose and swept reach, with a 1.75 damage multiplier', () => {
  const { V } = logic();
  const graph = V.generateMap('katana');
  for (const character of Object.keys(V.characters)) {
    const s = V.newCombat(graph.byId.reef, character, {}, 'katana');
    const p = s.player;
    assert.equal(s.weapon, V.weapons.katana);
    assert.equal(s.weapon.duration, .12);
    assert.equal(V.weaponDamage(s, 300), 175);
    assert.equal(V.weaponDamage(s, 0), 53);
    Object.assign(p, { x: 312, previousX: 80, y: 330, previousY: 330, facing: 1 });
    V.startWeaponSwing(s);
    p.swing.previousTime = .03;
    p.swing.time = .06;
    const thin = { x: 240, y: 340, w: 4, h: 24 };
    assert.ok(V.weaponContact(s, thin) < 1);
    p.swing.hits.add(thin);
    assert.equal(V.weaponContact(s, thin), Infinity);
  }
});

function bossDash(V, s, facing = 1) {
  const { boss: b, player: p } = s;
  const edge = facing === 1 ? b.x - p.w - 12 : b.x + b.w + 12;
  const y = Math.min(V.GROUND - p.h, b.y + b.h * .64 - p.h / 2);
  Object.assign(p, { x: edge, y, vx: facing * 560, vy: 0, facing, airDash: true,
    invuln: 1, dashTime: 0, dashCooldown: 0, dashBuffer: 0, swing: null });
  const before = b.hp;
  for (let i = 0; i < 14; i++) V.updateCombat(s, V.rules.step, {
    dash: i === 0, right: facing === 1, left: facing === -1
  });
  return before - b.hp;
}

test('every boss takes one normal katana hit per dash, has a death sequence and resets', () => {
  const { V } = logic();
  const graph = V.generateMap('death');
  for (const [id, definition] of Object.entries(V.bosses)) {
    const node = graph.byId[id];
    const s = V.newCombat(node, 'otter', {}, 'death');
    assert.ok(s.boss.x > s.player.x && s.boss.x < V.W);
    assert.ok(s.platforms.length >= 6 && V.usesMomentum(s));
    s.boss.readyAt = 1e5;
    const first = bossDash(V, s);
    assert.equal(first, 327, id);
    assert.equal(s.outcome, null);
    assert.ok(s.effects.some(effect => effect.kind === 'hit' && effect.amount === first));
    let i = 0;
    while (s.boss.hp > 0 && i++ < 40) {
      V.updateCombat(s, V.rules.step, idle);
      if (s.boss.state === 'shift') {
        s.boss.readyAt = 1e5;
        while (s.elapsed < s.boss.phaseUntil) V.updateCombat(s, V.rules.step, idle);
      }
      assert.ok(bossDash(V, s, i % 2 ? -1 : 1) > 0, id);
    }
    assert.equal(s.boss.state, 'defeated');
    assert.equal(s.outcome, null);
    assert.equal(s.zones.length, 0);
    for (let j = 0; j < 85; j++) V.updateCombat(s, V.rules.step, idle);
    assert.equal(s.outcome, true);
    const retry = V.newCombat(node, 'otter', {}, 'death');
    assert.equal(retry.boss.hp, definition.hp + 270 * (node.tier - 1));
    assert.equal(retry.boss.phase, 0);
    assert.equal(retry.boss.plan, undefined);
    assert.equal(retry.player.swing, null);
  }
});

test('the five boss AIs telegraph six distinct attacks and run all three phases', () => {
  const { V } = logic();
  const graph = V.generateMap('patterns');
  for (const [id, boss] of Object.entries(V.bosses)) {
    const s = V.newCombat(graph.byId[id], 'frog', {}, 'patterns');
    const b = s.boss;
    const seen = new Set();
    const states = new Set();
    const effects = new Set();
    const phases = new Set();
    const followUps = new Set();
    let flanked = false;
    let movedDuringWarning = false;
    s.player.invuln = 120;
    for (let i = 0; i < 6600; i++) {
      if (i === 2000) b.hp = Math.floor(b.maxHp * .60);
      if (i === 4000) b.hp = Math.floor(b.maxHp * .29);
      const oldX = b.x;
      const previousPlan = b.plan;
      V.updateCombat(s, V.rules.step, { left: i % 340 > 220, right: i % 340 < 115 });
      flanked ||= Boolean(b.flank);
      movedDuringWarning ||= b.state === 'windup' && b.plan === previousPlan && Math.abs(b.x - oldX) > .5;
      if (b.plan?.followUp) {
        followUps.add(b.plan.attack.name);
        assert.equal(b.plan.nextAttack, undefined, id);
        assert.ok(boss.combos.some(([, attack]) => attack === b.plan.attack), id);
      }
      if (b.plan) {
        seen.add(b.plan.attack.name);
        assert.ok(b.plan.lead >= .62 && Number.isFinite(b.plan.strike));
      }
      states.add(b.state);
      phases.add(b.phase);
      Object.keys(s.arenaFX).forEach(fx => effects.add(fx));
      assert.ok(s.projectiles.length < 60 && s.zones.length < 20);
      assert.ok(s.projectiles.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)));
    }
    assert.equal(seen.size, 6, id);
    assert.ok(followUps.size > 0 && flanked && movedDuringWarning, id);
    assert.equal(boss.attacks.filter(attack => attack.special).length, 2, id);
    assert.equal(phases.size, 3, id);
    assert.ok(effects.size >= 2, id);
    for (const state of ['windup', 'active', 'recovery']) assert.ok(states.has(state), id);
    assert.equal(s.outcome, null);
  }
});

test('boss arenas start stationary and brake without adding automatic movement', () => {
  const { V } = logic();
  const graph = V.generateMap('boss-braking');
  const step = V.rules.step;
  for (const id of Object.keys(V.bosses)) {
    const s = V.newCombat(graph.byId[id], 'snail', {}, graph.seed);
    s.boss.readyAt = Infinity;
    const p = s.player;
    const start = p.x;
    for (let i = 0; i < 30; i++) V.updateCombat(s, step, idle);
    assert.equal(p.x, start, id);
    assert.equal(p.vx, 0, id);
    for (let i = 0; i < 8; i++) V.updateCombat(s, step, { left: true });
    assert.ok(p.vx < 0, id);
    for (let i = 0; i < 30; i++) V.updateCombat(s, step, idle);
    assert.ok(p.x < start, id);
    assert.equal(p.vx, 0, id);
    p.x = s.worldWidth - p.w - 22;
    for (let i = 0; i < 30; i++) V.updateCombat(s, step, idle);
    assert.equal(p.x, s.worldWidth - p.w - 22, id);
    assert.equal(p.vx, 0, id);
  }
  const reef = V.newCombat(graph.byId.reef, 'snail', {}, graph.seed);
  reef.arenaFX.current = { start: 0, end: 1, direction: 1 };
  V.updateCombat(reef, step, idle);
  assert.ok(reef.player.vx > 0, 'explicit arena currents still push');
});

test('phase thresholds reconfigure all five arenas and telegraph the new hazards', () => {
  const { V } = logic();
  const graph = V.generateMap('arena-phase');
  for (const id of Object.keys(V.bosses)) {
    const s = V.newCombat(graph.byId[id], 'snail', {}, graph.seed);
    const b = s.boss;
    s.player.invuln = 60;
    const deck = s.platforms[1];
    const layouts = [];
    for (const phase of [1, 2]) {
      b.hp = Math.floor(b.maxHp * (3 - phase) / 3);
      V.updateCombat(s, V.rules.step, idle);
      assert.equal(b.state, 'shift', id);
      assert.equal(b.phase, phase, id);
      assert.equal(b.phaseFrom, phase - 1, id);
      assert.equal(s.zones.length, 0, id);
      assert.equal(s.projectiles.length, 0, id);
      assert.ok(b.phaseUntil > s.elapsed + 1, id);
      let hazards = [];
      let warning = false;
      let ghost = false;
      for (let step = 0; step < 210; step++) {
        V.updateCombat(s, V.rules.step, { right: step < 92, left: step > 125 });
        assert.equal(b.facing, Math.sign(s.player.x + s.player.w / 2 - b.x - b.w / 2), id);
        const marked = s.zones.filter(z => z.stage && z.at > s.elapsed);
        if (marked.length > hazards.length) hazards = marked;
        warning ||= s.platforms.some(p => p.stageWarning);
        ghost ||= s.platforms.some(p => p.enabled === false);
      }
      assert.equal(hazards.length, phase === 1 ? 1 : id === 'god' ? 3 : 2, id);
      layouts.push([deck.worldX, deck.y]);
      if (id === 'god') assert.ok(warning && ghost);
      if (id === 'reef') assert.ok(s.tideY < V.GROUND - 75);
    }
    assert.notDeepEqual(layouts[0], layouts[1], id);
    assert.ok(b.maxHp >= 4500, id);
  }
  assert.ok(V.newCombat(graph.byId.god, 'snail', {}, graph.seed).boss.maxHp >= 7000);
});

test('the boss stages pack ten transparent sprites for every boss', () => {
  const { V } = logic(undefined, ['config', 'assets', 'boss-stage']);
  const directory = path.join(root, 'assets/images/boss-stage');
  const files = fs.readdirSync(directory);
  assert.equal(files.length, 50);
  for (const biome of Object.keys(V.bossStages)) {
    assert.equal(files.filter(file => file.startsWith(biome + '-')).length, 10);
  }
  for (const file of files) {
    assert.equal(V.imagePath('boss-stage-' + file.slice(0, -4)), 'assets/images/boss-stage/' + file);
    const data = fs.readFileSync(path.join(directory, file));
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    assert.equal(data[25], 6, file);
  }
});

test('the open chest weak spot interrupts Royal Decree and amplifies the hit', () => {
  const { V } = logic();
  const s = V.newCombat(V.generateMap('decree').byId.greed, 'snail', {}, 'decree');
  Object.assign(s.boss, { forceSpecial: true, readyAt: 0 });
  V.updateCombat(s, V.rules.step, idle);
  assert.equal(s.boss.plan.attack.name, 'Royal Decree');
  const { boss: b, player: p } = s;
  const weak = V.bossHitboxes(b).weak;
  Object.assign(p, { x: weak.x - p.w - 12, y: weak.y + 8, vx: 400, facing: 1, airDash: true });
  const hp = b.hp;
  for (let i = 0; i < 8; i++) V.updateCombat(s, V.rules.step, { right: true, dash: i === 0 });
  assert.equal(b.state, 'recovery');
  assert.ok(hp - b.hp > p.dashPower);
  assert.equal(s.zones.length, 0);
});

test('boss cues align to the recording and the song end alone cannot win', () => {
  const { V } = logic();
  const s = V.newCombat(V.generateMap('clock').byId.reef, 'snail', {}, 'clock');
  const { duration, beats } = V.bossRhythms.reef;
  s.boss.readyAt = 0;
  const time = 12.75;
  V.updateCombat(s, V.rules.step, idle, { time, duration });
  const clockBeat = time + s.boss.plan.lead;
  assert.ok(beats.some(ms => Math.abs(ms / 1000 - clockBeat) < 1e-7));
  V.updateCombat(s, V.rules.step, idle, { time: duration, duration, ended: true });
  assert.equal(s.outcome, null);
  s.hp = 1;
  V.hurt(s);
  assert.equal(s.outcome, false);
});

test('boss arena effects change gravity and deck height while zone markers leave jumpable gaps', () => {
  const { V } = logic();
  const graph = V.generateMap('arena-fx');
  for (const jump of [false, true]) {
    const s = V.newCombat(graph.byId.greed, 'snail', {}, 'arena-fx');
    s.boss.readyAt = 1e6;
    s.arenaFX.gilded = { start: 0, end: 5 };
    const deck = s.platforms[1];
    V.bossZone(s, s.player.x + 30, V.GROUND - 58, 172, 58, .50, .30, 'gold');
    for (let i = 0; i < 49; i++) V.updateCombat(s, V.rules.step, { jump: jump && i === 19 });
    assert.ok(deck.y < deck.homeY - 30);
    assert.equal(s.hp, s.maxHp - Number(!jump));
  }
  const reef = V.newCombat(graph.byId.reef, 'snail', {}, 'arena-fx');
  reef.arenaFX.tide = { start: -1, end: 5 };
  V.updateCombat(reef, V.rules.step, { jump: true });
  assert.equal(reef.gravityFactor, .62);
});

test('the overhaul imports a previous campaign and writes its own save key', () => {
  const { V, storage } = logic();
  const old = JSON.stringify(V.createCampaign('legacy', 'frog'));
  storage.set('vulkanschnegge-v7-campaign-v1', old);
  const loaded = V.loadCampaign();
  assert.equal(loaded.seed, 'legacy');
  loaded.build.jump = 1;
  V.saveCampaign(loaded);
  assert.equal(storage.get('vulkanschnegge-v7-campaign-v1'), old);
  assert.equal(V.loadCampaign().build.jump, 1);
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
  for (const effect of ['katana', 'boss-break', ...Object.values(V.bosses).map(boss => boss.sound)]) {
    assert.equal(fs.readFileSync(path.join(root, 'assets/sfx', effect + '.wav')).toString('ascii', 8, 12), 'WAVE');
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
  spriteIds.push('katana');
  for (const id of Object.keys(V.bossShots)) {
    if (id !== 'coin' && !V.imagePath(id).endsWith('/undefined')) spriteIds.push(id);
  }
  assert.equal(new Set(spriteIds.map(id => V.imagePath(id))).size, spriteIds.length);
  for (const id of spriteIds) {
    const png = fs.readFileSync(path.join(root, V.imagePath(id)));
    assert.equal(png.subarray(0, 8).toString('hex'), pngHeader, id);
  }
  const graph = V.generateMap('Tiefsee');
  const harbor = V.newArena(graph.byId['reef-side'], 'snail', {}, 'Tiefsee');
  assert.equal(harbor.enemies.filter(enemy => enemy.key === 'armored').length, 1);
});

test('the atlas menu packages its 38 sprites and both backgrounds offline', () => {
  const { V } = logic(undefined, ['config', 'assets']);
  const directory = path.join(root, 'assets/images/menu');
  const files = fs.readdirSync(directory);
  assert.equal(files.filter(file => file.endsWith('.png')).length, 38);
  assert.deepEqual(files.filter(file => file.endsWith('.webp')), ['chart.webp', 'hero.webp']);
  for (const file of files) {
    const key = file.slice(0, file.lastIndexOf('.'));
    assert.equal(V.imagePath('menu-' + key), 'assets/images/menu/' + file);
    const data = fs.readFileSync(path.join(directory, file));
    if (file.endsWith('.png')) {
      assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
      assert.equal(data[25], 6, file);
    } else assert.equal(data.toString('ascii', 8, 12), 'WEBP', file);
  }
});

test('all 24 spritepack images are registered transparent PNGs', () => {
  const { V } = logic(undefined, ['config', 'assets']);
  const folder = path.join(root, 'assets/images/spritepack');
  const files = fs.readdirSync(folder);
  assert.equal(files.length, 24);
  for (const file of files) {
    const id = path.basename(file, '.png');
    const registered = path.join(root, V.imagePath(id));
    assert.equal(registered, path.join(folder, file));
    const data = fs.readFileSync(registered);
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(data[25], 6, file);
  }
});

test('the traders, wares and weapon sprites are available in the offline package', () => {
  const { V } = logic(undefined, [...rules, 'assets']);
  const art = ['shop-purse', ...Object.values(V.shops).flatMap(stall => [
    stall.portrait, ...stall.items.map(item => item.art)
  ])];
  assert.equal(art.length, 13);
  for (const id of art) {
    const bytes = fs.readFileSync(path.join(root, V.imagePath(id)));
    assert.equal(bytes[25], 6, id);
  }
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

test('boss tracks loop and mute without stopping or rewinding the rhythm clock', () => {
  const { audio, players, document, listeners } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  const track = players[0];
  assert.equal(track.loop, true);
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
  track.currentTime = .12;
  assert.equal(audio.bossClock().time, .12, 'the clock follows the loop wrap');
  audio.stop();
  assert.equal(audio.bossClock(5), null);
});

test('transitioning from a fight to the menu pauses every active sound effect', () => {
  const { audio, players } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  audio.effect('hit');
  audio.effect('katana');
  const effects = players.filter(voice => voice.src.endsWith('.wav'));
  assert.equal(effects.length, 2);
  assert.ok(effects.every(voice => !voice.paused));
  audio.startMenu();
  assert.ok(effects.every(voice => voice.paused));
});

test('clear sounds replace the level track, respect sound settings and stop on continue', () => {
  const { audio, players } = audioFixture();
  audio.startLevel('boss', 'reef-tax');
  const theme = players[0];
  audio.setEnabled(false);
  for (const kind of ['travel', 'arena', 'boss', 'finale']) {
    const previous = players.at(-1);
    audio.startClear(kind);
    assert.ok(theme.paused && previous.paused);
    assert.equal(players.at(-1).src, 'assets/sfx/clear-' + kind + '.wav');
    assert.equal(players.at(-1).paused, false);
  }
  audio.startLevel('story', 'home-at-last');
  assert.ok(players.every(player => player.paused));
  audio.setEffectsEnabled(false);
  const count = players.length;
  audio.startClear('travel');
  assert.equal(players.length, count);
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
