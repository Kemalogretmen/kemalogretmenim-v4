const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '..');
function load(name) {
  const file = path.join(root, 'src/platform', name + '.ts');
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: name => name.endsWith('.json') ? require(path.join(path.dirname(file), name)) : name.startsWith('./') ? load(name.slice(2)) : require(name), URL, console, Date });
  return module.exports;
}
const m = load('model'), urls = load('urlPolicy'), catalog = load('catalog'), { createActivityBridge } = load('bridge');
const origin = 'https://kemalogretmenim.com.tr';
test('the native bridge does not depend on function source surviving Hermes bytecode', () => {
  const create = load('bridge').createActivityBridge;
  Object.getPrototypeOf(create).toString = () => 'function () { [bytecode] }';
  const script = create({origin,authKey:'sb-test',session:null,userId:null,dark:false,module:'whiteboard',nonce:'test'});
  assert.ok(script.includes('kemalNativeStyles'));assert.ok(!script.includes('[bytecode]'));
  assert.doesNotThrow(() => new vm.Script(script));
});
test('only first-party HTTPS may receive the native session', () => {
  for (const raw of ['https://evil.test/a','https://kemalogretmenim.com.tr.evil.test','//evil.test','javascript:alert(1)','data:text/html,test','file:///etc/passwd','https://user:pass@kemalogretmenim.com.tr/a','/\\evil.test','\n/secret']) assert.equal(urls.internalUrl(raw, origin), null, raw);
  assert.equal(urls.internalUrl('/ogretmen/beyaztahta.html?mode=1', origin), origin + '/ogretmen/beyaztahta.html?mode=1');
  assert.equal(urls.safeExternalUrl('intent://evil'), null);
  assert.equal(urls.safeExternalUrl('tel:+905001112233'), 'tel:+905001112233');
});
test('auth redirects accept pretty URLs and extensions', () => {
  for (const p of ['/giris','/giris.html','/kayit/']) assert.equal(urls.isAuthPath(origin+p), true);
  assert.equal(urls.isAuthPath(origin+'/hizli-okuma/karne'),false);
});
test('export validation rejects executable types and malformed or oversized data', () => {
  assert.equal(urls.safeExport({name:'run.js',base64:'YQ==',mime:'text/javascript'}),null);
  assert.equal(urls.safeExport({name:'report.pdf',base64:'!bad!',mime:'application/pdf'}),null);
  const file=urls.safeExport({name:'../sınıf.json',base64:'e30=',mime:'application/json'});
  assert.ok(file);assert.ok(!file.name.includes('/'));
  assert.equal(urls.safeExport({name:'a.pdf',base64:'a'.repeat(21*1024*1024),mime:'application/pdf'}),null);
});
test('malformed preferences do not crash or retain unbounded content', () => {
  assert.equal(m.normalizeLearningState({favorites:['a','a',false],theme:'bad'}).favorites.length,1);
  assert.equal(m.normalizeLearningState({recent:[{id:'x',at:'invalid'}]}).recent.length,0);
  assert.equal(m.normalizeLearningState(null).theme,'system');
});
test('recent content is unique, ordered and limited to 12', () => {
  let s=m.normalizeLearningState(null);for(let i=0;i<20;i++) s=m.visitModule(s,String(i));s=m.visitModule(s,'10');
  assert.equal(s.recent[0].id,'10');assert.equal(s.recent.length,12);assert.equal(s.recent.filter(x=>x.id==='10').length,1);
});
test('week dates preserve local dates through month/year boundaries', () => {
  assert.equal(m.weekDates('2026-11-01')[0],'2026-10-26');assert.equal(m.weekDates('2026-11-01')[6],'2026-11-01');
  assert.equal(m.weekDates('2027-01-01')[0],'2026-12-28');
  assert.equal(m.dateKey(new Date(2026,10,1,0,1)),'2026-11-01');
});
test('navigation adapts at tablet and landscape boundaries', () => {
  assert.equal(m.layoutFor(390,844).rail,false);assert.equal(m.layoutFor(1024,768).rail,true);assert.equal(m.layoutFor(844,390).compactLandscape,true);
});
test('catalog has all 32 bundled games and no broken internal target', () => {
  assert.equal(catalog.modules.filter(x=>x.category==='games').length,32);
  assert.equal(new Set(catalog.modules.map(x=>x.id)).size,catalog.modules.length);
  for (const item of catalog.modules) {
    assert.ok(urls.internalUrl(item.path, origin));
    assert.ok(fs.existsSync(path.resolve(root,'..',item.path.split('?')[0].slice(1))),item.path);
  }
  assert.ok(catalog.filterModules('all','AKILLI TAHTA').some(x=>x.id==='whiteboard'));
  assert.ok(catalog.filterModules('all','hizli okuma').some(x=>x.id==='reading'));
  assert.equal(catalog.moduleForPath('/siniflar/ortaokul.html?sinif=7').id,'grade-7');
});
function bridgeEnvironment({url=origin+'/ogretmen-ajandasi/index.html?mobileView=studentsView', store=new Map(), userId='teacher-one', top=true, failWrites=false, agendaSeed, module='agenda'}={}) {
  const { window, document } = parseHTML('<html><head></head><body><div class="sidebar"><button data-view="studentsView">Öğrenciler</button></div><input id="lessonPlannerFocusDate"><button class="sinif-btn" data-s="3">3</button><canvas id="board"></canvas><div id="whiteboardStage"><div id="sandboxBed"><canvas id="sandCanvas"></canvas></div><button id="sandGroupBtn"></button></div></body></html>');
  // linkedom's defaultView forwards custom globals; isolate every document's
  // injected guard/seed state just as a real WebView navigation does.
  for(const key of ['__KEMAL_AGENDA_SEEDED__','__KEMAL_AGENDA_CLOUD_GUARD__','__KEMAL_AGENDA_LOCAL_BASE__','kemalUserAuth']) delete window[key];
  const messages=[];let clicks=0;document.querySelector('button').addEventListener('click',()=>clicks++);
  document.querySelector('.sinif-btn').addEventListener('click',()=>clicks++);
  window.__KEMAL_NATIVE_BRIDGE_INSTALLED__=false;window.top=top?window:{};window.self=window;window.ReactNativeWebView={postMessage:raw=>messages.push(JSON.parse(raw))};
  const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(failWrites)throw new Error('QuotaExceeded');store.set(k,v);},removeItem:k=>store.delete(k)};
  const pending=[];
  const context=vm.createContext({window,document,localStorage,location:new URL(url),URL,URLSearchParams,Date,Event:window.Event,console,setTimeout:fn=>pending.push(fn)});
  const flush=()=>{while(pending.length)pending.shift()();};
  const run=()=>{vm.runInContext(createActivityBridge({origin,authKey:'sb-project-auth-token',session:{access_token:'test-access'},userId,dark:true,module,nonce:'test-capability',agendaSeed}),context);document.dispatchEvent(new window.Event('DOMContentLoaded'));flush();};
  return {run,flush,store,messages,document,clicks:()=>clicks};
}
test('bridge injects once, preserves canvas and opens the requested agenda view', () => {
  const h=bridgeEnvironment();const canvas=h.document.getElementById('board');h.run();h.run();
  assert.equal(h.document.querySelectorAll('#kemalNativeStyles').length,1);assert.equal(h.document.getElementById('board'),canvas);assert.equal(h.document.documentElement.dataset.theme,'dark');assert.equal(h.clicks(),1);
  assert.ok(h.messages.length>0);assert.ok(h.messages.every(message=>message.nonce==='test-capability'));
});
test('session never enters untrusted origins or embedded frames', () => {
  for(const options of [{url:'https://evil.test/'},{top:false}]){const h=bridgeEnvironment(options);h.run();assert.equal(h.store.has('sb-project-auth-token'),false);assert.equal(h.messages.length,0);}
});
test('account changes preserve isolated agenda snapshots and restore the right owner', () => {
  const store=new Map([['kemal.mobile.agenda.owner','teacher-old'],['kemalOgretmenAjandasi.v1','OLD'],['kemal.mobile.account.teacher-one.kemalOgretmenAjandasi.v1','NEW']]);
  const h=bridgeEnvironment({store});h.run();assert.equal(store.get('kemalOgretmenAjandasi.v1'),'NEW');assert.equal(store.get('kemal.mobile.account.teacher-old.kemalOgretmenAjandasi.v1'),'OLD');
  const guest=bridgeEnvironment({store,userId:null});guest.run();assert.equal(store.has('kemalOgretmenAjandasi.v1'),false);assert.equal(store.get('kemal.mobile.account.teacher-one.kemalOgretmenAjandasi.v1'),'NEW');
});
test('reading grade deep link chooses the actual grade instead of reopening the home step', () => {
  const h=bridgeEnvironment({url:origin+'/hizli-okuma/index.html?grade=3'});h.run();assert.equal(h.clicks(),1);
});
test('updating the same signed-in legacy user keeps their unsynced local agenda', () => {
  const store=new Map([['sb-project-auth-token',JSON.stringify({user:{id:'teacher-one'}})],['kemalOgretmenAjandasi.v1','UNSYNCED']]);
  const h=bridgeEnvironment({store});h.run();assert.equal(store.get('kemalOgretmenAjandasi.v1'),'UNSYNCED');assert.equal(store.get('kemal.mobile.agenda.owner'),'teacher-one');
});
test('storage failure removes the old token and blocks showing a different account', () => {
  const store=new Map([['sb-project-auth-token',JSON.stringify({user:{id:'old'}})]]);
  const h=bridgeEnvironment({store,failWrites:true});h.run();assert.equal(store.has('sb-project-auth-token'),false);assert.ok(h.messages.some(x=>x.type==='storageError'));assert.equal(h.document.documentElement.style.visibility,'hidden');
});
test('fresh-device agenda seed restores cloud agenda and planner before page scripts run, once only', () => {
  const agenda={classes:[{id:'c'}],students:[{id:'student'}],exams:[],updatedAt:'2026-10-30T09:00:00Z'};
  const planner={programs:{c:{Mon:[{ders:'MATEMATİK'}]}}};
  const store=new Map([['kemal.mobile.agenda.owner','teacher-one'],['kemalOgretmenAjandasi.v1',JSON.stringify({classes:[{name:'Sınıfım'}],students:[],exams:[],updatedAt:'2026-11-01T20:00:00Z'})]]);
  const h=bridgeEnvironment({store,agendaSeed:{userId:'teacher-one',agenda_state:agenda,lesson_planner_state:planner,updated_at:'2026-10-30T09:00:00Z'}});
  h.run();assert.equal(JSON.parse(store.get('kemalOgretmenAjandasi.v1')).students[0].id,'student');assert.deepEqual(JSON.parse(store.get('ogretmen_plan_v2')),planner);
  assert.ok([...store.keys()].some(key=>key.includes('.seed-backup.')));
  store.set('kemalOgretmenAjandasi.v1','NEW EDIT');h.run();assert.equal(store.get('kemalOgretmenAjandasi.v1'),'NEW EDIT','appearance/onLoad reinjection must not overwrite edits');
});
test('agenda seed cannot overwrite a newer meaningful local record or enter another account', () => {
  const local=JSON.stringify({classes:[{id:'c'}],students:[{id:'unsynced'}],exams:[],updatedAt:'2026-11-01T20:00:00Z'});
  for(const owner of ['teacher-one','another-teacher']) {
    const store=new Map([['kemal.mobile.agenda.owner','teacher-one'],['kemalOgretmenAjandasi.v1',local]]);
    const h=bridgeEnvironment({store,agendaSeed:{userId:owner,agenda_state:{classes:[],students:[],exams:[]},lesson_planner_state:null,updated_at:'2026-10-30T09:00:00Z'}});
    h.run();assert.equal(store.get('kemalOgretmenAjandasi.v1'),local);
  }
});
test('agenda day deep link changes the existing planner date control', () => {
  const h=bridgeEnvironment({url:origin+'/ogretmen-ajandasi/index.html?mobileView=studentsView&focusDate=2026-11-02'});let changes=0;
  h.document.getElementById('lessonPlannerFocusDate').addEventListener('change',()=>changes++);h.run();
  assert.equal(h.document.getElementById('lessonPlannerFocusDate').value,'2026-11-02');assert.equal(changes,1);
});
test('whiteboard first portrait mount and sand activation request existing layout without replacing canvas', () => {
  const h=bridgeEnvironment({url:origin+'/ogretmen/beyaztahta.html',module:'whiteboard'});let changes=0;
  h.document.defaultView.addEventListener('resize',()=>changes++);const sand=h.document.getElementById('sandCanvas');h.run();
  assert.equal(changes,1);assert.equal(h.document.getElementById('sandCanvas'),sand);assert.equal(sand.style.touchAction,'none');
  h.document.getElementById('sandGroupBtn').click();h.flush();assert.equal(changes,2,'entering sand requests a settled layout without rotating');
});

