/* Database-authoritative account sync with durable offline checkpoints. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./akvaryum-core.js'),require('./akvaryum-sync-merge.js'));
  else root.AquariumCloud=factory(root.AquariumCore,root.AquariumSyncMerge);
})(typeof window==='object'?window:this,function(C,Reconcile){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const sameContent=(a,b)=>equal({...a,activeClassId:''},{...b,activeClassId:''});
  function create({client,storage,persistence,key,project,ownerId,getState,onStatus=()=>{},timeoutMs=12000}){
    let revision=0,ready=false,dirty=false,mutation=0,pending=0,base=null,latest=null,initialized=false,hydrating=null;
    let queue=Promise.resolve(),cacheQueue=Promise.resolve(),transition=null,cacheBlocked=false,generation=0,restoredDocument=null;
    const names={document:key,meta:key+'_cloud',base:key+'_cloud_base',sync:key+'_sync',recovery:key+'_recovery',cloud_recovery:key+'_cloud_recovery'};
    const memory=new Map();
    async function cached(name){
      try{
        if(persistence)return await persistence.read(name);
        if(memory.has(name))return copy(memory.get(name));
        const raw=storage?.getItem(names[name]||key+'_'+name);return raw?JSON.parse(raw):null;
      }catch(_){return null;}
    }
    async function put(name,value){
      try{
        if(persistence)return await persistence.write(name,value);
        memory.set(name,copy(value));if(!storage)return false;
        storage.setItem(names[name]||key+'_'+name,JSON.stringify(value));return true;
      }catch(_){return false;}
    }
    async function initialize(){
      if(initialized)return;if(hydrating)return hydrating;
      hydrating=(async()=>{
        const envelope=await cached('sync'),splitMeta=await cached('meta');
        const envelopeGeneration=Number(envelope?.meta?.generation)||0,splitGeneration=Number(splitMeta?.generation)||0;
        generation=Math.max(envelopeGeneration,splitGeneration);
        const atomic=!!envelope&&envelopeGeneration>=splitGeneration;
        const meta=atomic&&envelope.meta?envelope.meta:splitMeta;
        const savedBase=atomic&&Object.prototype.hasOwnProperty.call(envelope,'base')?envelope.base:await cached('base');
        try{
          if(savedBase&&(atomic||Number(savedBase.revision)===Number(meta?.revision))&&Number.isSafeInteger(Number(savedBase.revision))&&Number(savedBase.revision)>0){base=C.validate(savedBase.document);revision=Number(savedBase.revision);}
        }catch(_){base=null;revision=0;}
        if(atomic&&envelope.document)try{restoredDocument=C.validate(envelope.document);}catch(_){}
        dirty=dirty||meta?.dirty===true;
        initialized=true;
      })();return hydrating;
    }
    function persist(document){
      const projected=transition?reconcile(transition.origin,document,transition.document):document;
      const snapshot={document:copy(projected),base:base?{revision,document:copy(base)}:null,meta:{revision,dirty,conflict:false,generation:++generation}};
      // The single sync entry preserves the acknowledged base and unsent document
      // together if the browser closes between the other cache writes.
      const work=cacheQueue.catch(()=>{}).then(async()=>{
        await put('sync',snapshot);await put('document',snapshot.document);
        await put('meta',snapshot.meta);if(snapshot.base)await put('base',snapshot.base);
      });cacheQueue=work;return work;
    }
    async function archive(local,remote){
      // This is recovery data, never a condition for accepting a server response.
      // Unlike the former localStorage choice pair it has no small snapshot cap.
      await put('unsent_recovery',{document:copy(local),revision,at:Date.now()});
      await put('recovery',local);if(remote)await put('cloud_recovery',remote);
    }
    function markDirty(state){
      mutation++;dirty=true;if(state)latest=copy(state);
      if(latest){if(initialized)void persist(latest);else void initialize().then(()=>persist(latest));}
    }
    async function request(query){
      const controller=new AbortController();let timer;
      try{return await Promise.race([query.abortSignal?query.abortSignal(controller.signal):query,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Bağlantı bekleniyor. Yeni puanlar korunuyor; otomatik kayıt yeniden denenecek.'));},timeoutMs);})]);}
      finally{clearTimeout(timer);}
    }
    async function read(revisionOnly=false){
      let query=client.from('aquarium_accounts').select(revisionOnly?'revision':'document,revision');if(ownerId)query=query.eq('owner_id',ownerId);
      const {data,error}=await request(query.maybeSingle());
      if(error)throw Error('Hesap kaydına geçici olarak erişilemiyor. Otomatik kayıt yeniden denenecek.');
      if(data&&(!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<1))throw Error('Hesap kayıt sürümü doğrulanamadı. Yeni puanlar korunuyor.');
      return data;
    }
    function localNow(fallback){return C.validate(copy(getState?.()||latest||fallback));}
    function reconcile(anchor,local,remote){
      try{return Reconcile.reconcile(anchor,local,remote);}
      catch(_){throw Error('Kayıtlar otomatik birleştirilemedi. Yeni puanlar korunuyor; otomatik kayıt yeniden denenecek.');}
    }
    async function checkpoint(document,rev,captured,epoch){
      const persistedAt=mutation;
      let applied=epoch!==mutation?reconcile(captured,localNow(captured),document):document;
      transition={origin:copy(captured),document:copy(document)};
      base=copy(document);revision=rev;dirty=epoch!==mutation;latest=copy(applied);
      await persist(applied);
      // IndexedDB can be slow. A click while its transaction commits must not
      // disappear when the server response is finally applied to the screen.
      if(persistedAt!==mutation){
        applied=reconcile(captured,localNow(captured),document);dirty=true;latest=copy(applied);void persist(applied);
      }
      transition=null;
      onStatus(dirty?'Yeni puanlar arka planda kaydediliyor…':'Hesabınıza kaydedildi.');
      return applied;
    }
    async function write(state,epoch=mutation,workRevision=revision,workBase=base,origin=state){
      if(!ready)throw Error('Hesap bağlantısı bekleniyor. Yeni puanlar korunuyor.');
      const captured=C.validate(copy(origin));let document=C.validate(copy(state)),rev=workRevision,anchor=workBase;
      for(let attempt=0;attempt<3;attempt++){
        const {data,error}=await request(client.rpc('save_aquarium_account',{p_document:document,p_revision:rev,...(ownerId?{p_owner:ownerId}:{}),p_snapshots:document.classes.map(c=>({local_id:c.id,snapshot:project(c,document.settings)}))}));
        // 40001 is accepted only for servers not yet migrated to PT409.
        if(error?.code==='PT409'||error?.code==='40001'){
          const row=await read();if(!row)throw Error('Hesap kaydı doğrulanamadı. Yeni puanlar korunuyor.');
          const remote=C.validate(row.document);await archive(localNow(captured),remote);
          document=reconcile(anchor,document,remote);anchor=remote;rev=Number(row.revision);
          // Lost acknowledgements and an already-applied edit do not create a
          // second write, another feed or an endless realtime revision echo.
          if(sameContent(document,remote))return checkpoint(remote,rev,captured,epoch);
          continue;
        }
        if(error)throw Error('Bağlantı bekleniyor. Yeni puanlar korunuyor; otomatik kayıt yeniden denenecek.');
        const next=Number(data);if(!Number.isSafeInteger(next)||next<=rev)throw Error('Sunucu kaydı doğrulanamadı. Yeni puanlar korunuyor.');
        return checkpoint(document,next,captured,epoch);
      }
      throw Error('Diğer cihazdaki kayıtlar alınıyor. Yeni puanlar korunuyor; otomatik kayıt yeniden denenecek.');
    }
    async function boot(local,{cacheUnavailable=cacheBlocked}={}){
      cacheBlocked=cacheBlocked||cacheUnavailable;
      const enteringEpoch=mutation,entering=C.validate(copy(local));
      await initialize();const row=await read();
      const source=enteringEpoch!==mutation?localNow(entering):entering,epoch=mutation;
      let document=copy(source);
      // The atomic record can be newer than the separate primary cache if the
      // browser closed immediately after committing its offline checkpoint.
      if(restoredDocument){
        document=enteringEpoch!==mutation&&base?reconcile(base,source,restoredDocument):copy(restoredDocument);
        restoredDocument=null;
      }
      latest=copy(document);
      if(!row){
        ready=true;
        if(cacheBlocked){ready=false;throw Error('Hesapta kayıt bulunamadı ve cihaz kopyası okunamadı. Mevcut veriler değiştirilmedi.');}
        revision=0;base=null;dirty=true;return write(document,epoch,0,null,source);
      }
      const remote=C.validate(row.document),rev=Number(row.revision);ready=true;cacheBlocked=false;
      if(dirty&&!sameContent(document,remote)){
        await archive(document,remote);
        const merged=reconcile(base,document,remote);
        if(!sameContent(merged,remote))return write(merged,epoch,rev,remote,source);
      }else if(!base&&!sameContent(document,remote))await archive(document,remote);
      if(remote.classes.some(c=>c.id===source.activeClassId))remote.activeClassId=source.activeClassId;
      return checkpoint(remote,rev,source,epoch);
    }
    function enqueueWrite(state,origin,epoch,workRevision=revision,workBase=base){
      // Capture the baseline now. An earlier queued write can acknowledge new
      // remote events before this capture is sent; using its newer revision
      // without rebasing would overwrite those events with a stale UI document.
      const source=copy(origin),captured=copy(transition?reconcile(transition.origin,state,transition.document):state),anchor=workBase?copy(workBase):null;
      latest=source;dirty=true;pending++;void persist(source);
      queue=queue.catch(()=>{}).then(()=>write(captured,epoch,workRevision,anchor,source)).finally(()=>pending--);return queue;
    }
    function save(state){mutation++;return enqueueWrite(state,state,mutation);}
    async function refresh(local){
      if(pending)return null;const epoch=mutation;
      if(!ready)return boot(local);
      await initialize();if(epoch!==mutation)return null;
      if(dirty){
        dirty=true;
        // Reconcile before writing so a device never sends an old full account
        // over a newer database revision, even when its previous response was lost.
        const row=await read();if(!row)throw Error('Hesap kaydı bulunamadı. Yeni puanlar korunuyor.');
        if(epoch!==mutation)return null;
        const remote=C.validate(row.document);let document=C.validate(copy(local));
        if(Number(row.revision)!==revision||!base){await archive(local,remote);document=reconcile(base,document,remote);}
        if(sameContent(document,remote))return checkpoint(remote,Number(row.revision),local,epoch);
        return enqueueWrite(document,local,epoch,Number(row.revision),remote);
      }
      const head=await read(true);if(epoch!==mutation)return null;
      if(!head)throw Error('Hesap kaydı bulunamadı. Bu cihazdaki sınıf korunuyor.');
      if(Number(head.revision)===revision)return null;
      const row=await read();if(epoch!==mutation)return null;
      if(!row)throw Error('Hesap kaydı bulunamadı. Bu cihazdaki sınıf korunuyor.');
      const remote=C.validate(row.document);
      if(remote.classes.some(c=>c.id===local.activeClassId))remote.activeClassId=local.activeClassId;
      return checkpoint(remote,Number(row.revision),local,epoch);
    }
    async function inspect(local){
      await queue.catch(()=>{});const document=await refresh(local);
      return {resolved:true,document:document||localNow(local)};
    }
    // Old open settings panels may still call this method after an update.
    // A source choice is no longer permitted to replace the whole account.
    async function resolve(choice,local){return (await inspect(local)).document;}
    return {boot,save,refresh,inspect,resolve,markDirty,getRevision:()=>revision,isConflict:()=>false,isReady:()=>ready,isDirty:()=>dirty,flushCache:()=>cacheQueue};
  }
  return {create};
});
