(function(root, factory) {
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.MatematikVadisiRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const items = [
    {id:'cape-none',kind:'cape',name:'Pelerinsiz',level:1,color:null},
    {id:'cape-sun',kind:'cape',name:'Güneş pelerini',level:2,color:'#deb451'},
    {id:'cape-river',kind:'cape',name:'Nehir pelerini',level:3,color:'#60b6c7'},
    {id:'cape-star',kind:'cape',name:'Yıldız pelerini',level:5,color:'#a895d2'},
    {id:'hat-none',kind:'hat',name:'Başlıksız',level:1,color:null},
    {id:'hat-leaf',kind:'hat',name:'Kaşif şapkası',level:3,color:'#78995b'},
    {id:'hat-crown',kind:'hat',name:'Vadi tacı',level:6,color:'#e3bd5f'},
  ];
  const level = answered => 1 + Math.floor(Math.max(0,Number(answered)||0)/8);
  const find = id => items.find(item=>item.id===id);
  function canEquip(id, answered) { const item=find(id);return !!item && level(answered)>=item.level; }
  function normalizeHero(value, answered) {
    const result={cape:'cape-none',hat:'hat-none'};
    for(const kind of ['cape','hat']) if(value && find(value[kind])?.kind===kind && canEquip(value[kind],answered)) result[kind]=value[kind];
    return result;
  }
  function activity(question, grade) {
    if(grade===0) return 'choice';
    if(question.variant==='missing') return 'keypad';
    if(question.variant==='story' && question.answer<=20) return 'groups';
    return 'choice';
  }
  function mergeWorlds(remote, local) {
    if(!remote) return JSON.parse(JSON.stringify(local));
    const merged=JSON.parse(JSON.stringify(remote)),incoming=JSON.parse(JSON.stringify(local));
    if(!Array.isArray(merged.players)||!Array.isArray(incoming.players)) throw new Error('Dünya kaydı okunamadı.');
    const ids=new Set(merged.players.map(p=>p.worldId));
    for(const p of incoming.players) {
      const existing=merged.players.find(other=>other.worldId===p.worldId);
      if(existing && JSON.stringify(existing)===JSON.stringify(p)) continue;
      if(ids.has(p.worldId)) {p.worldId='copy-'+Date.now()+'-'+Math.random().toString(36).slice(2);p.name=p.name.slice(0,12)+' · kopya';}
      ids.add(p.worldId);merged.players.push(p);
    }
    if(merged.players.length>100) throw new Error('Bu hesapta çok fazla dünya var.');
    merged.active=merged.players.length-1;merged.version=5;return merged;
  }
  return {items,level,find,canEquip,normalizeHero,activity,mergeWorlds};
});
