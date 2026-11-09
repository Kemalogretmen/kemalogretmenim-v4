(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WordJigsaw=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const SIZE={width:600,height:400};
  function edge(seed,row,col,axis){let n=Math.imul((seed|0)^Math.imul(row+1,73856093)^Math.imul(col+1,19349663),axis==='v'?83492791:2654435761);n^=n>>>13;return n&1?1:-1;}
  function create(cols,rows,seed=1){
    if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2)throw new Error('Geçersiz yapboz boyutu.');
    const w=SIZE.width/cols,h=SIZE.height/rows,depth=Math.min(w,h)*.22;
    return Array.from({length:cols*rows},(_,i)=>{
      const r=Math.floor(i/cols),c=i%cols,x=c*w,y=r*h;
      const edges={top:r?-edge(seed,r,c,'h'):0,right:c<cols-1?edge(seed,r,c+1,'v'):0,bottom:r<rows-1?edge(seed,r+1,c,'h'):0,left:c?-edge(seed,r,c,'v'):0};
      let d='M '+x+' '+y;
      function side(sx,sy,tx,ty,length,sign){
        function pt(u,v){return [sx+tx*length*u+ty*depth*v*sign,sy+ty*length*u-tx*depth*v*sign].map(n=>+n.toFixed(3)).join(' ');}
        if(!sign){d+=' L '+pt(1,0);return;}
        d+=' L '+pt(.43,0)+' C '+pt(.47,0)+' '+pt(.47,.2)+' '+pt(.42,.36)+' C '+pt(.34,.6)+' '+pt(.38,1)+' '+pt(.5,1)+' C '+pt(.62,1)+' '+pt(.66,.6)+' '+pt(.58,.36)+' C '+pt(.53,.2)+' '+pt(.53,0)+' '+pt(.57,0)+' L '+pt(1,0);
      }
      side(x,y,1,0,w,edges.top);side(x+w,y,0,1,h,edges.right);side(x+w,y+h,-1,0,w,edges.bottom);side(x,y+h,0,-1,h,edges.left);d+=' Z';
      const pad=depth+3;
      return {index:i,row:r,col:c,x,y,w,h,d,edges,bounds:{x:x-pad,y:y-pad,width:w+pad*2,height:h+pad*2},center:{x:x+w/2,y:y+h/2}};
    });
  }
  return {create,SIZE};
});
