(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const auth = window.kemalUserAuth, game = window.kemalMathGame;
  const TRANSFER = 'kemal_math_guest_transfer_v1';
  let storage = null, transfer = null, authFailed = false, initialized = false, guestOverride = false;
  try { storage = window.localStorage; } catch (_) {}
  try {
    const data = JSON.parse(sessionStorage.getItem(TRANSFER) || 'null');
    if(data && data.expires > Date.now() && data.snapshot?.players?.length) transfer = data.snapshot;
    else sessionStorage.removeItem(TRANSFER);
  } catch (_) {}
  function currentUid() { return auth.getState().user?.id || null; }
  function showTransfer() {
    const state = store.getState();
    $('mv-claim-guest').hidden = !transfer || !state.uid || !['ready','error'].includes(state.phase);
  }
  function showStatus(state) {
    $('mv-save-status').textContent = state.message;
    $('mv-save-status').dataset.state = state.kind;
    $('mv-cloud-save').hidden = !['ready','saving'].includes(state.kind);
    $('mv-cloud-save').disabled = state.kind === 'saving';
    $('mv-cloud-retry').hidden = !['error','load-error','auth-error'].includes(state.kind);
    $('mv-cloud-reload').hidden = state.kind !== 'conflict';
    $('mv-cloud-keep').hidden = state.kind !== 'conflict';
    showTransfer();
  }
  if(!game || !auth || !window.MatematikVadisiStore) {
    $('mv-save-status').textContent = 'Oyun dosyaları yüklenemedi. Sayfayı yenileyip yeniden dene.';
    return;
  }
  const store = window.MatematikVadisiStore.create({
    client: () => auth.getClient(), userId: currentUid, storage,
    onStatus: showStatus, onLock: game.setLocked, onLoad: game.replaceSnapshot, merge: game.merge,
  });
  game.subscribe(store.changed);
  game.setLocked(true);
  async function syncAuth() {
    const state = auth.getState();
    if(!state.ready) return;
    if(state.error) {
      authFailed = true; game.setLocked(!guestOverride);
      $('mv-play-guest').hidden = guestOverride || !!store.getState().uid;
      showStatus({kind:'auth-error',message:'Oturum kontrol edilemedi. Bağlantını kontrol edip yeniden dene.'});
      return;
    }
    authFailed = false;
    const uid = state.user?.id || null, previous = store.getState();
    if(initialized && !previous.uid && uid) {
      const guest = game.snapshot(); if(guest.players.length) transfer = guest;
    }
    $('mv-account-name').textContent = uid ? (auth.getDisplayName() || 'Hesabım') : 'Misafir oyuncu';
    $('mv-play-guest').hidden = true;
    $('mv-sign-in').hidden = !!uid;
    $('mv-account-panel').hidden = !uid;
    $('mv-sign-out').hidden = !uid;
    if(uid) $('mv-account-panel').href = auth.getPanelHref(state.profile);
    if(uid && state.profile?.active === false) {
      store.dispose(); game.replaceSnapshot(null); game.setLocked(true);
      showStatus({kind:'auth-error',message:'Bu hesap şu anda pasif. Panelinden hesap durumunu kontrol edebilirsin.'});
      return;
    }
    initialized = true;
    await store.connect(uid);
    showTransfer();
  }
  $('mv-play-guest').addEventListener('click', async () => {
    if(store.getState().uid) return;
    guestOverride = true; initialized = true;
    await store.connect(null,true);
    $('mv-play-guest').hidden = true;
  });
  $('mv-sign-in').addEventListener('click', () => {
    const snapshot = game.snapshot();
    if(snapshot.players.length) {
      try { sessionStorage.setItem(TRANSFER,JSON.stringify({snapshot,expires:Date.now()+86400000})); }
      catch (_) { /* Guest play is intentionally not a durable save. */ }
    }
  });
  $('mv-cloud-save').addEventListener('click', () => { store.changed(game.snapshot()); store.flush(); });
  $('mv-cloud-retry').addEventListener('click', async () => {
    if(authFailed || store.getState().phase === 'guest') {
      try { await auth.refresh(); await syncAuth(); } catch (_) { showStatus({kind:'auth-error',message:'Oturum hâlâ kontrol edilemedi. Bağlantını kontrol edip yeniden dene.'}); }
    } else if(store.getState().phase === 'load-error') await store.connect(currentUid(),true);
    else await store.flush();
  });
  $('mv-cloud-reload').addEventListener('click', () => store.reload());
  $('mv-cloud-keep').addEventListener('click', () => store.keepBoth());
  $('mv-claim-guest').addEventListener('click', () => {
    if(!transfer || !currentUid() || !['ready','error'].includes(store.getState().phase)) return;
    try {
      const merged = game.merge(game.snapshot(),transfer);
      game.replaceSnapshot(merged); store.changed(game.snapshot()); store.flush(); transfer = null;
      try { sessionStorage.removeItem(TRANSFER); } catch (_) {}
      showTransfer();
    } catch (_) { $('mv-save-status').textContent = 'Misafir dünyası eklenemedi. Hesabındaki dünyalar korunuyor.'; }
  });
  $('mv-sign-out').addEventListener('click', async () => {
    $('mv-sign-out').disabled = true;
    try {
      store.changed(game.snapshot()); await store.flush();
      const result = await auth.getClient().auth.signOut();
      if(result.error) throw result.error;
      await auth.refresh(); await syncAuth();
    } catch (_) { $('mv-save-status').textContent = 'Çıkış yapılamadı. Yeniden dene.'; }
    finally { $('mv-sign-out').disabled = false; }
  });
  window.addEventListener('kemal-user-auth-changed', syncAuth);
  window.addEventListener('online', () => { if(store.getState().phase === 'error') store.flush(); });
  window.addEventListener('pagehide', () => { store.changed(game.snapshot()); store.flush(); });
  document.addEventListener('visibilitychange', () => { if(document.hidden) { store.changed(game.snapshot()); store.flush(); } });
  auth.ready().then(syncAuth).catch(() => { authFailed=true;showStatus({kind:'auth-error',message:'Oturum yüklenemedi. Yeniden dene.'}); });
})();
