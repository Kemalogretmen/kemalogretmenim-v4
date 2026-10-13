'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const models=require('../js/akvaryum-creature-models.js');
const source=fs.readFileSync(require.resolve('../js/akvaryum-creature-3d.js'),'utf8');
function harness(available=true){
  const calls={draws:0,copies:0,deletes:0,matrices:[],crops:[]};let lost=false;const events={};
  const gl=new Proxy({
    getShaderParameter:()=>true,getProgramParameter:()=>true,
    getAttribLocation:()=>1,getUniformLocation:(_,name)=>name,
    isContextLost:()=>lost,
    drawElements:()=>calls.draws++,deleteBuffer:()=>calls.deletes++,
    uniformMatrix4fv:(name,transpose,matrix)=>{if(name==='uMatrix')calls.matrices.push(Array.from(matrix));},
    getExtension:()=>({loseContext:()=>{lost=true;events.webglcontextlost?.();}})
  },{get:(target,key)=>key in target?target[key]:/^[A-Z_]+$/.test(key)?1:()=>({})});
  const surface={width:0,height:0,getContext:()=>available?gl:null,addEventListener:(name,fn)=>events[name]=fn};
  const window={document:{createElement:()=>surface},AquariumCreatureModels:models};
  vm.runInNewContext(source,{window,Float32Array,Uint16Array,Math,Number,Map,WeakMap});
  const context={clearRect:()=>{},drawImage:(...args)=>{calls.copies++;calls.crops.push(args.slice(1));}};
  const canvas={width:144,height:96,clientWidth:144,getContext:()=>context};
  return {renderer:window.AquariumCreature3D.create(),canvas,surface,calls,lose:()=>{lost=true;events.webglcontextlost?.();}};
}
test('unavailable WebGL yields safe repeatable fallback',()=>{
  const {renderer,canvas,calls}=harness(false);
  assert.equal(renderer.supported,false);assert.equal(renderer.render(canvas,'clown',0,true),false);
  renderer.dispose();renderer.dispose();assert.equal(calls.draws,0);
});
test('context loss stops drawing and copying',()=>{
  const {renderer,canvas,calls,lose}=harness();
  assert.equal(renderer.render(canvas,'turtle',.4,true),true);
  const draws=calls.draws,copies=calls.copies;assert.ok(draws>0&&copies===1);
  lose();assert.equal(renderer.render(canvas,'turtle',.7,true),false);
  assert.equal(calls.draws,draws);assert.equal(calls.copies,copies);renderer.dispose();
});
test('dispose releases uploaded buffers once and prevents further rendering',()=>{
  const {renderer,canvas,calls}=harness();
  assert.equal(renderer.render(canvas,'clown',0,false),true);
  renderer.dispose();const deletes=calls.deletes,draws=calls.draws;
  assert.equal(deletes,models.makeModel('clown').parts.length*2);
  renderer.dispose();assert.equal(calls.deletes,deletes);
  assert.equal(renderer.render(canvas,'clown',0,false),false);assert.equal(calls.draws,draws);
});
test('optional 3D heading changes geometry projection and keeps resolution bounded',()=>{
  const {renderer,canvas,calls}=harness();canvas.clientWidth=900;
  assert.equal(renderer.render(canvas,'clown',0,false),true);
  const defaultMatrix=calls.matrices[0];calls.matrices.length=0;
  assert.equal(renderer.render(canvas,'clown',0,false,0),true);
  assert.deepEqual(calls.matrices[0],defaultMatrix);calls.matrices.length=0;
  assert.equal(renderer.render(canvas,'clown',0,false,90),true);
  assert.notDeepEqual(calls.matrices[0],defaultMatrix);
  assert.equal(canvas.width,192);assert.equal(canvas.height,128);
  const draws=calls.draws;
  assert.equal(renderer.render(canvas,'unsupported',0,true),false);assert.equal(calls.draws,draws);
  renderer.dispose();
});
test('different creature sizes share a fixed framebuffer and crop the bottom-left viewport correctly',()=>{
  const {renderer,canvas,surface,calls}=harness();
  for(const width of [44,172,88,144]) {
    canvas.clientWidth=width;assert.equal(renderer.render(canvas,'turtle',.4,true),true);
    const height=Math.round(width/1.5);
    assert.deepEqual([surface.width,surface.height],[192,128]);
    assert.deepEqual(calls.crops.at(-1),[0,128-height,width,height,0,0,width,height]);
  }
  renderer.dispose();
});
