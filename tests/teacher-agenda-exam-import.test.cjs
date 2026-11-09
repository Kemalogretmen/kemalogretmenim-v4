const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function harness() {
  const { window, document } = parseHTML(fs.readFileSync('ogretmen-ajandasi/index.html', 'utf8'));
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', { configurable: true,
    get() { return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? ''; },
    set(value) { for (const option of this.querySelectorAll('option')) option.toggleAttribute('selected', option.value === String(value)); }
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'checked', { configurable: true,
    get() { return this.hasAttribute('checked'); }, set(value) { this.toggleAttribute('checked', !!value); } });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  for (const dialog of document.querySelectorAll('dialog')) { dialog.showModal = () => dialog.setAttribute('open', ''); dialog.close = () => dialog.removeAttribute('open'); }
  const saved = new Map(), timers = [];
  const context = vm.createContext({ window, document, TextEncoder, Blob, URL, URLSearchParams, console: { log() {}, warn() {}, error() {} }, confirm: () => true,
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {}, setInterval() {},
    localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) } });
  const run = code => vm.runInContext(code, context);
  run(fs.readFileSync('ogretmen-ajandasi/vendor/xlsx.full.min.js', 'utf8'));
  run('window.XLSX = XLSX');
  run(fs.readFileSync('ogretmen-ajandasi/app.js', 'utf8'));
  run(`bindElements();state=normalizeState({classes:[{id:'c',name:'2-B'},{id:'other',name:'3-A'}],activeClassId:'c',
    students:[{id:'s',classId:'c',schoolNo:'203',firstName:'Ada',lastName:'Kaya',family:{phone:'private'},notes:[{text:'keep'}]}],exams:[]}); renderAll=()=>{};`);
  const json = expr => JSON.parse(run(`JSON.stringify(${expr})`));
  const parse = rows => { context.rows = rows; return json('extractExamStudents(rows,detectExamStructure(rows))'); };
  const file = sheets => {
    context.sheets = sheets;
    const bytes = run(`(()=>{const wb=XLSX.utils.book_new();for(const [name,rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);return XLSX.write(wb,{type:'array',bookType:'xlsx'});})()`);
    context.file = { name: 'sonuc.xlsx', size: bytes.byteLength, arrayBuffer: async () => bytes };
    Object.defineProperty(document.getElementById('excelFile'), 'files', { configurable: true, get: () => [context.file] });
    return context.file;
  };
  return { run, json, parse, file, context, saved, timers, document, $: id => document.getElementById(id) };
}

const simple = [['', 'Türkçe', '', '', 'Matematik', '', '', 'Hayat Bilgisi'], ['', 'D', 'Y', 'B', 'D', 'Y', 'B', 'D', 'Y', 'B'], ['Ada Kaya', 8, 1, 0, 5, 0, 0, 4, 0, 1]];
const publisher = [['SN', 'Grp', 'Öğrenci', 'Puan Türleri', 'Ana Ders Listesi'], ['', '', '', 'LGS', '(19) LGS', '(9) Tür', '(5) Mat', '(5) Hayat Bilgisi'], ['', '', 'Ortalama', 473.5, 17.46, 7.96, 4.75, 4.75], [1, '2/B', '203-Ada Kaya', '481,599 9-22', '17 17 1', '8 8 1', '5 5 0', '4 4 0']];

test('the supplied three-column subject layout needs neither a percent column nor an identity header', () => {
  const h = harness(), rows = h.parse(simple);
  assert.equal(rows.length, 1); assert.equal(rows[0].firstName, 'Ada'); assert.equal(rows[0].lastName, 'KAYA'); assert.equal(rows[0].schoolNo, '');
  assert.deepEqual(rows[0].subjects['HAYAT BİLGİSİ'], { d: 4, y: 0, b: 1, percent: 80 });
  const legacy = h.parse([['No', 'Ad', 'Soyad', 'Türkçe', '', '', ''], ['', '', '', 'D', 'Y', 'B', '%'], ['007', 'Ada', 'Kaya', 8, 1, 1, 80]]);
  assert.equal(legacy[0].schoolNo, '007'); assert.equal(legacy[0].subjects['TÜRKÇE'].b, 1);
});

