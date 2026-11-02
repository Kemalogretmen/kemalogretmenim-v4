const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const { parseHTML } = require('linkedom');
const React = require('react');
const { window, document } = parseHTML('<html><body></body></html>');
global.window = window; global.document = document; global.navigator = { userAgent: 'node' };
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function deferred() { let resolve, reject; const promise = new Promise((r,j) => { resolve=r; reject=j; }); return { promise, resolve, reject }; }
function fixture() { return { updated_at: '2026-11-01T12:00:00.000000Z', client_updated_at: '2026-11-01T12:00:00Z', agenda_state: { teacher: { name: 'Teacher' }, classes: [], students: [], exams: [], scheduleItems: [], calendarEvents: [{ id:'event', title:'Plan', date:'2035-11-02', time:'10:00', done:false }], updatedAt:'2026-11-01T12:00:00Z' }, lesson_planner_state:null }; }
async function harness({ cache = fixture(), pending = [], online = false, remoteRow = fixture() } = {}) {
  const uid = 'teacher-a', key = `kemal.mobile.agenda.v2.${uid}`;
  const disk = new Map(); if (cache) disk.set(key+'.cache',JSON.stringify(cache)); disk.set(key+'.pending',JSON.stringify(pending));
  const remote = new Map([[uid,remoteRow],['teacher-b',fixture()]]), writes=[], reads=[], notifications=[];
  const state = { auth:{ userId:uid, profile:{ id:uid,role:'teacher',active:true,full_name:'Teacher' } }, platform:{ online }, failPending:0, holdDisk:null, holdRead:null, holdWrite:null, observed:null };
  const listeners = new Set();
  const mocks = {
    react:React,
    'react-native':{ AppState:{ currentState:'active', addEventListener:(_name,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)};} } },
    '@react-native-async-storage/async-storage':{ getItem:async key=>disk.get(key)||null, setItem:async(key,value)=>{ if(key.endsWith('.pending')) { if(state.failPending>0){state.failPending--;throw new Error('Disk full');} if(state.holdDisk){const hold=state.holdDisk;state.holdDisk=null;await hold.promise;} } disk.set(key,value); } },
    '@/context/AuthContext':{useAuth:()=>state.auth}, './PlatformContext':{usePlatform:()=>state.platform},
    '@/services/notifications':{ reconcileAgendaReminders:async (owner,items)=>notifications.push({owner,items}), reminderPermission:async()=>({granted:true}) },
    '@/lib/supabase':{supabase:{
      from:()=>{let mode='read',payload,filters={};const query={select(){return query;},eq(key,value){filters[key]=value;return query;},update(value){mode='update';payload=value;return query;},insert(value){mode='insert';payload=value;return query;},async maybeSingle(){
        const user=filters.user_id||payload?.user_id;
        if(mode==='read'){reads.push(user);const row=copy(remote.get(user)||null);if(state.holdRead){const hold=state.holdRead;state.holdRead=null;await hold.promise;}return{data:row,error:null};}
        writes.push({user,mode,payload:copy(payload),filters:{...filters}});
        if(state.holdWrite){const hold=state.holdWrite;state.holdWrite=null;await hold.promise;}
        const previous=remote.get(user);
        if(mode==='update'&&previous?.updated_at!==filters.updated_at)return{data:null,error:null};
        if(mode==='insert'&&previous)return{data:null,error:{code:'23505'}};
        const row={...copy(previous),...copy(payload),updated_at:new Date(Date.now()+writes.length).toISOString()};remote.set(user,row);return{data:copy(row),error:null};
      }};return query;},
      channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:async()=>{},
    }},
  };
  const modules=new Map();
  function load(relative){const file=path.resolve(__dirname,'../src',relative);if(modules.has(file))return modules.get(file).exports;const module={exports:{}};modules.set(file,module);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    vm.runInNewContext(js,{module,exports:module.exports,require:id=>id in mocks?mocks[id]:id.startsWith('./')?load(path.relative(path.resolve(__dirname,'../src'),path.resolve(path.dirname(file),id+(id.endsWith('useAgenda')?'.tsx':'.ts')))):require(id),Date,console,setInterval:()=>1,clearInterval:()=>{},Set,Map,TextEncoder:undefined});return module.exports;}
  const agenda=load('platform/useAgenda.tsx');
  function Consumer(){state.observed=agenda.useAgenda();return null;}
  const container=document.createElement('div');document.body.appendChild(container);const root=createRoot(container);
  const render=async()=>{await act(async()=>{root.render(React.createElement(agenda.AgendaProvider,null,React.createElement(Consumer)));});await flush();};
  const flush=async()=>{await act(async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);});};
  await render();
  return {state,disk,remote,writes,reads,notifications,key,render,flush,get value(){return state.observed;},async change(operation){let result;await act(async()=>{result=await state.observed.change(operation);});await flush();return result;},async refresh(){await act(async()=>{await state.observed.refresh();});await flush();},async close(){await act(async()=>root.unmount());container.remove();}};
}
function doneOp(){return{id:'op-done',collection:'calendarEvents',itemId:'event',before:fixture().agenda_state.calendarEvents[0],patch:{done:true},createdAt:'2026-11-01T18:00:00Z'};}

