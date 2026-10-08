/* Shared catalogue and bounded, backwards-compatible mixer preferences. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumSounds=factory();})(typeof window==='object'?window:this,function(){
  'use strict';
  const catalogue=[
    {id:'peace',name:'Huzurlu piyano',title:'Meditation Impromptu 01',kind:'music',emoji:'🎹',file:'peace.mp3'},
    {id:'focus',name:'Odaklanma',title:'Clean Soul',kind:'music',emoji:'📖',file:'focus.mp3'},
    {id:'wisps',name:'Yumuşak ezgiler',title:'Wisps of Whorls',kind:'music',emoji:'✨',file:'wisps.mp3'},
    {id:'dream',name:'Düş bahçesi',title:'Dream Culture',kind:'music',emoji:'🌙',file:'dream.mp3'},
    {id:'fluid',name:'Sakin akış',title:'Fluidscape',kind:'music',emoji:'🫧',file:'fluid.mp3'},
    {id:'lively',name:'Hareketli etkinlik',title:'Life of Riley',kind:'music',emoji:'🌤️',file:'lively.mp3'},
    {id:'fun',name:'Oyun zamanı',title:'Monkeys Spinning Monkeys',kind:'music',emoji:'🎈',file:'fun.mp3'},
    {id:'ocean',name:'Dingin kıyı',title:'Yumuşak dalgalar',kind:'nature',emoji:'🌊',file:'ocean-calm.mp3'},
    {id:'rain',name:'Hafif yağmur',title:'Yağmur',kind:'nature',emoji:'🌧️',file:'rain.mp3'},
    {id:'birds',name:'Bahçedeki kuşlar',title:'Kuş sesleri',kind:'nature',emoji:'🐦',file:'birds.mp3'},
    {id:'stream',name:'Nehir kıyısı',title:'Hafif su sesi',kind:'nature',emoji:'💧',file:'stream.mp3'}
  ];
  const has=id=>catalogue.some(t=>t.id===id);
  const level=(v,fallback=.3)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
  function normalizeMix(raw){const seen=new Set();return (Array.isArray(raw)?raw:[]).filter(x=>x&&has(x.id)&&!seen.has(x.id)&&seen.add(x.id)).slice(0,catalogue.length).map(x=>({id:x.id,volume:level(x.volume)}));}
  function favorites(raw){const seen=new Set();return (Array.isArray(raw)?raw:[]).filter(x=>x&&typeof x.id==='string'&&/^[\w-]{1,90}$/.test(x.id)&&!['__proto__','constructor','prototype'].includes(x.id)&&!seen.has(x.id)&&seen.add(x.id)&&typeof x.name==='string'&&x.name.trim()).slice(0,24).map(x=>({id:x.id,name:x.name.trim().slice(0,60),volume:level(x.volume),mix:normalizeMix(x.mix)}));}
  return {catalogue,has,level,normalizeMix,favorites};
});
