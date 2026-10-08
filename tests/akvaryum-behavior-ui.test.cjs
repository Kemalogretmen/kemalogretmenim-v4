const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const C=require('../js/akvaryum-core.js');
async function harness({absent=false,sound=true,reduced=false,extraNames=[]}={}) {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen/akvaryum.html','utf8'));
  const state=C.initialState(),cls=state.classes[0],s=C.newStudent('Deniz');
  cls.tasks[0].points=7;cls.students.push(s);s.createdAt=Date.now()-2*86400000-1000;
  extraNames.forEach(name=>cls.students.push(C.newStudent(name)));
  const day=C.ensureDay(s,cls);day.absent=absent;
  state.settings.points=true;state.settings.classPoints=true;state.settings.feedSound=sound;
  let saved=JSON.stringify(state),sounds=0;const intervals=[],frames=[];let timerNow=Date.now();
  window.AquariumCore=C;window.AquariumTimer={...require('../js/akvaryum-timer.js'),create:()=>require('../js/akvaryum-timer.js').create(()=>timerNow)};window.AquariumMotion=require('../js/akvaryum-motion.js');window.AquariumAudio={catalogue:require('../js/akvaryum-sounds.js').catalogue,tracks:{off:'Sessiz'},titles:{},current:()=> 'off',isPlaying:()=>false,setVolume(){},feed:async()=>{sounds++;}};
  window.kemalUserAuth={ready:async()=>{},getState:()=>({ready:true}),getProfile:()=>({role:'teacher',approval_status:'active'}),getUser:()=>({id:'test-teacher'})};
  window.matchMedia=()=>({matches:reduced,addEventListener(){}});
  for(const el of document.querySelectorAll('*')) el.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});
  const area=document.getElementById('swimArea');Object.defineProperty(area,'clientWidth',{value:900});Object.defineProperty(area,'clientHeight',{value:600});
  const bed=document.getElementById('eggBed');Object.defineProperty(bed,'clientWidth',{value:900});Object.defineProperty(bed,'clientHeight',{value:700});
  const modal=document.getElementById('modal');modal.close=()=>{modal.open=false;};modal.showModal=()=>{modal.open=true;};
  const context={window,document,location:{search:'',pathname:'/ogretmen/akvaryum.html'},URLSearchParams,performance,console,
    localStorage:{getItem:()=>saved,setItem:(key,value)=>{saved=value;}},
    setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}},
    FormData:class {constructor(form){this.form=form;}get(name){return this.form.querySelector('[name="'+name+'"]').value;}}};
  await vm.runInNewContext(fs.readFileSync('js/akvaryum.js','utf8'),context);
  const click=selector=>{const el=typeof selector==='string'?document.querySelector(selector):selector;assert.ok(el,selector);el.dispatchEvent(new window.Event('click',{bubbles:true}));};
  const submit=form=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  return {window,document,modal,click,submit,intervals,frames,advanceTimer:ms=>{timerNow+=ms;intervals[1]();},saved:()=>JSON.parse(saved),sounds:()=>sounds};
}
test('clicking the fish opens teacher behaviors; one click feeds, sounds, clears hunger and updates both scores',async()=>{
  const h=await harness(),d=h.document;
  assert.match(d.querySelector('.fish-hunger').getAttribute('aria-label'),/2 gündür beslenmedi/);
  assert.equal(d.querySelector('.fish-hunger').classList.contains('hunger-icon'),true);
  assert.equal(d.querySelector('.fish-hunger').hidden,false);
  h.click('.fish');assert.equal(h.modal.open,true);assert.equal(d.querySelectorAll('.behavior-choice').length,3);
  const button=d.querySelector('[data-action="reward-behavior"]');assert.match(button.textContent,/\+7 puan/);
  h.click(button);
  assert.equal(h.modal.open,false);assert.equal(h.sounds(),1);assert.equal(d.querySelector('.fish-hunger').hidden,true);
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
test('selected fish stays still in its popup, resumes after closing, and settings do not reset its location',async()=>{
  const h=await harness(),d=h.document,fish=d.querySelector('.fish');
  let time=0;const advance=n=>{for(let i=0;i<n;i++){time+=50;h.frames.pop()(time);}};
  advance(10);const initial=fish.style.transform;h.click('.fish');advance(20);assert.equal(fish.style.transform,initial);
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
 assert.equal(JSON.stringify(h.saved()),before);assert.equal(h.sounds(),0);
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
