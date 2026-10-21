const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),Cloud=require('../js/akvaryum-cloud.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function server(conflictCode='PT409'){let row=null,offline=false;return {get row(){return clone(row);},set offline(v){offline=v;},client:{from:()=>({select:()=>({maybeSingle:async()=>offline?{error:{}}:{data:clone(row)}})}),rpc:async(name,args)=>{if(offline)return {error:{}};if(args.p_revision!==(row?.revision||0))return {error:{code:conflictCode}};row={document:clone(args.p_document),revision:(row?.revision||0)+1};return {data:row.revision};}}};}
function device(s){const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};return {storage,cloud:Cloud.create({client:s.client,storage,key:'owner',project:c=>({name:c.name})})};}
function classState(){const s=C.initialState();s.classes[0].name='Birincilerim';s.classes[0].students.push(C.newStudent('Örnek öğrenci'));return s;}
test('first device migrates local class; second device receives tasks, points, growth and sound favorites',async()=>{
 const s=server(),a=device(s),b=device(s),local=classState();local.classes[0].tasks[0].icon='📚';local.classes[0].growth={enabled:true,thresholds:C.defaultThresholds()};local.settings.favorites=[{id:'mix',name:'Okuma',volume:.2,mix:[{id:'peace',volume:.7},{id:'rain',volume:.2}]}];
 await a.cloud.boot(local);const remote=await b.cloud.boot(C.initialState());assert.deepEqual(remote,C.validate(local));
 local.classes[0].tasks[0].title='Birlikte okuduk';a.cloud.markDirty();await a.cloud.save(local);
 assert.equal((await b.cloud.refresh(remote)).classes[0].tasks[0].title,'Birlikte okuduk');
});
test('a stale same-field edit converges to the database automatically and preserves its unsent archive',async()=>{
 const s=server(),a=device(s),b=device(s),local=classState();await a.cloud.boot(local);const other=await b.cloud.boot(C.initialState());
 local.classes[0].name='Yeni ad';a.cloud.markDirty();await a.cloud.save(local);
 other.classes[0].name='Çevrimdışı ad';b.cloud.markDirty();const before=s.row.revision,result=await b.cloud.save(other);
 assert.equal(result.classes[0].name,'Yeni ad');assert.equal(s.row.document.classes[0].name,'Yeni ad');assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);
 assert.equal(JSON.parse(b.storage.getItem('owner_unsent_recovery')).document.classes[0].name,'Çevrimdışı ad');assert.equal(s.row.revision,before,'acknowledging the database does not write another revision');
 const resolved=await b.cloud.resolve('local',other);assert.equal(resolved.classes[0].name,'Yeni ad');
});
test('100 mixed behavior templates survive cloud hydration and backup validation without truncation',async()=>{
 const s=server(),a=device(s),b=device(s),local=classState(),cls=local.classes[0];
 while(cls.tasks.length<C.MAX_BEHAVIORS)cls.tasks.push({id:C.uid(),title:'Davranış '+cls.tasks.length,points:cls.tasks.length%2?5:-2,icon:'⭐'});
 const child=cls.students[0],today=C.dayKey();C.ensureDay(child,cls,today);
 C.awardBehavior(child,cls,today,cls.tasks[3].id);C.awardBehavior(child,cls,today,cls.tasks[4].id);
 const expected=C.validate(JSON.parse(JSON.stringify(local)));
 await a.cloud.boot(local);const remote=await b.cloud.boot(C.initialState());
 assert.deepEqual(remote,expected);assert.equal(remote.classes[0].tasks.length,100);assert.equal(C.earned(remote.classes[0].students[0]),3);
 cls.tasks.push({id:C.uid(),title:'Fazladan',points:1});assert.throws(()=>C.validate(local),/100 davranış/);
});
test('offline edits retry, dirty markers survive reload, and a fresh empty device never erases a class',async()=>{
 const s=server(),a=device(s),state=classState();await a.cloud.boot(state);s.offline=true;state.classes[0].name='Yeni sınıf';a.cloud.markDirty();await assert.rejects(a.cloud.save(state));assert.equal(JSON.parse(a.storage.getItem('owner_cloud')).dirty,true);
 s.offline=false;await a.cloud.refresh(state);assert.equal(s.row.document.classes[0].name,'Yeni sınıf');
 const b=device(s);assert.equal((await b.cloud.boot(C.initialState())).classes.length,1);assert.equal(s.row.document.classes[0].name,'Yeni sınıf');
});
test('unproven older local classes are archived while first login takes the database account automatically',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),two=classState();await a.cloud.boot(one);const before=s.row.revision,combined=await b.cloud.boot(two);
 assert.deepEqual(combined,C.validate(one));assert.equal(combined.classes.length,1);assert.deepEqual(JSON.parse(b.storage.getItem('owner_unsent_recovery')).document,C.validate(two));
 const c=device(s),stale=clone(one);stale.classes[0].name='Eski ad';const current=await c.cloud.boot(stale);
 assert.equal(current.classes[0].name,'Birincilerim');assert.equal(c.cloud.isConflict(),false);assert.equal(s.row.revision,before);
});
test('task title/icon/points edits leave completed history intact and future repeated rewards use new values',()=>{
 const s=classState(),c=s.classes[0],student=c.students[0],today=C.dayKey();C.ensureDay(student,c,today);C.awardBehavior(student,c,today,c.tasks[0].id);
 assert.equal(C.updateTask(c,c.tasks[0].id,{title:'Yeni davranış',icon:'🧪',points:8},today),true);C.awardBehavior(student,c,today,c.tasks[0].id);
 assert.equal(student.days[today].tasks[0].points,1);assert.equal(student.days[today].tasks.at(-1).points,8);assert.equal(student.days[today].tasks.at(-1).icon,'🧪');assert.equal(C.earned(student),9);
 assert.equal(C.updateTask(c,c.tasks[0].id,{title:'',points:3}),false);assert.equal(C.taskIcon('<script>'),'');assert.deepEqual(C.validate(s),s);
});

