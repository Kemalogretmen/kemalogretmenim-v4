const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const G = require('../js/reflection-geometry.js');
const root = path.join(__dirname, '..');
const close = (actual, expected, tolerance = 1e-7) => assert(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const pointsClose = (actual, expected) => { close(actual.x, expected.x); close(actual.y, expected.y); };

function setup({ width = 1000, height = 720, paper = null } = {}) {
  const { document, window } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen/simetri.html'), 'utf8'));
  const svg = document.getElementById('symmetryCanvas');
  const rect = { left: 40, top: 30, width, height };
  svg.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height });
  const captures = new Set(), writes = [];
  svg.setPointerCapture = id => captures.add(id);
  svg.hasPointerCapture = id => captures.has(id);
  svg.releasePointerCapture = id => captures.delete(id);
  document.querySelectorAll('select').forEach(select => {
    let value = select.querySelector('option[selected]')?.value || select.querySelector('option')?.value || '';
    Object.defineProperty(select, 'value', { configurable: true, get: () => value, set: next => { value = String(next); } });
  });
  window.ReflectionGeometry = G;
  window.innerWidth = width + 80; window.innerHeight = height + 160;
  const ResizeObserver = class { observe() {} };
  const context = vm.createContext({ document, window, ResizeObserver,
    localStorage: { getItem: key => key === 'symmetry-paper:v1' ? paper : null, setItem: (key, value) => writes.push([key, value]) },
    requestAnimationFrame: fn => fn(), cancelAnimationFrame() {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/symmetry-studio.js'), 'utf8'), context);
  const $ = selector => document.querySelector(selector);
  const click = selector => $(selector).click();
  function event(target, type, options = {}) { const e = new window.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, options); target.dispatchEvent(e); return e; }
  function client(x, y) { const scale = Math.min(rect.width / 1000, rect.height / 720); return { clientX: rect.left + (rect.width - 1000 * scale) / 2 + x * scale, clientY: rect.top + (rect.height - 720 * scale) / 2 + y * scale }; }
  function pointer(target, type, x, y, options = {}) { return event(typeof target === 'string' ? $(target) : target, type, { pointerId: 1, button: 0, ...client(x, y), ...options }); }
  function drag(target, from, to, finish = 'pointerup') { pointer(target, 'pointerdown', ...from); pointer(svg, 'pointermove', ...to); pointer(svg, finish, ...to); }
  function set(selector, value, type = 'change') { $(selector).value = String(value); event($(selector), type); }
  function check(selector, value) { $(selector).checked = value; event($(selector), 'change'); }
  const originals = () => [...svg.querySelectorAll('[data-layer="originals"] .symmetry-item')];
  const reflections = () => [...svg.querySelectorAll('[data-layer="reflections"] .symmetry-reflection')];
  const originalById = id => svg.querySelector(`[data-layer="originals"] [data-item-id="${id}"]`);
  function empty() { set('#exampleSelect', 'empty'); click('#loadExample'); }
  return { document, window, context, svg, rect, captures, writes, $, click, event, pointer, drag, set, check, originals, reflections, originalById, empty };
}
function matrix(node) {
  const numbers = node.getAttribute('transform').slice(7, -1).trim().split(/\s+/).map(Number);
  return Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((key, index) => [key, numbers[index]]));
}
function pointOf(node) { const circle = node.querySelector('circle'); return { x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) }; }
function polygonOf(node) { return node.querySelector('polygon').getAttribute('points').trim().split(/\s+/).map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; }); }
function transformedPoint(node) { return G.applyMatrix(pointOf(node), matrix(node)); }
function label(q, text) { return [...q.svg.querySelectorAll('text')].find(node => node.textContent === text); }
function grip(q, name) { return q.svg.querySelector(`[data-handle="${name}"]`); }
function gripPoint(node) { const [x, y] = node.getAttribute('transform').match(/-?\d+(?:\.\d+)?/g).map(Number); return { x, y }; }

