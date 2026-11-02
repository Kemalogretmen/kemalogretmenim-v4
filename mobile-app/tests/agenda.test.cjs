const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(name){const file=path.join(__dirname,'../src/platform',name+'.ts');const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>n.startsWith('./')?load(n.slice(2)):require(n),Date,console,Set,TextEncoder});return module.exports;}
const m=load('agendaModel');
function fixture(){return m.normalizeAgendaRow({updated_at:'2026-11-01T10:00:00Z',agenda_state:{classes:[{id:'a',name:'3/A'},{id:'b',name:'4/A'}],students:[{id:'s',classId:'a',firstName:'Test',healthStatus:'secret',family:{phone:'private'},address:'private',photo:'data:large'}],calendarEvents:[{id:'e',title:'Toplantı',date:'2026-11-02',time:'10:00',done:false}],scheduleItems:[{id:'l',classId:'b',day:1,lesson:'Other',period:1}],exams:[],teacher:{photo:'private',name:'Teacher'},unknownField:{must:'survive'}},lesson_planner_state:{siniflar:[{id:'p',name:'3/a'}],programs:{p:{Mon:[{ders:'MATEMATİK'},{ders:'MATEMATİK'},{ders:'TÜRKÇE'}],Tue:[{ders:'MATEMATİK'}]}},settings:{lessonCount:5,weekend:{Sat:{enabled:false},Sun:{enabled:false}}},dersOgretmenleri:{MATEMATIK:'Öğretmen'},yillikPlanlar:{Matematik:[{hafta:8,tarihStart:'2026-11-02T00:00:00.000Z',slotStart:0,slotCount:1,kazanim:'İlk çıktı',surec:'İlk süreç'},{hafta:8,tarihStart:'2026-11-02',slotStart:1,slotCount:3,kazanim:'İkinci çıktı',additionalOutcomes:[{kazanim:'Ek çıktı'}]}],Türkçe:[{hafta:8,tarihStart:'2026-11-02',kazanim:'Okuma'}]},tatiller:[],totalWeeks:36}});}
test('native daily planner matches classes, current actual calendar date and repeated lesson output slots',()=>{const row=fixture();const choices=m.agendaClassChoices(row);assert.equal(choices[0].plannerId,'p');const mon=m.dailyLessons(row,'2026-11-02',choices[0]);assert.equal(mon.week,8);assert.equal(mon.lessons.length,5);assert.equal(mon.lessons[0].outcome,'İlk çıktı');assert.equal(mon.lessons[1].outcome,'İkinci çıktı');assert.equal(mon.lessons[2].outcome,'Okuma');assert.equal(mon.lessons[0].teacher,'Öğretmen');assert.equal(m.dailyLessons(row,'2026-11-03',choices[0]).lessons[0].outcome,'İkinci çıktı');});
test('native day label honors the desktop planner focus and exposes desktop subject colors',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];row.lesson_planner_state.currentWeek=8;row.lesson_planner_state.lastFocusDate='2026-11-02';row.lesson_planner_state.yillikPlanlar.Matematik.forEach(e=>{e.hafta=9;e.tarihStart='2026-11-09';});const daily=m.dailyLessons(row,'2026-11-02',choice);assert.equal(daily.week,8);assert.equal(daily.lessons[0].color.label,'Matematik');assert.equal(daily.lessons[2].color.label,'Türkçe');});
test('personal agenda markers include events, birthdays, configured holidays and the official calendar fallback',()=>{const row=fixture();row.agenda_state.students[0].birthDate='2018-11-02';row.lesson_planner_state.tatiller=[{source:'tr-official',officialId:'tr-2026-custom',start:'2026-11-02',end:'2026-11-02',name:'Okul töreni'}];const markers=m.agendaMarkers(row,'2026-11-02','a');assert.ok(markers.some(x=>x.kind==='event'));assert.ok(markers.some(x=>x.kind==='birthday'));assert.ok(markers.some(x=>x.kind==='holiday'&&x.title==='Okul töreni'));const october=m.agendaMarkers(row,'2026-10-29','a');assert.ok(october.some(x=>x.kind==='holiday'&&/Cumhuriyet/.test(x.title)));});
test('outdated annual plans never pretend to be the current school year',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];const daily=m.dailyLessons(row,'2027-11-02',choice);assert.equal(daily.week,null);assert.equal(daily.lessons[0].outcome,undefined);});
test('holidays and disabled weekends do not display teaching outputs',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];row.lesson_planner_state.tatiller=[{start:'2026-11-02',end:'2026-11-02',name:'Tatil'}];assert.equal(m.dailyLessons(row,'2026-11-02',choice).lessons[0].holiday,true);assert.equal(m.dailyLessons(row,'2026-11-02',choice).lessons[0].outcome,undefined);assert.equal(m.dailyLessons(row,'2026-11-01',choice).lessons.length,0);});
test('native half-day holidays preserve morning outputs and disabled holidays never close lessons',()=>{
  const row=fixture(),choice=m.agendaClassChoices(row)[0];
  row.lesson_planner_state.settings.halfDayStartPeriod=2;
  row.lesson_planner_state.tatiller=[{start:'2026-11-02',end:'2026-11-02',period:'afternoon',name:'Yarım gün'}];
  const lessons=m.dailyLessons(row,'2026-11-02',choice).lessons;
  assert.equal(lessons[0].holiday,false);assert.equal(lessons[0].outcome,'İlk çıktı');
  assert.equal(lessons[1].holiday,true);assert.equal(lessons[1].outcome,undefined);
  assert.equal(m.dailyLessons(row,'2026-11-03',choice).lessons[0].outcome,'İkinci çıktı');
  row.lesson_planner_state.tatiller[0].disabled=true;
  assert.equal(m.dailyLessons(row,'2026-11-02',choice).lessons[1].holiday,false);
});
test('all simple timetable fallbacks are scoped to the selected roster class',()=>{const row=fixture();assert.equal(m.dailyLessons(row,'2026-11-02',m.agendaClassChoices(row)[1]).lessons[0].title,'Other');});
test('native patch preserves unrelated web data and the annual planner',()=>{const row=fixture();const op={id:'op',collection:'calendarEvents',itemId:'e',before:row.agenda_state.calendarEvents[0],patch:{done:true},createdAt:'now'};const next=m.applyAgendaChanges(row,[op]);assert.equal(next.agenda_state.calendarEvents[0].done,true);assert.equal(row.agenda_state.calendarEvents[0].done,false);assert.equal(JSON.stringify(next.lesson_planner_state),JSON.stringify(row.lesson_planner_state));assert.equal(next.agenda_state.unknownField.must,'survive');assert.equal(next.agenda_state.students[0].healthStatus,'secret');});
test('changes to the same field on another device produce an explicit conflict instead of overwriting it',()=>{const row=fixture();assert.throws(()=>m.applyAgendaChanges(row,[{id:'op',collection:'calendarEvents',itemId:'e',before:{done:true},patch:{done:'invalid'},createdAt:'now'}]),/başka bir cihazda/);const op={id:'op',collection:'plannerCell',itemId:'p:Mon:0',classId:'p',day:'Mon',period:0,before:{ders:'TÜRKÇE'},patch:{ders:'FEN',isHoliday:false},createdAt:'now'};assert.throws(()=>m.applyAgendaChanges(row,[op]),/başka bir cihazda/);});
test('acknowledged create/remove operations may be replayed after a device storage failure',()=>{const row=fixture();const add={id:'op',collection:'calendarEvents',itemId:'new',patch:{title:'Plan',date:'2026-11-02'},createdAt:'now'};const first=m.applyAgendaChanges(row,[add]),second=m.applyAgendaChanges(first,[add]);assert.equal(second.agenda_state.calendarEvents.filter(e=>e.id==='new').length,1);const remove={id:'r',collection:'calendarEvents',itemId:'new',before:second.agenda_state.calendarEvents.find(e=>e.id==='new'),remove:true,createdAt:'now'};assert.equal(m.applyAgendaChanges(m.applyAgendaChanges(second,[remove]),[remove]).agenda_state.calendarEvents.some(e=>e.id==='new'),false);});
test('display cache omits private family, health, photo, and address data',()=>{const cache=m.agendaCache(fixture());const raw=JSON.stringify(cache);for(const value of ['healthStatus','phone','address','data:large','photo'])assert.equal(raw.includes(value),false,value);assert.equal(cache.agenda_state.students[0].firstName,'Test');});
test('day arrows cross month and leap-year boundaries without UTC shifts',()=>{assert.equal(m.shiftDate('2026-11-01',-1),'2026-10-31');assert.equal(m.shiftDate('2028-02-28',1),'2028-02-29');assert.equal(m.shiftDate('2027-01-01',-7),'2026-12-25');});
test('mixed school years do not borrow another subjects current week to show stale outcomes',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];for(const e of row.lesson_planner_state.yillikPlanlar.Matematik)e.tarihStart='2025-11-03';const daily=m.dailyLessons(row,'2026-11-02',choice);assert.equal(daily.week,8);assert.equal(daily.lessons[0].outcome,undefined);assert.equal(daily.lessons[1].outcome,undefined);assert.equal(daily.lessons[2].outcome,'Okuma');});
test('malformed dates and outcome objects cannot render invalid lessons or crash native Text',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];assert.equal(m.schoolWeek(row.lesson_planner_state,'2026-02-31'),null);assert.equal(m.dailyLessons(row,'2026-13-01',choice).lessons.length,0);const entry=row.lesson_planner_state.yillikPlanlar.Matematik[0];entry.kazanim={html:'bad'};entry.surec=['bad'];entry.additionalOutcomes=[null,false,{kazanim:{bad:true}},{kazanim:'Doğru çıktı',surec:'Süreç'}];const lesson=m.dailyLessons(row,'2026-11-02',choice).lessons[0];assert.equal(lesson.outcome,undefined);assert.equal(lesson.process,undefined);assert.equal(lesson.additional.length,1);assert.equal(lesson.additional[0].kazanim,'Doğru çıktı');for(const entries of Object.values(row.lesson_planner_state.yillikPlanlar))for(const e of entries)e.tarihStart='2026-02-31';assert.equal(m.schoolWeek(row.lesson_planner_state,'2026-11-02'),null);});
test('ISO holiday dates suppress all outputs and preserve local calendar boundaries',()=>{const row=fixture(),choice=m.agendaClassChoices(row)[0];row.lesson_planner_state.tatiller=[{start:'2026-11-02T00:00:00.000Z',end:'2026-11-02T23:59:59Z',name:'Tatil'}];const lessons=m.dailyLessons(row,'2026-11-02',choice).lessons;assert.equal(lessons[0].holiday,true);assert.equal(lessons[0].outcome,undefined);assert.equal(lessons[0].process,undefined);assert.equal(lessons[1].additional.length,0);});
test('replaying an acknowledged create detects later edits instead of overwriting another device',()=>{const row=fixture();const op={id:'create',collection:'calendarEvents',itemId:'new',patch:{title:'İlk başlık',date:'2026-11-02'},createdAt:'now'};const committed=m.applyAgendaChanges(row,[op]);committed.agenda_state.calendarEvents.find(e=>e.id==='new').title='Başka cihaz';assert.throws(()=>m.applyAgendaChanges(committed,[op]),/başka bir cihazda/);assert.equal(m.applyAgendaChanges(committed,[op],false).agenda_state.calendarEvents.find(e=>e.id==='new').title,'İlk başlık');});

