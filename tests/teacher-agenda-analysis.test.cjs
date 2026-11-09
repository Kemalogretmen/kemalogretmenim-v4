const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const agendaDirectory = path.join(__dirname, '..', 'ogretmen-ajandasi');

function agendaAnalysis() {
  const { window, document } = parseHTML(fs.readFileSync(path.join(agendaDirectory, 'index.html'), 'utf8'));
  // Match the existing agenda harness's missing native linkedom controls.
  document.querySelectorAll('select').forEach(select => {
    Object.defineProperty(select, 'value', {
      get() { return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? ''; },
      set(value) { this.querySelectorAll('option').forEach(option => option.toggleAttribute('selected', option.value === String(value))); }
    });
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'checked', {
    configurable: true,
    get() { return this.hasAttribute('checked'); },
    set(value) { this.toggleAttribute('checked', !!value); }
  });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const saved = new Map();
  const context = vm.createContext({
    window, document, console, TextEncoder, URL, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    confirm: () => true, CSS: { escape: value => value },
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) }
  });
  const run = code => vm.runInContext(code, context);
  const json = expression => JSON.parse(run(`JSON.stringify(${expression})`));
  const $ = selector => document.querySelector(selector);
  run(fs.readFileSync(path.join(agendaDirectory, 'app.js'), 'utf8'));
  run(`bindElements(); state = normalizeState({
    teacher: {name:'Test Teacher',schoolName:'Test School'},
    classes: [{id:'own',name:'2-B'},{id:'foreign',name:'3-A'}], activeClassId:'own',
    students: [
      {id:'s1',classId:'own',firstName:'Ada',lastName:'Kaya',schoolNo:'910071',photo:'https://example.invalid/private-photo.png'},
      {id:'s2',classId:'own',firstName:'Efe',lastName:'Can',schoolNo:'910072'},
      {id:'invalid',classId:'own',firstName:'Deniz',lastName:'Acar',schoolNo:'910073'},
      {id:'missing',classId:'own',firstName:'Mina',lastName:'Yilmaz',schoolNo:'910074'},
      {id:'outsider',classId:'foreign',firstName:'Foreign',lastName:'Pupil',schoolNo:'990099'}
    ], exams: []
  });
  const analysisScore = (d,y=0,b=0) => makeResult({T:{d,y,b}},{maxScore:500});
  const analysisEmpty = () => makeResult({T:{d:0,y:0,b:0}},{maxScore:500});
  const analysisExam = (id,date,results,classId='own') => ({id,date,results,classId,name:'Exam '+id,subjects:['T'],scoring:{maxScore:500}});
  state.exams = [
    analysisExam('late','2026-10-03',{s1:analysisScore(1),outsider:analysisScore(10),deleted:analysisScore(10)}),
    analysisExam('foreign-exam','2026-10-04',{s1:analysisScore(0,10),outsider:analysisScore(10)},'foreign'),
    analysisExam('early','2026-10-01',{s1:analysisScore(10),s2:analysisScore(0,10),invalid:analysisEmpty(),outsider:analysisScore(10),deleted:analysisScore(10)}),
    analysisExam('unscored','2026-10-02',{invalid:analysisEmpty(),outsider:analysisScore(10)})
  ];
  state.exams.forEach(exam => {exam.participants = [
    {studentId:'s1',name:'Imported roster alias',className:'2-B',result:analysisScore(0,10)},
    {studentId:'outsider',name:'Foreign Pupil',className:'3-A',result:analysisScore(10)},
    {id:'unmatched',name:'Unmatched Participant',className:'2-B',result:analysisScore(10)}
  ];});
  renderReportSelectors(); updateSubjectPicker();`);

  function selectSubjects(subjects) {
    document.querySelectorAll('#subjectPicker input').forEach(input => { input.checked = subjects.includes(input.value); });
  }
  function chartExams(count) {
    run(`state.exams = Array.from({length:${count}},(_,index) => analysisExam(
      'chunk-'+(index+1), '2026-10-'+String(index+1).padStart(2,'0'), {s1:analysisScore(index,0,20-index)}
    )); renderReportSelectors(); updateSubjectPicker();`);
  }
  return { run, json, $, document, selectSubjects, chartExams };
}

function near(actual, expected) {
  assert.equal(typeof actual, 'number');
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9, `expected ${actual} to equal ${expected}`);
}

function fragment(html) {
  return parseHTML(`<div id="test-root">${html}</div>`).document.querySelector('#test-root');
}

function tableRows(table) {
  return Array.from(table.querySelectorAll('tbody tr'), row => Array.from(row.querySelectorAll('td'), cell => cell.textContent.trim()));
}

test('classResultRows uses only the active class roster, not result IDs or participant class labels', () => {
  const h = agendaAnalysis();
  assert.deepEqual(h.json(`classResultRows(state.exams.find(exam=>exam.id==='early')).map(({student,result})=>[student.id,result.total.percent])`), [
    ['s1', 100], ['s2', 0]
  ]);
  assert.deepEqual(h.json(`classResultRows(state.exams.find(exam=>exam.id==='foreign-exam'))`), []);
  assert.deepEqual(h.json('classResultRows(null)'), []);
  h.run(`state.activeClassId='foreign'`);
  assert.deepEqual(h.json('classResultRows(state.exams[0])'), []);
  assert.deepEqual(h.json(`classResultRows(state.exams.find(exam=>exam.id==='foreign-exam')).map(row=>row.student.id)`), ['outsider']);
});

