/* Conservative three-way reconciliation. Ambiguous edits require an explicit choice. */
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
  return {merge};
});
