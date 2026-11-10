(function () {
  'use strict';
  const V = window.VS7;
  const I = V.input = { left: false, right: false, jump: false, dash: false, jumpQueued: false, dashQueued: false };
  const held = { left: new Set(), right: new Set(), jump: new Set(), dash: new Set() };
  const translate = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyJ: 'dash'
  };

  function set(key, source, on) {
    const sources = held[key];
    if (!sources) return;
    if (on) {
      if (!sources.size && (key === 'jump' || key === 'dash')) I[key + 'Queued'] = true;
      sources.add(source);
    } else sources.delete(source);
    I[key] = sources.size > 0;
  }

  window.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target?.tagName)) return;
    if (event.code === 'Escape' && !event.repeat) {
      V.backToMap?.();
      return;
    }
    const key = translate[event.code];
    if (!key || V.state?.mode !== 'play' || /^(BUTTON|A)$/.test(event.target?.tagName)) return;
    event.preventDefault();
    set(key, 'key:' + event.code, true);
  });

  window.addEventListener('keyup', event => {
    const key = translate[event.code];
    if (key) set(key, 'key:' + event.code, false);
  });

  I.consume = () => {
    const actions = { left: I.left, right: I.right, jump: I.jumpQueued, dash: I.dashQueued };
    I.jumpQueued = I.dashQueued = false;
    return actions;
  };
  I.reset = () => {
    for (const key of Object.keys(held)) {
      held[key].clear();
      I[key] = false;
    }
    I.jumpQueued = I.dashQueued = false;
  };
  window.addEventListener('blur', I.reset);

  for (const button of document.querySelectorAll('[data-key]')) {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', event => {
      if (V.state?.mode !== 'play') return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(key, 'pointer:' + event.pointerId, true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => set(key, 'pointer:' + event.pointerId, false));
    }
  }
})();
