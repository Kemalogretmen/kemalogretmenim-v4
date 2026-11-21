/* Permanent shared reef rewards, independent of pupil identities and mini-games. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumReef=factory();})(typeof window==='object'?window:this,function(){
 'use strict';
 const PARTS=Object.freeze([
  {id:'keel',name:'Geminin iskeleti',news:'Gemimizin iskeletini birlikte kurduk!'},
  {id:'hull',name:'Gövde ve güverte',news:'Kayıp Gemi’nin güvertesi tamamlandı!'},
  {id:'mast',name:'Direk ve kaptan bölümü',news:'Gemimizin kaptan bölümü resifte yerini aldı!'},
  {id:'reef',name:'Çapa ve mercanlar',news:'Kayıp Gemi’yi birlikte tamamladık!'}
 ]);
 const DEFAULTS=Object.freeze([100,200,300,400]),ID=/^[\w-]{1,90}$/,DATE=/^\d{4}-\d{2}-\d{2}$/;
 const validThresholds=v=>Array.isArray(v)&&v.length===4&&v.every((n,i)=>Number.isInteger(n)&&n>=1&&n<=1000000&&(!i||n>v[i-1]));
 function validate(raw){
  if(!raw||raw.version!==1||typeof raw.id!=='string'||!ID.test(raw.id)||['__proto__','constructor','prototype'].includes(raw.id)||!validThresholds(raw.thresholds)||typeof raw.visible!=='boolean'||!['left','right'].includes(raw.side)||!['small','medium'].includes(raw.size)||!raw.earned||typeof raw.earned!=='object'||Array.isArray(raw.earned))throw Error('Resif koleksiyonu kaydı geçersiz.');
  const earned={};let gap=false;
  for(const part of PARTS){const item=raw.earned[part.id];if(item===undefined){gap=true;continue;}if(gap||!item||!Number.isSafeInteger(item.at)||item.at<0||item.at>8640000000000000||!DATE.test(item.on||'')||!Number.isInteger(item.threshold)||item.threshold<1||item.threshold>1000000)throw Error('Resif parçası kaydı geçersiz.');earned[part.id]={at:item.at,on:item.on,threshold:item.threshold};}
  return {version:1,id:raw.id,thresholds:[...raw.thresholds],earned,visible:raw.visible,side:raw.side,size:raw.size};
 }
 const stage=collection=>collection?PARTS.filter(p=>collection.earned?.[p.id]).length:0;
 const linked=cls=>!!cls.reefCollection&&cls.goal?.reefId===cls.reefCollection.id;
 function award(cls,points,{now=Date.now(),on=new Date().toISOString().slice(0,10)}={}){
  if(!linked(cls)||!cls.goal.enabled||!Number.isFinite(points))return [];
  const c=cls.reefCollection,unlocked=[];
  PARTS.forEach((part,i)=>{if(!c.earned[part.id]&&points>=c.thresholds[i]){c.earned[part.id]={at:now,on,threshold:c.thresholds[i]};unlocked.push(part.id);}});return unlocked;
 }
 function publicView(collection){if(!collection)return null;return {version:1,stage:stage(collection),visible:collection.visible,side:collection.side,size:collection.size};}
 function publicState(raw){if(!raw||raw.version!==1||!Number.isInteger(raw.stage)||raw.stage<0||raw.stage>4)return null;return {version:1,stage:raw.stage,visible:raw.visible===true,side:raw.side==='right'?'right':'left',size:raw.size==='small'?'small':'medium'};}
 function merge(base,left,right,resolve){
  if(!base&&!left&&!right)return undefined;
  const l=left||base||right,r=right||base||left,strip=c=>c?{...c,earned:{}}:undefined;
  const merged=resolve(strip(base),strip(l),strip(r));
  const completed=stage(r)>=stage(l)?r:l;
  merged.earned={...completed.earned};
  const thresholds=merged.thresholds.slice();
  PARTS.forEach((part,index)=>{
   const event=base?.earned?.[part.id]||completed.earned[part.id];
   if(event){merged.earned[part.id]=event;thresholds[index]=event.threshold;}
  });
  merged.thresholds=validThresholds(thresholds)?thresholds:completed.thresholds;
  return validate(merged);
 }
 function news(collection,start,end){if(!collection)return [];return PARTS.flatMap((p,i)=>{const event=collection.earned[p.id];return event&&event.on>=start&&event.on<=end?[{stage:i+1,title:p.news,on:event.on}]:[];});}
 function asset(value){return '/assets/akvaryum/dekor/kayip-gemi-'+Math.max(1,Math.min(4,Number(value)||1))+'.svg';}
 return {PARTS,DEFAULTS,validThresholds,validate,stage,linked,award,publicView,publicState,merge,news,asset};
});
