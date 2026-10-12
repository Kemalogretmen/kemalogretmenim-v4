/* Device-local rendering preference. Never part of teacher/class cloud data. */
(function () {
  'use strict';
  if(window.SitePerformance) return;
  const key='kemal_render_quality', root=document.documentElement;
  let mode='auto', slow=false;
  try { mode=localStorage.getItem(key)||'auto'; } catch (_) {}
  if(!['auto','lite','full'].includes(mode)) mode='auto';
  const constrained=(navigator.hardwareConcurrency>0 && navigator.hardwareConcurrency<=4) ||
    (navigator.deviceMemory>0 && navigator.deviceMemory<=4) ||
    (window.matchMedia('(pointer:coarse) and (min-width:1000px)').matches);
  function apply() {
    root.classList.toggle('performance-lite',mode==='lite'||(mode==='auto'&&(constrained||slow)));
    window.dispatchEvent(new Event('site-performance-change'));
  }
  window.SitePerformance={mode:()=>mode,lite:()=>root.classList.contains('performance-lite'),
    set(value){if(!['auto','lite','full'].includes(value))return;mode=value;try{localStorage.setItem(key,mode);}catch(_){}apply();},
    reportSlow(){if(slow)return;slow=true;apply();}};
  const css=document.createElement('link');css.rel='stylesheet';css.href='/css/site-performance.css?v=20261012';document.head.append(css);
  apply();
  // One bounded sample while scrolling; never a permanent site-wide RAF loop.
  window.addEventListener('scroll',function sampleScroll(){
    if(mode!=='auto'||root.classList.contains('performance-lite'))return;
    let count=0,late=0,last=0;
    function sample(now){
      if(document.hidden)return;
      const delta=last?now-last:0;last=now;
      if(delta>0){count++;if(delta>28 && delta<200)late++;}
      if(count<90)requestAnimationFrame(sample);
      else if(late>54)window.SitePerformance.reportSlow();
    }
    requestAnimationFrame(sample);
  },{passive:true,once:true});
})();
