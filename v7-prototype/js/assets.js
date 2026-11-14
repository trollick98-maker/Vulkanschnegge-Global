/* Local asset manifest. Only the active scene requests its images and tracks. */
(function () {
  'use strict';
  const V = window.VS7;
  const images = {
    snail: 'snail.png', otter: 'otter.png', frog: 'frog.png', bossEel: 'boss-eel.png',
    plasma: 'plasma.png', toxic: 'toxic.png', platform: 'platform.png', mine: 'mine.png',
    crate: 'crate.png', atlas: 'boss-atlas.webp', katana: 'waffen/katana.png',
    coin: 'umgebung/coin.png', 'exit-closed': 'umgebung/exit-closed.png', 'exit-open': 'umgebung/exit-open.png',
    'platform-god': 'umgebung/platform-god.png',
    'landmark-reef': 'umgebung/landmark-reef-tunnel.png',
    'landmark-greed': 'umgebung/landmark-greed-vault.png',
    'landmark-diva': 'umgebung/landmark-diva-theater.png',
    'landmark-vortex': 'umgebung/landmark-vortex-wreck.png',
    'landmark-god': 'umgebung/landmark-god-rift.png'
  };
  for (const biome of ['reef', 'greed', 'diva', 'vortex']) {
    const platform = 'platform-' + biome;
    images[platform] = 'umgebung/' + platform + '.png';
    images['ground-' + biome] = 'umgebung/ground-' + biome + '.png';
    for (const pose of ['idle', 'active']) {
      images['trap-' + biome + '-' + pose] = 'fallen/' + biome + '-' + pose + '.png';
    }
    for (const role of ['crawler', 'jumper', 'armored']) {
      const key = biome + '-' + role;
      images[key] = 'gegner/' + key + '.png';
    }
  }
  for (const attack of ['net', 'ingot', 'gold', 'star', 'feathers', 'anchor', 'surge', 'fault', 'packet']) {
    images[attack] = 'boss-angriffe/' + attack + '.png';
  }
  for (const place of ['harbor', 'reef', 'greed', 'diva', 'vortex', 'god']) {
    images['map-' + place] = 'weltkarte/' + place + '.webp';
  }
  for (const scene of [
    'intro-harbor', 'intro-omens', 'intro-taken-v2', 'intro-sealed', 'intro-pursuit',
    'rift-v2', 'source', 'rescue-release', 'rescue-reunion', 'rescue-escape', 'rescue-bridge', 'rescue-home'
  ]) {
    images['story-' + scene] = 'story/' + scene + '.webp';
  }
  for (const biome of ['reef', 'greed', 'diva', 'vortex', 'god']) {
    images['boss-intro-' + biome] = 'boss-intros/' + biome + '.webp';
    images['panorama-' + biome] = 'cinematic/' + biome + '.webp';
    images['clear-boss-' + biome] = 'clear/boss-' + biome + '.webp';
    if (biome !== 'god') images['clear-' + biome] = 'clear/' + biome + '.webp';
  }
  V.weaponArt = ['war-hammer', 'weapon-lightning', 'weapon-shock', 'weapon-dust', 'weapon-slash', 'weapon-thrust'];
  for (const art of V.weaponArt) images[art] = 'waffen/' + art + '.png';
  V.godForms = ['god-echo', 'god-overwrite', 'god-panic'];
  for (const form of V.godForms) images[form] = 'god-exe/' + form.slice(4) + '.png';
  V.arenaGlitchArt = ['panorama', 'boss', 'deck', 'ground', 'prop-a', 'prop-b', 'shot', 'hazard', 'warning', 'burst'];
  for (const theme of ['garden', 'inferno', 'race']) {
    for (const part of V.arenaGlitchArt) {
      images['glitch-' + theme + '-' + part] = 'arena-glitch/' + theme + '/' + part + (part === 'panorama' ? '.webp' : '.png');
    }
  }
  V.animationBiomes = ['reef', 'greed', 'diva', 'vortex'];
  V.animationSheets = ['bosses', 'shadow', 'dimensions', 'reinforcements', 'variants', ...V.animationBiomes];
  for (const sheet of V.animationSheets) images['anim-' + sheet] = 'animation/' + sheet + '.webp';
  images['gladiator-atlas'] = 'arena-glitch/inferno/gladiator.webp';
  V.sceneryProps = {
    reef: ['fan-coral', 'dive-lantern', 'porthole', 'reef-eel'],
    greed: ['brass-bollard', 'doubloons', 'anchor-chain', 'brass-urn'],
    diva: ['pearl-shell', 'opera-mask', 'footlight', 'velvet'],
    vortex: ['frozen-dumbbell', 'ice-gauge'],
    god: ['split-terminal', 'fractured-column']
  };
  for (const name of Object.values(V.sceneryProps).flat()) images['scenery-' + name] = 'cinematic/' + name + '.png';
  V.regionalEffects = {
    reef: ['bubble', 'reef-spark', 'splash'],
    greed: ['gold-shard', 'gold-glint', 'gold-flame'],
    diva: ['feather', 'stage-star', 'sound-arc'],
    vortex: ['ice-crystal', 'vapour', 'ice-surge'],
    god: ['pixel-break', 'scan-pulse', 'glitch-shard']
  };
  for (const name of [...Object.values(V.regionalEffects).flat(), 'ember-streak']) {
    images['ambient-fx-' + name] = 'cinematic/fx-' + name + '.png';
  }
  for (const effect of ['hit', 'hurt', 'guard', 'parry']) {
    images['impact-' + effect] = 'treffer/' + effect + '.png';
  }
  for (const effect of ['dash', 'dash-fast', 'skid']) {
    images['movement-' + effect] = 'bewegung/' + effect + '.png';
  }
  for (const sprite of [
    'warn-electric', 'warn-jump', 'warn-target', 'warn-fault',
    'shot-bubble', 'shot-wave', 'shot-weight', 'shot-fault',
    'prop-gold-chest', 'prop-trap-chest', 'prop-gold-gauntlet', 'prop-stage-curtain',
    'fx-katana-cut', 'fx-weak-reticle', 'fx-parry', 'fx-boss-defeat',
    'boss-badge-reef', 'boss-badge-greed', 'boss-badge-diva', 'boss-badge-vortex', 'boss-badge-god',
    'hud-heart', 'hud-dash', 'map-compass'
  ]) images[sprite] = 'spritepack/' + sprite + '.png';
  for (const sprite of ['mira', 'rostarm', 'lumen', 'purse', 'tonic', 'oil', 'seal', 'amulet', 'pearl', 'crystal', 'spear', 'axe']) {
    images['shop-' + sprite] = 'shop/' + sprite + '.png';
  }
  for (const atlas of ['reef', 'greed', 'diva', 'vortex', 'god', 'action']) {
    images['surge-atlas-' + atlas] = 'surge/' + atlas + '.png';
  }
  for (const icon of ['map', 'endless', 'podium', 'bazaar', 'fullscreen', 'music', 'effects', 'new-run',
    'harbor', 'arena', 'boss', 'tunnel', 'current', 'route', 'locked', 'cleared',
    'roster', 'heart', 'coin', 'perk', 'journal', 'seed', 'supplies', 'forge',
    'curios', 'online', 'close', 'armory', 'satchel', 'trophy', 'helmet', 'compass',
    'coral', 'kelp', 'corner', 'anchor', 'divider', 'clasp']) {
    images['menu-' + icon] = 'menu/' + icon + '.png';
  }
  images['menu-hero'] = 'menu/hero.webp';
  images['menu-chart'] = 'menu/chart.webp';
  for (const boss of ['reef', 'greed', 'diva', 'vortex', 'god']) {
    for (const part of ['arch', 'pillar', 'deck', 'deck-final', 'phase-two', 'phase-three', 'emitter', 'warning', 'burst', 'shot']) {
      images['boss-stage-' + boss + '-' + part] = 'boss-stage/' + boss + '-' + part + '.png';
    }
  }
  V.expansionArt = ['crab', 'scarab', 'diva', 'vortex', 'glitch', 'bee', 'ember', 'car', 'arc',
    'shuttle', 'lift', 'belt', 'upper', 'cave', 'stalactites', 'arrow', 'slash', 'spark'];
  for (const name of V.expansionArt) images['exp-' + name] = 'arena-expansion/' + name + '.png';
  V.assets = {};
  V.imagePath = name => 'assets/images/' + images[name];
  V.image = function (name) {
    if (!images[name]) return null;
    if (!V.assets[name]) {
      const image = new Image();
      image.decoding = 'async';
      image.src = V.imagePath(name);
      V.assets[name] = image;
    }
    return V.assets[name];
  };
  V.readyImage = function (name) {
    const image = V.image(name);
    return image?.complete && image.naturalWidth > 0 ? image : null;
  };

  const legacy = 'https://raw.githubusercontent.com/trollick98-maker/Vulkanschnegge/main/';
  V.soundtracks = {
    slow: { file: 'pixel-depths-slow.mp3', title: 'Pixel Depths', remote: legacy + 'Pixel%20Depths.mp3' },
    mid: { file: 'into-the-deep-mid.mp3', title: 'Into the Deep', remote: legacy + 'Into%20the%20Deep.mp3' },
    fast: { file: 'vulkanschnegge-theme-fast.mp3', title: 'Vulkanschnegge Theme', remote: legacy + 'Vulkanschnegge%20Theme.mp3' },
    'reef-tax': { file: 'reef-tax.mp3', title: 'Reef Tax' },
    'a-little-more': { file: 'a-little-more.mp3', title: 'A Little More' },
    'pretty-things': { file: 'pretty-things.mp3', title: 'Pretty Things Get Their Way' },
    'one-more-wreck': { file: 'one-more-wreck.mp3', title: 'ONE MORE WRECK' },
    'i-am-the-source': { file: 'i-am-the-source.mp3', title: 'GOD.EXE — I AM THE SOURCE', once: true },
    'run-the-loop': { file: 'run-the-loop.mp3', title: 'GOD.EXE — RUN THE LOOP' },
    'home-at-last': { file: 'home-at-last.mp3', title: 'Home, At Last', once: true }
  };
})();
