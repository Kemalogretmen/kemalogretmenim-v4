const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.join(__dirname, '..');

function exportFixture({ visible = true, rollover = false, width = 390, height = 660, dpr = 2 } = {}) {
  const source = fs.readFileSync(path.join(root, 'ogretmen/birim-kup-uygulamasi.html'), 'utf8');
  const start = source.indexOf('        function downloadCompositeImage(format) {');
  const end = source.indexOf('        function onWindowResize() {', start);
  const calls = [], downloads = [], frames = [];
  const ctx = Object.fromEntries(['fillRect', 'drawImage', 'beginPath', 'roundRect', 'fill', 'stroke', 'fillText'].map(name => [name, (...args) => calls.push({ name, args })]));
  const output = { getContext: () => ctx, toDataURL: () => 'data:image/png;base64,AA==' };
  const stageCanvas = { kind: 'stage', getBoundingClientRect: () => ({ width, height }) };
  const window = { devicePixelRatio: dpr };
  const context = {
    window, rollOverMesh: { visible: rollover }, scene: {}, camera: {},
    renderer: { domElement: stageCanvas, render() { frames.push('scene'); } }, drawCanvas: { kind: 'ink' },
    isProjectionsVisible: visible, renderProjectionPreviews() { frames.push('projections'); },
    topRenderer: { domElement: { kind: 'top' } }, frontRenderer: { domElement: { kind: 'front' } }, rightRenderer: { domElement: { kind: 'right' } },
    document: { createElement(tag) { if (tag === 'canvas') return output; assert.equal(tag, 'a'); const link = { click() { downloads.push({ filename: link.download, href: link.href }); } }; return link; },
      getElementById() { throw new Error('Export must not depend on toolbox or projection DOM rectangles.'); } }
  };
  vm.createContext(context); vm.runInContext(source.slice(start, end), context); context.downloadCompositeImage('png');
  return { output, context, calls, downloads, frames, width, height, dpr };
}

test('unit cube PNG retains three square views without reading collapsed or hidden toolbox bounds', () => {
  for (const width of [320, 1280]) {
    const q = exportFixture({ width, rollover: true });
    assert.deepEqual(q.frames, ['scene', 'projections']);
    const views = q.calls.filter(c => c.name === 'drawImage' && ['top', 'front', 'right'].includes(c.args[0].kind));
    assert.equal(views.length, 3);
    assert.deepEqual(views.map(c => c.args[0].kind), ['top', 'front', 'right']);
    for (const { args: [, x, y, w, h] } of views) {
      assert.equal(w, h); assert(w > 0); assert(x >= 0 && y >= 0);
      assert(x + w <= q.output.width); assert(y + h <= q.output.height);
    }
    assert.deepEqual(q.calls.filter(c => c.name === 'fillText').map(c => c.args[0]), ['Üstten', 'Önden', 'Sağdan']);
    assert.equal(q.context.rollOverMesh.visible, true);
    assert.equal(q.downloads[0].filename, 'matematik-soru-gorseli.png');
  }
});

test('hiding side views excludes them from PNG and photo export preserves the rollover state', () => {
  const q = exportFixture({ visible: false, rollover: false });
  assert.deepEqual(q.frames, ['scene']);
  assert.equal(q.calls.filter(c => c.name === 'drawImage').length, 2);
  assert.equal(q.context.rollOverMesh.visible, false);
});

