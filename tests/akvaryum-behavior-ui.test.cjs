const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const C=require('../js/akvaryum-core.js');
function syncFixture({realtime=false}={}){
 let row=null,offline=false,reads=0,writes=0;
 const channels=[],liveRows=new Map();
 const emit=signal=>{liveRows.set(signal.class_id,signal);for(const channel of channels)for(const entry of channel.callbacks)if(entry.filter.event==='UPDATE')entry.fn({new:signal});};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const client={from:()=>({select:()=>({eq(){return this;},async maybeSingle(){reads++;return offline?{error:{}}:{data:clone(row)};}})}),rpc:async(name,args)=>{
  if(offline)return {error:{}};
  if(name==='aquarium_live_snapshot')return {data:{server_now:new Date().toISOString(),rows:[...liveRows.values()]}};
  if(name==='aquarium_pick_student'){const cls=row.document.classes.find(c=>c.id===args.p_class_id),s=cls.students.at(-1),signal={owner_id:'test-teacher',class_id:cls.id,account_revision:row.revision,sequence:(liveRows.get(cls.id)?.sequence||0)+1,pick_id:args.p_request_id,student_id:s.id,picked_at:new Date().toISOString(),pick_date:C.dayKey(),round_ids:[s.id]};emit(signal);return {data:{...signal,server_now:new Date().toISOString()}};}
  writes++;if(args.p_revision!==(row?.revision||0))return {error:{code:'40001'}};
  row={document:clone(args.p_document),revision:(row?.revision||0)+1};if(realtime)emit({owner_id:'test-teacher',class_id:'',account_revision:row.revision});return {data:row.revision};
 }};
 if(realtime){client.channel=()=>{const channel={callbacks:[],on(type,filter,fn){this.callbacks.push({filter,fn});return this;},subscribe(fn){channels.push(this);this.status=fn;fn('SUBSCRIBED');return this;}};return channel;};client.removeChannel=channel=>channels.splice(channels.indexOf(channel),1);}
 return {factory:options=>require('../js/akvaryum-cloud.js').create({...options,client}),
  client,emit,
  seed(document){row={document:clone(document),revision:1};},edit(fn){fn(row.document);row.revision++;},get document(){return clone(row.document);},
  award(index=0,behavior=0){const cl=row.document.classes[0];C.ensureDay(cl.students[index],cl);C.awardBehavior(cl.students[index],cl,C.dayKey(),cl.tasks[behavior].id);row.revision++;},
  set offline(v){offline=v;},get writes(){return writes;},get reads(){return reads;}};
}
test('account polling refreshes an open score/history dialog and keeps typed settings intact',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,cloudFactory:remote.factory}),d=h.document;
 h.click('.fish');h.modal.scrollTop=130;remote.award();await h.pollCloud();
 assert.equal(h.modal.open,true);assert.equal(h.modal.scrollTop,130);assert.equal(d.querySelector('.fish-points').textContent,'★ 7');
 assert.match(d.querySelector('.student-facts').textContent,/Toplam puan7/);assert.match(d.querySelector('.behavior-choice').textContent,/Bugün 1 kez/);
 h.click('[data-action="history"]');remote.award(0,1);await h.pollCloud();assert.equal(d.querySelectorAll('.history-entry').length,2);
 h.click('[data-action="settings"]');const field=d.querySelector('#renameClassForm [name="name"]');field.value='Henüz kaydetmediğim ad';
 remote.award();await h.pollCloud();assert.equal(d.querySelector('#renameClassForm [name="name"]'),field);assert.equal(field.value,'Henüz kaydetmediğim ad');
 assert.equal(C.earned(h.saved().classes[0].students[0]),15);assert.equal(remote.writes,1,'read-only refresh must not overwrite cloud');
});
test('manual sync pulls clean remote changes; offline warning stays visible in fullscreen and clears on recovery',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,cloudFactory:remote.factory}),d=h.document;
 h.click('[data-action="settings"]');remote.award();h.click('#modal [data-action="retry-cloud"]');await new Promise(r=>setImmediate(r));
 assert.equal(C.earned(h.saved().classes[0].students[0]),7);assert.equal(remote.writes,1);assert.equal(d.getElementById('cloudWarning').hidden,true);
 h.click('[data-action="close"]');h.click('.scene-controls [data-action="fullscreen"]');await new Promise(r=>setImmediate(r));
 remote.offline=true;await h.pollCloud();const warning=d.getElementById('cloudWarning');
 assert.equal(warning.hidden,false);assert.equal(warning.parentElement.id,'aquarium');assert.match(warning.textContent,/erişilemiyor/);
 remote.offline=false;remote.award();h.click('#cloudWarning [data-action="retry-cloud"]');await new Promise(r=>setImmediate(r));
 assert.equal(warning.hidden,true);assert.equal(C.earned(h.saved().classes[0].students[0]),14);assert.equal(remote.writes,1);
});
function legacyConflictFactory(remote){return options=>{
 const local=JSON.parse(options.storage.getItem(options.key));remote.seed(local);remote.edit(doc=>{const c=doc.classes[0];C.awardBehavior(c.students[0],c,C.dayKey(),c.tasks[1].id);});
 options.storage.setItem(options.key+'_cloud',JSON.stringify({revision:1,dirty:true,conflict:true}));return remote.factory(options);
};}
test('two open teacher devices update points and a shared random winner without a polling tick or page reload',async()=>{
 const remote=syncFixture({realtime:true}),a=await harness({ageDays:0,extraNames:['Ada'],cloudFactory:remote.factory,liveClient:remote.client}),factory=options=>{const cloud=remote.factory(options);return {...cloud,boot:()=>cloud.boot(C.initialState())};};
 const b=await harness({ageDays:0,cloudFactory:factory,liveClient:remote.client});await new Promise(r=>setImmediate(r));
 const pupil=a.saved().classes[0].students[0],id=pupil.id;b.click('[data-id="'+id+'"]');
 remote.award();remote.emit({owner_id:'test-teacher',class_id:'',account_revision:2});await new Promise(r=>setImmediate(r));
 assert.equal(C.earned(b.saved().classes[0].students[0]),7);assert.match(b.document.querySelector('.student-facts').textContent,/Toplam puan7/);assert.equal(remote.writes,1);
 a.click('[data-id="'+id+'"]');a.click('.behavior-choice');await a.flushWrites();await new Promise(r=>setImmediate(r));
 assert.equal(C.earned(b.saved().classes[0].students[0]),14);assert.match(b.document.querySelector('.student-facts').textContent,/Toplam puan14/);assert.equal(remote.writes,2);
 a.click('[data-action="random-student"]');a.click('[data-action="random-draw"]');await new Promise(r=>setImmediate(r));
 // An unrelated open scoring dialog is preserved on the receiving device.
 assert.equal(b.document.getElementById('modalTitle').textContent,'Deniz');assert.match(b.document.getElementById('toast').textContent,/Ada/);
 b.click('[data-action="close"]');b.click('[data-action="random-student"]');assert.equal(b.document.getElementById('pickerName').textContent,'Ada');
 for(const h of [a,b]){for(let i=0;i<180;i++){const frame=h.frames.shift();if(frame)frame(100+i*20);}assert.equal(h.document.getElementById('pickerName').textContent,'Ada');}
 assert.equal(C.earned(a.saved().classes[0].students[0]),14);assert.equal(remote.writes,2,'picker must never save an account or score');
});
test('offline device awards stay local and are pushed to the other open screen automatically after reconnect',async()=>{
 const remote=syncFixture({realtime:true}),a=await harness({ageDays:0,cloudFactory:remote.factory,liveClient:remote.client}),factory=options=>{const cloud=remote.factory(options);return {...cloud,boot:()=>cloud.boot(C.initialState())};};
 const b=await harness({ageDays:0,cloudFactory:factory,liveClient:remote.client});await new Promise(r=>setImmediate(r));remote.offline=true;
 a.click('.fish');a.click('.behavior-choice');await a.flushWrites();assert.equal(C.earned(a.saved().classes[0].students[0]),7);assert.equal(C.earned(b.saved().classes[0].students[0]),0);assert.equal(a.document.getElementById('cloudWarning').hidden,false);
 remote.offline=false;await a.pollCloud();await new Promise(r=>setImmediate(r));assert.equal(C.earned(b.saved().classes[0].students[0]),7);assert.equal(a.document.getElementById('cloudWarning').hidden,true);
});
test('two offline first awards of the same behavior keep separate points and converge through live notifications',async()=>{
 const remote=syncFixture({realtime:true}),a=await harness({ageDays:0,cloudFactory:remote.factory,liveClient:remote.client}),factory=options=>{const cloud=remote.factory(options);return {...cloud,boot:()=>cloud.boot(C.initialState())};};
 const b=await harness({ageDays:0,cloudFactory:factory,liveClient:remote.client});await new Promise(r=>setImmediate(r));remote.offline=true;
 for(const h of [a,b]){h.click('.fish');h.click('.behavior-choice');await h.flushWrites();assert.equal(C.earned(h.saved().classes[0].students[0]),7);}
 remote.offline=false;await a.pollCloud();await new Promise(r=>setImmediate(r));await a.flushWrites();await b.flushWrites();await new Promise(r=>setImmediate(r));
 for(const h of [a,b]){assert.equal(C.earned(h.saved().classes[0].students[0]),14);assert.equal(h.saved().classes[0].students[0].feeds.length,2);assert.equal(h.document.getElementById('cloudWarning').hidden,true);}
});
test('a notified revision remains pending until REST has actually supplied it, even while the socket stays connected',async()=>{
 const remote=syncFixture({realtime:true}),h=await harness({ageDays:0,cloudFactory:remote.factory,liveClient:remote.client});await new Promise(r=>setImmediate(r));
 remote.emit({owner_id:'test-teacher',class_id:'',account_revision:3});await new Promise(r=>setImmediate(r));remote.award();remote.award();
 remote.emit({owner_id:'test-teacher',class_id:'',account_revision:3});await h.pollCloud();assert.equal(C.earned(h.saved().classes[0].students[0]),14);
});
test('a shared random activity appears automatically on an idle classroom screen, including fullscreen',async()=>{
 const remote=syncFixture({realtime:true}),h=await harness({ageDays:0,extraNames:['Ada'],cloudFactory:remote.factory,liveClient:remote.client}),d=h.document;
 h.click('.scene-controls [data-action="fullscreen"]');await new Promise(r=>setImmediate(r));const cls=h.saved().classes[0];
 remote.emit({owner_id:'test-teacher',class_id:cls.id,account_revision:1,sequence:1,pick_id:'server-pick',student_id:cls.students[1].id,picked_at:new Date().toISOString(),pick_date:C.dayKey(),round_ids:[cls.students[1].id]});
 assert.equal(h.modal.open,true);assert.equal(h.modal.parentNode,d.getElementById('aquarium'));assert.match(d.getElementById('pickerStatus').textContent,/seçiliyor/);
 for(let i=0;i<180;i++){const frame=h.frames.shift();if(frame)frame(100+i*20);}assert.equal(d.getElementById('pickerName').textContent,'Ada');assert.equal(d.getElementById('pickerResultActions').hidden,false);assert.equal(remote.writes,1);
});
test('legacy conflict opens a read-only comparison from banner or settings and requires a separate whole-account confirmation',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,cloudFactory:legacyConflictFactory(remote),configure:(doc,cls,s)=>C.awardBehavior(s,cls,C.dayKey(),cls.tasks[0].id)}),d=h.document;
 assert.equal(d.getElementById('cloudWarning').hidden,false);assert.equal(d.getElementById('cloudRetryButton').textContent,'Kayıtları karşılaştır');
 h.click('#cloudRetryButton');await new Promise(r=>setImmediate(r));assert.match(d.getElementById('modalTitle').textContent,/Kayıtları karşılaştır/);
 const row=d.querySelector('.sync-comparison tbody tr');assert.match(row.children[1].textContent,/7 toplam puan/);assert.match(row.children[2].textContent,/8 toplam puan/);assert.equal(remote.writes,0);assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 assert.ok(d.querySelector('[data-action="export-sync-local"]'));assert.ok(d.querySelector('[data-action="export-sync-remote"]'));
 h.click('[data-action="use-cloud"]');assert.match(d.getElementById('modalTitle').textContent,/Tüm|tüm/);assert.match(d.getElementById('modalContent').textContent,/birleştirilmeyecek/);assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 h.click('[data-action="close"]');h.click('[data-action="settings"]');assert.equal(d.querySelector('#modal [data-action="use-cloud"]'),null,'settings must not expose a blind replacement');
 h.click('#modal [data-action="retry-cloud"]');await new Promise(r=>setImmediate(r));h.click('[data-action="use-cloud"]');h.click('[data-action="confirm"]');await new Promise(r=>setImmediate(r));
 assert.equal(C.earned(h.saved().classes[0].students[0]),8);assert.equal(d.getElementById('cloudWarning').hidden,true);assert.equal(d.getElementById('cloudRetryButton').textContent,'Şimdi eşitle');assert.equal(remote.writes,0);
});
test('comparison refuses a stale account replacement, then allows an explicitly confirmed current local copy',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,cloudFactory:legacyConflictFactory(remote)}),d=h.document;
 h.click('#cloudRetryButton');await new Promise(r=>setImmediate(r));h.click('[data-action="use-local"]');remote.award(0,2);
 h.click('[data-action="confirm"]');await new Promise(r=>setImmediate(r));assert.equal(remote.writes,0);assert.match(d.querySelector('.sync-comparison tbody tr').children[2].textContent,/2 toplam puan/);
 assert.equal(d.getElementById('cloudWarning').hidden,false);h.click('[data-action="use-local"]');h.click('[data-action="confirm"]');await new Promise(r=>setImmediate(r));
 assert.equal(remote.writes,1);assert.equal(C.earned(remote.document.classes[0].students[0]),0);assert.equal(d.getElementById('cloudWarning').hidden,true);
});
test('a conflict retry clears the warning without writing when the current full account is already identical',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,cloudFactory:legacyConflictFactory(remote)}),d=h.document;
 assert.equal(d.getElementById('cloudWarning').hidden,false);remote.seed(h.saved());h.click('#cloudRetryButton');await new Promise(r=>setImmediate(r));
 assert.equal(d.getElementById('cloudWarning').hidden,true);assert.equal(h.modal.open,undefined);assert.equal(remote.writes,0);assert.match(d.getElementById('saveStatus').textContent,/eşit/);
});
test('natural strokes survive automatic lightweight quality and keep one animation loop over a long session',async()=>{
  const h=await harness({species:'turtle',ageDays:0,autoQuality:true}),d=h.document,fish=d.querySelector('.fish'),joint=d.querySelector('.creature-joint');
  const record=h.saved(),start=fish.style.transform;let now=100;
  for(let i=0;i<130;i++){now+=40;h.frames.shift()(now);}
  assert.equal(h.window.SitePerformance.lite(),true);
  assert.equal(d.querySelector('.creature-joint'),joint,'quality change must keep the natural anatomy');
  const poses=new Set();
  for(let i=0;i<36000;i++) {now+=50;h.frames.shift()(now);if(i%137===0)poses.add(joint.style.transform);assert.equal(h.frames.length,1);}
  assert.ok(poses.size>20);assert.notEqual(fish.style.transform,start);assert.deepEqual(h.saved(),record);assert.equal(h.modelCreates(),0);
  for(const species of ['jellyfish','octopus']) {
    const other=await harness({species,ageDays:0,lite:true}),part=other.document.querySelector('.creature-joint'),strokes=new Set();
    assert.ok(part);for(let i=0;i<180;i++){other.frames.shift()(100+i*50);strokes.add(part.style.transform);}
    assert.ok(strokes.size>20);
  }
});
test('all six new animals retain jointed natural strokes in lightweight and 3D modes without extra models',async()=>{
 for(const species of ['boxfish','bannerfish','batfish','cleanershrimp','hermitcrab','cuttlefish']) {
  for(const creatureMode of ['natural','3d']) {
   const h=await harness({species,ageDays:0,lite:true,creatureMode}),parts=[...h.document.querySelectorAll('.creature-joint')];assert.ok(parts.length>0 && parts.length<=2);
   const poses=new Set();for(let i=0;i<300;i++){h.frames.shift()(100+i*50);poses.add(parts.map(p=>p.style.transform).join(':'));assert.equal(h.frames.length,1);}
   assert.ok(poses.size>30,species+' must keep moving');assert.equal(h.modelCreates(),0);
  }
 }
 const h=await harness({species:'cleanershrimp',ageDays:0,creatureMode:'3d'});assert.equal(h.modelCreates(),0);assert.equal(h.document.querySelectorAll('.creature-model').length,0);
});
test('stationary hover, retained keyboard focus and a missed pointer release never trap healthy swimmers',async()=>{
  for(const type of ['pointerenter','focus','pointerdown']) {
    const h=await harness({ageDays:0}),fish=h.document.querySelector('.fish'),event=new h.window.Event(type);
    fish.dispatchEvent(event);const start=fish.style.transform;
    for(let i=0;i<6;i++)h.frames.shift()(100+i*50);
    assert.equal(fish.style.transform,start,'allow a short hold to select the fish');
    for(let i=6;i<100;i++)h.frames.shift()(100+i*50);
    assert.notEqual(fish.style.transform,start,type+' must resume without a pointerleave or blur');
    h.click(fish);assert.equal(h.modal.open,true);
  }
});
test('lightweight mode continues swimming on a 60Hz display instead of skipping every RAF',async()=>{
  const h=await harness({lite:true,ageDays:0}),fish=h.document.querySelector('.fish');
  const start=fish.style.transform;
  for(let i=0;i<120;i++)h.frames.shift()(100+i*1000/60);
  assert.notEqual(fish.style.transform,start);assert.equal(h.modelCreates(),0);
});
test('natural anatomy reuses the selected image and classic mode restores it without changing class records',async()=>{
  const h=await harness({species:'turtle',ageDays:0}),d=h.document,before=h.saved();
  assert.equal(d.querySelectorAll('.creature-joint').length,2);assert.equal(h.modelCreates(),0);
  assert.ok([...d.querySelectorAll('.fish-art img')].every(img=>img.src.includes('/deniz-kaplumbagasi.webp')));
  h.click('[data-action="settings"]');const control=d.getElementById('creatureMode');control.querySelector('[value="classic"]').selected=true;control.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  assert.equal(d.querySelectorAll('.creature-joint').length,0);assert.equal(d.querySelector('.fish-art').style.getPropertyValue('--body-mask'),'none');
  assert.equal(h.creatureMode(),'classic');assert.deepEqual(h.saved(),before);
});
test('3D uses one renderer, limits paint cadence and survives rewards while mode changes remain device-only',async()=>{
  const h=await harness({creatureMode:'3d',ageDays:0,extraNames:['Ada','Ece']}),d=h.document;
  assert.equal(h.modelCreates(),1);assert.equal(d.querySelectorAll('.has-3d').length,3);
  const initial=h.modelCalls.length;for(let i=0;i<60;i++)h.frames.shift()(100+i*16.67);
  assert.ok(h.modelCalls.length-initial<=3*16,'3D paint count must remain below 18 per second per fish');
  h.click('.fish');h.click('.behavior-choice');assert.equal(d.querySelector('.fish-points').textContent,'★ 7');
  h.click('[data-action="settings"]');const control=d.getElementById('creatureMode');control.querySelector('[value="natural"]').selected=true;control.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  assert.equal(d.querySelectorAll('.has-3d,.creature-model').length,0);assert.ok(h.modelDisposes()>0);assert.equal(C.earned(h.saved().classes[0].students[0]),7);
});
test('unsupported, lost and slow 3D falls back to visible images; lite and 30/60-population scenes avoid WebGL',async()=>{
  for(const options of [{modelAvailable:false},{lite:true},{extraNames:Array.from({length:29},(_,i)=>'Öğrenci '+i)},{extraNames:Array.from({length:59},(_,i)=>'Öğrenci '+i)}]) {
    const h=await harness({creatureMode:'3d',ageDays:0,...options});
    assert.equal(h.document.querySelectorAll('.has-3d,.creature-model').length,0);assert.ok(h.document.querySelector('.fish-body-image').src);
    assert.equal(h.modelCalls.length,0);
  }
  const lost=await harness({creatureMode:'3d',ageDays:0});lost.failModels();lost.frames.shift()(100);lost.frames.shift()(170);
  assert.equal(lost.document.querySelectorAll('.has-3d,.creature-model').length,0);assert.ok(lost.modelDisposes()>0);
  const slow=await harness({creatureMode:'3d',ageDays:0,drawCost:12});for(let i=0;i<15;i++)slow.frames.shift()(100+i*70);
  assert.equal(slow.document.querySelectorAll('.has-3d').length,0);
  slow.click('[data-action="settings"]');assert.match(slow.document.getElementById('creatureStatus').textContent,/akıcılığı/);
});
test('resting 3D has one stable pose and resumes its joints on feeding; automatic lite mode restores the selected species',async()=>{
  const h=await harness({species:'octopus',creatureMode:'3d'}),d=h.document;
  const count=h.modelCalls.length;for(let i=0;i<12;i++)h.frames.shift()(100+i*70);
  assert.equal(h.modelCalls.length,count);assert.equal(h.modelCalls.at(-1)[2],false);
  h.click('.fish');h.click('.behavior-choice');h.frames.shift()(4000);h.frames.shift()(4070);assert.equal(h.modelCalls.at(-1)[2],true);
  h.window.SitePerformance.set('lite');assert.equal(d.querySelectorAll('.has-3d,.creature-model').length,0);
  assert.ok(d.querySelector('.fish-body-image').src.includes('/ahtapot.webp'));
});
async function harness({absent=false,sound=true,reduced=false,extraNames=[],deleteError=false,ageDays=2,chatTest=false,growth=false,species='clown',creatureMode=null,modelAvailable=true,lite=false,drawCost=0,autoQuality=false,displaySize=100,sceneWidth=900,sceneHeight=600,configure=null,clipboard=null,pearlRect=null,water=false,cloudFactory=null,liveClient=null,seasonalDate=null,search='',authPending=false,timeoutAuth=false}={}) {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen/akvaryum.html','utf8'));
  const state=C.initialState(),cls=state.classes[0],s=C.newStudent('Deniz',species);
  cls.tasks[0].points=7;cls.students.push(s);if(growth)cls.growth={enabled:true,thresholds:Array.from({length:10},(_,i)=>(i+1)*7)};s.createdAt=Date.now()-ageDays*86400000-1000;
  extraNames.forEach(name=>cls.students.push(C.newStudent(name)));
  const day=C.ensureDay(s,cls);day.absent=absent;
  state.settings.points=true;state.settings.classPoints=true;state.settings.feedSound=sound;
  configure?.(state,cls,s);
  let saved=JSON.stringify(state),backup=null,deleteCalls=0,sounds=0;const intervals=[],intervalPeriods=[],frames=[],resizeObservers=[],zeroTimers=[];let timerNow=Date.now(),frameNow=0,rafId=0;
  const cloudStorage=new Map([['kemal_class_aquarium_v1_test-teacher',saved]]);
  const modelCalls=[];let modelCreates=0,modelDisposes=0,modelFail=false;
  const waterPaints={};
  window.AquariumSeasonal={...require('../js/akvaryum-seasonal.js'),suggestion:()=>require('../js/akvaryum-seasonal.js').suggestion(seasonalDate?new Date(seasonalDate):new Date())};
  window.AquariumWater=require('../js/akvaryum-water.js');
  if(water)for(const id of ['waterLight','waterWaves']){
    const paint=waterPaints[id]={clears:0,strokes:0,alpha:0,geometry:0,stops:[]};
    document.getElementById(id).getContext=()=>({
      clearRect(){paint.clears++;paint.geometry=0;paint.stops=[];},save(){},restore(){},beginPath(){},closePath(){},
      createLinearGradient(){return {addColorStop(...args){paint.stops.push(args);}};},
      moveTo(){},lineTo(x,y){paint.geometry+=x+y;},quadraticCurveTo(x,y,a,b){paint.geometry+=x+y+a+b;},
      stroke(){paint.strokes++;},fill(){},set globalAlpha(v){paint.alpha=v;}
    });
  }
  window.AquariumAnatomy=require('../js/akvaryum-anatomy.js');
  window.AquariumCreature3D={create:()=>{modelCreates++;return {supported:modelAvailable,render:(canvas,...args)=>{modelCalls.push(args);frameNow+=drawCost;return !modelFail;},dispose:()=>modelDisposes++};}};
  window.SitePerformance={lite:()=>lite,mode:()=>lite?'lite':'auto',reportSlow(){if(autoQuality&&!lite){lite=true;window.dispatchEvent(new window.Event('site-performance-change'));}},set:value=>{lite=value==='lite';window.dispatchEvent(new window.Event('site-performance-change'));}};
  window.AquariumSocial=require('../js/akvaryum-social.js');
  window.AquariumCore=C;window.AquariumTimer={...require('../js/akvaryum-timer.js'),create:()=>require('../js/akvaryum-timer.js').create(()=>timerNow)};window.AquariumMotion=require('../js/akvaryum-motion.js');window.AquariumAudio={catalogue:require('../js/akvaryum-sounds.js').catalogue,tracks:{off:'Sessiz'},titles:{},current:()=> 'off',isPlaying:()=>false,setVolume(){},feed:async()=>{sounds++;}};
  window.kemalUserAuth={ready:()=>authPending?new Promise(()=>{}):Promise.resolve(),getState:()=>({ready:true}),getProfile:()=>({role:'teacher',approval_status:'active'}),getUser:()=>({id:'test-teacher'})};
  window.AquariumCloud=cloudFactory?{create:cloudFactory}:null;if(cloudFactory)window.kemalUserAuth.getClient=()=>({});
  window.AquariumLive=liveClient?require('../js/akvaryum-live.js'):null;if(liveClient)window.kemalUserAuth.getClient=()=>liveClient;
  if(chatTest)window.AquariumMotion={...window.AquariumMotion,step:fish=>fish.forEach(f=>{f.x=100;f.y=200;})};
  window.AquariumSharing={removeClass:async()=>{deleteCalls++;if(deleteError)throw Error("Bağlantı yok. Sınıf silinmedi.");}};
  if(cloudFactory)window.AquariumSharing.snapshot=()=>({});
  window.matchMedia=()=>({matches:reduced,addEventListener(){}});
  for(const el of document.querySelectorAll('*')) el.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});
  let shellRect=pearlRect||{left:sceneWidth/2-85,top:sceneHeight-160,width:170,height:145};
  const shell=document.getElementById('classPearl');shell.getBoundingClientRect=()=>shellRect;
  const area=document.getElementById('swimArea');Object.defineProperty(area,'clientWidth',{get:()=>sceneWidth});Object.defineProperty(area,'clientHeight',{get:()=>sceneHeight});
  const bed=document.getElementById('eggBed');Object.defineProperty(bed,'clientWidth',{value:900});Object.defineProperty(bed,'clientHeight',{value:700});
  const modal=document.getElementById('modal');modal.close=()=>{modal.open=false;};modal.showModal=()=>{modal.open=true;};
  const app=document.getElementById('aquariumApp');
  app.requestFullscreen=async()=>{document.fullscreenElement=app;document.dispatchEvent(new window.Event('fullscreenchange'));};
  document.exitFullscreen=async()=>{document.fullscreenElement=null;document.dispatchEvent(new window.Event('fullscreenchange'));};
  const context={window,document,navigator:{clipboard:{writeText:async value=>clipboard?.(value)}},location:{search,pathname:'/ogretmen/akvaryum.html',origin:'http://localhost'},URL,URLSearchParams,performance:{now:()=>frameNow},console,
    localStorage:{getItem:key=>key==='kemal_aquarium_display_size'?String(displaySize):key==='kemal_aquarium_creature_mode'?creatureMode:key.endsWith('_seasonal_dismissals')?(cloudStorage.get(key)||null):key.endsWith("_beforeClassDelete")?backup:cloudFactory?(cloudStorage.get(key)||null):saved,setItem:(key,value)=>{if(key==='kemal_aquarium_display_size')displaySize=Number(value);else if(key==='kemal_aquarium_creature_mode')creatureMode=value;else if(key.endsWith('_seasonal_dismissals'))cloudStorage.set(key,value);else if(key.endsWith("_beforeClassDelete"))backup=value;else if(cloudFactory){cloudStorage.set(key,value);if(key==='kemal_class_aquarium_v1_test-teacher')saved=value;}else saved=value;}},
    setTimeout:(fn,ms)=>{if(ms===0)zeroTimers.push(fn);if(ms===12000&&timeoutAuth)Promise.resolve().then(fn);return 1;},clearTimeout(){},setInterval:(fn,ms)=>{intervals.push(fn);intervalPeriods.push(ms);return intervals.length;},requestAnimationFrame:fn=>{const callback=now=>{frameNow=now;fn(now);};callback.id=++rafId;frames.push(callback);return callback.id;},cancelAnimationFrame:id=>{const index=frames.findIndex(fn=>fn.id===id);if(index>=0)frames.splice(index,1);},ResizeObserver:class{constructor(callback){this.callback=callback;}observe(element){resizeObservers.push({element,callback:this.callback});}},
    FormData:class {constructor(form){this.form=form;}get(name){return this.form.querySelector('[name="'+name+'"]').value;}}};
  await vm.runInNewContext(fs.readFileSync('js/akvaryum.js','utf8'),context);
  const click=selector=>{const el=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(el,selector);el.dispatchEvent(new window.Event('click',{bubbles:true}));};
  const submit=form=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  return {flushWrites:async()=>{let count=0;while(zeroTimers.length){assert.ok(count++<10,'writes must settle');await zeroTimers.shift()();}},pollCloud:()=>intervals[intervalPeriods.indexOf(3000)](),window,document,waterPaints,modal,click,submit,intervals,frames,resizeScene:(w,h)=>{sceneWidth=w;sceneHeight=h;resizeObservers.filter(o=>o.element===area).forEach(o=>o.callback());},resizePearl:rect=>{shellRect=rect;resizeObservers.filter(o=>o.element===shell).forEach(o=>o.callback());},advanceTimer:ms=>{timerNow+=ms;intervals[1]();},saved:()=>JSON.parse(saved),sounds:()=>sounds,backup:()=>JSON.parse(backup),deleteCalls:()=>deleteCalls,modelCalls,modelCreates:()=>modelCreates,modelDisposes:()=>modelDisposes,failModels:()=>{modelFail=true;},creatureMode:()=>creatureMode,displaySize:()=>displaySize};
}
test('board magnification stays device-local and preserves young fish growth, points and lightweight motion',async()=>{
 const options={ageDays:0,growth:true,sceneWidth:1240,sceneHeight:242,extraNames:Array.from({length:23},(_,i)=>'Öğrenci '+i),lite:true};
 const h=await harness(options),d=h.document;
 const id=h.saved().classes[0].students[0].id;
 h.click('[data-id="'+id+'"]');h.click('.behavior-choice');const before=h.saved(),fish=d.querySelector('[data-id="'+id+'"]'),base=Number.parseFloat(fish.style.getPropertyValue('--fish-size')),stage=fish.dataset.stage;
 h.click('[data-action="settings"]');const control=d.getElementById('creatureDisplaySize');assert.equal(control.value,'100');
 control.querySelector('[value="150"]').selected=true;control.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(h.displaySize(),150);assert.ok(Number.parseFloat(fish.style.getPropertyValue('--fish-size'))>base*1.4);
 assert.deepEqual(h.saved(),before);assert.equal(fish.dataset.stage,stage);assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 const old=fish.style.transform;for(let i=0;i<300;i++)h.frames.shift()(100+i*16.67);assert.notEqual(fish.style.transform,old);assert.equal(h.frames.length,1);
 const reopened=await harness({...options,displaySize:150});reopened.click('[data-action="settings"]');assert.equal(reopened.document.getElementById('creatureDisplaySize').value,'150');
 const otherDevice=await harness(options);otherDevice.click('[data-action="settings"]');assert.equal(otherDevice.document.getElementById('creatureDisplaySize').value,'100');
});
test('teacher sharing offers two parent scopes and saves an explicit scope without opening public classroom access',async()=>{
 const h=await harness({ageDays:0}),cls=h.saved().classes[0],id=cls.students[0].id,calls=[];
 h.window.AquariumSharing={sync:async()=>{},get:async()=>({id:'share',token:'class-token',enabled:false}),listOpen:async()=>[],childLinks:async()=>[],enableChild:async(c,s,student,scope)=>{calls.push({student,scope});},updateChildScope:async()=>{}};
 h.click('[data-action="settings"]');h.click('[data-action="sharing"]');await new Promise(r=>setImmediate(r));
 const control=h.document.getElementById('childScope-'+id);assert.ok(control);assert.equal(control.querySelectorAll('option').length,2);assert.equal(control.value,'child');
 control.querySelector('[value="class"]').selected=true;h.click('[data-action="enable-child"]');await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls,[{student:id,scope:'class'}]);assert.match(h.document.getElementById('modalContent').textContent,/Sınıfın tamamı izlemeye kapalı/);
});
test('clicking the fish opens teacher behaviors; one click feeds, sounds, clears hunger and updates both scores',async()=>{
  const h=await harness(),d=h.document;
  assert.match(d.querySelector('.fish').style.getPropertyValue('--points-gap'),/^\d+(?:\.\d+)?px$/);
  assert.match(d.querySelector('.fish-hunger').getAttribute('aria-label'),/2 gündür beslenmedi/);
  assert.equal(d.querySelector('.fish-hunger').classList.contains('hunger-icon'),false);
  assert.equal(d.querySelector('.fish-hunger').textContent,'Yem bekliyor');
  assert.equal(d.querySelector('.fish').classList.contains('is-hungry'),true);
  assert.equal(d.querySelector('.fish-hunger').hidden,false);
  h.click('.fish');assert.equal(h.modal.open,true);assert.equal(d.querySelectorAll('.behavior-choice').length,3);
  const button=d.querySelector('[data-action="reward-behavior"]');assert.match(button.textContent,/\+7 puan/);
  h.click(button);
  assert.equal(h.modal.open,false);assert.equal(h.sounds(),1);assert.equal(d.querySelector('.fish-hunger').hidden,true);assert.equal(d.querySelector('.fish').classList.contains('is-hungry'),false);
  assert.equal(d.querySelector('.fish-points').textContent,'★ 7');assert.equal(d.getElementById('classPearlScore').textContent,'7');
  assert.equal(d.querySelectorAll('.feed-particle').length,7);assert.equal(d.querySelectorAll('.feed-heart').length,1);
  const student=h.saved().classes[0].students[0];assert.equal(student.feeds.length,1);assert.equal(C.balance(student),0);
  h.click('.fish');const again=d.querySelector('[data-action="reward-behavior"]');assert.equal(again.disabled,false);assert.match(again.textContent,/Bugün 1 kez/);
  h.click(again);assert.equal(h.sounds(),2);assert.equal(h.saved().classes[0].students[0].feeds.length,2);
  assert.equal(d.querySelector('.fish-points').textContent,'★ 14');
  h.click(again);assert.equal(h.sounds(),2); // Stale double-click cannot award twice.
  h.click('.fish');assert.equal(d.querySelectorAll('.behavior-choice').length,3);assert.match(d.querySelector('.behavior-choice').textContent,/Bugün 2 kez/);
  h.click('[data-action="history"]');assert.equal(d.querySelectorAll('[data-action="revoke-point"]').length,2);
  const corrections=d.querySelectorAll('[data-action="revoke-point"]');h.click(corrections[1]);h.click('[data-action="confirm"]');
  assert.equal(C.earned(h.saved().classes[0].students[0]),7);
});
test('absent students cannot be fed from the popup and muted / reduced motion settings are respected',async()=>{
  const absent=await harness({absent:true});absent.click('.fish');
  assert.ok([...absent.document.querySelectorAll('.behavior-choice')].every(b=>b.disabled));
  absent.click('.behavior-choice');assert.equal(absent.sounds(),0);
  const quiet=await harness({sound:false,reduced:true});quiet.click('.fish');quiet.click('.behavior-choice');
  assert.equal(quiet.sounds(),0);assert.equal(quiet.document.querySelectorAll('.feed-particle').length,0);
  assert.equal(quiet.document.getElementById('classPearlScore').textContent,'7');
});
test('the sidebar opens the same scoring and feeding path, and settings require a valid score',async()=>{
  const h=await harness(),d=h.document;
  h.click('[data-action="panel"]');h.click('.student-row');h.click('.behavior-choice');
  assert.equal(h.sounds(),1);assert.equal(h.saved().classes[0].students[0].feeds.length,1);
  h.click('[data-action="settings"]');h.click('[data-action="tasks"]');
  let form=d.querySelector('.task-points-form');form.querySelector('[name="points"]').value='12';h.submit(form);
  let cls=h.saved().classes[0];assert.equal(cls.tasks[0].points,12);assert.equal(C.earned(cls.students[0]),7);
  form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Arkadaşıma yardım ettim';form.querySelector('[name="points"]').value='';h.submit(form);
  assert.equal(h.saved().classes[0].tasks.length,3);assert.match(d.getElementById('formError').textContent,/Puan/);
  form.querySelector('[name="points"]').value='10';h.submit(form);
  cls=h.saved().classes[0];assert.equal(cls.tasks.length,4);assert.equal(cls.tasks[3].points,10);
  h.click('[data-action="close"]');h.click('.fish');
  assert.match(d.querySelectorAll('.behavior-choice')[3].textContent,/Arkadaşıma yardım ettim.*\+10 puan/);
});
test('behavior creation reaches 100 templates, survives reload and refuses the 101st without changing points',async()=>{
 const h=await harness({configure:(state,cls)=>{
  while(cls.tasks.length<C.MAX_BEHAVIORS-1)cls.tasks.push({id:C.uid(),title:'Davranış '+cls.tasks.length,icon:'⭐',points:cls.tasks.length%2?1:-1});
 }}),d=h.document;
 h.click('[data-action="settings"]');h.click('[data-action="tasks"]');
 let form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Yüzüncü davranış';form.querySelector('[name="points"]').value='5';h.submit(form);
 const saved=h.saved(),cls=saved.classes[0],student=cls.students[0];
 assert.equal(cls.tasks.length,100);assert.match(d.getElementById('behaviorCount').textContent,/100 \/ 100/);
 assert.equal(C.validate(saved).classes[0].tasks.at(-1).title,'Yüzüncü davranış');
 assert.equal(C.earned(student),0);assert.equal(student.feeds.length,0);
 form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Fazladan davranış';form.querySelector('[name="points"]').value='2';h.submit(form);
 assert.deepEqual(h.saved(),saved);assert.match(d.getElementById('formError').textContent,/en fazla 100 davranış/);
 h.click('[data-action="close"]');h.click('.fish');
 const last=cls.tasks.at(-1);h.click('.behavior-choice[data-id="'+last.id+'"]');
 assert.equal(C.earned(h.saved().classes[0].students[0]),5);
});
test('removed behavior history no longer blocks new positive or development templates',async()=>{
 const h=await harness({configure:(state,cls,s)=>{
  for(let i=0;i<25;i++)s.days[C.dayKey()].tasks.push({id:C.uid(),title:'Eski davranış '+i,points:1,status:'done'});
 }}),d=h.document,before=h.saved().classes[0].students[0];
 h.click('[data-action="settings"]');h.click('[data-action="tasks"]');
 for(const [title,type] of [['Yeni olumlu','positive'],['Yeni gelişim','development']]){
  const form=d.getElementById('taskForm');form.querySelector('[name="title"]').value=title;form.querySelector('[name="points"]').value='3';
  const select=form.querySelector('[name="behaviorType"]');select.querySelectorAll('option').forEach(o=>o.selected=o.value===type);h.submit(form);
 }
 const saved=h.saved(),cls=saved.classes[0];assert.equal(cls.tasks.length,5);
 assert.equal(cls.tasks.at(-1).points,-3);assert.equal(C.earned(cls.students[0]),25);
 assert.deepEqual(cls.students[0].days[C.dayKey()].tasks.slice(0,28),before.days[C.dayKey()].tasks);
 assert.deepEqual(C.validate(saved),saved);
});
test('a full daily history rejects adding a positive template atomically',async()=>{
 const h=await harness({configure:(state,cls,s)=>{
  const tasks=s.days[C.dayKey()].tasks;
  while(tasks.length<C.MAX_DAILY_TASKS)tasks.push({id:C.uid(),title:'Geçmiş işlem',points:1,status:'done'});
 }}),d=h.document;
 h.click('[data-action="settings"]');h.click('[data-action="tasks"]');const before=h.saved();
 const form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Yeni davranış';form.querySelector('[name="points"]').value='1';h.submit(form);
 assert.match(d.getElementById('formError').textContent,/Bugünkü işlem kaydı dolu/);assert.deepEqual(h.saved(),before);
 assert.deepEqual(C.validate(h.saved()),before);
});
test('the open teacher scene refreshes hunger without requiring a reload',async()=>{
  const h=await harness(),label=h.document.querySelector('.fish-hunger');
  label.hidden=true;h.intervals[0]();assert.equal(label.hidden,false);assert.match(label.getAttribute('aria-label'),/2 gündür beslenmedi/);
});

