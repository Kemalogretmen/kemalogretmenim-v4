(function() {
  'use strict';

  var state = {
    client: null,
    user: null,
    profile: null,
    memberships: [],
    assignments: [],
    progress: [],
    merit: [],
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function getClient() {
    if (state.client) return state.client;
    var config = window.kemalSiteStore.getConfig();
    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
    return state.client;
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function toast(message, type) {
    var el = qs('studentToast');
    if (!el) return;
    el.textContent = message;
    el.className = 'student-toast show' + (type === 'error' ? ' error' : '');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function() {
      el.className = 'student-toast';
    }, 3600);
  }

  function humanizeError(error) {
    var message = String(error && error.message ? error.message : error || '');
    if (message.indexOf('relation') >= 0 || message.indexOf('does not exist') >= 0) {
      return 'Öğrenci paneli tabloları henüz Supabase içinde kurulmamış. supabase-ogretmen-paneli.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('permission denied') >= 0 || message.indexOf('policy') >= 0) {
      return 'Bu işlem için veritabanı yetkisi eksik görünüyor. SQL politikalarını güncellemelisin.';
    }
    return message || 'Beklenmeyen bir hata oluştu.';
  }

  function formatDate(value) {
    if (!value) return 'Tarih yok';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tarih yok';
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function getMembershipIds() {
    return state.memberships.map(function(item) { return item.id; });
  }

  function targetIncludesStudent(assignment, membershipId) {
    if (!assignment) return false;
    if (assignment.target_type !== 'students') return true;
    return Array.isArray(assignment.target_student_ids) && assignment.target_student_ids.indexOf(membershipId) >= 0;
  }

  function renderStats() {
    var activeAssignments = state.assignments.filter(function(item) { return item.status !== 'archived'; });
    var merit = state.merit.reduce(function(total, row) {
      return total + Number(row.points || 0);
    }, state.memberships.reduce(function(total, row) {
      return total + Number(row.merit_points || 0);
    }, 0));
    setText('studentClassCount', String(state.memberships.length));
    setText('studentAssignmentCount', String(activeAssignments.length));
    setText('studentMeritCount', String(merit));
  }

  function renderAccount() {
    var profile = state.profile || {};
    var email = profile.email || (state.user && state.user.email) || '';
    if (qs('studentAccountName')) qs('studentAccountName').value = profile.full_name || '';
    if (qs('studentAccountEmail')) qs('studentAccountEmail').value = email;
    if (qs('studentAccountSchool')) qs('studentAccountSchool').value = profile.school_name || '';
    if (qs('studentAccountGrade')) qs('studentAccountGrade').value = profile.grade_level ? profile.grade_level + '. Sınıf' : '';
  }

  function renderClasses() {
    var box = qs('studentClassList');
    if (!box) return;
    if (!state.memberships.length) {
      box.innerHTML = '<div class="student-empty">Henüz bir sınıfa bağlı değilsin.</div>';
      return;
    }
    box.innerHTML = state.memberships.map(function(item) {
      var classRow = item.teacher_classes || {};
      return '<div class="student-row">' +
        '<div>' +
          '<div class="student-row-title">' + esc(classRow.name || 'Sınıf') + '</div>' +
          '<div class="student-row-sub">' + esc(classRow.grade_level ? classRow.grade_level + '. Sınıf' : '') + (classRow.branch ? ' / ' + esc(classRow.branch) : '') + '</div>' +
        '</div>' +
        '<span class="student-pill ok">' + esc(item.status || 'active') + '</span>' +
      '</div>';
    }).join('');
  }

  function renderAssignments() {
    var box = qs('studentAssignmentList');
    if (!box) return;
    var rows = state.assignments.filter(function(item) {
      return state.memberships.some(function(membership) {
        return String(membership.class_id) === String(item.class_id) && targetIncludesStudent(item, membership.id);
      });
    });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Şu anda aktif ödevin yok.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      var progress = state.progress.find(function(row) { return String(row.assignment_id) === String(item.id); }) || {};
      return '<div class="student-row">' +
        '<div>' +
          '<div class="student-row-title">' + esc(item.title) + '</div>' +
          '<div class="student-row-sub">' + esc(item.content_type) + ' · ' + formatDate(item.start_at) + ' - ' + formatDate(item.due_at) + '</div>' +
          (item.instructions ? '<div class="student-row-sub">' + esc(item.instructions) + '</div>' : '') +
        '</div>' +
        '<span class="student-pill ' + (progress.status === 'completed' ? 'ok' : 'warn') + '">' + esc(progress.status || 'assigned') + '</span>' +
      '</div>';
    }).join('');
  }

  function renderAll() {
    renderStats();
    renderAccount();
    renderClasses();
    renderAssignments();
  }

  async function loadProfile() {
    var auth = await getClient().auth.getUser();
    state.user = auth && auth.data ? auth.data.user : null;
    if (!state.user) {
      window.location.href = '/giris.html';
      return false;
    }
    var result = await getClient()
      .from('user_profiles')
      .select('id,role,approval_status,active,full_name,school_name,email,grade_level')
      .eq('email', normalizeEmail(state.user.email))
      .maybeSingle();
    if (result.error) throw result.error;
    state.profile = result.data || null;
    if (!state.profile || state.profile.role !== 'student' || state.profile.active === false) {
      window.location.href = '/giris.html';
      return false;
    }
    setText('studentIntro', (state.profile.full_name || state.user.email || 'Öğrenci') + ' hesabı ile giriş yaptın. Ödevlerini, sınıflarını ve karneni buradan takip edebilirsin.');
    setText('studentStatus', 'Aktif öğrenci');
    renderAccount();
    return true;
  }

  async function loadData() {
    var memberships = await getClient()
      .from('teacher_class_students')
      .select('*,teacher_classes(id,name,grade_level,branch,invite_code,status)')
      .eq('student_profile_id', state.user.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });
    if (memberships.error) throw memberships.error;
    state.memberships = memberships.data || [];
    var classIds = state.memberships.map(function(item) { return item.class_id; });
    var membershipIds = getMembershipIds();
    if (!classIds.length) {
      state.assignments = [];
      state.progress = [];
      state.merit = [];
      renderAll();
      return;
    }
    var assignments = await getClient()
      .from('teacher_assignments')
      .select('*')
      .in('class_id', classIds)
      .neq('status', 'archived')
      .order('due_at', { ascending: true });
    if (assignments.error) throw assignments.error;
    state.assignments = assignments.data || [];
    var assignmentIds = state.assignments.map(function(item) { return item.id; });
    if (assignmentIds.length) {
      var progress = await getClient()
        .from('teacher_assignment_progress')
        .select('*')
        .in('assignment_id', assignmentIds)
        .in('student_membership_id', membershipIds);
      if (progress.error) throw progress.error;
      state.progress = progress.data || [];
    } else {
      state.progress = [];
    }
    if (membershipIds.length) {
      var merit = await getClient()
        .from('teacher_merit_events')
        .select('*')
        .in('student_membership_id', membershipIds);
      if (merit.error) throw merit.error;
      state.merit = merit.data || [];
    } else {
      state.merit = [];
    }
    renderAll();
  }

  async function joinClass(event) {
    event.preventDefault();
    var code = String(qs('joinClassCode').value || '').trim().toLocaleUpperCase('tr-TR');
    if (!code) return;
    try {
      var result = await getClient().rpc('join_teacher_class_by_code', { p_invite_code: code });
      if (result.error) throw result.error;
      qs('joinClassForm').reset();
      toast('Sınıfa katıldın.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function updateAccountStatus(kind) {
    var message = kind === 'delete'
      ? 'Silme talebi oluşturulsun ve hesap pasife alınsın mı?'
      : 'Hesabını kapatmak istediğine emin misin?';
    if (!window.confirm(message)) return;
    try {
      var payload = kind === 'delete'
        ? { active: false, account_status: 'deletion_requested', deletion_requested_at: new Date().toISOString() }
        : { active: false, account_status: 'deactivated', deactivated_at: new Date().toISOString() };
      var result = await getClient().from('user_profiles').update(payload).eq('id', state.user.id);
      if (result.error) {
        var fallback = await getClient().from('user_profiles').update({ active: false }).eq('id', state.user.id);
        if (fallback.error) throw fallback.error;
      }
      await getClient().auth.signOut();
      window.location.href = '/giris.html';
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  function bindEvents() {
    if (qs('joinClassForm')) qs('joinClassForm').addEventListener('submit', joinClass);
    if (qs('studentRefreshBtn')) qs('studentRefreshBtn').addEventListener('click', loadData);
    if (qs('studentLogoutBtn')) qs('studentLogoutBtn').addEventListener('click', async function() {
      await getClient().auth.signOut();
      window.location.href = '/giris.html';
    });
    if (qs('studentDeactivateBtn')) qs('studentDeactivateBtn').addEventListener('click', function() {
      updateAccountStatus('deactivate');
    });
    if (qs('studentDeleteRequestBtn')) qs('studentDeleteRequestBtn').addEventListener('click', function() {
      updateAccountStatus('delete');
    });
    document.addEventListener('click', function(event) {
      var target = event.target;
      if (!target || !target.dataset.tab) return;
      document.querySelectorAll('.student-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === target.dataset.tab);
      });
      document.querySelectorAll('.student-section').forEach(function(section) {
        section.classList.toggle('active', section.id === 'student-section-' + target.dataset.tab);
      });
    });
  }

  async function init() {
    bindEvents();
    try {
      var ok = await loadProfile();
      if (ok) await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
