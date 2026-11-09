(function() {
  'use strict';

  var core = window.HeceAkisiCore;
  var role = document.body.dataset.managerRole === 'admin' ? 'admin' : 'teacher';
  var state = {
    client: null,
    user: null,
    activities: [],
    results: [],
    roster: [],
    editingId: '',
    previewIndex: 0,
    previewTimer: 0,
  };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
  function humanError(error) {
    var message = String(error && (error.message || error.error_description) || 'İşlem tamamlanamadı.');
    if (/syllable_streams|syllable_stream_results|schema cache|does not exist/i.test(message)) {
      return 'Hece Akışı tabloları henüz hazır değil. supabase-hece-akisi.sql dosyasını Supabase SQL Editor içinde bir kez çalıştırın.';
    }
    return message;
  }
  function toast(message, isError) {
    var node = byId('managerToast');
    if (!node) return;
    node.textContent = message;
    node.className = 'ha-toast show' + (isError ? ' error' : '');
    window.clearTimeout(node._timer);
    node._timer = window.setTimeout(function() { node.className = 'ha-toast'; }, 3400);
  }
  function setBusy(busy) {
    ['saveActivity', 'newActivity', 'refreshManager'].forEach(function(id) {
      var node = byId(id);
      if (node) node.disabled = busy;
    });
  }

  async function authenticateTeacher() {
    await window.kemalUserAuth.ready();
    var authState = window.kemalUserAuth.getState();
    var profile = authState.profile || {};
    if (!authState.user || profile.role !== 'teacher' || profile.active === false || (profile.approval_status && profile.approval_status !== 'active')) {
      byId('teacherBlocked').hidden = false;
      byId('managerView').hidden = true;
      return false;
    }
    state.client = window.kemalUserAuth.getClient();
    state.user = authState.user;
    byId('managerView').hidden = false;
    return true;
  }

  async function authenticateAdmin() {
    var session = null;
    try { session = await window.kemalAdminAuth.getSession(); } catch (error) { session = null; }
    if (!session) {
      byId('adminLogin').hidden = false;
      byId('managerView').hidden = true;
      return false;
    }
    state.client = window.kemalAdminAuth.getClient();
    state.user = session.user;
    byId('adminLogin').hidden = true;
    byId('managerView').hidden = false;
    return true;
  }

  async function signInAdmin() {
    var errorNode = byId('loginError');
    errorNode.hidden = true;
    try {
      await window.kemalAdminAuth.signIn(byId('loginEmail').value, byId('loginPassword').value);
      await authenticateAdmin();
      await loadAll();
    } catch (error) {
      errorNode.textContent = humanError(error);
      errorNode.hidden = false;
    }
  }

  function formMode() {
    var checked = document.querySelector('input[name="activityMode"]:checked');
    return checked ? checked.value : 'manual';
  }

  function readForm() {
    var units = core.parseUnits(byId('activityUnits').value);
    var title = core.clean(byId('activityTitle').value);
    var fixedUnit = core.clean(byId('activityFixed').value).slice(0, 20);
    if (title.length < 2) throw new Error('Etkinlik başlığı en az 2 karakter olmalı.');
    if (!fixedUnit) throw new Error('Sabit heceyi yazın.');
    if (!units.length) throw new Error('En az bir inen harf veya hece yazın.');
    return {
      title: title,
      description: core.clean(byId('activityDescription').value).slice(0, 500),
      fixed_unit: fixedUnit,
      falling_units: units,
      mode: formMode(),
      interval_ms: core.normalizeInterval(Number(byId('activitySeconds').value) * 1000),
      grade_level: Number(byId('activityGrade').value) || 1,
      status: byId('activityStatus').value,
      visibility: role === 'admin' ? 'public' : 'private',
    };
  }

  function resetForm() {
    state.editingId = '';
    byId('editorHeading').textContent = 'Yeni Hece Çalışması';
    byId('activityTitle').value = '';
    byId('activityDescription').value = '';
    byId('activityFixed').value = 'sa';
    byId('activityUnits').value = 'n, t, l, k';
    byId('modeManual').checked = true;
    byId('activitySeconds').value = '2';
    byId('activityGrade').value = '1';
    byId('activityStatus').value = 'draft';
    byId('saveActivity').textContent = 'Çalışmayı Kaydet';
    updateModeFields();
    restartPreview();
  }

  function fillForm(activity) {
    state.editingId = activity.id;
    byId('editorHeading').textContent = 'Çalışmayı Düzenle';
    byId('activityTitle').value = activity.title || '';
    byId('activityDescription').value = activity.description || '';
    byId('activityFixed').value = activity.fixed_unit || '';
    byId('activityUnits').value = (activity.falling_units || []).join(', ');
    byId(activity.mode === 'automatic' ? 'modeAutomatic' : 'modeManual').checked = true;
    byId('activitySeconds').value = String((Number(activity.interval_ms) || 2000) / 1000);
    byId('activityGrade').value = String(activity.grade_level || 1);
    byId('activityStatus').value = activity.status === 'published' ? 'published' : 'draft';
    byId('saveActivity').textContent = 'Değişiklikleri Kaydet';
    updateModeFields();
    restartPreview();
    byId('editorHeading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveActivity() {
    setBusy(true);
    try {
      var payload = readForm();
      var query;
      if (state.editingId) {
        query = state.client.from('syllable_streams').update(payload).eq('id', state.editingId).select('*').single();
      } else {
        payload.owner_id = state.user.id;
        payload.owner_type = role;
        query = state.client.from('syllable_streams').insert(payload).select('*').single();
      }
      var result = await query;
      if (result.error) throw result.error;
      toast(state.editingId ? 'Çalışma güncellendi.' : 'Yeni çalışma kaydedildi.');
      resetForm();
      await loadAll();
    } catch (error) {
      toast(humanError(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function archiveActivity(id) {
    if (!window.confirm('Bu çalışma arşive alınsın mı? Sonuç kayıtları korunur.')) return;
    var result = await state.client.from('syllable_streams').update({ status: 'archived' }).eq('id', id);
    if (result.error) return toast(humanError(result.error), true);
    toast('Çalışma arşive alındı.');
    await loadAll();
  }

  async function loadActivities() {
    var query = state.client
      .from('syllable_streams')
      .select('*')
      .eq('owner_type', role)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (role === 'teacher') query = query.eq('owner_id', state.user.id);
    var result = await query;
    if (result.error) throw result.error;
    state.activities = result.data || [];
  }

  async function loadResults() {
    var ids = state.activities.map(function(item) { return item.id; });
    if (!ids.length) { state.results = []; return; }
    var result = await state.client
      .from('syllable_stream_results')
      .select('id,stream_id,reader_name,mode,elapsed_ms,item_count,words_per_minute,completed_at')
      .in('stream_id', ids)
      .order('completed_at', { ascending: false })
      .limit(200);
    if (result.error) throw result.error;
    state.results = result.data || [];
  }

  function rosterKey(type, id) { return type + ':' + id; }
  function normalizeName(value) { return core.clean(value).toLocaleLowerCase('tr-TR'); }

  async function loadRoster() {
    if (role !== 'teacher') return;
    var classesResult = await state.client
      .from('teacher_classes')
      .select('id,name,grade_level,branch')
      .eq('teacher_id', state.user.id)
      .eq('status', 'active')
      .order('name');
    if (classesResult.error) throw classesResult.error;
    var classes = classesResult.data || [];
    var classNames = {};
    classes.forEach(function(item) { classNames[item.id] = item.name || ((item.grade_level || '') + '. Sınıf ' + (item.branch || '')); });

    var studentsResult = await state.client
      .from('teacher_class_students')
      .select('id,class_id,student_profile_id,display_name,student_no')
      .eq('teacher_id', state.user.id)
      .eq('status', 'active')
      .order('display_name');
    if (studentsResult.error) throw studentsResult.error;

    var roster = (studentsResult.data || []).map(function(item) {
      return {
        key: rosterKey('panel', item.id),
        type: 'panel',
        id: item.id,
        profileId: item.student_profile_id || '',
        name: core.clean(item.display_name),
        className: classNames[item.class_id] || 'Sınıf',
        studentNo: item.student_no || '',
      };
    });
    var seen = new Set(roster.map(function(item) { return normalizeName(item.name) + '|' + normalizeName(item.className); }));

    var agendaResult = await state.client
      .from('teacher_agenda_states')
      .select('agenda_state')
      .eq('user_id', state.user.id)
      .maybeSingle();
    if (!agendaResult.error && agendaResult.data && agendaResult.data.agenda_state) {
      var agenda = agendaResult.data.agenda_state;
      var agendaClasses = {};
      (Array.isArray(agenda.classes) ? agenda.classes : []).forEach(function(item) { agendaClasses[item.id] = item.name || 'Ajanda Sınıfı'; });
      (Array.isArray(agenda.students) ? agenda.students : []).forEach(function(item) {
        var name = core.clean([item.firstName, item.lastName].filter(Boolean).join(' '));
        var className = agendaClasses[item.classId] || 'Ajanda';
        var signature = normalizeName(name) + '|' + normalizeName(className);
        if (!name || seen.has(signature)) return;
        seen.add(signature);
        roster.push({
          key: rosterKey('agenda', item.id),
          type: 'agenda',
          id: String(item.id || ''),
          profileId: '',
          name: name,
          className: className,
          studentNo: item.schoolNo || '',
        });
      });
    }
    state.roster = roster.sort(function(a, b) { return (a.className + a.name).localeCompare(b.className + b.name, 'tr'); });
  }

  function renderRoster() {
    var wrap = byId('studentPickerWrap');
    if (!wrap || role !== 'teacher') return;
    wrap.hidden = false;
    var select = byId('studentPicker');
    select.innerHTML = '<option value="">Öğrenci seçmeden deneme yap</option>' + state.roster.map(function(item) {
      var no = item.studentNo ? ' · No ' + item.studentNo : '';
      return '<option value="' + escapeHtml(item.key) + '">' + escapeHtml(item.className + ' · ' + item.name + no) + '</option>';
    }).join('');
    byId('rosterSummary').textContent = state.roster.length
      ? state.roster.length + ' öğrenci panel ve ajandadan hazır.'
      : 'Ajandada veya öğretmen panelinde öğrenci bulunamadı.';
  }

  function selectedStudent() {
    if (role !== 'teacher') return null;
    var key = byId('studentPicker').value;
    return state.roster.find(function(item) { return item.key === key; }) || null;
  }

  function runHref(activity) {
    var params = new URLSearchParams({ id: activity.id });
    var student = selectedStudent();
    if (student) {
      params.set('studentType', student.type);
      params.set('studentId', student.id);
      params.set('reader', student.name);
    }
    return '/hizli-okuma/hece-akisi.html?' + params.toString();
  }

  function renderActivities() {
    var grid = byId('activityList');
    if (!state.activities.length) {
      grid.innerHTML = '<div class="ha-empty">Henüz çalışma hazırlanmadı. Sabit heceyi ve inen birimleri belirleyerek ilk çalışmayı oluşturabilirsiniz.</div>';
      return;
    }
    grid.innerHTML = state.activities.map(function(item) {
      var statusClass = item.status === 'published' ? 'live' : 'draft';
      var statusLabel = item.status === 'published' ? (role === 'admin' ? 'Herkese açık' : 'Kullanıma hazır') : 'Taslak';
      var mode = item.mode === 'automatic' ? 'Otomatik · ' + ((item.interval_ms || 0) / 1000) + ' sn' : 'Dokunarak ilerle';
      return '<article class="ha-activity-card" data-id="' + escapeHtml(item.id) + '">' +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
        '<p>' + escapeHtml(item.description || (item.fixed_unit + ' hecesiyle akıcı okuma çalışması')) + '</p>' +
        '<div class="ha-badges"><span class="ha-badge ' + statusClass + '">' + statusLabel + '</span>' +
        '<span class="ha-badge">' + escapeHtml(item.grade_level) + '. sınıf</span>' +
        '<span class="ha-badge">' + escapeHtml(mode) + '</span>' +
        '<span class="ha-badge">' + escapeHtml((item.falling_units || []).length) + ' birim</span></div>' +
        '<div class="ha-card-actions"><button class="ha-btn" type="button" data-action="run">Başlat</button>' +
        '<button class="ha-btn" type="button" data-action="edit">Düzenle</button>' +
        '<button class="ha-btn ha-btn-danger" type="button" data-action="archive">Arşivle</button></div></article>';
    }).join('');
  }

  function renderResults() {
    var table = byId('resultRows');
    var titleById = {};
    state.activities.forEach(function(item) { titleById[item.id] = item.title; });
    if (!state.results.length) {
      table.innerHTML = '<tr><td colspan="6">Henüz tamamlanmış çalışma yok.</td></tr>';
      return;
    }
    table.innerHTML = state.results.map(function(item) {
      var date = new Date(item.completed_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
      return '<tr><td><strong>' + escapeHtml(item.reader_name) + '</strong></td>' +
        '<td>' + escapeHtml(titleById[item.stream_id] || 'Hece Akışı') + '</td>' +
        '<td>' + (item.mode === 'automatic' ? 'Otomatik' : 'Öğretmen kontrollü') + '</td>' +
        '<td>' + escapeHtml(core.formatDuration(item.elapsed_ms)) + '</td>' +
        '<td><strong>' + escapeHtml(Math.round(Number(item.words_per_minute) || 0)) + '</strong></td>' +
        '<td>' + escapeHtml(date) + '</td></tr>';
    }).join('');
  }

  function updateModeFields() {
    var automatic = formMode() === 'automatic';
    byId('secondsField').hidden = !automatic;
    byId('modeHelp').textContent = automatic
      ? 'Birimler belirlediğiniz aralıkla kendiliğinden iner.'
      : 'Her dokunuşta veya boşluk tuşunda sıradaki birim iner; süre arka planda tutulur.';
  }

  function restartPreview() {
    window.clearInterval(state.previewTimer);
    state.previewIndex = 0;
    renderPreview();
    state.previewTimer = window.setInterval(function() {
      var units = core.parseUnits(byId('activityUnits').value);
      if (!units.length) return;
      state.previewIndex = (state.previewIndex + 1) % units.length;
      renderPreview();
    }, 1400);
  }

  function renderPreview() {
    var fixed = core.clean(byId('activityFixed').value) || 'sa';
    var units = core.parseUnits(byId('activityUnits').value);
    byId('previewFixed').textContent = fixed;
    var falling = byId('previewFalling');
    falling.textContent = units[state.previewIndex % Math.max(1, units.length)] || '?';
    falling.classList.remove('ha-preview-falling');
    void falling.offsetWidth;
    falling.classList.add('ha-preview-falling');
    byId('unitCount').textContent = units.length + ' okuma birimi';
  }

  async function loadAll() {
    setBusy(true);
    try {
      await loadActivities();
      await Promise.all([loadResults(), loadRoster()]);
      renderRoster();
      renderActivities();
      renderResults();
      byId('managerNotice').hidden = true;
    } catch (error) {
      byId('managerNotice').textContent = humanError(error);
      byId('managerNotice').className = 'ha-notice error';
      byId('managerNotice').hidden = false;
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    byId('saveActivity').addEventListener('click', saveActivity);
    byId('newActivity').addEventListener('click', resetForm);
    byId('refreshManager').addEventListener('click', loadAll);
    document.querySelectorAll('input[name="activityMode"]').forEach(function(node) { node.addEventListener('change', updateModeFields); });
    ['activityFixed', 'activityUnits'].forEach(function(id) { byId(id).addEventListener('input', restartPreview); });
    byId('activityList').addEventListener('click', function(event) {
      var button = event.target.closest('[data-action]');
      var card = event.target.closest('[data-id]');
      if (!button || !card) return;
      var activity = state.activities.find(function(item) { return item.id === card.dataset.id; });
      if (!activity) return;
      if (button.dataset.action === 'edit') fillForm(activity);
      if (button.dataset.action === 'archive') archiveActivity(activity.id);
      if (button.dataset.action === 'run') window.open(runHref(activity), '_blank', 'noopener');
    });
    if (role === 'teacher') byId('studentPicker').addEventListener('change', renderActivities);
    if (role === 'admin') {
      byId('loginButton').addEventListener('click', signInAdmin);
      byId('loginPassword').addEventListener('keydown', function(event) { if (event.key === 'Enter') signInAdmin(); });
      byId('logoutButton').addEventListener('click', async function() {
        await window.kemalAdminAuth.signOut();
        window.location.reload();
      });
    }
  }

  async function init() {
    if (!core) return;
    bindEvents();
    resetForm();
    var allowed = role === 'admin' ? await authenticateAdmin() : await authenticateTeacher();
    if (allowed) await loadAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
