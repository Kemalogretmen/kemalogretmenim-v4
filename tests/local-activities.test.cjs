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

function openGame(path, folder, prefs, gameType, { device = {}, renderer = null } = {}) {
  const { window, document } = parseHTML(fs.readFileSync(path, 'utf8'));
  let nextFrame;
  let painted = 0;
  let jumps = 0;
  let rendererStarts = 0;
  const headings = [];
  let startX = 0;
  const noop = () => {};
  const fakeContext = new Proxy({}, {
    get(target, key) {
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (key === 'fillRect' || key === 'fill') return () => { painted++; };
      if (key === 'moveTo') return x => { startX = x; };
      if (key === 'lineTo') return x => {
        if (target.strokeStyle === '#fff' && target.lineWidth === 2) headings.push(x - startX);
      };
      return target[key] ?? noop;
    },
  });
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.getContext = type => type === '2d' ? fakeContext : null;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 500 });
    Object.defineProperties(canvas, { clientWidth: { value: 900 }, clientHeight: { value: 500 } });
  });
  window.GameViewport = { watch: noop };
  window.matchMedia = () => ({ matches: true });

  const context = vm.createContext({
    window, document, navigator: { maxTouchPoints: 5, ...device }, performance: { now: () => 1000 }, console,
    requestAnimationFrame: callback => { nextFrame = callback; },
    setTimeout: noop, clearTimeout: noop, CustomEvent: window.CustomEvent,
    Scoreboard: {
      loadPrefs: defaults => ({ ...defaults, players: 2, touchMode: 'on', gameType, ...prefs }),
      getList: () => [], getBest: () => 0, savePrefs: noop,
    },
    SoundFX: new Proxy({ playJump: () => { jumps++; } }, { get: (target, key) => target[key] ?? noop }),
  });
  for (const script of ['math3d', ...(folder === 'roket-arena-3d' ? ['rounding', 'cars'] : []), 'engine3d', 'game']) {
    if (script === 'engine3d' && renderer) {
      context.Engine3D = { createRenderer: () => { rendererStarts++; return renderer; } };
      continue;
    }
    vm.runInContext(fs.readFileSync('js/' + folder + '/' + script + '.js', 'utf8'), context, { filename: folder + '/' + script });
  }
  const get = id => document.getElementById(id);
  function send(id, type, data) {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, data);
    get(id).dispatchEvent(event);
  }
  return { get, send, frame: time => nextFrame(time), painted: () => painted, jumps: () => jumps, headings, rendererStarts: () => rendererStarts };
}

for (const [page, folder, pressedClass, startId, primaryP2] of [
  [pages[0], 'roket-arena-3d', 'active', 'btnStart', 'tp2Primary'],
  [pages[1], 'ritmik-yilan-3d', 'pressed', 'btnStart', 'tp2Jump'],
]) {
  test(folder + ' WebGL olmadan çalışır ve dokunmaları oyuncu bazında bırakır', () => {
    const game = openGame(page, folder, {}, 'edu');
    game.get(startId).click();
    assert.ok(game.get('main-content').classList.contains('is-top-down'));
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

test('Yılan oyununda iki ekran yarısı eşzamanlı sürükleme ve çift dokunuşu bağımsız işler', () => {
  const game = openGame(pages[1], 'ritmik-yilan-3d', {}, 'edu');
  game.get('btnStart').click();
  const touch = (type, id, x, y, timeStamp) => game.send('gameCanvas', type, {
    button: 0, pointerType: 'touch', pointerId: id, clientX: x, clientY: y, timeStamp,
  });
  touch('pointerdown', 1, 190, 230, 1000);
  touch('pointerdown', 2, 570, 230, 1005);
  touch('pointermove', 1, 105, 165, 1020);
  touch('pointermove', 2, 665, 230, 1025);
  for (let time = 1016; time <= 1280; time += 16) game.frame(time);
  assert.ok(game.headings.at(-4) < -2, 'sol parmak sola yönlendirir');
  assert.ok(game.headings.at(-3) > 2, 'sağ parmak sağa yönlendirir');
  const firstBoost = parseFloat(game.get('sp1Turbo').style.width);
  assert.ok(firstBoost < 98);
  assert.equal(parseFloat(game.get('sp2Turbo').style.width), 100);

  touch('pointermove', 2, 420, 160, 1275);
  touch('pointercancel', 1, 105, 165, 1280);
  for (let time = 1288; time <= 1576; time += 16) game.frame(time);
  assert.ok(parseFloat(game.get('sp1Turbo').style.width) > firstBoost, 'iptal edilen parmak hızlanmayı bırakır');
  assert.ok(parseFloat(game.get('sp2Turbo').style.width) < 98, 'orta çizgiyi geçen parmak ikinci oyuncuda kalır');
  touch('pointerup', 2, 420, 160, 1580);

  // The first tap in one half must never combine with a tap in the other half.
  touch('pointerdown', 3, 430, 220, 1590);
  touch('pointerup', 3, 430, 220, 1620);
  touch('pointerdown', 4, 470, 220, 1650);
  touch('pointerup', 4, 470, 220, 1680);
  assert.equal(game.jumps(), 0);
  touch('pointerdown', 5, 430, 220, 1720);
  touch('pointerdown', 6, 470, 220, 1730);
  touch('pointerup', 5, 430, 220, 1750);
  touch('pointerup', 6, 470, 220, 1760);
  assert.equal(game.jumps(), 2);
});

test('Yılan oyunu ikili 3B çizimi hafif başlatır ve kareler yavaş kalınca turu üstten sürdürür', () => {
  const viewports = [];
  let shadowPasses = 0;
  const noop = () => {};
  const game = openGame(pages[1], 'ritmik-yilan-3d', { showHint: false }, 'edu', { renderer: {
    prepareCanvas: noop, beginFrame: noop, submit: noop, updateNumberAtlas: noop,
    renderShadowPass: () => { shadowPasses++; },
    renderViewport: (_cam, _rect, _scene, player) => { viewports.push(player); },
  } });
  game.frame(1016);
  assert.equal(game.rendererStarts(), 0);
  assert.equal(game.painted(), 0);
  game.get('btnStart').click();
  game.frame(1032);
  assert.deepEqual(viewports, [1, 2]);
  assert.equal(shadowPasses, 0);
  assert.equal(game.get('snakeRenderMode').textContent, 'Hafif 3B');
  for (let time = 1100; time <= 2600; time += 65) game.frame(time);
  assert.ok(game.get('main-content').classList.contains('is-top-down'));
  assert.ok(game.get('startOverlay').classList.contains('hidden'));
  assert.ok(game.painted() > 0);
  assert.notEqual(game.get('splitTimer').textContent, '00:00');
});

test('Yılan oyunu düşük donanımda WebGL başlatmadan açılır ve duraklayınca sahneyi yeniden çizmez', () => {
  const game = openGame(pages[1], 'ritmik-yilan-3d', { players: 1 }, 'edu', {
    device: { hardwareConcurrency: 4 }, renderer: {},
  });
  game.get('btnStart').click();
  game.frame(1016);
  assert.equal(game.rendererStarts(), 0);
  assert.ok(game.get('main-content').classList.contains('is-top-down'));
  game.get('btnPause').click();
  game.frame(1032);
  const paintCount = game.painted();
  game.frame(1100);
  game.frame(1200);
  assert.equal(game.painted(), paintCount);
  game.get('btnResume').click();
  game.frame(1216);
  assert.ok(game.painted() > paintCount);
});
