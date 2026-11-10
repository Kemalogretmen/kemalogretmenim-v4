const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function agenda() {
  const { window, document } = parseHTML(fs.readFileSync('ogretmen-ajandasi/index.html', 'utf8'));
  // linkedom does not implement native select assignment or input validity.
  document.querySelectorAll('select').forEach(select => {
    Object.defineProperty(select, 'value', {
      get() { return this.querySelector('option[selected]')?.value || this.querySelector('option')?.value || ''; },
      set(value) { this.querySelectorAll('option').forEach(option => { if (option.value === String(value)) option.setAttribute('selected', ''); else option.removeAttribute('selected'); }); }
    });
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'checked', {
    configurable: true,
    get() { return this.hasAttribute('checked'); },
    set(value) { if (value) this.setAttribute('checked', ''); else this.removeAttribute('checked'); }
  });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const saved = new Map();
  const recovery = new Map();
  const context = vm.createContext({ window, document, console, TextEncoder, URL, URLSearchParams, setTimeout: () => 0, clearTimeout() {},
    setInterval: () => 0, confirm: () => true, CSS: { escape: value => value },
    recovery,
    localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  });
  const run = code => vm.runInContext(code, context);
  run(fs.readFileSync('ogretmen-ajandasi/app.js', 'utf8'));
  run(`accessCloudRecovery = async (owner, value) => value ? recovery.set(owner, JSON.parse(JSON.stringify(value))) : recovery.get(owner);`);
  run(`bindElements(); state = normalizeState({
    classes: [{id:'c1',name:'2-B'},{id:'c2',name:'3-A'}], activeClassId:'c1',
    students:[{id:'s1',classId:'c1',firstName:'Ada',lastName:'Kaya',schoolNo:'1'},
      {id:'s2',classId:'c1',firstName:'Efe',lastName:'Can',schoolNo:'2'},
      {id:'other',classId:'c2',firstName:'Diğer',lastName:'Öğrenci'}], exams:[]
  }); resetManualExam(); renderManualExamSelectors();
  renderAll = () => { renderManualExamSelectors(); renderExams(); renderReportSelectors(); renderReportOptions(); updateSubjectPicker(); buildReport(); };`);
  const $ = selector => document.querySelector(selector);
  const json = code => JSON.parse(run(`JSON.stringify(${code})`));
  function counts(id, subject, d, y = 0, b = 0) {
    for (const [kind, value] of Object.entries({d, y, b})) $(`[data-manual-student="${id}"] [data-subject="${subject}"][data-kind="${kind}"]`).value = String(value);
    run('updateManualExamTotals()');
  }
  return { run, $, counts, json, saved, recovery, document };
}

test('500 default, custom max, per-subject scores and legacy 100 remain distinct', () => {
  const h = agenda();
  assert.equal(h.run(`makeResult({T:{d:8,y:1,b:1}},{maxScore:500}).total.score`), 400);
  assert.equal(h.run(`makeResult({T:{d:8,y:1,b:1}},{maxScore:200}).total.score`), 160);
  assert.equal(h.run(`makeResult({T:{d:8,y:1,b:1}}).total.score`), 80);
  const result = h.json(`makeResult({T:{d:10,y:0,b:0},M:{d:5,y:5,b:0}},{maxScore:500,subjectPoints:{T:200,M:100}})`);
  assert.equal(result.total.score, 250);
  assert.equal(result.total.maxScore, 300);
  assert.equal(result.total.percent, 250 / 3);
});

test('penalty changes net automatically, never D/Y/B counts; negative net floors at zero', () => {
  const h = agenda();
  const before = h.json(`makeResult({T:{d:8,y:3,b:1}},{maxScore:500})`);
  const after = h.json(`makeResult({T:{d:8,y:3,b:1}},{maxScore:500,wrongPenalty:true})`);
  assert.equal(before.total.net, 8);
  assert.equal(after.total.net, 7);
  assert.equal(after.total.score, 7 / 12 * 500);
  assert.equal(after.total.d, 8);
  assert.equal(h.run(`makeResult({T:{d:0,y:6,b:0}},{wrongPenalty:true}).total.net`), 0);
});

test('manual inputs validate integer counts and require all subject point weights', () => {
  const h = agenda();
  h.$('#manualSubjects').value = 'Türkçe, Matematik';
  h.run('renderManualExamEntry()');
  h.counts('s1', 'TÜRKÇE', -1);
  assert.equal(h.$('#saveManualExamBtn').disabled, true);
  h.counts('s1', 'TÜRKÇE', 1.5);
  assert.equal(h.$('#saveManualExamBtn').disabled, true);
  h.counts('s1', 'TÜRKÇE', 8, 1, 1);
  h.$('#manualSubjectPoints').value = 'Türkçe=200';
  h.run('updateManualExamTotals()');
  assert.equal(h.$('#saveManualExamBtn').disabled, true);
  h.$('#manualSubjectPoints').value = 'Türkçe=200; Matematik=300';
  h.run('updateManualExamTotals()');
  assert.equal(h.$('#saveManualExamBtn').disabled, false);
});

test('save, filter student without losing draft, edit/add/remove result, reload and delete', () => {
  const h = agenda();
  h.$('#manualSubjects').value = 'Türkçe';
  h.$('#manualExamName').value = '1. Deneme';
  h.$('#manualExamType').value = 'Kazanım testi';
  h.run('renderManualExamEntry()');
  h.counts('s1', 'TÜRKÇE', 8, 1, 1);
  h.$('#manualStudent').value = 's2';
  h.run('renderManualExamEntry()');
  h.counts('s2', 'TÜRKÇE', 10);
  h.run('saveManualExam()');
  const first = h.json('state.exams[0]');
  assert.equal(first.type, 'Kazanım testi');
  assert.equal(first.results.s1.total.score, 400);
  assert.equal(first.results.s2.total.score, 500);
  assert.equal(first.results.other, undefined);
  assert.match(h.$('#examList').textContent, /Düzenle/);
  h.run(`editManualExam(${JSON.stringify(first.id)})`);
  h.counts('s1', 'TÜRKÇE', 9, 0, 1);
  h.$('[data-clear-result="s2"]').click();
  h.run('saveManualExam()');
  assert.equal(h.run('state.exams.length'), 1);
  assert.equal(h.run('state.exams[0].id'), first.id);
  assert.equal(h.run('state.exams[0].results.s1.total.score'), 450);
  assert.equal(h.run('state.exams[0].results.s2'), undefined);
  h.run('state = loadState()');
  assert.equal(h.run('state.exams[0].results.s1.total.score'), 450);
  h.run(`editManualExam(${JSON.stringify(first.id)})`);
  h.counts('s2', 'TÜRKÇE', 9, 0, 1);
  h.run('saveManualExam()');
  assert.equal(h.run(`buildRankingSummary('s1',state.exams).classRank`), 1);
  assert.equal(h.run(`buildRankingSummary('s2',state.exams).classRank`), 1);
  h.run(`deleteExam(${JSON.stringify(first.id)})`);
  assert.equal(h.run('state.exams.length'), 0);
});

test('report filters isolate active class, respect chosen exams, and create one report per student', () => {
  const h = agenda();
  h.run(`state.exams = ['a','b','c'].map((id,index) => ({id,classId:'c1',name:'Deneme '+id,subjects:['T'],
    date:'2026-10-26',scoring:{maxScore:500},showRankings:true,
    results:{s1:makeResult({T:{d:index+1,y:0,b:1}},{maxScore:500}),s2:makeResult({T:{d:3,y:0,b:1}},{maxScore:500})}}));
    state.exams.push({id:'private',classId:'c2',name:'Diğer sınıf',subjects:['T'],results:{}});
    renderAll();`);
  h.$('#reportExam').value = '__selected__';
  h.$('#reportExamPicker input[value="a"]').checked = true;
  h.$('#reportExamPicker input[value="c"]').checked = true;
  assert.deepEqual(h.json('selectedExamSet().map(exam=>exam.id)'), ['a', 'c']);
  h.$('#reportStudent').value = '__all__';
  h.run('updateSubjectPicker(); buildReport()');
  assert.equal(h.document.querySelectorAll('.student-report-page').length, 2);
  assert.match(h.$('#reportCard').textContent, /Denemeler: Deneme a · Deneme c/);
  assert.doesNotMatch(h.$('#reportCard').textContent, /Deneme b|Diğer Öğrenci/);
  assert.equal(h.run('reportExportTargets().length'), 2);
  h.$('#reportType').value = 'comparison';
  h.run('buildReport()');
  assert.equal(h.document.querySelectorAll('.student-report-page').length, 2);
  assert.match(h.$('#reportCard').textContent, /Karşılaştırmalı İzleme/);
  h.$('#reportExam').value = 'a';
  h.$('#reportStudent').value = 's1';
  h.$('#reportType').value = 'academic';
  h.run('buildReport()');
  assert.equal(h.document.querySelectorAll('.student-report-page').length, 1);
  assert.doesNotMatch(h.$('#reportCard').textContent, /Efe Can/);
  h.$('#reportExamPicker input[value="a"]').checked = false;
  h.$('#reportExamPicker input[value="c"]').checked = false;
  h.$('#reportExam').value = '__selected__';
  h.run('buildReport()');
  assert.match(h.$('#reportCard').textContent, /en az bir sınav seçin/);
});

function planner() {
  const html = fs.readFileSync('ogretmen-ajandasi/ders-programi.html', 'utf8');
  const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('function findWeekByDate'));
  const { window, document } = parseHTML(html);
  let now = '2026-10-26T09:00:00+03:00';
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  window.parent = window;
  window.location = {search: ''};
  const context = vm.createContext({window,document,Date:ClockDate,URLSearchParams,console,localStorage:{getItem:()=>null,setItem(){}},setInterval(){}});
  const run = code => vm.runInContext(code, context);
  run(source.replace(/\ninit\(\);/, '\n'));
  run(`renderWeeklyPlan = () => {}; state.yillikPlanlar = {T:[{hafta:7,tarihStart:'2026-10-26'},{hafta:8,tarihStart:'2026-11-02'}]};`);
  return {run, setNow: value => {now=value;}};
}