test('the default classroom example exposes P/R/S/T and exact opposite points across the vertical mirror', () => {
  const q = setup(); assert.equal(q.originals().length, 4); assert.equal(q.reflections().length, 4);
  const expected = [
    ['P', { x: 380, y: 160 }, { x: 620, y: 160 }],
    ['R', { x: 300, y: 280 }, { x: 700, y: 280 }],
    ['S', { x: 460, y: 400 }, { x: 540, y: 400 }],
    ['T', { x: 220, y: 520 }, { x: 780, y: 520 }]
  ];
  expected.forEach(([name, original, reflected], index) => {
    pointsClose(pointOf(q.originals()[index]), original); pointsClose(transformedPoint(q.reflections()[index]), reflected);
    const originalLabel = label(q, name), reflectedLabel = label(q, `${name}′`); assert(originalLabel); assert(reflectedLabel);
    close(Number(reflectedLabel.getAttribute('x')), reflected.x + 12); close(Number(reflectedLabel.getAttribute('y')), reflected.y - 12);
  });
  assert.equal(q.$('#axisAngleValue').textContent, '90°'); assert(q.$('#showAnswerBtn').hidden);
});

test('positive and negative 45 degree presets keep reflected SVG geometry and labels on the correct side', () => {
  for (const [preset, angle, expected] of [['up', 45, { x: 700, y: 480 }], ['down', -45, { x: 300, y: 240 }]]) {
    const q = setup(); q.set('#axisSelect', preset);
    const reflection = q.reflections()[0], m = matrix(reflection); pointsClose(transformedPoint(reflection), expected);
    close(m.a * m.d - m.b * m.c, -1); assert.equal(q.$('#axisAngleValue').textContent, `${angle}°`);
    const text = label(q, 'P′'); close(Number(text.getAttribute('x')), expected.x + 12); close(Number(text.getAttribute('y')), expected.y - 12);
  }
});

test('dragging a translated mirror moves all reflections while sources remain fixed, including mobile letterboxing', () => {
  const q = setup({ width: 350, height: 380 }), before = q.originals().map(pointOf);
  q.drag(grip(q, 'axis-move'), [500, 360], [620, 420]);
  assert.equal(q.captures.size, 0); pointsClose(gripPoint(grip(q, 'axis-move')), { x: 620, y: 420 });
  q.originals().forEach((node, index) => pointsClose(pointOf(node), before[index]));
  pointsClose(transformedPoint(q.reflections()[0]), { x: 860, y: 160 });
  q.click('#undoBtn'); pointsClose(gripPoint(grip(q, 'axis-move')), { x: 500, y: 360 });
});

test('dragging a source point or polygon recomputes its reflection without changing unrelated geometry', () => {
  const q = setup(); const point = q.originals()[0], pointId = point.dataset.itemId;
  q.drag(point, [380, 160], [420, 200]); pointsClose(pointOf(q.originalById(pointId)), { x: 420, y: 200 });
  pointsClose(transformedPoint(q.reflections().find(node => node.dataset.itemId === pointId)), { x: 580, y: 200 });
  q.empty(); q.click('[data-shape="triangle"]'); const triangle = q.originals()[0], id = triangle.dataset.itemId, before = polygonOf(triangle);
  q.drag(triangle, [320, 300], [400, 340]); const moved = polygonOf(q.originalById(id));
  before.forEach((p, index) => pointsClose(moved[index], { x: p.x + 80, y: p.y + 40 }));
  const reflected = q.reflections()[0]; moved.forEach(p => pointsClose(G.applyMatrix(p, matrix(reflected)), { x: 1000 - p.x, y: p.y }));
  const vertex = q.svg.querySelector('[data-handle="vertex"][data-index="0"]'); q.check('#snapGrid', false);
  q.drag(vertex, [moved[0].x, moved[0].y], [moved[0].x + 24, moved[0].y - 14]);
  const reshaped = polygonOf(q.originalById(id)); pointsClose(reshaped[0], { x: moved[0].x + 24, y: moved[0].y - 14 });
  pointsClose(reshaped[1], moved[1]); pointsClose(reshaped[2], moved[2]);
});

