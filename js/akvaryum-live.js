/* Owner-only realtime invalidations and server-selected classroom draws. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumLive=factory();
})(typeof window==='object'?window:this,function(){
 'use strict';
 function create({client,ownerId,onRevision=()=>{},onPicker=()=>{},onStatus=()=>{},now=Date.now,timeoutMs=12000}){
  let channel=null,connected=false,stopped=true,epoch=0,checking=null,lastCheck=0,revision=0;
  const seen=new Map(),requests=new Map();
  const validPick=row=>Number.isSafeInteger(Number(row.sequence))&&Number(row.sequence)>0&&typeof row.pick_id==='string'&&typeof row.student_id==='string'&&
   /^\d{4}-\d{2}-\d{2}$/.test(row.pick_date)&&Number.isFinite(Date.parse(row.picked_at))&&Array.isArray(row.round_ids)&&row.round_ids.length<=60&&row.round_ids.every(id=>typeof id==='string');
  async function request(query){const controller=new AbortController();let timer;
   try{return await Promise.race([query.abortSignal?query.abortSignal(controller.signal):query,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Anlık bağlantı yanıt vermedi. Seçim sonucunu yeniden kontrol edin.'));},timeoutMs);})]);}finally{clearTimeout(timer);}
  }
  function accept(row,serverNow){
   if(!row||row.owner_id!==ownerId||typeof row.class_id!=='string')return;
   const rev=Number(row.account_revision);
   if(Number.isSafeInteger(rev)&&rev>revision){revision=rev;onRevision(rev);}
   if(!row.class_id)return;
   const sequence=Number(row.sequence),at=Date.parse(row.picked_at),age=Number.isFinite(serverNow)?serverNow-at:0;
   if(!validPick(row)||sequence<=(seen.get(row.class_id)||0)||!Number.isFinite(age)||age< -5000||age>15000)return;
   seen.set(row.class_id,sequence);
   onPicker({...row,remaining:Math.max(0,Math.min(2400,2400-age)),expiresAt:now()+Math.max(0,15000-age)});
  }
  async function check(force=false){
   if(stopped||checking||(!force&&connected&&now()-lastCheck<30000))return checking;
   const token=epoch;lastCheck=now();
   const work=(async()=>{
    try{const {data,error}=await request(client.rpc('aquarium_live_snapshot'));
     if(token!==epoch||stopped)return;if(error)throw Error('Anlık bağlantı kurulamadı · Otomatik kayıt kontrolü sürüyor.');
     const serverNow=Date.parse(data?.server_now);if(!Number.isFinite(serverNow)||!Array.isArray(data?.rows))throw Error('Invalid live snapshot');
     for(const row of data.rows)accept(row,serverNow);
    }catch(e){if(token===epoch&&!stopped){connected=false;onStatus('Anlık bağlantı yok · Otomatik kayıt kontrolü sürüyor.',false);}}
   })();checking=work;try{await work;}finally{if(checking===work)checking=null;}
  }
  function start(){
   if(!stopped)return;stopped=false;const token=++epoch;
   if(!client.channel){onStatus('Otomatik kayıt kontrolü açık.',false);return;}
   onStatus('Anlık bağlantı kuruluyor…',false);
   try{channel=client.channel('aquarium-owner-'+ownerId).on('postgres_changes',{event:'INSERT',schema:'public',table:'aquarium_live_state',filter:'owner_id=eq.'+ownerId},event=>{if(token===epoch&&!stopped)accept(event.new);})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'aquarium_live_state',filter:'owner_id=eq.'+ownerId},event=>{if(token===epoch&&!stopped)accept(event.new);})
    .subscribe(status=>{if(token!==epoch||stopped)return;connected=status==='SUBSCRIBED';onStatus(connected?'Anlık bağlantı açık':'Anlık bağlantı yok · Otomatik kayıt kontrolü sürüyor.',connected);if(connected)check(true);});
   }catch(e){connected=false;onStatus('Anlık bağlantı yok · Otomatik kayıt kontrolü sürüyor.',false);}
   check(true);
  }
  function stop(){stopped=true;epoch++;connected=false;const previous=channel;channel=null;checking=null;if(previous){try{Promise.resolve(client.removeChannel?client.removeChannel(previous):previous.unsubscribe()).catch(()=>{});}catch(_){}}}
  async function draw(classId,requestId){
   if(stopped)throw Error('Anlık sınıf bağlantısı hazır değil.');
   const token=epoch;
   const id=requests.get(classId)||requestId;requests.set(classId,id);
   const {data,error}=await request(client.rpc('aquarium_pick_student',{p_class_id:classId,p_request_id:id}));
   if(error)throw Error(error.code==='22023'?'Seçilebilecek öğrenci bulunamadı. Sınıfı eşitleyip tekrar deneyin.':'Ortak rastgele seçim kullanılamıyor. Bağlantı ve anlık sistem kurulumu kontrol edilmeli.');
   if(stopped||token!==epoch)throw Error('Anlık bağlantı durdu. Yeniden bağlanınca sonucu kontrol edin.');
   if(!data||data.owner_id!==ownerId||data.class_id!==classId||!validPick(data)||!Number.isFinite(Date.parse(data.server_now)))throw Error('Ortak seçim sonucu doğrulanamadı.');
   requests.delete(classId);const serverTime=Date.parse(data.server_now);accept(data,serverTime);
   return {...data,stale:Number(data.sequence)<(seen.get(classId)||0),remaining:Math.max(0,Math.min(2400,2400-(serverTime-Date.parse(data.picked_at))))};
  }
  return {start,stop,check,draw,getRevision:()=>revision,isConnected:()=>connected};
 }
 return {create};
});
