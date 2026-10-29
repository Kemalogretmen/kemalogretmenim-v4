/* Device-local swimming energy. Reads awarded points/feeds; never persists ranks. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'));
  else root.AquariumEnergy=factory(root.AquariumCore);
})(typeof window==='object'?window:this,function(C){
  'use strict';
  const BASE_SPEED=.65,BOOST_MS=25*60*1000;
  function measure(classroom,date=C.dayKey(),now=Date.now()){
    const entries=classroom.students.map(s=>{
      let feeds=0,lastFedAt=0;
      for(const f of s.feeds)if(f.day===date&&!f.creditReversed&&Number.isFinite(f.at)&&f.at<=now+300000){feeds++;lastFedAt=Math.max(lastFedAt,Math.min(now,f.at));}
      const points=(s.days[date]?.tasks||[]).reduce((sum,t)=>sum+(t.status==='done'&&C.taskPoints(t)>0?C.taskPoints(t):0),0);
      return {id:s.id,feeds,points,lastFedAt,hungerDays:C.hungerDays(s,now),absent:s.days[date]?.absent===true,peak:0};
    });
    const eligible=entries.filter(s=>!s.absent&&s.feeds>0&&s.points>0);
    const sorted=[...eligible].sort((a,b)=>b.feeds-a.feeds||b.points-a.points),cutoff=sorted[Math.min(4,sorted.length-1)];
    const maxFeeds=sorted[0]?.feeds||1,maxPoints=Math.max(1,...eligible.map(s=>s.points));
    for(const s of eligible){
      // Tied children receive the same boost; list order never breaks a tie.
      const leading=s.feeds>=2&&cutoff&&(s.feeds>cutoff.feeds||s.feeds===cutoff.feeds&&s.points>=cutoff.points);
      s.peak=leading?.4:.2+.1*(.7*s.feeds/maxFeeds+.3*s.points/maxPoints);
    }
    return new Map(entries.map(s=>[s.id,s]));
  }
  function factor(stats,now=Date.now()){
    if(!stats)return 1;
    if(stats.absent||stats.hungerDays>=2)return 0;
    if(stats.hungerDays>=1)return .72;
    if(!stats.lastFedAt||!stats.peak)return 1;
    const remaining=Math.max(0,Math.min(1,1-(now-stats.lastFedAt)/BOOST_MS));
    return 1+stats.peak*remaining*remaining;
  }
  function approach(current,target,dt){
    if(!Number.isFinite(current))return target;
    return current+(target-current)*(1-Math.exp(-Math.max(0,Math.min(.1,dt))*1.4));
  }
  return {BASE_SPEED,BOOST_MS,measure,factor,approach};
});
