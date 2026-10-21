/* Opt-in seasonal scenes. The supplied snowman is a transparent 3D render;
   the photographed flag shares the aquarium clock, with no extra animation loop. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumSeasonal=factory();})(typeof window==='object'?window:this,function(){
 'use strict';
 function suggestion(date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  const year=Number(parts.year),month=Number(parts.month),day=Number(parts.day);
  if(month===10&&day===29)return {theme:'republic-day',key:'republic-'+year,title:'29 Ekim Cumhuriyet Bayramımız kutlu olsun!',description:'Ay yıldızlı akvaryumu birlikte inceleyelim.'};
  if((month===12&&day>=20)||(month===1&&day<=7))return {theme:'new-year',key:'new-year-'+(month===1?year-1:year),title:'Yeni yılın deniz dostları hazır!',description:'Kardan adamlı, hafif süslü akvaryumu keşfedin.'};
  return null;
 }
 // Sample only the original flag region, including a small feathered border.
 const FLAG={x:686,y:125,width:452,height:246};
 function flagPlacement(width,height,imageWidth=1672,imageHeight=941,alignY=.5){
  const scale=Math.max(width/imageWidth,height/imageHeight);
  return {x:(width-imageWidth*scale)/2+FLAG.x*scale,y:(height-imageHeight*scale)*alignY+FLAG.y*scale,width:FLAG.width*scale,height:FLAG.height*scale};
 }
 function clothGeometry(width,height,phase,lite=false){
  const count=lite?24:48;
  return Array.from({length:count},(_,i)=>{
   const u=(i+.5)/count,envelope=Math.sin(u*Math.PI)**2;
   const wave=Math.sin(u*Math.PI*3-phase*.7)*height*.009*envelope;
   return {source:i/count,fraction:1/count,x:i/count*width,y:wave,width:width/count+.6,height,shade:(Math.cos(u*Math.PI*3-phase*.7)*.012+.012)*envelope};
  });
 }
 function createFlag(root){
  if(!root)return {update(){},resize(){},draw(){},resume(){},active:()=>false};
  const canvas=root.querySelector('canvas'),image=root.querySelector('img');
  let ctx;try{ctx=canvas.getContext?.('2d',{alpha:true});}catch(_){}
  let enabled=false,moving=false,lite=false,phase=0,previous=null,last=-Infinity,size='',w=0,h=0;
  function draw(now,force=false){
   if(!enabled||!ctx||!image.complete||!image.naturalWidth)return false;
   if(!force&&(!moving||now-last<(lite?125:83)))return false;
   if(moving&&previous!==null)phase+=Math.max(0,Math.min((now-previous)/1000,.18));previous=now;last=now;
   ctx.clearRect(0,0,w,h);
   // The same photograph remains underneath. Feathering hides rectangular
   // seams, and the bounded 0.9% ripple preserves the original cloth and colors.
   for(const strip of clothGeometry(w,h,phase,lite)){
    ctx.drawImage(image,FLAG.x+strip.source*FLAG.width,FLAG.y,strip.fraction*FLAG.width,FLAG.height,strip.x,strip.y,strip.width,strip.height);
    ctx.fillStyle='rgba(8,39,56,'+strip.shade.toFixed(4)+')';ctx.fillRect(strip.x,strip.y,strip.width,strip.height);
   }
   canvas.hidden=false;return true;
  }
  function resize(){
   if(!enabled||!image.naturalWidth)return;
   const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;
   const position=root.ownerDocument.defaultView.getComputedStyle?.(root.parentElement).backgroundPosition||'50% 50%';
   const alignY=/top| 0(?:%|px)?$/.test(position)?0:.5;
   const place=flagPlacement(rect.width,rect.height,image.naturalWidth,image.naturalHeight,alignY),key=rect.width+':'+rect.height+':'+lite+':'+alignY;
   if(key===size)return;size=key;
   Object.assign(canvas.style,{left:place.x+'px',top:place.y+'px',width:place.width+'px',height:place.height+'px'});
   const ratio=Math.min(lite?1:1.5,900/place.width);canvas.width=Math.ceil(place.width*ratio);canvas.height=Math.ceil(place.height*ratio);w=canvas.width;h=canvas.height;draw(0,true);
  }
  image.addEventListener('load',()=>{size='';resize();});
  function update(active,options){
   const nextMotion=options.motion&&!options.reduced,changed=enabled!==active||moving!==nextMotion||lite!==options.lite;
   enabled=active;moving=nextMotion;lite=options.lite;root.hidden=!active;
   if(!active){previous=null;last=-Infinity;size='';return;}
   if(!image.getAttribute('src'))image.src=image.dataset.src;
   if(!ctx){canvas.hidden=true;return;} // The original background is already complete.
   resize();if(changed){previous=null;draw(0,true);}
  }
  return {update,resize,draw,active:()=>enabled&&moving&&!!ctx,resume:()=>{previous=null;last=-Infinity;}};
 }
 function create(snowman,snow,{republic=null,flag=null}={}){
  let active=false;
  snowman.addEventListener('error',()=>{if(snowman.dataset.png&&snowman.getAttribute('src')?.endsWith('.webp'))snowman.src=snowman.dataset.png;});
  const cloth=createFlag(flag);
  function resize(){
   cloth.resize();
   if(republic&&!republic.hidden){
    const letters=republic.querySelector('.republic-lettering'),front=letters?.querySelector('.front b');
    if(front?.scrollWidth&&republic.clientWidth)letters.style.setProperty('--letter-scale',Math.min(1,(republic.clientWidth-12)/front.scrollWidth));
   }
   if(!active)return;
   const area=snowman.parentElement.getBoundingClientRect();
   snow.style.setProperty('--snow-fall',Math.max(200,area.height+32)+'px');
  }
  function update(theme,{motion=true,reduced=false,lite=false}={}){
   active=theme==='new-year';if(republic)republic.hidden=theme!=='republic-day';
   cloth.update(theme==='republic-day',{motion,reduced,lite});snowman.hidden=!active;snow.hidden=!active;
   if(active&&!snowman.getAttribute('src'))snowman.src=snowman.dataset.src;
   const count=active?(lite?18:40):0;
   while(snow.children.length<count){const i=snow.children.length,flake=snow.ownerDocument.createElement('i');flake.className='seasonal-flake';flake.style.cssText='--left:'+((i*37.7+7)%100)+'%;--duration:'+(15+i%7*2)+'s;--delay:-'+(i*3.9)+'s;--size:'+(2+i%4)+'px';snow.append(flake);}
   Array.from(snow.children).forEach((flake,i)=>{flake.hidden=i>=count;});snow.classList.toggle('is-paused',!motion||reduced);resize();
  }
  return {update,resize,dispose(){},draw:cloth.draw,active:cloth.active,resume:cloth.resume};
 }
 return {suggestion,create,clothGeometry,flagPlacement};
});