test('planner opens current week, retains manual browsing during week, advances Monday after sleep', () => {
  const h = planner();
  h.run(`state.lastFocusDate='2026-09-14'; applyInitialWeekFocus()`);
  assert.equal(h.run('state.currentWeek'), 7);
  h.run(`focusWeekByDate('2026-10-19'); checkAutomaticWeekFocus()`);
  assert.equal(h.run('state.currentWeek'), 6);
  h.setNow('2026-11-01T23:59:00+03:00');
  h.run('checkAutomaticWeekFocus()');
  assert.equal(h.run('state.currentWeek'), 6);
  h.setNow('2026-11-02T00:01:00+03:00');
  h.run('checkAutomaticWeekFocus()');
  assert.equal(h.run('state.currentWeek'), 8);
});

test('week number follows imported calendar and Sunday belongs to previous Monday', () => {
  const h = planner();
  h.run(`state.yillikPlanlar.T.push({hafta:9,tarihStart:'2026-11-16'})`);
  assert.equal(h.run(`findWeekByDate(new Date(2026,10,16))`), 9);
  assert.equal(h.run(`calendarMondayKey(new Date(2026,10,1))`), '2026-10-26');
});

test('new-device default class never overwrites an older real cloud agenda', async () => {
  const h=agenda();
  h.run(`state=normalizeState({classes:[],students:[],exams:[],updatedAt:null});ensureInitialClass();`);
  assert.equal(h.run('state.updatedAt'),null,'initial UI scaffolding is not a user edit');
  const row={agenda_state:{classes:[{id:'real',name:'2-B'}],students:[{id:'cloud-student',classId:'real'}],exams:[],updatedAt:'2026-01-01T00:00:00Z'},lesson_planner_state:{programs:{real:{Mon:[{ders:'MATEMATİK'}]}}},updated_at:'2026-01-01T00:00:01Z'};
  h.run(`fetchCloudRow=async()=>(${JSON.stringify(row)});state.updatedAt='2026-11-01T00:00:00Z';`);
  await h.run('reconcileCloudState({silent:true})');
  assert.equal(h.run('state.students[0].id'),'cloud-student');
  assert.equal(h.run('state.updatedAt'),'2026-01-01T00:00:00Z','cloud hydration preserves client edit timestamp');
});

