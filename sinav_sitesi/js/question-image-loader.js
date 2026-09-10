(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.KemalQuestionImages=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function retrySource(src,attempt,now){
    if(!attempt) return src;
    try{
      const url=new URL(src);
      // Only public Storage URLs support this cache refresh; signed URLs stay intact.
      if(url.hostname.endsWith('.supabase.co')&&url.pathname.startsWith('/storage/v1/object/public/')){
        url.searchParams.set('exam_retry',String(now));
        return url.href;
      }
    }catch(error){}
    return src;
  }

  function create(options={}){
    const makeImage=options.makeImage||(()=>new Image());
    const schedule=options.setTimeout||setTimeout;
    const unschedule=options.clearTimeout||clearTimeout;
    const now=options.now||Date.now;
    const timeout=options.timeoutMs??12000;
    const delays=options.retryDelays||[1200,3000];
    const cache=new Map();
    let cancelForeground=null,cancelBackground=null,queue=[],version=0;
    let state={status:'idle',src:'',attempt:0,total:delays.length+1};

    function emit(status,src,attempt){
      state={status,src,attempt,total:delays.length+1};
      options.onState?.({...state});
    }
    function remember(src,image){
      cache.delete(src);
      cache.set(src,image);
      while(cache.size>6) cache.delete(cache.keys().next().value);
    }
    function request(src,attempt,done){
      const image=makeImage();
      let finished=false;
      const clean=()=>{image.onload=null;image.onerror=null;unschedule(timer);};
      const finish=ok=>{
        if(finished) return;
        finished=true;
        clean();
        if(!ok) image.removeAttribute('src');
        done(ok?image:null);
      };
      const timer=schedule(()=>finish(false),timeout);
      image.onload=()=>finish(image.naturalWidth>0);
      image.onerror=()=>finish(false);
      image.decoding='async';
      image.src=retrySource(src,attempt,now());
      return()=>{
        if(finished) return;
        finished=true;
        clean();
        image.removeAttribute('src');
      };
    }
    function drain(){
      if(state.status!=='ready'||cancelBackground) return;
      let src;
      while(queue.length&&!src){
        const candidate=queue.shift();
        if(candidate!==state.src&&!cache.has(candidate)) src=candidate;
      }
      if(!src) return;
      cancelBackground=request(src,0,image=>{
        cancelBackground=null;
        if(image) remember(src,image);
        drain();
      });
    }
    function stop(){
      version+=1;
      cancelForeground?.();
      cancelBackground?.();
      cancelForeground=cancelBackground=null;
      queue=[];
    }
    function show(rawSrc,{force=false}={}){
      stop();
      const src=String(rawSrc||'').trim();
      const current=version;
      if(force) cache.delete(src);
      if(!src){emit('error',src,0);return;}
      const ready=image=>{
        remember(src,image);
        emit('ready',src,state.attempt);
        options.onReady?.(image,src);
        drain();
      };
      if(cache.has(src)){ready(cache.get(src));return;}
      function attempt(index){
        emit('loading',src,index+1);
        cancelForeground=request(src,force?index+1:index,image=>{
          if(current!==version) return;
          cancelForeground=null;
          if(image){ready(image);return;}
          if(index>=delays.length){emit('error',src,index+1);return;}
          const timer=schedule(()=>{if(current===version) attempt(index+1);},delays[index]);
          cancelForeground=()=>unschedule(timer);
        });
      }
      attempt(0);
    }
    return{
      show,
      retry(){show(state.src,{force:true});},
      preload(sources){queue=[...new Set(sources.filter(Boolean))].slice(0,2);drain();},
      getState(){return {...state};},
      destroy(){stop();cache.clear();emit('idle','',0);}
    };
  }
  return {create,retrySource};
});