test('manual completion hides answers and never reflects the student pen, point, text or polygon work', () => {
  const q = setup(); q.set('#exampleSelect', 'triangle'); q.click('#loadExample'); q.click('[data-mode="manual"]');
  assert.equal(q.reflections().length, 0); assert(!q.$('#showAnswerBtn').hidden);
  q.click('[data-tool="pen"]'); q.drag(q.svg, [640, 200], [700, 300]);
  q.click('[data-tool="point"]'); q.pointer(q.svg, 'pointerdown', 700, 400);
  q.$('#textInput').value = 'Öğrenci'; q.click('[data-tool="text"]'); q.pointer(q.svg, 'pointerdown', 680, 470);
  q.click('[data-tool="polygon"]'); for (const p of [[620, 200], [700, 280], [740, 200]]) q.pointer(q.svg, 'pointerdown', ...p);
  q.click('#finishPolygon'); assert.equal(q.originals().length, 5); assert.equal(q.reflections().length, 0);
  const studentShapes = q.originals().slice(1).map(node => node.firstElementChild);
  studentShapes.forEach(shape => assert(['#d88743'].includes(shape.getAttribute('fill')) || shape.getAttribute('stroke') === '#d88743'));
  q.click('#showAnswerBtn'); assert.equal(q.reflections().length, 1); assert.equal(q.$('#showAnswerBtn').textContent, 'Yansımayı gizle');
  q.click('#showAnswerBtn'); assert.equal(q.reflections().length, 0); assert.equal(q.originals().length, 5);
});

test('undo and pointer cancellation restore committed source and mirror geometry without leaving a live gesture', () => {
  const q = setup(), point = q.originals()[0], id = point.dataset.itemId;
  q.drag(point, [380, 160], [420, 240], 'pointercancel'); pointsClose(pointOf(q.originalById(id)), { x: 380, y: 160 });
  assert.equal(q.captures.size, 0); q.pointer(q.svg, 'pointermove', 800, 600); pointsClose(pointOf(q.originalById(id)), { x: 380, y: 160 });
  q.drag(q.originalById(id), [380, 160], [460, 200]); pointsClose(pointOf(q.originalById(id)), { x: 460, y: 200 });
  q.click('#undoBtn'); pointsClose(pointOf(q.originalById(id)), { x: 380, y: 160 });
  q.click('[data-tool="pen"]'); const count = q.originals().length;
  q.pointer(q.svg, 'pointerdown', 200, 200); q.pointer(q.svg, 'pointermove', 270, 240); q.pointer(q.svg, 'pointercancel', 270, 240);
  assert.equal(q.originals().length, count); assert.equal(q.captures.size, 0);
});

test('pixel painting aligns to the displayed grid and does not duplicate a cell during tiny movements or revisits', () => {
  const q = setup(); q.empty(); q.click('[data-tool="pixel"]');
  q.pointer(q.svg, 'pointerdown', 540, 200); q.pointer(q.svg, 'pointermove', 541, 200);
  assert.equal(q.originals().length, 1); assert.deepEqual(polygonOf(q.originals()[0]), [{ x: 540, y: 200 }, { x: 580, y: 200 }, { x: 580, y: 240 }, { x: 540, y: 240 }]);
  q.pointer(q.svg, 'pointermove', 590, 200); q.pointer(q.svg, 'pointermove', 541, 200); q.pointer(q.svg, 'pointerup', 541, 200);
  assert.equal(q.originals().length, 2); assert.equal(q.reflections().length, 2);
  q.click('#undoBtn'); assert.equal(q.originals().length, 0);
});

test('points, editable vertices and pixel cells remain inside the drawing board at its edges', () => {
  const q = setup(); q.empty(); q.click('[data-tool="point"]');
  for (const p of [[1000, 200], [0, 200], [1000, 720], [0, 0]]) q.pointer(q.svg, 'pointerdown', ...p);
  q.originals().forEach(node => { const p = pointOf(node); assert(p.x >= 0 && p.x <= 1000); assert(p.y >= 0 && p.y <= 720); });
  q.empty(); q.click('[data-shape="triangle"]');
  const vertex = q.svg.querySelector('[data-handle="vertex"][data-index="0"]'); q.drag(vertex, [320, 210], [1000, 720]);
  polygonOf(q.originals()[0]).forEach(p => { assert(p.x >= 0 && p.x <= 1000); assert(p.y >= 0 && p.y <= 720); });
  q.empty(); q.click('[data-tool="pixel"]'); q.drag(q.svg, [1000, 720], [0, 0]);
  q.originals().forEach(node => polygonOf(node).forEach(p => { assert(p.x >= 0 && p.x <= 1000); assert(p.y >= 0 && p.y <= 720); }));
});

