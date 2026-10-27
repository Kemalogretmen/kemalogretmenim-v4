const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync('js/dokuman-paper-turn.js','utf8'), context);
const {geometry} = context.KemalPaperTurn;
const area = points => Math.abs(points.reduce((sum,p,i) => {const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
const transform = (matrix,p) => ({x:matrix[0]*p.x+matrix[2]*p.y+matrix[4],y:matrix[1]*p.x+matrix[3]*p.y+matrix[5]});

test('folds conserve the whole sheet and reflect the grabbed corner onto the pointer',()=>{
  for(const corner of ['top','bottom']) for(let step=0;step<=40;step++) {
    const w=600,h=840,t=step/40;
    const fold=geometry(w,h,{x:w*(1-2*t),y:(corner==='top'?0:h)+(corner==='top'?1:-1)*Math.sin(t*Math.PI)*120},corner);
    assert.ok(Math.abs(area(fold.fixed)+area(fold.folded)-w*h)<.001);
    const mapped=transform(fold.reflection,{x:w,y:corner==='top'?0:h});
    assert.ok(Math.hypot(mapped.x-fold.pointer.x,mapped.y-fold.pointer.y)<.001);
    assert.ok(Math.abs(fold.reflection[0]*fold.reflection[3]-fold.reflection[1]*fold.reflection[2]+1)<.001);
    for(const polygon of [fold.fixed,fold.folded]) for(const p of polygon) assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  }
});

test('a partial corner fold has a diagonal crease rather than a rigid whole-page rotation',()=>{
  const fold=geometry(600,840,{x:340,y:690},'bottom');
  assert.ok(fold.fixed.length>=3 && fold.folded.length>=3);
  assert.ok(fold.normal.x>0 && fold.normal.y>0);
  assert.ok(area(fold.fixed)>0 && area(fold.folded)>0);
});

test('rest and completion have no missing paper; the back texture can remain upright',()=>{
  const initial=geometry(600,840,{x:600,y:840},'bottom');
  assert.equal(area(initial.fixed),600*840);assert.equal(initial.folded.length,0);
  const end=geometry(600,840,{x:-600,y:840},'bottom');
  assert.equal(area(end.folded),600*840);assert.equal(area(end.fixed),0);
  // A back texture is horizontally reversed before reflection, keeping its text upright.
  const left=transform(end.reflection,{x:600-40,y:50}),right=transform(end.reflection,{x:600-140,y:50});
  assert.ok(right.x>left.x);
});

test('out-of-range pointers and degenerate sizes always produce bounded finite geometry',()=>{
  for(const pointer of [{x:1e9,y:-1e9},{x:-1e9,y:1e9},{x:NaN,y:Infinity},null]) {
    const fold=geometry(0,-1,pointer,'top');
    assert.ok(fold.progress>=0&&fold.progress<=1);
    assert.ok(fold.reflection.every(Number.isFinite));
    assert.ok(Math.hypot(fold.pointer.x,fold.pointer.y)<=fold.width+.001);
  }
});

test('the renderer schedules no idle loop and cancels animation callbacks on stop',()=>{
  const callbacks=new Map();let sequence=0;
  const window={devicePixelRatio:1,requestAnimationFrame:callback=>{callbacks.set(++sequence,callback);return sequence;},cancelAnimationFrame:id=>callbacks.delete(id)};
  vm.runInNewContext(fs.readFileSync('js/dokuman-paper-turn.js','utf8'),{window});
  const canvas={style:{},getContext:()=>({})};
  const engine=new window.KemalPaperTurn.PaperTurn(canvas,{width:600,height:840});
  engine.render=()=>{};
  assert.equal(callbacks.size,0);
  let completed=false;engine.animate(true,780,()=>{completed=true;});
  assert.equal(callbacks.size,1);engine.stop();
  assert.equal(callbacks.size,0);assert.equal(completed,false);assert.equal(engine.frame,null);
});
