const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const C=require('../js/akvaryum-core.js');
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
async function harness({absent=false,sound=true,reduced=false,extraNames=[],deleteError=false,ageDays=2,chatTest=false,growth=false,species='clown',creatureMode=null,modelAvailable=true,lite=false,drawCost=0,autoQuality=false}={}) {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen/akvaryum.html','utf8'));
  const state=C.initialState(),cls=state.classes[0],s=C.newStudent('Deniz',species);
  cls.tasks[0].points=7;cls.students.push(s);if(growth)cls.growth={enabled:true,thresholds:Array.from({length:10},(_,i)=>(i+1)*7)};s.createdAt=Date.now()-ageDays*86400000-1000;
  extraNames.forEach(name=>cls.students.push(C.newStudent(name)));
  const day=C.ensureDay(s,cls);day.absent=absent;
  state.settings.points=true;state.settings.classPoints=true;state.settings.feedSound=sound;
  let saved=JSON.stringify(state),backup=null,deleteCalls=0,sounds=0;const intervals=[],frames=[];let timerNow=Date.now(),frameNow=0,rafId=0;
  const modelCalls=[];let modelCreates=0,modelDisposes=0,modelFail=false;
  window.AquariumAnatomy=require('../js/akvaryum-anatomy.js');
  window.AquariumCreature3D={create:()=>{modelCreates++;return {supported:modelAvailable,render:(canvas,...args)=>{modelCalls.push(args);frameNow+=drawCost;return !modelFail;},dispose:()=>modelDisposes++};}};
  window.SitePerformance={lite:()=>lite,mode:()=>lite?'lite':'auto',reportSlow(){if(autoQuality&&!lite){lite=true;window.dispatchEvent(new window.Event('site-performance-change'));}},set:value=>{lite=value==='lite';window.dispatchEvent(new window.Event('site-performance-change'));}};
  window.AquariumCore=C;window.AquariumTimer={...require('../js/akvaryum-timer.js'),create:()=>require('../js/akvaryum-timer.js').create(()=>timerNow)};window.AquariumMotion=require('../js/akvaryum-motion.js');window.AquariumAudio={catalogue:require('../js/akvaryum-sounds.js').catalogue,tracks:{off:'Sessiz'},titles:{},current:()=> 'off',isPlaying:()=>false,setVolume(){},feed:async()=>{sounds++;}};
  window.kemalUserAuth={ready:async()=>{},getState:()=>({ready:true}),getProfile:()=>({role:'teacher',approval_status:'active'}),getUser:()=>({id:'test-teacher'})};
  if(chatTest)window.AquariumMotion={...window.AquariumMotion,step:fish=>fish.forEach(f=>{f.x=100;f.y=200;})};
  window.AquariumSharing={removeClass:async()=>{deleteCalls++;if(deleteError)throw Error("Bağlantı yok. Sınıf silinmedi.");}};
  window.matchMedia=()=>({matches:reduced,addEventListener(){}});
  for(const el of document.querySelectorAll('*')) el.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});
  const area=document.getElementById('swimArea');Object.defineProperty(area,'clientWidth',{value:900});Object.defineProperty(area,'clientHeight',{value:600});
  const bed=document.getElementById('eggBed');Object.defineProperty(bed,'clientWidth',{value:900});Object.defineProperty(bed,'clientHeight',{value:700});
  const modal=document.getElementById('modal');modal.close=()=>{modal.open=false;};modal.showModal=()=>{modal.open=true;};
  const app=document.getElementById('aquariumApp');
  app.requestFullscreen=async()=>{document.fullscreenElement=app;document.dispatchEvent(new window.Event('fullscreenchange'));};
  document.exitFullscreen=async()=>{document.fullscreenElement=null;document.dispatchEvent(new window.Event('fullscreenchange'));};
  const context={window,document,location:{search:'',pathname:'/ogretmen/akvaryum.html'},URLSearchParams,performance:{now:()=>frameNow},console,
    localStorage:{getItem:key=>key==='kemal_aquarium_creature_mode'?creatureMode:key.endsWith("_beforeClassDelete")?backup:saved,setItem:(key,value)=>{if(key==='kemal_aquarium_creature_mode')creatureMode=value;else if(key.endsWith("_beforeClassDelete"))backup=value;else saved=value;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:fn=>{const callback=now=>{frameNow=now;fn(now);};callback.id=++rafId;frames.push(callback);return callback.id;},cancelAnimationFrame:id=>{const index=frames.findIndex(fn=>fn.id===id);if(index>=0)frames.splice(index,1);},ResizeObserver:class{observe(){}},
    FormData:class {constructor(form){this.form=form;}get(name){return this.form.querySelector('[name="'+name+'"]').value;}}};
  await vm.runInNewContext(fs.readFileSync('js/akvaryum.js','utf8'),context);
  const click=selector=>{const el=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(el,selector);el.dispatchEvent(new window.Event('click',{bubbles:true}));};
  const submit=form=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  return {window,document,modal,click,submit,intervals,frames,advanceTimer:ms=>{timerNow+=ms;intervals[1]();},saved:()=>JSON.parse(saved),sounds:()=>sounds,backup:()=>JSON.parse(backup),deleteCalls:()=>deleteCalls,modelCalls,modelCreates:()=>modelCreates,modelDisposes:()=>modelDisposes,failModels:()=>{modelFail=true;},creatureMode:()=>creatureMode};
}
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
test('the sidebar completion uses the same feeding path, and settings require a valid score',async()=>{
  const h=await harness(),d=h.document;
  h.click('.student-row');h.click('[data-action="task-status"][data-status="done"]');
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

test('bulk reward UI starts unselected, excludes absent students, feeds once and plays one chime',async()=>{
 const h=await harness({absent:true,extraNames:['Ada','İpek']}),d=h.document;
 h.click('[data-action="activities"]');h.click('[data-action="group-reward"]');
 // linkedom does not implement a browser's implicit first-option selection.
 const select=d.getElementById('groupTask');select.querySelector('option').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('groupSubmit').disabled,true);
 h.click('[data-action="group-select"]');assert.equal(d.querySelector('[name="studentId"]').disabled,true);
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
 assert.equal(d.querySelectorAll('.scene-controls>.fullscreen-keep').length,4);
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

test('tail strokes stop for hungry fish, resume after feeding, and obey the motion switch',async()=>{
 const h=await harness(),fish=h.document.querySelector('.fish');
 const flex=()=>fish.style.getPropertyValue('--tail-flex');
 assert.ok(fish.classList.contains('has-tail'));
 assert.equal(fish.querySelectorAll('.fish-art img').length,2);
 const sources=[...fish.querySelectorAll('.fish-art img')].map(i=>i.getAttribute('src'));
 assert.equal(sources[0],sources[1]);
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
