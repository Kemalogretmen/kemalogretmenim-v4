const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../js/akvaryum-core.js'),P=require('../js/akvaryum-parent-access.js');
function backend({responseLost=false,fail=false,timers=null}={}){
 const cls=C.newClass('Birinciler');cls.students=Array.from({length:60},(_,i)=>C.newStudent('Öğrenci '+i));
 const rows=new Map(),calls=[];let share={id:'class-share',enabled:false,token:'public-link'},syncs=0,lose=responseLost;
 const client={from(name){const q={kind:'read',values:null,filters:{},
  select(){return q;},eq(key,value){q.filters[key]=value;return q;},not(){return q;},maybeSingle(){q.single=true;return q;},abortSignal(signal){q.signal=signal;return q;},delete(){q.kind='delete';return q;},
  update(value){q.kind='update';q.values=value;return q;},upsert(value,options){q.kind='upsert';q.values=value;q.options=options;return q;},
  then(resolve,reject){return Promise.resolve().then(()=>{
   calls.push({name,kind:q.kind,values:q.values,filters:q.filters,options:q.options});
   if(name==='aquarium_shares'){if(q.kind==='update')syncs++;return {data:q.single?share:[share],error:null};}
   if(q.kind==='read')return {data:[...rows.values()],error:null};
   if(fail)return {data:null,error:Error('offline')};
   if(q.kind==='delete'){rows.clear();return {data:null,error:null};}
   if(q.kind==='upsert'){
    const result=q.values.map(value=>{const old=rows.get(value.student_id),row={id:crypto.randomUUID(),token:crypto.randomUUID(),...old,...value};rows.set(value.student_id,row);return row;});
    if(lose){lose=false;return {data:null,error:Error('response lost after commit')};}
    return {data:result,error:null};
   }
   const row=[...rows.values()].find(r=>r.id===q.filters.id);if(row)Object.assign(row,q.values);return {data:row?[row]:[],error:null};
  }).then(resolve,reject);}
 };return q;}};
 const window={AquariumCore:C,kemalUserAuth:{getClient:()=>client,getUser:()=>({id:'owner'})}};
 vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window,crypto,AbortController,setTimeout:timers?.set||setTimeout,clearTimeout:timers?.clear||clearTimeout});
 return {api:window.AquariumSharing,cls,rows,calls,share,syncs:()=>syncs};
}
test('a whole class uses one atomic code upsert, one snapshot, and retains all existing access codes on retry',async()=>{
 const h=backend();
 const first=await h.api.enableChildren(h.cls,{names:true},'class');assert.equal(first.length,60);assert.equal(h.syncs(),1);
 const writes=h.calls.filter(c=>c.name==='aquarium_student_links'&&c.kind==='upsert');assert.equal(writes.length,1);
 assert.equal(writes[0].values.length,60);assert.equal(writes[0].options.onConflict,'share_id,student_id');
 assert.ok(writes[0].values.every(r=>!Object.hasOwn(r,'token')&&r.view_scope==='class'&&r.enabled));
 assert.equal(h.share.enabled,false);assert.equal(h.share.token,'public-link');
 const codes=new Map(first.map(r=>[r.student_id,r.token]));
 const second=await h.api.enableChildren(h.cls,{},'child');assert.ok(second.every(r=>r.token===codes.get(r.student_id)&&r.view_scope==='child'));
 const individual=await h.api.enableChild(h.cls,{},h.cls.students[0].id,'class');assert.equal(individual.token,codes.get(individual.student_id));
 assert.equal([...h.rows.values()].filter(r=>r.view_scope==='class').length,1);
});
test('a lost network response can be retried without invalidating codes already saved, and revocation remains effective',async()=>{
 const h=backend({responseLost:true});await assert.rejects(h.api.enableChildren(h.cls,{},'child'),/yeniden deneyin/);
 const tokens=[...h.rows.values()].map(r=>r.token);
 const result=await h.api.enableChildren(h.cls,{},'child');assert.deepEqual([...result].map(r=>r.token),tokens);
 const previous=result[0].token;await h.api.disableChild(result[0].id);assert.equal(h.rows.get(result[0].student_id).enabled,false);
 const reopened=await h.api.enableChild(h.cls,{},result[0].student_id);assert.notEqual(reopened.token,previous);assert.equal(reopened.enabled,true);
});
test('invalid/empty bulk selections and failed saves never report a successful creation',async()=>{
 const h=backend({fail:true});await assert.rejects(h.api.enableChildren(h.cls,{},'all-points'),/geçersiz/);assert.equal(h.calls.length,0);
 await assert.rejects(h.api.enableChildren(h.cls,{},'class',[]),/Önce/);await assert.rejects(h.api.enableChild(h.cls,{},'not-a-pupil'),/Öğrenci/);assert.equal(h.calls.length,0);
 await assert.rejects(h.api.enableChildren(h.cls,{},'child'),/kaydedilemedi/);assert.equal(h.rows.size,0);
});
test('class deletion or backup replacement revokes credentials permanently even when the same pupil IDs are later restored',async()=>{
 for(const action of ['removeClass','disableAll']){
  const h=backend(),first=await h.api.enableChildren(h.cls,{},'child'),previous=new Set(first.map(r=>r.token));
  await h.api[action](h.cls.id);assert.equal(h.rows.size,0);
  const restored=await h.api.enableChildren(h.cls,{},'class');assert.ok(restored.every(r=>!previous.has(r.token)));assert.equal(restored.length,60);
 }
});
test('unresponsive requests abort and let the teacher retry instead of leaving the mobile sheet waiting forever',async()=>{
 let expire,signal,cleared=false;
 const stalled={select(){return this;},eq(){return this;},maybeSingle(){return this;},abortSignal(value){signal=value;return new Promise(()=>{});}};
 // Install a separate stalled client to exercise the actual query wrapper.
 const window={AquariumCore:C,kemalUserAuth:{getClient:()=>({from:()=>stalled}),getUser:()=>({id:'owner'})}};
 vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window,crypto,AbortController,setTimeout:(fn,ms)=>{assert.equal(ms,20000);expire=fn;return 7;},clearTimeout:id=>{assert.equal(id,7);cleared=true;}});
 const pending=window.AquariumSharing.get('class');expire();await assert.rejects(pending,/yanıt vermedi/);assert.equal(signal.aborted,true);assert.equal(cleared,true);
});
test('the parent message contains the intended child code and link without scores or another child’s information',()=>{
 const access={studentName:'  İpek\n Ece  ',className:'Birinciler',code:'parent-code',url:'https://example.invalid/?cocuk=parent-code'};
 assert.equal(P.copyText(access,'code'),'parent-code');assert.equal(P.copyText(access,'url'),access.url);
 const text=P.message(access);assert.match(text,/İpek Ece için Birinciler/);assert.match(text,/Veli kodu: parent-code/);assert.ok(text.includes('Bağlantı: '+access.url));assert.match(text,/yalnızca ilgili veliye/);assert.ok(!text.includes('puan'));
});