test('a stale cloud save is rejected and preserves the local agenda', async () => {
  const h=agenda();
  h.run(`let filters=[];cloudSync.enabled=true;cloudSync.userId='teacher';cloudSync.ready=true;cloudSync.rowChecked=true;cloudSync.rowVersion='server-version-one';
    cloudSync.client={from:()=>({update:payload=>({eq:(key,value)=>{filters.push([key,value]);return {eq:(key,value)=>{filters.push([key,value]);return {select:()=>({maybeSingle:async()=>({data:null,error:null})})};}};}})})};`);
  assert.equal(await h.run('saveCloudNow({silent:true})'),false);
  assert.deepEqual(h.json('filters'),[['user_id','teacher'],['updated_at','server-version-one']]);
  assert.equal(h.run('state.students.length'),3);
  assert.equal(h.recovery.size, 0, 'a rejected write leaves the existing local snapshot intact');
  assert.match(h.run('cloudSync.lastError'),/başka bir cihazda değişti/);
});

test('reading a newer cloud row does not authorize overwriting it', async () => {
  const h = agenda();
  h.run(`const cloudReadRow={agenda_state:JSON.parse(JSON.stringify(state)),lesson_planner_state:null,updated_at:'new-server-version'};
    cloudSync.userId='teacher';cloudSync.rowVersion='known-old-version';cloudSync.rowChecked=true;
    cloudSync.client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:cloudReadRow,error:null})})})})};`);
  assert.equal((await h.run('fetchCloudRow()')).updated_at,'new-server-version');
  assert.equal(h.run('cloudSync.rowVersion'),'known-old-version');
  assert.equal(h.run('cloudSync.rowChecked'),true);
});

