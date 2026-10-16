const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../js/akvaryum-water.js');
function canvas(){
 const frames=[];let commands=[],alpha=1;
 const ctx={clearRect(){commands=[];frames.push(commands);},createLinearGradient(...args){commands.push(['gradient',...args]);return {addColorStop(...s){commands.push(['stop',...s]);}};},
 save(){},restore(){},beginPath(){},closePath(){},moveTo(...p){commands.push(['move',...p]);},lineTo(...p){commands.push(['line',...p]);},quadraticCurveTo(...p){commands.push(['curve',...p]);},stroke(){commands.push(['stroke',alpha]);},fill(){commands.push(['fill']);},set globalAlpha(v){alpha=v;}};
 return {width:0,height:0,getContext:()=>ctx,frames};
}
const geometry=c=>c.frames.at(-1).filter(x=>['curve','line'].includes(x[0]));
test('surface and seabed reflections deform continuously in both qualities, including beyond the old five-second reset',()=>{
 for(const lite of [false,true]){
  const a=canvas(),b=canvas(),r=W.create(a,b);r.configure({lite,waterWaves:true});r.resize(3840,2160,lite);
  assert.ok(a.width<=(lite?480:720)&&a.height<=450);r.draw(0);const first=geometry(a),wave=geometry(b);
  for(let n=1;n<=180;n++)r.draw(n*50);
  assert.notDeepEqual(geometry(a),first);assert.notDeepEqual(geometry(b),wave);
  assert.ok(a.frames.at(-1).some(x=>x[0]==='gradient'&&x[2]===0),'surface light must exist in lite too');
  assert.ok(a.frames.at(-1).some(x=>x[0]==='gradient'&&x[2]>a.height*.6),'floor light starts near the sand');
  assert.ok(a.frames.length<=(lite?110:155),'paint cadence stays bounded');
  assert.ok(W.cells(0,lite).length<130,'no device-resolution-sized geometry');
 }
});
test('sliders change actual light and wave drawing, not only CSS variables',()=>{
 const a=canvas(),b=canvas(),r=W.create(a,b);r.resize(1280,720);r.configure({motion:false,waterWaves:true,lightStrength:50,waveStrength:50});r.draw(0);
 const low=a.frames.at(-1).filter(x=>x[0]==='stroke').map(x=>x[1]),old=JSON.stringify(b.frames.at(-1));
 r.configure({lightStrength:125,waveStrength:150});r.draw(1);
 const high=a.frames.at(-1).filter(x=>x[0]==='stroke').map(x=>x[1]);assert.ok(high.every((n,i)=>n>low[i]*2.9));assert.notEqual(JSON.stringify(b.frames.at(-1)),old);
});
test('independent switches pause the light, keep waves moving, and general reduced motion freezes both without phase reset',()=>{
 const a=canvas(),b=canvas(),r=W.create(a,b);r.resize(1280,720);r.configure({waterWaves:true});r.draw(0);r.draw(80);
 r.configure({lightMotion:false});r.draw(160);const light=geometry(a),wave=geometry(b);
 for(let n=1;n<=30;n++)r.draw(160+n*80);
 assert.deepEqual(geometry(a),light);assert.notDeepEqual(geometry(b),wave);
 r.configure({motion:false});r.draw(2700);const stopped=[geometry(a),geometry(b)],count=a.frames.length;
 r.draw(9000);assert.equal(a.frames.length,count);assert.deepEqual([geometry(a),geometry(b)],stopped);assert.equal(r.active(),false);
 r.configure({motion:true,lightMotion:true});r.resume();r.draw(100000);assert.deepEqual([geometry(a),geometry(b)],stopped,'tab/panel resumes without a time jump');
 r.draw(100080);assert.notDeepEqual([geometry(a),geometry(b)],stopped);
 r.configure({waterWaves:false,lightMotion:false});r.draw(100100);assert.deepEqual(b.frames.at(-1),[]);assert.equal(r.active(),false);
});
test('missing canvas support safely falls back, and resize preserves the water phase',()=>{
 assert.doesNotThrow(()=>W.create({getContext(){throw Error('unsupported');}},null).draw(0));
 assert.equal(W.create(null,null).active(),false);
 const a=canvas(),r=W.create(a,null);r.resize(720,420);r.draw(0);r.draw(80);r.configure({motion:false});r.draw(160);
 const initial=geometry(a);r.resize(720,420);r.draw(200);assert.deepEqual(geometry(a),initial);
 r.resize(1440,840);r.draw(240);assert.deepEqual(geometry(a),initial,'same capped backing store and phase');
});