test('offline provider restores pending changes visibly without network writes',async()=>{const h=await harness({pending:[doneOp()]});try{assert.equal(h.value.snapshot.calendarEvents[0].done,true);assert.equal(h.value.pending,1);await h.refresh();assert.equal(h.reads.length,0);assert.equal(h.writes.length,0);}finally{await h.close();}});
test('first online load hydrates full exam records even when display cache has the same revision',async()=>{const cloud=fixture();cloud.agenda_state.exams=[{id:'exam',classId:'class',title:'Matematik',results:{student:{correct:8}}}];const h=await harness({online:true,remoteRow:cloud});try{assert.equal(h.value.snapshot.exams[0].id,'exam');assert.equal(h.value.snapshot.exams[0].results.student.correct,8);assert.equal(h.writes.length,0);}finally{await h.close();}});
test('malformed remote agenda cannot turn cached data or pending edits into an empty cloud overwrite',async()=>{const cloud=fixture();delete cloud.agenda_state.classes;const h=await harness({online:true,remoteRow:cloud,pending:[doneOp()]});try{assert.match(h.value.error,/biçimi/);assert.equal(h.writes.length,0);assert.equal(h.value.pending,1);assert.equal(h.value.snapshot.calendarEvents[0].done,true);}finally{await h.close();}});
test('failed local persistence returns false and cannot silently upload the unsaved operation',async()=>{const h=await harness();try{h.state.failPending=1;assert.equal(await h.change(doneOp()),false);assert.equal(h.value.pending,0);assert.equal(h.value.snapshot.calendarEvents[0].done,false);h.state.platform={online:true};await h.render();assert.equal(h.writes.length,0);assert.equal(h.remote.get('teacher-a').agenda_state.calendarEvents[0].done,false);}finally{await h.close();}});
test('failed disk acknowledgement retains pending outbox after cloud success and safely retries',async()=>{const h=await harness();try{assert.equal(await h.change(doneOp()),true);h.state.failPending=1;h.state.platform={online:true};await h.render();assert.equal(h.remote.get('teacher-a').agenda_state.calendarEvents[0].done,true);assert.equal(h.value.pending,1);assert.equal(JSON.parse(h.disk.get(h.key+'.pending')).length,1);assert.match(h.value.error,/Cihaz/);await h.refresh();assert.equal(h.value.pending,0);assert.equal(JSON.parse(h.disk.get(h.key+'.pending')).length,0);assert.equal(h.value.snapshot.calendarEvents[0].done,true);}finally{await h.close();}});
test('A to B to A account cycle cannot revive an old asynchronous refresh',async()=>{const h=await harness({pending:[doneOp()]});try{const hold=deferred();h.state.holdRead=hold;h.state.platform={online:true};await h.render();h.state.auth={userId:'teacher-b',profile:{id:'teacher-b',role:'teacher',active:true}};h.state.platform={online:false};await h.render();h.state.auth={userId:'teacher-a',profile:{id:'teacher-a',role:'teacher',active:true}};await h.render();hold.resolve();await h.flush();assert.equal(h.writes.length,0);assert.equal(h.value.pending,1);assert.equal(h.value.snapshot.calendarEvents[0].done,true);}finally{await h.close();}});
test('same-user role revocation gates an in-flight refresh and hides previous teacher state',async()=>{const h=await harness({pending:[doneOp()]});try{const hold=deferred();h.state.holdRead=hold;h.state.platform={online:true};await h.render();h.state.auth={userId:'teacher-a',profile:{id:'teacher-a',role:'student',active:true}};await h.render();hold.resolve();await h.flush();assert.equal(h.writes.length,0);assert.equal(h.value.snapshot,null);assert.equal(h.value.pending,0);assert.equal(h.value.error,'');}finally{await h.close();}});
test('an edit enqueued while acknowledgement disk storage is busy is preserved',async()=>{const h=await harness();try{await h.change(doneOp());const hold=deferred();h.state.holdDisk=hold;h.state.platform={online:true};await h.render();const add={id:'op-add',collection:'calendarEvents',itemId:'another',patch:{title:'Other plan',date:'2035-11-02',time:'11:00'},createdAt:'2026-11-01T18:01:00Z'};let result;let saving;await act(async()=>{saving=h.value.change(add).then(value=>{result=value;});});hold.resolve();await act(async()=>{await saving;});await h.flush();assert.equal(result,true);await h.refresh();assert.equal(h.remote.get('teacher-a').agenda_state.calendarEvents.filter(item=>item.id==='another').length,1);assert.equal(h.value.pending,0);}finally{await h.close();}});
