const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const C = require('../js/akvaryum-core.js');

test('private share projection retains approved sharing fields without history and keeps legacy visibility flags', () => {
  const window = { AquariumCosmetics:require('../js/akvaryum-cosmetics.js'), AquariumCore:C };
  vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'), {window});
  const cls=C.newClass('2-A'), s=C.newStudent('Deniz'); cls.students.push(s);
  const d=C.ensureDay(s,cls); d.tasks[0].status='done'; C.feed(s);
  let data=window.AquariumSharing.snapshot(cls,{names:false,points:false,motion:true,chat:true});
  assert.equal(data.students[0].name,''); assert.equal(data.students[0].points,null);
  assert.deepEqual(Object.keys(data.students[0]).sort(),['appearance','id','mood','name','points','shareName','sharePoints','species']);
  assert.equal(JSON.stringify(data).includes('Kitabımı'),false);assert.equal(data.students[0].shareName,'Deniz');assert.equal(data.students[0].sharePoints,1);
  data=window.AquariumSharing.snapshot(cls,{names:true,points:true});
  assert.equal(data.students[0].points,1); assert.equal(data.students[0].name,'Deniz');
});

test('shared appearance contains only approved cosmetic IDs and never carries private customization data',()=>{
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
 const cls=C.newClass('Sınıf'),s=C.newStudent('Ada');cls.students=[s];cls.customization={enabled:true,collectionUnlocked:false};
 s.cosmetics={accessory:'shell',palette:'pearl',url:'PRIVATE-UPLOAD',points:999};
 let doc=window.AquariumSharing.snapshot(cls,{names:true,points:false});assert.equal(doc.settings.customization,true);
 assert.deepEqual(JSON.parse(JSON.stringify(doc.students[0].appearance.cosmetics)),{accessory:'shell',palette:'pearl'});assert.ok(!JSON.stringify(doc).includes('PRIVATE-UPLOAD'));
 s.cosmetics.accessory='star';doc=window.AquariumSharing.snapshot(cls,{names:true});assert.equal(doc.students[0].appearance.cosmetics.accessory,'none');
 cls.customization.enabled=false;doc=window.AquariumSharing.snapshot(cls,{names:true});assert.equal(doc.students[0].appearance.cosmetics.palette,'original');assert.equal(s.cosmetics.palette,'pearl');
});
test('parents see all approved outfits but only the own child score and cannot open the customization editor',async()=>{
 const snapshot={theme:'reef',settings:{names:true,points:true,customization:true,motion:true},students:[
 {id:'my-child',name:'Ada',species:'clown',mood:'happy',points:12,appearance:{egg:false,scale:.6,cosmetics:{accessory:'sailor',palette:'original'}}},
 {id:'peer-two',name:'Ece',species:'betta',mood:'happy',points:999,appearance:{egg:false,scale:.8,cosmetics:{accessory:'shell',palette:'original'}}}]};
 const h=await viewerHarness(snapshot,'?cocuk=11111111-1111-4111-8111-111111111111'),d=h.document;
 assert.equal(d.querySelectorAll('.fish .fish-accessory').length,2);assert.equal(d.querySelector('.parent-child .fish-points').textContent,'★ 12');assert.equal(d.querySelector('[data-id="view-peer-two"] .fish-points').hidden,true);
 assert.equal(d.querySelector('#cosmeticsForm'),null);assert.deepEqual(h.io(),{reads:0,writes:0});
});
test('shared characters render their actual identity without revealing the milestone flag or changing visitor permissions',async()=>{
 const h=await viewerHarness({theme:'reef',settings:{names:true,points:false,motion:true},students:[
 {id:'a',name:'Ada',species:'spongebob',mood:'happy',appearance:{egg:false,scale:1}},
 {id:'b',name:'Ece',species:'lina',mood:'calm',appearance:{egg:false,scale:.7}},
 {id:'c',name:'Deniz',species:'mrkrabs',mood:'happy',appearance:{egg:false,scale:1}}]});
 assert.ok(h.document.querySelector('[data-species="spongebob"]'));assert.ok(h.document.querySelector('[data-species="lina"]'));assert.ok(h.document.querySelector('[data-species="mrkrabs"]'));
 assert.equal(h.document.querySelectorAll('.fish-points:not([hidden])').length,0);assert.equal(h.document.querySelector('#chooseForm'),null);assert.deepEqual(h.io(),{reads:0,writes:0});
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});const cls=C.newClass('Sınıf'),s=C.newStudent('Ada');s.species='patrick';s.characterUnlocked=true;cls.students=[s];
 assert.equal(JSON.stringify(window.AquariumSharing.snapshot(cls,{})).includes('characterUnlocked'),false);
});
test('settings remain compatible with old backups and clamp unsafe input', () => {
  const old=C.initialState(); old.settings={names:true,motion:true};
  assert.equal(C.validate(old).settings.points,false);
  const updated=C.settingsOf({points:true,chat:false,feedSound:false,sound:'fun',volume:6});
  assert.equal(updated.volume,1); assert.equal(updated.sound,'fun');
  old.settings=updated; assert.deepEqual(C.validate(old).settings,updated);
  assert.equal(C.settingsOf({sound:'bad',volume:NaN}).sound,'off');
  assert.equal(C.settingsOf().lightMotion,true);assert.equal(C.settingsOf().waterWaves,false);
  assert.equal(C.settingsOf({lightMotion:false,waterWaves:true}).lightMotion,false);
  assert.equal(C.settingsOf({lightMotion:false,waterWaves:true}).waterWaves,true);
  const window={AquariumCosmetics:require('../js/akvaryum-cosmetics.js'), AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
  const shared=window.AquariumSharing.snapshot(C.newClass('Test'),{lightMotion:false,waterWaves:true});
  assert.equal(shared.settings.lightMotion,false);assert.equal(shared.settings.waterWaves,true);
  assert.deepEqual(C.waterSettings({bubbleAmount:-20,lightStrength:Infinity,waveStrength:999}),{bubbleAmount:50,lightStrength:100,waveStrength:150});
  assert.equal(C.settingsOf().teacherEncouragement,false);
  const privateCue=window.AquariumSharing.snapshot(C.newClass('Test'),{teacherEncouragement:true,bubbleAmount:150,lightStrength:125,waveStrength:50});
  assert.equal(privateCue.settings.bubbleAmount,150);assert.equal(privateCue.settings.lightStrength,125);assert.equal(privateCue.settings.waveStrength,50);assert.equal(privateCue.settings.teacherEncouragement,undefined);
});

async function viewerHarness(snapshot,search='?izle=11111111-1111-4111-8111-111111111111') {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen/akvaryum.html','utf8'));
  const intervals=[],frames=[]; let response=snapshot,report=null,reads=0,writes=0,rafId=0,clock=0; const urls=[],requests=[];
  const localStorage={getItem(){reads++;throw Error('Viewer must not read teacher storage');},setItem(){writes++;}};
  window.AquariumSocial=require('../js/akvaryum-social.js');
  window.AquariumExpressive=require('../js/akvaryum-expressive.js');
  window.AquariumCosmetics=require('../js/akvaryum-cosmetics.js');
  window.AquariumCore=C;window.AquariumTimer=require('../js/akvaryum-timer.js');window.AquariumMotion=require('../js/akvaryum-motion.js'); window.AquariumAudio={stop(){}};
  window.kemalSiteStore={getConfig:()=>({supabaseUrl:'https://example.invalid',supabaseAnonKey:'public-key'})};
  window.matchMedia=()=>({matches:false,addEventListener(){}});
  for (const el of document.querySelectorAll('*')) el.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});
  const area=document.getElementById('swimArea');Object.defineProperty(area,'clientWidth',{get:()=>document.body.classList.contains('access-pending')?0:900});Object.defineProperty(area,'clientHeight',{get:()=>document.body.classList.contains('access-pending')?0:600});
  const modal=document.getElementById('modal');modal.close=()=>{modal.open=false;};modal.showModal=()=>{modal.open=true;};
  document.exitFullscreen=async()=>{document.fullscreenElement=null;document.dispatchEvent(new window.Event('fullscreenchange'));};
  const context={window,document,localStorage,location:{search,pathname:'/ogretmen/akvaryum.html',origin:'http://localhost'},URLSearchParams,URL,AbortController,performance:{now:()=>clock},console,
    setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},requestAnimationFrame:fn=>{const tick=now=>{clock=now;fn(now);};tick.id=++rafId;frames.push(tick);return tick.id;},cancelAnimationFrame:id=>{const at=frames.findIndex(fn=>fn.id===id);if(at>=0)frames.splice(at,1);},ResizeObserver:class{observe(){}},
    fetch:async(url,options)=>{urls.push(url);const body=JSON.parse(options.body);requests.push({url,body});const value=url.endsWith('view_aquarium_child_history')?(typeof report==='function'?await report(body):report):response;return {ok:true,json:async()=>value};}};
  await vm.runInNewContext(fs.readFileSync('js/akvaryum.js','utf8'),context);
  return {window,document,intervals,frames,urls,requests,setResponse(value){response=value;},setReport(value){report=value;},io:()=>({reads,writes})};
}

