(function () {
  'use strict';
  const V = window.VS7;
  V.stories = {
    intro: {
      slides: [
        { art: 'intro-harbor', alt: 'Auf einem Felsen in der Heimatbucht berühren sich fast die Fühler zweier Schnecken.', label: 'I · HEIMATBUCHT', line: 'They spent their mornings here, where the light reached the seabed.', button: 'Weiter' },
        { art: 'intro-omens', alt: 'Gewaltige Schatten der Götter fallen auf die beiden Schnecken.', label: 'II · DIE SCHATTEN', line: 'Then the gods came, and the water went dark.', button: 'Weiter' },
        { art: 'intro-abduction', alt: 'Ein türkisfarbener Lichtstrahl reißt die goldene Schnecke von der Klippe fort.', label: 'III · DIE ENTFÜHRUNG', line: 'He lunged for her, but the light carried her beyond the ledge.', button: 'Weiter' },
        { art: 'intro-sealed', alt: 'Schnegg sieht seine Gefährtin im schließenden Tor verschwinden.', label: 'IV · DAS TOR', line: 'The gate closed before he could follow.', button: 'Weiter' },
        { art: 'intro-pursuit', alt: 'Magma glüht in Schneggs Panzer. Vor ihm führt eine goldene Spur in die Tiefe.', label: 'V · DER AUFBRUCH', line: 'A few sparks drifted into the depths. He followed.', button: 'Aufbrechen' }
      ]
    },
    rift: {
      slides: [
        { art: 'rift', alt: 'Schnegg sieht am Rand eines violetten Abgrunds einen goldenen Lichtschein.', label: 'DER RISS', line: 'Her golden trail led into the rift. He followed it.', button: 'In die Tiefe' }
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
        { art: 'rescue-reunion', alt: 'Schnegg und die goldene Schnecke berühren im Licht des Torbogens sanft ihre Fühler.', label: 'WIEDER ZUSAMMEN', line: 'Their eyestalks touched. “Let’s go home.”', button: 'Nach Hause' }
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