test('classAnalysis sorts only owned exams and averages valid exam means, not pooled students or questions', () => {
  const h = agendaAnalysis();
  const before = h.json('state');
  const data = h.json('classAnalysis(state.exams,[])');
  assert.deepEqual(data.snapshots.map(item => item.exam.id), ['early', 'unscored', 'late']);
  assert.deepEqual(data.snapshots.map(item => item.percent), [50, null, 100]);
  assert.deepEqual(data.snapshots.map(item => item.classAverage), [50, null, 100]);
  assert.equal(data.percent, 75, '(50 + 100) / 2; not 200 / 3 result-weighting or 11 / 21 question-weighting');
  assert.equal(data.resultCount, 3);
  assert.deepEqual(data.students.map(item => [item.student.id, item.entries.length, item.percent]), [
    ['s1', 2, 100], ['s2', 1, 0], ['invalid', 0, null], ['missing', 0, null]
  ]);
  assert.deepEqual(data.subjects, [{ name: 'T', percent: 75, count: 3, d: 11, y: 10, b: 0 }]);
  assert.deepEqual(data.snapshots.map(({d,y,b,net}) => ({d,y,b,net})), [
    {d:10,y:10,b:0,net:10}, {d:0,y:0,b:0,net:0}, {d:1,y:0,b:0,net:1}
  ]);
  assert.deepEqual(h.json('state'), before, 'analysis must not rewrite source results, roster, or exam ordering');
});

test('classAnalysis retains real zero means but leaves wholly missing data null', () => {
  const h = agendaAnalysis();
  h.run(`state.exams = [analysisExam('zero','2026-10-01',{s1:analysisScore(0,10)}),analysisExam('empty','2026-10-02',{invalid:analysisEmpty()})]`);
  const data = h.json('classAnalysis(state.exams,[])');
  assert.equal(data.percent, 0);
  assert.equal(data.resultCount, 1);
  assert.deepEqual(data.snapshots.map(item => item.percent), [0, null]);
  assert.equal(data.subjects[0].percent, 0);
  assert.equal(data.students.find(item => item.student.id === 'missing').percent, null);
  h.run('state.exams=[]');
  const empty = h.json('classAnalysis([],[])');
  assert.equal(empty.percent, null);
  assert.equal(empty.resultCount, 0);
  assert.deepEqual(empty.snapshots, []);
  assert.deepEqual(empty.subjects, []);
  assert.ok(empty.students.every(item => item.percent === null && item.entries.length === 0));
});

test('classAverages ignores foreign/deleted pupils and missing subject scores without discarding zero', () => {
  const h = agendaAnalysis();
  h.run(`const subjectExam=state.exams.find(exam=>exam.id==='early');
    subjectExam.results.s1.subjects.M={d:0,y:2,b:0,net:0,percent:0};
    subjectExam.results.s2.subjects.M={d:0,y:0,b:0,net:0,percent:null};
    subjectExam.results.outsider.subjects.M={d:2,y:0,b:0,net:2,percent:100};
    subjectExam.results.deleted.subjects.M={d:2,y:0,b:0,net:2,percent:100};`);
  assert.deepEqual(h.json('classAverages(subjectExam)'), { T: 50, M: 0 });
  assert.equal(h.run('totalClassAverage(subjectExam)'), 50);
  assert.deepEqual(h.json(`classAverages(state.exams.find(exam=>exam.id==='foreign-exam'))`), {});
  assert.deepEqual(h.json(`classAverages(state.exams.find(exam=>exam.id==='unscored'))`), {});
  assert.equal(h.run(`totalClassAverage(state.exams.find(exam=>exam.id==='unscored'))`), null);
});

test('projectReportResult preserves valid stored totals including zero and rejects missing/invalid totals', () => {
  const h = agendaAnalysis();
  assert.equal(h.run(`projectReportResult({},analysisScore(0,10)).total.percent`), 0);
  assert.equal(h.run(`projectReportResult({},{subjects:{},total:{percent:0}}).total.percent`), 0);
  for (const result of ['null', 'undefined', '{}', 'analysisEmpty()']) {
    assert.equal(h.run(`projectReportResult({},${result})`), null, result);
  }
  for (const percent of ['null', 'undefined', 'NaN', 'Infinity', '-Infinity', '-1', '101', "'0'", 'false']) {
    assert.equal(h.run(`projectReportResult({},{subjects:{},total:{percent:${percent}}})`), null, percent);
  }
  h.run(`const storedResult=analysisScore(8,2); storedResult.total.percent=47.25; storedResult.total.score=236.25;`);
  assert.equal(h.run('projectReportResult({},storedResult) === storedResult'), true);
  assert.equal(h.run(`projectReportResult({},storedResult,['t']) === storedResult`), true);
});

test('projectReportResult recomputes valid counts but never fabricates a result for absent or invalid selected subjects', () => {
  const h = agendaAnalysis();
  assert.equal(h.run(`projectReportResult({scoring:{maxScore:500}},{subjects:{T:{d:8,y:2,b:0}},total:{percent:null}}).total.percent`), 80);
  assert.equal(h.run(`projectReportResult({},analysisScore(8,2),['M'])`), null);
  for (const counts of ['{d:-1,y:1,b:0}', '{d:1.5,y:1,b:0}', "{d:'1',y:1,b:0}", '{d:1,y:1}', '{d:0,y:0,b:0}']) {
    assert.equal(h.run(`projectReportResult({},{subjects:{T:{d:8,y:2,b:0},M:${counts}},total:{percent:80}},['M'])`), null, counts);
  }
});

