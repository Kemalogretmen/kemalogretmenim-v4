/* Chance studio: real 3D dice/coin objects, time-based ballistic flights and
   deterministic resting orientations. No model or sound is fetched remotely. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.ChanceMotion = api; api.init(root); }
})(typeof window === 'undefined' ? globalThis : window, function() {
  'use strict';
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const normalByFace = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0] };
  const landings = Object.freeze({ dice: [0.76, 1.14, 1.42, 1.64], coin: [1.0, 1.34, 1.56] });
  function quaternion(axis, angle) { const s = Math.sin(angle / 2); return { x: axis[0] * s, y: axis[1] * s, z: axis[2] * s, w: Math.cos(angle / 2) }; }
  function multiply(a, b) { return { x: a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y, y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x, z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w, w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z }; }
  function faceQuaternion(face, yaw = 0) {
    const rotations = { 1: [[1,0,0],0], 2: [[1,0,0],-Math.PI/2], 3:[[0,0,1],Math.PI/2], 4:[[0,0,1],-Math.PI/2], 5:[[1,0,0],Math.PI/2], 6:[[1,0,0],Math.PI] };
    const [axis, angle] = rotations[face] || rotations[1]; return multiply(quaternion([0,1,0],yaw), quaternion(axis,angle));
  }
  function rotateVector(v, q) { const a = multiply(multiply(q,{x:v[0],y:v[1],z:v[2],w:0}),{x:-q.x,y:-q.y,z:-q.z,w:q.w}); return [a.x,a.y,a.z]; }
  function eulerQuaternion(x,y,z) { return multiply(multiply(quaternion([1,0,0],x),quaternion([0,1,0],y)),quaternion([0,0,1],z)); }
  // Support heights keep a tilted body above the tray throughout every bounce.
  function diceSupport(q) { return .405 * [[1,0,0],[0,1,0],[0,0,1]].reduce((sum,axis)=>sum+Math.abs(rotateVector(axis,q)[1]),0)+.12; }
  function coinSupport(q) { const y=clamp(rotateVector([0,1,0],q)[1],-1,1);return .7*Math.sqrt(Math.max(0,1-y*y))+.057*Math.abs(y); }
  function diceHeight(t) {
    const floor = .535;
    if(t <= .76) return floor + 3.0 * (1 - (Math.max(0,t)/.76) ** 2);
    const arcs = [[.76,1.14,.45],[1.14,1.42,.16],[1.42,1.64,.035]];
    for(const [a,b,h] of arcs) if(t < b) { const u=(t-a)/(b-a); return floor+4*h*u*(1-u); }
    return floor;
  }
  function coinHeight(t) {
    const floor = .068;
    if(t <= 1) return floor + 9.6 * Math.max(0,t) - 9.6 * Math.max(0,t) ** 2;
    for(const [a,b,h] of [[1,1.34,.32],[1.34,1.56,.07]]) if(t < b) { const u=(t-a)/(b-a);return floor+4*h*u*(1-u); }
    return floor;
  }
  function dicePlan(count, random = Math.random) {
    count = clamp(Math.round(Number(count) || 1),1,3);
    return Array.from({length:count},(_,index)=>({ value:1+Math.floor(clamp(random(),0,.999999)*6), x:(index-(count-1)/2)*1.9, z:[.18,-.17,.12][index], delay:index*.075, yaw:Math.floor(random()*4)*Math.PI/2, spinX:(4+Math.floor(random()*3))*Math.PI, spinY:(3+Math.floor(random()*3))*Math.PI, spinZ:(2+Math.floor(random()*2))*Math.PI }));
  }
  function dicePose(plan, seconds) {
    const t=Math.max(0,seconds-plan.delay), land=clamp(t/1.72,0,1), p=ease(land);
    const spin=1-p,q=multiply(eulerQuaternion(plan.spinX*spin,plan.spinY*spin,plan.spinZ*spin),faceQuaternion(plan.value,plan.yaw));
    return { x:plan.x+.3*(1-p), y:Math.max(diceHeight(t),diceSupport(q)+.01), z:plan.z+.9*(1-p), t, settled:t>=1.72, spin, q };
  }
  function coinPose(run,seconds) {
    const t=Math.max(0,seconds),p=ease(t/1.72),remaining=1-p,flip=run.result==='tura'?Math.PI:0;
    const q=eulerQuaternion(remaining*10*Math.PI+flip,run.yaw*remaining,Math.sin(t*23)*.18*remaining);
    return {x:.23*Math.sin(Math.PI*clamp(t/1.72,0,1)),y:Math.max(coinHeight(t),coinSupport(q)+.01),z:0,q,settled:t>=1.72};
  }
  function init(win) {
    const doc=win.document;
    if(!doc?.getElementById('chanceDiceStage') || win.ChanceStudio) return;
    let count=1, diceBusy=false, coinBusy=false, diceRun=null, coinRun=null, frameId=0, sceneDice=null, sceneCoin=null;
    const hostDice=doc.getElementById('chanceDiceStage'), hostCoin=doc.getElementById('chanceCoinStage'), diceResult=doc.getElementById('diceResultLabel'), coinResult=doc.getElementById('coinResultLabel');
    const toggle=doc.getElementById('motionSoundToggle'), dieElements=[1,2,3].map(i=>doc.getElementById('dice'+i));
    const reduce=()=>!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now=()=>win.performance?.now?.() ?? Date.now();
    const audio=()=>win.ChanceAudio;
    function unlocked() { audio()?.setEnabled(!toggle || toggle.checked); audio()?.unlock(); }
    function setBusy(kind,value) {
      const isDice=kind==='dice'; if(isDice) diceBusy=value; else coinBusy=value;
      const host=isDice?hostDice:hostCoin; host.setAttribute('aria-busy',String(value));
      const button=doc.getElementById(isDice?'rollDiceBtn':'flipCoinBtn'); if(button)button.disabled=value;
      if(isDice)doc.querySelectorAll('[data-dice-count]').forEach(b=>{b.disabled=value;});
    }
    function setCount(value) {
      if(diceBusy) return;
      count=clamp(Math.round(Number(value)||1),1,3);
      doc.querySelectorAll('[data-dice-count]').forEach(b=>{const active=Number(b.dataset.diceCount)===count;b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-active',active);});
      const select=doc.getElementById('diceCountSelect'); if(select)select.value=String(count);
      const legacy=doc.getElementById('diceCountToggle'); if(legacy)legacy.checked=count>1;
      dieElements.forEach((el,i)=>{ const wrap=doc.getElementById('dice'+(i+1)+'Wrap');if(wrap)wrap.hidden=i>=count; });
      sceneDice?.setCount(count); diceResult.textContent=count===1?'Zarı veya atış alanını tıkla.':`${count} zarı birlikte atmak için tıkla.`;
    }
    function fallbackValues(plans) {
      plans.forEach((p,i)=>{
        const element=dieElements[i]; if(!element)return;
        element.dataset.value=String(p.value); element.setAttribute('aria-label',`${i+1}. zar: ${p.value}`);
        element.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][p.value-1];
        element.style.transform=`rotateX(${p.value*360}deg) rotateY(0deg)`;
      });
    }
    function finishDice() {
      if(!diceRun)return; const plans=diceRun.plans;
      sceneDice?.settle(plans); fallbackValues(plans);
      const values=plans.map(p=>p.value), total=values.reduce((a,b)=>a+b,0);
      diceResult.textContent=values.length===1?`Sonuç: ${total}`:`${values.join(' + ')} = ${total}`;
      diceResult.dataset.values=values.join(','); diceResult.dataset.total=String(total);
      diceRun=null; setBusy('dice',false);
    }
    function finishCoin() {
      if(!coinRun)return; const result=coinRun.result;
      sceneCoin?.settle(result); coinResult.textContent=result==='yazi'?'YAZI':'TURA';coinResult.dataset.result=result;
      hostCoin.dataset.face=result;
      const image=doc.querySelector('#chanceCoinStage .chance-coin-fallback img');if(image){image.src=`/gorseller/${result}.png`;image.alt=result==='yazi'?'Yazı yüzü':'Tura yüzü';}
      coinRun=null;setBusy('coin',false);
    }
    function rollDice() {
      if(diceBusy)return false; unlocked(); setBusy('dice',true);
      const plans=dicePlan(count); diceRun={start:now(),plans,events:new Set(),reduced:reduce()};
      diceResult.textContent='Zarlar atılıyor…'; delete diceResult.dataset.values;delete diceResult.dataset.total;
      sceneDice?.start(plans); requestTick(); return true;
    }
    function flipCoin() {
      if(coinBusy)return false; unlocked(); setBusy('coin',true);
      coinRun={start:now(),result:Math.random()<.5?'yazi':'tura',events:new Set(),reduced:reduce(),yaw:Math.random()*Math.PI*2};
      coinResult.textContent='Para havada…'; audio()?.coinLaunch();sceneCoin?.start();requestTick();return true;
    }
    function requestTick(){if(!frameId)frameId=win.requestAnimationFrame(tick);}
    function tick() {
      frameId=0;const time=now(), quiet=doc.visibilityState==='hidden';
      if(diceRun){const run=diceRun,seconds=(time-run.start)/1000;
        if(run.reduced){if(seconds>=.18){if(!quiet)audio()?.diceImpact(.35);finishDice();}}
        else{sceneDice?.update(run.plans,seconds);run.plans.forEach((p,i)=>landings.dice.forEach((at,j)=>{const event=`${i}:${j}`,age=seconds-p.delay-at;if(age>=0&&!run.events.has(event)){run.events.add(event);if(age<.14&&!quiet)audio()?.diceImpact([.95,.53,.28,.12][j],0,p.x/3);}}));if(seconds>=1.72+(run.plans.length-1)*.075)finishDice();}
      }
      if(coinRun){const run=coinRun,seconds=(time-run.start)/1000;
        if(run.reduced){if(seconds>=.18){if(!quiet)audio()?.coinImpact(.35);finishCoin();}}
        else{sceneCoin?.update(run,seconds);landings.coin.forEach((at,j)=>{const age=seconds-at;if(age>=0&&!run.events.has(j)){run.events.add(j);if(age<.14&&!quiet)audio()?.coinImpact([.95,.48,.2][j]);}});if(seconds>=1.72)finishCoin();}
      }
      if(diceRun||coinRun)requestTick();
    }
    function cancel(){finishDice();finishCoin();audio()?.stop();if(frameId){win.cancelAnimationFrame?.(frameId);frameId=0;}}
    function renderer(kind,host) {
      const THREE=win.THREE; if(!THREE)return null;
      try {
        const R=new THREE.WebGLRenderer({antialias:true,alpha:false});R.setPixelRatio(Math.min(win.devicePixelRatio||1,2));R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
        R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1;
        const S=new THREE.Scene();S.background=new THREE.Color(0xf0f4f8);
        const C=new THREE.PerspectiveCamera(kind==='dice'?32:30,1,.1,80);C.lookAt(0,1.15,0);
        S.add(new THREE.HemisphereLight(0xffffff,0x60758a,.8));
        const light=new THREE.DirectionalLight(0xffffff,1.4);light.position.set(-3,9,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-6;light.shadow.camera.right=6;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;light.shadow.bias=-.0003;light.shadow.normalBias=.025;S.add(light);
        const fill=new THREE.DirectionalLight(0xc8e6ff,.45);fill.position.set(5,3,-4);S.add(fill);
        const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xe9eef4,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);
        const trayShape=new THREE.Shape(),w=kind==='dice'?8:5.6,h=4.1,r=.42;trayShape.moveTo(-w/2+r,-h/2);trayShape.lineTo(w/2-r,-h/2);trayShape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);trayShape.lineTo(w/2,h/2-r);trayShape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);trayShape.lineTo(-w/2+r,h/2);trayShape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);trayShape.lineTo(-w/2,-h/2+r);trayShape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
        const tray=new THREE.Mesh(new THREE.ShapeGeometry(trayShape),new THREE.MeshStandardMaterial({color:kind==='dice'?0x123d44:0x233e52,roughness:.94}));tray.rotation.x=-Math.PI/2;tray.position.y=.005;tray.receiveShadow=true;S.add(tray);
        const group=new THREE.Group();S.add(group);host.prepend(R.domElement);R.domElement.setAttribute('aria-hidden','true');host.classList.add('has-webgl');
        function render(){R.render(S,C);}
        function resize(){const rect=host.getBoundingClientRect(),width=Math.max(1,rect.width||320),height=Math.max(1,rect.height||280);R.setSize(width,height,false);C.aspect=width/height;if(kind==='dice')C.position.set(4.5,6.7,8.8);else C.position.set(3.2,5.8,7.6);if(C.aspect<1.1)C.position.multiplyScalar(1.1/C.aspect);C.lookAt(0,1.15,0);C.updateProjectionMatrix();render();}
        R.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancel();host.classList.remove('has-webgl');host.classList.add('simple-view');});
        if(win.ResizeObserver)new win.ResizeObserver(resize).observe(host);win.addEventListener('resize',resize);doc.addEventListener('mathmodechange',event=>{if(event.detail?.mode==='rng')win.requestAnimationFrame(resize);});
        resize();return {THREE,R,S,C,group,render,resize};
      }catch(error){host.classList.add('simple-view');return null;}
    }
    function buildDice() {
      const stage=renderer('dice',hostDice);if(!stage)return null;
      const {THREE,group}=stage;
      const geometry=new THREE.BoxGeometry(1.05,1.05,1.05,8,8,8),pos=geometry.attributes.position,norm=geometry.attributes.normal;
      for(let i=0;i<pos.count;i++){const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)),q=new THREE.Vector3(clamp(v.x,-.405,.405),clamp(v.y,-.405,.405),clamp(v.z,-.405,.405)),normal=v.clone().sub(q).normalize();v.copy(q).addScaledVector(normal,.12);pos.setXYZ(i,v.x,v.y,v.z);norm.setXYZ(i,normal.x,normal.y,normal.z);}
      geometry.computeBoundingSphere();
      const pipCanvas=doc.createElement('canvas');pipCanvas.width=pipCanvas.height=64;const pc=pipCanvas.getContext('2d'),gradient=pc.createRadialGradient(25,23,4,32,32,30);gradient.addColorStop(0,'#121925');gradient.addColorStop(.68,'#161c26');gradient.addColorStop(.86,'#111722');gradient.addColorStop(.94,'#65686d');gradient.addColorStop(1,'#a8a5a0');pc.fillStyle=gradient;pc.beginPath();pc.arc(32,32,31,0,Math.PI*2);pc.fill();
      const pipTexture=new THREE.CanvasTexture(pipCanvas),pipMat=new THREE.MeshBasicMaterial({map:pipTexture,transparent:true,polygonOffset:true,polygonOffsetFactor:-1}),pipGeo=new THREE.CircleGeometry(.085,24),bodies=[];
      const dots={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
      for(let i=0;i<3;i++){
        const die=new THREE.Group(),body=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:0xfff6e5,roughness:.25,metalness:0,clearcoat:.4,clearcoatRoughness:.24}));body.castShadow=true;body.receiveShadow=true;die.add(body);
        Object.entries(normalByFace).forEach(([value,normal])=>{const face=new THREE.Group();face.position.set(...normal.map(v=>v*.527));face.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...normal));dots[value].forEach(([x,y])=>{const pip=new THREE.Mesh(pipGeo,pipMat);pip.position.set(x*.225,y*.225,0);face.add(pip);});die.add(face);});group.add(die);bodies.push(die);
      }
      function setCount(n){bodies.forEach((die,i)=>{die.visible=i<n;die.position.set((i-(n-1)/2)*1.9,.535,0);die.quaternion.set(...Object.values(faceQuaternion(i+1,0)));});stage.render();}
      function settle(plans){plans.forEach((p,i)=>{const die=bodies[i],q=faceQuaternion(p.value,p.yaw);die.position.set(p.x,.535,p.z);die.quaternion.set(q.x,q.y,q.z,q.w);});stage.render();}
      return {setCount,settle,start(){},update(plans,seconds){plans.forEach((p,i)=>{const die=bodies[i],pose=dicePose(p,seconds),q=pose.q;die.position.set(pose.x,pose.y,pose.z);die.quaternion.set(q.x,q.y,q.z,q.w);});stage.render();}};
    }
    function buildCoin() {
      const stage=renderer('coin',hostCoin);if(!stage)return null;
      const {THREE,group}=stage;
      const edgeCanvas=doc.createElement('canvas');edgeCanvas.width=512;edgeCanvas.height=32;const ec=edgeCanvas.getContext('2d');ec.fillStyle='#b88d42';ec.fillRect(0,0,512,32);for(let x=0;x<512;x+=4){ec.fillStyle=x%8?'#e8c578':'#6f532d';ec.fillRect(x,0,2,32);}
      const edgeTexture=new THREE.CanvasTexture(edgeCanvas),loader=new THREE.TextureLoader();
      const front=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.36,metalness:.62}),back=front.clone();
      loader.load('/gorseller/yazi.png',texture=>{texture.encoding=THREE.sRGBEncoding;front.map=texture;front.needsUpdate=true;stage.render();});loader.load('/gorseller/tura.png',texture=>{texture.encoding=THREE.sRGBEncoding;back.map=texture;back.needsUpdate=true;stage.render();});
      const edge=new THREE.MeshStandardMaterial({color:0xe5b85b,map:edgeTexture,bumpMap:edgeTexture,bumpScale:.014,roughness:.32,metalness:.85});
      const coin=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.09,96,1),[edge,front,back]);coin.castShadow=true;coin.receiveShadow=true;group.add(coin);
      const ringGeo=new THREE.TorusGeometry(.68,.012,8,96),ringMat=new THREE.MeshStandardMaterial({color:0xe3bd73,metalness:.85,roughness:.27});for(const y of [-.045,.045]){const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=Math.PI/2;ring.position.y=y;coin.add(ring);}
      function settle(result){coin.position.set(0,.068,0);coin.rotation.set(result==='tura'?Math.PI:0,0,0);stage.render();}
      settle('yazi');return {settle,start(){},update(run,seconds){const pose=coinPose(run,seconds),q=pose.q;coin.position.set(pose.x,pose.y,pose.z);coin.quaternion.set(q.x,q.y,q.z,q.w);stage.render();}};
    }
    sceneDice=buildDice();sceneCoin=buildCoin();
    doc.querySelectorAll('[data-dice-count]').forEach(button=>button.addEventListener('click',()=>setCount(button.dataset.diceCount)));
    doc.getElementById('diceCountSelect')?.addEventListener('change',event=>setCount(event.target.value));
    toggle?.addEventListener('change',()=>audio()?.setEnabled(toggle.checked));
    function activate(host,fn){host.addEventListener('click',fn);host.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fn();}});}
    activate(hostDice,rollDice);activate(hostCoin,flipCoin);
    doc.addEventListener('mathmodechange',event=>{if(event.detail?.mode!=='rng')cancel();});
    win.addEventListener('pagehide',cancel);
    win.ChanceStudio={rollDice,flipCoin,setCount,cancel};win.roll3DDice=rollDice;win.flipCoin=flipCoin;
    setCount(1);fallbackValues(dicePlan(1,()=>0));
    doc.getElementById('chanceSceneHint').textContent=sceneDice&&sceneCoin?'Cisimlere dokunarak yeniden atabilirsin.':'Cisimlere dokunarak sonuçları oluşturabilirsin.';
  }
  return Object.freeze({init,dicePlan,dicePose,coinPose,diceHeight,coinHeight,diceSupport,coinSupport,faceQuaternion,rotateVector,normalByFace,landings});
});
