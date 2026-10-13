/* One offscreen WebGL1 surface serves many independent 2D fish canvases.
 * render(canvas, species, phaseSeconds, moving, headingDegrees=0) -> boolean. Callers schedule
 * frames and keep their existing DOM transform, label and stacking behavior.
 * No animation loop, external assets, or additional WebGL contexts per fish. */
(function(root){
  'use strict';
  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function multiply(a,b){
    const out=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
    return out;
  }
  function local(origin,p){
    let m=identity();m[12]=origin[0];m[13]=origin[1];m[14]=origin[2];
    for(const [axis,angle] of [[0,p.rx],[1,p.ry],[2,p.rz]]){
      const r=identity(),c=Math.cos(angle),s=Math.sin(angle);
      if(axis===0){r[5]=c;r[6]=s;r[9]=-s;r[10]=c;}
      if(axis===1){r[0]=c;r[2]=-s;r[8]=s;r[10]=c;}
      if(axis===2){r[0]=c;r[1]=s;r[4]=-s;r[5]=c;}
      m=multiply(m,r);
    }
    const s=identity();s[0]=p.sx;s[5]=p.sy;s[10]=p.sz;return multiply(m,s);
  }
  function create(){
    const fallback={supported:false,render:()=>false,dispose:()=>{}};
    if(!root.document||!root.AquariumCreatureModels)return fallback;
    let gl,surface,program,disposed=false,lost=false;
    const cache=new Map(),contexts=new WeakMap();
    function cleanup(){
      if(disposed)return;disposed=true;
      if(gl&&!lost){
        for(const model of cache.values())for(const part of model.parts){gl.deleteBuffer(part.vertex);gl.deleteBuffer(part.index);}
        if(program)gl.deleteProgram(program);
        const extension=gl.getExtension('WEBGL_lose_context');if(extension)extension.loseContext();
      }
      cache.clear();
    }
    try{
      surface=root.document.createElement('canvas');surface.width=192;surface.height=128;
      gl=surface.getContext('webgl',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
      if(!gl)return fallback;
      surface.addEventListener('webglcontextlost',()=>{lost=true;});
      function shader(type,source){
        const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Creature shader failed');}return s;
      }
      const vert=shader(gl.VERTEX_SHADER,'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; uniform mat4 uMatrix; uniform mat4 uWorld; varying vec3 vColor; varying vec3 vNormal; void main(){gl_Position=uMatrix*vec4(aPosition,1.0);vNormal=mat3(uWorld)*aNormal;vColor=aColor;}');
      const frag=shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec3 vColor; varying vec3 vNormal; void main(){vec3 n=normalize(vNormal);float light=0.48+0.52*max(dot(n,normalize(vec3(0.3,0.75,1.0))),0.0);float rim=pow(1.0-abs(n.z),3.0)*0.1;gl_FragColor=vec4(vColor*light+rim,1.0);}');
      program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Creature program failed');
      gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      const position=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal'),color=gl.getAttribLocation(program,'aColor');
      for(const attr of [position,normal,color])gl.enableVertexAttribArray(attr);
      const matrix=gl.getUniformLocation(program,'uMatrix'),world=gl.getUniformLocation(program,'uWorld');
      function upload(id){
        if(cache.has(id))return cache.get(id);
        const definition=root.AquariumCreatureModels.makeModel(id);if(!definition)return null;
        const model={parts:definition.parts.map(p=>{
          const vertex=gl.createBuffer(),index=gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p.mesh.vertices),gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(p.mesh.indices),gl.STATIC_DRAW);
          return {id:p.id,parent:p.parent,origin:p.origin,vertex,index,count:p.mesh.indices.length};
        })};cache.set(id,model);return model;
      }
      // Slightly raised camera shows shell and fin thickness. Heading is applied
      // in 3D; callers retain DOM position and depth but omit CSS rotateY.
      const view=local([0,0,0],{rx:.32,ry:-.32,rz:0,sx:1,sy:1,sz:1});
      function render(canvas,id,phase,moving,headingDegrees=0){
        if(disposed||lost||gl.isContextLost()||!canvas)return false;
        try{
          const model=upload(id);if(!model)return false;
          let context=contexts.get(canvas);
          if(!context){context=canvas.getContext('2d',{alpha:true});if(!context)return false;contexts.set(canvas,context);}
          // Backing stores never scale with devicePixelRatio. Requested physical
          // size comes from the fish art's layout, capped for bounded copy cost.
          const width=Math.max(24,Math.min(192,Math.round(canvas.clientWidth||canvas.width||144)));
          const height=Math.max(16,Math.min(128,Math.round(width/1.5)));
          if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
          // Keep the shared framebuffer fixed. Resizing it between differently
          // sized animals reallocates GPU storage and can stall an entire frame.
          gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          const projection=identity();projection[0]=1/1.35;projection[5]=1/.9;projection[10]=-.3;
          const heading=local([0,0,0],{rx:0,ry:(Number.isFinite(headingDegrees)?headingDegrees:0)*Math.PI/180,rz:0,sx:1,sy:1,sz:1});
          const orientedView=multiply(view,heading);
          const camera=multiply(projection,orientedView),transforms={},pose=root.AquariumCreatureModels.pose(id,phase,moving);
          for(const part of model.parts){
            const parent=part.parent?transforms[part.parent]:identity();
            const transform=multiply(parent,local(part.origin,pose[part.id]));transforms[part.id]=transform;
            gl.uniformMatrix4fv(matrix,false,multiply(camera,transform));gl.uniformMatrix4fv(world,false,multiply(orientedView,transform));
            gl.bindBuffer(gl.ARRAY_BUFFER,part.vertex);
            gl.vertexAttribPointer(position,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,36,12);gl.vertexAttribPointer(color,3,gl.FLOAT,false,36,24);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,part.index);gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_SHORT,0);
          }
          context.clearRect(0,0,width,height);
          // WebGL's viewport begins at the lower left; Canvas2D crops from top.
          context.drawImage(surface,0,surface.height-height,width,height,0,0,width,height);
          return !gl.isContextLost();
        }catch(error){return false;}
      }
      return {supported:true,render,dispose:cleanup};
    }catch(error){cleanup();return fallback;}
  }
  root.AquariumCreature3D={create,metadata:{species:['clown','jellyfish','turtle','octopus'],maxWidth:192,maxHeight:128,recommendedFPS:18}};
})(typeof window==='object'?window:this);