test('grade and branch name variants pair the active roster class with its unique planner without changing saved data', () => {
  const variants = ['2-B Sınıfı', '2/B', '2 B', '2-B'];
  for (const rosterName of variants) for (const plannerName of variants) {
    const row = fixture();
    row.agenda_state.activeClassId = 'a';
    row.agenda_state.classes[0].name = rosterName;
    row.lesson_planner_state.siniflar[0].name = plannerName;
    const before = JSON.stringify(row);
    const choices = m.agendaClassChoices(row);
    const active = choices.find(choice => choice.agendaId === row.agenda_state.activeClassId);
    assert.equal(active.id, 'a');
    assert.equal(active.name, rosterName);
    assert.equal(active.plannerId, 'p', `${rosterName} / ${plannerName}`);
    assert.equal(choices.length, 2);
    assert.equal(m.dailyLessons(row, '2026-11-02', active).lessons[0].outcome, 'İlk çıktı');
    assert.equal(JSON.stringify(row), before);
  }
});

test('duplicate planner names remain separate choices instead of automatically pairing an ambiguous class', () => {
  const row = fixture();
  row.agenda_state.classes[0].name = '2-B';
  row.lesson_planner_state.siniflar = [{ id: 'p', name: '2-B' }, { id: 'q', name: '2/B' }];
  const choices = m.agendaClassChoices(row);
  assert.equal(choices.find(choice => choice.agendaId === 'a').plannerId, undefined);
  assert.equal(choices.filter(choice => choice.plannerId === 'p').length, 1);
  assert.equal(choices.filter(choice => choice.plannerId === 'q').length, 1);
  assert.equal(choices.find(choice => choice.plannerId === 'p').agendaId, undefined);
  assert.equal(choices.find(choice => choice.plannerId === 'q').agendaId, undefined);
});

