(function () {
  'use strict';

  const palette = {
    membrane: '#c88978', cytoplasm: '#a48065', nucleus: '#ad92cb',
    ribosome: '#e1b36d', lysosome: '#db91a8', er: '#7e9ccf', golgi: '#dfa68b',
    chloroplast: '#87ac65', centrosome: '#e2c184', vacuole: '#91cbd0',
    mitochondrion: '#d7895e', wall: '#909c63'
  };
  const color = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, n) => a.map(v => v * n);
  const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = (n, min, max) => Math.max(min, Math.min(max,n));
  const tau = Math.PI * 2;
  const signed = (n, p) => Math.sign(n) * Math.pow(Math.abs(n), p);
  const wave = n => ((Math.sin(n * 123.94) * 45678.242) % 1 + 1) % 1;

  function mesh(vertices, faces, tint, id, layer = 0, smooth = false) {
    return { vertices, faces: faces.map(indices => ({
      indices,
      normal: unit(cross(sub(vertices[indices[1]], vertices[indices[0]]), sub(vertices[indices[2]], vertices[indices[0]])))
    })), rgb: color(tint), id, layer, smooth };
  }

  function surface(point, rows, columns, tint, id, layer) {
    const vertices = [], faces = [];
    for (let i = 0; i <= rows; i++) {
      for (let j = 0; j <= columns; j++) vertices.push(point(i / rows, j / columns));
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        const a = i * (columns + 1) + j;
        faces.push([a, a + 1, a + columns + 2, a + columns + 1]);
      }
    }
    return mesh(vertices, faces, tint, id, layer, true);
  }

  function ellipsoid(at, scale, tint, id, { power = 1, angle = 0, from = 0, to = Math.PI, layer = 0, steps = 16, fold = 0 } = {}) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return surface((u, v) => {
      const p = from + u * (to - from), t = tau * v;
      const radius = signed(Math.sin(p), power) * (1 + fold * Math.cos(5 * t) * Math.sin(p));
      const x = radius * signed(Math.cos(t), power) * scale[0];
      const y = radius * signed(Math.sin(t), power) * scale[1];
      return add(at, [x*c-y*s, x*s+y*c, signed(Math.cos(p), power) * scale[2]]);
    }, Math.ceil(steps / 2), steps, tint, id, layer);
  }

  function box(at, size, tint, id, angle = 0) {
    const n = [-1,1], vertices = [];
    for (const z of n) for (const y of n) for (const x of n) {
      const px=x*size[0]/2, py=y*size[1]/2;
      vertices.push(add(at,[px*Math.cos(angle)-py*Math.sin(angle),px*Math.sin(angle)+py*Math.cos(angle),z*size[2]/2]));
    }
    return mesh(vertices, [[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]],tint,id);
  }

  function pipe(a, b, r, tint, id, rEnd = r, steps = 14) {
    const d = unit(sub(b,a));
    const u = unit(cross(d, Math.abs(d[1]) > .9 ? [1,0,0] : [0,1,0]));
    const v = cross(d,u);
    const vertices = [];
    for (const [p, radius] of [[a,r],[b,rEnd]]) for (let i=0;i<steps;i++) {
      const t = i*tau/steps;
      vertices.push(add(p, add(mul(u,radius*Math.cos(t)),mul(v,radius*Math.sin(t)))));
    }
    const bottom=Array.from({length:steps},(_,i)=>i);
    const top=bottom.map(i=>i+steps);
    const faces=bottom.map(i=>{
      const j=(i+1)%steps;
      return [i,j,j+steps,i+steps];
    });
    for (let i=1;i<steps-1;i++) faces.push([bottom[0],bottom[i+1],bottom[i]],[top[0],top[i],top[i+1]]);
    return mesh(vertices,faces,tint,id);
  }

  function ring(at, radii, width, tint, id, power = 1, layer = 0) {
    return surface((u,v)=>{
      const a=tau*u,b=tau*v;
      return add(at,[(radii[0]+width*Math.cos(b))*signed(Math.cos(a),power),
        (radii[1]+width*Math.cos(b))*signed(Math.sin(a),power),width*Math.sin(b)]);
    },56,6,tint,id,layer);
  }

  function bentTube(points, radius, tint, id, steps = 8) {
    return surface((u,v)=>{
      const i = Math.min(points.length-2,Math.floor(u*(points.length-1)));
      const pos = lerp(points[i],points[i+1],u*(points.length-1)-i);
      const dir=unit(sub(points[Math.min(i+2,points.length-1)],points[Math.max(0,i-1)]));
      const side=unit(cross(dir,[0,0,1]));
      const other=cross(dir,side);
      return add(pos,add(mul(side,radius*Math.cos(tau*v)),mul(other,radius*Math.sin(tau*v))));
    },points.length-1,steps,tint,id);
  }

  function organelle(id, at=[0,0,0], scale=1, angle=0, large=false) {
    const tint=palette[id];
    const c=Math.cos(angle),s=Math.sin(angle);
    const world=([x,y,z])=>add(at,[scale*(x*c-y*s),scale*(x*s+y*c),scale*z]);
    const E=(p,r,t=tint,options={})=>ellipsoid(world(p),mul(r,scale),t,id,{...options,angle:angle+(options.angle||0)});
    const P=(a,b,r,t=tint)=>pipe(world(a),world(b),r*scale,t,id);
    const tube=(points,r,t=tint)=>bentTube(points.map(world),r*scale,t,id);
    if (id==='nucleus') {
      const parts=[E([0,0,-.08],[.65,.59,.48],'#795e9a',{steps:24}),E([0,0,.16],[.61,.55,.24],tint,{steps:22}),E([.13,.09,.39],[.23,.21,.16],'#69467f')];
      for(let i=0;i<(large?19:8);i++){
        const a=i*2.399;
        parts.push(E([.52*Math.cos(a),.48*Math.sin(a),.27],[.037,.037,.031],'#d2b5e5',{steps:8}));
      }
      return parts;
    }
    if (id==='mitochondrion'||id==='chloroplast') {
      const chlor=id==='chloroplast';
      const base=E([0,0,0],[.68,.31,.25],chlor?'#567d47':'#a65438',{steps:20});
      const center=E([0,0,.11],[.61,.26,.17],chlor?'#bac888':'#e9a580',{steps:18});
      const parts=[base,center];
      for(let i=-3;i<=3;i++){
        const x=i*.145;
        if(chlor){
          const length=.16-(Math.abs(i)*.016);
          for(let j=0;j<3;j++) parts.push(E([x,.038*j-.044,.26],[.068,length,.027],j%2?'#7b9a4d':'#54733c',{angle:-.13,steps:10}));
        }else{
          parts.push(tube([[x,-.19,.22],[x+.04,-.09,.28],[x-.03,.04,.29],[x+.02,.18,.23]],.029,i%2?'#f1c3a0':'#f3c6a5'));
        }
      }
      return parts;
    }
    if (id==='er'||id==='golgi') {
      const isER=id==='er', parts=[];
      for(let i=0;i<5;i++){
        const y=(i-2)*.15;
        const width=(isER?.79:.65)-Math.abs(i-2)*.106;
        const points=Array.from({length:17},(_,j)=>{
          const t=j/16*2-1;
          return [t*width,y+.16*(1-t*t)+.032*Math.sin(t*6+i),.055+i*.04+.065*Math.cos(t*3)];
        });
        parts.push(tube(points,.057,i%2?(isER?'#98b4df':'#edbaa1'):tint));
        if(isER && i<4) for(let j=2;j<16;j+=3) {
          parts.push(E(add(points[j],[0,.025,.052]),[.036,.036,.032],palette.ribosome,{steps:8}));
        }
      }
      if(!isER) for(let i=0;i<5;i++) parts.push(E([.52+i*.048,.17+Math.sin(i*1.9)*.3,.17],[.075,.074,.071],tint,{steps:10}));
      return parts;
    }
    if(id==='centrosome'){
      const parts=[P([-.4,-.05,0],[.29,-.05,0],.12,'#a17c4b'),P([.24,-.37,.17],[.24,.33,.17],.12,'#a17c4b')];
      for(let i=0;i<9;i++){
        const t=i*tau/9;
        parts.push(P([-.43,-.05+Math.cos(t)*.11,Math.sin(t)*.11],[.31,-.05+Math.cos(t)*.11,Math.sin(t)*.11],.035));
        parts.push(P([.24+Math.cos(t)*.11,-.39,.17+Math.sin(t)*.11],[.24+Math.cos(t)*.11,.35,.17+Math.sin(t)*.11],.035));
      }
      return parts;
    }
    if(id==='ribosome') return [E([0,.11,0],[.32,.24,.24],tint,{fold:.08}),E([-.03,-.1,.05],[.25,.15,.19],'#c98b43',{fold:.09})];
    if(id==='membrane') {
      const parts=[];
      for(let i=-4;i<=4;i++) for(let j=-1;j<=1;j++){
        const x=i*.16,y=j*.14;
        for(const side of [-1,1]){
          parts.push(E([x,y,side*.18],[.065,.06,.058],tint,{steps:8}));
          parts.push(P([x,y,side*.14],[x-.026,y,.027*side],.014,'#dfb48b'));
        }
      }
      parts.push(E([.12,0,0],[.15,.2,.27],'#8cb8c2'));
      return parts;
    }
    if(id==='wall') {
      const parts=[];
      for(let i=-3;i<=3;i++) for(let j=-2;j<=2;j++) {
        parts.push(E([i*.22+(j%2)*.072,j*.174,0],[.13,.095,.08],j%2?'#b6bf8a':tint,{power:.48,steps:10}));
      }
      return parts;
    }
    if(id==='cytoplasm') {
      const parts=[E([0,0,0],[.91,.61,.29],tint,{fold:.08,steps:24})];
      for(let i=0;i<23;i++){
        const radial=Math.sqrt(wave(i+4)), t=i*2.399;
        parts.push(E([radial*Math.cos(t)*.8,radial*Math.sin(t)*.54,.23*Math.sqrt(1-radial*radial)],[.037,.036,.026],i%2?'#e0ba90':'#bc8d72',{steps:8}));
      }
      return parts;
    }
    const parts=[E([0,0,0],id==='vacuole'?[.72,.41,.24]:[.37,.37,.34],tint,{fold:.06,steps:20})];
    parts.push(E([-.1,.11,.18],id==='vacuole'?[.45,.17,.09]:[.19,.15,.1],id==='vacuole'?'#acd4d3':'#efb2bf'));
    if(id==='lysosome') for(let i=0;i<7;i++) parts.push(E([.2*Math.cos(i*2.39),.18*Math.sin(i*2.39),.29],[.041,.041,.035],'#9b5573',{steps:8}));
    return parts;
  }

  function cell(type, cut=true) {
    const plant=type==='plant';
    const power=plant?.28:1;
    const x=plant?2.72:2.68,y=plant?1.62:1.8;
    const shape={power,steps:72,fold:plant?0:.042};
    if(!cut){
      const skin=plant?palette.wall:palette.membrane;
      return [ellipsoid([0,0,0],[x,y,1.05],skin,plant?'wall':'membrane',shape)];
    }
    const inside=plant?'#829361':'#b5866c';
    const outer=plant?'#546542':'#935f51';
    const parts=[
      ellipsoid([0,0,-.105],[x,y,.95],outer,plant?'wall':'membrane',{...shape,from:Math.PI/2,to:Math.PI,layer:-4}),
      surface((r,v)=>[
        r*(x-.075)*signed(Math.cos(tau*v),power),
        r*(y-.075)*signed(Math.sin(tau*v),power),
        -.105+.039*(1-r*r)
      ],9,72,inside,'cytoplasm',-3),
      ring([0,0,-.02],[x-.025,y-.025],plant?.103:.061,plant?palette.wall:palette.membrane,plant?'wall':'membrane',power),
      ring([0,0,.005],[x-(plant?.15:.085),y-(plant?.15:.085)],.031,plant?'#c6ce9d':'#e3b397','membrane',power)
    ];
    const placements=plant?[
      ['nucleus',[-1.38,.14,.05],.85],['er',[-1.38,-.62,.15],.65,-.25],
      ['vacuole',[.30,.22,.09],1.52,.03],['golgi',[.8,-.88,.15],.72,.15],
      ['chloroplast',[1.39,1.02,.19],.82,-.22],['chloroplast',[1.85,.22,.08],.76,-1.18],
      ['chloroplast',[-.55,1.08,.12],.72,.10],['mitochondrion',[-1.65,1.01,.06],.60,.23],
      ['mitochondrion',[-1.33,-1.1,.06],.60,-.18],['mitochondrion',[1.69,-.94,.06],.62,.25]
    ]:[
      ['nucleus',[-.38,.22,.11],1.02],['er',[-1,-.56,.13],.95,.43],['golgi',[.98,-.59,.13],.87,-.43],
      ['mitochondrion',[-1.68,.62,.05],.74,.78],['mitochondrion',[1.4,.8,.06],.70,-.39],
      ['mitochondrion',[-.57,-1.22,.08],.66,-.15],['centrosome',[.85,.56,.08],.60,-.31],
      ['vacuole',[.16,1.24,.08],.45],['vacuole',[1.88,-.26,.1],.40],
      ['lysosome',[1.35,-1.14,.09],.64],['lysosome',[-1.84,-.36,.06],.57]
    ];
    for(const placement of placements) parts.push(...organelle(...placement));
    for(let i=0;i<46;i++){
      const a=i*2.399, r=Math.sqrt(wave(i+21))*.94;
      const px=r*Math.cos(a)*(x-.18), py=r*Math.sin(a)*(y-.18);
      parts.push(ellipsoid([px,py,-.005],[.034,.032,.028],palette.ribosome,'ribosome',{steps:7}));
    }
    return parts;
  }

  function microscope(selected, stageHeight=0) {
    const metal='#dddcd1', body='#a9b5b0', rubber='#344644', steel='#81928b';
    const parts=[];
    const B=(at,size,tint,id,angle)=>parts.push(box(at,size,selected===id?'#82b5a4':tint,id,angle));
    const E=(at,size,tint,id,power)=>parts.push(ellipsoid(at,size,selected===id?'#82b5a4':tint,id,{power,steps:24}));
    const P=(a,b,r,tint,id,rEnd)=>parts.push(pipe(a,b,r,selected===id?'#82b5a4':tint,id,rEnd,22));
    E([.12,-1.96,0],[1.74,.145,1.23],rubber,'base',.29);
    E([.12,-1.76,0],[1.69,.12,1.17],metal,'base',.25);
    const armPoints=Array.from({length:20},(_,i)=>{
      const t=i/19;
      return [1.10+.36*Math.sin(Math.PI*t)-1.33*Math.pow(t,5),-1.61+3.02*t,-.27];
    });
    parts.push(bentTube(armPoints,.24,selected==='arm'?'#82b5a4':body,'arm',14));
    P([-.35,-1.52,0],[-.35,-1.29,0],.36,steel,'light');
    P([-.35,-1.29,0],[-.35,-1.26,0],.25,'#bdc9bb','light');
    B([.67,-.66,-.31],[.56,.56,.56],steel,'focus');
    for(const side of [-1,1]) {
      B([-.34+side*.6375,-.55+stageHeight,0],[.745,.12,1.39],rubber,'stage');
      B([-.34,-.55+stageHeight,side*.4725],[.53,.12,.445],rubber,'stage');
    }
    B([.03,-.43+stageHeight,.3],[.56,.06,.10],metal,'stage');
    B([-.75,-.43+stageHeight,-.30],[.48,.06,.10],metal,'stage');
    P([.98,-.59,-.01],[.98,-.59,.66],.26,rubber,'focus');
    P([.98,-.59,.66],[.98,-.59,.77],.15,steel,'focus');
    P([-.35,-1.05,0],[-.35,-.69+stageHeight,0],.29,rubber,'condenser',.37);
    P([-.38,1.32,0],[-.38,1.64,0],.39,body,'nose');
    P([-.38,.89,0],[-.38,1.30,0],.17,metal,'objective',.188);
    P([-.38,.88,0],[-.38,.98,0],.18,'#b65758','objective');
    P([.04,.99,.09],[-.05,1.36,.01],.15,metal,'objective',.18);
    P([.04,.91,.10],[.035,1.04,.086],.15,'#b98a51','objective');
    P([-.73,.83,-.05],[-.64,1.34,-.015],.16,metal,'objective',.18);
    P([-.74,.84,-.05],[-.72,.99,-.04],.16,'#729ba9','objective');
    P([-.4,1.57,0],[-.87,2.25,.025],.32,metal,'tube',.265);
    P([-.87,2.25,.025],[-1.02,2.46,.032],.23,rubber,'eyepiece');
    P([-1.02,2.46,.032],[-1.055,2.51,.035],.286,rubber,'eyepiece');
    P([-1.056,2.512,.035],[-1.074,2.538,.036],.175,'#668c97','eyepiece');
    return parts;
  }

  function slide(phase, progress, type) {
    const onStage=phase==='light'||phase==='approach';
    const moved=phase==='mount'?progress:onStage?1:0;
    const at=lerp([-.53,-1.08,.98],[-.34,-.45,0],moved);
    const parts=[box(at,[1.34,.045,.55],'#a7c3c0')];
    const sampleY=phase==='drop'?1-progress:0;
    parts.push(ellipsoid(add(at,[0,.055+sampleY,.02]),[.23,.045,.15],type==='plant'?'#91a36a':'#bc82a6',null,{steps:18}));
    if(phase!=='drop') {
      const height=phase==='cover'?.85*(1-progress):0;
      parts.push(box(add(at,[.01,.105+height,0]),[.51,.029,.39],'#bed6d0'));
    }
    return parts;
  }

  const vertexSource = `
    attribute vec3 point;
    attribute vec3 normal;
    attribute vec3 pigment;
    uniform vec4 angles;
    uniform vec3 center;
    uniform vec2 size;
    varying mediump vec3 facing;
    varying mediump vec3 paint;
    vec3 turn(vec3 p) {
      float z = -p.x * angles.y + p.z * angles.x;
      return vec3(p.x * angles.x + p.z * angles.y,
        p.y * angles.z - z * angles.w, p.y * angles.w + z * angles.z);
    }
    void main() {
      vec3 p = turn(point - center);
      float depth = max(0.24, 1.0 - p.z / 13.0);
      gl_Position = vec4(p.xy * size, depth - 0.6, depth);
      facing = turn(normal);
      paint = pigment;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying mediump vec3 facing;
    varying mediump vec3 paint;
    void main() {
      vec3 n = normalize(facing);
      if (n.z < 0.0) n = -n;
      vec3 light = normalize(vec3(-0.48, 0.55, 0.73));
      float diffuse = max(dot(n, light), 0.0);
      float shine = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);
      vec3 color = paint * (0.55 + 0.50 * diffuse) + vec3(0.14 * shine);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  let graphics;
  const packedMeshes = new WeakMap(), packedScenes = new WeakMap();

  function initGraphics() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha:true, antialias:true, premultipliedAlpha:true });
    if(!gl) return null;
    const program = gl.createProgram();
    for(const [kind,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]){
      const shader=gl.createShader(kind);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) return null;
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) return null;
    const uniform = Object.fromEntries(['angles','center','size'].map(key=>[key,gl.getUniformLocation(program,key)]));
    const buffer=gl.createBuffer();
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [i,key] of ['point','normal','pigment'].entries()){
      const attr=gl.getAttribLocation(program,key);
      gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,3,gl.FLOAT,false,36,i*12);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0,0,0,0);
    canvas.addEventListener('webglcontextlost',event=>event.preventDefault());
    canvas.addEventListener('webglcontextrestored',()=>{ graphics=undefined; });
    return {canvas,gl,uniform};
  }

  function pack(item) {
    if(packedMeshes.has(item)) return packedMeshes.get(item);
    const result=[];
    const rgb=item.rgb.map(c=>c/255);
    const normals=new Map();
    const vertexKeys=item.smooth?item.vertices.map(point=>point.map(n=>Math.round(n*1e5)).join(',')):[];
    if(item.smooth){
      for(const face of item.faces) for(const i of face.indices) {
        const key=vertexKeys[i];
        normals.set(key,add(normals.get(key)||[0,0,0],face.normal));
      }
      for(const [key,n] of normals) normals.set(key,unit(n));
    }
    for(const face of item.faces){
      const [a,...rest]=face.indices;
      for(let j=0;j<rest.length-1;j++){
        for(const i of [a,rest[j],rest[j+1]]){
          const normal=normals.get(vertexKeys[i])||face.normal;
          result.push(...item.vertices[i],...normal,...rgb);
        }
      }
    }
    const data=new Float32Array(result);
    packedMeshes.set(item,data);
    return data;
  }

  function gpuView(ctx, width, height, scene, camera) {
    if(graphics===undefined){
      try{graphics=initGraphics();}catch{graphics=null;}
    }
    if(!graphics||graphics.gl.isContextLost()) return false;
    const {canvas,gl,uniform}=graphics;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform4f(uniform.angles,...camera.angles);
    gl.uniform3f(uniform.center,...camera.target);
    gl.uniform2f(uniform.size,2*camera.scale/camera.w,2*camera.scale/camera.h);
    if(!packedScenes.has(scene)){
      const parts=scene.map(pack);
      const data=new Float32Array(parts.reduce((sum,part)=>sum+part.length,0));
      let offset=0;
      for(const part of parts){data.set(part,offset);offset+=part.length;}
      packedScenes.set(scene,data);
    }
    const data=packedScenes.get(scene);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES,0,data.length/9);
    ctx.drawImage(canvas,0,0,camera.w,camera.h);
    return true;
  }

  function view(canvas, scene, opts={}) {
    const ctx=canvas.getContext('2d');
    const rect=canvas.getBoundingClientRect();
    const W=rect.width,H=rect.height;
    if(!ctx||!W||!H) return ()=>null;
    const ratio=Math.min(2,devicePixelRatio||1);
    if(canvas.width!==Math.round(W*ratio)||canvas.height!==Math.round(H*ratio)){
      canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
    }
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    const bg=ctx.createRadialGradient(W*.5,H*.40,0,W*.5,H*.48,Math.max(W,H)*.73);
    bg.addColorStop(0,'#304641');bg.addColorStop(1,'#142522');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const yaw=opts.yaw||0,pitch=opts.pitch||0;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const rotate=([x,y,z])=>[x*cy+z*sy,y*cp-(-x*sy+z*cy)*sp,y*sp+(-x*sy+z*cy)*cp];
    const scale=Math.min(W/(opts.fitWidth||6.4),H/(opts.fitHeight||4.35))*(opts.zoom||1);
    const target=opts.target||[0,0,0];
    const project=p=>{
      const [x,y,z]=rotate(sub(p,target));
      const f=opts.flat?scale:scale*13/Math.max(3,13-z);
      return [W/2+x*f,H/2-y*f,z];
    };
    function depthPolygons() {
      const polygons=[];
      for(const item of scene){
        const points=item.vertices.map(project);
        for(const {indices,normal} of item.faces){
          const poly=indices.map(i=>points[i]);
          const depth=poly.reduce((total,p)=>total+p[2],0)/poly.length;
          const [nx,ny,nz]=rotate(normal);
          const shade=opts.flat?.95+Math.min(.1,Math.abs(nz)*.1):.65+.42*Math.abs(-nx*.36+ny*.54+nz*.76);
          const rgb=item.rgb.map(n=>clamp(Math.round(n*shade),0,255));
          polygons.push({poly,depth,layer:item.layer,id:item.id,paint:`rgb(${rgb.join(',')})`});
        }
      }
      return polygons.sort((a,b)=>a.layer-b.layer||a.depth-b.depth);
    }
    let polygons;
    const accelerated=!opts.flat && gpuView(ctx,canvas.width,canvas.height,scene,
      {angles:[cy,sy,cp,sp],target,scale,w:W,h:H});
    if(!accelerated){
      polygons=depthPolygons();
      ctx.lineJoin='round';ctx.lineWidth=.72;
      for(const {poly,paint} of polygons){
        ctx.beginPath();ctx.moveTo(poly[0][0],poly[0][1]);
        for(let i=1;i<poly.length;i++) ctx.lineTo(poly[i][0],poly[i][1]);
        ctx.closePath();ctx.fillStyle=paint;ctx.strokeStyle=paint;ctx.fill();ctx.stroke();
      }
    }
    const markers=[];
    if(opts.labels){
      const groups=new Map();
      for(const item of scene) if(item.id && !groups.has(item.id)) groups.set(item.id,item);
      for(const [id,item] of groups){
        const middle=item.vertices.reduce((t,p)=>add(t,p),[0,0,0]).map(n=>n/item.vertices.length);
        if(id==='wall'||id==='membrane') middle[0]=id==='wall'?-2.62:2.57;
        if(id==='cytoplasm') middle[1]=-1.42;
        const [x,y]=project(middle);
        if(x<12||x>W-12||y<12||y>H-12||markers.some(p=>Math.hypot(x-p.x,y-p.y)<23)) continue;
        markers.push({id,x,y});
        ctx.beginPath();ctx.arc(x,y,9,0,tau);ctx.fillStyle='#233632';ctx.fill();
        ctx.strokeStyle='#e6f4ed';ctx.lineWidth=1.4;ctx.stroke();
        ctx.beginPath();ctx.arc(x,y,3.4,0,tau);ctx.fillStyle=palette[id]||'#b7d0c6';ctx.fill();
      }
    }
    return (x,y)=>{
      const mark=markers.find(p=>Math.hypot(x-p.x,y-p.y)<12);
      if(mark) return mark.id;
      polygons ||= depthPolygons();
      for(let i=polygons.length-1;i>=0;i--){
        const {poly,id}=polygons[i];
        if(!id||typeof id!=='string') continue;
        let inside=false;
        for(let a=0,b=poly.length-1;a<poly.length;b=a++){
          const [ax,ay]=poly[a],[bx,by]=poly[b];
          if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
        }
        if(inside) return id;
      }
      return null;
    };
  }

  window.CellLabModels={palette,cell,microscope,slide,organelle,view};
})();
