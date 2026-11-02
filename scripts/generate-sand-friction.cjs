// Original, deterministic granular friction sample. No third-party recording.
const fs = require('node:fs');
const path = require('node:path');
const rate=32000, length=rate*3, samples=new Float64Array(length);
let seed=903176;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
let low=0,body=0;
for(let i=0;i<length;i++) {
  const white=random()*2-1;low+=.065*(white-low);body+=.22*(white-body);
  samples[i]=(body-low)*.13;
}
for(let grain=0;grain<3400;grain++) {
  const start=Math.floor(random()*length),duration=Math.floor(rate*(.0015+random()*.009));
  const strength=.015+random()**3*.17;
  let filtered=0;
  for(let j=0;j<duration;j++) {
    filtered+=.38*((random()*2-1)-filtered);
    const envelope=Math.sin(Math.PI*j/duration)*Math.exp(-j/duration*3.4);
    samples[(start+j)%length]+=filtered*envelope*strength;
  }
}
// A short periodic join avoids a click without an audible recurring beat.
const join=640;
for(let i=0;i<join;i++) {
  const t=i/join,a=samples[i],b=samples[length-join+i];
  samples[length-join+i]=a*t+b*(1-t);
}
const loop=samples.subarray(join);
const peak=Math.max(...loop.subarray(0,32000).map(Math.abs),...loop.subarray(32000,64000).map(Math.abs),...loop.subarray(64000).map(Math.abs));
const out=Buffer.alloc(44+loop.length*2);
out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);
out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
out.write('data',36);out.writeUInt32LE(loop.length*2,40);
for(let i=0;i<loop.length;i++)out.writeInt16LE(Math.round(loop[i]/peak*.65*32767),44+i*2);
const dest=path.join(__dirname,'../assets/audio/sand-friction.wav');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,out);
console.log(`${dest}: ${out.length} bytes, ${loop.length/rate}s, mono PCM`);