test('visitor refreshes retain fish and teacher identity, positions and one continuing animation loop',async()=>{
  const snapshot={name:'Class',theme:'reef',teacher:{name:'Teacher',species:'turtle'},settings:{names:true,points:true,motion:true},students:[{id:'a',name:'Ada',species:'tang',mood:'happy',points:8},{id:'b',name:'Deniz',species:'clown',mood:'happy',points:5}]};
  const h=await viewerHarness(snapshot),originals=[...h.document.querySelectorAll('.fish')];let now=100;
  for(let poll=0;poll<12;poll++) {
    for(let i=0;i<80;i++){now+=40;h.frames.shift()(now);}
    const positions=originals.map(f=>f.style.transform);
    h.setResponse({...snapshot,students:(poll%2?[...snapshot.students].reverse():snapshot.students).map(s=>({...s,points:s.points+poll}))});
    await h.intervals[1]();
    for(let i=0;i<originals.length;i++){assert.equal(h.document.querySelector('[data-id="'+originals[i].dataset.id+'"]'),originals[i]);assert.equal(originals[i].style.transform,positions[i]);}
    assert.equal(h.frames.length,1);
  }
});

test('a visitor tab becoming hidden or a temporary failed refresh does not lose its identity or strand recovery',async()=>{
 const snapshot={theme:'reef',settings:{names:true,motion:true},students:[{id:'a',name:'Ada',species:'tang',mood:'happy'}]};
 const h=await viewerHarness(snapshot),fish=h.document.querySelector('.fish');let now=100;
 for(let i=0;i<80;i++){now+=40;h.frames.shift()(now);}const position=fish.style.transform;
 Object.defineProperty(h.document,'hidden',{value:true,writable:true});h.document.dispatchEvent(new h.window.Event('visibilitychange'));
 assert.equal(h.document.querySelector('.fish'),fish);h.document.hidden=false;h.document.dispatchEvent(new h.window.Event('visibilitychange'));await new Promise(r=>setImmediate(r));
 assert.equal(h.document.querySelector('.fish'),fish);assert.equal(fish.style.transform,position);assert.equal(h.frames.length,1);
 h.setResponse(null);await h.intervals[1]();assert.equal(h.document.querySelectorAll('.fish').length,0);
 h.setResponse(snapshot);await h.intervals[1]();assert.equal(h.document.querySelectorAll('.fish').length,1);
});
test('parents only open their own read-only filtered history; peers have neither scores nor actions',async()=>{
  const token='11111111-1111-4111-8111-111111111111',h=await viewerHarness({viewScope:'class',theme:'reef',settings:{names:true,points:true,motion:true},students:[{id:'my-child',name:'Ada',species:'clown',mood:'happy',points:7},{id:'peer-b',name:'Deniz',species:'tang',mood:'happy',points:999}]},'?cocuk='+token);
  const own=h.document.querySelector('.parent-child'),peer=h.document.querySelector('[data-id="view-peer-b"]');
  assert.equal(own.disabled,false);assert.equal(peer.disabled,true);assert.equal(peer.querySelector('.fish-points').hidden,true);assert.equal(peer.getAttribute('aria-label').includes('999'),false);
  h.setReport(body=>({period:body.p_period,name:'Ada',asOf:new Date().toISOString(),currentTotal:7,allTimeTotal:12,periodTotal:7,earned:7,deducted:0,count:1,hasMore:false,events:[{date:C.dayKey(),title:'<img src=x onerror=alert(1)> Kitap',icon:'📖',points:7,awardedAt:0,season:'Bu sezon'}]}));
  own.dispatchEvent(new h.window.Event('click',{bubbles:true}));await new Promise(r=>setImmediate(r));
  assert.equal(h.document.getElementById('modal').open,true);assert.equal(h.document.querySelectorAll('.parent-history-entry').length,1);
  assert.equal(h.document.querySelectorAll('#modal img,#modal [data-action="feed"],#modal [data-action="revoke-point"]').length,0);
  for(const period of ['week','month','all']) {
    const select=h.document.getElementById('parentHistoryPeriod');select.querySelector('[value="'+period+'"]').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
    const request=h.requests.at(-1);assert.deepEqual(Object.keys(request.body).sort(),['p_offset','p_period','p_token']);assert.equal(request.body.p_token,token);assert.equal(request.body.p_period,period);
  }
  const peerClick=h.document.createElement('button');peerClick.dataset.action='fish-behaviors';peerClick.dataset.id=peer.dataset.id;h.document.body.append(peerClick);const requests=h.requests.length;
  peerClick.dispatchEvent(new h.window.Event('click',{bubbles:true}));assert.equal(h.requests.length,requests);
  assert.deepEqual(h.io(),{reads:0,writes:0});
  h.setResponse(null);await h.intervals[1]();assert.equal(h.document.getElementById('modal').open,false);assert.equal(h.document.querySelectorAll('.fish').length,0);
});