function weightedFixture(h) {
  h.run(`const weightedScoring={maxScore:500,wrongPenalty:true,subjectPoints:{T:200,M:100,F:300}};
    const weightedResult=makeResult({T:{d:9,y:3,b:0},M:{d:1,y:3,b:0},F:{d:10,y:0,b:0}},weightedScoring);
    const weightedExam={id:'weighted',classId:'own',name:'Weighted exam',date:'2026-10-01',subjects:['T','M','F'],scoring:weightedScoring,
      results:{s1:weightedResult,s2:makeResult({T:{d:0,y:3,b:9},M:{d:0,y:3,b:1},F:{d:10,y:0,b:0}},weightedScoring),outsider:analysisScore(10)}};
    state.exams=[weightedExam]; renderReportSelectors(); updateSubjectPicker();`);
}

test('selected-subject projection renormalizes weights and applies the 3Y penalty once without mutating counts', () => {
  const h = agendaAnalysis();
  weightedFixture(h);
  const before = h.json('weightedExam');
  const result = h.json(`projectReportResult(weightedExam,weightedResult,['m','t'])`);
  assert.deepEqual(Object.keys(result.subjects), ['T', 'M']);
  assert.deepEqual([result.total.d, result.total.y, result.total.b, result.total.net, result.total.questionCount], [10, 6, 0, 8, 16]);
  near(result.total.score, 400 / 3);
  assert.equal(result.total.maxScore, 300);
  near(result.total.percent, 400 / 9);
  near(result.subjects.T.net, 8);
  assert.equal(result.subjects.M.net, 0);
  assert.equal(result.subjects.M.percent, 0);
  const single = h.json(`projectReportResult(weightedExam,weightedResult,['T'])`);
  assert.equal(single.total.maxScore, 200);
  near(single.total.percent, 200 / 3);
  const noPenalty = h.json(`projectReportResult({...weightedExam,scoring:{...weightedScoring,wrongPenalty:false}},weightedResult,['T','M'])`);
  near(noPenalty.total.percent, 175 / 3);
  assert.equal(noPenalty.total.net, 10);
  assert.deepEqual(h.json('weightedExam'), before);
});

test('selected-subject projection matches normalized Turkish names and removes deselected point weights', () => {
  const h = agendaAnalysis();
  h.run(`const turkishExam={scoring:{maxScore:500,wrongPenalty:true,subjectPoints:{'T\u00fcrk\u00e7e':200,'Matematik':300}}};
    const turkishResult=makeResult({'T\u00dcRK\u00c7E':{d:9,y:3,b:0},'MATEMAT\u0130K':{d:10,y:0,b:0}},turkishExam.scoring);`);
  const projected = h.json(`projectReportResult(turkishExam,turkishResult,['t\u00fcrk\u00e7e'])`);
  assert.deepEqual(Object.keys(projected.subjects), ['T\u00dcRK\u00c7E']);
  assert.equal(projected.total.maxScore, 200);
  near(projected.total.percent, 200 / 3);
});

test('class rows, analysis and comparison snapshots share selected-subject weighting and own-roster means', () => {
  const h = agendaAnalysis();
  weightedFixture(h);
  h.selectSubjects(['T', 'M']);
  const rows = h.json('classResultRows(weightedExam,selectedSubjects())');
  assert.deepEqual(rows.map(row => row.student.id), ['s1', 's2']);
  near(rows[0].result.total.percent, 400 / 9);
  assert.equal(rows[1].result.total.percent, 0);
  const data = h.json('classAnalysis()');
  near(data.percent, 200 / 9);
  assert.equal(data.resultCount, 2);
  assert.deepEqual(data.subjects.map(item => item.name), ['T', 'M']);
  near(data.subjects[0].percent, 100 / 3);
  assert.equal(data.subjects[1].percent, 0);
  const snapshot = h.json(`comparisonSnapshot(weightedExam,'s1')`);
  near(snapshot.percent, 400 / 9);
  near(snapshot.classAverage, 200 / 9);
  assert.deepEqual([snapshot.d, snapshot.y, snapshot.b], [10, 6, 0]);
  assert.deepEqual(Object.keys(snapshot.result.subjects), ['T', 'M']);
});

test('comparison chart HTML preserves zero and breaks both lines at missing observations', () => {
  const h = agendaAnalysis();
  h.run(`const chartSnapshots=[0,null,60,null,100].map((percent,index)=>({
    exam:{name:'Chart '+index,date:'2026-10-01'},percent,classAverage:[10,null,50,70,90][index]
  }));`);
  const html = h.run('buildComparisonTrendChart(chartSnapshots)');
  const chart = fragment(html);
  const pointCounts = selector => Array.from(chart.querySelectorAll(selector), line => line.getAttribute('points').trim().split(/\s+/).length);
  assert.deepEqual(pointCounts('polyline.trend-line'), [1, 1, 1]);
  assert.deepEqual(pointCounts('polyline.class-line'), [1, 3]);
  assert.equal(chart.querySelectorAll('circle.trend-dot').length, 3);
  assert.equal(chart.querySelectorAll('circle.chart-dot-class').length, 4);
  assert.equal(chart.querySelector('circle.trend-dot').getAttribute('cy'), '220');
  assert.match(chart.textContent, /%0,0/);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
  const classOnly = fragment(h.run('buildComparisonTrendChart(chartSnapshots,true)'));
  assert.equal(classOnly.querySelectorAll('polyline.analysis-class-line').length, 3);
  assert.equal(classOnly.querySelectorAll('.class-line,.chart-dot-class').length, 0);
  assert.equal(classOnly.querySelectorAll('circle.trend-dot').length, 3);
});

