const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../js/akvaryum-core.js'),Sync=require('../js/akvaryum-sync-merge.js'),Motion=require('../js/akvaryum-motion.js'),Anatomy=require('../js/akvaryum-anatomy.js');
const ids=['eel','angler','mantis','crab','lina','spongebob','patrick','mrkrabs','plankton','gary','squidward','sandy'];
const catalogueAdditions=['hammerhead','axolotl','catfish','megalodon','seal','penguin'];
const clone=v=>JSON.parse(JSON.stringify(v));
function setup(){const state=C.initialState(),cls=state.classes[0],student=C.newStudent('Deniz');cls.students=[student];cls.tasks[0].points=99;C.ensureDay(student,cls);return {state,cls,student,date:C.dayKey()};}
test('natural animals and seven milestone characters have complete assets',()=>{
 assert.equal(C.SPECIES.length,60);assert.equal(C.SPECIES.filter(s=>s.unlockAt).length,7);assert.equal(C.species('lina').name,'Lina Balığı');
 for(const id of ids){const s=C.SPECIES.find(s=>s.id===id);assert.ok(s);for(const file of s.file.endsWith('.svg')?[s.file]:[s.file,'web-v1/'+s.file.replace(/\.png$/,'.webp')])assert.ok(fs.statSync('assets/akvaryum/canlilar/'+file).size>1000);}
});
test('99 points cannot select a character, 100 unlocks all seven without spending or replacing the fish',()=>{
 const {state,cls,student:s,date}=setup();C.awardBehavior(s,cls,date,cls.tasks[0].id);assert.equal(C.earned(s),99);
 for(const id of ids.slice(5)){assert.equal(C.canSelectSpecies(s,id),false);assert.equal(C.selectSpecies(s,id),false);}
 assert.equal(C.newStudent('Yeni','patrick').species,'clown');assert.equal(C.canSelectSpecies(null,'spongebob'),false);
 C.updateTaskPoints(cls,cls.tasks[0].id,1);C.awardBehavior(s,cls,date,cls.tasks[0].id);
 assert.equal(C.earned(s),100);assert.equal(s.species,'clown');assert.equal(s.characterUnlocked,true);
 for(const id of ids.slice(5)){assert.equal(C.canSelectSpecies(s,id),true);assert.equal(C.selectSpecies(s,id),true);assert.equal(C.earned(s),100);}
 assert.deepEqual(C.validate(clone(state)),state);assert.equal(C.selectSpecies(s,'unknown'),false);
});
test('deductions, corrected rewards and a new season do not revoke the earned collection',()=>{
 const {state,cls,student:s,date}=setup();C.updateTaskPoints(cls,cls.tasks[0].id,100);C.awardBehavior(s,cls,date,cls.tasks[0].id);C.selectSpecies(s,'patrick');
 const entry=s.days[date].tasks.find(t=>t.status==='done');C.correctAward(s,date,entry.id,true);assert.equal(C.earned(s),0);assert.equal(C.canSelectSpecies(s,'spongebob'),true);assert.equal(s.species,'patrick');
 C.selectSpecies(s,'lina');C.startNewSeason(cls);assert.equal(C.canSelectSpecies(C.validate(clone(state)).classes[0].students[0],'mrkrabs'),true);
});
test('existing 100-point accounts and archived seasons gain the milestone on load, pending tasks never count',()=>{
 const {state,cls,student:s,date}=setup();s.days[date].tasks[0].points=100;assert.equal(C.charactersUnlocked(s),false);
 s.days[date].tasks[0].status='done';delete s.characterUnlocked;assert.equal(C.validate(clone(state)).classes[0].students[0].characterUnlocked,true);
 C.startNewSeason(cls);delete s.characterUnlocked;assert.equal(C.earned(s),0);assert.equal(C.validate(clone(state)).classes[0].students[0].characterUnlocked,true);
});
test('two offline awards jointly reaching 100 unlock once after automatic reconciliation',()=>{
 const {state,cls,student:s,date}=setup();C.updateTaskPoints(cls,cls.tasks[0].id,50);
 const left=clone(state),right=clone(state);for(const doc of [left,right])C.awardBehavior(doc.classes[0].students[0],doc.classes[0],date,cls.tasks[0].id);
 const merged=Sync.reconcile(state,left,right),p=merged.classes[0].students[0];assert.equal(C.earned(p),100);assert.equal(p.characterUnlocked,true);assert.equal(p.species,'clown');assert.equal(C.canSelectSpecies(p,'patrick'),true);
});
test('new creatures keep finite scene bounds and intact images at rest and during swimming',()=>{
 for(const [width,height] of [[350,320],[1280,600]])for(const id of ids){
  const size=C.species(id).size,f={...Motion.layout([{id,species:id,size}],width,height).get(id),id,species:id,size,direction:1,phase:0,angle:0,cruise:1,mood:{speed:.65},anatomicalMotion:true};
  for(let i=0;i<1000;i++){Motion.step([f],.025,width,height,()=>.4);assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y)&&f.y>=f.minY-.01&&f.y<=f.maxY+.01);}
  if(id!=='lina'){assert.equal(Anatomy.mask(id),'none');assert.equal(Anatomy.definitions[id].parts.length,0);assert.deepEqual(Anatomy.pose(id,0,false),Anatomy.pose(id,100,false));}
 }
});
test('new natural animals are selectable immediately, round-trip and merge without changing scores or classmates',()=>{
 for(const id of catalogueAdditions){
  const {state,cls,student,date}=setup();assert.equal(C.canSelectSpecies(student,id),true);assert.equal(C.selectSpecies(student,id),true);assert.equal(student.speciesCatalogVersion,C.SPECIES_CATALOG_VERSION);
  const peer=C.newStudent('Ece');cls.students.push(peer);C.ensureDay(peer,cls,date);const before=clone(state),local=clone(state),remote=clone(state);
  C.awardBehavior(local.classes[0].students[0],local.classes[0],date,cls.tasks[0].id);C.awardBehavior(remote.classes[0].students[1],remote.classes[0],date,cls.tasks[0].id);
  const merged=Sync.reconcile(before,local,remote);assert.deepEqual(merged.classes[0].students.map(s=>s.species),[id,'clown']);assert.deepEqual(merged.classes[0].students.map(C.earned),[99,99]);
  assert.equal(C.validate(clone(merged)).classes[0].students[0].speciesCatalogVersion,C.SPECIES_CATALOG_VERSION);
  const animal=C.species(id),png=fs.readFileSync('assets/akvaryum/canlilar/'+animal.file),webp=fs.readFileSync('assets/akvaryum/canlilar/web-v1/'+animal.file.replace('.png','.webp'));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(webp.subarray(0,4).toString(),'RIFF');assert.equal(webp.subarray(8,12).toString(),'WEBP');assert.ok(webp.length<100000);
 }
});
test('new animals keep whole silhouettes, normal bounds and distinct natural swimming speeds',()=>{
 for(const id of catalogueAdditions)for(const [width,height] of [[320,240],[1280,600]]){
  assert.equal(Anatomy.mask(id),'none');assert.equal(Anatomy.definitions[id]?.parts.length??0,0);
  const item={id,species:id,size:C.species(id).size},f={...item,...Motion.layout([item],width,height).get(id),direction:1,angle:0,phase:0,cruise:1,mood:{speed:.65},anatomicalMotion:true};
  for(let i=0;i<1800;i++){Motion.step([f],.025,width,height,()=>.4);assert.ok(Number.isFinite(f.x+f.y+f.phase));assert.ok(f.x>=0&&f.x<=width-f.size);assert.ok(f.y>=f.minY&&f.y<=f.maxY);}
 }
 assert.ok(Motion.profile('hammerhead').speed>Motion.profile('axolotl').speed*2);
});

