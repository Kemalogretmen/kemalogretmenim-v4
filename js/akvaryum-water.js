/* Bounded 2D water reflections. Uses the aquarium's existing RAF, including
   an all-egg class. Geometry changes over time instead of sliding a photo. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AquariumWater=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // A shared displacement field keeps adjacent caustic cells connected. Three
  // nonmatching frequencies avoid a short, visibly restarting animation loop.
  function point(x,y,t){
    return {x:x+24*Math.sin(y*.025+t*.72)+14*Math.sin(x*.036+y*.011-t*.47),
      y:y+19*Math.sin(x*.022-t*.64)+11*Math.cos(y*.041+x*.015+t*.39)};
  }
  function cells(t,lite){
    const radius=lite?59:45,dx=Math.sqrt(3)*radius,out=[];
    for(let row=-1;row<7;row++)for(let col=-1;col<Math.ceil(800/dx)+1;col++){
      const x=col*dx+(row%2)*dx/2,y=row*radius*1.5;
      const vertices=[];
      for(let k=0;k<6;k++){
        const a=(60*k-30)*Math.PI/180;
        vertices.push(point(x+radius*Math.cos(a),y+radius*Math.sin(a),t));
      }
      out.push({vertices,alpha:.68+.25*Math.sin(x*.014+y*.021+t*.6)});
    }
    return out;
  }
  function trace(ctx,vertices,project){
    const p=vertices.map(project),last=p[p.length-1];
    ctx.beginPath();ctx.moveTo((last.x+p[0].x)/2,(last.y+p[0].y)/2);
    p.forEach((v,i)=>{const n=p[(i+1)%p.length];ctx.quadraticCurveTo(v.x,v.y,(v.x+n.x)/2,(v.y+n.y)/2);});
    ctx.closePath();
  }
  function light(ctx,w,h,t,strength,lite){
    ctx.clearRect(0,0,w,h);
    const level=.16+(strength-50)/75*.32,mesh=cells(t,lite);
    // Both regions remain present in lite mode; only geometry/detail decreases.
    for(const surface of [false,true]){
      ctx.save();
      const gradient=ctx.createLinearGradient(0,surface?0:h*.64,0,surface?h*.27:h);
      gradient.addColorStop(0,surface?'rgba(228,255,244,.9)':'rgba(228,255,244,0)');
      gradient.addColorStop(1,surface?'rgba(228,255,244,0)':'rgba(228,255,244,.95)');
      ctx.strokeStyle=gradient;
      const project=p=>{
        const depth=clamp(p.y/400,0,1.2);
        return {x:((p.x-400)*(surface?1: .45+depth*.8)+400)/800*w,
          y:surface?p.y/400*h*.23:h*(.64+Math.pow(depth,1.55)*.41)};
      };
      for(const cell of mesh){
        trace(ctx,cell.vertices,project);
        // A broad soft edge and a thin highlight, without expensive blur.
        ctx.lineWidth=surface?1.8:2.6;ctx.globalAlpha=level*cell.alpha*.34;ctx.stroke();
        ctx.lineWidth=surface?.55:.8;ctx.globalAlpha=level*cell.alpha;ctx.stroke();
      }
      ctx.restore();
    }
  }
  function waves(ctx,w,h,t,strength){
    ctx.clearRect(0,0,w,h);
    const level=.045+(strength-50)/100*.09;
    // Travelling, irregular wave fronts: surface shimmer and seabed ripples.
    for(const surface of [false,true])for(let band=0;band<7;band++){
      const base=band/7,points=[];
      for(let i=0;i<=24;i++){
        const x=i/24,shift=Math.sin(x*9+t*.65+band*.9)*.017+Math.sin(x*17-t*.42+band)*.009;
        const drift=Math.sin(t*.36+band*.8)*.026;
        const y=surface?.015+base*.2+shift+drift:.65+base*.35+shift*(.5+base)+drift;
        points.push({x:x*w,y:y*h});
      }
      // Stroke the curved front itself. A horizontal Y-gradient would leave a
      // rectangular seam where the seabed starts, especially at high intensity.
      const size=(surface?3:5)*(h/420),shade=ctx.createLinearGradient(0,0,w,0);
      shade.addColorStop(0,'rgba(202,255,244,0)');shade.addColorStop(.5,'rgba(202,255,244,'+level+')');shade.addColorStop(1,'rgba(202,255,244,0)');
      ctx.strokeStyle=shade;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
      points.slice(1,-1).forEach((p,i)=>{const n=points[i+2];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);});
      ctx.lineTo(points[24].x,points[24].y);
      const edge=Math.sin(Math.PI*(band+.5)/7);
      ctx.lineWidth=size*2;ctx.globalAlpha=edge*.35;ctx.stroke();
      ctx.lineWidth=Math.max(.5,size*.5);ctx.globalAlpha=edge*.8;ctx.stroke();
    }
  }
  function create(lightCanvas,waveCanvas){
    const context=canvas=>{try{return canvas?.getContext?.('2d',{alpha:true});}catch(_){return null;}};
    const lc=context(lightCanvas),wc=context(waveCanvas);
    let options={motion:true,lightMotion:true,waterWaves:false,lightStrength:100,waveStrength:100,lite:false},
      last=null,paintAt=-Infinity,lightTime=0,waveTime=0,dirty=true,w=0,h=0;
    function resize(width,height,lite=options.lite){
      const max=lite?480:720,scale=Math.min(1,max/Math.max(1,width),450/Math.max(1,height));
      const nw=Math.max(1,Math.round(width*scale)),nh=Math.max(1,Math.round(height*scale));
      if(nw===w&&nh===h)return;
      w=nw;h=nh;for(const canvas of [lightCanvas,waveCanvas])if(canvas){canvas.width=w;canvas.height=h;}
      dirty=true;
    }
    function configure(next){
      const updated={...options,...next};
      if(Object.keys(updated).some(k=>updated[k]!==options[k]))dirty=true;
      options=updated;
    }
    function active(){return options.motion&&!!((lc&&options.lightMotion)||(wc&&options.waterWaves));}
    function draw(now){
      const dt=last===null?0:clamp((now-last)/1000,0,.1);last=now;
      if(options.motion){if(options.lightMotion)lightTime+=dt;if(options.waterWaves)waveTime+=dt;}
      if(!dirty&&(!active()||now-paintAt<1000/(options.lite?12:18)))return false;
      if(!w||!h)return false;
      if(lc)light(lc,w,h,lightTime,clamp(options.lightStrength,50,125),options.lite);
      if(wc&&options.waterWaves)waves(wc,w,h,waveTime,clamp(options.waveStrength,50,150));
      else if(wc)wc.clearRect(0,0,w,h);
      paintAt=now;dirty=false;return !!(lc||wc);
    }
    // Reset only the wall-clock baseline; preserve the actual ripple phases.
    function resume(){last=null;}
    return {resize,configure,draw,active,resume};
  }
  return {create,point,cells};
});
