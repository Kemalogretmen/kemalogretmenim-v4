const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');

function harness() {
  const {window,document} = parseHTML(fs.readFileSync('ogretmen-ajandasi/index.html','utf8'));
  for (const select of document.querySelectorAll('select')) Object.defineProperty(select,'value',{
    get(){return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? '';},
    set(value){for(const option of this.querySelectorAll('option')) option.toggleAttribute('selected',option.value===String(value));}
  });
  Object.defineProperty(window.HTMLInputElement.prototype,'checked',{
    configurable:true,get(){return this.hasAttribute('checked');},set(value){this.toggleAttribute('checked',!!value);}
  });
  const data = new Map();
  let files=[];
  Object.defineProperty(document.getElementById('studentRosterFile'),'files',{get:()=>files});
  const context=vm.createContext({window,document,URL,URLSearchParams,TextEncoder,Blob,console,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,confirm:()=>true,
    localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}});
  const run=source=>vm.runInContext(source,context);
  run(fs.readFileSync('ogretmen-ajandasi/vendor/xlsx.full.min.js','utf8'));
  run('window.XLSX=XLSX');
  run(fs.readFileSync('ogretmen-ajandasi/app.js','utf8'));
  run(`bindElements();state=normalizeState({classes:[{id:'a',name:'2-B'},{id:'b',name:'3-A'}],activeClassId:'a',exams:[],
    students:[{id:'ada',classId:'a',schoolNo:'1',firstName:'Ada',lastName:'Kaya',family:{motherName:'Anne'},notes:[{text:'Korunacak'}]},
    {id:'efe',classId:'a',schoolNo:'',firstName:'Efe',lastName:'Can',photo:'data:image/png;base64,YQ==',meetings:[{text:'Görüşme'}]},
    {id:'other',classId:'b',schoolNo:'2',firstName:'Başka',lastName:'Öğrenci'}]});
    renderAll=()=>{renderClassSelect();renderManualExamSelectors();};renderAll();`);
  const json=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
  const $=selector=>document.querySelector(selector);
  function workbook(sheets) {
    context.testSheets=sheets;
    const bytes=run(`(()=>{const wb=XLSX.utils.book_new();for(const [name,rows] of Object.entries(testSheets)) XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);return XLSX.write(wb,{type:'array',bookType:'xlsx'});})()`);
    files=[{size:bytes.byteLength,arrayBuffer:async()=>bytes}];
    run('clearStudentRosterImport(true)');
  }
  return {run,json,$,document,data,workbook,setFiles:value=>{files=value;},context};
}

test('roster headers accept separate or combined Turkish names without guessing unknown columns',()=>{
  const h=harness();
  assert.equal(h.run(`extractStudentRoster([['Liste başlığı'],['Okul No','Adı','Soyadı'],['007','Elif Naz','Öztürk']])[0].firstName`),'Elif Naz');
  assert.equal(h.run(`extractStudentRoster([['Numarası','Öğrencinin Adı Soyadı'],['8','Elif Naz Öztürk']])[0].lastName`),'ÖZTÜRK');
  assert.equal(h.run(`extractStudentRoster([['No','Ad Soyad'],['8','Elif Naz Öztürk'],['','Toplam']]).length`),1);
  assert.throws(()=>h.run(`extractStudentRoster([['A','B'],['8','Elif']])`),/başlıkları bulunamadı/);
});

test('real workbook preview requires confirmation, ignores duplicates and conflicts, keeps rich existing records',async()=>{
  const h=harness();
  h.workbook({'2-B':[['Okul No','Ad','Soyad'],['001','Ada','Kaya'],['2','Efe','Can'],['3','Elif','Öztürk'],['3','Elif','Öztürk'],['1','Yanlış','İsim'],['4','','Yok']]});
  await h.run('previewStudentRosterImport()');
  assert.equal(h.run('state.students.length'),3,'Preview never mutates saved students');
  assert.deepEqual(h.json('pendingStudentImport.entries.map(entry=>entry.action)'),['skip','complete','add','skip','skip','skip']);
  assert.match(h.$('#studentImportPreview').textContent,/başka bir öğrenciye ait|tekrar eden/);
  h.run('commitStudentRosterImport()');
  assert.equal(h.run('state.students.length'),4);
  assert.equal(h.run(`state.students.find(student=>student.id==='efe').schoolNo`),'2');
  assert.equal(h.run(`state.students.find(student=>student.id==='efe').meetings[0].text`),'Görüşme');
  assert.equal(h.run(`state.students.find(student=>student.id==='ada').notes[0].text`),'Korunacak');
  assert.equal(h.run(`state.students.find(student=>student.id==='other').classId`),'b');
  await h.run('previewStudentRosterImport()');
  assert.equal(h.run(`pendingStudentImport.entries.filter(entry=>entry.action!=='skip').length`),0);
});

test('worksheet selection and row exclusion choose exactly which students enter the explicit target class',async()=>{
  const h=harness();
  h.workbook({First:[['Ad Soyad'],['Birinci Sayfa']],Second:[['Ad Soyad'],['Deniz Kaya'],['Mert Can']]});
  await h.run('previewStudentRosterImport()');
  h.$('#studentImportSheet').value='Second';
  h.$('#studentImportClass').value='b';
  await h.run('previewStudentRosterImport()');
  h.run('pendingStudentImport.entries[1].selected=false;commitStudentRosterImport()');
  assert.equal(h.run(`state.students.filter(student=>student.firstName==='Deniz'&&student.classId==='b').length`),1);
  assert.equal(h.run(`state.students.filter(student=>['Mert','Birinci'].includes(student.firstName)).length`),0);
  assert.equal(h.run('state.activeClassId'),'b');
});