test('declining newer cloud hydration pauses writes and keeps the old baseline', async () => {
  const h = agenda();
  h.run(`let writtenRevision=null;state.updatedAt='2026-01-01T00:00:00Z';
    const newer={agenda_state:{...JSON.parse(JSON.stringify(state)),students:[{id:'remote-student',classId:'c1'}],updatedAt:'2026-11-02T00:00:00Z'},lesson_planner_state:null,updated_at:'server-new'};
    cloudSync.enabled=true;cloudSync.userId='teacher';cloudSync.ready=true;cloudSync.rowChecked=true;cloudSync.rowVersion='server-old';confirm=()=>false;
    cloudSync.client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:newer,error:null})})}),update:()=>({eq:()=>({eq:(_key,revision)=>{writtenRevision=revision;return {select:()=>({maybeSingle:async()=>({data:null,error:null})})};}})})})};`);
  await h.run('reconcileCloudState({silent:true})');
  assert.equal(h.run('cloudSync.rowVersion'),'server-old');
  assert.equal(await h.run('saveCloudNow({silent:true})'),false);
  assert.equal(h.run('writtenRevision'),null);
  assert.equal(h.run('state.students[0].id'),'s1');
});

test('newer local clock without a verified baseline preserves local work and never autosaves', async () => {
  const h = agenda();
  h.run(`let writes=0;state.updatedAt='2026-11-02T00:00:00Z';
    const remote={agenda_state:{...JSON.parse(JSON.stringify(state)),students:[{id:'remote-student',classId:'c1'}],updatedAt:'2026-01-01T00:00:00Z'},lesson_planner_state:null,updated_at:'server-version'};
    cloudSync.enabled=true;cloudSync.userId='teacher';cloudSync.client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:remote,error:null})})}),update:()=>{writes++;throw new Error('Unsafe overwrite');}})};`);
  await h.run('reconcileCloudState({silent:true})');
  assert.equal(h.run('writes'),0);
  assert.equal(h.run('cloudSync.rowChecked'),false);
  assert.match(h.run('cloudSync.lastError'),/sürümü doğrulanamadı/);
  assert.equal(h.run('state.students[0].id'),'s1');
});

test('identical saved documents establish a baseline independently of navigation state', async () => {
  const h = agenda();
  h.run(`state.updatedAt='2026-11-02T00:00:00Z';
    const matching={agenda_state:{...JSON.parse(JSON.stringify(state)),lessonPlannerFocusDate:'2025-01-01'},lesson_planner_state:null,updated_at:'verified-version',client_updated_at:state.updatedAt};
    cloudSync.userId='teacher';cloudSync.client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:matching,error:null})})})})};`);
  await h.run('reconcileCloudState({silent:true})');
  assert.equal(h.run('cloudSync.rowVersion'),'verified-version');
  assert.equal(h.run('cloudSync.rowChecked'),true);
  assert.equal(h.run('cloudSync.ready'),true);
});

