(function () {
  'use strict';
  const C = window.AquariumCore;
  function snapshot(cls, settings) {
    return { name: cls.name, theme: cls.theme, settings: { names: settings.names, points: settings.points === true, classPoints: settings.classPoints === true, motion: settings.motion, chat: settings.chat },
      classPoints: settings.classPoints === true ? cls.students.reduce((sum,s)=>sum+C.earned(s),0) : null,
      students: cls.students.map(s => ({ id: s.id, name: settings.names ? s.name : '', species: s.species, mood: C.mood(s).id, points: settings.points ? C.earned(s) : null })) };
  }
  const client = () => window.kemalUserAuth.getClient();
  const owner = () => window.kemalUserAuth.getUser().id;
  const table = () => client().from('aquarium_shares');
  const links = () => client().from('aquarium_student_links');
  async function get(localId) {
    const { data, error } = await table().select('id,token,enabled').eq('owner_id', owner()).eq('local_id', localId).maybeSingle();
    if (error) throw new Error('Paylaşım altyapısına erişilemiyor. Veritabanı kurulumu ve bağlantı kontrol edilmeli.');
    return data;
  }
  async function listOpen() {
    const { data, error } = await table().select('id,local_id,snapshot').eq('owner_id',owner()).eq('enabled',true);
    if(error) throw new Error('Açık bağlantılar kontrol edilemedi.');
    return data || [];
  }
  async function disableAll() {
    const childResult = await links().update({enabled:false}).eq('enabled',true);
    if(childResult.error) throw new Error('Veli kodları kapatılamadığı için yedek yüklenmedi.');
    const { error } = await table().update({enabled:false,snapshot:{},updated_at:new Date().toISOString()}).eq('owner_id',owner());
    if(error) throw new Error('Önceki bağlantılar kapatılamadığı için yedek yüklenmedi. Bağlantıyı kontrol edin.');
  }
  async function ensure(cls, settings) {
    let row = await get(cls.id);
    if (!row) {
      const {error} = await table().upsert({owner_id:owner(),local_id:cls.id,enabled:false,snapshot:snapshot(cls,settings)}, {onConflict:'owner_id,local_id',ignoreDuplicates:true});
      if(error) throw new Error('Veli paylaşımı hazırlanamadı.');
      row = await get(cls.id);
    }
    await sync(cls,settings); return row;
  }
  async function enable(cls, settings) {
    const { data, error } = await table().upsert({ owner_id: owner(), local_id: cls.id, token: crypto.randomUUID(), enabled: true, snapshot: snapshot(cls, settings), updated_at: new Date().toISOString() }, { onConflict: 'owner_id,local_id' }).select('id,token,enabled').single();
    if (error) throw new Error('Sınıf paylaşımı açılamadı. Öğretmen yetkisi ve veritabanı kurulumu kontrol edilmeli.');
    return data;
  }
  async function disable(id) {
    // Public-class permission is independent of child-only access. Keep the private snapshot.
    const { data, error } = await table().update({ enabled: false, token: crypto.randomUUID(), updated_at: new Date().toISOString() }).eq('id', id).select('id');
    if (error || !data?.length) throw new Error('Paylaşım kapatılamadı. Bağlantıyı kontrol edip tekrar deneyin; önceki bağlantı hâlâ açık olabilir.');
  }
  async function childLinks(shareId) {
    if(!shareId) return [];
    const {data,error}=await links().select('id,student_id,token,enabled').eq('share_id',shareId);
    if(error) throw new Error('Veli kodları yüklenemedi. Veritabanı güncellemesini kontrol edin.');
    return data || [];
  }
  async function enableChild(cls,settings,studentId) {
    if(!cls.students.some(s=>s.id===studentId)) throw new Error('Öğrenci bulunamadı.');
    const share=await ensure(cls,settings);
    const {data,error}=await links().upsert({share_id:share.id,student_id:studentId,token:crypto.randomUUID(),enabled:true},{onConflict:'share_id,student_id'}).select('id,student_id,token,enabled').single();
    if(error) throw new Error('Çocuğa özel veli kodu oluşturulamadı.');
    return data;
  }
  async function disableChild(id) {
    const {data,error}=await links().update({enabled:false,token:crypto.randomUUID()}).eq('id',id).select('id');
    if(error || !data?.length) throw new Error('Veli kodu kapatılamadı. Yeniden deneyin.');
  }
  async function sync(cls, settings) {
    const { error } = await table().update({ snapshot: snapshot(cls, settings), updated_at: new Date().toISOString() }).eq('owner_id', owner()).eq('local_id', cls.id);
    if (error) throw new Error('İzleme ekranı güncellenemedi. Bağlantınızı kontrol edin.');
  }
  async function syncMany(classes, settings) {
    const {data,error}=await table().select('id,local_id').eq('owner_id',owner());
    if(error) throw new Error('İzleme bağlantıları kontrol edilemedi.');
    const local = new Map(classes.map(cls=>[cls.id,cls]));
    for (const row of data || []) {
      if(local.has(row.local_id)) await sync(local.get(row.local_id),settings);
      else { const result=await table().update({enabled:false,snapshot:{}}).eq('id',row.id); if(result.error) throw new Error('Silinen sınıfın paylaşımı kapatılamadı.'); }
    }
  }
  window.AquariumSharing = { snapshot, get, enable, disable, sync, syncMany, listOpen, disableAll, childLinks, enableChild, disableChild };
})();
