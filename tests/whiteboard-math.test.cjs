const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function setup(options = {}) {
  const root = path.join(__dirname, '..');
  const { document, window } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen/beyaztahta.html'), 'utf8'));
  const plane = document.getElementById('boardPlane');
  const stage = document.getElementById('whiteboardStage');
  Object.defineProperties(plane, { clientWidth: { value: 1000 }, clientHeight: { value: 1240 } });
  Object.defineProperty(stage, 'clientWidth', { value: 1000 });
  plane.getBoundingClientRect = stage.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 750 });
  window.matchMedia = () => ({ matches: false });
  const frames = new Map();
  let id = 0;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/whiteboard-math.js'), 'utf8'), {
    window, document, innerWidth: 1000, innerHeight: 750, performance: { now: () => 0 },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key)
  });
  const items = [];
  const tools = window.initWhiteboardMathTools({ plane, stage, button: document.getElementById('boardProtractorBtn'),
    zoom: () => 1, color: () => '#ef4444', size: () => 6, activate() {}, togglePanel() {}, commit: item => items.push(item), ...options });
  const instrument = document.getElementById('mathInstrument');
  instrument.setPointerCapture = instrument.releasePointerCapture = () => {};
  instrument.hasPointerCapture = () => true;
  const pointer = (selector, type, x, y) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: y });
    document.querySelector(selector).dispatchEvent(event);
  };
  const click = selector => document.querySelector(selector).click();
  const set = (selector, value) => { const el = document.querySelector(selector); el.value = String(value); el.dispatchEvent(new window.Event('change')); };
  const finish = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(1000)); };
  return { items, tools, click, set, finish, document, pointer };
}

test('compass creates an exact circle and a filled disk with the selected brush', () => {
  const q = setup();
  q.click('[data-math-tool="compass"]'); q.set('#mathLength', 3); q.click('#mathDraw');
  assert.equal(q.items.length, 0, 'The incomplete animated preview is not saved');
  q.finish();
  const circle = q.items[0];
  assert.equal(circle.tool, 'circle'); assert.equal(circle.fillEnabled, false);
  assert.equal(circle.end.x - circle.start.x, 192);
  assert.equal(circle.end.y - circle.start.y, 192);
  assert.equal(circle.strokeColor, '#ef4444'); assert.equal(circle.size, 6);
  q.set('[name="mathCircleType"][value="disk"]', 'disk');
  q.set('#mathLength', 2); q.click('#mathDraw'); q.finish();
  assert.equal(q.items[1].fillEnabled, true); assert.equal(q.items[1].end.x - q.items[1].start.x, 128);
});

test('rotating the ruler preserves its exact length and direction', () => {
  const q = setup(); q.click('[data-math-tool="ruler"]');
  q.set('#mathLength', 5); q.set('#mathRotation', 30); q.click('#mathDraw');
  const { start, end } = q.items[0];
  assert(Math.abs(Math.hypot(end.x - start.x, end.y - start.y) - 160) < 1e-8);
  assert(Math.abs(Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 30) < 1e-8);
});

test('protractor preserves the chosen angle at any rotation, including 0 and 180 degrees', () => {
  const q = setup(); q.click('[data-math-tool="protractor"]'); q.set('#mathRotation', -75);
  for(const expected of [0, 60, 90, 180]) {
    q.set('#mathAngle', expected); q.click('#mathDraw');
    const [a, center, b] = q.items.at(-1).points;
    const dot = (a.x - center.x) * (b.x - center.x) + (a.y - center.y) * (b.y - center.y);
    const denominator = Math.hypot(a.x - center.x, a.y - center.y) * Math.hypot(b.x - center.x, b.y - center.y);
    const actual = Math.acos(Math.max(-1, Math.min(1, dot / denominator))) * 180 / Math.PI;
    assert(Math.abs(actual - expected) < 1e-5);
  }
});

test('closing or switching an animating compass never commits an unfinished drawing', () => {
  const q = setup(); q.click('[data-math-tool="compass"]'); q.click('#mathDraw');
  q.tools.hide(); q.finish(); assert.equal(q.items.length, 0);
  q.click('[data-math-tool="compass"]'); q.click('#mathDraw');
  q.click('[data-math-tool="ruler"]'); q.finish(); assert.equal(q.items.length, 0);
});

