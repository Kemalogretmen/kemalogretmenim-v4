(function(root,factory){const rules=factory();if(typeof module==='object'&&module.exports)module.exports=rules;else root.CarpimKanatlariRules=rules;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const FACTORS=[1,2,3,4,5,6,7,8,9,10];
  const ISLANDS=[
    {name:'Filiz Adası',kind:'palm',land:'#79b963',sand:'#efd19b',colors:['#bcecf4','#97c9a5','#448e70'],x:9,y:62,mx:25,my:10},
    {name:'Mercan Koyu',kind:'coral',land:'#e7a0aa',sand:'#f7dbbd',colors:['#d2eff3','#ddaeb6','#9dbab5'],x:25,y:40,mx:75,my:10},
    {name:'Üçlü Orman',kind:'forest',land:'#579466',sand:'#ddc89b',colors:['#d9eed6','#8fb887','#42745d'],x:28,y:79,mx:75,my:29},
    {name:'Dört Rüzgâr',kind:'wind',land:'#9fbfa5',sand:'#e7debc',colors:['#dceafa','#a8c2d7','#7aa4ab'],x:44,y:60,mx:25,my:29},
    {name:'Yıldız Koyu',kind:'cactus',land:'#d8b468',sand:'#f7dba2',colors:['#fff0c8','#dfc28e','#bda46a'],x:49,y:23,mx:25,my:48},
    {name:'Kristal Adası',kind:'crystal',land:'#a395d2',sand:'#dfd0e9',colors:['#e8dfff','#b6a2d6','#8c79ad'],x:64,y:41,mx:75,my:48},
    {name:'Mantar Bahçesi',kind:'mushroom',land:'#9fc56d',sand:'#ebd9a5',colors:['#f4e4e5','#c4bd86','#8c9d66'],x:64,y:80,mx:75,my:67},
    {name:'Buzul Adası',kind:'snow',land:'#c9e8ef',sand:'#ecf7f6',colors:['#dff3ff','#afcedc','#789fad'],x:80,y:78,mx:25,my:67},
    {name:'Volkan Adası',kind:'volcano',land:'#9b8275',sand:'#cbaa8a',colors:['#ffe0cc','#cba192','#a7827c'],x:85,y:43,mx:25,my:86},
    {name:'Hazine Adası',kind:'treasure',land:'#68b8a4',sand:'#ffe0a1',colors:['#cef1ee','#a7cba2','#5ba390'],x:92,y:15,mx:75,my:86}
  ];
  const NAMES=ISLANDS.map(i=>i.name);
  function tableName(factor){return factor+'’'+([6,9,10].includes(factor)?'lar':'ler');}
  function shuffle(list,random=Math.random){const out=list.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function deck(level,random=Math.random){const i=Math.max(0,Math.min(FACTORS.length-1,Math.floor(Number(level)||0)));const small=shuffle([1,2,3,4,5],random).slice(0,3),large=shuffle([6,7,8,9,10],random).slice(0,3);return shuffle(small.concat(large),random).map(b=>({a:FACTORS[i],b,answer:FACTORS[i]*b}));}
  function normalizeFactors(factors){return [...new Set((Array.isArray(factors)?factors:[]).map(Number).filter(n=>FACTORS.includes(n)))].sort((a,b)=>a-b);}
  function mixedDeck(factors,random=Math.random){
    const tables=normalizeFactors(factors);if(!tables.length)return [];
    const pools=new Map(tables.map(a=>[a,shuffle(FACTORS,random)])),questions=[];
    // Her seçili tablo en az bir kez gelir; sayıları arasındaki fark en çok birdir.
    while(questions.length<10)for(const a of shuffle(tables,random)){const b=pools.get(a).pop();questions.push({a,b,answer:a*b});if(questions.length===10)break;}
    return shuffle(questions,random);
  }
  function options(q,random=Math.random){const values=new Set([q.answer]);[q.answer-q.a,q.answer+q.a,q.answer-1,q.answer+1].forEach(n=>{if(n>=0&&values.size<3)values.add(n);});let n=1;while(values.size<3)values.add(q.answer+n++);return shuffle([...values],random);}
  function hint(q){if(q.a===1)return '1 ile çarpınca sayı değişmez: 1 × '+q.b+' = '+q.b+'.';if(q.a===10)return q.b+' tane onluk düşün: '+q.b+' × 10 = '+q.answer+'.';return q.b+' grubun her birinde '+q.a+' var: '+Array(q.b).fill(q.a).join(' + ')+' = '+q.answer+'.';}
  const BIRDS=[
    {id:'spark',name:'Kıvılcım',color:'#f37651',shade:'#c64b39',kind:'crest',tag:'Cesur kaşif',power:'Alev Patlaması'},
    {id:'blue',name:'Maviş',color:'#30b8c5',shade:'#117d9b',kind:'round',tag:'Bulut dostu',power:'Dalga Patlaması'},
    {id:'lemon',name:'Limon',color:'#f6cb3e',shade:'#db9525',kind:'swift',tag:'Güneş kanadı',power:'Güneş Patlaması'},
    {id:'violet',name:'Menekşe',color:'#b291df',shade:'#7558b1',kind:'owl',tag:'Gece gezgini',power:'Yıldız Patlaması'},
    {id:'snow',name:'Pamuk',color:'#f9f4df',shade:'#a6beb9',kind:'fluffy',tag:'Yumuşak kanat',power:'Bulut Patlaması'},
    {id:'pistachio',name:'Fıstık',color:'#98c768',shade:'#558a51',kind:'tuft',tag:'Orman dostu',power:'Yaprak Patlaması'}
  ];
  const GRAVITY=620;
  function geometry(size){
    const H=size.h/(size.w/800),ground=H*.85,r=Math.max(12,Math.min(29,H*.09)),sling=Math.min(88,H*.27),unit=Math.min(1,H/340);
    const labelWidth=Math.min(72,Math.max(44,size.w*.1))/(size.w/800),labelHeight=44/(size.w/800);
    const targets=[420,555,690].map((x,i)=>{const y=ground-(78+i*15)*unit;return{x:x-39,y,w:78,h:(78+i*15)*unit,center:x,label:{x:x-labelWidth/2,y:y-labelHeight,w:labelWidth,h:labelHeight}};});
    return{H,ground,r,sling,anchor:{x:145,y:ground-sling},targets};
  }
  function pullShot(g,pull){return{x:g.anchor.x,y:g.anchor.y,vx:(g.anchor.x-pull.x)*8,vy:(g.anchor.y-pull.y)*8,age:0,release:{x:pull.x,y:pull.y}};}
  function segmentBox(x,y,dx,dy,b,r){
    let enter=0,leave=1;
    for(const [start,change,min,max] of [[x,dx,b.x-r,b.x+b.w+r],[y,dy,b.y-r,b.y+b.h+r]]){
      if(Math.abs(change)<1e-8){if(start<min||start>max)return null;continue;}
      let a=(min-start)/change,c=(max-start)/change;if(a>c)[a,c]=[c,a];enter=Math.max(enter,a);leave=Math.min(leave,c);if(enter>leave)return null;
    }
    return enter;
  }
  // Tahmin çizgisi ve gerçek uçuş aynı süpürülmüş çarpışma hesabını kullanır.
  function step(shot,dt,g){
    const dx=shot.vx*dt,dy=shot.vy*dt+GRAVITY*dt*dt/2;
    let impact=null,fraction=1;
    g.targets.forEach((target,i)=>{for(const box of[target,target.label]){const n=segmentBox(shot.x,shot.y,dx,dy,box,g.r*.8);if(n!==null&&n<=fraction){impact=i;fraction=n;}}});
    shot.x+=dx*fraction;shot.y+=dy*fraction;shot.vy+=GRAVITY*dt*fraction;shot.age+=dt;
    return{impact,miss:impact===null&&(shot.y+g.r>g.ground||shot.x>840||shot.x< -40||shot.age>4)};
  }
  function trace(shot,g){const s={...shot},points=[{x:s.x,y:s.y}];for(let i=0;i<480;i++){const result=step(s,1/120,g);if(i%8===0)points.push({x:s.x,y:s.y});if(result.impact!==null||result.miss)return{...result,points,position:{x:s.x,y:s.y}};}return{impact:null,miss:true,points,position:{x:s.x,y:s.y}};}
  function aimAt(g,index){
    const target=g.targets[index];
    for(const fraction of [.3,.4,.5,.6,.7]){
      const rise=Math.max(16,Math.min(g.anchor.y-g.r-12,g.H*fraction)),vy=-Math.sqrt(2*GRAVITY*rise),dy=target.label.y+target.label.h*.12-g.anchor.y;
      if(vy*vy+2*GRAVITY*dy<0)continue;
      const time=(-vy+Math.sqrt(vy*vy+2*GRAVITY*dy))/GRAVITY;
      const shot={x:g.anchor.x,y:g.anchor.y,vx:(target.center-g.anchor.x)/time,vy,age:0};
      if(trace(shot,g).impact===index)return shot;
    }
    return null;
  }
  function points(wrong){return wrong===0?120:100;}
  return {FACTORS,NAMES,ISLANDS,BIRDS,GRAVITY,shuffle,deck,mixedDeck,normalizeFactors,options,hint,geometry,pullShot,step,trace,aimAt,points,tableName};
});
