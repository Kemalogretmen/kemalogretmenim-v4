const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const tick=()=>new Promise(r=>setImmediate(r));
const teacher={id:'teacher-1',role:'teacher',approval_status:'active',active:true,email:'teacher@example.com',full_name:'Test Teacher'};
function authHarness() {
  const {window:dom,document}=parseHTML('<html><head></head><body></body></html>');
  const window={CustomEvent:dom.CustomEvent,addEventListener:dom.addEventListener.bind(dom),dispatchEvent:dom.dispatchEvent.bind(dom)};
  let session={user:{id:teacher.id,email:teacher.email,user_metadata:{role:'student'}}}, profile={...teacher}, error=null, callback, creates=0;
  const writes=[], timers=[];
  const client={auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange(fn){callback=fn;return{data:{subscription:{}}};}},from(table){
    const query={select(){return this;},eq(){return this;},ilike(){return this;},upsert(value,options){writes.push({value,options});return this;},async maybeSingle(){
      return table==='admin_users'?{data:null,error:null}:{data:profile,error};
    }};return query;
  }};
  window.supabase={createClient(){creates++;return client;}};
  window.kemalSiteStore={getConfig:()=>({supabaseUrl:'https://test.invalid',supabaseAnonKey:'key'})};
  window.setTimeout=fn=>{timers.push(fn);return timers.length;}; window.clearTimeout=()=>{};
  window.setInterval=()=>1;window.clearInterval=()=>{};
  const context={window,document,CustomEvent:window.CustomEvent,console,localStorage:{getItem:()=>null,setItem(){}},setTimeout:window.setTimeout,clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync('js/user-auth.js','utf8'),context);
  return {api:window.kemalUserAuth,writes,timers,setProfile:v=>profile=v,setError:v=>error=v,emit:(event,next)=>{session=next;callback(event,next);},client,getCreates:()=>creates};
}

test('profile lookup failures never recreate or overwrite a registered teacher',async()=>{
  const h=authHarness();await h.api.ready();
  h.setError({message:'temporary network failure'});
  await assert.rejects(h.api.refresh());
  assert.equal(h.writes.length,0);
  assert.equal(h.api.getProfile().role,'teacher');assert.equal(h.api.getProfile().approval_status,'active');
  assert.ok(h.api.getState().error);
  h.setError(null);await h.api.refresh();assert.equal(h.api.getState().error,'');assert.equal(h.getCreates(),1);
});

test('initial profile error is recoverable without redirect or profile mutation',async()=>{
  const h=authHarness();h.setError({message:'503'});await h.api.ready();
  assert.ok(h.api.getState().error);assert.equal(h.writes.length,0);
  h.setError(null);await h.api.ready();assert.equal(h.api.getProfile().role,'teacher');
});

test('auth callbacks defer API calls and discard an old user after sign-out',async()=>{
  const h=authHarness();await h.api.ready();let calls=0;
  h.client.auth.getSession=async()=>{calls++;return{data:{session:null}};};
  h.emit('SIGNED_OUT',null);
  assert.equal(calls,0);assert.equal(h.api.getUser(),null);assert.equal(h.api.getProfile(),null);
  h.timers.pop()();await tick();assert.equal(calls,1);assert.equal(h.api.getUser(),null);
});

async function loginHarness(profile,error) {
  const {document}=parseHTML(fs.readFileSync('giris.html','utf8')); const window={};
  window.location={href:'/giris.html',search:''};
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'teacher-1',email:'teacher@example.com'}}}})},from(table){return{select(){return this;},eq(){return this;},maybeSingle:async()=>table==='admin_users'?{data:null}:{data:profile,error}};}};
  window.kemalUserAuth={getClient:()=>client,ready:async()=>{},getState:()=>({})};
  vm.runInNewContext(fs.readFileSync('js/giris.js','utf8'),{window,document,URLSearchParams,console});await tick();await tick();
  return {window,document};
}

test('login does not interpret a profile query failure as a new registration',async()=>{
  const h=await loginHarness(null,{message:'network'});assert.equal(h.window.location.href,'/giris.html');
  assert.match(h.document.getElementById('loginMessage').textContent,/yeniden deneyin/);
});
test('existing active and pending teachers route to their teacher panel',async()=>{
  for(const status of ['active','pending']){const h=await loginHarness({...teacher,approval_status:status},null);assert.equal(h.window.location.href,'/ogretmen-paneli.html');}
});
test('inactive accounts stay on login rather than bouncing between screens',async()=>{
  const h=await loginHarness({...teacher,active:false},null);assert.equal(h.window.location.href,'/giris.html');assert.match(h.document.getElementById('loginMessage').textContent,/pasif/);
});

