(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoundingSlide=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function grade(g){return [2,3,4].includes(Number(g))?Number(g):2;}
 function stepFor(g,step){return grade(g)>=3&&Number(step)===100?100:10;}
 function question(number,step=10){
  const n=Number(number);
  if(![10,100].includes(step)||!Number.isInteger(n)||n<step||n>99999||n%step===0)throw new RangeError('İki komşu kat arasında bir sayı gerekir.');
  const unit=n%10,remainder=n%step,lower=n-remainder,upper=lower+step;
  const side=remainder<step/2?'left':'right';
  return {number:n,unit,remainder,step,lower,upper,answer:side==='left'?lower:upper,side};
 }
 function makeQueue(g,count=5,random=Math.random,step=10){
  g=grade(g);step=stepFor(g,step);count=[5,10].includes(Number(count))?Number(count):5;
  const rand=()=>Math.min(.999999999,Math.max(0,Number(random())||0));
  const units=[1,2,3,4,5,6,7,8,9];
  for(let i=units.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[units[i],units[j]]=[units[j],units[i]];}
  // The short journey practices both directions and the halfway value.
  const five=units.indexOf(5);if(five>4)[units[4],units[five]]=[units[five],units[4]];
  let left=units.slice(0,5).filter(n=>n<5).length;
  while(left<2||left>3){
   const needLeft=left<2,inside=units.findIndex((n,i)=>i<5&&n!==5&&(needLeft?n>4:n<5)),outside=units.findIndex((n,i)=>i>=5&&(needLeft?n<5:n>4));
   [units[inside],units[outside]]=[units[outside],units[inside]];left+=needLeft?1:-1;
  }
  return Array.from({length:count},(_,i)=>{
   const digits=g===2?2:g===3?3:4+i%2;
   const min=10**(digits-1)/step,max=10**digits/step-1;
   const group=min+Math.floor(rand()*(max-min+1)),unit=units[i%9];
   let remainder=unit;
   if(step===100){
    // Include a value just below the cutoff and the exact midpoint.
    const ranges=[[1,19],[20,29],[30,48],[49,49],[50,50],[51,69],[70,79],[80,89],[90,99]];
    const [start,end]=ranges[unit-1];
    remainder=start+Math.floor(rand()*(end-start+1));
   }
   return question(group*step+remainder,step);
  });
 }
 function explanation(q){
  const target=q.side==='left'?'önceki':'sonraki';
  if(q.step===100){
   const lastTwo=String(q.remainder).padStart(2,'0');
   return 'Son iki basamak '+lastTwo+(q.remainder===50?' (tam ortada).':q.remainder<50?' < 50.':' > 50.')+' '+target[0].toLocaleUpperCase('tr')+target.slice(1)+' yüzlüğe yuvarla.';
  }
  return 'Birler basamağı '+q.unit+(q.unit===5?' (tam ortada).':q.unit<5?' < 5.':' > 5.')+' '+target[0].toLocaleUpperCase('tr')+target.slice(1)+' onluğa yuvarla.';
 }
 function point(side,t){t=Math.min(1,Math.max(0,t));const dir=side==='left'?-1:1,p0={x:500,y:228},p1={x:500+dir*128,y:235},p2={x:500+dir*155,y:505},p3={x:500+dir*352,y:505},s=1-t;return {x:s*s*s*p0.x+3*s*s*t*p1.x+3*s*t*t*p2.x+t*t*t*p3.x,y:s*s*s*p0.y+3*s*s*t*p1.y+3*s*t*t*p2.y+t*t*t*p3.y};}
 return {grade,stepFor,question,makeQueue,explanation,point};
});
