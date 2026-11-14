/* Campaign-owned wallet, shop unlocks and loadout. */
(function () {
  'use strict';
  const V = window.VS7;
  const balanceLimit = 999999;

  V.shops = {
    supplies: { name: 'Proviant', keeper: 'Mira Krabbe', portrait: 'shop-mira',
      line: 'Etwas Warmes für den Bauch, bevor es kalt wird da draußen.',
      items: [
        { id: 'ember-tonic', kind: 'supply', name: 'Gluttrank', art: 'shop-tonic', price: 24,
          detail: '+2 Herzen im nächsten Kampf. Bleibt bei einem Fehlversuch aktiv.', health: 2 },
        { id: 'current-oil', kind: 'supply', name: 'Strömungsöl', art: 'shop-oil', price: 27,
          detail: '+25 % Beschleunigung im nächsten Kampf. Bleibt bei einem Fehlversuch aktiv.', acceleration: 1.25 }
      ] },
    forge: { name: 'Schmiede', keeper: 'Schmied Rostarm', portrait: 'shop-rostarm',
      line: 'Bring mir ein paar Münzen. Ich geb dir Stahl, der unter Wasser brennt.',
      lock: 'Besiege ein Gegnerlevel.', unlock: (campaign, graph) => campaign.cleared.some(id => graph.byId[id]?.kind === 'arena'),
      items: [
        { id: 'katana', kind: 'weapon', name: 'Glutkatana', art: 'katana', price: 0, weapon: 'katana',
          detail: 'Deine Startklinge. Schneller Bogen mit 1,75-fachem Dash-Schaden.' },
        { id: 'reef-spear', kind: 'weapon', name: 'Riffspieß', art: 'shop-spear', price: 65, weapon: 'reef-spear',
          detail: 'Gerader Stoß mit großer Reichweite. 1,35-facher Dash-Schaden.' },
        { id: 'anchor-axe', kind: 'weapon', name: 'Ankerbeil', art: 'shop-axe', price: 105, weapon: 'anchor-axe',
          detail: 'Breiter Hieb auf kurze Distanz. 2,05-facher Dash-Schaden.' },
        { id: 'war-hammer', kind: 'weapon', name: 'Kriegshammer', art: 'war-hammer', price: 95, weapon: 'war-hammer',
          detail: 'Landungen treffen mit der Fallgeschwindigkeit. Mit ↓ oder S aus der Luft stürzen. Ulti: Donnerschlag.' },
        { id: 'smith-seal', kind: 'perk', name: 'Schmiedesiegel', art: 'shop-seal', price: 92, perk: 'turboHunter',
          detail: 'Dauerhaft +25 % Dash-Schaden. Bosskonter räumen ein weiteres Geschoss ab.' }
      ] },
    curios: { name: 'Kuriositäten', keeper: 'Lumen vom Abgrund', portrait: 'shop-lumen',
      line: 'Manche Dinge sinken. Die guten Sachen finden irgendwann zu mir.',
      lock: 'Besiege deinen ersten Boss.', unlock: (campaign, graph) => campaign.cleared.some(id => graph.byId[id]?.kind === 'boss'),
      items: [
        { id: 'basalt-amulet', kind: 'perk', name: 'Basaltamulett', art: 'shop-amulet', price: 100, perk: 'freehit',
          detail: 'Ein zusätzliches Herz in jedem Abschnitt dieser Kampagne.' },
        { id: 'magnet-pearl', kind: 'perk', name: 'Magnetperle', art: 'shop-pearl', price: 76, perk: 'magnet',
          detail: 'Dauerhaft +75 % Münzreichweite.' },
        { id: 'light-crystal', kind: 'perk', name: 'Leichtkristall', art: 'shop-crystal', price: 88, perk: 'gravityBoost',
          detail: 'Dauerhaft 20 % weniger Schwerkraft.' }
      ] }
  };
  const stock = Object.fromEntries(Object.values(V.shops).flatMap(shop => shop.items.map(item => [item.id, { shop, item }])));
  const known = id => typeof id === 'string' && Object.hasOwn(stock, id) ? stock[id] : null;
  const amount = value => Number.isSafeInteger(value) && value > 0 ? Math.min(balanceLimit, value) : 0;

  V.shopOpen = (shop, campaign, graph) => !shop.unlock || shop.unlock(campaign, graph);

  V.shopStatus = function (campaign, graph, id) {
    const offer = known(id);
    if (!offer || !V.shopOpen(offer.shop, campaign, graph)) return 'locked';
    const { item } = offer;
    const owned = campaign.purchases.includes(id) || item.price === 0;
    if (item.kind === 'weapon' && owned) return campaign.weapon === item.weapon ? 'equipped' : 'equip';
    if (item.kind === 'supply' && campaign.supply) return campaign.supply === id ? 'ready' : 'supply-full';
    if (owned) return 'owned';
    if (item.perk && !V.canTakePerk(item.perk, campaign.build, campaign.character)) return 'maxed';
    return campaign.coins >= item.price ? 'buy' : 'poor';
  };

  V.shopPurchase = function (campaign, graph, id) {
    if (campaign.pending) return false;
    const status = V.shopStatus(campaign, graph, id);
    if (status !== 'buy' && status !== 'equip') return false;
    const { item } = known(id);
    if (status === 'buy') {
      campaign.coins -= item.price;
      if (item.kind === 'supply') campaign.supply = id;
      else campaign.purchases.push(id);
      if (item.perk) campaign.build[item.perk] = (campaign.build[item.perk] || 0) + 1;
    }
    if (item.weapon) campaign.weapon = item.weapon;
    V.saveCampaign(campaign);
    return true;
  };

  V.depositCoins = function (campaign, coins) {
    campaign.coins = amount(campaign.coins + amount(coins));
  };

  V.sectionPayout = function (section) {
    if (section.outcome !== true || section.kind === 'arcade') return 0;
    const bonus = { travel: 20, arena: 40, boss: 65 }[section.kind] ?? 0;
    return bonus + amount(section.coinsTaken);
  };

  V.loadShop = function (campaign, saved, graph) {
    campaign.coins = saved.coins === undefined ? amount(campaign.travelled.length * 10 + campaign.cleared.reduce((sum, id) =>
      sum + (graph.byId[id]?.kind === 'boss' ? 40 : graph.byId[id]?.kind === 'arena' ? 20 : 0), 0)) : amount(saved.coins);
    if (Array.isArray(saved.purchases)) {
      campaign.purchases = [...new Set(saved.purchases.filter(id => {
        const item = known(id)?.item;
        return item?.price > 0 && (item.kind === 'weapon' || (item.kind === 'perk' && campaign.build[item.perk] > 0));
      }))];
    }
    const equipped = known(saved.weapon)?.item;
    if (equipped?.kind === 'weapon' && (equipped.price === 0 || campaign.purchases.includes(equipped.id))) {
      campaign.weapon = equipped.weapon;
    }
    if (known(saved.supply)?.item.kind === 'supply') campaign.supply = saved.supply;
  };

  V.shopLoadout = function (campaign) {
    const name = V.weapons[campaign.weapon].name;
    return campaign.supply ? name + ' · ' + known(campaign.supply).item.name + ' bereit' : name;
  };

  V.applyShopLoadout = function (section, campaign) {
    section.weapon = V.weapons[campaign.weapon];
    if (section.kind !== 'arena' && section.kind !== 'boss' && !section.chase) return;
    const supply = known(campaign.supply)?.item;
    if (!supply) return;
    section.maxHp += supply.health ?? 0;
    section.hp += supply.health ?? 0;
    section.accelerationFactor = supply.acceleration ?? 1;
    section.supplyName = supply.name;
  };
})();
