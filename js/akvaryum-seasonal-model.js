/* Smooth, bounded 3D seasonal decor. No animation loop or model downloads.
   A single lazily created WebGL surface paints a supersampled 2D canvas only
   when its display size changes; per-vertex normals keep snow surfaces smooth. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumSeasonalModels=factory();})(typeof window==='object'?window:this,function(){
 'use strict';
 const normal=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let cached;
 function snowman(){
  if(cached)return cached;
  const vertices=[],indices=[];
  function vertex(p,n,c){vertices.push(...p,...n,...c);}
  function ellipsoid(center,radii,color,segments=40,rings=26,power=1){
   const base=vertices.length/9;
   for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,b=j/rings*Math.PI,q=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];
    const shape=q.map(v=>Math.sign(v)*Math.pow(Math.abs(v),power));
    vertex(shape.map((v,k)=>center[k]+v*radii[k]),normal(shape.map((v,k)=>Math.sign(v)*Math.pow(Math.abs(v),2/power-1)/radii[k])),color);
   }
   for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=base+j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
  function tube(a,b,r1,r2,color,segments=14){
   const axis=normal(b.map((v,i)=>v-a[i])),side=normal(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),up=cross(axis,side),base=vertices.length/9;
   for(let j=0;j<2;j++)for(let i=0;i<=segments;i++){
    const t=i/segments*Math.PI*2,radial=side.map((v,k)=>v*Math.cos(t)+up[k]*Math.sin(t)),r=j?r2:r1,center=j?b:a;
    vertex(center.map((v,k)=>v+radial[k]*r),normal(radial.map((v,k)=>v+axis[k]*(r1-r2)/Math.hypot(...b.map((x,n)=>x-a[n])))),color);
   }
   for(let i=0;i<segments;i++){const k=base+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
  const snow=[.94,.975,.97],white=[1,1,.98],coal=[.105,.14,.15],wood=[.28,.20,.14],red=[.62,.14,.16];
  ellipsoid([-.29,.18,.21],[.29,.18,.40],snow);ellipsoid([.29,.18,.21],[.29,.18,.40],snow);
  ellipsoid([0,.91,-.04],[.69,.79,.54],snow,52,36);ellipsoid([0,1.94,0],[.46,.49,.39],snow,48,32);
  ellipsoid([0,2.99,0],[.60,.66,.48],snow,56,40);ellipsoid([0,2.61,.05],[.46,.28,.39],snow);
  for(const sign of [-1,1]){
   ellipsoid([sign*.28,2.80,.30],[.22,.18,.12],snow,26,18);
   ellipsoid([sign*.19,3.15,.444],[.135,.165,.075],white,30,22);
   ellipsoid([sign*.18+.012,3.145,.510],[.065,.09,.027],[.22,.35,.37],22,18);
   ellipsoid([sign*.18+.018,3.145,.533],[.039,.061,.014],coal,20,16);
   ellipsoid([sign*.18-.004,3.185,.547],[.019,.022,.006],white,12,10);
   // Soft arched twig brows and a raised welcoming hand with three fingers.
   for(let i=0;i<5;i++){
    const x1=sign*.19-.13+i*.052,x2=x1+.052,y1=3.39+Math.sin(i/5*Math.PI)*.035,y2=3.39+Math.sin((i+1)/5*Math.PI)*.035;
    tube([x1,y1,.45],[x2,y2,.45],.019,.019,wood,10);
   }
   const elbow=[sign*.82,2.03,.04],wrist=[sign*1.10,2.30,.05];
   tube([sign*.39,2.05,0],elbow,.035,.026,wood);tube(elbow,wrist,.027,.019,wood);
   for(let i=0;i<3;i++)tube(wrist,[sign*(1.20+(i-1)*.055),2.36+(i===1?.14:0),.05+(i-1)*.065],.018,.008,wood,10);
  }
  // Open smile, two snowy teeth and a smoothly tapered carrot.
  const mouthBase=vertices.length/9;vertex([0,2.68,.51],[0,0,1],[.20,.105,.075]);
  const mouth=[];for(let i=0;i<=20;i++){const x=-.27+i*.027;mouth.push([x,2.81-.06*(1-(x/.27)**2),.51-(x/.27)**2*.055]);}
  for(let i=20;i>=0;i--){const x=-.27+i*.027;mouth.push([x,2.81-.23*Math.sqrt(Math.max(0,1-(x/.27)**2)),.51-(x/.27)**2*.055]);}
  mouth.forEach(point=>vertex(point,[0,0,1],[.20,.105,.075]));for(let i=0;i<mouth.length;i++)indices.push(mouthBase,mouthBase+1+i,mouthBase+1+(i+1)%mouth.length);
  ellipsoid([0,2.755,.535],[.105,.055,.025],white,24,16,.4);
  tube([0,2.99,.47],[.20,2.93,1.02],.105,.006,[.96,.39,.075],32);
  for(const y of [1.82,1.31,.94])ellipsoid([.015,y,y>1.6?.382:.498],[.063,.071,.028],coal,18,14);
  // A small scarf keeps the scene seasonal without obscuring the friendly face.
  for(let i=0;i<32;i++){
   const a=i/32*Math.PI*2,b=(i+1)/32*Math.PI*2;
   tube([Math.cos(a)*.32,2.37,Math.sin(a)*.30],[Math.cos(b)*.32,2.37,Math.sin(b)*.30],.055,.055,red,8);
  }
  ellipsoid([-.15,2.12,.388],[.077,.24,.035],red,22,18);
  for(let i=-1;i<=1;i++){
   const start=[i*.09,3.59,-.02],mid=[i*.16,3.80,.01],tip=[i*.20+(i===0?.045:0),3.94-Math.abs(i)*.055,.04];
   tube(start,mid,.022,.015,wood,10);tube(mid,tip,.015,.006,wood,10);
  }
  cached={vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};return cached;
 }
 function createRenderer(canvas){
  let surface,gl,program,vertex,index,lost=false;
  function dispose(){if(gl){if(vertex)gl.deleteBuffer(vertex);if(index)gl.deleteBuffer(index);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}gl=null;}
  function init(){
   if(gl)return !lost;
   try{
    surface=canvas.ownerDocument.createElement('canvas');
    gl=surface.getContext('webgl',{alpha:true,antialias:true,depth:true,stencil:false,powerPreference:'low-power',premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)return false;
    surface.addEventListener('webglcontextlost',()=>{lost=true;});
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Decor shader');}return s;}
    const v=shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform vec2 scale;varying vec3 N;varying vec3 C;varying vec3 P;void main(){float a=0.27;mat3 r=mat3(cos(a),0.,-sin(a),0.,1.,0.,sin(a),0.,cos(a));vec3 q=r*p;N=r*n;C=c;P=p;gl_Position=vec4(q.x*scale.x,(q.y-2.0)*scale.y,-q.z*.22,1.);}');
    const f=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 N;varying vec3 C;varying vec3 P;void main(){vec3 n=normalize(N);vec3 light=normalize(vec3(-.65,.8,1.2));float d=max(dot(n,light),0.);float grain=sin(P.x*251.+P.z*193.)*sin(P.y*287.)*.012;float snow=step(.8,C.r);float seam=1.-.055*exp(-pow((P.y-1.57)*15.,2.))-.055*exp(-pow((P.y-2.39)*19.,2.));vec3 lit=C*(.57+.43*d)*seam+snow*(grain+pow(max(dot(n,normalize(light+vec3(0.,0.,1.))),0.),30.)*.035);gl_FragColor=vec4(lit,1.);}');
    program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Decor program');
    gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    const model=snowman();vertex=gl.createBuffer();index=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,model.vertices,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,model.indices,gl.STATIC_DRAW);
    for(const [name,offset] of [['p',0],['n',12],['c',24]]){const attr=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,36,offset);}return true;
   }catch(_){dispose();return false;}
  }
  function render(width,height){
   if(!init()||lost)return false;
   try{
    const scale=Math.min(2.5,Math.max(1.5,typeof devicePixelRatio==='number'?devicePixelRatio:2));
    const w=Math.min(768,Math.ceil(width*scale)),h=Math.min(1152,Math.ceil(height*scale));
    surface.width=w;surface.height=h;gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    // A fixed camera preserves natural proportions at all responsive sizes.
    const unit=Math.min(w/2.9,h/4.35);gl.uniform2f(gl.getUniformLocation(program,'scale'),2*unit/w,2*unit/h);
    gl.drawElements(gl.TRIANGLES,snowman().indices.length,gl.UNSIGNED_SHORT,0);
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return false;canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.drawImage(surface,0,0);
    return !gl.isContextLost();
   }catch(_){return false;}
  }
  return {render,dispose};
 }
 return {snowman,createRenderer};
});
