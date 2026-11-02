const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const holidays = require('../ogretmen-ajandasi/resmi-tatiller.js');

test('verified official calendar includes fixed dates, religious ranges and two Ramadan feasts in 2033',()=>{
  for(const year of Object.keys(holidays.data.years)) {
    const entries=holidays.officialForYear(year);
    assert.ok(entries.every(item=>holidays.validDate(item.start)&&holidays.validDate(item.end)));
    for(const item of entries.filter(item=>/-ramazan-\d$/.test(item.officialId))) assert.equal(holidays.dayCount(item.start,item.end),3);
    for(const item of entries.filter(item=>/-kurban-\d$/.test(item.officialId))) assert.equal(holidays.dayCount(item.start,item.end),4);
    assert.equal(entries.find(item=>item.officialId.endsWith('-28-ekim')).period,'afternoon');
  }
  assert.equal(holidays.officialForYear(2026).find(item=>item.officialId.endsWith('-ramazan-0')).start,'2026-03-20');
  assert.equal(holidays.officialForYear(2027).find(item=>item.officialId.endsWith('-kurban-0')).end,'2027-05-19');
  assert.deepEqual(holidays.officialForYear(2033).filter(item=>/-ramazan-\d$/.test(item.officialId)).map(item=>item.start),['2033-01-02','2033-12-23']);
  assert.equal(holidays.officialForYear(2040).length,8,'Unknown religious dates are never guessed');
  assert.deepEqual(holidays.officialForYear('invalid'),[]);
});

test('automatic sync is idempotent and preserves custom date ranges, disabled defaults and manual holidays',()=>{
  const planner={tatiller:[{name:'Okula özel tatil',start:'2026-11-02',end:'2026-11-03'}]};
  assert.equal(holidays.ensure(planner,[2026,2026]),true);
  assert.equal(holidays.ensure(planner,[2026]),false);
  const republic=planner.tatiller.find(item=>item.officialId==='tr-2026-29-ekim');
  Object.assign(republic,{end:'2026-10-30',customized:true});
  const disabled=planner.tatiller.find(item=>item.officialId==='tr-2026-1-mayis');
  Object.assign(disabled,{disabled:true,customized:true});
  holidays.ensure(planner,[2025,2026,2027]);
  assert.equal(republic.end,'2026-10-30');
  assert.equal(holidays.matching(planner,'2026-05-01').length,0);
  assert.equal(holidays.matching(planner,'2026-11-03')[0].name,'Okula özel tatil');
  assert.equal(holidays.reset(planner,'tr-2026-29-ekim'),true);
  assert.equal(holidays.matching(planner,'2026-10-30').length,0);
  assert.equal(disabled.disabled,true,'Reset affects only the selected official holiday');
});

test('half days keep morning lessons and a full holiday wins when official dates overlap',()=>{
  const planner={settings:{halfDayStartPeriod:6}};
  holidays.ensure(planner,[2026,2027,2029,2033]);
  assert.equal(holidays.matching(planner,'2026-10-28',5).length,0);
  assert.equal(holidays.matching(planner,'2026-10-28',6).length,1);
  assert.equal(holidays.matching(planner,'2029-04-23',1)[0].period,'full');
  assert.equal(holidays.matching(planner,'2033-01-01',1)[0].name,'Yılbaşı');
  assert.equal(holidays.matching(planner,'2027-05-19',1).length,2);
  assert.equal(holidays.halfDayStart({settings:{halfDayStartPeriod:99}}),5);
});

test('calendar arithmetic is inclusive, strict and leap-year safe',()=>{
  assert.equal(holidays.validDate('2026-02-29'),false);
  assert.equal(holidays.validDate('2028-02-29'),true);
  assert.equal(holidays.validDate('2026-1-1'),false);
  assert.equal(holidays.addDays('2028-02-28',2),'2028-03-01');
  assert.equal(holidays.addDays('2026-12-31',1),'2027-01-01');
  assert.equal(holidays.dayCount('2026-10-28','2026-10-30'),3);
  assert.equal(holidays.dayCount('2026-10-30','2026-10-28'),0);
  assert.equal(holidays.matching({tatiller:[]},'2026-02-31').length,0);
});

function harness(planner=false) {
  const html=fs.readFileSync(`ogretmen-ajandasi/${planner?'ders-programi':'index'}.html`,'utf8');
  const {window,document}=parseHTML(html);
  for(const select of document.querySelectorAll('select')) Object.defineProperty(select,'value',{
    get(){return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? '';},
    set(value){for(const option of this.querySelectorAll('option')) option.toggleAttribute('selected',option.value===String(value));}
  });
  const data=new Map(),alerts=[];
  const context=vm.createContext({window,document,URL,URLSearchParams,console,TextEncoder,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,requestAnimationFrame:()=>0,alert:message=>alerts.push(message),
    localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}});
  const run=code=>vm.runInContext(code,context);
  for(const file of ['resmi-tatiller-veri.js','resmi-tatiller.js']) run(fs.readFileSync('ogretmen-ajandasi/'+file,'utf8'));
  const source=planner?[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(code=>code.includes('function getDersSecenekleri')):fs.readFileSync('ogretmen-ajandasi/app.js','utf8');
  run(planner?source.replace(/\ninit\(\);/,'\n'):source);
  if(planner) run('ensureStateDefaults(); ensureOfficialHolidays(2026); renderTatilList();');
  else run('bindElements();state=normalizeState({classes:[{id:"a",name:"2-B"}],activeClassId:"a",students:[],exams:[]});');
  return {run,data,alerts,document,$:id=>document.getElementById(id),json:expression=>JSON.parse(run(`JSON.stringify(${expression})`))};
}

