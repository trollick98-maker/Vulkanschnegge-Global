(function () {
  'use strict';
  const V = window.VS7;
  V.storyShots = {
    'intro-harbor': ['gold', '50% 65%', 2, -1, 1.03, 1.14],
    'intro-omens': ['violet', '50% 30%', 0, 2, 1.16, 1.06],
    'intro-taken-v2': ['cyan', '58% 44%', 3, 2, 1.06, 1.20],
    'intro-sealed': ['cyan', '59% 55%', 3, -1, 1.04, 1.15],
    'intro-pursuit': ['cyan', '63% 62%', 5, -1, 1.13, 1.18],
    'rift-v2': ['violet', '57% 63%', 3, -1, 1.04, 1.18],
    source: ['green', '54% 37%', 0, 3, 1.06, 1.17],
    'rescue-release': ['cyan', '63% 57%', 3, 0, 1.07, 1.18],
    'rescue-reunion': ['gold', '50% 60%', 0, -1, 1.04, 1.16],
    'rescue-escape': ['green', '62% 58%', 4, -1, 1.13, 1.19],
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
        { art: 'rift-v2', alt: 'Schnegg sieht am Rand eines violetten Abgrunds einen goldenen Lichtschein.', label: 'DER RISS', line: 'Her golden trail led into the rift. He followed it.', button: 'In die Tiefe' }
      ]
    },
    source: {
      track: 'i-am-the-source',
      slides: [
        { art: 'source', alt: 'Ein gewaltiger Röhrenmonitor mit grünen Augen ragt vor Schnegg auf.', label: 'GOD.EXE', line: 'I AM THE SOURCE. PRISON LOCKED. ACCESS DENIED.', button: 'Run the loop' }
      ]
    },
    ending: {
      slides: [
        { art: 'rescue-release', alt: 'Die goldene Schnecke kriecht durch die aufgebrochene Seite ihres türkis leuchtenden Gefängnisses auf Schnegg zu.', label: 'DIE BEFREIUNG', line: 'Schnegg broke open the cage. She crawled out to meet him.', button: 'Weiter' },
        { art: 'rescue-reunion', alt: 'Schnegg und die goldene Schnecke berühren im Licht des Torbogens sanft ihre Fühler.', label: 'WIEDER ZUSAMMEN', line: 'Their eyestalks touched. “Let’s go home.”', button: 'Weiter' },
        { art: 'rescue-escape', alt: 'Die beiden Schnecken lassen die zerbrochene Maschine hinter sich und folgen dem Licht.', label: 'RAUS AUS DER TIEFE', line: 'They left the broken machine behind and followed the light.', button: 'Weiter' },
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
