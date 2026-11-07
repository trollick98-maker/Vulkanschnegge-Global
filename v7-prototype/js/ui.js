(function () {
  'use strict';
  const V = window.VS7;
  const get = id => document.getElementById(id);
  const world = get('world-ui');
  const game = get('game-panel');
  const plot = get('map-plot');
  const dialogs = ['upgrade-overlay', 'leaderboard-overlay', 'result', 'story-overlay'].map(get);
  const NS = 'http://www.w3.org/2000/svg';
  const difficultyLabels = { common: 'Häufig', rare: 'Selten', epic: 'Episch' };
  const kinds = { travel: 'REISE', arena: 'GEGNERLEVEL', boss: 'BOSS-RUNNER', arcade: 'ENDLOS' };

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

  function dialog(id) {
    for (const item of dialogs) item.classList.toggle('hidden', item.id !== id);
    world.inert = Boolean(id);
    game.inert = Boolean(id);
    if (id) get(id).querySelector('button')?.focus({ preventScroll: true });
  }

  function refreshCharacters() {
    for (const control of document.querySelectorAll('[data-character]')) {
      const selected = control.dataset.character === V.profile.character;
      control.classList.toggle('selected', selected);
      control.setAttribute('aria-pressed', String(selected));
    }
    content('character-detail', V.characters[V.profile.character].detail);
  }

  function map(campaign, graph, handlers) {
    game.classList.add('hidden');
    world.classList.remove('hidden');
    dialog(null);
    plot.replaceChildren();
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
        (route ? ', Reise ' + duration(route.edge.seconds) : cleared ? ', abgeschlossen' : ''));
      if (current) marker.setAttribute('aria-current', 'location');
      const icon = document.createElement('span');
      icon.className = 'node-symbol';
      icon.textContent = symbol;
      if (node.id === 'reef-side' || (node.kind === 'boss' && node.biome !== 'reef')) {
        const art = document.createElement('img');
        art.className = 'node-landmark';
        art.alt = '';
        art.addEventListener('error', () => { icon.textContent = symbol; });
        art.src = V.imagePath('landmark-' + node.biome);
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
      const label = (route.edge.hidden ? 'Tunnel · ' : '') + route.node.name + ' · ' + duration(route.edge.seconds);
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
    content('level-kind', kinds[s.kind]);
    content('level-title', s.title);
    content('level-tip', s.kind === 'boss' ? s.boss.definition.counter :
      s.kind === 'arena' ? 'Anlauf nehmen · Panzer-Dash auf Gegner' : 'Springen · Kisten per Dash zerlegen');
    hud(s);
    get('game').focus({ preventScroll: true });
  }

  function hud(s) {
    content('hud-stats', '♥ ' + s.hp + ' / ' + s.maxHp + '    ◈ ' + s.coinsTaken);
    content('hud-score', Math.floor(s.score) + ' P · ×' + s.multiplier + ' · ' + Math.round(s.speed) + ' Tempo');
    const alive = s.kind === 'arena' ? s.enemies.filter(enemy => enemy.hp > 0).length : 0;
    const label = s.kind === 'boss' ? 'BOSS · PHASE ' + (s.boss.phase + 1) :
      s.kind === 'travel' ? 'REISEZEIT' : s.kind === 'arena' ? 'WELLE ' + s.wave + ' / ' + s.waves : 'DISTANZ';
    const value = s.kind === 'boss' ? s.boss.hp + ' / ' + s.boss.maxHp : s.kind === 'travel' ?
      duration(Math.max(0, Math.ceil(s.duration - s.elapsed))) : s.kind === 'arena' ?
        alive + ' Gegner' : Math.floor(s.dist) + ' m';
    const ratio = s.kind === 'boss' ? s.boss.hp / s.boss.maxHp : s.kind === 'travel' ?
      s.elapsed / s.duration : s.kind === 'arena' ? 1 - alive / s.enemies.length : 0;
    content('hud-number', value);
    content('hud-label', label);
    const width = Math.min(100, Math.round(ratio * 100)) + '%';
    if (get('hud-meter').style.width !== width) get('hud-meter').style.width = width;
    const tell = s.boss?.tell;
    content('level-message', tell ? V.bossAttacks[tell.key].warning : s.feedbackTime > 0 ? s.feedback : '');
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

  function showSlide(slide, character) {
    get('story-card').dataset.art = slide.art;
    get('story-card').querySelector('.story-snail').src = V.imagePath(character);
    content('story-label', slide.label);
    content('story-line', slide.line);
    content('story-note', slide.note || '');
    content('story-next', slide.button);
    dialog('story-overlay');
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

  V.ui = { map, showGame, hud, reward, result, showSlide, dialog };
})();
