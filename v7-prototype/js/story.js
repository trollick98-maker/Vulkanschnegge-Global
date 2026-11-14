(function () {
  'use strict';
  const V = window.VS7;
  V.clearArt = s => (s.boss || s.chase || s.biome === 'god' ? 'boss-' : '') + s.biome;
  V.clearShots = {
    reef: ['cyan', '62% 52%', 4, -1, 1.10, 1.19],
    greed: ['gold', '50% 58%', 0, 3, 1.17, 1.05],
    diva: ['violet', '60% 53%', 4, 0, 1.09, 1.18],
    vortex: ['cyan', '51% 47%', -3, 2, 1.14, 1.08],
    'boss-reef': ['gold', '52% 65%', -2, -3, 1.19, 1.08],
    'boss-greed': ['gold', '59% 57%', 5, -1, 1.18, 1.11],
    'boss-diva': ['violet', '48% 61%', -3, -2, 1.16, 1.08],
    'boss-vortex': ['cyan', '52% 57%', 2, 3, 1.16, 1.09],
    'boss-god': ['scarlet', '62% 54%', 5, 1, 1.13, 1.21]
  };
  V.storyShots = {
    'intro-harbor': ['gold', '50% 65%', 2, -1, 1.03, 1.14],
    'intro-omens': ['violet', '50% 30%', 0, 2, 1.16, 1.06],
    'intro-taken-v2': ['cyan', '58% 44%', 3, 2, 1.06, 1.20],
    'intro-sealed': ['cyan', '59% 55%', 3, -1, 1.04, 1.15],
    'intro-pursuit': ['cyan', '63% 62%', 5, -1, 1.13, 1.18],
    'rift-v2': ['scarlet', '57% 63%', 3, -1, 1.04, 1.18],
    source: ['scarlet', '62% 58%', 3, 0, 1.09, 1.19],
    'rescue-release': ['gold', '63% 57%', 3, 0, 1.07, 1.18],
    'rescue-reunion': ['gold', '50% 60%', 0, -1, 1.04, 1.16],
    'rescue-escape': ['gold', '62% 58%', 4, -1, 1.13, 1.19],
    'rescue-bridge': ['gold', '53% 61%', 0, -1, 1.16, 1.06],
    'rescue-home': ['gold', '48% 61%', -2, 0, 1.15, 1.04]
  };
  V.stories = {
    intro: {
      slides: [
        { art: 'intro-harbor', alt: 'Auf einem Felsen in der Heimatbucht berühren sich fast die Fühler zweier Schnecken.', label: 'I · HEIMATBUCHT', line: 'They spent their mornings here, where the light reached the seabed.', button: 'Weiter' },
        { art: 'intro-omens', alt: 'Gewaltige Schatten der Götter fallen auf die beiden Schnecken.', label: 'II · DIE SCHATTEN', line: 'Then the gods came, and the water went dark.', button: 'Weiter' },
        { art: 'intro-taken-v2', alt: 'Ein türkisfarbener Lichtstrahl reißt die goldene Schnecke von der Klippe fort.', label: 'III · DIE ENTFÜHRUNG', line: 'He lunged for her, but the light carried her beyond the ledge.', button: 'Weiter' },
        { art: 'intro-sealed', alt: 'Schnegg sieht seine Gefährtin im schließenden Tor verschwinden.', label: 'IV · DAS TOR', line: 'The gate closed before he could follow.', button: 'Weiter' },
        { art: 'intro-pursuit', alt: 'Magma glüht in Schneggs Panzer. Vor ihm führt eine goldene Spur in die Tiefe.', label: 'V · DER AUFBRUCH', line: 'A few sparks drifted into the depths. He followed.', button: 'Aufbrechen' }
      ]
    },
    rift: {
      slides: [
        { art: 'rift-v2', alt: 'Eine goldene Spur führt Schnegg durch die versunkene Anlage zu einem flackernden Riss.', label: 'DER RISS', line: 'Her golden trail led into the rift. He followed it.', button: 'In die Tiefe' }
      ]
    },
    source: {
      track: 'i-am-the-source',
      slides: [
        { art: 'source', alt: 'Aus Schneggs Spiegelbild im schwarzen Wasser erhebt sich eine riesige, rot verzerrte Schattenschnecke.', label: 'GOD.EXE', line: 'I know that look. You always end up back here.', button: 'Run the loop' }
      ]
    },
    ending: {
      slides: [
        { art: 'rescue-release', alt: 'Schnegg öffnet die stählerne Kammer, in der die goldene Schnecke gefangen war.', label: 'DIE BEFREIUNG', line: 'Schnegg opened the chamber. She crawled out to meet him.', button: 'Weiter' },
        { art: 'rescue-reunion', alt: 'Schnegg und die goldene Schnecke berühren vor der offenen Kammertür sanft ihre Fühler.', label: 'WIEDER ZUSAMMEN', line: 'Their eyestalks touched. “Let’s go home.”', button: 'Weiter' },
        { art: 'rescue-escape', alt: 'Die beiden Schnecken verlassen die Maschinenhalle, während die roten Bildfehler hinter ihnen verblassen.', label: 'RAUS AUS DER TIEFE', line: 'They left the echo behind and followed the light.', button: 'Weiter' },
        { art: 'rescue-bridge', alt: 'Schnegg und seine Gefährtin erreichen über eine alte Steinbrücke ihre Heimatbucht.', label: 'DIE HEIMATBUCHT', line: 'Past the old stone bridge, the bay opened up before them.', button: 'Nach Hause' }
      ]
    },
    credits: {
      track: 'home-at-last',
      slides: [
        { art: 'rescue-home', alt: 'Die beiden Schnecken sitzen gemeinsam im Sonnenlicht auf ihrem Felsen in der Heimatbucht.', label: 'ABSPANN', line: 'Home, At Last', button: 'Zur Weltkarte',
          note: 'Vulkanschnegge · Konzept und Musik von Luca' }
      ]
    }
  };
})();
