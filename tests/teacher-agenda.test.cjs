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
  const context = vm.createContext({ window, document, console, setTimeout: () => 0, clearTimeout() {},
    setInterval: () => 0, confirm: () => true, CSS: { escape: value => value },
    localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) }
  });
  const run = code => vm.runInContext(code, context);
  run(fs.readFileSync('ogretmen-ajandasi/app.js', 'utf8'));
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
  return { run, $, counts, json, saved, document };
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
