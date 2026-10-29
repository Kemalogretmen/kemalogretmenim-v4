const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.join(__dirname, '..');
const kinds = ['square', 'isometric', 'dots', 'ruled', 'plain'];

function fixture({ page, storage = new Map(), blocked = false } = {}) {
  const html = page ? fs.readFileSync(path.join(root, 'ogretmen', page), 'utf8') : '<!doctype html><html><body></body></html>';
  const { document, window } = parseHTML(html);
  const draws = [], textures = [], viewport = { width: 1280, height: 800 };
  const createElement = document.createElement.bind(document);
  document.createElement = function(tag, ...rest) {
    const element = createElement(tag, ...rest);
    if (tag === 'canvas') {
      const ctx = new Proxy({}, { get(target, key) { return key in target ? target[key] : (...args) => { draws.push({ canvas: element, command: key, args }); }; }, set(target, key, value) { target[key] = value; return true; } });
      element.getContext = () => ctx;
    }
    return element;
  };
  Object.defineProperties(window, { innerWidth: { configurable: true, get: () => viewport.width }, innerHeight: { configurable: true, get: () => viewport.height } });
  window.scrollY = 0;
  window.Element.prototype.getBoundingClientRect = function() {
    const left = parseFloat(this.style.left) || 0, top = this.matches('.builder-shell, .cube-tool-shell, .geo-tool-shell') ? 100 : parseFloat(this.style.top) || 0;
    return { left, top, x: left, y: top, width: this.classList.contains('geometry-toolbox') ? 282 : 800, height: this.classList.contains('geometry-toolbox') ? 480 : 560, right: left + 800, bottom: top + 560 };
  };
  window.Element.prototype.setPointerCapture = window.Element.prototype.releasePointerCapture = () => {};
  window.Element.prototype.hasPointerCapture = () => false;
  document.querySelectorAll('select').forEach(select => {
    let value = select.querySelector('option[selected]')?.value || select.querySelector('option')?.value || '';
    Object.defineProperty(select, 'value', { configurable: true, get: () => value, set: next => { value = String(next); } });
  });
  const store = {
    getItem(key) { if (blocked) throw Error('Storage disabled'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('Storage disabled'); storage.set(key, value); },
    removeItem(key) { if (blocked) throw Error('Storage disabled'); storage.delete(key); }
  };
  window.localStorage = store;
  const observer = class { observe() {} disconnect() {} };
  const context = vm.createContext({ window, document, localStorage: store, Event: window.Event, CustomEvent: window.CustomEvent, MutationObserver: window.MutationObserver, ResizeObserver: observer });
  function load(file) { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }); }
  load('js/geometry-backgrounds.js');
  class Geometry {
    constructor(width, height) { this.parameters = { width, height }; this.disposed = 0; }
    rotateX(value) { this.rotationX = value; return this; }
    dispose() { this.disposed++; }
  }
  class Material {
    constructor(options) { Object.assign(this, options); this.disposed = 0; }
    dispose() { this.disposed++; }
  }
  class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry; this.material = material; this.visible = true;
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.userData = {};
    }
  }
  class Texture {
    constructor(image) { this.image = image; this.disposed = 0; this.repeat = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } }; textures.push(this); }
    dispose() { this.disposed++; }
  }
  const THREE = { PlaneGeometry: Geometry, MeshLambertMaterial: Material, MeshStandardMaterial: Material, MeshBasicMaterial: Material, Mesh, CanvasTexture: Texture, RepeatWrapping: 1000, DoubleSide: 2, LinearFilter: 1006, LinearMipmapLinearFilter: 1008, SRGBColorSpace: 'srgb', sRGBEncoding: 3001 };
  const scene = { children: [], add(mesh) { this.children.push(mesh); }, remove(mesh) { this.children = this.children.filter(child => child !== mesh); } };
  return { window, document, context, storage, draws, textures, THREE, scene, load, viewport,
    get api() { return window.GeometryBackgrounds; },
    click(selector) { const button = document.querySelector(selector); assert(button, `Missing ${selector}`); button.click(); }
  };
}

