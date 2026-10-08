const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../js/akvaryum-core.js'),Cloud=require('../js/akvaryum-cloud.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function server(){let row=null,offline=false;return {get row(){return clone(row);},set offline(v){offline=v;},client:{from:()=>({select:()=>({maybeSingle:async()=>offline?{error:{}}:{data:clone(row)}})}),rpc:async(name,args)=>{if(offline)return {error:{}};if(args.p_revision!==(row?.revision||0))return {error:{code:'40001'}};row={document:clone(args.p_document),revision:(row?.revision||0)+1};return {data:row.revision};}}};}
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
test('script dependencies load before audio and core; all 30 fish and 4 other creatures have assets',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('ogretmen/akvaryum.html','utf8');assert.ok(html.indexOf('/js/akvaryum-sounds.js')<html.indexOf('/js/akvaryum-audio.js'));assert.ok(html.indexOf('/js/akvaryum-sounds.js')<html.indexOf('/js/akvaryum-core.js'));assert.equal(C.SPECIES.length,34);assert.equal(new Set(C.SPECIES.map(s=>s.id)).size,34);for(const s of C.SPECIES)assert.ok(fs.existsSync('assets/akvaryum/canlilar/'+s.file));
});