test('switching among square, dotted, isometric and plain paper preserves objects and remembers the setting', () => {
  const q = setup(); const original = q.originals().map(pointOf);
  for (const [paper, pattern] of [['dots', 'symmetryDots'], ['isometric', 'symmetryIso'], ['plain', null], ['square', 'symmetrySquare']]) {
    q.set('#paperSelect', paper); const fills = [...q.svg.querySelectorAll(':scope > rect')].map(n => n.getAttribute('fill'));
    assert(fills.includes(pattern ? `url(#${pattern})` : 'none'));
    q.originals().forEach((node, index) => pointsClose(pointOf(node), original[index]));
    assert.deepEqual(q.writes.at(-1), ['symmetry-paper:v1', paper]);
  }
  const restored = setup({ paper: 'dots' }); assert.equal(restored.$('#paperSelect').value, 'dots'); assert(restored.svg.querySelector('[fill="url(#symmetryDots)"]'));
});

test('initial points can be selected and moved from the keyboard, and mobile touch targets stay usable', () => {
  const q = setup({ width: 350, height: 380 }); const point = q.originals()[0], id = point.dataset.itemId;
  assert.equal(point.getAttribute('tabindex'), '0'); assert(point.getAttribute('aria-label'));
  q.event(point, 'focusin'); q.event(q.originalById(id), 'keydown', { key: 'Enter' });
  q.event(q.originalById(id), 'keydown', { key: 'ArrowRight' }); pointsClose(pointOf(q.originalById(id)), { x: 385, y: 160 });
  q.event(q.originalById(id), 'keydown', { key: 'ArrowDown', shiftKey: true }); pointsClose(pointOf(q.originalById(id)), { x: 385, y: 200 });
  const hit = q.originalById(id).querySelector('[opacity="0"]');
  assert(Number(hit.getAttribute('r')) * 2 * .35 >= 24, 'Point touch target must be at least 24 CSS pixels');
  const axisHit = grip(q, 'axis-move').querySelector('circle');
  assert(Number(axisHit.getAttribute('r')) * 2 * .35 >= 24, 'Axis touch target must be at least 24 CSS pixels');
});

test('mobile opens with a collapsed toolbox and readable point labels, while its toggle restores every tool', () => {
  const q = setup({ width: 350, height: 380 }), panel = q.$('#symmetryControlBody'), toggle = q.$('#symmetryPanelToggle');
  assert(panel.hidden); assert.equal(toggle.getAttribute('aria-expanded'), 'false'); assert.equal(toggle.textContent, '+');
  for (const name of ['P', 'R', 'S', 'T', 'P′', 'R′', 'S′', 'T′']) {
    const text = label(q, name); assert(text); assert(Number(text.getAttribute('font-size')) * .35 >= 12 - 1e-7, `${name} must remain at least 12 CSS pixels`);
  }
  q.click('#symmetryPanelToggle'); assert(!panel.hidden); assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert(panel.contains(q.$('#axisSelect'))); assert(panel.contains(q.$('#saveImageBtn')));
  q.click('#symmetryPanelToggle'); assert(panel.hidden); assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  const desktop = setup(); assert(!desktop.$('#symmetryControlBody').hidden);
});

