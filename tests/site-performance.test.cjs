const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {parseHTML}=require('linkedom');
function setup({cores=8,memory=8,touch=false,stored=null,blocked=false}={}) {
 const {window,document}=parseHTML('<html><head></head><body></body></html>'),frames=[],writes=[];
 delete window.SitePerformance;window.matchMedia=()=>({matches:touch});
 vm.runInNewContext(fs.readFileSync('js/site-performance.js','utf8'),{window,document,navigator:{hardwareConcurrency:cores,deviceMemory:memory},Event:window.Event,requestAnimationFrame:fn=>frames.push(fn),localStorage:{getItem(){if(blocked)throw Error();return stored;},setItem(k,v){if(blocked)throw Error();writes.push([k,v]);}}});
 return {window,document,frames,writes,api:window.SitePerformance};
}
test('low-spec or large touch devices receive lightweight rendering, with an explicit local override',()=>{
 for(const input of [{cores:4},{memory:4},{touch:true}]) {const h=setup(input);assert.equal(h.api.lite(),true);h.api.set('full');assert.equal(h.api.lite(),false);assert.deepEqual(h.writes,[['kemal_render_quality','full']]);h.api.reportSlow();assert.equal(h.api.lite(),false);}
 const h=setup({blocked:true});h.api.set('lite');assert.equal(h.api.lite(),true);assert.equal(h.document.querySelectorAll('link').length,1);
});
test('one bounded scroll sample detects sustained slowness without a permanent animation loop',()=>{
 const h=setup();assert.equal(h.frames.length,0);h.window.dispatchEvent(new h.window.Event('scroll'));let n=0;
 while(h.frames.length && n<150)h.frames.shift()((++n)*40);
 assert.equal(h.api.lite(),true);assert.equal(h.frames.length,0);assert.equal(n,91);
 h.window.dispatchEvent(new h.window.Event('scroll'));assert.equal(h.frames.length,0);
 const fast=setup();fast.window.dispatchEvent(new fast.window.Event('scroll'));n=0;while(fast.frames.length && n<150)fast.frames.shift()((++n)*16.67);
 assert.equal(fast.api.lite(),false);
});