test('a write in flight cannot clear the dirty flag of a newer local edit',async()=>{
 const s=server(),d=device(s),state=classState();await d.cloud.boot(state);
 const real=s.client.rpc;let release;s.client.rpc=async(...args)=>{await new Promise(r=>release=r);return real(...args);};
 d.cloud.markDirty();const pending=d.cloud.save(state);await new Promise(r=>setImmediate(r));state.classes[0].name='Latest';d.cloud.markDirty();release();await pending;
 assert.equal(JSON.parse(d.storage.getItem('owner_cloud')).dirty,true);assert.equal(s.row.document.classes[0].name,'Birincilerim');
});
test('script dependencies load before audio and core; all 42 creatures have assets',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('ogretmen/akvaryum.html','utf8');assert.ok(html.indexOf('/js/akvaryum-sounds.js')<html.indexOf('/js/akvaryum-audio.js'));assert.ok(html.indexOf('/js/akvaryum-sounds.js')<html.indexOf('/js/akvaryum-core.js'));assert.equal(C.SPECIES.length,42);assert.equal(new Set(C.SPECIES.map(s=>s.id)).size,42);for(const s of C.SPECIES)assert.ok(fs.existsSync('assets/akvaryum/canlilar/'+s.file));
});

test('three stale devices converge on independent pupil awards without losing or duplicating feeds',async()=>{
 const s=server(),a=device(s),b=device(s),c=device(s),one=classState(),cls=one.classes[0];
 cls.students.push(C.newStudent('Ada'),C.newStudent('Ece'));cls.students.forEach(p=>C.ensureDay(p,cls));
 await a.cloud.boot(one);let two=await b.cloud.boot(C.initialState()),three=await c.cloud.boot(C.initialState());
 for(const [d,doc,index] of [[a,one,0],[b,two,1],[c,three,2]]){
  const cl=doc.classes[0];C.awardBehavior(cl.students[index],cl,C.dayKey(),cl.tasks[0].id);d.cloud.markDirty(doc);
  const merged=await d.cloud.save(doc);assert.equal(d.cloud.isConflict(),false);
  assert.equal(merged.classes[0].students[index].feeds.length,1);
 }
 for(const p of s.row.document.classes[0].students){assert.equal(C.earned(p),1);assert.equal(p.feeds.length,1);}
 two=await b.cloud.refresh(two);assert.deepEqual(two.classes[0].students.map(C.earned),[1,1,1]);
 const reload=device(s);assert.deepEqual((await reload.cloud.boot(C.initialState())).classes[0].students.map(C.earned),[1,1,1]);
});
test('different behaviors and independently identified first awards merge without collapsing points or feeds',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);
 await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);a.cloud.markDirty(one);await a.cloud.save(one);
 const other=two.classes[0];C.awardBehavior(other.students[0],other,C.dayKey(),other.tasks[1].id);b.cloud.markDirty(two);const merged=await b.cloud.save(two);
 assert.equal(C.earned(merged.classes[0].students[0]),2);assert.equal(merged.classes[0].students[0].feeds.length,2);
 const c=device(s),d=device(s),left=await c.cloud.boot(C.initialState()),right=await d.cloud.boot(C.initialState());
 for(const doc of [left,right]){const cls=doc.classes[0];C.awardBehavior(cls.students[0],cls,C.dayKey(),cls.tasks[2].id);}
 c.cloud.markDirty(left);await c.cloud.save(left);d.cloud.markDirty(right);const result=await d.cloud.save(right);
 assert.equal(C.earned(s.row.document.classes[0].students[0]),4);assert.equal(result.classes[0].students[0].feeds.length,4);
 assert.equal(new Set(result.classes[0].students[0].days[C.dayKey()].tasks.map(t=>t.id)).size,result.classes[0].students[0].days[C.dayKey()].tasks.length);
 assert.equal(JSON.parse(d.storage.getItem('owner_cloud')).dirty,false);
});
test('independent legacy first rewards merge when distinct feed identifiers prove that both awards happened',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),c=one.classes[0];C.ensureDay(c.students[0],c);await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
 for(const doc of [one,two]){const cl=doc.classes[0];C.completeAndFeed(cl.students[0],C.dayKey(),cl.tasks[0].id);}
 a.cloud.markDirty(one);await a.cloud.save(one);b.cloud.markDirty(two);const merged=await b.cloud.save(two);
 const pupil=merged.classes[0].students[0];assert.equal(C.earned(pupil),2);assert.equal(pupil.feeds.length,2);assert.equal(s.row.document.classes[0].students[0].feeds.length,2);assert.equal(b.cloud.isConflict(),false);
});
test('offline edits merge against the persisted baseline after a reload and preserve independent remote awards',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),cl=one.classes[0];cl.students.push(C.newStudent('Ada'));cl.students.forEach(p=>C.ensureDay(p,cl));
 await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);a.cloud.markDirty(one);await a.cloud.save(one);
 const other=two.classes[0];C.awardBehavior(other.students[1],other,C.dayKey(),other.tasks[0].id);b.cloud.markDirty(two);s.offline=true;await assert.rejects(b.cloud.save(two));s.offline=false;
 const reopened=Cloud.create({client:s.client,storage:b.storage,key:'owner',project:()=>({})});const recovered=await reopened.boot(two);
 assert.deepEqual(recovered.classes[0].students.map(C.earned),[1,1]);assert.equal(reopened.isDirty(),false);
});
test('a retry after a lost write acknowledgement is idempotent and never doubles an award or feed',async()=>{
 const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);
 const real=s.client.rpc;let lose=true;s.client.rpc=async(...args)=>{const result=await real(...args);if(lose){lose=false;throw Error('Response lost');}return result;};
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);a.cloud.markDirty(one);await assert.rejects(a.cloud.save(one));
 const result=await a.cloud.refresh(one);assert.equal(C.earned(result.classes[0].students[0]),1);assert.equal(result.classes[0].students[0].feeds.length,1);
});
test('a point added during an in-flight merged write survives in the returned local state and the next write',async()=>{
 const s=server(),one=classState(),a=device(s),b=device(s),cls=one.classes[0];cls.students.push(C.newStudent('Ada'));cls.students.forEach(p=>C.ensureDay(p,cls));await a.cloud.boot(one);
 let two=await b.cloud.boot(C.initialState());const current=()=>two;
 const c=Cloud.create({client:s.client,storage:b.storage,key:'owner',getState:current,project:()=>({})});two=await c.boot(two);
 C.awardBehavior(cls.students[0],cls,C.dayKey(),cls.tasks[0].id);a.cloud.markDirty(one);await a.cloud.save(one);
 let release;const real=s.client.rpc;let delay=true;s.client.rpc=async(...args)=>{if(delay){delay=false;await new Promise(r=>release=r);}return real(...args);};
 const cl=two.classes[0];C.awardBehavior(cl.students[1],cl,C.dayKey(),cl.tasks[0].id);c.markDirty(two);const pending=c.save(two);await new Promise(r=>setImmediate(r));
 C.awardBehavior(cl.students[1],cl,C.dayKey(),cl.tasks[1].id);c.markDirty(two);release();two=await pending;
 assert.deepEqual(two.classes[0].students.map(C.earned),[1,2]);assert.equal(c.isDirty(),true);
 two=await c.refresh(two);assert.deepEqual(s.row.document.classes[0].students.map(C.earned),[1,2]);assert.equal(c.isDirty(),false);
});
test('a legacy dirty record with no acknowledged baseline uses the database and keeps its unsent copy',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=await b.cloud.boot(C.initialState());
 one.classes[0].name='Remote change';a.cloud.markDirty(one);await a.cloud.save(one);
 two.classes[0].name='Offline change';b.cloud.markDirty(two);
 await b.cloud.flushCache();b.storage.setItem('owner_cloud_base','');b.storage.setItem('owner_sync','');
 const old=Cloud.create({client:s.client,storage:b.storage,key:'owner',project:()=>({})});const resolved=await old.boot(two);
 assert.equal(resolved.classes[0].name,'Remote change');assert.equal(old.isConflict(),false);assert.equal(old.isDirty(),false);
 assert.equal(JSON.parse(b.storage.getItem('owner_unsent_recovery')).document.classes[0].name,'Offline change');assert.equal(s.row.document.classes[0].name,'Remote change');
});
test('an identical legacy dirty copy clears a false conflict without writing, even with different class navigation',async()=>{
 const s=server(),a=device(s),one=classState();one.classes.push(C.newClass('İkinci sınıf'));await a.cloud.boot(one);
 const b=device(s),two=clone(one);two.activeClassId=two.classes[1].id;
 b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true,conflict:true}));
 const result=await b.cloud.boot(two);assert.equal(result.activeClassId,two.activeClassId);assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);assert.equal(s.row.revision,1);
});
test('a legacy conflict marker clears automatically and subsequent remote changes arrive without a source choice',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);
 const b=device(s),two=clone(one);two.classes[0].name='Mobil sınıf';b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true,conflict:true}));const loaded=await b.cloud.boot(two);
 const before=s.row.revision,review=await b.cloud.inspect(loaded);assert.equal(review.resolved,true);assert.deepEqual(review.document,C.validate(one));assert.equal(s.row.revision,before);
 assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);assert.equal(await b.cloud.refresh(loaded),null);
 one.classes[0].name='Yeni sunucu sınıfı';a.cloud.markDirty(one);await a.cloud.save(one);const revision=s.row.revision;
 const resolved=await b.cloud.refresh(loaded);assert.deepEqual(resolved,C.validate(one));assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);assert.equal(s.row.revision,revision,'polling never creates another write');
});
test('equal totals with different unproven histories use exact database history and preserve the other history',async()=>{
 const s=server(),one=classState(),cl=one.classes[0];cl.tasks[1].points=1;C.ensureDay(cl.students[0],cl);const two=clone(one);
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);const c2=two.classes[0];C.awardBehavior(c2.students[0],c2,C.dayKey(),c2.tasks[1].id);
 const a=device(s),b=device(s);await a.cloud.boot(one);b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true}));const loaded=await b.cloud.boot(two);
 const review=await b.cloud.inspect(loaded);assert.equal(review.resolved,true);assert.deepEqual(review.document,C.validate(one));assert.equal(C.earned(review.document.classes[0].students[0]),1);
 assert.deepEqual(JSON.parse(b.storage.getItem('owner_recovery')),C.validate(two));assert.deepEqual(JSON.parse(b.storage.getItem('owner_cloud_recovery')),C.validate(one));assert.equal(s.row.revision,1);
});
test('legacy source-choice controls always take current database state and cannot replace a newer account',async()=>{
 for(const choice of ['local','remote']){
  const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=clone(one);two.classes[0].name='Mobil';const loaded=await b.cloud.boot(two);const review=await b.cloud.inspect(loaded),originalCloudRecovery=JSON.parse(b.storage.getItem('owner_cloud_recovery'));
  one.classes[0].name='Tahtadan yeni kayıt';a.cloud.markDirty(one);await a.cloud.save(one);
  const before=s.row.revision,result=await b.cloud.resolve(choice,loaded,review.revision);assert.equal(result.classes[0].name,'Tahtadan yeni kayıt');assert.equal(s.row.document.classes[0].name,'Tahtadan yeni kayıt');assert.equal(b.cloud.isConflict(),false);assert.equal(s.row.revision,before);
  assert.deepEqual(JSON.parse(b.storage.getItem('owner_recovery')),two);assert.deepEqual(JSON.parse(b.storage.getItem('owner_cloud_recovery')),originalCloudRecovery);
 }
});
test('a remote award arriving immediately before a write is merged with the local award instead of being overwritten',async()=>{
 const s=server(),a=device(s),one=classState(),cls=one.classes[0];cls.students.push(C.newStudent('Ada'));cls.students.forEach(p=>C.ensureDay(p,cls));await a.cloud.boot(one);
 const b=device(s),two=await b.cloud.boot(C.initialState()),local=two.classes[0];C.awardBehavior(local.students[0],local,C.dayKey(),local.tasks[0].id);b.cloud.markDirty(two);
 const rpc=s.client.rpc;let collide=true;s.client.rpc=async(name,args)=>{if(collide){collide=false;const incoming=clone(one),remote=incoming.classes[0];C.awardBehavior(remote.students[1],remote,C.dayKey(),remote.tasks[1].id);await rpc(name,{...args,p_document:incoming});}return rpc(name,args);};
 const merged=await b.cloud.save(two);assert.deepEqual(merged.classes[0].students.map(C.earned),[1,1]);assert.deepEqual(s.row.document.classes[0].students.map(C.earned),[1,1]);
 assert.deepEqual(merged.classes[0].students.map(p=>p.feeds.length),[1,1]);assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);
});
test('a legacy source choice made during a read preserves a newly entered point for automatic retry',async()=>{
 const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);
 let local=clone(one);local.classes[0].name='Mobil';const d=device(s),cloud=Cloud.create({client:s.client,storage:d.storage,key:'owner',getState:()=>local,project:()=>({})});local=await cloud.boot(local);const review=await cloud.inspect(local);
 const from=s.client.from;let release;s.client.from=()=>({select:()=>({maybeSingle:async()=>{await new Promise(r=>release=r);return {data:s.row};}})});
 const pending=cloud.resolve('remote',local,review.revision);await new Promise(r=>setImmediate(r));const c=local.classes[0];C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[0].id);cloud.markDirty(local);release();
 const preserved=await pending;assert.equal(C.earned(preserved.classes[0].students[0]),1);assert.equal(cloud.isDirty(),true);s.client.from=from;
 local=await cloud.refresh(local);assert.equal(C.earned(local.classes[0].students[0]),1);assert.equal(C.earned(s.row.document.classes[0].students[0]),1);assert.equal(cloud.isDirty(),false);
});
test('automatic retry keeps the pending record while offline and clears dirty state only after server acknowledgement',async()=>{
 for(const choice of ['local','remote']){
  const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);const b=device(s),two=await b.cloud.boot(C.initialState());
  const local=two.classes[0];C.awardBehavior(local.students[0],local,C.dayKey(),local.tasks[0].id);b.cloud.markDirty(two);
  s.offline=true;await assert.rejects(b.cloud.resolve(choice,two));assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),true);await b.cloud.flushCache();
  assert.equal(C.earned(JSON.parse(b.storage.getItem('owner_sync')).document.classes[0].students[0]),1);assert.equal(C.earned(s.row.document.classes[0].students[0]),0);s.offline=false;
  const result=await b.cloud.resolve(choice,two);assert.equal(C.earned(result.classes[0].students[0]),1);assert.equal(b.cloud.isDirty(),false);assert.equal(C.earned(s.row.document.classes[0].students[0]),1);
  assert.equal(b.storage.getItem('owner_before_sync_choice'),null,'legacy choice calls no longer create full replacement snapshots');
 }
});
test('a stalled request times out and releases the sync operation so a later retry can succeed',async()=>{
 let stalled=true;const s=server(),real=s.client.from;s.client.from=(...args)=>stalled?{select:()=>({maybeSingle:()=>new Promise(()=>{})})}:real(...args);
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 const cloud=Cloud.create({client:s.client,storage,key:'timed',project:()=>({}),timeoutMs:20});
 await assert.rejects(cloud.boot(classState()),/yeniden denenecek/);stalled=false;const one=classState();await cloud.boot(one);assert.equal(cloud.isReady(),true);
});
test('unchanged accounts poll only the revision, scope reads to the signed-in owner and avoid writes',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);
 const calls=[];s.client.from=table=>({select:fields=>({eq(field,id){calls.push({table,fields,field,id});return this;},async maybeSingle(){return {data:fields==='revision'?{revision:s.row.revision}:s.row};}})});
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 const cloud=Cloud.create({client:s.client,storage,key:'test',ownerId:'teacher-id',project:()=>({})});const local=await cloud.boot(C.initialState());calls.length=0;
 const before=s.row.revision;assert.equal(await cloud.refresh(local),null);assert.deepEqual(calls,[{table:'aquarium_accounts',fields:'revision',field:'owner_id',id:'teacher-id'}]);assert.equal(s.row.revision,before);
 const html=require('node:fs').readFileSync('ogretmen/akvaryum.html','utf8');
 assert.ok(html.indexOf('/js/akvaryum-core.js')<html.indexOf('/js/akvaryum-sync-merge.js'));
 assert.ok(html.indexOf('/js/akvaryum-sync-merge.js')<html.indexOf('/js/akvaryum-cloud.js'));
});
test('a delayed clean read cannot erase a local point entered while the request was in flight',async()=>{
 const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);
 const b=device(s),two=await b.cloud.boot(C.initialState());one.classes[0].name='Yeni ad';a.cloud.markDirty(one);await a.cloud.save(one);
 const real=s.client.from;let release,first=true;s.client.from=(...args)=>first?(first=false,{select:()=>({maybeSingle:async()=>{await new Promise(r=>release=r);return {data:s.row};}})}):real(...args);
 const pending=b.cloud.refresh(two);await new Promise(r=>setImmediate(r));const c=two.classes[0];C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[0].id);b.cloud.markDirty(two);release();assert.equal(await pending,null);
 const merged=await b.cloud.refresh(two);assert.equal(merged.classes[0].name,'Yeni ad');assert.equal(C.earned(merged.classes[0].students[0]),1);
});