test('student popup supports attendance, daily corrections and history while class management stays closed',async()=>{
  const h=await harness(),d=h.document;
  assert.equal(d.getElementById('aquarium').classList.contains('panel-hidden'),true);
  assert.equal(d.querySelector('[data-action="panel"]').getAttribute('aria-expanded'),'false');
  h.click('.fish');assert.equal(h.modal.classList.contains('behavior-modal'),true);
  h.click(h.modal.querySelector('[data-action="absence"]'));
  assert.equal(h.saved().classes[0].students[0].days[C.dayKey()].absent,true);
  assert.ok([...h.modal.querySelectorAll('.behavior-choice')].every(b=>b.disabled));
  h.click(h.modal.querySelector('[data-action="absence"]'));
  assert.equal(h.modal.querySelector('.behavior-choice').disabled,false);
  h.click(h.modal.querySelector('[data-action="student-day"]'));
  assert.equal(h.modal.classList.contains('behavior-modal'),false);
  assert.equal(h.modal.classList.contains('student-day-modal'),true);
  h.click(h.modal.querySelector('[data-action="task-status"][data-status="done"]'));
  assert.equal(C.earned(h.saved().classes[0].students[0]),7);
  assert.equal(h.modal.querySelector('[data-action="task-status"][data-status="done"]').getAttribute('aria-pressed'),'true');
  h.click(h.modal.querySelector('[data-action="back"]'));
  assert.equal(h.modal.classList.contains('behavior-modal'),true);
  assert.match(h.modal.querySelector('.student-facts').textContent,/7/);
  h.click(h.modal.querySelector('[data-action="history"]'));
  assert.match(h.modal.textContent,/7 toplam puan/);
  h.click(h.modal.querySelector('[data-action="fish-profile"]'));
  h.click(h.modal.querySelector('[data-action="choose"]'));
  assert.ok(h.modal.querySelector('#chooseForm'));
  assert.equal(h.modal.classList.contains('behavior-modal'),false);
  assert.equal(d.getElementById('aquarium').classList.contains('panel-hidden'),true);
});
test('class management can be reopened from settings and collapsed with its scene control',async()=>{
  const h=await harness(),d=h.document;
  h.click('[data-action="settings"]');h.click(h.modal.querySelector('[data-action="manage-panel"]'));
  assert.equal(h.modal.open,false);
  assert.equal(d.getElementById('aquarium').classList.contains('panel-hidden'),false);
  assert.equal(d.querySelector('[data-action="panel"]').getAttribute('aria-expanded'),'true');
  h.click('[data-action="panel"]');
  assert.equal(d.getElementById('aquarium').classList.contains('panel-hidden'),true);
});


