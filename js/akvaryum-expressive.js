/* Continuous sprite deformation: shared mesh edges keep every limb attached.
 * Frames are shared across pupils and bounded in memory; no own RAF/WebGL. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumExpressive=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const species=Object.freeze(['eel','angler','mantis','crab','lina','spongebob','patrick','mrkrabs','hammerhead','axolotl']);
  const supports=id=>species.includes(id),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const region=(x,y,cx,cy,rx,ry)=>Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2)**2;
  function point(id,x,y,phase,{moving=true,boost=0,walking=false}={}){
    if(!moving||!supports(id))return {x,y};
    const t=Number.isFinite(phase)?phase:0,b=clamp(Number.isFinite(boost)?boost:0,0,1),w=Math.sin(t),w2=Math.sin(t*2);
    let dx=0,dy=0;
    const rotate=(cx,cy,angle,weight)=>{
      const a=angle*weight*Math.PI/180,c=Math.cos(a),s=Math.sin(a),px=x-cx,py=(y-cy)/1.5;
      dx+=px*c-py*s-px;dy+=(px*s+py*c-py)*1.5;
    };
    if(id==='eel')dy=Math.sin(t-x*5.8)*(.045+b*.055)*(1-smooth(.42,.8,x));
    else if(id==='angler'){
      rotate(.81,.4,w*(4+b*9),region(x,y,.865,.23,.14,.22));
      dy+=Math.sin(t+.6)*(.012+b*.018)*(1-smooth(.17,.38,x));
      rotate(.56,.52,-w*(2+b*4),region(x,y,.51,.6,.15,.2));
      // Lower jaw opens continuously below the pinned eye/upper face.
      dy+=b*.085*smooth(.55,.66,y)*region(x,y,.82,.65,.16,.2);
    }else if(id==='mantis'){
      rotate(.77,.41,w*(4+b*10),region(x,y,.88,.29,.14,.22));
      rotate(.74,.52,-w*(4+b*13),region(x,y,.77,.66,.15,.21));
      dy+=Math.sin(t*2+x*15)*(.008+b*.012)*smooth(.59,.8,y)*(1-smooth(.77,.9,x));
      dy+=w*(.012+b*.02)*(1-smooth(.18,.37,x));
    }else if(id==='crab'){
      rotate(.48,.51,-w*(4+b*13),region(x,y,.4,.63,.19,.24));
      rotate(.73,.49,w*(4+b*13),region(x,y,.78,.64,.2,.25));
      dy+=Math.sin(t*2+x*21)*(.009+b*.011)*smooth(.6,.82,y);
      // Raise both whole claws; opposing jaw flex makes each pincer open/close.
      dy-=b*.085*(region(x,y,.56,.61,.24,.22)+region(x,y,.8,.68,.19,.22));
      dy+=b*.018*Math.sin(t*2)*Math.tanh((y-.607)*45)*region(x,y,.64,.607,.075,.09);
      dx+=b*.019*Math.sin(t*2)*Math.tanh((x-.79)*45)*region(x,y,.79,.7,.1,.09);
    }else if(id==='lina'){
      const tail=1-smooth(.32,.62,x);
      dy+=Math.sin(t-x*4.5)*(.024+b*.045)*tail;
      dx+=Math.cos(t)*(.004+b*.009)*tail;
      rotate(.67,.38,w*(3+b*5),region(x,y,.61,.21,.14,.22));
    }else if(id==='hammerhead'){
      // The wide head stays pinned. A traveling bend reaches only the rear
      // body and tail; fins flex without cutting the original silhouette.
      dy+=Math.sin(t-x*5.2)*(.03+b*.035)*(1-smooth(.25,.61,x));
      rotate(.56,.49,w*(1.5+b*2),region(x,y,.56,.29,.12,.23));
      rotate(.64,.59,-w*(2+b*4),region(x,y,.67,.70,.14,.19));
    }else if(id==='axolotl'){
      dy+=Math.sin(t-x*4.8)*(.025+b*.025)*(1-smooth(.27,.53,x));
      const aboveFace=1-smooth(.39,.49,y);
      rotate(.70,.46,-w*(3+b*7),region(x,y,.64,.32,.115,.20)*aboveFace);
      rotate(.88,.46,w*(3+b*7),region(x,y,.92,.35,.08,.20)*aboveFace);
      rotate(.64,.64,w*(3+b*14),region(x,y,.62,.77,.12,.17));
      rotate(.85,.64,-w*(2+b*7),region(x,y,.88,.76,.10,.15));
      rotate(.45,.59,w*(3+b*3),region(x,y,.43,.69,.11,.13));
    }else if(id==='spongebob'){
      // The face and torso are pinned; only the raised hand and feet flex.
      rotate(.62,.56,w*(7+b*19),region(x,y,.755,.32,.14,.29));
      dx+=Math.sin(t*2)*((walking?.017:.005)+b*.012)*region(x,y,.36,.87,.1,.16);
      dx-=Math.sin(t*2)*((walking?.017:.005)+b*.012)*region(x,y,.51,.86,.1,.16);
    }else if(id==='patrick'){
      rotate(.38,.5,-w*(5+b*15),region(x,y,.29,.37,.14,.27));
      rotate(.61,.5,w*(5+b*15),region(x,y,.71,.38,.14,.27));
      dx+=w2*((walking?.016:.004)+b*.013)*region(x,y,.39,.85,.11,.16);
      dx-=w2*((walking?.016:.004)+b*.013)*region(x,y,.59,.85,.11,.16);
    }else if(id==='mrkrabs'){
      rotate(.38,.47,-w*(7+b*18),region(x,y,.3,.34,.15,.25));
      rotate(.63,.62,w*(7+b*18),region(x,y,.72,.67,.17,.24));
      dy+=Math.sin(t*2+x*16)*((walking?.016:.005)+b*.009)*smooth(.76,.91,y);
    }
    const maxX=Math.min(.065,Math.min(x,1-x)*.8),maxY=Math.min(.105,Math.min(y,1-y)*.8);
    return {x:x+clamp(dx,-maxX,maxX),y:y+clamp(dy,-maxY,maxY)};
  }
  function plan(id,phase,{moving=true,boost=0,lite=false,walking=false}={}){
    if(!supports(id))return null;
    const columns=lite?6:10,rows=lite?5:8,vertices=[],triangles=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)vertices.push({source:{x:x/columns,y:y/rows},target:point(id,x/columns,y/rows,phase,{moving,boost,walking})});
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      triangles.push([a,b,d],[a,d,c]);
    }
    return {vertices,triangles};
  }
  const contexts=new WeakMap(),identities=new WeakMap();let identity=0,pixels=0,cacheLite=null;
  const frames=new Map(),bases=new Map(),MAX_FRAMES=160,MAX_PIXELS=6000000;
  function sourceKey(image){const url=image.currentSrc||image.src;if(url)return url;if(!identities.has(image))identities.set(image,++identity);return 'image-'+identities.get(image);}
  function context(canvas){if(!contexts.has(canvas)){let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){}contexts.set(canvas,ctx);}return contexts.get(canvas);}
  function normalizeSource(doc,image,key,width,height){
    const k=key+'|'+width;let base=bases.get(k);if(base)return base;
    base=doc.createElement('canvas');base.width=width;base.height=height;const ctx=context(base);if(!ctx)return null;
    if(image.naturalWidth===640&&image.naturalHeight===426)ctx.drawImage(image,0,0,width,height);
    else{
      // Original PNG fallback has the same contained/padded placement as WebP.
      const fit=Math.min(width*600/640/image.naturalWidth,height*398/426/image.naturalHeight),w=image.naturalWidth*fit,h=image.naturalHeight*fit;
      ctx.drawImage(image,(width-w)/2,(height-h)/2,w,h);
    }
    bases.set(k,base);while(bases.size>24)bases.delete(bases.keys().next().value);return base;
  }
  function triangle(ctx,image,vertices,indices,width,height){
    const s=indices.map(i=>({x:vertices[i].source.x*width,y:vertices[i].source.y*height}));
    const q=indices.map(i=>({x:vertices[i].target.x*width,y:vertices[i].target.y*height}));
    const ux=s[1].x-s[0].x,uy=s[1].y-s[0].y,vx=s[2].x-s[0].x,vy=s[2].y-s[0].y,det=ux*vy-vx*uy;
    const dx=q[1].x-q[0].x,dy=q[1].y-q[0].y,ex=q[2].x-q[0].x,ey=q[2].y-q[0].y;
    const a=(dx*vy-ex*uy)/det,c=(ex*ux-dx*vx)/det,b=(dy*vy-ey*uy)/det,d=(ey*ux-dy*vx)/det;
    const cx=(q[0].x+q[1].x+q[2].x)/3,cy=(q[0].y+q[1].y+q[2].y)/3;
    // Subpixel overlap closes antialiased mesh seams. The adjacent vertices
    // are shared, so arms/legs can never become detached image cutouts.
    const edge=q.map(p=>{const n=Math.hypot(p.x-cx,p.y-cy)||1;return {x:p.x+(p.x-cx)/n*.65,y:p.y+(p.y-cy)/n*.65};});
    ctx.save();ctx.beginPath();ctx.moveTo(edge[0].x,edge[0].y);ctx.lineTo(edge[1].x,edge[1].y);ctx.lineTo(edge[2].x,edge[2].y);ctx.closePath();ctx.clip();
    ctx.transform(a,b,c,d,q[0].x-a*s[0].x-c*s[0].y,q[0].y-b*s[0].x-d*s[0].y);ctx.drawImage(image,0,0);ctx.restore();
  }
  function render(canvas,image,id,phase,{moving=false,boost=0,lite=false,width=120,dpr=1,walking=false}={}){
    if(!supports(id)||!image?.complete||!(image.naturalWidth>0&&image.naturalHeight>0))return false;
    const doc=canvas.ownerDocument,ctx=context(canvas);if(!doc?.createElement||!ctx)return false;
    if(cacheLite!==lite){frames.clear();bases.clear();pixels=0;cacheLite=lite;}
    const size=lite?112:width*clamp(dpr||1,1,2)>180?224:160,height=Math.round(size/1.5);
    const steps=lite?12:20,cycle=Math.PI*2,t=Number.isFinite(phase)?phase:0;
    const frame=moving?Math.round((((t%cycle)+cycle)%cycle)/cycle*steps)%steps:0;
    const power=moving?Math.round(clamp(boost||0,0,1)*3)/3:0,source=sourceKey(image),key=[source,id,size,moving?frame:'rest',power,lite,walking].join('|');
    try{
      let rendered=frames.get(key);
      if(!rendered){
        const base=normalizeSource(doc,image,source,size,height);if(!base)return false;
        rendered=doc.createElement('canvas');rendered.width=size;rendered.height=height;const paint=context(rendered);if(!paint)return false;
        const p=frame/steps*cycle;
        if(id==='angler'&&typeof paint.createRadialGradient==='function'){
          const pos=point(id,.885,.315,p,{moving,boost:power}),radius=size*(.026+power*.09),glow=paint.createRadialGradient(pos.x*size,pos.y*height,0,pos.x*size,pos.y*height,radius);
          glow.addColorStop(0,'rgba(255,245,165,'+(.3+(moving?(Math.sin(p)+1)*.07:0)+power*.28)+')');glow.addColorStop(1,'rgba(255,223,120,0)');paint.fillStyle=glow;paint.fillRect(pos.x*size-radius,pos.y*height-radius,radius*2,radius*2);
        }
        if(!moving)paint.drawImage(base,0,0);
        else{const mesh=plan(id,p,{moving,boost:power,lite,walking});for(const indices of mesh.triangles)triangle(paint,base,mesh.vertices,indices,size,height);}
        frames.set(key,rendered);pixels+=size*height;
        while(frames.size>MAX_FRAMES||pixels>MAX_PIXELS){const first=frames.keys().next().value,old=frames.get(first);pixels-=old.width*old.height;frames.delete(first);}
      }else{frames.delete(key);frames.set(key,rendered);}
      if(canvas.width!==size||canvas.height!==height){canvas.width=size;canvas.height=height;}
      ctx.clearRect(0,0,size,height);ctx.drawImage(rendered,0,0);return true;
    }catch(_){return false;}
  }
  // Transient surrounding accents: no particles, timers or pupil data retained.
  function effects(id,phase,amount,{lite=false}={}){
    const a=clamp(Number.isFinite(amount)?amount:0,0,1),t=Number.isFinite(phase)?phase:0,lines=[];
    if(a===0)return lines;
    const count=lite?6:12;
    if(id==='eel')for(let i=0;i<count;i++){
      // Short branching discharges originate along the body, never on a ring.
      const x=.34+(i%6)/5*.34,side=i%2?1:-1,y=.51+side*.035+Math.sin(t-x*5.8)*.018,points=[];
      const reach=.09+.055*(1+Math.sin(t*.9+i*1.7))/2;
      for(let j=0;j<6;j++){
        const u=j/5,jag=j===0||j===5?0:Math.sin(j*4.7+i+t*1.8)*.018;
        points.push({x:x+u*(i%3-1)*.07+jag,y:y+side*reach*u});
      }
      lines.push({points,color:i%2?'#b9efff':'#dfddff',alpha:a*(.42+.18*(1+Math.sin(t*1.4+i))/2),width:1.25,glow:6});
    }
    if(id==='lina'){
      const colors=['#ff9fbe','#ffbd8a','#fff2a6','#a8efc5','#a4dcff','#c5b5ff'];
      for(let i=0;i<(lite?6:12);i++){
        const fan=(i/(lite?5:11)-.5),points=[],sway=Math.sin(t-1.2)*.018;
        for(let j=0;j<8;j++){
          const u=j/7;
          points.push({x:.315-u*(.21+.035*Math.sin(t*.8+i)),y:.535+sway+fan*u*.42+Math.sin(t*1.2-u*4+i*.2)*.012*u});
        }
        lines.push({points,color:colors[i%6],alpha:a*(.48+.16*(1+Math.sin(t*.7+i))/2),width:1.7,glow:7});
      }
    }
    if(id==='axolotl')for(let i=0;i<(lite?3:5);i++){
      const age=((t*.13+i/(lite?3:5))%1+1)%1,cx=.64+(i%3)*.07+Math.sin(t*.7+i)*.012,cy=.57-age*.23,r=.010+age*.009,points=[];
      for(let j=0;j<=20;j++){const theta=j/20*Math.PI*2;points.push({x:cx+Math.cos(theta)*r,y:cy+Math.sin(theta)*r*1.5});}
      lines.push({points,color:i%2?'#e1f8ff':'#fbddeb',alpha:a*Math.sin(Math.PI*age)*.56,width:1,glow:2});
    }
    if(['spongebob','patrick','mrkrabs'].includes(id)){
      const colors=id==='patrick'?['#ffc4de','#eea6ff']:id==='mrkrabs'?['#ffd6a8','#ffafbd']:['#ffb6d3','#ffdfec'];
      const count=lite?2:3;
      // Small outgoing hearts suggest a blown kiss, with smooth fades and no flash.
      for(let i=0;i<count;i++){
        const age=((t*.11+i/count)%1+1)%1,mouthY=id==='patrick'?.43:id==='mrkrabs'?.5:.53;
        const cx=.52+age*.22,cy=.5+(mouthY-.5)/1.6-age*.18+Math.sin(t+i)*.009,r=.022+age*.01,points=[];
        for(let j=0;j<=24;j++){
          const angle=j/24*Math.PI*2;
          points.push({x:cx+r*Math.sin(angle)**3,y:cy-r*(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))/16});
        }
        lines.push({points,color:colors[i%2],alpha:a*Math.sin(Math.PI*age)*.8,width:1.8});
      }
    }
    return lines;
  }
  function renderEffects(canvas,id,phase,amount,{lite=false}={}){
    const ctx=context(canvas);if(!ctx)return false;
    try{
      const width=lite?160:256,height=Math.round(width/1.5);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.clearRect(0,0,width,height);
      for(const line of effects(id,phase,amount,{lite})){
        ctx.beginPath();line.points.forEach((p,i)=>i?ctx.lineTo(p.x*width,p.y*height):ctx.moveTo(p.x*width,p.y*height));
        ctx.strokeStyle=line.color;ctx.globalAlpha=line.alpha;ctx.lineWidth=line.width;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.shadowColor=line.color;ctx.shadowBlur=line.glow?(lite?3:line.glow):0;ctx.stroke();
      }
      ctx.globalAlpha=1;ctx.shadowBlur=0;return true;
    }catch(_){return false;}
  }
  return {species,supports,point,plan,render,effects,renderEffects};
});
