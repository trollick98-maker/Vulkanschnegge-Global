// Run with: node --test tests/smoke.test.js
// No packages or network required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('HTML loads real local scripts in dependency order', () => {
  const html = read('index.html');
  const files = [...html.matchAll(/<script\s+src="(js\/[^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(files.slice(0, 4), [
    'js/setup.js', 'js/upgrades.js', 'js/player.js', 'js/engine.js'
  ]);
  assert.ok(files.indexOf('js/firebase.js') > files.indexOf('js/leaderboard.js'));
  for (const file of files) assert.ok(fs.existsSync(path.join(root, file)), file);
  assert.ok(fs.existsSync(path.join(root, 'styles.css')));
  assert.ok(!files.includes('js/game.js'), 'legacy reference must not run twice');
});

test('all active JavaScript files parse', () => {
  const html = read('index.html');
  for (const [, file] of html.matchAll(/<script\s+src="(js\/[^"]+)"/g)) {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }), file);
  }
});

function createGame() {
  const nodes = new Map();
  const ctx = {};
  for (const name of [
    'clearRect','createLinearGradient','fillRect','drawImage','save','restore',
    'translate','rotate','scale','fillText','arc','beginPath','fill'
  ]) ctx[name] = () => name === 'createLinearGradient'
    ? {addColorStop() {}} : undefined;
  function el(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, style: {}, value: '', innerText: '', innerHTML: '', src: '',
      offsetHeight: 40,
      classList: {add(){},remove(){},toggle(){}},
      addEventListener(){}, appendChild(){}, blur(){}, closest(){return null;},
      getContext(){return ctx;}
    });
    return nodes.get(id);
  }
  const saved = new Map();
  const document = {
    body: {style:{}},
    activeElement: null,
    getElementById: el,
    createElement: () => el('created-' + Math.random()),
    addEventListener(){},
  };
  const sandbox = vm.createContext({
    document,
    window: {innerWidth: 1200, innerHeight: 800, scrollTo(){}, addEventListener(){}},
    navigator: {userAgent:'Node Test'},
    Image: class Image {constructor(){this.src = '';}},
    localStorage: {getItem:k => saved.get(k) ?? null, setItem:(k,v) => saved.set(k,v)},
    performance: {now: () => 1000},
    requestAnimationFrame(){},
    setTimeout(){},
    console,
  });
  for (const file of ['js/setup.js', 'js/upgrades.js', 'js/player.js', 'js/engine.js']) {
    vm.runInContext(read(file), sandbox, {filename:file});
  }
  return sandbox;
}

test('reset clears temporary score/spawn modifiers and particles', () => {
  const context = createGame();
  vm.runInContext(`
    SCORE_PER_SPEED = 123;
    bonusSpawnInterval = 0.01;
    missedBonus = true;
    particles.push({life:1});
    resetGame();
  `, context);
  assert.equal(vm.runInContext('SCORE_PER_SPEED', context), 0.10);
  assert.equal(vm.runInContext('bonusSpawnInterval', context), 160 / 60);
  assert.equal(vm.runInContext('missedBonus', context), false);
  assert.equal(vm.runInContext('particles.length', context), 0);
});

test('spring legs affect future second jumps and reset with the run', () => {
  const context = createGame();
  vm.runInContext(`
    resetGame();
    selectedCharacter = 'frog';
    upgrades.find(u => u.id === 'springLegs').effect();
    player.jumps = 1;
    player.vy = 0;
    jump();
  `, context);
  assert.equal(vm.runInContext('player.vy', context), -12 * 60 * 1.25);
  vm.runInContext('resetGame()', context);
  assert.equal(vm.runInContext('player.doubleJumpBoost', context), 1);
});


test('paused or portrait-blocked frames never consume HP on overlapping obstacles', () => {
  const context = createGame();
  vm.runInContext(`
    resetGame();
    freeHit = 2;
    obstacles.push({x:player.x, y:player.y, width:player.width, height:player.height});
    paused = true;
    update(1016);
  `, context);
  assert.equal(vm.runInContext('freeHit', context), 2);
  assert.equal(vm.runInContext('obstacles.length', context), 1);
  assert.equal(vm.runInContext('gameOver', context), false);
  vm.runInContext(`
    paused = false;
    rotateOverlay.style.display = 'flex';
    update(1032);
  `, context);
  assert.equal(vm.runInContext('freeHit', context), 2);
  assert.equal(vm.runInContext('obstacles.length', context), 1);
  vm.runInContext(`
    rotateOverlay.style.display = 'none';
    update(1048);
  `, context);
  assert.equal(vm.runInContext('freeHit', context), 1);
  assert.equal(vm.runInContext('obstacles.length', context), 0);
});
