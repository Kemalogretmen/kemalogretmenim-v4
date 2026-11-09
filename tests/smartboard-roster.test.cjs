const test=require('node:test'),assert=require('node:assert/strict');
const Roster=require('../js/smartboard-roster.js');
const agenda={activeClassId:'b',classes:[{id:'a',name:'1/A'},{id:'b',name:'2/B'}],students:[{id:'1',classId:'a',firstName:'Ada',lastName:'Yılmaz',health:'private',parentPhone:'private',photo:'private'},{id:'2',classId:'b',firstName:'Ege',lastName:'Ak'}]};
function harness(result){let state={user:{id:'teacher-1'},profile:{role:'teacher',active:true,approval_status:'active'}},calls=[];
 const auth={ready:async()=>state,getState:()=>state,getClient:()=>({from:t=>{calls.push(t);return {select:fields=>{calls.push(fields);return {eq:(key,id)=>{calls.push([key,id]);return {maybeSingle:async()=>typeof result==='function'?result():result};}};}};}})};
 return {auth,calls,setState:v=>{state=v;}};}
test('agenda roster contains only class and student display data',()=>{
 const clean=Roster.roster(agenda);assert.equal(clean[1].active,true);assert.deepEqual(clean[0].students,[{id:'1',name:'Ada Yılmaz'}]);assert(!JSON.stringify(clean).includes('private'));
});
test('automatic roster read is scoped to the authenticated teacher; never writes',async()=>{
 const h=harness({data:{agenda_state:agenda}}),r=await Roster.load(h.auth,{getItem(){throw Error('must not read cache');}});
 assert.equal(r.classes.length,2);assert.deepEqual(h.calls,['teacher_agenda_states','agenda_state',['user_id','teacher-1']]);
});
test('guest, student and inactive accounts never read another roster',async()=>{
 for(const state of [{user:null},{user:{id:'student'},profile:{role:'student'}},{user:{id:'inactive'},profile:{role:'teacher',active:false}}]){
 const h=harness({});h.setState(state);assert.equal((await Roster.load(h.auth,{})).status,'guest');assert.equal(h.calls.length,0);}
});
test('offline fallback requires exact cache ownership and valid class data',async()=>{
 const h=harness({error:Error('offline')});
 for(const owner of ['teacher-1','teacher-2',null]){const storage={getItem:k=>k.endsWith('.owner')?owner:JSON.stringify(agenda)},r=await Roster.load(h.auth,storage);assert.equal(r.classes.length,owner==='teacher-1'?2:0);}
});
test('a late cloud response after account switch cannot expose the old teacher',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;})),pending=Roster.load(h.auth,{});await Promise.resolve();
 h.setState({user:{id:'teacher-2'},profile:{role:'teacher'}});resolve({data:{agenda_state:agenda}});assert.equal((await pending).classes.length,0);
});
test('a new owned local agenda is available before the first cloud row exists',async()=>{
 const h=harness({data:null}),r=await Roster.load(h.auth,{getItem:k=>k.endsWith('.owner')?'teacher-1':JSON.stringify(agenda)});
 assert.equal(r.status,'local');assert.equal(r.classes.length,2);
});
