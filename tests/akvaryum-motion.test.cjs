const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../js/akvaryum-motion.js');
const C=require('../js/akvaryum-core.js');
function animals(count,w,h) {
 const items=Array.from({length:count},(_,i)=>({id:String(i),species:C.SPECIES[i%C.SPECIES.length].id,size:C.SPECIES[i%C.SPECIES.length].size}));
 return [...M.layout(items,w,h).values()].map((p,i)=>({...p,direction:i%2?-1:1,angle:i%2?180:0,phase:i,cruise:1,mood:{speed:1}}));
}
function advance(fish,n,w=1000,h=600){for(let i=0;i<n;i++)M.step(fish,.05,w,h);}
test('a companion approaches smoothly within viewport bounds and resumes its normal route when released',()=>{
 const f=animals(1,900,600)[0];Object.assign(f,{x:50,y:50,guidance:{x:700,y:400},phase:0});
 for(let i=0;i<180;i++){const x=f.x,y=f.y;M.step([f],.05,900,600);assert.ok(Math.hypot(f.x-x,f.y-y)<=15.001);assert.ok(f.x>=0&&f.x<=900-f.size&&f.y>=f.minY&&f.y<=f.maxY);}
 assert.equal(f.guidanceArrived,true);assert.ok(Math.abs(f.x-700)<1);assert.ok(Math.abs(f.y-400)<1);
 f.guidance.speaking=true;const phase=f.phase;advance([f],100,900,600);assert.equal(f.phase,phase);
 f.guidance=null;f.targetX=null;f.routeTime=0;const x=f.x;advance([f],100,900,600);assert.notEqual(f.x,x);
});
test('reflow retains a swimmer position, route, depth and stroke phase instead of reseeding the layout',()=>{
 const fish={...animals(1,900,600)[0],x:320,y:250,targetX:700,targetY:300,routeTime:18,waterDepth:.82,depthTarget:.1,depthTime:20,phase:9,turn:{elapsed:.2},cruise:.7};
 const before={...fish};const placement=M.layout([{id:'a',species:'clown',size:fish.size}],900,600).get('a');
 M.reflow(fish,placement,900);
 for(const key of ['x','y','targetX','targetY','routeTime','waterDepth','depthTarget','depthTime','phase','turn','cruise'])assert.equal(fish[key],before[key]);
 M.reflow(fish,{...placement,size:140,minY:26,maxY:280},600);
 assert.equal(fish.x+fish.size/2,before.x+before.size/2);assert.equal(fish.y,250);assert.equal(fish.targetX,460);assert.equal(fish.targetY,280);
 M.reflow(fish,{...placement,size:140,minY:26,maxY:100},350);
 assert.equal(fish.x,210);assert.equal(fish.y,100);assert.equal(fish.phase,9);assert.equal(fish.waterDepth,.82);
});
test('resting destinations leave room for the visible pearl on boards, phones and wide aquariums',()=>{
 for(const [w,h] of [[350,600],[1240,242],[1600,800]])for(const count of [1,3,12,30,60]) {
  const pearl={x:w/2-85,y:h-155,width:170,height:145};
  const items=Array.from({length:count},(_,i)=>({id:String(i),size:80+i%4*15,minY:26,maxY:h-125*.67-30}));
  const places=M.restLayout(items,w,h,pearl);
  assert.equal(places.size,count);
  for(const item of items) {
   const p=places.get(item.id),extra=(Math.max(70,item.size)-item.size)/2;
   assert.ok(Number.isFinite(p.x+p.y));assert.ok(p.x>=0&&p.x+item.size<=w);assert.ok(p.y>=item.minY&&p.y<=item.maxY);
   const overlaps=p.x-extra<pearl.x+pearl.width+16&&p.x+item.size+extra>pearl.x-16&&p.y<pearl.y+pearl.height+16&&p.y+item.size*.67+55>pearl.y-16;
   assert.equal(overlaps,false,`${w}×${h}, ${count} resting fish, ${item.id}`);
  }
 }
});
test('resting layout follows an off-center pearl, and releases its space when hidden',()=>{
 const items=[{id:'a',size:100,minY:26,maxY:500}];
 const normal=M.restLayout(items,900,600),center=normal.get('a');
 const shell={x:center.x-15,y:470,width:170,height:130};
 const reserved=M.restLayout(items,900,600,shell).get('a');
 assert.notDeepEqual(reserved,center);assert.deepEqual(M.restLayout(items,900,600,null),normal);
 const distant={x:0,y:0,width:170,height:100};
 assert.deepEqual(M.restLayout(items,900,600,distant),normal);
 const fish={...animals(1,900,600)[0],hungry:true,restX:reserved.x,restY:reserved.y};
 advance([fish],600,900,600);assert.equal(fish.x,reserved.x);assert.equal(fish.y,reserved.y);
 const settled={x:fish.x,y:fish.y};advance([fish],100,900,600);assert.deepEqual({x:fish.x,y:fish.y},settled);
 fish.hungry=false;advance([fish],100,900,600);assert.notEqual(fish.x,settled.x);
});
test('short classroom board lanes keep fish visible before growth instead of shrinking each grid row',()=>{
 const items=Array.from({length:25},(_,i)=>({id:String(i),species:i===24?'goldfish':'betta',size:125}));
 const board=M.layout(items,1240,242),desktop=M.layout(items,1240,540);
 assert.ok(board.get('0').size>=100);assert.ok(board.get('0').size>=desktop.get('0').size*.8);
 assert.ok((board.get('0').size-10)*.35*.66>20,'young distant fish must retain a visible body');
 for(const size of [1,1.5,2])for(const [w,h] of [[350,320],[1240,242],[1920,900]]){
  const fish=[...M.layout(items,w,h,size).values()].map((p,i)=>({...p,direction:i%2?-1:1,angle:i%2?180:0,phase:i,cruise:1,mood:{speed:1}}));
  for(let frame=0;frame<1200;frame++){M.step(fish,.05,w,h);for(const f of fish){assert.ok(f.x>=0&&f.x+f.size<=w+.001);assert.ok(f.y>=0&&f.y+f.size*.67+30<=h+.001);}}
 }
 const normal=M.layout(items,1240,242).get('0').size;
 assert.equal(M.layout(items,1240,242,1.5).get('0').size,normal*1.5);
 assert.equal(M.layout(items,1240,242,2).get('0').size,normal*2);
 assert.equal(M.layout(items,1240,242,NaN).get('0').size,normal);
});
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
test('hermit crabs remain near the sand while their routes continue',()=>{
 const p=M.layout([{id:'crab',species:'hermitcrab',size:112}],1000,600).get('crab');
 const f={...p,species:'hermitcrab',direction:1,angle:0,phase:0,cruise:1,mood:{speed:1}};
 const start=f.x;
 for(let i=0;i<2400;i++) {
  M.step([f],.05,1000,600);
  assert.ok(f.y>=p.maxY-600*.08 && f.y<=p.maxY);
 }
 assert.notEqual(f.x,start);
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
   assert.ok(n.eggSize*.7+3+n.labelSize*1.2<=82+.01);
   if(pearl) {const gap=width<700?Math.min(60,width*.16):Math.min(210,width*.38);assert.ok(n.x+n.size<=width/2-gap/2 || n.x>=width/2+gap/2);}
  }
  const rows=[...new Set(nests.map(n=>n.y))].sort((a,b)=>b-a);
  if(rows.length>1)for(let i=1;i<rows.length;i++){
   const [lower,upper]=[nests.find(n=>n.y===rows[i-1]),nests.find(n=>n.y===rows[i])];
   assert.ok(lower.eggSize*.7+3+lower.labelSize*1.2<=rows[i-1]-rows[i]+.01);
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
  assert.ok(view.scale>=.66&&view.scale<=1);assert.equal(view.opacity,1);
 }
 assert.deepEqual([...layers],[1,3]);
 f.held=true;const depth=f.waterDepth;advance([f],100);assert.equal(f.waterDepth,depth);
});

