const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const Dice=require('../js/kizma-birader-dice.js');
const Motion=require('../js/chance-studio.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function harness({reduced=false}={}){
  const {window,document}=parseHTML('<html><body></body></html>');
  const frames=new Map(),sounds=[];let time=0,id=0,portrait=false;
  window.performance={now:()=>time};window.matchMedia=()=>({matches:reduced});
  window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
  window.cancelAnimationFrame=n=>frames.delete(n);window.ChanceAudio={diceImpact:n=>sounds.push(n)};
  const vector=()=>({set(x,y,z){Object.assign(this,{x,y,z});}});
  const die={position:vector(),quaternion:{set(x,y,z,w){Object.assign(this,{x,y,z,w});}},scale:{setScalar(n){this.value=n;}},visible:false};
  const api=Dice.create({win:window,die,toWorld:(u,v)=>portrait?[-v,u]:[u,v],render(){}});
  return {api,die,sounds,frames,document,
    step(ms){time=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());},
    portrait(){portrait=true;api.refresh();},
    hideTab(){Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));}
  };
}
test('all six outcomes use the same fixed cube and end with the requested face upward',()=>{
  for(let n=1;n<=6;n++)for(const random of [()=>0,()=>.38,()=>.9999]){
    const p=Dice.plan(n,random);assert.equal(p.value,n);
    const end=Dice.pose(p,Dice.duration),normal=Motion.rotateVector(Motion.normalByFace[n],end.q);
    near(normal[1],1);near(normal[0],0);near(normal[2],0);assert.equal(end.settled,true);
    near(end.u,p.u);near(end.v,p.v);
  }
  for(const n of [0,7,-1,2.1,NaN])assert.throws(()=>Dice.plan(n),RangeError);
});
test('the physical die never sinks below the ground throughout spin and shrinking bounces',()=>{
  for(let n=1;n<=6;n++){
    const plan=Dice.plan(n,()=>.53);
    for(let k=0;k<=240;k++){
      const state=Dice.pose(plan,k/100);
      assert.ok(state.y-Motion.diceSupport(state.q)*Dice.scale>=.01*Dice.scale-1e-9);
      assert.ok([state.u,state.v,state.y,...Object.values(state.q)].every(Number.isFinite));
    }
  }
});
test('each throw slows horizontally, ends in the clear lane and has successively lower bounces',()=>{
  const p=Dice.plan(4,()=>.7),x=t=>Dice.pose(p,t).u;
  assert.ok(x(.3)-x(0)>x(1.5)-x(1.2));
  assert.ok(p.u>=-4.1&&p.u<=-3.35);assert.ok(p.v>-1.8&&p.v<-1.6);
  // Center height also changes as the cube rolls over an edge; compare the
  // ballistic arcs independently from that support-height correction.
  const peaks=[.95,1.28,1.53].map(t=>Motion.diceHeight(t)*Dice.scale);
  assert.ok(peaks[0]>peaks[1]&&peaks[1]>peaks[2]);
  assert.equal(Dice.contacts.length,4);
});
test('CSS fallback uses six fixed faces and valid finite matrices for every result',()=>{
  for(let n=1;n<=6;n++){
    const text=Dice.cssTransform(n);assert.match(text,/rotateX\(-48deg\).*matrix3d/);assert.doesNotMatch(text,/NaN|undefined|Infinity/);
  }
  const html=fs.readFileSync('oyun/kizma_birader.html','utf8');
  assert.doesNotMatch(html,/setDiceFace\(rand\(1, 6\)\)/);
  assert.match(html,/KBBoardDice\.cssTransform\(number\)/);
});
test('controller settles once, keeps the die visible for the question and emits one impact per contact',async()=>{
  const h=harness(),out=h.api.roll(6,()=>true);
  for(const t of Dice.contacts) {h.step(t*1000);h.step(t*1000+20);}
  h.step(2100);assert.equal(await out,true);assert.equal(h.api.stage,'landed');assert.equal(h.api.value,6);assert.equal(h.die.visible,true);
  assert.equal(h.sounds.length,4);assert.deepEqual(h.sounds,[.9,.5,.25,.1]);assert.equal(h.frames.size,0);
  const normal=Motion.rotateVector(Motion.normalByFace[6],h.die.quaternion);near(normal[1],1);
  const exit=h.api.exit(()=>true);h.step(2700);assert.equal(await exit,true);assert.equal(h.die.visible,false);
});
test('new turn cancellation cannot leak an old completion into the game',async()=>{
  const h=harness();let valid=true;const out=h.api.roll(5,()=>valid);h.step(500);valid=false;h.step(700);
  assert.equal(await out,false);assert.equal(h.die.visible,false);assert.equal(h.frames.size,0);
  const next=h.api.roll(2,()=>true);h.step(2800);assert.equal(await next,true);assert.equal(h.api.value,2);
});
test('resizing to portrait remaps the landed die with the board without changing the outcome',async()=>{
  const h=harness(),out=h.api.roll(3,()=>true);h.step(2100);await out;
  const {x,z}=h.die.position;h.portrait();near(h.die.position.x,-z);near(h.die.position.z,x);assert.equal(h.api.value,3);
});
test('reduced motion, background completion and WebGL loss never leave a roll pending',async()=>{
  const quiet=harness({reduced:true}),a=quiet.api.roll(1,()=>true);quiet.step(200);assert.equal(await a,true);assert.equal(quiet.sounds.length,0);
  const h=harness(),b=h.api.roll(4,()=>true);h.hideTab();assert.equal(await b,true);assert.equal(h.frames.size,0);
  const lost=harness(),c=lost.api.roll(6,()=>true);lost.api.loseContext();assert.equal(await c,true);assert.equal(lost.api.available,false);assert.equal(lost.die.visible,false);
});
test('suspended frames skip stale impacts while preserving the requested result',async()=>{
  const h=harness(),out=h.api.roll(2,()=>true);h.step(30000);assert.equal(await out,true);assert.equal(h.sounds.length,0);assert.equal(h.api.value,2);
});
test('integration preserves the balanced roll and guards the turn while waiting for animation',()=>{
  const html=fs.readFileSync('oyun/kizma_birader.html','utf8');
  const original= require('node:child_process').execFileSync('git',['show','HEAD:oyun/kizma_birader.html'],{encoding:'utf8'});
  const balanced=s=>s.slice(s.indexOf('    function dengeliZarAt()'),s.indexOf('    let playerSetups'));
  assert.equal(balanced(html),balanced(original));
  assert.match(html,/const finalRoll = dengeliZarAt\(\)/);assert.match(html,/token === gameState.turnToken && gameState.gameStarted && gameState.phase === "rolling"/);
  assert.match(html,/gameState.phase !== "ready"/);assert.match(html,/kbDice3D\?\.loseContext\(\)/);
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(script[1].trim())new vm.Script(script[1]);
});