test('invalid day deep links do not roll over to another month', () => {
  const h=bridgeEnvironment({url:origin+'/ogretmen-ajandasi/index.html?focusDate=2026-02-31'});h.run();assert.equal(h.document.getElementById('lessonPlannerFocusDate').value,'');
});

test('report deep links select only an existing class and student', () => {
  function scenario(studentId) {
    const h=bridgeEnvironment({url:origin+'/ogretmen-ajandasi/index.html?mobileView=reportsView&classId=second&studentId='+encodeURIComponent(studentId)});
    const changes=[];
    for(const [id,values] of [['activeClassSelect',['first','second']],['reportStudent',['one','two']]]) {
      const select=h.document.createElement('select');select.id=id;
      for(const value of values){const option=h.document.createElement('option');option.value=value;select.appendChild(option);}
      Object.defineProperty(select,'options',{get(){return this.querySelectorAll('option');}});
      Object.defineProperty(select,'value',{get(){return this.getAttribute('data-selected')||values[0];},set(value){this.setAttribute('data-selected',value);}});
      select.addEventListener('change',()=>changes.push([id,select.value]));h.document.body.appendChild(select);
    }
    h.run();return changes;
  }
  assert.deepEqual(scenario('two'),[['activeClassSelect','second'],['reportStudent','two']]);
  assert.deepEqual(scenario('"/><script>'),[['activeClassSelect','second']]);
});

