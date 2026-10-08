/* Account-scoped persistence with optimistic revisions. Never silently overwrite another device. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'));
  else root.AquariumCloud=factory(root.AquariumCore);
})(typeof window==='object'?window:this,function(C){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const meaningful=s=>s&&s.classes.some(c=>c.students.length||c.teacher?.enabled||c.name!=='Sınıfım');
  function create({client,storage,key,project,ownerId,onStatus=()=>{}}){
    let revision=0,ready=false,conflict=false,queue=Promise.resolve(),mutation=0,pending=0;
    const metaKey=key+'_cloud';
    function meta(){try{return JSON.parse(storage.getItem(metaKey)||'{}');}catch(e){return {};}}
    function remember(values){storage.setItem(metaKey,JSON.stringify({...meta(),...values}));}
    function backup(state){storage.setItem(key+'_recovery',JSON.stringify(state));}
    async function read(){const {data,error}=await client.from('aquarium_accounts').select('document,revision').maybeSingle();if(error)throw Error('Hesap kaydına erişilemiyor. İnternet bağlantısı veya bulut kurulumu kontrol edilmeli.');return data;}
    function markDirty(){mutation++;remember({dirty:true});}
    async function write(state,epoch=mutation){
      if(!ready||conflict)throw Error(conflict?'Diğer cihazda değişiklik var. Ayarlardan korunacak kaydı seçin.':'Bulut bağlantısı kurulamadı. Yerel kayıt korunuyor.');
      const doc=C.validate(copy(state));
      const {data,error}=await client.rpc('save_aquarium_account',{p_document:doc,p_revision:revision,...(ownerId?{p_owner:ownerId}:{}),p_snapshots:doc.classes.map(c=>({local_id:c.id,snapshot:project(c,doc.settings)}))});
      if(error){if(error.code==='40001'){conflict=true;backup(state);}throw Error(error.code==='40001'?'Diğer cihazda değişiklik var. Yerel kopyanız korundu; Ayarlar → Kayıt ve eşitleme bölümünü açın.':'Buluta kaydedilemedi. Yerel kayıt korundu; bağlantı gelince yeniden denenecek.');}
      revision=Number(data);remember({revision,dirty:epoch!==mutation});onStatus(epoch!==mutation?'Yeni değişiklikler eşitleniyor…':'Hesabınıza kaydedildi · Diğer cihazlarda kullanılabilir.');return doc;
    }
    async function boot(local){
      const row=await read(),m=meta();
      let remote;try{remote=row?C.validate(row.document):null;}catch(e){conflict=true;throw Error('Hesap kaydı okunamadı. Yerel kayıt üzerine yazılmadı.');}
      ready=true;conflict=false;revision=row?.revision||0;
      if(!row){remember({revision:0,dirty:true});await write(local);return local;}
      if(m.dirty&&m.revision!==revision){conflict=true;backup(local);onStatus('İki cihazda farklı kayıt var. Yerel kopya korundu; Ayarlardan seçim yapın.');return local;}
      if(m.dirty){await write(local);return local;}
      if(!Number.isInteger(m.revision)&&meaningful(local)){
        const different=local.classes.some(c=>remote.classes.some(r=>r.id===c.id&&JSON.stringify(r)!==JSON.stringify(c)));
        if(different){conflict=true;backup(local);onStatus('Yerel ve hesap kayıtları farklı. Ayarlardan seçim yapın.');return local;}
        const extras=local.classes.filter(c=>!remote.classes.some(r=>r.id===c.id));
        if(extras.length){backup(local);remote.classes.push(...extras);if(remote.classes.length>30)throw Error('Sınıf sınırı aşıldı. Yerel kayıt korundu.');await write(remote);return remote;}
      }
      if(meaningful(local)&&JSON.stringify(local)!==JSON.stringify(remote))backup(local);
      remember({revision,dirty:false});onStatus('Hesap kaydı alındı · Cihazlar arasında eşitleniyor.');return remote;
    }
    function save(state){const captured=copy(state),epoch=mutation;pending++;queue=queue.catch(()=>{}).then(()=>write(captured,epoch)).finally(()=>pending--);return queue;}
    async function refresh(local){
      if(pending)return null;const epoch=mutation;
      if(!ready)return boot(local);
      if(meta().dirty&&!conflict){await save(local);return null;}
      if(conflict)return null;
      const row=await read();
      if(epoch!==mutation)return null;
      if(!row||row.revision===revision)return null;
      const remote=C.validate(row.document);backup(local);revision=row.revision;remember({revision,dirty:false});return remote;
    }
    async function resolve(choice,local){
      await queue.catch(()=>{});
      const row=await read();backup(local);if(row)storage.setItem(key+'_cloud_recovery',JSON.stringify(row.document));revision=row?.revision||0;ready=true;conflict=false;
      if(choice==='local'){await save(local);return local;}
      if(!row)throw Error('Hesapta kayıt bulunamadı.');
      remember({revision,dirty:false});return C.validate(row.document);
    }
    return {boot,save,refresh,resolve,markDirty,isConflict:()=>conflict,isReady:()=>ready};
  }
  return {create};
});