test('comparison chart HTML centers a single result and escapes exam labels/titles', () => {
  const h = agendaAnalysis();
  const maliciousName = '<img src=x onerror="alert(1)"> & private';
  const html = h.run(`buildComparisonTrendChart([{exam:{name:${JSON.stringify(maliciousName)},date:'2026-10-01'},percent:0,classAverage:null}])`);
  const chart = fragment(html);
  assert.equal(chart.querySelector('circle.trend-dot').getAttribute('cx'), '435');
  assert.equal(chart.querySelector('text title').textContent, maliciousName);
  assert.equal(chart.querySelector('img'), null);
  assert.doesNotMatch(html, /NaN|Infinity|undefined/);
});

test('analysisTrendPages chunks at ten exams without losing or repeating labels, including exact boundaries', () => {
  const h = agendaAnalysis();
  for (const count of [0, 1, 10, 11, 21]) {
    h.chartExams(count);
    const chart = fragment(h.run('analysisTrendPages(classAnalysis().snapshots,true)'));
    const pages = Array.from(chart.querySelectorAll('.analysis-chart-scroll'));
    assert.equal(pages.length, Math.ceil(count / 10), `${count} exams`);
    assert.deepEqual(pages.map(page => page.querySelectorAll('circle.trend-dot').length),
      Array.from({length:Math.ceil(count / 10)}, (_, index) => Math.min(10, count - index * 10)));
    assert.deepEqual(Array.from(chart.querySelectorAll('svg text title'), title => title.textContent),
      Array.from({length:count}, (_, index) => `Exam chunk-${index + 1}`));
  }
});

test('comparisonReportHtml renders more than ten exams as chart chunks with own-class averages', () => {
  const h = agendaAnalysis();
  h.chartExams(21);
  const report = fragment(h.run(`comparisonReportHtml(state.students.find(student=>student.id==='s1'))`));
  assert.deepEqual(Array.from(report.querySelectorAll('svg.comparison-trend-chart'), svg => svg.querySelectorAll('.trend-dot').length), [10, 10, 1]);
  const rows = tableRows(report.querySelector('.report-table'));
  assert.equal(rows.length, 21);
  assert.equal(rows[0][5], '%0,0');
  assert.equal(rows[0][6], '%0,0');
  assert.equal(rows[20][5], '%100,0');
  assert.equal(rows[20][6], '%100,0');
});

test('buildClassAnalysisReport renders participation, missing results and zero separately', () => {
  const h = agendaAnalysis();
  h.run('buildClassAnalysisReport()');
  const report = h.$('#reportCard');
  assert.ok(report.classList.contains('class-analysis-report'));
  assert.equal(report.querySelector('article').getAttribute('data-class-analysis'), 'own');
  assert.equal(report.querySelector('.analysis-report-score strong').textContent, '%75,0');
  assert.deepEqual(Array.from(report.querySelectorAll('.analysis-summary-line span'), span => span.textContent), [
    '2 / 4 \u00f6\u011frenci', '3 ge\u00e7erli sonu\u00e7', 'Hedef: %70', 'Hedefin alt\u0131nda: 1 \u00f6\u011frenci'
  ]);
  const tables = report.querySelectorAll('.report-table');
  const exams = tableRows(tables[0]);
  assert.deepEqual(exams.map(row => [row[0], ...row.slice(2, 5)]), [
    ['Exam early', '2 / 4', '2', '%50,0'],
    ['Exam unscored', '0 / 4', '4', '-'],
    ['Exam late', '1 / 4', '3', '%100,0']
  ]);
  assert.deepEqual(exams[0].slice(5), ['%0,0', '%100,0']);
  const pupils = tableRows(tables[1]);
  assert.deepEqual(pupils.map(row => row.slice(0, 4)), [
    ['Ada Kaya', '910071', '2 / 3', '%100,0'], ['Efe Can', '910072', '1 / 3', '%0,0'],
    ['Deniz Acar', '910073', '0 / 3', '-'], ['Mina Yilmaz', '910074', '0 / 3', '-']
  ]);
  assert.equal(pupils[1][5], 'Destek plan\u0131');
  assert.equal(pupils[3][5], 'Sonu\u00e7 yok');
  assert.deepEqual(Array.from(report.querySelectorAll('.analysis-band strong'), strong => strong.textContent), ['1', '0', '0', '1']);
  assert.doesNotMatch(report.innerHTML, /Foreign|Unmatched|Imported roster alias|foreign-exam|990099|deleted/);
});