test('background choices persist independently for 3D, 2D, solid nets and unit cubes', () => {
  const q = fixture();
  const selections = { builder3d: 'isometric', builder2d: 'ruled', nets: 'square', cubes: 'dots' };
  for (const [workspace, type] of Object.entries(selections)) q.api.set(workspace, type);
  for (const [workspace, type] of Object.entries(selections)) assert.equal(q.api.get(workspace), type);
  const reloaded = fixture({ storage: q.storage });
  for (const [workspace, type] of Object.entries(selections)) assert.equal(reloaded.api.get(workspace), type);
});

test('storage denial never blocks live changes or newly registered renderers', () => {
  const q = fixture({ blocked: true }), changes = [];
  q.api.register('cubes', type => changes.push(type), 'dots');
  q.api.set('cubes', 'isometric'); q.api.set('cubes', 'plain');
  assert.deepEqual(changes, ['dots', 'isometric', 'plain']);
  assert.equal(q.api.get('cubes'), 'plain');
});

test('registered renderers receive the saved surface immediately and stay isolated from other workspaces', () => {
  const q = fixture(), builder = [], nets = [];
  q.api.set('builder3d', 'isometric');
  q.api.register('builder3d', value => builder.push(value), 'square');
  q.api.register('nets', value => nets.push(value), 'plain');
  q.api.set('nets', 'ruled'); q.api.set('builder3d', 'dots');
  assert.deepEqual(builder, ['isometric', 'dots']); assert.deepEqual(nets, ['plain', 'ruled']);
});

test('invalid stored values and unsupported choices never become a renderer surface', () => {
  const q = fixture(); q.api.set('nets', 'square');
  const key = [...q.storage.keys()][0]; assert(key);
  q.storage.set(key, 'not a valid background preference');
  const reloaded = fixture({ storage: q.storage });
  assert(kinds.includes(reloaded.api.get('nets', 'plain')));
  const changes = []; reloaded.api.register('nets', value => changes.push(value), 'plain');
  reloaded.api.set('nets', '<script>invalid</script>');
  assert(changes.every(type => kinds.includes(type)));
});

test('all five ground styles reuse the same physical plane and plain removes its texture', () => {
  const q = fixture(), ground = q.api.createGround(q.THREE, q.scene, { size: 1000, step: 25, y: -0.5, color: 0xffffff });
  assert.equal(ground.objects.length, 1); const mesh = ground.objects[0];
  assert(q.scene.children.includes(mesh)); assert.equal(mesh.geometry.parameters.width, 1000); assert.equal(mesh.geometry.parameters.height, 1000);
  assert.equal(mesh.position.y, -0.5);
  const geometry = mesh.geometry, material = mesh.material;
  for (const type of kinds) {
    ground.set(type);
    assert.equal(ground.objects[0], mesh); assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material); assert.equal(q.scene.children.length, 1);
    assert.equal(mesh.position.y, -0.5);
    if (type === 'plain') assert.equal(material.map, null);
    else {
      assert(material.map?.image); assert(Number.isFinite(material.map.repeat.x) && material.map.repeat.x > 1); assert(Number.isFinite(material.map.repeat.y) && material.map.repeat.y > 1);
    }
  }
  assert(q.draws.some(call => call.command === 'stroke'), 'Grid styles must contain actual guide lines');
  assert(q.draws.some(call => call.command === 'arc'), 'Dotted paper must contain actual points');
});

test('switching ground style disposes previous textures and teardown frees the surface', () => {
  const q = fixture(), ground = q.api.createGround(q.THREE, q.scene, { size: 500, step: 25 });
  ground.set('square'); const mesh = ground.objects[0], first = mesh.material.map;
  ground.set('isometric'); assert(first.disposed > 0); const next = mesh.material.map;
  assert.notEqual(first, next);
  const count = q.textures.length; ground.set('isometric'); assert.equal(q.textures.length, count, 'Repeated selection must not allocate another texture');
  ground.set('plain'); assert(next.disposed > 0); assert.equal(mesh.material.map, null);
  ground.set('dots'); const last = mesh.material.map;
  ground.dispose(); assert(last.disposed > 0); assert(mesh.geometry.disposed > 0); assert(mesh.material.disposed > 0); assert(!q.scene.children.includes(mesh));
});

