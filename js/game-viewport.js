/* Reserve the real site navigation and shortcut dock; never enter fullscreen. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GameViewport=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function budget(height,top,bottom){return Math.max(240,Math.floor(height-Math.max(0,top)-Math.max(0,bottom)-16));}
  function boardSize(width,height,cols,rows,gap=6,inset=24){
    const cell=Math.max(1,Math.floor(Math.min((width-inset-gap*(cols-1))/cols,(height-inset-gap*(rows-1))/rows)));
    return {cell,width:cell*cols+gap*(cols-1)+inset,height:cell*rows+gap*(rows-1)+inset};
  }
  function memoryLayout(width,height,pairs,columns){
    const choices=(pairs>=18?[6,9,12]:[columns]).map(cols=>({cols,rows:Math.ceil(pairs*2/cols),...boardSize(Math.min(width,1040),height,cols,Math.ceil(pairs*2/cols))}));
    return choices.sort((a,b)=>b.cell-a.cell)[0];
  }
  function watch(win,host,after){
    const doc=win.document;let frame=0;
    function visibleRect(el){if(!el||win.getComputedStyle(el).display==='none'||win.getComputedStyle(el).visibility==='hidden')return null;const r=el.getBoundingClientRect();return r.width&&r.height?r:null;}
    function fit(){
      frame=0;const height=Math.min(win.innerHeight,win.visualViewport?.height||win.innerHeight);
      const nav=visibleRect(doc.getElementById('kemalNavMount'));
      const top=Math.max(0,nav?Math.min(nav.height,nav.bottom):0);
      doc.body.style.setProperty('--game-chrome-top',top+'px');
      const dock=visibleRect(doc.getElementById('shortcutDockBar'))||visibleRect(doc.getElementById('shortcutDock'));
      const bottom=dock&&dock.top>height*.45?height-dock.top+6:8;
      host.style.setProperty('--play-height',budget(height,top,bottom)+'px');
      host.style.setProperty('--play-top',top+'px');
      if(after)after();
    }
    function queue(){if(!frame)frame=win.requestAnimationFrame(fit);}
    win.addEventListener('resize',queue);win.addEventListener('load',queue);win.visualViewport?.addEventListener('resize',queue);
    const observer=win.ResizeObserver?new win.ResizeObserver(queue):null;
    [doc.getElementById('kemalNavMount'),doc.getElementById('shortcutDock'),host].filter(Boolean).forEach(el=>observer?.observe(el));
    const mutation=win.MutationObserver?new win.MutationObserver(queue):null;
    mutation?.observe(doc.body,{childList:true,subtree:true});
    queue();return {refresh:queue,fit,stop(){observer?.disconnect();mutation?.disconnect();if(frame)win.cancelAnimationFrame(frame);win.removeEventListener('resize',queue);win.removeEventListener('load',queue);win.visualViewport?.removeEventListener('resize',queue);}};
  }
  return {budget,boardSize,memoryLayout,watch};
});
