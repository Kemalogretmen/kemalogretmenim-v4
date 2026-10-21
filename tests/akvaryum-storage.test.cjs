const {test}=require('node:test');
const assert=require('node:assert/strict');
const Storage=require('../js/akvaryum-storage.js');

function localStore(initial={}){
  const data=new Map(Object.entries(initial));
  return {data,fail:false,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail){const e=Error('Quota exceeded');e.name='QuotaExceededError';throw e;}data.set(k,String(v));},removeItem:k=>data.delete(k)};
}

// Transactional test double: request success deliberately occurs before commit.
// Aborted writes never reach the shared map, as with real IndexedDB.
function database(){
  const records=new Map(),created=new Set(),control={failWrites:false,blocked:false};
  const db={objectStoreNames:{contains:n=>created.has(n)},createObjectStore:n=>created.add(n),close(){},
    transaction(name,mode){
      const tx={error:null,aborted:false,abort(){this.aborted=true;this.onabort?.();}};
      const next=new Map(records);
      tx.objectStore=()=>Object.fromEntries(['get','put','delete'].map(operation=>[operation,(...args)=>{
        const request={};
        setImmediate(()=>{
          if(tx.aborted)return;
          if(operation==='get')request.result=next.get(args[0]);
          if(operation==='put')next.set(args[1],args[0]);
          if(operation==='delete')next.delete(args[0]);
          request.onsuccess?.();
          setImmediate(()=>{
            if(tx.aborted)return;
            if(mode==='readwrite'&&control.failWrites){tx.error=Error('IndexedDB quota exceeded');tx.error.name='QuotaExceededError';tx.aborted=true;tx.onabort?.();return;}
            if(mode==='readwrite'){records.clear();for(const [k,v] of next)records.set(k,v);}
            tx.oncomplete?.();
          });
        });
        return request;
      }]));
      return tx;
    }};
  const indexedDB={open(){const request={};setImmediate(()=>{if(control.blocked){request.onblocked?.();return;}request.result=db;if(!created.size)request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
  return {indexedDB,records,control};
}
const record=(key,name)=>JSON.stringify([key,name]);

test('legacy account and recovery snapshots migrate only after durable commits, without touching auth or another account',async()=>{
  const values={classes:[{name:'Birincilerim',points:21}]},storage=localStore({
    owner:JSON.stringify(values),owner_cloud:'{"dirty":true,"revision":2}',owner_cloud_base:'{"revision":2,"document":{"classes":[]}}',
    owner_recovery:'{"source":"local"}',owner_cloud_recovery:'{"source":"cloud"}',owner_before_sync_choice:'{"source":"choice"}',
    'sb-auth-token':'keep-token',another:'keep-another-account',owner_sync:'{"base":null,"meta":{"dirty":true}}'});
  const idb=database(),adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  assert.deepEqual(await adapter.load(),values);
  assert.deepEqual(await adapter.read('meta'),{dirty:true,revision:2});
  assert.equal(idb.records.size,7);assert.equal(adapter.isDurable(),true);
  assert.deepEqual([...storage.data.entries()],[['sb-auth-token','keep-token'],['another','keep-another-account']]);
  assert.deepEqual(await adapter.read('before_sync_choice'),{source:'choice'});
});

test('a quota error in optional recovery never prevents a primary save and does not delete existing data',async()=>{
  const storage=localStore({owner:'{"points":4}','sb-auth-token':'preserve',other_owner:'{"points":90}'});
  const adapter=Storage.create({key:'owner',storage,indexedDB:null});
  assert.deepEqual(await adapter.load(),{points:4});storage.fail=true;
  assert.equal(await adapter.write('before_sync_choice',{local:{points:5}}),false);
  assert.equal(await adapter.save({points:5}),false);
  assert.deepEqual(await adapter.load(),{points:5},'unsent changes remain available in memory');
  assert.equal(storage.getItem('owner'),'{"points":4}','previous durable primary is preserved');
  assert.equal(storage.getItem('sb-auth-token'),'preserve');assert.equal(storage.getItem('other_owner'),'{"points":90}');
  assert.equal(adapter.isDurable(),false);assert.equal(adapter.lastError().name,'QuotaExceededError');
  storage.fail=false;assert.equal(await adapter.save({points:5}),true);assert.equal(adapter.isDurable(),true);
});

test('IndexedDB saves an account when localStorage is full and optional snapshot limits never cap primary points',async()=>{
  const storage=localStore({'sb-auth-token':'preserve'});storage.fail=true;
  const idb=database(),adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB,maxRecoveryBytes:100});
  const document={points:Array.from({length:1000},(_,id)=>({id,points:1}))};
  assert.equal(await adapter.write('recovery',document),false);
  assert.equal(adapter.lastError().code,'AQUARIUM_RECOVERY_LIMIT');
  assert.equal(await adapter.save(document),true);assert.deepEqual(await adapter.load(),document);
  assert.equal(storage.getItem('sb-auth-token'),'preserve');assert.equal(idb.records.size,1);
});

test('migration preserves legacy data if a request succeeds but its transaction later aborts',async()=>{
  const storage=localStore({owner:'{"points":7}',owner_cloud:'{"dirty":true}'}),idb=database();idb.control.failWrites=true;
  const adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  assert.deepEqual(await adapter.load(),{points:7});assert.equal(storage.getItem('owner'),'{"points":7}');assert.equal(idb.records.size,0);
  storage.fail=true;assert.equal(await adapter.save({points:8}),false);
  assert.equal(storage.getItem('owner'),'{"points":7}');assert.deepEqual(await adapter.load(),{points:8});
});

test('a local fallback is preferred over a stale IndexedDB checkpoint after reload and migrates back safely',async()=>{
  const storage=localStore(),idb=database();
  const first=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});assert.equal(await first.save({points:3}),true);
  idb.control.failWrites=true;assert.equal(await first.save({points:4}),true);
  assert.equal(JSON.parse(idb.records.get(record('owner','document'))).points,3);
  assert.deepEqual(await first.load(),{points:4});
  idb.control.failWrites=false;
  const reload=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});assert.deepEqual(await reload.load(),{points:4});
  assert.equal(JSON.parse(idb.records.get(record('owner','document'))).points,4);
  assert.equal(storage.getItem('owner'),null);assert.equal(storage.getItem('owner_storage_pending'),null);
});

