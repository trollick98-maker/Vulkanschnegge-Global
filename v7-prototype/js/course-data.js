(function () {
  'use strict';
  const V = window.VS7;
  V.biomes = {
    reef:   { top: '#082941', bottom: '#177575', ground: '#34564e', accent: '#6be4bb', far: '#0c4c61' },
    greed:  { top: '#241c37', bottom: '#7a533b', ground: '#634333', accent: '#ffd183', far: '#4b3541' },
    diva:   { top: '#291941', bottom: '#6c3878', ground: '#543357', accent: '#ffa0d2', far: '#482552' },
    vortex: { top: '#101c3c', bottom: '#305f8a', ground: '#30475e', accent: '#8cbdff', far: '#233b63' },
    god:    { top: '#0a141e', bottom: '#233641', ground: '#192630', accent: '#c96a6d', far: '#192933' }
  };
  // Obstacles are [offset, height, breakable]. Platforms are [offset, height, width].
  V.courseData = {
    span: 1700,
    road: [
      { obstacles: [[330, 49, true], [1060, 53, false]], platforms: [[700, 349, 170]], coins: [[165, 367], [762, 321], [1410, 388]] },
      { obstacles: [[410, 58, false], [1180, 47, true]], platforms: [[240, 354, 218], [1000, 330, 160]], coins: [[310, 322], [1040, 306], [1490, 405]] },
      { obstacles: [[335, 56, false], [1130, 62, false]], platforms: [[625, 361, 235]], coins: [[165, 376], [722, 333], [1395, 360]] },
      { obstacles: [[355, 51, true], [1150, 56, false]], platforms: [[650, 352, 150], [855, 305, 160]], coins: [[155, 402], [704, 325], [919, 274], [1400, 385]] },
      { obstacles: [[460, 52, false], [1240, 50, true]], platforms: [[690, 336, 214]], coins: [[250, 352], [765, 306], [1450, 408]] }
    ]
  };
})();
