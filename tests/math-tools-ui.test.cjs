const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function setup(width = 1280) {
  const root = path.join(__dirname, '..');
  const { document, window } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen/matematik.html'), 'utf8'));
  window.innerWidth = width; window.devicePixelRatio = 1;
  window.setTimeout = () => 0; window.clearTimeout = () => {};
  const context2d = new Proxy({}, { get(target, key) { if (key === 'measureText') return () => ({ width: 20 }); if (key === 'getImageData') return () => ({ data: [] }); return () => {}; }, set() { return true; } });
  window.HTMLCanvasElement.prototype.getContext = () => context2d;
  const context = vm.createContext({ window, document, Intl, Date, Math, console,
    setInterval: () => 0, setTimeout: () => 0, requestAnimationFrame: () => 0,
    localStorage: { getItem: () => null, setItem() {} }, innerWidth: width, devicePixelRatio: 1 });
  const originalButtons = [...document.querySelectorAll('[data-math-mode]')];
  const originalCalculatorKeys = [...document.querySelectorAll('.calc-btn')];
  for (const script of document.querySelectorAll('script:not([src])')) vm.runInContext(script.textContent, context, { filename: 'matematik-inline.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/math-tools-ui.js'), 'utf8'), context);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  function event(target, type, properties = {}) { const e = new window.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, properties); target.dispatchEvent(e); }
  return { document, window, originalButtons, originalCalculatorKeys, event,
    click(selector) { document.querySelector(selector).click(); },
    search(text) { const input = document.getElementById('mathToolSearch'); input.value = text; event(input, 'input'); }
  };
}

test('the studio preserves all tool controls and offers each geometry destination once', () => {
  const q = setup(); assert.equal(q.document.querySelectorAll('.math-nav-item').length, 11);
  for (const button of q.originalButtons) assert(q.document.querySelector('.math-mode-list').contains(button));
  for (const key of q.originalCalculatorKeys) { assert(q.document.getElementById('mathCalcView').contains(key)); assert(key.getAttribute('onclick')); }
  for (const href of ['birim-kup-uygulamasi.html', '3d-yapi-atolyesi.html', 'geometrik-cisimler-acilimlar.html', 'simetri.html']) assert.equal(q.document.querySelectorAll(`#mathWorkspace a[href="${href}"]`).length, 1);
  assert.equal(q.document.querySelector('.math-tool-launch-grid'), null);
  assert.equal(q.document.querySelectorAll('.math-nav-item svg').length, 15, 'Seven tools and four links have individual SVGs, plus four navigation arrows');
});

test('all seven real tool modes remain functional and update the studio title and ARIA selection', () => {
  const q = setup();
  const modes = { calc: 'mathCalcView', rng: 'mathRngView', wheel: 'mathWheelView', frac: 'mathFracView', nl: 'mathNlView', geo: 'mathGeoView', convert: 'mathConvertView' };
  for (const [mode, viewId] of Object.entries(modes)) {
    q.click(`[data-math-mode="${mode}"]`);
    assert.equal(q.document.getElementById(viewId).style.display, 'block');
    for (const [other, otherView] of Object.entries(modes)) if (other !== mode) assert.equal(q.document.getElementById(otherView).style.display, 'none');
    assert.equal(q.document.querySelector(`[data-math-mode="${mode}"]`).getAttribute('aria-selected'), 'true');
    assert.equal(q.document.querySelectorAll('[data-math-mode][aria-selected="true"]').length, 1);
    assert.equal(q.document.getElementById('mathActiveTitle').textContent, q.document.querySelector(`[data-math-mode="${mode}"] strong`).textContent);
    assert.equal(q.document.getElementById(viewId).getAttribute('aria-labelledby'), `math-tab-${mode}`);
  }
  assert(q.document.getElementById('fracSvgContainer').querySelector('svg'));
});

