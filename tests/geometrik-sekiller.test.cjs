const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function setup() {
  const root = path.join(__dirname, '..');
  const { document, window } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen/3d-yapi-atolyesi.html'), 'utf8'));
  const board = document.getElementById('shapeBoard');
  let w = 800, h = 560, screenScale = 1;
  Object.defineProperties(board, { clientWidth: { get: () => w }, clientHeight: { get: () => h } });
  document.querySelector('.builder-shell').getBoundingClientRect = () => ({ top: 100 });
  window.scrollY = 0;
  window.Element.prototype.setPointerCapture = window.Element.prototype.releasePointerCapture = () => {};
  window.Element.prototype.hasPointerCapture = () => true;
  let resize;
  const context = vm.createContext({ document, window, ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} } });
  for (const file of ['geometrik-ornekler.js', 'geometrik-sekiller.js']) vm.runInContext(fs.readFileSync(path.join(root, 'ogretmen', file), 'utf8'), context);
  const svg = document.querySelector('.shape-canvas');
  svg.getBoundingClientRect = () => ({ left: 30, top: 20, width: w * screenScale, height: h * screenScale });
  const click = selector => document.querySelector(selector).click();
  click('#mode2d');
  function pointer(node, type, x, y, options = {}) {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, clientX: 30 + x * screenScale, clientY: 20 + y * screenScale, ...options }); node.dispatchEvent(event);
  }
  function drag(node, start, end, finish = 'pointerup') {
    pointer(node, 'pointerdown', ...start); pointer(svg, 'pointermove', ...end); pointer(svg, finish, ...end);
  }
  return { document, window, svg, click, pointer, drag,
    add(type) { click(`[data-2d="${type}"]`); return document.querySelector('.geo-piece.is-selected'); },
    handle(selector) { return document.querySelector(`.shape-handle${selector}`); },
    resize(nextW, nextH) { w = nextW; h = nextH; resize(); },
    zoom(scale) { screenScale = scale; }
  };
}
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
function pose(node) {
  const [x, y, angle] = node.getAttribute('transform').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  return { x, y, angle };
}
function world(node, local) {
  const p = pose(node), a = p.angle * Math.PI / 180;
  return [p.x + local[0] * Math.cos(a) - local[1] * Math.sin(a), p.y + local[0] * Math.sin(a) + local[1] * Math.cos(a)];
}
function points(node) { return node.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)); }

test('palette has exactly the requested five shape types and 22 editable examples', () => {
  const q = setup();
  assert.deepEqual([...q.document.querySelectorAll('[data-2d]')].map(n => n.dataset['2d']), ['triangle', 'square', 'rectangle', 'ring', 'circle']);
  const examples = [...q.document.querySelectorAll('[data-example]')]; assert.equal(examples.length, 22);
  for (const button of examples) {
    button.click(); const pieces = [...q.document.querySelectorAll('.geo-piece')]; assert(pieces.length >= 5);
    for (const node of pieces) {
      assert(['triangle', 'square', 'rectangle', 'ring', 'circle'].includes(node.dataset.type));
      if (node.dataset.type === 'triangle') assert.equal(points(node).length, 3);
      if (node.dataset.type === 'square') near(Number(node.getAttribute('width')), Number(node.getAttribute('height')));
      q.pointer(node, 'pointerdown', ...world(node, [0, 0])); q.pointer(q.svg, 'pointerup', ...world(node, [0, 0]));
      assert.equal(q.document.querySelector('.geo-piece.is-selected'), node);
    }
  }
});

test('triangle vertices reshape independently after rotation and keep other vertices fixed', () => {
  const q = setup(), node = q.add('triangle'); q.click('#shapeRotate');
  const before = points(node).map(p => world(node, p));
  q.drag(q.handle('[data-kind="vertex"][data-index="0"]'), before[0], [before[0][0] + 42, before[0][1] - 18]);
  const after = points(node).map(p => world(node, p)); near(after[0][0], before[0][0] + 42); near(after[0][1], before[0][1] - 18);
  for (let i = 1; i < 3; i++) { near(after[i][0], before[i][0]); near(after[i][1], before[i][1]); }
  near(pose(node).angle, 45);
});

