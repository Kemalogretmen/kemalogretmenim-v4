const test=require('node:test');
const assert=require('node:assert/strict');
const pdf=require('../js/smartboard-pdf.js');
test('PDF raster bounds cap active-page pixels independently of device resolution',()=>{
  for(const [w,h] of [[800,1131],[800,2200],[3000,6000]]){const b=pdf.bounds(w,h);assert(b.width*b.height<=1800000);assert(b.width>0&&b.height>0);}
});
test('editable PDF manifests reject foreign page references, oversized paths and executable image sources',()=>{
  const m=()=>({version:1,pages:[{pdf:{page:1,width:800,height:1131},items:[]}]});
  assert.equal(pdf.validateManifest(m(),3).pages.length,1);
  for(const mutate of [x=>x.pages[0].pdf.page=4,x=>x.pages[0].pdf.width=Infinity,x=>x.pages[0].items.push({kind:'image',src:'https://foreign.invalid/a.png'}),x=>x.pages[0].items.push({kind:'path',points:[{x:NaN,y:0}]})]){const x=m();mutate(x);assert.throws(()=>pdf.validateManifest(x,3));}
});
test('PDF annotation placement follows crop-box offsets and all four page rotations',()=>{
  const p={getCropBox:()=>({x:20,y:30,width:400,height:600})};
  assert.deepEqual(pdf.overlayPlacement(p,0),{x:20,y:30,width:400,height:600,angle:0});
  assert.deepEqual(pdf.overlayPlacement(p,90),{x:420,y:30,width:600,height:400,angle:90});
  assert.deepEqual(pdf.overlayPlacement(p,180),{x:420,y:630,width:400,height:600,angle:180});
  assert.deepEqual(pdf.overlayPlacement(p,270),{x:20,y:630,width:600,height:400,angle:270});
});
test('PDF cleanup uses the loading task without calling a missing document destroy method',async()=>{
  let calls=0;const owner={doc:{loadingTask:{destroy:async()=>{calls++;}}}};
  await pdf.disposeDocument(owner);await pdf.disposeDocument(owner);assert.equal(calls,1);assert.equal(owner.doc,null);assert.equal(owner.task,null);
  const direct={doc:{},task:{destroy:async()=>{calls++;}}};await pdf.disposeDocument(direct);assert.equal(calls,2);
  const legacy={doc:{destroy:async()=>{calls++;}}};await pdf.disposeDocument(legacy);assert.equal(calls,3);
  await pdf.disposeDocument({doc:{}});await pdf.disposeDocument(null);
});
test('textbook opening limits are independent from the bounded persistent cache',()=>{
  assert.equal(pdf.limits.file,512*1024*1024);
  assert.equal(pdf.limits.openBytes,2*1024*1024*1024);
  assert.equal(pdf.limits.pages,2000);
  assert.equal(pdf.limits.cache,24*1024*1024);
});
test('local PDFs use bounded on-demand slices without reading the whole file',async()=>{
  let active=0,peak=0;const reads=[],delivered=[],failures=[];
  const blob={size:250*1024*1024,arrayBuffer(){throw Error('Whole-file read');},slice(begin,end){
    reads.push([begin,end]);return{arrayBuffer:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;const bytes=new Uint8Array(end-begin);if(!begin)bytes.set(new TextEncoder().encode('%PDF-1.7'));return bytes.buffer;}};
  }};
  class Transport {constructor(length,initial,done){Object.assign(this,{length,initial,done});}onDataRange(begin,bytes){delivered.push([begin,bytes.length]);}}
  const source=await pdf.localSource({PDFDataRangeTransport:Transport},blob,e=>failures.push(e));
  assert(source.disableAutoFetch&&source.disableStream);
  assert.equal(source.range.length,blob.size);
  assert.equal(reads.length,1);
  for(let i=1;i<=5;i++)source.range.requestDataRange(i*262144,(i+1)*262144);
  await new Promise(r=>setTimeout(r,40));
  assert.equal(delivered.length,5);assert(peak<=2);assert.equal(failures.length,0);
  source.range.abort();source.range.requestDataRange(0,1024);assert.equal(reads.length,6);
  assert(reads.every(([a,b])=>b-a<=262144));
});
test('local range abort suppresses late reads and read errors are reported',async()=>{
  let finish,delivered=0;const failures=[];
  class Transport {onDataRange(){delivered++;}}
  const first=new TextEncoder().encode('%PDF-1.7').buffer;
  const blob={size:300000,slice(begin){return{arrayBuffer:()=>begin?new Promise(resolve=>{finish=resolve;}):Promise.resolve(first)}}};
  const source=await pdf.localSource({PDFDataRangeTransport:Transport},blob,e=>failures.push(e));
  source.range.requestDataRange(262144,300000);source.range.abort();finish(new ArrayBuffer(37856));
  await new Promise(r=>setTimeout(r,0));assert.equal(delivered,0);
  const failing={size:300000,slice(begin){return{arrayBuffer:async()=>{if(begin)throw Error('File no longer readable');return first;}}}};
  const next=await pdf.localSource({PDFDataRangeTransport:Transport},failing,e=>failures.push(e));
  next.range.requestDataRange(262144,300000);await new Promise(r=>setTimeout(r,0));
  assert.equal(failures.length,1);assert.match(failures[0].message,/no longer readable/);
});
test('editable projects stream in chunks and remain compatible with legacy archives',async()=>{
  const zip=require('../vendor/smartboard-pdf/fflate.min.js');
  class SliceOnly extends Blob {arrayBuffer(){throw Error('Whole-file read');}}
  const source=new SliceOnly([new TextEncoder().encode('%PDF-1.7\n'),new Uint8Array(3*1024*1024)]);
  const manifest={version:1,name:'Book.pdf',pages:[{pdf:{page:1,width:600,height:800},items:[]}]};
  const archive=await pdf.writeProject(source,manifest,zip);
  const loaded=await pdf.readProject(new SliceOnly([archive]),zip);
  assert.equal(loaded.blob.size,source.size);assert.deepEqual(loaded.manifest,manifest);
  assert.equal(await loaded.blob.slice(0,9).text(),'%PDF-1.7\n');
  const legacy=zip.zipSync({'source.pdf':new TextEncoder().encode('%PDF-1.7'),'manifest.json':new TextEncoder().encode(JSON.stringify(manifest))},{level:6});
  assert.deepEqual((await pdf.readProject(new Blob([legacy]),zip)).manifest,manifest);
});
test('streaming archives reject unknown entries, incomplete projects and oversized notes',async()=>{
  const zip=require('../vendor/smartboard-pdf/fflate.min.js');
  for(const content of [{bad:new Uint8Array(1)},{'source.pdf':new Uint8Array(1)}]) {
    await assert.rejects(pdf.readProject(new Blob([zip.zipSync(content)]),zip));
  }
  await assert.rejects(pdf.writeProject(new Blob(['%PDF-1.7']),{notes:'x'.repeat(8*1024*1024)},zip),/8 MB/);
});