test('duplicate roster names cannot both claim one planner even if one name is an exact match', () => {
  const row = fixture();
  row.agenda_state.classes = [{ id: 'a', name: '2-B' }, { id: 'b', name: '2/B Sınıfı' }];
  row.lesson_planner_state.siniflar = [{ id: 'p', name: '2-B' }];
  const choices = m.agendaClassChoices(row);
  assert.equal(choices.filter(choice => choice.agendaId).every(choice => choice.plannerId === undefined), true);
  assert.equal(choices.find(choice => choice.plannerId === 'p').agendaId, undefined);
  assert.equal(choices.length, 3);
});

test('class matching retains distinct Turkish branch letters and does not guess from longer names', () => {
  const row = fixture();
  row.agenda_state.classes = [{ id: 'a', name: '2-C' }, { id: 'b', name: '2-Ç Sınıfı' }, { id: 'c', name: '2-B Gündüz' }];
  row.lesson_planner_state.siniflar = [{ id: 'p', name: '2/Ç' }, { id: 'q', name: '2-B' }];
  const choices = m.agendaClassChoices(row);
  assert.equal(choices.find(choice => choice.agendaId === 'a').plannerId, undefined);
  assert.equal(choices.find(choice => choice.agendaId === 'b').plannerId, 'p');
  assert.equal(choices.find(choice => choice.agendaId === 'c').plannerId, undefined);
  assert.equal(choices.find(choice => choice.plannerId === 'q').agendaId, undefined);
});
