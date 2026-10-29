const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseHTML } = require('linkedom');
const motion = require('../js/chance-studio.js');
const near = (a,b) => assert(Math.abs(a-b)<1e-9, `${a} != ${b}`);

function setup({reduced=false}={}) {
  const {window,document}=parseHTML(fs.readFileSync(require.resolve('../ogretmen/matematik.html'),'utf8'));
  let clock=0,sequence=0; const frames=new Map(),sounds=[];
  window.THREE=undefined;window.ChanceStudio=undefined;
  window.performance={now:()=>clock};window.matchMedia=()=>({matches:reduced});
  window.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};
  window.cancelAnimationFrame=id=>frames.delete(id);
  window.ChanceAudio=Object.fromEntries(['setEnabled','unlock','stop','diceImpact','coinLaunch','coinImpact'].map(name=>[name,(...args)=>sounds.push({name,args})]));
  const select=document.getElementById('diceCountSelect');Object.defineProperty(select,'value',{configurable:true,writable:true,value:'1'});
  document.getElementById('motionSoundToggle').checked=true;
  motion.init(window);
  const event=(target,type,properties={})=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,properties);target.dispatchEvent(e);};
  return {document,window,sounds,frames,event,click:s=>document.querySelector(s).click(),step(ms){clock=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(ms));}};
}

test('all six reported dice outcomes are the upward face, with opposite sides summing to seven',()=>{
  for(let face=1;face<=6;face++)for(const yaw of [0,.7,Math.PI,5.5]) {
    const q=motion.faceQuaternion(face,yaw),normal=motion.rotateVector(motion.normalByFace[face],q);
    near(normal[0],0);near(normal[1],1);near(normal[2],0);
    const opposite=motion.rotateVector(motion.normalByFace[7-face],q);near(opposite[1],-1);
    near(motion.diceSupport(q),.525);
  }
});

test('one to three independent dice have finite fair-range values and spaced landing positions',()=>{
  for(const count of [-1,1,2,3,9]) {
    const plans=motion.dicePlan(count,()=>.999999);
    assert.equal(plans.length,Math.max(1,Math.min(3,count)));
    assert(plans.every(p=>p.value===6));
    for(let i=1;i<plans.length;i++)assert(plans[i].x-plans[i-1].x>=1.8);
  }
  const buckets=Array(6).fill(0);
  for(let i=0;i<600;i++)buckets[motion.dicePlan(1,()=>i/600)[0].value-1]++;
  assert.deepEqual(buckets,[100,100,100,100,100,100]);
});

test('spinning rounded dice and ridged coins never penetrate the tray during their flights',()=>{
  for(let face=1;face<=6;face++) {
    const plan={...motion.dicePlan(1,()=>.73)[0],value:face};
    for(let i=0;i<=200;i++) {
      const p=motion.dicePose(plan,i/100);assert(p.y-motion.diceSupport(p.q)>=.01-1e-9);
      assert([p.x,p.y,p.z,...Object.values(p.q)].every(Number.isFinite));
    }
  }
  for(const result of ['yazi','tura'])for(let i=0;i<=200;i++) {
    const p=motion.coinPose({result,yaw:2.7},i/100);assert(p.y-motion.coinSupport(p.q)>=.01-1e-9);
    if(i===200)near(motion.rotateVector([0,1,0],p.q)[1],result==='yazi'?1:-1);
  }
});

test('flights contain a rising coin, a falling die and successively smaller bounces',()=>{
  assert(motion.coinHeight(.5)>motion.coinHeight(0)+2);
  assert(motion.diceHeight(0)>motion.diceHeight(.6)+1);
  const dicePeaks=[.95,1.28,1.53].map(motion.diceHeight);
  assert(dicePeaks[0]>dicePeaks[1]&&dicePeaks[1]>dicePeaks[2]);
  for(const t of motion.landings.dice)near(motion.diceHeight(t),.535);
  for(const t of motion.landings.coin)near(motion.coinHeight(t),.068);
});

test('three-dice controls, repeat-click protection and accessible result totals work without WebGL',()=>{
  const q=setup();assert.equal(q.sounds.length,0);q.click('[data-dice-count="3"]');q.click('#chanceDiceStage');
  assert.equal(q.window.roll3DDice(),false);assert.equal(q.document.getElementById('rollDiceBtn').disabled,true);
  assert.equal(q.document.getElementById('chanceDiceStage').getAttribute('aria-busy'),'true');
  q.window.ChanceStudio.setCount(1);q.step(1900);
  const result=q.document.getElementById('diceResultLabel'),values=result.dataset.values.split(',').map(Number);
  assert.equal(values.length,3);assert(values.every(v=>v>=1&&v<=6));assert.equal(Number(result.dataset.total),values.reduce((a,b)=>a+b));
  assert.equal(result.getAttribute('aria-live'),'polite');assert.equal(q.document.getElementById('rollDiceBtn').disabled,false);
  assert.equal(q.document.getElementById('dice3Wrap').hidden,false);assert.equal(q.frames.size,0);
});

test('dice impacts occur once at contacts, coin launch and landing are separate, and scenes run concurrently',()=>{
  const q=setup();q.window.roll3DDice();q.window.flipCoin();
  for(const ms of [760,780,1000,1140,1340,1420,1560,1640,1800])q.step(ms);
  assert.equal(q.sounds.filter(s=>s.name==='diceImpact').length,4);
  assert.equal(q.sounds.filter(s=>s.name==='coinLaunch').length,1);
  assert.equal(q.sounds.filter(s=>s.name==='coinImpact').length,3);
  assert(['YAZI','TURA'].includes(q.document.getElementById('coinResultLabel').textContent));
  assert.equal(q.document.getElementById('chanceCoinStage').dataset.face,q.document.getElementById('coinResultLabel').dataset.result);
  assert.match(q.document.querySelector('.chance-coin-fallback img').getAttribute('src'),/gorseller\/(yazi|tura)\.png/);
});

test('keyboard activation, mute, reduced motion and leaving a tool preserve usable outcomes',()=>{
  const q=setup({reduced:true}),toggle=q.document.getElementById('motionSoundToggle');toggle.checked=false;q.event(toggle,'change');
  q.event(q.document.getElementById('chanceDiceStage'),'keydown',{key:'Enter'});q.step(200);
  assert(q.document.getElementById('diceResultLabel').dataset.total);assert.equal(q.frames.size,0);
  assert(q.sounds.some(s=>s.name==='setEnabled'&&s.args[0]===false));
  q.window.flipCoin();q.event(q.document,'mathmodechange',{detail:{mode:'calc'}});
  assert.equal(q.document.getElementById('chanceCoinStage').getAttribute('aria-busy'),'false');
  assert(q.document.getElementById('coinResultLabel').dataset.result);assert.equal(q.frames.size,0);
  assert(q.sounds.some(s=>s.name==='stop'));
});

test('resuming after a long suspended frame produces a result without playing stale collisions',()=>{
  const q=setup();q.window.roll3DDice();q.window.flipCoin();q.step(30000);
  assert.equal(q.sounds.filter(s=>s.name==='diceImpact'||s.name==='coinImpact').length,0);
  assert.equal(q.frames.size,0);assert.equal(q.document.getElementById('rollDiceBtn').disabled,false);
});