test('buildClassAnalysisReport uses selected exams/subjects, not the report student selection', () => {
  const h = agendaAnalysis();
  weightedFixture(h);
  h.selectSubjects(['T', 'M']);
  h.$('#reportStudent').value = 's2';
  h.run('buildClassAnalysisReport()');
  assert.equal(h.$('.analysis-report-score strong').textContent, '%22,2');
  assert.deepEqual(Array.from(h.document.querySelectorAll('.analysis-subject > div > strong'), node => node.textContent), ['T', 'M']);
  assert.match(h.$('#reportCard').textContent, /Ada Kaya/);
  assert.match(h.$('#reportCard').textContent, /Efe Can/);

  const filtered = agendaAnalysis();
  filtered.$('#reportExam').value = '__selected__';
  filtered.$('#reportExamPicker input[value="late"]').checked = true;
  filtered.run('updateSubjectPicker(); buildClassAnalysisReport()');
  assert.equal(filtered.$('.analysis-report-score strong').textContent, '%100,0');
  assert.deepEqual(tableRows(filtered.$('.report-table')).map(row => row[0]), ['Exam late']);
  assert.doesNotMatch(filtered.$('#reportCard').textContent, /Exam early|Exam unscored|Exam foreign-exam/);
});

test('buildClassAnalysisReport chunks a 21-exam class trend and includes every exam once in the summary table', () => {
  const h = agendaAnalysis();
  h.chartExams(21);
  h.run('buildClassAnalysisReport()');
  assert.deepEqual(Array.from(h.document.querySelectorAll('svg.comparison-trend-chart'), svg => svg.querySelectorAll('.trend-dot').length), [10, 10, 1]);
  assert.equal(h.document.querySelectorAll('polyline.class-line,circle.chart-dot-class').length, 0);
  assert.deepEqual(tableRows(h.$('.report-table')).map(row => row[0]), Array.from({length:21}, (_, index) => `Exam chunk-${index + 1}`));
});

test('hideStudentNames removes student names, school numbers and photos from class report HTML without changing analytics', () => {
  const h = agendaAnalysis();
  const before = h.json('state');
  const analytics = h.json('classAnalysis()');
  h.$('#analysisStudentNames').checked = true;
  h.run('buildClassAnalysisReport()');
  assert.match(h.$('#reportCard').textContent, /Ada Kaya/);
  assert.match(h.$('#reportCard').textContent, /910071/);
  const score = h.$('.analysis-report-score').innerHTML;
  const summary = h.$('.analysis-summary-line').innerHTML;
  h.$('#analysisStudentNames').checked = false;
  h.run('buildClassAnalysisReport()');
  const html = h.$('#reportCard').innerHTML;
  for (const student of before.students) {
    for (const privateValue of [student.firstName, student.lastName, student.schoolNo, student.photo].filter(Boolean)) {
      assert.ok(!html.includes(privateValue), `hidden report leaked ${privateValue}`);
    }
  }
  assert.equal(h.$('#reportCard').querySelectorAll('.report-table').length, 1);
  assert.equal(h.$('.analysis-report-score').innerHTML, score);
  assert.equal(h.$('.analysis-summary-line').innerHTML, summary);
  assert.deepEqual(h.json('classAnalysis()'), analytics);
  assert.deepEqual(h.json('state'), before, 'privacy is a presentation option, not destructive anonymization');
});

test('buildClassAnalysisReport escapes displayed names and replaces stale personal HTML when no valid results remain', () => {
  const h = agendaAnalysis();
  h.run(`state.students[0].firstName='<img src=x onerror="alert(1)">'; buildClassAnalysisReport()`);
  assert.equal(h.$('#reportCard').querySelectorAll('img[src="x"]').length, 0);
  assert.match(h.$('#reportCard').textContent, /<img src=x onerror="alert\(1\)"> Kaya/);
  h.run(`state.exams=[state.exams.find(exam=>exam.id==='unscored')]; renderReportSelectors(); updateSubjectPicker(); buildClassAnalysisReport()`);
  assert.ok(h.$('#reportCard .empty'));
  assert.equal(h.$('#reportCard').querySelectorAll('table,svg,article').length, 0);
  assert.doesNotMatch(h.$('#reportCard').innerHTML, /Kaya|910071|<img/);
});

test('analysisWorkbookRows exports only owned results and preserves numeric zero versus missing cells', () => {
  const h = agendaAnalysis();
  const before = h.json('state');
  const sheets = h.json('analysisWorkbookRows()');
  assert.deepEqual(Object.keys(sheets), ['S\u0131navlar', 'Dersler', '\u00d6zet', '\u00d6\u011frenciler']);
  assert.deepEqual(sheets['S\u0131navlar'].slice(1), [
    ['Exam early', '2026-10-01', 50, 2, 4, 2, 10, 10, 0, 10],
    ['Exam unscored', '2026-10-02', null, 0, 4, 4, 0, 0, 0, 0],
    ['Exam late', '2026-10-03', 100, 1, 4, 3, 1, 0, 0, 1]
  ]);
  assert.deepEqual(sheets.Dersler.slice(1), [['T', 75, 3, 11, 10, 0]]);
  assert.deepEqual(sheets['\u00d6zet'].slice(0, 4).map(row => row[1]), ['2-B', 75, 3, 3]);
  assert.deepEqual(sheets['\u00d6\u011frenciler'].slice(1), [
    ['910071', 'Ada Kaya', 2, 3, 100, 25], ['910072', 'Efe Can', 1, 3, 0, -75],
    ['910073', 'Deniz Acar', 0, 3, null, null], ['910074', 'Mina Yilmaz', 0, 3, null, null]
  ]);
  assert.doesNotMatch(JSON.stringify(sheets), /Foreign|Unmatched|Imported roster alias|foreign-exam|990099|deleted/);
  assert.deepEqual(h.json('state'), before);
});

