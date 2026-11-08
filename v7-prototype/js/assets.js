/* Local asset manifest. Only the active scene requests its images and tracks. */
(function () {
  'use strict';
  const V = window.VS7;
  const images = {
    snail: 'snail.png', otter: 'otter.png', frog: 'frog.png', bossEel: 'boss-eel.png',
    plasma: 'plasma.png', toxic: 'toxic.png', platform: 'platform.png', mine: 'mine.png',
    crate: 'crate.png', atlas: 'boss-atlas.webp',
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
  for (const scene of ['pair', 'taken', 'fade', 'rift', 'source', 'shore', 'credits']) {
    images['story-' + scene] = 'story/' + scene + '.webp';
  }
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
