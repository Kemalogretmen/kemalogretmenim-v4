const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/akvaryum-expressive.js'),R=require('../js/akvaryum-rewards.js');
const faces={eel:[.86,.52],angler:[.83,.55],mantis:[.7,.27],crab:[.65,.37],lina:[.85,.44],spongebob:[.5,.36],patrick:[.51,.34],mrkrabs:[.49,.4],hammerhead:[.82,.47],axolotl:[.80,.52]};
test('every new creature keeps a pinned face, bounded whole silhouette and non-folding shared mesh edges',()=>{
 for(const id of E.species)for(const lite of [false,true])for(let t=0;t<6.3;t+=.18)for(const boost of [0,.5,1]){
  const [x,y]=faces[id];assert.deepEqual(E.point(id,x,y,t,{boost}),{x,y},id+' face');
  const mesh=E.plan(id,t,{boost,lite});assert.ok(mesh.triangles.length<=160);
  for(const vertex of mesh.vertices){assert.ok(vertex.target.x>=0&&vertex.target.x<=1&&vertex.target.y>=0&&vertex.target.y<=1);}
  for(const indices of mesh.triangles){const [a,b,c]=indices.map(i=>mesh.vertices[i].target);assert.ok((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0,id+' triangle must not fold');}
 }
});
test('the raised hand, claws, feelers and veil have visible local motion without detached parts',()=>{
 const tips={eel:[.16,.55],angler:[.885,.24],mantis:[.88,.29],crab:[.4,.63],lina:[.21,.68],spongebob:[.755,.32],patrick:[.71,.38],mrkrabs:[.3,.34],hammerhead:[.16,.55],axolotl:[.62,.79]};
 for(const id of E.species){const [x,y]=tips[id],frames=Array.from({length:40},(_,i)=>E.point(id,x,y,i/40*Math.PI*2,{boost:1}));
  const span=Math.hypot(Math.max(...frames.map(p=>p.x))-Math.min(...frames.map(p=>p.x)),Math.max(...frames.map(p=>p.y))-Math.min(...frames.map(p=>p.y)));
  assert.ok(span>.018,id+' appendage should visibly move');
  for(const t of [0,1,100])assert.deepEqual(E.point(id,x,y,t,{moving:false,boost:1}),{x,y});
 }
});
function renderer(){
 const stats={created:0,transforms:0,draws:0,glows:0,strokes:0};
 const doc={createElement(){stats.created++;return {ownerDocument:doc,width:0,height:0,getContext(){return {clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(...args){assert.ok(args.every(Number.isFinite));stats.transforms++;},drawImage(){stats.draws++;},fillRect(){},stroke(){stats.strokes++;},createRadialGradient(){stats.glows++;return {addColorStop(){}};}};}};}};
 return {doc,canvas:doc.createElement('canvas'),image:{src:'fixture-'+Math.random(),complete:true,naturalWidth:640,naturalHeight:426},stats};
}
test('render caches one shared frame across pupils, draws an intact rest image and handles missing canvas/source safely',()=>{
 const h=renderer();assert.equal(E.render(h.canvas,h.image,'spongebob',1,{moving:true,boost:1}),true);assert.ok(h.stats.transforms>0);const count=h.stats.created,transforms=h.stats.transforms;
 const peer=h.doc.createElement('canvas');assert.equal(E.render(peer,h.image,'spongebob',1,{moving:true,boost:1}),true);assert.equal(h.stats.created,count+1);assert.equal(h.stats.transforms,transforms,'pupils share the same warped frame');
 assert.equal(E.render(peer,h.image,'spongebob',9,{moving:false}),true);assert.equal(h.stats.transforms,transforms,'rest uses one whole image, never mesh slices');
 assert.equal(E.render(peer,{...h.image,complete:false},'spongebob',1,{moving:true}),false);assert.equal(E.render({getContext:()=>null,ownerDocument:h.doc},h.image,'spongebob',1),false);
 assert.equal(E.render(peer,h.image,'ray',1),false);assert.equal(E.plan('ray',1),null);
});
test('lightweight rendering stays bounded and fener light follows the moving lure',()=>{
 const h=renderer();assert.equal(E.render(h.canvas,h.image,'angler',1,{moving:true,boost:1,lite:true,width:500,dpr:3}),true);
 assert.equal(h.canvas.width,112);assert.ok(h.stats.transforms<=60);assert.equal(h.stats.glows,1);
});
test('all expressive celebrations are distinct, smoothly return to normal and stay within the existing route offset budget',()=>{
 const signatures=new Set();for(const id of E.species){const profile=R.profile(id);assert.ok(profile.duration<=4.3);assert.notEqual(profile.kind,'greet');
  const frames=Array.from({length:50},(_,i)=>R.pose(id,i*profile.duration/50));signatures.add(JSON.stringify(frames));
  assert.deepEqual(R.pose(id,profile.duration),R.pose(id,NaN));
  for(const pose of frames){assert.ok(Math.abs(pose.x)<=5&&Math.abs(pose.y)<=11&&Math.abs(pose.bank)<=8);assert.ok(pose.scaleX>=.94&&pose.scaleY>=.94);}
 }
 assert.equal(signatures.size,E.species.length);assert.equal(R.profile('spongebob').kind,'sponge-dance');
 const before=R.pose('spongebob',0),peak=R.pose('spongebob',1);assert.ok(peak.scaleX!==before.scaleX&&peak.y<0,'sponge dances and hops');
});
test('electric and rainbow accents are bounded, transient and lighter in lite mode',()=>{
 for(const id of ['eel','lina']){
  assert.deepEqual(E.effects(id,1,0),[]);const full=E.effects(id,1,1),lite=E.effects(id,1,1,{lite:true});
  assert.equal(full.length,12);assert.equal(lite.length,6);assert.notDeepEqual(full,E.effects(id,2,1));
  for(const line of full){assert.ok(line.alpha>0&&line.alpha<=.7);for(const p of line.points)assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);}
  const h=renderer();assert.equal(E.renderEffects(h.canvas,id,1,1),true);assert.equal(h.stats.strokes,12);
  assert.equal(E.renderEffects(h.canvas,id,2,0),true);assert.equal(h.stats.strokes,12,'finished rewards draw no lingering accents');
 }
 assert.equal(new Set(E.effects('lina',1,1).map(line=>line.color)).size,6);
 assert.equal(E.renderEffects({getContext:()=>null},'eel',1,1),false);
});
test('crab dances laterally several times while eel orbits and the angler jaw opens below a stable face',()=>{
 const values=Array.from({length:181},(_,i)=>R.pose('crab',i*.02).lateral);assert.ok(Math.max(...values)>.1&&Math.min(...values)<-.1);
 const signs=values.filter(v=>Math.abs(v)>.001).map(Math.sign);assert.ok(signs.filter((v,i)=>i&&v!==signs[i-1]).length>=5);
 assert.ok(R.pose('eel',1).orbitX>0&&R.pose('eel',2.5).orbitX<0);assert.ok(R.pose('eel',1.8).orbitY<-.2);
 const closed=E.point('angler',.82,.66,1,{boost:0}),open=E.point('angler',.82,.66,1,{boost:1});assert.ok(open.y-closed.y>.06);
 const upper=E.point('crab',.64,.57,.8,{boost:1}),lower=E.point('crab',.64,.65,.8,{boost:1});assert.ok(upper.y<.57&&lower.y<.65,'both claws lift as one connected shape');
});
test('character kisses send different small hearts and walking feet retain a connected, non-folding body',()=>{
 const signatures=new Set();
 for(const id of ['spongebob','patrick','mrkrabs']){
  const lines=E.effects(id,1,1);assert.equal(lines.length,3);assert.equal(E.effects(id,1,1,{lite:true}).length,2);assert.deepEqual(E.effects(id,1,0),[]);signatures.add(JSON.stringify(lines));
  for(const line of lines){assert.equal(line.points.length,25);assert.ok(line.alpha>=0&&line.alpha<=.8);}
  for(const lite of [true,false])for(let t=0;t<6.3;t+=.2){
   const mesh=E.plan(id,t,{walking:true,boost:1,lite});for(const ix of mesh.triangles){const [a,b,c]=ix.map(i=>mesh.vertices[i].target);assert.ok((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0);}
   const [x,y]=faces[id];assert.deepEqual(E.point(id,x,y,t,{walking:true,boost:1}),{x,y});
  }
 }
 assert.equal(signatures.size,3);
});
test('rainbow rays emerge from the tail and electrical bolts emerge along the body instead of surrounding rings',()=>{
 for(let t=0;t<12;t+=.2)for(const lite of [false,true]){
  for(const ray of E.effects('lina',t,1,{lite})){
   assert.equal(ray.points.length,8);assert.ok(ray.points[0].x>=.30&&ray.points[0].x<=.33);assert.ok(ray.points[0].y>.50&&ray.points[0].y<.57);
   assert.ok(ray.points.at(-1).x<.15);assert.ok(ray.points.every((p,i)=>!i||p.x<ray.points[i-1].x),'each ray travels outward from the tail');
  }
  const bolts=E.effects('eel',t,1,{lite});assert.ok(new Set(bolts.map(b=>b.points[0].x)).size>=5);
  for(const bolt of bolts){assert.equal(bolt.points.length,6);assert.ok(bolt.points[0].x>=.34&&bolt.points[0].x<=.69);assert.ok(Math.abs(bolt.points[0].y-.51)<.06);assert.ok(Math.abs(bolt.points.at(-1).y-bolt.points[0].y)>.08);assert.ok(bolt.glow>0);}
 }
});
test('axolotl gills, tail and waving hand move visibly while the face stays pinned; new reward bubbles stop completely',()=>{
 const points=[[.64,.32],[.92,.35],[.62,.79],[.16,.55]];
 for(const [x,y] of points){const frames=Array.from({length:60},(_,i)=>E.point('axolotl',x,y,i/10,{boost:1}));assert.ok(Math.hypot(Math.max(...frames.map(p=>p.x))-Math.min(...frames.map(p=>p.x)),Math.max(...frames.map(p=>p.y))-Math.min(...frames.map(p=>p.y)))>.015);}
 for(let t=0;t<8;t+=.1){assert.deepEqual(E.point('hammerhead',.82,.47,t,{boost:1}),{x:.82,y:.47});assert.deepEqual(E.point('axolotl',.80,.52,t,{boost:1}),{x:.80,y:.52});}
 assert.equal(E.effects('axolotl',1,1).length,5);assert.equal(E.effects('axolotl',1,1,{lite:true}).length,3);assert.deepEqual(E.effects('axolotl',1,0),[]);
 for(const line of E.effects('axolotl',1,1)){assert.equal(line.points.length,21);assert.ok(line.alpha>0&&line.alpha<.6);assert.ok(line.points.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));}
 assert.equal(R.profile('hammerhead').kind,'hammer-glide');assert.equal(R.profile('axolotl').kind,'gill-wave');
});