test('analysisWorkbookRows hide names removes the student sheet and every name/school number without changing aggregates', () => {
  const h = agendaAnalysis();
  const before = h.json('state');
  h.$('#analysisStudentNames').checked = true;
  const visible = h.json('analysisWorkbookRows()');
  assert.ok(visible['\u00d6\u011frenciler'].some(row => row.includes('Ada Kaya') && row.includes('910071')));
  h.$('#analysisStudentNames').checked = false;
  const hidden = h.json('analysisWorkbookRows()');
  assert.deepEqual(Object.keys(hidden), ['S\u0131navlar', 'Dersler', '\u00d6zet']);
  for (const name of Object.keys(hidden)) assert.deepEqual(hidden[name], visible[name]);
  const serialized = JSON.stringify(hidden);
  for (const student of before.students) {
    for (const value of [student.firstName, student.lastName, student.schoolNo, student.photo].filter(Boolean)) {
      assert.ok(!serialized.includes(value), `hidden workbook leaked ${value}`);
    }
  }
  h.$('#analysisStudentNames').checked = true;
  assert.deepEqual(h.json('analysisWorkbookRows()'), visible, 'restoring details must not lose student data');
  assert.deepEqual(h.json('state'), before);
});

test('analysisWorkbookRows respects chosen exams and does not substitute zero when no exams are selected', () => {
  const h = agendaAnalysis();
  h.$('#reportExam').value = '__selected__';
  h.$('#reportExamPicker input[value="late"]').checked = true;
  h.run('updateSubjectPicker()');
  const selected = h.json('analysisWorkbookRows()');
  assert.deepEqual(selected['S\u0131navlar'].slice(1).map(row => row[0]), ['Exam late']);
  assert.equal(selected['\u00d6zet'][1][1], 100);
  h.$('#reportExamPicker input[value="late"]').checked = false;
  h.run('updateSubjectPicker()');
  const empty = h.json('analysisWorkbookRows()');
  assert.equal(empty['S\u0131navlar'].length, 1);
  assert.equal(empty.Dersler.length, 1);
  assert.deepEqual(empty['\u00d6zet'].slice(1, 4).map(row => row[1]), [null, 0, 0]);
  assert.ok(empty['\u00d6\u011frenciler'].slice(1).every(row => row[2] === 0 && row[4] === null && row[5] === null));
});

test('workbook, class report, academic report and comparison use the same filtered exam class means', () => {
  const h = agendaAnalysis();
  weightedFixture(h);
  h.run(`state.exams.push({...weightedExam,id:'weighted-late',name:'Weighted late',date:'2026-10-02',
    results:{s1:makeResult({T:{d:12,y:0,b:0},M:{d:4,y:0,b:0},F:{d:0,y:0,b:10}},weightedScoring)}});
    renderReportSelectors(); updateSubjectPicker();`);
  for (const [subjects, examMeans] of [
    [['T'], [100 / 3, 100]], [['M'], [0, 100]], [['T', 'M'], [200 / 9, 100]],
    [['F'], [100, 0]], [['T', 'M', 'F'], [550 / 9, 50]]
  ]) {
    h.selectSubjects(subjects);
    const expected = (examMeans[0] + examMeans[1]) / 2;
    near(h.run('classAnalysis().percent'), expected);
    near(h.run(`aggregateStudentReport('s1',selectedExamSet(),selectedSubjects()).total.classAverage`), expected);
    const sheets = h.json('analysisWorkbookRows()');
    near(sheets['\u00d6zet'][1][1], expected);
    sheets['S\u0131navlar'].slice(1).forEach((row, index) => near(row[2], examMeans[index]));
    const snapshots = h.json(`classAnalysis().snapshots.map(item=>comparisonSnapshot(item.exam,'s1'))`);
    snapshots.forEach((item, index) => near(item.classAverage, examMeans[index]));
    assert.deepEqual(sheets.Dersler.slice(1).map(row => row[0]), subjects);
    h.run('buildClassAnalysisReport()');
    const formatted = h.run(`formatPercent(${expected})`);
    assert.equal(h.$('.analysis-report-score strong').textContent, formatted);
    for (const target of h.run('reportExportTargets()')) {
      assert.equal(target.querySelector('.analysis-report-score strong').textContent, formatted);
    }
  }
});

function pupilReport(h, count) {
  h.run(`state.students = Array.from({length:${count}},(_,index)=>({
    id:'p'+index,classId:'own',firstName:'Pupil',lastName:'Number'+index,schoolNo:String(100001+index)
  })).concat({id:'outsider',classId:'foreign',firstName:'Foreign',lastName:'Pupil',schoolNo:'990099'});
  state.exams=[analysisExam('roster','2026-10-01',Object.fromEntries(activeStudents().map((student,index)=>[
    student.id,analysisScore(index%11,10-index%11)
  ])))]; renderReportSelectors(); updateSubjectPicker(); buildClassAnalysisReport();`);
}

