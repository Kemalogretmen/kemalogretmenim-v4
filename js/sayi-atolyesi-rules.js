(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.NumberWorkshop=f();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const names=['Birler','Onlar','Yüzler','Binler','On binler','Yüz binler'];
 function places(mode,grade){return grade<=2?2:grade===3?3:mode==='blocks'?4:6;}
 function digits(n,size){return Array.from({length:size},(_,i)=>Math.floor(n/10**i)%10);}
 function target(mode,grade,round,random=Math.random){const length=grade<=2?2:grade===3?3:mode==='blocks'?4:4+round%3;const min=10**(length-1);return min+Math.floor(Math.min(.999999999,Math.max(0,random()))*9*min);}
 function check(counts,n){return counts.every((c,i)=>Number.isInteger(c)&&c>=0&&c<=9&&c===Math.floor(n/10**i)%10)&&n<10**counts.length;}
 function value(counts){return counts.reduce((sum,c,i)=>sum+c*10**i,0);}
 const labels={number:'Sayı',groups:'Birlik / onluk',expanded:'Toplam biçimi',positions:'Basamak ipuçları',mixed:'Karışık çözümleniş'};
 function prompt(n,size,style,random=Math.random){
  const kind=style==='mixed'?['groups','expanded','positions'][Math.min(2,Math.floor(random()*3))]:labels[style]?style:'number';
  if(kind==='number')return {kind,text:n.toLocaleString('tr-TR'),terms:[]};
  const length=Math.max(2,String(n).length),ds=digits(n,Math.min(size,length));
  const terms=ds.map((digit,place)=>({place,digit,value:digit*10**place}));
  for(let i=terms.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[terms[i],terms[j]]=[terms[j],terms[i]];}
  if(terms.length>1&&terms.every((t,i)=>t.place===terms.length-1-i))terms.push(terms.shift());
  const units=['birlik','onluk','yüzlük','binlik','on binlik','yüz binlik'];
  const text=terms.map(t=>kind==='groups'?t.digit+' '+units[t.place]:kind==='expanded'?t.value.toLocaleString('tr-TR'):names[t.place]+' basamağı '+t.digit).join(kind==='expanded'?' + ':' · ');
  return {kind,text,terms};
 }
 return {names,places,digits,target,check,value,prompt,labels};
});
