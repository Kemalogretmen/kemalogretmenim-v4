/* Three-way reconciliation and database-authoritative automatic recovery. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'));
  else root.AquariumSyncMerge=factory(root.AquariumCore);
})(typeof window==='object'?window:this,function(C){
  'use strict';
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const conflict=()=>{throw Error('Aynı kayıt iki cihazda farklı değiştirildi. İki kopya da korunuyor.');};
  const feedKey=(f,i)=>f.id?'id:'+f.id:'legacy-'+i+'-'+f.day+'-'+f.at;
  function keyed(base,left,right,key){
    const maps=[base,left,right].map(items=>new Map(items.map((v,i)=>[key(v,i),v])));
    const order=[...new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])];
    return order.map(id=>combine(maps[0].get(id),maps[1].get(id),maps[2].get(id))).filter(v=>v!==undefined);
  }
  function combine(base,left,right,field=''){
    if(equal(left,right))return clone(left);
    if(equal(base,left))return clone(right);
    if(equal(base,right))return clone(left);
    // Delete versus edit must never silently resurrect or erase a record.
    if(left===undefined||right===undefined)conflict();
    if(object(left)&&object(right)&&(base===undefined||object(base))){
      const result={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(left),...Object.keys(right)])){
        if(['__proto__','constructor','prototype'].includes(key))conflict();
        const value=combine(base?.[key],left[key],right[key],key);if(value!==undefined)result[key]=value;
      }return result;
    }
    if(Array.isArray(left)&&Array.isArray(right)&&(base===undefined||Array.isArray(base))){
      if(field==='feeds')return keyed(base||[],left,right,feedKey);
      if([...base||[],...left,...right].every(v=>object(v)&&typeof v.id==='string'))return keyed(base||[],left,right,v=>v.id);
    }
    conflict();
  }
  function merge(base,local,remote){
    const b=C.validate(clone(base)),l=C.validate(clone(local)),r=C.validate(clone(remote));
    for(const bc of b.classes){
      const lc=l.classes.find(c=>c.id===bc.id),rc=r.classes.find(c=>c.id===bc.id);if(!lc||!rc)continue;
      // A new season cannot be reconciled with an old season's concurrent score.
      if((!equal(lc.seasons,bc.seasons)||lc.seasonStartedOn!==bc.seasonStartedOn)&&!equal(rc.students,bc.students)&&!equal(lc.students,rc.students))conflict();
      if((!equal(rc.seasons,bc.seasons)||rc.seasonStartedOn!==bc.seasonStartedOn)&&!equal(lc.students,bc.students)&&!equal(lc.students,rc.students))conflict();
      for(const bs of bc.students){
        const ls=lc.students.find(s=>s.id===bs.id),rs=rc.students.find(s=>s.id===bs.id);if(!ls||!rs)continue;
        // Creating the same new day on two devices is not itself an edit.
        for(const date of Object.keys(ls.days))if(!bs.days[date]&&rs.days[date])bs.days[date]={absent:false,tasks:bc.tasks.filter(t=>C.taskPoints(t)>0).map(t=>({...t,status:'pending'}))};
        const baseline=new Set(bs.feeds.map(feedKey)),la=ls.feeds.map(feedKey).filter(k=>!baseline.has(k)),ra=rs.feeds.map(feedKey).filter(k=>!baseline.has(k));
        const independentlyFed=la.some(k=>!ra.includes(k))&&ra.some(k=>!la.includes(k));
        // Two different corrections can both consume the same last feed credit.
        // Preserve the copies for review rather than silently losing a reversal.
        if(!equal(ls.days,rs.days))for(const [i,bf] of bs.feeds.entries())if(!bf.creditReversed){
          const key=feedKey(bf,i),lf=ls.feeds.find((f,j)=>feedKey(f,j)===key),rf=rs.feeds.find((f,j)=>feedKey(f,j)===key);
          if(lf?.creditReversed&&rf?.creditReversed)conflict();
        }
        for(const [date,bd] of Object.entries(bs.days)){
          const ld=ls.days[date],rd=rs.days[date];if(!ld||!rd)continue;
          // Older clients reuse the template ID for the first reward. If two
          // devices independently award it, do not collapse two awards into one.
          for(const bt of bd.tasks){const lt=ld.tasks.find(t=>t.id===bt.id),rt=rd.tasks.find(t=>t.id===bt.id);
            if(independentlyFed&&bt.status!=='done'&&lt?.status==='done'&&rt?.status==='done')conflict();
          }
        }
      }
    }
    // The active classroom is a navigation preference, not a score conflict.
    b.activeClassId=l.activeClassId;r.activeClassId=l.activeClassId;
    const result=combine(b,l,r);if(!result.classes.some(c=>c.id===result.activeClassId))result.activeClassId=result.classes[0]?.id;
    return C.validate(result);
  }
  // Automatic sync needs a known acknowledged snapshot to distinguish an
  // offline addition from a record another device intentionally removed. With
  // no snapshot the database wins; the caller retains its local recovery copy.
  const epoch=c=>JSON.stringify([c.seasonStartedOn,(c.seasons||[]).map(s=>s.id)]);
  function eventMap(items,key){
    const occurrences=new Map();
    return new Map(items.map(value=>{
      let id=key(value);
      if(!id){const stem='legacy:'+value.day+':'+value.at,n=occurrences.get(stem)||0;occurrences.set(stem,n+1);id=stem+':'+n;}
      return [id,value];
    }));
  }
  const automaticFeedMap=items=>eventMap(items,f=>f.id?'id:'+f.id:null);
  function automaticKeyed(base,left,right,field){
    const maps=field==='feeds'?[base,left,right].map(automaticFeedMap):[base,left,right].map(items=>new Map(items.map(v=>[v.id,v])));
    const order=[...new Set([...maps[2].keys(),...maps[1].keys(),...maps[0].keys()])];
    return order.map(id=>automaticCombine(maps[0].get(id),maps[1].get(id),maps[2].get(id))).filter(v=>v!==undefined);
  }
  function automaticCombine(base,left,right,field=''){
    if(equal(left,right))return clone(right);
    if(equal(base,left))return clone(right);
    if(equal(base,right))return clone(left);
    // A removed entity/event stays removed when the other copy edits stale data.
    if(base!==undefined&&(left===undefined||right===undefined))return undefined;
    if(left===undefined)return clone(right);
    if(right===undefined)return clone(left);
    if(object(left)&&object(right)&&(base===undefined||object(base))){
      const result={};
      for(const key of new Set([...Object.keys(base||{}),...Object.keys(left),...Object.keys(right)])){
        if(['__proto__','constructor','prototype'].includes(key))conflict();
        const value=automaticCombine(base?.[key],left[key],right[key],key);
        if(value!==undefined)result[key]=value;
      }
      return result;
    }
    if(Array.isArray(left)&&Array.isArray(right)&&(base===undefined||Array.isArray(base))){
      if(field==='feeds')return automaticKeyed(base||[],left,right,field);
      if([...(base||[]),...left,...right].every(v=>object(v)&&typeof v.id==='string'))return automaticKeyed(base||[],left,right,field);
    }
    // Concurrent scalar changes (names, settings, one award's value) are not
    // additive events. The already stored database value resolves that tie.
    return clone(right);
  }
  function legacyAwardId(studentId,date,taskId,feed){
    const text=[studentId,date,taskId,feed].join('|');
    const hash=value=>{let n=2166136261;for(let i=0;i<value.length;i++){n^=value.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');};
    return 'legacy_award_'+hash(text)+'_'+hash([...text].reverse().join(''));
  }
  function prepareLegacyAwards(base,local,remote){
    for(const bc of base.classes){
      const lc=local.classes.find(c=>c.id===bc.id),rc=remote.classes.find(c=>c.id===bc.id);
      if(!lc||!rc||epoch(lc)!==epoch(rc)||epoch(bc)!==epoch(lc))continue;
      for(const bs of bc.students){
        const ls=lc.students.find(s=>s.id===bs.id),rs=rc.students.find(s=>s.id===bs.id);
        if(!ls||!rs)continue;
        // Both devices can create today's pending template rows independently.
        for(const date of Object.keys(ls.days))if(!bs.days[date]&&rs.days[date])bs.days[date]={absent:false,tasks:bc.tasks.filter(t=>C.taskPoints(t)>0).map(t=>({...t,status:'pending'}))};
        const baseline=automaticFeedMap(bs.feeds),left=automaticFeedMap(ls.feeds),right=automaticFeedMap(rs.feeds);
        for(const [date,bd] of Object.entries(bs.days)){
          const ld=ls.days[date],rd=rs.days[date];if(!ld||!rd)continue;
          const leftOnly=[...left].filter(([id,f])=>f.day===date&&!baseline.has(id)&&!right.has(id)&&!f.creditReversed);
          const rightOnly=[...right].filter(([id,f])=>f.day===date&&!baseline.has(id)&&!left.has(id)&&!f.creditReversed);
          const collisions=bd.tasks.filter(bt=>{
            const lt=ld.tasks.find(t=>t.id===bt.id),rt=rd.tasks.find(t=>t.id===bt.id);
            return bt.status!=='done'&&lt?.status==='done'&&rt?.status==='done'&&!lt.sourceId&&!rt.sourceId&&C.taskPoints(lt)>0&&C.taskPoints(rt)>0;
          });
          // Old clients reused a template ID for the first reward. Only
          // disjoint new feeds prove that two separate rewards took place.
          // Convert those rewards into stable event IDs so retries dedupe them.
          for(let i=0;i<Math.min(collisions.length,leftOnly.length,rightOnly.length);i++){
            const bt=collisions[i],lt=ld.tasks.find(t=>t.id===bt.id),rt=rd.tasks.find(t=>t.id===bt.id);
            for(const [task,[feedId,feed]] of [[lt,leftOnly[i]],[rt,rightOnly[i]]]){
              task.id=legacyAwardId(bs.id,date,bt.id,feedId);task.sourceId=bt.id;task.awardedAt=task.awardedAt??feed.at;
            }
            bd.tasks=bd.tasks.filter(t=>t.id!==bt.id);
          }
        }
      }
    }
  }
  function reconcile(base,local,remote){
    const l=C.validate(clone(local)),r=C.validate(clone(remote));
    if(base==null){
      r.activeClassId=r.classes.some(c=>c.id===l.activeClassId)?l.activeClassId:r.activeClassId;
      return r;
    }
    const b=C.validate(clone(base)),seasons=new Map();
    for(const bc of b.classes){
      const lc=l.classes.find(c=>c.id===bc.id),rc=r.classes.find(c=>c.id===bc.id);
      if(!lc||!rc||epoch(lc)===epoch(rc))continue;
      // An intentional reset wins over an old season's concurrent award. If
      // both devices reset differently, the database season is authoritative.
      seasons.set(bc.id,clone(epoch(rc)===epoch(bc)&&epoch(lc)!==epoch(bc)?lc:rc));
    }
    prepareLegacyAwards(b,l,r);
    const result=automaticCombine(b,l,r);
    result.classes=result.classes.map(c=>{
      const selected=seasons.get(c.id);if(!selected)return c;
      const students=new Map(selected.students.map(s=>[s.id,s]));
      return {...c,seasonStartedOn:selected.seasonStartedOn,seasons:clone(selected.seasons),students:c.students.map(s=>{
        const current=students.get(s.id);
        // Keep the merged membership: a reset must not resurrect a pupil that
        // another device removed. An independently added pupil joins empty in
        // the new season instead of carrying old-season rewards into it.
        return {...s,days:clone(current?.days||{}),feeds:clone(current?.feeds||[]),...(current?.createdAt!==undefined?{createdAt:current.createdAt}:{})};
      })};
    });
    for(const bc of b.classes){
      const merged=result.classes.find(c=>c.id===bc.id);if(!merged||seasons.has(bc.id))continue;
      for(const bs of bc.students){
        const student=merged.students.find(s=>s.id===bs.id);if(!student)continue;
        const corrected=Object.entries(bs.days).some(([date,day])=>day.tasks.some(t=>t.status==='done'&&C.taskPoints(t)>0&&student.days[date]?.tasks.find(other=>other.id===t.id)?.status!=='done'));
        if(!corrected)continue;
        // Two devices may undo different rewards while both consume the same
        // last feed credit. Preserve both corrections and reverse the remaining
        // consumed credit rather than blocking the next legitimate feeding.
        let excess=student.feeds.filter(f=>!f.creditReversed).length-C.completedCount(student);
        const originalFeeds=automaticFeedMap(bs.feeds),mergedFeeds=automaticFeedMap(student.feeds);
        const candidates=[...mergedFeeds].filter(([,f])=>!f.creditReversed).sort((a,b)=>Number(originalFeeds.has(b[0]))-Number(originalFeeds.has(a[0]))||b[1].at-a[1].at);
        for(const [,f] of candidates){if(excess--<=0)break;f.creditReversed=true;}
      }
    }
    // Navigation belongs to this device and cannot introduce a deleted class.
    result.activeClassId=result.classes.some(c=>c.id===l.activeClassId)?l.activeClassId:(result.classes.find(c=>c.id===r.activeClassId)||result.classes[0])?.id;
    return C.validate(result);
  }
  return {merge,reconcile};
});
