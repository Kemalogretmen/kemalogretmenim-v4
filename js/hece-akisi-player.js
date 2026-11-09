(function() {
  'use strict';

  var core = window.HeceAkisiCore;
  var params = new URLSearchParams(window.location.search);
  var state = {
    client: null,
    auth: null,
    profile: null,
    stream: null,
    session: null,
    timer: 0,
    clockFrame: 0,
    running: false,
    readerName: '',
    selectedStudent: null,
    publicStreams: [],
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
  function showView(name) {
    ['catalog', 'setup', 'stage', 'result', 'error'].forEach(function(key) {
      byId(key + 'View').hidden = key !== name;
    });
  }
  function humanError(error) {
    var message = String(error && (error.message || error.error_description) || 'İşlem tamamlanamadı.');
    if (/syllable_streams|schema cache|does not exist/i.test(message)) return 'Hece Akışı sistemi henüz etkinleştirilmemiş. Yönetici SQL kurulumunu tamamlamalı.';
    return message;
  }
  function showError(error) {
    stopTimers();
    byId('errorMessage').textContent = humanError(error);
    showView('error');
  }

  async function initAuth() {
    await window.kemalUserAuth.ready();
    var authState = window.kemalUserAuth.getState();
    state.auth = authState.user || null;
    state.profile = authState.profile || null;
    state.client = window.kemalUserAuth.getClient();
  }

  async function loadCatalog() {
    var result = await state.client
      .from('syllable_streams')
      .select('*')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('grade_level')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    state.publicStreams = result.data || [];
    renderCatalog();
    showView('catalog');
  }

  function renderCatalog() {
    var grade = byId('catalogGrade').value;
    var items = state.publicStreams.filter(function(item) { return !grade || String(item.grade_level) === grade; });
    var grid = byId('catalogGrid');
    if (!items.length) {
      grid.innerHTML = '<div class="ha-empty">Bu sınıf düzeyinde yayımlanmış hece çalışması bulunmuyor.</div>';
      return;
    }
    grid.innerHTML = items.map(function(item) {
      var mode = item.mode === 'automatic' ? 'Otomatik · ' + ((item.interval_ms || 0) / 1000) + ' sn' : 'Dokunarak ilerle';
      return '<article class="ha-public-card"><div class="ha-badges"><span class="ha-badge live">' + escapeHtml(item.grade_level) + '. sınıf</span><span class="ha-badge">' + escapeHtml(mode) + '</span></div>' +
        '<h2>' + escapeHtml(item.title) + '</h2><p>' + escapeHtml(item.description || (item.fixed_unit + ' hecesiyle akıcı okuma çalışması')) + '</p>' +
        '<a class="ha-btn ha-btn-primary" href="/hizli-okuma/hece-akisi.html?id=' + encodeURIComponent(item.id) + '">Çalışmayı Aç</a></article>';
    }).join('');
  }

  async function loadStream(id) {
    var result = await state.client.from('syllable_streams').select('*').eq('id', id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Çalışma bulunamadı veya bu çalışma için erişim izniniz yok.');
    state.stream = core.normalizeStream(result.data);
    configureSelectedStudent();
    renderSetup();
    showView('setup');
  }

  function configureSelectedStudent() {
    state.selectedStudent = null;
    var studentType = params.get('studentType');
    var studentId = params.get('studentId');
    var reader = core.clean(params.get('reader'));
    var isOwnerTeacher = state.auth && state.stream.ownerType === 'teacher' && state.stream.ownerId === state.auth.id;
    if (isOwnerTeacher && (studentType === 'panel' || studentType === 'agenda') && studentId && reader) {
      state.selectedStudent = { type: studentType, id: studentId, name: reader };
    }
  }

  function profileName() {
    var profile = state.profile || {};
    return core.clean(profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || (state.auth && state.auth.email));
  }

  function renderSetup() {
    byId('setupTitle').textContent = state.stream.title;
    byId('setupDescription').textContent = state.stream.description || 'Sabit hece ile ekrana inen birimleri akıcı biçimde okuyun.';
    byId('setupMode').textContent = state.stream.mode === 'automatic' ? 'Otomatik' : 'Öğretmen kontrollü';
    byId('setupCount').textContent = state.stream.units.length;
    byId('setupGrade').textContent = state.stream.gradeLevel + '. sınıf';
    byId('setupTiming').textContent = state.stream.mode === 'automatic'
      ? 'Her birim ' + (state.stream.intervalMs / 1000) + ' saniye ekranda kalır.'
      : 'Her dokunuşta sıradaki birim gelir; süre arka planda tutulur.';

    var reader = byId('readerName');
    var note = byId('readerNote');
    if (state.selectedStudent) {
      reader.value = state.selectedStudent.name;
      reader.readOnly = true;
      note.textContent = 'Sonuç seçili öğrencinin öğretmen kaydına eklenecek.';
    } else {
      var autoName = profileName();
      reader.value = autoName;
      reader.readOnly = Boolean(autoName && state.profile && state.profile.role === 'student');
      note.textContent = autoName ? 'Kayıtlı hesap adı otomatik getirildi.' : 'Sonuç ekranında görünecek adı yazın.';
    }
  }

  function startRun() {
    var name = core.clean(byId('readerName').value);
    if (name.length < 2) {
      byId('readerName').focus();
      byId('readerNote').textContent = 'Lütfen okuyucunun adını yazın.';
      return;
    }
    state.readerName = name;
    state.session = core.createSession(state.stream, function() { return performance.now(); });
    state.running = true;
    byId('stageTitle').textContent = state.stream.title;
    byId('stageMode').textContent = state.stream.mode === 'automatic' ? 'Otomatik akış' : 'Dokunarak ilerle';
    byId('stageFixed').textContent = state.stream.fixedUnit;
    byId('manualNext').hidden = state.stream.mode !== 'manual';
    byId('stageTip').textContent = state.stream.mode === 'automatic'
      ? 'Akış otomatik ilerliyor. Okumaya odaklanın.'
      : 'Ekrana dokunun, “Sıradaki” düğmesine basın veya boşluk tuşunu kullanın.';
    showView('stage');
    var first = state.session.start();
    renderFrame(first);
    updateClock();
    if (state.stream.mode === 'automatic') scheduleAutomatic();
  }

  function renderFrame(snapshot) {
    var falling = byId('stageFalling');
    falling.textContent = snapshot.current;
    falling.classList.remove('drop');
    void falling.offsetWidth;
    falling.classList.add('drop');
    var shown = Math.max(0, snapshot.index + 1);
    byId('stageCounter').textContent = shown + ' / ' + state.stream.units.length;
    byId('stageProgressBar').style.width = (shown / state.stream.units.length * 100) + '%';
    byId('stageLive').textContent = state.stream.fixedUnit + snapshot.current;
    if (state.stream.mode === 'manual' && snapshot.index === state.stream.units.length - 1) {
      byId('manualNext').textContent = 'Okumayı Bitir';
    } else {
      byId('manualNext').textContent = 'Sıradaki';
    }
  }

  function scheduleAutomatic() {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(function() {
      if (!state.running) return;
      var snapshot = state.session.next();
      if (snapshot.complete) return finishRun(snapshot);
      renderFrame(snapshot);
      scheduleAutomatic();
    }, state.stream.intervalMs);
  }

  function advanceManual() {
    if (!state.running || state.stream.mode !== 'manual') return;
    var snapshot = state.session.next();
    if (snapshot.complete) finishRun(snapshot);
    else renderFrame(snapshot);
  }

  function updateClock() {
    if (!state.running || !state.session) return;
    byId('stageClock').textContent = core.formatDuration(state.session.getState().elapsedMs);
    state.clockFrame = window.requestAnimationFrame(updateClock);
  }

  function stopTimers() {
    state.running = false;
    window.clearTimeout(state.timer);
    window.cancelAnimationFrame(state.clockFrame);
  }

  async function finishRun(snapshot) {
    stopTimers();
    var result = snapshot || state.session.finish();
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (error) {}
    }
    byId('resultName').textContent = state.readerName;
    byId('resultDuration').textContent = core.formatDuration(result.elapsedMs);
    byId('resultWpm').textContent = Math.round(result.wordsPerMinute);
    byId('resultCount').textContent = state.stream.units.length;
    byId('saveStatus').textContent = 'Sonuç kaydediliyor...';
    showView('result');
    await saveResult(result);
  }

  async function saveResult(result) {
    var membershipId = state.selectedStudent && state.selectedStudent.type === 'panel' ? state.selectedStudent.id : null;
    var agendaId = state.selectedStudent && state.selectedStudent.type === 'agenda' ? state.selectedStudent.id : null;
    var rpc = await state.client.rpc('record_syllable_stream_result', {
      p_stream_id: state.stream.id,
      p_elapsed_ms: Math.max(250, Math.round(result.elapsedMs)),
      p_reader_name: state.readerName,
      p_student_membership_id: membershipId,
      p_agenda_student_id: agendaId,
      p_metadata: {
        grade_level: state.stream.gradeLevel,
        source: state.selectedStudent ? 'teacher_roster' : (state.auth ? 'registered_user' : 'guest'),
      },
    });
    if (rpc.error) {
      byId('saveStatus').textContent = 'Sonuç hesaplandı; çevrim içi kayıt tamamlanamadı: ' + humanError(rpc.error);
      byId('saveStatus').className = 'ha-notice error';
      return;
    }
    var saved = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (saved && saved.words_per_minute) byId('resultWpm').textContent = Math.round(Number(saved.words_per_minute));
    byId('saveStatus').textContent = state.selectedStudent
      ? 'Sonuç öğrencinin öğretmen kaydına eklendi.'
      : 'Sonuç güvenle kaydedildi.';
    byId('saveStatus').className = 'ha-notice';
  }

  function restartRun() {
    stopTimers();
    startRun();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await byId('stageView').requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      return;
    }
  }

  function exitStage() {
    stopTimers();
    if (document.fullscreenElement) document.exitFullscreen().catch(function() {});
    showView('setup');
  }

  function bindEvents() {
    byId('catalogGrade').addEventListener('change', renderCatalog);
    byId('startButton').addEventListener('click', startRun);
    byId('manualNext').addEventListener('click', function(event) { event.stopPropagation(); advanceManual(); });
    byId('stageCanvas').addEventListener('pointerdown', advanceManual);
    byId('fullscreenButton').addEventListener('click', toggleFullscreen);
    byId('exitStageButton').addEventListener('click', exitStage);
    byId('restartButton').addEventListener('click', restartRun);
    byId('backToSetup').addEventListener('click', function() { showView('setup'); });
    byId('retryButton').addEventListener('click', function() { window.location.reload(); });
    document.addEventListener('keydown', function(event) {
      if (!state.running || state.stream.mode !== 'manual') return;
      if (event.code === 'Space' || event.code === 'ArrowRight' || event.code === 'Enter') {
        event.preventDefault();
        advanceManual();
      }
    });
  }

  async function init() {
    bindEvents();
    try {
      var localPreview = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && params.get('preview') === '1';
      if (localPreview) {
        state.client = {
          rpc: async function() {
            return { data: { words_per_minute: state.session ? state.session.getState().wordsPerMinute : 0 }, error: null };
          },
        };
        state.stream = core.normalizeStream({
          id: 'local-preview',
          title: 'SA Hecesi Akış Çalışması',
          description: 'Sabit heceye inen harfleri birleştirerek akıcı okuyun.',
          fixed_unit: 'sa',
          falling_units: ['n', 't', 'l', 'k', 'r'],
          mode: params.get('mode') === 'automatic' ? 'automatic' : 'manual',
          interval_ms: 800,
          grade_level: 1,
          status: 'published',
          visibility: 'public',
        });
        renderSetup();
        showView('setup');
        return;
      }
      await initAuth();
      var id = params.get('id');
      if (id) await loadStream(id);
      else await loadCatalog();
    } catch (error) {
      showError(error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