test('megalodon is thirty percent smaller on wide and narrow scenes without shrinking other animals',()=>{
 for(const [width,height,previousSize] of [[320,240,125.90666666666667],[1280,600,234.09714285714284]]){
  const shark=C.species('shark'),megalodon=C.species('megalodon');
  const ordinary=Array.from({length:24},(_,i)=>({id:'fish-'+i,species:shark.id,size:shark.size}));
  const normal=Motion.layout(ordinary,width,height);
  const mixed=Motion.layout([...ordinary.slice(0,-1),{id:megalodon.id,species:megalodon.id,size:megalodon.size}],width,height);
  const big=mixed.get(megalodon.id);
  assert.equal(mixed.get('fish-0').size,normal.get('fish-0').size);
  assert.ok(Math.abs(big.size-previousSize*.7)<.000001);
  assert.ok(big.x>=0&&big.x+big.size<=width&&big.y>=big.minY&&big.y<=big.maxY);
 }
});

test('megalodon compact and single-fish layouts retain the same thirty percent reduction',()=>{
 for(const [width,height,count,previousSize] of [[1280,600,1,244.24],[390,500,8,159.04]]){
  const items=Array.from({length:count-1},(_,i)=>({id:'f'+i,species:'shark',size:C.species('shark').size}));
  items.push({id:'m',species:'megalodon',size:C.species('megalodon').size});
  assert.ok(Math.abs(Motion.layout(items,width,height).get('m').size-previousSize*.7)<.000001);
 }
});
