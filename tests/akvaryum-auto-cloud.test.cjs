const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),Cloud=require('../js/akvaryum-cloud.js');
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
const date='2026-10-21';
function initial(){const state=C.initialState(),classroom=state.classes[0];classroom.seasonStartedOn='2026-09-01';classroom.students=[C.newStudent('Ada'),C.newStudent('Ece'),C.newStudent('Deniz')];classroom.students.forEach(s=>C.ensureDay(s,classroom,date));return state;}
function award(state,pupil=0,behavior=0){const c=state.classes[0];C.ensureDay(c.students[pupil],c,date);return C.awardBehavior(c.students[pupil],c,date,c.tasks[behavior].id);}
const totals=state=>state.classes[0].students.map(C.earned);
function server(){
 let row=null,offline=false,beforeRpc=null,afterRpc=null;const calls=[];
 const srv={calls,get row(){return clone(row);},set offline(value){offline=value;},set beforeRpc(value){beforeRpc=value;},set afterRpc(value){afterRpc=value;},
  client:{from:()=>({select(fields){return {eq(){return this;},async maybeSingle(){if(offline)return {error:{code:'OFFLINE'}};return {data:row?(fields==='revision'?{revision:row.revision}:clone(row)):null};}};} }),async rpc(name,args){calls.push(clone(args));if(beforeRpc)await beforeRpc(name,args);if(offline)return {error:{code:'OFFLINE'}};if(args.p_revision!==(row?.revision||0))return {error:{code:'PT409'}};row={document:clone(args.p_document),revision:(row?.revision||0)+1};const response={data:row.revision};if(afterRpc)await afterRpc(name,args,response);return response;}}
 };return srv;
}
function persistence(){const values=new Map();return {values,beforeWrite:null,async read(name){return clone(values.get(name)??null);},async write(name,value){if(this.beforeWrite)await this.beforeWrite(name,clone(value));values.set(name,clone(value));return true;}};}
function device(srv,{cache=persistence(),storage}={}){
 let state=initial();const d={cache,get state(){return state;},set state(value){state=value;}};
 d.cloud=Cloud.create({client:srv.client,persistence:storage?undefined:cache,storage,key:'owner',ownerId:'teacher',project:()=>({}),getState:()=>state});
 d.open=async local=>state=await d.cloud.boot(local||state);
 d.award=(pupil=0,behavior=0)=>{const result=award(state,pupil,behavior);d.cloud.markDirty(state);return result;};
 d.save=async()=>state=await d.cloud.save(state);d.refresh=async()=>{const result=await d.cloud.refresh(state);if(result)state=result;return result;};return d;
}

test('automatic three-device concurrent awards converge with no manual source choice or duplicate feeds',async()=>{
 const srv=server(),a=device(srv),b=device(srv),c=device(srv);await a.open();await b.open();await c.open();
 a.award(0);b.award(1);c.award(2);await Promise.all([a.save(),b.save(),c.save()]);
 for(const d of [a,b,c]){await d.refresh();assert.deepEqual(totals(d.state),[1,1,1]);assert.equal(d.cloud.isDirty(),false);assert.equal(d.cloud.isConflict(),false);}
 const feeds=srv.row.document.classes[0].students.flatMap(s=>s.feeds);assert.equal(feeds.length,3);assert.equal(new Set(feeds.map(f=>f.id)).size,3);
});

test('offline pending events and acknowledged baseline survive a reload and merge with remote awards',async()=>{
 const srv=server(),a=device(srv),b=device(srv);await a.open();await b.open();srv.offline=true;b.award(1);await assert.rejects(b.save());await b.cloud.flushCache();
 const envelope=clone(b.cache.values.get('sync'));assert.equal(envelope.meta.dirty,true);assert.deepEqual(totals(envelope.base.document),[0,0,0]);
 srv.offline=false;a.award(0);await a.save();const reopened=device(srv,{cache:b.cache});await reopened.open(envelope.document);
 assert.deepEqual(totals(reopened.state),[1,1,0]);assert.deepEqual(totals(srv.row.document),[1,1,0]);assert.equal(reopened.cloud.isDirty(),false);
});

test('full localStorage never throws or blocks database acknowledgement and automatic recovery',async()=>{
 const srv=server(),storage={getItem:()=>null,setItem(){throw Object.assign(Error('Quota exceeded'),{name:'QuotaExceededError'});}},d=device(srv,{storage});
 await d.open();d.award();await d.save();assert.equal(d.cloud.isDirty(),false);assert.deepEqual(totals(srv.row.document),[1,0,0]);
 const other=device(srv);await other.open();other.award(1);await other.save();await d.refresh();assert.deepEqual(totals(d.state),[1,1,0]);
});

test('a missing baseline archives stale unsent data and never resurrects remotely deleted reward history',async()=>{
 const srv=server(),a=device(srv);await a.open();a.award();await a.save();const stale=clone(a.state);
 const c=a.state.classes[0],student=c.students[0],id=student.days[date].tasks.find(t=>t.status==='done').id;
 C.correctAward(student,date,id,true);a.cloud.markDirty(a.state);await a.save();
 const cache=persistence();cache.values.set('meta',{dirty:true,conflict:true});const old=device(srv,{cache});await old.open(stale);
 assert.deepEqual(totals(old.state),[0,0,0]);assert.equal(old.cloud.isConflict(),false);assert.equal(old.cloud.isDirty(),false);
 assert.deepEqual(totals(cache.values.get('unsent_recovery').document),[1,0,0]);assert.deepEqual(totals(srv.row.document),[0,0,0]);
});

