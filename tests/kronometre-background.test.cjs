const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness() {
 const html=fs.readFileSync('ogretmen/kronometre.html','utf8');
 const source=html.slice(html.indexOf('    function getActx()'),html.indexOf('    /* ── SEKMELER / TAM EKRAN'));
 let now=1000,frameId=0,rendered=0;const nodes=[],frames=new Map(),banner=new Set();
 class AudioContext {
  constructor(){this.currentTime=10;this.destination={};}
  resume(){return this.pending || Promise.resolve();}
  createOscillator(){const n={frequency:{},connect(){},disconnect(){},start(at){this.startAt=at;},stop(at){if(at===undefined)this.cancelled=true;else this.stopAt=at;}};nodes.push(n);return n;}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const S={mode:'countdown',running:false,alarmOn:true,cdTarget:10000,dispMs:10000,pausedAt:0,startedAt:0,frame:null,alarmIds:[],alarmNodes:[],alarmGeneration:0,alarmScheduled:false};
 const E={alarmBanner:{classList:{add:c=>banner.add(c),remove:c=>banner.delete(c)}},modeTabs:[]};
 const document={hidden:false};
 const ctx={S,E,document,window:{AudioContext},Date:{now:()=>now},Math,Promise,
  getInputMs:()=>10000,render:()=>rendered++,syncSteppers(){},clearTimeout(){},
  requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {...ctx,nodes,frames,banner,advance:ms=>{now+=ms;},renders:()=>rendered};
}
test('countdown schedules its alarm before hiding and finishes without any animation frame',async()=>{
 const h=harness();h.startTimer();await Promise.resolve();
 assert.equal(h.nodes.length,3);assert.equal(h.nodes[0].startAt,20);assert.equal(h.nodes[2].startAt,20.9);
 h.document.hidden=true;h.syncTimerVisibility();assert.equal(h.frames.size,0);assert.equal(h.S.running,true);
 h.advance(4000);h.updateTimerState();assert.equal(h.S.dispMs,6000);
 h.advance(8000);h.updateTimerState();await Promise.resolve();
 assert.equal(h.S.running,false);assert.equal(h.S.dispMs,0);assert.ok(h.banner.has('show'));assert.equal(h.nodes.length,3);
 h.document.hidden=false;h.syncTimerVisibility();assert.equal(h.nodes.length,3);assert.equal(h.frames.size,0);
});
test('pause cancels the old alarm; resume schedules only the actual remaining time',async()=>{
 const h=harness();h.startTimer();await Promise.resolve();h.advance(3200);h.pauseTimer();
 assert.equal(h.S.dispMs,6800);assert.ok(h.nodes.every(n=>n.cancelled));
 h.advance(60000);h.document.hidden=true;h.updateTimerState();assert.equal(h.S.dispMs,6800);
 h.startTimer();await Promise.resolve();assert.equal(h.nodes.length,6);assert.equal(h.nodes[3].startAt,16.8);
 h.resetTimer();assert.ok(h.nodes.every(n=>n.cancelled));assert.equal(h.S.running,false);assert.equal(h.S.dispMs,10000);
});
test('muted completion still shows the banner without audio and stopwatch includes hidden elapsed time',async()=>{
 const h=harness();h.S.alarmOn=false;h.startTimer();h.document.hidden=true;h.advance(15000);h.updateTimerState();
 assert.equal(h.nodes.length,0);assert.ok(h.banner.has('show'));
 h.setMode('stopwatch');h.startTimer();h.advance(125000);h.updateTimerState();
 assert.equal(h.S.dispMs,125000);assert.equal(h.S.running,true);h.pauseTimer();h.advance(20000);h.updateTimerState();assert.equal(h.S.dispMs,125000);
});
test('late audio permission resolution cannot revive a paused or reset alarm',async()=>{
 const h=harness();const ctx=h.getActx();let resolve;ctx.pending=new Promise(r=>resolve=r);
 h.startTimer();h.pauseTimer();resolve();await Promise.resolve();assert.equal(h.nodes.length,0);
});
test('changing a running preset cancels its former deadline and starts the new duration cleanly',async()=>{
 const h=harness();h.startTimer();await Promise.resolve();h.advance(3000);h.setPreset(30);
 assert.equal(h.S.running,false);assert.equal(h.S.dispMs,30000);assert.equal(h.S.pausedAt,0);assert.ok(h.nodes.every(n=>n.cancelled));
 h.startTimer();await Promise.resolve();assert.equal(h.nodes[3].startAt,40);
});