async function registerHarness(profile,error) {
  const {document}=parseHTML(fs.readFileSync('kayit.html','utf8'));
  const writes=[];
  const window={location:{search:'?profil=tamamla',href:'/kayit.html?profil=tamamla',replace(url){this.href=url;}},setTimeout,clearTimeout};
  const client={auth:{getSession:async()=>({data:{session:{user:{id:teacher.id,email:teacher.email,user_metadata:{role:'student'}}}}})},from(){return{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:profile,error}),upsert(v){writes.push(v);return Promise.resolve({error:null});}};}};
  window.kemalUserAuth={getClient:()=>client,ready:async()=>{},getState:()=>({}),getPanelHref:p=>p.role==='teacher'?'/ogretmen-paneli.html':'/ogrenci-paneli.html'};
  vm.runInNewContext(fs.readFileSync('js/kayit.js','utf8'),{window,document,URLSearchParams,console,fetch:async()=>({ok:true,json:async()=>[]})});
  await tick();await tick();return {window,document,writes};
}
test('registration recognizes an existing teacher and never downgrades their role or approval',async()=>{
  const h=await registerHarness(teacher,null);assert.equal(h.window.location.href,'/ogretmen-paneli.html');assert.equal(h.writes.length,0);
});
test('registration profile failure keeps the user in place with an actionable error',async()=>{
  const h=await registerHarness(null,{message:'503'});assert.equal(h.window.location.href,'/kayit.html?profil=tamamla');assert.equal(h.writes.length,0);assert.match(h.document.getElementById('registerMessage').textContent,/yüklenemedi/);
});

async function panelHarness(profile,error,authError) {
  const {document}=parseHTML(fs.readFileSync('ogretmen-paneli.html','utf8'));
  const filters=[];
  const window={location:{href:'/ogretmen-paneli.html',origin:'https://test.invalid'},setTimeout:()=>1,clearTimeout(){},addEventListener(){}};
  const client={auth:{getSession:async()=>({data:{session:authError?.name==='AuthSessionMissingError'?null:{user:{id:teacher.id}}}}),getUser:async()=>({data:{user:{id:teacher.id,email:'CHANGED@example.com'}},error:authError})},from(table){return{select(){return this;},eq(key,value){filters.push({table,key,value});return this;},maybeSingle:async()=>({data:profile,error}),order:async()=>({data:[],error:null})};}};
  window.kemalUserAuth={getClient:()=>client,ready:async()=>{},getState:()=>({})};
  vm.runInNewContext(fs.readFileSync('js/ogretmen-paneli.js','utf8'),{window,document,URL,console,localStorage:{getItem:()=>null},setTimeout:window.setTimeout});
  await tick();await tick();return {window,document,filters};
}
test('teacher panel queries stable user id and retains active or pending teachers without registration redirects',async()=>{
  for(const status of ['active','pending']) {
    const h=await panelHarness({...teacher,approval_status:status},null);
    assert.equal(h.window.location.href,'/ogretmen-paneli.html');
    assert.ok(h.filters.some(f=>f.table==='user_profiles'&&f.key==='id'&&f.value===teacher.id));
    assert.equal(h.document.querySelector('.teacher-shell').classList.contains('teacher-loading'),false);
    assert.equal(h.document.querySelector('.teacher-shell').classList.contains('teacher-access-error'),false);
    assert.match(h.document.getElementById('teacherStatus').textContent,status==='active'?/Aktif öğretmen/:/onayı bekliyor/);
  }
});
test('teacher panel connection failure keeps a retry screen instead of a registration redirect',async()=>{
  const h=await panelHarness(null,{message:'temporary connection error'});
  assert.equal(h.window.location.href,'/ogretmen-paneli.html');
  assert.equal(h.document.querySelector('.teacher-shell').classList.contains('teacher-access-error'),true);
  assert.match(h.document.getElementById('teacherIntro').textContent,/Yenile/);
});
test('teacher panel distinguishes a missing session from a temporary auth outage',async()=>{
  const signedOut=await panelHarness(null,null,{name:'AuthSessionMissingError'});
  assert.equal(signedOut.window.location.href,'/giris.html');
  const outage=await panelHarness(null,null,{name:'AuthRetryableFetchError'});
  assert.equal(outage.window.location.href,'/ogretmen-paneli.html');
  assert.match(outage.document.getElementById('teacherIntro').textContent,/Yenile/);
});
