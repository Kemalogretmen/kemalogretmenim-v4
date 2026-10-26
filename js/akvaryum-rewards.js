/* Transient reward poses and event detection; never stored in a pupil's record. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'));
  else root.AquariumRewards=factory(root.AquariumCore);
})(typeof window==='object'?window:this,function(C){
  'use strict';
  const profiles={
    ray:['glide',3.5,1.5],turtle:['paddle',3.4,1.2],jellyfish:['pulse',3.5,1.2],
    octopus:['greet',3.2,1.3],seahorse:['curtsy',3.2,1],cleanershrimp:['antenna',3,1.5],
    hermitcrab:['greet',3.2,.8],cuttlefish:['ripple',3.4,1.2],
    dolphin:['arc',3.2,1],shark:['cruise',3.1,.8],swordfish:['cruise',3.1,1],
    betta:['fan',3.5,1.2],goldfish:['fan',3.4,1],guppy:['fan',3,1.3],
    lionfish:['fan',3.5,.8],bannerfish:['fan',3.4,.9],batfish:['paddle',3.4,.8],
    butterfly:['curtsy',3.1,.9],copperband:['curtsy',3.1,.8],discus:['curtsy',3.3,.7],
    boxfish:['wiggle',3.2,.8],safiye:['curtsy',3.6,1.1],puffer:['inflate',5,1],
    eel:['serpentine',3.6,1],angler:['beacon',3.7,1],mantis:['mantis-greet',3.5,1],crab:['side-step',3.6,1],
    lina:['veil-fan',3.8,1],spongebob:['sponge-dance',4.2,1],patrick:['star-dance',4,1],mrkrabs:['claw-clap',3.8,1]
  };
  function makeProfile(id){
    const n=C.SPECIES.findIndex(s=>s.id===id),p=profiles[id]||['wiggle',2.9+(Math.max(0,n)%4)*.15,.8+(Math.max(0,n)%3)*.12];
    return {kind:p[0],duration:p[1],strength:p[2]};
  }
  const catalogue=new Map(C.SPECIES.map(s=>[s.id,Object.freeze(makeProfile(s.id))]));
  const profile=id=>catalogue.get(id)||catalogue.get('clown');
  const neutral=()=>({active:false,amount:0,x:0,y:0,bank:0,scaleX:1,scaleY:1,tail:0,joints:0,phase:0,lateral:0,orbitX:0,orbitY:0});
  function pose(id,elapsed,{egg=false,collective=false,resting=false}={}){
    const p=profile(id),duration=collective?4.6:egg?2.8:p.duration;
    if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=duration)return neutral();
    const u=elapsed/duration,envelope=Math.sin(Math.PI*u)**2;
    const wave=Math.sin(elapsed*(collective?3.5:5.5));
    const result={...neutral(),active:true,amount:envelope,tail:envelope*.65,joints:envelope,phase:elapsed*1.7*envelope};
    if(egg){result.bank=wave*2*envelope;result.scaleX=1+envelope*.025;result.scaleY=1-envelope*.015;return result;}
    if(collective){result.y=resting?0:-Math.sin(Math.PI*u)*envelope*5;result.bank=wave*1.8*envelope;result.joints=envelope*.6;return result;}
    const a=envelope*p.strength;
    if(p.kind==='inflate')return result; // The existing five-second puffer shape is composed separately.
    if(p.kind==='sponge-dance'){
      const dance=Math.sin(u*Math.PI*6),hop=Math.sin(u*Math.PI*2)**2;
      result.x=dance*2.8*a;result.y=-10*hop*a;result.bank=dance*5.8*a;
      result.scaleX=1+dance*.045*a;result.scaleY=1-dance*.04*a;result.joints=1.5*envelope;
    }else if(p.kind==='star-dance'){
      const dance=Math.sin(u*Math.PI*5);result.x=dance*3.7*a;result.y=-7*Math.sin(u*Math.PI*3)**2*a;result.bank=dance*6.3*a;
      result.scaleX=1+wave*.025*a;result.scaleY=1-wave*.02*a;result.joints=1.4*envelope;
    }else if(p.kind==='claw-clap'){
      result.x=Math.sin(u*Math.PI*6)*4.5*a;result.bank=wave*1.6*a;result.joints=1.6*envelope;
    }else if(p.kind==='serpentine'){
      result.orbitX=Math.sin(u*Math.PI*2)*.18*a;result.orbitY=(Math.cos(u*Math.PI*2)-1)*.12*a;result.x=Math.sin(u*Math.PI*4)*3.5*a;result.y=-3*a;result.bank=wave*1.4*a;result.joints=1.5*envelope;
    }else if(p.kind==='beacon'){
      result.y=-4*a;result.bank=wave*2*a;result.scaleX=1+.015*a;result.scaleY=1+.012*a;result.joints=1.4*envelope;
    }else if(p.kind==='mantis-greet'){
      result.x=wave*2.3*a;result.y=-2*a;result.bank=wave*2.2*a;result.joints=1.6*envelope;
    }else if(p.kind==='side-step'){
      result.lateral=Math.sin(u*Math.PI*6)*.23*a;result.x=Math.sin(u*Math.PI*6)*4.2*a;result.bank=wave*.8*a;result.joints=1.5*envelope;
    }else if(p.kind==='veil-fan'){
      result.y=-5*a;result.bank=wave*3.2*a;result.tail=1.65*envelope;result.joints=1.4*envelope;
    }else if(p.kind==='glide'){result.y=-7*a;result.bank=wave*3*a;result.joints=1.4*envelope;}
    else if(p.kind==='paddle'){result.y=-5*a;result.bank=wave*2*a;result.joints=1.1*envelope;}
    else if(p.kind==='pulse'){const pulse=(Math.sin(elapsed*7)+1)/2;result.scaleX=1-.055*pulse*a;result.scaleY=1+.045*pulse*a;result.y=-7*a;}
    else if(p.kind==='greet'){result.bank=wave*3*a;result.joints=1.25*envelope;result.y=-2*a;}
    else if(p.kind==='antenna'){result.bank=wave*1.6*a;result.joints=1.5*envelope;result.x=Math.sin(elapsed*7)*2*a;}
    else if(p.kind==='ripple'){result.scaleY=1+wave*.025*a;result.joints=envelope;result.y=-3*a;}
    else if(p.kind==='arc'){result.y=-10*a;result.bank=Math.sin(elapsed*2.4)*5*a;result.tail=envelope;}
    else if(p.kind==='cruise'){result.x=wave*4*a;result.bank=wave*1.5*a;result.tail=envelope;}
    else if(p.kind==='fan'){result.bank=wave*2.5*a;result.tail=1.3*envelope;result.y=-3*a;}
    else if(p.kind==='curtsy'){result.bank=Math.sin(elapsed*3)*5*a;result.y=-4*a;result.tail=envelope;}
    else {result.bank=wave*3*a;result.x=wave*2*a;result.tail=envelope;}
    return result;
  }
  // Keep event identities, not a comparison of total scores: reversals, imports,
  // configuration edits and reconnect acknowledgements must not invent rewards.
  function createTracker(){
    let day=null,classes=new Map();
    function observe(state,date){
      const first=day!==date;if(first){day=date;classes=new Map();}
      const awards=[],goals=[];
      for(const cls of state.classes){
        const season=JSON.stringify([cls.seasonStartedOn||'',cls.seasons?.length||0,cls.seasons?.at(-1)?.id]),old=classes.get(cls.id);
        const prior=old?.season===season?old:null;
        const next={season,pupils:new Map(),goal:null};let positive=false;
        for(const s of cls.students){
          const seen=new Set(prior?.pupils.get(s.id)||[]),known=prior?.pupils.has(s.id);
          const record=s.days[date];
          for(const t of record?.tasks||[]){
            if(t.status!=='done'||C.taskPoints(t)<=0)continue;
            if(known&&!seen.has(t.id)&&!record.absent){awards.push({classId:cls.id,studentId:s.id,eventId:t.id});positive=true;}
            seen.add(t.id);
          }
          next.pupils.set(s.id,seen);
        }
        if(cls.goal){
          const g=cls.goal,progress=C.goalProgress(cls);
          const key=JSON.stringify([g.startedOn,Object.entries(g.baseline).sort()]);
          const before=prior?.goal;
          const same=before?.key===key;
          const celebrated=same&&before.celebrated;
          if(same&&!celebrated&&before.enabled&&g.enabled&&before.target===g.target&&!before.complete&&progress.complete&&positive&&progress.points>before.points){
            goals.push({classId:cls.id,title:g.title});
          }
          next.goal={key,target:g.target,enabled:g.enabled,complete:progress.complete,points:progress.points,
            celebrated:!!celebrated||progress.complete};
        }
        classes.set(cls.id,next);
      }
      for(const id of classes.keys())if(!state.classes.some(c=>c.id===id))classes.delete(id);
      return {awards,goals};
    }
    function reset(state,date){day=null;classes=new Map();observe(state,date);}
    return {observe,reset};
  }
  return {profile,pose,createTracker};
});
