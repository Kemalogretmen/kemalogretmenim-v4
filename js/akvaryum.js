(async function () {
  'use strict';
  const C = window.AquariumCore, Motion = window.AquariumMotion;
  let KEY = 'kemal_class_aquarium_v1';
  const params = new URLSearchParams(location.search), childViewing = params.has('cocuk'), viewToken = params.get(childViewing ? 'cocuk' : 'izle');
  const viewing = params.has('izle') || childViewing, demoOnly = !viewing && params.get('demo') === '1';
  let shareRecord = null, shareQueue = Promise.resolve(), syncTimer;
  let cloud=null,cloudTimer,cloudBusy=false,cloudMessage='';
  const Audio = window.AquariumAudio;
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icon = name => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const image = id => '/assets/akvaryum/canlilar/web-v1/' + C.species(id).file.replace(/\.png$/,'.webp');
  // A transient image error must not leave an invisible creature. Retry once
  // with its original PNG, without changing the student's selected species.
  document.addEventListener('error', event => {
    const img=event.target,src=img?.getAttribute?.('src')||'';
    if(img?.tagName==='IMG' && src.startsWith('/assets/akvaryum/canlilar/web-v1/')) {
      img.src=src.replace('/web-v1/','/').replace(/\.webp$/,'.png');
    }
  },true);
  const background = id => '/assets/akvaryum/arka-planlar/' + (C.THEMES.find(t => t.id === id) || C.THEMES[0]).file;
  const filterText = value => String(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  function lockAccess(message) {
    document.body.classList.add('access-pending'); $('accessMessage').textContent = message;
    $('accessLinks').hidden = viewing;
  }
  if (params.has('veli') && !viewing) {
    lockAccess('Öğretmeninizin çocuğunuza özel verdiği veli kodunu girin.');
    $('accessLinks').hidden = true;
    const form=document.createElement('form'); form.className='parent-code-form';
    form.innerHTML='<label class="field">Veli izleme kodu<input name="code" required autocomplete="off" spellcheck="false" placeholder="Çocuğunuza özel kod veya bağlantı"></label><button class="button primary">Çocuğumun balığını izle</button><p class="settings-note">Kod yalnızca çocuğunuzun balığını açar. Besleme veya düzenleme yapılamaz.</p>';
    $('accessGate').append(form);
    form.addEventListener('submit',event=> { event.preventDefault(); let code=form.elements.code.value.trim();
      try { if(code.includes('://')) code=new URL(code).searchParams.get('cocuk') || ''; } catch(e) { code=''; }
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(code)) { $('accessMessage').textContent='Geçerli veli kodunu veya çocuğa özel bağlantıyı girin.'; return; }
      location.href=location.pathname+'?cocuk='+encodeURIComponent(code);
    });
    return;
  }
  let viewSnapshot = null;
  async function readView() {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(viewToken || '')) throw new Error('Geçersiz izleme bağlantısı.');
    const config = window.kemalSiteStore.getConfig(), controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(config.supabaseUrl + '/rest/v1/rpc/' + (childViewing ? 'view_aquarium_child' : 'view_aquarium'), { method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: viewToken }) });
      if (!response.ok) throw new Error('İzleme bağlantısına şu anda erişilemiyor.');
      const data = await response.json();
      if (!data || !Array.isArray(data.students)) throw new Error('Bu akvaryum izlemeye kapalı veya bağlantı yenilenmiş.');
      return data;
    } finally { clearTimeout(timeout); }
  }
  function viewState(data) {
    const cls = C.newClass(C.clean(data.name)); cls.theme = C.THEMES.some(t => t.id === data.theme) ? data.theme : 'reef';
    cls.students = data.students.slice(0,60).map((s,i) => ({ ...C.newStudent(C.clean(s.name), s.species), id: 'view-' + i, appearance:{egg:s.appearance?.egg===true,scale:Number.isFinite(s.appearance?.scale)?Math.max(.35,Math.min(1,s.appearance.scale)):1,trophy:s.appearance?.trophy===true}, publicMood: ['happy','sad','resting','ready','calm'].includes(s.mood) ? s.mood : 'calm', publicPoints: Number.isFinite(s.points) ? Math.max(0,s.points) : null }));
    if(!childViewing && data.teacher && typeof data.teacher.species==='string') cls.teacher={enabled:true,name:C.clean(data.teacher.name),species:C.species(data.teacher.species).id};
    return { version:1, classes:[cls], activeClassId:cls.id, settings:C.settingsOf({...data.settings, classPoints: !childViewing && data.settings?.classPoints === true}), publicClassPoints: !childViewing && Number.isFinite(data.classPoints) ? Math.max(0,data.classPoints) : null };
  }
  if (viewing) {
    document.body.classList.add('view-only');
    try { viewSnapshot = await readView(); } catch (e) { lockAccess(e.message); return; }
  } else if (!demoOnly) {
    try {
      await window.kemalUserAuth.ready();
      if(window.kemalUserAuth.getState().error) { lockAccess('Hesap bilgileri yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin; yeniden kayıt olmanız gerekmez.'); return; }
      const profile = window.kemalUserAuth.getProfile(), user = window.kemalUserAuth.getUser();
      if(user && profile?.role === 'teacher' && profile?.approval_status !== 'active') { lockAccess('Öğretmen hesabınız kayıtlı, ancak yönetici onayı bekliyor. Öğretmen panelinizden belge ve onay durumunu kontrol edebilirsiniz.'); return; }
      if (!user || profile?.role !== 'teacher' || profile?.approval_status !== 'active' || profile?.active === false) {
        lockAccess('Bu ekranı yalnızca onaylı öğretmen hesabı yönetebilir. Veli ve öğrenciler öğretmenin paylaştığı izleme bağlantısını kullanmalıdır.'); return;
      }
      KEY += '_' + user.id;
      window.addEventListener('kemal-user-auth-changed', () => {
        const authState=window.kemalUserAuth.getState(); if(!authState.ready || authState.error) return;
        if (window.kemalUserAuth.getUser()?.id !== user.id || window.kemalUserAuth.getProfile()?.active === false || window.kemalUserAuth.getProfile()?.role !== 'teacher' || window.kemalUserAuth.getProfile()?.approval_status !== 'active') location.reload();
      });
    } catch (e) { lockAccess('Öğretmen oturumu doğrulanamadı. Bağlantınızı kontrol edip yeniden açın.'); return; }
  }
  document.body.classList.remove('access-pending');
  let blockedStorage = false;
  let state;
  try { const raw = viewing || demoOnly ? null : localStorage.getItem(KEY); state = raw ? C.validate(JSON.parse(raw)) : C.initialState(); }
  catch (error) { state = C.initialState(); blockedStorage = true; }
  if (viewing) state = viewState(viewSnapshot);
  if (!viewing && !demoOnly && !blockedStorage && window.AquariumCloud) {
    cloud=window.AquariumCloud.create({client:window.kemalUserAuth.getClient(),ownerId:window.kemalUserAuth.getUser().id,storage:localStorage,key:KEY,project:window.AquariumSharing.snapshot,onStatus:message=>{cloudMessage=message;$('saveStatus').textContent=message;}});
    try { state=await cloud.boot(state);localStorage.setItem(KEY,JSON.stringify(state)); }
    catch(e){cloudMessage=e.message;$('saveStatus').textContent=cloudMessage;}
  }

  let demo = false, beforeDemo = null, selected = '', tab = 'students', today = C.dayKey(), toastTimer;
  let importedClasses = [], pendingRestore = null, confirmAction = null;
  const modal = $('modal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const swimmers = new Map();
  let frame = 0, lastTime = 0, width = 0, height = 0, inspectedId = '';
  let highlightTimer;
  const focusTimer = viewing ? null : window.AquariumTimer.create();
  let timerClassId = state.activeClassId, timerNotified = false;
  const classroom = () => state.classes.find(c => c.id === state.activeClassId) || state.classes[0];
  const student = () => classroom().students.find(s => s.id === selected);
  const day = s => C.ensureDay(s, classroom(), today);
  const ensureDays = () => { if (!viewing) classroom().students.forEach(day); };
  const fishMood = s => s.isTeacher ? {id:'calm',speed:.65,label:'Birlikte öğreniyoruz'} : viewing ? { id:s.publicMood, speed:({happy:1.1,sad:.3,resting:.18,ready:.7,calm:.6})[s.publicMood], symbol:'', label:'' } : C.mood(s,today);
  const score = s => s.isTeacher ? null : viewing ? s.publicPoints : C.earned(s);
  function queueShare(work) { shareQueue = shareQueue.catch(() => {}).then(work); return shareQueue; }
  function scheduleShare() {
    if (viewing || demo || demoOnly || blockedStorage || cloud?.isReady()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const classes = JSON.parse(JSON.stringify(state.classes)), settings = {...state.settings};
      queueShare(() => window.AquariumSharing.syncMany(classes,settings)).catch(e => { $('saveStatus').textContent = 'Yerel kayıt tamam. ' + e.message; });
    }, 500);
  }
  async function sharingModal() {
    if (demo || demoOnly) return toast('Paylaşım için öğretmen hesabınızla kendi sınıfınızı açın.');
    openModal('Veli kodları ve sınıf paylaşımı', '<p>Paylaşım durumu kontrol ediliyor…</p>');
    const cls=classroom(), id=cls.id;
    try {
      const results=await Promise.all([window.AquariumSharing.get(id),window.AquariumSharing.listOpen()]); shareRecord=results[0];
      const children=await window.AquariumSharing.childLinks(shareRecord?.id);
      if (!modal.open || id !== classroom().id) return;
      const link = new URL(location.pathname,location.origin); link.searchParams.set('izle', shareRecord?.token || '');
      const entry=new URL(location.pathname+'?veli=1',location.origin);
      const childRows=cls.students.map(student=> {
        const row=children.find(r=>r.student_id===student.id && r.enabled);
        const url=new URL(location.pathname,location.origin); if(row) url.searchParams.set('cocuk',row.token);
        return '<div class="child-share"><strong>'+esc(student.name)+'</strong>'+(row ? '<label class="field">Çocuğa özel veli kodu<input readonly value="'+esc(row.token)+'"></label><div class="settings-actions"><button class="button" data-action="copy-child" data-link="'+esc(url.href)+'">Bağlantıyı kopyala</button><button class="button" data-action="copy-child" data-link="'+esc(row.token)+'">Kodu kopyala</button><button class="button danger" data-action="disable-child" data-id="'+esc(row.id)+'">Kodu kapat</button></div>' : '<button class="button" data-action="enable-child" data-student="'+esc(student.id)+'">Veli kodu oluştur</button>')+'</div>';
      }).join('');
      openModal('Veli kodları ve sınıf paylaşımı','<p class="modal-intro">Her veliye kendi çocuğunun kodunu verin. Bu kod yalnızca o balığı açar; diğer öğrenciler, görev geçmişi ve sınıf puanı gösterilmez. Kodla izleyenler besleme veya düzenleme yapamaz.</p><p class="settings-note">Veli kod giriş adresi: <a href="'+esc(entry.href)+'">'+esc(entry.href)+'</a>. Kod özel bir erişim anahtarıdır; yalnızca ilgili veliyle paylaşın.</p><div class="child-shares">'+(childRows || '<p>Veli kodu oluşturmak için önce öğrenci ekleyin.</p>')+'</div><div class="settings-section"><h3>Tüm ziyaretçilere sınıfı göster</h3><p class="settings-note">Bu ayrı izin açılırsa sınıf bağlantısını alan herkes tüm balıkları görür. Veli kodları yine yalnızca tek çocuğu gösterir.</p><p class="share-state">'+(shareRecord?.enabled?'● Sınıfın tamamı izlemeye açık':'○ Sınıfın tamamı izlemeye kapalı')+'</p>'+(shareRecord?.enabled?'<label class="field">Tüm sınıf bağlantısı<input id="shareLink" readonly value="'+esc(link.href)+'"></label><div class="settings-actions"><button class="button" data-action="copy-share">Sınıf bağlantısını kopyala</button><button class="button danger" data-action="disable-share">Tüm sınıf paylaşımını kapat</button></div>':'<button class="button primary" data-action="enable-share">Tüm ziyaretçilere sınıfı aç</button>')+'<p class="settings-note">Kapatılan kod ve bağlantılar açık izleyici ekranında en geç yaklaşık 15 saniyede kapanır. Yeniden açıldığında yeni kod oluşur.</p></div>'+results[1].filter(row=>row.local_id!==id).map(row=>'<div class="task-template"><span>'+esc(row.snapshot?.name || 'Sınıf')+'</span><button class="button danger" data-action="disable-other-share" data-id="'+esc(row.id)+'">Sınıf paylaşımını kapat</button></div>').join(''));
    } catch(e) { if(modal.open) openModal('Paylaşım kullanılamıyor','<p class="modal-intro">'+esc(e.message)+'</p>'); }
  }
  function renderSoundControl() {
    const button=$('soundToggle'); if(!button) return;
    const playing=Audio.isPlaying?.() === true;
    button.textContent=playing?'Ⅱ':'▶'; button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing?'Sesi duraklat':'Sesi başlat'); button.title=playing?'Sesi duraklat':'Sesi başlat';
  }
  window.addEventListener('aquarium-audio-change',renderSoundControl);
  function soundSettings() {
    const mixer = ['music','nature'].map(kind=>'<section class="mixer-group"><h3>'+(kind==='music'?'Müzikler':'Doğanın sesleri')+'</h3><div class="mixer-grid">'+Audio.catalogue.filter(t=>t.kind===kind).map(t=>{
      const layer=state.settings.mix.find(x=>x.id===t.id),level=Math.round((layer?.volume ?? (kind==='music'?.7:.25))*100);
      return '<div class="mixer-channel '+(layer?'is-active':'')+'"><label class="mixer-title"><span aria-hidden="true">'+t.emoji+'</span><strong>'+esc(t.name)+'</strong><input type="checkbox" data-mix-enable="'+t.id+'" aria-label="'+esc(t.name)+' aç" '+(layer?'checked':'')+'></label><label class="mixer-level">Ses düzeyi <output id="mixValue-'+t.id+'">%'+level+'</output><input type="range" min="0" max="100" value="'+level+'" data-mix-volume="'+t.id+'" aria-label="'+esc(t.name)+' ses düzeyi" '+(!layer?'disabled':'')+'></label></div>';
    }).join('')+'</div></section>').join('');
    return '<div class="sound-studio"><p class="modal-intro">Bir müzik seçin, üzerine hafif yağmur ya da kuş sesi ekleyin. Her sesi ayrı ayarlayabilirsiniz.</p><div class="mixer-master"><p id="musicStatus" role="status">'+(Audio.isPlaying()?'Çalıyor: '+esc(Audio.describe()):'Sesleri seçin ve karışımı başlatın.')+'</p><div class="settings-actions"><button class="button primary" data-action="play-sound">▶ Karışımı başlat</button><button class="button" data-action="pause-mix">Ⅱ Duraklat</button><button class="button" data-action="stop-sound">Durdur</button></div><label class="field">Genel ses düzeyi<input id="volumeRange" type="range" min="0" max="100" value="'+Math.round(state.settings.volume*100)+'"></label></div>'+mixer+'<section class="mixer-favorites"><h3>★ Favori karışımlarım</h3><form id="mixFavoriteForm" class="inline-form"><label class="field">Karışım adı<input name="name" maxlength="60" required placeholder="Örn. Yağmurlu kitap saati"></label><button class="button primary" type="submit">Favorilere kaydet</button></form><p id="mixError" class="form-error" role="alert"></p>'+state.settings.favorites.map(f=>'<div class="mix-favorite"><div><strong>'+esc(f.name)+'</strong><small>'+f.mix.map(t=>esc(Audio.titles[t.id])).join(' + ')+'</small></div><div class="settings-actions"><button class="button" data-action="load-mix" data-id="'+f.id+'">▶ Çal</button><button class="button subtle" data-action="rename-mix" data-id="'+f.id+'">Adlandır</button><button class="button subtle" data-action="delete-mix" data-id="'+f.id+'">Sil</button></div></div>').join('')+'<p class="settings-note">Favoriler öğretmen hesabınıza kaydedilir ve akvaryum yedeğine dahil edilir. En fazla 24 karışım saklanabilir.</p></section><label class="toggle-row">Beslerken küçük bir melodi çal<input id="feedSoundToggle" type="checkbox" '+(state.settings.feedSound?'checked':'')+'></label><p class="settings-note">Sesler otomatik başlamaz. Nota altındaki düğme bütün karışımı duraklatır veya sürdürür. Sekme değiştirirken çalmaya devam eder.</p><p class="music-credit">Müzikler: Kevin MacLeod · CC BY 4.0. Doğa kayıtları: Eric Matyas / soundimage.org, isaiah658, Ylmir ve RandomMind. <a href="/assets/akvaryum/muzikler/LISANS.md" target="_blank" rel="noopener">Eserler, düzenlemeler ve lisanslar</a></p></div>';
  }
  async function playCurrentMix() {
    Audio.setVolume(state.settings.volume);
    if(!state.settings.mix.length){toast('Önce en az bir ses seçin.');return;}
    try {await Audio.playMix(state.settings.mix);}catch(e){toast(e.message);}
  }

  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible'); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
  function storageWarning(message) { $('storageWarning').hidden = false; $('storageWarning').textContent = message; $('saveStatus').textContent = 'Kaydedilemedi · Yedek almayı unutmayın.'; }
  function save() {
    if (viewing) return;
    if (demoOnly) { $('saveStatus').textContent = 'Örnek sınıf · Değişiklikler kaydedilmez.'; return; }
    if (demo) { $('saveStatus').textContent = 'Örnek sınıf · Değişiklikler kaydedilmez.'; return; }
    if (blockedStorage) { storageWarning('Önceki kayıt okunamadı. Üzerine yazılmadı. Ayarlar → Mevcut kaydı indir ile kurtarma kopyası alın; ardından bir yedek yükleyin.'); return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); $('storageWarning').hidden = true; $('saveStatus').textContent = cloud ? 'Cihaza kaydedildi · Hesabınızla eşitleniyor…' : 'Bu tarayıcıya kaydedildi · Ayarlardan yedek alabilirsiniz.';
      if(cloud){cloud.markDirty();clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloud,600);} }
    catch (error) { storageWarning('Tarayıcı kaydı yapılamadı. Yaptığınız değişiklikleri kaybetmemek için Ayarlar → Yedek indir seçeneğini kullanın.'); }
  }
  async function flushCloud() {
    clearTimeout(cloudTimer);
    if(!cloud||viewing||demo||demoOnly||blockedStorage)return;
    cloudBusy=true;
    try {if(!cloud.isReady()){state=await cloud.boot(state);localStorage.setItem(KEY,JSON.stringify(state));selected='';ensureDays();render();}else await cloud.save(state);}
    catch(e){cloudMessage=e.message;$('saveStatus').textContent=cloudMessage;}
    finally{cloudBusy=false;}
  }
  async function refreshCloud() {
    if(!cloud||cloudBusy||demo||modal.open||document.hidden)return;
    cloudBusy=true;
    try {const updated=await cloud.refresh(state);if(updated){state=updated;localStorage.setItem(KEY,JSON.stringify(state));selected='';ensureDays();render();$('saveStatus').textContent='Hesaptaki son kayıt alındı.';}}
    catch(e){$('saveStatus').textContent=e.message;}
    finally{cloudBusy=false;}
  }
  function cloudControls(){return '<p class="settings-note">'+esc(cloudMessage||'Sınıflar, öğrenciler, görevler ve ses favorileri öğretmen hesabınıza kaydedilir. Aynı hesapla başka cihazda açabilirsiniz. Çevrimdışı değişiklikler bu cihazda tutulur; çakışan kayıtlar otomatik ezilmez.')+'</p><div class="settings-actions"><button class="button" data-action="retry-cloud">Şimdi eşitle</button>'+(cloud?.isConflict()?'<button class="button" data-action="use-cloud">Hesaptaki kaydı kullan</button><button class="button" data-action="use-local">Bu cihazdaki kaydı kullan</button>':'')+'<button class="button" data-action="export-recovery">Korunan yerel kopyayı indir</button><button class="button" data-action="export-cloud-recovery">Korunan hesap kopyasını indir</button></div>';}
  function commit() { save(); render(); scheduleShare(); }
  function openModal(title, html, eyebrow = 'SINIF AKVARYUMU') {
    modal.classList.remove('behavior-modal', 'student-day-modal');
    $('modalTitle').textContent = title; $('modalEyebrow').textContent = eyebrow; $('modalContent').innerHTML = html;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
    const field = modal.querySelector('[autofocus]');
    if (field) field.focus();
  }
  function releaseFish() { inspectedId = ''; swimmers.forEach(f => { f.hover = false; f.keyboard = false; f.pressed = false; f.el.classList.remove('is-selected'); }); }
  function closeModal() { modal.close(); releaseFish(); confirmAction = null; pendingRestore = null; }
  function confirm(title, description, callback) {
    confirmAction = callback;
    openModal(title, '<p class="modal-intro">' + esc(description) + '</p><div class="form-actions"><button class="button" data-action="close">Vazgeç</button><button class="button danger" data-action="confirm">Onayla</button></div>');
  }
  function speciesPicker(current) {
    return '<fieldset class="species-group"><legend>Deniz dostunu seç · ' + C.SPECIES.length + ' canlı</legend><label class="species-search">' + icon('search') + '<input type="search" id="speciesSearch" placeholder="Deniz canlısı ara…" aria-label="Deniz canlısı ara" maxlength="60"></label><div class="species-grid">' + C.SPECIES.map(s => '<label class="species-card" data-species-name="' + esc(s.name) + '"><input type="radio" name="species" value="' + s.id + '" ' + (s.id === current ? 'checked' : '') + ' required><img src="' + image(s.id) + '" alt="" width="640" height="426" decoding="async"><strong>' + s.name + '</strong><small>' + s.detail + '</small></label>').join('') + '</div><p class="species-result-count" id="speciesResults" role="status">' + C.SPECIES.length + ' canlı · Seçili: ' + C.species(current).name + '</p></fieldset>';
  }
  function filterSpecies() {
    const field = $('speciesSearch'); if (!field) return;
    const query = filterText(field.value.trim()); let count = 0;
    modal.querySelectorAll('.species-card').forEach(card => { card.hidden = !filterText(card.dataset.speciesName).includes(query); if (!card.hidden) count++; });
    const checked = modal.querySelector('[name="species"]:checked');
    $('speciesResults').textContent = (count ? count + ' canlı' : 'Bu isimde canlı bulunamadı.') + (checked ? ' · Seçili: ' + C.species(checked.value).name : '');
  }
  function addModal(setup = false) {
    if (demo) return toast('Öğrenci eklemek için önce kendi sınıfınıza dönün.');
    openModal(setup ? 'Sınıfımızla tanışalım' : 'Yeni deniz dostları', '<p class="modal-intro">Öğrencilerinizi ekleyin. Her öğrenci daha sonra “Balığımı seç” ekranından kendi canlısını seçebilir.</p><form id="addForm">' + (setup ? '<label class="field">Sınıf adı<input name="className" value="' + esc(classroom().name) + '" maxlength="80" required autofocus></label>' : '') + '<label class="field">Öğrenci adları<textarea name="names" placeholder="Her satıra bir öğrenci adı yazın" maxlength="5000" required ' + (!setup ? 'autofocus' : '') + '></textarea><span class="field-hint">Tek öğrenci veya tüm sınıfı ekleyebilirsiniz. Sınıf başına en fazla 60 öğrenci.</span></label>' + speciesPicker('clown') + '<p class="form-error" id="formError" role="alert"></p><div class="form-actions"><button type="button" class="button subtle" data-action="import-class">Sınıfım & Çark’tan al</button><button class="button primary" type="submit">Akvaryuma ekle ' + icon('plus') + '</button></div></form>');
  }
  function chooseModal(id = selected) {
    if (!classroom().students.length) return addModal();
    const s = classroom().students.find(x => x.id === id) || classroom().students[0];
    openModal('Benim deniz dostum', '<p class="modal-intro">Önce adını, sonra birlikte yolculuğa çıkacağın canlıyı seç. İstediğin zaman değiştirebilirsin.</p><form id="chooseForm"><label class="field">Ben kimim?<select name="studentId" id="chooseStudent">' + classroom().students.map(x => '<option value="' + x.id + '" ' + (s.id === x.id ? 'selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' + speciesPicker(s.species) + '<div class="form-actions"><button type="submit" class="button primary">Bu benim deniz dostum ' + icon('heart') + '</button></div></form>', 'SENİN SEÇİMİN, SENİN DOSTUN');
  }
  function themesModal() {
    openModal('Bugün nereye dalalım?', '<p class="modal-intro">Sınıfınızın dünyasını değiştirin. Her ortamda aynı deniz dostları sizinle.</p><div class="theme-grid">' + C.THEMES.map(t => '<button class="theme-card" data-action="theme" data-theme="' + t.id + '" aria-pressed="' + (classroom().theme === t.id) + '"><img src="' + background(t.id) + '" alt="' + t.name + '"><strong>' + t.name + '</strong><small>' + t.description + '</small></button>').join('') + '</div>');
  }
  function settingsModal() {
    openModal('Sınıfın kontrolü sende', '<form id="renameClassForm"><div class="inline-form"><label class="field">Sınıf adı<input name="name" value="' + esc(classroom().name) + '" required maxlength="80"></label><button class="button" type="submit">Adı kaydet</button></div></form><div class="settings-section"><h3>Öğrenciler ve sorumluluklar</h3><div class="settings-actions"><button class="button" data-action="activities">Sınıf etkinlikleri</button><button class="button" data-action="manage-panel">Sınıf yönetimi</button><button class="button" data-action="add">' + icon('plus') + 'Öğrenci ekle</button><button class="button" data-action="import-class">Sınıfım & Çark’tan al</button><button class="button" data-action="tasks">Görevleri düzenle</button><button class="button" data-action="growth">Yumurta ve büyüme hedefleri</button><button class="button" data-action="teacher-fish">Öğretmen balığı</button><button class="button" data-action="new-class">Yeni sınıf</button></div></div><div class="settings-section"><h3>Akvaryum görünümü</h3><button class="button" data-action="themes">Arka planı değiştir</button><label class="toggle-row">Balıkların üzerinde toplam puanlarını göster<input id="pointsToggle" type="checkbox" ' + (state.settings.points ? 'checked' : '') + '></label><label class="toggle-row">Sınıf puanlarını göster · İstiridye ve inci<input id="classPointsToggle" type="checkbox" ' + (state.settings.classPoints ? 'checked' : '') + '></label><label class="toggle-row">Açlık uyarısını simge yerine yazıyla göster<input id="hungerTextToggle" type="checkbox" ' + (state.settings.hungerText ? 'checked' : '') + '></label><label class="toggle-row">Seyrek emoji sohbetleri<input id="chatToggle" type="checkbox" ' + (state.settings.chat ? 'checked' : '') + '></label><label class="toggle-row">Öğrenci adlarını göster · Kapatınca isimsiz yüzerler<input id="namesToggle" type="checkbox" ' + (state.settings.names ? 'checked' : '') + '></label><label class="toggle-row">Canlıların yüzmesi ve su hareketleri<input id="motionToggle" type="checkbox" ' + (state.settings.motion ? 'checked' : '') + '></label>' + (reduced.matches ? '<p class="settings-note">Cihazınızda hareketi azaltma tercihi açık; yüzme animasyonları durduruldu.</p>' : '') + '</div><div class="settings-section"><h3>Paylaşım</h3><button class="button primary" data-action="sharing">Veli kodları ve sınıf paylaşımı</button></div>' + soundSettings() + '<div class="settings-section"><h3>Kayıt ve eşitleme</h3>' + cloudControls() + '<button class="button" data-action="legacy-import">Eski sürümdeki sınıflarımı aktar</button><p class="settings-note">Kayıt durumunu ekranın altından takip edin. “Hesabınıza kaydedildi” yazısı bulut kaydını doğrular. Yedek indir seçeneği ayrıca bir kopya saklamanızı sağlar. Ziyaretçiler yalnızca izin verdiğiniz görünümü izler; görev geçmişine veya yönetim yetkisine erişemez.</p><div class="settings-actions"><button class="button" data-action="export">' + icon('download') + 'Yedek indir</button><label class="button">Yedek yükle<input type="file" id="backupFile" accept=".json,application/json" class="sr-only"></label>' + (blockedStorage ? '<button class="button" data-action="export-raw">Mevcut kaydı indir</button>' : '') + '</div></div><div class="settings-section"><button class="button subtle" data-action="help">Nasıl çalışır?</button></div>');
  }
  function growthModal() {
    const g = classroom().growth;
    openModal('Her balığın kendi yolculuğu', '<form id="growthForm"><label class="field">Başlangıç biçimi<select name="mode"><option value="normal" '+(!g?.enabled?'selected':'')+'>Normal başlat · Balıklar hazır</option><option value="growth" '+(g?.enabled?'selected':'')+'>Hedef belirleyerek başlat · Yumurtadan büyümeye</option></select></label><p class="modal-intro">Öğrenci canlısını seçer. İlk hedefte yumurta açılır; sonraki her hedefte balık yaklaşık %10 büyür. Onuncu hedefte kendi doğal boyuna ulaşır ve adının yanına kişisel yolculuk kupası gelir.</p><div class="growth-thresholds" id="growthThresholds">'+(g?.thresholds || C.defaultThresholds()).map((n,i)=>'<label class="field">'+(i+1)+'. hedef · '+(i===0?'Yumurtadan çıkış':i===9?'Yetişkin ve kupa':'Büyüme')+'<input name="target'+i+'" type="number" min="1" max="1000000" step="1" required value="'+n+'"></label>').join('')+'</div><p id="formError" class="form-error" role="alert"></p><button class="button primary full">Seçili biçimi uygula</button></form><div class="settings-section"><h3>Nasıl kullanılır?</h3><ol class="growth-instructions"><li>Önce davranışları ve puanlarını belirleyin. Hedef puanlarını artan sırada girin.</li><li>Hedefler her öğrencinin kendi toplam puanına uygulanır; sınıf toplamına uygulanmaz. Mevcut puanlar korunur, sıfırlanmaz.</li><li>Küçük, ulaşılabilir adımlarla başlayın; gelişimi öğrencinin kendi önceki çabasıyla konuşun. Bu bir başarı sıralaması değildir.</li><li>Açlık büyümeyi geri almaz; izinli günlere ceza puanı yazılmaz. Puan düzeltmeleri ve hedef değişiklikleri görünür büyüklüğü yeniden hesaplar.</li><li>Normal moda dönmek puanları ve hedefleri silmez. İzleme bağlantısında yumurta ve büyüme görünür; sayısal puanlar öğretmenin görünürlük ayarına bağlıdır.</li></ol><p class="settings-note">Yumurta ve büyüme bir oyun metaforudur; tüm deniz canlılarının gerçek yaşam döngüsünü temsil etmez. Kupa “sınıfın en iyisi” anlamına gelmez.</p></div>');
    updateGrowthFields();
  }
  function updateGrowthFields() {
    const form=$('growthForm'); if(!form) return;
    const enabled=form.querySelector('[name="mode"]').value==='growth';
    $('growthThresholds').hidden=!enabled;
    form.querySelectorAll('.growth-thresholds input').forEach(input=>input.disabled=!enabled);
  }
  function teacherFishModal() {
    const t=classroom().teacher;
    openModal('Öğretmen de deniz yolculuğunda', '<p class="modal-intro">Öğretmen balığı sınıfa eşlik eder; öğrenci sayısına, puanlara ve sınıf hedeflerine dahil edilmez. Yalnızca öğretmenin sınıf ekranında görünür.</p><form id="teacherFishForm"><label class="toggle-row">Öğretmen balığını göster<input name="enabled" type="checkbox" '+(t?.enabled?'checked':'')+'></label><label class="field">Görünen ad<input name="name" maxlength="80" required value="'+esc(t?.name || 'Öğretmenim')+'"></label>'+speciesPicker(t?.species || 'turtle')+'<button class="button primary full">Kaydet</button></form>');
  }
  function goalCard() {
    const cls = classroom(), g = cls.goal, p = C.goalProgress(cls);
    if (!g || !g.enabled) return '';
    return '<section class="shared-goal"><span class="eyebrow">BİRLİKTE BAŞARIYORUZ</span><h3>' + esc(g.title) + '</h3><p>' + (p.complete ? 'Hedefe birlikte ulaştık!' : 'Her küçük katkıyla ilerliyoruz.') + '</p><div class="progress-copy"><span>Hedef başladığından beri</span><strong>' + p.points.toLocaleString('tr-TR') + ' / ' + p.target.toLocaleString('tr-TR') + ' puan</strong></div><div class="progress-track" role="progressbar" aria-label="Ortak sınıf hedefi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.percent + '"><span style="width:' + p.percent + '%"></span></div></section>';
  }
  function activitiesModal() {
    releaseFish();
    openModal('Birlikte güzel adımlar', '<p class="modal-intro">' + esc(classroom().name) + ' · Sınıf etkinliklerini tek yerden yönetin.</p>' + goalCard() + '<div class="activity-grid"><button class="activity-card" data-action="group-reward">' + icon('heart') + '<strong>Birlikte ödüllendir</strong><span>Davranışı ve öğrencileri seç, tek işlemle puan ver ve besle.</span></button><button class="activity-card" data-action="goal">' + icon('leaf') + '<strong>Ortak sınıf hedefi</strong><span>Birlikte biriktirilen puanlarla ortak bir hedefe ilerleyin.</span></button><button class="activity-card" data-action="timer">' + icon('clock') + '<strong>Odaklanma sayacı</strong><span>Okuma, çalışma veya sınıf geçişleri için kısa bir süre belirleyin.</span></button></div><p class="settings-note">Puanlar yalnızca öğretmenin seçtiği olumlu davranışlarla verilir. Ortak hedefte bireysel sıralama yapılmaz.</p>');
  }
  function groupRewardModal() {
    ensureDays();
    openModal('Birlikte ödüllendir', '<button class="detail-back" data-action="activities">← Sınıf etkinlikleri</button><p class="modal-intro">Gözlemlediğiniz olumlu davranışı ve bu davranışı tamamlayan öğrencileri seçin.</p><form id="groupRewardForm" data-class-id="' + classroom().id + '" data-date="' + today + '"><label class="field">Olumlu davranış<select id="groupTask" name="taskId" required>' + classroom().tasks.map(t => '<option value="' + t.id + '">' + esc(t.title) + ' · +' + C.taskPoints(t) + ' puan</option>').join('') + '</select></label><div class="settings-actions"><button class="button subtle" type="button" data-action="group-select">Uygun öğrencileri seç</button><button class="button subtle" type="button" data-action="group-clear">Seçimi kaldır</button></div><div id="groupStudents" class="group-students"></div><p id="groupSummary" class="settings-note" role="status"></p><button id="groupSubmit" class="button primary full" type="submit" disabled>Puan ver ve besle</button></form><p class="settings-note">Bugün gelmeyenler seçilemez. Aynı davranışı yeniden ödüllendirebilirsiniz; her ödülü Puan geçmişi bölümünden ayrı ayrı geri alabilirsiniz.</p>' + (!classroom().tasks.length ? '<button class="button" data-action="tasks">Önce davranış ekle</button>' : ''));
    renderGroupStudents();
  }
  function renderGroupStudents() {
    const taskId = $('groupTask').value;
    $('groupStudents').innerHTML = classroom().students.map(s => {
      const d = day(s), t = C.behaviorChoices(s, classroom(), today).find(t => t.id === taskId), eligible = !!t && !d.absent;
      return '<label class="group-student' + (eligible ? '' : ' unavailable') + '"><input type="checkbox" name="studentId" value="' + s.id + '" ' + (eligible ? '' : 'disabled') + '><img src="' + image(s.species) + '" alt=""><span><strong>' + esc(s.name) + '</strong><small>' + (d.absent ? 'Bugün izinli' : !t ? 'Bu davranış bugün yok' : '+' + C.taskPoints(t) + ' puan' + (t.count ? ' · Bugün ' + t.count + ' kez' : '')) + '</small></span></label>';
    }).join('') || '<p class="settings-note">Önce sınıfınıza öğrenci ekleyin.</p>';
    updateGroupSummary();
  }
  function updateGroupSummary() {
    const inputs = [...modal.querySelectorAll('[name="studentId"]')].filter(el => el.checked && !el.disabled), taskId = $('groupTask').value;
    const points = inputs.reduce((sum,el) => sum + C.taskPoints(C.behaviorChoices(classroom().students.find(s=>s.id===el.value), classroom(), today).find(t=>t.id===taskId)),0);
    $('groupSummary').textContent = inputs.length ? inputs.length + ' öğrenci seçildi · Toplam +' + points + ' puan.' : 'Ödüllendirmek istediğiniz öğrencileri seçin.';
    $('groupSubmit').disabled = !inputs.length;
    $('groupSubmit').textContent = inputs.length ? inputs.length + ' öğrenciye puan ver ve besle' : 'Puan ver ve besle';
  }
  function goalModal(fresh = false) {
    const goal = fresh ? null : classroom().goal;
    openModal('Ortak sınıf hedefi', '<button class="detail-back" data-action="activities">← Sınıf etkinlikleri</button>' + (!fresh ? goalCard() : '') + '<p class="modal-intro">Örneğin birlikte kitap okuma saati veya bir sınıf oyunu için hedef belirleyin. Yeni hedef sıfırdan ilerler; öğrencilerin toplam puanları ve sınıf incisi korunur.</p><form id="goalForm" data-new="' + !goal + '" data-class-id="' + classroom().id + '"><label class="field">Birlikte neye ulaşacağız?<input name="title" required maxlength="120" placeholder="Örn. Birlikte hikâye saati" value="' + esc(goal?.title || '') + '"></label><label class="field">Hedef puan<input type="number" name="target" min="1" max="1000000" step="1" required value="' + (goal?.target || 50) + '"></label><label class="toggle-row">Hedefi etkinlikler ekranında göster<input name="enabled" type="checkbox" ' + (goal?.enabled !== false ? 'checked' : '') + '></label><button class="button primary full" type="submit">' + (goal ? 'Hedefi güncelle' : 'Yeni hedefi başlat') + '</button><p id="formError" class="form-error" role="alert"></p></form>' + (goal ? '<p class="settings-note">Hedefin adını veya puanını değiştirmek biriken ilerlemeyi sıfırlamaz.</p><button class="button subtle" data-action="new-goal">Yeni bir hedef belirle</button>' : classroom().goal ? '<p class="settings-note">Kaydettiğinizde önceki hedefin yerini alır. Öğrenci kayıtları ve toplam puanlar değişmez.</p>' : '') + '<p class="settings-note">İlerleme, hedefin başlangıcından beri mevcut öğrencilerin kazandığı net puandır. Günlük kayıt düzeltmeleri ilerlemeye yansır. Hedef ve başlangıç bilgileri yedeğe dahil edilir.</p>');
  }
  function timerModal() {
    openModal('Odaklanma sayacı', '<button class="detail-back" data-action="activities">← Sınıf etkinlikleri</button><div id="timerActive" class="focus-timer" hidden><p id="timerTitle"></p><strong id="timerClock" role="timer" aria-live="off"></strong><p id="timerState"></p><div class="settings-actions"><button class="button" data-action="timer-pause">Duraklat</button><button class="button primary" data-action="timer-resume">Devam et</button><button class="button subtle" data-action="timer-reset">Sıfırla</button></div></div><form id="timerForm"><label class="field">Etkinlik adı<input name="title" required maxlength="80" value="Kitap okuma"></label><label class="field">Süre (dakika)<input id="timerMinutes" name="minutes" type="number" min="1" max="60" step="1" required value="10"></label><div class="timer-presets">' + [3,5,10,15,20].map(n=>'<button class="button subtle" type="button" data-action="timer-preset" data-minutes="'+n+'">'+n+' dk</button>').join('') + '</div><button class="button primary full" type="submit">Sayacı başlat</button><p id="formError" class="form-error" role="alert"></p></form><p class="settings-note">Süre bitince sessiz bir bildirim görünür; otomatik puan verilmez. Müzik nota düğmesinden ayrıca seçilir. Sayaç bu sekmede çalışır; sayfa yenilenince veya sınıf değişince sıfırlanır. Sayaç akvaryumun içinde ve tam ekranda görünür; balıklar yüzmeye devam eder. Kontroller için saat düğmesine dönün. Bu görünüm katmanlı bir derinlik efektidir.</p>');
    updateTimer();
  }
  function updateTimer() {
    if (!focusTimer) return;
    if (timerClassId !== classroom().id) { focusTimer.reset(); timerClassId = classroom().id; timerNotified = false; }
    const value = focusTimer.read(), text = window.AquariumTimer.format(value.remaining);
    const scene=$('sceneTimer');
    if(scene) {
      scene.hidden=value.status==='idle'; scene.dataset.status=value.status;
      $('sceneTimerClock').textContent=value.status==='done'?'✓':text;
      $('sceneTimerTitle').textContent=value.title;
      scene.setAttribute('aria-label',value.title+' · '+(value.status==='done'?'Süre tamamlandı':text)+(value.status==='paused'?' · Duraklatıldı':''));
    }
    const badge = $('activityTimerBadge'); badge.hidden = value.status === 'idle'; badge.textContent = value.status === 'done' ? '✓' : text;
    const button = $('activitiesButton'); button.setAttribute('aria-label','Sınıf etkinlikleri' + (value.status === 'idle' ? '' : ' · ' + (value.status === 'done' ? 'Süre tamamlandı' : text + (value.status === 'paused' ? ' duraklatıldı' : ' kaldı'))));
    if ($('timerClock')) {
      $('timerForm').hidden = value.status !== 'idle'; $('timerActive').hidden = value.status === 'idle';
      $('timerTitle').textContent = value.title; $('timerClock').textContent = text;
      $('timerState').textContent = ({running:'Odaklanma zamanı',paused:'Duraklatıldı',done:'Süre tamamlandı. Hazır olduğunuzda devam edebilirsiniz.',idle:''})[value.status];
      modal.querySelector('[data-action="timer-pause"]').hidden = value.status !== 'running';
      modal.querySelector('[data-action="timer-resume"]').hidden = value.status !== 'paused';
    }
    if (value.status === 'done' && !timerNotified) { timerNotified = true; toast(value.title + ': Süre tamamlandı.'); }
  }
  function taskIconPicker(value) {
    return '<fieldset class="task-icon-picker"><legend>Görev simgesi</legend><div class="task-icon-options">'+C.TASK_ICONS.map(symbol=>'<button type="button" class="task-icon-option" data-action="pick-task-icon" data-icon="'+esc(symbol)+'" aria-label="'+esc(symbol)+' simgesini seç" aria-pressed="'+(value===symbol)+'">'+symbol+'</button>').join('')+'</div><label class="field">Kendi simgen / emoji<input name="icon" maxlength="16" placeholder="Örn. 🐠" value="'+esc(value || '')+'"></label></fieldset>';
  }
  function tasksModal() {
    openModal('Olumlu davranışlar ve puanları','<p class="modal-intro">Görev adını, simgesini ve puanını düzenleyebilirsiniz. Kaydedilen değişiklikler bugünkü bekleyen ve yeni görevlere uygulanır. Kazanılmış puanlar ve geçmiş kayıtlar korunur.</p><div class="task-edit-list">'+classroom().tasks.map(t=>'<details class="task-editor"><summary><span>'+esc(t.icon || behaviorSymbol(t.title))+'</span><strong>'+esc(t.title)+'</strong><b>+'+C.taskPoints(t)+'</b><span>Düzenle</span></summary><form class="task-points-form" data-task-id="'+t.id+'"><label class="field">Görev adı<input name="title" maxlength="120" required value="'+esc(t.title)+'"></label>'+taskIconPicker(t.icon || behaviorSymbol(t.title))+'<label class="field">Puan<input name="points" type="number" min="1" max="1000" step="1" required value="'+C.taskPoints(t)+'"></label><div class="settings-actions"><button type="submit" class="button primary">Değişiklikleri kaydet</button><button type="button" class="button subtle" data-action="remove-task" data-id="'+t.id+'">Kaldır</button></div></form></details>').join('')+'</div><form id="taskForm" class="new-task-form"><h3>Yeni davranış ekle</h3><label class="field">Yeni olumlu davranış<input name="title" maxlength="120" placeholder="Örn. Arkadaşıma yardım ettim" required></label>'+taskIconPicker('⭐')+'<label class="field">Puan<input name="points" type="number" min="1" max="1000" step="1" placeholder="Örn. 5" required></label><button type="submit" class="button primary">Davranış ekle</button></form><p id="formError" class="form-error" role="alert"></p><p class="settings-note">Kaldırılan davranış bugünkü ve geçmiş kayıtlarda kalır; yarından itibaren verilmez.</p>');
  }
  function lastFeeding(s) {
    const last = s.feeds.reduce((n,f) => Math.max(n,f.at),0);
    if (!last) return 'Henüz beslenmedi';
    const days = Math.max(0,Math.floor((Date.now()-last)/86400000));
    return days ? days + ' gün önce' : 'Son 24 saat içinde';
  }
  function studentFacts(s) {
    const d = day(s), daily = d.absent ? 0 : d.tasks.reduce((n,t) => n+(t.status==='done'?C.taskPoints(t):0),0);
    return '<div class="student-facts"><div><small>Bugünkü puan</small><strong>+' + daily + '</strong></div><div><small>Toplam puan</small><strong>' + C.earned(s).toLocaleString('tr-TR') + '</strong></div><div><small>Son besleme</small><strong>' + lastFeeding(s) + '</strong></div></div>';
  }
  function finderModal() {
    inspectedId = '';
    openModal('Öğrencini bul', '<label class="field">Öğrenci adı<input id="fishFinder" type="search" autocomplete="off" placeholder="İsim yaz…" autofocus></label><p class="settings-note">Balığı akvaryumda belirginleştirin veya davranış penceresini doğrudan açın.</p><div id="finderResults" class="finder-results"></div><p id="finderCount" class="settings-note" role="status"></p>');
    renderFinder();
  }
  function renderFinder() {
    const query=filterText($('fishFinder').value), students=classroom().students.filter(s=>filterText(s.name).includes(query));
    $('finderResults').innerHTML=students.map(s=>'<div class="finder-row"><img src="'+image(s.species)+'" alt=""><strong>'+esc(s.name)+'</strong><button class="button subtle" data-action="locate-fish" data-id="'+s.id+'" aria-label="'+esc(s.name)+' adlı öğrencinin balığını bul">Bul</button><button class="button" data-action="fish-behaviors" data-id="'+s.id+'" aria-label="'+esc(s.name)+' adlı öğrencinin davranışlarını aç">Aç</button></div>').join('');
    $('finderCount').textContent=students.length ? students.length+' öğrenci bulundu.' : 'Bu isimde öğrenci bulunamadı.';
  }
  function highlightFish(id) {
    clearTimeout(highlightTimer);
    swimmers.forEach(f=>{f.el.classList.remove('is-found'); f.foundUntil=0;});
    const fish=swimmers.get(id); if(!fish) return;
    fish.el.classList.add('is-found'); fish.foundUntil=performance.now()+2500;
    fish.el.scrollIntoView?.({block:'nearest',behavior:'auto'});
    highlightTimer=setTimeout(()=>{fish.el.classList.remove('is-found');fish.foundUntil=0;},2500);
  }
  function behaviorSymbol(title) {
    const text = filterText(title);
    if (/kitap|oku/.test(text)) return '📖';
    if (/yardim|paylas|arkadas/.test(text)) return '💙';
    if (/odev|calis|ders/.test(text)) return '✏️';
    if (/temiz|duzen|cevre/.test(text)) return '🌿';
    return '⭐';
  }
  function behaviorModal() {
    const s = student(); if (!s) return;
    inspectedId = s.id;
    const d = day(s), mood = C.mood(s, today);
    openModal(s.name, '<div class="behavior-profile"><img src="' + image(s.species) + '" alt="' + C.species(s.species).name + '"><div><span class="profile-species">' + C.species(s.species).name + '</span><span class="profile-mood">' + esc(mood.label) + '</span></div></div>' + studentFacts(s) + (classroom().growth?.enabled ? '<p class="growth-summary">Kendi yolculuğum · '+C.growth(s,classroom()).stage+'/10 hedef'+(C.growth(s,classroom()).next ? ' · Sonraki hedef '+C.growth(s,classroom()).next+' toplam puan' : ' · Yolculuk tamamlandı 🏆')+'</p>' : '') + '<div class="behavior-layout"><nav class="behavior-nav" aria-label="Öğrenci işlemleri"><span class="nav-caption">GÜZEL ADIMLAR</span><button type="button" class="active" data-action="fish-profile" aria-current="page">' + icon('heart') + 'Puan ver ve besle</button><button type="button" data-action="student-day">' + icon('check') + 'Günlük kayıt</button><button type="button" data-action="history">' + icon('leaf') + 'Puan geçmişi</button><span class="nav-caption">DENİZ DOSTUM</span><button type="button" data-action="choose">' + icon('fish') + 'Balığını değiştir</button><button type="button" data-action="edit-student">' + icon('settings') + 'Öğrenciyi düzenle</button><button type="button" data-action="absence" aria-pressed="' + d.absent + '"><span class="nav-symbol">' + (d.absent ? '☀' : '☾') + '</span>' + (d.absent ? 'Bugün geldi' : 'Bugün gelmedi') + '</button></nav><section class="behavior-main" aria-label="Olumlu davranışlar"><div class="behavior-section-heading"><div><h3>Olumlu davranışlar</h3><p>Küçük bir adım, deniz dostuna mutluluk.</p></div><button class="icon-button" data-action="tasks" title="Davranışları ve puanları düzenle" aria-label="Davranışları ve puanları düzenle">' + icon('settings') + '</button></div>' + (d.absent ? '<p class="detail-note">Bugün izinli. Davranış seçmek için “Bugün geldi” düğmesine dokunun.</p>' : '') + '<div class="behavior-grid">' + C.behaviorChoices(s, classroom(), today).map(t => '<button type="button" class="behavior-choice" data-action="reward-behavior" data-id="' + t.id + '" ' + (d.absent ? 'disabled' : '') + '><span class="behavior-check" aria-hidden="true">' + esc(t.icon || behaviorSymbol(t.title)) + '</span><span><strong>' + esc(t.title) + '</strong><small>' + (t.count ? 'Bugün ' + t.count + ' kez · Tekrar ver' : 'Besle ve mutlu et') + '</small></span><b>+' + C.taskPoints(t) + ' puan</b></button>').join('') + '</div>' + (!d.tasks.length ? '<p class="settings-note">İlk davranışı ve puanını belirleyerek başlayın.</p><button class="button" data-action="tasks">Davranış ekle</button>' : '<p class="behavior-footnote">' + icon('leaf') + 'Aynı davranışı gün içinde yeniden verebilirsiniz. Her ödül geçmişe ayrı kaydedilir.</p>') + '</section></div>', 'DENİZ DOSTUNUN GÜZEL ADIMLARI');
    modal.classList.add('behavior-modal');
    swimmers.forEach(f=>f.el.classList.toggle('is-selected',f.el.dataset.id===s.id));
  }
  function studentDayModal() {
    const s = student(); if (!s) return;
    openModal(s.name + ' · Günlük kayıt', detail(), 'GÖREVLER VE SORUMLULUKLAR');
    modal.classList.add('student-day-modal');
    modal.querySelector('.detail-back').textContent = '← Davranışlara dön';
  }
  function refreshStudentDialog() {
    if (!modal.open) return;
    if (modal.classList.contains('behavior-modal')) behaviorModal();
    else if (modal.classList.contains('student-day-modal')) studentDayModal();
  }
  function feedingFeedback(s, points) {
    feedEffect(s.id, points);
    if (state.settings.feedSound) { Audio.setVolume(state.settings.volume); Audio.feed().catch(e => toast(e.message)); }
    toast(s.name + ': ' + (points ? '+' + points + ' puan · ' : '') + 'Balığın beslendi!');
  }
  function rewardBehavior(s, taskId, popup = false) {
    if (!s) return;
    const result = popup ? C.awardBehavior(s, classroom(), today, taskId) : C.completeAndFeed(s, today, taskId);
    if (!result) { if (popup) { behaviorModal(); toast('Ödül kaydedilemedi. Günlük kayıt veya besleme sınırına ulaşılmış olabilir.'); } return; }
    if (popup) closeModal();
    commit();
    if (result.fed) feedingFeedback(s, result.points);
    else toast(s.name + ': +' + result.points + ' puan. Daha önce kullanılan yem yeniden verilmedi.');
  }
  function helpModal() {
    openModal('Güzel davranışlar, mutlu balıklar.', '<div class="help-steps">' + [
      ['Deniz dostunu seç', 'Sınıfınızı ekleyin. Öğretmen gözetiminde ortak sınıf ekranındaki “Balığımı seç” bölümünden canlı seçilir. İzleme bağlantısında seçim veya besleme yapılamaz.'],
      ['Sorumluluğunu tamamla', 'Öğretmen, Ayarlar → Görevleri düzenle bölümünde her olumlu davranışın puanını belirlesin. Kazanılmış puanlar sonradan yapılan puan değişikliklerinden etkilenmez.'],
      ['Yemini ver, mutluluğunu izle', 'Balığa tıklayın ve açılan pencereden olumlu davranışı seçin. Puan verilir, balık yem ve kalp efektiyle beslenir; kısa bir melodi çalar. Aynı davranışı gün içinde tekrar seçebilirsiniz; her ödül geçmişe ayrı kaydedilir. Önceden birikmiş yemler paneldeki Besle düğmesiyle kullanılabilir.'],
      ['Öğrencini kolayca bul', 'Öğrenci bul düğmesinde isim arayın. Bul balığı kısa süre belirginleştirir, Aç davranış penceresini açar. Bir gün beslenmeyen balığın küçük yem simgesi öğretmene hatırlatma yapar; gün sayısı pencerede görünür. İsterseniz Ayarlar’dan yazılı uyarıyı açabilirsiniz.'],
      ['Her gün yeni bir başlangıç', '“Eksik” işaretlenen görev canlıyı biraz üzgün ve daha sakin yapar. Tamamlanınca tekrar canlanabilir. Açılmış bir önceki görev gününün eksikleri de ertesi günün ilk görevine kadar etkili olur.'],
      ['İzin günlerini ayır', '“Bugün gelmedi” seçeneğinde canlı dinlenir, o günün görevleri değerlendirilmez. Uygulamanın açılmadığı günler için görev veya eksik kaydı üretilmez.']
    ].map(([title, detail], i) => '<div class="help-step"><span class="step-number">' + (i + 1) + '</span><div><h3>' + title + '</h3><p>' + detail + '</p></div></div>').join('') + '</div><p class="settings-note">Canlıların farklı ortamlarda bir arada görünmesi ve mutluluk tepkileri, bu sınıf etkinliğinin oyunlaştırma öğeleridir.</p>');
  }
  function progress() {
    const records = classroom().students.filter(s => !day(s).absent).flatMap(s => C.behaviorChoices(s, classroom(), today));
    const done = records.filter(t => t.count > 0).length;
    const percent = records.length ? Math.round(done / records.length * 100) : 0;
    $('classProgress').innerHTML = '<div class="progress-copy"><span>Bugünün güzel adımları</span><strong>' + done + ' / ' + records.length + '</strong></div><div class="progress-track" role="progressbar" aria-label="Sınıfın tamamlanan görevleri" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + percent + '%"></span></div>';
  }
  function studentRows() {
    const q = $('studentSearch').value.toLocaleLowerCase('tr-TR').trim();
    const students = classroom().students.filter(s => s.name.toLocaleLowerCase('tr-TR').includes(q));
    if (!classroom().students.length) return '<div class="panel-empty">' + icon('fish') + '<h3>İlk deniz dostunu bekliyoruz.</h3><p>Sınıfınızı ekleyin, bu küçük dünya<br>öğrencilerinizle hayat bulsun.</p><button class="button primary" data-action="add">' + icon('plus') + 'Öğrenci ekle</button></div>';
    if (!students.length) return '<div class="panel-empty"><p>Bu isimde öğrenci bulunamadı.</p></div>';
    return students.map(s => { const mood = C.mood(s, today); return '<button class="student-row mood-' + mood.id + '" data-action="student" data-id="' + s.id + '" aria-label="' + esc(s.name) + ', ' + mood.label + ', görevlerini aç"><img class="student-thumb" src="' + image(s.species) + '" alt=""><span class="student-info"><strong>' + esc(s.name) + '</strong><small><i class="mood-dot"></i>' + mood.label + '</small></span><span class="feed-count">' + C.balance(s) + ' yem</span><span class="row-arrow">›</span></button>'; }).join('');
  }
  function detail() {
    const s = student(); if (!s) { selected = ''; return studentRows(); }
    const d = day(s), mood = C.mood(s, today);
    return '<button class="detail-back" data-action="back">← Tüm deniz dostları</button><div class="detail-header"><img src="' + image(s.species) + '" alt="' + C.species(s.species).name + '"><div><h3>' + esc(s.name) + '</h3><small>' + mood.label + ' · ' + C.balance(s) + ' yem</small></div></div><p class="detail-note">' + mood.note + '</p>' + d.tasks.map(t => '<div class="task-row"><p>' + esc(t.title) + ' <span class="task-score">+' + C.taskPoints(t) + ' puan</span></p><div class="task-actions">' + [['done', '✓ Tamam'], ['pending', 'Bekliyor'], ['missed', 'Eksik']].map(([status, label]) => '<button data-action="task-status" data-id="' + t.id + '" data-status="' + status + '" aria-label="' + esc(t.title) + ': ' + label + '" aria-pressed="' + (t.status === status) + '" ' + (d.absent ? 'disabled' : '') + '>' + label + '</button>').join('') + '</div></div>').join('') + (!d.tasks.length ? '<p class="settings-note">Bugün için görev yok. Günlük görevler bölümünden ekleyebilirsiniz.</p>' : '') + '<button class="button primary full feed-button" data-action="feed" ' + (!C.balance(s) || d.absent ? 'disabled' : '') + '>' + icon('leaf') + 'Besle · 1 yem</button>' + (!C.balance(s) ? '<p class="settings-note">Beslemek için tamamlanan bir görevden yem kazan.</p>' : '') + '<div class="detail-extras"><button class="button subtle" data-action="absence" aria-pressed="' + d.absent + '">' + (d.absent ? '☀ Bugün geldi' : '☾ Bugün gelmedi') + '</button><button class="button subtle" data-action="choose">Canlıyı değiştir</button><button class="button subtle" data-action="history">Geçmiş</button><button class="button subtle" data-action="edit-student">Düzenle</button></div>';
  }
  function taskSummary() {
    const tasks = new Map();
    classroom().students.forEach(s => { const d = day(s); if (d.absent) return; C.behaviorChoices(s, classroom(), today).forEach(t => { const info = tasks.get(t.id) || { title: t.title, total: 0, done: 0 }; info.total++; if (t.count > 0) info.done++; tasks.set(t.id, info); }); });
    if (!tasks.size) classroom().tasks.forEach(t => tasks.set(t.id, { title: t.title, total: 0, done: 0 }));
    return Array.from(tasks.values()).map(t => '<div class="task-summary"><h3>' + esc(t.title) + '</h3><p>' + t.done + ' / ' + t.total + ' öğrenci tamamladı</p><div class="progress-track"><span style="width:' + (t.total ? t.done / t.total * 100 : 0) + '%"></span></div></div>').join('') + '<div style="padding:16px 5px"><button class="button full subtle" data-action="tasks">' + icon('settings') + 'Görevleri düzenle</button><p class="settings-note">Görevi tamamlamak için Öğrenciler sekmesinden bir öğrenciyi seçin.</p></div>';
  }
  function renderPanel() {
    progress();
    $('studentCount').textContent = classroom().students.length;
    $('searchBox').hidden = !!selected || tab !== 'students';
    document.querySelectorAll('[data-action="tab"]').forEach(btn => { const active = btn.dataset.tab === tab; btn.setAttribute('aria-selected', active); btn.tabIndex = active ? 0 : -1; });
    $('panelContent').setAttribute('aria-labelledby', 'tab-' + tab);
    const focused = document.activeElement;
    const focusKey = focused && $('panelContent').contains(focused) ? [focused.dataset.action, focused.dataset.id, focused.dataset.status] : null;
    const scroll = $('panelContent').scrollTop;
    $('panelContent').innerHTML = tab === 'tasks' ? taskSummary() : selected ? detail() : studentRows();
    $('panelContent').scrollTop = scroll;
    if (focusKey) Array.from($('panelContent').querySelectorAll('button')).find(b => b.dataset.action === focusKey[0] && b.dataset.id === focusKey[1] && b.dataset.status === focusKey[2])?.focus({ preventScroll: true });
  }
  function render() {
    ensureDays();
    $('classSelect').innerHTML = state.classes.map(c => '<option value="' + c.id + '" ' + (c.id === classroom().id ? 'selected' : '') + '>' + esc(c.name) + '</option>').join('');
    const theme = C.THEMES.find(t => t.id === classroom().theme) || C.THEMES[0];
    $('aquarium').style.backgroundImage = 'url("' + background(theme.id) + '")';
    const themeButton=document.querySelector('.scene-controls [data-action="themes"]');
    themeButton.title='Ortamı değiştir · '+theme.name;
    $('sceneTitle').textContent = classroom().students.length ? classroom().name + ' · Su altı dünyamız.' : 'Bizim su altı dünyamız.';
    $('sceneSubtitle').textContent = classroom().students.length + ' deniz dostu · Her güzel adım, yeni bir mutluluk.';
    $('welcome').hidden = classroom().students.length > 0 || classroom().teacher?.enabled === true;
    $('aquarium').style.setProperty('--mobile-swim-height',Math.max(360,Math.ceil((classroom().students.length+(classroom().teacher?.enabled?1:0))/3)*120)+'px');
    document.querySelector('.welcome-footnote').textContent = C.SPECIES.length + ' deniz canlısı · 3 akvaryum ortamı · Sınırsız güzel başlangıç';
    $('aquarium').classList.toggle('is-empty', !classroom().students.length && !classroom().teacher?.enabled);
    $('aquariumApp').classList.toggle('no-names', !state.settings.names && !state.settings.points);
    $('aquariumApp').classList.toggle('no-motion', !state.settings.motion || reduced.matches);
    $('demoBanner').hidden = !demo;
    $('todayLabel').textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!viewing) { renderPanel(); updateTimer(); } renderFish(); renderSoundControl();
    const total=viewing ? state.publicClassPoints : classroom().students.reduce((sum,s)=>sum+C.earned(s),0);
    $('classPearl').hidden = !state.settings.classPoints || total === null;
    $('classPearlScore').textContent = (total || 0).toLocaleString('tr-TR');
    $('classPearl').setAttribute('aria-label','Sınıfın toplam puanı: '+(total || 0));
  }
  function renderFish() {
    // Read the new scene dimensions after empty-state / panel layout changes,
    // before placing new animals; a later ResizeObserver callback is too late.
    width = $('swimArea').clientWidth; height = $('swimArea').clientHeight;
    const actual = classroom().students;
    const items = actual.length || viewing || classroom().teacher?.enabled ? [...actual] : ['clown', 'tang', 'turtle'].map((kind, i) => ({ id: 'preview-' + i, name: '', species: kind, days: {}, feeds: [] }));
    if (classroom().teacher?.enabled) items.push({...C.newStudent(classroom().teacher.name,classroom().teacher.species),id:'teacher-'+classroom().id,isTeacher:true});
    const layout = Motion.layout(items.map(s=>({id:s.id,species:s.species,size:C.species(s.species).size})),width,height);
    const layoutKey=width+':'+height+':'+items.map(s=>s.id+'/'+s.species).join(',');
    const eggBed=$('eggBed');
    const eggs=items.filter(s=>!s.isTeacher && (viewing ? s.appearance?.egg : s.name && C.growth(s,classroom()).egg));
    eggBed.hidden=!eggs.length;
    const eggPlaces=Motion.eggLayout(eggs,eggBed.clientWidth,eggBed.clientHeight,state.settings.classPoints);

    const visible = new Set(items.map(s => s.id));
    for (const [id, fish] of swimmers) if (!visible.has(id)) { fish.el.remove(); swimmers.delete(id); }
    items.forEach((s, index) => {
      let fish = swimmers.get(s.id);
      const placement = layout.get(s.id), size = placement.size;
      if (!fish) {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'fish';
        el.innerHTML = '<span class="fish-chat" aria-hidden="true"></span><span class="fish-egg" aria-hidden="true"><i></i></span><img class="fish-art" alt=""><span class="fish-name"></span><span class="fish-points"></span><span class="fish-hunger" hidden></span>';
        el.dataset.action = s.isTeacher ? 'teacher-fish' : 'fish-behaviors'; el.dataset.id = s.id;
        $('swimArea').append(el);
        fish = { el, img: el.querySelector('img'), ...placement, direction: index % 2 ? -1 : 1, phase: index * 1.8, mood: fishMood(s), hover: false, keyboard: false, angle: index % 2 ? 180 : 0, turn: null, cruise: 1 };
        el.addEventListener('pointerenter', event => { if (!viewing && !document.fullscreenElement && event.pointerType !== 'touch') fish.hover = true; });
        el.addEventListener('pointerleave', () => { fish.hover = false; fish.pressed = false; });
        el.addEventListener('pointerdown', () => { if(!viewing && !document.fullscreenElement) fish.pressed = true; });
        el.addEventListener('pointerup', () => { fish.pressed = false; });
        el.addEventListener('pointercancel', () => { fish.pressed = false; });
        el.addEventListener('focus', () => { if(!viewing && !document.fullscreenElement) fish.keyboard = true; });
        el.addEventListener('blur', () => { fish.keyboard = false; });
        swimmers.set(s.id, fish);
      }
      if(fish.layoutKey!==layoutKey) { Object.assign(fish,placement); fish.layoutKey=layoutKey; }
      fish.size = size; fish.mood = fishMood(s);
      const growth = viewing && !s.isTeacher ? {...s.appearance,stage:s.appearance?.egg?0:10} : s.isTeacher || !s.name ? {stage:10,scale:1,egg:false,trophy:false} : C.growth(s,classroom());
      const wasEgg=fish.egg===true;
      if(wasEgg && !growth.egg && state.settings.motion && !reduced.matches) {
        fish.el.classList.remove('is-hatching'); void fish.el.offsetWidth; fish.el.classList.add('is-hatching');
        setTimeout(()=>fish.el.classList.remove('is-hatching'),1600);
      }
      if(growth.egg) {
        const nest=eggPlaces.get(s.id);
        Object.assign(fish,nest); fish.el.style.setProperty('--fish-size',nest.size+'px');
        if(fish.el.parentNode!==eggBed) eggBed.append(fish.el);
      } else {
        if(wasEgg) {Object.assign(fish,placement); fish.cruise=0;}
        if(fish.el.parentNode!==$('swimArea')) $('swimArea').append(fish.el);
      }
      fish.egg=growth.egg; fish.el.classList.toggle('is-egg',growth.egg);
      fish.el.classList.toggle('teacher-fish',!!s.isTeacher);
      fish.el.style.setProperty('--growth-scale',growth.scale);
      fish.el.dataset.stage=String(growth.stage);
      // Short, modest feeding response; never rank students by swimming depth or speed.
      fish.mood={...fish.mood,speed:fish.mood.id === 'resting' ? .4 : .65};
      fish.boostUntil = s.feeds.reduce((last,f)=>Math.max(last,f.at),0)+12000;

      fish.el.style.setProperty('--fish-size', fish.size + 'px');
      for(const name of ['happy','sad','resting','ready','calm']) fish.el.classList.toggle('mood-'+name,fish.mood.id===name);
      fish.el.dataset.species=s.species;
      const src = image(s.species); if (fish.img.getAttribute('src') !== src) fish.img.src = src;
      fish.el.setAttribute('aria-label', (state.settings.names && s.name ? s.name + ', ' : '') + C.species(s.species).name + (growth.egg ? ', yumurta' : '') + (state.settings.points && score(s) !== null ? ', toplam ' + score(s) + ' puan' : ''));
      fish.el.querySelector('.fish-name').hidden = !state.settings.names || !s.name;
      fish.el.querySelector('.fish-name').textContent = state.settings.names ? s.name + (growth.trophy ? ' 🏆' : '') : '';
      const pointsEl=fish.el.querySelector('.fish-points'); pointsEl.hidden=!state.settings.points || score(s) === null; pointsEl.textContent='★ '+(score(s) ?? 0).toLocaleString('tr-TR');
      updateHungerLabel(fish, s);
      fish.el.disabled = viewing || !s.name;
      fish.el.style.opacity = !s.name ? '.8' : '';
      placeFish(fish, 0);
    });
    restartAnimation();
  }
  function updateHungerLabel(fish, s) {
    const days = viewing || s.isTeacher || !s.name ? 0 : C.hungerDays(s);
    const label = fish.el.querySelector('.fish-hunger');
    label.hidden = days < 1;
    label.classList.toggle('hunger-icon',!state.settings.hungerText);
    label.textContent = days >= 1 ? (state.settings.hungerText ? 'Balığın ' + days + ' gündür aç' : '') : '';
    if(days && !state.settings.hungerText) label.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h16c-1 5-3 7-8 7s-7-2-8-7Z"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="13" cy="10" r="1"/></svg>';
    label.setAttribute('aria-label',days ? 'Besleme hatırlatması: '+days+' gündür beslenmedi' : '');
    label.title = days ? days+' gündür beslenmedi · Ayrıntılar için balığa dokunun' : '';
  }

  function measure() {
    const changed = width !== $('swimArea').clientWidth || height !== $('swimArea').clientHeight;
    width = $('swimArea').clientWidth; height = $('swimArea').clientHeight;
    if (changed && swimmers.size) { renderFish(); return; }
    for (const fish of swimmers.values()) placeFish(fish, 0);
  }
  function placeFish(fish) {
    const p=fish.profile, moving=state.settings.motion && !reduced.matches;
    const tilt=moving ? Math.sin(fish.phase*1.4)*p.tilt : 0;
    const pulse=moving ? 1+Math.sin(fish.phase*3)*p.pulse : 1;
    fish.el.style.transform='translate3d('+fish.x.toFixed(1)+'px,'+fish.y.toFixed(1)+'px,0)';
    const depth=fish.egg ? {scale:1,opacity:1,brightness:1,saturation:1,layer:3} : Motion.perspective(fish);
    fish.el.style.zIndex=String(depth.layer);
    fish.img.style.opacity=fish.egg?'0':depth.opacity.toFixed(2);
    fish.el.style.setProperty('--water-brightness',depth.brightness.toFixed(2));
    fish.el.style.setProperty('--water-saturation',depth.saturation.toFixed(2));
    fish.el.style.setProperty('--floor-shadow',fish.egg?'0':(Math.max(0,(fish.y/Math.max(1,height)-.62))*depth.opacity*.5).toFixed(2));
    fish.img.style.transform='scale('+(Number(fish.el.style.getPropertyValue('--growth-scale'))*depth.scale).toFixed(3)+') perspective(500px) rotateY('+fish.angle.toFixed(1)+'deg) rotate('+tilt.toFixed(1)+'deg) scaleY('+pulse.toFixed(3)+')';
  }
  let nextChat = performance.now() + 25000;
  const pairCooldown = new Map();
  function chat(now) {
    if (now < nextChat || !state.settings.chat || reduced.matches || modal.open) return;
    nextChat = now + 2000;
    const fish = [...swimmers.values()];
    for (let i=0;i<fish.length;i++) for(let j=i+1;j<fish.length;j++) {
      const a=fish[i], b=fish[j], key=[a.el.dataset.id,b.el.dataset.id].sort().join(':');
      if (a.held || b.held || a.mood.id==='resting' || b.mood.id==='resting' || now-(pairCooldown.get(key)||-120000)<120000) continue;
      if (Math.abs(a.x+a.size/2-b.x-b.size/2)>Math.max(a.size,b.size)*.8 || Math.abs(a.y-b.y)>60) continue;
      pairCooldown.set(key,now); nextChat=now+30000+Math.random()*25000;
      [a,b].forEach((f,index) => {
        const bubble=f.el.querySelector('.fish-chat');
        bubble.textContent=index ? '💙' : '👋'; bubble.classList.add('visible');
        setTimeout(()=>bubble.classList.remove('visible'),2200+index*300);
      });
      return;
    }
  }
  function tick(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0; lastTime = now;
    const fishList=[...swimmers.values()];
    fishList.forEach(f=>{ f.mood.speed=(f.mood.id === 'resting' ? .4 : .65)*(f.boostUntil>Date.now()?1.1:1); f.held=f.egg || (modal.open && f.el.dataset.id===inspectedId) || f.pressed || f.keyboard || f.feedingUntil>performance.now() || f.foundUntil>performance.now(); });
    Motion.step(fishList,dt,width,height);
    for (const fish of fishList) placeFish(fish);
    chat(now);
    frame = requestAnimationFrame(tick);
  }
  function restartAnimation() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (state.settings.motion && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function feedEffect(id, points) {
    if (!state.settings.motion || reduced.matches) return;
    const fish = swimmers.get(id); if (!fish) return;
    fish.feedingUntil = performance.now() + 1600;
    const rect = fish.el.getBoundingClientRect(), area = $('aquarium').getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const particle = document.createElement('span'); particle.className = 'feed-particle';
      particle.style.left = rect.left - area.left + rect.width * .5 + (Math.random() - .5) * 70 + 'px';
      particle.style.top = rect.top - area.top - 55 + Math.random() * 20 + 'px';
      particle.style.animationDelay = i * .08 + 's';
      $('feedingEffects').append(particle); setTimeout(() => particle.remove(), 2300);
    }
    const heart = document.createElement('span'); heart.className = 'feed-heart'; heart.textContent = points && state.settings.points ? '♡ +' + points : '♡';
    heart.style.left = rect.left - area.left + rect.width / 2 + 'px'; heart.style.top = rect.top - area.top + 'px';
    $('feedingEffects').append(heart); setTimeout(() => heart.remove(), 1600);
  }
  function enterDemo() {
    if (demo) return;
    beforeDemo = state; state = C.initialState(); demo = true;
    const cls = classroom(); cls.name = 'Örnek sınıf';
    const demoSpecies = ['clown', 'tang', 'butterfly', 'turtle', 'ray', 'seahorse', 'yellowtang', 'mandarin', 'puffer', 'octopus', 'jellyfish', 'dolphin'];
    ['Deniz', 'Ada', 'Ege', 'Duru', 'Mert', 'Elif', 'Arda', 'İpek', 'Can', 'Ece', 'Defne', 'Ali'].forEach((name, i) => {
      const s = C.newStudent(name, demoSpecies[i]); cls.students.push(s); const d = C.ensureDay(s, cls, today);
      if (i < 3) { d.tasks[0].status = 'done'; d.tasks[1].status = 'done'; C.feed(s, today); }
      if (i === 3) d.tasks[0].status = 'done';
      if (i === 4) d.tasks[1].status = 'missed';
    });
    selected = ''; tab = 'students'; $('studentSearch').value = ''; save(); render();
  }
  function exitDemo() {
    if (!demo) return;
    state = beforeDemo; beforeDemo = null; demo = false; selected = ''; tab = 'students'; $('studentSearch').value = ''; closeModal(); ensureDays(); commit();
  }
  function exportData(value, filename) {
    const blob = new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function importClassesModal() {
    if (demo) return toast('İçe aktarmak için kendi sınıfınıza dönün.');
    importedClasses = [];
    try { const raw = JSON.parse(localStorage.getItem('kemal_teacher_tools_panel_v2') || 'null'); if (Array.isArray(raw?.classes)) importedClasses = raw.classes.filter(c => c && typeof c.name === 'string' && Array.isArray(c.students)).slice(0, 30); }
    catch (error) { /* Show the same explicit empty state for unavailable or malformed source data. */ }
    openModal('Sınıfım & Çark’tan aktar', '<p class="modal-intro">Bu tarayıcıda kayıtlı sınıflardan birini akvaryuma kopyalayın. Kaynak sınıf listeniz değişmez. Aktarılan öğrenciler kendi canlılarını daha sonra seçebilir.</p>' + (importedClasses.length ? importedClasses.map((c, i) => '<div class="import-choice"><div><strong>' + esc(c.name) + '</strong><small>' + c.students.length + ' öğrenci</small></div><button class="button primary" data-action="import-selected" data-index="' + i + '">Sınıfı kopyala</button></div>').join('') : '<div class="panel-empty"><p>Bu tarayıcıda kayıtlı bir Sınıfım & Çark listesi bulunamadı.</p><button class="button primary" data-action="add">Öğrencileri yazarak ekle</button></div>'));
  }
  let historyPage = 0;
  function historyModal() {
    const s=student(); if(!s) return;
    const dates=Object.keys(s.days).sort().reverse();
    historyPage=Math.min(historyPage,Math.max(0,Math.ceil(dates.length/30)-1));
    openModal(s.name+' · Güzel adımlar','<p class="modal-intro">'+C.earned(s)+' toplam puan · '+C.completedCount(s)+' tamamlanan görev · '+s.feeds.length+' besleme</p>'+dates.slice(historyPage*30,(historyPage+1)*30).map(date=>'<div class="history-day"><h3>'+new Date(date+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+(s.days[date].absent?' · İzinli':'')+'</h3>'+s.days[date].tasks.map(t=>'<div class="history-entry"><p>'+esc(t.title)+(t.sourceId?' · Ek ödül':'')+(t.awardedAt?' · '+new Date(t.awardedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'')+' · '+C.taskPoints(t)+' puan <small>('+(s.days[date].absent?'değerlendirme dışı':t.status==='done'?'tamamlandı':t.status==='missed'?'eksik':'bekliyor')+')</small></p><div class="settings-actions">'+(t.status==='done'?'<button class="button" data-action="revoke-point" data-date="'+date+'" data-id="'+t.id+'">Puanı geri al</button>':'')+'<button class="button subtle" data-action="delete-point" data-date="'+date+'" data-id="'+t.id+'">Kaydı sil</button></div></div>').join('')+'</div>').join('')+'<div class="settings-actions"><button class="button" data-action="history-newer" '+(!historyPage?'disabled':'')+'>Daha yeni</button><button class="button" data-action="history-older" '+((historyPage+1)*30>=dates.length?'disabled':'')+'>Daha eski</button></div><p class="settings-note">Puanı geri almak görevi bekliyor durumuna getirir. Silmek yalnızca seçili günün kaydını kaldırır; davranış şablonunu silmez. Gerçekleşen beslemeler geçmişte korunur, yeni davranışların yem hakkı engellenmez. Silme geri alınamaz; önce yedek indirebilirsiniz.</p><button class="button subtle" data-action="fish-profile">← Davranışlara dön</button>');
  }
  function editStudentModal() {
    const s = student(); if (!s) return;
    openModal('Öğrenciyi düzenle', '<form id="editStudentForm"><label class="field">Öğrenci adı<input name="name" value="' + esc(s.name) + '" maxlength="80" required autofocus></label><div class="form-actions"><button class="button primary" type="submit">Kaydet</button></div></form><div class="danger-zone"><button class="button danger" data-action="remove-student">Öğrenciyi akvaryumdan çıkar</button><p class="settings-note">Yalnızca bu akvaryumdaki görev ve besleme kayıtları kaldırılır.</p></div>');
  }
  function refreshDate() {
    if (viewing) return;
    const next = C.dayKey();
    if (next !== today) { today = next; closeModal(); ensureDays(); commit(); toast('Yeni günün görevleri hazır.'); }
    else classroom().students.forEach(s => { const fish = swimmers.get(s.id); if (fish) updateHungerLabel(fish, s); });
  }
  async function act(button) {
    const action = button.dataset.action;
    if (viewing && !['fullscreen'].includes(action)) return;
    if (document.fullscreenElement && action !== 'fullscreen') return;
    const s = student();
    switch (action) {
      case 'legacy-import': {
        try {
          const raw = localStorage.getItem('kemal_class_aquarium_v1');
          if (!raw) return toast('Bu tarayıcıda eski sürüm kaydı bulunamadı.');
          const legacy = C.validate(JSON.parse(raw));
          if (state.classes.length + legacy.classes.length > 30) return toast('Toplam sınıf sayısı 30’u aşamaz.');
          confirm('Eski sınıfları bu hesaba kopyala?', 'Bu tarayıcıdaki eski sürüm sınıflarının size ait olduğunu doğrulayın. Mevcut sınıflar korunur; içe alınan sınıfların paylaşımı kapalı başlar.', () => {
            const copies=legacy.classes.map(c=> { const copy=JSON.parse(JSON.stringify(c)); copy.id=C.uid(); copy.tasks.forEach(t=>t.id=C.uid()); const baseline={}; copy.students.forEach(s=>{const old=s.id;s.id=C.uid();if(copy.goal && Object.hasOwn(copy.goal.baseline,old)) baseline[s.id]=copy.goal.baseline[old];}); if(copy.goal) copy.goal.baseline=baseline; return copy; });
            state.classes.push(...copies); state.activeClassId=copies[0].id; selected=''; commit(); toast('Eski sınıflar hesabınıza kopyalandı.');
          });
        } catch(e) { toast('Eski kayıt okunamadı. Yedek dosyasıyla içe aktarabilirsiniz.'); }
        break;
      }
      case 'retry-cloud': await flushCloud(); settingsModal(); break;
      case 'use-cloud': case 'use-local': {
        const choice=action==='use-local'?'local':'remote';
        confirm('Kullanılacak kaydı seç',choice==='local'?'Bu cihazdaki kayıt hesaptaki kaydın yerini alacak. Önce iki kaydın da yedeğini almanız önerilir.':'Hesaptaki son kayıt açılacak. Bu cihazdaki kopya ayrıca korunacak.',async()=>{try{state=await cloud.resolve(choice,state);localStorage.setItem(KEY,JSON.stringify(state));closeModal();selected='';ensureDays();render();toast('Seçtiğiniz kayıt açıldı.');}catch(e){toast(e.message);}});break;
      }
      case 'export-cloud-recovery': case 'export-recovery': {const raw=localStorage.getItem(KEY+(action==='export-cloud-recovery'?'_cloud_recovery':'_recovery'));if(raw)exportData(raw,'akvaryum-korunan-kopya.json');else toast('Ayrı bir kurtarma kopyası henüz oluşmadı.');break;}
      case 'sharing': await sharingModal(); break;
      case 'copy-child': try { await navigator.clipboard.writeText(button.dataset.link); toast('Çocuğa özel erişim kopyalandı.'); } catch(e) { toast('Kodu yukarıdaki alandan seçip kopyalayabilirsiniz.'); } break;
      case 'enable-child': case 'disable-child': {
        button.disabled=true; clearTimeout(syncTimer);
        try {
          if(action==='enable-child') { const cls=JSON.parse(JSON.stringify(classroom())), settings={...state.settings}, id=button.dataset.student; await queueShare(()=>window.AquariumSharing.enableChild(cls,settings,id)); }
          else { const id=button.dataset.id; await queueShare(()=>window.AquariumSharing.disableChild(id)); }
          await sharingModal();
        } catch(e) { toast(e.message); button.disabled=false; }
        break;
      }
      case 'toggle-sound':
        if(!state.settings.mix.length) { state.settings.mix=[{id:'ocean',volume:.5}]; state.settings.sound='ocean'; save(); }
        Audio.setVolume(state.settings.volume);
        try { await Audio.toggle(state.settings.mix); } catch(e) { toast(e.message); }
        break;
      case 'copy-share': try { await navigator.clipboard.writeText($('shareLink').value); toast('İzleme bağlantısı kopyalandı.'); } catch(e) { $('shareLink').select(); toast('Bağlantıyı seçip kopyalayabilirsiniz.'); } break;
      case 'disable-other-share':
        button.disabled=true;
        try { const id=button.dataset.id; await queueShare(()=>window.AquariumSharing.disable(id)); await sharingModal(); }
        catch(e) { toast(e.message); button.disabled=false; } break;
      case 'enable-share': case 'disable-share': {
        button.disabled=true; clearTimeout(syncTimer);
        try {
          if (action === 'enable-share') { const cls=JSON.parse(JSON.stringify(classroom())), settings={...state.settings}; shareRecord=await queueShare(()=>window.AquariumSharing.enable(cls,settings)); }
          else if (shareRecord) { const id=shareRecord.id; await queueShare(()=>window.AquariumSharing.disable(id)); shareRecord=null; }
          await sharingModal();
        } catch(e) { toast(e.message); button.disabled=false; }
        break;
      }
      case 'activities': activitiesModal(); break;
      case 'group-reward': groupRewardModal(); break;
      case 'group-select': case 'group-clear': modal.querySelectorAll('[name="studentId"]:not(:disabled)').forEach(el=>el.checked=action==='group-select'); updateGroupSummary(); break;
      case 'goal': goalModal(); break;
      case 'new-goal': goalModal(true); break;
      case 'timer': timerModal(); break;
      case 'timer-preset': $('timerMinutes').value=button.dataset.minutes; break;
      case 'timer-pause': focusTimer.pause(); updateTimer(); break;
      case 'timer-resume': focusTimer.resume(); updateTimer(); break;
      case 'timer-reset': focusTimer.reset(); timerNotified=false; timerModal(); break;
      case 'sound': openModal('Ortam sesleri',soundSettings()); break;
      case 'play-sound': await playCurrentMix(); break;
      case 'pause-mix': Audio.pause(); break;
      case 'load-mix': { const favorite=state.settings.favorites.find(f=>f.id===button.dataset.id); if(favorite){state.settings.mix=favorite.mix.map(t=>({...t}));state.settings.volume=favorite.volume;state.settings.sound=favorite.mix[0]?.id || 'off';save();openModal('Ortam sesleri',soundSettings());await playCurrentMix();}break; }
      case 'rename-mix': { const favorite=state.settings.favorites.find(f=>f.id===button.dataset.id);if(favorite)openModal('Karışımı adlandır','<form id="renameMixForm" data-id="'+favorite.id+'"><label class="field">Karışım adı<input name="name" maxlength="60" required value="'+esc(favorite.name)+'"></label><button class="button primary" type="submit">Kaydet</button></form>');break; }
      case 'delete-mix': {const id=button.dataset.id;confirm('Favori silinsin mi?','Yalnızca kaydedilen karışım kaldırılır.',()=>{state.settings.favorites=state.settings.favorites.filter(f=>f.id!==id);save();openModal('Ortam sesleri',soundSettings());});break;}
      case 'stop-sound': Audio.stop(); toast('Ortam sesi durduruldu.'); break;
      case 'close': closeModal(); break;
      case 'confirm': { const fn = confirmAction; closeModal(); if (fn) await fn(); break; }
      case 'setup': addModal(true); break;
      case 'add': addModal(); break;
      case 'choose': chooseModal(); break;
      case 'themes': themesModal(); break;
      case 'settings': settingsModal(); break;
      case 'help': helpModal(); break;
      case 'tasks': tasksModal(); break;
      case 'pick-task-icon': { const form=button.closest('form'); form.querySelector('[name="icon"]').value=button.dataset.icon; form.querySelectorAll('[data-action="pick-task-icon"]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); break; }
      case 'demo': enterDemo(); break;
      case 'exit-demo': if (demoOnly) { location.href=location.pathname; return; } exitDemo(); break;
      case 'theme': classroom().theme = C.THEMES.find(t => t.id === button.dataset.theme)?.id || 'reef'; closeModal(); commit(); break;
      case 'student': if (classroom().students.some(x => x.id === button.dataset.id)) { selected = button.dataset.id; tab = 'students'; $('aquarium').classList.remove('panel-hidden'); updatePanelToggle(); renderPanel(); $('panelContent').scrollTop = 0; if (window.innerWidth <= 800) $('studentPanel').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' }); } break;
      case 'fish-behaviors': if (classroom().students.some(x => x.id === button.dataset.id)) { selected = button.dataset.id; tab = 'students'; renderPanel(); behaviorModal(); } break;
      case 'find-student': finderModal(); break;
      case 'locate-fish': closeModal(); highlightFish(button.dataset.id); break;
      case 'fish-profile': behaviorModal(); break;
      case 'student-day': studentDayModal(); break;
      case 'manage-panel': closeModal(); $('aquarium').classList.remove('panel-hidden'); updatePanelToggle(); break;
      case 'reward-behavior': if (!modal.open || !modal.classList.contains('behavior-modal')) break; button.disabled=true; rewardBehavior(s, button.dataset.id, true); break;
      case 'back': if (modal.open) behaviorModal(); else { selected = ''; renderPanel(); } break;
      case 'tab': tab = button.dataset.tab; selected = ''; renderPanel(); break;
      case 'task-status': if (button.dataset.status === 'done') rewardBehavior(s, button.dataset.id); else if (s && C.setTask(s, today, button.dataset.id, button.dataset.status)) commit(); refreshStudentDialog(); break;
      case 'feed': if (s && C.feed(s, today)) { commit(); feedingFeedback(s); refreshStudentDialog(); } break;
      case 'absence': if (s) { day(s).absent = !day(s).absent; commit(); refreshStudentDialog(); } break;
      case 'edit-student': editStudentModal(); break;
      case 'history': historyPage=0; historyModal(); break;
      case 'history-newer': historyPage=Math.max(0,historyPage-1); historyModal(); break;
      case 'history-older': historyPage++; historyModal(); break;
      case 'growth': growthModal(); break;
      case 'teacher-fish': teacherFishModal(); break;
      case 'revoke-point': case 'delete-point': {
        if(!s) break;
        const date=button.dataset.date,id=button.dataset.id,remove=action==='delete-point';
        const task=s.days[date]?.tasks.find(t=>t.id===id); if(!task) break;
        confirm(remove?'Bu puan kaydını sil?':'Bu puanı geri al?', s.name+' · '+task.title+' · '+date+'. '+(task.status==='done'&&!s.days[date].absent?C.taskPoints(task)+' puan toplamdan çıkarılacak. ':'')+(remove?'Bu günün kaydı kalıcı olarak silinecek.':'Görev yeniden bekliyor durumuna gelecek.'),()=>{if(C.correctAward(s,date,id,remove)){commit();historyModal();toast(remove?'Seçili kayıt silindi.':'Puan geri alındı.');}});
        break;
      }
      case 'remove-student': if (s) confirm('Öğrenciyi akvaryumdan çıkar?', s.name + ' ve bu akvaryumdaki görev geçmişi kaldırılacak. Geri yüklemek için önceden alınmış yedek gerekir.', () => { classroom().students = classroom().students.filter(x => x.id !== s.id); selected = ''; commit(); }); break;
      case 'remove-task': classroom().tasks = classroom().tasks.filter(t => t.id !== button.dataset.id); commit(); tasksModal(); break;
      case 'new-class': openModal('Yeni bir sınıf', '<form id="newClassForm"><label class="field">Sınıf adı<input name="name" placeholder="Örn. 2-A" maxlength="80" required autofocus></label><p class="form-error" id="formError" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Sınıfı oluştur</button></div></form>'); break;
      case 'import-class': importClassesModal(); break;
      case 'import-selected': {
        const source = importedClasses[Number(button.dataset.index)];
        if (!source) break;
        if (state.classes.length >= 30 || source.students.length > 60) return toast('En fazla 30 sınıf ve sınıf başına 60 öğrenci aktarılabilir.');
        const cls = C.newClass(source.name);
        cls.students = source.students.filter(x => x && C.clean(x.name)).map(x => C.newStudent(x.name));
        state.classes.push(cls); state.activeClassId = cls.id; selected = ''; ensureDays(); closeModal(); commit(); toast(cls.students.length + ' öğrenci yeni akvaryuma eklendi.'); break;
      }
      case 'export': exportData(demo ? beforeDemo : state, 'sinif-akvaryumu-' + today + '.json'); break;
      case 'export-raw': try { exportData(localStorage.getItem(KEY) || '{}', 'akvaryum-kurtarma-' + today + '.json'); } catch (e) { toast('Tarayıcı kaydına erişilemiyor.'); } break;
      case 'panel': $('aquarium').classList.toggle('panel-hidden'); updatePanelToggle(); break;
      case 'fullscreen': try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('aquariumApp').requestFullscreen) await $('aquariumApp').requestFullscreen(); else toast('Bu tarayıcı tam ekranı desteklemiyor.'); } catch (e) { toast('Tam ekran açılamadı. Tarayıcı iznini kontrol edin.'); } break;
    }
  }
  function updatePanelToggle() {
    const hidden = $('aquarium').classList.contains('panel-hidden');
    const button = document.querySelector('[data-action="panel"]');
    button.title = hidden ? 'Sınıf yönetimini aç' : 'Sınıf yönetimini gizle';
    button.setAttribute('aria-expanded', String(!hidden)); button.setAttribute('aria-label', hidden ? 'Sınıf yönetimini aç' : 'Sınıf yönetimini gizle');
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (button && !button.disabled) act(button); });
  modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
  modal.addEventListener('close', () => { releaseFish(); confirmAction = null; pendingRestore = null; });
  document.addEventListener('submit', event => {
    const form = event.target; if (!modal.contains(form)) return; event.preventDefault(); if (viewing) return;
    const data = new FormData(form);
    if (form.id === 'growthForm') {
      const enabled=data.get('mode')==='growth', thresholds=enabled ? Array.from({length:10},(_,i)=>Number(data.get('target'+i))) : (classroom().growth?.thresholds || C.defaultThresholds());
      if(!C.validThresholds(thresholds)) { $('formError').textContent='1–1.000.000 arasında, artan sırada 10 tam sayı girin.'; return; }
      classroom().growth={enabled,thresholds}; closeModal(); commit(); toast(enabled?'Büyüme yolculuğu başladı. Mevcut puanlar korundu.':'Normal görünüm açıldı. Puanlar korundu.');
    } else if(form.id === 'teacherFishForm') {
      const name=C.clean(data.get('name')); if(!name) return;
      classroom().teacher={name,species:C.species(data.get('species')).id,enabled:form.querySelector('[name="enabled"]').checked};
      closeModal();commit();toast('Öğretmen balığı kaydedildi.');
    } else if (form.id === 'groupRewardForm') {
      if (!modal.open || form.dataset.submitted === 'true') return;
      if(form.dataset.classId!==classroom().id || form.dataset.date!==C.dayKey()) { refreshDate(); closeModal(); return toast('Sınıf veya gün değişti. Öğrencileri yeniden seçin.'); }
      const ids=[...form.querySelectorAll('[name="studentId"]')].filter(el=>el.checked&&!el.disabled).map(el=>el.value);
      const results=C.rewardGroup(classroom(),today,String(data.get('taskId')),ids);
      if(!results.length) return;
      form.dataset.submitted = 'true';
      closeModal(); commit();
      // One sound and a bounded number of effects keep large classes quiet and responsive.
      const fed=results.filter(r=>r.fed); fed.slice(0,6).forEach(r=>feedEffect(r.id,r.points));
      if(fed.length && state.settings.feedSound) {Audio.setVolume(state.settings.volume);Audio.feed().catch(e=>toast(e.message));}
      toast(results.length+' öğrenciye toplam +'+results.reduce((n,r)=>n+r.points,0)+' puan verildi · '+fed.length+' balık beslendi.');
    } else if (form.id === 'goalForm') {
      if(form.dataset.classId!==classroom().id) return;
      const title=C.clean(data.get('title'),120),target=Number(data.get('target'));
      if(!title || !C.validGoalTarget(target)) { $('formError').textContent='Bir hedef adı ve 1–1.000.000 arasında tam sayı puan girin.'; return; }
      if(form.dataset.new==='true' || !classroom().goal) C.startGoal(classroom(),title,target);
      else Object.assign(classroom().goal,{title,target});
      classroom().goal.enabled=form.querySelector('[name="enabled"]').checked;
      commit(); activitiesModal(); toast('Ortak hedef kaydedildi. Öğrenci puanları korundu.');
    } else if (form.id === 'timerForm') {
      if(!focusTimer.start(Number(data.get('minutes')),data.get('title'))) { $('formError').textContent='Etkinlik adı ve 1–60 arasında tam sayı dakika girin.'; return; }
      timerClassId=classroom().id; timerNotified=false; closeModal(); updateTimer();
    } else if (form.id === 'addForm') {
      const names = String(data.get('names') || '').split(/\r?\n/).map(n => C.clean(n)).filter(Boolean);
      if (!names.length) { $('formError').textContent = 'En az bir öğrenci adı yazın.'; return; }
      if (classroom().students.length + names.length > 60) { $('formError').textContent = 'Bir akvaryuma en fazla 60 öğrenci ekleyebilirsiniz.'; return; }
      if (data.has('className')) { if (!C.clean(data.get('className'))) { $('formError').textContent = 'Bir sınıf adı yazın.'; return; } classroom().name = C.clean(data.get('className')); }
      const newStudents = names.map(name => C.newStudent(name, data.get('species')));
      classroom().students.push(...newStudents); ensureDays(); closeModal(); commit(); toast(names.length + ' deniz dostu aramıza katıldı.');
    } else if (form.id === 'chooseForm') {
      const s = classroom().students.find(x => x.id === data.get('studentId')); if (!s) return;
      s.species = C.species(data.get('species')).id; closeModal(); commit(); toast(s.name + ' için ' + C.species(s.species).name.toLocaleLowerCase('tr-TR') + ' seçildi.');
    } else if (form.id === 'renameClassForm' || form.id === 'newClassForm' || form.id === 'editStudentForm') {
      const name = C.clean(data.get('name')); if (!name) return;
      if (form.id === 'newClassForm') {
        if (state.classes.length >= 30) { $('formError').textContent = 'En fazla 30 sınıf ekleyebilirsiniz.'; return; }
        const cls = C.newClass(name); state.classes.push(cls); state.activeClassId = cls.id; selected = '';
      } else if (form.id === 'editStudentForm') { if (student()) student().name = name; }
      else classroom().name = name;
      closeModal(); commit(); toast('Kaydedildi.');
    } else if (form.id === 'mixFavoriteForm') {
      const name=C.clean(data.get('name'),60);
      if(!name || !state.settings.mix.length){$('mixError').textContent='Bir ad yazın ve en az bir ses seçin.';return;}
      if(state.settings.favorites.length>=24){$('mixError').textContent='En fazla 24 favori saklanabilir. Önce bir favoriyi silin.';return;}
      state.settings.favorites.push({id:C.uid(),name,volume:state.settings.volume,mix:state.settings.mix.map(t=>({...t}))});save();openModal('Ortam sesleri',soundSettings());toast('Karışım favorilere kaydedildi.');
    } else if (form.id === 'renameMixForm') {
      const favorite=state.settings.favorites.find(f=>f.id===form.dataset.id),name=C.clean(data.get('name'),60);if(favorite&&name){favorite.name=name;save();openModal('Ortam sesleri',soundSettings());}
    } else if (form.classList.contains('task-points-form')) {
      const points = Number(data.get('points'));
      if (!C.updateTask(classroom(), form.dataset.taskId, {points,title:data.get('title'),icon:data.get('icon')}, today)) { $('formError').textContent = 'Puanı 1–1000 arasında tam sayı olarak girin.'; return; }
      commit(); tasksModal(); toast('Davranış düzenlendi. Geçmiş kayıtlar korundu.');
    } else if (form.id === 'taskForm') {
      const title = C.clean(data.get('title'), 120); if (!title) { $('formError').textContent = 'Görev adını yazın.'; return; }
      if (classroom().tasks.length >= 20 || classroom().students.some(s => day(s).tasks.filter(t => !t.sourceId).length >= 20)) { $('formError').textContent = 'Bir günde en fazla 20 farklı davranış olabilir.'; return; }
      const points = Number(data.get('points'));
      if (!C.validPoints(points)) { $('formError').textContent = 'Puanı 1–1000 arasında tam sayı olarak girin.'; return; }
      const task = { id: C.uid(), title, points, icon:C.taskIcon(data.get('icon')) }; classroom().tasks.push(task);
      classroom().students.forEach(s => { const d = day(s); if (!d.tasks.some(t => t.id === task.id)) d.tasks.push({ ...task, status: 'pending' }); });
      commit(); tasksModal(); toast('Yeni görev bugüne eklendi.');
    }
  });
  document.addEventListener('change', async event => {
    const input = event.target; if (viewing) return;
    if (input.dataset.mixEnable) {
      const id=input.dataset.mixEnable,range=modal.querySelector('[data-mix-volume="'+id+'"]'),playing=Audio.isPlaying();
      state.settings.mix=state.settings.mix.filter(t=>t.id!==id);if(input.checked)state.settings.mix.push({id,volume:Number(range.value)/100});
      state.settings.sound=state.settings.mix[0]?.id || 'off';range.disabled=!input.checked;input.closest('.mixer-channel').classList.toggle('is-active',input.checked);save();
      if(playing){try{await Audio.playMix(state.settings.mix);}catch(e){toast(e.message);}}else Audio.stop();
    }
    if (input.name === 'mode'  && $('growthForm')) updateGrowthFields();
    if (input.id === 'groupTask') renderGroupStudents();
    if (input.name === 'studentId' && $('groupRewardForm')) updateGroupSummary();
    if (input.id === 'classSelect') { state.activeClassId = input.value; selected = ''; $('studentSearch').value = ''; ensureDays(); commit(); }
    if (input.id === 'chooseStudent') { const s = classroom().students.find(x => x.id === input.value); if (s) modal.querySelectorAll('[name="species"]').forEach(r => { r.checked = r.value === s.species; }); if ($('speciesSearch')) $('speciesSearch').value = ''; filterSpecies(); }
    if (input.name === 'species') filterSpecies();
    if (input.id === 'namesToggle' || input.id === 'motionToggle') { state.settings[input.id === 'namesToggle' ? 'names' : 'motion'] = input.checked; commit(); }
    if (['hungerTextToggle','classPointsToggle','pointsToggle','chatToggle','feedSoundToggle'].includes(input.id)) { state.settings[({hungerTextToggle:'hungerText',classPointsToggle:'classPoints',pointsToggle:'points',chatToggle:'chat',feedSoundToggle:'feedSound'})[input.id]]=input.checked; if(input.id==='chatToggle' && !input.checked) document.querySelectorAll('.fish-chat.visible').forEach(el=>el.classList.remove('visible')); commit(); }
    if (input.id === 'backupFile') {
      const file = input.files[0]; if (!file) return;
      if (demo) { input.value = ''; return toast('Yedek yüklemek için önce kendi sınıfınıza dönün.'); }
      if (file.size > 8 * 1024 * 1024) { input.value = ''; return toast('Yedek dosyası en fazla 8 MB olabilir.'); }
      try {
        pendingRestore = C.validate(JSON.parse(await file.text()));
        const restored = pendingRestore;
        confirm('Yedeği geri yükle?', restored.classes.length + ' sınıf içeren yedek, bu tarayıcıdaki akvaryum kayıtlarının yerini alacak. Mevcut kayıtlarınızı korumak için önce Yedek indir seçeneğini kullanın. Hesabınızdaki açık izleme bağlantıları kapatılacak.', async () => { try { clearTimeout(syncTimer); await queueShare(()=>window.AquariumSharing.disableAll()); state = restored; focusTimer?.reset(); timerNotified = false; blockedStorage = false; selected = ''; tab = 'students'; today = C.dayKey(); ensureDays(); commit(); toast('Yedek geri yüklendi. Paylaşım kapalı.'); } catch(e) { toast(e.message); } });
      } catch (error) { input.value = ''; toast(error instanceof SyntaxError ? 'Bu dosya geçerli bir JSON yedeği değil.' : error.message); }
    }
  });
  $('studentSearch').addEventListener('input', renderPanel);
  modal.addEventListener('input', event => { if (viewing) return; if(event.target.dataset.mixVolume) {const id=event.target.dataset.mixVolume,layer=state.settings.mix.find(t=>t.id===id);if(layer){layer.volume=Number(event.target.value)/100;Audio.setLayerVolume(id,layer.volume);$('mixValue-'+id).textContent='%'+event.target.value;save();}} if(event.target.id==='volumeRange') {state.settings.volume=Number(event.target.value)/100; Audio.setVolume(state.settings.volume); save();}  if (event.target.id === 'speciesSearch') filterSpecies(); if(event.target.id==='fishFinder') renderFinder(); });
  modal.addEventListener('keydown', event => { if (event.target.id === 'speciesSearch' && event.key === 'Enter') event.preventDefault(); });
  document.querySelector('.panel-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); tab = event.key === 'Home' ? 'students' : event.key === 'End' ? 'tasks' : tab === 'students' ? 'tasks' : 'students'; selected = ''; renderPanel(); $('tab-' + tab).focus();
  });
  window.addEventListener('storage', event => {
    if (viewing || demoOnly) return;
    if (event.key !== KEY || !event.newValue) return;
    try { const updated = C.validate(JSON.parse(event.newValue)); if (demo) beforeDemo = updated; else { state = updated; selected = ''; closeModal(); ensureDays(); render(); toast('Diğer sekmedeki değişiklikler alındı.'); } } catch (e) { storageWarning('Diğer sekmedeki kayıt okunamadı. Bu sayfanın kayıtları korunuyor.'); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshDate(); updateTimer(); } restartAnimation(); });
  reduced.addEventListener('change', render);
  setInterval(refreshDate, 30000);
  if(!viewing) setInterval(updateTimer,1000);
  new ResizeObserver(measure).observe($('swimArea'));
  new ResizeObserver(()=>{if(swimmers.size) renderFish();}).observe($('eggBed'));
  $('bubbles').innerHTML = Array.from({ length: 14 }, (_, i) => '<i class="bubble" style="--size:' + (4 + i % 4 * 3) + 'px;--duration:' + (17 + i % 6 * 3) + 's;--delay:-' + (i * 2.3) + 's;--left:' + (i * 7.4) + '%"></i>').join('');
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) { if(modal.open) closeModal(); releaseFish(); } measure(); });
  if (demoOnly) enterDemo();
  if (viewing) {
    let loading=false;
    async function refreshView() {
      if(loading || document.hidden) return; loading=true;
      try { const data=await readView(); state=viewState(data); document.body.classList.remove('access-pending'); render(); }
      catch(e) { state=viewState({students:[]}); swimmers.forEach(f=>f.el.remove()); swimmers.clear(); lockAccess(e.message); if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
      finally { loading=false; }
    }
    setInterval(refreshView,7000);
    document.addEventListener('visibilitychange',()=> { if(document.hidden) { swimmers.forEach(f=>f.el.remove()); swimmers.clear(); document.body.classList.add('access-pending'); } else refreshView(); });
  }
  if(cloud){setInterval(refreshCloud,15000);window.addEventListener('online',refreshCloud);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCloud();});window.addEventListener('beforeunload',event=>{try{if(JSON.parse(localStorage.getItem(KEY+'_cloud')||'{}').dirty){event.preventDefault();event.returnValue='';}}catch(e){}});}
  updatePanelToggle(); measure(); ensureDays(); render();
  if (blockedStorage) save(); else if (cloud) { $('saveStatus').textContent=cloudMessage || 'Hesap kaydı hazır.'; } else if (classroom().students.length) { save(); scheduleShare(); }
})();
