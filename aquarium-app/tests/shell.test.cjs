const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(path.join(__dirname,'../shared/mobile-shell.js'),'utf8');
function harness(host='kemalogretmenim.com.tr',pathname='/ogretmen/akvaryum.html'){
 const {window,document}=parseHTML('<html><head></head><body><main class="login-card"><p></p><div class="login-help-row"></div></main></body></html>');
 delete window.__aquariumShellInstalled;
 const alerts=[],exports=[];let fetches=0;
 const context={window,document,location:{hostname:host,protocol:'https:',origin:'https://'+host,pathname},fetch:async()=>{fetches++;return {blob:async()=>({size:40,text:async()=>'{"classes":[]}'})};}};
 window.alert=m=>alerts.push(m);vm.runInNewContext(source,context);
 return {window,document,context,alerts,exports,fetches:()=>fetches,install:()=>vm.runInNewContext(source,context)};
}
test('native layout is restricted to the owned HTTPS website and installed once',()=>{
 const own=harness();assert.equal(own.document.querySelectorAll('#aquariumNativeStyle').length,1);own.install();assert.equal(own.document.querySelectorAll('#aquariumNativeStyle').length,1);
 assert.ok(own.document.documentElement.classList.contains('aquarium-native'));
 const other=harness('evil.example');assert.equal(other.document.querySelectorAll('#aquariumNativeStyle').length,0);
 assert.ok(!source.includes('localStorage')&&!source.includes('access_token')&&!source.includes('refresh_token'),'shell must not bridge account tokens');
});
test('email login explains separate native session and Google account password setup',()=>{
 const h=harness('kemalogretmenim.com.tr','/giris.html');assert.match(h.document.querySelector('.login-card>p').textContent,/E-posta ve şifrenizle/);
 assert.match(h.document.body.textContent,/Google hesabınızla kayıt olduysanız/);assert.match(h.document.body.textContent,/oturumları ayrı/);
});
test('backup cannot be diverted to a port sent by an iframe or an untrusted script',async()=>{
 const h=harness();const fake=new h.window.Event('message');fake.data='aquarium-shell-port';fake.ports=[{postMessage:v=>h.exports.push(v)}];fake.source={};fake.isTrusted=true;h.window.dispatchEvent(fake);
 const a=h.document.createElement('a');a.href='blob:https://kemalogretmenim.com.tr/backup';a.download='yedek.json';h.document.body.append(a);
 a.dispatchEvent(new h.window.Event('click',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(h.fetches(),0);assert.equal(h.exports.length,0);
 fake.source=null;fake.isTrusted=false;h.window.dispatchEvent(fake);a.dispatchEvent(new h.window.Event('click',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(h.fetches(),0);
});
test('only a native-origin port receives JSON backup following an explicit download click',async()=>{
 const h=harness(),event=new h.window.Event('message');event.data='aquarium-shell-port';event.ports=[{postMessage:v=>h.exports.push(JSON.parse(v))}];event.source=null;event.isTrusted=true;h.window.dispatchEvent(event);
 const a=h.document.createElement('a');a.href='blob:https://kemalogretmenim.com.tr/backup';a.download='yedek.json';h.document.body.append(a);
 a.dispatchEvent(new h.window.Event('click',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(h.exports.length,1);assert.deepEqual(h.exports[0],{type:'exportBackup',name:'yedek.json',contents:'{"classes":[]}'});
 a.href='blob:https://evil.example/backup';a.dispatchEvent(new h.window.Event('click',{bubbles:true,cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(h.exports.length,1);
});

test('native parent sharing and clipboard use only the origin-bound port and do not navigate or touch account storage',()=>{
 const h=harness(),access={studentName:'Ada',className:'Birinciler',code:'11111111-1111-4111-8111-111111111111',url:'https://kemalogretmenim.com.tr/ogretmen/akvaryum.html?cocuk=11111111-1111-4111-8111-111111111111'};
 assert.equal(h.window.AquariumNativeShare.share(access,'system'),false);
 const event=new h.window.Event('message');event.data='aquarium-shell-port';event.ports=[{postMessage:v=>h.exports.push(JSON.parse(v))}];event.source=null;event.isTrusted=true;h.window.dispatchEvent(event);
 assert.equal(h.window.AquariumNativeShare.share(access,'whatsapp'),true);assert.equal(h.window.AquariumNativeShare.copy(access,'message'),true);
 assert.deepEqual(h.exports,[{type:'shareParent',...access,target:'whatsapp'},{type:'copyParent',...access,format:'message'}]);assert.equal(h.fetches(),0);
});
test('login pages cannot initiate parent-code exports even with an installed native port',()=>{
 const h=harness('kemalogretmenim.com.tr','/giris.html'),event=new h.window.Event('message');event.data='aquarium-shell-port';event.ports=[{postMessage:v=>h.exports.push(v)}];event.source=null;event.isTrusted=true;h.window.dispatchEvent(event);
 assert.equal(h.window.AquariumNativeShare.share({code:'fake'},'system'),false);assert.equal(h.exports.length,0);
});