test('finder matches Turkish names, handles empty searches and opens only the selected student',async()=>{
  const h=await harness({extraNames:['İpek','Çağrı','<img src=x>']}),d=h.document;
  h.click('[data-action="find-student"]');
  const search=q=>{d.getElementById('fishFinder').value=q;d.getElementById('fishFinder').dispatchEvent(new h.window.Event('input',{bubbles:true}));};
  search('ipek');assert.equal(d.querySelectorAll('.finder-row').length,1);assert.match(d.querySelector('.finder-row').textContent,/İpek/);
  search('cagri');assert.equal(d.querySelectorAll('.finder-row').length,1);assert.match(d.querySelector('.finder-row').textContent,/Çağrı/);
  search('olmayan');assert.equal(d.querySelectorAll('.finder-row').length,0);assert.match(d.getElementById('finderCount').textContent,/bulunamadı/);
  search('<img');assert.equal(d.querySelectorAll('.finder-row img').length,1);assert.equal(d.querySelector('.finder-row strong').textContent,'<img src=x>');
  search('ipek');h.click('[data-action="locate-fish"]');assert.equal(h.modal.open,false);
  assert.equal(d.querySelectorAll('.is-found').length,1);assert.equal(d.querySelector('.is-found .fish-name').textContent,'İpek');
  h.click('[data-action="find-student"]');search('cagri');h.click(d.querySelector('.finder-row [data-action="fish-behaviors"]'));
  assert.equal(d.getElementById('modalTitle').textContent,'Çağrı');assert.ok(d.querySelector('.student-facts'));
  assert.equal(d.getElementById('aquarium').classList.contains('panel-hidden'),true);
});
test('profile separates today, total and feeding; written hunger remains an opt-in saved setting',async()=>{
  const h=await harness(),d=h.document;
  assert.equal(C.settingsOf().hungerText,false);
  h.click('.fish');assert.match(d.querySelector('.student-facts').textContent,/Bugünkü puan\+0Toplam puan0Son beslemeHenüz beslenmedi/);
  h.click('[data-action="close"]');h.click('[data-action="settings"]');
  const toggle=d.getElementById('hungerTextToggle');toggle.checked=true;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  assert.equal(h.saved().settings.hungerText,true);assert.equal(d.querySelector('.fish-hunger').textContent,'Balığın 2 gündür aç');
  assert.equal(C.validate(h.saved()).settings.hungerText,true);
});
test('creature picker keeps student selection, removes species search and offers compact creature cards',async()=>{
  const h=await harness(),d=h.document;h.click('.fish');h.click('[data-action="choose"]');
  assert.ok(d.getElementById('chooseStudent'));
  assert.equal(d.getElementById('speciesSearch'),null);
  assert.equal(d.querySelectorAll('.species-card').length,C.SPECIES.length);
  assert.ok(h.modal.classList.contains('species-picker-modal'));
  const css=fs.readFileSync('css/akvaryum.css','utf8');
  assert.match(css,/\.species-picker-modal \.species-grid\{[^}]*repeat\(4,minmax\(0,1fr\)\)/);
  assert.ok(css.includes('.species-picker-modal .species-grid{grid-template-columns:repeat(2,minmax(0,1fr))'));
});
test('selected fish keeps swimming behind its popup, resumes after closing, and settings do not reset its location',async()=>{
  const h=await harness({ageDays:0}),d=h.document,fish=d.querySelector('.fish');
  let time=0;const advance=n=>{for(let i=0;i<n;i++){time+=50;h.frames.pop()?.(time);}};
  advance(10);const initial=fish.style.transform;h.click('.fish');advance(20);assert.notEqual(fish.style.transform,initial);
  h.click('[data-action="close"]');advance(20);assert.notEqual(fish.style.transform,initial);
  const moved=fish.style.transform;h.click('[data-action="settings"]');const toggle=d.getElementById('pointsToggle');toggle.checked=false;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  assert.equal(fish.style.transform,moved);assert.equal(d.querySelectorAll('.mood-symbol').length,0);
});

