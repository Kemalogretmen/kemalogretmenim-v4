(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AquariumTimer = factory();
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  // Deadlines, not interval counts: background tab throttling cannot extend a lesson.
  function create(now = () => Date.now()) {
    let status = 'idle', remaining = 0, deadline = 0, title = '', mode = 'countdown', elapsed = 0, started = 0;
    function read() {
      if (status === 'running') {
        remaining = mode==='stopwatch' ? elapsed+Math.max(0,now()-started) : Math.max(0, deadline - now());
        if (!remaining && mode==='countdown') status = 'done';
      }
      return {status, remaining, title};
    }
    return {
      read,
      mode:()=>mode,
      startStopwatch(label) {
        if(!String(label||'').trim()) return false;
        mode='stopwatch';title=String(label).trim().slice(0,80);remaining=elapsed=0;started=now();status='running';return true;
      },
      start(minutes, label) {
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 || !String(label || '').trim()) return false;
        mode='countdown';title = String(label).trim().slice(0,80); remaining = minutes * 60000;
        deadline = now() + remaining; status = 'running'; return true;
      },
      pause() { read(); if (status === 'running') {elapsed=remaining;status = 'paused';} },
      resume() { if (status === 'paused') {deadline = now() + remaining;started=now();status = 'running';} },
      reset() {status = 'idle'; remaining = elapsed = 0; deadline = 0; title = '';mode='countdown';}
    };
  }
  function format(ms, mode = 'countdown') {
    const seconds = (mode==='stopwatch'?Math.floor:Math.ceil)(Math.max(0,ms)/1000);
    return String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0');
  }
  return {create, format};
});