test('score label gap scales with rendered fish size and keeps a minimum for small fish',()=>{
 const small=M.labelGap(120,.45),large=M.labelGap(120,1);
 assert.ok(small>=8);assert.ok(large>small);
 assert.equal(M.labelGap(20,.4),8);assert.equal(M.labelGap(400,1),22);
});

test('fish name offset matches half of scaled art height without overcorrecting onto the fish',()=>{
 const nameOffset=M.labelAdjustment(120,.45),expected=(120-10)/3*(1-.45);
 assert.ok(Math.abs(nameOffset-expected)<.001);
 assert.equal(M.labelAdjustment(120,1),0);
 assert.ok(nameOffset<120*(1-.45)*.56);
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

test('soft turns ease through intermediate headings over 2.6 seconds, keep volume and finish without a snap',()=>{
 for(const initial of [1,-1]){
  const [f]=animals(1,1000,600);Object.assign(f,{species:'clown',direction:initial,angle:initial>0?0:180,x:initial>0?850:20,targetX:initial>0?100:850,targetY:250,y:250,routeTime:20,turnCooldown:0});
  const poses=[];let last=f.angle;
  for(let i=0;i<53;i++){
   M.step([f],.05,1000,600,()=>.5);const pose=M.turnPose(f);poses.push({...pose,x:f.x});
   assert.ok(Math.abs(f.angle-last)<7,'heading must interpolate even at a low frame rate');
   assert.ok(f.x>=0&&f.x<=1000-f.size);last=f.angle;
  }
  assert.equal(f.direction,-initial);assert.equal(f.turn,null);assert.equal(f.angle,initial>0?180:0);
  assert.ok(Math.abs(poses[0].yaw-(initial>0?0:180))<.02,'gentle acceleration at start');
  assert.ok(poses.some(p=>p.fullness>.97&&p.round>.99),'solid core persists across the edge-on heading');
  assert.ok(poses.every(p=>Math.abs(p.bank)<=3.5&&p.scale<=1.035&&p.lift>=-2.5));
  assert.equal(poses.at(-1).fullness,0);assert.ok(Math.abs(poses.at(-1).bank)<.0001);
  const facing=f.angle;M.step([f],.05,1000,600,()=>.5);assert.equal(f.angle,facing);
 }
});
test('turn volume and banking retain continuity when a fish is held, and fit the animal shape',()=>{
 const [f]=animals(1,1000,600);Object.assign(f,{species:'clown',angle:90,turn:{elapsed:1.3,duration:2.6,from:0,to:180},held:true});
 const before=M.turnPose(f);advance([f],100);assert.deepEqual(M.turnPose(f),before);
 assert.ok(before.fullness>.99);assert.ok(before.width>.2&&before.height>.4);
 assert.ok(M.turnPose({...f,species:'shark'}).height<before.height);
 assert.ok(M.turnPose({...f,species:'seahorse'}).height>before.height);
 for(const angle of [0,180,NaN,-100,300]){
  const p=M.turnPose({...f,angle});assert.ok(Object.values(p).every(Number.isFinite));assert.equal(p.fullness,0);
 }
});

test('decor layers never push swimmers up, slow them or change their route at a crossing',()=>{
 for(const depth of [.15,.5,.85]){
  const make=()=>({...animals(1,1000,600)[0],size:80,x:200,y:400,direction:1,angle:0,phase:0,cruise:1,mood:{speed:1},targetX:900,targetY:400,routeTime:100,waterDepth:depth,depthTarget:depth,depthTime:100});
  const fish=make(),control=make(),decor={x:500,y:280,width:180,height:250,depth:.5};let passed=false;
  for(let i=0;i<600;i++){
   M.step([fish],.05,1000,600,()=>.5,[decor]);M.step([control],.05,1000,600,()=>.5);
   for(const key of ['x','y','phase','targetX','targetY','waterDepth'])assert.equal(fish[key],control[key],key);
   if(fish.x>740)passed=true;
  }
  assert.equal(passed,true);assert.ok(fish.y>380,'no forced climb over a decor');
 }
});
test('puffer reward pose inflates quickly, holds, and returns smoothly at five seconds',()=>{
 for(const t of [-1,NaN,5,100])assert.deepEqual(M.puffPose(t),{amount:0,x:1,y:1});
 assert.equal(M.puffPose(0).amount,0);assert.ok(M.puffPose(.14).amount>.49);assert.deepEqual(M.puffPose(.28),M.puffPose(4.25));
 assert.equal(M.puffPose(1).x,1.28);assert.equal(M.puffPose(1).y,1.8);assert.ok(M.puffPose(4.6).amount<1&&M.puffPose(4.6).amount>0);
 let previous=M.puffPose(0).amount;
 for(let i=1;i<=500;i++){const p=M.puffPose(i/100);assert.ok(p.amount>=0&&p.amount<=1);assert.ok(Math.abs(p.amount-previous)<.06);previous=p.amount;}
});
