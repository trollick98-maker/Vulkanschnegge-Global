(function () {
  'use strict';
  const V = window.VS7;
  const ui = V.ui;
  const state = V.state = { mode: 'map', level: null, section: null, story: null, testMode: false };
  const step = V.rules.step;
  const updates = { travel: V.updateRunner, arcade: V.updateRunner, arena: V.updateArena, boss: V.updateCombat };
  const get = id => document.getElementById(id);
  let campaign = V.loadCampaign() || V.createCampaign('', V.profile.character);
  let regularCampaign;
  let graph = V.generateMap(campaign.seed);
  let frameAt = 0;
  let carry = 0;
  let hudAt = 0;
  V.saveCampaign(campaign);

  function transition(mode) {
    state.mode = mode;
    get('restart-btn').disabled = mode === 'outro';
    get('test-skip-btn').classList.toggle('hidden', !canSkip());
    frameAt = 0;
    carry = 0;
    V.input.reset();
    V.audio.stop();
  }

  function canSkip() {
    return state.testMode && state.mode === 'play' && state.section.kind !== 'arcade';
  }

  function showStory(id, done) {
    transition('story');
    const entry = V.stories[id];
    state.story = { entry, index: 0, done };
    if (entry.track) V.audio.startLevel('story', entry.track);
    ui.showSlide(entry.slides[0], campaign.character);
  }

  function showMap() {
    transition('map');
    state.level = null;
    state.section = null;
    state.story = null;
    ui.map(campaign, graph, { enter: enterNode, travel: route => start({ kind: 'travel', route }) });
    if (campaign.pending) {
      ui.reward(campaign, graph, id => {
        if (V.claimPerk(campaign, id)) showMap();
      });
    } else if (!campaign.story.intro) {
      showStory('intro', () => {
        campaign.story.intro = true;
        V.saveCampaign(campaign);
        showMap();
      });
    } else if (!campaign.story.rift && campaign.cleared.includes(graph.lastGod)) {
      showStory('rift', () => {
        campaign.story.rift = true;
        V.saveCampaign(campaign);
        showMap();
      });
    } else if (!campaign.story.ending && campaign.cleared.includes(graph.final)) {
      endStory();
    }
  }

  function endStory() {
    showStory('ending', () => {
      showStory('credits', () => {
        campaign.story.ending = true;
        V.saveCampaign(campaign);
        showMap();
      });
    });
  }

  function enterNode() {
    if (!campaign.arrival || campaign.pending) return;
    const node = graph.byId[campaign.position];
    if (node.id === graph.final && !campaign.story.source) {
      showStory('source', () => {
        campaign.story.source = true;
        V.saveCampaign(campaign);
        start({ kind: 'boss', node });
      });
    } else {
      start({ kind: node.kind, node });
    }
  }

  function start(section) {
    state.section = section;
    transition('play');
    state.story = null;
    if (section.kind === 'arcade') {
      state.level = V.newRunner(null, section.character);
    } else if (section.kind === 'travel') {
      state.level = V.newRunner(section.route, campaign.character, campaign.build);
    } else if (section.kind === 'arena') {
      state.level = V.newArena(section.node, campaign.character, campaign.build, campaign.seed);
    } else {
      state.level = V.newCombat(section.node, campaign.character, campaign.build, campaign.seed);
    }
    const zone = section.route ? graph.byId[section.route.edge.b] : section.node;
    V.audio.startLevel(section.kind, state.level.boss?.definition.track ?? zone?.music);
    ui.showGame(state.level);
    V.render(state.level);
    hudAt = 0;
  }

  function finish() {
    const level = state.level;
    const section = state.section;
    transition('result');
    if (!state.testMode) V.recordRun(section.kind, level);
    if (!level.outcome) {
      ui.hud(level);
      V.render(level);
      ui.result(level);
    } else if (section.kind === 'travel') {
      if (V.arrive(campaign, graph, section.route) && campaign.arrival) enterNode();
      else showMap();
    } else {
      V.completeNode(campaign, graph, section.node.id);
      if (section.node.id === graph.final) transition('outro');
      else showMap();
    }
  }

  function coast(level, dt) {
    level.elapsed += dt;
    level.dist += level.speed * dt;
    level.speed = Math.max(0, level.speed - 245 * dt);
    V.movePlayer(level, dt, {});
    ui.hud(level);
    V.render(level);
    if (level.speed === 0) showMap();
  }

  function frame(ms) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = frameAt ? V.clamp((ms - frameAt) / 1000, 0, .085) : 0;
    frameAt = ms;
    V.audio.tick(dt);
    if (state.mode === 'outro') {
      coast(state.level, dt);
      return;
    }
    if (state.mode !== 'play') return;

    carry += dt;
    const level = state.level;
    while (carry + 1e-9 >= step) {
      carry -= step;
      updates[level.kind](level, step, V.input.consume());
      if (level.outcome !== null) {
        finish();
        return;
      }
      if (level.kind === 'arcade') V.audio.updateRunner(level.speed, step);
    }
    if (ms >= hudAt) {
      hudAt = ms + 76;
      ui.hud(level);
    }
    V.render(level);
  }

  V.backToMap = function () {
    if (!get('leaderboard-overlay').classList.contains('hidden')) ui.dialog(null);
    else if (state.mode === 'play' || state.mode === 'result' || state.mode === 'outro') showMap();
  };
  get('back-btn').addEventListener('click', V.backToMap);
  get('home').addEventListener('click', showMap);
  get('restart-btn').addEventListener('click', () => start(state.section));
  get('replay').addEventListener('click', () => start(state.section));
  get('arcade-btn').addEventListener('click', () => start({ kind: 'arcade', character: V.profile.character }));
  get('test-skip-btn').addEventListener('click', () => {
    if (!canSkip()) return;
    const level = state.level;
    level.outcome = true;
    if (level.boss) level.boss.hp = 0;
    finish();
  });
  get('campaign-form').addEventListener('submit', event => {
    event.preventDefault();
    const seedInput = get('seed-input');
    if (seedInput.value.trim().toLowerCase() === 'admin') {
      if (state.testMode) {
        campaign = regularCampaign;
        regularCampaign = undefined;
      } else {
        regularCampaign = campaign;
        campaign = structuredClone(campaign);
      }
      state.testMode = !state.testMode;
      get('test-mode-status').classList.toggle('hidden', !state.testMode);
      seedInput.value = '';
      graph = V.generateMap(campaign.seed);
      showMap();
      return;
    }
    if ((campaign.travelled.length || campaign.arrival) &&
      !window.confirm('Eine neue Kampagne ersetzt diesen Kampagnenspielstand. Neu starten?')) return;
    campaign = V.createCampaign(seedInput.value, V.profile.character);
    graph = V.generateMap(campaign.seed);
    V.saveCampaign(campaign);
    showMap();
  });
  get('story-next').addEventListener('click', () => {
    const story = state.story;
    if (!story) return;
    story.index++;
    const slide = story.entry.slides[story.index];
    if (slide) ui.showSlide(slide, campaign.character);
    else {
      state.story = null;
      story.done();
    }
  });
  document.addEventListener('visibilitychange', () => {
    frameAt = 0;
    carry = 0;
    V.input.reset();
  });
  showMap();
  requestAnimationFrame(frame);
})();