test('loading a cloud row explicitly binds the write baseline only after hydration', async () => {
  const h = agenda();
  await h.run(`cloudSync.userId='teacher';applyCloudRow({agenda_state:{classes:[{id:'cloud',name:'4-C'}],students:[],exams:[],updatedAt:'2026-11-02T00:00:00Z'},lesson_planner_state:null,updated_at:'loaded-version'});`);
  assert.equal(h.run('cloudSync.rowVersion'),'loaded-version');
  assert.equal(h.run('cloudSync.rowChecked'),true);
  assert.equal(h.run('state.classes[0].id'),'cloud');
  assert.equal(h.recovery.get('teacher').local.agendaState.students.length, 3);
});

test('verified web cloud lineage survives reload and never migrates to a different account',()=>{
  const h=agenda();
  h.run(`cloudSync.userId='teacher-a';acceptCloudVersion({updated_at:'revision-a'});cloudSync.rowVersion=null;cloudSync.rowChecked=false;restoreCloudVersion('teacher-a');`);
  assert.equal(h.run('cloudSync.rowVersion'),'revision-a');
  assert.equal(h.run('cloudSync.rowChecked'),true);
  h.run(`cloudSync.rowVersion=null;cloudSync.rowChecked=false;restoreCloudVersion('teacher-b');`);
  assert.equal(h.run('cloudSync.rowChecked'),false);
});

test('manual legacy recovery requires consent, backs up both versions, and writes with current CAS revision',async()=>{
  const h=agenda();
  h.run(`let writes=[];cloudSync.userId='teacher';cloudSync.enabled=true;cloudSync.ready=false;
    const remote={agenda_state:{...state,students:[]},lesson_planner_state:null,updated_at:'recovery-revision'};
    fetchCloudRow=async()=>remote;
    cloudSync.client={from:()=>({update:payload=>({eq:(key,user)=>({eq:(key,revision)=>{writes.push({revision,payload,user});return{select:()=>({maybeSingle:async()=>({data:{updated_at:'saved-revision'},error:null})})};}})})})};
    confirm=()=>false;`);
  assert.equal(await h.run('saveCloudNow({manual:true})'),false);
  assert.equal(h.run('writes.length'),0);
  assert.equal(h.run('cloudSync.rowChecked'),false);
  h.run(`confirm=()=>true;const set = localStorage.setItem;
    localStorage.setItem=(key,value)=>{if(value.length>140)throw new DOMException('full','QuotaExceededError');return set(key,value);};`);
  assert.equal(await h.run('saveCloudNow({manual:true})'),true);
  assert.equal(h.run('writes[0].revision'),'recovery-revision');
  assert.equal(h.run('writes[0].payload.agenda_state.students.length'),3);
  assert.equal(h.recovery.get('teacher').local.agendaState.students.length, 3);
  assert.equal(h.recovery.get('teacher').cloud.agendaState.students.length, 0);
  assert.equal(h.run('cloudSync.rowVersion'),'saved-revision');
});

test('manual recovery never overwrites a newer concurrent cloud edit or imports another account local data',async()=>{
  const h=agenda();
  h.run(`let writes=0;cloudSync.userId='b';cloudSync.enabled=true;cloudSync.ready=false;
    fetchCloudRow=async()=>({agenda_state:{...state,students:[]},updated_at:'read-revision'});
    cloudSync.client={from:()=>({update:()=>{writes++;return{eq:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:null,error:null})})})})};}})};
    localStorage.setItem('kemalOgretmenAjandasi.v1.owner','a');`);
  assert.equal(await h.run('saveCloudNow({manual:true})'),false);
  assert.equal(h.run('writes'),0);
  h.saved.set('kemalOgretmenAjandasi.v1.owner','b');
  assert.equal(await h.run('saveCloudNow({manual:true})'),false);
  assert.equal(h.run('writes'),1);
  assert.equal(h.run('cloudSync.ready'),false);
  assert.equal(h.run('cloudSync.rowChecked'),false,'failed recovery cannot persist the newly read revision');
  assert.equal(h.run('state.students.length'),3);
});

