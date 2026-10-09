const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const C = require('../js/akvaryum-core.js');

test('public projection never includes task history, feeds or hidden names/points', () => {
  const window = { AquariumCore:C };
  vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'), {window});
  const cls=C.newClass('2-A'), s=C.newStudent('Deniz'); cls.students.push(s);
  const d=C.ensureDay(s,cls); d.tasks[0].status='done'; C.feed(s);
  let data=window.AquariumSharing.snapshot(cls,{names:false,points:false,motion:true,chat:true});
  assert.equal(data.students[0].name,''); assert.equal(data.students[0].points,null);
  assert.deepEqual(Object.keys(data.students[0]).sort(),['appearance','id','mood','name','points','species']);
  assert.equal(JSON.stringify(data).includes('Kitabımı'),false);
  data=window.AquariumSharing.snapshot(cls,{names:true,points:true});
  assert.equal(data.students[0].points,1); assert.equal(data.students[0].name,'Deniz');
});

test('settings remain compatible with old backups and clamp unsafe input', () => {
  const old=C.initialState(); old.settings={names:true,motion:true};
  assert.equal(C.validate(old).settings.points,false);
  const updated=C.settingsOf({points:true,chat:false,feedSound:false,sound:'fun',volume:6});
  assert.equal(updated.volume,1); assert.equal(updated.sound,'fun');
  old.settings=updated; assert.deepEqual(C.validate(old).settings,updated);
  assert.equal(C.settingsOf({sound:'bad',volume:NaN}).sound,'off');
});

async function viewerHarness(snapshot,search='?izle=11111111-1111-4111-8111-111111111111') {
  const {window,document}=parseHTML(fs.readFileSync('ogretmen/akvaryum.html','utf8'));
  const intervals=[],frames=[]; let response=snapshot, reads=0, writes=0; const urls=[];
  const localStorage={getItem(){reads++;throw Error('Viewer must not read teacher storage');},setItem(){writes++;}};
  window.AquariumCore=C;window.AquariumTimer=require('../js/akvaryum-timer.js');window.AquariumMotion=require('../js/akvaryum-motion.js'); window.AquariumAudio={stop(){}};
  window.kemalSiteStore={getConfig:()=>({supabaseUrl:'https://example.invalid',supabaseAnonKey:'public-key'})};
  window.matchMedia=()=>({matches:false,addEventListener(){}});
  for (const el of document.querySelectorAll('*')) el.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:700});
  const area=document.getElementById('swimArea');Object.defineProperty(area,'clientWidth',{value:900});Object.defineProperty(area,'clientHeight',{value:600});
  const modal=document.getElementById('modal'); modal.close=()=>{modal.open=false;};
  const context={window,document,localStorage,location:{search,pathname:'/ogretmen/akvaryum.html',origin:'http://localhost'},URLSearchParams,URL,AbortController,performance,console,
    setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval(){},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}},
    fetch:async(url)=>{urls.push(url);return {ok:true,json:async()=>response};}};
  await vm.runInNewContext(fs.readFileSync('js/akvaryum.js','utf8'),context);
  return {window,document,intervals,frames,urls,setResponse(value){response=value;},io:()=>({reads,writes})};
}

test('viewer reads only the published snapshot, cannot open management, and removes fish after revocation',async()=>{
  const h=await viewerHarness({name:'Test sınıfı',theme:'reef',settings:{names:true,points:false},students:[{id:'one',name:'Deniz',species:'tang',mood:'happy',points:null}]});
  assert.equal(h.document.querySelectorAll('.fish').length,1);
  assert.equal(h.document.querySelector('.fish-name').textContent,'Deniz');
  assert.equal(h.document.querySelector('.fish').disabled,true);
  h.document.querySelector('[data-action="settings"]').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  h.document.querySelector('[data-action="find-student"]').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  h.document.querySelector('.fish').dispatchEvent(new h.window.Event('click',{bubbles:true}));
  assert.equal(h.document.querySelector('.fish-hunger').hidden,true);
  for(const action of ['activities','group-reward','goal','timer']) {
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
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
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
 const fish=h.document.querySelector('.fish'), art=fish.querySelector('.fish-art');
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
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
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
   then(resolve){writes.push(op);resolve({data:[{id:'share-1'}],error:table===fail?{message:'offline'}:null});}
  };}};
  const window={AquariumCore:C,kemalUserAuth:{getClient:()=>client,getUser:()=>({id:'owner-1'})}};
  vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window,crypto:{randomUUID:()=> 'rotated-token'}});
  if(fail)await assert.rejects(window.AquariumSharing.removeClass('class-1'),/Sınıf silinmedi/);
  else await window.AquariumSharing.removeClass('class-1');
  assert.equal(writes[0].table,'aquarium_student_links');assert.equal(writes[0].value.enabled,false);
  assert.equal(JSON.stringify(writes[0].filters),JSON.stringify([['share_id','share-1']]));
  if(fail==='aquarium_student_links')assert.equal(writes.length,1);
  else {assert.equal(writes[1].value.enabled,false);assert.equal(JSON.stringify(writes[1].value.snapshot),'{}');assert.equal(writes[1].value.token,'rotated-token');assert.ok(writes[1].filters.some(([k,v])=>k==='owner_id'&&v==='owner-1'));}
 }
});
