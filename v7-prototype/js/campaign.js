(function () {
  'use strict';
  const V = window.VS7;
  const KEY = 'vulkanschnegge-v7-campaign-v1';
  const START = 'harbor';
  const LAST = 'god';
  const musicByZone = ['slow', 'mid', 'mid', 'fast', 'fast'];
  const regions = [
    { id: 'reef', boss: 'Muränenring', arena: 'Korallenriff', side: 'Hafengasse', color: '#61e7c1' },
    { id: 'greed', boss: 'Gier-Trawler', arena: 'Goldgraben', side: 'Schatzstollen', color: '#ffc36e' },
    { id: 'diva', boss: 'Diva-Resort', arena: 'Federstrand', side: 'Spiegelgrotte', color: '#ff8cc4' },
    { id: 'vortex', boss: 'Vortex-Arena', arena: 'Sturmwracks', side: 'Tiefenstrom', color: '#79b6ff' }
  ];

  function shuffled(items, random) {
    const order = [...items];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  V.generateMap = function (seed) {
    const random = V.randomFor(seed + ':map');
    const order = [regions[0], ...shuffled(regions.slice(1), random)];
    const nodes = [{ id: START, kind: 'start', name: 'Heimatbucht', x: 56, y: 171, color: '#67f1d7', biome: 'reef' }];
    const edges = [];
    let entrance = START;
    function connect(a, b, region, gate, hidden = false) {
      const id = a + '~' + b;
      const seconds = V.rules.travelMin + Math.floor(random() * (V.rules.travelMax - V.rules.travelMin + 1));
      edges.push({ id, a, b, gate, hidden, seconds, biome: region, seed: seed + ':' + id });
    }
    order.forEach((region, index) => {
      const x = 155 + index * 193;
      const arena = region.id + '-arena';
      const side = region.id + '-side';
      const base = { biome: region.id, color: region.color, tier: index + 1, gate: entrance,
        music: musicByZone[index] };
      const flip = random() < .5;
      const y = 91 + Math.floor(random() * 31);
      const bossY = 156 + Math.floor(random() * 35);
      nodes.push(
        { ...base, id: arena, kind: 'arena', name: region.arena, x, y: flip ? y : 330 - y },
        { ...base, id: side, kind: 'arena', name: region.side, x, y: flip ? 330 - y : y, optional: true },
        { ...base, id: region.id, kind: 'boss', name: region.boss, x: x + 95, y: bossY }
      );
      connect(entrance, arena, region.id, entrance);
      connect(entrance, side, region.id, entrance);
      connect(arena, side, region.id, entrance, true);
      connect(arena, region.id, region.id, entrance);
      connect(side, region.id, region.id, entrance);
      entrance = region.id;
    });
    nodes.push({ id: LAST, kind: 'boss', name: 'GOD.EXE', x: 950, y: 171, color: '#a6ff82',
      biome: LAST, gate: entrance, tier: 5, music: musicByZone[4] });
    connect(entrance, LAST, LAST, entrance);
    return { nodes, edges, byId: Object.fromEntries(nodes.map(node => [node.id, node])), lastGod: entrance, final: LAST };
  };

  V.createCampaign = function (seed, character) {
    const label = String(seed || '').trim().slice(0, 40);
    return {
      version: 1, seed: label || Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36),
      character: Object.hasOwn(V.characters, character) ? character : 'snail',
      position: START, cleared: [START], travelled: [], build: {}, arrival: null, pending: null,
      story: { intro: false, rift: false, source: false, ending: false }
    };
  };

  V.edgeVisible = function (edge, campaign) {
    if (edge.b === LAST && !campaign.story.rift) return false;
    return !edge.hidden || campaign.cleared.includes(edge.a) || campaign.cleared.includes(edge.b);
  };

  V.routesFrom = function (campaign, graph) {
    if (campaign.pending) return [];
    const position = campaign.position;
    return graph.edges.flatMap(edge => {
      const target = edge.a === position ? edge.b : edge.b === position ? edge.a : null;
      if (!target || !V.edgeVisible(edge, campaign) || !campaign.cleared.includes(edge.gate)) return [];
      if (campaign.arrival && target !== campaign.arrival.from) return [];
      if (target === edge.b && graph.byId[target].kind === 'boss' && target !== LAST &&
        !campaign.cleared.includes(edge.a)) return [];
      return [{ edge, from: position, to: target, node: graph.byId[target] }];
    });
  };

  V.arrive = function (campaign, graph, route) {
    const valid = V.routesFrom(campaign, graph).some(next => next.edge.id === route.edge.id && next.to === route.to);
    if (!valid) return false;
    if (!campaign.travelled.includes(route.edge.id)) campaign.travelled.push(route.edge.id);
    campaign.position = route.to;
    campaign.arrival = campaign.cleared.includes(route.to) ? null : { from: route.from, edge: route.edge.id };
    V.saveCampaign(campaign);
    return true;
  };

  V.completeNode = function (campaign, graph, id, random = Math.random) {
    if (campaign.pending || !campaign.arrival || campaign.position !== id || campaign.cleared.includes(id)) return false;
    const node = graph.byId[id];
    if (!node || node.kind === 'start') return false;
    const choices = V.chooseUpgrades(campaign.build, campaign.character, node.kind === 'boss', random);
    campaign.pending = { node: id, choices: choices.map(perk => perk.id) };
    V.saveCampaign(campaign);
    return true;
  };

  V.claimPerk = function (campaign, id) {
    const pending = campaign.pending;
    if (!pending || !pending.choices.includes(id) || !V.canTakePerk(id, campaign.build, campaign.character)) return false;
    campaign.build[id] = (campaign.build[id] || 0) + 1;
    campaign.cleared.push(pending.node);
    campaign.pending = null;
    campaign.arrival = null;
    V.saveCampaign(campaign);
    return true;
  };

  V.saveCampaign = function (campaign) {
    if (V.state?.testMode) return;
    try { localStorage.setItem(KEY, JSON.stringify(campaign)); } catch (_) { /* play continues with memory state */ }
  };

  V.loadCampaign = function () {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved?.version !== 1 || typeof saved.seed !== 'string' || !saved.seed.trim()) return null;
      const campaign = V.createCampaign(saved.seed, saved.character);
      const graph = V.generateMap(campaign.seed);
      if (!Object.hasOwn(graph.byId, saved.position)) return null;
      campaign.position = saved.position;
      for (const node of graph.nodes) {
        if (node.id !== START && Array.isArray(saved.cleared) && saved.cleared.includes(node.id)) campaign.cleared.push(node.id);
      }
      campaign.travelled = graph.edges.filter(edge => Array.isArray(saved.travelled) && saved.travelled.includes(edge.id)).map(edge => edge.id);
      for (const flag of Object.keys(campaign.story)) campaign.story[flag] = saved.story?.[flag] === true;
      for (const perk of V.upgradeCatalogue) {
        const count = saved.build?.[perk.id];
        if (Number.isSafeInteger(count) && count > 0 && V.canTakePerk(perk.id, {}, campaign.character)) {
          campaign.build[perk.id] = Math.min(perk.uses || graph.nodes.length, count);
        }
      }
      if (!campaign.cleared.includes(campaign.position)) {
        const origin = saved.arrival?.from;
        const edge = graph.edges.find(item => item.id === saved.arrival?.edge);
        if (!edge || !campaign.cleared.includes(origin) ||
          ![edge.a, edge.b].includes(origin) || ![edge.a, edge.b].includes(campaign.position)) return null;
        campaign.arrival = { from: origin, edge: edge.id };
        if (saved.pending?.node === campaign.position && Array.isArray(saved.pending.choices)) {
          const choices = [...new Set(saved.pending.choices)].filter(id => V.canTakePerk(id, campaign.build, campaign.character)).slice(0, 3);
          campaign.pending = { node: campaign.position, choices: choices.length ? choices : ['freehit'] };
        }
      }
      return campaign;
    } catch (_) {
      return null;
    }
  };
})();