test('slow older filter responses cannot replace a newer parent history period',async()=>{
  const h=await viewerHarness({theme:'reef',settings:{names:true,motion:true},students:[{id:'my-child',name:'Ada',species:'clown',mood:'happy'}]},'?cocuk=11111111-1111-4111-8111-111111111111');let finish;
  const response=(period,title)=>({period,name:'Ada',asOf:new Date().toISOString(),currentTotal:1,allTimeTotal:1,periodTotal:1,earned:1,deducted:0,count:1,hasMore:false,events:[{date:C.dayKey(),title,icon:'',points:1,awardedAt:0,season:'Bu sezon'}]});
  h.setReport(body=>body.p_period==='day'?new Promise(r=>finish=()=>r(response('day','Stale day'))):response('all','Latest all'));
  h.document.querySelector('.parent-child').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  const select=h.document.getElementById('parentHistoryPeriod');select.querySelector('[value="all"]').selected=true;select.dispatchEvent(new h.window.Event('change',{bubbles:true}));await new Promise(r=>setImmediate(r));
  finish();await new Promise(r=>setImmediate(r));assert.match(h.document.getElementById('modalContent').textContent,/Latest all/);assert.doesNotMatch(h.document.getElementById('modalContent').textContent,/Stale day/);
});

test('new coral theme and animals stay read-only; refreshing points preserves the bubble animation nodes',async()=>{
  const snapshot={name:'Mercan sınıfı',theme:'coral-island',settings:{names:true,points:true,motion:true},
    students:C.SPECIES.slice(-6).map(s=>({id:s.id,name:s.name,species:s.id,mood:'happy',points:3}))};
  const h=await viewerHarness(snapshot);
  const layer=h.document.getElementById('bubbles'),firstBubble=layer.firstElementChild;
  assert.equal(h.document.getElementById('aquarium').dataset.theme,'coral-island');
  assert.match(h.document.getElementById('aquarium').style.backgroundImage,/mercan-adasi\.jpg/);
  assert.equal(layer.children.length,14);
  for(const fish of h.document.querySelectorAll('.fish')) {
    assert.equal(fish.disabled,true);
    assert.ok(C.SPECIES.slice(-6).some(s=>s.id===fish.dataset.species));
  }
  for(const tick of h.intervals) await tick();
  assert.equal(layer.firstElementChild,firstBubble,'score refresh must not restart the bubbles');
  h.setResponse({...snapshot,theme:'lagoon'});
  for(const tick of h.intervals) await tick();
  assert.equal(h.document.getElementById('aquarium').dataset.theme,'lagoon');
  assert.notEqual(layer.firstElementChild,firstBubble);
  assert.deepEqual(h.io(),{reads:0,writes:0});
});

