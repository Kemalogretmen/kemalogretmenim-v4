const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const G = require('../js/reflection-geometry.js');
const close = (a, b, tolerance = 1e-8) => assert(Math.abs(a-b) <= tolerance, `${a} differs from ${b}`);
const pointClose = (a,b,tolerance) => { close(a.x,b.x,tolerance); close(a.y,b.y,tolerance); };
const finitePoint = p => assert(Number.isFinite(p.x) && Number.isFinite(p.y));
const board = { x:0, y:0, width:1000, height:720 };

// Numerical assertions model the visible mathematical guarantees, including
// arbitrary diagonal/translated mirrors, rather than reproducing the formulas.
test('labelled P/R/S/T classroom points reflect across the movable vertical line without changing height', () => {
  const axis = { x:500, y:360, angle:90 };
  const examples = [
    [{ x:350,y:180 },{ x:650,y:180 }],
    [{ x:300,y:270 },{ x:700,y:270 }],
    [{ x:450,y:360 },{ x:550,y:360 }],
    [{ x:250,y:450 },{ x:750,y:450 }]
  ];
  for(const [original, expected] of examples) pointClose(G.reflectPoint(original,axis), expected);
  pointClose(G.reflectPoint({x:123,y:140},{x:200,y:300,angle:0}),{x:123,y:460});
});

test('positive 45 degrees rises right and negative 45 degrees falls right in screen coordinates', () => {
  const center = {x:500,y:360};
  pointClose(G.reflectPoint({x:600,y:360},{...center,angle:45}),{x:500,y:260});
  pointClose(G.reflectPoint({x:600,y:360},{...center,angle:-45}),{x:500,y:460});
  pointClose(G.reflectPoint({x:660,y:200},{...center,angle:45}),{x:660,y:200});
  pointClose(G.reflectPoint({x:660,y:520},{...center,angle:-45}),{x:660,y:520});
});

test('free-angle reflection is an involution and leaves all points on its axis fixed', () => {
  for (const angle of [-179.9,-135,-72.25,-45,-.00001,0,13.5,45,89.999,90,143.2,360000045]) {
    const axis = {x:357.25,y:291.75,angle}, a = G.normalizeAxis(axis);
    for (const t of [-900,-10,0,27,800]) {
      const fixed = {x:a.x+t*a.dx,y:a.y+t*a.dy}; pointClose(G.reflectPoint(fixed,axis),fixed);
    }
    for (const p of [{x:0,y:0},{x:1000,y:720},{x:241.5,y:179.25},{x:-50,y:880}]) {
      pointClose(G.reflectPoint(G.reflectPoint(p,axis),axis),p);
    }
  }
});

test('each reflected pair has equal perpendicular distance, a midpoint on the axis and a perpendicular joining segment', () => {
  for (let i=0;i<100;i++) {
    const axis = {x:100+(i*47)%700,y:80+(i*31)%530,angle:-89+i*1.81};
    const p = {x:30+(i*83)%950,y:20+(i*53)%680}, reflected = G.reflectPoint(p,axis), projected = G.projectPoint(p,axis), a = G.normalizeAxis(axis);
    close(G.signedDistance(p,axis),-G.signedDistance(reflected,axis));
    close(G.signedDistance(projected,axis),0);
    pointClose({x:(p.x+reflected.x)/2,y:(p.y+reflected.y)/2},projected);
    close(G.distance(p,projected),G.distance(reflected,projected));
    close(G.distance(p,reflected),2*Math.abs(G.signedDistance(p,axis)));
    close((reflected.x-p.x)*a.dx+(reflected.y-p.y)*a.dy,0);
  }
});

test('reflection preserves polygon shape and distances but reverses its orientation', () => {
  const polygon = [{x:230,y:180},{x:370,y:220},{x:325,y:350},{x:190,y:290}], before = JSON.stringify(polygon);
  for (const angle of [0,23,45,90,112,179]) {
    const reflected = G.reflectPoints(polygon,{x:500,y:360,angle});
    for (let i=0;i<polygon.length;i++) for(let j=0;j<polygon.length;j++) close(G.distance(polygon[i],polygon[j]),G.distance(reflected[i],reflected[j]));
    close(G.signedArea(reflected),-G.signedArea(polygon));
  }
  assert.equal(JSON.stringify(polygon),before,'Rendering a reflected copy must not mutate the original model');
});

test('SVG reflection matrices agree with point reflection and reverse glyph handedness', () => {
  for (const angle of [-75,-45,0,33.33,45,90,177]) {
    const axis = {x:401.5,y:287.25,angle}, m = G.reflectionMatrix(axis);
    close(m.a*m.d-m.b*m.c,-1);
    close(m.a*m.a+m.b*m.b,1); close(m.c*m.c+m.d*m.d,1); close(m.a*m.c+m.b*m.d,0);
    for (const p of [{x:10,y:20},{x:600,y:30},{x:0,y:720}]) pointClose(G.applyMatrix(p,m),G.reflectPoint(p,axis));
    const composed = G.composeMatrices(m,m);
    for (const p of [{x:80,y:270},{x:999,y:719}]) pointClose(G.applyMatrix(p,composed),p);
    assert.match(G.matrixString(m),/^matrix\((?:-?\d[^ ]* ){5}-?\d[^ ]*\)$/);
  }
});

