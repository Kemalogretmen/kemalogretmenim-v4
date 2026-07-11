(function() {
  'use strict';

  var EXAM_KARNE_KEY = 'kemal_exam_admin_karne_result_v1';
  var READING_KARNE_KEY = 'kemal_hizli_okuma_karne_result_v1';
  var state = {
    user: null,
    profile: null,
    links: [],
    students: {},
    studentMemberships: {},
    teachers: {},
    classes: {},
    assignments: [],
    progress: [],
    merit: [],
    contentProgress: [],
    messages: [],
    messageProfiles: {},
    messageTab: 'inbox',
    activeMessageId: '',
    reportTab: 'cards',
    selectedChildId: '',
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

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function bindCodeInput(id) {
    var input = qs(id);
    if (!input) return;
    var normalizeInput = function() {
      var next = normalizeCode(input.value);
      if (input.value !== next) input.value = next;
    };
    input.addEventListener('input', normalizeInput);
    input.addEventListener('paste', function() {
      window.setTimeout(normalizeInput, 0);
    });
  }

  function formatDate(value) {
    if (!value) return 'Tarih yok';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Tarih yok';
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function sameId(a, b) {
    return String(a || '') === String(b || '');
  }

  function getRemoteMeta(row) {
    var detail = row && row.detail_json && typeof row.detail_json === 'object' ? row.detail_json : {};
    return detail.meta && typeof detail.meta === 'object' ? detail.meta : {};
  }

  function getPersonName(id) {
    if (sameId(id, state.user && state.user.id)) return 'Sen';
    return getDisplayName(state.students[id]) || getDisplayName(state.teachers[id]) || getDisplayName(state.messageProfiles[id]) || 'Kullanıcı';
  }

  function isOwnMessageDeleted(message) {
    return sameId(message.sender_id, state.user && state.user.id) ? !!message.sender_deleted_at : !!message.recipient_deleted_at;
  }

  function getUnreadMessageCount() {
    return state.messages.filter(function(message) {
      return sameId(message.recipient_id, state.user && state.user.id) && message.status !== 'read' && !message.recipient_deleted_at;
    }).length;
  }

  function getMessageRows(tab) {
    var selected = tab || state.messageTab || 'inbox';
    return state.messages.filter(function(message) {
      if (isOwnMessageDeleted(message) || message.status === 'archived') return false;
      var mine = sameId(message.sender_id, state.user && state.user.id);
      var received = sameId(message.recipient_id, state.user && state.user.id);
      if (selected === 'sent') return mine;
      if (selected === 'read') return received && message.status === 'read';
      return received && message.status !== 'read';
    }).sort(function(a, b) {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }).slice(0, 10);
  }

  function setPanelBadge(tabName, count) {
    document.querySelectorAll('[data-tab="' + tabName + '"]').forEach(function(el) {
      var badge = el.querySelector('.panel-notification-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'panel-notification-badge';
        el.appendChild(badge);
      }
      badge.hidden = !count;
      badge.textContent = String(count || '');
    });
  }

  function renderPanelBadges() {
    setPanelBadge('messages', getUnreadMessageCount());
    setPanelBadge('tasks', 0);
  }

  function safeHref(value) {
    var raw = String(value || '').trim();
    if (!raw || /^<iframe/i.test(raw)) return '#';
    try {
      var url = new URL(raw, window.location.origin);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '#';
    } catch (error) {
      return raw.charAt(0) === '/' ? raw : '#';
    }
  }

  function getDisplayName(profile) {
    return clean(profile && (profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email));
  }

  function getInitials(profile) {
    var name = getDisplayName(profile) || 'Veli';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function(part) {
      return part.charAt(0);
    }).join('').toLocaleUpperCase('tr-TR') || 'V';
  }

  function setText(id, value) {
    var el = qs(id);
    if (el) el.textContent = value;
  }

  function toast(message, type) {
    var el = qs('parentToast');
    if (!el) return;
    el.textContent = message;
    el.className = 'parent-toast show' + (type === 'error' ? ' error' : '');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function() {
      el.className = 'parent-toast';
    }, 3600);
  }

  function validateSafeText(fields, surface) {
    if (!window.kemalContentSafety || typeof window.kemalContentSafety.validateFields !== 'function') {
      return true;
    }
    var result = window.kemalContentSafety.validateFields(fields, { surface: surface || 'parent_panel' });
    if (!result.ok) {
      toast(result.message, 'error');
      return false;
    }
    return true;
  }

  function humanizeError(error) {
    var message = String(error && error.message ? error.message : error || '');
    if (message.indexOf('birth_date') >= 0 || message.indexOf('parent_note') >= 0 || message.indexOf('sender_deleted_at') >= 0 || message.indexOf('recipient_deleted_at') >= 0) {
      return 'Panel güncelleme alanları Supabase içinde eksik görünüyor. supabase-panel-guncelleme-2026-05-27.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('relation') >= 0 || message.indexOf('does not exist') >= 0) {
      return 'Veli paneli tabloları henüz Supabase içinde kurulmamış. supabase-veli-paneli.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('permission denied') >= 0 || message.indexOf('policy') >= 0) {
      return 'Bu işlem için veritabanı yetkisi eksik görünüyor. Veli paneli RLS politikalarını kontrol etmelisin.';
    }
    if (message.indexOf('invalid or expired code') >= 0) {
      return 'Kod geçersiz, süresi dolmuş ya da kullanım hakkı bitmiş görünüyor.';
    }
    return message || 'Beklenmeyen bir hata oluştu.';
  }

  function getChildLinks() {
    return state.links.filter(function(link) {
      return link.status === 'active' || link.status === 'pending';
    });
  }

  function getChildName(link) {
    var student = state.students[link.student_profile_id] || {};
    return getDisplayName(student) || 'Öğrenci';
  }

  function getClassLabel(link) {
    var row = state.classes[link.class_id] || {};
    return [row.name, row.grade_level ? row.grade_level + '. Sınıf' : '', row.branch].filter(Boolean).join(' / ') || 'Sınıf bilgisi yok';
  }

  function getTeacherName(link) {
    var teacher = state.teachers[link.teacher_id] || {};
    return getDisplayName(teacher) || 'Öğretmen bilgisi yok';
  }

  function getSelectedLink(selectId) {
    var select = qs(selectId);
    var value = select && select.value ? select.value : state.selectedChildId;
    return getChildLinks().find(function(link) {
      return String(link.id) === String(value);
    }) || getChildLinks()[0] || null;
  }

  function targetIncludesChild(assignment, link) {
    if (!assignment || !link) return false;
    if (String(assignment.class_id) !== String(link.class_id)) return false;
    if (assignment.target_type !== 'students') return true;
    return Array.isArray(assignment.target_student_ids)
      && assignment.target_student_ids.some(function(id) { return String(id) === String(link.student_membership_id); });
  }

  function getProgressForAssignment(assignment, link) {
    return state.progress.find(function(row) {
      return String(row.assignment_id) === String(assignment.id) && String(row.student_membership_id) === String(link.student_membership_id);
    }) || { status: 'assigned' };
  }

  function statusLabel(status) {
    var map = {
      assigned: 'Atandı',
      started: 'Başladı',
      completed: 'Tamamlandı',
      late: 'Geç kaldı',
      excused: 'Mazeretli',
      active: 'Aktif',
      pending: 'Onay bekliyor',
      revoked: 'Kaldırıldı',
    };
    return map[status] || status || 'Atandı';
  }

  function getMeritLevel(points) {
    var value = Number(points || 0);
    if (value >= 750) return 'Lider';
    if (value >= 500) return 'Usta';
    if (value >= 250) return 'Çırak';
    return 'Acemi';
  }

  function getMeritPointsForLink(link) {
    if (!link) return 0;
    var eventPoints = state.merit.filter(function(row) {
      return String(row.student_membership_id) === String(link.student_membership_id);
    }).reduce(function(total, row) {
      return total + Number(row.points || 0);
    }, 0);
    var membership = state.studentMemberships[link.student_membership_id] || {};
    return Math.max(eventPoints, Number(membership.merit_points || 0));
  }

  function renderStats() {
    var links = getChildLinks();
    var assignments = state.assignments.filter(function(item) {
      return links.some(function(link) { return targetIncludesChild(item, link); }) && item.status !== 'archived';
    });
    setText('parentChildCount', String(links.length));
    setText('parentAssignmentCount', String(assignments.length));
    setText('parentMessageCount', String(getUnreadMessageCount()));
    setText('parentReportCount', String(state.progress.length + state.contentProgress.length));
  }

  function renderChildOptions() {
    var links = getChildLinks();
    if (!state.selectedChildId && links[0]) state.selectedChildId = links[0].id;
    ['parentChildFilter', 'parentReportChildFilter', 'messageChild', 'sendContentChild'].forEach(function(id) {
      var select = qs(id);
      if (!select) return;
      select.innerHTML = links.length
        ? links.map(function(link) {
          return '<option value="' + esc(link.id) + '"' + (String(link.id) === String(state.selectedChildId) ? ' selected' : '') + '>' + esc(getChildName(link)) + '</option>';
        }).join('')
        : '<option value="">Bağlı çocuk yok</option>';
    });
  }

  function renderChildren() {
    var box = qs('parentChildList');
    if (!box) return;
    var links = getChildLinks();
    if (!links.length) {
      box.innerHTML = '<div class="parent-empty">Henüz bağlı çocuk yok. Öğretmenin verdiği kodu girebilir veya veli kodu oluşturup öğrencinin hesabında kullandırabilirsin.</div>';
      return;
    }
    box.innerHTML = links.map(function(link) {
      return '<div class="parent-row">' +
        '<div>' +
          '<div class="parent-row-title">' + esc(getChildName(link)) + '</div>' +
          '<div class="parent-row-sub">' + esc(getClassLabel(link)) + '</div>' +
          '<div class="parent-row-sub">' + esc(getTeacherName(link)) + ' · ' + esc(statusLabel(link.teacher_review_status)) + '</div>' +
        '</div>' +
        '<div class="parent-row-actions">' +
          '<span class="parent-pill ' + (link.status === 'active' ? 'ok' : 'warn') + '">' + esc(statusLabel(link.status)) + '</span>' +
          '<button class="parent-btn secondary" type="button" data-select-child="' + esc(link.id) + '">Seç</button>' +
          '<button class="parent-btn danger" type="button" data-remove-child="' + esc(link.id) + '">Kaldır</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderAssignments() {
    var box = qs('parentAssignmentList');
    if (!box) return;
    var link = getSelectedLink('parentChildFilter');
    if (!link) {
      box.innerHTML = '<div class="parent-empty">Ödev görmek için önce çocuk bağlamalısın.</div>';
      return;
    }
    var items = state.assignments.filter(function(item) {
      return targetIncludesChild(item, link) && item.status !== 'archived';
    }).sort(function(a, b) {
      return String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'));
    });
    if (!items.length) {
      box.innerHTML = '<div class="parent-empty">Bu çocuk için aktif ödev görünmüyor.</div>';
      return;
    }
    box.innerHTML = items.map(function(item) {
      var progress = getProgressForAssignment(item, link);
      var done = progress.status === 'completed';
      return '<div class="parent-row ' + (done ? 'assignment-done' : '') + '">' +
        '<div>' +
          '<div class="parent-row-title">' + esc(item.title || 'Ödev') + '</div>' +
          '<div class="parent-row-sub">' + esc(item.content_type || 'içerik') + ' · ' + esc(formatDate(item.start_at)) + ' - ' + esc(formatDate(item.due_at)) + '</div>' +
          (item.instructions ? '<div class="parent-row-sub">' + esc(item.instructions) + '</div>' : '') +
        '</div>' +
        '<div class="parent-row-actions">' +
          '<a class="parent-pill ok" href="' + esc(safeHref(item.content_ref)) + '">Aç</a>' +
          '<span class="parent-pill ' + (done ? 'ok' : 'warn') + '">' + esc(done ? 'Yapıldı' : statusLabel(progress.status)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderReports() {
    var box = qs('parentReportList');
    if (!box) return;
    var tabs = qs('parentReportTabs');
    if (tabs) {
      var tabRows = [
        { id: 'cards', label: 'Karneler' },
        { id: 'saved', label: 'Beğendiği / Kaydettiği' },
      ];
      tabs.innerHTML = tabRows.map(function(tab) {
        return '<button class="parent-report-tab ' + (state.reportTab === tab.id ? 'active' : '') + '" type="button" data-report-tab="' + esc(tab.id) + '">' + esc(tab.label) + '</button>';
      }).join('');
    }
    var link = getSelectedLink('parentReportChildFilter');
    if (!link) {
      box.innerHTML = '<div class="parent-empty">Karne görmek için önce çocuk bağlamalısın.</div>';
      return;
    }
    var assignments = state.assignments.filter(function(item) { return targetIncludesChild(item, link); });
    var completed = assignments.filter(function(item) {
      return getProgressForAssignment(item, link).status === 'completed';
    }).length;
    var meritPoints = getMeritPointsForLink(link);
    var progressRows = state.contentProgress.filter(function(row) {
      return String(row.user_id) === String(link.student_profile_id);
    });
    var summary = '<div class="parent-row">' +
      '<div><div class="parent-row-title">' + esc(getChildName(link)) + '</div>' +
      '<div class="parent-row-sub">' + esc(getClassLabel(link)) + '</div></div>' +
      '<div class="parent-row-actions"><span class="parent-pill ok">' + completed + ' / ' + assignments.length + ' ödev</span><span class="parent-pill ok">' + meritPoints + ' liyakat · ' + esc(getMeritLevel(meritPoints)) + '</span><span class="parent-pill">' + progressRows.length + ' içerik</span></div>' +
    '</div>';
    if (state.reportTab === 'saved') {
      var savedRows = progressRows.filter(function(row) {
        var meta = getRemoteMeta(row);
        return meta.saved || meta.liked || row.content_type === 'document' || row.content_type === 'worksheet' || row.content_type === 'video' || row.content_type === 'game';
      });
      box.innerHTML = summary + (savedRows.length ? savedRows.slice(0, 10).map(renderContentProgressRow).join('') : '<div class="parent-empty">Bu çocuk için kaydedilen ya da beğenilen içerik görünmüyor.</div>');
      return;
    }
    var cardRows = progressRows.filter(function(row) {
      var meta = getRemoteMeta(row);
      return Boolean(meta.resultSnapshot || meta.readingResult);
    });
    box.innerHTML = summary + (cardRows.length ? cardRows.slice(0, 10).map(renderContentProgressRow).join('') : '<div class="parent-empty">Bu çocuk için sınav veya okuma karne kaydı görünmüyor.</div>');
  }

  function renderContentProgressRow(row) {
    var meta = getRemoteMeta(row);
    var action = '';
    if (meta.resultSnapshot) {
      action = '<button class="parent-btn secondary" type="button" data-parent-exam-karne="' + esc(row.id) + '">Sınav Karnesi</button>';
    } else if (meta.readingResult) {
      action = '<button class="parent-btn secondary" type="button" data-parent-reading-karne="' + esc(row.id) + '">Okuma Karnesi</button>';
    } else if (row.href) {
      action = '<a class="parent-pill ok" href="' + esc(safeHref(row.href)) + '">Aç</a>';
    } else {
      action = '<span class="parent-pill">Kayıt</span>';
    }
    return '<div class="parent-row">' +
      '<div>' +
        '<div class="parent-row-title">' + esc(row.title || row.content_type || 'İçerik') + '</div>' +
        '<div class="parent-row-sub">' + esc(row.content_type || 'içerik') + (row.subject ? ' · ' + esc(row.subject) : '') + (row.score !== null && row.score !== undefined ? ' · %' + esc(row.score) : '') + ' · ' + esc(formatDate(row.updated_at || row.created_at)) + '</div>' +
      '</div>' +
      '<div class="parent-row-actions">' + action + '</div>' +
    '</div>';
  }

  function renderMessages() {
    var box = qs('parentMessageList');
    if (!box) return;
    var tabs = qs('parentMessageTabs');
    if (tabs) {
      var tabRows = [
        { id: 'inbox', label: 'Gelen Mesajlar', count: getMessageRows('inbox').length },
        { id: 'sent', label: 'Gönderilenler', count: getMessageRows('sent').length },
        { id: 'read', label: 'Okunanlar', count: getMessageRows('read').length },
      ];
      tabs.innerHTML = tabRows.map(function(tab) {
        return '<button class="parent-message-tab ' + (state.messageTab === tab.id ? 'active' : '') + '" type="button" data-message-tab="' + esc(tab.id) + '">' + esc(tab.label) + ' <span>' + tab.count + '</span></button>';
      }).join('');
    }
    var rows = getMessageRows();
    if (!rows.length) {
      box.innerHTML = '<div class="parent-empty">Bu sekmede mesaj yok.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      var mine = sameId(item.sender_id, state.user.id);
      var otherId = mine ? item.recipient_id : item.sender_id;
      var read = !mine && item.status === 'read';
      var active = sameId(state.activeMessageId, item.id);
      return '<div class="parent-row ' + (read ? 'message-read' : '') + '">' +
        '<div><div class="parent-row-title">' + esc(item.subject || (mine ? 'Gönderilen mesaj' : 'Gelen mesaj')) + '</div>' +
        '<div class="parent-row-sub">' + esc(mine ? 'Alıcı: ' + getPersonName(otherId) : 'Gönderen: ' + getPersonName(otherId)) + ' · ' + esc(formatDate(item.created_at)) + '</div>' +
        (active ? renderMessageDetail(item, mine) : '') + '</div>' +
        '<div class="parent-row-actions">' +
          '<span class="parent-pill ' + (read ? '' : 'ok') + '">' + esc(mine ? 'Gönderildi' : (read ? 'Okundu' : 'Gelen')) + '</span>' +
          '<button class="parent-btn secondary" type="button" data-message-open="' + esc(item.id) + '">' + esc(active ? 'Kapat' : 'Oku') + '</button>' +
          '<button class="parent-btn danger" type="button" data-message-delete="' + esc(item.id) + '">Sil</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderMessageDetail(item, mine) {
    return '<div class="parent-message-detail">' +
      '<div>' + esc(item.body || '') + '</div>' +
      '<label class="parent-field"><span>Cevap yaz</span><textarea data-message-reply-body="' + esc(item.id) + '" placeholder="Cevabını yaz"></textarea></label>' +
      '<div class="parent-row-actions">' +
        '<button class="parent-btn secondary" type="button" data-message-reply="' + esc(item.id) + '">' + esc(mine ? 'Tekrar Gönder' : 'Cevapla') + '</button>' +
      '</div>' +
    '</div>';
  }

  function renderAccount() {
    var profile = state.profile || {};
    setText('parentPanelTitle', getDisplayName(profile) || 'Veli Paneli');
    setText('parentSidebarName', getDisplayName(profile) || 'Veli Paneli');
    setText('parentStatus', 'Aktif veli hesabı');
    var avatar = qs('parentAvatar');
    if (avatar) avatar.textContent = getInitials(profile);
    if (qs('parentAccountName')) qs('parentAccountName').value = getDisplayName(profile);
    if (qs('parentAccountEmail')) qs('parentAccountEmail').value = profile.email || (state.user && state.user.email) || '';
    if (qs('parentAccountCity')) qs('parentAccountCity').value = profile.city || '';
  }

  function renderAll() {
    renderAccount();
    renderChildOptions();
    renderStats();
    renderChildren();
    renderAssignments();
    renderReports();
    renderMessages();
    renderPanelBadges();
  }

  async function loadProfiles(ids, target) {
    var unique = Array.from(new Set((ids || []).filter(Boolean).map(String)));
    if (!unique.length) return;
    var result = await getClient()
      .from('user_profiles')
      .select('id,email,full_name,first_name,last_name,city,grade_level,branch,avatar_url')
      .in('id', unique);
    if (result.error) throw result.error;
    (result.data || []).forEach(function(row) {
      target[row.id] = row;
    });
  }

  async function loadClasses(ids) {
    var unique = Array.from(new Set((ids || []).filter(Boolean).map(String)));
    if (!unique.length) return;
    var result = await getClient()
      .from('teacher_classes')
      .select('id,name,grade_level,branch,teacher_id')
      .in('id', unique);
    if (result.error) throw result.error;
    (result.data || []).forEach(function(row) {
      state.classes[row.id] = row;
    });
  }

  async function loadMessageProfiles() {
    state.messageProfiles = {};
    var ids = Array.from(new Set(state.messages.reduce(function(list, message) {
      list.push(message.sender_id, message.recipient_id);
      return list;
    }, []).filter(function(id) {
      return id && !sameId(id, state.user && state.user.id) && !state.students[id] && !state.teachers[id];
    })));
    if (!ids.length) return;
    try {
      var result = await getClient()
        .from('user_profiles')
        .select('id,email,full_name,first_name,last_name')
        .in('id', ids);
      if (result.error) throw result.error;
      (result.data || []).forEach(function(profile) {
        state.messageProfiles[profile.id] = profile;
      });
    } catch (error) {
      state.messageProfiles = {};
    }
  }

  async function loadData() {
    try {
      var linkResult = await getClient()
        .from('parent_student_links')
        .select('*')
        .eq('parent_id', state.user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (linkResult.error) throw linkResult.error;
      state.links = linkResult.data || [];
      state.students = {};
      state.studentMemberships = {};
      state.teachers = {};
      state.classes = {};

      await loadProfiles(state.links.map(function(link) { return link.student_profile_id; }), state.students);
      await loadProfiles(state.links.map(function(link) { return link.teacher_id; }), state.teachers);
      await loadClasses(state.links.map(function(link) { return link.class_id; }));

      var classIds = state.links.map(function(link) { return link.class_id; }).filter(Boolean);
      if (classIds.length) {
        var assignmentResult = await getClient()
          .from('teacher_assignments')
          .select('*')
          .in('class_id', Array.from(new Set(classIds)))
          .order('due_at', { ascending: true });
        if (assignmentResult.error) throw assignmentResult.error;
        state.assignments = assignmentResult.data || [];
      } else {
        state.assignments = [];
      }

      var membershipIds = state.links.map(function(link) { return link.student_membership_id; }).filter(Boolean);
      if (membershipIds.length) {
        try {
          var membershipResult = await getClient()
            .from('teacher_class_students')
            .select('id,display_name,merit_points,birth_date')
            .in('id', membershipIds);
          if (!membershipResult.error) {
            (membershipResult.data || []).forEach(function(row) {
              state.studentMemberships[row.id] = row;
            });
          }
        } catch (error) {
          state.studentMemberships = {};
        }
        var progressResult = await getClient()
          .from('teacher_assignment_progress')
          .select('*')
          .in('student_membership_id', membershipIds);
        if (progressResult.error) throw progressResult.error;
        state.progress = progressResult.data || [];

        var meritResult = await getClient()
          .from('teacher_merit_events')
          .select('*')
          .in('student_membership_id', membershipIds)
          .order('created_at', { ascending: false });
        state.merit = meritResult.error ? [] : (meritResult.data || []);
      } else {
        state.progress = [];
        state.merit = [];
        state.studentMemberships = {};
      }

      try {
        var profileIds = state.links.map(function(link) { return link.student_profile_id; }).filter(Boolean);
        if (profileIds.length) {
          var contentResult = await getClient()
            .from('user_content_progress')
            .select('*')
            .in('user_id', profileIds)
            .order('updated_at', { ascending: false });
          state.contentProgress = contentResult.error ? [] : (contentResult.data || []);
        } else {
          state.contentProgress = [];
        }
      } catch (error) {
        state.contentProgress = [];
      }

      var messageResult = await getClient()
        .from('panel_messages')
        .select('*')
        .or('sender_id.eq.' + state.user.id + ',recipient_id.eq.' + state.user.id)
        .order('created_at', { ascending: false })
        .limit(80);
      state.messages = messageResult.error ? [] : (messageResult.data || []);
      await loadMessageProfiles();
      renderAll();
    } catch (error) {
      toast(humanizeError(error), 'error');
      renderAll();
    }
  }

  async function loadProfile() {
    var authState = await window.kemalUserAuth.ready();
    state.user = authState.user;
    state.profile = authState.profile;
    if (!state.user) {
      window.location.href = '/giris.html';
      return false;
    }
    if (!state.profile || state.profile.role !== 'parent' || state.profile.active === false) {
      toast('Bu sayfa veli hesabı ile kullanılabilir.', 'error');
      window.setTimeout(function() { window.location.href = '/giris.html'; }, 900);
      return false;
    }
    renderAccount();
    return true;
  }

  async function autoConnectInitialCode() {
    var code = normalizeCode(state.profile && state.profile.parent_link_code);
    if (!code) return;
    try {
      var result = await getClient().rpc('connect_parent_with_teacher_code', {
        p_code: code,
        p_relationship: 'parent',
      });
      if (result.error) throw result.error;
      await getClient().from('user_profiles').update({ parent_link_code: '' }).eq('id', state.user.id);
      state.profile.parent_link_code = '';
      toast('Kayıt sırasında yazdığın öğretmen kodu ile öğrenci bağlantısı kuruldu.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function createParentCode() {
    try {
      var result = await getClient().rpc('create_parent_account_code');
      if (result.error) throw result.error;
      var row = result.data || {};
      var box = qs('parentCodeBox');
      if (box) {
        box.style.display = 'block';
        box.innerHTML = 'Öğrencinin hesabındaki <strong>Veliye Bağla</strong> alanına bu kodu yazın:<br><input readonly value="' + esc(row.code || '') + '" style="margin-top:8px;width:170px;border:1px solid #CBD5E1;border-radius:8px;padding:10px;font-weight:950;color:#0F172A"> <button class="parent-btn secondary" type="button" data-copy-parent-code="' + esc(row.code || '') + '">Kopyala</button>';
      }
      toast('Veli bağlantı kodu oluşturuldu.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function connectTeacherCode(event) {
    event.preventDefault();
    var code = normalizeCode(qs('teacherParentCode') && qs('teacherParentCode').value);
    if (!code) {
      toast('Bağlantı kodunu yazmalısın.', 'error');
      return;
    }
    try {
      var relationship = qs('parentRelationship') ? qs('parentRelationship').value : 'parent';
      var result = await getClient().rpc('connect_parent_with_teacher_code', {
        p_code: code,
        p_relationship: relationship,
      });
      if (result.error) throw result.error;
      if (qs('teacherCodeForm')) qs('teacherCodeForm').reset();
      toast('Öğrenci veli hesabına bağlandı.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function removeChild(linkId) {
    if (!window.confirm('Bu çocuğu veli panelinden kaldırmak istiyor musun?')) return;
    try {
      var result = await getClient().rpc('revoke_parent_student_link', {
        p_link_id: linkId,
      });
      if (result.error) throw result.error;
      state.links = state.links.filter(function(link) { return String(link.id) !== String(linkId); });
      if (String(state.selectedChildId) === String(linkId)) state.selectedChildId = '';
      toast('Bağlantı kaldırıldı.');
      renderAll();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    var link = getSelectedLink('messageChild');
    var recipientType = qs('messageRecipient') ? qs('messageRecipient').value : 'teacher';
    var subject = clean(qs('messageSubject') && qs('messageSubject').value);
    var body = clean(qs('messageBody') && qs('messageBody').value);
    if (!link || !body) {
      toast('Mesaj için çocuk ve mesaj metni gerekli.', 'error');
      return;
    }
    if (!validateSafeText([
      { element: qs('messageSubject'), label: 'mesaj_konusu', value: subject },
      { element: qs('messageBody'), label: 'mesaj_metni', value: body },
    ], 'parent_message')) return;
    var recipientId = recipientType === 'student' ? link.student_profile_id : link.teacher_id;
    if (!recipientId) {
      toast('Bu bağlantıda alıcı hesabı bulunamadı.', 'error');
      return;
    }
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: state.user.id,
        sender_role: 'parent',
        recipient_id: recipientId,
        related_student_profile_id: link.student_profile_id,
        class_id: link.class_id,
        subject: subject,
        body: body,
      });
      if (result.error) throw result.error;
      if (qs('parentMessageForm')) qs('parentMessageForm').reset();
      toast('Mesaj gönderildi.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendContent(event) {
    event.preventDefault();
    var link = getSelectedLink('sendContentChild');
    var title = clean(qs('sendContentTitle') && qs('sendContentTitle').value) || 'Veli içerik önerisi';
    var url = clean(qs('sendContentUrl') && qs('sendContentUrl').value);
    if (!link || !url) {
      toast('İçerik göndermek için çocuk ve bağlantı gerekli.', 'error');
      return;
    }
    if (!validateSafeText([
      { element: qs('sendContentTitle'), label: 'icerik_basligi', value: title },
    ], 'parent_content_message')) return;
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: state.user.id,
        sender_role: 'parent',
        recipient_id: link.student_profile_id,
        related_student_profile_id: link.student_profile_id,
        class_id: link.class_id,
        subject: title,
        body: title + ' - ' + url,
      });
      if (result.error) throw result.error;
      if (qs('sendContentForm')) qs('sendContentForm').reset();
      toast('İçerik bağlantısı çocuğa gönderildi.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function openPanelMessage(messageId) {
    var message = state.messages.find(function(item) { return sameId(item.id, messageId); }) || null;
    if (!message) return;
    if (sameId(state.activeMessageId, messageId)) {
      state.activeMessageId = '';
      renderMessages();
      return;
    }
    state.activeMessageId = messageId;
    if (sameId(message.recipient_id, state.user.id) && message.status !== 'read') {
      try {
        var result = await getClient()
          .from('panel_messages')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('id', message.id)
          .eq('recipient_id', state.user.id);
        if (result.error) throw result.error;
        message.status = 'read';
        message.read_at = new Date().toISOString();
      } catch (error) {
        toast(humanizeError(error), 'error');
      }
    }
    renderMessages();
    renderPanelBadges();
  }

  async function deletePanelMessage(messageId) {
    var message = state.messages.find(function(item) { return sameId(item.id, messageId); }) || null;
    if (!message || !window.confirm('Mesaj bu panelden kaldırılsın mı?')) return;
    var mine = sameId(message.sender_id, state.user.id);
    var payload = mine ? { sender_deleted_at: new Date().toISOString() } : { recipient_deleted_at: new Date().toISOString() };
    try {
      var result = await getClient().from('panel_messages').update(payload).eq('id', message.id);
      if (result.error) throw result.error;
      Object.assign(message, payload);
      state.activeMessageId = '';
      renderMessages();
      renderPanelBadges();
      toast('Mesaj kaldırıldı.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function replyPanelMessage(messageId) {
    var message = state.messages.find(function(item) { return sameId(item.id, messageId); }) || null;
    if (!message) return;
    var input = document.querySelector('[data-message-reply-body="' + messageId + '"]');
    var body = clean(input && input.value);
    if (!body) {
      toast('Cevap metni gerekli.', 'error');
      return;
    }
    if (!validateSafeText([
      { element: input, label: 'mesaj_cevabi', value: body },
    ], 'parent_message_reply')) return;
    var recipientId = sameId(message.sender_id, state.user.id) ? message.recipient_id : message.sender_id;
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: state.user.id,
        sender_role: 'parent',
        recipient_id: recipientId,
        related_student_profile_id: message.related_student_profile_id || null,
        class_id: message.class_id || null,
        subject: message.subject && /^Re:/i.test(message.subject) ? message.subject : 'Re: ' + (message.subject || 'Mesaj'),
        body: body,
      });
      if (result.error) throw result.error;
      toast('Cevap gönderildi.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  function getContentRow(id) {
    return state.contentProgress.find(function(row) { return sameId(row.id, id); }) || null;
  }

  function openExamKarne(id) {
    var row = getContentRow(id);
    var meta = getRemoteMeta(row);
    if (!meta.resultSnapshot) return;
    localStorage.setItem(EXAM_KARNE_KEY, JSON.stringify(meta.resultSnapshot));
    window.location.href = '/sinav_sitesi/sinav.html?adminKarne=1';
  }

  function openReadingKarne(id) {
    var row = getContentRow(id);
    var meta = getRemoteMeta(row);
    var result = meta.readingResult || null;
    if (!result) return;
    localStorage.setItem(READING_KARNE_KEY, JSON.stringify(result));
    sessionStorage.setItem('okuma_metin', JSON.stringify({
      id: result.metin_id || row.content_id,
      baslik: result.metin_adi || row.title,
      kelime_sayisi: result.kelime_sayisi || meta.wordCount || 0,
      hedef_hiz: result.hedef_hiz || meta.targetWpm || 0,
      sorular: [],
    }));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify({
      ad: result.ad || '',
      soyad: result.soyad || '',
      sinif: result.sinif || '',
      sube: result.sube || '',
      accountUid: row.user_id || '',
    }));
    sessionStorage.setItem('okuma_sure_sn', String(result.okuma_suresi_sn || meta.durationSeconds || 0));
    sessionStorage.setItem('okuma_wpm', String(result.dakika_kelime || meta.wpm || 0));
    sessionStorage.setItem('okuma_cevaplar', JSON.stringify({
      dogru: result.dogru_sayisi || meta.correct || 0,
      yanlis: result.yanlis_sayisi || meta.wrong || 0,
      detay: [],
    }));
    sessionStorage.setItem('okuma_attempt_id', meta.attemptId || 'parent_' + Date.now());
    window.location.href = '/hizli-okuma/karne.html';
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      var city = clean(qs('parentAccountCity') && qs('parentAccountCity').value).toLocaleUpperCase('tr-TR');
      var result = await getClient()
        .from('user_profiles')
        .update({ city: city })
        .eq('id', state.user.id)
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      state.profile = result.data || Object.assign({}, state.profile, { city: city });
      toast('Profil güncellendi.');
      renderAccount();
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
      await window.kemalUserAuth.signOut();
      window.location.href = '/giris.html';
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendPasswordReset() {
    try {
      var email = state.user && state.user.email ? state.user.email : '';
      if (!email) throw new Error('E-posta bilgisi bulunamadı.');
      if (window.kemalUserAuth && typeof window.kemalUserAuth.requestPasswordReset === 'function') {
        var reset = await window.kemalUserAuth.requestPasswordReset(email);
        if (reset && reset.error) throw reset.error;
      } else {
        var result = await getClient().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/admin/reset-password.html',
        });
        if (result.error) throw result.error;
      }
      toast('Şifre yenileme bağlantısı e-posta adresine gönderildi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  function bindEvents() {
    bindCodeInput('teacherParentCode');
    document.addEventListener('click', function(event) {
      var tab = event.target && event.target.closest ? event.target.closest('[data-tab]') : null;
      if (tab && tab.dataset.tab) {
        document.querySelectorAll('.parent-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === tab.dataset.tab);
        });
        document.querySelectorAll('.parent-section').forEach(function(section) {
          section.classList.toggle('active', section.id === 'parent-section-' + tab.dataset.tab);
        });
      }
      var selectChild = event.target && event.target.closest ? event.target.closest('[data-select-child]') : null;
      if (selectChild) {
        state.selectedChildId = selectChild.dataset.selectChild;
        ['parentChildFilter', 'parentReportChildFilter', 'messageChild', 'sendContentChild'].forEach(function(id) {
          if (qs(id)) qs(id).value = state.selectedChildId;
        });
        document.querySelectorAll('.parent-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === 'reports');
        });
        document.querySelectorAll('.parent-section').forEach(function(section) {
          section.classList.toggle('active', section.id === 'parent-section-reports');
        });
        renderAll();
      }
      var messageTab = event.target && event.target.closest ? event.target.closest('[data-message-tab]') : null;
      if (messageTab) {
        state.messageTab = messageTab.dataset.messageTab || 'inbox';
        state.activeMessageId = '';
        renderMessages();
      }
      var reportTab = event.target && event.target.closest ? event.target.closest('[data-report-tab]') : null;
      if (reportTab) {
        state.reportTab = reportTab.dataset.reportTab || 'cards';
        renderReports();
      }
      var remove = event.target && event.target.closest ? event.target.closest('[data-remove-child]') : null;
      if (remove) {
        removeChild(remove.dataset.removeChild);
      }
      if (event.target.dataset.messageOpen) openPanelMessage(event.target.dataset.messageOpen);
      if (event.target.dataset.messageDelete) deletePanelMessage(event.target.dataset.messageDelete);
      if (event.target.dataset.messageReply) replyPanelMessage(event.target.dataset.messageReply);
      if (event.target.dataset.parentExamKarne) openExamKarne(event.target.dataset.parentExamKarne);
      if (event.target.dataset.parentReadingKarne) openReadingKarne(event.target.dataset.parentReadingKarne);
      if (event.target.dataset.copyParentCode && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(event.target.dataset.copyParentCode).then(function() {
          toast('Kod kopyalandı.');
        }).catch(function() {
          toast('Kod kopyalanamadı, elle seçebilirsin.', 'error');
        });
      }
    });
    ['parentChildFilter', 'parentReportChildFilter', 'messageChild', 'sendContentChild'].forEach(function(id) {
      var el = qs(id);
      if (el) el.addEventListener('change', function(event) {
        state.selectedChildId = event.target.value || state.selectedChildId;
        renderAll();
      });
    });
    if (qs('parentRefreshBtn')) qs('parentRefreshBtn').addEventListener('click', loadData);
    if (qs('parentLogoutBtn')) qs('parentLogoutBtn').addEventListener('click', async function() {
      await window.kemalUserAuth.signOut();
      window.location.href = '/giris.html';
    });
    if (qs('createParentCodeBtn')) qs('createParentCodeBtn').addEventListener('click', createParentCode);
    if (qs('teacherCodeForm')) qs('teacherCodeForm').addEventListener('submit', connectTeacherCode);
    if (qs('parentMessageForm')) qs('parentMessageForm').addEventListener('submit', sendMessage);
    if (qs('sendContentForm')) qs('sendContentForm').addEventListener('submit', sendContent);
    if (qs('parentProfileForm')) qs('parentProfileForm').addEventListener('submit', saveProfile);
    if (qs('parentPasswordResetBtn')) qs('parentPasswordResetBtn').addEventListener('click', sendPasswordReset);
    if (qs('parentDeactivateBtn')) qs('parentDeactivateBtn').addEventListener('click', function() {
      updateAccountStatus('deactivate');
    });
    if (qs('parentDeleteRequestBtn')) qs('parentDeleteRequestBtn').addEventListener('click', function() {
      updateAccountStatus('delete');
    });
  }

  async function init() {
    bindEvents();
    var ok = await loadProfile();
    if (ok) {
      await autoConnectInitialCode();
      await loadData();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