test('legacy 40001 is reconciled during rollout; PT409 retries are bounded and keep the local copy',async()=>{
 for(const code of ['40001','PT409']){
  const s=server(code),a=device(s),b=device(s),one=classState();await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
  one.classes[0].name='Sunucu';a.cloud.markDirty();await a.cloud.save(one);
  two.settings.volume=.27;b.cloud.markDirty();const merged=await b.cloud.save(two);
  assert.equal(merged.classes[0].name,'Sunucu');assert.equal(merged.settings.volume,.27);
 }
 const s=server(),d=device(s),local=classState();await d.cloud.boot(local);local.classes[0].name='Yerel';d.cloud.markDirty();
 let calls=0;s.client.rpc=async()=>{calls++;return {error:{code:'PT409'}};};
 await assert.rejects(d.cloud.save(local),/Yeni puanlar korunuyor/);assert.equal(calls,3);assert.equal(d.cloud.isDirty(),true);
 assert.equal(s.row.document.classes[0].name,'Birincilerim');
});

test('independent class additions with a known baseline merge without resurrecting unproven legacy classes',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState();await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
 one.classes.push(C.newClass('Tahtadan eklenen'));a.cloud.markDirty(one);await a.cloud.save(one);
 two.classes.push(C.newClass('Telefondan eklenen'));b.cloud.markDirty(two);const merged=await b.cloud.save(two);
 assert.deepEqual(new Set(merged.classes.map(c=>c.name)),new Set(['Birincilerim','Tahtadan eklenen','Telefondan eklenen']));
 assert.equal(s.row.document.classes.length,3);assert.equal(b.cloud.isDirty(),false);assert.equal(b.cloud.isConflict(),false);
});

