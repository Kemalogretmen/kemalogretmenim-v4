const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function harness() {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen-ajandasi/index.html','utf8'));
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.location={origin:'https://agenda.example'};
  const saved=new Map();
  const context=vm.createContext({window,document,URL,URLSearchParams,TextEncoder,console,setTimeout(){},clearTimeout(){},setInterval(){},confirm:()=>true,localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}});
  const run=code=>vm.runInContext(code,context);
  run(fs.readFileSync('ogretmen-ajandasi/app.js','utf8'));
  run(`bindElements();state=normalizeState({classes:[{id:'c',name:'2-B'},{id:'other',name:'3-A'}],activeClassId:'c',students:[{id:'s',classId:'c',firstName:'Ada',lastName:'Kaya',birthDate:'2018-11-03'},{id:'foreign',classId:'other',firstName:'Gizli',birthDate:'2018-11-03'}],calendarEvents:[{id:'n',classId:'c',date:'2026-11-03',title:'Veli toplantısı',note:'Evrakları hazırla',type:'meeting',time:'14:30'},{id:'other',classId:'other',date:'2026-11-03',title:'Başka sınıf',type:'note'}]});selectCalendarDate('2026-11-03');`);
  return {run,document,saved,$:id=>document.getElementById(id),context};
}
test('weekly sticky notes isolate active class and include birthday metadata without persisting display state',()=>{
  const h=harness();assert.equal(h.$('calendarGrid').querySelectorAll('.calendar-week-column').length,7);
  assert.match(h.$('calendarGrid').textContent,/Veli toplantısı/);assert.match(h.$('calendarGrid').textContent,/14:30/);
  assert.match(h.$('calendarGrid').textContent,/Ada Kaya doğum günü/);assert.doesNotMatch(h.$('calendarGrid').textContent,/Başka sınıf|Gizli/);
  assert.equal(h.saved.size,0);assert.equal(h.$('selectedDayEvents').querySelectorAll('.agenda-sticky').length,2);
  assert.equal(h.$('selectedDayEvents').querySelectorAll('[data-delete-calendar]').length,1,'Synthetic birthdays cannot be deleted as notes');
});
test('week and month navigation cross year boundaries and preserve selected-date semantics',()=>{
  const h=harness();h.run(`selectCalendarDate('2026-12-31');moveCalendarMonth(1);`);
  assert.equal(h.run('selectedCalendarDate'),'2027-01-07');assert.match(h.$('calendarTitle').textContent,/2027/);
  h.run(`calendarViewMode='month';renderCalendar()`);assert.equal(h.$('calendarGrid').querySelectorAll('[data-calendar-date]').length,42);
  assert.equal(h.$('prevCalendarMonthBtn').getAttribute('aria-label'),'Önceki ay');
  h.run('moveCalendarMonth(-1)');assert.equal(h.run('selectedCalendarDate'),'2026-12-01');
});
test('opening a note composer prepares the selected date without saving or removing any record',()=>{
  const h=harness();h.run("openCalendarComposer('2026-11-05')");
  assert.equal(h.$('calendarComposer').open,true);assert.equal(h.$('calendarEventDate').value,'2026-11-05');assert.equal(h.run('state.calendarEvents.length'),2);assert.equal(h.saved.size,0);
});
test('sticky titles, full notes and event themes never inject imported markup',()=>{
  const h=harness();h.run(`state.calendarEvents[0].title='<img src=x onerror=bad()>Çalışma';state.calendarEvents[0].note='<script>bad()</script>';state.calendarEvents[0].type='note" onclick="bad()';renderCalendar();`);
  assert.equal(h.$('calendarGrid').querySelector('img'),null);assert.equal(h.$('selectedDayEvents').querySelector('script'),null);
  assert.match(h.$('selectedDayEvents').textContent,/<script>bad\(\)<\/script>/);
  assert.equal(h.$('selectedDayEvents').querySelector('.agenda-sticky').getAttribute('onclick'),null);
});
test('iframe resizing validates exact child source, origin and bounded numeric height without saving',()=>{
  const h=harness();const frame=h.$('lessonPlannerFrame'),child={};Object.defineProperty(frame,'contentWindow',{value:child});h.context.child=child;
  h.run(`handleLessonPlannerMessage({source:child,origin:'https://agenda.example',data:{type:'kemal-lesson-planner-height',height:850}})`);assert.equal(frame.style.height,'850px');
  for(const data of [{source:{},origin:'https://agenda.example',height:600},{source:child,origin:'https://evil.example',height:600},...['600',NaN,Infinity,-1,99,20001].map(height=>({source:child,origin:'https://agenda.example',height}))]) {
    h.context.message={source:data.source,origin:data.origin,data:{type:'kemal-lesson-planner-height',height:data.height}};h.run('handleLessonPlannerMessage(message)');assert.equal(frame.style.height,'850px');
  }
  assert.equal(h.saved.size,0);
});