test('two perpendicular mirrors compose into a half-turn about their intersection', () => {
  const vertical = G.reflectionMatrix({x:500,y:360,angle:90}), horizontal = G.reflectionMatrix({x:500,y:360,angle:0});
  const composed = G.composeMatrices(horizontal,vertical);
  pointClose(G.applyMatrix({x:260,y:210},composed),{x:740,y:510});
  close(composed.a*composed.d-composed.b*composed.c,1);
});

test('clipping a mirror line yields exact visible endpoints on square-grid and dotted classroom boards', () => {
  const cases = [
    [{x:500,y:360,angle:90},[{x:500,y:720},{x:500,y:0}]],
    [{x:500,y:360,angle:0},[{x:0,y:360},{x:1000,y:360}]],
    [{x:500,y:360,angle:45},[{x:140,y:720},{x:860,y:0}]],
    [{x:500,y:360,angle:-45},[{x:140,y:0},{x:860,y:720}]]
  ];
  for (const [axis, expected] of cases) {
    const ends = G.axisLineEndpoints(axis,board); assert.equal(ends.length,2);
    pointClose(ends[0],expected[0]); pointClose(ends[1],expected[1]);
    for (const p of ends) close(G.signedDistance(p,axis),0);
  }
  const shifted = G.axisLineEndpoints({x:300,y:300,angle:0},{left:100,top:50,right:900,bottom:650});
  pointClose(shifted[0],{x:100,y:300}); pointClose(shifted[1],{x:900,y:300});
});

test('off-board, parallel and corner-touching mirrors clip without NaN or fabricated diagonal segments', () => {
  assert.equal(G.axisLineEndpoints({x:1200,y:0,angle:90},board),null);
  assert.equal(G.axisLineEndpoints({x:0,y:-40,angle:0},board),null);
  assert.equal(G.axisLineEndpoints({x:0,y:0,angle:45},{x:0,y:0,width:0,height:720}),null);
  assert.equal(G.axisLineEndpoints({x:0,y:0,angle:45},null),null);
  const corner = G.axisLineEndpoints({x:0,y:0,angle:45},board); corner.forEach(finitePoint); pointClose(corner[0],{x:0,y:0}); pointClose(corner[1],{x:0,y:0});
  for (const angle of [0.00000001,89.99999999,180,-180]) {
    const axis={x:500,y:360,angle}, ends=G.axisLineEndpoints(axis,board); assert(ends);
    ends.forEach(p=>{finitePoint(p);assert(p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=720);});
  }
});

test('axis handles define the same infinite mirror from either endpoint and preserve the last valid line when coincident', () => {
  const a={x:170,y:590},b={x:730,y:30},axis=G.axisFromPoints(a,b),reverse=G.axisFromPoints(b,a);
  close(axis.angle,45);
  for(const p of [{x:10,y:10},{x:800,y:400}]) pointClose(G.reflectPoint(p,axis),G.reflectPoint(p,reverse));
  assert.equal(G.axisFromPoints(a,a),null); assert.equal(G.axisFromPoints(a,{x:a.x+1e-12,y:a.y+1e-12}),null);
  for(const invalid of [null,undefined,{x:NaN,y:Infinity,angle:NaN},{},{x:100,y:200,angle:Infinity}]) finitePoint(G.reflectPoint({x:20,y:40},invalid));
});

test('circles retain radius and metadata and reflected orientation follows the same angle convention', () => {
  const axis={x:500,y:360,angle:45},circle={x:650,y:360,r:35,color:'#2563eb',id:'a'},result=G.reflectCircle(circle,axis);
  pointClose(result,{x:500,y:210}); close(result.r,35); assert.equal(result.id,'a');assert.equal(result.color,circle.color);
  close(G.reflectAngle(20,axis),70);
  const center={x:120,y:80},rotated=G.rotatePoint({x:140,y:80},center,90); pointClose(rotated,{x:120,y:60});
  close(G.distance(rotated,center),20);
});

test('polygon hit tests include borders, reject outside points and work on mirrored shapes', () => {
  const square=[{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}];
  for(const p of [{x:150,y:150},{x:100,y:100},{x:150,y:100}]) assert(G.pointInPolygon(p,square));
  assert(!G.pointInPolygon({x:201,y:150},square)); assert(!G.pointInPolygon({x:150,y:150},[]));
  const axis={x:430,y:300,angle:37.2};
  for(const p of [{x:150,y:150},{x:100,y:100},{x:201,y:150}]) assert.equal(G.pointInPolygon(p,square),G.pointInPolygon(G.reflectPoint(p,axis),G.reflectPoints(square,axis)));
  close(G.distanceToSegment({x:150,y:130},{x:100,y:100},{x:200,y:100}),30);
  close(G.distanceToSegment({x:150,y:130},{x:100,y:100},{x:100,y:100}),Math.hypot(50,30));
  const b=G.bounds(square); assert.deepEqual(b,{x:100,y:100,width:100,height:100,left:100,top:100,right:200,bottom:200,cx:150,cy:150});
});

test('the same pure API loads in a browser without requiring DOM, Three.js or a module loader', () => {
  const context=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/reflection-geometry.js'),'utf8'),context);
  pointClose(context.window.ReflectionGeometry.reflectPoint({x:20,y:30},{x:50,y:0,angle:90}),{x:80,y:30});
  assert(Object.isFrozen(context.window.ReflectionGeometry));
});
