const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Guide=require('../js/smartboard-sand-guide.js'),Sound=require('../js/smartboard-sand-sound.js');
test('Turkish upper/lower pairs preserve dotted and dotless i and lowercase input',()=>{
  assert.equal(Guide.text('İ','lower'),'i');assert.equal(Guide.text('I','lower'),'ı');
  assert.equal(Guide.text('i','pair'),'İi');assert.equal(Guide.text('ı','pair'),'Iı');
  assert.equal(Guide.text('g','pair'),'Gg');assert.equal(Guide.text('Ali','lower'),'ali');
});
test('a single handwriting band shares a baseline and keeps descenders inside the page',()=>{
  for(const w of [320,800,1600]) {
    const g=Guide.layout(w,1131,48,'Aa',{cap:72,x:36,descent:25,width:125});
    assert(Math.abs((g.baseline-g.middle)*2-(g.baseline-g.top))<.01);
    assert(g.top>0&&g.bottom<1131&&g.fontSize*1.25<=w-36);
    assert.equal((Guide.path(g,'handwriting').match(/M/g)||[]).length,3);
    assert.equal(Guide.path(g,'none'),'');
  }
});
test('friction is silent at rest and speed controls both loudness and timbre',()=>{
  assert.equal(Sound.parameters(0).gain,0);assert.equal(Sound.parameters(5).gain,0);
  assert(Sound.parameters(500).gain>Sound.parameters(50).gain);
  assert(Sound.parameters(500).rate>Sound.parameters(50).rate);
  assert(Sound.parameters(500).cutoff>Sound.parameters(50).cutoff);
  assert(Sound.parameters(Infinity).gain===0);assert(Sound.parameters(2000,'rake').gain<.4);
});
test('original local granular sample is non-clipping PCM with a continuous loop join',()=>{
  const wav=fs.readFileSync(require.resolve('../assets/audio/sand-friction.wav'));
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt32LE(24),32000);assert.equal(wav.readUInt16LE(22),1);
  let sum=0,peak=0,n=(wav.length-44)/2;
  for(let i=44;i<wav.length;i+=2){const v=wav.readInt16LE(i);sum+=v*v;peak=Math.max(peak,Math.abs(v));}
  assert(peak<25000);assert(Math.sqrt(sum/n)>1000);assert(n/32000>2.5&&n/32000<4);
  assert(Math.abs(wav.readInt16LE(44)-wav.readInt16LE(wav.length-2))<10000);
});