test('viewer reads only the published snapshot, cannot open management, and removes fish after revocation',async()=>{
  const h=await viewerHarness({name:'Test sınıfı',theme:'reef',settings:{names:true,points:false},students:[{id:'one',name:'Deniz',species:'tang',mood:'happy',points:null}]});
  assert.equal(h.document.querySelectorAll('.fish').length,1);
  assert.equal(h.document.querySelector('.fish-name').textContent,'Deniz');
  assert.equal(h.document.querySelector('.fish').disabled,true);
  h.document.querySelector('[data-action="settings"]').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  h.document.querySelector('[data-action="find-student"]').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  h.document.querySelector('.fish').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  assert.equal(h.document.querySelector('.fish-hunger').hidden,true);
  h.document.fullscreenElement=h.document.getElementById('aquariumApp');
  h.document.dispatchEvent(new h.window.Event('fullscreenchange'));
  assert.equal(h.document.querySelector('[data-action="fullscreen"]').getAttribute('aria-label'),'Tam ekrandan çık');
  for(const action of ['activities','group-reward','goal','timer','sound','themes','toggle-sound']) {
    const button=h.document.createElement('button');button.dataset.action=action;h.document.body.append(button);button.dispatchEvent(new h.window.Event('click',{bubbles:true}));
  }
  assert.equal(h.document.querySelector('.student-facts'),null);
  assert.equal(h.document.querySelector('#goalForm'),null);
  assert.equal(h.document.querySelector('#timerForm'),null);
  assert.equal(h.document.querySelector('#groupRewardForm'),null);
  assert.equal(h.document.getElementById('modal').open,undefined);
  assert.deepEqual(h.io(),{reads:0,writes:0});
  h.setResponse(null); await h.intervals[1]();
  assert.equal(h.document.querySelectorAll('.fish').length,0);
  assert.equal(h.document.fullscreenElement,null);
  assert.equal(h.document.body.classList.contains('access-pending'),true);
  assert.match(h.document.getElementById('accessMessage').textContent,/kapalı/);
});

