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
    return {...p,value,yaw:.45+random()*.8,fromU:-7.5,fromV:-1.74,
      u:-4.1+random()*.75,v:-1.72+(random()-.5)*.08};
  }
  function pose(p,seconds){
    const t=clamp(seconds/duration,0,1),travel=1-(1-t)**3;
    const motion=Motion.dicePose(p,seconds*1.72/duration);
    // Launch starts on the tray instead of popping into mid-air.
    const flight=seconds*1.72/duration,s=clamp(flight/.76,0,1);
    if(p.startQ){
      const initial=Motion.dicePose(p,0).q;
      const correction=product(p.startQ,{x:-initial.x,y:-initial.y,z:-initial.z,w:initial.w});
      motion.q=product(slerp(correction,{x:0,y:0,z:0,w:1},clamp(t/.28,0,1)),motion.q);
    }
    const support=Motion.diceSupport(motion.q)+.01;
    const y=p.startQ?Math.max(support,flight<=.76?.535+12*s*(1-s):Motion.diceHeight(flight)):motion.y;
    return {...motion,u:p.fromU+(p.u-p.fromU)*travel,v:p.fromV+(p.v-p.fromV)*travel,
      y:y*scale,settled:t>=1};
  }
  function product(a,b){return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};}
  function slerp(a,b,t){let dot=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w;if(dot<0){b={x:-b.x,y:-b.y,z:-b.z,w:-b.w};dot=-dot;}const angle=Math.acos(clamp(dot,-1,1)),sn=Math.sin(angle);const x=sn<1e-6?1-t:Math.sin((1-t)*angle)/sn,y=sn<1e-6?t:Math.sin(t*angle)/sn;return {x:a.x*x+b.x*y,y:a.y*x+b.y*y,z:a.z*x+b.z*y,w:a.w*x+b.w*y};}
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
      const state=pose(p,seconds),[x,z]=toWorld(state.u,state.v,p);
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
        const p=clamp(t/(run.reduced?.12:.5),0,1),[x,z]=toWorld(currentPlan.u+(currentPlan.fromU-currentPlan.u)*p*p,currentPlan.v,currentPlan);
        die.position.set(x,.67+Math.sin(p*Math.PI)*1.3,z);die.scale.setScalar(scale);render();
        if(p>=1){complete(true);return;}
      }
      frame=win.requestAnimationFrame(tick);
    }
    function launch(kind,value,valid){
      if(!available)return Promise.resolve(false);
      complete(false);stage=kind==='roll'?'rolling':'exit';
      const reduced=!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if(kind==='roll'){
        const startQ={x:die.quaternion.x||0,y:die.quaternion.y||0,z:die.quaternion.z||0,w:die.quaternion.w??1};
        currentPlan=plan(value);currentPlan.startQ=startQ;
      }
      if(!currentPlan)return Promise.resolve(false);
      die.visible=true;
      return new Promise(resolve=>{run={kind,plan:currentPlan,valid:valid||(()=>true),start:now(),resolve,reduced,events:new Set()};frame=win.requestAnimationFrame(tick);});
    }
    const api={
      roll:(value,valid)=>launch('roll',value,valid),exit:valid=>launch('exit',null,valid),
      ready(){
        if(!available)return;complete(false);stage='ready';die.visible=true;
        const q=Motion.faceQuaternion(currentPlan?.value||1,currentPlan?.yaw||.65),p=currentPlan||plan(1,()=>.5);
        const [x,z]=toWorld(p.fromU,p.fromV,p);die.position.set(x,(Motion.diceSupport(q)+.01)*scale,z);die.scale.setScalar(scale);die.quaternion.set(q.x,q.y,q.z,q.w);render();
      },
      refresh(){if(stage==='ready')api.ready();else if(currentPlan&&die.visible&&stage==='landed')draw(currentPlan,duration);},
      hide(){complete(false);die.visible=false;stage='hidden';render();},
      loseContext(){if(run)complete(run.valid());available=false;die.visible=false;stage='hidden';},
      get available(){return available;},get stage(){return stage;},get value(){return currentPlan?.value;}
    };
    win.document.addEventListener('visibilitychange',()=>{
      if(win.document.hidden&&run)complete(run.valid());
    });
    win.addEventListener('pagehide',()=>api.hide());return api;
  }
  // A transparent pass in the board's existing renderer. One mesh travels from
  // the actual tray rectangle to the board; no CSS/WebGL model swap or reroll.
  function layer({T,win,main,dock,boardPoint,render}){
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,10,-10,.1,100);
    camera.position.set(0,20*Math.sin(54*Math.PI/180),20*Math.cos(54*Math.PI/180));camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xffffff,0xa2a2b1,.85));
    const light=new T.DirectionalLight(0xfff5df,1.1);light.position.set(-6,15,8);light.castShadow=true;
    light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:60});light.shadow.bias=-.0004;scene.add(light);
    const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const die=mesh(T,win.document);scene.add(die);
    const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
    function resize(){const r=main.getBoundingClientRect(),b=win.document.getElementById('boardGridWrap').getBoundingClientRect(),px=clamp(b.width*.06,25,45);camera.left=-r.width/(px*2);camera.right=-camera.left;camera.top=r.height/(px*2);camera.bottom=-camera.top;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
    function toWorld(u,v,p){
      const r=main.getBoundingClientRect(),d=dock.getBoundingClientRect(),target=boardPoint(p.u,p.v);
      const t=(u-p.fromU)/(p.u-p.fromU),start={x:d.left-r.left+d.width/2,y:d.top-r.top+d.height*.72};
      const end=target||{x:r.width*.65,y:r.height*.4};
      const x=start.x+(end.x-start.x)*t,y=start.y+(end.y-start.y)*t;
      ray.setFromCamera(new T.Vector2(x/r.width*2-1,1-y/r.height*2),camera);ray.ray.intersectPlane(plane,point);return [point.x,point.z];
    }
    resize();const api=create({win,die,toWorld,render});
    return {scene,camera,die,api,resize(){resize();api.refresh();}};
  }
  return Object.freeze({duration,scale,contacts,plan,pose,cssTransform,mesh,create,layer});
});
