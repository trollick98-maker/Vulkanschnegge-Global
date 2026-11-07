/* The original sixteen perk types, applied afresh from one campaign build. */
(function () {
  'use strict';
  const V = window.VS7;
  const catalogue = [
    { id: 'jump', name: '+1 Sprung', effect: 'Ein zusätzlicher Sprung in der Luft.', uses: 2, tier: 'rare' },
    { id: 'gold', name: 'Goldrausch', effect: '+1 Goldmultiplikator und +100 Tempo.', uses: 1, tier: 'rare' },
    { id: 'freehit', name: '+1 HP', effect: 'Ein zusätzliches Herz pro Abschnitt.', uses: 0, tier: 'common' },
    { id: 'gravityBoost', name: 'Sprungschub', effect: '20 % weniger Schwerkraft.', uses: 0, tier: 'common' },
    { id: 'slowMo', name: 'Zeitkrümmung', effect: '−100 Bewegungstempo.', uses: 2, tier: 'common' },
    { id: 'hyperMode', name: 'Hypermodus', effect: '+25 % Tempo und +2 Startmultiplikator.', uses: 1, tier: 'epic' },
    { id: 'tinyMode', name: 'Kleiner Körper', effect: 'Halbe Größe und 40 % weniger Schwerkraft.', uses: 1, tier: 'rare' },
    { id: 'fatMode', name: 'Fettmodus', effect: '+50 % Größe und +3 HP.', uses: 1, tier: 'rare' },
    { id: 'spinGod', name: 'Spin-Gott', effect: 'Dreifache Drehung, weniger Schwerkraft und etwas Magnetkraft.', uses: 0, tier: 'rare' },
    { id: 'magnet', name: 'Magnet', effect: '+25 % Münzreichweite.', uses: 3, tier: 'common' },
    { id: 'coinSpawnBoost', name: 'Münzschwarm', effect: 'Jede vierte neue Münze hat einen Bonusabwurf.', uses: 1, tier: 'common' },
    { id: 'sisyphos', name: 'Sisyphos', effect: '+3 Sprünge und +50 % Schwerkraft.', uses: 1, tier: 'epic' },
    { id: 'turboHunter', name: 'Turbo-Jäger', effect: 'Doppelte Bewegungspunkte, halber Münzwert.', uses: 1, tier: 'rare' },
    { id: 'hardplastic', name: 'Eimer aus Hartplastik', effect: '+2 HP für Otter.', uses: 1, tier: 'rare', allowed: 'otter' },
    { id: 'springLegs', name: 'Federnde Beine', effect: '+25 % Kraft bei Luftsprüngen für Frogo.', uses: 1, tier: 'rare', allowed: 'frog' },
    { id: 'snailRage', name: 'Schneckenzorn', effect: '+20 % Tempo und 30 % kürzere Dash-Abklingzeit.', uses: 1, tier: 'epic', allowed: 'snail' }
  ];
  const weights = { normal: { common: 10, rare: 3.8, epic: .8 }, boss: { common: 4, rare: 8, epic: 4.8 } };
  V.upgradeCatalogue = catalogue;
  V.perksById = Object.fromEntries(catalogue.map(perk => [perk.id, perk]));
  V.canTakePerk = function (id, build, character) {
    const perk = Object.hasOwn(V.perksById, id) && V.perksById[id];
    return Boolean(perk && (!perk.allowed || perk.allowed === character) && (!perk.uses || (build[id] || 0) < perk.uses));
  };

  V.chooseUpgrades = function (build, character, boss, random = Math.random) {
    const pool = catalogue.filter(perk => V.canTakePerk(perk.id, build, character));
    const weight = weights[boss ? 'boss' : 'normal'];
    const picks = [];
    while (pool.length && picks.length < 3) {
      let roll = random() * pool.reduce((sum, perk) => sum + weight[perk.tier], 0);
      const selected = pool.findIndex(perk => (roll -= weight[perk.tier]) < 0);
      picks.push(pool.splice(selected < 0 ? pool.length - 1 : selected, 1)[0]);
    }
    return picks;
  };

  V.applyBuild = function (section, build) {
    const n = id => build[id] || 0;
    const player = section.player;
    const size = .5 ** n('tinyMode') * 1.5 ** n('fatMode');
    const foot = player.y + player.h;
    player.w *= size;
    player.h *= size;
    player.y = foot - player.h;
    player.gravity = Math.max(630, player.gravity * .8 ** n('gravityBoost') * .6 ** n('tinyMode') *
      .9 ** n('spinGod') * 1.5 ** n('sisyphos'));
    player.doubleJumpBoost = 1.25 ** n('springLegs');
    player.spinBoost = Math.min(6, 3 ** n('spinGod'));
    section.maxHp += n('freehit') + 3 * n('fatMode') + 2 * n('hardplastic');
    section.hp = section.maxHp;
    section.extraJumps = n('jump') + 3 * n('sisyphos');
    section.bonusSpeed = 100 * (n('gold') - n('slowMo'));
    section.speedFactor = 1.25 ** n('hyperMode') * 1.2 ** n('snailRage');
    section.dashFactor = .7 ** n('snailRage');
    section.goldMultiplier = 1 + n('gold');
    section.baseMultiplier = 1 + 2 * n('hyperMode');
    section.multiplier = section.baseMultiplier;
    section.magnetRange += .25 * n('magnet') + .125 * n('spinGod');
    section.coinBonus = n('coinSpawnBoost') > 0;
    section.scoreRate = .1 * 2 ** n('turboHunter');
    section.coinValue = .5 ** n('turboHunter');
  };
})();