test('publisher Net/D/Y cells recover school number, names, blanks, and exclude aggregate LGS', () => {
  const h = harness(), rows = h.parse(publisher);
  assert.equal(rows.length, 1); assert.equal(rows[0].schoolNo, '203'); assert.equal(rows[0].className, '2/B');
  assert.deepEqual(Object.keys(rows[0].subjects), ['TÜRKÇE', 'MATEMATİK', 'HAYAT BİLGİSİ']);
  assert.equal(rows[0].subjects['HAYAT BİLGİSİ'].b, 1);
  assert.equal(Object.values(rows[0].subjects).reduce((s, v) => s + v.d, 0), 17);
});

test('invalid OCR, partial counts, negatives, fractions and aggregate mismatches never become zero', () => {
  for (const value of ['O', '', -1, 1.5]) { const h = harness(), rows = structuredClone(simple); rows[2][1] = value; assert.throws(() => h.parse(rows), /D\/Y\/B/); }
  const h = harness();
  for (const cell of ['8 8 O', '9 9 1', '4 8 1']) { const rows = structuredClone(publisher); rows[3][5] = cell; assert.throws(() => h.parse(rows), /okunamadı|tutarsız/); }
  const rows = structuredClone(publisher); rows[3][4] = '16 16 1'; assert.throws(() => h.parse(rows), /toplamıyla uyuşmuyor/);
  const missing = structuredClone(publisher); missing[1][7] = '(5) Bilinmeyen'; assert.throws(() => h.parse(missing), /Eksik ders/);
});

test('flat headers and full names are read without treating score cells as surname or number', () => {
  const h = harness();
  const [student] = h.parse([['Ad Soyad', 'Türkçe D', 'Türkçe Y', 'Türkçe B'], ['Elif Naz Öztürk', 8, 1, 1]]);
  assert.equal(student.schoolNo, ''); assert.equal(student.firstName, 'Elif Naz'); assert.equal(student.lastName, 'ÖZTÜRK');
  h.run(`const mergedRows=[['Ders',0],['',0]];applyMergedCells(mergedRows,[{s:{r:0,c:0},e:{r:1,c:1}}]);`);
  assert.equal(h.run('mergedRows[1][1]'), 0);
});

test('long student/subject rows pivot into one pupil result with validated D/Y/B counts', () => {
  const h=harness();
  h.context.longRows=[['Okul No','Ad Soyad','Ders','Doğru','Yanlış','Boş'],['203','Ada Kaya','Türkçe',8,1,1],['203','Ada Kaya','Matematik',5,3,2]];
  const parsed=h.json('parseLongExamRows(longRows)');
  assert.equal(parsed.students.length,1);assert.equal(parsed.students[0].schoolNo,'203');
  assert.deepEqual(parsed.subjects,['TÜRKÇE','MATEMATİK']);assert.equal(parsed.students[0].subjects['MATEMATİK'].y,3);
  h.run("longRows.push(['203','Ada Kaya','Türkçe',3,2,5])");
  assert.throws(()=>h.run('parseLongExamRows(longRows)'),/tekrarlanıyor/);
  assert.equal(h.run('parseLongExamRows([["Ad Soyad","Türkçe D","Türkçe Y","Türkçe B"]])'),null);
});

test('Upload auto-saves clean matched results; unknown pupils and invalid rows still require review', async () => {
  for(const [name,rows,expected] of [['Temiz',simple,1],['Yeni',[...simple.slice(0,2),['Yeni Öğrenci',8,1,1,5,0,0,4,0,1]],0],['Hatalı',[...simple.slice(0,2),['Ada Kaya','O',1,1,5,0,0,4,0,1]],0]]) {
    const h=harness();h.file({Sonuç:rows});h.$('examName').value=name;
    await h.run('importExamFromExcel({auto:true})');
    assert.equal(h.run('state.exams.length'),expected);
    assert.equal(h.$('importReviewDialog').hasAttribute('open'),expected===0);
  }
});

test('invalid editable rows keep their raw value, require a recheck, and can be corrected before commit', async () => {
  const h=harness(), rows=structuredClone(simple);rows[2][1]='<img src=x onerror=alert(1)>';
  h.file({Sonuç:rows});h.$('examName').value='Düzeltme';
  await h.run('importExamFromExcel()');
  assert.ok(h.$('confirmImportReviewBtn').disabled);
  assert.equal(h.$('importReviewBody').querySelector('img'),null);
  const input=h.$('importReviewBody').querySelector('[data-edit-import-row="0"] [data-import-field="d"]');
  assert.equal(input.value,rows[2][1]);input.value='8';input.dispatchEvent(new h.context.window.Event('input'));
  h.run('commitPendingImport()');assert.equal(h.run('state.exams.length'),0);
  h.run('recheckExamImport()');assert.equal(h.$('confirmImportReviewBtn').disabled,false);
  h.run('commitPendingImport()');assert.equal(h.run("state.exams[0].results.s.subjects['TÜRKÇE'].d"),8);
});

