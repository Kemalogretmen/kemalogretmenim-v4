const test = require('node:test');
const assert = require('node:assert/strict');
const Sand = require('../js/smartboard-sand.js');

test('sand material defaults and persisted preferences are bounded', () => {
  assert.deepEqual(Sand.material(), {color:'#ddc394',grain:1,mixed:false,lines:'handwriting',spacing:48});
  assert.deepEqual(Sand.material({color:'url(unsafe)',grain:50,mixed:'true',lines:'invalid',spacing:-8}),
    {color:'#ddc394',grain:3,mixed:false,lines:'handwriting',spacing:24});
  assert.deepEqual(Sand.material({color:'#AACCFF',grain:.75,mixed:true,lines:'handwriting',spacing:72}),
    {color:'#aaccff',grain:.75,mixed:true,lines:'handwriting',spacing:72});
});

test('cached texture has visible grains, distinct mixed hues and a darker groove floor', () => {
  const previous = global.document;
  global.document = {createElement() {
    const tile = {getContext: () => ({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:p=>{tile.pixels=p.data;}})};
    return tile;
  }};
  try {
    const natural=Sand.texture(), coarse=Sand.texture({grain:3}), mixed=Sand.texture({mixed:true}), floor=Sand.texture({},true);
    assert.equal(natural.width,256); assert.equal(natural.height,256);
    assert.deepEqual(Sand.texture().pixels,natural.pixels,'texture regeneration is stable');
    assert.notDeepEqual(coarse.pixels,natural.pixels,'grain size changes the material');
    assert(natural.pixels.every((v,i)=>i%4!==3||v===255));
    let darker=0, cool=0, warm=0, fineDelta=0, coarseDelta=0;
    for(let i=4;i<natural.pixels.length;i+=4) {
      if(floor.pixels[i]<natural.pixels[i]) darker++;
      if(mixed.pixels[i+2]>mixed.pixels[i]+10) cool++;
      if(mixed.pixels[i]>mixed.pixels[i+2]+10) warm++;
      fineDelta+=Math.abs(natural.pixels[i]-natural.pixels[i-4]);
      coarseDelta+=Math.abs(coarse.pixels[i]-coarse.pixels[i-4]);
    }
    assert(darker>60000); assert(cool>4000 && warm>4000,'mixed grains are colored, not gray noise');
    assert(coarseDelta<fineDelta*.75,'larger grains have longer spatial correlation');
  } finally { global.document=previous; }
});
