const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const rules = require('../js/matematik-vadisi-rules.js');
const {create,RECORD,DRAFT_PREFIX} = require('../js/matematik-vadisi-store.js');
const clone = x => JSON.parse(JSON.stringify(x));
const world = (name='Ece') => ({game:'matematik-vadisi',version:5,active:0,players:[{worldId:'world-'+name,name,grade:2,answered:0}]});
function harness() {
  let owner=null, version=0, failure=null, held=null;
  const rows=new Map(),requests=[],statuses=[],loads=[],locks=[],timers=new Map(),cache=new Map();
  const client={from(table){const req={table,filters:{},op:'read'}; const api={select(){return api;},eq(k,v){req.filters[k]=v;return api;},insert(row){req.op='insert';req.row=clone(row);return api;},update(row){req.op='update';req.row=clone(row);return api;},async maybeSingle(){
    requests.push(clone(req)); if(held){const wait=held;held=null;await wait;}
    if(failure){const error=failure;failure=null;return{error};}
    const uid=req.row?.user_id||req.filters.user_id,existing=rows.get(uid);
    if(req.op==='read')return {data:existing?clone(existing):null};
    if(req.op==='insert'&&existing)return{error:{code:'23505'}};
    if(req.op==='update'&&(!existing||existing.updated_at!==req.filters.updated_at))return{data:null};
    const row={...req.row,updated_at:'r'+(++version)};rows.set(uid,row);return{data:{updated_at:row.updated_at}};
  }};return api;}};
  const storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
  const store=create({client:()=>client,userId:()=>owner,storage,onStatus:s=>statuses.push(s),onLoad:s=>loads.push(s),onLock:s=>locks.push(s),merge:rules.mergeWorlds,setTimeout:fn=>{const id=Symbol();timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
  return {store,rows,requests,statuses,loads,locks,cache,async connect(uid){owner=uid;await store.connect(uid);},owner(uid){owner=uid;},fail(error={message:'offline'}){failure=error;},hold(){let release;held=new Promise(r=>release=r);return release;}};
}
test('guest starts without durable writes; first account saves and reloads',async()=>{
  const h=harness();await h.connect(null);assert.equal(h.loads.length,1);assert.equal(h.locks.at(-1),false);h.store.changed(world());await h.store.flush();assert.equal(h.requests.length,0);assert.equal(h.cache.size,0);
  await h.connect('A');h.store.changed(world());await h.store.flush();assert.equal(h.rows.get('A').detail_json.meta.gameState.players[0].name,'Ece');assert.equal(h.cache.size,0);
  await h.store.connect('A',true);assert.equal(h.loads.at(-1).players[0].name,'Ece');assert.equal(h.store.getState().phase,'ready');
});
test('account switch cannot write the old world into a new account; stale reply ignored',async()=>{
  const h=harness();await h.connect('A');const release=h.hold();h.store.changed(world('A'));const oldSave=h.store.flush();await h.connect('B');h.store.changed(world('B'));await h.store.flush();release();await oldSave;
  assert.equal(h.rows.get('A').detail_json.meta.gameState.players[0].name,'A');assert.equal(h.rows.get('B').detail_json.meta.gameState.players[0].name,'B');assert.equal(h.store.getState().uid,'B');
  assert(h.requests.filter(r=>r.op==='update').every(r=>r.row.user_id===r.filters.user_id));
});
test('duplicate auth events do not restart the in-flight account load',async()=>{
  const h=harness();h.owner('A');const release=h.hold();const loading=h.store.connect('A');await h.store.connect('A');assert.equal(h.requests.length,1);release();await loading;
});
test('load callback notifications are suppressed while changing accounts',async()=>{
  let store,owner='A',rendered=world('OLD');const writes=[];const client={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null}),insert:r=>{writes.push(r);return q;}};return q;}};
  store=create({client:()=>client,userId:()=>owner,onLoad:s=>{rendered=s;store.changed(rendered);},onLock:()=>store.changed(rendered),onStatus(){},setTimeout:()=>1,clearTimeout(){}});
  await store.connect('A');owner='B';await store.connect('B');await store.flush();assert.equal(writes.length,0);
});
test('network failure preserves an owner-scoped draft and retry verifies server success',async()=>{
  const h=harness();await h.connect('A');h.fail();h.store.changed(world());await h.store.flush();assert.equal(h.store.getState().phase,'error');assert(h.cache.has(DRAFT_PREFIX+'A'));assert(!h.statuses.some(s=>s.message==='İlerlemen hesabına kaydedildi.'));
  await h.store.flush();assert.equal(h.store.getState().phase,'ready');assert.equal(h.cache.size,0);
});
test('failed load never saves an empty replacement and does not show saved',async()=>{
  const h=harness();h.fail();await h.connect('A');h.store.changed(world());await h.store.flush();assert.equal(h.store.getState().phase,'load-error');assert.equal(h.requests.filter(r=>r.op!=='read').length,0);assert.equal(h.locks.at(-1),true);
});
test('new changes during a save are queued and saved under the returned revision',async()=>{
  const h=harness();await h.connect('A');const release=h.hold();h.store.changed(world('first'));const first=h.store.flush();h.store.changed(world('second'));release();await first;await h.store.flush();assert.equal(h.rows.get('A').detail_json.meta.gameState.players[0].name,'second');assert.equal(h.requests.at(-1).filters.updated_at,'r1');
});
test('concurrent insert/update conflicts preserve both worlds when requested',async()=>{
  const h=harness();await h.connect('A');h.rows.set('A',{detail_json:{meta:{gameState:world('Remote')}},updated_at:'external'});h.store.changed(world('Local'));await h.store.flush();assert.equal(h.store.getState().phase,'conflict');assert.equal(h.rows.get('A').updated_at,'external');await h.store.keepBoth();assert.equal(h.store.getState().phase,'ready');assert.deepEqual(h.rows.get('A').detail_json.meta.gameState.players.map(p=>p.name),['Remote','Local']);
  h.rows.get('A').updated_at='another-device';h.store.changed(world('Third'));await h.store.flush();assert.equal(h.store.getState().phase,'conflict');await h.store.reload();assert.equal(h.store.getState().phase,'ready');assert.equal(h.cache.size,0);
});
test('matching revision recovers unsent draft; foreign owner drafts are ignored',async()=>{
  const h=harness();h.cache.set(DRAFT_PREFIX+'A',JSON.stringify({owner:'A',baseRevision:null,snapshot:world('Recovered')}));await h.connect('A');await h.store.flush();assert.equal(h.rows.get('A').detail_json.meta.gameState.players[0].name,'Recovered');
  h.cache.set(DRAFT_PREFIX+'B',JSON.stringify({owner:'A',baseRevision:null,snapshot:world('Wrong owner')}));await h.connect('B');assert.equal(h.loads.at(-1),null);
});
test('hero unlocks cannot be equipped early or imported into the wrong slot',()=>{
  assert.equal(rules.canEquip('cape-sun',7),false);assert.equal(rules.canEquip('cape-sun',8),true);
  assert.deepEqual(rules.normalizeHero({cape:'cape-star',hat:'cape-sun'},8),{cape:'cape-none',hat:'hat-none'});
  assert.deepEqual(rules.normalizeHero({cape:'cape-star',hat:'hat-crown'},40),{cape:'cape-star',hat:'hat-crown'});
});
function engineHarness() {
  const {window,document}=parseHTML(fs.readFileSync('oyun/matematik-vadisi.html','utf8'));
  // Simulated DOM and canvas: logic tests, no browser or visual assertions.
  const noop=()=>{};
  const ctx=new Proxy({measureText:s=>({width:String(s).length*8}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  document.getElementById('mv-canvas').getContext=()=>ctx;
  document.getElementById('mv-canvas').getBoundingClientRect=()=>({width:800,height:490,left:0,top:0});
  for(const el of document.querySelectorAll('select'))Object.defineProperty(el,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.getAttribute('value')??this.firstElementChild?.getAttribute('value')??'';},set(v){this._value=String(v);}});
  Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(v){v?this.setAttribute('checked',''):this.removeAttribute('checked');}});
  let clock=0,seq=0;const timers=new Map(),intervals=[];const base=Date.now();class ClockDate extends Date{constructor(...args){super(...(args.length?args:[base+clock]));}static now(){return base+clock;}}
  const sandbox={window,document,console,Date:ClockDate,crypto:require('node:crypto').webcrypto,performance:{now:()=>clock},setTimeout:fn=>{timers.set(++seq,fn);return seq;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,ResizeObserver:class{observe(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),matchMedia:()=>({matches:false}),devicePixelRatio:1};
  window.MatematikVadisiRules=rules;window.matchMedia=sandbox.matchMedia;window.getComputedStyle=sandbox.getComputedStyle;
  const source=fs.readFileSync('js/matematik-vadisi-engine.js','utf8').replace('setupV4();setupSite();',`window.__test={generate,decorateQuestion,openQuestion,completeAction,allowed,sceneObjects,createIsland,canPlace,view,answer,render,dayState,getQuest,get player(){return player;},get question(){return question;}};setupV4();setupSite();`);
  vm.runInNewContext(source,sandbox,{filename:'matematik-vadisi-engine.js'});
  return {window,document,sandbox,advance(ms){clock+=ms;intervals.forEach(fn=>fn());},game:window.kemalMathGame,t:window.__test,flush(){for(let n=0;timers.size&&n<100;n++){const batch=[...timers.values()];timers.clear();batch.forEach(fn=>fn());}},create(grade=2,route='adventure'){
    const $=id=>document.getElementById(id);$('mv-player-name').value='Ece';$('mv-grade').value=grade;$('mv-grade').dispatchEvent(new window.Event('change'));$('mv-route').value=route;$('mv-create-player').click();assert.equal(window.kemalMathGame.snapshot().players.length,1);
  }};
}
test('standalone engine boots and creates a named playable character',()=>{
 const h=engineHarness();assert.equal(h.game.snapshot().players.length,0);h.create();assert.equal(h.t.player.name,'Ece');assert.equal(h.document.getElementById('mv-play').hidden,false);
});
test('15,000 generated questions obey grade, table, operand and answer limits',()=>{
 const h=engineHarness();h.create();
 for(let grade=0;grade<=4;grade++)for(let i=0;i<3000;i++){
   const ops=grade===0?['recognize']:grade===1?['add','sub']:['add','sub','mul','div'],q=h.t.generate(grade,ops),max=grade<=1?20:grade===2?100:1000;
   assert(q.answer>=0&&q.answer<=max);assert(q.a<=max&&q.b<=max);assert.equal(new Set(q.options).size,grade===0?3:4);assert(q.options.includes(q.answer));assert(q.options.every(n=>n>=0&&n<=max));
   if(q.op==='add')assert.equal(q.answer,q.a+q.b);if(q.op==='sub')assert.equal(q.answer,q.a-q.b);if(q.op==='mul')assert.equal(q.answer,q.a*q.b);if(q.op==='div')assert.equal(q.answer,q.a/q.b);
   if(['mul','div'].includes(q.op)){const factor=q.op==='mul'?q.a:q.b;assert((grade===2?[1,2,3,4,5,10]:[1,2,3,4,5,6,7,8,9,10]).includes(factor));}
 }
});
test('keypad retries, object groups, and equipped hero state survive snapshot reload',()=>{
 const h=engineHarness();h.create(2);const p=h.t.player;p.answered=2;h.t.openQuestion(p.objects[0]);assert.equal(h.t.question.activity,'keypad');const input=h.document.getElementById('mv-built-answer'),submit=h.document.getElementById('mv-manual-submit');input.value=String(h.t.question.answer+1);submit.click();assert.equal(p.hp,4);assert.equal(submit.disabled,false);input.value=String(h.t.question.answer);submit.click();h.flush();assert.equal(p.wood,3);assert.equal(p.objects[0].depleted,true);
 p.answered=16;h.t.render();h.document.querySelector('[data-equip="cape-river"]').click();h.document.querySelector('[data-equip="hat-leaf"]').click();h.document.querySelector('[data-hero-skin="3"]').click();const saved=h.game.snapshot();h.game.replaceSnapshot(saved);assert.equal(h.t.player.hero.cape,'cape-river');assert.equal(h.t.player.hero.hat,'hat-leaf');assert.equal(h.t.player.skin,3);assert.equal(h.t.player.worldId,saved.players[0].worldId);assert.equal(h.t.player.objects[0].depleted,true);
 h.t.player.grade=1;h.t.player.ops=['add'];h.t.player.answered=1;h.t.openQuestion(h.t.player.objects[1]);assert.equal(h.t.question.activity,'groups');assert.equal(h.document.getElementById('mv-answers').hidden,true);
});
test('finite resources stay depleted, both complete quest routes retain math and unlock free building',()=>{
 for(const route of ['adventure','calm']){
  const h=engineHarness();h.create(2,route);const p=h.t.player;
  const solve=target=>{assert(h.t.allowed(target.type),'allowed '+target.type);h.t.openQuestion(target);assert(h.t.question,'question '+target.type);h.t.answer(h.t.question.answer,h.document.getElementById('mv-manual-submit'));h.flush();};
  for(const o of p.objects.filter(o=>['tree','rock','food'].includes(o.type)))solve(o);
  assert(p.objects.filter(o=>['tree','rock','food'].includes(o.type)).every(o=>o.depleted));assert.equal(h.t.allowed('tree'),false);
  solve({type:'build',x:7,y:7});assert(p.built);
  for(let guard=0;!p.won&&guard<80;guard++){
    const action=h.t.getQuest().action;const target=h.t.sceneObjects().find(o=>o.type===action&&!o.depleted)||{type:action,x:p.x,y:p.y};solve(target);
  }
  assert(p.won,route+' finished');assert.deepEqual([...p.ops],['mul']);assert.equal(p.grade,2);
  h.document.getElementById('mv-continue-world').click();solve({type:'explore',x:p.x,y:p.y});assert.equal(p.zone,'frontier');assert.equal(p.regions.length,1);
  solve(p.regions[0].objects.find(o=>o.type==='rock'));
  let place;for(let y=2;y<=13&&!place;y++)for(let x=2;x<=13&&!place;x++)if(h.t.canPlace(x,y))place={type:'place',kind:'cottage',x,y};assert(place);solve(place);assert.equal(p.regions[0].buildings.length,1);
  const saved=h.game.snapshot();h.game.replaceSnapshot(saved);assert.equal(h.t.player.regions[0].buildings.length,1);
 }
});
test('auth return accepts only the game path and consumes it once',()=>{
 const code=fs.readFileSync('js/game-auth-return.js','utf8');
 for(const next of ['/oyun/matematik-vadisi.html','https://evil.example','//evil.example','/admin/index.html']){
  const cache=new Map(),window={location:{search:'?next='+encodeURIComponent(next)}};vm.runInNewContext(code,{window,URLSearchParams,sessionStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)}});assert.equal(window.kemalGameAuthReturn.take(),next==='/oyun/matematik-vadisi.html'?next:null);assert.equal(window.kemalGameAuthReturn.take(),null);
 }
});