test('a failed fallback write cannot mark a previous local document as the newest checkpoint',async()=>{
  const storage=localStore(),idb=database(),adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  assert.equal(await adapter.save({points:10}),true);
  storage.setItem('owner','{"points":2}');
  const setItem=storage.setItem;storage.setItem=function(k,v){if(k==='owner'){const e=Error('Quota');e.name='QuotaExceededError';throw e;}return setItem.call(this,k,v);};
  idb.control.failWrites=true;assert.equal(await adapter.save({points:11}),false);
  idb.control.failWrites=false;
  const reload=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});assert.deepEqual(await reload.load(),{points:10});
  assert.equal(storage.getItem('owner'),'{"points":2}','unmigrated previous local data remains recoverable');
});

test('account tuple keys and named removals isolate documents, authentication, and other accounts',async()=>{
  const storage=localStore({'sb-auth-token':'keep'}),idb=database();
  const a=Storage.create({key:'a',storage,indexedDB:idb.indexedDB}),b=Storage.create({key:'a::document',storage,indexedDB:idb.indexedDB});
  assert.equal(await a.save({points:1}),true);assert.equal(await b.save({points:2}),true);
  assert.deepEqual(await a.load(),{points:1});assert.deepEqual(await b.load(),{points:2});
  assert.equal(await a.write('../sb-auth-token',{}),false);assert.equal(await a.remove('document'),true);
  assert.deepEqual(await b.load(),{points:2});assert.equal(storage.getItem('sb-auth-token'),'keep');assert.equal(await a.load(),null);
});

test('sync checkpoint commits as one record and writes capture their original values before queueing',async()=>{
  const storage=localStore(),idb=database(),adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  const sync={base:{revision:5,document:{points:9}},meta:{revision:5,dirty:true},document:{points:10}};
  const pending=adapter.write('sync',sync);sync.document.points=11;sync.meta.dirty=false;
  assert.equal(await pending,true);await adapter.flush();
  assert.deepEqual(await adapter.read('sync'),{base:{revision:5,document:{points:9}},meta:{revision:5,dirty:true},document:{points:10}});
  assert.equal(idb.records.size,1);
  const read=await adapter.read('sync');read.document.points=200;assert.equal((await adapter.read('sync')).document.points,10);
});

test('blocked IndexedDB and denied browser storage finish safely without hanging startup',async()=>{
  const idb=database();idb.control.blocked=true;
  const storage={getItem(){throw Error('Storage denied');},setItem(){throw Error('Storage denied');},removeItem(){throw Error('Storage denied');}};
  const adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB,timeoutMs:20});
  assert.equal(await adapter.load(),null);assert.equal(await adapter.save({points:8}),false);assert.deepEqual(await adapter.load(),{points:8});
  assert.equal(adapter.isDurable(),false);
});

test('invalid JSON input and circular optional snapshots return false without interrupting later writes',async()=>{
  const adapter=Storage.create({key:'owner',storage:localStore(),indexedDB:null}),circular={};circular.self=circular;
  assert.equal(await adapter.save(undefined),false);assert.equal(await adapter.write('recovery',circular),false);
  assert.equal(await adapter.save({points:12}),true);assert.deepEqual(await adapter.load(),{points:12});
});

test('legacy class-deletion and unsent recovery backups remain available after IndexedDB migration',async()=>{
  const storage=localStore({owner_beforeClassDelete:'{"classes":["retained"]}',owner_unsent_recovery:'{"pendingPoints":22}'}),idb=database();
  const adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  assert.deepEqual(await adapter.read('before_class_delete'),{classes:['retained']});
  assert.deepEqual(await adapter.read('unsent_recovery'),{pendingPoints:22});
  assert.equal(storage.getItem('owner_beforeClassDelete'),null);assert.equal(storage.getItem('owner_unsent_recovery'),null);
});

test('raw recovery export preserves a malformed legacy primary without treating it as a valid document',async()=>{
  const raw='{"classes":[broken',storage=localStore({owner:raw}),idb=database();
  const adapter=Storage.create({key:'owner',storage,indexedDB:idb.indexedDB});
  assert.equal(await adapter.load(),null);assert.equal(await adapter.readRaw(),raw);
  assert.equal(storage.getItem('owner'),raw);assert.equal(idb.records.size,0);
});
