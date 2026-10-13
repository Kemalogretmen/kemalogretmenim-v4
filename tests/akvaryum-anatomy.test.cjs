const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../js/akvaryum-anatomy.js'),M=require('../js/akvaryum-motion.js');
test('portable poses remain bounded and completely still at rest for every supported species',()=>{
  for(const id of A.species) {
    assert.deepEqual(A.pose(id,0,false),A.pose(id,500,false));
    for(let t=0;t<100;t+=.37) {
      const p=A.pose(id,t,true);assert.ok(p.bodyX>.9&&p.bodyX<1.1&&p.bodyY>.9&&p.bodyY<1.1);
      assert.ok(p.joints.every(n=>Number.isFinite(n)&&Math.abs(n)<=10));
    }
  }
});
test('a natural jellyfish rises with its bell, drifts down and remains inside the aquarium without fish-like yaw',()=>{
  const item={id:'jelly',species:'jellyfish',size:120},f={...M.layout([item],500,400).get(item.id),...item,anatomicalMotion:true,direction:1,phase:0,cruise:1,mood:{speed:.65},angle:0};
  f.y=300;const initial=f.y;
  for(let i=0;i<400;i++)M.step([f],.025,500,400,()=>.5);
  assert.ok(f.y<initial-20);assert.equal(f.angle,0);assert.equal(f.turn,null);
  let rose=false,fell=false,last=f.y;
  for(let i=0;i<16000;i++) {M.step([f],.025,500,400,()=>.5);rose ||= f.y<last;fell ||= f.y>last;last=f.y;assert.ok(f.y>=f.minY&&f.y<=f.maxY&&f.x>=0&&f.x<=500-f.size);}
  assert.ok(rose&&fell);
  f.held=true;const position=[f.x,f.y,f.phase];M.step([f],.05,500,400);assert.deepEqual([f.x,f.y,f.phase],position);
  f.held=false;f.bottomRest=true;f.restX=f.x;f.restY=f.y;M.step([f],.05,500,400);assert.deepEqual([f.x,f.y,f.phase],position);
});
test('natural jellyfish explore broad horizontal routes, reverse smoothly and keep renewing routes in long sessions',()=>{
  for(const [width,height] of [[350,320],[1240,600],[1920,900]]) {
    const item={id:'traveller',species:'jellyfish',size:120},f={...M.layout([item],width,height).get(item.id),...item,anatomicalMotion:true,direction:1,phase:0,cruise:1,mood:{speed:.65},angle:0};
    let min=f.x,max=f.x,last=f.x,left=false,right=false,seed=284;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<36000;i++) {
      M.step([f],.05,width,height,random);const dx=f.x-last;
      left ||= dx<-.01;right ||= dx>.01;min=Math.min(min,f.x);max=Math.max(max,f.x);
      assert.ok(Math.abs(dx)<.61,'no abrupt horizontal jumps');
      assert.ok(Number.isFinite(f.x+f.y+f.phase) && f.x>=0&&f.x<=width-f.size && f.y>=f.minY&&f.y<=f.maxY);
      assert.equal(f.angle,0);last=f.x;
    }
    assert.ok(left&&right);assert.ok(max-min>(width-f.size)*.45,'must travel beyond a small stationary column');
  }
});
