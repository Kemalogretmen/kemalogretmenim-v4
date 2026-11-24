const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const pages = [
  'oyun/roket-arena-3d.html',
  'oyun/ritmik-yilan-3d.html',
  'ogretmen/poster-yazici.html',
  'ogretmen/kelime-avi.html',
];

test('Yerel etkinlikler ortak site görünümünü yükler ve bulut istemcisi başlatmaz', () => {
  for (const path of pages) {
    const { document } = parseHTML(fs.readFileSync(path, 'utf8'));
    assert.equal(document.body.dataset.kemalLocal, 'true', path);
    assert.equal(document.querySelectorAll('main#main-content').length, 1, path);
    for (const script of document.scripts || document.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (!src) continue;
      assert.match(src, /^\/js\//, path);
      assert.doesNotMatch(src, /site-data|supabase|user-auth|site-performance/, path);
      assert.ok(fs.existsSync(src.slice(1).split('?')[0]), src);
    }
  }
});

test('Etkinlik düğmeleri site giriş afişinin boyutunu almaz', () => {
  for (const path of pages) {
    const { document } = parseHTML(fs.readFileSync(path, 'utf8'));
    assert.equal(document.querySelector('#main-content :is(button, a.btn, [role="button"]).hero'), null, path);
  }
});

function openGame(path, folder, prefs, gameType) {
  const { window, document } = parseHTML(fs.readFileSync(path, 'utf8'));
  let nextFrame;
  let painted = 0;
  const noop = () => {};
  const fakeContext = new Proxy({}, {
    get(target, key) {
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (key === 'fillRect' || key === 'fill') return () => { painted++; };
      return target[key] ?? noop;
    },
  });
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.getContext = type => type === '2d' ? fakeContext : null;
    Object.defineProperties(canvas, { clientWidth: { value: 900 }, clientHeight: { value: 500 } });
  });
  window.GameViewport = { watch: noop };
  window.matchMedia = () => ({ matches: true });

  const context = vm.createContext({
    window, document, navigator: { maxTouchPoints: 5 }, performance: { now: () => 1000 }, console,
    requestAnimationFrame: callback => { nextFrame = callback; },
    setTimeout: noop, clearTimeout: noop, CustomEvent: window.CustomEvent,
    Scoreboard: {
      loadPrefs: defaults => ({ ...defaults, players: 2, touchMode: 'on', gameType, ...prefs }),
      getList: () => [], getBest: () => 0, savePrefs: noop,
    },
    SoundFX: new Proxy({}, { get: () => noop }),
  });
  for (const script of ['math3d', ...(folder === 'roket-arena-3d' ? ['rounding', 'cars'] : []), 'engine3d', 'game']) {
    vm.runInContext(fs.readFileSync('js/' + folder + '/' + script + '.js', 'utf8'), context, { filename: folder + '/' + script });
  }
  const get = id => document.getElementById(id);
  function send(id, type, data) {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, data);
    get(id).dispatchEvent(event);
  }
  return { get, send, frame: time => nextFrame(time), painted: () => painted };
}

for (const [page, folder, pressedClass, startId, primaryP2] of [
  [pages[0], 'roket-arena-3d', 'active', 'btnStart', 'tp2Primary'],
  [pages[1], 'ritmik-yilan-3d', 'pressed', 'btnStart', 'tp2Jump'],
]) {
  test(folder + ' WebGL olmadan çalışır ve dokunmaları oyuncu bazında bırakır', () => {
    const game = openGame(page, folder, {}, 'edu');
    assert.ok(game.get('main-content').classList.contains('is-top-down'));
    game.get(startId).click();
    assert.equal(game.get('touchSplitP1').classList.contains('hidden'), false);
    assert.equal(game.get('touchSplitP2').classList.contains('hidden'), false);
    for (let i = 1; i <= 8; i++) game.frame(1000 + i * 16);
    assert.ok(game.painted() > 0);

    game.send('tp1Left', 'pointerdown', { button: 0, pointerId: 41 });
    game.send('tp1Turbo', 'pointerdown', { button: 0, pointerId: 42 });
    game.send(primaryP2, 'pointerdown', { button: 0, pointerId: 43 });
    game.send('tp1Left', 'pointercancel', { pointerId: 41 });
    assert.equal(game.get('tp1Left').classList.contains(pressedClass), false);
    assert.equal(game.get('tp1Turbo').classList.contains(pressedClass), true);
    assert.equal(game.get(primaryP2).classList.contains(pressedClass), true);
    game.send(primaryP2, 'lostpointercapture', { pointerId: 43 });
    assert.equal(game.get(primaryP2).classList.contains(pressedClass), false);
    assert.equal(game.get('tp1Turbo').classList.contains(pressedClass), true);
    game.send('tp1Turbo', 'pointerup', { pointerId: 42 });
    assert.equal(game.get('tp1Turbo').classList.contains(pressedClass), false);
  });
}
