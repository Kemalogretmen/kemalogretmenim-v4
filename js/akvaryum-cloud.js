/* Account persistence: bounded requests, optimistic revisions and safe reconciliation. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'),require('./akvaryum-sync-merge.js'));
  else root.AquariumCloud=factory(root.AquariumCore,root.AquariumSyncMerge);
})(typeof window==='object'?window:this,function(C,Reconcile){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const meaningful=s=>s&&s.classes.some(c=>c.students.length||c.teacher?.enabled||c.name!=='Sınıfım');
  function create({client,storage,key,project,ownerId,getState,onStatus=()=>{},timeoutMs=12000}){
    let revision=0,ready=false,conflict=false,queue=Promise.resolve(),mutation=0,pending=0,base=null,latest=null;
    const metaKey=key+'_cloud',baseKey=key+'_cloud_base';
    function meta(){try{return JSON.parse(storage.getItem(metaKey)||'{}');}catch(e){return {};}}
    function remember(values){storage.setItem(metaKey,JSON.stringify({...meta(),...values}));}
    function backup(state,remote){storage.setItem(key+'_recovery',JSON.stringify(state));if(remote)storage.setItem(key+'_cloud_recovery',JSON.stringify(remote));}
    function checkpoint(doc,rev,dirty){
      storage.setItem(baseKey,JSON.stringify({revision:rev,document:doc}));
      base=copy(doc);revision=rev;remember({revision:rev,dirty,conflict:false});
    }
    function restoreBase(){try{const b=JSON.parse(storage.getItem(baseKey)||'null'),m=meta();if(b&&b.revision===m.revision){base=C.validate(b.document);revision=b.revision;}}catch(e){base=null;}}
    restoreBase();
    async function request(query){
      const controller=new AbortController();let timer;
      try{return await Promise.race([query.abortSignal?query.abortSignal(controller.signal):query,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Bağlantı zaman aşımına uğradı. Puanlar bu cihazda korunuyor; yeniden denenecek.'));},timeoutMs);})]);}
      finally{clearTimeout(timer);}
    }
    async function read(revisionOnly=false){
      let query=client.from('aquarium_accounts').select(revisionOnly?'revision':'document,revision');if(ownerId)query=query.eq('owner_id',ownerId);
      const {data,error}=await request(query.maybeSingle());
      if(error)throw Error('Hesap kaydına erişilemiyor. Puanlar bu cihazda korunuyor; bağlantı yeniden denenecek.');
      if(data&&(!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<1))throw Error('Hesap kayıt sürümü okunamadı. Yerel kayıt korunuyor.');
      return data;
    }
    function markDirty(state){mutation++;if(state)latest=copy(state);remember({dirty:true});}
    function failConflict(local,remote){
      conflict=true;backup(local,remote);remember({dirty:true,conflict:true});
      const message='Eşitleme durdu: Diğer cihazla çakışan kayıt var. Bu cihazın puanları korundu; Ayarlar → Kayıt ve eşitleme bölümünü açın.';
      onStatus(message);return Error(message);
    }
    async function write(state,epoch=mutation,workRevision=revision,workBase=base){
      if(!ready)throw Error('Bulut bağlantısı kurulamadı. Yerel kayıt korunuyor.');
      const captured=C.validate(copy(state));let doc=copy(captured),rev=workRevision,anchor=workBase;
      for(let attempt=0;attempt<3;attempt++){
        const {data,error}=await request(client.rpc('save_aquarium_account',{p_document:doc,p_revision:rev,...(ownerId?{p_owner:ownerId}:{}),p_snapshots:doc.classes.map(c=>({local_id:c.id,snapshot:project(c,doc.settings)}))}));
        if(error?.code==='40001'){
          const row=await read();if(!row)throw failConflict(captured,null);
          const remote=C.validate(row.document);
          try{if(equal(doc,remote))doc=remote;else if(anchor)doc=Reconcile.merge(anchor,doc,remote);else throw Error('No common revision');}
          catch(e){throw failConflict(getState?.()||latest||captured,remote);}
          anchor=remote;rev=Number(row.revision);continue;
        }
        if(error)throw Error('Buluta kaydedilemedi. Puanlar bu cihazda korundu; bağlantı gelince yeniden denenecek.');
        const next=Number(data);if(!Number.isSafeInteger(next)||next<=rev)throw Error('Sunucu kaydı doğrulanamadı. Yerel puanlar korunuyor.');
        let applied=doc;
        if(epoch!==mutation){try{applied=Reconcile.merge(captured,getState?.()||latest||captured,doc);}catch(e){checkpoint(doc,next,true);throw failConflict(getState?.()||latest||captured,doc);}}
        checkpoint(doc,next,epoch!==mutation);conflict=false;
        onStatus(epoch!==mutation?'Yeni puanlar eşitleniyor…':'Hesabınıza kaydedildi · Diğer cihazlarda kullanılabilir.');
        return applied;
      }
      throw Error('Diğer cihazlar da puan kaydediyor. Yerel puanlar korunuyor; kısa süre sonra yeniden denenecek.');
    }
    async function boot(local){
      const epoch=mutation,row=await read(),m=meta();let remote;
      try{remote=row?C.validate(row.document):null;}catch(e){throw failConflict(local,row?.document);}
      ready=true;conflict=false;
      // Edits made while a reconnect read was in flight must be included.
      local=copy(epoch!==mutation?(getState?.()||latest||local):local);
      if(!row){revision=0;remember({revision:0,dirty:true});return write(local,mutation,0,null);}
      if(m.dirty){
        if(m.revision!==Number(row.revision)&&!base){failConflict(local,remote);return local;}
        return write(local,mutation,Number(m.revision??row.revision),base||(m.revision===Number(row.revision)?remote:null));
      }
      if(!Number.isInteger(m.revision)&&meaningful(local)){
        const different=local.classes.some(c=>remote.classes.some(r=>r.id===c.id&&!equal(r,c)));
        if(different){failConflict(local,remote);return local;}
        const extras=local.classes.filter(c=>!remote.classes.some(r=>r.id===c.id));
        if(extras.length){backup(local,remote);const merged=copy(remote);merged.classes.push(...extras);return write(merged,mutation,Number(row.revision),remote);}
      }
      if(meaningful(local)&&!equal(local,remote))backup(local);
      if(remote.classes.some(c=>c.id===local.activeClassId))remote.activeClassId=local.activeClassId;
      checkpoint(remote,Number(row.revision),false);onStatus('Hesap kaydı alındı · Cihazlar arasında eşitleniyor.');return remote;
    }
    function save(state){const captured=copy(state),epoch=mutation;latest=captured;pending++;queue=queue.catch(()=>{}).then(()=>write(captured,epoch)).finally(()=>pending--);return queue;}
    async function refresh(local){
      if(pending)return null;const epoch=mutation;
      if(!ready)return boot(local);
      if(meta().dirty){if(conflict&&!base)throw failConflict(local,null);return save(local);}
      const head=await read(true);if(epoch!==mutation)return null;
      if(!head)throw Error('Hesap kaydı bulunamadı. Bu cihazdaki sınıf korunuyor.');
      if(Number(head.revision)===revision)return null;
      const row=await read();if(epoch!==mutation)return null;
      if(!row)throw Error('Hesap kaydı bulunamadı. Bu cihazdaki sınıf korunuyor.');
      const remote=C.validate(row.document);backup(local);
      if(remote.classes.some(c=>c.id===local.activeClassId))remote.activeClassId=local.activeClassId;
      checkpoint(remote,Number(row.revision),false);onStatus('Diğer cihazdaki puanlar alındı.');return remote;
    }
    async function resolve(choice,local){
      await queue.catch(()=>{});const row=await read();backup(local,row?.document);ready=true;
      if(choice==='local'){conflict=false;return write(local,mutation,Number(row?.revision||0),row?C.validate(row.document):null);}
      if(!row)throw Error('Hesapta kayıt bulunamadı.');
      const remote=C.validate(row.document);checkpoint(remote,Number(row.revision),false);conflict=false;return remote;
    }
    return {boot,save,refresh,resolve,markDirty,isConflict:()=>conflict,isReady:()=>ready,isDirty:()=>meta().dirty===true};
  }
  return {create};
});