test('site account adapter unlocks guest play, loads member worlds, and resets on logout',async()=>{
 const h=engineHarness();let state={ready:true,user:null,profile:null,error:''};
 const cache=new Map();h.sandbox.sessionStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
 const fixture=harness();h.window.MatematikVadisiStore={create};h.window.kemalUserAuth={getState:()=>state,getDisplayName:()=> 'Öğrenci',getPanelHref:()=>'/ogrenci-paneli.html',getClient:()=>({from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;}}),ready:async()=>state};
 vm.runInNewContext(fs.readFileSync('js/matematik-vadisi-cloud.js','utf8'),h.sandbox);
 await new Promise(r=>setImmediate(r));assert.equal(h.document.getElementById('matematik-vadisi').inert,false);assert.equal(h.document.getElementById('mv-sign-in').hidden,false);h.create();assert.equal(h.game.snapshot().players.length,1);
 state={ready:true,user:{id:'MEMBER'},profile:{role:'student',active:true},error:''};h.window.dispatchEvent(new h.window.Event('kemal-user-auth-changed'));await new Promise(r=>setImmediate(r));assert.equal(h.game.snapshot().players.length,0);assert.equal(h.document.getElementById('mv-sign-in').hidden,true);assert.equal(h.document.getElementById('mv-claim-guest').hidden,false);
 state={ready:true,user:null,profile:null,error:''};h.window.dispatchEvent(new h.window.Event('kemal-user-auth-changed'));await new Promise(r=>setImmediate(r));assert.equal(h.game.snapshot().players.length,0);assert.equal(h.document.getElementById('matematik-vadisi').inert,false);
});
test('every local runtime asset exists and catalog links to the standalone game',()=>{
 const html=fs.readFileSync('oyun/matematik-vadisi.html','utf8');for(const match of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"?]+)(?:\?[^" ]*)?"/g))assert(fs.existsSync('.'+match[1]),match[1]);assert(fs.readFileSync('oyun/oyunlar.html','utf8').includes('href="matematik-vadisi.html"'));
});

