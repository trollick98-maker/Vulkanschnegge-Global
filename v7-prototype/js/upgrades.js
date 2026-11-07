/* Stable perk IDs keep earned builds and pending rewards compatible. */
(function () {
  'use strict';
  const V = window.VS7;
  const catalogue = [
    { id: 'jump', name: '+1 Sprung', effect: 'Ein zusätzlicher Sprung in der Luft.', uses: 2, tier: 'rare' },
    { id: 'gold', name: 'Goldrausch', effect: 'Münzen geben doppelte Punkte.', uses: 1, tier: 'rare' },
    { id: 'freehit', name: '+1 HP', effect: 'Ein zusätzliches Herz pro Abschnitt.', uses: 0, tier: 'common' },
    { id: 'gravityBoost', name: 'Sprungschub', effect: '20 % weniger Schwerkraft.', uses: 0, tier: 'common' },
    { id: 'slowMo', name: 'Zeitpolster', effect: 'Frühe Sprung- und Dash-Eingaben bleiben 60 ms länger gespeichert.', uses: 2, tier: 'common' },
    { id: 'hyperMode', name: 'Kettenreaktion', effect: 'Dash-Treffer in Arenen und Bosskonter laden den Dash sofort wieder auf.', uses: 1, tier: 'epic' },
    { id: 'tinyMode', name: 'Kleiner Körper', effect: '25 % kleiner und 15 % weniger Schwerkraft.', uses: 1, tier: 'rare' },
    { id: 'fatMode', name: 'Fettmodus', effect: '+20 % Größe und +3 HP.', uses: 1, tier: 'rare' },
    { id: 'spinGod', name: 'Panzerwirbel', effect: 'Größerer Konterradius bei Bossen und schnellerer Panzer-Spin.', uses: 0, tier: 'rare' },
    { id: 'magnet', name: 'Magnet', effect: '+75 % Münzreichweite.', uses: 3, tier: 'common' },
    { id: 'coinSpawnBoost', name: 'Münzschwarm', effect: 'Bonusmünzen. Einmal pro Abschnitt heilt eine Münze ab Nummer 12 ein fehlendes Herz.', uses: 1, tier: 'common' },
    { id: 'sisyphos', name: 'Sprungfeder', effect: 'Ein zusätzlicher Luftsprung. Der erste Luftsprung stellt den Luft-Dash in Arenen wieder her.', uses: 1, tier: 'epic' },
    { id: 'turboHunter', name: 'Durchschlag', effect: 'Ein zusätzlicher Schadenspunkt bei Dash-Treffern in Arenen und zurückgeworfenen Boss-Geschossen.', uses: 1, tier: 'epic' },
    { id: 'hardplastic', name: 'Eimer aus Hartplastik', effect: '+2 HP für Otter.', uses: 1, tier: 'rare', allowed: 'otter' },
    { id: 'springLegs', name: 'Federnde Beine', effect: '+25 % Kraft bei Luftsprüngen für Frogo.', uses: 1, tier: 'rare', allowed: 'frog' },
    { id: 'snailRage', name: 'Schneckenzorn', effect: 'Der Dash hält 60 ms länger und hat 30 % weniger Abklingzeit.', uses: 1, tier: 'epic', allowed: 'snail' }
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
    const size = .75 ** n('tinyMode') * 1.2 ** n('fatMode');
    const foot = player.y + player.h;
    player.w *= size;
    player.h *= size;
    player.y = foot - player.h;
    player.gravity = Math.max(630, player.gravity * .8 ** n('gravityBoost') * .85 ** n('tinyMode'));
    player.doubleJumpBoost = 1.25 ** n('springLegs');
    player.spinBoost = 1 + .15 * Math.min(4, n('spinGod'));
    section.maxHp += n('freehit') + 3 * n('fatMode') + 2 * n('hardplastic');
    section.hp = section.maxHp;
    section.extraJumps = n('jump') + n('sisyphos');
    section.airSpring = n('sisyphos') > 0;
    section.inputGrace = .12 + .06 * n('slowMo');
    section.parryReach = 13 + 6 * Math.min(4, n('spinGod'));
    section.chainDash = n('hyperMode') > 0;
    section.strikeBonus = n('turboHunter');
    section.dashExtension = .06 * n('snailRage');
    section.dashFactor = .7 ** n('snailRage');
    section.coinValue = 1 + n('gold');
    section.multiplier = 1;
    section.magnetRange += .75 * n('magnet');
    section.coinBonus = n('coinSpawnBoost') > 0;
    section.healAtCoins = section.coinBonus ? 12 : 0;
  };
})();