test('teacher can edit duration, disable, reload, reactivate and restore an official holiday',()=>{
  const h=harness(true);
  const index=h.run(`state.tatiller.findIndex(item=>item.officialId==='tr-2026-29-ekim')`);
  h.run(`editTatil(${index})`);
  h.$('tatil-days').value='3'; h.run('updateHolidayEnd()');
  assert.equal(h.$('tatil-end').value,'2026-10-31');
  h.run('addTatil();loadFromStorage();ensureOfficialHolidays(2026)');
  assert.equal(h.run(`state.tatiller[${index}].end`),'2026-10-31');
  h.run(`deleteTatil(${index});loadFromStorage();ensureOfficialHolidays(2026)`);
  assert.equal(h.run(`isHolidayDate(new Date(2026,9,30),1)`),null);
  h.run(`deleteTatil(${index})`);
  assert.equal(h.run(`isHolidayDate(new Date(2026,9,30),1)`),'Cumhuriyet Bayramı');
  h.run(`window.KemalAgendaHolidays.reset(state,'tr-2026-29-ekim')`);
  assert.equal(h.run(`isHolidayDate(new Date(2026,9,30),1)`),null);
});

test('manual holidays validate bounds and render names as literal text',()=>{
  const h=harness(true);
  const length=h.run('state.tatiller.length');
  h.$('tatil-name').value='<img src=x onerror=attack()>';
  h.$('tatil-start').value='2026-11-04'; h.$('tatil-end').value='2026-11-03';
  h.run('addTatil()'); assert.equal(h.run('state.tatiller.length'),length);
  h.$('tatil-end').value='2028-11-04'; h.run('addTatil()');
  assert.equal(h.run('state.tatiller.length'),length);
  h.$('tatil-end').value='2026-11-05'; h.run('addTatil()');
  assert.equal(h.run('state.tatiller.length'),length+1);
  assert.equal(h.$('tatil-list').querySelectorAll('img,[onerror]').length,0);
  assert.match(h.$('tatil-list').textContent,/<img/);
  h.run(`deleteTatil(${length})`); assert.equal(h.run('state.tatiller.length'),length);
});

test('planner closes only selected periods and does not count holiday slots as teaching occurrences',()=>{
  const h=harness(true);
  h.run(`state.siniflar=[{id:'a',name:'2-B'}];state.activeSinif='a';state.programs={a:createEmptyProgram()};
    for(const day of ['Mon','Tue','Wed','Thu','Fri'])state.programs.a[day]=Array.from({length:9},()=>({ders:'TÜRKÇE'}));
    state.yillikPlanlar={'TÜRKÇE':[{hafta:7,tarihStart:'2026-10-26',tarihEnd:'2026-10-30',kazanim:'Ders çıktısı'}]};
    renderSinifList();state.currentWeek=7;renderWeeklyPlan();`);
  const rows=h.document.querySelectorAll('.plan-table tbody tr');
  assert.equal(rows.length,9);
  for(let index=0;index<9;index++) {
    const cells=rows[index].querySelectorAll('td');
    assert.equal(cells[3].textContent.includes('RESMİ TATİL'),index>=4,'28 October closes after configured period');
    assert.match(cells[4].textContent,/RESMİ TATİL/,'29 October closes all day');
  }
  assert.equal(h.run(`getLessonOccurrenceInWeek('a','Fri',0,7,'TÜRKÇE')`),22);
  h.run('updateHalfDayPeriod(3)');
  assert.equal(h.run(`getLessonOccurrenceInWeek('a','Fri',0,7,'TÜRKÇE')`),20);
});

test('academic calendar derives official entries without persistence and shares teacher overrides immediately',()=>{
  const h=harness();
  assert.equal(h.run(`holidayEventsForDate('2026-10-29')[0].title`),'Cumhuriyet Bayramı');
  assert.equal(h.data.has('ogretmen_plan_v2'),false,'Viewing holidays never saves an unrelated planner');
  const planner={tatiller:holidays.officialForYear(2026)};
  Object.assign(planner.tatiller.find(item=>item.officialId==='tr-2026-29-ekim'),{end:'2026-10-30',customized:true});
  h.data.set('ogretmen_plan_v2',JSON.stringify(planner));
  assert.equal(h.run(`calendarEventsForDate('2026-10-30').length`),1);
  planner.tatiller.find(item=>item.officialId==='tr-2026-29-ekim').disabled=true;
  h.data.set('ogretmen_plan_v2',JSON.stringify(planner));
  assert.equal(h.run(`calendarEventsForDate('2026-10-29').length`),0);
  planner.tatiller.push({name:'Okula özel tatil',start:'2026-11-02',end:'2026-11-02'});
  h.data.set('ogretmen_plan_v2',JSON.stringify(planner));
  assert.equal(h.run(`calendarEventsForDate('2026-11-02')[0].title`),'Okula özel tatil');
});

test('cloud baseline ignores generated defaults but never ignores a teacher override',()=>{
  const h=harness();
  const planner={siniflar:[],programs:{},tatiller:[]};
  h.data.set('ogretmen_plan_v2',JSON.stringify({...planner,tatiller:holidays.officialForYear(2026)}));
  h.run(`window.cloudRow={agenda_state:JSON.parse(JSON.stringify(state)),lesson_planner_state:${JSON.stringify(planner)}}`);
  assert.equal(h.run('cloudSnapshotMatches(window.cloudRow)'),true);
  const edited=holidays.officialForYear(2026);edited[0].disabled=true;edited[0].customized=true;
  h.data.set('ogretmen_plan_v2',JSON.stringify({...planner,tatiller:edited}));
  assert.equal(h.run('cloudSnapshotMatches(window.cloudRow)'),false);
});