test('a click while a conflicting write is in flight rebases from the UI origin and preserves remote additions',async()=>{
 const srv=server(),a=device(srv),b=device(srv);await a.open();await b.open();a.award(0);await a.save();b.award(1);
 const entered=deferred(),release=deferred();let once=true;srv.beforeRpc=async()=>{if(once){once=false;entered.resolve();await release.promise;}};
 const save=b.save();await entered.promise;b.award(1,1);release.resolve();await save;
 assert.deepEqual(totals(b.state),[1,2,0]);assert.equal(b.cloud.isDirty(),true);await b.refresh();assert.deepEqual(totals(srv.row.document),[1,2,0]);
});

test('a click during an IndexedDB checkpoint survives returned UI state and the next automatic save',async()=>{
 const srv=server(),a=device(srv),b=device(srv);await a.open();await b.open();a.award(0);await a.save();b.award(1);await b.cloud.flushCache();
 const entered=deferred(),release=deferred();let once=true;b.cache.beforeWrite=async(name,value)=>{if(once&&name==='sync'&&!value.meta.dirty){once=false;entered.resolve();await release.promise;}};
 const save=b.save();await entered.promise;b.award(1,1);release.resolve();await save;
 assert.deepEqual(totals(b.state),[1,2,0]);assert.equal(b.cloud.isDirty(),true);await b.cloud.flushCache();await b.refresh();assert.deepEqual(totals(srv.row.document),[1,2,0]);
});

test('a queued second save cannot erase an external award introduced by the first merged save',async()=>{
 const srv=server(),a=device(srv),b=device(srv);await a.open();await b.open();a.award(0);await a.save();b.award(1);
 const entered=deferred(),release=deferred();let once=true;srv.beforeRpc=async()=>{if(once){once=false;entered.resolve();await release.promise;}};
 const first=b.cloud.save(b.state);await entered.promise;b.award(1,1);const second=b.cloud.save(b.state);release.resolve();
 await first;b.state=await second;assert.deepEqual(totals(srv.row.document),[1,2,0]);assert.deepEqual(totals(b.state),[1,2,0]);
});

test('every durable checkpoint pairs the pending document with the UI baseline that actually produced it',async()=>{
 const srv=server(),a=device(srv),b=device(srv);await a.open();await b.open();a.award(0);await a.save();b.award(1);await tick();await b.cloud.flushCache();
 const entered=deferred(),release=deferred(),envelopes=[];let once=true;
 b.cache.beforeWrite=async(name,value)=>{
  if(name!=='sync')return;
  if(once&&!value.meta.dirty){once=false;entered.resolve();await release.promise;}
  envelopes.push(clone(value));
 };
 const saving=b.save();await entered.promise;b.award(1,1);await tick();release.resolve();await saving;await b.cloud.flushCache();
 const unsafe=envelopes.find(e=>e.meta.dirty&&e.base&&totals(e.base.document)[0]===1&&totals(e.document)[0]===0);
 assert.equal(unsafe,undefined,'a crash after this envelope would replay a remote award as a local deletion');
});

test('a click during initial checkpoint hydration is included even if the caller supplied an immutable old snapshot',async()=>{
 const srv=server(),a=device(srv);await a.open();const cache=persistence();for(const [key,value]of a.cache.values)cache.values.set(key,clone(value));
 const entered=deferred(),release=deferred(),read=cache.read;let once=true;cache.read=async function(name){if(once&&name==='sync'){once=false;entered.resolve();await release.promise;}return read.call(this,name);};
 const b=device(srv,{cache});b.state=clone(a.state);const starting=b.open(clone(b.state));await entered.promise;b.award(1);release.resolve();await starting;
 assert.deepEqual(totals(b.state),[0,1,0]);assert.deepEqual(totals(srv.row.document),[0,1,0]);
});

test('a lost acknowledgement is reconciled once and never creates a duplicate point or feeding',async()=>{
 const srv=server(),a=device(srv);await a.open();let once=true;srv.afterRpc=async()=>{if(once){once=false;throw Error('Response lost');}};
 a.award(0);await assert.rejects(a.save());assert.equal(a.cloud.isDirty(),true);await a.refresh();
 assert.deepEqual(totals(a.state),[1,0,0]);assert.equal(a.state.classes[0].students[0].feeds.length,1);assert.equal(a.cloud.isDirty(),false);
});

test('three devices awarding the same first behavior to the same pupil retain all separate event IDs',async()=>{
 const srv=server(),devices=[device(srv),device(srv),device(srv)];for(const d of devices)await d.open();
 devices.forEach(d=>d.award());await Promise.all(devices.map(d=>d.save()));
 for(const d of devices)await d.refresh();
 assert.deepEqual(totals(srv.row.document),[3,0,0]);const student=srv.row.document.classes[0].students[0];
 assert.equal(student.feeds.length,3);assert.equal(new Set(student.days[date].tasks.filter(t=>t.status==='done').map(t=>t.id)).size,3);
 const revision=srv.row.revision;for(const d of devices)assert.equal(await d.refresh(),null);assert.equal(srv.row.revision,revision);
});

test('an atomic checkpoint explicitly missing its base never borrows an unrelated leftover legacy baseline',async()=>{
 const srv=server(),a=device(srv);await a.open();const oldBase=clone(a.cache.values.get('base'));a.award();await a.save();const stale=clone(a.state);
 const c=a.state.classes[0],student=c.students[0],id=student.days[date].tasks.find(t=>t.status==='done').id;C.correctAward(student,date,id,true);a.cloud.markDirty(a.state);await a.save();
 const cache=persistence();cache.values.set('base',oldBase);cache.values.set('sync',{document:stale,base:null,meta:{dirty:true,revision:0}});
 const b=device(srv,{cache});await b.open(stale);assert.deepEqual(totals(b.state),[0,0,0]);assert.deepEqual(totals(srv.row.document),[0,0,0]);
});