function toolboxFixture(page) {
  const q = fixture({ page });
  if (page === '3d-yapi-atolyesi.html') {
    const board = q.document.getElementById('shapeBoard');
    Object.defineProperties(board, { clientWidth: { value: 800 }, clientHeight: { value: 560 } });
    q.load('ogretmen/geometrik-ornekler.js'); q.load('ogretmen/geometrik-sekiller.js');
  }
  q.load('js/geometry-toolbox.js'); q.window.GeometryToolbox.init(); return q;
}

test('every geometry workspace exposes the same five preview choices without changing models', () => {
  for (const [page, workspace] of [['3d-yapi-atolyesi.html', 'builder3d'], ['birim-kup-uygulamasi.html', 'cubes'], ['geometrik-cisimler-acilimlar.html', 'nets']]) {
    const q = toolboxFixture(page), choices = [...q.document.querySelectorAll('.geometry-ground-button[data-background]')];
    assert.equal(choices.length, kinds.length, page);
    assert.deepEqual(choices.map(button => button.dataset.background).sort(), [...kinds].sort());
    for (const button of choices) {
      assert(button.getAttribute('aria-label') || button.textContent.trim(), 'Each preview needs an accessible name');
      button.click(); assert.equal(q.api.get(workspace), button.dataset.background);
      assert.equal(choices.filter(choice => choice.getAttribute('aria-pressed') === 'true').length, 1);
    }
  }
});

test('2D and 3D mode switching restores each surface and keeps editable example pieces', () => {
  const q = toolboxFixture('3d-yapi-atolyesi.html');
  q.click('.geometry-ground-button[data-background="isometric"]'); assert.equal(q.api.get('builder3d'), 'isometric');
  q.click('#mode2d'); q.click('[data-example="cat"]');
  const pieces = [...q.document.querySelectorAll('.geo-piece')]; assert(pieces.length > 4);
  q.click('.geometry-ground-button[data-background="dots"]'); assert.equal(q.api.get('builder2d'), 'dots');
  const board = q.document.querySelector('#shapeBoard'); assert.equal(board.dataset.background, 'dots');
  q.click('#mode3d'); assert.equal(q.api.get('builder3d'), 'isometric');
  assert.equal(q.document.querySelector('.geometry-ground-button[aria-pressed="true"]').dataset.background, 'isometric');
  q.click('#mode2d'); assert.equal(q.api.get('builder2d'), 'dots'); assert.equal(board.dataset.background, 'dots');
  assert.deepEqual([...q.document.querySelectorAll('.geo-piece')], pieces);
});


test('isometric guide lines retain their native 30 degree slope on a square world plane', () => {
  const q = fixture(), ground = q.api.createGround(q.THREE, q.scene, { size: 1000, step: 50 });
  ground.set('isometric');
  const map = ground.objects[0].material.map;
  const physicalTileWidth = 1000 / map.repeat.x, physicalTileHeight = 1000 / map.repeat.y;
  const angle = Math.atan2(physicalTileHeight, physicalTileWidth) * 180 / Math.PI;
  assert(Math.abs(angle - 30) < .1, `Isometric slope is ${angle} degrees`);
});

test('an unsubscribed renderer is no longer notified when its surface changes', () => {
  const q = fixture(), changes = [];
  const unsubscribe = q.api.register('nets', value => changes.push(value), 'plain');
  q.api.set('nets', 'square'); unsubscribe(); q.api.set('nets', 'dots');
  assert.deepEqual(changes, ['plain', 'square']);
  assert.equal(q.api.get('nets'), 'dots');
});