function pngFixture({ canvasThrows = false } = {}) {
  const q = setup(), images = [], urls = [], revoked = [], timers = [], downloads = [], canvases = [], drawn = [];
  let markup, pendingPNG, imageType;
  const nativeCreate = q.document.createElement.bind(q.document);
  q.context.XMLSerializer = class { serializeToString(node) { markup = node.outerHTML; return markup; } };
  q.context.Blob = Blob;
  q.context.URL = {
    createObjectURL(blob) { const url = `blob:symmetry-test-${urls.length + 1}`; urls.push({ url, blob }); return url; },
    revokeObjectURL(url) { revoked.push(url); }
  };
  q.context.Image = class { constructor() { images.push(this); } };
  q.window.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  q.document.createElement = function (tag, ...args) {
    const node = nativeCreate(tag, ...args);
    if (tag.toLowerCase() === 'canvas') {
      canvases.push(node); node.getContext = () => {
        if (canvasThrows) throw new Error('Rasterizer unavailable');
        return { fillRect() {}, drawImage(...args) { drawn.push(args); } };
      };
      node.toBlob = (callback, type) => { pendingPNG = callback; imageType = type; };
    }
    if (tag.toLowerCase() === 'a') node.click = () => downloads.push({ node, attached: q.document.body.contains(node), name: node.download, href: node.href });
    return node;
  };
  return { ...q, images, urls, revoked, timers, downloads, canvases, drawn,
    get markup() { return markup; }, get imageType() { return imageType; },
    imageLoaded() { images.at(-1).onload(); }, imageFailed() { images.at(-1).onerror(); },
    pngReady(blob) { assert(pendingPNG, 'Image load must start the PNG encoding step'); pendingPNG(blob); }
  };
}

test('PNG export renders 2000×1440 without interaction handles, clicks an attached Blob link and revokes it later', () => {
  const q = pngFixture(), button = q.$('#saveImageBtn');
  q.click('#saveImageBtn'); assert(button.disabled); assert.equal(q.images.length, 1); assert.match(q.$('#symmetryStatus').textContent, /hazırlanıyor/);
  const { document: exported } = parseHTML(q.markup), exportedSVG = exported.querySelector('svg');
  assert.equal(exportedSVG.getAttribute('width'), '2000'); assert.equal(exportedSVG.getAttribute('height'), '1440');
  assert.equal(exportedSVG.querySelector('.interaction'), null); assert.equal(exportedSVG.querySelector('[data-handle]'), null);
  assert(q.svg.querySelector('.interaction'), 'Export must leave the live editor handles intact');
  assert.equal(q.urls[0].blob.type, 'image/svg+xml;charset=utf-8'); assert.equal(q.images[0].src, q.urls[0].url);
  q.imageLoaded(); assert.equal(q.canvases.length, 1); assert.equal(q.canvases[0].width, 2000); assert.equal(q.canvases[0].height, 1440);
  assert.equal(q.imageType, 'image/png'); assert.equal(q.downloads.length, 0); assert(button.disabled, 'Keep the export guarded while PNG encoding is pending');
  assert.deepEqual(q.drawn[0].slice(1), [0, 0, 2000, 1440]);
  const png = new Blob(['PNG test fixture'], { type: 'image/png' }); q.pngReady(png);
  assert(!button.disabled); assert.equal(q.downloads.length, 1); assert(q.downloads[0].attached, 'The download anchor must be attached when clicked');
  assert.equal(q.downloads[0].name, 'simetri-aynasi.png'); assert.equal(q.urls[1].blob, png); assert.equal(q.downloads[0].href, q.urls[1].url);
  assert(!q.document.body.contains(q.downloads[0].node), 'Remove the temporary link after its click');
  assert.equal(q.$('#symmetryStatus').textContent, 'PNG hazır · 2000 × 1440');
  assert(q.revoked.includes(q.urls[0].url)); assert(!q.revoked.includes(q.urls[1].url), 'Do not revoke the PNG URL before the browser starts downloading it');
  assert.equal(q.timers.length, 1); assert.equal(q.timers[0].delay, 10000); q.timers[0].callback(); assert(q.revoked.includes(q.urls[1].url));
});

test('PNG image errors, empty encoding and rasterizer errors unlock the export button and release the source URL', () => {
  for (const failure of ['image', 'empty-png', 'canvas']) {
    const q = pngFixture({ canvasThrows: failure === 'canvas' }); q.click('#saveImageBtn'); assert(q.$('#saveImageBtn').disabled);
    if (failure === 'image') q.imageFailed(); else { q.imageLoaded(); if (failure === 'empty-png') q.pngReady(null); }
    assert(!q.$('#saveImageBtn').disabled, `${failure} must release the export guard`);
    assert.match(q.$('#symmetryStatus').textContent, /hazırlanamadı/); assert.equal(q.downloads.length, 0);
    assert(q.revoked.includes(q.urls[0].url));
  }
});