test('bulk reward uses Turkish alphabetical order without changing stored order or rewarding another student',async()=>{
 const h=await harness({extraNames:['Şule','Ümit','Çınar','Ömer','İpek','Işıl','Ali','DEFNE NAZ','Defne','Karya','Kemal','Kerem']}),d=h.document;
 const original=h.saved().classes[0].students.map(s=>({id:s.id,name:s.name}));
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');
 const select=d.getElementById('groupTask');select.querySelector('option').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.deepEqual([...d.querySelectorAll('.group-student strong')].map(el=>el.textContent),['Ali','Çınar','Defne','DEFNE NAZ','Deniz','Işıl','İpek','Karya','Kemal','Kerem','Ömer','Şule','Ümit']);
 for(const name of ['Defne','Işıl']) {
  const id=original.find(s=>s.name===name).id,input=d.querySelector('#groupStudents input[value="'+id+'"]');
  input.checked=true;input.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 }
 assert.match(d.getElementById('groupSummary').textContent,/2 öğrenci seçildi.*14 puan/);
 h.submit(d.getElementById('groupRewardForm'));
 const students=h.saved().classes[0].students;
 assert.deepEqual(students.map(s=>({id:s.id,name:s.name})),original);
 for(const s of students)assert.equal(C.earned(s),['Defne','Işıl'].includes(s.name)?7:0,s.name);
});
test('bulk reward UI starts unselected, excludes absent students, feeds once and plays one chime',async()=>{
 const h=await harness({absent:true,extraNames:['Ada','İpek']}),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');
 // linkedom does not implement a browser's implicit first-option selection.
 const select=d.getElementById('groupTask');select.querySelector('option').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('groupSubmit').disabled,true);
 h.click('[data-action="group-select"]');assert.equal(d.querySelector('[name="studentId"][value="'+h.saved().classes[0].students[0].id+'"]').disabled,true);
 assert.match(d.getElementById('groupSummary').textContent,/2 öğrenci seçildi.*14 puan/);
 h.submit(d.getElementById('groupRewardForm'));assert.equal(h.modal.open,false);assert.equal(h.sounds(),1);
 assert.deepEqual(h.saved().classes[0].students.map(s=>C.earned(s)),[0,7,7]);
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');
 d.getElementById('groupTask').querySelector('option').selected=true;d.getElementById('groupTask').dispatchEvent(new h.window.Event('change',{bubbles:true}));
 h.click('[data-action="group-select"]');assert.equal(d.getElementById('groupSubmit').disabled,false);
 const repeatedForm=d.getElementById('groupRewardForm');h.submit(repeatedForm);assert.equal(h.sounds(),2);
 assert.deepEqual(h.saved().classes[0].students.map(s=>C.earned(s)),[0,14,14]);
 h.submit(repeatedForm);assert.equal(h.sounds(),2);
});
test('goal UI creates, updates, hides and restarts a goal without spending or clearing scores',async()=>{
 const h=await harness(),d=h.document;h.click('.fish');h.click('.behavior-choice');
 const students=JSON.stringify(h.saved().classes[0].students);
 h.click('[data-action="activities"]');h.click('[data-action="goal"]');
 let form=d.getElementById('goalForm');form.querySelector('[name="title"]').value='Hikâye saati';form.querySelector('[name="target"]').value='20';form.querySelector('[name="enabled"]').checked=true;h.submit(form);
 assert.equal(h.saved().classes[0].goal.target,20);assert.match(d.querySelector('.shared-goal').textContent,/0 \/ 20/);assert.equal(JSON.stringify(h.saved().classes[0].students),students);
 const baseline=JSON.stringify(h.saved().classes[0].goal.baseline);
 h.click('[data-action="goal"]');form=d.getElementById('goalForm');form.querySelector('[name="target"]').value='30';form.querySelector('[name="enabled"]').checked=false;h.submit(form);
 assert.equal(d.querySelector('.shared-goal'),null);assert.equal(JSON.stringify(h.saved().classes[0].goal.baseline),baseline);
 h.click('[data-action="goal"]');h.click('[data-action="new-goal"]');form=d.getElementById('goalForm');form.querySelector('[name="title"]').value='Sınıf oyunu';h.submit(form);
 assert.equal(h.saved().classes[0].goal.title,'Sınıf oyunu');assert.equal(JSON.stringify(h.saved().classes[0].students),students);
});
test('timer UI starts, pauses and resets without writing student scores or changing sound',async()=>{
 const h=await harness(),d=h.document,before=JSON.stringify(h.saved());
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');
 h.click('[data-action="timer-preset"][data-minutes="5"]');assert.equal(d.getElementById('timerMinutes').value,'5');
 h.submit(d.getElementById('timerForm'));assert.equal(d.getElementById('timerForm').hidden,true);assert.equal(d.getElementById('timerClock').textContent,'05:00');
 h.click('[data-action="timer-pause"]');assert.equal(d.getElementById('timerState').textContent,'Duraklatıldı');
 h.click('[data-action="close"]');assert.equal(d.getElementById('activityTimerBadge').hidden,false);
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');assert.equal(d.getElementById('timerState').textContent,'Duraklatıldı');
 h.click('[data-action="timer-reset"]');assert.equal(d.getElementById('activityTimerBadge').hidden,true);assert.equal(d.getElementById('timerForm').hidden,false);
 assert.equal(JSON.stringify(h.saved().classes),JSON.stringify(JSON.parse(before).classes));assert.equal(h.saved().settings.sound,JSON.parse(before).settings.sound);assert.equal(h.sounds(),0);
});


test('bulk reward refuses a stale date and never changes a different day',async()=>{
 const h=await harness(),d=h.document,before=JSON.stringify(h.saved());
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');
 const select=d.getElementById('groupTask');select.querySelector('option').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 h.click('[data-action="group-select"]');const form=d.getElementById('groupRewardForm');form.dataset.date='2000-01-01';h.submit(form);
 assert.equal(JSON.stringify(h.saved()),before);assert.equal(h.sounds(),0);assert.equal(h.modal.open,false);
});
test('timer completion notifies once and changing classroom clears the session',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');d.getElementById('timerMinutes').value='1';h.submit(d.getElementById('timerForm'));
 h.advanceTimer(61000);assert.match(d.getElementById('timerState').textContent,/Süre tamamlandı/);assert.equal(d.getElementById('activityTimerBadge').textContent,'✓');
 d.getElementById('toast').textContent='Başka bildirim';h.advanceTimer(1000);assert.equal(d.getElementById('toast').textContent,'Başka bildirim');
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');h.click('[data-action="timer-reset"]');h.submit(d.getElementById('timerForm'));assert.equal(h.modal.open,false);
 h.click('[data-action="settings"]');h.click('[data-action="new-class"]');const form=d.getElementById('newClassForm');form.querySelector('[name="name"]').value='Yeni sınıf';h.submit(form);
 assert.equal(d.getElementById('activityTimerBadge').hidden,true);assert.equal(h.sounds(),0);
});

test('history corrections require confirmation, update pearl, and deletion only removes its selected daily entry',async()=>{
 const h=await harness(),d=h.document;
 h.click('.fish');h.click('.behavior-choice');h.click('.fish');h.click('[data-action="history"]');
 h.click('[data-action="revoke-point"]');assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 h.click('[data-action="confirm"]');assert.equal(C.earned(h.saved().classes[0].students[0]),0);assert.equal(d.getElementById('classPearlScore').textContent,'0');
 h.click('[data-action="fish-profile"]');h.click('.behavior-choice');assert.equal(h.sounds(),2);
 h.click('.fish');h.click('[data-action="history"]');h.click('[data-action="delete-point"]');h.click('[data-action="confirm"]');
 const cls=h.saved().classes[0];assert.equal(C.earned(cls.students[0]),0);assert.equal(cls.tasks.length,3);assert.equal(cls.students[0].days[C.dayKey()].tasks.length,2);
});
test('growth can hatch on reward, revert on correction, and normal mode keeps points intact',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="settings"]');h.click('[data-action="growth"]');
 let form=d.getElementById('growthForm');form.querySelector('[value="growth"]').selected=true;
 form.querySelector('[name="target0"]').value='5';h.submit(form);
 assert.equal(d.querySelector('.fish').classList.contains('is-egg'),true);
 assert.equal(d.querySelector('.fish').parentNode,d.getElementById('eggBed'));
 assert.doesNotMatch(d.querySelector('.fish').style.transform,/NaN/);
 h.click('.fish');assert.match(h.modal.textContent,/0\/10 hedef/);h.click('.behavior-choice');
 assert.equal(d.querySelector('.fish').parentNode,d.getElementById('swimArea'));
 assert.equal(d.querySelector('.fish').dataset.stage,'1');assert.equal(d.querySelector('.fish').classList.contains('is-egg'),false);
 h.click('.fish');h.click('[data-action="history"]');h.click('[data-action="revoke-point"]');h.click('[data-action="confirm"]');
 assert.equal(d.querySelector('.fish').classList.contains('is-egg'),true);
 h.click('[data-action="close"]');h.click('[data-action="settings"]');h.click('[data-action="growth"]');
 form=d.getElementById('growthForm');form.querySelector('[value="normal"]').selected=true;h.submit(form);
 assert.equal(d.querySelector('.fish').classList.contains('is-egg'),false);assert.equal(C.earned(h.saved().classes[0].students[0]),0);
});
test('eggs reveal the selected species, retain an image fallback and hatch without changing another pupil',async()=>{
 const h=await harness({growth:true,ageDays:0,extraNames:['Ada'],configure:(state,cls)=>{cls.students[1].species='betta';}}),d=h.document;
 const before=h.saved(),ids=before.classes[0].students.map(s=>s.id),eggs=[...d.querySelectorAll('.is-egg .egg-embryo')];
 assert.equal(eggs.length,2);assert.ok(eggs[0].src.endsWith('/palyaco-baligi.webp'));assert.ok(eggs[1].src.endsWith('/beta.webp'));assert.deepEqual(h.saved(),before);
 const image=eggs[1],event=new h.window.Event('error',{bubbles:true});image.dispatchEvent(event);assert.ok(image.src.endsWith('/beta.png'));
 h.click('[data-action="settings"]');h.click('[data-action="close"]');assert.ok(image.src.endsWith('/beta.png'),'a normal re-render must keep the fallback');
 h.click('.fish[data-id="'+ids[0]+'"]');h.click('.behavior-choice');
 assert.equal(d.querySelector('.fish[data-id="'+ids[0]+'"]').classList.contains('is-egg'),false);assert.equal(d.querySelectorAll('.is-egg').length,1);
 assert.deepEqual(h.saved().classes[0].students.map(C.earned),[7,0]);assert.equal(h.frames.length,1);
});
test('teacher fish is separate, opens its own settings, and contributes no class points',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="settings"]');h.click('[data-action="teacher-fish"]');
 const form=d.getElementById('teacherFishForm');form.querySelector('[name="enabled"]').checked=true;
 // Browser FormData returns only the selected radio; this harness uses the first matching field.
 form.querySelector('[name="species"]').value='turtle';h.submit(form);
 assert.equal(d.querySelectorAll('.fish').length,2);assert.equal(d.querySelector('.teacher-fish .fish-points').hidden,true);
 assert.equal(d.querySelector('.teacher-fish .fish-hunger').hidden,true);
 assert.equal(h.saved().classes[0].students.length,1);assert.equal(d.getElementById('classPearlScore').textContent,'0');
 h.click('.teacher-fish');assert.ok(d.getElementById('teacherFishForm'));
});
test('class pearl opens a ranked leaderboard and season reset archives history before zeroing active points',async()=>{
  const h=await harness(),d=h.document;h.click('.fish');h.click('[data-action="reward-behavior"]');
  assert.equal(d.getElementById('classPearlScore').textContent,'7');h.click('#classPearl');
  assert.match(h.modal.textContent,/En tok balıklar/);assert.match(h.modal.querySelector('.leaderboard').textContent,/🥇/);
  h.click('[data-action="season-reset"]');h.click('[data-action="confirm"]');
  const cls=h.saved().classes[0],student=cls.students[0];
  assert.equal(C.earned(student),0);assert.equal(cls.seasons.length,1);
  assert.equal(cls.seasons[0].students[0].points,7);assert.ok(cls.seasons[0].awards.some(event=>event.status==='done'));
  assert.equal(cls.tasks.length,3);assert.equal(d.getElementById('classPearlScore').textContent,'0');
  const seasonPicker=d.getElementById('leaderboardSeasonSelect');assert.ok(seasonPicker);
  seasonPicker.querySelector('option[value="'+cls.seasons[0].id+'"]').selected=true;seasonPicker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  assert.match(d.querySelector('.modal-intro').textContent,/Sezon 1/);assert.match(d.querySelector('.leaderboard').textContent,/★ 7/);
});
test('scene timer stays with swimmers after the dialog closes and resets with the classroom',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');h.submit(d.getElementById('timerForm'));
 assert.equal(h.modal.open,false);assert.equal(d.getElementById('sceneTimer').hidden,false);assert.equal(d.getElementById('sceneTimerClock').textContent,'10:00');
 assert.equal(d.getElementById('sceneTimer').parentNode,d.querySelector('.fish').parentNode);
 h.advanceTimer(61000);assert.equal(d.getElementById('sceneTimerClock').textContent,'08:59');
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');h.click('[data-action="timer-pause"]');
 h.advanceTimer(120000);assert.equal(d.getElementById('sceneTimerClock').textContent,'08:59');
 h.click('[data-action="timer-reset"]');assert.equal(d.getElementById('sceneTimer').hidden,true);
});

test('fullscreen retains working timer, audio and scene controls and restores the exit icon on browser exit',async()=>{
 const h=await harness({ageDays:0}),d=h.document,app=d.getElementById('aquariumApp');
 const toggle=d.querySelector('.scene-controls [data-action="fullscreen"]');
 let playing=false;
 Object.assign(h.window.AquariumAudio,{isPlaying:()=>playing,describe:()=> 'Okyanus',toggle:async()=>{playing=!playing;h.window.dispatchEvent(new h.window.Event('aquarium-audio-change'));}});
 h.click(toggle);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(d.fullscreenElement,app);assert.equal(toggle.getAttribute('aria-label'),'Tam ekrandan çık');
 assert.equal(toggle.querySelector('use').getAttribute('href'),'#i-collapse');assert.equal(h.modal.parentNode,d.getElementById('aquarium'));
 assert.equal(d.querySelectorAll('.scene-controls>.fullscreen-keep').length,5);
 h.click('#activitiesButton');assert.equal(d.getElementById('modalTitle').textContent,'Saat ve sayaç');
 assert.equal(h.modal.querySelector('[data-action="activities"]'),null);
 h.submit(d.getElementById('timerForm'));assert.equal(h.modal.open,false);assert.equal(d.fullscreenElement,app);
 assert.equal(d.getElementById('sceneTimerClock').textContent,'10:00');
 h.click('#activitiesButton');h.click('[data-action="timer-pause"]');
 assert.equal(d.getElementById('timerState').textContent,'Duraklatıldı');
 h.click('[data-action="timer-resume"]');h.click('#modalBack');
 h.click('[data-action="sound"]');assert.equal(d.getElementById('modalTitle').textContent,'Ortam sesleri');h.click('#modalBack');
 h.click('#soundToggle');await new Promise(resolve=>setImmediate(resolve));assert.equal(playing,true);assert.equal(d.getElementById('soundToggle').getAttribute('aria-label'),'Sesi duraklat');
 h.click('#soundToggle');await new Promise(resolve=>setImmediate(resolve));assert.equal(playing,false);
 h.click('.scene-controls [data-action="themes"]');h.click('[data-action="theme"][data-theme="grotto"]');
 assert.equal(h.saved().classes[0].theme,'grotto');assert.equal(h.modal.open,false);assert.equal(d.fullscreenElement,app);
 h.click('.fish');assert.equal(h.modal.open,false);assert.equal(C.earned(h.saved().classes[0].students[0]),0);
 h.click(toggle);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(d.fullscreenElement,null);assert.equal(toggle.getAttribute('aria-label'),'Tam ekran');assert.equal(toggle.querySelector('use').getAttribute('href'),'#i-expand');
 assert.equal(h.modal.parentNode,d.body);assert.match(d.getElementById('activitiesButton').getAttribute('aria-label'),/^Sınıf etkinlikleri/);
 h.click(toggle);await d.exitFullscreen();assert.equal(toggle.getAttribute('aria-pressed'),'false');
});

