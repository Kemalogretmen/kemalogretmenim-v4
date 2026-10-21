const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const html=fs.readFileSync('ogretmen/akvaryum.html','utf8');
const guard=html.match(/<script id="aquariumStartupGuard">([\s\S]*?)<\/script>/)[1];
function fixture(){
 const {document}=parseHTML(html),timers=new Map(),events=new Map();let id=0;
 const window={setTimeout(fn,delay){timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key),addEventListener:(type,fn)=>events.set(type,fn)};
 vm.runInNewContext(guard,{window,document});
 return {document,api:window.AquariumStartup,timers,error:type=>events.get(type)({target:type==='error'?document.createElement('script'):window}),expire(){const entry=[...timers][0];assert.ok(entry);timers.delete(entry[0]);entry[1].fn();}};
}
test('missing scripts and runtime startup errors show recovery instead of an endless access check',()=>{
 for(const type of ['error','unhandledrejection']){
  const h=fixture();h.error(type);
  assert.equal(h.document.body.classList.contains('access-pending'),true);assert.match(h.document.getElementById('accessMessage').textContent,/başlatılamadı/);
  assert.equal(h.document.querySelector('#accessGate a[href=""]').textContent,'Sayfayı yeniden yükle');
  assert.ok(h.document.querySelector('.preview-access a[href="?demo=1"]'));assert.equal(h.timers.size,0);
 }
});
test('startup watchdog has bounded phases and never overwrites a completed access decision',()=>{
 const h=fixture();h.api.phase('Öğretmen oturumu doğrulanıyor…');assert.equal(h.timers.size,1);h.expire();assert.match(h.document.getElementById('accessMessage').textContent,/başlatılamadı/);
 const success=fixture();success.document.body.classList.remove('access-pending');success.api.ready();success.error('unhandledrejection');assert.equal(success.timers.size,0);assert.equal(success.document.body.classList.contains('access-pending'),false);
 const blocked=fixture();blocked.document.getElementById('accessMessage').textContent='Hesap onay bekliyor.';blocked.api.blocked();blocked.error('error');assert.equal(blocked.document.getElementById('accessMessage').textContent,'Hesap onay bekliyor.');assert.equal(blocked.timers.size,0);
});
test('aquarium loads the pinned local auth library before account initialization and preserves ordinary access rules',()=>{
 const vendor='/js/vendor/supabase-2.118.0.min.js',auth='/js/user-auth.js?v=20261021-access-v5';
 assert.ok(html.indexOf(vendor)<html.indexOf(auth));assert.ok(fs.existsSync('.'+vendor));assert.match(fs.readFileSync('js/vendor/supabase-2.118.0.LICENSE','utf8'),/MIT License/);
 const source=fs.readFileSync('js/akvaryum.js','utf8');assert.match(source,/profile\?\.approval_status !== 'active'/);assert.match(source,/window\.AquariumStartup\?\.ready\(\)/);
 assert.doesNotMatch(guard,/localStorage|sessionStorage|fetch\(|getSession\(|getClient\(/);
});
