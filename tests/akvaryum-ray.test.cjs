const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../js/akvaryum-ray.js');
test('ray wing strips meet continuously, stay ordered and join a completely fixed body at maximum reward',()=>{
 for(const lite of [false,true])for(const width of [64,164,328,640])for(let t=0;t<20;t+=.15){
  const p=R.plan(width,width/1.5,640,360,t,true,1.5,lite),baseline=R.plan(width,width/1.5,640,360,0,false);
  assert.deepEqual(p.body,baseline.body,'head, body and tail source and output coordinates must never change');
  let sourceEnd=0,targetEnd=p.strips[0].target[1];
  for(const strip of p.strips){
   assert.ok([...strip.source,...strip.target].every(Number.isFinite));
   assert.ok(Math.abs(strip.source[1]-sourceEnd)<1e-8);assert.ok(Math.abs(strip.target[1]-targetEnd)<1e-8);
   assert.ok(strip.source[3]>0&&strip.target[3]>0&&strip.target[2]>0);
   sourceEnd=strip.source[1]+strip.source[3];targetEnd=strip.target[1]+strip.target[3];
  }
  assert.ok(Math.abs(sourceEnd-p.body.source[1])<1e-8);assert.ok(Math.abs(targetEnd-p.body.target[1])<1e-8);
  assert.ok(p.strips.length<45&&p.fold>=0&&p.fold<.28);
 }
});
test('the wing stroke is visible over a cycle and cannot alter the uncut body at rest',()=>{
 const frames=Array.from({length:120},(_,i)=>R.plan(328,328/1.5,640,360,i/20,true));
 assert.ok(Math.max(...frames.map(f=>f.strips[0].target[1]))-Math.min(...frames.map(f=>f.strips[0].target[1]))>18);
 assert.deepEqual(R.plan(328,220,640,360,10,false),R.plan(328,220,640,360,30,false,1.5));
 assert.equal(R.plan(0,220,640,360,0,true),null);
});
test('render draws the body as one untouched rectangle and has safe missing-image and canvas fallbacks',()=>{
 const calls=[],ctx={clearRect(){},drawImage(...args){calls.push(args);}},canvas={getContext:()=>ctx};
 const image={complete:true,naturalWidth:640,naturalHeight:360};
 assert.equal(R.render(canvas,image,1,{moving:true,boost:1.5,lite:true,width:328}),true);
 assert.equal(calls.length,25);assert.deepEqual(calls[0].slice(1,5),[0,180,640,180]);assert.ok(canvas.width<=256);
 calls.length=0;assert.equal(R.render(canvas,image,10,{moving:false}),true);assert.equal(calls.length,2);
 assert.equal(R.render({}, {...image,complete:false},1),false);
 assert.equal(R.render({getContext:()=>null},image,1),false);
 assert.equal(R.render({getContext(){throw Error('unsupported');}},image,1),false);
});