function cloudFixture(initial={user_id:'teacher-one',updated_at:'revision-one'}) {
  let row=initial,writes=0,unsafeUpserts=0;
  const other={upsert:()=>{unsafeUpserts++;return other;}};
  const client={from(table) {
    if(table!=='teacher_agenda_states') return other;
    function query(kind,payload) {
      const filters=[];
      const q={select(){return q;},eq(key,value){filters.push([key,value]);return q;},async maybeSingle(){
        if(kind==='read')return {data:row,error:null};
        if(kind==='update'&&!filters.every(([key,value])=>row?.[key]===value))return {data:null,error:null};
        if(kind==='insert'&&row)return {data:null,error:{code:'23505'}};
        writes++;row={...payload,updated_at:'revision-written-'+writes};return {data:row,error:null};
      }};return q;
    }
    return {select:()=>query('read'),update:payload=>query('update',payload),insert:payload=>query('insert',payload),upsert(){unsafeUpserts++;throw new Error('Unsafe upsert reached the backend');}};
  }};
  return {client,row:()=>row,setRow:value=>{row=value;},writes:()=>writes,unsafeUpserts:()=>unsafeUpserts};
}
test('the native bridge guards the legacy published agenda upsert with the server revision', async () => {
  const h=bridgeEnvironment();h.run();const server=cloudFixture();
  h.document.defaultView.kemalUserAuth={getClient:()=>server.client};
  const client=h.document.defaultView.kemalUserAuth.getClient();
  assert.equal(client.from('unrelated'),server.client.from('unrelated'),'unrelated tables are untouched');
  await client.from('teacher_agenda_states').select('updated_at,agenda_state').eq('user_id','teacher-one').maybeSingle();
  server.setRow({user_id:'teacher-one',updated_at:'revision-two',agenda_state:{students:['another-device']}});
  const payload={user_id:'teacher-one',agenda_state:{students:['my-local-work']}};
  const stale=await client.from('teacher_agenda_states').upsert(payload,{onConflict:'user_id'}).select('updated_at').maybeSingle();
  assert.equal(stale.error.code,'409');assert.equal(server.writes(),0);assert.deepEqual(server.row().agenda_state.students,['another-device']);
  await client.from('teacher_agenda_states').select('updated_at').eq('user_id','teacher-one').maybeSingle();
  const merelyRead=await client.from('teacher_agenda_states').upsert(payload).select('updated_at').maybeSingle();
  assert.equal(merelyRead.error.code,'409','reading a newer cloud row does not rebase stale local edits');
  h.store.set('kemalOgretmenAjandasi.v1.bulut-oncesi-yedek',JSON.stringify({savedBeforeCloudLoadAt:new Date().toISOString()}));
  const saved=await client.from('teacher_agenda_states').upsert(payload).select('updated_at').maybeSingle();
  assert.equal(saved.error,null);assert.equal(server.writes(),1);assert.equal(server.unsafeUpserts(),0);
});
test('legacy agenda writes fail closed before a verified own-user read and insert only after verified absence', async () => {
  const h=bridgeEnvironment();const server=cloudFixture(null);h.document.defaultView.kemalUserAuth={getClient:()=>server.client};h.run();
  const client=h.document.defaultView.kemalUserAuth.getClient();
  const payload={user_id:'teacher-one',agenda_state:{students:[]}};
  let result=await client.from('teacher_agenda_states').upsert(payload).select('updated_at').maybeSingle();assert.equal(result.error.code,'409');assert.equal(server.writes(),0);
  await client.from('teacher_agenda_states').select('updated_at').eq('user_id','different-teacher').maybeSingle();
  result=await client.from('teacher_agenda_states').upsert(payload).select('updated_at').maybeSingle();assert.equal(result.error.code,'409');
  await client.from('teacher_agenda_states').select('updated_at').eq('user_id','teacher-one').maybeSingle();
  result=await client.from('teacher_agenda_states').upsert({...payload,user_id:'different-teacher'}).select('updated_at').maybeSingle();assert.equal(result.error.code,'409');
  result=await client.from('teacher_agenda_states').upsert(payload).select('updated_at').maybeSingle();assert.equal(result.error,null);assert.equal(server.writes(),1);assert.equal(server.unsafeUpserts(),0);
});