test('calculator and fraction models keep real state across navigation and examples calculate correctly', () => {
  const q = setup();
  ['1', '2', '+', '3', '='].forEach(q.window.mathCalc); assert.equal(q.document.getElementById('calcScreen').textContent, '15');
  q.click('[data-math-mode="frac"]'); q.window.changeFrac('num', 1); assert.equal(q.document.getElementById('fracNumDisplay').textContent, '2');
  q.click('[data-math-mode="calc"]'); assert.equal(q.document.getElementById('calcScreen').textContent, '15');
  q.click('.math-example-chips button:last-child'); assert.equal(q.document.getElementById('calcScreen').textContent, '60');
  q.click('[data-math-mode="frac"]'); assert.equal(q.document.getElementById('fracNumDisplay').textContent, '2');
});

test('search understands Turkish labels, filters links and can be cleared without changing the active tool', () => {
  const q = setup(); q.search('SAYI');
  const visible = [...q.document.querySelectorAll('.math-nav-item')].filter(n => !n.hidden); assert.equal(visible.length, 2);
  assert(visible.every(n => /Sayı|Sayı/i.test(n.textContent)));
  assert(visible.some(n => n.getAttribute('tabindex') === '0'), 'Filtered results keep a reachable keyboard tab stop');
  q.search('acilim'); assert.equal([...q.document.querySelectorAll('.math-nav-item')].filter(n => !n.hidden).length, 1);
  q.search('bulunmayan'); assert.equal(q.document.querySelector('.math-library-empty').hidden, false);
  q.event(q.document.getElementById('mathToolSearch'), 'keydown', { key: 'Escape' });
  assert([...q.document.querySelectorAll('.math-nav-item')].every(n => !n.hidden));
  assert.equal(q.document.getElementById('mathCalcView').style.display, 'block');
});

test('mobile library opens explicitly and closes after selection; desktop keyboard navigation is retained', () => {
  const q = setup(390), library = q.document.getElementById('mathToolLibrary');
  assert.equal(library.inert, true); q.click('.math-library-trigger'); assert.equal(library.inert, false);
  assert.equal(q.document.querySelector('.math-library-trigger').getAttribute('aria-expanded'), 'true');
  q.click('[data-math-mode="wheel"]'); assert.equal(library.inert, true); assert.equal(q.document.querySelector('.math-library-trigger').getAttribute('aria-expanded'), 'false');
  assert.match(q.document.querySelector('.math-library-trigger').textContent, /Sayı çarkı/);
  q.click('.math-library-trigger'); q.event(q.document.getElementById('mathToolSearch'), 'keydown', { key: 'd' });
  assert.equal(library.inert, false, 'Searching cannot deactivate the open mobile library');
  assert.equal(q.document.getElementById('mathWheelView').style.display, 'block', 'Typing in search cannot trigger a tool shortcut');
  q.event(library, 'keydown', { key: 'Escape' }); assert.equal(library.inert, true);
  q.window.innerWidth = 1280; q.event(q.window, 'resize'); assert.equal(library.inert, false);
  q.event(q.document.querySelector('[data-math-mode="wheel"]'), 'keydown', { key: 'ArrowDown' });
  assert.equal(q.document.querySelector('[data-math-mode="frac"]').getAttribute('aria-selected'), 'true');
});

test('keyboard shortcuts and the shortcut popup fire once after the redesign', () => {
  const q = setup(); q.click('.shortcut-help-btn'); assert(q.document.getElementById('mathShortcuts').classList.contains('is-open'));
  q.click('[data-shortcut-close]'); assert(!q.document.getElementById('mathShortcuts').classList.contains('is-open'));
  q.event(q.document, 'keydown', { key: 'd' }); assert.equal(q.document.getElementById('mathRngView').style.display, 'block'); assert.match(q.document.getElementById('dice1').style.transform, /rotateX/);
  q.event(q.document, 'keydown', { key: 'u' }); assert.equal(q.document.getElementById('mathConvertView').style.display, 'block');
});