function toolboxFixture(page, { stored = null, blockedStorage = false } = {}) {
  const { document, window } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen', page), 'utf8'));
  const shell = document.querySelector('.builder-shell, .cube-tool-shell, .geo-tool-shell');
  const sources = [...shell.querySelectorAll('.builder-panel, .cube-panel, .geo-panel, #fold-panel')];
  const originals = [...new Set(sources.flatMap(panel => [...panel.querySelectorAll('button, input, select')]))];
  const calls = [], writes = [], storage = new Map();
  const kind = shell.classList.contains('builder-shell') ? 'builder' : shell.classList.contains('cube-tool-shell') ? 'cubes' : 'nets';
  if (stored !== null) storage.set(`geometry-toolbox:${kind}:v1`, JSON.stringify(stored));
  const viewport = { width: 1280, height: 900 };
  Object.defineProperties(window, { innerWidth: { configurable: true, get: () => viewport.width }, innerHeight: { configurable: true, get: () => viewport.height } });
  window.scrollY = 0;
  window.Element.prototype.getBoundingClientRect = function () {
    if (this === shell) return { x: 0, y: 100, left: 0, top: 100, right: viewport.width, bottom: 800, width: viewport.width, height: 700 };
    const width = this.classList.contains('geometry-toolbox') ? this.classList.contains('is-wide') ? 380 : 282 : 48;
    const height = this.classList.contains('geometry-toolbox') ? this.classList.contains('is-collapsed') ? 44 : 480 : 48;
    const left = Number.parseFloat(this.style.left) || 0, top = Number.parseFloat(this.style.top) || 0;
    return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height };
  };
  const captures = new Set();
  window.Element.prototype.setPointerCapture = id => captures.add(id);
  window.Element.prototype.releasePointerCapture = id => captures.delete(id);
  window.Element.prototype.hasPointerCapture = id => captures.has(id);
  originals.forEach(button => { if (button.tagName === 'BUTTON') button.onclick = () => calls.push(button); });
  // linkedom has no selected-index implementation; emulate native select.value
  // while preserving the actual select element and its change listeners.
  document.querySelectorAll('select').forEach(select => {
    let value = select.querySelector('option[selected]')?.value || select.querySelector('option')?.value || '';
    Object.defineProperty(select, 'value', { configurable: true, get: () => value, set: next => { value = String(next); } });
  });
  const context = vm.createContext({ document, window, Event: window.Event, MutationObserver: window.MutationObserver, localStorage: {
    getItem(key) { if (blockedStorage) throw Error('blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blockedStorage) throw Error('blocked'); writes.push({ key, value }); storage.set(key, value); }
  } });
  function init() { vm.runInContext(fs.readFileSync(path.join(root, 'js/geometry-toolbox.js'), 'utf8'), context); window.GeometryToolbox.init(); }
  const fire = (target, type, extra = {}) => { const event = new window.Event(type, { bubbles: true, cancelable: true }); Object.assign(event, { pointerId: 1, button: 0, clientX: 30, clientY: 120, ...extra }); target.dispatchEvent(event); };
  return { document, window, shell, sources, originals, calls, writes, storage, kind, context, init, viewport, fire, captures,
    get box() { return document.querySelector('.geometry-toolbox'); },
    get drag() { return document.querySelector('.geometry-toolbox-drag'); },
    click(selector) { document.querySelector(selector).click(); }
  };
}

test('all three workspaces merge existing controls into one toolbox without losing handlers', () => {
  for (const page of ['3d-yapi-atolyesi.html', 'geometrik-cisimler-acilimlar.html', 'birim-kup-uygulamasi.html']) {
    const q = toolboxFixture(page); q.init();
    assert.equal(q.document.querySelectorAll('.geometry-toolbox').length, 1);
    assert(q.shell.classList.contains('has-geometry-toolbox'));
    assert.equal(q.document.querySelectorAll('.builder-panel, .geo-panel, .cube-panel').length, 0);
    for (const original of q.originals) {
      assert(q.box.contains(original), `${page}: lost ${original.id || original.title || original.textContent}`);
      if (original.tagName === 'BUTTON') { original.click(); assert(q.calls.includes(original)); }
      if (original.id) assert.equal(q.document.getElementById(original.id), original, `${original.id} was recreated`);
    }
    q.window.GeometryToolbox.init();
    assert.equal(q.document.querySelectorAll('.geometry-toolbox').length, 1, 'Repeated initialization is safe');
    assert.equal(q.document.querySelectorAll('[role="tooltip"]').length, 1);
  }
});

test('solid icons keep accessible names, preserve native selection events and move the live folding controls', () => {
  const q = toolboxFixture('geometrik-cisimler-acilimlar.html');
  const select = q.document.querySelector('#shape-select'), slider = q.document.querySelector('#foldSlider'), changes = [], inputs = [];
  select.addEventListener('change', () => changes.push(select.value)); slider.addEventListener('input', () => inputs.push(slider.value));
  q.init();
  assert.equal(q.box.querySelectorAll('[data-solid]').length, 9);
  for (const button of q.box.querySelectorAll('[data-solid]')) {
    assert(button.querySelector('svg')); assert(button.getAttribute('aria-label')); assert.equal(button.textContent, '');
    button.click(); assert.equal(select.value, button.dataset.solid); assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(q.box.querySelectorAll('[data-solid][aria-pressed="true"]').length, 1);
  }
  assert.equal(changes.length, 9);
  slider.value = '65'; q.fire(slider, 'input'); assert.deepEqual(inputs, ['65']);
  assert(q.box.querySelector('[data-tab="fold"]'));
  assert(q.box.contains(q.document.querySelector('#fold-panel')));
  assert.equal(q.box.querySelector('#foldSlider'), slider);
});

test('cube preview canvases retain their identity and their viewport context menu stays outside the toolbox', () => {
  const q = toolboxFixture('birim-kup-uygulamasi.html');
  const canvases = ['view-top', 'view-front', 'view-right'].map(id => {
    const canvas = q.document.createElement('canvas'); q.document.getElementById(id).append(canvas); return canvas;
  });
  const menu = q.document.getElementById('projection-menu'); q.init();
  canvases.forEach(canvas => assert(q.box.contains(canvas)));
  assert.equal(q.document.getElementById('projection-menu'), menu); assert(!q.box.contains(menu));
  assert.equal(q.box.querySelectorAll('#cube-count').length, 1);
});

test('collapse, width and tabs keep their ARIA state and controls remain available after reopening', () => {
  const q = toolboxFixture('3d-yapi-atolyesi.html'); q.init();
  const toggle = q.box.querySelector('.geometry-toolbox-toggle'), body = q.box.querySelector('.geometry-toolbox-body'), tabs = [...q.box.querySelectorAll('[role="tab"]')];
  q.click('.geometry-toolbox-toggle'); assert(body.hidden); assert(q.box.classList.contains('is-collapsed')); assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  q.click('.geometry-toolbox-toggle'); assert(!body.hidden); assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  q.click('.geometry-toolbox-size'); assert(q.box.classList.contains('is-wide')); assert.equal(q.box.querySelector('.geometry-toolbox-size').getAttribute('aria-pressed'), 'true');
  for (const tab of tabs) {
    tab.click();
    assert.equal(tab.getAttribute('aria-selected'), 'true');
    assert.equal(q.box.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1);
    const section = q.document.getElementById(tab.getAttribute('aria-controls')); assert(!section.hidden);
  }
  for (const id of ['selected', 'shapeRotate', 'shapeRemove', 'shapeCopy', 'shapeExamples', 'clear', 'mode2d', 'mode3d']) assert(q.box.querySelector(`#${id}`));
  assert(q.box.querySelector('#selected').classList.contains('three-only'));
  assert(q.box.querySelector('#clear').parentElement.classList.contains('three-only'));
});

test('pointer drag clamps to the viewport, ends on cancellation and ignores unrelated pointers', () => {
  const q = toolboxFixture('birim-kup-uygulamasi.html'); q.init();
  q.fire(q.drag, 'pointerdown'); assert(q.captures.has(1));
  const before = q.box.style.left;
  q.fire(q.drag, 'pointermove', { pointerId: 2, clientX: 500 }); assert.equal(q.box.style.left, before);
  q.fire(q.drag, 'pointermove', { clientX: 5000, clientY: 5000 });
  assert.equal(Number.parseFloat(q.box.style.left), 1280 - 282 - 8);
  assert.equal(Number.parseFloat(q.box.style.top), 900 - 480 - 8);
  q.fire(q.drag, 'pointercancel'); assert(!q.captures.has(1)); assert(!q.box.classList.contains('is-dragging'));
  const ended = q.box.style.left; q.fire(q.drag, 'pointermove', { clientX: 0 }); assert.equal(q.box.style.left, ended);
  q.viewport.width = 400; q.viewport.height = 600; q.window.dispatchEvent(new q.window.Event('resize'));
  assert(Number.parseFloat(q.box.style.left) <= 110); assert(Number.parseFloat(q.box.style.top) <= 112);
  q.click('.geometry-toolbox-reset'); assert.equal(Number.parseFloat(q.box.style.left), 16);
});

test('restored preferences stay bounded and unavailable storage cannot disable any tools', () => {
  const q = toolboxFixture('birim-kup-uygulamasi.html', { stored: { x: 999999, y: -999, collapsed: true, wide: true, tab: 'draw' } }); q.init();
  assert(q.box.classList.contains('is-wide')); assert(q.box.classList.contains('is-collapsed'));
  assert.equal(Number.parseFloat(q.box.style.top), 8); assert(Number.parseFloat(q.box.style.left) <= 892);
  assert.equal(q.box.querySelector('[data-tab="draw"]').getAttribute('aria-selected'), 'true');
  const blocked = toolboxFixture('3d-yapi-atolyesi.html', { blockedStorage: true }); blocked.init(); blocked.click('.geometry-toolbox-toggle'); blocked.click('.geometry-toolbox-toggle');
  assert(blocked.box.contains(blocked.document.getElementById('mode2d'))); assert(!blocked.box.querySelector('.geometry-toolbox-body').hidden);
});

test('the builder keeps 2D shape editing and mode switching after moving and replacing button visuals', () => {
  const q = toolboxFixture('3d-yapi-atolyesi.html'); q.init();
  const board = q.document.getElementById('shapeBoard');
  Object.defineProperties(board, { clientWidth: { value: 800 }, clientHeight: { value: 560 } });
  q.context.ResizeObserver = class { observe() {} };
  for (const file of ['geometrik-ornekler.js', 'geometrik-sekiller.js']) vm.runInContext(fs.readFileSync(path.join(root, 'ogretmen', file), 'utf8'), q.context);
  q.click('#mode2d'); assert(q.shell.classList.contains('two-d'));
  q.click('[data-2d="triangle"]'); const triangle = q.document.querySelector('.geo-piece.is-selected'); assert(triangle);
  q.click('#shapeRotate'); assert.equal(triangle.dataset.rotation, '45');
  q.click('.geometry-toolbox-toggle'); q.click('.geometry-toolbox-size'); q.click('.geometry-toolbox-toggle');
  q.click('#shapeGrow'); assert(triangle.getAttribute('points').includes('69'));
  q.click('#shapeCopy'); assert.equal(q.document.querySelectorAll('.geo-piece').length, 2);
  q.click('#shapeRemove'); assert.equal(q.document.querySelectorAll('.geo-piece').length, 1);
  q.click('#mode3d'); assert(!q.shell.classList.contains('two-d')); q.click('#mode2d'); assert.equal(q.document.querySelectorAll('.geo-piece').length, 1);
  assert.equal(q.box.querySelectorAll('[data-2d] svg').length, 5);
  assert.equal(q.box.querySelectorAll('[data-example]').length, 22);
});

test('hover and focus reveal shape names without relying on text labels inside the icon buttons', () => {
  const q = toolboxFixture('3d-yapi-atolyesi.html'); q.init();
  const button = q.box.querySelector('[data-2d="triangle"]'), graphic = button.querySelector('svg');
  q.fire(graphic, 'pointerover'); const tip = q.document.querySelector('[role="tooltip"]');
  assert(!tip.hidden); assert.equal(tip.textContent, 'Üçgen'); assert.equal(button.getAttribute('aria-describedby'), tip.id);
  q.fire(button, 'pointerout'); assert(tip.hidden); assert.equal(button.getAttribute('aria-describedby'), null);
  q.fire(button, 'focusin'); assert(!tip.hidden); q.fire(button, 'focusout'); assert(tip.hidden);
});

test('initialization retains restored position in saved preferences for subsequent reloads', () => {
  const q = toolboxFixture('birim-kup-uygulamasi.html', { stored: { x: 300, y: 180, collapsed: false, wide: false, tab: 'view' } }); q.init();
  const saved = JSON.parse(q.storage.get('geometry-toolbox:cubes:v1'));
  assert.equal(saved.x, Number.parseFloat(q.box.style.left)); assert.equal(saved.y, Number.parseFloat(q.box.style.top));
  assert.equal(saved.tab, 'view');
});
