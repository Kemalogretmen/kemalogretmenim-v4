(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MatematikVadisiStore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const TABLE = 'user_content_progress';
  const RECORD = 'matematik-vadisi:worlds:v1';
  const DRAFT_PREFIX = 'kemal_math_pending_v1_';
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(options) {
    let uid = null, epoch = 0, revision = null, phase = 'guest', pending = null;
    let connected = false, saved = '', timer = null, writing = false, attempted = null;
    const delay = options.setTimeout || setTimeout, cancel = options.clearTimeout || clearTimeout;
    const status = (kind, message) => { phase = kind; options.onStatus?.({kind, message}); };
    const key = () => DRAFT_PREFIX + uid;
    function draft(value) {
      if (!uid || !options.storage) return;
      try { if(value) options.storage.setItem(key(), JSON.stringify(value)); else options.storage.removeItem(key()); } catch (_) { /* The server remains authoritative. */ }
    }
    function readDraft() {
      try { const value = JSON.parse(options.storage?.getItem(key()) || 'null'); return value?.owner === uid && value.snapshot ? value : null; } catch (_) { return null; }
    }
    function query() { return options.client().from(TABLE).select('detail_json,updated_at').eq('user_id',uid).eq('content_type','game').eq('content_id',RECORD).maybeSingle(); }
    function unpack(row) { return row?.detail_json?.meta?.gameState || null; }
    function current(token, owner) { return epoch === token && uid === owner && options.userId() === owner; }
    function cancelTimer() { if(timer !== null) cancel(timer); timer = null; }
    function remember(snapshot) { draft({owner:uid, baseRevision:revision, snapshot, writtenAt:Date.now()}); }
    function conflict(message) { cancelTimer(); status('conflict',message); options.onLock?.(true); }
    async function connect(owner, force) {
      if(!force && connected && (owner || null) === uid) return;
      connected = true; phase = 'loading';
      const token = ++epoch; cancelTimer(); uid = owner || null; pending = null; attempted = null; writing = false; revision = null; saved = '';
      options.onLock?.(true); options.onLoad(null);
      if(!uid) { status('guest','Misafir olarak oynuyorsun. İlerlemeni hesabına kaydetmek için giriş yap.'); options.onLock?.(false); return; }
      status('loading','Dünyaların hesabından yükleniyor…');
      try {
        const result = await query();
        if(!current(token, owner)) return;
        if(result.error) throw result.error;
        const remote = unpack(result.data);
        if(result.data && !remote) throw new Error('Kayıt biçimi okunamadı.');
        revision = result.data?.updated_at || null; saved = remote ? JSON.stringify(remote) : '';
        const local = readDraft();
        if(local && JSON.stringify(local.snapshot) !== saved) {
          options.onLoad(clone(local.snapshot)); pending = clone(local.snapshot);
          if(local.baseRevision !== revision) { conflict('Hesabında başka bir cihazdan yapılmış daha yeni bir kayıt var.'); return; }
          status('ready','Bu cihazdaki son değişiklikler hesabına gönderiliyor…'); options.onLock?.(false); schedule(); return;
        }
        options.onLoad(remote ? clone(remote) : null); draft(null);
        status('ready', remote ? 'Dünyaların hesabından yüklendi.' : 'Yeni dünyan hesabına otomatik kaydedilecek.'); options.onLock?.(false);
      } catch (_) {
        if(current(token, owner)) { status('load-error','Hesabındaki kayıt yüklenemedi. Bağlantını kontrol edip yeniden dene.'); options.onLock?.(true); }
      }
    }
    function schedule() { if(timer === null && !writing) timer = delay(() => { timer = null; flush(); }, options.debounceMs ?? 1800); }
    function changed(snapshot) {
      if(!uid || !['ready','saving','error'].includes(phase) || options.userId() !== uid) return;
      if(!snapshot?.players?.length) return;
      const serialized = JSON.stringify(snapshot);
      if(serialized.length > 1000000) { status('error','Dünya kaydı bu sürümün sınırına ulaştı. Yeni ada açmadan önce öğretmeninden yardım iste.'); return; }
      if(serialized === saved && !writing) return;
      pending = clone(snapshot); remember(pending);
      if(phase !== 'error') schedule();
    }
    async function flush() {
      cancelTimer();
      if(!uid || !pending || writing || !['ready','saving','error'].includes(phase) || options.userId() !== uid) return;
      const token = epoch, owner = uid, snapshot = clone(pending), serialized = JSON.stringify(snapshot), base = revision;
      pending = null; attempted = snapshot; writing = true; status('saving','Hesabına kaydediliyor…');
      const active = snapshot.players[snapshot.active] || snapshot.players[0];
      const row = {user_id:owner, content_type:'game', content_id:RECORD, title:'Matematik Vadisi', href:'/oyun/matematik-vadisi.html', grade:String(active?.grade ?? ''), subject:'Matematik', status:active?.won?'completed':'started', score:null, detail_json:{local_key:'game:'+RECORD,meta:{accountUid:owner,internalGameState:true,gameState:snapshot}}, completed_at:active?.won?new Date().toISOString():null};
      try {
        let request = options.client().from(TABLE);
        request = base ? request.update(row).eq('user_id',owner).eq('content_type','game').eq('content_id',RECORD).eq('updated_at',base) : request.insert(row);
        const result = await request.select('updated_at').maybeSingle();
        if(!current(token, owner)) return;
        if(result.error?.code === '23505' || (!result.error && !result.data)) {
          pending = pending || snapshot; remember(pending); conflict('Bu dünya başka bir pencerede değişti. İlerlemenin üstüne yazmadık.'); return;
        }
        if(result.error || !result.data?.updated_at) throw result.error || new Error('Kaydetme doğrulanamadı.');
        revision = result.data.updated_at; saved = serialized;
        if(pending && JSON.stringify(pending) !== saved) remember(pending); else {pending = null; draft(null);}
        status('ready','İlerlemen hesabına kaydedildi.');
      } catch (_) {
        if(current(token, owner)) { pending = pending || snapshot; remember(pending); status('error','Şu anda hesabına kaydedilemedi. Değişikliklerin bu cihazda bekliyor; yeniden dene.'); }
      } finally {
        if(current(token, owner)) {writing = false; attempted = null;if(pending && phase === 'ready') schedule();}
      }
    }
    async function reload() { if(uid) { draft(null); await connect(uid,true); } }
    async function keepBoth() {
      if(phase !== 'conflict' || !uid || !pending) return;
      const token = epoch, owner = uid, local = clone(pending);
      status('loading','İki kaydı da koruyarak dünyaların hazırlanıyor…');
      try {
        const result = await query(); if(!current(token,owner)) return; if(result.error) throw result.error;
        const merged = options.merge(unpack(result.data),local);
        options.onLoad(merged); revision = result.data?.updated_at || null; saved = JSON.stringify(unpack(result.data)); pending = merged; remember(merged);
        status('ready','Bu cihazdaki dünyalar ayrı bir kopya olarak korunuyor.');options.onLock?.(false);await flush();
      } catch (_) { if(current(token,owner)) conflict('İki kayıt henüz birleştirilemedi. Bağlantını kontrol edip yeniden dene.'); }
    }
    function dispose() { ++epoch;cancelTimer();pending = null;writing = false; }
    return {connect,changed,flush,reload,keepBoth,dispose,getState:()=>({uid,phase,revision,dirty:!!pending||!!attempted})};
  }
  return {create,TABLE,RECORD,DRAFT_PREFIX};
});