test('closed links fail closed without reading any local teacher data',async()=>{
  const h=await viewerHarness(null);
  assert.equal(h.document.body.classList.contains('access-pending'),true);
  assert.equal(h.document.querySelectorAll('.fish').length,0);
  assert.deepEqual(h.io(),{reads:0,writes:0});
});

test('empty shared classrooms do not invent demonstration fish',async()=>{
  const h=await viewerHarness({name:'Empty',theme:'reef',settings:{names:false,points:false},students:[]});
  assert.equal(h.document.querySelectorAll('.fish').length,0);
  assert.deepEqual(h.io(),{reads:0,writes:0});
});

test('class pearl aggregates lifetime earned points without spending food or exposing hidden individual scores',()=>{
 const window={AquariumCosmetics:require('../js/akvaryum-cosmetics.js'), AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
 const cls=C.newClass('2-A');cls.students=[C.newStudent('Ada'),C.newStudent('Ege')];
 cls.students.forEach(s=>{C.ensureDay(s,cls).tasks[0].status='done';C.feed(s);});
 const data=window.AquariumSharing.snapshot(cls,{names:false,points:false,classPoints:true});
 assert.equal(data.classPoints,2);assert.ok(data.students.every(s=>s.points===null&&s.name===''));
 assert.equal(window.AquariumSharing.snapshot(cls,{classPoints:false}).classPoints,null);
 assert.equal(C.settingsOf().classPoints,false);assert.equal(C.settingsOf({classPoints:true,sound:'ocean'}).sound,'ocean');
});
test('nameless viewing keeps optional points above the fish and supports an independent class pearl',async()=>{
 const h=await viewerHarness({theme:'reef',settings:{names:false,points:true,classPoints:true},classPoints:345,students:[{id:'a',name:'',species:'clown',mood:'happy',points:123}]});
 assert.equal(h.document.querySelector('.fish-name').hidden,true);
 assert.equal(h.document.querySelector('.fish').style.opacity,'');
 assert.equal(h.document.querySelector('.fish').disabled,true);
 assert.equal(h.document.querySelector('.fish-points').textContent,'★ 123');
 assert.equal(h.document.querySelector('.fish-points').hidden,false);
 assert.equal(h.document.getElementById('classPearl').hidden,false);
 assert.equal(h.document.getElementById('classPearlScore').textContent,'345');
});
test('child codes call a separate RPC, never show the class pearl and never access teacher storage',async()=>{
 const h=await viewerHarness({theme:'reef',settings:{names:true,points:true,classPoints:true},classPoints:123456,students:[{id:'my-child',name:'Deniz',species:'clown',mood:'happy',points:7}]},'?cocuk=11111111-1111-4111-8111-111111111111');
 assert.match(h.urls[0],/view_aquarium_child$/);assert.equal(h.document.querySelectorAll('.fish').length,1);
 assert.equal(h.document.getElementById('classPearl').hidden,true);assert.deepEqual(h.io(),{reads:0,writes:0});
 h.setResponse(null);await h.intervals[1]();assert.equal(h.document.querySelectorAll('.fish').length,0);
});
test('parent code entry never loads teacher data or starts an anonymous class preview',async()=>{
 const h=await viewerHarness(null,'?veli=1');
 assert.equal(h.urls.length,0);assert.deepEqual(h.io(),{reads:0,writes:0});
 assert.equal(h.document.querySelectorAll('.parent-code-form').length,1);
 assert.equal(h.document.querySelectorAll('.fish').length,0);
});

test('swimmers turn gradually inside scene bounds and keep scores clear of the upper edge',async()=>{
 const h=await viewerHarness({theme:'reef',settings:{names:true,points:true,motion:true},students:[{id:'a',name:'Ada',species:'clown',mood:'happy',points:1}]});
 const fish=h.document.querySelector('.fish'), art=fish.querySelector('.fish-side');
 let previousAngle=0,turnFrames=0,maxAngle=0;
 for(let i=1;i<=1800;i++) {
  const frame=h.frames.pop();assert.equal(typeof frame,'function');frame(i*50);
  const angle=Number(art.style.transform.match(/rotateY\(([-.\d]+)deg\)/)[1]);
  assert.ok(Math.abs(angle-previousAngle)<10,'turn must never instantly flip');
  if(angle>1&&angle<179)turnFrames++;maxAngle=Math.max(maxAngle,angle);previousAngle=angle;
  const position=fish.style.transform.match(/translate3d\(([-.\d]+)px,([-.\d]+)px/);
  assert.ok(Number(position[1])>=0&&Number(position[1])<900);
  assert.ok(Number(position[2])>=26,'point label must remain inside scene');
 }
 assert.ok(turnFrames>20);assert.equal(maxAngle,180);
});

test('growth appearance is shared while thresholds, hidden names and corrected feed records remain private',()=>{
 const window={AquariumCosmetics:require('../js/akvaryum-cosmetics.js'), AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
 const cls=C.newClass('Sınıf'),s=C.newStudent('Deniz');cls.students.push(s);C.ensureDay(s,cls);
 cls.teacher={name:'Gizli öğretmen',species:'turtle',enabled:true};cls.growth={enabled:true,thresholds:C.defaultThresholds()};
 C.completeAndFeed(s,C.dayKey(),cls.tasks[0].id);C.correctAward(s,C.dayKey(),cls.tasks[0].id);
 const data=window.AquariumSharing.snapshot(cls,{points:false,names:false});
 assert.equal(data.students.length,1);assert.equal(data.students[0].points,null);
 assert.equal(data.teacher.name,'');assert.equal(data.students[0].appearance.egg,true);
 for(const privateText of ['growth','thresholds','Gizli','creditReversed','feeds']) assert.equal(JSON.stringify(data).includes(privateText),false);
});

test('visitors see current eggs, growth and teacher fish with every management action disabled',async()=>{
 const h=await viewerHarness({theme:'reef',teacher:{name:'Öğretmen',species:'tang'},settings:{names:true,points:false},students:[{id:'a',name:'Ada',species:'clown',mood:'calm',appearance:{egg:true,scale:.5,trophy:false}}]});
 assert.equal(h.document.querySelectorAll('.fish').length,2);assert.equal(h.document.querySelectorAll('.is-egg').length,1);assert.ok([...h.document.querySelectorAll('.fish')].every(el=>el.disabled));
 assert.ok(h.document.querySelector('.is-egg .egg-embryo').src.endsWith('/palyaco-baligi.webp'));
 h.setResponse({theme:'reef',settings:{names:true,points:true},students:[{id:'a',name:'Ada',species:'clown',mood:'happy',points:20,appearance:{egg:false,scale:.55,trophy:false}}]});await h.intervals[1]();
 assert.equal(h.document.querySelectorAll('.is-egg').length,0);assert.equal(h.document.querySelector('.fish').style.getPropertyValue('--growth-scale'),.55);assert.equal(h.document.querySelector('.fish-points').textContent,'★ 20');assert.deepEqual(h.io(),{reads:0,writes:0});
});


test('deleting a class closes its child codes and class link before clearing the shared snapshot',async()=>{
 for(const fail of ['', 'aquarium_student_links','aquarium_shares']) {
  const writes=[];
  const client={from(table){let op={table,filters:[]};return {
   select(){return this;},eq(k,v){op.filters.push([k,v]);return this;},
   maybeSingle:async()=>({data:{id:'share-1',enabled:true}}),
   update(value){op.value=value;return this;},
   delete(){op.deleted=true;return this;},
   then(resolve){writes.push(op);resolve({data:[{id:'share-1'}],error:table===fail?{message:'offline'}:null});}
  };}};
  const window={AquariumCosmetics:require('../js/akvaryum-cosmetics.js'), AquariumCore:C,kemalUserAuth:{getClient:()=>client,getUser:()=>({id:'owner-1'})}};
  vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window,crypto:{randomUUID:()=> 'rotated-token'},AbortController,setTimeout,clearTimeout});
  if(fail)await assert.rejects(window.AquariumSharing.removeClass('class-1'),/Sınıf silinmedi/);
  else await window.AquariumSharing.removeClass('class-1');
  assert.equal(writes[0].table,'aquarium_student_links');assert.equal(writes[0].deleted,true);
  assert.equal(JSON.stringify(writes[0].filters),JSON.stringify([['share_id','share-1']]));
  if(fail==='aquarium_student_links')assert.equal(writes.length,1);
  else {assert.equal(writes[1].value.enabled,false);assert.equal(JSON.stringify(writes[1].value.snapshot),'{}');assert.equal(writes[1].value.token,'rotated-token');assert.ok(writes[1].filters.some(([k,v])=>k==='owner_id'&&v==='owner-1'));}
 }
});

test('read-only viewers see absent fish resting without losing their hatched appearance',async()=>{
 const h=await viewerHarness({theme:'reef',settings:{names:true,points:true,motion:true},students:[{id:'a',name:'Ada',species:'clown',mood:'resting',points:20,appearance:{egg:false,scale:.55,trophy:false}}]});
 const f=h.document.querySelector('.fish');assert.equal(f.classList.contains('is-egg'),false);assert.equal(f.classList.contains('is-absent'),true);
 const position=f.style.transform,art=f.querySelector('.fish-art').style.transform;
 for(let i=1;i<=200;i++)h.frames.pop()(i*50);
 assert.equal(f.style.transform,position);assert.equal(f.querySelector('.fish-art').style.transform,art);
 assert.equal(f.disabled,true);assert.equal(f.querySelector('.fish-points').textContent,'★ 20');assert.deepEqual(h.io(),{reads:0,writes:0});
});
test('parent class view preserves every current growth size while only the own child shows a score',async()=>{
 const snapshot={viewScope:'class',settings:{names:true,points:true,motion:true,classPoints:false},students:[
  {id:'my-child',name:'Ada',species:'betta',mood:'happy',points:25,appearance:{egg:false,scale:.5,trophy:false}},
  {id:'peer-two',name:'Ece',species:'tang',mood:'happy',points:null,appearance:{egg:false,scale:.8,trophy:false}},
  {id:'peer-three',name:'Deniz',species:'clown',mood:'happy',points:null,appearance:{egg:true,scale:.35,trophy:false}}]};
 const h=await viewerHarness(snapshot,'?cocuk=11111111-1111-4111-8111-111111111111'),d=h.document;
 assert.equal(d.querySelectorAll('.fish').length,3);assert.equal(d.querySelectorAll('.daily-champion-medal').length,0);
 assert.equal(d.querySelector('.parent-child .fish-points').hidden,false);assert.equal(d.querySelector('.parent-child .fish-points').textContent,'★ 25');
 const peer=d.querySelector('[data-id="view-peer-two"]');assert.equal(Number(peer.style.getPropertyValue('--growth-scale')),.8);
 assert.equal(peer.querySelector('.fish-name').textContent,'Ece');assert.equal(peer.querySelector('.fish-points').hidden,true);
 assert.ok(d.querySelector('[data-id="view-peer-three"]').classList.contains('is-egg'));
});
test('a scoreless visitor view has no score or trophy in labels even if an unexpected response includes one',async()=>{
 const h=await viewerHarness({settings:{names:true,points:false,classPoints:false,motion:true},classPoints:777,
 students:[{id:'one',name:'Ada',species:'clown',mood:'happy',points:777,appearance:{egg:false,scale:.6,trophy:true}}]});
 const d=h.document,fish=d.querySelector('.fish');assert.equal(fish.querySelector('.fish-points').hidden,true);
 assert.equal(fish.querySelector('.fish-name').textContent,'Ada');assert.doesNotMatch(fish.getAttribute('aria-label'),/777/);
 assert.equal(fish.querySelector('.fish-points').textContent,'★ 0');assert.equal(d.getElementById('classPearl').hidden,true);
 assert.equal(d.getElementById('classPearlScore').textContent,'0');
});
