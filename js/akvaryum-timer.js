(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AquariumTimer = factory();
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  // Deadlines, not interval counts: background tab throttling cannot extend a lesson.
  function create(now = () => Date.now()) {
    let status = 'idle', remaining = 0, deadline = 0, title = '';
    function read() {
      if (status === 'running') {
        remaining = Math.max(0, deadline - now());
        if (!remaining) status = 'done';
      }
      return {status, remaining, title};
    }
    return {
      read,
      start(minutes, label) {
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 || !String(label || '').trim()) return false;
        title = String(label).trim().slice(0,80); remaining = minutes * 60000;
        deadline = now() + remaining; status = 'running'; return true;
      },
      pause() { read(); if (status === 'running') status = 'paused'; },
      resume() { if (status === 'paused') {deadline = now() + remaining; status = 'running';} },
      reset() {status = 'idle'; remaining = 0; deadline = 0; title = '';}
    };
  }
  function format(ms) {
    const seconds = Math.ceil(Math.max(0,ms)/1000);
    return String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0');
  }
  return {create, format};
});
