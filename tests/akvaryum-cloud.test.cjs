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
test('stale device cannot overwrite a newer revision and both copies can be recovered',async()=>{
 const s=server(),a=device(s),b=device(s),local=classState();await a.cloud.boot(local);const other=await b.cloud.boot(C.initialState());
 local.classes[0].name='Yeni ad';a.cloud.markDirty();await a.cloud.save(local);
 other.classes[0].name='Çevrimdışı ad';b.cloud.markDirty();await assert.rejects(b.cloud.save(other),/Diğer cihaz/);
 assert.equal(s.row.document.classes[0].name,'Yeni ad');assert.equal(b.cloud.isConflict(),true);assert.equal(JSON.parse(b.storage.getItem('owner_recovery')).classes[0].name,'Çevrimdışı ad');
 const resolved=await b.cloud.resolve('remote',other);assert.equal(resolved.classes[0].name,'Yeni ad');
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
test('distinct older local classes merge without discarding either device; conflicting class ids require selection',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),two=classState();await a.cloud.boot(one);const combined=await b.cloud.boot(two);assert.equal(combined.classes.length,2);
 const c=device(s),stale=clone(one);stale.classes[0].name='Eski ad';await c.cloud.boot(stale);assert.equal(c.cloud.isConflict(),true);assert.equal(s.row.document.classes[0].name,'Birincilerim');
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
test('legacy first rewards that reuse a template id remain protected from ambiguous merging',async()=>{
 const s=server(),a=device(s),b=device(s),one=classState(),c=one.classes[0];C.ensureDay(c.students[0],c);await a.cloud.boot(one);const two=await b.cloud.boot(C.initialState());
 for(const doc of [one,two]){const cl=doc.classes[0];C.completeAndFeed(cl.students[0],C.dayKey(),cl.tasks[0].id);}
 a.cloud.markDirty(one);await a.cloud.save(one);b.cloud.markDirty(two);await assert.rejects(b.cloud.save(two),/çakışan/);assert.equal(s.row.document.classes[0].students[0].feeds.length,1);
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
test('legacy dirty conflicts keep both documents and never guess a missing common revision',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=await b.cloud.boot(C.initialState());
 b.storage.setItem('owner_cloud_base','');one.classes[0].name='Remote change';a.cloud.markDirty(one);await a.cloud.save(one);
 two.classes[0].name='Offline change';b.cloud.markDirty(two);
 const old=Cloud.create({client:s.client,storage:b.storage,key:'owner',project:()=>({})});assert.deepEqual(await old.boot(two),two);assert.equal(old.isConflict(),true);
 assert.equal(JSON.parse(b.storage.getItem('owner_cloud_recovery')).classes[0].name,'Remote change');assert.equal(s.row.document.classes[0].name,'Remote change');
});
test('an identical legacy dirty copy clears a false conflict without writing, even with different class navigation',async()=>{
 const s=server(),a=device(s),one=classState();one.classes.push(C.newClass('İkinci sınıf'));await a.cloud.boot(one);
 const b=device(s),two=clone(one);two.activeClassId=two.classes[1].id;
 b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true,conflict:true}));
 const result=await b.cloud.boot(two);assert.equal(result.activeClassId,two.activeClassId);assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);assert.equal(s.row.revision,1);
});
test('retry re-reads a legacy conflict and clears it only after the entire account matches',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);
 const b=device(s),two=clone(one);two.classes[0].name='Mobil sınıf';b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true}));await b.cloud.boot(two);
 const before=s.row.revision,review=await b.cloud.inspect(two);assert.equal(review.resolved,false);assert.deepEqual(review.local,C.validate(two));assert.deepEqual(review.remote,C.validate(one));assert.equal(s.row.revision,before);
 await assert.rejects(b.cloud.refresh(two),/Diğer cihaz/);assert.equal(b.cloud.isDirty(),true);
 a.cloud.markDirty(two);await a.cloud.save(two);const revision=s.row.revision;
 const resolved=await b.cloud.refresh(two);assert.deepEqual(resolved,C.validate(two));assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);assert.equal(s.row.revision,revision,'retry acknowledges equality without another write');
});
test('equal totals with different awarded histories remain a real conflict and keep both backups',async()=>{
 const s=server(),one=classState(),cl=one.classes[0];cl.tasks[1].points=1;C.ensureDay(cl.students[0],cl);const two=clone(one);
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);const c2=two.classes[0];C.awardBehavior(c2.students[0],c2,C.dayKey(),c2.tasks[1].id);
 const a=device(s),b=device(s);await a.cloud.boot(one);b.storage.setItem('owner_cloud',JSON.stringify({revision:0,dirty:true}));await b.cloud.boot(two);
 const review=await b.cloud.inspect(two);assert.equal(review.resolved,false);assert.equal(C.earned(review.local.classes[0].students[0]),C.earned(review.remote.classes[0].students[0]));
 assert.deepEqual(JSON.parse(b.storage.getItem('owner_recovery')),C.validate(two));assert.deepEqual(JSON.parse(b.storage.getItem('owner_cloud_recovery')),C.validate(one));assert.equal(s.row.revision,1);
});
test('a whole-account choice rejects a changed cloud revision rather than replacing newer points',async()=>{
 for(const choice of ['local','remote']){
  const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=clone(one);two.classes[0].name='Mobil';await b.cloud.boot(two);const review=await b.cloud.inspect(two);
  one.classes[0].name='Tahtadan yeni kayıt';a.cloud.markDirty(one);await a.cloud.save(one);
  await assert.rejects(b.cloud.resolve(choice,two,review.revision),e=>e.code==='SYNC_REVIEW_STALE');assert.equal(s.row.document.classes[0].name,'Tahtadan yeni kayıt');assert.equal(b.cloud.isConflict(),true);
  assert.deepEqual(JSON.parse(b.storage.getItem('owner_recovery')),two);assert.deepEqual(JSON.parse(b.storage.getItem('owner_cloud_recovery')),C.validate(one));
 }
});
test('an intervening write between comparison check and replacement cannot be silently merged or overwritten',async()=>{
 const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=clone(one);two.classes[0].name='Mobil';await b.cloud.boot(two);const review=await b.cloud.inspect(two);
 const rpc=s.client.rpc;let collide=true;s.client.rpc=async(name,args)=>{if(collide){collide=false;const incoming=clone(one);incoming.classes[0].name='Yeni uzak kayıt';await rpc(name,{...args,p_document:incoming});}return rpc(name,args);};
 await assert.rejects(b.cloud.resolve('local',two,review.revision),e=>e.code==='SYNC_REVIEW_STALE');assert.equal(s.row.document.classes[0].name,'Yeni uzak kayıt');assert.equal(b.cloud.isConflict(),true);assert.equal(b.cloud.isDirty(),true);
});
test('choosing the cloud copy refuses to erase a local point made during its read',async()=>{
 const s=server(),a=device(s),one=classState(),cl=one.classes[0];C.ensureDay(cl.students[0],cl);await a.cloud.boot(one);
 let local=clone(one);local.classes[0].name='Mobil';const d=device(s),cloud=Cloud.create({client:s.client,storage:d.storage,key:'owner',getState:()=>local,project:()=>({})});await cloud.boot(local);const review=await cloud.inspect(local);
 const from=s.client.from;let release;s.client.from=()=>({select:()=>({maybeSingle:async()=>{await new Promise(r=>release=r);return {data:s.row};}})});
 const pending=cloud.resolve('remote',local,review.revision);await new Promise(r=>setImmediate(r));const c=local.classes[0];C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[0].id);cloud.markDirty(local);release();
 await assert.rejects(pending,e=>e.code==='SYNC_REVIEW_STALE');assert.equal(C.earned(JSON.parse(d.storage.getItem('owner_recovery')).classes[0].students[0]),1);assert.equal(cloud.isDirty(),true);s.client.from=from;
});
test('a confirmed unchanged source clears conflict and dirty flags only after success, retaining both recovery copies',async()=>{
 for(const choice of ['local','remote']){
  const s=server(),a=device(s),one=classState();await a.cloud.boot(one);const b=device(s),two=clone(one);two.classes[0].name='Mobil';await b.cloud.boot(two);const review=await b.cloud.inspect(two);
  s.offline=true;await assert.rejects(b.cloud.resolve(choice,two,review.revision));assert.equal(b.cloud.isConflict(),true);assert.equal(b.cloud.isDirty(),true);s.offline=false;
  const result=await b.cloud.resolve(choice,two,review.revision);assert.equal(result.classes[0].name,choice==='local'?'Mobil':'Birincilerim');assert.equal(b.cloud.isConflict(),false);assert.equal(b.cloud.isDirty(),false);
  assert.deepEqual(JSON.parse(b.storage.getItem('owner_recovery')),two);assert.deepEqual(JSON.parse(b.storage.getItem('owner_cloud_recovery')),C.validate(one));
  const next=s.row.document,c=next.classes[0];C.ensureDay(c.students[0],c);C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[0].id);a.cloud.markDirty(next);await a.cloud.save(next);await b.cloud.refresh(result);
  const preserved=JSON.parse(b.storage.getItem('owner_before_sync_choice'));assert.deepEqual(preserved.local,two);assert.deepEqual(preserved.remote,C.validate(one));
 }
});
test('a stalled request times out and releases the sync operation so a later retry can succeed',async()=>{
 let stalled=true;const s=server(),real=s.client.from;s.client.from=(...args)=>stalled?{select:()=>({maybeSingle:()=>new Promise(()=>{})})}:real(...args);
 const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 const cloud=Cloud.create({client:s.client,storage,key:'timed',project:()=>({}),timeoutMs:20});
 await assert.rejects(cloud.boot(classState()),/zaman aşımı/);stalled=false;const one=classState();await cloud.boot(one);assert.equal(cloud.isReady(),true);
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
 await assert.rejects(d.cloud.save(local),/Yerel puanlar korunuyor/);assert.equal(calls,3);assert.equal(d.cloud.isDirty(),true);
 assert.equal(s.row.document.classes[0].name,'Birincilerim');
});