test('short projects finish during a break and persist after reloading the world',()=>{
 const h=engineHarness();h.create();const p=h.t.player;p.built=true;p.wood=8;p.stone=3;
 h.t.openQuestion({type:'projectBird',x:7,y:7});h.t.answer(h.t.question.answer,h.document.getElementById('mv-manual-submit'));h.flush();assert.equal(p.projects.bird.status,'building');assert.equal(p.wood,6);assert.equal(p.stone,2);
 h.document.getElementById('mv-pause').click();const used=p.day.usedMs;h.advance(21000);assert.equal(p.projects.bird.status,'done');assert.equal(p.day.usedMs,used);const saved=h.game.snapshot();h.game.replaceSnapshot(saved);assert.equal(h.t.player.projects.bird.status,'done');
});
test('daily break finishes an open question, blocks the next action and survives a reload',()=>{
 const h=engineHarness();h.create();const p=h.t.player;p.day.limit=10;p.day.usedMs=599500;h.t.openQuestion(p.objects[0]);h.advance(1000);assert(h.t.question);h.t.answer(h.t.question.answer,h.document.getElementById('mv-manual-submit'));h.flush();assert.equal(p.wood,3);assert.equal(h.document.getElementById('mv-break').hidden,false);assert.equal(h.document.getElementById('mv-next-action').disabled,true);
 const saved=h.game.snapshot();h.game.replaceSnapshot(saved);assert.equal(h.t.player.day.usedMs,600500);assert.equal(h.t.player.day.limit,10);
});
