const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');

const html = fs.readFileSync(path.join(__dirname, '../sinav_sitesi/sinav.html'), 'utf8');
const code = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
  .replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm, '')
  .replace(/\binit\(\);\s*$/, '');

// Use the actual exam functions with simulated layout; browser checks cover real layout and pixels.
function harness() {
  const {window, document} = parseHTML(html);
  const canvas = document.getElementById('drawCanvas');
  const workspace = document.getElementById('stageWorkspace');
  const layer = document.getElementById('questionTransformLayer');
  const stage = document.getElementById('mediaStage');
  let width = 1000, height = 600, api;
  const rect = (left, top, width, height) => ({left, top, width, height, right:left+width, bottom:top+height});
  Object.defineProperties(workspace, {clientWidth:{get:()=>width}, clientHeight:{get:()=>height}});
  canvas.getBoundingClientRect = () => rect(20, 30, width, height);
  layer.getBoundingClientRect = () => {
    const scale = api.P.questionZoom / 100;
    return rect(20 + width*(1-scale)/2 + api.P.questionPanX,
      30 + height*(1-scale)/2 + api.P.questionPanY, width*scale, height*scale);
  };
  stage.setPointerCapture = () => {};
  const pixels = [];
  let transform = [1,0,0,1,0,0];
  const ctx = {
    setTransform(...args) {transform=args;}, clearRect() {pixels.length=0;},
    save() {}, restore() {}, beginPath() {}, fill() {}, stroke() {},
    arc(x,y) {this.record(x,y);}, moveTo(x,y) {this.record(x,y);}, lineTo(x,y) {this.record(x,y);},
    record(x,y) {pixels.push({x:x*transform[0]+transform[4], y:y*transform[3]+transform[5], operation:this.globalCompositeOperation});}
  };
  canvas.getContext = () => ctx;
  window.devicePixelRatio = 2;
  window.KemalExamResultStore = {configure(){}};
  const sandbox = {window, document, console, db:{}, addDoc(){}, collection(){}, serverTimestamp(){}, localStorage:{getItem:()=>null,setItem(){}}, requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.api={P,getCanvasPoint,getQuestionDrawing,beginStageGesture,moveStageGesture,finishStageGesture,syncDrawingSurface,redrawDrawingCanvas};', sandbox);
  api = sandbox.api;
  api.P.questions = [{id:'q1'}, {id:'q2'}];
  const event = (x,y,id=1) => ({clientX:20+x,clientY:30+y,pointerId:id,button:0,preventDefault(){}});
  const draw = (x,y,id=1) => {
    api.beginStageGesture(event(x,y,id));
    api.moveStageGesture(event(x+10,y+10,id));
    api.finishStageGesture(event(x+10,y+10,id));
  };
  api.syncDrawingSurface();
  return {api,canvas,pixels,event,draw,resize(w,h){width=w;height=h;api.syncDrawingSurface();}};
}

test('zoomed-out workspace accepts and renders ink in all four margins', () => {
  const h = harness();
  h.api.P.questionZoom = 80;
  for (const [x,y] of [[5,5],[980,5],[5,580],[980,580]]) {
    h.draw(x,y);
    const pixel = h.pixels.at(-2);
    assert.ok(Math.abs(pixel.x-x*2)<0.001);
    assert.ok(Math.abs(pixel.y-y*2)<0.001);
  }
  const strokes = h.api.getQuestionDrawing().strokes;
  assert.equal(strokes.length,4);
  assert.ok(strokes[0].points[0].x<0 && strokes[0].points[0].y<0);
  assert.ok(strokes[3].points[0].x>1 && strokes[3].points[0].y>1);
  assert.equal(h.api.getCanvasPoint(h.event(-1,30)),null);
});

test('ink stays attached to the question through zoom, pan, resize and question changes', () => {
  const h = harness();
  h.draw(250,150);
  h.api.P.questionZoom = 220;
  h.api.P.questionPanX = 80;
  h.api.P.questionPanY = 50;
  h.api.redrawDrawingCanvas();
  assert.ok(Math.abs(h.pixels[0].x-60)<0.001);
  assert.ok(Math.abs(h.pixels[0].y-40)<0.001);
  h.api.P.questionZoom = 100;
  h.api.P.questionPanX = h.api.P.questionPanY = 0;
  h.resize(500,300);
  assert.equal(h.canvas.width,1000);
  assert.equal(h.canvas.height,600);
  assert.equal(h.pixels[0].x,250);
  assert.equal(h.pixels[0].y,150);
  h.api.P.curQ = 1;
  h.api.redrawDrawingCanvas();
  assert.equal(h.pixels.length,0);
  h.api.P.curQ = 0;
  h.api.redrawDrawingCanvas();
  assert.equal(h.pixels[0].x,250);
});

test('eraser uses the same full workspace coordinates after zooming out', () => {
  const h = harness();
  h.api.P.questionZoom = 80;
  h.draw(5,580);
  h.api.P.drawingTool = 'eraser';
  h.draw(5,580);
  const ink = h.pixels[0], erased = h.pixels[2];
  assert.equal(erased.x,ink.x);
  assert.equal(erased.y,ink.y);
  assert.equal(erased.operation,'destination-out');
});

test('an extra touch cannot replace an active pen stroke', () => {
  const h = harness();
  h.api.beginStageGesture(h.event(200,200,1));
  h.api.beginStageGesture(h.event(700,400,2));
  h.api.moveStageGesture(h.event(710,410,2));
  h.api.finishStageGesture(h.event(710,410,2));
  assert.equal(h.api.P.stageGesture.pointerId,1);
  assert.equal(h.api.getQuestionDrawing().strokes.length,1);
  h.api.moveStageGesture(h.event(250,250,1));
  h.api.finishStageGesture(h.event(250,250,1));
  assert.equal(h.api.getQuestionDrawing().strokes[0].points.length,2);
  assert.equal(h.api.P.stageGesture,null);
});
