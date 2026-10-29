const test = require('node:test');
const assert = require('node:assert/strict');
const geometry = require('../ogretmen/curved-net-geometry.js');
const near = (actual, expected, tolerance = 1e-8) => assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rotateCapPoint = (pose, x, z) => ({ x: pose.x + x, y: pose.y - z * Math.sin(pose.rotationX), z: pose.z + z * Math.cos(pose.rotationX) });

// Test physical invariants through the whole animation, not just its final frame.
test('cylinder starts as a full-size rectangle tangent to two congruent circular caps', () => {
  const { radius: r, height: h } = geometry.cylinder;
  const left = geometry.cylinderSide(0, 0, 0), right = geometry.cylinderSide(1, 0, 0);
  near(distance(left, right), 2 * Math.PI * r);
  near(distance(geometry.cylinderSide(.5, 0, 0), geometry.cylinderSide(.5, 1, 0)), h);
  for (const top of [false, true]) {
    const pose = geometry.cylinderCap(top, 0), side = geometry.cylinderSide(.5, top ? 1 : 0, 0);
    near(distance(pose, side), r); near(pose.y, 0); near(pose.rotationX, 0);
  }
});

test('cylinder side preserves height, circumference and orthogonal sheet directions throughout folding', () => {
  const { radius: r, height: h } = geometry.cylinder;
  for (let frame = 0; frame <= 100; frame++) {
    const t = frame / 100;
    for (const u of [0, .1, .25, .5, .75, .9, 1]) near(distance(geometry.cylinderSide(u, 0, t), geometry.cylinderSide(u, 1, t)), h);
    let perimeter = 0, previous = geometry.cylinderSide(0, .5, t);
    for (let i = 1; i <= 4096; i++) {
      const next = geometry.cylinderSide(i / 4096, .5, t); perimeter += distance(previous, next); previous = next;
    }
    near(perimeter, 2 * Math.PI * r, .00004);
    const p = geometry.cylinderSide(.35, .35, t), du = geometry.cylinderSide(.350001, .35, t), dv = geometry.cylinderSide(.35, .350001, t);
    near((du.x - p.x) * (dv.x - p.x) + (du.y - p.y) * (dv.y - p.y) + (du.z - p.z) * (dv.z - p.z), 0, 1e-13);
  }
});

test('cylinder cap hinges remain attached and rigid, including the upper disk closing through 180 degrees', () => {
  const { radius: r } = geometry.cylinder;
  for (let frame = 0; frame <= 100; frame++) {
    const t = frame / 100;
    for (const top of [false, true]) {
      const pose = geometry.cylinderCap(top, t), hinge = rotateCapPoint(pose, 0, top ? -r : r), side = geometry.cylinderSide(.5, top ? 1 : 0, t);
      near(distance(hinge, side), 0);
      near(distance(rotateCapPoint(pose, -r, 0), rotateCapPoint(pose, r, 0)), 2 * r);
      near(distance(rotateCapPoint(pose, 0, -r), rotateCapPoint(pose, 0, r)), 2 * r);
    }
  }
  const upper = geometry.cylinderCap(true, 1); near(upper.rotationX, -Math.PI); near(upper.y, geometry.cylinder.height); near(upper.z, 0);
});

test('closed cylinder seam and both rims meet the same circular caps without offsets', () => {
  const { radius: r, height: h } = geometry.cylinder;
  for (let i = 0; i <= 100; i++) {
    const u = i / 100;
    for (const v of [0, .25, .5, 1]) { const p = geometry.cylinderSide(u, v, 1); near(Math.hypot(p.x, p.z), r); near(p.y, v * h); }
    near(distance(geometry.cylinderSide(0, u, 1), geometry.cylinderSide(1, u, 1)), 0);
  }
});

test('sphere begins with planar pointed gores and closes exactly onto one sphere', () => {
  const { radius: r, strips } = geometry.sphere;
  for (let strip = 0; strip < strips; strip++) {
    for (let vi = 0; vi <= 40; vi++) for (const u of [0, .25, .5, .75, 1]) {
      const v = vi / 40, flat = geometry.spherePoint(strip, u, v, 0), closed = geometry.spherePoint(strip, u, v, 1);
      near(flat.y, 0); near(Math.hypot(closed.x, closed.y, closed.z), r);
    }
    for (const pole of [0, 1]) near(distance(geometry.spherePoint(strip, 0, pole, 0), geometry.spherePoint(strip, 1, pole, 0)), 0);
  }
});

test('all twelve sphere gores share exact meridional seams and pole vertices when closed', () => {
  const { strips } = geometry.sphere;
  for (let strip = 0; strip < strips; strip++) for (let vi = 0; vi <= 100; vi++) {
    const v = vi / 100;
    near(distance(geometry.spherePoint(strip, 1, v, 1), geometry.spherePoint((strip + 1) % strips, 0, v, 1)), 0);
  }
});

test('bending sphere centre meridians preserve their arc length instead of collapsing through straight-line morphs', () => {
  const { radius: r, strips } = geometry.sphere;
  for (const t of [0, .1, .2, .4, .6, .8, 1]) for (let strip = 0; strip < strips; strip++) {
    let length = 0, previous = geometry.spherePoint(strip, .5, 0, t);
    for (let i = 1; i <= 2048; i++) {
      const next = geometry.spherePoint(strip, .5, i / 2048, t); length += distance(previous, next); previous = next;
    }
    near(length, Math.PI * r, .00003);
  }
});

test('curved geometry is finite and continuous at flat and staged transition boundaries', () => {
  for (const mapper of [t => geometry.cylinderSide(.1, .8, t), t => geometry.spherePoint(3, .25, .8, t)]) {
    for (const boundary of [0, .2, .24, .36, .78, .82, 1]) {
      const before = mapper(Math.max(0, boundary - 1e-7)), after = mapper(Math.min(1, boundary + 1e-7));
      assert(Object.values(before).every(Number.isFinite)); assert(Object.values(after).every(Number.isFinite)); assert(distance(before, after) < .001);
    }
  }
});

test('automatic folding runs at the same speed on 60 Hz and 120 Hz displays', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '../ogretmen/geometrik-cisimler-acilimlar.html'), 'utf8');
  assert(html.indexOf('let lastFoldFrame = null;') < html.indexOf('        animate();'), 'Animation clock must be initialized before startup renders the first frame');
  const animation = 'let lastFoldFrame = null;\n' + html.slice(html.indexOf('        function animate(now)'), html.indexOf('    </script>', html.indexOf('        function animate(now)')));
  function simulate(hz) {
    const context = vm.createContext({
      requestAnimationFrame() {}, controls: { enabled: false }, tumbleGroup: null,
      isAutoFolding: true, foldProgress: 0, foldDirection: 1,
      slider: {}, percentLabel: {}, updateFold() {}, keepModelAboveGround() {},
      renderer: { render() {} }, scene: {}, camera: {}
    });
    vm.runInContext(animation, context);
    for (let frame = 0; frame <= hz; frame++) context.animate(frame * 1000 / hz);
    return context.foldProgress;
  }
  near(simulate(60), .48); near(simulate(120), .48);
});