test('duplicate rows can be excluded in review without duplicating a pupil or result', async () => {
  const h=harness();h.file({Sonuç:[...simple,simple[2]]});h.$('examName').value='Tekrar';
  await h.run('importExamFromExcel()');assert.equal(h.run('pendingImport.rows[1].errors.length > 0'),true);
  h.$('importReviewBody').querySelector('[data-edit-import-row="1"] [data-import-field="include"]').checked=false;
  h.run('recheckExamImport();commitPendingImport()');
  assert.equal(h.run('state.students.length'),1);assert.equal(h.run('Object.keys(state.exams[0].results).length'),1);
});

test('manual column mapping supports unknown headers and refuses duplicate column assignments', async () => {
  const h=harness();h.file({Puanlar:[['Kimlik','Kişi','Başarı','Hata','Cevapsız'],['203','Ada Kaya',8,1,1]]});
  h.$('examName').value='Eşleştirme';await h.run('openExamColumnMapping()');
  h.$('mappingSchoolNo').value='0';h.$('mappingName').value='1';
  const row=h.$('mappingSubjects').firstElementChild;
  row.querySelector('input').value='Türkçe';
  for(const [key,value]of [['d','2'],['y','3'],['b','4']])row.querySelector(`[data-mapping-kind="${key}"]`).value=value;
  assert.equal(h.json('mappedExamData()').students[0].subjects['TÜRKÇE'].d,8);
  row.querySelector('[data-mapping-kind="b"]').value='2';assert.throws(()=>h.run('mappedExamData()'),/birden fazla/);
  row.querySelector('[data-mapping-kind="b"]').value='4';h.run('applyExamColumnMapping()');
  assert.equal(h.$('importReviewDialog').hasAttribute('open'),true);assert.equal(h.run('state.exams.length'),0);
  h.run('commitPendingImport()');assert.equal(h.run('state.exams.length'),1);
});

test('real XLSX parsing finds results after a cover, supports explicit sheets and limits file size', async () => {
  const h = harness(); h.file({ Kapak: [['Açıklamalar']], Sonuç: simple });
  assert.equal((await h.run('parseExcelFile(file)')).students.length, 1);
  h.run('resetExamImport()'); h.file({ A: simple, B: simple });
  await assert.rejects(h.run('parseExcelFile(file)'), /Birden fazla/);
  h.$('examImportSheet').value = 'B'; assert.equal((await h.run('parseExcelFile(file)')).sheetName, 'B');
  h.context.file = { size: 11 * 1024 * 1024 }; await assert.rejects(h.run('parseExcelFile(file)'), /10 MB/);
});

test('preview and cancellation do not save; confirmation stores results and preserves existing private records', async () => {
  const h = harness(); h.file({ Sonuç: simple }); h.$('examName').value = 'Haftalık deneme';
  await h.run('importExamFromExcel()');
  assert.equal(h.run('state.exams.length'), 0); assert.equal(h.saved.size, 0);
  assert.match(h.$('importReviewBody').textContent, /8 \/ 1 \/ 0/);
  h.run('commitPendingImport()');
  assert.equal(h.run('state.exams.length'), 1); assert.equal(h.run('state.exams[0].results.s.total.d'), 17);
  assert.equal(h.run('state.students[0].family.phone'), 'private'); assert.equal(h.run('state.students[0].schoolNo'), '203');
  assert.equal(h.saved.get('kemalOgretmenAjandasi.v1').includes('PK'), false);
});

test('duplicate rows, conflicting identities and changed classes require correction before writing', async () => {
  const h = harness();
  h.context.parsed = { subjects: [], students: [h.parse(simple)[0], h.parse(simple)[0]] };
  assert.throws(() => h.run('buildImportPlan(parsed,{scoring:{}})'), /birden fazla satır/);
  assert.throws(() => h.run(`findStudentMatch({schoolNo:'203',firstName:'Başka',lastName:'Ad'},activeStudents())`), /numarası.*kayıtlı/);
  h.file({ Sonuç: simple }); h.$('examName').value = 'Deneme'; await h.run('importExamFromExcel()');
  h.run(`state.activeClassId='other';commitPendingImport()`); assert.equal(h.run('state.exams.length'), 0);
});

