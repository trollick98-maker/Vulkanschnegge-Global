(function () {
  'use strict';
  const V = window.VS7;
  V.stories = {
    intro: {
      slides: [
        { art: 'pair', alt: 'Zwei Schnecken schauen von einem Felsen zur hellen Wasseroberfläche.', label: 'I · HEIMATBUCHT', line: 'Two small lives beneath an impossible sky.', button: 'Weiter' },
        { art: 'taken', alt: 'Ein Lichtstrahl zieht die Gefährtin nach oben. Schneggs Panzer beginnt zu glühen.', label: 'I · HEIMATBUCHT', line: 'The gods took her light. Something woke inside his shell.', button: 'Zur Weltkarte' }
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
