/* Account-scoped IndexedDB storage. A full browser cache must never stop cloud sync. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root);
  else root.AquariumStorage=factory(root);
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const DATABASE='kemal_aquarium_accounts_v1',STORE='records';
  const LEGACY_NAMES=['document','meta','base','sync','recovery','cloud_recovery','before_sync_choice','before_class_delete','unsent_recovery'];
  const OPTIONAL=new Set(['recovery','cloud_recovery','before_sync_choice']);
  const clone=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
  function defaultValue(name){try{return root[name]||null;}catch(e){return null;}}
  function create(options={}){
    const key=options.key;
    if(typeof key!=='string'||!key)throw Error('An account storage key is required.');
    const storage=Object.prototype.hasOwnProperty.call(options,'storage')?options.storage:defaultValue('localStorage');
    const indexedDB=Object.prototype.hasOwnProperty.call(options,'indexedDB')?options.indexedDB:defaultValue('indexedDB');
    const maxRecoveryBytes=options.maxRecoveryBytes??512*1024;
    const timeoutMs=options.timeoutMs??4000;
    const memory=new Map(),durable=new Set();
    let error=null,connection=null,initializing=null,queue=Promise.resolve();
    function nameOK(name){return typeof name==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(name);}
    function legacyKey(name){return name==='document'?key:key+'_'+(name==='meta'?'cloud':name==='base'?'cloud_base':name==='before_class_delete'?'beforeClassDelete':name);}
    // JSON tuple keys cannot collide even when an account key contains separators.
    function recordKey(name){return JSON.stringify([key,name]);}
    function localRead(name){try{return storage?.getItem(legacyKey(name))??null;}catch(e){error=e;return null;}}
    function localWrite(name,value){try{if(!storage)return false;storage.setItem(legacyKey(name),value);return true;}catch(e){error=e;return false;}}
    function fingerprint(raw){
      let a=2166136261,b=2246822519;
      for(let i=0;i<raw.length;i++){const c=raw.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}
      return raw.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
    }
    function pendingLocal(){try{const value=JSON.parse(storage?.getItem(key+'_storage_pending')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(e){return {};}}
    function markLocal(name,raw){
      try{if(!storage)return false;storage.setItem(key+'_storage_pending',JSON.stringify({...pendingLocal(),[name]:fingerprint(raw)}));return true;}
      catch(e){error=e;return false;}
    }
    function clearLocalMark(name,expected){
      try{
        if(!storage)return;const pending=pendingLocal();
        if(expected!==undefined&&pending[name]!==fingerprint(expected))return;
        delete pending[name];if(Object.keys(pending).length)storage.setItem(key+'_storage_pending',JSON.stringify(pending));else storage.removeItem(key+'_storage_pending');
      }catch(e){}
    }
    function isPendingLocal(name,raw){return raw!==null&&pendingLocal()[name]===fingerprint(raw);}
    function retireLegacy(name,expected){
      // A still-open older tab may have changed this key while IndexedDB committed.
      try{if(storage?.getItem(legacyKey(name))===expected)storage.removeItem(legacyKey(name));}catch(e){/* The durable copy is already safe. */}
    }
    function open(){
      return new Promise(resolve=>{
        if(!indexedDB?.open){resolve(null);return;}
        let settled=false,request;
        const finish=db=>{if(settled){if(db)db.close();return;}settled=true;clearTimeout(timer);resolve(db);};
        const timer=setTimeout(()=>{error=Error('Local database opening timed out.');finish(null);},timeoutMs);
        try{
          request=indexedDB.open(DATABASE,1);
          request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
          request.onsuccess=()=>{
            const db=request.result;
            db.onversionchange=()=>{db.close();if(connection===db)connection=null;};
            finish(db);
          };
          request.onerror=()=>{error=request.error||Error('Local database could not be opened.');finish(null);};
          request.onblocked=()=>{error=Error('Local database upgrade is blocked by another tab.');finish(null);};
        }catch(e){error=e;finish(null);}
      });
    }
    function transaction(mode,action){
      return new Promise((resolve,reject)=>{
        if(!connection){reject(Error('Local database is not available.'));return;}
        let tx,result,settled=false;
        const finish=(failure)=>{if(settled)return;settled=true;clearTimeout(timer);if(failure)reject(failure);else resolve(result);};
        const timer=setTimeout(()=>{try{tx?.abort();}catch(e){}finish(Error('Local database transaction timed out.'));},timeoutMs);
        try{
          tx=connection.transaction(STORE,mode);
          tx.oncomplete=()=>finish();
          tx.onabort=()=>finish(tx.error||Error('Local database transaction was aborted.'));
          tx.onerror=()=>{/* Abort or completion determines whether the write is durable. */};
          const request=action(tx.objectStore(STORE));
          if(request){request.onsuccess=()=>{result=request.result;};request.onerror=()=>{error=request.error||Error('Local database request failed.');};}
        }catch(e){try{tx?.abort();}catch(ignore){}finish(e);}
      });
    }
    async function init(){
      if(initializing)return initializing;
      initializing=(async()=>{
        connection=await open();
        if(!connection)return;
        // Migrate old full localStorage snapshots before retiring any of their keys.
        // Existing IndexedDB values win; a different legacy value remains recoverable.
        for(const name of LEGACY_NAMES){
          const old=localRead(name);if(old===null)continue;
          try{JSON.parse(old);}catch(e){error=e;continue;}
          try{
            const existing=await transaction('readonly',s=>s.get(recordKey(name)));
            if(existing===undefined||isPendingLocal(name,old)){await transaction('readwrite',s=>s.put(old,recordKey(name)));memory.set(name,JSON.parse(old));durable.add(name);retireLegacy(name,old);clearLocalMark(name,old);}
            else if(existing===old){memory.set(name,JSON.parse(old));durable.add(name);retireLegacy(name,old);clearLocalMark(name,old);}
          }catch(e){
            error=e;
            // One broken transaction must not multiply startup timeout by the
            // number of old recovery snapshots. All remaining originals stay.
            break;
          }
        }
      })();
      return initializing;
    }
    function enqueue(work){const result=queue.then(work,work);queue=result.catch(()=>{});return result;}
    function read(name){
      return enqueue(async()=>{
        if(!nameOK(name))return null;
        await init();
        // An unsaved primary must not be replaced with an older persisted value.
        if(memory.has(name)&&!durable.has(name))return clone(memory.get(name));
        const fallback=localRead(name);
        if(isPendingLocal(name,fallback)){try{const value=JSON.parse(fallback);memory.set(name,value);durable.add(name);return clone(value);}catch(e){error=e;}}
        if(connection){
          try{
            const raw=await transaction('readonly',s=>s.get(recordKey(name)));
            if(raw!==undefined){const value=JSON.parse(raw);memory.set(name,value);durable.add(name);return clone(value);}
          }catch(e){error=e;}
        }
        const raw=localRead(name);
        if(raw!==null){try{const value=JSON.parse(raw);memory.set(name,value);durable.add(name);return clone(value);}catch(e){error=e;}}
        return memory.has(name)?clone(memory.get(name)):null;
      });
    }
    function readRaw(name='document'){
      return enqueue(async()=>{
        if(!nameOK(name))return null;
        await init();
        if(memory.has(name)&&!durable.has(name))return JSON.stringify(memory.get(name));
        const fallback=localRead(name);
        if(isPendingLocal(name,fallback))return fallback;
        if(connection){try{const raw=await transaction('readonly',s=>s.get(recordKey(name)));if(raw!==undefined)return raw;}catch(e){error=e;}}
        return fallback??(memory.has(name)?JSON.stringify(memory.get(name)):null);
      });
    }
    function write(name,value){
      // Capture before joining the asynchronous queue so later UI edits cannot alter a write.
      let raw,captured;
      try{
        if(!nameOK(name))throw Error('Invalid account storage record name.');
        raw=JSON.stringify(value);if(raw===undefined)throw Error('Account storage values must be JSON.');captured=JSON.parse(raw);
        if(OPTIONAL.has(name)&&raw.length*2>maxRecoveryBytes){
          const limit=Error('The optional recovery snapshot exceeds its size limit.');limit.code='AQUARIUM_RECOVERY_LIMIT';error=limit;return Promise.resolve(false);
        }
      }catch(e){error=e;return Promise.resolve(false);}
      return enqueue(async()=>{
        await init();memory.set(name,captured);durable.delete(name);
        if(connection){
          try{
            const previous=localRead(name);
            await transaction('readwrite',s=>s.put(raw,recordKey(name)));durable.add(name);error=null;
            if(previous!==null){retireLegacy(name,previous);clearLocalMark(name,previous);}
            return true;
          }catch(e){error=e;}
        }
        // A small manifest is committed first, so a reload can distinguish an
        // unsent fallback from an older IndexedDB checkpoint. Its fingerprint
        // prevents a failed setItem from marking the previous document as new.
        if((!indexedDB||markLocal(name,raw))&&localWrite(name,raw)){durable.add(name);error=null;return true;}
        // Keep unsent points in memory and leave the old persisted document intact.
        return false;
      });
    }
    function remove(name){
      return enqueue(async()=>{
        if(!nameOK(name))return false;
        await init();let removed=true;
        if(connection){try{await transaction('readwrite',s=>s.delete(recordKey(name)));}catch(e){error=e;removed=false;}}
        if(!removed)return false;
        try{if(storage)storage.removeItem(legacyKey(name));}catch(e){error=e;removed=false;}
        if(removed){memory.delete(name);durable.delete(name);clearLocalMark(name);}return removed;
      });
    }
    return {read,readRaw,write,remove,load:()=>read('document'),save:document=>write('document',document),flush:()=>queue,
      isDurable:(name='document')=>durable.has(name),lastError:()=>error};
  }
  return {create};
});