test('changed class roster requires another review and a failed save leaves both classes unchanged',async()=>{
  const h=harness();
  h.workbook({List:[['No','Ad','Soyad'],['3','Yeni','Öğrenci']]});
  await h.run('previewStudentRosterImport()');
  h.run(`state.students[0].schoolNo='3';commitStudentRosterImport()`);
  assert.equal(h.run('state.students.length'),3);
  assert.equal(h.run('pendingStudentImport.entries[0].action'),'skip');
  h.run(`state.students[0].schoolNo='1'`);
  await h.run('previewStudentRosterImport()');
  h.run(`localStorage.setItem=()=>{throw new Error('QuotaExceededError')}`);
  h.run('commitStudentRosterImport()');
  assert.equal(h.run('state.students.length'),3);
  assert.ok(h.run('!!pendingStudentImport'));
});

test('late workbook reads are discarded and imported HTML remains inert in preview',async()=>{
  const h=harness();
  let resolve;
  h.setFiles([{size:20,arrayBuffer:()=>new Promise(done=>{resolve=done;})}]);
  const read=h.run('previewStudentRosterImport()');
  h.run('clearStudentRosterImport(true)');
  resolve(new ArrayBuffer(0));await read;
  assert.equal(h.run('pendingStudentImport'),null);
  h.workbook({List:[['Ad','Soyad'],['<img src=x onerror=attack()>','Kaya']]});
  await h.run('previewStudentRosterImport()');
  assert.equal(h.$('#studentImportPreview').querySelectorAll('img,script,[onerror]').length,0);
  assert.match(h.$('#studentImportPreview').textContent,/<img/);
});

test('export round trip contains only current class and keeps formula-like names as text',async()=>{
  const h=harness();
  h.run(`state.students[0].firstName='=HYPERLINK("test")';downloadBlob=(blob,name)=>{window.exported={blob,name}};exportStudentRoster()`);
  const blob=h.run('window.exported.blob');
  h.context.exportBytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
  const rows=h.json(`(()=>{const wb=XLSX.read(exportBytes,{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});})()`);
  assert.equal(rows.length,3);
  assert.ok(rows.some(row=>row[1]==='=HYPERLINK("test")'));
  const formulaRow=rows.findIndex(row=>row[1]==='=HYPERLINK("test")')+1;
  assert.equal(h.run(`(()=>{const wb=XLSX.read(exportBytes,{type:'array'});return wb.Sheets[wb.SheetNames[0]]['B${formulaRow}'].t;})()`),'s');
  assert.doesNotMatch(JSON.stringify(rows),/Başka/);
});

function plannerHarness() {
  const html=fs.readFileSync('ogretmen-ajandasi/ders-programi.html','utf8');
  const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(code=>code.includes('function getDersSecenekleri'));
  const {window,document}=parseHTML(html);
  const saved=new Map();
  const context=vm.createContext({window,document,URLSearchParams,console,alert(){},confirm:()=>true,
    localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}});
  const run=code=>vm.runInContext(code,context);
  run(source.replace(/\ninit\(\);/,'\n'));
  run(`ensureStateDefaults();renderProgramSettings=()=>{};renderScheduleTable=()=>{};renderWeeklyPlan=()=>{};
    state.siniflar=[{id:'a',name:'2-B'},{id:'b',name:'3-A'}];state.activeSinif='a';
    state.programs={a:createEmptyProgram(),b:createEmptyProgram()};`);
  return {run,document};
}

test('lesson catalog adds persistent options, deletes scheduled instances without deleting annual plans, restores by name',()=>{
  const h=plannerHarness();
  h.run(`registerCatalogLesson('satranç');state.programs.a.Mon[0].ders='SATRANÇ';state.programs.b.Tue[1].ders='SATRANÇ';
    state.yillikPlanlar['SATRANÇ']=[{hafta:8,kazanim:'Plan korunur'}];removeCatalogLesson('SATRANÇ')`);
  assert.equal(h.run(`getDersSecenekleri().includes('SATRANÇ')`),false);
  assert.equal(h.run('state.programs.a.Mon[0].ders'),'');
  assert.equal(h.run('state.programs.b.Tue[1].ders'),'');
  assert.equal(h.run(`state.yillikPlanlar['SATRANÇ'][0].kazanim`),'Plan korunur');
  h.run(`registerCatalogLesson('satranç');saveToStorage();loadFromStorage()`);
  assert.equal(h.run(`getDersSecenekleri().filter(name=>name==='SATRANÇ').length`),1);
  assert.equal(h.run('state.programs.a.Mon[0].ders'),'','Restoring a subject never resurrects cleared schedule cells');
});

test('single-cell deletion does not change other cells and removed default lessons stay removed for new schedules',()=>{
  const h=plannerHarness();
  h.run(`state.programs.a.Mon[0].ders='TÜRKÇE';state.programs.a.Mon[1].ders='MATEMATİK';setCellDers('Mon',0,'');saveToStorage();loadFromStorage()`);
  assert.equal(h.run('state.programs.a.Mon[0].ders'),'');
  assert.equal(h.run('state.programs.a.Mon[1].ders'),'MATEMATİK');
  h.run(`removeCatalogLesson('Etüt')`);
  assert.equal(h.run('createDefaultDayRows()[0].ders'),'');
});