test('an unreadable device cache loads an existing database account but cannot create an empty replacement',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),before=s.row.revision;
 assert.deepEqual(await b.cloud.boot(C.initialState(),{cacheUnavailable:true}),C.validate(one));assert.equal(s.row.revision,before);
 const empty=server(),c=device(empty);await assert.rejects(c.cloud.boot(C.initialState(),{cacheUnavailable:true}),/cihaz kopyası okunamadı/);
 assert.equal(empty.row,null);assert.equal(c.cloud.isReady(),false);
});

test('full browser storage does not block database hydration or acknowledged point writes',async()=>{
 const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);
 const storage={getItem(){return null;},setItem(){const error=Error('Quota exceeded');error.name='QuotaExceededError';throw error;}};
 const cloud=Cloud.create({client:s.client,storage,key:'full',project:()=>({})});const local=await cloud.boot(C.initialState()),cls=local.classes[0];
 C.awardBehavior(cls.students[0],cls,C.dayKey(),cls.tasks[0].id);cloud.markDirty(local);const result=await cloud.save(local);
 assert.equal(C.earned(result.classes[0].students[0]),1);assert.equal(C.earned(s.row.document.classes[0].students[0]),1);assert.equal(cloud.isReady(),true);assert.equal(cloud.isDirty(),false);
});

