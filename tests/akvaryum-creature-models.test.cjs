'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const models=require('../js/akvaryum-creature-models.js');
for(const species of models.species){
  test(species+' has bounded finite indexed 3D geometry and valid hierarchy',()=>{
    const model=models.makeModel(species),seen=new Set();
    assert.ok(model.triangleCount>100&&model.triangleCount<5000);
    let zMin=Infinity,zMax=-Infinity;
    for(const part of model.parts){
      assert.ok(!seen.has(part.id));assert.ok(!part.parent||seen.has(part.parent));seen.add(part.id);
      const {vertices,indices}=part.mesh;assert.equal(vertices.length%9,0);assert.equal(indices.length%3,0);
      assert.ok(vertices.every(Number.isFinite));assert.ok(indices.every(i=>Number.isInteger(i)&&i>=0&&i<vertices.length/9));
      for(let i=0;i<vertices.length;i+=9){
        assert.ok(Math.hypot(...vertices.slice(i+3,i+6))>.9);
        assert.ok(vertices.slice(i,i+3).every(v=>Math.abs(v)<1.5));
        assert.ok(vertices.slice(i+6,i+9).every(v=>v>=0&&v<=1));
        zMin=Math.min(zMin,vertices[i+2]);zMax=Math.max(zMax,vertices[i+2]);
      }
    }
    assert.ok(zMax-zMin>.4,'model must have real depth');
  });
  test(species+' freezes at rest and articulates bounded joints while moving',()=>{
    const rest=models.pose(species,0,false);
    assert.deepEqual(rest,models.pose(species,99,false));
    assert.notDeepEqual(rest,models.pose(species,.45,true));
    assert.deepEqual(Object.keys(rest),models.makeModel(species).parts.map(p=>p.id));
    for(let time=0;time<10;time+=.17)for(const p of Object.values(models.pose(species,time,true))){
      assert.ok(Object.values(p).every(Number.isFinite));
      for(const axis of ['rx','ry','rz'])assert.ok(Math.abs(p[axis])<1);
      for(const axis of ['sx','sy','sz'])assert.ok(p[axis]>.8&&p[axis]<1.2);
    }
  });
}
test('species joints belong to anatomical roots and unsupported species are explicit',()=>{
  const turtle=models.makeModel('turtle');
  for(const side of [-1,1]){
    const front=turtle.parts.find(p=>p.id==='front'+side);
    assert.equal(front.parent,'body');assert.ok(front.origin[0]>.2);assert.equal(Math.sign(front.origin[2]),side);
  }
  const octopus=models.makeModel('octopus');
  assert.equal(octopus.parts.filter(p=>p.id.startsWith('arm')).length,24);
  assert.equal(octopus.parts.find(p=>p.id==='arm0_2').parent,'arm0_1');
  assert.equal(models.makeModel('shark'),null);assert.equal(models.pose('shark',0,true),null);
  assert.ok(Object.values(models.pose('clown',NaN,true)).every(p=>Object.values(p).every(Number.isFinite)));
});