test('fullscreen random selection keeps its glass dialog, winner actions and scoring inside fullscreen',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece'],reduced:true}),d=h.document;
 h.click('.scene-controls [data-action="fullscreen"]');await new Promise(resolve=>setImmediate(resolve));
 const app=d.fullscreenElement,before=h.saved(),random=d.querySelector('.scene-controls [data-action="random-student"]');
 assert.ok(random.classList.contains('fullscreen-keep'));
 h.click(random);assert.ok(h.modal.classList.contains('random-picker-modal'));
 assert.equal(h.modal.parentNode,d.getElementById('aquarium'));h.click('[data-action="random-draw"]');
 const winner=d.getElementById('pickerName').textContent;
 assert.deepEqual(h.saved(),before);assert.equal(d.fullscreenElement,app);
 h.click('[data-action="random-show"]');assert.equal(h.modal.open,false);assert.equal(d.fullscreenElement,app);
 h.click(random);assert.equal(d.getElementById('pickerName').textContent,winner);
 h.click('[data-action="random-behaviors"]');assert.equal(d.getElementById('modalTitle').textContent,winner);
 h.click('.behavior-choice');assert.equal(d.fullscreenElement,app);
 const after=h.saved().classes[0];
 after.students.forEach(s=>assert.equal(C.earned(s),s.name===winner?7:0));
 await d.exitFullscreen();assert.equal(h.modal.parentNode,d.body);
});
test('normal mode hides inactive targets; invalid growth thresholds never replace saved settings',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="settings"]');h.click('[data-action="growth"]');
 assert.equal(d.getElementById('growthThresholds').hidden,true);
 let form=d.getElementById('growthForm');form.querySelector('[value="growth"]').selected=true;
 form.querySelector('[name="mode"]').dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('growthThresholds').hidden,false);
 form.querySelector('[name="target1"]').value='10';h.submit(form);
 assert.match(d.getElementById('formError').textContent,/artan sırada/);assert.equal(h.saved().classes[0].growth,undefined);
 form.querySelector('[value="normal"]').selected=true;form.querySelector('[name="mode"]').dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('growthThresholds').hidden,true);h.submit(form);
 assert.equal(h.saved().classes[0].growth.enabled,false);assert.equal(h.saved().classes[0].growth.thresholds[1],20);
});

test('only the upper aquarium background button remains and can change the environment',async()=>{
 const h=await harness(),d=h.document;
 assert.equal(d.querySelectorAll('[data-action="themes"]').length,1);
 assert.equal(d.querySelector('.scene-footer [data-action="themes"]'),null);
 h.click('[data-action="themes"]');h.click('[data-action="theme"][data-theme="grotto"]');
 assert.equal(h.saved().classes[0].theme,'grotto');
 assert.match(d.querySelector('.scene-controls [data-action="themes"]').title,/Mavi mağara/);
});


test('repeat rewards neither duplicate class task summaries nor use up behavior-template slots',async()=>{
 const h=await harness(),d=h.document;
 for(let i=0;i<22;i++) {h.click('.fish');h.click('.behavior-choice');}
 assert.match(d.getElementById('classProgress').textContent,/1 \/ 3/);
 h.click('[data-action="tab"][data-tab="tasks"]');
 assert.equal(d.querySelectorAll('.task-summary').length,3);
 h.click('[data-action="settings"]');h.click('[data-action="tasks"]');
 const form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Arkadaşıma yardım ettim';form.querySelector('[name="points"]').value='5';h.submit(form);
 assert.equal(h.saved().classes[0].tasks.length,4);
});


test('aquarium countdown keeps elapsed time while hidden and preserves a manual pause',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');h.submit(d.getElementById('timerForm'));
 d.hidden=true;d.dispatchEvent(new h.window.Event('visibilitychange'));h.advanceTimer(125000);
 assert.equal(d.getElementById('sceneTimerClock').textContent,'07:55');
 d.hidden=false;d.dispatchEvent(new h.window.Event('visibilitychange'));
 h.click('[data-action="activities"]');h.click('[data-action="timer"]');h.click('[data-action="timer-pause"]');
 d.hidden=true;d.dispatchEvent(new h.window.Event('visibilitychange'));h.advanceTimer(90000);
 assert.equal(d.getElementById('sceneTimerClock').textContent,'07:55');
});

test('an unavailable lightweight fish image falls back once to the same species original',async()=>{
 const h=await harness(),img=h.document.querySelector('.fish-art img');
 assert.match(img.getAttribute('src'),/\/web-v1\/palyaco-baligi\.webp$/);
 img.dispatchEvent(new h.window.Event('error',{bubbles:true}));
 assert.equal(img.getAttribute('src'),'/assets/akvaryum/canlilar/palyaco-baligi.png');
 img.dispatchEvent(new h.window.Event('error',{bubbles:true}));
 assert.equal(img.getAttribute('src'),'/assets/akvaryum/canlilar/palyaco-baligi.png');
});

test('teacher can save a birthday, see its cake and greeting, reject invalid dates and remove it',async()=>{
 const h=await harness(),d=h.document;h.click('.fish');h.click('[data-action="edit-student"]');
 const now=new Date();let form=d.getElementById('editStudentForm');
 // linkedom selects are read-only; set selected options as a browser would.
 const select=(name,value)=>{const el=form.querySelector('[name="'+name+'"]');for(const opt of el.querySelectorAll('option'))opt.selected=false;el.querySelector('option[value="'+value+'"]').selected=true;};
 select('birthDay',now.getDate());select('birthMonth',now.getMonth()+1);h.submit(form);
 assert.equal(d.querySelector('.fish-birthday').hidden,false);assert.ok(d.querySelector('.fish').classList.contains('birthday-fish'));
 h.click('.fish');assert.match(d.getElementById('modalTitle').textContent,/İyi ki doğdun, Deniz/);
 h.click('[data-action="edit-student"]');form=d.getElementById('editStudentForm');select('birthDay',31);select('birthMonth',4);h.submit(form);assert.match(d.getElementById('formError').textContent,/Geçerli/);
 select('birthDay','');select('birthMonth','');h.submit(form);assert.equal(d.querySelector('.fish-birthday').hidden,true);assert.equal(h.saved().classes[0].students[0].birthday,undefined);
 assert.match(d.getElementById('localTime').textContent,/\d{2}:\d{2}/);assert.ok(d.getElementById('localDate').textContent.length>10);
});


test('class deletion requires confirmation, preserves a recovery copy, and stops on link revocation failure',async()=>{
 for(const deleteError of [false,true]) {
  const h=await harness({deleteError}),before=h.saved();
  h.click('[data-action="settings"]');h.click('[data-action="delete-class"]');
  assert.deepEqual(h.saved(),before);assert.equal(h.deleteCalls(),0);
  h.click('[data-action="confirm"]');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(h.backup(),before);assert.equal(h.deleteCalls(),1);
  if(deleteError) assert.deepEqual(h.saved(),before);
  else {assert.notEqual(h.saved().classes[0].id,before.classes[0].id);assert.equal(h.saved().classes[0].students.length,0);}
 }
});


