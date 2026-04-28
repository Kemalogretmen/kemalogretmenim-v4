(function() {
  'use strict';

  var GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
  var state = {
    user: null,
    profile: null,
    classes: [],
    students: [],
    assignments: [],
    progress: [],
    merit: [],
  };
  var client = null;

  function getClient() {
    if (client) return client;
    var config = window.kemalSiteStore.getConfig();
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
    return client;
  }

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

  function setText(id, text) {
    var el = qs(id);
    if (el) el.textContent = text;
  }

  function toast(message, type) {
    var el = qs('teacherToast');
    if (!el) return;
    el.textContent = message;
    el.className = 'teacher-toast show' + (type === 'error' ? ' error' : '');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function() {
      el.className = 'teacher-toast';
    }, 3600);
  }

  function humanizeError(error) {
    var message = String(error && error.message ? error.message : error || '');
    if (message.indexOf('relation') >= 0 || message.indexOf('does not exist') >= 0) {
      return 'Öğretmen paneli tabloları henüz Supabase içinde kurulmamış. supabase-ogretmen-paneli.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('permission denied') >= 0 || message.indexOf('policy') >= 0) {
      return 'Bu işlem için veritabanı yetkisi eksik görünüyor. RLS politikalarını kontrol etmelisin.';
    }
    return message || 'Beklenmeyen bir hata oluştu.';
  }

  function formatDate(value) {
    if (!value) return 'Tarih yok';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tarih yok';
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function createInviteCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = 'K';
    for (var i = 0; i < 7; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  function getTeacherId() {
    return state.user && state.user.id ? state.user.id : '';
  }

  function getClassById(id) {
    return state.classes.find(function(item) { return String(item.id) === String(id); }) || null;
  }

  function getStudentsForClass(classId) {
    return state.students.filter(function(item) {
      return String(item.class_id) === String(classId) && item.status !== 'removed';
    });
  }

  function getAssignmentTargets(assignment) {
    if (!assignment) return [];
    if (assignment.target_type === 'students' && Array.isArray(assignment.target_student_ids)) {
      return assignment.target_student_ids;
    }
    return getStudentsForClass(assignment.class_id).map(function(item) { return item.id; });
  }

  function fillGradeSelects() {
    ['classGrade'].forEach(function(id) {
      var el = qs(id);
      if (!el) return;
      el.innerHTML = GRADES.map(function(grade) {
        return '<option value="' + grade + '">' + grade + '. Sınıf</option>';
      }).join('');
    });
  }

  function fillClassSelects() {
    var html = state.classes.length
      ? state.classes.map(function(item) {
        return '<option value="' + esc(item.id) + '">' + esc(item.name) + ' · ' + esc(item.invite_code) + '</option>';
      }).join('')
      : '<option value="">Önce sınıf oluştur</option>';
    ['studentClass', 'assignmentClass'].forEach(function(id) {
      var el = qs(id);
      if (el) el.innerHTML = html;
    });
    fillAssignmentStudents();
  }

  function fillAssignmentStudents() {
    var classId = qs('assignmentClass') ? qs('assignmentClass').value : '';
    var students = getStudentsForClass(classId);
    var el = qs('assignmentStudents');
    if (!el) return;
    el.innerHTML = students.map(function(item) {
      return '<option value="' + esc(item.id) + '">' + esc(item.display_name) + '</option>';
    }).join('');
  }

  function renderStats() {
    var activeAssignments = state.assignments.filter(function(item) { return item.status !== 'archived'; });
    var now = new Date();
    var dueSoon = activeAssignments.filter(function(item) {
      if (!item.due_at) return false;
      var due = new Date(item.due_at);
      var diff = (due.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 3;
    });
    setText('statClasses', String(state.classes.length));
    setText('statStudents', String(state.students.filter(function(item) { return item.status !== 'removed'; }).length));
    setText('statAssignments', String(activeAssignments.length));
    setText('statDueSoon', String(dueSoon.length));
  }

  function renderClasses() {
    var list = qs('classList');
    if (!list) return;
    if (!state.classes.length) {
      list.innerHTML = '<div class="teacher-empty">Henüz sınıf oluşturulmadı.</div>';
      return;
    }
    list.innerHTML = state.classes.map(function(item) {
      var count = getStudentsForClass(item.id).length;
      return '<div class="teacher-row">' +
        '<div>' +
          '<div class="teacher-row-title">' + esc(item.name) + '</div>' +
          '<div class="teacher-row-sub">' + esc(item.grade_level) + '. Sınıf' + (item.branch ? ' / ' + esc(item.branch) : '') + ' · ' + count + ' öğrenci</div>' +
          '<div class="teacher-row-sub">Sınıf kodu: <strong>' + esc(item.invite_code) + '</strong></div>' +
        '</div>' +
        '<div class="teacher-row-actions">' +
          '<button class="teacher-mini-btn primary" type="button" data-copy-code="' + esc(item.invite_code) + '">Kodu Kopyala</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-archive-class="' + esc(item.id) + '">Pasifleştir</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderStudents() {
    var box = qs('studentList');
    if (!box) return;
    var students = state.students.filter(function(item) { return item.status !== 'removed'; });
    if (!students.length) {
      box.innerHTML = '<div class="teacher-empty">Henüz öğrenci eklenmedi.</div>';
      return;
    }
    box.innerHTML = '<table class="teacher-table"><thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Durum</th><th></th></tr></thead><tbody>' +
      students.map(function(item) {
        var classRow = getClassById(item.class_id);
        return '<tr>' +
          '<td>' + esc(item.display_name) + '<div class="teacher-row-sub">' + esc(item.email || item.student_no || 'Manuel kayıt') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf bulunamadı') + '</td>' +
          '<td><span class="teacher-pill ok">' + esc(item.status || 'active') + '</span></td>' +
          '<td><button class="teacher-mini-btn danger" type="button" data-remove-student="' + esc(item.id) + '">Çıkar</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderAssignments() {
    var list = qs('assignmentList');
    if (!list) return;
    if (!state.assignments.length) {
      list.innerHTML = '<div class="teacher-empty">Henüz ödev verilmedi.</div>';
      return;
    }
    var sorted = state.assignments.slice().sort(function(a, b) {
      return String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'));
    });
    list.innerHTML = sorted.map(function(item) {
      var classRow = getClassById(item.class_id);
      var targets = getAssignmentTargets(item);
      var completed = state.progress.filter(function(row) {
        return String(row.assignment_id) === String(item.id) && row.status === 'completed';
      }).length;
      var total = Math.max(targets.length, 1);
      var ratio = Math.round((completed / total) * 100);
      return '<div class="teacher-row">' +
        '<div>' +
          '<div class="teacher-row-title">' + esc(item.title) + '</div>' +
          '<div class="teacher-row-sub">' + esc(classRow ? classRow.name : 'Sınıf yok') + ' · ' + esc(item.content_type) + ' · ' + formatDate(item.start_at) + ' - ' + formatDate(item.due_at) + '</div>' +
          '<div class="teacher-row-sub">Tamamlayan: ' + completed + ' / ' + total + ' · %' + ratio + '</div>' +
        '</div>' +
        '<div class="teacher-row-actions">' +
          '<span class="teacher-pill ' + (ratio >= 80 ? 'ok' : 'warn') + '">' + esc(item.status || 'active') + '</span>' +
          '<button class="teacher-mini-btn danger" type="button" data-archive-assignment="' + esc(item.id) + '">Arşivle</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderReports() {
    var box = qs('reportList');
    if (!box) return;
    var students = state.students.filter(function(item) { return item.status !== 'removed'; });
    if (!students.length) {
      box.innerHTML = '<div class="teacher-empty">Karne için önce öğrenci eklemelisin.</div>';
      return;
    }
    box.innerHTML = '<table class="teacher-table"><thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Ödev</th><th>Liyakat</th><th>Okuma</th></tr></thead><tbody>' +
      students.map(function(student) {
        var classRow = getClassById(student.class_id);
        var assigned = state.assignments.filter(function(item) {
          return getAssignmentTargets(item).indexOf(student.id) >= 0 && item.status !== 'archived';
        });
        var done = state.progress.filter(function(row) {
          return String(row.student_membership_id) === String(student.id) && row.status === 'completed';
        }).length;
        var merit = state.merit.filter(function(row) {
          return String(row.student_membership_id) === String(student.id);
        }).reduce(function(total, row) {
          return total + Number(row.points || 0);
        }, Number(student.merit_points || 0));
        return '<tr>' +
          '<td>' + esc(student.display_name) + '<div class="teacher-row-sub">' + esc(student.email || student.student_no || '') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf yok') + '</td>' +
          '<td>' + done + ' / ' + assigned.length + '</td>' +
          '<td><span class="teacher-pill ok">' + merit + ' puan</span></td>' +
          '<td><span class="teacher-pill warn">Okuma sonuç bağlantısı hazırlanıyor</span></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderAll() {
    fillClassSelects();
    renderStats();
    renderClasses();
    renderStudents();
    renderAssignments();
    renderReports();
    renderAccount();
  }

  function approvalLabel(value) {
    if (value === 'active') return 'Onaylı';
    if (value === 'rejected') return 'Reddedildi';
    return 'Onay bekliyor';
  }

  function renderAccount() {
    var profile = state.profile || {};
    var email = profile.email || (state.user && state.user.email) || '';
    var active = profile.active !== false;
    setText('accountEmailSummary', email || '-');
    setText('accountApprovalSummary', approvalLabel(profile.approval_status));
    setText('accountActiveSummary', active ? 'Aktif' : 'Pasif');
    if (qs('accountName')) qs('accountName').value = profile.full_name || '';
    if (qs('accountEmail')) qs('accountEmail').value = email;
    if (qs('accountRole')) qs('accountRole').value = 'Öğretmen';
    if (qs('accountStatusText')) qs('accountStatusText').value = (active ? 'Aktif' : 'Pasif') + ' · ' + approvalLabel(profile.approval_status);
    if (qs('accountSchool')) qs('accountSchool').value = profile.school_name || '';
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
      .select('id,role,approval_status,active,full_name,school_name,email')
      .eq('email', normalizeEmail(state.user.email))
      .maybeSingle();
    if (result.error) throw result.error;
    state.profile = result.data || null;
    if (!state.profile || state.profile.role !== 'teacher' || state.profile.active === false) {
      window.location.href = '/giris.html';
      return false;
    }
    var name = state.profile.full_name || state.user.email || 'Öğretmen';
    setText('teacherIntro', name + ' hesabı ile giriş yaptın. Sınıflarını, öğrencilerini, ödevlerini ve ilerlemeyi buradan yönetebilirsin.');
    setText('teacherStatus', state.profile.approval_status === 'active' ? 'Aktif öğretmen' : 'Yönetici onayı bekliyor');
    renderAccount();
    return true;
  }

  async function loadTeacherData() {
    var teacherId = getTeacherId();
    var classResult = await getClient()
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (classResult.error) throw classResult.error;
    state.classes = classResult.data || [];

    var classIds = state.classes.map(function(item) { return item.id; });
    if (!classIds.length) {
      state.students = [];
      state.assignments = [];
      state.progress = [];
      state.merit = [];
      renderAll();
      return;
    }

    var studentResult = await getClient()
      .from('teacher_class_students')
      .select('*')
      .in('class_id', classIds)
      .neq('status', 'removed')
      .order('display_name', { ascending: true });
    if (studentResult.error) throw studentResult.error;
    state.students = studentResult.data || [];

    var assignmentResult = await getClient()
      .from('teacher_assignments')
      .select('*')
      .eq('teacher_id', teacherId)
      .in('class_id', classIds)
      .neq('status', 'archived')
      .order('due_at', { ascending: true });
    if (assignmentResult.error) throw assignmentResult.error;
    state.assignments = assignmentResult.data || [];

    var assignmentIds = state.assignments.map(function(item) { return item.id; });
    if (assignmentIds.length) {
      var progressResult = await getClient()
        .from('teacher_assignment_progress')
        .select('*')
        .in('assignment_id', assignmentIds);
      if (progressResult.error) throw progressResult.error;
      state.progress = progressResult.data || [];
    } else {
      state.progress = [];
    }

    var studentIds = state.students.map(function(item) { return item.id; });
    if (studentIds.length) {
      var meritResult = await getClient()
        .from('teacher_merit_events')
        .select('*')
        .in('student_membership_id', studentIds);
      if (meritResult.error) throw meritResult.error;
      state.merit = meritResult.data || [];
    } else {
      state.merit = [];
    }
    renderAll();
  }

  async function refreshData() {
    try {
      await loadTeacherData();
    } catch (error) {
      toast(humanizeError(error), 'error');
      renderAll();
    }
  }

  async function saveClass(event) {
    event.preventDefault();
    var name = qs('className').value.trim();
    var grade = Number(qs('classGrade').value);
    var branch = qs('classBranch').value.trim().toLocaleUpperCase('tr-TR');
    if (!name || !grade) return;
    try {
      var result = await getClient()
        .from('teacher_classes')
        .insert({
          teacher_id: getTeacherId(),
          name: name,
          grade_level: grade,
          branch: branch,
          invite_code: createInviteCode(),
          status: 'active',
        })
        .select('*')
        .single();
      if (result.error) throw result.error;
      qs('classForm').reset();
      state.classes.unshift(result.data);
      renderAll();
      toast('Sınıf oluşturuldu.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function saveStudent(event) {
    event.preventDefault();
    var classId = qs('studentClass').value;
    var name = qs('studentName').value.trim();
    if (!classId || !name) {
      toast('Öğrenci için sınıf ve ad soyad gerekli.', 'error');
      return;
    }
    try {
      var payload = {
        class_id: classId,
        teacher_id: getTeacherId(),
        display_name: name,
        email: normalizeEmail(qs('studentEmail').value),
        student_no: qs('studentNo').value.trim(),
        status: 'active',
      };
      var result = await getClient()
        .from('teacher_class_students')
        .insert(payload)
        .select('*')
        .single();
      if (result.error) throw result.error;
      qs('studentForm').reset();
      state.students.push(result.data);
      renderAll();
      toast('Öğrenci eklendi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function saveAssignment(event) {
    event.preventDefault();
    var classId = qs('assignmentClass').value;
    var title = qs('assignmentTitle').value.trim();
    if (!classId || !title) {
      toast('Ödev için başlık ve sınıf gerekli.', 'error');
      return;
    }
    var selectedStudents = Array.prototype.slice.call(qs('assignmentStudents').selectedOptions || []).map(function(option) {
      return option.value;
    });
    var targetType = qs('assignmentTarget').value === 'students' ? 'students' : 'class';
    if (targetType === 'students' && !selectedStudents.length) {
      toast('Seçili öğrenci hedefi için en az bir öğrenci seçmelisin.', 'error');
      return;
    }
    try {
      var payload = {
        teacher_id: getTeacherId(),
        class_id: classId,
        title: title,
        content_type: qs('assignmentType').value,
        content_ref: qs('assignmentUrl').value.trim(),
        target_type: targetType,
        target_student_ids: targetType === 'students' ? selectedStudents : [],
        start_at: qs('assignmentStart').value || todayIso(),
        due_at: qs('assignmentDue').value || null,
        instructions: qs('assignmentNote').value.trim(),
        status: 'active',
      };
      var result = await getClient()
        .from('teacher_assignments')
        .insert(payload)
        .select('*')
        .single();
      if (result.error) throw result.error;
      qs('assignmentForm').reset();
      qs('assignmentStart').value = todayIso();
      state.assignments.unshift(result.data);
      renderAll();
      toast('Ödev yayınlandı.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function archiveClass(id) {
    if (!window.confirm('Bu sınıfı pasifleştirmek istediğine emin misin?')) return;
    try {
      var result = await getClient()
        .from('teacher_classes')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.classes = state.classes.filter(function(item) { return String(item.id) !== String(id); });
      renderAll();
      toast('Sınıf pasifleştirildi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function removeStudent(id) {
    try {
      var result = await getClient()
        .from('teacher_class_students')
        .update({ status: 'removed' })
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.students = state.students.filter(function(item) { return String(item.id) !== String(id); });
      renderAll();
      toast('Öğrenci sınıftan çıkarıldı.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function archiveAssignment(id) {
    try {
      var result = await getClient()
        .from('teacher_assignments')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.assignments = state.assignments.filter(function(item) { return String(item.id) !== String(id); });
      renderAll();
      toast('Ödev arşivlendi.');
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
      var result = await getClient()
        .from('user_profiles')
        .update(payload)
        .eq('id', getTeacherId());
      if (result.error) {
        var fallback = await getClient()
          .from('user_profiles')
          .update({ active: false })
          .eq('id', getTeacherId());
        if (fallback.error) throw fallback.error;
      }
      await getClient().auth.signOut();
      window.location.href = '/giris.html';
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast('Sınıf kodu kopyalandı: ' + code);
    } catch (error) {
      toast('Sınıf kodu: ' + code);
    }
  }

  function bindEvents() {
    var classForm = qs('classForm');
    var studentForm = qs('studentForm');
    var assignmentForm = qs('assignmentForm');
    if (classForm) classForm.addEventListener('submit', saveClass);
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    if (assignmentForm) assignmentForm.addEventListener('submit', saveAssignment);
    if (qs('refreshBtn')) qs('refreshBtn').addEventListener('click', refreshData);
    if (qs('deactivateAccountBtn')) qs('deactivateAccountBtn').addEventListener('click', function() {
      updateAccountStatus('deactivate');
    });
    if (qs('requestDeleteBtn')) qs('requestDeleteBtn').addEventListener('click', function() {
      updateAccountStatus('delete');
    });
    if (qs('logoutBtn')) qs('logoutBtn').addEventListener('click', async function() {
      await getClient().auth.signOut();
      window.location.href = '/giris.html';
    });
    if (qs('assignmentClass')) qs('assignmentClass').addEventListener('change', fillAssignmentStudents);
    if (qs('assignmentTarget')) qs('assignmentTarget').addEventListener('change', function(event) {
      qs('assignmentStudentsWrap').style.display = event.target.value === 'students' ? 'block' : 'none';
    });
    document.addEventListener('click', function(event) {
      var target = event.target;
      if (!target) return;
      if (target.dataset.tab) {
        document.querySelectorAll('.teacher-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === target.dataset.tab);
        });
        document.querySelectorAll('.teacher-section').forEach(function(section) {
          section.classList.toggle('active', section.id === 'section-' + target.dataset.tab);
        });
      }
      if (target.dataset.copyCode) copyCode(target.dataset.copyCode);
      if (target.dataset.archiveClass) archiveClass(target.dataset.archiveClass);
      if (target.dataset.removeStudent) removeStudent(target.dataset.removeStudent);
      if (target.dataset.archiveAssignment) archiveAssignment(target.dataset.archiveAssignment);
    });
  }

  async function init() {
    fillGradeSelects();
    bindEvents();
    if (qs('assignmentStart')) qs('assignmentStart').value = todayIso();
    try {
      var ok = await loadProfile();
      if (ok) await loadTeacherData();
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
