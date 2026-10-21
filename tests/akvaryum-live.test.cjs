const {test}=require('node:test');const assert=require('node:assert/strict');const Live=require('../js/akvaryum-live.js');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 let time=Date.parse('2026-10-20T09:00:00Z'),rows=[],snapshotError=false,reads=0,pick;const listeners=[],statuses=[],removed=[];
 const client={channel:name=>{const callbacks=[];const c={name,on(type,filter,fn){callbacks.push({type,filter,fn});return this;},subscribe(fn){c.status=fn;listeners.push(c);fn('SUBSCRIBED');return c;},callbacks};return c;},removeChannel:c=>removed.push(c),
  rpc:async(name,args)=>{if(name==='aquarium_live_snapshot'){reads++;return snapshotError?{error:{}}:{data:{server_now:new Date(time).toISOString(),rows}};}return pick?pick(args):{error:{}};}};
 const devices=[];function device(ownerId='teacher'){const revisions=[],picks=[],states=[];const live=Live.create({client,ownerId,onRevision:r=>revisions.push(r),onPicker:p=>picks.push(p),onStatus:(...s)=>states.push(s),now:()=>time,timeoutMs:25});devices.push(live);return {live,revisions,picks,states};}
 return {client,device,listeners,removed,set rows(v){rows=v;},set time(v){time=v;},get time(){return time;},set snapshotError(v){snapshotError=v;},get reads(){return reads;},set pick(fn){pick=fn;},emit(row){for(const c of listeners)for(const l of c.callbacks)if(l.filter.event==='UPDATE')l.fn({new:row});},stop(){devices.forEach(d=>d.stop());}};
}
const row=(time,values={})=>({owner_id:'teacher',class_id:'class-a',account_revision:2,sequence:1,pick_id:'pick-a',student_id:'student-a',picked_at:new Date(time).toISOString(),pick_date:'2026-10-20',round_ids:['student-a'],...values});
test('three owner devices receive revision and the same single picker event immediately; unrelated owners are ignored',async()=>{
 const f=fixture(),a=f.device(),b=f.device(),other=f.device('other');for(const d of [a,b,other])d.live.start();await tick();
 f.emit(row(f.time));f.emit(row(f.time));assert.deepEqual(a.revisions,[2]);assert.deepEqual(b.revisions,[2]);assert.equal(a.picks.length,1);assert.equal(b.picks[0].student_id,a.picks[0].student_id);assert.equal(other.picks.length,0);assert.equal(other.revisions.length,0);
 for(const c of f.listeners){assert.equal(c.callbacks.length,2);assert.ok(c.callbacks.every(l=>l.type==='postgres_changes'&&l.filter.table==='aquarium_live_state'&&l.filter.filter==='owner_id=eq.'+(c.name.endsWith('other')?'other':'teacher')));}
 f.stop();assert.equal(f.removed.length,3);
});
test('catch-up reads use server time, ignore stale activities and repair a missing revision after reconnect',async()=>{
 const f=fixture(),d=f.device();f.rows=[row(f.time-20000,{account_revision:4})];d.live.start();await tick();assert.deepEqual(d.revisions,[4]);assert.equal(d.picks.length,0);
 f.listeners[0].status('CHANNEL_ERROR');assert.equal(d.live.isConnected(),false);
 f.rows=[row(f.time,{account_revision:5,sequence:2,student_id:'student-b'})];f.listeners[0].status('SUBSCRIBED');await tick();assert.deepEqual(d.revisions,[4,5]);assert.equal(d.picks[0].student_id,'student-b');
 const before=f.reads;await d.live.check();assert.equal(f.reads,before);f.time+=30001;await d.live.check();assert.equal(f.reads,before+1);f.stop();
});
test('a missing setup or disconnected socket falls back to bounded checks and never reports a confirmed realtime connection',async()=>{
 const f=fixture(),d=f.device();f.snapshotError=true;d.live.start();await tick();assert.equal(d.live.isConnected(),false);assert.match(d.states.at(-1)[0],/Otomatik/);
 f.snapshotError=false;f.rows=[row(f.time)];await d.live.check();assert.equal(d.picks.length,1);f.stop();
});
test('a delayed response from a stopped channel cannot reopen an activity or notify another account',async()=>{
 const f=fixture(),d=f.device();let release;f.client.rpc=()=>new Promise(r=>release=r);d.live.start();d.live.stop();release({data:{server_now:new Date(f.time).toISOString(),rows:[row(f.time)]}});await tick();
 f.emit(row(f.time));assert.equal(d.picks.length,0);assert.equal(d.revisions.length,0);
});
test('lost draw acknowledgement retries with the same request id; socket echo and RPC acknowledgement reveal once',async()=>{
 const f=fixture(),d=f.device(),ids=[];d.live.start();await tick();let fail=true;
 f.pick=async args=>{ids.push(args.p_request_id);if(fail){fail=false;throw Error('Response lost');}const result=row(f.time);f.emit(result);return {data:{...result,server_now:new Date(f.time).toISOString()}};};
 await assert.rejects(d.live.draw('class-a','request-a'));await d.live.draw('class-a','request-b');assert.deepEqual(ids,['request-a','request-a']);assert.equal(d.picks.length,1);f.stop();
});
test('draws time out without consuming a new request id and reject malformed or cross-owner acknowledgements',async()=>{
 const f=fixture(),d=f.device();d.live.start();await tick();f.pick=()=>new Promise(()=>{});await assert.rejects(d.live.draw('class-a','request-a'),/yanıt vermedi/);
 for(const value of [row(f.time,{owner_id:'other'}),row(f.time,{round_ids:['student-a',1]}),row(f.time,{picked_at:'invalid'})]){f.pick=async()=>({data:{...value,server_now:new Date(f.time).toISOString()}});await assert.rejects(d.live.draw('class-a','request-b'),/doğrulanamadı/);}assert.equal(d.picks.length,0);f.stop();
});
test('an older acknowledged draw cannot replace a newer event seen on another device',async()=>{
 const f=fixture(),d=f.device();d.live.start();await tick();f.emit(row(f.time,{sequence:3,student_id:'student-c'}));
 f.pick=async()=>({data:{...row(f.time,{sequence:2}),server_now:new Date(f.time).toISOString()}});const old=await d.live.draw('class-a','request-a');assert.equal(old.stale,true);assert.equal(d.picks.length,1);assert.equal(d.picks[0].student_id,'student-c');f.stop();
});