test('reportExportTargets splits 20/21/40/41 pupil rows into pages of at most twenty with no omissions or mutations', () => {
  const h = agendaAnalysis();
  for (const count of [20, 21, 40, 41]) {
    pupilReport(h, count);
    const report = h.$('#reportCard');
    const before = report.innerHTML;
    const originalRows = tableRows(report.querySelectorAll('.report-table')[1]);
    const targets = Array.from(h.run('reportExportTargets()'));
    const pupilPages = targets.filter(page => page.querySelector('thead th')?.textContent === '\u00d6\u011frenci');
    assert.equal(pupilPages.length, Math.ceil(count / 20));
    assert.deepEqual(pupilPages.map(page => page.querySelectorAll('tbody tr').length),
      Array.from({length:Math.ceil(count / 20)}, (_, index) => Math.min(20, count - index * 20)));
    assert.deepEqual(pupilPages.flatMap(page => tableRows(page.querySelector('table'))), originalRows);
    assert.equal(targets.length, 4 + Math.ceil(count / 20));
    targets.forEach((page, index) => {
      assert.equal(page.querySelectorAll('.report-header').length, 1);
      assert.equal(page.querySelectorAll('.analysis-summary-line').length, 1);
      assert.equal(page.querySelectorAll('.analysis-section').length, 1);
      assert.equal(page.querySelectorAll('.report-footer').length, 1);
      assert.ok(Array.from(page.querySelectorAll('tbody')).every(body => body.children.length <= 20));
      const caption = Array.from(page.children).find(child => child.matches('p.analysis-caption'));
      assert.equal(caption?.textContent, `${index + 1} / ${targets.length}`);
    });
    assert.equal(report.innerHTML, before);
    assert.deepEqual(Array.from(h.run('reportExportTargets()'), page => page.outerHTML), targets.map(page => page.outerHTML));
  }
});

test('reportExportTargets also splits exam rows and chart chunks independently without losing labels', () => {
  const h = agendaAnalysis();
  h.chartExams(21);
  h.run('buildClassAnalysisReport()');
  const targets = Array.from(h.run('reportExportTargets()'));
  const examPages = targets.filter(page => page.querySelector('thead th')?.textContent === 'S\u0131nav');
  assert.deepEqual(examPages.map(page => page.querySelectorAll('tbody tr').length), [20, 1]);
  assert.deepEqual(examPages.flatMap(page => tableRows(page.querySelector('table')).map(row => row[0])),
    Array.from({length:21}, (_, index) => `Exam chunk-${index + 1}`));
  const charts = targets.flatMap(page => Array.from(page.querySelectorAll('.analysis-chart-scroll')));
  assert.deepEqual(charts.map(chart => chart.querySelectorAll('.trend-dot').length), [10, 10, 1]);
  assert.deepEqual(charts.flatMap(chart => Array.from(chart.querySelectorAll('svg text title'), title => title.textContent)),
    Array.from({length:21}, (_, index) => `Exam chunk-${index + 1}`));
});

test('reportExportTargets contains no pupil names or school numbers after details are hidden', () => {
  const h = agendaAnalysis();
  pupilReport(h, 41);
  const students = h.json('activeStudents()');
  h.$('#analysisStudentNames').checked = false;
  h.run('buildClassAnalysisReport()');
  const targets = Array.from(h.run('reportExportTargets()'));
  assert.equal(targets.length, 4);
  const html = targets.map(page => page.outerHTML).join('');
  for (const student of students) {
    assert.ok(!html.includes(student.lastName), `page leaked ${student.lastName}`);
    assert.ok(!html.includes(student.schoolNo), `page leaked ${student.schoolNo}`);
  }
  assert.ok(!html.includes('Pupil'));
  assert.ok(targets.every(page => page.querySelector('thead th')?.textContent !== '\u00d6\u011frenci'));
});

test('class report and export targets keep class, teacher, school, exam, subject and pupil labels inert', () => {
  const h = agendaAnalysis();
  const label = '<img data-analysis-injected="yes" src="x" onerror="alert()"> & "label"';
  h.run(`const unsafeLabel=${JSON.stringify(label)};
    state.classes[0].name=unsafeLabel+' class'; state.classes[0].teacherName=unsafeLabel+' teacher';
    state.teacher.schoolName=unsafeLabel+' school';
    state.students[0].firstName=unsafeLabel+' pupil'; state.students[0].schoolNo=unsafeLabel+' number';
    state.exams=[{...analysisExam('labels','2026-10-01',{s1:makeResult({[unsafeLabel]:{d:8,y:2,b:0}})}),
      name:unsafeLabel+' exam',subjects:[unsafeLabel]}];
    renderReportSelectors(); updateSubjectPicker(); buildClassAnalysisReport();`);
  const roots = [h.$('#reportCard'), ...h.run('reportExportTargets()')];
  for (const root of roots) assert.equal(root.querySelectorAll('[data-analysis-injected]').length, 0);
  for (const suffix of ['class', 'teacher', 'school', 'pupil', 'number', 'exam']) {
    assert.ok(h.$('#reportCard').textContent.includes(`${label} ${suffix}`), suffix);
  }
  assert.equal(h.$('.analysis-subject > div > strong').textContent, label);
  const sheets = h.json('analysisWorkbookRows()');
  assert.equal(sheets['S\u0131navlar'][1][0], `${label} exam`);
  assert.equal(sheets.Dersler[1][0], label);
  assert.equal(sheets['\u00d6\u011frenciler'][1][0], `${label} number`);
});

