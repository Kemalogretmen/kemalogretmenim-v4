(async function () {
  'use strict';
  const C = window.AquariumCore, Motion = window.AquariumMotion, Anatomy = window.AquariumAnatomy;
  let KEY = 'kemal_class_aquarium_v1';
  const params = new URLSearchParams(location.search), childViewing = params.has('cocuk'), viewToken = params.get(childViewing ? 'cocuk' : 'izle');
  const viewing = params.has('izle') || childViewing, demoOnly = !viewing && params.get('demo') === '1';
  // This preference belongs to the device, never to a shared class snapshot.
  const CREATURE_MODE_KEY='kemal_aquarium_creature_mode';
  const CREATURE_SIZE_KEY='kemal_aquarium_display_size';
  let creatureMode='natural';
  let creatureDisplaySize=100;
  let creatureRenderer=null,creatureFallback='',modelPaintAt=-Infinity,modelSlowBatches=0;
  const MODEL_INTERVAL=1000/18,MODEL_LIMIT=12;
  let shareRecord = null, shareQueue = Promise.resolve(), syncTimer;
  let cloud=null,cloudTimer,cloudBusy=false,cloudMessage='',cloudRerun=false,cloudRetryDelay=2000;
  let live=null,liveLastAccountCheck=0,livePickerPending=null,liveDrawPending=false;
  let cloudSettled=Promise.resolve();
  const Audio = window.AquariumAudio;
  const conversations=window.AquariumSocial.create();
  const $ = id => document.getElementById(id);
  const water=window.AquariumWater?.create($('waterLight'),$('waterWaves'));
  const Seasonal=window.AquariumSeasonal;
  const seasonal=Seasonal?.create($('seasonalSnowman'),$('seasonalSnow'),{republic:$('republicDecor'),flag:$('republicFlag')});
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
  // Tail joints measured on the right-facing, transparent source sprites.
  // Non-fish swimmers retain their own motion profile instead of a fish tail.
  const tailJoints = {clown:29,tang:26,butterfly:20,yellowtang:24,angelfish:27,
    mandarin:29,lionfish:26,puffer:23,gramma:26,firefish:38,triggerfish:24,
    shark:23,dolphin:22,royalblue:24,copperband:20,discus:25,betta:49,
    goldfish:44,guppy:43,neon:25,cardinal:36,anthias:31,goby:28,
    blenny:24,parrot:24,wrasse:27,moorish:29,rabbit:25,flame:25,
    boxfish:30,bannerfish:39,batfish:30,swordfish:22,safiye:29};
  const background = id => '/assets/akvaryum/arka-planlar/' + (C.THEMES.find(t => t.id === id) || C.THEMES[0]).file;
  function renderBubbles(theme) {
    const layer=$('bubbles'),amount=C.waterSettings(state.settings).bubbleAmount;
    const count=Math.round((window.SitePerformance?.lite()?6:14)*amount/100);
    updateBubbleTravel();
    layer.style.setProperty('--bubble-opacity',String(.65+(amount-50)/100*.35));
    if(layer.dataset.theme!==theme.id){layer.innerHTML='';layer.dataset.theme=theme.id;}
    // Grow a bounded pool; existing bubbles retain their animation phase.
    for(let i=layer.children.length;i<count;i++) {
      const bubble=document.createElement('i');bubble.className='bubble';
      const sources=theme.bubbleSources,left=sources?sources[i%sources.length]+(i%3-1)*2.2:(i*37.9)%100;
      bubble.style.cssText='--size:'+(4+i%4*3)+'px;--duration:'+(17+i%6*3)+'s;--delay:-'+(i*2.3)+'s;--left:'+left+'%';
      layer.append(bubble);
    }
    Array.from(layer.children).forEach((bubble,i)=>{bubble.hidden=i>=count;
      bubble.style.setProperty('--size',Math.min(16,(4+i%4*3)*(1+(amount-100)*.003)).toFixed(1)+'px');
    });
  }
  function updateBubbleTravel() {
    const sceneHeight=$('bubbles').getBoundingClientRect().height;
    $('bubbles').style.setProperty('--bubble-rise',Math.ceil((sceneHeight||height||600)+60)+'px');
  }
  const effectRanges={bubbleAmountRange:['bubbleAmount',150],lightStrengthRange:['lightStrength',125],waveStrengthRange:['waveStrength',150]};
  const effectCaption=value=>'%'+value+(value===100?' · Doğal':value<100?' · Hafif':' · Biraz daha belirgin');
  function effectRange(id,label) {
    const [key,max]=effectRanges[id],value=C.waterSettings(state.settings)[key];
    return '<label class="effect-range" for="'+id+'"><span>'+label+'</span><output id="'+id+'Value" for="'+id+'">'+effectCaption(value)+'</output><input id="'+id+'" type="range" min="50" max="'+max+'" step="5" aria-label="'+esc(label)+'" '+(key==='waveStrength'&&!state.settings.waterWaves?'disabled':'')+' value="'+value+'" aria-valuetext="'+effectCaption(value)+'"><small>Hafif · Doğal · Biraz daha belirgin</small></label>';
  }
  function applyWaterEffects() {
    const levels=C.waterSettings(state.settings);
    $('aquariumApp').classList.toggle('still-light',!state.settings.lightMotion);
    $('waterWaves').hidden=!state.settings.waterWaves;
    water?.configure({...levels,motion:state.settings.motion&&!reduced.matches,
      lightMotion:state.settings.lightMotion,waterWaves:state.settings.waterWaves,lite:!!window.SitePerformance?.lite()});
    resizeWater();water?.draw(performance.now());
    if($('waveStrengthRange'))$('waveStrengthRange').disabled=!state.settings.waterWaves;
    renderBubbles(C.THEMES.find(t=>t.id===classroom().theme)||C.THEMES[0]);
    seasonal?.update(classroom().theme,{motion:state.settings.motion,reduced:reduced.matches,lite:!!window.SitePerformance?.lite()});
  }
  function resizeWater(){
    if(!water)return;
    const rect=$('aquarium').getBoundingClientRect();
    water.resize(rect.width,rect.height,!!window.SitePerformance?.lite());
  }
  function updateEffectRange(input,persist=false) {
    const entry=effectRanges[input.id];if(!entry)return false;
    const [key]=entry,value=C.waterSettings({[key]:Number(input.value)})[key];
    state.settings[key]=value;input.value=String(value);input.setAttribute('aria-valuetext',effectCaption(value));
    if($(input.id+'Value'))$(input.id+'Value').textContent=effectCaption(value);
    applyWaterEffects();if(persist){save();scheduleShare();}return true;
  }
  const filterText = value => String(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  function lockAccess(message, recoverable = false) {
    window.AquariumStartup?.blocked();
    document.body.classList.add('access-pending'); $('accessMessage').textContent = message;
    $('accessLinks').hidden = viewing || recoverable;
    $('accessRetry').hidden = !recoverable;
  }
  // A stalled CDN/session request must never leave the access gate spinning
  // forever. This only bounds waiting; it never grants teacher access.
  async function waitForAuth(retry=false) {
    let timeout;
    try {
      return await Promise.race([
        retry ? window.kemalUserAuth.retry() : window.kemalUserAuth.ready(),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Oturum kontrolü zaman aşımına uğradı.')),12000);})
      ]);
    } finally {clearTimeout(timeout);}
  }
  $('accessRetry').addEventListener('click',async()=>{
    const button=$('accessRetry');button.disabled=true;button.textContent='Oturum kontrol ediliyor…';
    $('accessMessage').textContent='Kayıtlı oturumunuz yeniden doğrulanıyor; tekrar giriş yapmanız gerekmiyor.';
    try {
      const auth=await waitForAuth(true);
      if(!auth.error && auth.user && auth.profile) { location.reload(); return; }
      if(!auth.error && !auth.user) { lockAccess('Bu tarayıcıda açık bir öğretmen oturumu bulunamadı.'); return; }
      $('accessMessage').textContent='Oturum korunuyor ancak hesap bilgileri alınamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.';
    } catch(e) { $('accessMessage').textContent='Oturum korunuyor ancak doğrulama tamamlanamadı. Biraz sonra yeniden deneyin.'; }
    finally { button.disabled=false;button.textContent='Oturumu yeniden dene'; }
  });
  if (params.has('veli') && !viewing) {
    lockAccess('Öğretmeninizin çocuğunuza özel verdiği veli kodunu girin.');
    $('accessLinks').hidden = true;
    const form=document.createElement('form'); form.className='parent-code-form';
    form.innerHTML='<label class="field">Veli izleme kodu<input name="code" required autocomplete="off" spellcheck="false" placeholder="Çocuğunuza özel kod veya bağlantı"></label><button class="button primary">Çocuğumun balığını izle</button><p class="settings-note">Öğretmenin seçimine göre kendi çocuğunuz veya tüm sınıf görünür. Puan geçmişi yalnızca çocuğunuza açılır; besleme veya düzenleme yapılamaz.</p>';
    $('accessGate').append(form);
    form.addEventListener('submit',event=> { event.preventDefault(); let code=form.elements.code.value.trim();
      try { if(code.includes('://')) code=new URL(code).searchParams.get('cocuk') || ''; } catch(e) { code=''; }
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(code)) { $('accessMessage').textContent='Geçerli veli kodunu veya çocuğa özel bağlantıyı girin.'; return; }
      location.href=location.pathname+'?cocuk='+encodeURIComponent(code);
    });
    return;
  }
  let viewSnapshot = null;
  let parentPeriod='day',parentPage=0,parentReport=null,parentHistoryEpoch=0,parentHistoryController=null,parentHistoryLoading=false;
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
    const cls = C.newClass(C.clean(data.name)); cls.id='view-class'; cls.theme = C.THEMES.some(t => t.id === data.theme) ? data.theme : 'reef';
    cls.students = data.students.slice(0,60).map((s,i) => ({ ...C.newStudent(C.clean(s.name), s.species), id: 'view-' + (/^[\w-]{1,96}$/.test(s.id || '') ? s.id : i), isOwnChild:childViewing && s.id==='my-child', appearance:{egg:s.appearance?.egg===true,scale:Number.isFinite(s.appearance?.scale)?Math.max(.35,Math.min(1,s.appearance.scale)):1,trophy:data.settings?.points===true && (!childViewing || s.id==='my-child') && s.appearance?.trophy===true}, publicMood: ['happy','sad','resting','ready','calm','hungry'].includes(s.mood) ? s.mood : 'calm', publicPoints: !data.settings?.points || (childViewing && s.id!=='my-child') ? null : Number.isFinite(s.points) ? Math.max(0,s.points) : null }));
    if((!childViewing || data.viewScope==='class') && data.teacher && typeof data.teacher.species==='string') cls.teacher={enabled:true,name:C.clean(data.teacher.name),species:C.species(data.teacher.species).id};
    return { version:1, classes:[cls], activeClassId:cls.id, settings:C.settingsOf({...data.settings, classPoints: !childViewing && data.settings?.classPoints === true}), publicClassPoints: !childViewing && data.settings?.classPoints===true && Number.isFinite(data.classPoints) ? Math.max(0,data.classPoints) : null };
  }
  if (viewing) {
    document.body.classList.add('view-only');
    document.body.classList.toggle('parent-view',childViewing);
    try { viewSnapshot = await readView(); } catch (e) { lockAccess(e.message); return; }
  } else if (!demoOnly) {
    try {
      window.AquariumStartup?.phase('Öğretmen oturumu doğrulanıyor…');
      await waitForAuth();
      if(window.kemalUserAuth.getState().error) { lockAccess('Kayıtlı oturumunuz duruyor ancak hesap bilgileri geçici olarak alınamadı. Yeniden giriş yapmak yerine oturumu yeniden deneyin.',true); return; }
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
    } catch (e) { lockAccess('Oturum kontrolü tamamlanamadı. Oturumu yeniden deneyebilir veya hesapsız örnek sınıfı açabilirsiniz. Yerel önizleme, canlı sitedeki oturumu kullanmaz.',true); return; }
  }
  if(!viewing)try {const saved=localStorage.getItem(CREATURE_MODE_KEY);if(['classic','natural','3d'].includes(saved))creatureMode=saved;}catch(_){}
  if(!viewing)try {const saved=Number(localStorage.getItem(CREATURE_SIZE_KEY));if([100,150,200].includes(saved))creatureDisplaySize=saved;}catch(_){}
  let blockedStorage = false;
  let state;
  try { const raw = viewing || demoOnly ? null : localStorage.getItem(KEY); state = raw ? C.validate(JSON.parse(raw)) : C.initialState(); }
  catch (error) { state = C.initialState(); blockedStorage = true; }
  if (viewing) state = viewState(viewSnapshot);
  if (!viewing && !demoOnly && !blockedStorage && window.AquariumCloud) {
    cloud=window.AquariumCloud.create({client:window.kemalUserAuth.getClient(),ownerId:window.kemalUserAuth.getUser().id,storage:localStorage,key:KEY,getState:()=>state,project:window.AquariumSharing.snapshot,onStatus:message=>setCloudStatus(message,cloud?.isConflict()===true)});
    window.AquariumStartup?.phase('Sınıf kaydı yükleniyor…',60000);
    try { state=await cloud.boot(state);localStorage.setItem(KEY,JSON.stringify(state)); }
    catch(e){setCloudStatus(e.message,true);}
  }

  document.body.classList.remove('access-pending');
  let demo = false, beforeDemo = null, selected = '', tab = 'students', today = C.dayKey(), toastTimer;
  let importedClasses = [], pendingRestore = null, confirmAction = null;
  const modal = $('modal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const swimmers = new Map();
  let frame = 0, lastTime = 0, width = 0, height = 0, inspectedId = '';
  let highlightTimer;
  let teacherVisit=null;
  const teacherVisitQueue=[];
  const pickerRounds = new Map();
  let pickerFrame = 0, pickerEpoch = 0, pickerResult = null;
  const focusTimer = viewing ? null : window.AquariumTimer.create();
  let timerClassId = state.activeClassId, timerNotified = false;
  const classroom = () => state.classes.find(c => c.id === state.activeClassId) || state.classes[0];
  const student = () => classroom().students.find(s => s.id === selected);
  const day = s => C.ensureDay(s, classroom(), today);
  const ensureDays = () => { if (!viewing) classroom().students.forEach(day); };
  const fishMood = s => s.isTeacher ? {id:'calm',speed:.65,label:'Birlikte öğreniyoruz'} : viewing ? { id:s.publicMood, speed:({happy:1.1,sad:.3,resting:.18,ready:.7,calm:.6,hungry:0})[s.publicMood], symbol:'', label:'' } : C.mood(s,today);
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
  const shareSaves=new WeakMap();
  async function saveShareControl(control) {
    if(!control)return false;
    const pending=shareSaves.get(control);if(pending)return pending;
    const value=control.value,previous=control.dataset.saved;
    if(value===previous)return true;
    const row=control.closest('.child-share') || control.closest('.settings-section');
    const buttons=[...row.querySelectorAll('button')],message=row.querySelector('.share-save-status');
    control.disabled=true;buttons.forEach(b=>b.disabled=true);
    if(message)message.textContent='Görünüm kaydediliyor…';
    const job=(async()=>{
      try {
        await queueShare(()=>control.dataset.linkId
          ? window.AquariumSharing.updateChildScope(control.dataset.linkId,value)
          : window.AquariumSharing.updatePublicPoints(control.dataset.shareId,value==='points'));
        control.dataset.saved=value;
        if(message)message.textContent='Kaydedildi · Açık izleme ekranına birkaç saniyede yansır.';
        return true;
      }catch(e){control.querySelectorAll('option').forEach(o=>o.selected=false);const savedOption=[...control.querySelectorAll('option')].find(o=>o.value===previous);if(savedOption)savedOption.selected=true;if(message)message.textContent='Kaydedilemedi. Önceki görünüm korunuyor.';toast(e.message);return false;}
      finally{control.disabled=false;buttons.forEach(b=>b.disabled=false);shareSaves.delete(control);}
    })();
    shareSaves.set(control,job);return job;
  }
  async function sharingModal() {
    if (demo || demoOnly) return toast('Paylaşım için öğretmen hesabınızla kendi sınıfınızı açın.');
    rememberModal('sharingModal',()=>sharingModal());
    openModal('Veli kodları ve sınıf paylaşımı', '<p>Paylaşım durumu kontrol ediliyor…</p>');
    const cls=classroom(), id=cls.id;
    try {
      const results=await Promise.all([window.AquariumSharing.get(id),window.AquariumSharing.listOpen()]); shareRecord=results[0];
      const children=await window.AquariumSharing.childLinks(shareRecord?.id);
      if(shareRecord)await queueShare(()=>window.AquariumSharing.sync(cls,state.settings));
      if (!modal.open || id !== classroom().id || modalRoute?.key!=='sharingModal') return;
      const link = new URL(location.pathname,location.origin); link.searchParams.set('izle', shareRecord?.token || '');
      const entry=new URL(location.pathname+'?veli=1',location.origin);
      const publicPoints=shareRecord?.show_points ?? (shareRecord?.enabled===true && state.settings.points===true);
      const childRows=cls.students.map(student=> {
        const row=children.find(r=>r.student_id===student.id && r.enabled);
        const url=new URL(location.pathname,location.origin); if(row) url.searchParams.set('cocuk',row.token);
        const scope=row?.view_scope==='class'?'class':'child';
        const control='<label class="field">Veli akvaryum görünümü<select id="childScope-'+esc(student.id)+'" data-saved="'+scope+'" data-link-id="'+esc(row?.id || '')+'"><option value="child" '+(scope==='child'?'selected':'')+'>Yalnızca kendi çocuğu</option><option value="class" '+(scope==='class'?'selected':'')+'>Tüm balıklar · Diğer öğrencilerin puanları gizli</option></select></label>';
        return '<div class="child-share"><strong>'+esc(student.name)+'</strong>'+control+(row ? '<p class="settings-note share-save-status" role="status">Görünüm seçimi otomatik kaydedilir.</p><label class="field">Çocuğa özel veli kodu<input readonly value="'+esc(row.token)+'"></label><div class="settings-actions"><button class="button" data-action="copy-child" data-student="'+esc(student.id)+'" data-link="'+esc(url.href)+'">Bağlantıyı kopyala</button><button class="button" data-action="copy-child" data-student="'+esc(student.id)+'" data-link="'+esc(row.token)+'">Kodu kopyala</button><button class="button" data-action="update-child-scope" data-id="'+esc(row.id)+'" data-student="'+esc(student.id)+'">Görünümü kaydet</button><button class="button danger" data-action="disable-child" data-id="'+esc(row.id)+'">Kodu kapat</button></div>' : '<button class="button" data-action="enable-child" data-student="'+esc(student.id)+'">Veli kodu oluştur</button>')+'</div>';
      }).join('');
      openModal('Veli kodları ve sınıf paylaşımı','<p class="modal-intro">Her veliye kendi çocuğunun kodunu verin. Veliye yalnızca kendi çocuğunu veya tüm sınıfın balıklarını gösterin. Diğer öğrencilerin puanları ve geçmişleri gizlidir. Veli yalnızca kendi çocuğunun balığına dokunarak günlük, haftalık, aylık ve tüm zamanlar puan geçmişini görebilir. Besleme veya düzenleme yapamaz.</p><p class="settings-note">Veli kod giriş adresi: <a href="'+esc(entry.href)+'">'+esc(entry.href)+'</a>. Kod özel bir erişim anahtarıdır; yalnızca ilgili veliyle paylaşın.</p><div class="child-shares">'+(childRows || '<p>Veli kodu oluşturmak için önce öğrenci ekleyin.</p>')+'</div><div class="settings-section"><h3>Tüm ziyaretçilere sınıfı göster</h3><p class="settings-note">Bu ayrı izin açılırsa sınıf bağlantısını alan herkes tüm balıkları görür. Veli kodunun görünümü yukarıdaki öğrenciye özel seçimden bağımsız yönetilir; ayrıntılar yalnızca kendi çocuğuna açılır.</p><p class="share-state">'+(shareRecord?.enabled?'● Sınıfın tamamı izlemeye açık':'○ Sınıfın tamamı izlemeye kapalı')+'</p><label class="field">Ziyaretçi puan görünümü<select id="publicSharePoints" data-share-id="'+esc(shareRecord?.id || '')+'" data-saved="'+(publicPoints?'points':'hidden')+'"><option value="hidden" '+(!publicPoints?'selected':'')+'>Puansız paylaş · Balıklar ve isimleri</option><option value="points" '+(publicPoints?'selected':'')+'>Puanlı paylaş · Balıklar, isimleri ve puanları</option></select></label><p class="settings-note share-save-status" role="status">Boyut ve büyüme her iki görünümde de korunur. Paylaşım açıkken seçiminiz otomatik kaydedilir.</p>'+(shareRecord?.enabled?'<label class="field">Tüm sınıf bağlantısı<input id="shareLink" readonly value="'+esc(link.href)+'"></label><div class="settings-actions"><button class="button" data-action="copy-share">Sınıf bağlantısını kopyala</button><button class="button danger" data-action="disable-share">Tüm sınıf paylaşımını kapat</button></div>':'<button class="button primary" data-action="enable-share">Tüm ziyaretçilere sınıfı aç</button>')+'<p class="settings-note">Kapatılan kod ve bağlantılar açık izleyici ekranında en geç yaklaşık 15 saniyede kapanır. Yeniden açıldığında yeni kod oluşur.</p></div>'+results[1].filter(row=>row.local_id!==id).map(row=>'<div class="task-template"><span>'+esc(row.snapshot?.name || 'Sınıf')+'</span><button class="button danger" data-action="disable-other-share" data-id="'+esc(row.id)+'">Sınıf paylaşımını kapat</button></div>').join(''));
    } catch(e) { if(modal.open && modalRoute?.key==='sharingModal') openModal('Paylaşım kullanılamıyor','<p class="modal-intro">'+esc(e.message)+'</p>'); }
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
    return '<div class="sound-studio"><p class="modal-intro">Bir müzik seçin, üzerine hafif yağmur ya da kuş sesi ekleyin. Her sesi ayrı ayarlayabilirsiniz.</p><div class="mixer-master"><p id="musicStatus" role="status">'+(Audio.isPlaying()?'Çalıyor: '+esc(Audio.describe()):'Sesleri seçin ve karışımı başlatın.')+'</p><div class="settings-actions"><button class="button primary" data-action="play-sound">▶ Karışımı başlat</button><button class="button" data-action="pause-mix">Ⅱ Duraklat</button><button class="button" data-action="stop-sound">Durdur</button></div><label class="field">Genel ses düzeyi<input id="volumeRange" type="range" min="0" max="100" value="'+Math.round(state.settings.volume*100)+'"></label></div>'+mixer+'<section class="mixer-favorites"><h3>★ Favori karışımlarım</h3><form id="mixFavoriteForm" class="inline-form"><label class="field">Karışım adı<input name="name" maxlength="60" required placeholder="Örn. Yağmurlu kitap saati"></label><button class="button primary" type="submit">Favorilere kaydet</button></form><p id="mixError" class="form-error" role="alert"></p>'+state.settings.favorites.map(f=>'<div class="mix-favorite"><div><strong>'+esc(f.name)+'</strong><small>'+f.mix.map(t=>esc(Audio.titles[t.id])).join(' + ')+'</small></div><div class="settings-actions"><button class="button" data-action="load-mix" data-id="'+f.id+'">▶ Çal</button><button class="button subtle" data-action="rename-mix" data-id="'+f.id+'">Adlandır</button><button class="button subtle" data-action="delete-mix" data-id="'+f.id+'">Sil</button></div></div>').join('')+'<p class="settings-note">Favoriler öğretmen hesabınıza kaydedilir ve akvaryum yedeğine dahil edilir. En fazla 24 karışım saklanabilir.</p></section><label class="toggle-row">Beslerken küçük bir melodi çal<input id="feedSoundToggle" type="checkbox" '+(state.settings.feedSound?'checked':'')+'></label><p class="settings-note">Sesler otomatik başlamaz. Nota altındaki düğme bütün karışımı duraklatır veya sürdürür. Sekme değiştirirken çalmaya devam eder.</p><p class="music-credit">Müzikler: Kevin MacLeod · CC BY 4.0. Mevsimlik müzikler: bu site için hazırlanmış enstrümantal kayıtlar. Doğa kayıtları: Eric Matyas / soundimage.org, isaiah658, Ylmir ve RandomMind. <a href="/assets/akvaryum/muzikler/LISANS.md" target="_blank" rel="noopener">Eserler, düzenlemeler ve lisanslar</a></p></div>';
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
      if(cloud){cloud.markDirty(state);clearTimeout(cloudTimer);cloudTimer=setTimeout(flushCloud,0);} }
    catch (error) { storageWarning('Tarayıcı kaydı yapılamadı. Yaptığınız değişiklikleri kaybetmemek için Ayarlar → Yedek indir seçeneğini kullanın.'); }
  }
  function setCloudStatus(message,problem=false) {
    cloudMessage=message;$('saveStatus').textContent=message;
    const warning=$('cloudWarning');warning.hidden=!problem;
    $('cloudWarningMessage').textContent=problem?message:'';
    $('cloudRetryButton').textContent=cloud?.isConflict()?'Kayıtları karşılaştır':'Şimdi eşitle';
    if($('cloudStateDescription'))$('cloudStateDescription').textContent=message;
  }
  function applyCloudState(updated) {
    if(JSON.stringify(updated)===JSON.stringify(state))return;
    const active=state.activeClassId,selectedBefore=selected,scroll=modal.scrollTop,focused=document.activeElement?.id;
    const previousClass=state.classes.find(c=>c.id===active),knownDeductions=new Set((previousClass?.students||[]).flatMap(s=>(s.days[today]?.tasks||[]).filter(t=>t.status==='done'&&C.taskPoints(t)<0).map(t=>t.id)));
    state=updated;if(state.classes.some(c=>c.id===active))state.activeClassId=active;
    if(!classroom().students.some(s=>s.id===selected))selected='';
    localStorage.setItem(KEY,JSON.stringify(state));ensureDays();render();
    if(previousClass?.id===classroom().id)for(const s of classroom().students)if((s.days[today]?.tasks||[]).some(t=>t.status==='done'&&C.taskPoints(t)<0&&!knownDeductions.has(t.id)))startTeacherVisit(s);
    if(previousClass?.id===classroom().id)for(const s of classroom().students){
      const old=previousClass.students.find(p=>p.id===s.id);
      if(s.species!=='puffer'||!old)continue;
      const known=new Set((old.days[today]?.tasks||[]).filter(t=>t.status==='done').map(t=>t.id));
      if((s.days[today]?.tasks||[]).some(t=>t.status==='done'&&C.taskPoints(t)>0&&!known.has(t.id)))feedEffect(s.id,1,{particles:false});
    }
    // Refresh score-only views even while open. Leave typed forms untouched.
    if(modal.open && ['behaviorModal','studentDayModal','historyModal','seasonDashboardModal'].includes(modalRoute?.key)) {
      if(selectedBefore && !selected){closeModal();toast('Seçili öğrenci diğer cihazda kaldırılmış.');return;}
      const route=modalRoute;goingBack=true;try{route.render();modal.scrollTop=scroll;if(focused)$(focused)?.focus({preventScroll:true});}finally{goingBack=false;}
    }
    if(livePickerPending)presentSharedPick(livePickerPending);
  }
  async function refreshCloud(force=false) {
    if(!cloud||demo||demoOnly||blockedStorage)return;
    if(cloud.isConflict()&&force!==true)return;
    if(cloudBusy){cloudRerun=cloudRerun||force===true;return cloudSettled;}
    if(document.hidden && !cloud.isDirty() && force!==true)return;
    clearTimeout(cloudTimer);cloudBusy=true;let release;cloudSettled=new Promise(resolve=>release=resolve);
    try {
      const previousMessage=cloudMessage,updated=await cloud.refresh(state);if(updated)applyCloudState(updated);
      if(cloudMessage===previousMessage && !cloud.isDirty()&&!cloud.isConflict())cloudMessage='Hesapla eşit · Son kontrol tamamlandı.';
      cloudRetryDelay=2000;liveLastAccountCheck=Date.now();
      setCloudStatus(cloudMessage||'Hesap kaydı kontrol edildi.',cloud.isConflict());
    } catch(e){setCloudStatus(e.message,true);cloudRetryDelay=Math.min(30000,cloudRetryDelay*2);}
    finally {
      cloudBusy=false;
      release();
      if(cloudRerun){cloudRerun=false;cloudTimer=setTimeout(()=>refreshCloud(true),0);}
      else if(cloud.isDirty()&&!cloud.isConflict())cloudTimer=setTimeout(flushCloud,cloudRetryDelay);
    }
  }
  async function flushCloud(){return refreshCloud(true);}
  async function pollCloud(){
    if(!document.hidden)live?.check();
    if(live?.isConnected()&&!cloud.isDirty()&&cloud.getRevision()>=live.getRevision()&&Date.now()-liveLastAccountCheck<30000)return;
    return refreshCloud();
  }
  function cloudControls(){return '<p class="settings-note" id="liveStateDescription">'+esc($('liveStatus').textContent||'Anlık bağlantı öğretmen hesabında otomatik kurulur.')+'</p><p class="settings-note" id="cloudStateDescription">'+esc(cloudMessage||'Sınıflar, öğrenciler, görevler ve ses favorileri öğretmen hesabınıza kaydedilir. Aynı hesapla başka cihazda açabilirsiniz. Çevrimdışı değişiklikler bu cihazda tutulur; çakışan kayıtlar otomatik ezilmez.')+'</p><div class="settings-actions"><button class="button" data-action="retry-cloud">'+(cloud?.isConflict()?'Kayıtları karşılaştır':'Şimdi eşitle')+'</button><button class="button" data-action="export-recovery">Korunan yerel kopyayı indir</button><button class="button" data-action="export-cloud-recovery">Korunan hesap kopyasını indir</button>'+syncChoiceBackups()+'</div>';}
  function syncChoiceBackups(){
    try {if(!localStorage.getItem(KEY+'_before_sync_choice'))return '';}catch(_){return '';}
    return '<button class="button" data-action="export-before-sync-local">Son seçim öncesi cihaz yedeği</button><button class="button" data-action="export-before-sync-remote">Son seçim öncesi hesap yedeği</button>';
  }
  let syncReview=null;
  function syncTotals(doc) {
    const students=doc.classes.flatMap(c=>c.students);
    return doc.classes.length+' sınıf · '+students.length+' öğrenci · '+students.reduce((n,s)=>n+C.earned(s),0)+' toplam puan';
  }
  function syncStudentFacts(s) {
    if(!s)return 'Bu kayıtta öğrenci yok';
    const points=(s.days[today]?.tasks||[]).reduce((n,t)=>n+(t.status==='done'?C.taskPoints(t):0),0);
    return '<strong>'+C.earned(s)+' toplam puan</strong><span>Bugün '+signed(points)+' · '+C.completedCount(s)+' puan kaydı · '+s.feeds.length+' besleme</span>';
  }
  function syncReviewModal(classId=state.activeClassId) {
    if(!syncReview)return;
    rememberModal('sync-review',()=>syncReviewModal(classId));
    const {local,remote}=syncReview,classes=new Map();
    for(const cls of [...local.classes,...remote.classes])if(!classes.has(cls.id))classes.set(cls.id,cls.name);
    if(!classes.has(classId))classId=classes.keys().next().value;
    const left=local.classes.find(c=>c.id===classId),right=remote.classes.find(c=>c.id===classId),pupils=new Map();
    for(const s of [...(left?.students||[]),...(right?.students||[])])pupils.set(s.id,s.name);
    const rows=[...pupils].sort((a,b)=>a[1].localeCompare(b[1],'tr')).map(([id,name])=>{
      const a=left?.students.find(s=>s.id===id),b=right?.students.find(s=>s.id===id),different=JSON.stringify(a)!==JSON.stringify(b);
      return '<tr'+(different?' class="sync-different"':'')+'><th scope="row">'+esc(name)+(a&&b&&a.name!==b.name?'<small>Hesapta: '+esc(b.name)+'</small>':'')+(different?'<small>Kayıt farklı</small>':'')+'</th><td>'+syncStudentFacts(a)+'</td><td>'+syncStudentFacts(b)+'</td></tr>';
    }).join('');
    openModal('Kayıtları karşılaştır','<p class="modal-intro">Bu cihazın kaydı hesaptakinden farklı. Puan kaybını önlemek için kayıtlar otomatik birleştirilmedi. Karşılaştırmak kayıtları değiştirmez.</p><div class="sync-copy-summary"><section><h3>Bu cihaz</h3><p>'+esc(syncTotals(local))+'</p></section><section><h3>Hesap</h3><p>'+esc(syncTotals(remote))+'</p></section></div><label class="field">Karşılaştırılacak sınıf<select id="syncReviewClass">'+[...classes].map(([id,name])=>'<option value="'+esc(id)+'" '+(id===classId?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>'+(!left||!right?'<p class="settings-note">Bu sınıf '+(!left?'yalnızca hesapta':'yalnızca bu cihazda')+' bulunuyor.</p>':'')+'<table class="sync-comparison"><caption>Güncel sezon · '+esc(classes.get(classId))+'</caption><thead><tr><th scope="col">Öğrenci</th><th scope="col">Bu cihaz</th><th scope="col">Hesap</th></tr></thead><tbody>'+rows+'</tbody></table><p class="settings-note">Toplamlar eşit olsa bile geçmiş, balık seçimi veya ayarlar farklı olabilir. Bekleyen görevler puan kaydı sayısına dahil değildir. Aşağıdaki seçim yalnızca bu sınıfı değil, hesaptaki tüm sınıfları ve ayarları kapsar.</p><div class="settings-section"><h3>Önce iki kopyayı saklayın</h3><p>İki tarafta da korunacak farklı puanlar varsa bir kayıt seçmeyin. İki yedeği indirerek ayrı ayrı saklayın; bu dosyalar karşılaştırılıp kurtarma yapılabilir.</p><div class="settings-actions"><button class="button" data-action="export-sync-local">Bu cihazın yedeğini indir</button><button class="button" data-action="export-sync-remote">Hesabın yedeğini indir</button></div></div><div class="settings-section"><h3>Eksiksiz olduğunu bildiğiniz kaydı kullanın</h3><p class="settings-note">Bu işlem iki kaydı birleştirmez. Seçilmeyen kopyadaki farklı puanlar etkin kayda aktarılmaz; kurtarma kopyası bu cihazda korunur. Emin değilseniz yedekleri indirin ve karşılaştırmayı kapatın.</p><div class="settings-actions"><button class="button" data-action="use-cloud">Hesaptaki kaydı kullan</button><button class="button" data-action="use-local">Bu cihazdaki kaydı kullan</button><button class="button subtle" data-action="review-cloud">Yeniden karşılaştır</button></div></div>');
  }
  async function reviewSyncConflict() {
    if(!cloud || cloudBusy){toast('Eşitleme kontrolü sürüyor. Biraz sonra yeniden deneyin.');return;}
    clearTimeout(cloudTimer);cloudBusy=true;syncReview=null;
    rememberModal('sync-review',()=>reviewSyncConflict());openModal('Kayıtları karşılaştır','<p role="status">İki kayıt kontrol ediliyor. Puanlarınız korunuyor…</p>');
    try {
      const review=await cloud.inspect(state);
      if(review.resolved){applyCloudState(review.document);setCloudStatus('Hesapla eşit · Tüm değişiklikler doğrulandı.');if(modalRoute?.key==='sync-review')closeModal();return;}
      if(modal.open && modalRoute?.key==='sync-review'){syncReview=review;syncReviewModal();}
    } catch(e){setCloudStatus(e.message,true);if(modal.open && modalRoute?.key==='sync-review')openModal('Kayıtları karşılaştır','<p role="alert">'+esc(e.message)+'</p><button class="button" data-action="review-cloud">Yeniden dene</button>');}
    finally{cloudBusy=false;}
  }
  function commit() { save(); render(); scheduleShare(); }
  let modalHistory=[],modalRoute=null,pendingModalRoute=null,goingBack=false;
  function rememberModal(key,render) {pendingModalRoute={key,render};}
  function modalBack() {
    const previous=modalHistory.pop();confirmAction=null;pendingRestore=null;
    if(!previous) {closeModal();return;}
    selected=previous.selected;goingBack=true;
    try{previous.render();modal.scrollTop=previous.scroll||0;}finally{goingBack=false;}
  }
  function openModal(title, html, eyebrow = 'SINIF AKVARYUMU') {
    stopPicker();
    // Dismiss pointer/focus holds before the glass layer opens. The aquarium
    // remains animated behind every settings and scoring route.
    releaseFish();
    const route=pendingModalRoute || (modal.open && $('modalTitle').textContent===title ? modalRoute : null) || {key:title,render:()=>openModal(title,html,eyebrow)};pendingModalRoute=null;
    if(!modal.open) modalHistory=[];
    else if(!goingBack && modalRoute?.key!==route.key) {
      const index=modalHistory.findIndex(r=>r.key===route.key);
      if(index>=0) modalHistory=modalHistory.slice(0,index);
      else if(modalRoute) modalHistory.push({...modalRoute,scroll:modal.scrollTop});
    }
    modalRoute={...route,selected};
    $('modalBack').textContent=modalHistory.length?'← Geri':'← Akvaryuma dön';

    modal.classList.remove('behavior-modal', 'student-day-modal', 'species-picker-modal', 'group-reward-modal', 'random-picker-modal');
    $('modalTitle').textContent = title; $('modalEyebrow').textContent = eyebrow; $('modalContent').innerHTML = html;
    if (html.includes('class="species-group"')) modal.classList.add('species-picker-modal');
    if (!modal.open) modal.showModal();
    document.documentElement.classList.add('aquarium-modal-open');
    document.body.classList.add('dialog-open');restartAnimation();
    modal.scrollTop = 0;
    const field = modal.querySelector('[autofocus]');
    if (field) field.focus();
  }
  function releaseFish() { inspectedId = ''; swimmers.forEach(f => { f.hover = false; f.keyboard = false; f.pressed = false; f.el.classList.remove('is-selected'); }); }
  function closeModal() { stopPicker();cancelParentHistory();modalHistory=[];modalRoute=null;pendingModalRoute=null;modal.close(); document.documentElement.classList.remove('aquarium-modal-open');document.body.classList.remove('dialog-open');restartAnimation(); releaseFish(); confirmAction = null; pendingRestore = null; }
  function confirm(title, description, callback) {
    confirmAction = callback;
    openModal(title, '<p class="modal-intro">' + esc(description) + '</p><div class="form-actions"><button class="button" data-action="close">Vazgeç</button><button class="button danger" data-action="confirm">Onayla</button></div>');
  }
  function speciesPicker(current) {
    return '<fieldset class="species-group"><legend>Deniz dostunu seç · ' + C.SPECIES.length + ' canlı</legend><div class="species-grid">' + C.SPECIES.map(s => '<label class="species-card"><input type="radio" name="species" value="' + s.id + '" ' + (s.id === current ? 'checked' : '') + ' required><img src="' + image(s.id) + '" alt="" width="640" height="426" loading="lazy" decoding="async"><strong>' + esc(s.name) + '</strong><small>' + esc(s.detail) + '</small></label>').join('') + '</div><p class="species-result-count" id="speciesResults" role="status">' + C.SPECIES.length + ' canlı · Seçili: ' + esc(C.species(current).name) + '</p></fieldset>';
  }
  function addModal(setup = false) {
    rememberModal('addModal'+String(setup),()=>addModal(setup));
    if (demo) return toast('Öğrenci eklemek için önce kendi sınıfınıza dönün.');
    openModal(setup ? 'Sınıfımızla tanışalım' : 'Yeni deniz dostları', '<p class="modal-intro">Öğrencilerinizi ekleyin. Her öğrenci daha sonra “Balığımı seç” ekranından kendi canlısını seçebilir.</p><form id="addForm">' + (setup ? '<label class="field">Sınıf adı<input name="className" value="' + esc(classroom().name) + '" maxlength="80" required autofocus></label>' : '') + '<label class="field">Öğrenci adları<textarea name="names" placeholder="Her satıra bir öğrenci adı yazın" maxlength="5000" required ' + (!setup ? 'autofocus' : '') + '></textarea><span class="field-hint">Tek öğrenci veya tüm sınıfı ekleyebilirsiniz. Sınıf başına en fazla 60 öğrenci.</span></label>' + speciesPicker('clown') + '<p class="form-error" id="formError" role="alert"></p><div class="form-actions"><button type="button" class="button subtle" data-action="import-class">Sınıfım & Çark’tan al</button><button class="button primary" type="submit">Akvaryuma ekle ' + icon('plus') + '</button></div></form>');
  }
  function chooseModal(id = selected) {
    rememberModal('chooseModal'+String(id),()=>chooseModal(id));
    if (!classroom().students.length) return addModal();
    const s = classroom().students.find(x => x.id === id) || classroom().students[0];
    openModal('Benim deniz dostum', '<p class="modal-intro">Önce adını, sonra birlikte yolculuğa çıkacağın canlıyı seç. İstediğin zaman değiştirebilirsin.</p><form id="chooseForm"><label class="field">Ben kimim?<select name="studentId" id="chooseStudent">' + classroom().students.map(x => '<option value="' + x.id + '" ' + (s.id === x.id ? 'selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' + speciesPicker(s.species) + '<div class="form-actions"><button type="submit" class="button primary">Bu benim deniz dostum ' + icon('heart') + '</button></div></form>', 'SENİN SEÇİMİN, SENİN DOSTUN');
  }
  function themesModal() {
    rememberModal('themesModal'+'',()=>themesModal());
    openModal('Bugün nereye dalalım?', '<p class="modal-intro">Sınıfınızın dünyasını değiştirin. Her ortamda aynı deniz dostları sizinle.</p><div class="theme-grid">' + C.THEMES.map(t => '<button class="theme-card" data-action="theme" data-theme="' + t.id + '" aria-pressed="' + (classroom().theme === t.id) + '"><img src="' + background(t.id) + '" alt="' + t.name + '"><strong>' + t.name + '</strong><small>' + t.description + '</small></button>').join('') + '</div>');
  }
  function updateSeasonalSuggestion() {
    const banner=$('seasonalSuggestion'),offer=Seasonal?.suggestion();
    if(!banner)return;
    if(viewing||demo||demoOnly){banner.hidden=true;return;}
    let dismissed=[];try{dismissed=JSON.parse(localStorage.getItem(KEY+'_seasonal_dismissals')||'[]');}catch(_){}
    banner.hidden=viewing||demo||demoOnly||!offer||classroom().theme===offer.theme||!Array.isArray(dismissed)||dismissed.includes(offer.key);
    if(!banner.hidden){$('seasonalSuggestionTitle').textContent=offer.title;$('seasonalSuggestionDescription').textContent=offer.description;banner.dataset.key=offer.key;banner.dataset.theme=offer.theme;}
  }
  function seasonalPreview(themeId) {
    const theme=C.THEMES.find(t=>t.id===themeId&&t.seasonal);if(!theme)return;
    rememberModal('seasonalPreview:'+theme.id,()=>seasonalPreview(theme.id));
    openModal(theme.name,'<img class="seasonal-preview" src="'+background(theme.id)+'" alt="'+esc(theme.description)+'"><p class="modal-intro">'+esc(theme.description)+'. Bu tema yalnızca siz seçerseniz kullanılır; mevcut puanlar ve balıklar korunur.</p><div class="settings-actions"><button class="button primary" data-action="theme" data-theme="'+theme.id+'">Bu temayı kullan</button><button class="button" data-action="seasonal-music" data-theme="'+theme.id+'">♫ '+(theme.music==='izmir'?'Enstrümantal İzmir Marşı':'Jingle Bells ve çanlar')+' dinle</button></div><p class="settings-note">Tema seçimi müziği başlatmaz. Müzikleri ayrıca ses menüsünde bulabilirsiniz.</p>');
  }
  function soundModal() {rememberModal('soundModal',()=>soundModal());openModal('Ortam sesleri',soundSettings());}
  function settingsModal() {
    rememberModal('settingsModal'+'',()=>settingsModal());
    openModal('Sınıfın kontrolü sende', '<form id="renameClassForm"><div class="inline-form"><label class="field">Sınıf adı<input name="name" value="' + esc(classroom().name) + '" required maxlength="80"></label><button class="button" type="submit">Adı kaydet</button></div></form><div class="settings-section"><h3>Öğrenciler ve sorumluluklar</h3><div class="settings-actions"><button class="button" data-action="activities">Sınıf etkinlikleri</button><button class="button" data-action="manage-panel">Sınıf yönetimi</button><button class="button" data-action="add">' + icon('plus') + 'Öğrenci ekle</button><button class="button" data-action="import-class">Sınıfım & Çark’tan al</button><button class="button" data-action="tasks">Görevleri düzenle</button><button class="button" data-action="growth">Yumurta ve büyüme hedefleri</button><button class="button" data-action="teacher-fish">Öğretmen balığı</button><button class="button" data-action="new-class">Yeni sınıf</button><button class="button danger" data-action="delete-class">Bu sınıfı sil</button><button class="button subtle" data-action="deleted-class-backup">Son silme öncesi yedeği indir</button></div></div><div class="settings-section"><h3>Akvaryum ayarları</h3><button class="button" data-action="themes">Arka planı değiştir</button><label class="toggle-row">Balıkların üzerinde toplam puanlarını göster<input id="pointsToggle" type="checkbox" ' + (state.settings.points ? 'checked' : '') + '></label><label class="toggle-row">Sınıf puanlarını göster · İstiridye ve inci<input id="classPointsToggle" type="checkbox" ' + (state.settings.classPoints ? 'checked' : '') + '></label><label class="toggle-row">Besleme hatırlatmasında geçen gün sayısını göster<input id="hungerTextToggle" type="checkbox" ' + (state.settings.hungerText ? 'checked' : '') + '></label><label class="toggle-row">Seyrek emoji sohbetleri<input id="chatToggle" type="checkbox" ' + (state.settings.chat ? 'checked' : '') + '></label><label class="toggle-row">Öğrenci adlarını göster · Kapatınca isimsiz yüzerler<input id="namesToggle" type="checkbox" ' + (state.settings.names ? 'checked' : '') + '></label><label class="toggle-row">Canlıların yüzmesi ve su hareketleri<input id="motionToggle" type="checkbox" ' + (state.settings.motion ? 'checked' : '') + '></label><label class="toggle-row">Su yüzeyinde ve kumda hareketli ışık yansımaları<input id="lightMotionToggle" type="checkbox" ' + (state.settings.lightMotion ? 'checked' : '') + '></label><label class="toggle-row">Su yüzeyinde ve zeminde hafif dalga<input id="waterWavesToggle" type="checkbox" ' + (state.settings.waterWaves ? 'checked' : '') + '></label>' + effectRange('bubbleAmountRange','Baloncuk miktarı') + effectRange('lightStrengthRange','Işık yansımalarının belirginliği') + effectRange('waveStrengthRange','Deniz dalgasının belirginliği') + '<label class="toggle-row">Öğretmen balığı destekleyici hatırlatma yapsın<input id="teacherEncouragementToggle" type="checkbox" ' + (state.settings.teacherEncouragement ? 'checked' : '') + '></label><p class="settings-note">Öğretmen balığı açıksa puan kesintisinden sonra kısa bir destek mesajıyla öğrencinin yanına gider. Mesajda isim veya puan yer almaz; veli ve ziyaretçi ekranlarına aktarılmaz. Arka arkaya puan kesintisi verilirse öğrencileri sırayla ziyaret eder; aynı öğrenci için yinelenen ziyaret biriktirmez.</p><p class="settings-note">Miktarlar doğal görünümü koruyan aralıklarla sınırlıdır. %100 doğal düzeydir. Işık deseni su yüzeyinde ve kumda yavaşça biçim değiştirir; dalga, balıkların gerisinde hafif su kıpırtısı oluşturur. Akıcı görünümde de ayarlar çalışır; cihazı yormamak için daha sade çizilir. Genel hareket kapalıysa veya cihazda hareketi azaltma açıksa efektler de durur.</p>' + (reduced.matches ? '<p class="settings-note">Cihazınızda hareketi azaltma tercihi açık; yüzme animasyonları durduruldu.</p>' : '') + '</div><div class="settings-section"><h3>Paylaşım</h3><button class="button primary" data-action="sharing">Veli kodları ve sınıf paylaşımı</button></div>' + soundSettings() + '<div class="settings-section"><h3>Kayıt ve eşitleme</h3>' + cloudControls() + '<button class="button" data-action="legacy-import">Eski sürümdeki sınıflarımı aktar</button><p class="settings-note">Kayıt durumunu ekranın altından takip edin. “Hesabınıza kaydedildi” yazısı bulut kaydını doğrular. Yedek indir seçeneği ayrıca bir kopya saklamanızı sağlar. Ziyaretçiler yalnızca izin verdiğiniz görünümü izler; görev geçmişine veya yönetim yetkisine erişemez.</p><div class="settings-actions"><button class="button" data-action="export">' + icon('download') + 'Yedek indir</button><label class="button">Yedek yükle<input type="file" id="backupFile" accept=".json,application/json" class="sr-only"></label>' + (blockedStorage ? '<button class="button" data-action="export-raw">Mevcut kaydı indir</button>' : '') + '</div></div><div class="settings-section"><button class="button subtle" data-action="help">Nasıl çalışır?</button></div>');
    const motionField=document.createElement('label');motionField.className='field device-quality';
    motionField.innerHTML='Bu cihazda canlı hareketleri<select id="creatureMode"><option value="classic">Klasik görünüm</option><option value="natural">Doğal hareketler · Hafif</option><option value="3d">3D canlılar · Deneme</option></select><small>İlk dört tür: palyaço balığı, denizanası, kaplumbağa ve ahtapot. 3D modeller sevimli ve sade bir çizimdedir. Aynı anda en fazla 12 model ve toplam 30 canlı için açılır; cihaz zorlanırsa hafif görünüme döner. Diğer canlılar mevcut görsellerini kullanır. Bu seçim yalnızca bu cihaza kaydedilir.</small><small id="creatureStatus" role="status"></small>';
    $('modalContent').prepend(motionField);$('creatureMode').querySelector('option[value="'+creatureMode+'"]').selected=true;updateCreatureStatus();
    const sizeField=document.createElement('label');sizeField.className='field';
    sizeField.innerHTML='Yüzen canlıların boyutu · Bu cihaz<select id="creatureDisplaySize"><option value="100">%100 · Standart</option><option value="150">%150 · Büyük / Akıllı tahta</option><option value="200">%200 · Çok büyük</option></select><small>Bu tarayıcıda canlıları büyütür; puanları ve büyüme hedeflerini değiştirmez. Dar alanlarda ekran sınırlarına göre ayarlanır. Diğer cihazların görünümü etkilenmez.</small>';
    motionField.after(sizeField);$('creatureDisplaySize').querySelector('option[value="'+creatureDisplaySize+'"]').selected=true;
    const field=document.createElement('label');field.className='field device-quality';
    field.innerHTML='Bu cihazda görüntü kalitesi<select id="renderQuality"><option value="auto">Otomatik</option><option value="lite">Akıllı tahta · Akıcı görünüm</option><option value="full">Ayrıntılı görünüm</option></select><small>Akıcı görünüm cam bulanıklığını ve dekoratif ışıkları sadeleştirir. Balıklar yüzmeye, ses ve sayaç çalışmaya devam eder. Yalnızca bu cihaza kaydedilir.</small>';
    $('modalContent').prepend(field);$('renderQuality').querySelector('option[value="'+(window.SitePerformance?.mode() || 'auto')+'"]').selected=true;

  }
  function growthModal() {
    rememberModal('growthModal'+'',()=>growthModal());
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
    rememberModal('teacherFishModal'+'',()=>teacherFishModal());
    const t=classroom().teacher;
    openModal('Öğretmen de deniz yolculuğunda', '<p class="modal-intro">Öğretmen balığı sınıfa eşlik eder; öğrenci sayısına, puanlara ve sınıf hedeflerine dahil edilmez. Yalnızca öğretmenin sınıf ekranında görünür.</p><form id="teacherFishForm"><label class="toggle-row">Öğretmen balığını göster<input name="enabled" type="checkbox" '+(t?.enabled?'checked':'')+'></label><label class="field">Görünen ad<input name="name" maxlength="80" required value="'+esc(t?.name || 'Öğretmenim')+'"></label>'+speciesPicker(t?.species || 'turtle')+'<button class="button primary full">Kaydet</button></form>');
  }
  function goalCard() {
    const cls = classroom(), g = cls.goal, p = C.goalProgress(cls);
    if (!g || !g.enabled) return '';
    return '<section class="shared-goal"><span class="eyebrow">BİRLİKTE BAŞARIYORUZ</span><h3>' + esc(g.title) + '</h3><p>' + (p.complete ? 'Hedefe birlikte ulaştık!' : 'Her küçük katkıyla ilerliyoruz.') + '</p><div class="progress-copy"><span>Hedef başladığından beri</span><strong>' + p.points.toLocaleString('tr-TR') + ' / ' + p.target.toLocaleString('tr-TR') + ' puan</strong></div><div class="progress-track" role="progressbar" aria-label="Ortak sınıf hedefi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.percent + '"><span style="width:' + p.percent + '%"></span></div></section>';
  }
  // Local/demo draws stay local; account draws use one server-selected result.
  function stopPicker() {
    pickerEpoch++;cancelAnimationFrame(pickerFrame);pickerFrame=0;
    Audio.cancelPicker?.();
  }
  function playPickerSound(result,epoch) {
    if(!state.settings.pickerSound)return;
    Audio.setVolume(state.settings.volume);
    Audio.pickerSound?.(result)?.catch(e=>{if(epoch===pickerEpoch && modal.open && modalRoute?.key==='random-student')toast(e.message);});
  }
  function pickerSession() {
    const id=classroom().id;
    let session=pickerRounds.get(id);
    if(!session || session.date!==today) {session={date:today,used:[]};pickerRounds.set(id,session);}
    return session;
  }
  function pickerRandom() {
    if(window.crypto?.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
    return Math.random();
  }
  function randomStudentModal() {
    rememberModal('random-student',()=>randomStudentModal());
    const cls=classroom(),session=pickerSession(),eligible=cls.students.filter(s=>!s.days[today]?.absent);
    const result=pickerResult?.classId===cls.id && pickerResult.date===today
      ? eligible.find(s=>s.id===pickerResult.id) : null;
    if(!result)pickerResult=null;
    openModal('Söz kimde?', '<p class="picker-intro">'+esc(cls.name)+' · Bugün gelen '+eligible.length+' öğrenci</p><div id="pickerStage" class="picker-stage '+(result?'has-result':'')+'">'+
      '<span class="picker-orbit" aria-hidden="true"></span><span class="picker-sparkles" aria-hidden="true">'+Array.from({length:10},(_,i)=>'<i style="--spark:'+i+';--spark-x:'+(-130+i*29)+'px;--spark-y:'+(-55-(i%4)*23)+'px;--spark-turn:'+(i%2?1:-1)*55+'deg"></i>').join('')+'</span><div class="picker-preview">'+
      (result?'<img id="pickerImage" src="'+image(result.species)+'" alt="">':'<img id="pickerImage" alt="" hidden><span id="pickerPlaceholder" aria-hidden="true">'+icon('shuffle')+'</span>')+
      '</div><p id="pickerStatus" role="status" aria-live="polite">'+(result?'Söz sende!':eligible.length?'Deniz dostları arasından seçelim.':'Seçilebilecek öğrenci yok.')+'</p><strong id="pickerName">'+(result?esc(result.name):'Kim gelecek?')+'</strong><p id="pickerHint">'+(result?'Tahtaya davet edebilir veya bir görev verebilirsiniz.':'Seçim puanlara ve balığın büyüklüğüne bağlı değildir.')+'</p></div>'+
      '<div class="picker-actions"><button type="button" id="pickerStart" class="button primary" data-action="random-draw" '+(!eligible.length?'disabled':'')+'>'+icon('shuffle')+(result?'Yeniden seç':'Rastgele seç')+'</button><div id="pickerResultActions" '+(!result?'hidden':'')+'><button type="button" class="button" data-action="random-show">'+icon('fish')+'Akvaryumda göster</button><button type="button" class="button" data-action="random-behaviors">'+icon('heart')+'Puan ver ve besle</button><button type="button" class="button" data-action="random-tasks">'+icon('check')+'Görevleri aç</button></div></div>'+
      '<label class="picker-sound"><input id="pickerSoundToggle" type="checkbox" '+(state.settings.pickerSound?'checked':'')+'>Çark ve sonuç sesi'+(state.settings.volume===0?'<small>Genel ses düzeyi kapalı.</small>':'')+'</label><p class="settings-note picker-note">Her öğrenciye eşit şans. Tur tamamlanana kadar seçilenler yeniden seçilmez. Bugün gelmeyen öğrenciler ve öğretmen balığı dahil edilmez. Seçim puan vermez.</p><p id="pickerRound" class="picker-round">'+(result?session.used.filter(id=>eligible.some(s=>s.id===id)).length+' / '+eligible.length+' öğrenci bu turda seçildi.':'')+'</p>');
    modal.classList.add('random-picker-modal');
  }
  async function drawRandomStudent() {
    if(viewing || !modal.open || modalRoute?.key!=='random-student' || pickerFrame || liveDrawPending)return;
    refreshDate();if(!modal.open)return;
    if(live&&!demo&&!demoOnly){
      liveDrawPending=true;const classId=classroom().id,button=$('pickerStart');button.disabled=true;button.textContent='Sınıfla eşitleniyor…';
      try{
        await refreshCloud(true);
        if(cloud.isDirty()&&!cloud.isConflict())await refreshCloud(true);
        if(cloud.isDirty()||cloud.isConflict())throw Error('Ortak seçimden önce bekleyen puanları eşitleyin. Kayıt ve eşitleme bölümünden durumu kontrol edebilirsiniz.');
        if(classroom().id!==classId||!modal.open||modalRoute?.key!=='random-student')return;
        const result=await live.draw(classId,C.uid());
        if(modal.open&&modalRoute?.key==='random-student'&&$('pickerStart').textContent==='Sınıfla eşitleniyor…'){
          if(result.stale)randomStudentModal();else presentSharedPick(result);
        }
      }catch(e){toast(e.message);if(modal.open&&modalRoute?.key==='random-student'){$('pickerHint').textContent=e.message;$('pickerStart').disabled=false;$('pickerStart').textContent='Yeniden dene';}}
      finally{liveDrawPending=false;}return;
    }
    const cls=classroom(),date=today,session=pickerSession();
    const draw=C.pickStudent(cls,date,session.used,pickerRandom);
    if(!draw) {randomStudentModal();return;}
    animatePicker(draw);
  }
  function presentSharedPick(event){
    if(event.expiresAt && Date.now()>event.expiresAt){if(livePickerPending===event)livePickerPending=null;return;}
    if(viewing||demo||demoOnly||blockedStorage||event.class_id!==classroom().id||event.pick_date!==C.dayKey())return;
    const chosen=classroom().students.find(s=>s.id===event.student_id&&!s.days[today]?.absent);
    if(!chosen){livePickerPending=event;return;}
    livePickerPending=null;const session=pickerSession();session.used=event.round_ids.slice();
    pickerResult={id:chosen.id,classId:classroom().id,date:today};
    // Never replace an unsaved settings form with a remote activity.
    if(document.hidden || (liveDrawPending&&!modal.open) || (modal.open&&modalRoute?.key!=='random-student')){highlightFish(chosen.id);toast('Söz '+chosen.name+' adlı öğrencide.');return;}
    if(!modal.open)randomStudentModal();
    stopPicker();
    animatePicker({id:chosen.id,used:event.round_ids,remaining:event.remaining});
  }
  function animatePicker(draw) {
    const cls=classroom(),date=today,session=pickerSession();
    const candidates=cls.students.filter(s=>!s.days[date]?.absent);
    const epoch=++pickerEpoch,started=performance.now(),duration=draw.remaining===undefined?2400:draw.remaining;
    let nextPreview=0,preview=0;
    pickerResult=null;
    $('pickerStart').disabled=true;$('pickerStart').textContent='Seçiliyor…';
    $('pickerResultActions').hidden=true;$('pickerRound').textContent='';
    $('pickerStage').classList.remove('has-result','is-celebrating');$('pickerStage').classList.add('is-drawing');
    $('pickerStage').setAttribute('aria-busy','true');
    $('pickerStatus').textContent='Deniz dostları arasından seçiliyor…';
    $('pickerPlaceholder')?.remove();$('pickerImage').hidden=false;
    $('pickerHint').textContent='Birazdan söz sende olabilir.';
    const showPreview=s=>{$('pickerImage').src=image(s.species);$('pickerName').textContent=s.name;};
    const finish=()=>{
      pickerFrame=0;
      if(epoch!==pickerEpoch || !modal.open || modalRoute?.key!=='random-student')return;
      const chosen=classroom().id===cls.id && C.dayKey()===date && cls.students.find(s=>s.id===draw.id && !s.days[date]?.absent);
      if(!chosen){randomStudentModal();return;}
      if(draw.used)session.used=draw.used.slice();else {if(draw.reset)session.used=[];session.used.push(chosen.id);}
      pickerResult={id:chosen.id,classId:cls.id,date};
      showPreview(chosen);
      $('pickerStage').classList.remove('is-drawing');$('pickerStage').classList.add('has-result');
      if(!reduced.matches && state.settings.motion)$('pickerStage').classList.add('is-celebrating');
      playPickerSound(true,epoch);
      $('pickerStage').removeAttribute('aria-busy');
      $('pickerStatus').textContent='Söz sende, '+chosen.name+'!';
      $('pickerHint').textContent='Tahtaya davet edebilir veya bir görev verebilirsiniz.';
      $('pickerStart').innerHTML=icon('shuffle')+'Yeniden seç';$('pickerStart').disabled=false;
      $('pickerResultActions').hidden=false;
      $('pickerRound').textContent=session.used.filter(id=>candidates.some(s=>s.id===id)).length+' / '+candidates.length+' öğrenci bu turda seçildi.';
      highlightFish(chosen.id);
    };
    if(reduced.matches || !state.settings.motion || candidates.length===1 || duration<=0){finish();return;}
    playPickerSound(false,epoch);
    showPreview(candidates[0]);
    const animate=now=>{
      if(epoch!==pickerEpoch || !modal.open || modalRoute?.key!=='random-student'){pickerFrame=0;return;}
      const elapsed=now-started;
      if(elapsed>=duration){finish();return;}
      if(elapsed>=nextPreview){showPreview(candidates[(++preview)%candidates.length]);nextPreview=elapsed+90+240*Math.pow(elapsed/duration,2);}
      pickerFrame=requestAnimationFrame(animate);
    };
    pickerFrame=requestAnimationFrame(animate);
  }
  function openPickedStudent(action) {
    const chosen=pickerResult?.classId===classroom().id && pickerResult.date===C.dayKey()
      && classroom().students.find(s=>s.id===pickerResult.id && !s.days[today]?.absent);
    if(!chosen){randomStudentModal();return;}
    selected=chosen.id;tab='students';
    if(action==='random-show'){closeModal();highlightFish(chosen.id);}
    else if(action==='random-tasks')studentDayModal();
    else {behaviorTab='positive';behaviorModal();}
  }
  function activitiesModal() {
    rememberModal('activitiesModal'+'',()=>activitiesModal());
    releaseFish();
    openModal('Birlikte güzel adımlar', '<p class="modal-intro">' + esc(classroom().name) + ' · Sınıf etkinliklerini tek yerden yönetin.</p>' + goalCard() + '<div class="activity-grid"><button class="activity-card" data-action="group-reward">' + icon('heart') + '<strong>Birlikte ödüllendir</strong><span>Davranışı ve öğrencileri seç, tek işlemle puan ver ve besle.</span></button><button class="activity-card" data-action="goal">' + icon('leaf') + '<strong>Ortak sınıf hedefi</strong><span>Birlikte biriktirilen puanlarla ortak bir hedefe ilerleyin.</span></button><button class="activity-card" data-action="timer">' + icon('clock') + '<strong>Odaklanma sayacı</strong><span>Okuma, çalışma veya sınıf geçişleri için kısa bir süre belirleyin.</span></button></div><p class="settings-note">Puanlar yalnızca öğretmenin seçtiği olumlu davranışlarla verilir. Ortak hedefte bireysel sıralama yapılmaz.</p>');
  }
  function groupRewardModal() {
    rememberModal('groupRewardModal'+'',()=>groupRewardModal());
    ensureDays();
    openModal('Birlikte ödüllendir', '<p class="modal-intro">Olumlu davranışı ve ödüllendireceğiniz öğrencileri seçin.</p><form id="groupRewardForm" data-class-id="' + classroom().id + '" data-date="' + today + '"><div class="group-controls"><label class="field">Olumlu davranış<select id="groupTask" name="taskId" required>' + classroom().tasks.filter(t=>C.taskPoints(t)>0).map(t => '<option value="' + t.id + '">' + esc(t.title) + ' · +' + C.taskPoints(t) + ' puan</option>').join('') + '</select></label><div class="settings-actions"><button class="button subtle" type="button" data-action="group-select">Uygun öğrencileri seç</button><button class="button subtle" type="button" data-action="group-clear">Seçimi kaldır</button></div></div><div id="groupStudents" class="group-students"></div><p id="groupSummary" class="settings-note" role="status"></p><button id="groupSubmit" class="button primary full" type="submit" disabled>Puan ver ve besle</button></form><p class="settings-note">Bugün gelmeyenler seçilemez. Aynı davranışı yeniden ödüllendirebilirsiniz; her ödülü Puan geçmişi bölümünden ayrı ayrı geri alabilirsiniz.</p>' + (!classroom().tasks.length ? '<button class="button" data-action="tasks">Önce davranış ekle</button>' : ''));
    modal.classList.add('group-reward-modal');
    renderGroupStudents();
  }
  function renderGroupStudents() {
    const taskId = $('groupTask').value;
    // Sort only the visible roster. Student IDs and the stored classroom order
    // stay intact so a bulk reward still reaches the selected children.
    const students = [...classroom().students].sort((a,b) => a.name.localeCompare(b.name,'tr-TR',{sensitivity:'base',numeric:true}));
    $('groupStudents').setAttribute('aria-label','Öğrenciler · Türkçe A–Z sırası');
    $('groupStudents').innerHTML = students.map(s => {
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
    rememberModal('goalModal'+String(fresh),()=>goalModal(fresh));
    const goal = fresh ? null : classroom().goal;
    openModal('Ortak sınıf hedefi', '<button class="detail-back" data-action="activities">← Sınıf etkinlikleri</button>' + (!fresh ? goalCard() : '') + '<p class="modal-intro">Örneğin birlikte kitap okuma saati veya bir sınıf oyunu için hedef belirleyin. Yeni hedef sıfırdan ilerler; öğrencilerin toplam puanları ve sınıf incisi korunur.</p><form id="goalForm" data-new="' + !goal + '" data-class-id="' + classroom().id + '"><label class="field">Birlikte neye ulaşacağız?<input name="title" required maxlength="120" placeholder="Örn. Birlikte hikâye saati" value="' + esc(goal?.title || '') + '"></label><label class="field">Hedef puan<input type="number" name="target" min="1" max="1000000" step="1" required value="' + (goal?.target || 50) + '"></label><label class="toggle-row">Hedefi etkinlikler ekranında göster<input name="enabled" type="checkbox" ' + (goal?.enabled !== false ? 'checked' : '') + '></label><button class="button primary full" type="submit">' + (goal ? 'Hedefi güncelle' : 'Yeni hedefi başlat') + '</button><p id="formError" class="form-error" role="alert"></p></form>' + (goal ? '<p class="settings-note">Hedefin adını veya puanını değiştirmek biriken ilerlemeyi sıfırlamaz.</p><button class="button subtle" data-action="new-goal">Yeni bir hedef belirle</button>' : classroom().goal ? '<p class="settings-note">Kaydettiğinizde önceki hedefin yerini alır. Öğrenci kayıtları ve toplam puanlar değişmez.</p>' : '') + '<p class="settings-note">İlerleme, hedefin başlangıcından beri mevcut öğrencilerin kazandığı net puandır. Günlük kayıt düzeltmeleri ilerlemeye yansır. Hedef ve başlangıç bilgileri yedeğe dahil edilir.</p>');
  }
  function timerModal() {
    rememberModal('timerModal'+'',()=>timerModal());
    openModal('Saat ve sayaç', (document.fullscreenElement ? '' : '<button class="detail-back" data-action="activities">← Sınıf etkinlikleri</button>') + '<div id="timerActive" class="focus-timer" hidden><p id="timerTitle"></p><strong id="timerClock" role="timer" aria-live="off"></strong><p id="timerState"></p><div class="settings-actions"><button class="button" data-action="timer-pause">Duraklat</button><button class="button primary" data-action="timer-resume">Devam et</button><button class="button subtle" data-action="timer-reset">Sıfırla</button><button class="button subtle" data-action="timer-silence">Uyarı sesini sustur</button></div></div><form id="timerForm"><label class="field">Sayaç türü<select id="timerMode" name="mode"><option value="countdown">Geri sayım</option><option value="stopwatch">Kronometre · İleri sayım</option></select></label><label class="field">Etkinlik adı<input name="title" required maxlength="80" value="Kitap okuma"></label><div id="countdownFields"><label class="field">Süre (dakika)<input id="timerMinutes" name="minutes" type="number" min="1" max="60" step="1" required value="10"></label><div class="timer-presets">' + [3,5,10,15,20].map(n=>'<button class="button subtle" type="button" data-action="timer-preset" data-minutes="'+n+'">'+n+' dk</button>').join('') + '</div><label class="toggle-row">Süre bitince melodi çal<input name="alarm" type="checkbox" '+(state.settings.timerSound?'checked':'')+'></label><label class="field">Uyarı ses düzeyi<input name="alarmVolume" type="range" min="0" max="100" value="'+Math.round(state.settings.timerVolume*100)+'"></label><button class="button subtle" type="button" data-action="timer-preview">Melodiyi dinle</button></div><button class="button primary full" type="submit">Sayacı başlat</button><p id="formError" class="form-error" role="alert"></p></form><p class="settings-note">Geri sayım bitince kısa bir çan melodisi çalar. Uyarı sesi, fon müziğinden bağımsızdır. Kronometre siz durdurana kadar ileri sayar. Sekme açıkken arka planda devam eder; sayfa yenilenince veya sınıf değişince sıfırlanır. Tam ekranda sağ üstte cihazınızın yerel saati ve tarihi görünür.</p>');
    updateTimer();
  }
  function scheduleTimerAlarm() {
    Audio.cancelTimer?.();const value=focusTimer.read();
    if(value.status==='running' && focusTimer.mode()==='countdown' && state.settings.timerSound)
      Audio.scheduleTimer?.(value.remaining,state.settings.timerVolume)?.catch(e=>toast(e.message));
  }
  function updateClock() {
    const now=new Date();
    $('localTime').textContent=now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    $('localDate').textContent=now.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'});
  }
  function updateFullscreenControls() {
    const fullscreen=!!document.fullscreenElement;
    const button=document.querySelector('.scene-controls [data-action="fullscreen"]');
    button.setAttribute('aria-label',fullscreen?'Tam ekrandan çık':'Tam ekran');
    button.title=fullscreen?'Tam ekrandan çık':'Tam ekran';
    button.setAttribute('aria-pressed',String(fullscreen));
    button.querySelector('use').setAttribute('href',fullscreen?'#i-collapse':'#i-expand');
    $('activitiesButton').title=fullscreen?'Saat ve sayaç':'Sınıf etkinlikleri';
    updateTimer();
  }
  function updateTimer() {
    if (!focusTimer) return;
    if (timerClassId !== classroom().id) { focusTimer.reset(); Audio.cancelTimer?.(); timerClassId = classroom().id; timerNotified = false; }
    const value = focusTimer.read(), text = window.AquariumTimer.format(value.remaining,focusTimer.mode());
    const scene=$('sceneTimer');
    if(scene) {
      scene.hidden=value.status==='idle'; scene.dataset.status=value.status;
      $('sceneTimerClock').textContent=value.status==='done'?'✓':text;
      $('sceneTimerTitle').textContent=value.title;
      scene.setAttribute('aria-label',value.title+' · '+(value.status==='done'?'Süre tamamlandı':text)+(value.status==='paused'?' · Duraklatıldı':''));
    }
    const badge = $('activityTimerBadge'); badge.hidden = value.status === 'idle'; badge.textContent = value.status === 'done' ? '✓' : text;
    const button = $('activitiesButton'); button.setAttribute('aria-label',(document.fullscreenElement?'Saat ve sayaç':'Sınıf etkinlikleri') + (value.status === 'idle' ? '' : ' · ' + (value.status === 'done' ? 'Süre tamamlandı' : text + (value.status === 'paused' ? ' duraklatıldı' : focusTimer.mode()==='stopwatch'?' geçti':' kaldı'))));
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
  const signed = n => (n>=0?'+':'')+n;
  function behaviorTypeField(points=1) {
    return '<label class="field">Davranış türü<select name="behaviorType"><option value="positive" '+(points>0?'selected':'')+'>Olumlu · Puan ekle</option><option value="development" '+(points<0?'selected':'')+'>Geliştirmesi gereken · Puan düşür</option></select></label>';
  }
  function tasksModal() {
    rememberModal('tasksModal'+'',()=>tasksModal());
    openModal('Davranışlar ve puanları','<p class="modal-intro">Davranış adını, türünü, simgesini ve puan miktarını belirleyin. Geliştirmesi gereken davranış puan düşürür, yem vermez; kesinti mevcut toplamı aşmaz. Hedefli modda boy da kalan puanın seviyesine iner. Geçmişten geri alınabilir. Kaydedilen değişiklikler bugünkü bekleyen ve yeni görevlere uygulanır. Kazanılmış puanlar ve geçmiş kayıtlar korunur.</p><p class="settings-note" id="behaviorCount">'+classroom().tasks.length+' / '+C.MAX_BEHAVIORS+' davranış · Olumlu ve geliştirmesi gereken davranışların toplamı.</p><div class="task-edit-list">'+classroom().tasks.map(t=>'<details class="task-editor"><summary><span>'+esc(t.icon || behaviorSymbol(t.title))+'</span><strong>'+esc(t.title)+'</strong><b>'+signed(C.taskPoints(t))+'</b><span>Düzenle</span></summary><form class="task-points-form" data-task-id="'+t.id+'"><label class="field">Görev adı<input name="title" maxlength="120" required value="'+esc(t.title)+'"></label>'+behaviorTypeField(C.taskPoints(t))+taskIconPicker(t.icon || behaviorSymbol(t.title))+'<label class="field">Puan<input name="points" type="number" min="1" max="1000" step="1" required value="'+Math.abs(C.taskPoints(t))+'"></label><div class="settings-actions"><button type="submit" class="button primary">Değişiklikleri kaydet</button><button type="button" class="button subtle" data-action="remove-task" data-id="'+t.id+'">Kaldır</button></div></form></details>').join('')+'</div><form id="taskForm" class="new-task-form"><h3>Yeni davranış ekle</h3><label class="field">Davranış adı<input name="title" maxlength="120" placeholder="Örn. Arkadaşıma yardım ettim" required></label>'+behaviorTypeField()+taskIconPicker('⭐')+'<label class="field">Puan<input name="points" type="number" min="1" max="1000" step="1" placeholder="Örn. 5" required></label><button type="submit" class="button primary">Davranış ekle</button></form><p id="formError" class="form-error" role="alert"></p><p class="settings-note">Kaldırılan davranış bugünkü ve geçmiş kayıtlarda kalır; yarından itibaren verilmez.</p>');
  }
  function lastFeeding(s) {
    const last = s.feeds.reduce((n,f) => Math.max(n,f.at),0);
    if (!last) return 'Henüz beslenmedi';
    const days = Math.max(0,Math.floor((Date.now()-last)/86400000));
    return days ? days + ' gün önce' : 'Son 24 saat içinde';
  }
  function studentFacts(s) {
    const d = day(s), daily = d.tasks.reduce((n,t) => n+(t.status==='done'?C.taskPoints(t):0),0);
    return '<div class="student-facts"><div><small>Bugünkü puan</small><strong>' + signed(daily) + '</strong></div><div><small>Toplam puan</small><strong>' + C.earned(s).toLocaleString('tr-TR') + '</strong></div><div><small>Son besleme</small><strong>' + lastFeeding(s) + '</strong></div></div>';
  }
  function finderModal() {
    rememberModal('finderModal'+'',()=>finderModal());
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
  let behaviorTab='positive';
  function behaviorModal() {
    rememberModal('behaviorModal'+'',()=>behaviorModal());
    const s = student(); if (!s) return;
    inspectedId = s.id;
    const d = day(s), mood = C.mood(s, today);
    openModal(C.isBirthday(s)?'İyi ki doğdun, '+s.name+'! 🎂':s.name, (C.isBirthday(s)?'<p class="birthday-message">Bugün senin günün. Birlikte nice güzel keşiflere! ✨</p>':'')+'<div class="behavior-profile"><img src="' + image(s.species) + '" alt="' + C.species(s.species).name + '"><div><span class="profile-species">' + C.species(s.species).name + '</span><span class="profile-mood">' + esc(mood.label) + '</span></div></div>' + studentFacts(s) + (classroom().growth?.enabled ? '<p class="growth-summary">Kendi yolculuğum · '+C.growth(s,classroom()).stage+'/10 hedef'+(C.growth(s,classroom()).next ? ' · Sonraki hedef '+C.growth(s,classroom()).next+' toplam puan' : ' · Yolculuk tamamlandı 🏆')+'</p>' : '') + '<div class="behavior-layout"><nav class="behavior-nav" aria-label="Öğrenci işlemleri"><span class="nav-caption">GÜZEL ADIMLAR</span><button type="button" class="active" data-action="fish-profile" aria-current="page">' + icon('heart') + 'Puan ver ve besle</button><button type="button" data-action="student-day">' + icon('check') + 'Günlük kayıt</button><button type="button" data-action="history">' + icon('leaf') + 'Puan geçmişi</button><span class="nav-caption">DENİZ DOSTUM</span><button type="button" data-action="choose">' + icon('fish') + 'Balığını değiştir</button><button type="button" data-action="edit-student">' + icon('settings') + 'Öğrenciyi düzenle</button><button type="button" data-action="absence" aria-pressed="' + d.absent + '"><span class="nav-symbol">' + (d.absent ? '☀' : '☾') + '</span>' + (d.absent ? 'Bugün geldi' : 'Bugün gelmedi') + '</button></nav><section class="behavior-main" aria-label="Davranış puanlama"><div class="behavior-section-heading"><div><h3>Davranışlar</h3><p>Davranışı seçin; puanı geçmişten geri alabilirsiniz.</p></div><button class="icon-button" data-action="tasks" title="Davranışları ve puanları düzenle" aria-label="Davranışları ve puanları düzenle">' + icon('settings') + '</button></div>' + (d.absent ? '<p class="detail-note">Bugün izinli. Davranış seçmek için “Bugün geldi” düğmesine dokunun.</p>' : '') + '<div class="behavior-tabs" role="tablist" aria-label="Davranış türü"><button role="tab" data-action="behavior-tab" data-kind="positive" aria-selected="'+(behaviorTab==='positive')+'">Olumlu</button><button role="tab" data-action="behavior-tab" data-kind="development" aria-selected="'+(behaviorTab==='development')+'">Geliştirmesi gereken</button></div><div class="behavior-grid">' + C.behaviorChoices(s, classroom(), today).filter(t=>(C.taskPoints(t)<0)===(behaviorTab==='development')).map(t => '<button type="button" class="behavior-choice '+(C.taskPoints(t)<0?'development-choice':'')+'" data-action="reward-behavior" data-id="' + t.id + '" ' + (d.absent ? 'disabled' : '') + '><span class="behavior-check" aria-hidden="true">' + esc(t.icon || behaviorSymbol(t.title)) + '</span><span><strong>' + esc(t.title) + '</strong><small>' + (t.count ? 'Bugün ' + t.count + ' kez · Tekrar ver' : C.taskPoints(t)<0?'Puanı düşür':'Besle ve mutlu et') + '</small></span><b>' + signed(C.taskPoints(t)) + ' puan</b></button>').join('') + '</div>' + (!C.behaviorChoices(s,classroom(),today).some(t=>(C.taskPoints(t)<0)===(behaviorTab==='development')) ? '<p class="settings-note">İlk davranışı ve puanını belirleyerek başlayın.</p><button class="button" data-action="tasks">Davranış ekle</button>' : '<p class="behavior-footnote">' + icon('leaf') + 'Aynı davranışı gün içinde yeniden verebilirsiniz. Her işlem geçmişe ayrı kaydedilir.</p>') + '</section></div>', 'DENİZ DOSTUNUN GÜZEL ADIMLARI');
    modal.classList.add('behavior-modal');
    swimmers.forEach(f=>f.el.classList.toggle('is-selected',f.el.dataset.id===s.id));
  }
  function studentDayModal() {
    rememberModal('studentDayModal'+'',()=>studentDayModal());
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
    if (!result) { if (popup) { behaviorModal(); toast('İşlem kaydedilemedi. Toplam puan sıfır olabilir veya günlük kayıt sınırına ulaşılmış olabilir.'); } return; }
    if (popup) closeModal();
    commit();
    if(result.points<0)startTeacherVisit(s);
    if (result.fed) feedingFeedback(s, result.points);
    else toast(s.name + ': ' + signed(result.points) + ' puan. İşlemi puan geçmişinden geri alabilirsiniz.');
  }
  function helpModal() {
    rememberModal('helpModal'+'',()=>helpModal());
    openModal('Güzel davranışlar, mutlu balıklar.', '<div class="help-steps">' + [
      ['Deniz dostunu seç', 'Sınıfınızı ekleyin. Öğretmen gözetiminde ortak sınıf ekranındaki “Balığımı seç” bölümünden canlı seçilir. İzleme bağlantısında seçim veya besleme yapılamaz.'],
      ['Sorumluluğunu tamamla', 'Öğretmen, Ayarlar → Görevleri düzenle bölümünde her olumlu davranışın puanını belirlesin. Kazanılmış puanlar sonradan yapılan puan değişikliklerinden etkilenmez.'],
      ['Yemini ver, mutluluğunu izle', 'Balığa tıklayın ve açılan pencereden olumlu davranışı seçin. Puan verilir, balık yem ve kalp efektiyle beslenir; kısa bir melodi çalar. Aynı davranışı gün içinde tekrar seçebilirsiniz; her ödül geçmişe ayrı kaydedilir. Önceden birikmiş yemler paneldeki Besle düğmesiyle kullanılabilir.'],
      ['Öğrencini kolayca bul', 'Öğrenci bul düğmesinde isim arayın. Bul balığı kısa süre belirginleştirir, Aç davranış penceresini açar. Bir gün beslenmeyen balığın küçük yem simgesi öğretmene hatırlatma yapar; gün sayısı pencerede görünür. İsterseniz Ayarlar’dan yazılı uyarıyı açabilirsiniz.'],
      ['Her gün yeni bir başlangıç', '“Eksik” işaretlenen görev canlıyı biraz üzgün ve daha sakin yapar. Tamamlanınca tekrar canlanabilir. Açılmış bir önceki görev gününün eksikleri de ertesi günün ilk görevine kadar etkili olur.'],
      ['İzin günlerini ayır', '“Bugün gelmedi” seçeneğinde balık soluk görünerek tabanda dinlenir. Kazanılmış puanları ve büyümesi korunur; yeni ödül verilmez. “Bugün geldi” ile tekrar yüzmeye başlar. Uygulamanın açılmadığı günler için görev veya eksik kaydı üretilmez.']
    ].map(([title, detail], i) => '<div class="help-step"><span class="step-number">' + (i + 1) + '</span><div><h3>' + title + '</h3><p>' + detail + '</p></div></div>').join('') + '</div><p class="settings-note">Canlıların farklı ortamlarda bir arada görünmesi ve mutluluk tepkileri, bu sınıf etkinliğinin oyunlaştırma öğeleridir.</p>');
  }
  function progress() {
    const records = classroom().students.filter(s => !day(s).absent).flatMap(s => C.behaviorChoices(s, classroom(), today).filter(t=>C.taskPoints(t)>0));
    const done = records.filter(t => t.count > 0).length;
    const percent = records.length ? Math.round(done / records.length * 100) : 0;
    $('classProgress').innerHTML = '<div class="progress-copy"><span>Bugünün güzel adımları</span><strong>' + done + ' / ' + records.length + '</strong></div><div class="progress-track" role="progressbar" aria-label="Sınıfın tamamlanan görevleri" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + percent + '%"></span></div>';
  }
  function studentRows() {
    const q = $('studentSearch').value.toLocaleLowerCase('tr-TR').trim();
    const students = classroom().students.filter(s => s.name.toLocaleLowerCase('tr-TR').includes(q));
    if (!classroom().students.length) return '<div class="panel-empty">' + icon('fish') + '<h3>İlk deniz dostunu bekliyoruz.</h3><p>Sınıfınızı ekleyin, bu küçük dünya<br>öğrencilerinizle hayat bulsun.</p><button class="button primary" data-action="add">' + icon('plus') + 'Öğrenci ekle</button></div>';
    if (!students.length) return '<div class="panel-empty"><p>Bu isimde öğrenci bulunamadı.</p></div>';
    return students.map(s => { const mood = C.mood(s, today); return '<button type="button" class="student-row mood-' + mood.id + '" data-action="fish-behaviors" data-id="' + s.id + '" aria-label="' + esc(s.name) + ', ' + mood.label + ', puan ver ve besle"><img class="student-thumb" src="' + image(s.species) + '" alt=""><span class="student-info"><strong>' + esc(s.name) + '</strong><small><i class="mood-dot"></i>' + mood.label + ' · Puan ver ve besle</small></span><span class="feed-count">' + C.balance(s) + ' yem</span><span class="row-arrow">›</span></button>'; }).join('');
  }
  function detail() {
    const s = student(); if (!s) { selected = ''; return studentRows(); }
    const d = day(s), mood = C.mood(s, today);
    return '<button class="detail-back" data-action="back">← Tüm deniz dostları</button><div class="detail-header"><img src="' + image(s.species) + '" alt="' + C.species(s.species).name + '"><div><h3>' + esc(s.name) + '</h3><small>' + mood.label + ' · ' + C.balance(s) + ' yem</small></div></div><p class="detail-note">' + mood.note + '</p>' + d.tasks.filter(t=>C.taskPoints(t)>0).map(t => '<div class="task-row"><p>' + esc(t.title) + ' <span class="task-score">+' + C.taskPoints(t) + ' puan</span></p><div class="task-actions">' + [['done', '✓ Tamam'], ['pending', 'Bekliyor'], ['missed', 'Eksik']].map(([status, label]) => '<button data-action="task-status" data-id="' + t.id + '" data-status="' + status + '" aria-label="' + esc(t.title) + ': ' + label + '" aria-pressed="' + (t.status === status) + '" ' + (d.absent ? 'disabled' : '') + '>' + label + '</button>').join('') + '</div></div>').join('') + (!d.tasks.some(t=>C.taskPoints(t)>0) ? '<p class="settings-note">Bugün için görev yok. Günlük görevler bölümünden ekleyebilirsiniz.</p>' : '') + '<button class="button primary full feed-button" data-action="feed" ' + (!C.balance(s) || d.absent ? 'disabled' : '') + '>' + icon('leaf') + 'Besle · 1 yem</button>' + (!C.balance(s) ? '<p class="settings-note">Beslemek için tamamlanan bir görevden yem kazan.</p>' : '') + '<div class="detail-extras"><button class="button subtle" data-action="absence" aria-pressed="' + d.absent + '">' + (d.absent ? '☀ Bugün geldi' : '☾ Bugün gelmedi') + '</button><button class="button subtle" data-action="choose">Canlıyı değiştir</button><button class="button subtle" data-action="history">Geçmiş</button><button class="button subtle" data-action="edit-student">Düzenle</button></div>';
  }
  function taskSummary() {
    const tasks = new Map();
    classroom().students.forEach(s => { const d = day(s); if (d.absent) return; C.behaviorChoices(s, classroom(), today).filter(t=>C.taskPoints(t)>0).forEach(t => { const info = tasks.get(t.id) || { title: t.title, total: 0, done: 0 }; info.total++; if (t.count > 0) info.done++; tasks.set(t.id, info); }); });
    if (!tasks.size) classroom().tasks.filter(t=>C.taskPoints(t)>0).forEach(t => tasks.set(t.id, { title: t.title, total: 0, done: 0 }));
    return Array.from(tasks.values()).map(t => '<div class="task-summary"><h3>' + esc(t.title) + '</h3><p>' + t.done + ' / ' + t.total + ' öğrenci tamamladı</p><div class="progress-track"><span style="width:' + (t.total ? t.done / t.total * 100 : 0) + '%"></span></div></div>').join('') + '<div style="padding:16px 5px"><button class="button full subtle" data-action="tasks">' + icon('settings') + 'Görevleri düzenle</button><p class="settings-note">Görevi tamamlamak için Öğrenciler sekmesinden bir öğrenciyi seçin.</p></div>';
  }
  function renderPanel() {
    progress();
    $('studentCount').textContent = classroom().students.length;
    $('searchBox').hidden = tab !== 'students';
    document.querySelectorAll('[data-action="tab"]').forEach(btn => { const active = btn.dataset.tab === tab; btn.setAttribute('aria-selected', active); btn.tabIndex = active ? 0 : -1; });
    $('panelContent').setAttribute('aria-labelledby', 'tab-' + tab);
    const focused = document.activeElement;
    const focusKey = focused && $('panelContent').contains(focused) ? [focused.dataset.action, focused.dataset.id, focused.dataset.status] : null;
    const scroll = $('panelContent').scrollTop;
    // Keep the stable roster available after scoring. Daily task corrections
    // remain in the student's dialog, not in place of the class list.
    $('panelContent').innerHTML = tab === 'tasks' ? taskSummary() : studentRows();
    $('panelContent').scrollTop = scroll;
    if (focusKey) Array.from($('panelContent').querySelectorAll('button')).find(b => b.dataset.action === focusKey[0] && b.dataset.id === focusKey[1] && b.dataset.status === focusKey[2])?.focus({ preventScroll: true });
  }
  function render() {
    ensureDays();
    $('classSelect').innerHTML = state.classes.map(c => '<option value="' + c.id + '" ' + (c.id === classroom().id ? 'selected' : '') + '>' + esc(c.name) + '</option>').join('');
    const theme = C.THEMES.find(t => t.id === classroom().theme) || C.THEMES[0];
    $('aquarium').style.backgroundImage = 'url("' + background(theme.id) + '")';
    $('aquarium').dataset.theme = theme.id;
    applyWaterEffects();
    updateSeasonalSuggestion();
    const themeButton=document.querySelector('.scene-controls [data-action="themes"]');
    themeButton.title='Ortamı değiştir · '+theme.name;
    $('sceneTitle').textContent = classroom().students.length ? classroom().name + ' · Su altı dünyamız.' : 'Bizim su altı dünyamız.';
    $('sceneSubtitle').textContent = classroom().students.length + ' deniz dostu · Her güzel adım, yeni bir mutluluk.';
    $('welcome').hidden = classroom().students.length > 0 || classroom().teacher?.enabled === true;
    $('aquarium').style.setProperty('--mobile-swim-height',Math.max(360,Math.ceil((classroom().students.length+(classroom().teacher?.enabled?1:0))/3)*120)+'px');
    document.querySelector('.welcome-footnote').textContent = C.SPECIES.length + ' deniz canlısı · ' + C.THEMES.length + ' akvaryum ortamı · Sınırsız güzel başlangıç';
    $('aquarium').classList.toggle('is-empty', !classroom().students.length && !classroom().teacher?.enabled);
    $('aquariumApp').classList.toggle('no-names', !state.settings.names && !state.settings.points);
    $('aquariumApp').classList.toggle('no-motion', !state.settings.motion || reduced.matches);

    $('demoBanner').hidden = !demo;
    $('todayLabel').textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!viewing) { renderPanel(); updateTimer(); } renderSoundControl();
    const total=viewing ? state.publicClassPoints : classroom().students.reduce((sum,s)=>sum+C.earned(s),0);
    $('classPearl').hidden = !state.settings.classPoints || total === null;
    $('classPearlScore').textContent = (total || 0).toLocaleString('tr-TR');
    $('classPearl').setAttribute('aria-label','Sınıfın toplam puanı: '+(total || 0));
    renderFish();
    updateTeacherVisit(performance.now());
    if(childViewing && !$('parentHistoryButton')) {
      const button=document.createElement('button');button.id='parentHistoryButton';button.className='button fullscreen-keep';
      button.dataset.action='parent-history';button.textContent='Çocuğumun puanları';
      document.querySelector('.scene-controls').append(button);
    }
  }
  let modelAllowed=false,modelStatus='';
  function updateCreatureStatus() {
    const label=$('creatureStatus');if(!label)return;
    label.textContent=creatureMode==='classic'?'Klasik görünüm açık.':creatureMode==='natural'?'Doğal hareketler açık.':modelStatus;
  }
  function disposeCreatureRenderer() {
    creatureRenderer?.dispose();creatureRenderer=null;
  }
  function prepareCreatureMode(items,eggs) {
    const eggIds=new Set(eggs.map(s=>s.id));
    const count=items.filter(s=>(Anatomy?.modelSpecies || ['clown','jellyfish','turtle','octopus']).includes(s.species) && !eggIds.has(s.id)).length;
    modelAllowed=creatureMode==='3d' && !creatureFallback && !window.SitePerformance?.lite() && count<=MODEL_LIMIT && items.length<=30;
    if(modelAllowed && count && !creatureRenderer) {
      creatureRenderer=window.AquariumCreature3D?.create() || null;
      if(!creatureRenderer?.supported){creatureFallback='Bu tarayıcıda 3D açılamadı; doğal hareketler kullanılıyor.';modelAllowed=false;}
    }
    modelStatus=creatureFallback || (window.SitePerformance?.lite()?'Akıcı görünüm açık; doğal hareketler kullanılıyor.':count>MODEL_LIMIT || items.length>30?'Kalabalık sınıf için doğal hareketler kullanılıyor.':'3D deneme açık · '+count+' model; diğer türler mevcut görselleriyle yüzüyor.');
    if(!modelAllowed)disposeCreatureRenderer();
    updateCreatureStatus();
  }
  function configureCreature(fish) {
    const natural=creatureMode!=='classic' && !!Anatomy?.species.includes(fish.species);
    // Natural strokes are small cached image transforms, and must keep looping
    // when automatic quality switches to the 30fps lightweight path.
    const jointed=natural && !fish.egg;
    const use3D=modelAllowed && (Anatomy?.modelSpecies || ['clown','jellyfish','turtle','octopus']).includes(fish.species) && !fish.egg && !!creatureRenderer?.supported;
    const key=[fish.species,jointed,use3D].join(':');
    fish.anatomicalMotion=natural;
    if(fish.creatureKey===key)return;
    fish.creatureKey=key;fish.use3D=use3D;fish.lastModelPose=null;
    fish.el.classList.remove('has-3d');
    fish.art.querySelectorAll('.creature-joint,.creature-model').forEach(el=>el.remove());
    fish.art.style.setProperty('--body-mask',jointed?Anatomy.mask(fish.species):'none');
    fish.bodyImage=fish.art.querySelector('.fish-body-image');fish.bodyImage.style.transform='';
    fish.joints=[];
    if(jointed)for(const part of Anatomy.definitions[fish.species].parts) {
      const img=document.createElement('img');img.className='creature-joint';img.alt='';img.draggable=false;img.src=image(fish.species);
      img.style.clipPath=part.clip;img.style.transformOrigin=part.origin;fish.side.append(img);fish.joints.push(img);
    }
    fish.modelCanvas=null;
    if(use3D) {
      const canvas=document.createElement('canvas');canvas.className='creature-model';canvas.width=Math.max(24,Math.min(192,Math.round(fish.size-10)));canvas.height=Math.round(canvas.width/1.5);
      fish.side.append(canvas);fish.modelCanvas=canvas;
    }
  }
  function restoreNaturalCreatures(message) {
    creatureFallback=message;modelAllowed=false;disposeCreatureRenderer();
    for(const fish of swimmers.values()){configureCreature(fish);placeFish(fish,false);}
    modelStatus=message;updateCreatureStatus();
  }
  function renderFish() {
    // Read the new scene dimensions after empty-state / panel layout changes,
    // before placing new animals; a later ResizeObserver callback is too late.
    const sceneWidth=$('swimArea').clientWidth,sceneHeight=$('swimArea').clientHeight;
    if(viewing && (!sceneWidth || !sceneHeight))return;
    width=sceneWidth;height=sceneHeight;
    const actual = classroom().students;
    const champion=!viewing?C.dailyChampions(classroom(),today):{ids:[],points:0};
    const items = actual.length || viewing || classroom().teacher?.enabled ? [...actual] : ['clown', 'tang', 'turtle'].map((kind, i) => ({ id: 'preview-' + i, name: '', species: kind, days: {}, feeds: [] }));
    if (classroom().teacher?.enabled) items.push({...C.newStudent(classroom().teacher.name,classroom().teacher.species),id:'teacher-'+classroom().id,isTeacher:true});
    const layout = Motion.layout(items.map(s=>({id:s.id,species:s.species,size:C.species(s.species).size})),width,height,creatureDisplaySize/100);
    const layoutKey=width+':'+height+':'+creatureDisplaySize+':'+items.map(s=>s.id+'/'+s.species).sort().join(',');
    const eggBed=$('eggBed');
    const eggs=items.filter(s=>!s.isTeacher && (viewing ? s.appearance?.egg : s.name && C.growth(s,classroom()).egg));
    prepareCreatureMode(items,eggs);
    eggBed.hidden=!eggs.length;
    const eggPlaces=Motion.eggLayout(eggs,eggBed.clientWidth,eggBed.clientHeight,state.settings.classPoints);

    const visible = new Set(items.map(s => s.id));
    for (const [id, fish] of swimmers) if (!visible.has(id)) { fish.el.remove(); swimmers.delete(id); }
    items.forEach((s, index) => {
      let fish = swimmers.get(s.id);
      const placement = layout.get(s.id), size = placement.size;
      if (!fish) {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'fish';
        el.innerHTML = '<span class="fish-chat" aria-hidden="true"></span><span class="fish-egg" aria-hidden="true"><i></i><img class="egg-embryo" alt="" draggable="false"></span><span class="fish-art" aria-hidden="true"><span class="fish-turn-volume"><img alt="" draggable="false"></span><span class="fish-side"><img class="fish-body-image" alt="" draggable="false"><img class="fish-tail-image" alt="" draggable="false"></span></span><span class="fish-name"></span><span class="fish-birthday" hidden aria-label="Bugün doğum günü">🎂</span><span class="fish-points"></span><span class="fish-hunger" hidden></span>';
        el.dataset.action = s.isTeacher ? 'teacher-fish' : 'fish-behaviors'; el.dataset.id = s.id;
        $('swimArea').append(el);
        fish = { el, art: el.querySelector('.fish-art'), side:el.querySelector('.fish-side'), volume:el.querySelector('.fish-turn-volume'), ...placement, direction: index % 2 ? -1 : 1, phase: index * 1.8, mood: fishMood(s), hover: false, keyboard: false, angle: index % 2 ? 180 : 0, turn: null, cruise: 1 };
        el.addEventListener('pointerenter', event => { if (!viewing && !document.fullscreenElement && event.pointerType !== 'touch') {fish.hover = true;fish.hoverUntil=performance.now()+650;} });
        el.addEventListener('pointerleave', () => { fish.hover = false; fish.pressed = false; });
        el.addEventListener('pointerdown', () => { if(!viewing && !document.fullscreenElement) {fish.pressed = true;fish.pressedUntil=performance.now()+2000;} });
        el.addEventListener('pointerup', () => { fish.pressed = false; });
        el.addEventListener('pointercancel', () => { fish.pressed = false; });
        el.addEventListener('focus', () => { if(!viewing && !document.fullscreenElement) {fish.keyboard = true;fish.keyboardUntil=performance.now()+900;} });
        el.addEventListener('blur', () => { fish.keyboard = false; });
        swimmers.set(s.id, fish);
      }
      if(fish.layoutKey!==layoutKey) {
        if(!fish.layoutKey || fish.egg) Object.assign(fish,placement);
        else Motion.reflow(fish,placement,width);
        fish.layoutKey=layoutKey;
      }
      fish.size = size; fish.restSlotSize=size; fish.mood = fishMood(s);
      const growth = viewing && !s.isTeacher ? {...s.appearance,stage:s.appearance?.egg?0:10} : s.isTeacher || !s.name ? {stage:10,scale:1,egg:false,trophy:false} : C.growth(s,classroom());
      const wasEgg=fish.egg===true;
      if(wasEgg && !growth.egg && state.settings.motion && !reduced.matches) {
        fish.el.classList.remove('is-hatching'); void fish.el.offsetWidth; fish.el.classList.add('is-hatching');
        setTimeout(()=>fish.el.classList.remove('is-hatching'),1600);
      }
      if(growth.egg) {
        const nest=eggPlaces.get(s.id);
        Object.assign(fish,nest); fish.el.style.setProperty('--fish-size',nest.size+'px');
        fish.el.style.setProperty('--egg-size',nest.eggSize+'px'); fish.el.style.setProperty('--egg-label-size',nest.labelSize+'px'); fish.el.style.setProperty('--egg-label-width',nest.labelWidth+'px');
        if(fish.el.parentNode!==eggBed) eggBed.append(fish.el);
      } else {
        if(wasEgg) {Object.assign(fish,placement); fish.cruise=0;}
        if(fish.el.parentNode!==$('swimArea')) $('swimArea').append(fish.el);
      }
      fish.growthScale=growth.scale;fish.paint={};
      fish.egg=growth.egg; fish.el.classList.toggle('is-egg',growth.egg);
      const embryo=fish.el.querySelector('.egg-embryo');
      if(growth.egg && embryo.dataset.species!==s.species){embryo.src=image(s.species);embryo.dataset.species=s.species;}
      fish.el.classList.toggle('teacher-fish',!!s.isTeacher);
      fish.el.style.setProperty('--growth-scale',growth.scale);
      fish.el.dataset.stage=String(growth.stage);
      // Short, modest feeding response; never rank students by swimming depth or speed.
      fish.mood={...fish.mood,speed:fish.mood.id === 'resting' ? .4 : .65};
      fish.boostUntil = s.feeds.reduce((last,f)=>Math.max(last,f.at),0)+12000;

      fish.el.style.setProperty('--fish-size', fish.size + 'px');
      for(const name of ['happy','sad','resting','ready','calm','hungry']) fish.el.classList.toggle('mood-'+name,fish.mood.id===name);
      fish.el.dataset.species=s.species;
      const birthday=!viewing && !s.isTeacher && C.isBirthday(s);
      fish.el.classList.toggle('birthday-fish',birthday);fish.el.querySelector('.fish-birthday').hidden=!birthday;
      const joint=tailJoints[s.species];
      fish.el.classList.toggle('has-tail',!!joint);
      fish.el.style.setProperty('--tail-joint',(joint || 0)+'%');
      // Both pieces reuse the same cached file; no additional image assets.
      if(fish.species!==s.species) {
        fish.art.querySelectorAll('img').forEach(img=>{img.src=image(s.species);});
        fish.species=s.species;
      }
      configureCreature(fish);
      fish.el.setAttribute('aria-label', (state.settings.names && s.name ? s.name + ', ' : '') + C.species(s.species).name + (growth.egg ? ', yumurta' : '') + (state.settings.points && score(s) !== null ? ', toplam ' + score(s) + ' puan' : ''));
      fish.el.querySelector('.fish-name').hidden = !state.settings.names || !s.name;
      const isChampion=champion.ids.includes(s.id),nameEl=fish.el.querySelector('.fish-name');
      nameEl.innerHTML=state.settings.names?'<span class="fish-label-text">'+esc(s.name)+(growth.trophy?' 🏆':'')+'</span>'+(isChampion?'<span class="daily-champion-medal" role="img" aria-label="Günün şampiyonu · Bugün '+champion.points+' puan" title="Günün şampiyonu · Bugün '+champion.points+' puan">🥇</span>':''):'';
      if(isChampion && state.settings.names)fish.el.setAttribute('aria-label',fish.el.getAttribute('aria-label')+', günün şampiyonu, bugün '+champion.points+' puan');
      const pointsEl=fish.el.querySelector('.fish-points'); pointsEl.hidden=!state.settings.points || score(s) === null; pointsEl.textContent='★ '+(score(s) ?? 0).toLocaleString('tr-TR');
      updateHungerLabel(fish, s);
      fish.el.classList.toggle('parent-child',!!s.isOwnChild);
      if(viewing)fish.el.dataset.action=s.isOwnChild?'parent-history':'visitor-fish';
      fish.el.disabled = (viewing && !s.isOwnChild) || (!viewing && !s.name);
      fish.el.style.opacity = ''; // Keep silhouettes solid, including preview and visitor fish.
      placeFish(fish);
    });
    updateRestingFish();
    restartAnimation();
  }
  function updateRestingFish() {
    const resting=[];let changed=false;
    for(const [id,fish] of swimmers) {
      const s=classroom().students.find(s=>s.id===id);
      const absent=!!(s && (viewing?s.publicMood==='resting':s.days[today]?.absent));
      const hungry=!!(s && !absent && !fish.egg && (viewing?s.publicMood==='hungry':C.hungerDays(s)>=2));
      const bottomRest=!fish.egg && (absent || hungry);
      if(fish.bottomRest && !bottomRest) {fish.targetX=null;fish.routeTime=0;fish.turn=null;fish.cruise=0;}
      fish.absent=absent;fish.bottomRest=bottomRest;
      fish.el.classList.toggle('is-absent',absent);
      if(fish.hungry!==undefined && fish.hungry!==hungry) changed=true;
      if(fish.hungry && !hungry) {fish.targetX=null;fish.routeTime=0;fish.turn=null;fish.cruise=0;}
      fish.hungry=hungry;fish.el.classList.toggle('is-hungry',hungry);
      if(bottomRest) resting.push(fish);
    }
    let pearl=null;
    if(!$('classPearl').hidden) {
      const scene=$('swimArea').getBoundingClientRect(),shell=$('classPearl').getBoundingClientRect();
      pearl={x:shell.left-scene.left,y:shell.top-scene.top,width:shell.width,height:shell.height};
    }
    // Reserve a sand slot for every pupil, including active fish and eggs.
    // Feeding one pupil releases only that fish; the remaining resting fish
    // keep their destinations even when an egg hatches or scores refresh.
    const residents=[...swimmers.values()].filter(f=>!f.el.classList.contains('teacher-fish'));
    const restingPlaces=Motion.restLayout(residents.map(f=>({id:f.el.dataset.id,size:f.restSlotSize??f.size,minY:f.minY,maxY:f.maxY})),width,height,pearl);
    resting.forEach(fish=>{
      const place=restingPlaces.get(fish.el.dataset.id);
      fish.restX=place.x;fish.restY=place.y;
      if(!fish.restInitialized || !state.settings.motion || reduced.matches) {fish.x=fish.restX;fish.y=fish.restY;fish.angle=fish.direction>0?0:180;}
      placeFish(fish);
    });
    swimmers.forEach(f=>{f.restInitialized=true;});
    return changed;
  }
  function updateHungerLabel(fish, s) {
    const days = viewing || s.isTeacher || !s.name || s.days[today]?.absent ? 0 : C.hungerDays(s);
    const label = fish.el.querySelector('.fish-hunger');
    label.hidden = days < 1;
    label.classList.remove('hunger-icon');
    label.textContent = days >= 1 ? (state.settings.hungerText ? 'Balığın ' + days + ' gündür aç' : 'Yem bekliyor') : '';
    label.setAttribute('aria-label',days ? 'Besleme hatırlatması: '+days+' gündür beslenmedi' : '');
    label.title = days ? days+' gündür beslenmedi · Ayrıntılar için balığa dokunun' : '';
  }

  function measure() {
    updateBubbleTravel();
    seasonal?.resize();
    resizeWater();water?.draw(performance.now());
    if(viewing && (document.hidden || document.body.classList.contains('access-pending')))return;
    const changed = width !== $('swimArea').clientWidth || height !== $('swimArea').clientHeight;
    width = $('swimArea').clientWidth; height = $('swimArea').clientHeight;
    if (changed && swimmers.size) { renderFish(); return; }
    updateRestingFish();
    for (const fish of swimmers.values()) placeFish(fish);
  }
  function styleIfChanged(fish,element,key,value,custom=false) {
    const cache=fish.paint || (fish.paint={}), id=(element===fish.art?'art:':element===fish.side?'side:':element===fish.volume?'volume:':'el:')+key;
    if(cache[id]===value)return;
    cache[id]=value;
    if(custom)element.style.setProperty(key,value);else element.style[key]=value;
  }
  function placeFish(fish,drawModels=true) {
    const p=fish.profile, moving=state.settings.motion && !reduced.matches && !fish.bottomRest && !fish.mentorSpeaking && !fish.mentorPaused;
    const tilt=moving ? Math.sin(fish.phase*1.4)*p.tilt : 0;
    const pulse=moving ? 1+Math.sin(fish.phase*3)*p.pulse : 1;
    styleIfChanged(fish,fish.el,'transform','translate3d('+fish.x.toFixed(1)+'px,'+fish.y.toFixed(1)+'px,0)');
    const depth=fish.egg ? {scale:1,opacity:1,brightness:1,saturation:1,layer:3} : Motion.perspective(fish);
    styleIfChanged(fish,fish.el,'zIndex',String(depth.layer));
    styleIfChanged(fish,fish.art,'opacity',fish.egg?'0':depth.opacity.toFixed(2));
    styleIfChanged(fish,fish.el,'--water-brightness',depth.brightness.toFixed(2),true);
    styleIfChanged(fish,fish.el,'--water-saturation',depth.saturation.toFixed(2),true);
    styleIfChanged(fish,fish.el,'--floor-shadow',fish.egg?'0':(Math.max(0,(fish.y/Math.max(1,height)-.62))*depth.opacity*.5).toFixed(2),true);
    const effectiveScale=(fish.growthScale ?? 1)*depth.scale;
    const puff=Motion.puffPose(fish.species==='puffer'&&moving&&!fish.egg&&Number.isFinite(fish.puffStarted)?(performance.now()-fish.puffStarted)/1000:NaN);
    fish.el.classList.toggle('is-puffed',puff.amount>0);
    const puffGap=Math.max(0,fish.size-10)/3*effectiveScale*(puff.y-1);
    styleIfChanged(fish,fish.el,'--label-adjustment',fish.egg?'0px':(Motion.labelAdjustment(fish.size,effectiveScale)-puffGap).toFixed(1)+'px',true);
    styleIfChanged(fish,fish.el,'--points-gap',fish.egg?'0px':Motion.labelGap(fish.size,effectiveScale).toFixed(1)+'px',true);
    const stroke=moving && !fish.egg ? Math.sin(fish.phase*6.5) : 0;
    styleIfChanged(fish,fish.el,'--tail-yaw',(stroke*23).toFixed(2)+'deg',true);
    styleIfChanged(fish,fish.el,'--tail-flex',(stroke*2.6).toFixed(2)+'deg',true);
    if(fish.anatomicalMotion && !fish.use3D && fish.joints?.length) {
      const pose=Anatomy.pose(fish.species,fish.phase,moving && !fish.held);
      fish.bodyImage.style.transform='scale('+pose.bodyX.toFixed(3)+','+pose.bodyY.toFixed(3)+')';
      fish.joints.forEach((img,i)=>{const transform='rotate('+pose.joints[i].toFixed(2)+'deg)'+(pose.jointScaleY?' scaleY('+pose.jointScaleY[i].toFixed(3)+')':'');if(img.style.transform!==transform)img.style.transform=transform;});
    }
    if(fish.use3D && drawModels) {
      const active=moving && !fish.held,pose=fish.species+':'+(active?fish.phase.toFixed(3):'rest')+':'+fish.angle.toFixed(1);
      if(pose!==fish.lastModelPose) {
        if(!creatureRenderer?.render(fish.modelCanvas,fish.species,fish.phase,active,fish.angle)) {
          restoreNaturalCreatures('3D çizim durdu; doğal hareketler kullanılıyor.');return;
        }
        fish.lastModelPose=pose;fish.el.classList.add('has-3d');
      }
    }
    const turn=Motion.turnPose(fish),model=fish.el.classList.contains('has-3d');
    // The rounded, image-textured core fills the turning side's thin center.
    // It reuses the fish's own texture, without fading the fish or a new model.
    styleIfChanged(fish,fish.volume,'--turn-width',(turn.width*100).toFixed(1)+'%',true);
    styleIfChanged(fish,fish.volume,'--turn-height',(turn.height*100).toFixed(1)+'%',true);
    styleIfChanged(fish,fish.volume,'transform','translate(-50%,-50%) scaleX('+(model?0:turn.fullness).toFixed(3)+')');
    styleIfChanged(fish,fish.side,'transform',model?'none':'perspective(600px) rotateY('+turn.yaw.toFixed(2)+'deg)');
    styleIfChanged(fish,fish.art,'transform','translateY('+turn.lift.toFixed(2)+'px) scale('+(effectiveScale*turn.scale).toFixed(3)+') rotate('+(tilt+turn.bank).toFixed(2)+'deg) scaleY('+(pulse*puff.y).toFixed(3)+') scaleX('+puff.x.toFixed(3)+')');
  }

  function clearTeacherVisit(clearQueue=true) {
    if(clearQueue)teacherVisitQueue.length=0;
    if(!teacherVisit)return;
    const target=swimmers.get(teacherVisit.studentId),teacher=swimmers.get(teacherVisit.teacherId);
    if(target){target.mentorPaused=false;target.el.classList.remove('is-listening');}
    if(teacher){teacher.el.classList.remove('is-mentoring');teacher.guidance=null;teacher.guidanceArrived=false;teacher.mentorSpeaking=false;teacher.targetX=null;teacher.routeTime=0;teacher.direction=teacher.angle>90?-1:1;teacher.cruise=0;
      const bubble=teacher.el.querySelector('.fish-chat');bubble.classList.remove('visible','teacher-note');bubble.textContent='';bubble.style.removeProperty('left');bubble.style.removeProperty('top');bubble.setAttribute('aria-hidden','true');bubble.removeAttribute('role');}
    teacherVisit=null;
  }
  function suspendTeacherVisit() {
    if(teacherVisit){
      const job={classId:teacherVisit.classId,studentId:teacherVisit.studentId,date:teacherVisit.date,awardId:teacherVisit.awardId,message:teacherVisit.message};
      if(!teacherVisitQueue.some(v=>v.studentId===job.studentId&&v.classId===job.classId))teacherVisitQueue.unshift(job);
    }
    clearTeacherVisit(false);
  }
  function teacherVisitAllowed() {
    return !viewing && state.settings.teacherEncouragement && state.settings.motion && !reduced.matches && classroom().teacher?.enabled;
  }
  function visitStudent(job) {
    const s=classroom().students.find(s=>s.id===job.studentId),record=s?.days[job.date];
    return job.date===today && job.classId===classroom().id && !record?.absent && record?.tasks.some(t=>t.id===job.awardId && t.status==='done' && C.taskPoints(t)<0)?s:null;
  }
  function startTeacherVisit(s) {
    if(!teacherVisitAllowed() || s.days[today]?.absent)return;
    const award=s.days[today]?.tasks.filter(t=>t.status==='done' && C.taskPoints(t)<0).at(-1);
    if(!award)return;
    const job={classId:classroom().id,studentId:s.id,date:today,awardId:award.id};
    if(teacherVisit?.studentId===s.id){teacherVisit.awardId=award.id;teacherVisit.date=today;return;}
    const queued=teacherVisitQueue.findIndex(v=>v.studentId===s.id && v.classId===classroom().id);
    if(queued>=0)teacherVisitQueue[queued]=job;else teacherVisitQueue.push(job);
    updateTeacherVisit(performance.now());
  }
  function updateTeacherVisit(now) {
    if(!teacherVisitAllowed()){clearTeacherVisit();return;}
    if(document.hidden){suspendTeacherVisit();return;}
    if(teacherVisit){teacherVisit.travelElapsed+=Math.max(0,Math.min(50,now-teacherVisit.lastAdvance));teacherVisit.lastAdvance=now;}
    if(teacherVisit && (!visitStudent(teacherVisit) || !swimmers.has(teacherVisit.studentId) ||
      teacherVisit.classId!==classroom().id || !swimmers.has(teacherVisit.teacherId) ||
      teacherVisit.travelElapsed>Math.max(12000,Math.hypot(width,height)/250*1000+4000) ||
      (teacherVisit.speakingAt!==null && now-teacherVisit.speakingAt>=2500)))clearTeacherVisit(false);
    while(!teacherVisit && teacherVisitQueue.length) {
      const job=teacherVisitQueue.shift(),teacherId='teacher-'+classroom().id;
      const target=swimmers.get(job.studentId),teacher=swimmers.get(teacherId);
      if(!visitStudent(job) || !target || !teacher)continue;
      const scene=$('swimArea').getBoundingClientRect(),rect=target.el.getBoundingClientRect();
      teacherVisit={...job,teacherId,started:now,speakingAt:null,
        eggPosition:target.egg?{x:rect.left-scene.left,y:rect.top-scene.top,size:target.size,direction:1}:null,
        message:job.message||conversations.encouragement(),lastAdvance:now,travelElapsed:0};
      teacher.el.classList.add('is-mentoring');teacher.guidanceArrived=false;teacher.hover=false;teacher.pressed=false;teacher.keyboard=false;
    }
    if(!teacherVisit)return;
    const visit=teacherVisit,teacher=swimmers.get(visit.teacherId),target=swimmers.get(visit.studentId);
    if(visit.speakingAt===null) {
      const p=visit.eggPosition||target,gap=18,left=p.x-teacher.size-gap,right=p.x+p.size+gap;
      const onRight=p.direction>0?right+teacher.size<=width:!(left>=0);
      const fits=onRight?right+teacher.size<=width:left>=0;
      const x=fits?(onRight?right:left):Math.max(0,Math.min(width-teacher.size,p.x));
      const y=fits?p.y:Math.max(26,p.y-teacher.size*.67-45);
      teacher.guidance={x,y,facing:onRight?180:0,speaking:false};
      // Arrival must match the current destination, not a stale flag from the previous frame.
      const gy=Math.max(teacher.minY,Math.min(teacher.maxY,y));
      if(Math.hypot(teacher.x-x,teacher.y-gy)<12 && Math.abs(teacher.angle-(onRight?180:0))<8) {
        visit.speakingAt=now;target.mentorPaused=true;target.el.classList.add('is-listening');
        teacher.guidance={x:teacher.x,y:teacher.y,facing:onRight?180:0,speaking:true};
      }
    }
    teacher.mentorSpeaking=visit.speakingAt!==null;
    if(teacher.mentorSpeaking) {
      const bubble=teacher.el.querySelector('.fish-chat');bubble.textContent=visit.message;
      bubble.classList.add('visible','teacher-note');bubble.setAttribute('aria-hidden','false');bubble.setAttribute('role','status');
      bubble.style.left=(Math.max(100,Math.min(width-100,teacher.x+teacher.size/2))-teacher.x)+'px';
      bubble.style.top=teacher.y<75?(teacher.size*.67+38)+'px':'-68px';
    }
  }
  let nextChat = performance.now() + 120000;
  const pairCooldown = new Map();
  function chat(now) {
    if (now < nextChat || !state.settings.chat || reduced.matches || modal.open) return;
    nextChat = now + 10000;
    const fish = [...swimmers.values()];
    for (let i=0;i<fish.length;i++) for(let j=i+1;j<fish.length;j++) {
      const a=fish[i], b=fish[j], key=[a.el.dataset.id,b.el.dataset.id].sort().join(':');
      if (a.guidance || b.guidance || a.mentorPaused || b.mentorPaused || a.held || b.held || a.bottomRest || b.bottomRest || now-(a.lastChat??-300000)<300000 || now-(b.lastChat??-300000)<300000 || a.mood.id==='resting' || b.mood.id==='resting' || now-(pairCooldown.get(key)??-600000)<600000) continue;
      if (Math.abs(a.x+a.size/2-b.x-b.size/2)>Math.max(a.size,b.size)*.8 || Math.abs(a.y-b.y)>60) continue;
      pairCooldown.set(key,now); nextChat=now+180000+Math.random()*120000;
      const greeting=conversations.greeting();
      [a,b].forEach((f,index) => {
        f.lastChat=now;const bubble=f.el.querySelector('.fish-chat');
        bubble.textContent=greeting[index]; bubble.classList.add('visible');
        const version=f.chatVersion=(f.chatVersion||0)+1;
        setTimeout(()=>{if(f.chatVersion===version&&!bubble.classList.contains('teacher-note'))bubble.classList.remove('visible');},1500+index*250);
      });
      return;
    }
  }
  let frameSamples=0,slowSamples=0,previousFrame=0,reportingPerformance=false,qualityNeedsRender=false;
  function tick(now) {
    if(document.hidden) {frame=0;return;}
    water?.draw(now);seasonal?.draw(now);
    const elapsed=previousFrame?now-previousFrame:0;previousFrame=now;
    // Sustained low frame delivery triggers the lighter compositor path. One
    // long task or a tab switch alone must not downgrade the device.
    if(elapsed>0 && elapsed<200){frameSamples++;if(elapsed>28)slowSamples++;}
    if(frameSamples>=120){if(slowSamples>72){reportingPerformance=true;try{window.SitePerformance?.reportSlow();}finally{reportingPerformance=false;}}frameSamples=0;slowSamples=0;}
    // A synchronous quality event restarts the loop; don't schedule a second
    // RAF from the old tick as well.
    if(qualityNeedsRender){qualityNeedsRender=false;renderFish();return;}
    updateTeacherVisit(now);
    const wallNow=Date.now(),fishList=[];
    for(const f of swimmers.values()) {
      if(f.egg)continue; // Sand eggs have no per-frame work.
      f.mood.speed=(f.mood.id==='resting'?.4:.65)*(f.boostUntil>wallNow?1.1:1);
      // A stationary pointer or a missed pointerup must not trap a swimmer
      // indefinitely. Keyboard activation still works on the focused button.
      if(f.hover && now>=(f.hoverUntil || 0))f.hover=false;
      if(f.pressed && now>=(f.pressedUntil || 0))f.pressed=false;
      if(f.keyboard && now>=(f.keyboardUntil || 0))f.keyboard=false;
      f.held=f.mentorPaused || f.hover || f.pressed || f.keyboard || f.feedingUntil>now || f.foundUntil>now;
      fishList.push(f);
    }
    if(!fishList.length&&!water?.active()&&!seasonal?.active()){frame=0;lastTime=0;return;}
    frame=requestAnimationFrame(tick);
    // Compare against the last processed motion frame, not the last RAF.
    // Otherwise a 60/120Hz display skips every single lightweight frame.
    if(window.SitePerformance?.lite() && lastTime && now-lastTime<1000/30) return;
    const dt=lastTime?Math.min((now-lastTime)/1000,.08):0;lastTime=now;
    updateTeacherVisit(now);
    Motion.step(fishList,dt,width,height);
    updateTeacherVisit(now);
    const paintModels=now-modelPaintAt>=MODEL_INTERVAL;
    const paintStarted=performance.now();
    for(const fish of fishList) placeFish(fish,paintModels);
    if(paintModels){modelPaintAt=now;if(modelAllowed){modelSlowBatches=performance.now()-paintStarted>10?modelSlowBatches+1:Math.max(0,modelSlowBatches-1);if(modelSlowBatches>=12)restoreNaturalCreatures('Cihazın akıcılığı için doğal hareketlere dönüldü.');}}
    chat(now);
  }
  function restartAnimation() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;previousFrame=0;
    water?.resume();seasonal?.resume();
    if(state.settings.motion && !reduced.matches && !document.hidden && (water?.active()||seasonal?.active()||[...swimmers.values()].some(f=>!f.egg)))frame=requestAnimationFrame(tick);
  }
  function feedEffect(id, points, {particles=true}={}) {
    if (!state.settings.motion || reduced.matches) return;
    const fish = swimmers.get(id); if (!fish) return;
    if(fish.species==='puffer' && points>0 && !fish.egg)fish.puffStarted=performance.now();
    if(!particles)return;
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
    // Explicit demo URL only: never apply a preview theme to a teacher account
    // or a parent/visitor snapshot, and never save it to the cloud.
    if(demoOnly && C.THEMES.some(t=>t.id===params.get('tema')))cls.theme=params.get('tema');
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
    rememberModal('importClassesModal'+'',()=>importClassesModal());
    if (demo) return toast('İçe aktarmak için kendi sınıfınıza dönün.');
    importedClasses = [];
    try { const raw = JSON.parse(localStorage.getItem('kemal_teacher_tools_panel_v2') || 'null'); if (Array.isArray(raw?.classes)) importedClasses = raw.classes.filter(c => c && typeof c.name === 'string' && Array.isArray(c.students)).slice(0, 30); }
    catch (error) { /* Show the same explicit empty state for unavailable or malformed source data. */ }
    openModal('Sınıfım & Çark’tan aktar', '<p class="modal-intro">Bu tarayıcıda kayıtlı sınıflardan birini akvaryuma kopyalayın. Kaynak sınıf listeniz değişmez. Aktarılan öğrenciler kendi canlılarını daha sonra seçebilir.</p>' + (importedClasses.length ? importedClasses.map((c, i) => '<div class="import-choice"><div><strong>' + esc(c.name) + '</strong><small>' + c.students.length + ' öğrenci</small></div><button class="button primary" data-action="import-selected" data-index="' + i + '">Sınıfı kopyala</button></div>').join('') : '<div class="panel-empty"><p>Bu tarayıcıda kayıtlı bir Sınıfım & Çark listesi bulunamadı.</p><button class="button primary" data-action="add">Öğrencileri yazarak ekle</button></div>'));
  }
  function cancelParentHistory() {
    parentHistoryEpoch++;parentHistoryController?.abort();parentHistoryController=null;parentHistoryLoading=false;parentReport=null;
  }
  function parentHistoryMarkup(data,message='') {
    const periods=[['day','Günlük · Bugün'],['week','Haftalık · Bu hafta'],['month','Aylık · Bu ay'],['all','Tüm zamanlar']];
    const selector='<label class="field">Puan geçmişi dönemi<select id="parentHistoryPeriod">'+periods.map(([id,label])=>'<option value="'+id+'" '+(id===parentPeriod?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
    const note='<p class="settings-note">Yalnızca çocuğunuzun puan kayıtlarını görüyorsunuz. Bu ekranda besleme, puan verme veya düzenleme yapılamaz.</p>';
    if(!data)return selector+note+'<p role="status">'+esc(message || 'Puan geçmişi yükleniyor…')+'</p>';
    const entries=data.events.map(entry=>'<li class="parent-history-entry"><span><strong>'+esc(C.clean(entry.icon,16))+' '+esc(C.clean(entry.title,120))+'</strong><small>'+esc(entry.date)+' · '+esc(C.clean(entry.season,80))+(entry.awardedAt?' · '+new Date(entry.awardedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'')+'</small></span><b class="'+(entry.points<0?'negative':'')+'">'+signed(entry.points)+' puan</b></li>').join('');
    return selector+note+'<div class="parent-history-facts"><span>Bu sezon<strong>'+data.currentTotal.toLocaleString('tr-TR')+'</strong></span><span>Seçilen dönem<strong>'+signed(data.periodTotal)+'</strong></span><span>Tüm zamanlar<strong>'+data.allTimeTotal.toLocaleString('tr-TR')+'</strong></span></div><p class="settings-note">'+data.earned.toLocaleString('tr-TR')+' puan kazanıldı · '+data.deducted.toLocaleString('tr-TR')+' puan düşüldü</p><ul class="parent-history-list">'+(entries || '<li class="settings-note">Bu dönemde kazanılmış puan kaydı bulunmuyor.</li>')+'</ul><div class="settings-actions"><button class="button" data-action="parent-history-newer" '+(!parentPage?'disabled':'')+'>Daha yeni</button><button class="button" data-action="parent-history-older" '+(!data.hasMore?'disabled':'')+'>Daha eski</button></div><p class="settings-note" role="status">'+esc(message || 'Canlı kayıt · '+new Date(data.asOf).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}))+'</p>';
  }
  async function loadParentHistory() {
    if(!childViewing || !modal.open || modalRoute?.key!=='parent-history')return;
    const epoch=++parentHistoryEpoch,period=parentPeriod,page=parentPage;
    parentHistoryController?.abort();const controller=new AbortController();parentHistoryController=controller;parentHistoryLoading=true;
    const timeout=setTimeout(()=>controller.abort(),8000);
    try {
      const config=window.kemalSiteStore.getConfig();
      const response=await fetch(config.supabaseUrl+'/rest/v1/rpc/view_aquarium_child_history',{
        method:'POST',cache:'no-store',signal:controller.signal,
        headers:{apikey:config.supabaseAnonKey,'Content-Type':'application/json'},
        body:JSON.stringify({p_token:viewToken,p_period:period,p_offset:page*30})});
      if(!response.ok)throw Error(response.status===404?'Veli puan geçmişi güncellemesi henüz veritabanına kurulmamış.':'Puan geçmişi şu anda alınamıyor. Bağlantıyı kontrol edip tekrar deneyin.');
      const data=await response.json();
      if(!data || data.period!==period || !Array.isArray(data.events) || data.events.length>30 ||
        !['currentTotal','allTimeTotal','periodTotal','earned','deducted'].every(k=>Number.isSafeInteger(data[k])) ||
        data.events.some(e=>!C.validScore(e.points) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !Number.isFinite(e.awardedAt) || e.awardedAt<0 || e.awardedAt>8640000000000000))throw Error('Çocuğunuzun puan geçmişine erişilemiyor. Kod kapatılmış olabilir.');
      if(epoch!==parentHistoryEpoch || !modal.open || modalRoute?.key!=='parent-history')return;
      if(JSON.stringify(parentReport)!==JSON.stringify({...data,asOf:''})) {
        const scroll=modal.scrollTop,focused=document.activeElement?.id==='parentHistoryPeriod';
        parentReport={...data,asOf:''};$('modalTitle').textContent=C.clean(data.name)+' · Puan geçmişi';
        $('modalContent').innerHTML=parentHistoryMarkup(data);modal.scrollTop=scroll;
        if(focused)$('parentHistoryPeriod').focus({preventScroll:true});
      }
    } catch(e) {
      if(epoch===parentHistoryEpoch && modal.open && modalRoute?.key==='parent-history')$('modalContent').innerHTML=parentHistoryMarkup(null,e.name==='AbortError'?'Bağlantı yavaş. Biraz sonra yeniden denenecek.':e.message);
      if(epoch===parentHistoryEpoch)parentReport=null;
    } finally {clearTimeout(timeout);if(epoch===parentHistoryEpoch){parentHistoryLoading=false;parentHistoryController=null;}}
  }
  function openParentHistory() {
    if(!childViewing || !classroom().students.some(s=>s.isOwnChild))return;
    cancelParentHistory();rememberModal('parent-history',()=>openParentHistory());
    openModal('Çocuğumun puanları',parentHistoryMarkup(null),'ÇOCUĞUMUN GÜZEL ADIMLARI');loadParentHistory();
  }
  let historyPage = 0, historySeasonId = '', leaderboardSeasonId = '';
  function historyModal() {
    rememberModal('historyModal'+'',()=>historyModal());
    const s=student(); if(!s) return;
    const seasons=classroom().seasons||[], selectedSeason=seasons.find(season=>season.id===historySeasonId);
    if(historySeasonId && !selectedSeason)historySeasonId='';
    const selector=seasons.length?'<label class="field history-season-picker">Puan geçmişi<select id="historySeasonSelect"><option value="" '+(!historySeasonId?'selected':'')+'>Bu sezon · '+C.earned(s)+' puan</option>'+seasons.slice().reverse().map(season=>'<option value="'+esc(season.id)+'" '+(season.id===historySeasonId?'selected':'')+'>'+esc(season.label)+' · '+new Date(season.endedOn+'T12:00:00').toLocaleDateString('tr-TR')+'</option>').join('')+'</select></label>':'';
    let entries='', entryCount=0, intro='', note='';
    if(historySeasonId && selectedSeason) {
      const events=selectedSeason.awards.filter(award=>award.studentId===s.id && award.status==='done').sort((a,b)=>b.date.localeCompare(a.date)||(b.awardedAt||0)-(a.awardedAt||0));
      const archiveStudent=selectedSeason.students.find(archived=>archived.id===s.id);
      const grouped=new Map();events.forEach(event=>{if(!grouped.has(event.date))grouped.set(event.date,[]);grouped.get(event.date).push(event);});
      const dates=[...grouped.keys()];entryCount=dates.length;historyPage=Math.min(historyPage,Math.max(0,Math.ceil(entryCount/30)-1));
      entries=dates.slice(historyPage*30,(historyPage+1)*30).map(date=>'<div class="history-day"><h3>'+new Date(date+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+(grouped.get(date).some(event=>event.absent)?' · İzinli':'')+'</h3>'+grouped.get(date).map(event=>'<div class="history-entry"><p>'+esc(event.icon?event.icon+' ':'')+esc(event.title)+(event.awardedAt?' · '+new Date(event.awardedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'')+' · '+signed(event.points)+' puan</p></div>').join('')+'</div>').join('');
      intro=esc(selectedSeason.label)+' · '+(archiveStudent?.points||0)+' puan · '+(archiveStudent?.feeds||0)+' besleme · '+selectedSeason.startedOn+' – '+selectedSeason.endedOn;
      note='<p class="settings-note">Arşivlenen sezon yalnızca görüntülenebilir. Yeni sezon başladıktan sonraki düzeltmeler bu kayıtları değiştirmez.</p>';
    } else {
      const dates=Object.keys(s.days).filter(date=>s.days[date].tasks.some(t=>t.status==='done')).sort().reverse();entryCount=dates.length;historyPage=Math.min(historyPage,Math.max(0,Math.ceil(entryCount/30)-1));
      entries=dates.slice(historyPage*30,(historyPage+1)*30).map(date=>'<div class="history-day"><h3>'+new Date(date+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})+(s.days[date].absent?' · İzinli':'')+'</h3>'+s.days[date].tasks.filter(t=>t.status==='done').slice().sort((a,b)=>(b.awardedAt||0)-(a.awardedAt||0)).map(t=>'<div class="history-entry"><p>'+esc(t.title)+(C.taskPoints(t)<0?' · Geliştirmesi gereken':t.sourceId?' · Ek ödül':'')+(t.awardedAt?' · '+new Date(t.awardedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):'')+' · '+signed(C.taskPoints(t))+' puan</p><div class="settings-actions">'+(t.status==='done'?'<button class="button" data-action="revoke-point" data-date="'+date+'" data-id="'+t.id+'">'+(C.taskPoints(t)<0?'Kesintiyi geri al':'Puanı geri al')+'</button>':'')+'<button class="button subtle" data-action="delete-point" data-date="'+date+'" data-id="'+t.id+'">Kaydı sil</button></div></div>').join('')+'</div>').join('');
      intro=C.earned(s)+' toplam puan · '+C.completedCount(s)+' tamamlanan görev · '+s.feeds.length+' besleme.';
      note='<p class="settings-note">Burada yalnızca verilmiş puanlar ve puan kesintileri görünür. Puanı geri aldığınızda işlem toplamdan ve bu listeden çıkar; görev günlük kayıtta bekler. Silmek yalnızca seçili günün kaydını kaldırır; davranış şablonunu silmez. Gerçekleşen beslemeler geçmişte korunur, yeni davranışların yem hakkı engellenmez. Silme geri alınamaz; önce yedek indirebilirsiniz.</p>';
    }
    openModal(s.name+' · Puan geçmişi',selector+'<p class="modal-intro">'+intro+'</p>'+(entries || '<p class="history-empty" role="status">Bu dönemde verilmiş puan kaydı yok.</p>')+'<div class="settings-actions"><button class="button" data-action="history-newer" '+(!historyPage?'disabled':'')+'>Daha yeni</button><button class="button" data-action="history-older" '+((historyPage+1)*30>=entryCount?'disabled':'')+'>Daha eski</button></div>'+note+'<button class="button subtle" data-action="fish-profile">← Davranışlara dön</button>');
  }
  function seasonDashboardModal() {
    rememberModal('seasonDashboardModal',()=>seasonDashboardModal());
    const cls=classroom(),seasons=cls.seasons||[];
    const selectedSeason=seasons.find(season=>season.id===leaderboardSeasonId);
    if(leaderboardSeasonId&&!selectedSeason)leaderboardSeasonId='';
    const roster=selectedSeason?selectedSeason.students:cls.students.map(s=>({...s,points:C.earned(s)}));
    const ranked=roster.map((s,index)=>({s,index,points:selectedSeason?s.points:C.earned(s)})).sort((a,b)=>b.points-a.points||a.index-b.index);
    const medals=['🥇','🥈','🥉'];
    const rows=ranked.length?ranked.map((entry,index)=>'<li><span class="rank-medal" aria-label="'+(index<3?['Birinci','İkinci','Üçüncü'][index]:'Sıra '+(index+1))+'">'+(medals[index]||String(index+1))+'</span><img src="'+image(entry.s.species)+'" alt=""><span class="rank-name">'+esc(entry.s.name)+'</span><strong class="rank-score">★ '+entry.points.toLocaleString('tr-TR')+'</strong></li>').join(''):'<li class="panel-empty">Henüz öğrenciniz yok.</li>';
    const picker=seasons.length?'<label class="field leaderboard-season-picker">Sıralama dönemi<select id="leaderboardSeasonSelect"><option value="" '+(!leaderboardSeasonId?'selected':'')+'>Bu sezon</option>'+seasons.slice().reverse().map(season=>'<option value="'+esc(season.id)+'" '+(season.id===leaderboardSeasonId?'selected':'')+'>'+esc(season.label)+' · '+new Date(season.endedOn+'T12:00:00').toLocaleDateString('tr-TR')+'</option>').join('')+'</select></label>':'';
    const seasonActions=selectedSeason?'<p class="settings-note">Bu geçmiş sezonun sıralaması arşivden görüntüleniyor.</p>':'<div class="settings-section"><h3>Yeni sezon</h3><p class="settings-note">Yeni sezonda güncel puanlar ve puan geçmişi sıfırlanır. Önceki sezonun sıralaması ve puan kayıtları öğrenci geçmişinde arşivlenir. Öğrenciler, balık seçimleri ve davranışlar korunur.</p><button class="button danger" data-action="season-reset" '+(!ranked.length?'disabled':'')+'>Yeni sezon başlat</button></div>';
    openModal('En tok balıklar',picker+'<p class="modal-intro">'+(selectedSeason?esc(selectedSeason.label)+' · ':'')+'Sınıf puanlarına göre sıralama. İlk üç deniz dostu madalya ile gösterilir.</p><ol class="leaderboard">'+rows+'</ol>'+seasonActions+(seasons.length?'<p class="settings-note">Arşivde '+seasons.length+' önceki sezon var.</p>':''));
  }
  function birthdayFields(s) {
    return '<p class="settings-note">Doğum günü · İsteğe bağlı, yalnızca gün ve ay. Kutlama öğretmen akvaryumunda görünür. Yıl ve yaş kaydedilmez.</p><div class="birthday-fields"><label class="field">Gün<select name="birthDay"><option value="">Belirtilmedi</option>'+Array.from({length:31},(_,i)=>'<option value="'+(i+1)+'" '+(s.birthday?.day===i+1?'selected':'')+'>'+(i+1)+'</option>').join('')+'</select></label><label class="field">Ay<select name="birthMonth"><option value="">Belirtilmedi</option>'+['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].map((m,i)=>'<option value="'+(i+1)+'" '+(s.birthday?.month===i+1?'selected':'')+'>'+m+'</option>').join('')+'</select></label></div><p class="settings-note">29 Şubat doğum günleri yalnızca 29 Şubat gününde kutlanır. Kaldırmak için iki alanı da Belirtilmedi yapın.</p>';
  }
  function editStudentModal() {
    rememberModal('editStudentModal'+'',()=>editStudentModal());
    const s = student(); if (!s) return;
    openModal('Öğrenciyi düzenle', '<form id="editStudentForm"><label class="field">Öğrenci adı<input name="name" value="' + esc(s.name) + '" maxlength="80" required autofocus></label>' + birthdayFields(s) + '<p id="formError" class="form-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Kaydet</button></div></form><div class="danger-zone"><button class="button danger" data-action="remove-student">Öğrenciyi akvaryumdan çıkar</button><p class="settings-note">Yalnızca bu akvaryumdaki görev ve besleme kayıtları kaldırılır.</p></div>');
  }
  function refreshDate() {
    if (viewing) return;
    updateSeasonalSuggestion();
    const next = C.dayKey();
    if (next !== today) { today = next; closeModal(); ensureDays(); commit(); toast('Yeni günün görevleri hazır.'); }
    else {classroom().students.forEach(s => { const fish = swimmers.get(s.id); if (fish) updateHungerLabel(fish, s); });if(updateRestingFish()) commit();}
  }
  async function act(button) {
    const action = button.dataset.action;
    if(viewing && action!=='fullscreen') {
      if(!childViewing)return;
      if(action==='parent-history' && (button.id==='parentHistoryButton' || button.classList.contains('parent-child'))) {parentPeriod='day';parentPage=0;openParentHistory();}
      else if(modal.open && modalRoute?.key==='parent-history' && modal.contains(button)) {
        if(['close','modal-back'].includes(action))closeModal();
        if(action==='parent-history-newer' || action==='parent-history-older') {
          parentPage=Math.max(0,parentPage+(action==='parent-history-older'?1:-1));openParentHistory();
        }
      }
      return;
    }
    if (document.fullscreenElement && !modal.contains(button) && !['fullscreen','close','modal-back','activities','sound','toggle-sound','themes','random-student','retry-cloud','seasonal-preview','seasonal-dismiss'].includes(action)) {
      const birthday=classroom().students.find(s=>s.id===button.dataset.id);
      if(action==='fish-behaviors' && birthday && C.isBirthday(birthday)) openModal('İyi ki doğdun'+(state.settings.names?', '+birthday.name:'')+'! 🎂','<p class="birthday-message">Bugün senin günün. Birlikte nice güzel keşiflere! ✨</p>');
      return;
    }
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
      case 'retry-cloud': button.disabled=true;try{await refreshCloud(true);if(cloud?.isConflict())await reviewSyncConflict();}finally{button.disabled=false;}break;
      case 'review-cloud': await reviewSyncConflict(); break;
      case 'export-before-sync-local': case 'export-before-sync-remote': {
        try{const copies=JSON.parse(localStorage.getItem(KEY+'_before_sync_choice')||'null'),source=action==='export-before-sync-local'?'local':'remote';if(copies?.[source])exportData(copies[source],'akvaryum-secim-oncesi-'+(source==='local'?'bu-cihaz':'hesap')+'-'+today+'.json');else toast('Bu seçim öncesine ait kayıt yok.');}catch(e){toast('Seçim öncesi yedeği okunamadı.');}break;
      }
      case 'export-sync-local': case 'export-sync-remote': if(syncReview)exportData(action==='export-sync-local'?syncReview.local:syncReview.remote,'akvaryum-'+(action==='export-sync-local'?'bu-cihaz':'hesap')+'-'+today+'.json');break;
      case 'use-cloud': case 'use-local': {
        if(!syncReview){await reviewSyncConflict();break;}
        const choice=action==='use-local'?'local':'remote',review=syncReview;
        confirm('Tüm sınıflar için bu kayıt kullanılsın mı?',(choice==='local'?'Bu cihazın kaydı: '+syncTotals(review.local)+'. Hesaptaki kayıt bununla değiştirilecek.':'Hesaptaki kayıt: '+syncTotals(review.remote)+'. Bu cihazda bu kayıt açılacak.')+' İki kopyadaki puanlar birleştirilmeyecek. Seçilmeyen kopyadaki farklı puanlar aktarılmayacak. Kurtarma kopyaları bu cihazda saklanır.',async()=>{
          if(JSON.stringify(C.validate(state))!==JSON.stringify(review.local)){toast('Bu cihazın kaydı değişti. Yeniden karşılaştırın.');await reviewSyncConflict();return;}
          if(cloudBusy){toast('Eşitleme sürüyor. Yeniden karşılaştırın.');return;}
          clearTimeout(cloudTimer);cloudBusy=true;let retryReview=false;
          try{const updated=await cloud.resolve(choice,state,review.revision);applyCloudState(updated);syncReview=null;setCloudStatus(cloudMessage,cloud.isConflict());scheduleShare();toast('Seçtiğiniz kayıt eşitlendi.');}
          catch(e){setCloudStatus(e.message,true);toast(e.message);retryReview=e.code==='SYNC_REVIEW_STALE';}
          finally{cloudBusy=false;if(cloud.isDirty()&&!cloud.isConflict())cloudTimer=setTimeout(flushCloud,250);}
          if(retryReview)await reviewSyncConflict();
        });break;
      }
      case 'export-cloud-recovery': case 'export-recovery': {const raw=localStorage.getItem(KEY+(action==='export-cloud-recovery'?'_cloud_recovery':'_recovery'));if(raw)exportData(raw,'akvaryum-korunan-'+(action==='export-cloud-recovery'?'hesap':'bu-cihaz')+'-'+today+'.json');else toast('Ayrı bir kurtarma kopyası henüz oluşmadı.');break;}
      case 'sharing': await sharingModal(); break;
      case 'copy-child': try { const control=$('childScope-'+button.dataset.student);if(control && !(await saveShareControl(control)))break;await navigator.clipboard.writeText(button.dataset.link); toast('Çocuğa özel erişim kopyalandı.'); } catch(e) { toast('Kodu yukarıdaki alandan seçip kopyalayabilirsiniz.'); } break;
      case 'enable-child': case 'disable-child': case 'update-child-scope': {
        button.disabled=true; clearTimeout(syncTimer);
        try {
          if(action==='enable-child') { const cls=JSON.parse(JSON.stringify(classroom())), settings={...state.settings}, id=button.dataset.student, scope=$('childScope-'+id).value; await queueShare(()=>window.AquariumSharing.enableChild(cls,settings,id,scope)); }
          else if(action==='update-child-scope') {if(!(await saveShareControl($('childScope-'+button.dataset.student))))break;}
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
      case 'copy-share': try {if(!(await saveShareControl($('publicSharePoints'))))break;await navigator.clipboard.writeText($('shareLink').value); toast('İzleme bağlantısı kopyalandı.'); } catch(e) { $('shareLink').select(); toast('Bağlantıyı seçip kopyalayabilirsiniz.'); } break;
      case 'disable-other-share':
        button.disabled=true;
        try { const id=button.dataset.id; await queueShare(()=>window.AquariumSharing.disable(id)); await sharingModal(); }
        catch(e) { toast(e.message); button.disabled=false; } break;
      case 'enable-share': case 'disable-share': {
        button.disabled=true; clearTimeout(syncTimer);
        try {
          if (action === 'enable-share') { const cls=JSON.parse(JSON.stringify(classroom())), settings={...state.settings},showPoints=$('publicSharePoints').value==='points'; shareRecord=await queueShare(()=>window.AquariumSharing.enable(cls,settings,showPoints)); }
          else if (shareRecord) { const id=shareRecord.id; await queueShare(()=>window.AquariumSharing.disable(id)); shareRecord=null; }
          await sharingModal();
        } catch(e) { toast(e.message); button.disabled=false; }
        break;
      }
      case 'activities': if(document.fullscreenElement) timerModal(); else activitiesModal(); break;
      case 'random-student': randomStudentModal(); break;
      case 'random-draw': drawRandomStudent(); break;
      case 'random-show': case 'random-behaviors': case 'random-tasks': openPickedStudent(action); break;
      case 'group-reward': groupRewardModal(); break;
      case 'group-select': case 'group-clear': modal.querySelectorAll('[name="studentId"]:not(:disabled)').forEach(el=>el.checked=action==='group-select'); updateGroupSummary(); break;
      case 'goal': goalModal(); break;
      case 'new-goal': goalModal(true); break;
      case 'timer': timerModal(); break;
      case 'timer-preset': $('timerMinutes').value=button.dataset.minutes; break;
      case 'timer-pause': focusTimer.pause(); Audio.cancelTimer?.(); updateTimer(); break;
      case 'timer-resume': focusTimer.resume(); scheduleTimerAlarm(); updateTimer(); break;
      case 'timer-reset': focusTimer.reset(); Audio.cancelTimer?.(); timerNotified=false; timerModal(); break;
      case 'timer-silence': Audio.cancelTimer?.(); break;
      case 'timer-preview': Audio.scheduleTimer?.(0,Number(modal.querySelector('[name="alarmVolume"]').value)/100)?.catch(e=>toast(e.message)); break;
      case 'sound': soundModal(); break;
      case 'play-sound': await playCurrentMix(); break;
      case 'pause-mix': Audio.pause(); break;
      case 'load-mix': { const favorite=state.settings.favorites.find(f=>f.id===button.dataset.id); if(favorite){state.settings.mix=favorite.mix.map(t=>({...t}));state.settings.volume=favorite.volume;state.settings.sound=favorite.mix[0]?.id || 'off';save();soundModal();await playCurrentMix();}break; }
      case 'rename-mix': { const favorite=state.settings.favorites.find(f=>f.id===button.dataset.id);if(favorite)openModal('Karışımı adlandır','<form id="renameMixForm" data-id="'+favorite.id+'"><label class="field">Karışım adı<input name="name" maxlength="60" required value="'+esc(favorite.name)+'"></label><button class="button primary" type="submit">Kaydet</button></form>');break; }
      case 'delete-mix': {const id=button.dataset.id;confirm('Favori silinsin mi?','Yalnızca kaydedilen karışım kaldırılır.',()=>{state.settings.favorites=state.settings.favorites.filter(f=>f.id!==id);save();soundModal();});break;}
      case 'stop-sound': Audio.stop(); toast('Ortam sesi durduruldu.'); break;
      case 'modal-back': modalBack(); break;
      case 'close': closeModal(); break;
      case 'confirm': { const fn = confirmAction; closeModal(); if (fn) await fn(); break; }
      case 'setup': addModal(true); break;
      case 'add': addModal(); break;
      case 'choose': chooseModal(); break;
      case 'themes': themesModal(); break;
      case 'seasonal-preview': seasonalPreview($('seasonalSuggestion').dataset.theme); break;
      case 'seasonal-dismiss': {
        const offer=Seasonal?.suggestion();if(!offer)break;
        try{const old=JSON.parse(localStorage.getItem(KEY+'_seasonal_dismissals')||'[]');localStorage.setItem(KEY+'_seasonal_dismissals',JSON.stringify([...new Set([...(Array.isArray(old)?old:[]),offer.key])].slice(-12)));}catch(_){}
        $('seasonalSuggestion').hidden=true;break;
      }
      case 'seasonal-music': {
        const theme=C.THEMES.find(t=>t.id===button.dataset.theme&&t.seasonal);if(!theme||!Audio.catalogue.some(t=>t.id===theme.music))break;
        state.settings.mix=[{id:theme.music,volume:.7}];state.settings.sound=theme.music;save();await playCurrentMix();break;
      }
      case 'settings': settingsModal(); break;
      case 'season-dashboard': seasonDashboardModal(); break;
      case 'help': helpModal(); break;
      case 'tasks': tasksModal(); break;
      case 'pick-task-icon': { const form=button.closest('form'); form.querySelector('[name="icon"]').value=button.dataset.icon; form.querySelectorAll('[data-action="pick-task-icon"]').forEach(b=>b.setAttribute('aria-pressed',String(b===button))); break; }
      case 'demo': enterDemo(); break;
      case 'exit-demo': if (demoOnly) { location.href=location.pathname; return; } exitDemo(); break;
      case 'theme': classroom().theme = C.THEMES.find(t => t.id === button.dataset.theme)?.id || 'reef'; closeModal(); commit(); break;
      case 'student':
      case 'fish-behaviors': if (classroom().students.some(x => x.id === button.dataset.id)) { selected = button.dataset.id; tab = 'students'; renderPanel(); behaviorModal(); } break;
      case 'find-student': finderModal(); break;
      case 'locate-fish': closeModal(); highlightFish(button.dataset.id); break;
      case 'fish-profile': behaviorModal(); break;
      case 'student-day': studentDayModal(); break;
      case 'manage-panel': closeModal(); $('aquarium').classList.remove('panel-hidden'); updatePanelToggle(); break;
      case 'behavior-tab': behaviorTab=button.dataset.kind==='development'?'development':'positive';behaviorModal();break;
      case 'reward-behavior': if (!modal.open || !modal.classList.contains('behavior-modal')) break; button.disabled=true; rewardBehavior(s, button.dataset.id, true); break;
      case 'back': if (modal.open) behaviorModal(); else { selected = ''; renderPanel(); } break;
      case 'tab': tab = button.dataset.tab; selected = ''; renderPanel(); break;
      case 'task-status': if (button.dataset.status === 'done') rewardBehavior(s, button.dataset.id); else if (s && C.setTask(s, today, button.dataset.id, button.dataset.status)) commit(); refreshStudentDialog(); break;
      case 'feed': if (s && C.feed(s, today)) { commit(); feedingFeedback(s); refreshStudentDialog(); } break;
      case 'absence': if (s) { day(s).absent = !day(s).absent; commit(); refreshStudentDialog(); } break;
      case 'edit-student': editStudentModal(); break;
      case 'history': historyPage=0; historySeasonId=''; historyModal(); break;
      case 'history-newer': historyPage=Math.max(0,historyPage-1); historyModal(); break;
      case 'history-older': historyPage++; historyModal(); break;
      case 'growth': growthModal(); break;
      case 'season-reset': {
        if(demo || demoOnly) {toast('Yeni sezonu başlatmak için kendi sınıfınıza dönün.');break;}
        const cls=classroom();
        confirm('Yeni sezon başlasın mı?','Güncel puanlar ve açık puan geçmişi sıfırlanacak. Önceki sezon, sıralaması ve puanları her öğrencinin geçmişinde korunacak. Öğrenciler, balık seçimleri ve görevler silinmeyecek.',()=>{
          const archived=C.startNewSeason(cls,today);
          if(!archived) {toast('Yeni sezon arşivlenemedi. En fazla 20 sezon ve sezon başına 30.000 puan kaydı saklanabilir.');return;}
          selected='';historySeasonId='';leaderboardSeasonId='';historyPage=0;ensureDays();commit();seasonDashboardModal();toast('Yeni sezon başladı. Önceki puan geçmişi arşivlendi.');
        });break;
      }
      case 'teacher-fish': teacherFishModal(); break;
      case 'revoke-point': case 'delete-point': {
        if(!s) break;
        const date=button.dataset.date,id=button.dataset.id,remove=action==='delete-point';
        const task=s.days[date]?.tasks.find(t=>t.id===id); if(!task) break;
        confirm(remove?'Bu puan kaydını sil?':'Bu puanı geri al?', s.name+' · '+task.title+' · '+date+'. '+(task.status==='done'?(C.taskPoints(task)<0?Math.abs(C.taskPoints(task))+' puan geri eklenecek. ':C.taskPoints(task)+' puan toplamdan çıkarılacak. '):'')+(remove?'Bu günün kaydı kalıcı olarak silinecek.':'Görev yeniden bekliyor durumuna gelecek.'),()=>{if(C.correctAward(s,date,id,remove)){commit();historyModal();toast(remove?'Seçili kayıt silindi.':'Puan geri alındı.');}});
        break;
      }
      case 'remove-student': if (s) confirm('Öğrenciyi akvaryumdan çıkar?', s.name + ' ve bu akvaryumdaki görev geçmişi kaldırılacak. Geri yüklemek için önceden alınmış yedek gerekir.', () => { classroom().students = classroom().students.filter(x => x.id !== s.id); selected = ''; commit(); }); break;
      case 'remove-task': classroom().tasks = classroom().tasks.filter(t => t.id !== button.dataset.id); commit(); tasksModal(); break;
      case 'deleted-class-backup': {
        const raw=localStorage.getItem(KEY+'_beforeClassDelete');
        if(!raw) {toast('Bu tarayıcıda sınıf silme yedeği yok.');break;}
        try{exportData(C.validate(JSON.parse(raw)),'akvaryum-silme-oncesi.json');}catch(e){toast('Kurtarma kopyası okunamadı.');}break;
      }
      case 'delete-class': {
        const cls=classroom();
        confirm('“'+cls.name+'” sınıfını sil?',cls.students.length+' öğrencinin bu akvaryumdaki balıkları, görevleri ve puan geçmişi kaldırılacak. Sınıf ve veli izleme bağlantıları kapatılacak. Öncesindeki kayıt bu tarayıcıda kurtarma kopyası olarak saklanır; Ayarlar’dan indirebilirsiniz. Diğer sınıflar etkilenmez.',async()=>{
          try{
            if(!demo && !demoOnly){
              localStorage.setItem(KEY+'_beforeClassDelete',JSON.stringify(state));
              clearTimeout(syncTimer);await queueShare(()=>window.AquariumSharing.removeClass(cls.id));
            }
            if(C.removeClass(state,cls.id)){selected='';focusTimer.reset();Audio.cancelTimer?.();ensureDays();commit();toast('Sınıf silindi.');}
          }catch(e){toast(e.message || 'Sınıf silinemedi.');}
        });break;
      }
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
      case 'close-panel': closePanel(); break;
      case 'panel': $('aquarium').classList.toggle('panel-hidden'); updatePanelToggle(); break;
      case 'fullscreen': try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('aquariumApp').requestFullscreen) await $('aquariumApp').requestFullscreen(); else toast('Bu tarayıcı tam ekranı desteklemiyor.'); } catch (e) { toast('Tam ekran açılamadı. Tarayıcı iznini kontrol edin.'); } break;
    }
  }
  function closePanel() {
    $('aquarium').classList.add('panel-hidden');
    updatePanelToggle();
    document.querySelector('[data-action="panel"]').focus();
  }
  function updatePanelToggle() {
    const hidden = $('aquarium').classList.contains('panel-hidden');
    const button = document.querySelector('[data-action="panel"]');
    button.title = hidden ? 'Sınıf yönetimini aç' : 'Sınıf yönetimini gizle';
    button.setAttribute('aria-expanded', String(!hidden)); button.setAttribute('aria-label', hidden ? 'Sınıf yönetimini aç' : 'Sınıf yönetimini gizle');
  }
  document.addEventListener('keydown', event => {
    if(event.key==='Escape' && !modal.open && !$('aquarium').classList.contains('panel-hidden')) {
      event.preventDefault(); closePanel();
    }
  });
  document.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (button && !button.disabled) act(button); });
  modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
  modal.addEventListener('close', () => { if(modal.open)return;stopPicker();cancelParentHistory();document.documentElement.classList.remove('aquarium-modal-open');document.body.classList.remove('dialog-open');restartAnimation();releaseFish(); confirmAction = null; pendingRestore = null; });
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
      const fed=results.filter(r=>r.fed); fed.forEach((r,i)=>feedEffect(r.id,r.points,{particles:i<6}));
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
      if(!(data.get('mode')==='stopwatch' ? focusTimer.startStopwatch(data.get('title')) : focusTimer.start(Number(data.get('minutes')),data.get('title')))) { $('formError').textContent='Etkinlik adı ve 1–60 arasında tam sayı dakika girin.'; return; }
      state.settings.timerSound=!!form.querySelector('[name="alarm"]').checked; state.settings.timerVolume=Number(data.get('alarmVolume'))/100; save();
      timerClassId=classroom().id; timerNotified=false; scheduleTimerAlarm(); closeModal(); updateTimer();
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
       } else if (form.id === 'editStudentForm') {
        const birthday={day:Number(data.get('birthDay')),month:Number(data.get('birthMonth'))};
        if((birthday.day||birthday.month) && !C.validBirthday(birthday)){ $('formError').textContent='Geçerli bir gün ve ay seçin (örneğin 31 Nisan olamaz).';return; }
        if(student()){student().name=name;if(birthday.day) student().birthday=birthday;else delete student().birthday;}
      }
      else classroom().name = name;
      closeModal(); commit(); toast('Kaydedildi.');
    } else if (form.id === 'mixFavoriteForm') {
      const name=C.clean(data.get('name'),60);
      if(!name || !state.settings.mix.length){$('mixError').textContent='Bir ad yazın ve en az bir ses seçin.';return;}
      if(state.settings.favorites.length>=24){$('mixError').textContent='En fazla 24 favori saklanabilir. Önce bir favoriyi silin.';return;}
      state.settings.favorites.push({id:C.uid(),name,volume:state.settings.volume,mix:state.settings.mix.map(t=>({...t}))});save();soundModal();toast('Karışım favorilere kaydedildi.');
    } else if (form.id === 'renameMixForm') {
      const favorite=state.settings.favorites.find(f=>f.id===form.dataset.id),name=C.clean(data.get('name'),60);if(favorite&&name){favorite.name=name;save();soundModal();}
    } else if (form.classList.contains('task-points-form')) {
      const amount=Number(data.get('points'));
      const points = amount*(data.get('behaviorType')==='development'?-1:1);
      if (!C.validPoints(amount) || !C.updateTask(classroom(), form.dataset.taskId, {points,title:data.get('title'),icon:data.get('icon')}, today)) { $('formError').textContent = 'Puanı 1–1000 arasında tam sayı olarak girin.'; return; }
      commit(); tasksModal(); toast('Davranış düzenlendi. Geçmiş kayıtlar korundu.');
    } else if (form.id === 'taskForm') {
      const title = C.clean(data.get('title'), 120); if (!title) { $('formError').textContent = 'Görev adını yazın.'; return; }
      if (classroom().tasks.length >= C.MAX_BEHAVIORS) { $('formError').textContent = 'Bir sınıfa en fazla '+C.MAX_BEHAVIORS+' davranış ekleyebilirsiniz.'; return; }
      const amount=Number(data.get('points'));
      const points = amount*(data.get('behaviorType')==='development'?-1:1);
      if (!C.validPoints(amount)) { $('formError').textContent = 'Puanı 1–1000 arasında tam sayı olarak girin.'; return; }
      // Removed behaviors remain in history, but do not consume active template slots.
      if (points>0 && classroom().students.some(s => day(s).tasks.length >= C.MAX_DAILY_TASKS)) { $('formError').textContent = 'Bugünkü işlem kaydı dolu. Yeni davranışı yarın ekleyebilirsiniz; mevcut puanlar korunuyor.'; return; }
      const task = { id: C.uid(), title, points, icon:C.taskIcon(data.get('icon')) }; classroom().tasks.push(task);
      classroom().students.forEach(s => { const d = day(s); if (points>0 && !d.tasks.some(t => t.id === task.id)) d.tasks.push({ ...task, status: 'pending' }); });
      commit(); tasksModal(); toast('Yeni görev bugüne eklendi.');
    }
  });
  document.addEventListener('change', async event => {
    const input = event.target;
    if(!viewing && input.id==='syncReviewClass'){syncReviewModal(input.value);return;}
    if(!viewing && updateEffectRange(input,true))return;
    if(viewing) {if(childViewing && input.id==='parentHistoryPeriod' && ['day','week','month','all'].includes(input.value)){parentPeriod=input.value;parentPage=0;openParentHistory();$('parentHistoryPeriod')?.focus({preventScroll:true});}return;}
    if(input.id==='pickerSoundToggle'){state.settings.pickerSound=input.checked;if(!input.checked)Audio.cancelPicker?.();save();return;}
    if(input.id==='creatureDisplaySize') {
      const size=Number(input.value);if(![100,150,200].includes(size))return;
      creatureDisplaySize=size;
      try{localStorage.setItem(CREATURE_SIZE_KEY,String(size));}catch(_){toast('Görünüm büyütüldü; bu tarayıcı tercihi saklanamadı.');}
      renderFish();return;
    }
    if(input.id?.startsWith('childScope-') && input.dataset.linkId) {await saveShareControl(input);return;}
    if(input.id==='publicSharePoints' && shareRecord?.enabled) {await saveShareControl(input);return;}
    if(input.id==='historySeasonSelect'){historySeasonId=input.value;historyPage=0;historyModal();return;}
    if(input.id==='leaderboardSeasonSelect'){leaderboardSeasonId=input.value;seasonDashboardModal();return;}
    if(input.id==='renderQuality'){window.SitePerformance?.set(input.value);return;}
    if(input.id==='creatureMode'){
      if(!['classic','natural','3d'].includes(input.value))return;
      creatureMode=input.value;creatureFallback='';modelSlowBatches=0;modelPaintAt=-Infinity;disposeCreatureRenderer();
      try{localStorage.setItem(CREATURE_MODE_KEY,creatureMode);}catch(_){}
      renderFish();return;
    }
    if(input.id==='timerMode'){const watch=input.value==='stopwatch';$('countdownFields').hidden=watch;$('timerMinutes').disabled=watch;return;}
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
    if (input.id === 'chooseStudent') { const s = classroom().students.find(x => x.id === input.value); if (s) modal.querySelectorAll('[name="species"]').forEach(r => { r.checked = r.value === s.species; }); const result=$('speciesResults');if(result&&s)result.textContent=C.SPECIES.length+' canlı · Seçili: '+C.species(s.species).name; }
    if (input.name === 'species') { const result=$('speciesResults'),chosen=modal.querySelector('[name="species"]:checked');if(result&&chosen)result.textContent=C.SPECIES.length+' canlı · Seçili: '+C.species(chosen.value).name; }
    if (input.id === 'namesToggle' || input.id === 'motionToggle') { state.settings[input.id === 'namesToggle' ? 'names' : 'motion'] = input.checked; commit(); }
    if (['lightMotionToggle','waterWavesToggle','teacherEncouragementToggle','hungerTextToggle','classPointsToggle','pointsToggle','chatToggle','feedSoundToggle'].includes(input.id)) { state.settings[({lightMotionToggle:'lightMotion',waterWavesToggle:'waterWaves',teacherEncouragementToggle:'teacherEncouragement',hungerTextToggle:'hungerText',classPointsToggle:'classPoints',pointsToggle:'points',chatToggle:'chat',feedSoundToggle:'feedSound'})[input.id]]=input.checked; if(input.id==='chatToggle' && !input.checked) document.querySelectorAll('.fish-chat.visible').forEach(el=>el.classList.remove('visible')); commit(); }
    if (input.id === 'backupFile') {
      const file = input.files[0]; if (!file) return;
      if (demo) { input.value = ''; return toast('Yedek yüklemek için önce kendi sınıfınıza dönün.'); }
      if (file.size > 8 * 1024 * 1024) { input.value = ''; return toast('Yedek dosyası en fazla 8 MB olabilir.'); }
      try {
        pendingRestore = C.validate(JSON.parse(await file.text()));
        const restored = pendingRestore;
        confirm('Yedeği geri yükle?', restored.classes.length + ' sınıf içeren yedek, bu tarayıcıdaki akvaryum kayıtlarının yerini alacak. Mevcut kayıtlarınızı korumak için önce Yedek indir seçeneğini kullanın. Hesabınızdaki açık izleme bağlantıları kapatılacak.', async () => { try { clearTimeout(syncTimer); await queueShare(()=>window.AquariumSharing.disableAll()); state = restored; focusTimer?.reset(); Audio.cancelTimer?.(); timerNotified = false; blockedStorage = false; selected = ''; tab = 'students'; today = C.dayKey(); ensureDays(); commit(); toast('Yedek geri yüklendi. Paylaşım kapalı.'); } catch(e) { toast(e.message); } });
      } catch (error) { input.value = ''; toast(error instanceof SyntaxError ? 'Bu dosya geçerli bir JSON yedeği değil.' : error.message); }
    }
  });
  $('studentSearch').addEventListener('input', renderPanel);
  modal.addEventListener('animationend',event=>{if(event.target.id==='pickerImage' && event.animationName==='picker-reveal-fish')$('pickerStage')?.classList.remove('is-celebrating');});
  modal.addEventListener('input', event => { if (viewing) return; if(updateEffectRange(event.target))return; if(event.target.dataset.mixVolume) {const id=event.target.dataset.mixVolume,layer=state.settings.mix.find(t=>t.id===id);if(layer){layer.volume=Number(event.target.value)/100;Audio.setLayerVolume(id,layer.volume);$('mixValue-'+id).textContent='%'+event.target.value;save();}} if(event.target.id==='volumeRange') {state.settings.volume=Number(event.target.value)/100; Audio.setVolume(state.settings.volume); save();} if(event.target.id==='fishFinder') renderFinder(); });
  document.querySelector('.panel-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); tab = event.key === 'Home' ? 'students' : event.key === 'End' ? 'tasks' : tab === 'students' ? 'tasks' : 'students'; selected = ''; renderPanel(); $('tab-' + tab).focus();
  });
  window.addEventListener('storage', event => {
    if (viewing || demoOnly) return;
    if (event.key !== KEY || !event.newValue) return;
    try { const updated = C.validate(JSON.parse(event.newValue)); if (demo) beforeDemo = updated; else { state = updated; selected = ''; closeModal(); ensureDays(); render(); toast('Diğer sekmedeki değişiklikler alındı.'); } } catch (e) { storageWarning('Diğer sekmedeki kayıt okunamadı. Bu sayfanın kayıtları korunuyor.'); }
  });
  document.addEventListener('visibilitychange', () => {
    $('aquariumApp').classList.toggle('page-hidden',document.hidden);
    if(document.hidden){suspendTeacherVisit();Audio.cancelPicker?.();if(pickerFrame){stopPicker();if(modal.open && modalRoute?.key==='random-student')randomStudentModal();}}
    else {refreshDate();updateTimer();}
    restartAnimation();
  });
  reduced.addEventListener('change', render);
  window.addEventListener('site-performance-change',()=>{applyWaterEffects();if(reportingPerformance)qualityNeedsRender=true;else renderFish();});
  window.addEventListener('pagehide',()=>{disposeCreatureRenderer();seasonal?.dispose();});
  window.addEventListener('pageshow',()=>{seasonal?.resize(true);if(creatureMode==='3d')renderFish();});
  setInterval(refreshDate, 30000);
  if(!viewing) setInterval(updateTimer,1000);
  updateClock();
  updateFullscreenControls();
  new ResizeObserver(measure).observe($('swimArea'));
  new ResizeObserver(()=>seasonal?.resize()).observe($('aquarium'));
  new ResizeObserver(()=>{if(swimmers.size) renderFish();}).observe($('eggBed'));
  new ResizeObserver(()=>{if(swimmers.size && width && height)updateRestingFish();}).observe($('classPearl'));
  document.addEventListener('fullscreenchange', () => {const warning=$('cloudWarning');if(document.fullscreenElement)$('aquarium').append(warning);else $('storageWarning').before(warning); if (document.fullscreenElement) { if(modal.open) closeModal(); releaseFish(); $('aquarium').append(modal); } else document.body.append(modal); updateFullscreenControls(); updateClock(); measure(); });
  if (demoOnly) enterDemo();
  if (viewing) {
    let loading=false;
    async function refreshView() {
      if(loading || document.hidden) return; loading=true;
      try { const data=await readView();
        document.body.classList.remove('access-pending');
        if(JSON.stringify(data)!==JSON.stringify(viewSnapshot)) {viewSnapshot=data;state=viewState(data);render();}
        if(childViewing && !parentHistoryLoading && modal.open && modalRoute?.key==='parent-history')loadParentHistory();
      }
      catch(e) { viewSnapshot=null;closeModal();state=viewState({students:[]}); swimmers.forEach(f=>f.el.remove()); swimmers.clear(); lockAccess(e.message); if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
      finally { loading=false; }
    }
    setInterval(refreshView,3000);
    document.addEventListener('visibilitychange',()=> { if(document.hidden) {closeModal();document.body.classList.add('access-pending');} else refreshView(); });
  }
  if(cloud){
    const client=window.kemalUserAuth.getClient();
    if(window.AquariumLive&&client.channel)live=window.AquariumLive.create({client,ownerId:window.kemalUserAuth.getUser().id,
      onRevision:rev=>{if(rev>cloud.getRevision())refreshCloud(true);},onPicker:presentSharedPick,
      onStatus:message=>{$('liveStatus').textContent=message;if($('liveStateDescription'))$('liveStateDescription').textContent=message;}});
    setInterval(pollCloud,3000);
    const resume=()=>{live?.start();live?.check(true);refreshCloud(true);};
    window.addEventListener('online',resume);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);window.addEventListener('pagehide',()=>live?.stop());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});
    window.addEventListener('beforeunload',event=>{try{if(JSON.parse(localStorage.getItem(KEY+'_cloud')||'{}').dirty){event.preventDefault();event.returnValue='';}}catch(e){}});
  }
  setInterval(updateClock,1000);
  updatePanelToggle(); measure(); ensureDays(); render();
  if (blockedStorage) save(); else if (cloud) { $('saveStatus').textContent=cloudMessage || 'Hesap kaydı hazır.'; } else if (classroom().students.length) { save(); scheduleShare(); }
  live?.start();
  window.AquariumStartup?.ready();
})();
