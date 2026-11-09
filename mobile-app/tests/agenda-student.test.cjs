const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(name){const file=path.join(__dirname,'../src/platform',name+'.ts');const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>n.startsWith('./')?load(n.slice(2)):require(n),URL,Date,console,Set,TextEncoder});return module.exports;}
const student=load('agendaStudent'),m=load('agendaModel');
test('native class success retains valid zero and excludes missing, invalid and zero-question results',()=>{
  for(const percent of [0,50,100])assert.equal(student.studentExamResult({results:{s:{total:{percent}}}},'s').total.percent,percent);
  for(const percent of [null,undefined,'0',-1,101,NaN,Infinity])assert.equal(student.studentExamResult({results:{s:{total:{percent}}}},'s'),null);
  assert.equal(student.studentExamResult({results:{s:{subjects:{M:{d:0,y:0,b:0}},total:{percent:0}}}},'s'),null);
  assert.equal(student.studentExamResult({results:{s:{subjects:{M:{d:0,y:10,b:0}},total:{percent:0}}}},'s').total.percent,0);
  assert.equal(student.studentExamResult({results:{s:{total:{percent:90}}}},'other'),null);
});
test('parent phone contacts normalize Turkish and international formats without URI injection',()=>{
  for(const value of ['0532 123 45 67','(532) 123-45-67','+90 532 123 45 67','00905321234567']) {
    assert.equal(student.parentPhone(value).call,'tel:+905321234567');
    assert.equal(student.parentPhone(value).whatsapp,'https://wa.me/905321234567');
  }
  assert.equal(student.parentPhone('+49 151 12345678').whatsapp,'https://wa.me/4915112345678');
  for(const value of ['javascript:alert(1)','tel:+905321234567?body=secret','123','+','<script>']) assert.equal(student.parentPhone(value),null);
});
test('student photos support saved raster data and HTTPS but reject active or credential URLs',()=>{
  assert.equal(student.studentPhoto('data:image/png;base64,aGVsbG8='),'data:image/png;base64,aGVsbG8=');
  assert.equal(student.studentPhoto('https://example.com/photo.png'),'https://example.com/photo.png');
  for(const value of ['data:image/svg+xml,<svg onload=attack()>','javascript:attack()','https://user:pass@example.com/a','file:///private/file']) assert.equal(student.studentPhoto(value),undefined);
});
test('class rename keeps stable roster/program IDs and unrelated teacher records; replay is idempotent',()=>{
  const row={updated_at:'v',agenda_state:m.normalizeAgenda({classes:[{id:'a',name:'2-B'}],students:[{id:'s',classId:'a',family:{motherName:'Korunur'}}]}),lesson_planner_state:{siniflar:[{id:'p',name:'2/B'}],programs:{p:{Mon:[{ders:'TÜRKÇE'}]}},yillikPlanlar:{plan:'korunur'}}};
  const op={id:'op',collection:'classRename',itemId:'a',agendaId:'a',plannerId:'p',beforeName:'2-B',beforePlannerName:'2/B',name:'Birincilerim'};
  const next=m.applyAgendaChanges(row,[op]);
  assert.equal(next.agenda_state.classes[0].name,'Birincilerim');
  assert.equal(next.lesson_planner_state.siniflar[0].name,'Birincilerim');
  assert.equal(next.agenda_state.students[0].classId,'a');
  assert.equal(next.agenda_state.students[0].family.motherName,'Korunur');
  assert.equal(JSON.stringify(next.lesson_planner_state.programs),JSON.stringify(row.lesson_planner_state.programs));
  assert.equal(m.agendaClassChoices(next)[0].plannerId,'p');
  assert.equal(m.applyAgendaChanges(next,[op]).agenda_state.classes[0].name,'Birincilerim');
  next.agenda_state.classes[0].name='Başka cihaz';
  assert.throws(()=>m.applyAgendaChanges(next,[op]),/başka cihazda/);
  assert.equal(row.agenda_state.classes[0].name,'2-B');
});