test('workbook label strings starting with spreadsheet operators stay literal string cells, not formulas', () => {
  const h = agendaAnalysis();
  h.run(`state.classes[0].name='@SUM(1,1)'; state.students[0].firstName='=1+1'; state.students[0].lastName='';
    state.students[0].schoolNo='-1+2';
    state.exams=[{...analysisExam('formula','2026-10-01',{s1:makeResult({'+1+1':{d:8,y:2,b:0}})}),
      name:'=HYPERLINK("https://example.invalid","label")',subjects:['+1+1']}];
    renderReportSelectors(); updateSubjectPicker();`);
  h.run(fs.readFileSync(path.join(agendaDirectory, 'vendor', 'xlsx.full.min.js'), 'utf8'));
  const cells = h.json(`(()=>{
    const rows=analysisWorkbookRows(); const workbook=XLSX.utils.book_new();
    for(const [name,data] of Object.entries(rows)) XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(data),name);
    const restored=XLSX.read(XLSX.write(workbook,{bookType:'xlsx',type:'array'}),{type:'array'});
    return Object.entries(rows).flatMap(([name,data])=>data.flatMap((row,r)=>row.flatMap((value,c)=>{
      if(typeof value!=='string')return [];
      const cell=restored.Sheets[name][XLSX.utils.encode_cell({r,c})];
      return [{expected:value,value:cell?.v,type:cell?.t,formula:cell?.f??null}];
    })));
  })()`);
  assert.ok(cells.some(cell => cell.value.startsWith('=')));
  assert.ok(cells.some(cell => cell.value.startsWith('+')));
  assert.ok(cells.some(cell => cell.value.startsWith('-')));
  assert.ok(cells.some(cell => cell.value.startsWith('@')));
  for (const cell of cells) {
    assert.equal(cell.value, cell.expected);
    assert.equal(cell.type, 's');
    assert.equal(cell.formula, null);
  }
});

test('invalid imported date labels must remain inert in class reports, chart labels and export targets', () => {
  const h = agendaAnalysis();
  const date = '<img data-analysis-date="unsafe" src="x" onerror="alert()">';
  h.run(`state.exams=[analysisExam('unsafe-date',${JSON.stringify(date)},{s1:analysisScore(8,2)})]; buildClassAnalysisReport()`);
  const chart = fragment(h.run('buildComparisonTrendChart(classAnalysis().snapshots,true)'));
  const targets = Array.from(h.run('reportExportTargets()'));
  assert.deepEqual({
    report: h.$('#reportCard').querySelectorAll('[data-analysis-date]').length,
    chart: chart.querySelectorAll('[data-analysis-date]').length,
    exports: targets.reduce((sum, page) => sum + page.querySelectorAll('[data-analysis-date]').length, 0)
  }, {report:0,chart:0,exports:0}, 'an invalid imported date must never become an HTML element');
});

test('a weighted subject with no answers is missing, not a zero result in filtered analytics/workbooks', () => {
  const h = agendaAnalysis();
  h.run(`const emptyWeightedScoring={maxScore:500,subjectPoints:{T:200,M:300}};
    state.exams=[{...analysisExam('empty-weighted','2026-10-01',{
      s1:makeResult({T:{d:10,y:0,b:0},M:{d:0,y:0,b:0}},emptyWeightedScoring),
      s2:makeResult({T:{d:10,y:0,b:0},M:{d:10,y:0,b:0}},emptyWeightedScoring)
    }),subjects:['T','M'],scoring:emptyWeightedScoring}]; renderReportSelectors(); updateSubjectPicker();`);
  h.selectSubjects(['M']);
  const data = h.json('classAnalysis()');
  const sheets = h.json('analysisWorkbookRows()');
  assert.deepEqual({percent:data.percent,resultCount:data.resultCount,rows:data.snapshots[0].rows.map(row=>row.student.id),
    workbookPercent:sheets['\u00d6zet'][1][1],workbookParticipation:sheets['S\u0131navlar'][1][3]},
  {percent:100,resultCount:1,rows:['s2'],workbookPercent:100,workbookParticipation:1});
});

test('normalized subject aliases share one class mean in analytics, workbook and academic subject comparisons', () => {
  const h = agendaAnalysis();
  h.run(`state.exams=[
    {...analysisExam('mixed-case','2026-10-01',{s1:makeResult({'Matematik':{d:10,y:0,b:0}})}),subjects:['Matematik']},
    {...analysisExam('upper-case','2026-10-02',{s1:makeResult({'MATEMAT\u0130K':{d:0,y:10,b:0}})}),subjects:['MATEMAT\u0130K']}
  ]; renderReportSelectors(); updateSubjectPicker();`);
  h.selectSubjects(['Matematik']);
  assert.deepEqual(h.json(`({
    subjects:classAnalysis().subjects.map(item=>({key:normalize(item.name),percent:item.percent,count:item.count})),
    workbookRows:analysisWorkbookRows()['Dersler'].length-1,
    academicClassMean:aggregateStudentReport('s1',selectedExamSet(),selectedSubjects()).subjects[0]?.classAverage
  })`), {subjects:[{key:'MATEMATIK',percent:50,count:2}],workbookRows:1,academicClassMean:50});
});
