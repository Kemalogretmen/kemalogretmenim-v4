const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.join(__dirname, '..');
const cubeSource = fs.readFileSync(path.join(root, 'ogretmen/birim-kup-uygulamasi.html'), 'utf8');
const netSource = fs.readFileSync(path.join(root, 'ogretmen/geometrik-cisimler-acilimlar.html'), 'utf8');

function functionSource(source, name, nextName) {
  const begin = source.indexOf(`        function ${name}(`);
  const end = source.indexOf(`        function ${nextName}(`, begin);
  assert(begin >= 0 && end > begin, `${name} must remain available`);
  return source.slice(begin, end);
}
function serviceFixture() {
  const registrations = new Map(), selections = [], configurations = [];
  const objects = [{ visible: true, kind: 'decorative-ground' }];
  const ground = { objects, set(type) { selections.push(type); } };
  const service = {
    createGround(THREE, scene, options) { configurations.push(options); objects.forEach(object => scene.add(object)); return ground; },
    register(workspace, listener, fallback) { registrations.set(workspace, listener); listener(workspace === 'cubes' ? 'isometric' : fallback); },
    set(workspace, type) { registrations.get(workspace)(type); }
  };
  return { service, registrations, selections, configurations, ground, objects };
}

test('cube ground selection uses a separate decorative mesh and never changes the placement plane', () => {
  const { document } = parseHTML(cubeSource), q = serviceFixture(), sceneObjects = [];
  class PlaneGeometry { constructor(w, h) { this.w = w; this.h = h; } rotateX(angle) { this.angle = angle; return this; } }
  class MeshBasicMaterial { constructor(options) { Object.assign(this, options); } }
  class Mesh { constructor(geometry, material) { Object.assign(this, { geometry, material, visible: true }); } }
  const context = vm.createContext({
    window: { GeometryBackgrounds: q.service }, document,
    THREE: { PlaneGeometry, MeshBasicMaterial, Mesh },
    scene: { add(object) { sceneObjects.push(object); } }, cubes: [], backgroundObjects: [], geometryGround: null, bgState: 'dots', basePlane: null
  });
  vm.runInContext(functionSource(cubeSource, 'createBackgrounds', 'initProjections'), context);
  context.createBackgrounds();
  assert.equal(context.bgState, 'isometric', 'A restored selection is applied during initialization');
  assert.equal(document.getElementById('bg-toggle-btn').textContent.trim(), 'İzometrik');
  assert.equal(context.backgroundObjects, q.objects);
  assert.equal(context.cubes.length, 1); assert.equal(context.cubes[0], context.basePlane);
  assert.equal(context.basePlane.material.visible, false);
  assert(!q.objects.includes(context.basePlane)); assert(sceneObjects.includes(context.basePlane));
  assert.equal(q.configurations[0].size, 2000); assert.equal(q.configurations[0].step, 50);
  const plane = context.basePlane;
  for (let i = 0; i < 5; i++) context.cycleBackground();
  assert.deepEqual(q.selections, ['isometric', 'ruled', 'plain', 'dots', 'square', 'isometric']);
  assert.equal(context.cubes.length, 1); assert.equal(context.basePlane, plane);
  assert(document.getElementById('bg-toggle-btn').getAttribute('aria-label').includes('İzometrik'));
});

function projectionFixture() {
  const color = hex => ({ getHex: () => hex, setHex(value) { hex = value; } });
  const basePlane = {}, cube = { material: { color: color(0x123456), emissive: color(0x102030) } };
  const context = vm.createContext({
    rollOverMesh: { visible: true }, backgroundObjects: [{ visible: true }, { visible: false }], projectionStyle: 'empty', cubes: [basePlane, cube], basePlane
  });
  vm.runInContext(functionSource(cubeSource, 'withProjectionSceneState', 'getProjectionBlob'), context);
  return { context, cube };
}
test('projection previews and exports hide any selected ground and restore visibility and paint exactly', () => {
  const { context, cube } = projectionFixture();
  const result = context.withProjectionSceneState(() => {
    assert.equal(context.rollOverMesh.visible, false);
    assert(context.backgroundObjects.every(object => !object.visible));
    assert.equal(cube.material.color.getHex(), 0xffffff); assert.equal(cube.material.emissive.getHex(), 0xffffff);
    return 'rendered';
  });
  assert.equal(result, 'rendered'); assert.equal(context.rollOverMesh.visible, true);
  assert.deepEqual(Array.from(context.backgroundObjects, object => object.visible), [true, false]);
  assert.equal(cube.material.color.getHex(), 0x123456); assert.equal(cube.material.emissive.getHex(), 0x102030);
});
test('a failed projection render cannot leave the chosen ground or cube color hidden or changed', () => {
  const { context, cube } = projectionFixture();
  assert.throws(() => context.withProjectionSceneState(() => { throw new Error('WebGL export failed'); }), /WebGL export failed/);
  assert.equal(context.rollOverMesh.visible, true);
  assert.deepEqual(Array.from(context.backgroundObjects, object => object.visible), [true, false]);
  assert.equal(cube.material.color.getHex(), 0x123456); assert.equal(cube.material.emissive.getHex(), 0x102030);
});

test('cylinder, cone and sphere keep the user-selected ground when the net is rebuilt', () => {
  const q = serviceFixture();
  const context = vm.createContext({ window: { GeometryBackgrounds: q.service }, THREE: {}, scene: { add() {} }, geometryGround: null, floorObjects: [], currentShape: 'cylinder' });
  const start = netSource.indexOf('            geometryGround = window.GeometryBackgrounds.createGround');
  const end = netSource.indexOf('            raycaster = new THREE.Raycaster();', start);
  assert(start >= 0 && end > start);
  vm.runInContext(netSource.slice(start, end), context);
  vm.runInContext(functionSource(netSource, 'updateFloorVisibility', 'tumbleModel'), context);
  assert.equal(q.selections[0], 'plain');
  assert.equal(context.floorObjects, q.objects);
  assert.equal(q.configurations[0].y, -0.6, 'Existing ground clearance is preserved');
  for (const type of ['square', 'isometric', 'dots', 'ruled', 'plain']) {
    q.service.set('nets', type);
    for (const shape of ['cylinder', 'cone', 'sphere', 'cube']) {
      context.currentShape = shape;
      context.updateFloorVisibility();
      assert(q.objects.every(object => object.visible), `${shape} must not override ${type}`);
    }
  }
  assert.deepEqual(q.selections, ['plain', 'square', 'isometric', 'dots', 'ruled', 'plain']);
});
