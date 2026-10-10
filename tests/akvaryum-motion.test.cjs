const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../js/akvaryum-motion.js');
const C=require('../js/akvaryum-core.js');
function animals(count,w,h) {
 const items=Array.from({length:count},(_,i)=>({id:String(i),species:C.SPECIES[i%C.SPECIES.length].id,size:C.SPECIES[i%C.SPECIES.length].size}));
 return [...M.layout(items,w,h).values()].map((p,i)=>({...p,direction:i%2?-1:1,angle:i%2?180:0,phase:i,cruise:1,mood:{speed:1}}));
}
function advance(fish,n,w=1000,h=600){for(let i=0;i<n;i++)M.step(fish,.05,w,h);}
test('1–60 animals stay finite and inside narrow and wide aquarium bounds over a simulated minute',()=>{
 for(const [w,h] of [[350,320],[350,1350],[1240,400],[1920,900]]) for(const n of [1,12,30,60]) {
  const fish=animals(n,w,h);assert.equal(fish.length,n);
  for(let frame=0;frame<1200;frame++) {
   M.step(fish,.05,w,h);
   for(const f of fish){assert.ok(Number.isFinite(f.x+f.y+f.angle));assert.ok(f.x>=0&&f.x+f.size<=w+.001);assert.ok(f.y>=0&&f.y+f.size*.67+30<=h+.001);}
  }
 }
});
test('hover eases to rest; selection stops immediately and releasing resumes',()=>{
 const [f]=animals(1,1000,600);f.hover=true;const x=f.x;advance([f],20);
 assert.ok(f.x>x&&f.x-x<5);const still=[f.x,f.y,f.angle];advance([f],20);assert.deepEqual([f.x,f.y,f.angle],still);
 f.hover=false;f.held=true;advance([f],20);assert.deepEqual([f.x,f.y,f.angle],still);
 f.held=false;advance([f],20);assert.ok(f.x>x+5);
});
test('seahorses and jellyfish drift slowly; bottom animals stay in the lower region',()=>{
 const [normal]=animals(1,1000,600),horse={...normal,profile:M.profile('seahorse')},jelly={...normal,profile:M.profile('jellyfish')};
 const x=normal.x;advance([normal],30);advance([horse],30);advance([jelly],30);
 assert.ok(horse.x-x<(normal.x-x)*.3);assert.ok(jelly.x-x<horse.x-x);
 const low=M.layout([{id:'o',species:'octopus',size:130},{id:'r',species:'ray',size:140}],1000,600);
 assert.ok(low.get('o').y>400);assert.ok(low.get('r').y>300);
});
test('encounters do not turn or slow fish; they can pass through the same swimming lane',()=>{
 const fish=animals(2,1000,600);
 Object.assign(fish[0],{x:400,y:250,direction:1,angle:0,targetX:850,targetY:250,routeTime:30});
 Object.assign(fish[1],{x:480,y:250,direction:-1,angle:180,targetX:100,targetY:250,routeTime:30});
 for(let i=0;i<100;i++) M.step(fish,.05,1000,600,()=>.5);
 assert.equal(fish[0].direction,1);assert.equal(fish[1].direction,-1);
 assert.equal(fish[0].angle,0);assert.equal(fish[1].angle,180);
 assert.ok(fish[0].x>fish[1].x);assert.ok(fish[0].x>=519.9);assert.ok(fish[1].x<=360.1);
});
test('random destinations change depth and direction without leaving the aquarium or snapping turns',()=>{
 const [f]=animals(1,1000,600);let seed=921;
 const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const destinations=new Set();let min=f.y,max=f.y,turned=false,angle=f.angle;
 for(let i=0;i<6000;i++) {
  M.step([f],.05,1000,600,random);destinations.add(Math.round(f.targetY));
  min=Math.min(min,f.y);max=Math.max(max,f.y);
  assert.ok(Math.abs(f.angle-angle)<8);if(f.direction<0)turned=true;angle=f.angle;
 }
 assert.ok(destinations.size>8);assert.ok(max-min>100);assert.ok(turned);
});

test('eggs stay in a shallow seabed band for 1–60 students and leave space for the pearl',()=>{
 for(const [width,height] of [[394,600],[1240,540],[1600,800]]) for(const count of [1,3,12,30,60]) for(const pearl of [false,true]) {
  const items=Array.from({length:count},(_,i)=>({id:String(i)}));
  const nests=[...M.eggLayout(items,width,height,pearl).values()];
  assert.equal(nests.length,count);
  for(const n of nests) {
   assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x>=0&&n.x+n.size<=width+.01);
   assert.ok(n.y>height*.45);assert.ok(n.y+n.size*.67+25<=height);
   if(pearl) {const gap=Math.min(210,width*.38);assert.ok(n.x+n.size<=width/2-gap/2 || n.x>=width/2+gap/2);}
  }
 }
});


test('a fish completes a route across the timer region without a timed mid-route reversal',()=>{
 const [f]=animals(1,1000,600);
 Object.assign(f,{x:150,y:385,direction:1,angle:0,targetX:800,targetY:385,routeTime:.1});
 const headings=[];
 for(let i=0;i<500;i++) { M.step([f],.05,1000,600,()=>.45);headings.push(f.direction); }
 assert.ok(f.x>740);assert.ok(headings.every(direction=>direction===1));
 assert.equal(f.targetX,800); // Multiple depth-route intervals must not bounce off the central clock.
});

test('camera depth changes gently, crosses the clock plane, and never enlarges fish beyond their bounds',()=>{
 const [f]=animals(1,1000,600);f.waterDepth=.2;f.depthTarget=.85;f.depthTime=1000;
 let previous=f.waterDepth;const layers=new Set();
 for(let i=0;i<1200;i++) {
  M.step([f],.05,1000,600,()=>.5);
  assert.ok(Math.abs(f.waterDepth-previous)<=.001251);previous=f.waterDepth;
  const view=M.perspective(f);layers.add(view.layer);
  assert.ok(view.scale>=.76&&view.scale<=1);assert.ok(view.opacity>=.76&&view.opacity<=1);
 }
 assert.deepEqual([...layers],[1,3]);
 f.held=true;const depth=f.waterDepth;advance([f],100);assert.equal(f.waterDepth,depth);
});
test('camera placement is stable and independent of rewards, feeding or other students',()=>{
 const a={id:'same-student',species:'clown',size:112};
 const original=M.layout([a],1000,600).get(a.id).waterDepth;
 const other=M.layout([{id:'other',species:'tang',size:125},{...a,points:1000,hunger:5}],800,450).get(a.id).waterDepth;
 assert.equal(original,other);
});


test('hungry animals settle smoothly, remain completely still, then resume independent routes',()=>{
 const fish=animals(30,1240,600);
 for(const f of fish){f.hungry=true;f.restX=f.x;f.restY=f.maxY;}
 for(let i=0;i<600;i++) {const before=fish.map(f=>f.y);M.step(fish,.05,1240,600);fish.forEach((f,j)=>{assert.ok(f.y>=before[j]);assert.ok(f.y<=f.maxY);});}
 const resting=fish.map(f=>[f.x,f.y,f.angle,f.phase,f.waterDepth]);
 for(let i=0;i<200;i++)M.step(fish,.05,1240,600);
 assert.deepEqual(fish.map(f=>[f.x,f.y,f.angle,f.phase,f.waterDepth]),resting);
 fish.forEach(f=>f.hungry=false);for(let i=0;i<100;i++)M.step(fish,.05,1240,600);
 assert.notDeepEqual(fish.map(f=>[f.x,f.y,f.angle,f.phase,f.waterDepth]),resting);
});