test('square stays square when a rotated corner is dragged and its opposite corner stays fixed', () => {
  const q = setup(), node = q.add('square'); q.click('#shapeRotate');
  const anchor = world(node, [-60, -60]), start = world(node, [60, 60]), end = world(node, [110, 80]);
  q.drag(q.handle('[data-kind="resize"][data-sx="1"][data-sy="1"]'), start, end);
  near(Number(node.getAttribute('width')), 155); near(Number(node.getAttribute('height')), 155);
  const nextAnchor = world(node, [-77.5, -77.5]); near(nextAnchor[0], anchor[0]); near(nextAnchor[1], anchor[1]);
});

test('rectangle side handles change width and height independently in its rotated coordinates', () => {
  const q = setup(), node = q.add('rectangle'); q.click('#shapeRotate');
  const anchor = world(node, [-85, 0]);
  q.drag(q.handle('[data-kind="resize"][data-sx="1"][data-sy="0"]'), world(node, [85, 0]), world(node, [135, 25]));
  near(Number(node.getAttribute('width')), 220); near(Number(node.getAttribute('height')), 95);
  const nextAnchor = world(node, [-110, 0]); near(nextAnchor[0], anchor[0]); near(nextAnchor[1], anchor[1]);
  q.drag(q.handle('[data-kind="resize"][data-sx="0"][data-sy="1"]'), world(node, [0, 47.5]), world(node, [25, 82.5]));
  near(Number(node.getAttribute('width')), 220); near(Number(node.getAttribute('height')), 130);
});

test('circles and rings change diameter, stay round and offer no rotation control', () => {
  for (const type of ['circle', 'ring']) {
    const q = setup(), node = q.add(type), anchor = world(node, [-60, 0]);
    assert(q.document.getElementById('shapeRotate').disabled); assert.equal(q.handle('[data-kind="rotate"]'), null);
    q.drag(q.handle('[data-kind="resize"][data-sx="1"]'), world(node, [60, 0]), world(node, [100, 35]));
    near(Number(node.getAttribute('r')), 80); near(pose(node).x - 80, anchor[0]);
    q.click('#shapeRotate'); near(pose(node).angle, 0);
    assert.equal(node.getAttribute('fill') === 'none', type === 'ring');
  }
});

test('rotation handle turns around the center and subsequent drag has no jump, even on a scaled display', () => {
  const q = setup(), node = q.add('square'), before = pose(node); q.zoom(.5);
  q.drag(q.handle('[data-kind="rotate"]'), [before.x, before.y - 90], [before.x + 90, before.y]);
  near(pose(node).angle, 90); near(pose(node).x, before.x); near(pose(node).y, before.y);
  q.drag(node, [before.x + 20, before.y + 10], [before.x + 65, before.y - 5]);
  near(pose(node).x, before.x + 45); near(pose(node).y, before.y - 15);
});

test('pointer cancellation ends editing, copied triangles keep geometry and resizing the board preserves proportions', () => {
  const q = setup(), node = q.add('triangle'), start = pose(node);
  q.drag(node, [start.x, start.y], [start.x + 20, start.y + 25], 'pointercancel');
  const after = pose(node); q.pointer(q.svg, 'pointermove', after.x + 100, after.y + 100); near(pose(node).x, after.x);
  q.click('#shapeCopy'); const copy = q.document.querySelector('.geo-piece.is-selected'); assert.notEqual(copy, node); assert.deepEqual(points(copy), points(node));
  q.click('#shapeClear'); const square = q.add('square'); q.resize(400, 560);
  near(Number(square.getAttribute('width')), Number(square.getAttribute('height')));
  assert(pose(square).x >= 18 && pose(square).x <= 382);
  q.click('#mode3d'); assert(!q.document.querySelector('.builder-shell').classList.contains('two-d')); q.click('#mode2d'); assert.equal(q.document.querySelectorAll('.geo-piece').length, 1);
});

test('very small or crossed resize gestures cannot turn squares into rectangles or flatten triangles', () => {
  const q = setup(), square = q.add('square');
  q.drag(q.handle('[data-kind="resize"][data-sx="1"][data-sy="1"]'), world(square, [60, 60]), world(square, [-140, -140]));
  near(Number(square.getAttribute('width')), 24); near(Number(square.getAttribute('height')), 24);
  const triangle = q.add('triangle'), before = points(triangle);
  q.drag(q.handle('[data-kind="vertex"][data-index="0"]'), world(triangle, before[0]), world(triangle, [0, 60]));
  assert.deepEqual(points(triangle), before);
});
