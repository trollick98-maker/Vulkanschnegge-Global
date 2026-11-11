(function () {
  'use strict';
  const V = window.VS7;
  const ui = V.ui;
  const state = V.state = { mode: 'launch', level: null, section: null, story: null, testMode: false };
  const step = V.rules.step;
  const updates = { travel: V.updateRunner, arcade: V.updateRunner, arena: V.updateArena, 'boss-chase': V.updateRunner, boss: V.updateCombat };
  const get = id => document.getElementById(id);
  let campaign = V.loadCampaign() || V.createCampaign('', V.profile.character);
  let regularCampaign;
  let graph = V.generateMap(campaign.seed);
  let frameAt = 0;
  let carry = 0;
  let hudAt = 0;
  V.saveCampaign(campaign);

  function transition(mode, keepMusic = false) {
    state.mode = mode;
    get('restart-btn').disabled = mode === 'outro';
    get('test-skip-btn').classList.toggle('hidden', !canSkip());
    frameAt = 0;
    carry = 0;
    V.input.reset();
    if (!keepMusic) V.audio.stop();
  }

  function canSkip() {
    return state.testMode && state.mode === 'play' && state.section.kind !== 'arcade';
  }

  function showStory(id, done) {
    transition('story', id === 'intro');
    const entry = V.stories[id];
    state.story = { entry, index: 0, done };
    if (entry.track) V.audio.startLevel('story', entry.track);
    ui.showSlide(entry.slides[0]);
    for (const slide of entry.slides.slice(1)) V.image('story-' + slide.art);
  }

  function showMap() {
    const fromTitle = state.mode === 'title';
    const returnToAtlas = fromTitle || Boolean(state.section);
    transition('map', true);
    V.audio.startMenu();
    if (fromTitle) {
      get('title-screen').classList.add('hidden');
      get('shell-header').classList.remove('hidden');
      get('shell-footer').classList.remove('hidden');
    }
    state.level = null;
    state.section = null;
    state.story = null;
    ui.map(campaign, graph, { enter: enterNode, travel: beginTravel });
    if (returnToAtlas) {
      const atlas = get('atlas-heading');
      atlas.scrollIntoView({ block: 'start' });
      if (fromTitle) atlas.focus({ preventScroll: true });
    }
    if (!campaign.story.rescue &&
      (campaign.pending?.node === graph.final || campaign.cleared.includes(graph.final))) {
      endStory();
    } else if (campaign.pending) {
      ui.reward(campaign, graph, id => {
        if (V.claimPerk(campaign, id)) showMap();
      });
    } else if (!campaign.story.rift && campaign.cleared.includes(graph.lastGod)) {
      showStory('rift', () => {
        campaign.story.rift = true;
        V.saveCampaign(campaign);
        showMap();
      });
    }
  }

  function beginTravel(route) {
    if (campaign.story.intro) {
      depart(route);
      return;
    }
    showStory('intro', () => {
      campaign.story.intro = true;
      V.saveCampaign(campaign);
      depart(route);
    });
  }

  function depart(route) {
    if (V.isBossRoute(campaign, route)) beginBoss({ kind: 'boss', node: route.node, route });
    else start({ kind: 'travel', route });
  }

  function endStory() {
    showStory('ending', () => {
      showStory('credits', () => {
        campaign.story.rescue = true;
        V.saveCampaign(campaign);
        showMap();
      });
    });
  }

  function enterNode() {
    if (!campaign.arrival || campaign.pending) return;
    const node = graph.byId[campaign.position];
    if (node.kind === 'boss') beginBoss({ kind: 'boss', node });
    else start({ kind: node.kind, node });
  }

  function beginBoss(section) {
    if (section.node.id === graph.final && !campaign.story.source) {
      showStory('source', () => {
        campaign.story.source = true;
        V.saveCampaign(campaign);
        start(section);
      });
    } else start(section);
  }

  function start(section, { skipIntro = false } = {}) {
    const intro = section.kind === 'boss' && !skipIntro;
    state.section = section;
    transition(intro ? 'boss-intro' : 'play');
    state.story = null;
    if (section.kind === 'arcade') {
      state.level = V.newRunner(null, section.character);
    } else if (section.kind === 'travel') {
      state.level = V.newRunner(section.route, campaign.character, campaign.build);
    } else if (section.kind === 'arena') {
      state.level = V.newArena(section.node, campaign.character, campaign.build, campaign.seed);
    } else {
      state.level = V.newBossChase(section.node, campaign.character, campaign.build, campaign.seed);
    }
    if (section.kind !== 'arcade') V.applyShopLoadout(state.level, campaign);
    const zone = section.route ? graph.byId[section.route.edge.b] : section.node;
    if (!intro && !skipIntro) V.startCameraCue(state.level);
    if (!intro) V.audio.startLevel(section.kind, state.level.chase?.definition.track ?? zone?.music);
    ui.showGame(state.level);
    V.render(state.level);
    hudAt = 0;
    if (intro) {
      state.bossIntroLeft = 3;
      ui.bossIntro(state.level);
    }
  }

  function startBossChase() {
    if (state.mode !== 'boss-intro') return;
    state.mode = 'play';
    frameAt = carry = 0;
    V.input.reset();
    V.audio.startLevel('boss', state.level.chase.definition.track);
    V.startCameraCue(state.level);
    get('test-skip-btn').classList.toggle('hidden', !canSkip());
    ui.showGame(state.level);
  }

  function enterBossArena(chase) {
    const s = V.newCombat(state.section.node, campaign.character, campaign.build, campaign.seed);
    V.applyShopLoadout(s, campaign);
    Object.assign(s, { hp: chase.hp, score: chase.score, coinsTaken: chase.coinsTaken,
      healAtCoins: chase.healAtCoins, trackOffset: chase.elapsed });
    V.startCameraCue(s);
    state.level = s;
    hudAt = 0;
    // Keep playing the same audio voice and keep held inputs through the handoff.
    ui.showGame(s);
    V.render(s);
  }

  function finish() {
    const level = state.level;
    const section = state.section;
    if (level.chase && level.outcome) {
      enterBossArena(level);
      return;
    }
    transition('result');
    if (!state.testMode) V.recordRun(section.kind, level);
    if (!level.outcome) {
      ui.hud(level);
      V.render(level);
      ui.result(level);
    } else if (section.kind === 'travel') {
      if (V.arrive(campaign, graph, section.route, V.sectionPayout(level)) && campaign.arrival) enterNode();
      else showMap();
    } else {
      if (!V.completeNode(campaign, graph, section.node.id, undefined, {
        route: section.route, coins: V.sectionPayout(level)
      })) {
        showMap();
        return;
      }
      if (section.node.id === graph.final) {
        level.player.dashBuffer = level.player.jumpBuffer = 0;
        level.player.vx = level.player.dashTime = level.speed = 0;
        state.outroLeft = 1.1;
        transition('outro');
      }
      else showMap();
    }
  }

  function outro(level, dt) {
    level.elapsed += dt;
    V.tickParticles(level, dt);
    state.outroLeft -= dt;
    V.movePlayer(level, dt, {});
    ui.hud(level);
    V.render(level);
    if (state.outroLeft <= 0) showMap();
  }

  function frame(ms) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = frameAt ? V.clamp((ms - frameAt) / 1000, 0, .085) : 0;
    frameAt = ms;
    V.audio.tick(dt);
    if (state.mode === 'boss-intro') {
      state.bossIntroLeft -= dt;
      if (state.bossIntroLeft <= 0) startBossChase();
      return;
    }
    if (state.mode === 'outro') {
      outro(state.level, dt);
      return;
    }
    if (state.mode !== 'play') return;

    const level = state.level;
    V.updateCameraCue(level, dt, V.input);
    V.tickParticles(level, dt);
    if (level.hitStop > 0) {
      level.hitStop = Math.max(0, level.hitStop - dt);
      V.render(level);
      return;
    }
    if (level.outcome !== null) {
      finish();
      return;
    }
    carry += dt;
    const clock = level.boss ? V.audio.bossClock() : null;
    while (carry + 1e-9 >= step) {
      carry -= step;
      updates[level.kind](level, step, V.input.consume(), clock);
      if (level.hitStop > 0) {
        carry = 0;
        break;
      }
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
    if (!get('shop-overlay').classList.contains('hidden')) ui.closeShop();
    else if (!get('leaderboard-overlay').classList.contains('hidden')) ui.dialog(null);
    else if (state.mode === 'play' || state.mode === 'boss-intro' || state.mode === 'result' || state.mode === 'outro') showMap();
  };
  get('launch-screen').addEventListener('click', event => {
    if (state.mode !== 'launch') return;
    state.mode = 'title';
    V.audio.startMenu();
    event.currentTarget.classList.add('hidden');
    const title = get('title-screen');
    title.classList.remove('hidden');
    title.focus({ preventScroll: true });
  });
  get('title-screen').addEventListener('click', event => {
    if (state.mode !== 'title') return;
    V.audio.startMenu();
    const title = event.currentTarget;
    if (!title.getAnimations) {
      title.classList.add('title-settled');
      return;
    }
    for (const animation of title.getAnimations({ subtree: true })) {
      if (animation.playState !== 'finished') animation.updatePlaybackRate(6);
    }
  });
  get('title-start').addEventListener('click', () => {
    if (state.mode === 'title') showMap();
  });
  get('shop-btn').addEventListener('click', () => {
    if (state.mode === 'map' && !campaign.pending) ui.shop(campaign, graph);
  });
  get('boss-intro-next').addEventListener('click', startBossChase);
  get('back-btn').addEventListener('click', V.backToMap);
  get('home').addEventListener('click', showMap);
  function retry() {
    start(state.section, { skipIntro: true });
  }
  get('restart-btn').addEventListener('click', retry);
  get('replay').addEventListener('click', retry);
  get('arcade-btn').addEventListener('click', () => start({ kind: 'arcade', character: V.profile.character }));
  get('test-skip-btn').addEventListener('click', () => {
    if (!canSkip()) return;
    const level = state.level;
    if (level.boss) V.defeatBoss(level);
    level.outcome = true;
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
    if (slide) ui.showSlide(slide);
    else {
      state.story = null;
      story.done();
    }
  });
  document.addEventListener('visibilitychange', () => {
    frameAt = 0;
    carry = 0;
    V.input.reset();
    const player = state.level?.player;
    if (player) player.jumpBuffer = player.dashBuffer = 0;
  });
  requestAnimationFrame(frame);
})();
