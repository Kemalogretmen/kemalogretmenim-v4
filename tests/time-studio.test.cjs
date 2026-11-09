const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');

function studioHarness(blockStorage=false) {
  const html=fs.readFileSync('ogretmen/kronometre.html','utf8');
  const {window,document}=parseHTML(html);
  let now=Date.UTC(2026,10,4,9,15,30);
  class TestDate extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const data=new Map();
  const localStorage={getItem:k=>{if(blockStorage)throw Error('blocked');return data.get(k)||null;},setItem:(k,v)=>{if(blockStorage)throw Error('blocked');data.set(k,v);}};
  const context={window,document,localStorage,navigator:{},Date:TestDate,Intl,Math,Promise,console,
    setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){}};
  vm.createContext(context);
  const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function startTimer()'));
  vm.runInContext(script,context);
  const q=s=>document.querySelector(s);
  return {q,document,window,data,advance:ms=>{now+=ms;},click:s=>q(s).click()};
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