test('recentering keeps the requested radius; invalid dimensions remain bounded', () => {
  const q = setup(); q.click('[data-math-tool="compass"]');
  q.set('#mathLength', 8); q.click('#mathCenter'); q.click('#mathDraw'); q.finish();
  assert.equal(q.items[0].end.x - q.items[0].start.x, 512);
  q.set('#mathLength', -10); q.click('#mathDraw'); q.finish();
  assert.equal(q.items[1].end.x - q.items[1].start.x, 32);
});

test('instrument SVG keeps explicit dimensions despite the site-wide max-width rule', () => {
  const q = setup(); q.click('[data-math-tool="compass"]');
  const svg = q.document.querySelector('.math-instrument-svg');
  assert.equal(svg.style.maxWidth, 'none');
  assert(Number(svg.getAttribute('width')) > 200);
  assert.equal(svg.getAttribute('preserveAspectRatio'), 'none');
});

test('dragging either compass leg uses board coordinates and keeps the opposite tip fixed', () => {
  const q = setup({ toBoardPoint: e => ({ x: (e.clientX - 100) / 2, y: (e.clientY - 40) / 2 }) });
  q.click('[data-math-tool="compass"]');
  const drag = (selector, from, to) => {
    q.pointer(selector, 'pointerdown', from[0] * 2 + 100, from[1] * 2 + 40);
    q.pointer('#mathInstrument', 'pointermove', to[0] * 2 + 100, to[1] * 2 + 40);
    q.pointer('#mathInstrument', 'pointerup', to[0] * 2 + 100, to[1] * 2 + 40);
    q.finish();
  };
  // Grab midway up the pencil leg, preserving the offset to its actual tip.
  drag('.instrument-hit[data-drag="radius"]', [575, 330], [607, 330]);
  q.click('#mathDraw'); q.finish();
  let circle = q.items.at(-1);
  assert.equal((circle.start.x + circle.end.x) / 2, 500);
  assert.equal(circle.end.x - circle.start.x, 256);
  drag('.instrument-handle[data-drag="needle"]', [500, 375], [468, 375]);
  q.click('#mathDraw'); q.finish();
  circle = q.items.at(-1);
  assert.equal((circle.start.x + circle.end.x) / 2, 468);
  assert.equal(circle.end.x, 628, 'Pencil endpoint stays fixed when the needle moves');
});

test('protractor size is independent of both angle-arm lengths', () => {
  const q = setup(); q.click('[data-math-tool="protractor"]');
  q.set('#mathArm1', 3); q.set('#mathArm2', 6); q.set('#mathAngle', 90);
  q.set('#mathProtractorSize', 175); q.set('#mathRotation', 35); q.click('#mathDraw');
  const [a, center, b] = q.items[0].points;
  assert(Math.abs(Math.hypot(a.x - center.x, a.y - center.y) - 96) < 1e-8);
  assert(Math.abs(Math.hypot(b.x - center.x, b.y - center.y) - 192) < 1e-8);
  assert(Math.abs((a.x - center.x) * (b.x - center.x) + (a.y - center.y) * (b.y - center.y)) < 1e-8);
  assert.equal(Number(q.document.querySelector('#mathProtractorSize').value), 175);
});

test('rotated ruler keeps both interactive handles inside its SVG viewport and shows its angle', () => {
  const q = setup(); q.click('[data-math-tool="ruler"]');
  for (const angle of [-180, -135, -90, -45, 0, 45, 90, 135, 180]) {
    q.set('#mathRotation', angle);
    const svg = q.document.querySelector('.math-instrument-svg');
    const [left, top, width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
    const rad = angle * Math.PI / 180;
    for (const y of [-30, 32]) {
      const xRot = 320 * Math.cos(rad) - y * Math.sin(rad);
      const yRot = 320 * Math.sin(rad) + y * Math.cos(rad);
      assert(xRot - 21 >= left && xRot + 21 <= left + width, `Handle x bounds at ${angle}`);
      assert(yRot - 21 >= top && yRot + 21 <= top + height, `Handle y bounds at ${angle}`);
    }
    assert.equal(q.document.querySelector('.math-rotation-label').textContent, `${angle}°`);
  }
  q.click('[data-math-tool="compass"]');
  assert.equal(q.document.querySelector('.math-rotation-label').hidden, true);
});