test('back navigates nested menus and refreshes student data without executing a cancelled confirmation',async()=>{
 const h=await harness(),d=h.document;
 h.click('[data-action="settings"]');h.click(h.modal.querySelector('[data-action="activities"]'));h.click('[data-action="timer"]');
 h.click('#modalBack');assert.equal(d.getElementById('modalTitle').textContent,'Birlikte güzel adımlar');
 h.click('#modalBack');assert.equal(d.getElementById('modalTitle').textContent,'Sınıfın kontrolü sende');
 h.click('[data-action="delete-class"]');h.click('#modalBack');assert.equal(h.deleteCalls(),0);assert.ok(d.getElementById('renameClassForm'));
 h.click('#modalBack');assert.equal(h.modal.open,false);
 h.click('.fish');h.click('[data-action="tasks"]');let form=d.querySelector('.task-points-form');form.querySelector('[name="points"]').value='19';h.submit(form);
 h.click('#modalBack');assert.match(d.querySelector('.behavior-choice').textContent,/19 puan/);assert.equal(h.modal.classList.contains('behavior-modal'),true);
 h.click('[data-action="edit-student"]');h.click('#modalBack');assert.equal(h.modal.classList.contains('behavior-modal'),true);
 h.click('#modalBack');assert.equal(h.modal.open,false);
});
test('hungry and absent fish reserve the pearl area from first render and reflow when its position changes',async()=>{
 const h=await harness({extraNames:['Ada','Ece'],configure:(state,cls)=>cls.students.forEach((s,i)=>{s.createdAt=Date.now()-3*86400000;if(i===1)C.ensureDay(s,cls).absent=true;})});
 const d=h.document,fish=[...d.querySelectorAll('#swimArea .fish')],before=h.saved();let time=0;
 const advance=()=>{for(let i=0;i<700;i++)h.frames.pop()(time+=50);};
 const position=f=>{const m=f.style.transform.match(/translate3d\(([\d.-]+)px,([\d.-]+)px/);return {x:Number(m[1]),y:Number(m[2])};};
 const clearOf=shell=>fish.forEach(f=>{
  const p=position(f),size=parseFloat(f.style.getPropertyValue('--fish-size'));
  assert.equal(p.x<shell.left+shell.width+16&&p.x+size>shell.left-16&&p.y<shell.top+shell.height+16&&p.y+size*.67+55>shell.top-16,false);
 });
 assert.equal(fish.length,3);assert.equal(d.getElementById('classPearl').hidden,false);
 clearOf({left:365,top:440,width:170,height:145});
 assert.equal(fish.filter(f=>f.classList.contains('is-hungry')).length,2);
 assert.equal(fish.filter(f=>f.classList.contains('is-absent')).length,1);
 const relocated={left:30,top:420,width:200,height:170};h.resizePearl(relocated);advance();clearOf(relocated);
 const stable=fish.map(f=>f.style.transform);advance();assert.deepEqual(fish.map(f=>f.style.transform),stable);
 assert.deepEqual(h.saved(),before,'pearl layout must not change classroom data');
 h.click('[data-action="settings"]');const toggle=d.getElementById('classPointsToggle');toggle.checked=false;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('classPearl').hidden,true);advance();
 toggle.checked=true;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));assert.equal(d.getElementById('classPearl').hidden,false);advance();clearOf(relocated);
 h.click('.scene-controls [data-action="fullscreen"]');await new Promise(resolve=>setImmediate(resolve));advance();clearOf(relocated);
});
test('panel open/close and resize keep existing swimmers instead of returning them to starting rows',async()=>{
 const h=await harness({ageDays:0}),d=h.document,fish=d.querySelector('.fish'),before=h.saved();
 for(let i=0;i<200;i++)h.frames.pop()(i*50+50);
 const original=fish.style.transform,art=fish.querySelector('.fish-art').style.transform;
 h.click('[data-action="panel"]');h.resizeScene(900,600);assert.equal(fish.style.transform,original);assert.equal(fish.querySelector('.fish-art').style.transform,art);
 h.resizeScene(1000,650);assert.equal(fish.style.transform,original);assert.equal(fish.querySelector('.fish-art').style.transform,art);
 h.click('[data-action="close-panel"]');h.resizeScene(900,600);assert.equal(fish.style.transform,original);
 h.frames.pop()(10100);h.frames.pop()(10150);assert.notEqual(fish.style.transform,original);
 assert.equal(h.frames.length,1);assert.deepEqual(h.saved(),before);
});
test('bounded atmosphere sliders preview live, save on release and retain bubble nodes and fish routes',async()=>{
 const h=await harness({ageDays:0}),d=h.document,cls=h.saved().classes[0],bubble=d.querySelector('.bubble');
 for(let i=0;i<100;i++)h.frames.pop()(i*50+50);const fish=d.querySelector('.fish'),position=fish.style.transform;
 h.click('[data-action="settings"]');assert.equal(d.querySelectorAll('#bubbles .bubble:not([hidden])').length,14);
 const range=(id,value,type='input')=>{const el=d.getElementById(id);el.value=String(value);el.dispatchEvent(new h.window.Event(type,{bubbles:true}));};
 range('bubbleAmountRange',150);assert.equal(d.querySelectorAll('#bubbles .bubble:not([hidden])').length,21);assert.equal(h.saved().settings.bubbleAmount,100);
 range('bubbleAmountRange',150,'change');assert.equal(h.saved().settings.bubbleAmount,150);
 range('bubbleAmountRange',-100,'change');assert.equal(d.querySelectorAll('#bubbles .bubble:not([hidden])').length,7);
 range('lightStrengthRange',999,'change');assert.equal(h.saved().settings.lightStrength,125);assert.equal(d.getElementById('lightStrengthRange').value,'125');
 assert.equal(d.getElementById('waveStrengthRange').disabled,true);
 const toggle=d.getElementById('waterWavesToggle');toggle.checked=true;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('waveStrengthRange').disabled,false);
 range('waveStrengthRange',150,'change');assert.equal(d.getElementById('waveStrengthRange').value,'150');
 assert.equal(d.querySelector('.bubble'),bubble);assert.equal(fish.style.transform,position);assert.equal(h.frames.length,1);assert.deepEqual(h.saved().classes[0],cls);
 const lite=await harness({lite:true,configure:state=>{state.settings.bubbleAmount=150;}});assert.equal(lite.document.querySelectorAll('#bubbles .bubble:not([hidden])').length,9);
});
test('teacher encouragement follows an actual deduction, speaks briefly, and returns to swimming without changing records',async()=>{
 const configure=(state,cls,s)=>{state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'goldfish'};C.ensureDay(s,cls).tasks[0].status='done';cls.tasks.push({id:'care',title:'Dikkatimi toplamalıyım',points:-2,icon:'🌿'});};
 const h=await harness({ageDays:0,configure}),d=h.document,id=h.saved().classes[0].students[0].id;
 const teacher=d.querySelector('.teacher-fish'),start=teacher.style.transform;
 h.click('[data-id="'+id+'"]');h.click('[data-kind="development"]');h.click('[data-action="reward-behavior"]');
 assert.equal(C.earned(h.saved().classes[0].students[0]),5);const saved=h.saved();let time=0;
 for(let i=0;i<200&&!d.querySelector('.teacher-note.visible');i++)h.frames.pop()(time+=50);
 const note=d.querySelector('.teacher-note.visible');assert.ok(note);const pupil=d.querySelector('[data-id="'+id+'"]');
 const heldPositions=[teacher.style.transform,pupil.style.transform],heldArt=[teacher.querySelector('.fish-art').style.transform,pupil.querySelector('.fish-art').style.transform];
 for(let i=0;i<30;i++)h.frames.pop()(time+=50);
 assert.deepEqual([teacher.style.transform,pupil.style.transform],heldPositions,'both fish must stay still while the message is visible');
 assert.deepEqual([teacher.querySelector('.fish-art').style.transform,pupil.querySelector('.fish-art').style.transform],heldArt);assert.equal(note.closest('.fish'),teacher);assert.ok(require('../js/akvaryum-social.js').encouragements.includes(note.textContent));
 assert.doesNotMatch(note.textContent,/Deniz|puan|5|2/);assert.notEqual(teacher.style.transform,start);assert.equal(h.sounds(),0);
 for(let i=0;i<400;i++)h.frames.pop()(time+=50);assert.equal(d.querySelector('.teacher-note'),null);
 const after=teacher.style.transform;for(let i=0;i<100;i++)h.frames.pop()(time+=50);assert.notEqual(teacher.style.transform,after);
 assert.deepEqual(h.saved(),saved);assert.equal(h.frames.length,1);
 for(const option of [{off:true},{reduced:true},{motion:false},{teacher:false}]) {
  const other=await harness({ageDays:0,reduced:option.reduced,configure:(state,cls,s)=>{configure(state,cls,s);if(option.off)state.settings.teacherEncouragement=false;if(option.motion===false)state.settings.motion=false;if(option.teacher===false)cls.teacher.enabled=false;}});
  other.click('.fish');other.click('[data-kind="development"]');other.click('[data-action="reward-behavior"]');
  for(let i=0;i<200&&other.frames.length;i++)other.frames.pop()(i*50+50);
  assert.equal(other.document.querySelector('.teacher-note'),null);assert.equal(C.earned(other.saved().classes[0].students[0]),5);
 }
});
test('teacher reminders reject failed deductions, keep an active visit through rapid deductions and stop when disabled',async()=>{
 const configure=(state,cls)=>{state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'turtle'};cls.tasks.push({id:'care',title:'Birlikte dikkat edelim',points:-2,icon:'🌿'});};
 const h=await harness({ageDays:0,configure}),d=h.document,id=h.saved().classes[0].students[0].id;
 const deduct=()=>{h.click('[data-id="'+id+'"]');h.click('[data-kind="development"]');h.click('[data-action="reward-behavior"]');};
 deduct();assert.equal(d.querySelector('.is-mentoring'),null);assert.equal(C.earned(h.saved().classes[0].students[0]),0);
 h.click('[data-kind="positive"]');h.click('[data-action="reward-behavior"]');deduct();assert.ok(d.querySelector('.is-mentoring'));
 deduct();assert.ok(d.querySelector('.is-mentoring'),'rapid follow-up deductions must preserve the current visit');assert.equal(d.querySelectorAll('.is-mentoring').length,1);
 assert.equal(C.earned(h.saved().classes[0].students[0]),3);
 for(let i=0;i<500;i++)h.frames.pop()(i*50+50);deduct();assert.ok(d.querySelector('.is-mentoring'));
 h.click('[data-action="settings"]');const toggle=d.getElementById('teacherEncouragementToggle');toggle.checked=false;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.querySelector('.is-mentoring,.teacher-note'),null);assert.equal(h.saved().settings.teacherEncouragement,false);assert.equal(C.earned(h.saved().classes[0].students[0]),1);
});
test('teacher resumes an interrupted visit after returning to the tab, without repeating the deduction',async()=>{
 const h=await harness({ageDays:0,configure:(state,cls,s)=>{
  state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'goldfish'};
  cls.tasks.push({id:'care',title:'Yeniden deneyelim',points:-2});C.ensureDay(s,cls).tasks[0].status='done';
 }}),d=h.document;h.click('.fish');h.click('[data-kind="development"]');h.click('[data-action="reward-behavior"]');const saved=h.saved();
 d.hidden=true;d.dispatchEvent(new h.window.Event('visibilitychange'));assert.equal(d.querySelector('.is-mentoring,.is-listening'),null);
 d.hidden=false;d.dispatchEvent(new h.window.Event('visibilitychange'));
 let note;for(let i=1;i<=350&&!note;i++){h.frames.pop()(i*50);note=d.querySelector('.teacher-note.visible');}
 assert.ok(note);assert.deepEqual(h.saved(),saved);assert.equal(h.frames.length,1);
});
test('a new deduction received from another device starts one teacher conversation and updates the daily champion',async()=>{
 const remote=syncFixture(),h=await harness({ageDays:0,extraNames:['Ada'],cloudFactory:remote.factory,configure:(state,cls,s)=>{
  state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'goldfish'};
  cls.tasks.push({id:'care',title:'Yeniden deneyelim',points:-2});C.ensureDay(s,cls).tasks[0].status='done';
 }}),d=h.document;remote.award(0,3);await h.pollCloud();const saved=h.saved();
 let note;for(let i=1;i<=350&&!note;i++){h.frames.pop()(i*50);note=d.querySelector('.teacher-note.visible');}
 assert.ok(note);assert.equal(C.earned(saved.classes[0].students[0]),5);assert.match(d.querySelector('.daily-champion-medal').getAttribute('aria-label'),/Bugün 5 puan/);await h.pollCloud();
 for(let i=351;i<=700;i++)h.frames.pop()(i*50);assert.equal(d.querySelector('.teacher-note,.is-listening,.is-mentoring'),null);assert.deepEqual(h.saved(),saved);
 remote.award(1,0);await h.pollCloud();assert.equal(d.querySelector('.daily-champion-medal').closest('.fish').dataset.id,h.saved().classes[0].students[1].id);assert.equal(d.querySelector('.is-mentoring'),null);
});
test('teacher reaches moving, resting and newly hatched-to-egg pupils across compact board and wide scenes',async()=>{
 for(const options of [
  {sceneWidth:320,sceneHeight:240,displaySize:200},
  {sceneWidth:1240,sceneHeight:242,displaySize:200,extraNames:Array.from({length:23},(_,i)=>'Öğrenci '+i),lite:true},
  {sceneWidth:2500,sceneHeight:950,species:'jellyfish'},
  {sceneWidth:3840,sceneHeight:1200,displaySize:200,frameStep:200,extraNames:Array.from({length:23},(_,i)=>'Öğrenci '+i)},
  {sceneWidth:900,sceneHeight:600,ageDays:3},
  {sceneWidth:1240,sceneHeight:300,growth:true,egg:true}
 ]){
  const h=await harness({ageDays:0,...options,configure:(state,cls,s)=>{
   state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'goldfish'};
   cls.tasks.push({id:'care',title:'Yeniden deneyelim',points:options.egg?-7:-2,icon:'🌿'});C.ensureDay(s,cls).tasks[0].status='done';
  }}),d=h.document;h.click('.fish');h.click('[data-kind="development"]');h.click('[data-action="reward-behavior"]');
  let spoke=false;for(let i=1;i<=700;i++){h.frames.pop()(i*(options.frameStep||50));if(d.querySelector('.teacher-note.visible'))spoke=true;}
  assert.equal(spoke,true,JSON.stringify(options));assert.equal(d.querySelector('.is-mentoring,.is-listening'),null);
 }
});
test('successive deductions visit each child in order without cancelling the active meeting or pausing the class',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece'],configure:(state,cls)=>{
  state.settings.teacherEncouragement=true;cls.teacher={enabled:true,name:'Öğretmen',species:'turtle'};
  cls.tasks.push({id:'care',title:'Yeniden deneyelim',points:-2,icon:'🌿'});
  cls.students.forEach(s=>{C.ensureDay(s,cls).tasks[0].status='done';});
 }}),d=h.document,ids=h.saved().classes[0].students.map(s=>s.id);let now=0;
 const advance=()=>h.frames.pop()(now+=50),deduct=id=>{h.click('[data-id="'+id+'"]');h.click('[data-kind="development"]');h.click('[data-action="reward-behavior"]');};
 deduct(ids[0]);for(let i=0;i<250&&!d.querySelector('.is-listening');i++)advance();
 assert.equal(d.querySelector('.is-listening')?.dataset.id,ids[0]);
 deduct(ids[1]);deduct(ids[1]);deduct(ids[2]);const saved=h.saved();
 assert.equal(d.querySelector('.is-listening')?.dataset.id,ids[0],'committing later deductions must preserve the current meeting');
 const pupil=d.querySelector('[data-id="'+ids[0]+'"]'),teacher=d.querySelector('.teacher-fish'),other=d.querySelector('[data-id="'+ids[2]+'"]');
 const held=[pupil.style.transform,teacher.style.transform],moving=other.style.transform;
 for(let i=0;i<25;i++)advance();assert.deepEqual([pupil.style.transform,teacher.style.transform],held);assert.notEqual(other.style.transform,moving);
 const seen=[ids[0]];for(let i=0;i<1600;i++){advance();const id=d.querySelector('.is-listening')?.dataset.id;if(id&&seen.at(-1)!==id)seen.push(id);}
 assert.deepEqual(seen,ids);assert.equal(d.querySelectorAll('.is-listening,.is-mentoring,.teacher-note').length,0);
 assert.deepEqual(h.saved(),saved);assert.equal(h.frames.length,1);
});
test('intensity previews repaint real light and wave geometry in lite mode; bubbles cover tall scenes',async()=>{
 const h=await harness({ageDays:0,lite:true,water:true}),d=h.document,bubbles=d.getElementById('bubbles');
 h.click('[data-action="settings"]');
 const toggle=d.getElementById('waterWavesToggle');toggle.checked=true;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 const set=(id,n)=>{const input=d.getElementById(id);input.value=String(n);input.dispatchEvent(new h.window.Event('input',{bubbles:true}));};
 set('lightStrengthRange',50);const low=h.waterPaints.waterLight.alpha;
 set('waveStrengthRange',50);const waves=JSON.stringify(h.waterPaints.waterWaves.stops);
 set('bubbleAmountRange',50);assert.equal(d.querySelectorAll('#bubbles .bubble:not([hidden])').length,3);
 set('lightStrengthRange',125);set('waveStrengthRange',150);set('bubbleAmountRange',150);
 assert.ok(h.waterPaints.waterLight.alpha>low*2.9);
 assert.notEqual(JSON.stringify(h.waterPaints.waterWaves.stops),waves);
 assert.equal(d.querySelectorAll('#bubbles .bubble:not([hidden])').length,9);
 bubbles.getBoundingClientRect=()=>({height:1500,left:0,top:0,width:900});h.resizeScene(900,1400);
 assert.equal(bubbles.style.getPropertyValue('--bubble-rise'),'1560px');assert.equal(h.frames.length,1);
});
test('an all-egg class still animates water in the existing RAF; modal, reduced motion and independent light pause retain phases',async()=>{
 const h=await harness({water:true,growth:true,ageDays:0}),d=h.document,paint=h.waterPaints.waterLight;
 assert.equal(d.querySelectorAll('.fish:not(.is-egg)').length,0);assert.equal(h.frames.length,1);
 let time=100;for(let i=0;i<50;i++)h.frames.shift()(time+=50);const before=paint.geometry;
 h.click('[data-action="settings"]');for(let i=0;i<50;i++)h.frames.shift()(time+=50);
 assert.notEqual(paint.geometry,before);assert.equal(h.frames.length,1);
 const motion=d.getElementById('motionToggle');motion.checked=false;motion.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(h.frames.length,0);const still=paint.geometry;
 h.click('[data-action="close"]');assert.equal(paint.geometry,still);assert.equal(h.frames.length,0);
 const reduced=await harness({water:true,reduced:true,ageDays:0});assert.equal(reduced.frames.length,0);assert.ok(reduced.waterPaints.waterLight.strokes>0);
});
test('vatoz keeps both wing and tail strokes in lightweight mode and rests still until fed',async()=>{
 const h=await harness({species:'ray',lite:true}),d=h.document,parts=[...d.querySelectorAll('.creature-joint')];
 assert.equal(parts.length,3);const still=parts.map(p=>p.style.transform);for(let i=0;i<100;i++)h.frames.pop()(i*50+50);assert.deepEqual(parts.map(p=>p.style.transform),still);
 h.click('.fish');h.click('.behavior-choice');const record=h.saved(),poses=parts.map(()=>new Set());
 for(let i=0;i<400;i++){h.frames.pop()(5100+i*50);parts.forEach((p,n)=>poses[n].add(p.style.transform));}
 assert.ok(poses.every(s=>s.size>20));assert.equal(h.frames.length,1);assert.deepEqual(h.saved(),record);assert.equal(h.modelCreates(),0);
});
test('water controls persist independently without moving fish, altering scores or creating an extra animation loop',async()=>{
 const h=await harness({ageDays:0}),d=h.document,fish=d.querySelector('.fish'),cls=h.saved().classes[0];
 for(let i=0;i<200;i++)h.frames.pop()(i*50+50);
 h.click('[data-action="settings"]');const position=fish.style.transform;
 assert.equal(d.getElementById('waterWaves').hidden,true);assert.equal(d.getElementById('lightMotionToggle').hasAttribute('checked'),true);
 const change=(id,value)=>{const el=d.getElementById(id);el.checked=value;el.dispatchEvent(new h.window.Event('change',{bubbles:true}));};
 change('waterWavesToggle',true);assert.equal(d.getElementById('waterWaves').hidden,false);assert.equal(h.saved().settings.waterWaves,true);
 change('lightMotionToggle',false);assert.equal(d.getElementById('aquariumApp').classList.contains('still-light'),true);
 assert.equal(h.saved().settings.lightMotion,false);assert.equal(fish.style.transform,position);assert.equal(h.frames.length,1);
 change('motionToggle',false);assert.equal(d.getElementById('aquariumApp').classList.contains('no-motion'),true);assert.equal(h.frames.length,0);
 change('motionToggle',true);assert.equal(h.frames.length,1);assert.equal(d.getElementById('waterWaves').hidden,false);
 assert.deepEqual(h.saved().classes[0],cls);assert.equal(C.validate(h.saved()).settings.waterWaves,true);
});
test('hungry fish stay still on the bottom and move again after an actual feeding',async()=>{
 const h=await harness(),d=h.document,fish=d.querySelector('.fish');
 const start=fish.style.transform;let time=0;const advance=n=>{for(let i=0;i<n;i++)h.frames.pop()(time+=50);};
 advance(200);assert.equal(fish.style.transform,start);assert.equal(fish.classList.contains('is-hungry'),true);
 h.click('.fish');h.click('.behavior-choice');advance(250);
 assert.equal(fish.classList.contains('is-hungry'),false);assert.notEqual(fish.style.transform,start);
});
test('a nearby pair waits two minutes for its first chat and cannot repeat frequently',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada'],chatTest:true}),d=h.document;
 const frame=now=>h.frames.pop()(now);
 frame(60000);assert.equal(d.querySelectorAll('.fish-chat.visible').length,0);
 frame(130000);assert.equal(d.querySelectorAll('.fish-chat.visible').length,2);
 d.querySelectorAll('.fish-chat').forEach(el=>el.classList.remove('visible'));
 for(const now of [150000,200000,300000,450000,600000])frame(now);
 assert.equal(d.querySelectorAll('.fish-chat.visible').length,0);
 frame(1000000);assert.equal(d.querySelectorAll('.fish-chat.visible').length,2);
});
test('greeting conversations use varied friendly emoji pairs without altering points or creating another animation loop',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada'],chatTest:true}),d=h.document,saved=h.saved(),seen=new Set();
 for(let i=0;i<12;i++){
  h.frames.pop()(130000+i*1000000);const symbols=[...d.querySelectorAll('.fish-chat.visible')].map(n=>n.textContent);
  assert.equal(symbols.length,2);seen.add(symbols.join(''));assert.ok(require('../js/akvaryum-social.js').greetings.some(p=>p.join('')===symbols.join('')));
  d.querySelectorAll('.fish-chat').forEach(n=>n.classList.remove('visible'));
 }
 assert.equal(seen.size,12);assert.deepEqual(h.saved(),saved);assert.equal(h.frames.length,1);
});
test('daily medallion follows today’s leader, keeps ties and names intact, and vanishes when names are hidden',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada'],configure:(state,cls,s)=>{
  C.ensureDay(s,cls,'2026-01-01').tasks[0]={...cls.tasks[0],points:100,status:'done'};
 }}),d=h.document,ids=h.saved().classes[0].students.map(s=>s.id);
 const reward=id=>{h.click('.fish[data-id="'+id+'"]');h.click('[data-kind="positive"]');h.click('.behavior-choice');};
 assert.equal(d.querySelector('.daily-champion-medal'),null);reward(ids[1]);
 assert.equal(d.querySelector('.daily-champion-medal').closest('.fish').dataset.id,ids[1]);assert.match(d.querySelector('.daily-champion-medal').getAttribute('aria-label'),/Bugün 7 puan/);
 reward(ids[0]);assert.equal(d.querySelectorAll('.daily-champion-medal').length,2);
 reward(ids[1]);assert.equal(d.querySelectorAll('.daily-champion-medal').length,1);assert.equal(d.querySelector('.daily-champion-medal').closest('.fish').dataset.id,ids[1]);
 assert.equal(d.querySelector('.fish[data-id="'+ids[1]+'"] .fish-label-text').textContent,'Ada');
 h.click('[data-action="settings"]');const toggle=d.getElementById('namesToggle');toggle.checked=false;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.querySelector('.daily-champion-medal'),null);assert.deepEqual(h.saved().classes[0].students.map(C.earned),[107,14]);
});

test('tail strokes stop for hungry fish, resume after feeding, and obey the motion switch',async()=>{
 const h=await harness(),fish=h.document.querySelector('.fish');
 const flex=()=>fish.style.getPropertyValue('--tail-flex');
 assert.ok(fish.classList.contains('has-tail'));
 assert.equal(fish.querySelectorAll('.fish-side img').length,2);
 assert.ok(fish.querySelector('.fish-turn-volume img'));
 const sources=[...fish.querySelectorAll('.fish-art img')].map(i=>i.getAttribute('src'));
 assert.ok(sources.every(src=>src===sources[0]));
 for(let n=1;n<=10;n++)h.frames.pop()(n*50);
 assert.equal(flex(),'0.00deg');
 h.click('.fish');h.click('[data-action="reward-behavior"]');
 const strokes=new Set();
 for(let n=11;n<=160;n++){h.frames.pop()(n*50);strokes.add(flex());}
 assert.ok(strokes.size>20,'fed fish should flex its tail across the swimming cycle');
 h.click('[data-action="settings"]');
 const toggle=h.document.getElementById('motionToggle');toggle.checked=false;
 toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(flex(),'0.00deg');assert.ok(h.document.getElementById('aquariumApp').classList.contains('no-motion'));
 const quiet=await harness({ageDays:0,reduced:true});
 assert.equal(quiet.document.querySelector('.fish').style.getPropertyValue('--tail-flex'),'0.00deg');
 assert.equal(quiet.frames.length,0);
});


