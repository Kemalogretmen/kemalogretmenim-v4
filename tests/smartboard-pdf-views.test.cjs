const test=require('node:test'),assert=require('node:assert/strict');
const {geometry}=require('../js/smartboard-pdf-views.js');
test('continuous PDF layout preserves page proportions and includes every page without overlap',()=>{
 const pages=[{pdf:{width:800,height:1100}},{pdf:{width:1100,height:800}},{pdf:{width:800,height:1100}}],g=geometry(pages,.5,'continuous');
 assert.equal(g.width,550);assert.equal(g.rects.length,3);for(let i=1;i<3;i++)assert(g.rects[i].top>=g.rects[i-1].top+g.rects[i-1].height+20);
 assert.equal(g.rects[0].left,75);assert.equal(g.height,1540);
});
test('facing PDF layout pairs pages on a shared row and leaves an odd last page centered',()=>{
 const pages=Array.from({length:5},()=>({pdf:{width:800,height:1000}})),g=geometry(pages,.5,'facing');
 assert.equal(g.width,820);assert.equal(g.rects[0].top,g.rects[1].top);assert.equal(g.rects[1].left,420);assert.equal(g.rects[4].left,210);assert.equal(g.rects[4].top,1040);assert.equal(g.height,1540);
});
