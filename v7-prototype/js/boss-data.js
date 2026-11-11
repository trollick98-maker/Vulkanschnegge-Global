(function () {
  'use strict';
  const V = window.VS7;
  const G = V.GROUND;
  const A = (name, hint, tell, recover, plan, extra = {}) => ({ name, hint, tell, recover, plan, ...extra });
  const heavy = { special: true, exposed: 1.45 };
  const pose = { special: true, exposed: 1.45, interrupt: true };
  const phases = (first, second, third) => [first, second, third];
  const floor = (c, x, w, at = 0, style = 'electric', h = 55) => c.zone(x, G - h, w, h, at, .36, style);
  const pillar = (c, x, w, at = 0, style = 'light') => c.zone(x, 105, w, G - 105, at, .36, style);
  const spread = (c, key, count, at = 0, fromX = c.bx, fromY = c.by, fan = .19, curve = 0) => {
    const aim = Math.atan2(c.py - fromY, c.px - fromX);
    for (let i = 0; i < count; i++) {
      const angle = aim + (i - (count - 1) / 2) * fan;
      const speed = c.shotSpeed;
      c.shot(key, fromX, fromY, Math.cos(angle) * speed, Math.sin(angle) * speed, at, { gravity: curve });
    }
  };

  V.bossShots = {
    plasma: { r: 13, color: '#b7faff', reflect: true },
    toxic: { r: 24, color: '#8bffbd', snare: .72 },
    gold: { r: 12, color: '#ffd46e' },
    coin: { r: 14, color: '#ffe192', reflect: true },
    ingot: { r: 16, color: '#ffedac', reflect: true },
    feathers: { r: 13, color: '#ffb5f3' },
    star: { r: 16, color: '#ffe7fb', reflect: true },
    weight: { r: 20, color: '#b5e7ff', reflect: true },
    surge: { r: 19, color: '#82dcff' },
    fault: { r: 13, color: '#ff7f9c' },
    packet: { r: 14, color: '#b4ff9b', reflect: true },
    wave: { r: 19, color: '#9bf1ff' }
  };
  V.bossZoneColors = {
    electric: '#8ce9ff', rush: '#ffae65', current: '#8efcf4', gold: '#ffd36e', hand: '#ffbb55',
    laser: '#fff198', light: '#ff94de', mirror: '#c99eff', scream: '#efbdff',
    slam: '#84d7ff', weights: '#b8ebff', glitch: '#a5ff8e', replay: '#a4aaff', reset: '#ff899c'
  };

  const reef = [
    A('Electric Surge', 'Zwischen den geladenen Bodenfeldern bleiben oder darüber springen', .88, .84, c => {
      for (let i = -1; i <= 1; i++) floor(c, c.px + i * 240, 120 + 17 * c.phase, Math.abs(i) * .18);
    }),
    A('Predator Strike', 'Rote Bahn freimachen und über den Vorstoß springen', .94, 1.04, c => {
      c.rush(c.px - c.dir * 230, G - c.b.h, .67, 'rush');
    }, { close: true, hide: true }),
    A('Bubble Prison', 'Grünen Blasen ausweichen, sie bremsen dich', .78, .85, c => {
      for (let i = 0; i < 3 + c.phase; i++) c.shot('toxic', c.bx, G - 38 - i * 42, c.dir * (185 + i * 20), -12, i * .18);
    }),
    A('Serpent Barrage', 'Unter dem Bogen durch oder ein helles Geschoss kontern', .76, .84, c => {
      spread(c, 'plasma', 3 + c.phase, 0, c.bx, c.by, .24, 195);
      spread(c, 'plasma', 2 + c.phase, .40, c.bx, c.by - 40, .32, 230);
    }),
    A('Death Spiral', 'Strömung gegenlenken und nach dem Wirbel zuschlagen', 1.13, 1.48, c => {
      c.fx('current', 4.2, c.dir);
      c.rush(c.px - c.dir * 156, G - c.b.h, 1.11, 'current', 140);
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        c.shot('plasma', c.bx, c.by - 35, Math.cos(angle) * 310, Math.sin(angle) * 310, .18);
      }
    }, heavy),
    A('High Tide', 'Bei Hochwasser springen · auf die hellen Bodenfelder achten', 1.12, 1.35, c => {
      c.fx('tide', 6);
      for (let i = 0; i < 4; i++) floor(c, c.px + (i - 1.5) * 138, 88, i * .31, 'electric', 64);
    }, heavy)
  ];
  const greed = [
    A('Golden Rain', 'Goldschatten zeigen, wo Münzen fallen', .95, .83, c => {
      for (let i = -2; i <= 2; i++) {
        const x = c.px + i * 96;
        floor(c, x, 38, .34 + Math.abs(i) * .12, 'gold', 40);
        c.shot('gold', x, 96, 0, 510, Math.abs(i) * .12);
      }
    }),
    A('Tax Collector', 'Aus der markierten Bahn der Goldhand dashen', .91, .94, c => {
      pillar(c, c.px, 150 + c.phase * 18, 0, 'hand');
    }, { close: true }),
    A('Coin Ricochet', 'Auf die Münzen achten, sie prallen an Plattformen ab', .81, .96, c => {
      for (let i = 0; i < 3 + c.phase; i++) c.shot('coin', c.bx, c.by, c.dir * (255 + i * 38), -360 + i * 64, i * .11,
        { gravity: 790, bounces: 3 });
    }),
    A('Treasure Trap', 'Truhen mit dem Katana öffnen oder Abstand halten', 1.02, .86, c => {
      c.fx('treasure', 2);
      for (let i = -1; i <= 1; i++) c.chest(c.px + i * 153, i !== 0, Math.abs(i) * .17);
    }),
    A('Royal Decree', 'Goldstrahlen verlassen · leuchtenden Tresor treffen', 1.26, 1.34, c => {
      for (let i = -2; i <= 2; i++) pillar(c, c.px + i * 148, 72, Math.abs(i) * .24, 'laser');
    }, pose),
    A('Gilded Flood', 'Auf steigende Decks springen und aus dem flüssigen Gold bleiben', 1.13, 1.42, c => {
      c.fx('gilded', 4.6);
      c.zone(c.px, G - 73, 590, 73, .72, 2.2, 'gold');
    }, heavy)
  ];
  const diva = [
    A('Feather Storm', 'Die Lücken zwischen den Federfächern nutzen', .82, .86, c => {
      spread(c, 'feathers', 4 + c.phase, 0, c.bx, c.by, .29);
      spread(c, 'feathers', 3, .46, c.bx, c.by - 70, .40);
    }),
    A('Spotlight Strike', 'Die pinke Lichtsäule verlassen', .89, .94, c => {
      pillar(c, c.px, 112, 0);
      if (c.phase > 0) pillar(c, c.px - c.dir * 160, 74, .42);
    }, { close: true }),
    A('Mirror Dance', 'Spiegelbilder feuern aus den markierten Richtungen', 1.05, .95, c => {
      for (const [i, x] of [c.px - 265, c.px + 265].entries()) {
        c.echo(x, c.by - 45, i * .24);
        spread(c, 'star', 2 + c.phase, i * .24, x, c.by - 45, .34);
      }
    }),
    A('Royal Scream', 'Über die tiefe oder unter die hohe Schallwelle', .86, 1.04, c => {
      for (let i = 0; i < 2 + c.phase; i++) c.shot('wave', c.bx, G - (i % 2 ? 138 : 25), c.dir * (440 + i * 30), 0, i * .29);
    }),
    A('Curtain Call', 'Pose durchbrechen, sonst wechseln Federn und Spots im Takt', 1.24, 1.45, c => {
      c.fx('stage', 6);
      for (let i = 0; i < 3; i++) {
        pillar(c, c.px + (i - 1) * 150, 86, i * .38);
        spread(c, 'feathers', 3 + c.phase, .20 + i * .38, c.bx, c.by - i * 17, .30);
      }
    }, pose),
    A('Encore', 'Bühnenaufzüge nutzen und den wandernden Spot kreuzen', 1.07, 1.28, c => {
      c.fx('limelight', 1.7);
      c.zone(c.px - c.dir * 230, 100, 96, 350, 0, 1.7, 'light', c.dir * 235);
      c.shot('star', c.bx, c.by, c.dir * 440, 68, .55);
    }, heavy)
  ];
  const vortex = [
    A('Barbell Slam', 'Über die Schockwellen springen', .87, .94, c => {
      floor(c, c.px, 195, 0, 'slam', 73);
      for (const dir of [-1, 1]) c.shot('surge', c.px, G - 18, dir * 515, 0, .09);
    }, { close: true }),
    A('Dumbbell Barrage', 'Aus dem Bogen der Hanteln herauslaufen', .86, .85, c => {
      for (let i = 0; i < 3 + c.phase; i++) c.shot('weight', c.bx, c.by, c.dir * (240 + 56 * i), -380 - 33 * i, i * .11, { gravity: 890 });
    }),
    A('Power Sprint', 'Auf eine Plattform springen, die Laufbahn wird heiß', 1.01, 1.10, c => {
      c.fx('belt', 5.5, c.dir);
      c.rush(c.px - c.dir * 330, G - c.b.h, .66 - .07 * c.phase, 'rush');
    }),
    A('Rep Combo', 'Drei Bodenmarken in Folge · Sprünge im Rhythmus setzen', .94, 1.14, c => {
      for (let i = 0; i < 3; i++) floor(c, c.px + c.dir * (1 - i) * 121, 164, i * (.44 - .045 * c.phase), 'slam', 66);
    }),
    A('Maximum Overload', 'Auf die Decks · nach der letzten Wiederholung angreifen', 1.33, 1.60, c => {
      c.fx('quake', 4.8);
      c.zone(c.px, G - 86, 610, 86, 0, .50, 'slam');
      for (let i = -1; i <= 1; i++) {
        pillar(c, c.px + i * 195, 67, .60 + Math.abs(i) * .18, 'weights');
        c.shot('weight', c.px + i * 195, 81, 0, 590, .37 + Math.abs(i) * .18);
      }
    }, heavy),
    A('Weight Drop', 'Die markierten Decks verlassen, der Boden verschiebt sich', 1.08, 1.30, c => {
      c.fx('quake', 5.4);
      for (const [i, platform] of c.nearDecks.entries()) {
        const x = platform.worldX + platform.w / 2;
        pillar(c, x, 94, i * .27, 'weights');
        c.shot('weight', x, 86, 0, 650, i * .27);
      }
    }, heavy)
  ];
  const god = [
    A('FAULT Sweep', 'Die wandernde Fehlerwand von hinten passieren', .93, .94, c => {
      c.zone(c.px - c.dir * 242, 198, 74, 252, 0, 1.50, 'glitch', c.dir * 245);
      spread(c, 'fault', 3 + c.phase, .45, c.bx, c.by, .26);
    }),
    A('Packet Storm', 'Grüne Pakete umlenken · rote Datenfehler meiden', .82, .94, c => {
      spread(c, 'packet', 3 + c.phase, 0, c.bx, c.by, .21);
      spread(c, 'fault', 3, .35, c.bx, c.by - 67, .35);
    }),
    A('Ghost Replay', 'Deine früheren Positionen werden nacheinander getroffen', 1.03, 1.04, c => {
      c.history.forEach((x, i) => pillar(c, x, 78, i * .29, 'replay'));
    }),
    A('Overwrite', 'Aus der fehlerhaften Bodenzone springen', .92, .92, c => {
      c.fx('patch', 4.4);
      for (let i = -1; i <= 1; i++) floor(c, c.px + 132 * i, 85, .23 * (i + 1), 'glitch', 70);
    }, { close: true }),
    A('Loop Reset', 'Die markierten Speicherblöcke räumen, dann den Kern treffen', 1.25, 1.42, c => {
      c.fx('patch', 5.4);
      c.rush(c.px - c.dir * 220, G - c.b.h - 25, .65, 'reset', 80);
      for (let i = -2; i <= 2; i++) pillar(c, c.px + i * 145, 72, (i % 2 ? 0 : .59), 'reset');
    }, pose),
    A('Kernel Panic', 'Zwei Reihen Speicherfehler · die Lücken wechseln', 1.24, 1.62, c => {
      c.fx('blackout', 4.3);
      for (let i = -3; i <= 3; i++) {
        pillar(c, c.px + i * 117, 79, i % 2 ? .63 : 0, 'glitch');
        if (i % 2) c.shot('packet', c.px + i * 117, 120, 0, 380, .33);
      }
    }, heavy)
  ];

  V.bosses = {
    reef: { name: 'Don Moray', sprite: 'bossEel', hp: 4500, track: 'reef-tax', sound: 'reef-charge',
      color: '#83edfa', speed: 365, lift: 34, tip: 'Nach dem Wirbel ist die Muräne erschöpft', attacks: reef, sidestepLift: 76,
      combos: [[reef[0], reef[3]], [reef[2], reef[1]]],
      phases: phases('Jagd', 'Hochwasser', 'Todesstrudel') },
    greed: { name: 'God of Greed', sprite: 'greed', hp: 4350, track: 'a-little-more', sound: 'greed-strike',
      color: '#ffd378', speed: 300, lift: 0, tip: 'Den leuchtenden Tresor während des Dekrets treffen', attacks: greed, sidestepLift: 0,
      combos: [[greed[0], greed[2]], [greed[3], greed[1]]],
      phases: phases('Zoll', 'Fahrende Tresore', 'Goldschmelze') },
    diva: { name: 'Diva-Schwänin', sprite: 'diva', hp: 4450, track: 'pretty-things', sound: 'diva-note',
      color: '#ffa2ec', speed: 405, lift: 86, tip: 'Eine Pose mit dem Katana unterbrechen', attacks: diva, sidestepLift: 104,
      combos: [[diva[2], diva[1]], [diva[3], diva[0]]],
      phases: phases('Auftritt', 'Bühnenwechsel', 'Doppelspot') },
    vortex: { name: 'Pumper Vortex', sprite: 'vortex', hp: 4550, track: 'one-more-wreck', sound: 'vortex-slam',
      color: '#86d9ff', speed: 475, lift: 13, tip: 'Nach der Überlastung öffnet sich sein Kraftgürtel', attacks: vortex, sidestepLift: 30,
      combos: [[vortex[1], vortex[2]], [vortex[0], vortex[3]]],
      phases: phases('Warm-up', 'Laufbänder', 'Überlastung') },
    god: { name: 'GOD.EXE', sprite: 'god', hp: 6550, track: 'run-the-loop', sound: 'god-fault',
      color: '#a7ff82', speed: 450, lift: 102, tip: 'Die rote Reset-Sequenz mit einem Schnitt unterbrechen', attacks: god, sidestepLift: 64,
      combos: [[god[2], god[1]], [god[3], god[0]]],
      phases: phases('INIT', 'OVERWRITE', 'KERNEL PANIC') }
  };
})();