test('reload recovers an unsent award from the atomic sync envelope when the primary cache write was interrupted',async()=>{
 const s=server(),a=device(s),one=classState(),cls=one.classes[0];C.ensureDay(cls.students[0],cls);await a.cloud.boot(one);
 const oldPrimary=clone(one),pending=clone(one),pupil=pending.classes[0];C.awardBehavior(pupil.students[0],pupil,C.dayKey(),pupil.tasks[0].id);
 const store=a.storage.setItem.bind(a.storage);a.storage.setItem=(key,value)=>{if(key==='owner')throw Error('Primary cache interrupted');store(key,value);};
 a.cloud.markDirty(pending);await a.cloud.flushCache();
 const reopened=Cloud.create({client:s.client,storage:a.storage,key:'owner',project:()=>({})});const restored=await reopened.boot(oldPrimary);
 assert.equal(C.earned(restored.classes[0].students[0]),1);assert.equal(C.earned(s.row.document.classes[0].students[0]),1);assert.equal(reopened.isDirty(),false);
});

test('a newer fallback pending document survives when the atomic envelope could not be updated',async()=>{
 const s=server(),a=device(s),one=classState(),cls=one.classes[0];C.ensureDay(cls.students[0],cls);await a.cloud.boot(one);
 const store=a.storage.setItem.bind(a.storage);a.storage.setItem=(key,value)=>{if(key==='owner_sync')throw Error('Atomic store unavailable');store(key,value);};
 const pending=clone(one),c=pending.classes[0];C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[0].id);a.cloud.markDirty(pending);await a.cloud.flushCache();
 const reopened=Cloud.create({client:s.client,storage:a.storage,key:'owner',project:()=>({})});const restored=await reopened.boot(JSON.parse(a.storage.getItem('owner')));
 assert.equal(C.earned(restored.classes[0].students[0]),1);assert.equal(C.earned(s.row.document.classes[0].students[0]),1);assert.equal(reopened.isDirty(),false);
});

test('automatic retries never create an empty account after an unreadable cache and missing server record',async()=>{
 const s=server(),d=device(s),empty=C.initialState();await assert.rejects(d.cloud.boot(empty,{cacheUnavailable:true}),/cihaz kopyası okunamadı/);
 await assert.rejects(d.cloud.refresh(empty),/cihaz kopyası okunamadı/);await assert.rejects(d.cloud.refresh(empty),/cihaz kopyası okunamadı/);
 assert.equal(s.row,null);assert.equal(d.cloud.isReady(),false);
});
