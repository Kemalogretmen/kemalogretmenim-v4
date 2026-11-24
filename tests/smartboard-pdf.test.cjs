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