test('recovery failure or a local edit during backup never authorizes a cloud overwrite', async () => {
  const h = agenda();
  h.run(`cloudSync.userId='teacher';cloudSync.enabled=true;let writes=0;
    fetchCloudRow=async()=>({agenda_state:{...state,students:[]},updated_at:'read-revision'});
    cloudSync.client={from:()=>{writes++;throw new Error('unexpected write');}};
    accessCloudRecovery=async()=>{throw new Error('IndexedDB denied');};`);
  assert.equal(await h.run('saveCloudNow({manual:true})'), false);
  assert.match(h.run('cloudSync.lastError'), /Güvenlik yedeği.*üzerine yazılmadı/);
  h.run(`accessCloudRecovery=async()=>{state.students[0].firstName='Yerel değişiklik';};`);
  assert.equal(await h.run('saveCloudNow({manual:true})'), false);
  assert.match(h.run('cloudSync.lastError'), /cihazdaki kayıt değişti/);
  assert.equal(h.run('writes'), 0);
  assert.equal(h.run('cloudSync.rowChecked'), false);
});

test('a full local store rolls back both keys on cloud download and leaves the baseline unchanged', async () => {
  const h = agenda();
  h.run(`cloudSync.userId='teacher';cloudSync.enabled=true;cloudSync.client={};cloudSync.rowVersion='old';
    const remote={agenda_state:{...state,students:[]},lesson_planner_state:{large:'x'.repeat(5000)},updated_at:'new'};
    fetchCloudRow=async()=>remote;
    saveState({skipCloud:true});localStorage.setItem(LESSON_PLANNER_STORE_KEY,'{"programs":{"old":{}}}');
    const set=localStorage.setItem;localStorage.setItem=(key,value)=>{
      if(key===LESSON_PLANNER_STORE_KEY&&value.length>400)throw Object.assign(new Error('full'),{name:'QuotaExceededError'});
      return set(key,value);};`);
  const before = [...h.saved.entries()];
  assert.equal(await h.run('loadCloudNow({manual:true})'), false);
  assert.deepEqual([...h.saved.entries()], before);
  assert.equal(h.run('state.students.length'), 3);
  assert.equal(h.run('cloudSync.rowVersion'), 'old');
  assert.match(h.run('cloudSync.lastError'), /yeterli yer yok/);
  assert.equal(h.recovery.get('teacher').local.agendaState.students.length, 3);
});

test('renaming a class is persisted and does not move pupils or alter another class',()=>{
  const h=agenda();
  h.run('renderSettings()'); h.$('#className').value='Birincilerim';
  h.run('saveSettingsAndClass();state=loadState()');
  assert.equal(h.run('state.classes[0].name'),'Birincilerim');
  assert.equal(h.run('state.classes[1].name'),'3-A');
  assert.equal(h.run('state.students[0].classId'),'c1');
});

test('imported teacher and student image fields cannot create markup, handlers or CSS attributes', () => {
  const h = agenda(), attack = '\" onerror=\"window.attacked=true\"><script>attack()</script>';
  h.run(`state.teacher.photo=${JSON.stringify(attack)}; state.teacher.schoolLogo=${JSON.stringify('javascript:attack()')}; renderTeacherPhoto(); renderSchoolLogo();`);
  h.$('#studentGrid').innerHTML = h.run(`avatarHtml({photo:${JSON.stringify(attack)},photoFit:${JSON.stringify(attack)},photoX:50,photoY:50})`);
  for (const selector of ['#teacherPhotoPreview','#heroTeacherPhoto','#schoolLogoPreview','#studentGrid']) {
    assert.equal(h.$(selector).querySelectorAll('script,[onerror],[onload]').length,0);
    for (const image of h.$(selector).querySelectorAll('img')) assert.equal(image.getAttribute('src'),'');
  }
  assert.equal(h.run(`safeImageSource('data:image/png;base64,aGVsbG8=')`),'data:image/png;base64,aGVsbG8=');
  assert.equal(h.run(`safeImageSource('https://example.invalid/photo.png')`),'https://example.invalid/photo.png');
  assert.equal(h.run(`safeImageSource('https://user:pass@example.invalid/photo.png')`),'');
});

test('imported result count strings render as inert text in the student academic table', () => {
  const h = agenda(), attack = '<img src=x onerror=attack()>';
  h.run(`state.exams=[{id:'exam',name:'Test',classId:'c1',date:'2026-11-02',results:{s1:{total:{d:${JSON.stringify(attack)},y:1,b:0,percent:80}}}}];renderStudentAcademic(state.students[0]);`);
  assert.equal(h.$('#studentAcademic').querySelectorAll('img,[onerror]').length,0);
  assert.ok(h.$('#studentAcademic').textContent.includes(attack));
  assert.ok(h.$('#studentAcademic').textContent.includes('80'));
});
