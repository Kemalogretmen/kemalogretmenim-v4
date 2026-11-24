(function(root){
  'use strict';
  function geometry(pages,zoom,mode){
    var gap=20,columns=mode==='facing'?2:1,rows=[],width=0,top=0,rects=[];
    for(var i=0;i<pages.length;i+=columns){var group=pages.slice(i,i+columns),w=group.reduce(function(s,p){return s+p.pdf.width*zoom;},0)+gap*(group.length-1),h=Math.max.apply(null,group.map(function(p){return p.pdf.height*zoom;}));rows.push({index:i,pages:group,width:w,height:h});width=Math.max(width,w);}
    rows.forEach(function(row){var left=(width-row.width)/2;row.pages.forEach(function(p,j){rects.push({index:row.index+j,left:left,top:top,width:p.pdf.width*zoom,height:p.pdf.height*zoom});left+=p.pdf.width*zoom+gap;});top+=row.height+gap;});
    return {width:width,height:Math.max(0,top-gap),rects:rects};
  }
  function create(o){
    var stage=o.stage,plane=o.plane,viewport=document.createElement('div');viewport.className='pdf-pages-viewport';viewport.hidden=true;stage.appendChild(viewport);
    var cells=[],pages=[],doc=null,index=0,zoom=1,mode='single',epoch=0,task=null,working=false,queued=false,retained=new Set(),idle=null;
    function release(c){c.version++;c.ready=false;c.notesReady=false;c.bg.width=c.bg.height=c.notes.width=c.notes.height=1;c.bg.hidden=c.notes.hidden=true;}
    function cancel(){epoch++;if(task)task.cancel();task=null;cells.forEach(release);}
    function clear(){cancel();retained=new Set();if(plane.parentNode!==stage)stage.insertBefore(plane,viewport);cells.forEach(function(c){c.el.remove();});cells=[];pages=[];doc=null;viewport.hidden=true;stage.removeAttribute('data-pdf-layout');}
    function revision(p){return p.undoStack&&p.undoStack[p.undoIndex]||p.items;}
    function noteSnapshot(c){if(!c||!o.paintNotes)return;o.paintNotes(c.page,c.notes,300000);c.notes.hidden=c.index===index;c.notesReady=true;c.revision=revision(c.page);}
    function leave(){if(mode!=='single'&&cells[index])noteSnapshot(cells[index]);}
    function snapshot(page,source){var c=cells.find(function(c){return c.page===page;});if(!c||!source||!source.width||mode==='single')return;var ratio=Math.min(1,Math.sqrt(300000/(source.width*source.height)));c.bg.width=Math.max(1,Math.floor(source.width*ratio));c.bg.height=Math.max(1,Math.floor(source.height*ratio));c.bg.getContext('2d').drawImage(source,0,0,c.bg.width,c.bg.height);c.ready=true;c.bg.hidden=false;schedule();}
    function background(page){var c=cells.find(function(c){return c.page===page;});return c&&c.ready?c.bg:null;}
    function set(nextPages,nextIndex,nextZoom,nextMode,nextDoc){
      nextMode=['facing','continuous'].indexOf(nextMode)>=0?nextMode:'single';
      if(nextMode==='single'){if(mode!=='single')clear();mode='single';return;}
      if(doc!==nextDoc){clear();doc=nextDoc;}
      mode=nextMode;index=nextIndex;zoom=nextZoom;
      var same=pages.length===nextPages.length&&pages.every(function(p,i){return p===nextPages[i];});
      if(!same){leave();if(plane.parentNode!==stage)stage.insertBefore(plane,viewport);cells.forEach(function(c){c.el.remove();});cancel();pages=nextPages.slice();cells=pages.map(function(p,i){
        var el=document.createElement('section');el.className='pdf-view-page';el.dataset.pdfPage=i;el.setAttribute('aria-label','PDF sayfası '+(i+1));
        var bg=document.createElement('canvas'),notes=document.createElement('canvas');bg.className='pdf-view-background';notes.className='pdf-view-notes';bg.width=bg.height=notes.width=notes.height=1;bg.hidden=notes.hidden=true;
        var label=document.createElement('button');label.type='button';label.className='pdf-page-label';label.textContent=i+1;label.setAttribute('aria-label',(i+1)+'. sayfayı etkinleştir');label.addEventListener('click',function(){o.activate(i,true);});
        el.append(bg,notes,label);viewport.appendChild(el);return{page:p,index:i,el:el,bg:bg,notes:notes,version:0,ready:false,notesReady:false};
      });}
      viewport.hidden=false;stage.dataset.pdfLayout=mode;var g=geometry(pages,zoom,mode);viewport.style.width=g.width+'px';viewport.style.height=g.height+'px';
      g.rects.forEach(function(r,i){var c=cells[i];c.rect=r;c.el.style.left=r.left+'px';c.el.style.top=r.top+'px';c.el.style.width=r.width+'px';c.el.style.height=r.height+'px';c.el.classList.toggle('is-active',i===index);c.notes.hidden=i===index||!c.notesReady;});
      if(cells[index]&&plane.parentNode!==cells[index].el)cells[index].el.appendChild(plane);
      stage.style.justifyContent=g.width<=stage.clientWidth?'center':'flex-start';schedule();
    }
    function scrollTo(i){var c=cells[i];if(!c)return;stage.scrollTop=Math.max(0,viewport.offsetTop+c.rect.top-(Number(stage.dataset.pdfTop)||104));stage.scrollLeft=Math.max(0,c.rect.left+c.rect.width/2-stage.clientWidth/2);schedule();}
    function measure(){queued=false;if(mode==='single'||viewport.hidden)return;
      var r=viewport.getBoundingClientRect(),s=stage.getBoundingClientRect(),top=Math.max(s.top,0)-r.top,bottom=Math.min(s.bottom,innerHeight)-r.top,left=Math.max(s.left,0)-r.left,right=Math.min(s.right,innerWidth)-r.left;
      var wanted=cells.filter(function(c){var p=c.rect;return p.top+p.height>top-150&&p.top<bottom+150&&p.left+p.width>left-80&&p.left<right+80;});
      wanted.sort(function(a,b){return Math.abs(a.rect.top+a.rect.height/2-(top+bottom)/2)-Math.abs(b.rect.top+b.rect.height/2-(top+bottom)/2);});wanted=wanted.slice(0,5);if(cells[index]&&wanted.indexOf(cells[index])<0)wanted.push(cells[index]);retained=new Set(wanted);
      cells.forEach(function(c){if(!retained.has(c)&&(c.ready||c.loading||c.notesReady)){release(c);if(c.loading&&task)task.cancel();}});
      work();
    }
    function schedule(){if(!queued){queued=true;requestAnimationFrame(measure);}}
    async function work(){if(working)return;working=true;
      try{for(;;){var c=Array.from(retained).find(function(c){return c.index!==index&&!c.loading&&(!c.ready||!c.notesReady||c.revision!==revision(c.page));});if(!c||!doc)break;
        var token=epoch,version=c.version,current=doc,proxy;c.loading=true;
        try{
          if(!c.ready){
            var scale=Math.min(1,Math.sqrt(300000/(c.page.pdf.width*c.page.pdf.height))),w=Math.max(1,Math.floor(c.page.pdf.width*scale)),h=Math.max(1,Math.floor(c.page.pdf.height*scale));
            c.bg.width=w;c.bg.height=h;var ctx=c.bg.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
            if(c.page.pdf.page!==null){proxy=await current.getPage(c.page.pdf.page);if(token!==epoch||version!==c.version)continue;var base=proxy.getViewport({scale:1});task=proxy.render({canvasContext:ctx,viewport:proxy.getViewport({scale:w/base.width}),background:'#fff'});await task.promise;}
            if(token!==epoch||version!==c.version)continue;c.ready=true;c.bg.hidden=false;
          }
          if(!c.notesReady||c.revision!==revision(c.page)){var image=await o.notes(c.page,300000);if(token!==epoch||version!==c.version){image.width=image.height=1;continue;}c.notes.width=image.width;c.notes.height=image.height;c.notes.getContext('2d').drawImage(image,0,0);image.width=image.height=1;c.notesReady=true;c.revision=revision(c.page);c.notes.hidden=c.index===index;}
        }catch(error){if(token===epoch&&version===c.version&&error.name!=='RenderingCancelledException'){c.ready=c.notesReady=true;c.revision=revision(c.page);c.el.classList.add('has-render-error');}}
        finally{if(proxy)proxy.cleanup();c.loading=false;task=null;}
      }}finally{working=false;}
    }
    stage.addEventListener('scroll',function(){schedule();clearTimeout(idle);idle=setTimeout(function(){if(mode!=='continuous'||o.drawing()||!o.canFollow())return;var r=viewport.getBoundingClientRect(),s=stage.getBoundingClientRect(),middle=(Math.max(0,s.top)+Math.min(innerHeight,s.bottom))/2-r.top;var closest=cells.reduce(function(best,c){return !best||Math.abs(c.rect.top+c.rect.height/2-middle)<Math.abs(best.rect.top+best.rect.height/2-middle)?c:best;},null);if(closest&&closest.index!==index)o.activate(closest.index,false);},160);},{passive:true});
    root.addEventListener('resize',schedule);root.addEventListener('scroll',schedule,{passive:true});
    function anchor(center){if(mode==='single')return null;var r=viewport.getBoundingClientRect(),x=center.clientX-r.left,y=center.clientY-r.top,c=cells.find(function(c){var p=c.rect;return x>=p.left&&x<=p.left+p.width&&y>=p.top&&y<=p.top+p.height;})||cells[index];if(!c)return null;return{index:c.index,x:(x-c.rect.left)/zoom,y:(y-c.rect.top)/zoom,clientX:center.clientX,clientY:center.clientY};}
    function restore(a){var c=cells[a.index];if(!c)return;var r=viewport.getBoundingClientRect();stage.scrollLeft+=r.left+c.rect.left+a.x*zoom-a.clientX;stage.scrollTop+=r.top+c.rect.top+a.y*zoom-a.clientY;}
    return{set:set,clear:clear,cancel:cancel,leave:leave,snapshot:snapshot,background:background,scrollTo:scrollTo,schedule:schedule,anchor:anchor,restore:restore,mode:function(){return mode;}};
  }
  root.SmartboardPDFViews={create:create,geometry:geometry};if(typeof module!=='undefined'&&module.exports)module.exports=root.SmartboardPDFViews;
})(typeof window!=='undefined'?window:globalThis);
