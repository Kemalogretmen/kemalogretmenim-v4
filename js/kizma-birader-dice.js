/* Board-local dice, sharing the mathematical tools' fixed faces and motion.
   The game chooses the value once; animation never rerolls or mutates a turn. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./chance-studio.js'):root.ChanceMotion);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KBBoardDice=api;
})(typeof window==='undefined'?globalThis:window,function(Motion){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const duration=2.05,scale=1.25;
  const contacts=Motion.landings.dice.map(t=>t*duration/1.72);
  function plan(value,random=Math.random){
    if(!Number.isInteger(value)||value<1||value>6)throw new RangeError('Zar sonucu 1–6 olmalı.');
    const p=Motion.dicePlan(1,random)[0];
    return {...p,value,yaw:random()*Math.PI*2,fromU:-7.5,fromV:-1.74,
      u:-4.1+random()*.75,v:-1.72+(random()-.5)*.08};
  }
  function pose(p,seconds){
    const t=clamp(seconds/duration,0,1),travel=1-(1-t)**3;
    const motion=Motion.dicePose(p,seconds*1.72/duration);
    return {...motion,u:p.fromU+(p.u-p.fromU)*travel,v:p.fromV+(p.v-p.fromV)*travel,
      y:motion.y*scale,settled:t>=1};
  }
  function cssTransform(value,yaw=0){
    const q=Motion.faceQuaternion(value,yaw),x=-q.x,y=q.y,z=-q.z,w=q.w;
    // Convert the shared Y-up quaternion to CSS's Y-down coordinate frame.
    const m=[1-2*y*y-2*z*z,2*x*y+2*w*z,2*x*z-2*w*y,0,
      2*x*y-2*w*z,1-2*x*x-2*z*z,2*y*z+2*w*x,0,
      2*x*z+2*w*y,2*y*z-2*w*x,1-2*x*x-2*y*y,0,0,0,0,1];
    return 'rotateX(-48deg) rotateY(18deg) matrix3d('+m.map(n=>Math.abs(n)<1e-12?0:n).join(',')+')';
  }
  function mesh(T,doc){
    const geometry=new T.BoxGeometry(1.05,1.05,1.05,8,8,8),pos=geometry.attributes.position,norm=geometry.attributes.normal;
    for(let i=0;i<pos.count;i++){
      const v=new T.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
      const center=new T.Vector3(clamp(v.x,-.405,.405),clamp(v.y,-.405,.405),clamp(v.z,-.405,.405));
      const normal=v.clone().sub(center).normalize();v.copy(center).addScaledVector(normal,.12);
      pos.setXYZ(i,v.x,v.y,v.z);norm.setXYZ(i,normal.x,normal.y,normal.z);
    }
    geometry.computeBoundingSphere();
    const group=new T.Group(),body=new T.Mesh(geometry,new T.MeshPhysicalMaterial({color:0xfff9ed,roughness:.27,metalness:0,clearcoat:.38,clearcoatRoughness:.2}));
    body.castShadow=body.receiveShadow=true;group.add(body);
    const cv=doc.createElement('canvas');cv.width=cv.height=64;
    const ctx=cv.getContext('2d'),gradient=ctx.createRadialGradient(24,23,3,32,32,30);
    gradient.addColorStop(0,'#111827');gradient.addColorStop(.78,'#19212e');gradient.addColorStop(.93,'#656668');gradient.addColorStop(1,'#b8b5af');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(32,32,31,0,Math.PI*2);ctx.fill();
    const texture=new T.CanvasTexture(cv),material=new T.MeshBasicMaterial({map:texture,transparent:true,polygonOffset:true,polygonOffsetFactor:-1});
    const pipGeo=new T.CircleGeometry(.085,24);
    const dots={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
    Object.entries(Motion.normalByFace).forEach(([n,normal])=>{
      const face=new T.Group();face.position.set(...normal.map(v=>v*.527));
      face.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal));
      dots[n].forEach(([x,y])=>{const pip=new T.Mesh(pipGeo,material);pip.position.set(x*.225,y*.225,0);face.add(pip);});group.add(face);
    });
    group.scale.setScalar(scale);group.visible=false;group.name='KizmaBiraderPhysicalDie';return group;
  }
  function create(options){
    const {win,die,toWorld,render}=options;
    let run=null,frame=0,currentPlan=null,available=true,stage='hidden';
    const now=()=>win.performance.now(),audio=()=>win.ChanceAudio;
    function draw(p,seconds){
      const state=pose(p,seconds),[x,z]=toWorld(state.u,state.v);
      die.scale.setScalar(scale);die.position.set(x,state.y,z);die.quaternion.set(state.q.x,state.q.y,state.q.z,state.q.w);render();
    }
    function complete(ok){
      const old=run;run=null;if(frame){win.cancelAnimationFrame(frame);frame=0;}
      if(old){if(ok && old.kind==='roll'){draw(old.plan,duration);stage='landed';}else {die.visible=false;stage='hidden';render();}old.resolve(ok);}
    }
    function tick(){
      frame=0;if(!run)return;
      if(!run.valid()){complete(false);return;}
      const t=(now()-run.start)/1000;
      if(run.kind==='roll'){
        draw(run.plan,run.reduced?duration:t);
        if(!run.reduced)contacts.forEach((at,i)=>{
          const age=t-at;
          if(age>=0&&!run.events.has(i)){run.events.add(i);if(age<.14&&!win.document.hidden)audio()?.diceImpact([.9,.5,.25,.1][i]);}
        });
        if(t>=(run.reduced?.18:duration)){complete(true);return;}
      }else{
        const p=clamp(t/(run.reduced?.12:.5),0,1),[x,z]=toWorld(currentPlan.u+(currentPlan.fromU-currentPlan.u)*p*p,currentPlan.v);
        die.position.set(x,.67+Math.sin(p*Math.PI)*1.3,z);die.scale.setScalar(scale*(1-.8*p));render();
        if(p>=1){complete(true);return;}
      }
      frame=win.requestAnimationFrame(tick);
    }
    function launch(kind,value,valid){
      if(!available)return Promise.resolve(false);
      complete(false);stage=kind==='roll'?'rolling':'exit';
      const reduced=!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(kind==='roll')currentPlan=plan(value);
      if(!currentPlan)return Promise.resolve(false);
      die.visible=true;
      return new Promise(resolve=>{run={kind,plan:currentPlan,valid:valid||(()=>true),start:now(),resolve,reduced,events:new Set()};frame=win.requestAnimationFrame(tick);});
    }
    const api={
      roll:(value,valid)=>launch('roll',value,valid),exit:valid=>launch('exit',null,valid),
      refresh(){if(currentPlan&&die.visible&&stage==='landed')draw(currentPlan,duration);},
      hide(){complete(false);die.visible=false;stage='hidden';render();},
      loseContext(){if(run)complete(run.valid());available=false;die.visible=false;stage='hidden';},
      get available(){return available;},get stage(){return stage;},get value(){return currentPlan?.value;}
    };
    win.document.addEventListener('visibilitychange',()=>{
      if(win.document.hidden&&run)complete(run.valid());
    });
    win.addEventListener('pagehide',()=>api.hide());return api;
  }
  return Object.freeze({duration,scale,contacts,plan,pose,cssTransform,mesh,create});
});