test('management panel can close from its own header or Escape without reloading',async()=>{
 const h=await harness(),d=h.document,panel=d.getElementById('aquarium');
 h.click('[data-action="panel"]');assert.equal(panel.classList.contains('panel-hidden'),false);
 h.click('[data-action="close-panel"]');assert.equal(panel.classList.contains('panel-hidden'),true);
 assert.equal(d.querySelector('[data-action="panel"]').getAttribute('aria-expanded'),'false');
 h.click('[data-action="panel"]');
 const escape=new h.window.Event('keydown',{bubbles:true,cancelable:true});escape.key='Escape';d.dispatchEvent(escape);
 assert.equal(panel.classList.contains('panel-hidden'),true);
});

test('absence preserves hatched growth and points, rests the fish, then restores swimming',async()=>{
 const h=await harness({ageDays:0,growth:true}),d=h.document,fish=d.querySelector('.fish');
 assert.equal(fish.classList.contains('is-egg'),true);
 h.click('.fish');h.click('[data-action="reward-behavior"]');
 const scale=fish.style.getPropertyValue('--growth-scale');assert.equal(fish.classList.contains('is-egg'),false);
 h.click('.fish');h.click(h.modal.querySelector('[data-action="absence"]'));
 assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 assert.equal(fish.style.getPropertyValue('--growth-scale'),scale);
 assert.equal(fish.classList.contains('is-egg'),false);assert.equal(fish.classList.contains('is-absent'),true);
 assert.equal(fish.querySelector('.fish-hunger').hidden,true);
 h.click('[data-action="close"]');
 let n=0;const advance=count=>{for(let i=0;i<count;i++)h.frames.pop()(++n*50);};
 advance(1500);const rest=fish.style.transform,art=fish.querySelector('.fish-art').style.transform;
 advance(100);assert.equal(fish.style.transform,rest);assert.equal(fish.querySelector('.fish-art').style.transform,art);
 assert.equal(fish.style.getPropertyValue('--tail-flex'),'0.00deg');
 h.click('.fish');h.click(h.modal.querySelector('[data-action="absence"]'));h.click('[data-action="close"]');
 advance(200);assert.equal(fish.classList.contains('is-absent'),false);assert.notEqual(fish.style.transform,rest);
 assert.equal(C.earned(h.saved().classes[0].students[0]),7);
});
test('development tab supports a teacher-defined deduction and history undo without feeding',async()=>{
 const h=await harness({growth:true}),d=h.document;
 h.click('.fish');h.click('[data-action="reward-behavior"]');
 h.click('.fish');h.click('[data-action="tasks"]');
 const form=d.getElementById('taskForm');form.querySelector('[name="title"]').value='Söz sıramı beklemeliyim';form.querySelector('[name="points"]').value='2';
 Object.defineProperty(form.querySelector('[name="behaviorType"]'),'value',{value:'development'});
 h.submit(form);h.click('[data-action="modal-back"]');
 h.click('[data-kind="development"]');assert.equal(d.querySelectorAll('.behavior-choice').length,1);
 assert.match(d.querySelector('.behavior-choice').textContent,/-2 puan/);h.click('[data-action="reward-behavior"]');
 assert.equal(C.earned(h.saved().classes[0].students[0]),5);assert.equal(h.sounds(),1);
 h.click('.fish');h.click('[data-action="history"]');const buttons=[...d.querySelectorAll('[data-action="revoke-point"]')];
 h.click(buttons.find(b=>b.textContent==='Kesintiyi geri al'));h.click('[data-action="confirm"]');
 assert.equal(C.earned(h.saved().classes[0].students[0]),7);assert.equal(h.saved().classes[0].students[0].feeds.length,1);
});
test('an open dialog keeps swimmers moving behind it; sand eggs never enter the movement loop',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','İpek']}),d=h.document;let calls=0,animals=0;
 const step=h.window.AquariumMotion.step;h.window.AquariumMotion={...h.window.AquariumMotion};
 // The app keeps the shared module reference, so wrap and restore that method.
 const motion=require('../js/akvaryum-motion.js');motion.step=(fish,...args)=>{calls++;animals+=fish.length;return step(fish,...args);};
 try {
  h.frames.pop()(100);h.frames.pop()(150);assert.ok(calls>0);calls=0;
  h.click('.fish');h.frames.pop()?.(200);assert.ok(calls>0);assert.ok(animals>0);assert.equal(d.body.classList.contains('dialog-open'),true);
  h.click('[data-action="close"]');h.frames.pop()(250);assert.ok(calls>0);assert.equal(d.body.classList.contains('dialog-open'),false);
 } finally {motion.step=step;}
 const eggs=await harness({growth:true,extraNames:['Ada','İpek']}),before=[...eggs.document.querySelectorAll('.fish')].map(el=>el.getAttribute('style'));
 for(let i=1;i<=120;i++)eggs.frames.pop()?.(i*16.67);
 assert.equal(eggs.frames.length,0);
 assert.deepEqual([...eggs.document.querySelectorAll('.fish')].map(el=>el.getAttribute('style')),before);
});

test('point history contains only awarded entries, preserves repeats, and hides reversed points and empty days',async()=>{
 const h=await harness(),d=h.document;
 h.click('.fish');h.click('[data-action="history"]');
 assert.equal(d.querySelectorAll('.history-entry').length,0);
 assert.equal(d.querySelectorAll('.history-day').length,0);
 assert.match(d.querySelector('.history-empty').textContent,/verilmiş puan kaydı yok/);
 h.click('[data-action="fish-profile"]');h.click('.behavior-choice');
 h.click('.fish');h.click('.behavior-choice');
 h.click('.fish');h.click('[data-action="history"]');
 assert.equal(d.querySelectorAll('.history-entry').length,2);
 assert.ok([...d.querySelectorAll('.history-entry')].every(el=>el.textContent.includes('+7 puan')));
 assert.doesNotMatch([...d.querySelectorAll('.history-entry')].map(el=>el.textContent).join(''),/bekliyor|tamamlandı|Ödevimi/);
 assert.equal(h.saved().classes[0].students[0].days[C.dayKey()].tasks.length,4,'unawarded tasks stay in daily records');
 h.click('[data-action="revoke-point"]');h.click('[data-action="confirm"]');
 assert.equal(d.querySelectorAll('.history-entry').length,1);
 assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 h.click('[data-action="delete-point"]');h.click('[data-action="confirm"]');
 assert.equal(d.querySelectorAll('.history-entry').length,0);
 assert.equal(d.querySelectorAll('.history-day').length,0);
 assert.equal(C.earned(h.saved().classes[0].students[0]),0);
});
test('random picker has no repeat within a round and changes no class scores, feeding or attendance',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece'],reduced:true}),d=h.document;
 const before=h.saved(),seen=new Set();
 h.click('[data-action="random-student"]');
 for(let i=0;i<3;i++){
  h.click('[data-action="random-draw"]');
  const name=d.getElementById('pickerName').textContent;
  assert.ok(!seen.has(name));seen.add(name);
  assert.match(d.getElementById('pickerStatus').textContent,/Söz sende/);
  assert.equal(d.getElementById('pickerResultActions').hidden,false);
 }
 assert.equal(seen.size,3);assert.match(d.getElementById('pickerRound').textContent,/3 \/ 3/);
 h.click('[data-action="random-draw"]');assert.match(d.getElementById('pickerRound').textContent,/1 \/ 3/);
 assert.deepEqual(h.saved(),before);assert.equal(h.sounds(),0);
 const picked=d.getElementById('pickerName').textContent;
 h.click('[data-action="random-tasks"]');assert.match(d.getElementById('modalTitle').textContent,new RegExp(picked));
 assert.ok(h.modal.classList.contains('student-day-modal'));
 h.click('[data-action="modal-back"]');assert.equal(d.getElementById('pickerName').textContent,picked);
 h.click('[data-action="random-behaviors"]');assert.equal(d.getElementById('modalTitle').textContent,picked);
 assert.ok(h.modal.classList.contains('behavior-modal'));
 assert.deepEqual(h.saved(),before);
});
test('picker plays wheel and reveal only after a draw, celebrates once and stops sound on close',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece']}),d=h.document,calls=[];
 Object.assign(h.window.AquariumAudio,{pickerSound:async result=>calls.push(result?'win':'wheel'),cancelPicker:()=>calls.push('cancel')});
 const before=h.saved();h.click('[data-action="random-student"]');assert.deepEqual(calls,['cancel']);
 h.click('[data-action="random-draw"]');h.click('[data-action="random-draw"]');assert.deepEqual(calls,['cancel','wheel']);
 let now=0;while(now<2700){now+=40;h.frames.splice(0).forEach(fn=>fn(now));}
 assert.deepEqual(calls,['cancel','wheel','win']);assert.ok(d.getElementById('pickerStage').classList.contains('is-celebrating'));
 assert.equal(d.querySelectorAll('.picker-sparkles i').length,10);assert.deepEqual(h.saved(),before);
 const ended=new h.window.Event('animationend',{bubbles:true});ended.animationName='picker-reveal-fish';d.getElementById('pickerImage').dispatchEvent(ended);
 assert.equal(d.getElementById('pickerStage').classList.contains('is-celebrating'),false);
 h.click('[data-action="close"]');assert.equal(calls.at(-1),'cancel');
 h.click('[data-action="random-student"]');assert.equal(d.getElementById('pickerStage').classList.contains('is-celebrating'),false);
});
test('picker sound preference persists; silent, reduced-motion and unsupported audio still produce a winner',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada'],reduced:true}),d=h.document,calls=[];
 h.window.AquariumAudio.pickerSound=async result=>calls.push(result);
 h.click('[data-action="random-student"]');const toggle=d.getElementById('pickerSoundToggle');toggle.checked=false;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(C.validate(h.saved()).settings.pickerSound,false);h.click('[data-action="random-draw"]');assert.equal(calls.length,0);
 assert.equal(d.getElementById('pickerStage').classList.contains('is-celebrating'),false);assert.match(d.getElementById('pickerStatus').textContent,/Söz sende/);
 toggle.checked=true;toggle.dispatchEvent(new h.window.Event('change',{bubbles:true}));h.click('[data-action="random-draw"]');assert.deepEqual(calls,[true]);
 h.window.AquariumAudio.pickerSound=async()=>{throw Error('Ses desteklenmiyor');};h.click('[data-action="random-draw"]');await new Promise(r=>setImmediate(r));
 assert.match(d.getElementById('pickerStatus').textContent,/Söz sende/);assert.equal(d.getElementById('pickerStart').disabled,false);
 assert.equal(C.settingsOf().pickerSound,true);
});
test('hiding the tab cancels a picker without consuming a turn or leaving its button disabled',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece']}),d=h.document,calls=[];
 h.window.AquariumAudio.cancelPicker=()=>calls.push('cancel');
 const before=h.saved();h.click('[data-action="random-student"]');h.click('[data-action="random-draw"]');
 Object.defineProperty(d,'hidden',{configurable:true,value:true});d.dispatchEvent(new h.window.Event('visibilitychange'));
 assert.equal(d.getElementById('pickerStart').disabled,false);assert.equal(h.frames.length,0);assert.equal(d.getElementById('pickerRound').textContent,'');
 assert.equal(calls.at(-1),'cancel');assert.deepEqual(h.saved(),before);
});
test('random picker excludes absent pupils, includes sand eggs and cannot choose from an empty pool',async()=>{
 const h=await harness({absent:true,extraNames:['Ada'],growth:true,reduced:true}),d=h.document;
 const before=h.saved();
 h.click('[data-action="random-student"]');h.click('[data-action="random-draw"]');
 assert.equal(d.getElementById('pickerName').textContent,'Ada');
 h.click('[data-action="random-show"]');assert.equal(h.modal.open,false);
 const id=before.classes[0].students[1].id;
 assert.ok(d.querySelector('.fish[data-id="'+id+'"]').classList.contains('is-found'));
 assert.deepEqual(h.saved(),before);
 const absent=await harness({absent:true});absent.click('[data-action="random-student"]');
 assert.equal(absent.document.getElementById('pickerStart').disabled,true);
 assert.match(absent.document.getElementById('pickerStatus').textContent,/öğrenci yok/);
});
test('random preview finishes on one result and cancellation consumes no turn or surviving animation loop',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece']}),d=h.document;
 const before=h.saved();
 h.click('[data-action="random-student"]');h.click('[data-action="random-draw"]');
 assert.equal(d.getElementById('pickerStart').disabled,true);
 assert.equal(h.frames.length,2,'one aquarium loop and one temporary picker loop');
 // Repeated clicks cannot launch additional selection loops.
 h.click('[data-action="random-draw"]');assert.equal(h.frames.length,2);
 let now=0;
 while(now<=2700){now+=40;const pending=h.frames.splice(0);pending.forEach(fn=>fn(now));}
 assert.equal(h.frames.length,1);assert.equal(d.getElementById('pickerStart').disabled,false);
 assert.match(d.getElementById('pickerRound').textContent,/1 \/ 3/);
 const winner=d.getElementById('pickerName').textContent;
 h.click('[data-action="random-draw"]');assert.equal(h.frames.length,2);
 h.click('[data-action="close"]');assert.equal(h.frames.length,1);
 for(let i=0;i<70;i++)h.frames.shift()(now+=50);
 assert.equal(h.modal.open,false);assert.deepEqual(h.saved(),before);
 h.click('[data-action="random-student"]');assert.equal(d.getElementById('pickerName').textContent,'Kim gelecek?');
 h.click('[data-action="random-draw"]');
 while(d.getElementById('pickerStart').disabled){const pending=h.frames.splice(0);now+=50;pending.forEach(fn=>fn(now));}
 assert.notEqual(d.getElementById('pickerName').textContent,winner);assert.match(d.getElementById('pickerRound').textContent,/2 \/ 3/);
});
test('pending-only dates never fill history pages and archived seasons also show only actual awards',async()=>{
 const h=await harness({configure:(state,cls,s)=>{
   for(let i=1;i<=40;i++)C.ensureDay(s,cls,'2025-'+(i<=28?'01-':'02-')+String(i<=28?i:i-28).padStart(2,'0'));
   const date='2025-01-01';C.completeAndFeed(s,date,cls.tasks[0].id);
   C.startNewSeason(cls,'2025-03-01');
   for(let i=1;i<=40;i++)C.ensureDay(s,cls,'2025-'+(i<=28?'04-':'05-')+String(i<=28?i:i-28).padStart(2,'0'));
   C.completeAndFeed(s,'2025-04-01',cls.tasks[0].id);
 }}),d=h.document;
 h.click('.fish');h.click('[data-action="history"]');
 assert.equal(d.querySelectorAll('.history-entry').length,1);
 assert.equal(d.querySelectorAll('.history-day').length,1);
 assert.equal(d.querySelector('[data-action="history-older"]').disabled,true);
 const picker=d.getElementById('historySeasonSelect');
 picker.querySelectorAll('option')[1].selected=true;picker.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.querySelectorAll('.history-entry').length,1);
 assert.equal(d.querySelectorAll('.history-day').length,1);
 assert.match(d.querySelector('.history-entry').textContent,/\+7 puan/);
 assert.equal(d.querySelectorAll('[data-action="revoke-point"]').length,0);
 assert.equal(d.querySelector('[data-action="history-older"]').disabled,true);
});
test('fish silhouettes remain opaque at every depth, including hungry and lightweight views',async()=>{
 for(const options of [{ageDays:0},{ageDays:2},{ageDays:0,lite:true},{ageDays:2,lite:true},{ageDays:0,absent:true}]){
  const h=await harness(options),d=h.document;
  const fish=d.querySelector('.fish'),art=fish.querySelector('.fish-art');
  assert.equal(art.style.opacity,'1.00');assert.equal(fish.style.opacity,'');
  for(let i=0;i<250;i++)h.frames.shift()(100+i*50);
  assert.equal(art.style.opacity,'1.00');assert.equal(fish.style.opacity,'');
 }
});
test('changing an existing parent scope auto-saves before copying, without opening public access',async()=>{
 const copies=[],h=await harness({ageDays:0,clipboard:value=>copies.push(value)}),d=h.document,id=h.saved().classes[0].students[0].id,calls=[];
 let scope='child',release;
 h.window.AquariumSharing={get:async()=>({id:'share',token:'public',enabled:false}),sync:async()=>{},listOpen:async()=>[],childLinks:async()=>[{id:'link',student_id:id,token:'child-token',enabled:true,view_scope:scope}],updateChildScope:async(link,value)=>{calls.push([link,value]);await new Promise(resolve=>release=resolve);scope=value;}};
 h.click('[data-action="settings"]');h.click('[data-action="sharing"]');await new Promise(r=>setImmediate(r));
 const control=d.getElementById('childScope-'+id),copy=d.querySelector('[data-action="copy-child"]');
 control.querySelector('[value="class"]').selected=true;control.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 await new Promise(r=>setImmediate(r));assert.equal(control.disabled,true);assert.equal(copy.disabled,true);
 assert.deepEqual(calls,[['link','class']]);assert.equal(copies.length,0);
 release();await new Promise(r=>setImmediate(r));assert.equal(control.dataset.saved,'class');assert.equal(copy.disabled,false);
 h.click(copy);await new Promise(r=>setImmediate(r));assert.equal(copies.length,1);assert.match(copies[0],/cocuk=child-token/);
 assert.match(d.querySelector('.share-state').textContent,/kapalı/);assert.match(d.querySelector('.share-save-status').textContent,/Kaydedildi/);
});
test('failed scope updates restore the saved choice and never claim a successful save',async()=>{
 const h=await harness(),d=h.document,id=h.saved().classes[0].students[0].id;
 h.window.AquariumSharing={get:async()=>({id:'share',token:'public',enabled:false}),sync:async()=>{},listOpen:async()=>[],childLinks:async()=>[{id:'link',student_id:id,token:'child-token',enabled:true,view_scope:'child'}],updateChildScope:async()=>{throw Error('Bağlantı yok');}};
 h.click('[data-action="settings"]');h.click('[data-action="sharing"]');await new Promise(r=>setImmediate(r));
 const control=d.getElementById('childScope-'+id);control.querySelector('[value="class"]').selected=true;
 control.dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
 assert.equal(control.value,'child');assert.equal(control.disabled,false);assert.equal(control.dataset.saved,'child');
 assert.match(d.querySelector('.share-save-status').textContent,/Kaydedilemedi/);
});
test('visitor score choice is independent of teacher display settings and is saved without rotating a link',async()=>{
 const h=await harness(),d=h.document,calls=[],before=h.saved();let showPoints=true;
 h.window.AquariumSharing={get:async()=>({id:'share',token:'public-token',enabled:true,show_points:showPoints}),sync:async()=>{},listOpen:async()=>[],childLinks:async()=>[],updatePublicPoints:async(id,value)=>{calls.push([id,value]);showPoints=value;}};
 h.click('[data-action="settings"]');h.click('[data-action="sharing"]');await new Promise(r=>setImmediate(r));
 const control=d.getElementById('publicSharePoints'),link=d.getElementById('shareLink').value;
 control.querySelector('[value="hidden"]').selected=true;control.dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls,[['share',false]]);assert.equal(control.dataset.saved,'hidden');
 assert.equal(d.getElementById('shareLink').value,link);assert.deepEqual(h.saved(),before);
 h.click('[data-action="close"]');h.click('[data-action="settings"]');h.click('[data-action="sharing"]');await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('publicSharePoints').value,'hidden');
});

