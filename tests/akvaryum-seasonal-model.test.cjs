const {test}=require('node:test');const assert=require('node:assert/strict');
const M=require('../js/akvaryum-seasonal-model.js');
test('snowman has smooth unit normals, genuine depth and a bounded reusable triangle mesh',()=>{
 const m=M.snowman();assert.equal(M.snowman(),m);assert.ok(m.vertices instanceof Float32Array);assert.ok(m.indices instanceof Uint16Array);assert.ok(m.vertices.length/9<25000);assert.ok(m.indices.length/3<40000);
 assert.ok(m.vertices.every(Number.isFinite));assert.ok(Math.max(...m.indices)<m.vertices.length/9);
 let lo=Infinity,hi=-Infinity;for(let i=0;i<m.vertices.length;i+=9){lo=Math.min(lo,m.vertices[i+2]);hi=Math.max(hi,m.vertices[i+2]);assert.ok(Math.abs(Math.hypot(...m.vertices.slice(i+3,i+6))-1)<1e-5);}
 assert.ok(hi-lo>1);assert.ok(m.indices.length>10000);
});
function fixture({available=true,compile=true}={}){
 let contexts=0,uploads=0,draws=0,deleted=0,lost=false;const callbacks={};
 const gl={getExtension:()=>({loseContext(){}}),createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>compile,deleteShader(){},createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,useProgram(){},enable(){},depthFunc(){},createBuffer:()=>({}),bindBuffer(){},bufferData(){uploads++;},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},viewport(){},clearColor(){},clear(){},uniform2f(){},getUniformLocation:()=>({}),drawElements(){draws++;},isContextLost:()=>lost,deleteBuffer(){deleted++;},deleteProgram(){deleted++;}};
 const surface={getContext:()=>{contexts++;return available?gl:null;},addEventListener(name,fn){callbacks[name]=fn;}};
 const canvas={ownerDocument:{createElement:()=>surface},getContext:()=>({clearRect(){},drawImage(){}})};
 return {canvas,renderer:M.createRenderer(canvas),contexts:()=>contexts,uploads:()=>uploads,draws:()=>draws,deleted:()=>deleted,lose(){lost=true;callbacks.webglcontextlost();}};
}
test('3D renderer creates one lazy GPU context, caps resolution, and releases its resources',()=>{
 const h=fixture();assert.equal(h.contexts(),0);assert.equal(h.renderer.render(300,440),true);assert.equal(h.contexts(),1);assert.equal(h.uploads(),2);
 assert.equal(h.renderer.render(1000,2000),true);assert.equal(h.contexts(),1);assert.equal(h.uploads(),2);assert.ok(h.canvas.width<=768&&h.canvas.height<=1152);
 h.lose();assert.equal(h.renderer.render(150,220),false);h.renderer.dispose();assert.equal(h.deleted(),3);h.renderer.dispose();assert.equal(h.deleted(),3);
});
test('unsupported WebGL and shader failures return control to the image fallback',()=>{
 for(const args of [{available:false},{compile:false}]){const h=fixture(args);assert.equal(h.renderer.render(180,264),false);assert.equal(h.draws(),0);}
});
