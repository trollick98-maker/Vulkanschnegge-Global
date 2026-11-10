(function () {
  'use strict';
  const V = window.VS7;
  const get = id => document.getElementById(id);
  const world = get('world-ui');
  const game = get('game-panel');
  const plot = get('map-plot');
  const dialogs = ['upgrade-overlay', 'leaderboard-overlay', 'result', 'story-overlay', 'boss-intro', 'shop-overlay'].map(get);
  const NS = 'http://www.w3.org/2000/svg';
  const difficultyLabels = { common: 'Häufig', rare: 'Selten', epic: 'Episch' };
  const kinds = { travel: 'REISE', arena: 'GEGNERLEVEL', arcade: 'ENDLOS' };

  function content(id, value) {
    const element = get(id);
    if (element.textContent !== value) element.textContent = value;
  }

  function button(label, className, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = className;
    control.textContent = label;
    control.addEventListener('click', action);
    return control;
  }

  function duration(seconds) {
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }

  function routeDuration(campaign, route) {
    return V.isBossRoute(campaign, route) ? 'Bosskampf' :
      'Reise · ' + duration(route.edge.seconds);
  }

  function dialog(id) {
    for (const item of dialogs) item.classList.toggle('hidden', item.id !== id);
    world.inert = Boolean(id);
    game.inert = Boolean(id);
    if (id) get(id).querySelector('button')?.focus({ preventScroll: true });
  }

  function refreshCharacters() {
    const character = V.profile.character;
    for (const control of document.querySelectorAll('[data-character]')) {
      const selected = control.dataset.character === character;
      control.classList.toggle('selected', selected);
      control.setAttribute('aria-pressed', String(selected));
    }
    for (const art of document.querySelectorAll('[data-player-art]')) {
      if (art.dataset.playerArt === character) continue;
      art.dataset.playerArt = character;
      art.src = V.imagePath(character);
    }
    content('character-detail', V.characters[character].detail);
  }

  function drawMapTerrain(campaign, graph) {
    const terrain = document.createElement('div');
    terrain.className = 'map-terrain';
    terrain.setAttribute('aria-hidden', 'true');
    for (const node of graph.nodes) {
      if (node.kind === 'arena' || (node.id === graph.final && !campaign.story.rift)) continue;
      const harbor = node.kind === 'start';
      const rift = node.id === graph.final;
      const art = document.createElement('img');
      art.alt = '';
      art.decoding = 'async';
      art.className = harbor || rift ? 'map-island map-island-small' : 'map-island';
      art.style.left = (node.x - (harbor || rift ? 0 : 62)) / 10 + '%';
      art.src = V.imagePath('map-' + (harbor ? 'harbor' : node.biome));
      terrain.append(art);
    }
    plot.append(terrain);
  }

  function map(campaign, graph, handlers) {
    game.classList.add('hidden');
    world.classList.remove('hidden');
    dialog(null);
    plot.replaceChildren();
    drawMapTerrain(campaign, graph);
    const routes = V.routesFrom(campaign, graph);
    const byTarget = new Map(routes.map(route => [route.to, route]));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 330');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    for (const edge of graph.edges) {
      if (!V.edgeVisible(edge, campaign)) continue;
      const a = graph.byId[edge.a];
      const b = graph.byId[edge.b];
      const line = document.createElementNS(NS, 'path');
      const mid = (a.x + b.x) / 2;
      line.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' C ' + mid + ' ' + a.y + ' ' + mid + ' ' + b.y + ' ' + b.x + ' ' + b.y);
      const status = routes.some(route => route.edge === edge) ? ' open' : campaign.travelled.includes(edge.id) ? ' done' : '';
      line.setAttribute('class', 'map-route' + status + (edge.hidden ? ' tunnel' : ''));
      svg.append(line);
    }
    plot.append(svg);

    for (const node of graph.nodes) {
      if (node.id === graph.final && !campaign.story.rift) continue;
      const current = node.id === campaign.position;
      const cleared = campaign.cleared.includes(node.id);
      const route = byTarget.get(node.id);
      const canEnter = current && campaign.arrival && !campaign.pending;
      const symbol = current ? '◉' : cleared ? '✓' : node.kind === 'boss' ? '✦' : '◆';
      const marker = button('', 'map-node ' + (current ? 'current ' : '') + (route || canEnter ? 'open ' : '') +
        (cleared ? 'done ' : '') + (node.kind === 'boss' ? 'boss' : ''), () => {
        if (canEnter) handlers.enter();
        else if (route) handlers.travel(route);
      });
      marker.dataset.node = node.id;
      marker.style.left = node.x / 10 + '%';
      marker.style.top = node.y / 3.3 + '%';
      marker.style.setProperty('--node', node.color);
      marker.disabled = !route && !canEnter;
      marker.setAttribute('aria-label', node.name + (current ? ', aktueller Standort' : '') +
        (route ? ', ' + routeDuration(campaign, route) : cleared ? ', abgeschlossen' : ''));
      if (current) marker.setAttribute('aria-current', 'location');
      const icon = document.createElement('span');
      icon.className = 'node-symbol';
      icon.textContent = symbol;
      if (node.id === 'reef-side' || node.kind === 'boss') {
        const art = document.createElement('img');
        art.className = 'node-landmark';
        art.alt = '';
        art.addEventListener('error', () => { icon.textContent = symbol; });
        art.src = V.imagePath((node.kind === 'boss' ? 'boss-badge-' : 'landmark-') + node.biome);
        const badge = document.createElement('span');
        badge.className = 'node-badge';
        badge.textContent = symbol;
        icon.textContent = '';
        icon.append(art, badge);
      }
      const label = document.createElement('span');
      label.className = 'node-name';
      label.textContent = node.name;
      marker.append(icon, label);
      plot.append(marker);
    }

    refreshWallet(campaign);
    content('seed-badge', 'SEED ' + campaign.seed);
    content('map-location', graph.byId[campaign.position].name);
    const bosses = graph.nodes.filter(node => node.kind === 'boss' && campaign.cleared.includes(node.id)).length;
    content('map-caption', V.characters[campaign.character].name + ' · ' + bosses + ' / ' +
      (campaign.story.rift ? '5' : '4') + ' Bosse bezwungen');
    content('location-label', campaign.story.ending ? 'KAMPAGNE ABGESCHLOSSEN' : 'AKTUELLER STANDORT');

    const choices = get('route-choices');
    choices.replaceChildren();
    if (campaign.arrival && !campaign.pending) choices.append(button('Kampf starten', 'primary', handlers.enter));
    for (const route of routes) {
      const label = (route.edge.hidden ? 'Tunnel · ' : '') + route.node.name + ' · ' + routeDuration(campaign, route);
      const control = button(label, 'quiet', () => handlers.travel(route));
      control.dataset.travel = route.to;
      choices.append(control);
    }

    const build = get('build-list');
    build.replaceChildren();
    for (const [id, count] of Object.entries(campaign.build)) {
      const perk = V.perksById[id];
      const chip = document.createElement('span');
      chip.className = 'perk-chip ' + perk.tier;
      chip.textContent = perk.name + (count > 1 ? ' ×' + count : '');
      chip.title = perk.effect;
      build.append(chip);
    }
    if (!build.childElementCount) build.textContent = 'Perks gibt es nach dem ersten Sieg.';
    const scroll = get('map-scroll');
    const position = graph.byId[campaign.position].x / 1000;
    if (scroll.scrollWidth > scroll.clientWidth) scroll.scrollLeft = Math.max(0, scroll.scrollWidth * position - scroll.clientWidth / 2);
  }

  function showGame(s) {
    dialog(null);
    world.classList.add('hidden');
    game.classList.remove('hidden');
    content('level-title', s.title);
    hud(s);
    get('game').focus({ preventScroll: true });
  }

  function hud(s) {
    const p = s.player;
    const local = V.usesMomentum(s);
    const b = s.boss;
    const kind = b ? 'BOSS · PHASE ' + (b.phase + 1) + ' / 3' : kinds[s.kind];
    content('level-kind', s.supplyName ? kind + ' · ' + s.supplyName : kind);
    content('level-tip', b ? b.plan?.attack.hint ?? b.definition.tip :
      local ? 'Anlauf nehmen · Gegner besiegen · Ziel rechts' : 'Springen · Kisten per Dash zerlegen');
    content('test-skip-btn', 'Abschnitt überspringen');
    const dashReady = p.dashCooldown <= 0 && (p.dashTime <= 0 || (local && p.dashLeft <= 0)) && (!local || p.airDash);
    content('hud-life', s.hp + ' / ' + s.maxHp);
    content('hud-coins', '◈ ' + s.coinsTaken);
    content('hud-dash', dashReady ? 'bereit' : 'lädt');
    const dash = local ? ' · ' + s.weapon.name + ' ' + (p.dashTime > 0 ? p.dashPower : V.weaponDamage(s, s.speed)) : '';
    content('hud-score', Math.floor(s.score) + ' P · ' + Math.round(s.speed) + ' Tempo' + dash);
    const alive = s.kind === 'arena' ? s.enemies.filter(enemy => enemy.hp > 0).length : 0;
    const label = b ? b.definition.phases[b.phase].toUpperCase() + ' · BOSS-HP' :
      s.kind === 'travel' ? 'REISEZEIT' : s.kind === 'arena' ? 'KAMPFSTRECKE' : 'DISTANZ';
    const value = b ? b.hp + ' / ' + b.maxHp : s.kind === 'travel' ?
      duration(Math.max(0, Math.ceil(s.duration - s.elapsed))) : s.kind === 'arena' ?
        (alive ? alive + ' Gegner' : 'Zum Ziel →') : Math.floor(s.dist) + ' m';
    const ratio = b ? b.hp / b.maxHp : s.kind === 'travel' ?
      s.elapsed / s.duration : s.kind === 'arena' ? 1 - alive / s.enemies.length : 0;
    content('hud-number', value);
    content('hud-label', label);
    get('hud-track').classList.toggle('boss-hp', Boolean(b));
    const width = Math.min(100, Math.round(ratio * 100)) + '%';
    if (get('hud-meter').style.width !== width) get('hud-meter').style.width = width;
    const effects = b ? Object.keys(s.arenaFX).map(key => V.bossArenaEffects[key]) : [];
    const warning = b?.plan?.attack.name;
    content('level-message', [s.feedbackTime > 0 ? s.feedback : '', warning, ...effects].filter(Boolean).join(' · '));
  }

  const shopLabels = {
    equip: 'Ausrüsten', equipped: 'Ausgerüstet', ready: 'Bereit', 'supply-full': 'Proviantplatz belegt',
    owned: 'Gekauft', maxed: 'Bereits ausgebaut', poor: 'Münzen fehlen'
  };

  function refreshWallet(campaign) {
    content('wallet-coins', campaign.coins + ' Münzen');
    content('shop-loadout', 'Ausrüstung · ' + V.shopLoadout(campaign));
  }

  function shopItem(campaign, graph, id, item) {
    const card = document.createElement('article');
    card.className = 'shop-item';
    const art = document.createElement('img');
    art.src = V.imagePath(item.art);
    art.alt = '';
    const title = document.createElement('h4');
    title.textContent = item.name;
    const detail = document.createElement('p');
    detail.textContent = item.detail;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = item.price ? item.price + ' Münzen' : 'Startausrüstung';
    const status = V.shopStatus(campaign, graph, item.id);
    const control = button(status === 'buy' ? 'Kaufen' : shopLabels[status] ?? 'Gesperrt', 'quiet', () => {
      if (!V.shopPurchase(campaign, graph, item.id)) return;
      const message = item.weapon ? item.name + ' ausgerüstet.' : item.name + ' gekauft.';
      shop(campaign, graph, id, message, 'shop-item-' + item.id);
    });
    control.id = 'shop-item-' + item.id;
    control.dataset.item = item.id;
    control.disabled = status !== 'buy' && status !== 'equip';
    control.setAttribute('aria-label', item.name + ' · ' + control.textContent + ' · ' + price.textContent);
    card.append(art, title, detail, price, control);
    return card;
  }

  function shop(campaign, graph, id = 'supplies', message = '', focus = '') {
    const stall = V.shops[id];
    const unlocked = V.shopOpen(stall, campaign, graph);
    refreshWallet(campaign);
    content('shop-wallet', campaign.coins + ' Münzen');
    content('shop-category', stall.name.toUpperCase());
    content('shop-keeper', stall.keeper);
    content('shop-line', stall.line);
    content('shop-status', unlocked ? message || V.shopLoadout(campaign) : 'Freischaltung · ' + stall.lock);
    get('shop-portrait').src = V.imagePath(stall.portrait);
    const tabs = get('shop-stalls');
    tabs.replaceChildren();
    for (const [key, option] of Object.entries(V.shops)) {
      const suffix = V.shopOpen(option, campaign, graph) ? '' : ' · gesperrt';
      const tab = button(option.name + suffix, 'quiet shop-stall', () => shop(campaign, graph, key, '', 'shop-tab-' + key));
      tab.id = 'shop-tab-' + key;
      tab.dataset.shop = key;
      tab.setAttribute('aria-pressed', String(id === key));
      tabs.append(tab);
    }
    const stock = get('shop-stock');
    stock.replaceChildren(...stall.items.map(item => shopItem(campaign, graph, id, item)));
    if (get('shop-overlay').classList.contains('hidden')) dialog('shop-overlay');
    else if (focus) {
      const target = get(focus);
      (target && !target.disabled ? target : get('shop-tab-' + id))?.focus({ preventScroll: true });
    }
  }

  function closeShop() {
    dialog(null);
    get('shop-btn').focus({ preventScroll: true });
  }

  function reward(campaign, graph, select) {
    const pending = campaign.pending;
    const node = graph.byId[pending.node];
    content('reward-tag', node.name.toUpperCase() + ' · ' + (node.kind === 'boss' ? 'BOSS BESIEGT' : 'LEVEL ABGESCHLOSSEN'));
    const choices = get('upgrade-choices');
    choices.replaceChildren();
    for (const id of pending.choices) {
      const perk = V.perksById[id];
      const control = button('', 'upgrade-choice ' + perk.tier, () => select(id));
      control.dataset.perk = id;
      const name = document.createElement('strong');
      name.textContent = perk.name;
      const tier = document.createElement('span');
      tier.className = 'perk-tier';
      tier.textContent = difficultyLabels[perk.tier];
      const effect = document.createElement('small');
      effect.textContent = perk.effect;
      control.append(name, tier, effect);
      choices.append(control);
    }
    dialog('upgrade-overlay');
  }

  function result(s) {
    content('result-tag', s.kind === 'arcade' ? 'ENDLOS-MODUS' : 'ABSCHNITT BEENDET');
    content('result-title', s.kind === 'arcade' ? 'Run beendet' : 'Nochmal?');
    content('result-description', s.title + ' · ' + Math.floor(s.score) + ' Punkte · ' + s.coinsTaken + ' Münzen');
    dialog('result');
  }

  function showSlide(slide) {
    const art = get('story-illustration');
    art.alt = slide.alt;
    art.src = V.imagePath('story-' + slide.art);
    content('story-label', slide.label);
    content('story-line', slide.line);
    content('story-note', slide.note || '');
    content('story-next', slide.button);
    dialog('story-overlay');
  }

  function bossIntro(s) {
    const art = get('boss-intro-image');
    art.alt = 'Der winzige Schnegg steht vor ' + s.title + '.';
    art.src = V.imagePath('boss-intro-' + s.biome);
    content('boss-intro-name', s.title);
    content('boss-intro-place', 'BOSS · ' + s.node.name.toUpperCase());
    dialog('boss-intro');
  }

  function recordRow(target, name, score) {
    const row = document.createElement('div');
    row.className = 'record-row';
    const title = document.createElement('span');
    title.textContent = name;
    const value = document.createElement('strong');
    value.textContent = score;
    row.append(title, value);
    target.append(row);
  }

  function showBoard() {
    const list = get('leaderboard-rows');
    list.replaceChildren();
    if (V.classicHighscore > 0) recordRow(list, 'Klassischer Bestwert', V.classicHighscore + ' P');
    if (!V.records.length) recordRow(list, 'Lokale Rekorde', 'Noch leer');
    for (const [i, record] of V.records.slice(0, 10).entries()) {
      const date = /^\d{4}-\d\d-\d\d$/.test(record.time || '') ? record.time.split('-').reverse().join('.') : '';
      recordRow(list, (i + 1) + '. ' + record.name + ' · ' + (V.characters[record.character]?.name || 'Schnegg') +
        (date ? ' · ' + date : ''), record.score + ' P');
    }
    dialog('leaderboard-overlay');
  }

  get('online-board-btn').addEventListener('click', async event => {
    const control = event.currentTarget;
    const rows = get('online-board-rows');
    control.disabled = true;
    rows.textContent = 'Lade Rangliste …';
    try {
      const items = await V.loadLegacyLeaderboard();
      rows.replaceChildren();
      if (!items.length) rows.textContent = 'Noch keine Einträge.';
      for (const [i, entry] of items.entries()) {
        recordRow(rows, (i + 1) + '. ' + entry.name + (entry.date ? ' · ' + entry.date : ''), entry.score + ' P');
      }
    } catch (_) {
      rows.textContent = 'Gerade nicht erreichbar. Du kannst es erneut versuchen.';
    } finally {
      control.disabled = false;
    }
  });

  get('board-btn').addEventListener('click', showBoard);
  get('shop-close').addEventListener('click', closeShop);
  get('board-close').addEventListener('click', () => dialog(null));
  get('fullscreen-btn').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { /* Browser may restrict fullscreen. */ }
  });
  get('sound-btn').addEventListener('click', event => {
    const enabled = !V.audio.isEnabled();
    V.audio.setEnabled(enabled);
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.querySelector('span').textContent = enabled ? 'Musik an' : 'Musik aus';
  });
  get('effects-btn').addEventListener('click', event => {
    const enabled = !V.audio.effectsEnabled();
    V.audio.setEffectsEnabled(enabled);
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.querySelector('span').textContent = enabled ? 'Effekte an' : 'Effekte aus';
  });
  get('volume').addEventListener('input', event => V.audio.volume(Number(event.target.value)));
  get('player-name').value = V.profile.name;
  get('player-name').addEventListener('input', event => {
    V.profile.name = event.target.value.trim().slice(0, 24);
    V.saveProfile();
  });
  for (const control of document.querySelectorAll('[data-character]')) {
    const character = control.dataset.character;
    control.querySelector('img').src = V.imagePath(character);
    control.addEventListener('click', () => {
      V.profile.character = character;
      V.saveProfile();
      refreshCharacters();
    });
  }
  refreshCharacters();

  V.ui = { map, showGame, hud, shop, closeShop, reward, result, showSlide, bossIntro, dialog };
})();
