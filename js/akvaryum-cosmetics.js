/* Small, allowlisted cosmetic IDs only. No uploaded images or executable styles. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AquariumCosmetics=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const PROFILES={
    clown:{x:.83,y:.33,tilt:-9,eye:[.89,.45,.04,.065],body:[.57,.51,.28,.31]},
    tang:{x:.83,y:.25,tilt:-8,eye:[.875,.40,.04,.06],body:[.56,.49,.29,.32]},
    yellowtang:{x:.79,y:.32,tilt:-12,eye:[.815,.43,.045,.07],body:[.54,.49,.30,.34]},
    betta:{x:.83,y:.37,tilt:-7,eye:[.87,.45,.045,.065],body:[.67,.47,.18,.17]},
    goldfish:{x:.81,y:.35,tilt:-10,eye:[.834,.515,.045,.07],body:[.62,.51,.22,.29]},
    guppy:{x:.85,y:.41,tilt:-6,eye:[.88,.45,.045,.065],body:[.66,.48,.22,.15]}
  };
  const ACCESSORIES=[
    {id:'none',name:'Aksesuarsız',collection:'basic'},
    {id:'sailor',name:'Minik denizci',collection:'basic'},
    {id:'flower',name:'Mercan çiçeği',collection:'basic'},
    {id:'leaf',name:'Deniz yaprağı',collection:'basic'},
    {id:'shell',name:'İnci toka',collection:'basic'},
    {id:'star',name:'Deniz yıldızı',collection:'together'},
    {id:'ribbon',name:'Deniz mavisi fiyonk',collection:'together'}
  ];
  const PALETTES=[
    {id:'original',name:'Özgün renk',swatch:'#b6d5cf'},
    {id:'warm',name:'Gün ışığı',swatch:'#dfad83'},
    {id:'cool',name:'Lagün',swatch:'#7eafbd'},
    {id:'pearl',name:'Sedef',swatch:'#b6b9cc'}
  ];
  const SHAPES={
    sailor:'<path d="M19 45Q10 25 27 18Q50 5 73 18Q90 25 81 45Z" fill="url(#cloth)" stroke="#87999a" stroke-width="2"/><path d="M18 40Q50 49 82 40L80 54Q50 61 20 54Z" fill="#284b60"/><path d="M25 45Q50 51 75 45" fill="none" stroke="#9ebfc1" stroke-width="2"/><path d="M50 17V35M45 22H55M42 29Q50 40 58 29" fill="none" stroke="#496376" stroke-width="2.5" stroke-linecap="round"/>',
    flower:'<path d="M48 53Q42 43 28 45Q27 61 48 62" fill="#729a7c"/><g fill="url(#petal)" stroke="#b1878e" stroke-width="1.2"><ellipse cx="50" cy="23" rx="11" ry="16"/><ellipse cx="33" cy="35" rx="16" ry="11" transform="rotate(25 33 35)"/><ellipse cx="39" cy="52" rx="11" ry="16" transform="rotate(30 39 52)"/><ellipse cx="61" cy="52" rx="11" ry="16" transform="rotate(-30 61 52)"/><ellipse cx="67" cy="35" rx="16" ry="11" transform="rotate(-25 67 35)"/></g><circle cx="50" cy="38" r="10" fill="#d9ba70"/><circle cx="47" cy="35" r="3" fill="#efdeb0"/>',
    leaf:'<path d="M28 58Q13 20 72 12Q85 47 28 58Z" fill="url(#green)" stroke="#527766" stroke-width="2"/><path d="M27 60L66 20M36 48L34 32M45 39L62 38" fill="none" stroke="#c0c9a0" stroke-width="2" stroke-linecap="round"/>',
    shell:'<path d="M23 46Q6 21 28 15Q39 1 50 13Q65 1 74 17Q97 25 77 47L57 62H43Z" fill="url(#shell)" stroke="#aa967b" stroke-width="2"/><path d="M27 22L46 53M50 17V54M73 23L54 53M38 19L48 53M62 19L52 53" stroke="#bba98b" stroke-width="1.5" fill="none"/><ellipse cx="50" cy="55" rx="11" ry="8" fill="url(#cloth)"/>',
    star:'<path d="M50 7L61 29L87 31L68 48L72 72L50 60L28 72L32 48L13 31L39 29Z" fill="url(#sand)" stroke="#b99469" stroke-width="2.2" stroke-linejoin="round"/><g fill="#ecd7ae"><circle cx="50" cy="38" r="4"/><circle cx="49" cy="24" r="2"/><circle cx="34" cy="36" r="2"/><circle cx="65" cy="36" r="2"/><circle cx="39" cy="54" r="2"/><circle cx="61" cy="54" r="2"/></g>',
    ribbon:'<path d="M45 35Q18 5 13 24L18 56Q25 68 45 46M55 35Q82 5 87 24L82 56Q75 68 55 46" fill="url(#blue)" stroke="#547784" stroke-width="2"/><path d="M43 45L32 69L45 64L50 49L57 67L68 70L57 44" fill="#7198a3"/><path d="M43 30Q50 26 57 30L58 48Q50 53 42 48Z" fill="#adc5c7" stroke="#6e929c" stroke-width="2"/>'
  };
  function svg(id){
    if(!Object.hasOwn(SHAPES,id))return '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" aria-hidden="true"><defs><linearGradient id="cloth" x2=".6" y2="1"><stop stop-color="#fffdf2"/><stop offset="1" stop-color="#b9cac9"/></linearGradient><radialGradient id="petal"><stop stop-color="#edc5c6"/><stop offset="1" stop-color="#c88f9e"/></radialGradient><linearGradient id="green" x2="1" y2="1"><stop stop-color="#adc09b"/><stop offset="1" stop-color="#5f927b"/></linearGradient><linearGradient id="shell" x2=".6" y2="1"><stop stop-color="#f4e8cc"/><stop offset="1" stop-color="#c5a98c"/></linearGradient><linearGradient id="sand" x2=".5" y2="1"><stop stop-color="#efd6a0"/><stop offset="1" stop-color="#c9a477"/></linearGradient><linearGradient id="blue" x2=".7" y2="1"><stop stop-color="#b5d3d6"/><stop offset="1" stop-color="#658b9c"/></linearGradient></defs>'+SHAPES[id]+'</svg>';
  }
  // Resource URLs are generated solely from the static catalog, never from saved input.
  const urls=new Map();
  function accessoryURL(id){if(!Object.hasOwn(SHAPES,id))return '';if(!urls.has(id))urls.set(id,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(id)));return urls.get(id);}
  function normalize(raw,species){
    if(!Object.hasOwn(PROFILES,species))return {accessory:'none',palette:'original'};
    return {accessory:ACCESSORIES.some(x=>x.id===raw?.accessory)?raw.accessory:'none',palette:PALETTES.some(x=>x.id===raw?.palette)?raw.palette:'original'};
  }
  function config(raw){return {enabled:raw?.enabled===true,collectionUnlocked:raw?.collectionUnlocked===true};}
  function available(id,unlocked){const item=ACCESSORIES.find(x=>x.id===id);return !!item&&(item.collection==='basic'||unlocked===true);}
  function effective(raw,species,configuration){const cfg=config(configuration),style=normalize(raw,species);return cfg.enabled?{...style,accessory:available(style.accessory,cfg.collectionUnlocked)?style.accessory:'none'}:{accessory:'none',palette:'original'};}
  function styled(style){return style?.accessory!=='none'&&!!style?.accessory||style?.palette!=='original'&&!!style?.palette;}
  // A soft body-only tint preserves alpha, dark eyes/lines, white markings and texture.
  // The source and dimensions are unchanged, so articulated pieces still meet exactly.
  function tintPixels(pixels,width,height,species,palette){
    if(!Object.hasOwn(PROFILES,species)||!PALETTES.some(p=>p.id===palette))return pixels;
    const p=PROFILES[species],color={warm:[220,164,110],cool:[91,160,178],pearl:[180,174,200]}[palette];
    if(!p||!color)return pixels;
    const [cx,cy,rx,ry]=p.body,[ex,ey,erx,ery]=p.eye;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,alpha=pixels[i+3];if(!alpha)continue;
      const d=((x/width-cx)/rx)**2+((y/height-cy)/ry)**2;if(d>=1||((x/width-ex)/erx)**2+((y/height-ey)/ery)**2<1)continue;
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2],light=(r+g+b)/3;
      if(light<32||light>224||Math.max(r,g,b)-Math.min(r,g,b)<24)continue;
      const amount=.28*(1-d)**.7*Math.min(1,(light-32)/45,(224-light)/40),targetLight=(color[0]+color[1]+color[2])/3;
      for(let c=0;c<3;c++)pixels[i+c]=Math.round(Math.max(0,Math.min(255,pixels[i+c]+(color[c]-targetLight)*amount)));
    }
    return pixels;
  }
  // At most 6 species × 3 tints, generated once and shared by every pupil.
  function createPainter(doc){
    const cache=new Map();
    function source(src,species,palette,notify){
      if(palette==='original'||!PROFILES[species])return src;
      const key=src+'|'+species+'|'+palette;let entry=cache.get(key);
      if(entry){if(entry.waiting&&notify)entry.waiting.add(notify);return entry.url;}
      entry={url:src,waiting:new Set(notify?[notify]:[])};cache.set(key,entry);
      const img=doc.createElement('img');img.onload=()=>{
        try{
          const canvas=doc.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('No canvas');
          ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height);
          tintPixels(data.data,canvas.width,canvas.height,species,palette);ctx.putImageData(data,0,0);entry.url=canvas.toDataURL('image/png');
        }catch(_){}const waiting=entry.waiting;entry.waiting=null;waiting.forEach(fn=>fn());
      };let retried=false;img.onerror=()=>{if(!retried&&src.includes('/web-v1/')&&src.endsWith('.webp')){retried=true;img.src=src.replace('/web-v1/','/').replace(/\.webp$/,'.png');}else{entry.waiting=null;}};img.src=src;return src;
    }
    return {source};
  }
  return {PROFILES,ACCESSORIES,PALETTES,normalize,config,available,effective,styled,svg,accessoryURL,tintPixels,createPainter};
});
