/* One continuous sprite surface. Only the wing tips bend; the face and body
 * are drawn together, unchanged. No cutout masks, detached layers or own RAF. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumRay=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const contexts=new WeakMap();
  function plan(width,height,sourceWidth,sourceHeight,phase,moving,boost=0,lite=false){
    if(![width,height,sourceWidth,sourceHeight].every(n=>Number.isFinite(n)&&n>0))return null;
    const fit=Math.min(width/sourceWidth,height/sourceHeight),w=sourceWidth*fit,h=sourceHeight*fit;
    const x=(width-w)/2,y=(height-h)/2,pin=.5;
    const fold=moving?(1+Math.sin((Number.isFinite(phase)?phase:0)*2.4))*.5*(.22+clamp(boost||0,0,1.5)*.035):0;
    const count=lite?24:40;
    // Mapping is monotone (derivative >= .45). Every output strip ends at
    // exactly the next strip's start; the body starts at that same pinned row.
    const map=t=>t+fold*pin*((pin-t)/pin)**2;
    const strips=[];
    for(let i=0;i<count;i++){
      const a=pin*i/count,b=pin*(i+1)/count,q=(pin-(a+b)/2)/pin;
      const sx=1-fold*.10*q*q;
      strips.push({source:[0,a*sourceHeight,sourceWidth,(b-a)*sourceHeight],
        target:[x+(1-sx)*w*.68,y+map(a)*h,w*sx,(map(b)-map(a))*h]});
    }
    return {fold,body:{source:[0,pin*sourceHeight,sourceWidth,(1-pin)*sourceHeight],
      target:[x,y+pin*h,w,(1-pin)*h]},strips};
  }
  function render(canvas,image,phase,{moving=false,boost=0,lite=false,width=120,dpr=1}={}){
    if(!image?.complete || !(image.naturalWidth>0&&image.naturalHeight>0))return false;
    let ctx=contexts.get(canvas);
    if(ctx===undefined){try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){ctx=null;}contexts.set(canvas,ctx);}
    if(!ctx)return false;
    const pixels=Math.round(clamp(width*clamp(dpr||1,1,lite?1:2),64,lite?256:640)),height=Math.round(pixels/1.5);
    if(canvas.width!==pixels||canvas.height!==height){canvas.width=pixels;canvas.height=height;}
    const p=plan(pixels,height,image.naturalWidth,image.naturalHeight,phase,moving,boost,lite);
    try{
      ctx.clearRect(0,0,pixels,height);ctx.imageSmoothingEnabled=true;
      // A single source/destination rectangle keeps the head, abdomen and tail
      // intact even at maximum reward amplitude and on a low-end device.
      const body=p.body;ctx.drawImage(image,...body.source,...body.target);
      if(!moving){ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight/2,
        body.target[0],body.target[1]-body.target[3],body.target[2],body.target[3]);}
      else for(const strip of p.strips)ctx.drawImage(image,...strip.source,...strip.target);
      return true;
    }catch(_){return false;}
  }
  return {plan,render};
});
