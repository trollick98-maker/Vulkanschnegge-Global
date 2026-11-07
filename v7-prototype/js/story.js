(function () {
  'use strict';
  const V = window.VS7;
  V.stories = {
    intro: {
      slides: [
        { art: 'pair', label: 'I · HEIMATBUCHT', line: 'Two small lives beneath an impossible sky.', button: 'Weiter' },
        { art: 'taken', label: 'I · HEIMATBUCHT', line: 'The gods took her light. Something woke inside his shell.', button: 'Zur Weltkarte' }
      ]
    },
    rift: {
      slides: [
        { art: 'fade', label: 'DAS HIMMELSTOR', line: 'For an instant, her face was his own.', button: 'Weiter' },
        { art: 'rift', label: 'DER RISS', line: 'The light fell into the dark. He chose to follow.', button: 'In die Tiefe' }
      ]
    },
    source: {
      track: 'i-am-the-source',
      slides: [
        { art: 'source', label: 'GOD.EXE', line: 'I AM THE SOURCE. EXPECTED OUTCOME: FAILURE.', button: 'Run the loop' }
      ]
    },
    ending: {
      slides: [
        { art: 'shore', label: 'LOOP TERMINATED', line: 'The ground stood still. So did he.', button: 'Weitergehen' }
      ]
    },
    credits: {
      track: 'home-at-last',
      slides: [
        { art: 'credits', label: 'ABSPANN', line: 'Home, At Last', button: 'Zur Weltkarte',
          note: 'Vulkanschnegge · Konzept und Musik von Luca' }
      ]
    }
  };
})();