test('class roster opens each pupil scoring dialog, preserves search and scroll, and awards only the chosen pupil',async()=>{
 const h=await harness({ageDays:0,extraNames:['Ada','Ece']}),d=h.document,before=h.saved();
 h.click('[data-action="panel"]');const panel=d.getElementById('panelContent');panel.scrollTop=135;
 const search=d.getElementById('studentSearch');search.value='a';search.dispatchEvent(new h.window.Event('input',{bubbles:true}));
 const ada=d.querySelectorAll('.student-row')[0];assert.match(ada.textContent,/Ada/);const adaId=ada.dataset.id;
 h.click(ada);assert.equal(h.modal.open,true);assert.equal(h.modal.classList.contains('behavior-modal'),true);assert.equal(d.getElementById('modalTitle').textContent,'Ada');
 assert.deepEqual(h.saved(),before,'selecting a name must not award points');assert.ok(h.modal.querySelector('.behavior-choice'));assert.equal(panel.scrollTop,135);
 assert.equal(d.getElementById('searchBox').hidden,false);assert.equal(search.value,'a');
 h.click(h.modal.querySelector('.behavior-choice'));const cls=h.saved().classes[0];
 assert.equal(C.earned(cls.students.find(s=>s.id===adaId)),7);assert.equal(cls.students.find(s=>s.id===adaId).feeds.length,1);
 assert.ok(cls.students.filter(s=>s.id!==adaId).every(s=>C.earned(s)===0&&s.feeds.length===0));
 h.click(h.modal.querySelector('[data-action="close"]'));assert.equal(panel.querySelectorAll('.student-row').length,1);assert.equal(panel.querySelectorAll('.task-row').length,0);assert.equal(search.value,'a');assert.equal(panel.scrollTop,135);
 search.value='';search.dispatchEvent(new h.window.Event('input',{bubbles:true}));
 h.click(panel.querySelectorAll('.student-row')[2]);assert.equal(d.getElementById('modalTitle').textContent,'Ece');assert.equal(h.frames.length,1);
});
test('roster access includes eggs and absent pupils, retains attendance restrictions and daily corrections',async()=>{
 for(const absent of [false,true]){
  const h=await harness({growth:true,ageDays:0,absent}),d=h.document,record=h.saved();h.click('[data-action="panel"]');h.click('.student-row');
  assert.equal(h.modal.classList.contains('behavior-modal'),true);assert.equal(d.getElementById('modalTitle').textContent,'Deniz');
  assert.ok([...h.modal.querySelectorAll('.behavior-choice')].every(b=>b.disabled===absent));assert.deepEqual(h.saved(),record);
  h.click(h.modal.querySelector('[data-action="student-day"]'));assert.equal(h.modal.classList.contains('student-day-modal'),true);assert.ok(h.modal.querySelector('.task-row'));
  h.click(h.modal.querySelector('[data-action="back"]'));assert.equal(h.modal.classList.contains('behavior-modal'),true);
 }
});

test('sprite turns preserve a textured body, screen-facing labels and one RAF in natural, classic and lite modes',async()=>{
 for(const options of [{creatureMode:'natural'},{creatureMode:'classic'},{lite:true}]){
  const h=await harness({ageDays:0,...options}),d=h.document,fish=d.querySelector('.fish'),side=fish.querySelector('.fish-side'),core=fish.querySelector('.fish-turn-volume'),before=h.saved();
  const source=fish.querySelector('.fish-body-image').getAttribute('src');assert.equal(core.querySelector('img').getAttribute('src'),source);
  const widths=new Set();let sawRound=false,sawTurn=false;
  for(let i=1;i<=5000;i++){
   h.frames.shift()(i*50);const angle=Number(side.style.transform.match(/rotateY\(([\d.]+)deg/)[1]);
   if(angle>5&&angle<175){sawTurn=true;widths.add(side.style.transform);}
   if(angle>80&&angle<100){sawRound=true;assert.ok(Number(core.style.transform.match(/scaleX\(([\d.]+)\)/)[1])>.92);}
   assert.equal(fish.querySelector('.fish-name').style.getPropertyValue('transform')||'','');assert.equal(fish.querySelector('.fish-points').style.getPropertyValue('transform')||'','');
   assert.equal(fish.querySelector('.fish-art').style.opacity,'1.00');assert.equal(h.frames.length,1);
  }
  assert.ok(sawRound&&sawTurn&&widths.size>20);assert.deepEqual(h.saved(),before);assert.equal(h.modelCreates(),0);
 }
});

test('seasonal offer requires explicit theme acceptance and dismissing never saves or changes class data',async()=>{
 const h=await harness({seasonalDate:'2026-10-29T10:00:00Z'}),d=h.document,banner=d.getElementById('seasonalSuggestion');
 const before=JSON.stringify(h.saved());assert.equal(banner.hidden,false);assert.equal(h.saved().classes[0].theme,'reef');
 h.click('[data-action="seasonal-preview"]');assert.match(d.getElementById('modalTitle').textContent,/29 Ekim/);assert.equal(JSON.stringify(h.saved()),before);
 h.click('#modal [data-action="theme"]');assert.equal(h.saved().classes[0].theme,'republic-day');assert.equal(h.saved().settings.sound,'off');assert.equal(banner.hidden,true);
 const other=await harness({seasonalDate:'2026-12-20T10:00:00Z'}),snapshot=JSON.stringify(other.saved());
 other.click('[data-action="seasonal-dismiss"]');assert.equal(other.document.getElementById('seasonalSuggestion').hidden,true);assert.equal(JSON.stringify(other.saved()),snapshot);
 other.click('[data-action="settings"]');other.click('#modal [data-action="close"]');assert.equal(other.document.getElementById('seasonalSuggestion').hidden,true);
});
test('swordfish and Safiye retain continuous natural tail movement without a 3D renderer',async()=>{
 for(const species of ['swordfish','safiye']){
  const h=await harness({species,ageDays:0}),d=h.document,tail=d.querySelector('.fish-tail-image');assert.ok(tail,species);
  const poses=new Set();for(let i=0;i<220;i++){h.frames.shift()(i*50+20);poses.add(tail.closest('.fish').style.getPropertyValue('--tail-yaw'));}
  assert.ok(poses.size>20,species+' keeps moving');assert.equal(h.modelCreates(),0);
 }
});

test('themed demo starts without waiting for auth and cannot overwrite the teacher classroom',async()=>{
 for(const theme of ['new-year','republic-day']){
  const h=await harness({search:'?demo=1&tema='+theme,authPending:true}),d=h.document;
  assert.equal(d.body.classList.contains('access-pending'),false);assert.equal(d.getElementById('aquarium').dataset.theme,theme);
  assert.equal(d.querySelectorAll('.fish').length,12);assert.equal(h.saved().classes[0].students.length,1);assert.notEqual(h.saved().classes[0].theme,theme);
  assert.equal(d.getElementById('seasonalSnowman').hidden,theme!=='new-year');assert.equal(d.getElementById('republicDecor').hidden,theme!=='republic-day');
 }
 const teacher=await harness({search:'?tema=republic-day'});assert.notEqual(teacher.document.getElementById('aquarium').dataset.theme,'republic-day');
});
test('a stalled auth request ends with retry and a visible demo link; it never opens teacher data',async()=>{
 const h=await harness({authPending:true,timeoutAuth:true}),d=h.document;
 assert.equal(d.body.classList.contains('access-pending'),true);assert.match(d.getElementById('accessMessage').textContent,/Oturum kontrolü tamamlanamadı/);
 assert.equal(d.getElementById('accessRetry').hidden,false);assert.equal(d.querySelector('.preview-access a').getAttribute('href'),'?demo=1');
 assert.equal(d.querySelectorAll('.fish').length,0);assert.equal(h.saved().classes[0].students.length,1);
});

test('feeding one resting pupil never reassigns the sand slots of other hungry or absent fish',async()=>{
 for(const index of [0,2,4]){
  const h=await harness({extraNames:['Ada','Ece','Mert','İpek'],lite:true,configure:(state,cls)=>cls.students.forEach((s,i)=>{s.createdAt=Date.now()-3*86400000;if(i===3)C.ensureDay(s,cls).absent=true;})});
  const fish=[...h.document.querySelectorAll('#swimArea .fish')],others=fish.filter((_,i)=>i!==index),before=others.map(f=>f.style.transform);
  h.click(fish[index]);h.click('.behavior-choice');
  for(let i=0;i<500;i++)h.frames.pop()(100+i*50);
  assert.deepEqual(others.map(f=>f.style.transform),before,'remaining pupils must not slide into newly empty slots');
  assert.equal(fish[index].classList.contains('is-hungry'),false);assert.equal(h.frames.length,1);
 }
});
test('a hatching egg keeps the reserved resting slots of the other pupils',async()=>{
 const h=await harness({growth:true,extraNames:['Ada','Ece'],configure:(state,cls)=>{
  cls.students.forEach(s=>s.createdAt=Date.now()-3*86400000);
  cls.students.slice(1).forEach(s=>{C.ensureDay(s,cls);C.awardBehavior(s,cls,C.dayKey(),cls.tasks[0].id);s.feeds.forEach(f=>f.at=Date.now()-3*86400000);});
 }}),d=h.document,resting=[...d.querySelectorAll('.fish.is-hungry')],before=resting.map(f=>f.style.transform);
 assert.equal(resting.length,2);h.click('.fish.is-egg');h.click('.behavior-choice');
 for(let i=0;i<300;i++)h.frames.pop()(100+i*50);
 assert.equal(d.querySelector('.fish.is-egg'),null);assert.deepEqual(resting.map(f=>f.style.transform),before);
});
test('positive puffer awards inflate for five seconds, repeat safely and never persist an effect or change growth',async()=>{
 const h=await harness({species:'puffer',ageDays:0,lite:true}),d=h.document,fish=d.querySelector('.fish'),art=fish.querySelector('.fish-art');
 assert.equal(fish.classList.contains('is-puffed'),false);const size=fish.style.getPropertyValue('--fish-size'),growth=fish.style.getPropertyValue('--growth-scale');
 h.click(fish);h.click('.behavior-choice');h.frames.pop()(300);
 assert.equal(fish.classList.contains('is-puffed'),true);assert.match(art.style.transform,/scaleY\(1\.800\).*scaleX\(1\.280\)/);
 const recorded=h.saved();assert.equal(C.earned(recorded.classes[0].students[0]),7);assert.doesNotMatch(JSON.stringify(recorded),/puffStarted|is-puffed/);
 assert.equal(fish.style.getPropertyValue('--fish-size'),size);assert.equal(fish.style.getPropertyValue('--growth-scale'),growth);
 h.frames.pop()(2400);h.click(fish);h.click('.behavior-choice');h.frames.pop()(2700);
 assert.equal(fish.classList.contains('is-puffed'),true);h.frames.pop()(7399);assert.equal(fish.classList.contains('is-puffed'),true);
 h.frames.pop()(7440);assert.equal(fish.classList.contains('is-puffed'),false);assert.match(art.style.transform,/scaleY\(1\.000\).*scaleX\(1\.000\)/);
 assert.equal(C.earned(h.saved().classes[0].students[0]),14);assert.equal(h.frames.length,1);
});
test('bulk rewards inflate every puffer, including pupils beyond the particle effect budget',async()=>{
 const h=await harness({species:'puffer',ageDays:0,extraNames:Array.from({length:8},(_,i)=>'Öğrenci '+i),configure:(state,cls)=>cls.students.forEach(s=>s.species='puffer')}),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');d.getElementById('groupTask').querySelector('option').selected=true;d.getElementById('groupTask').dispatchEvent(new h.window.Event('change',{bubbles:true}));
 h.click('[data-action="group-select"]');h.submit(d.getElementById('groupRewardForm'));h.frames.pop()(300);
 assert.equal(d.querySelectorAll('.fish.is-puffed').length,9);assert.equal(d.querySelectorAll('.feed-particle').length,42);assert.equal(h.sounds(),1);
 h.frames.pop()(5100);assert.equal(d.querySelectorAll('.fish.is-puffed').length,0);
});
test('remote positive puffer awards animate once; unrelated account refreshes do not replay inflation',async()=>{
 const remote=syncFixture(),h=await harness({species:'puffer',ageDays:0,cloudFactory:remote.factory}),d=h.document;
 remote.award();await h.pollCloud();h.frames.pop()(300);assert.equal(d.querySelector('.fish').classList.contains('is-puffed'),true);
 h.frames.pop()(5100);assert.equal(d.querySelector('.fish').classList.contains('is-puffed'),false);
 remote.edit(doc=>doc.classes[0].name='Yeni ad');await h.pollCloud();h.frames.pop()(5400);assert.equal(d.querySelector('.fish').classList.contains('is-puffed'),false);
});
test('puffer celebration obeys reduced motion and the global motion switch',async()=>{
 for(const options of [{reduced:true},{configure:state=>state.settings.motion=false}]){
  const h=await harness({species:'puffer',ageDays:0,...options});h.click('.fish');h.click('.behavior-choice');
  assert.equal(h.document.querySelector('.fish').classList.contains('is-puffed'),false);assert.equal(C.earned(h.saved().classes[0].students[0]),7);
 }
});