test('a single lesson weight cannot silently discard the other lessons; total score has its own field', async () => {
  const h = harness(); h.file({ Sonuç: simple }); h.$('examName').value = 'Deneme'; h.$('examSubjectPoints').value = '100';
  await h.run('importExamFromExcel()');
  assert.equal(h.run('pendingImport'), null); assert.match(h.$('importSummary').textContent, /her derse puan/);
  h.$('examSubjectPoints').value = ''; h.$('examMaxScore').value = '500'; await h.run('importExamFromExcel()');
  assert.equal(h.run('pendingImport.meta.scoring.maxScore'), 500);
});

test('a failed local save rolls back exam import and keeps the review available', async () => {
  const h = harness(); h.file({ Sonuç: simple }); h.$('examName').value = 'Deneme'; await h.run('importExamFromExcel()');
  h.run(`localStorage.setItem=()=>{throw new Error('quota');};commitPendingImport()`);
  assert.equal(h.run('state.exams.length'), 0); assert.equal(h.run('state.students.length'), 1); assert.equal(h.run('!!pendingImport'), true);
});

test('reimporting the same exam with different header case does not duplicate subjects or source files', () => {
  const h = harness();
  h.run(`state.exams=[{id:'e',subjects:['Türkçe'],sourceFile:'a.xlsx',results:{s:makeResult({'Türkçe':{d:8,y:1,b:0}})},participants:[]}];
    const payload={id:'e',subjects:['TÜRKÇE'],sourceFile:'a.xlsx',results:{s:makeResult({'TÜRKÇE':{d:7,y:2,b:0}})},participants:[]};mergeExamPayload(payload);mergeExamPayload(payload);`);
  assert.equal(h.run('state.exams[0].results.s.total.d'), 7);
  assert.equal(h.run('state.exams[0].subjects.length'), 1);
  assert.equal(h.run('state.exams[0].sourceFile'), 'a.xlsx');
});

test('deletion during an in-flight cloud write schedules a new full snapshot without the deleted result', async () => {
  const h = harness();
  h.run(`let sent=[];let finishFirst;cloudSync.enabled=true;cloudSync.ready=true;cloudSync.rowChecked=true;cloudSync.userId='teacher';cloudSync.rowVersion='r1';
    cloudSync.client={from:()=>({update:payload=>{sent.push(JSON.parse(JSON.stringify(payload)));return{eq:()=>({eq:()=>({select:()=>({maybeSingle:()=> sent.length===1 ? new Promise(resolve=>{finishFirst=()=>resolve({data:{updated_at:'r2'}});}) : Promise.resolve({data:{updated_at:'r3'}})})})})};}})};
    state.exams=[{id:'exam',classId:'c',results:{s:{private:'score'}}}];`);
  const first = h.run('saveCloudNow()');
  h.run(`deleteExam('exam');finishFirst()`); await first;
  assert.equal(h.run('cloudSync.saveAgain'), false); assert.ok(h.timers.length);
  await h.run('saveCloudNow()');
  assert.equal(h.run('sent[0].agenda_state.exams.length'), 1); assert.equal(h.run('sent[1].agenda_state.exams.length'), 0);
  assert.equal(h.run('cloudSync.rowVersion'), 'r3');
});

test('class deletion also removes pupils results from exams owned by another class', () => {
  const h = harness();
  h.run(`state.exams=[{id:'other-exam',classId:'other',results:{s:{score:1},keep:{score:2}},participants:[{studentId:'s'},{studentId:'keep'}],importWarnings:{missingStudentIds:['s','keep'],noScoreNames:['Ada Kaya','Other Name']}}];state.birthdayReminderLog={'2026_s_today':'seen','2026_keep_today':'seen'};deleteActiveClass();`);
  assert.equal(h.run('state.students.length'), 0);
  assert.deepEqual(h.json('Object.keys(state.exams[0].results)'), ['keep']);
  assert.deepEqual(h.json('state.exams[0].participants.map(p=>p.studentId)'), ['keep']);
  assert.deepEqual(h.json('state.exams[0].importWarnings.missingStudentIds'), ['keep']);
  assert.deepEqual(h.json('state.exams[0].importWarnings.noScoreNames'), ['Other Name']);
  assert.deepEqual(h.json('Object.keys(state.birthdayReminderLog)'), ['2026_keep_today']);
});
