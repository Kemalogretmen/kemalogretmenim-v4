(function(root) {
  'use strict';
  function text(value,mode) {
    value=String(value||'A').trim().slice(0,12)||'A';
    var upper=value.toLocaleUpperCase('tr-TR'),lower=value.toLocaleLowerCase('tr-TR');
    return mode==='lower'?lower:mode==='pair'?upper+(value.length===1?'':' ')+lower:upper;
  }
  function layout(width,height,spacing,value,metrics) {
    var margin=width<500?18:Math.min(64,width*.06),available=Math.max(40,width-2*margin);
    var cap=Math.min(Math.max(96,spacing*4),height*.32),size=cap/Math.max(.1,metrics.cap/100);
    if(metrics.width*size/100>available*.86){size=available*.86/Math.max(1,metrics.width)*100;cap=size*metrics.cap/100;}
    var top=height/2-cap*.7,baseline=top+cap;
    return {left:margin,right:width-margin,top:top,middle:baseline-size*metrics.x/100,baseline:baseline,
      bottom:baseline+Math.max(cap*.45,size*metrics.descent/100),fontSize:size,text:value,cx:width/2};
  }
  function path(g,style) {
    var rows=style==='handwriting'?[g.top,g.middle,g.baseline]:style==='ruled'?[g.baseline]:[];
    var result=rows.map(function(y){return 'M'+g.left+' '+y+'H'+g.right;}).join(' ');
    if(style==='grid') {
      var step=Math.max(24,(g.baseline-g.top)/2);
      for(var y=g.top;y<=g.bottom;y+=step)result+=' M'+g.left+' '+y+'H'+g.right;
      for(var x=g.left;x<=g.right;x+=step)result+=' M'+x+' '+g.top+'V'+g.bottom;
    }
    return result;
  }
  function paint(ctx,g,style,color,visible,font) {
    ctx.save();
    if(style==='handwriting'){ctx.fillStyle='rgba(255,248,166,.26)';ctx.fillRect(g.left,g.middle,g.right-g.left,g.baseline-g.middle);}
    ctx.strokeStyle=color;ctx.lineWidth=1.2;
    if(style!=='none')ctx.stroke(new Path2D(path(g,style)));
    if(visible){ctx.fillStyle=color;ctx.globalAlpha=.6;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='400 '+g.fontSize+'px '+font;ctx.fillText(g.text,g.cx,g.baseline);}
    ctx.restore();
  }
  root.SmartSandGuide={text:text,layout:layout,path:path,paint:paint};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.SmartSandGuide;
})(typeof window!=='undefined'?window:globalThis);
