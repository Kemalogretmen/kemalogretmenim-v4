const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');

function setup(saved = {}) {
  const {document, window} = parseHTML('<html><body><button id="boardAddonsBtn"></button><div id="stage"></div></body></html>');
  const stage = document.getElementById('stage');
  stage.getBoundingClientRect = () => ({left:0,top:0,right:1000,bottom:600});
  const store = new Map([['kemal_smartboard_addons_v1', JSON.stringify(saved)]]), intervals = new Map();
  let now = 1000, id = 0, getUserMedia = null;
  vm.runInNewContext(fs.readFileSync('js/smartboard-studio.js','utf8'), {
    window, document, innerWidth:1000, innerHeight:800, navigator:{mediaDevices:{getUserMedia:()=>getUserMedia()}},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    requestAnimationFrame:()=>1, Date:{now:()=>now}, setInterval:fn=>{intervals.set(++id,fn);return id;}, clearInterval:key=>intervals.delete(key)
  });
  const tools = window.SmartboardStudio.init({stage,activate(){},addImage:()=>Promise.resolve()});
  return {document,window,tools,store,intervals,setNow:v=>{now=v;},setMic:fn=>{getUserMedia=fn;},click:s=>document.querySelector(s).click()};
}
test('notes and score edits survive reload; closing a widget removes its saved state',()=>{
  const q=setup(); q.tools.open('note'); q.tools.open('score');
  const note=q.document.querySelector('.sb-note');note.value='Bugün A sesini çalışıyoruz';note.dispatchEvent(new q.window.Event('input'));
  q.click('[data-widget="score"] [data-sb-action="more"]');
  const data=JSON.parse(q.store.get('kemal_smartboard_addons_v1'));
  assert.equal(data.note.text,note.value);assert.equal(data.score.scores[0],1);
  assert.equal(q.document.querySelectorAll('[data-widget="score"] button svg.sb-icon').length,9,'all scoreboard controls have embedded SVGs');
  const reload=setup(data);assert.equal(reload.document.querySelector('.sb-note').value,note.value);
  assert.equal(reload.document.querySelector('[data-widget="score"] output').value,1);
  reload.click('[data-widget="note"] [data-sb-action="close"]');
  assert.equal(JSON.parse(reload.store.get('kemal_smartboard_addons_v1')).note,undefined);
});
test('scoreboard adds up to twenty teams, preserves names and points, and removes a chosen empty team',()=>{
  const q=setup();q.tools.open('score');
  const team=()=>q.document.querySelectorAll('.sb-score-team');
  q.click('[data-sb-action="more"]');
  const first=team()[0].querySelector('input');first.value='Yıldızlar';first.dispatchEvent(new q.window.Event('input'));
  for(let i=0;i<18;i++)q.click('[data-sb-action="add-team"]');
  assert.equal(team().length,20);assert(q.document.querySelector('[data-sb-action="add-team"]').disabled);
  q.click('[data-sb-action="add-team"]');assert.equal(team().length,20);
  const saved=JSON.parse(q.store.get('kemal_smartboard_addons_v1'));const reload=setup(saved);
  assert.equal(reload.document.querySelectorAll('.sb-score-team').length,20);
  assert.equal(reload.document.querySelector('.sb-score-team input').value,'Yıldızlar');
  assert.equal(reload.document.querySelector('.sb-score').value,1);
  q.document.querySelectorAll('[data-sb-action="remove-team"]')[1].click();assert.equal(team().length,19);
  assert.equal(team()[0].querySelector('.sb-score').value,1);assert(!q.document.querySelector('[data-sb-action="add-team"]').disabled);
});
test('removing a scored team requires confirmation and at least one team remains',()=>{
  const q=setup();q.tools.open('score');q.click('[data-sb-action="more"]');
  q.window.confirm=()=>false;q.click('[data-sb-action="remove-team"]');
  assert.equal(q.document.querySelectorAll('.sb-score-team').length,2);assert.equal(q.document.querySelector('.sb-score').value,1);
  q.window.confirm=()=>true;q.click('[data-sb-action="remove-team"]');
  assert.equal(q.document.querySelectorAll('.sb-score-team').length,1);assert(q.document.querySelector('[data-sb-action="remove-team"]').disabled);
});
test('running timer catches up after background throttling and releases its interval on close',()=>{
  const q=setup();q.tools.open('timer');q.click('[data-widget="timer"] [data-sb-action="toggle"]');
  q.setNow(62000);for(const tick of q.intervals.values())tick();
  assert.equal(q.document.querySelector('.sb-readout').value,'03:59');
  q.setNow(400000);for(const tick of [...q.intervals.values()])tick();
  assert.equal(q.document.querySelector('.sb-readout').value,'00:00');assert.equal(q.intervals.size,0);
  q.click('[data-widget="timer"] [data-sb-action="toggle"]');assert.equal(q.intervals.size,1);
  q.click('[data-widget="timer"] [data-sb-action="close"]');assert.equal(q.intervals.size,0);
});
test('microphone starts only on request; a late permission grant after close stops the stream',async()=>{
  const q=setup();let calls=0,resolve,stops=0;
  q.setMic(()=>{calls++;return new Promise(r=>{resolve=r;});});q.tools.open('noise');assert.equal(calls,0);
  q.click('[data-widget="noise"] .sb-command');assert.equal(calls,1);
  q.click('[data-widget="noise"] [data-sb-action="close"]');
  resolve({getTracks:()=>[{stop:()=>{stops++;}}]});await new Promise(r=>setImmediate(r));assert.equal(stops,1);
});
test('sand mode hides floating tools without deleting notes and cancels pending microphone access',async()=>{
  const q=setup();q.tools.open('note');q.tools.open('noise');let resolve,stops=0;
  q.setMic(()=>new Promise(r=>{resolve=r;}));q.click('[data-widget="noise"] .sb-command');
  q.tools.setSandbox(true);assert.equal(q.document.querySelector('[data-widget="note"]').hidden,true);
  resolve({getTracks:()=>[{stop:()=>{stops++;}}]});await new Promise(r=>setImmediate(r));assert.equal(stops,1);
  q.tools.setSandbox(false);assert.equal(q.document.querySelector('[data-widget="note"]').hidden,false);
});
