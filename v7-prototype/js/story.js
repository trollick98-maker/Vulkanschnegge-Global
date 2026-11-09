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
        { art: 'fade', alt: 'Schnegg erkennt sich in einem zerbrochenen Spiegel wieder.', label: 'DAS HIMMELSTOR', line: 'For an instant, her face was his own.', button: 'Weiter' },
        { art: 'rift', alt: 'Am Rand eines violetten Abgrunds sieht Schnegg ein Licht in die Tiefe fallen.', label: 'DER RISS', line: 'The light fell into the dark. He chose to follow.', button: 'In die Tiefe' }
      ]
    },
    source: {
      track: 'i-am-the-source',
      slides: [
        { art: 'source', alt: 'Ein gewaltiger Röhrenmonitor mit grünen Augen ragt vor Schnegg auf.', label: 'GOD.EXE', line: 'I AM THE SOURCE. EXPECTED OUTCOME: FAILURE.', button: 'Run the loop' }
      ]
    },
    ending: {
      slides: [
        { art: 'shore', alt: 'Schnegg hält im ersten Morgenlicht am nassen Ufer inne.', label: 'LOOP TERMINATED', line: 'The ground stood still. So did he.', button: 'Weitergehen' }
      ]
    },
    credits: {
      track: 'home-at-last',
      slides: [
        { art: 'credits', alt: 'Schnegg zieht am Strand dem Sonnenaufgang entgegen.', label: 'ABSPANN', line: 'Home, At Last', button: 'Zur Weltkarte',
          note: 'Vulkanschnegge · Konzept und Musik von Luca' }
      ]
    }
  };
})();
