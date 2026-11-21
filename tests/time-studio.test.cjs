const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');

function studioHarness(blockStorage=false, AudioContext, preferences) {
  const html=fs.readFileSync('ogretmen/kronometre.html','utf8');
  const {window,document}=parseHTML(html);
  // Linkedom exposes a getter-only select.value.
  for(const select of document.querySelectorAll('select')) {
    Object.defineProperty(select,'value',{writable:true,value:select.querySelector('option').value});
  }
  window.AquariumSounds=require('../js/akvaryum-sounds.js');
  if(AudioContext) window.AudioContext=AudioContext;
  let now=Date.UTC(2026,10,4,9,15,30);
  class TestDate extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const data=new Map();
  if(preferences) data.set('kemal_time_studio_v1',JSON.stringify(preferences));
  const localStorage={getItem:k=>{if(blockStorage)throw Error('blocked');return data.get(k)||null;},setItem:(k,v)=>{if(blockStorage)throw Error('blocked');data.set(k,v);}};
  const intervals=[];
  const context={window,document,localStorage,navigator:{},Date:TestDate,Intl,Math,Promise,console,
    setInterval:fn=>intervals.push(fn),clearInterval(){},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
  vm.createContext(context);
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function startTimer()'));
  vm.runInContext(script,context);
  const q=s=>document.querySelector(s);
  return {q,document,window,data,advance:ms=>{now+=ms;},tick:()=>intervals.forEach(fn=>fn()),click:s=>q(s).click()};
}
test('switching digital and classic views preserves countdown; extending updates its remaining duration',()=>{
  const h=studioHarness();
  h.click('#startPauseBtn');h.advance(2000);
  h.click('[data-timer-view="analog"]');h.click('#addMinuteBtn');
  assert.equal(h.q('#timerProjection').dataset.view,'analog');
  assert.equal(h.q('#bigDigitsMain').textContent,'05:58');
  assert.match(h.q('#startPauseBtn').textContent,/Duraklat/);
  h.advance(3000);h.click('#startPauseBtn');
  assert.equal(h.q('#bigDigitsMain').textContent,'05:55');
  h.click('#resetBtn');assert.equal(h.q('#bigDigitsMain').textContent,'06:00');
});
test('clock shows local time without starting a timer; returning to countdown restores its target',()=>{
  const h=studioHarness();h.click('[data-mode="clock"]');
  assert.equal(h.q('#timerPrimaryActions').hidden,true);
  assert.match(h.q('#analogClock').getAttribute('aria-label'),/Yerel saat/);
  const space=new h.window.Event('keydown',{bubbles:true,cancelable:true});space.key=' ';h.document.body.dispatchEvent(space);
  h.click('#startPauseBtn');assert.equal(h.q('#timerPrimaryActions').hidden,true);
  h.click('[data-mode="countdown"]');assert.equal(h.q('#bigDigitsMain').textContent,'05:00');
});
test('stopwatch records cumulative and split times and resets its laps',()=>{
  const h=studioHarness();h.click('[data-mode="stopwatch"]');h.click('#startPauseBtn');
  h.advance(1250);h.click('#lapBtn');h.advance(2750);h.click('#lapBtn');
  assert.equal(h.q('#lapList').children.length,2);
  assert.match(h.q('#lapList').firstElementChild.textContent,/\+00:00:02.75/);
  assert.match(h.q('#lapList').firstElementChild.textContent,/00:00:04.00/);
  h.click('#resetBtn');assert.equal(h.q('#lapList').children.length,0);
});
test('settings save locally and unavailable local storage does not break the timer',()=>{
  const h=studioHarness();h.click('[data-timer-view="both"]');
  assert.equal(JSON.parse(h.data.get('kemal_time_studio_v1')).view,'both');
  const blocked=studioHarness(true);blocked.click('#startPauseBtn');blocked.advance(1000);blocked.click('#startPauseBtn');
  assert.equal(blocked.q('#bigDigitsMain').textContent,'04:59');
});
test('flip display updates only changed tiles and keeps an accessible time value',()=>{
  const h=studioHarness();
  h.click('[data-mode="stopwatch"]');h.click('#startPauseBtn');
  const digits=h.q('#flipDigits'), first=digits.firstElementChild, last=digits.lastElementChild;
  h.advance(1000);h.click('#startPauseBtn');
  assert.equal(digits.firstElementChild,first);
  assert.notEqual(digits.lastElementChild,last);
  assert.equal(digits.querySelectorAll('.flip-leaf').length,1);
  assert.equal(h.q('#bigDigitsMain').textContent,'00:01');
  h.click('[data-mode="clock"]');
  assert.equal(digits.querySelectorAll('.flip-tile').length,4);
  assert.equal(digits.querySelectorAll('.flip-leaf').length,0);
  assert.equal(h.q('#flipTrack').hidden,true);
  const seconds=h.q('#clockShowSeconds');seconds.checked=true;seconds.dispatchEvent(new h.window.Event('change'));
  assert.equal(digits.querySelectorAll('.flip-tile').length,6);
});
test('changing the palette and digit style preserves the running timer and saves both',()=>{
  const h=studioHarness();
  h.click('#startPauseBtn');
  for(const [id,value] of [['flipTheme','forest'],['flipStyle','plain']]) {
    const input=h.q('#'+id);input.value=value;input.dispatchEvent(new h.window.Event('change'));
  }
  h.advance(2000);h.click('#startPauseBtn');
  assert.equal(h.q('#bigDigitsMain').textContent,'04:58');
  assert.equal(h.q('#timerStage').dataset.flipTheme,'forest');
  assert.equal(h.q('#flipDigits .flip-leaf'),null);
  const saved=JSON.parse(h.data.get('kemal_time_studio_v1'));
  assert.equal(saved.theme,'forest');assert.equal(saved.style,'plain');
  assert.equal(h.q('#timerMusic').hasAttribute('src'),false);
});
test('a clock tick plays one short card sound when enabled, independent of the alarm',()=>{
  let starts=0, stops=0;
  class AudioContext {
    state='running';sampleRate=8000;destination={};
    createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
    createBufferSource(){return {connect(){},start(){starts++;},stop(){stops++;}};}
  }
  const h=studioHarness(false,AudioContext);
  h.click('[data-mode="clock"]');
  function setChecked(selector,checked) {
    const input=h.q(selector);input.checked=checked;input.dispatchEvent(new h.window.Event('change'));
  }
  setChecked('#soundToggleBtn',false);
  setChecked('#flipSound',true);
  setChecked('#clockShowSeconds',true);
  h.advance(1000);h.tick();h.tick();
  assert.equal(starts,1);
  setChecked('#flipSound',false);
  h.advance(1000);h.tick();
  assert.equal(starts,1);assert.equal(stops,1);
});
test('classic ticking follows the seconds even when digital seconds are hidden',()=>{
  const samples=[];
  class AudioContext {
    state='running';currentTime=10;sampleRate=8000;destination={};
    createBuffer(channels,length){return {length,getChannelData:()=>new Float32Array(length)};}
    createBufferSource(){return {connect(){},start(){samples.push(this.buffer);},stop(){}};}
  }
  const h=studioHarness(false,AudioContext);
  h.click('[data-mode="clock"]');h.click('[data-timer-view="analog"]');
  const input=h.q('#analogSound');input.checked=true;input.dispatchEvent(new h.window.Event('change'));
  h.advance(1000);h.tick();h.tick();h.advance(1000);h.tick();
  assert.equal(samples.length,2);
  assert.notEqual(samples[0],samples[1]);
  assert.match(h.q('#bigDigitsMain').textContent,/^\d{2}:\d{2}$/);
  h.click('[data-timer-view="digital"]');h.advance(1000);h.tick();
  assert.equal(samples.length,2);
});
test('legacy dark default follows site theme, while a deliberate projection choice stays independent',()=>{
  const h=studioHarness(false,undefined,{background:'dark'});
  const stage=h.q('#timerStage');
  assert.equal(stage.dataset.timerBackground,'light');
  h.document.documentElement.dataset.theme='dark';
  h.window.dispatchEvent(new h.window.Event('kemal:themechange'));
  assert.equal(stage.dataset.timerBackground,'dark');
  h.click('#timerBackground');h.click('#timerBackground');
  assert.equal(JSON.parse(h.data.get('kemal_time_studio_v1')).projectionBackground,'light');
  h.window.dispatchEvent(new h.window.Event('kemal:themechange'));
  assert.equal(stage.dataset.timerBackground,'light');
});
