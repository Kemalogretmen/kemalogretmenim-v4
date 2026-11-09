const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
function harness(){
  const {window,document}=parseHTML(fs.readFileSync('ogretmen-paneli.html','utf8'));
  for(const select of document.querySelectorAll('select')) Object.defineProperty(select,'value',{
    get(){return this.querySelector('option[selected]')?.value ?? this.querySelector('option')?.value ?? '';},
    set(value){for(const option of this.querySelectorAll('option')) option.toggleAttribute('selected',option.value===String(value));}
  });
  Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(value){this.toggleAttribute('checked',!!value);}});
  const reads=[],writes=[];
  const row={agenda_state:{classes:[{id:'source',name:'2-B'},{id:'other',name:'3-A'}],students:[{id:'s1',classId:'source',firstName:'Ada',lastName:'Kaya',schoolNo:'1'},{id:'s2',classId:'source',firstName:'<img src=x onerror=attack()>',lastName:'Can'},{id:'private',classId:'other',firstName:'Başka'}]}};
  let result={data:{added:1,kept:0,conflicts:0},error:null};
  window.location={origin:'https://example.invalid'};window.confirm=()=>true;window.setTimeout=()=>0;window.clearTimeout=()=>{};
  window.kemalUserAuth={getClient:()=>({from:table=>({select:()=>({eq:(key,value)=>{reads.push({table,key,value});return {maybeSingle:async()=>({data:row,error:null})};}})}),rpc:async(name,args)=>{writes.push({name,args});return result;}})};
  const context=vm.createContext({window,document,URL,console});
  let source=fs.readFileSync('js/ogretmen-paneli.js','utf8');
  source=source.replace(/  if \(document.readyState === 'loading'\)[\s\S]*?\n\}\)\(\);\s*$/,`window.testPanel={state,loadAgendaRoster,renderAgendaRoster,importAgendaRoster,renderClasses,renderStudents}; loadTeacherData=async()=>{}; })();`);
  vm.runInContext(source,context);
  const api=window.testPanel;api.state.user={id:'teacher'};api.state.profile={role:'teacher',active:true,approval_status:'active'};api.state.classes=[{id:'target',name:'Birincilerim'}];api.renderClasses();
  return {api,window,document,reads,writes,result:value=>{result=value;}};
}
test('panel previews only selected own agenda class and safely renders imported names',async()=>{
  const h=harness();await h.api.loadAgendaRoster();
  assert.deepEqual(h.reads,[{table:'teacher_agenda_states',key:'user_id',value:'teacher'}]);
  const preview=h.document.getElementById('agendaRosterPreview');
  assert.equal(preview.querySelectorAll('input').length,2);
  assert.equal(preview.querySelectorAll('img,script,[onerror]').length,0);
  assert.doesNotMatch(preview.textContent,/Başka/);
  h.document.getElementById('agendaSourceClass').value='other';h.api.renderAgendaRoster();
  assert.match(preview.textContent,/Başka/);assert.doesNotMatch(preview.textContent,/Ada/);
});
test('panel imports exactly checked students into the explicitly selected target and never sends private fields',async()=>{
  const h=harness();await h.api.loadAgendaRoster();
  await h.api.importAgendaRoster();assert.equal(h.writes.length,0);
  h.document.querySelector('[data-agenda-student="s1"]').checked=true;
  await h.api.importAgendaRoster();
  assert.equal(h.writes[0].name,'import_agenda_students');
  assert.equal(JSON.stringify(h.writes[0].args),JSON.stringify({source_class_id:'source',target_class_id:'target',selected_student_ids:['s1']}));
  h.api.state.profile.role='parent';await h.api.importAgendaRoster();assert.equal(h.writes.length,1);
});
test('cancelled import, changed account and missing SQL are explicit non-destructive states',async()=>{
  const h=harness();await h.api.loadAgendaRoster();h.document.querySelector('input[data-agenda-student]').checked=true;
  h.window.confirm=()=>false;await h.api.importAgendaRoster();assert.equal(h.writes.length,0);
  h.window.confirm=()=>true;h.api.state.user={id:'other'};await h.api.importAgendaRoster();assert.equal(h.writes.length,0);
  h.api.state.user={id:'teacher'};h.result({data:null,error:{code:'PGRST202'}});await h.api.importAgendaRoster();
  assert.match(h.document.getElementById('agendaRosterStatus').textContent,/supabase-ajanda-panel-aktarim.sql/);
});