test('a cloud read racing the seeded document cannot authorize stale clock-newer local overwrite', async () => {
  const seed={userId:'teacher-one',agenda_state:{classes:[{id:'c'}],students:[{id:'seeded'}],exams:[],updatedAt:'2026-10-01T00:00:00Z'},lesson_planner_state:null,updated_at:'revision-one'};
  const h=bridgeEnvironment({agendaSeed:seed});h.run();const server=cloudFixture({user_id:'teacher-one',updated_at:'revision-two',agenda_state:{students:['new-on-other-device']}});
  h.document.defaultView.kemalUserAuth={getClient:()=>server.client};const client=h.document.defaultView.kemalUserAuth.getClient();
  await client.from('teacher_agenda_states').select('updated_at,agenda_state').eq('user_id','teacher-one').maybeSingle();
  const result=await client.from('teacher_agenda_states').upsert({user_id:'teacher-one',agenda_state:{students:['seeded'],updatedAt:new Date().toISOString()}}).select('updated_at').maybeSingle();
  assert.equal(result.error.code,'409');assert.equal(server.writes(),0);assert.deepEqual(server.row().agenda_state.students,['new-on-other-device']);
});

test('newer unsynced legacy agenda without a known base survives upgrade but cannot overwrite cloud automatically', async () => {
  const local=JSON.stringify({classes:[{id:'c'}],students:[{id:'legacy-unsynced'}],exams:[],updatedAt:'2026-11-01T23:00:00Z'});
  const store=new Map([['kemal.mobile.agenda.owner','teacher-one'],['kemalOgretmenAjandasi.v1',local]]);
  const h=bridgeEnvironment({store,agendaSeed:{userId:'teacher-one',agenda_state:{classes:[],students:[],exams:[],updatedAt:'2026-10-01T00:00:00Z'},lesson_planner_state:null,updated_at:'revision-one'}});
  h.run();const server=cloudFixture();h.document.defaultView.kemalUserAuth={getClient:()=>server.client};const client=h.document.defaultView.kemalUserAuth.getClient();
  await client.from('teacher_agenda_states').select('updated_at,agenda_state').eq('user_id','teacher-one').maybeSingle();
  const result=await client.from('teacher_agenda_states').upsert({user_id:'teacher-one',agenda_state:JSON.parse(local)}).select('updated_at').maybeSingle();
  assert.equal(result.error.code,'409');assert.equal(server.writes(),0);assert.equal(store.get('kemalOgretmenAjandasi.v1'),local);
});
