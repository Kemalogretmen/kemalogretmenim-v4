(function() {
  'use strict';

  var EXAM_KARNE_KEY = 'kemal_exam_admin_karne_result_v1';
  var REACTION_MERIT_PREFIX = 'kemal_reaction_merit_v1_';
  var state = {
    client: null,
    user: null,
    profile: null,
    memberships: [],
    assignments: [],
    progress: [],
    merit: [],
    messages: [],
    messageProfiles: {},
    messageTab: 'inbox',
    activeMessageId: '',
    parentLinks: [],
    parentProfiles: {},
    teacherNames: {},
    avatarDraft: '',
    locations: [],
    lastSyncedMerit: null,
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

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizePlace(value) {
    return clean(value).toLocaleUpperCase('tr-TR');
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

  function setSelectOptions(select, items, placeholder, mapper) {
    if (!select) return;
    var mapItem = mapper || function(item) {
      return { value: item, label: item };
    };
    select.innerHTML = '<option value="">' + esc(placeholder || 'Seç') + '</option>' + (items || []).map(function(item) {
      var mapped = mapItem(item);
      return '<option value="' + esc(mapped.value) + '">' + esc(mapped.label) + '</option>';
    }).join('');
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

  function validateSafeText(fields, surface) {
    if (!window.kemalContentSafety || typeof window.kemalContentSafety.validateFields !== 'function') {
      return true;
    }
    var result = window.kemalContentSafety.validateFields(fields, { surface: surface || 'student_panel' });
    if (!result.ok) {
      toast(result.message, 'error');
      return false;
    }
    return true;
  }

  function humanizeError(error) {
    var message = String(error && error.message ? error.message : error || '');
    if (message.indexOf('sender_deleted_at') >= 0 || message.indexOf('recipient_deleted_at') >= 0) {
      return 'Panel mesaj güncelleme alanları Supabase içinde eksik görünüyor. supabase-panel-guncelleme-2026-05-27.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('relation') >= 0 || message.indexOf('does not exist') >= 0) {
      return 'Gerekli Supabase tabloları henüz kurulmamış görünüyor. SQL dosyalarını tekrar çalıştırmalısın.';
    }
    if (message.indexOf('permission denied') >= 0 || message.indexOf('policy') >= 0) {
      return 'Bu işlem için veritabanı yetkisi eksik görünüyor. SQL politikalarını güncellemelisin.';
    }
    return message || 'Beklenmeyen bir hata oluştu.';
  }

  function formatDate(value) {
    if (!value) return 'Tarih yok';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value || 'Tarih yok');
    }
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function sameId(a, b) {
    return String(a || '') === String(b || '');
  }

  function getProfileName(profile) {
    return clean(profile && (profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email));
  }

  function getPersonName(id) {
    if (sameId(id, state.user && state.user.id)) return 'Sen';
    return state.teacherNames[id] || getProfileName(state.messageProfiles[id]) || 'Kullanıcı';
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

  function formatDuration(seconds) {
    var total = Math.max(0, Math.round(Number(seconds || 0)));
    if (!total) return '-';
    var minutes = Math.floor(total / 60);
    var rest = total % 60;
    return minutes ? minutes + ' dk ' + rest + ' sn' : rest + ' sn';
  }

  function getContentRecords() {
    var profileGrade = state.profile && state.profile.grade_level ? parseInt(state.profile.grade_level, 10) : null;
    return window.kemalContentProgress && typeof window.kemalContentProgress.listRecords === 'function'
      ? window.kemalContentProgress.listRecords().sort(function(a, b) {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }).filter(function(record) {
        if (!profileGrade) return true;
        var recordGrade = parseGradeFromRecord(record);
        return !recordGrade || recordGrade === profileGrade;
      })
      : [];
  }

  function parseGradeFromRecord(record) {
    var raw = String((record && record.grade) || '').trim();
    var meta = record && record.meta ? record.meta : {};
    var fallback = String(meta.grade || meta.sinif || '').trim();
    var parsed = parseInt(raw || fallback, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getContentTypeLabel(type) {
    var map = {
      reading: 'Okuma Metni',
      exam: 'Sınav / Test',
      document: 'Doküman',
      worksheet: 'Çalışma Kağıdı',
      video: 'Ders Videosu',
      game: 'Oyun',
      custom: 'Harici bağlantı',
    };
    return map[type] || 'İçerik';
  }

  function getAssignmentStatusLabel(status) {
    var map = {
      assigned: 'Atandı',
      started: 'Başlandı',
      completed: 'Tamamlandı',
      late: 'Gecikti',
      excused: 'Mazeretli',
      active: 'Aktif',
      invited: 'Davetli',
      removed: 'Çıkarıldı',
      archived: 'Arşivlendi',
    };
    return map[status] || 'Atandı';
  }

  function getCompletedExamRecords() {
    return getContentRecords().filter(function(item) {
      var meta = item.meta || {};
      return item.type === 'exam' && (item.status === 'completed' || meta.resultSnapshot || meta.total !== undefined);
    });
  }

  function getCompletedReadingRecords() {
    return getContentRecords().filter(function(item) {
      var meta = item.meta || {};
      return item.type === 'reading' && (item.status === 'completed' || meta.readingResult || meta.wpm !== undefined);
    });
  }

  function getProgressLabel(record) {
    if (window.kemalContentProgress && typeof window.kemalContentProgress.getStatusLabel === 'function') {
      return window.kemalContentProgress.getStatusLabel(record.type, record.status);
    }
    return record.status === 'completed' ? 'Tamamlandı' : 'Okundu';
  }

  function getMembershipIds() {
    return state.memberships.map(function(item) { return item.id; });
  }

  function targetIncludesStudent(assignment, membershipId) {
    if (!assignment) return false;
    if (assignment.target_type !== 'students') return true;
    return Array.isArray(assignment.target_student_ids) && assignment.target_student_ids.indexOf(membershipId) >= 0;
  }

  function getMembershipForAssignment(assignment) {
    return state.memberships.find(function(membership) {
      return String(membership.class_id) === String(assignment && assignment.class_id) && targetIncludesStudent(assignment, membership.id);
    }) || null;
  }

  function getProgressForAssignment(assignment) {
    var membership = getMembershipForAssignment(assignment);
    if (!membership) return {};
    return state.progress.find(function(row) {
      return String(row.assignment_id) === String(assignment.id) && String(row.student_membership_id) === String(membership.id);
    }) || {};
  }

  function getAssignmentMetadata(item) {
    return item && item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  }

  function parseIframeSrc(value) {
    var match = String(value || '').match(/<iframe[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }

  function getYouTubeEmbedUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      var host = url.hostname.replace(/^www\./, '');
      var id = '';
      if (host === 'youtu.be') {
        id = url.pathname.split('/').filter(Boolean)[0] || '';
      } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        if (url.pathname.indexOf('/embed/') === 0) {
          id = url.pathname.split('/embed/')[1].split('/')[0];
        } else if (url.pathname.indexOf('/shorts/') === 0) {
          id = url.pathname.split('/shorts/')[1].split('/')[0];
        } else {
          id = url.searchParams.get('v') || '';
        }
      }
      return id ? 'https://www.youtube.com/embed/' + encodeURIComponent(id) : '';
    } catch (error) {
      return '';
    }
  }

  function getTrustedAssignmentEmbed(value) {
    var raw = clean(value);
    var iframeSrc = parseIframeSrc(raw);
    var source = iframeSrc || raw;
    var youtube = getYouTubeEmbedUrl(source);
    if (youtube) {
      return { type: 'youtube', url: youtube };
    }
    try {
      var url = new URL(source, window.location.origin);
      var host = url.hostname.replace(/^www\./, '');
      if (host === 'wordwall.net') {
        return {
          type: 'wordwall',
          url: url.pathname.indexOf('/embed/') >= 0 ? url.toString() : url.toString().replace('/resource/', '/embed/'),
        };
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function renderAssignmentPreview(item) {
    var metadata = getAssignmentMetadata(item);
    var embedUrl = metadata.embedUrl || '';
    var embed = embedUrl ? { url: embedUrl } : getTrustedAssignmentEmbed(item && item.content_ref);
    if (!embed || !embed.url) return '';
    return '<div class="student-assignment-preview"><iframe src="' + esc(embed.url) + '" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  }

  function renderAssignmentAction(item) {
    var ref = item && item.content_ref ? String(item.content_ref).trim() : '';
    if (!ref || /^<iframe/i.test(ref)) {
      return '<span class="student-pill warn">Önizleme</span>';
    }
    return '<a class="student-pill ok" href="' + esc(safeHref(ref)) + '" data-assignment-open="' + esc(item.id) + '">Aç</a>';
  }

  function getInitials(profile) {
    var full = clean((profile && profile.full_name) || [profile && profile.first_name, profile && profile.last_name].filter(Boolean).join(' '));
    return full.split(' ').filter(Boolean).slice(0, 2).map(function(part) {
      return part.charAt(0).toLocaleUpperCase('tr-TR');
    }).join('') || 'Ö';
  }

  function paintAvatar(el, profile) {
    if (!el) return;
    var avatar = state.avatarDraft || (profile && profile.avatar_url) || '';
    if (avatar) {
      el.innerHTML = '<img src="' + esc(avatar) + '" alt="">';
      return;
    }
    el.textContent = getInitials(profile);
  }

  function getReactionCount() {
    var userId = state.user && state.user.id ? state.user.id : '';
    if (!userId) return 0;
    try {
      var raw = localStorage.getItem(REACTION_MERIT_PREFIX + userId);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.reactions && typeof parsed.reactions === 'object'
        ? Object.keys(parsed.reactions).length
        : 0;
    } catch (error) {
      return 0;
    }
  }

  function getMeritSummary() {
    var records = getContentRecords();
    var activity = window.kemalUserAuth && typeof window.kemalUserAuth.getActivitySummary === 'function'
      ? window.kemalUserAuth.getActivitySummary()
      : { dailyLoginCount: 0, hourPoints: 0 };
    var teacherPoints = state.merit.reduce(function(total, row) {
      return total + Number(row.points || 0);
    }, 0);
    var examPoints = 0;
    var readingPoints = 0;
    var savedCount = 0;

    records.forEach(function(record) {
      var meta = record.meta || {};
      if (record.type === 'exam') {
        var score = Number(meta.score || 0);
        if (score >= 100) examPoints += 2;
        else if (score >= 50) examPoints += 1;
      }
      if (record.type === 'reading') {
        var wpm = Number(meta.wpm || 0);
        var target = Number(meta.targetWpm || 0);
        var comprehension = Number(meta.comprehensionPercent || 0);
        if (target > 0 && wpm >= target) readingPoints += 1;
        if (comprehension >= 50) readingPoints += 1;
      }
      if (meta.saved) {
        savedCount += 1;
      }
    });

    var reactionCount = getReactionCount();
    var points = Number(activity.dailyLoginCount || 0) +
      Number(activity.hourPoints || 0) +
      examPoints +
      readingPoints +
      Math.floor(savedCount / 5) +
      Math.floor(reactionCount / 10) +
      teacherPoints;
    var levels = [
      { name: 'Acemi', color: '#64748B' },
      { name: 'Çırak', color: '#2563EB' },
      { name: 'Usta', color: '#7C3AED' },
      { name: 'Lider', color: '#B45309' },
    ];
    var medalCount = Math.floor(points / 250);
    var levelIndex = Math.min(levels.length - 1, medalCount);
    var starCount = Math.floor((points % 250) / 50);
    var nextStarRemaining = 50 - (points % 50 || 50);
    if (points % 50 === 0) nextStarRemaining = 50;
    return {
      points: points,
      level: levels[levelIndex],
      medalCount: medalCount,
      starCount: starCount,
      nextStarProgress: points % 50,
      nextStarRemaining: nextStarRemaining,
      savedCount: savedCount,
      reactionCount: reactionCount,
    };
  }

  function renderMerit() {
    var summary = getMeritSummary();
    document.documentElement.style.setProperty('--merit-color', summary.level.color);
    setText('meritLevelName', summary.level.name + (summary.medalCount > 0 ? ' · ' + summary.medalCount + ' madalya' : ''));
    setText('meritPointCount', String(summary.points));
    setText('studentMeritCount', String(summary.points));
    var stars = qs('meritStars');
    if (stars) {
      stars.innerHTML = [0, 1, 2, 3, 4].map(function(index) {
        return '<span class="merit-star ' + (index < summary.starCount ? 'on' : '') + '">★</span>';
      }).join('');
    }
    var fill = qs('meritFill');
    if (fill) fill.style.width = Math.min(100, Math.round((summary.nextStarProgress / 50) * 100)) + '%';
    setText('meritNote', 'Bir sonraki yıldız için ' + summary.nextStarRemaining + ' puan. 5 yıldız tamamlanınca yeni madalya ve üst seviye açılır.');
    syncMeritPoints(summary);
  }

  function syncMeritPoints(summary) {
    if (!summary || !state.user || !state.user.id || !state.memberships.length) return;
    if (state.lastSyncedMerit === summary.points) return;
    state.lastSyncedMerit = summary.points;
    var ids = state.memberships.map(function(item) { return item.id; }).filter(Boolean);
    if (!ids.length) return;
    getClient()
      .from('teacher_class_students')
      .update({ merit_points: summary.points })
      .in('id', ids)
      .eq('student_profile_id', state.user.id)
      .then(function(result) {
        if (result && result.error) throw result.error;
        state.memberships.forEach(function(item) {
          item.merit_points = summary.points;
        });
      })
      .catch(function() {
        state.lastSyncedMerit = null;
      });
  }

  function renderStats() {
    var activeAssignments = state.assignments.filter(function(item) { return item.status !== 'archived'; });
    var records = getContentRecords();
    setText('studentClassCount', state.profile && state.profile.grade_level ? String(state.profile.grade_level) : String(state.memberships.length));
    setText('studentAssignmentCount', String(activeAssignments.length));
    setText('studentContentCount', String(records.length));
    setText('studentExamTabCount', String(getCompletedExamRecords().length));
    setText('studentReadingTabCount', String(getCompletedReadingRecords().length));
    renderMerit();
  }

  function renderCityOptions(selectedCity) {
    var select = qs('studentAccountCity');
    if (!select) return;
    var normalized = normalizePlace(selectedCity || select.value);
    var locations = state.locations.slice();
    if (normalized && !locations.some(function(item) { return item.name === normalized; })) {
      locations.unshift({ name: normalized });
    }
    setSelectOptions(select, locations, 'Şehir seç', function(city) {
      return { value: city.name, label: city.name };
    });
    select.value = normalized;
  }

  function renderBranchOptions(selectedBranch) {
    var select = qs('studentAccountBranch');
    if (!select) return;
    var normalized = clean(selectedBranch).toLocaleUpperCase('tr-TR');
    if (normalized && !Array.prototype.some.call(select.options, function(option) {
      return option.value === normalized;
    })) {
      var option = document.createElement('option');
      option.value = normalized;
      option.textContent = normalized + ' Şubesi';
      select.appendChild(option);
    }
    select.value = normalized;
  }

  function renderGradeOptions(selectedGrade) {
    var select = qs('studentAccountGrade');
    if (!select) return;
    var normalized = selectedGrade ? String(selectedGrade) : '';
    if (normalized && !Array.prototype.some.call(select.options, function(option) {
      return option.value === normalized;
    })) {
      var option = document.createElement('option');
      option.value = normalized;
      option.textContent = normalized + '. Sınıf';
      select.appendChild(option);
    }
    select.value = normalized;
  }

  function renderAccount() {
    var profile = state.profile || {};
    var email = profile.email || (state.user && state.user.email) || '';
    setText('studentPanelTitle', profile.full_name || 'Öğrenci Paneli');
    setText('studentStatus', profile.grade_level ? '🎒 ' + profile.grade_level + '. sınıf hesabı' : 'Aktif öğrenci');
    if (qs('studentAccountName')) qs('studentAccountName').value = profile.full_name || '';
    if (qs('studentAccountEmail')) qs('studentAccountEmail').value = email;
    renderCityOptions(profile.city || '');
    if (qs('studentAccountSchool')) qs('studentAccountSchool').value = profile.school_name || '';
    renderGradeOptions(profile.grade_level || '');
    renderBranchOptions(profile.branch || '');
    paintAvatar(qs('studentAvatar'), profile);
    paintAvatar(qs('studentAccountAvatar'), profile);
  }

  async function loadLocations() {
    var select = qs('studentAccountCity');
    if (!select) return;
    try {
      var response = await fetch('/data/turkey-cities.json', { cache: 'force-cache' });
      if (!response.ok) throw new Error('Şehir listesi yüklenemedi.');
      var rows = await response.json();
      state.locations = Array.isArray(rows) ? rows.map(function(city) {
        return { name: normalizePlace(city && city.name) };
      }).filter(function(city) {
        return city.name;
      }).sort(function(a, b) {
        return a.name.localeCompare(b.name, 'tr-TR');
      }) : [];
    } catch (error) {
      state.locations = [];
    }
    renderCityOptions(state.profile && state.profile.city ? state.profile.city : '');
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
        '<span class="student-pill ok">' + esc(getAssignmentStatusLabel(item.status || 'active')) + '</span>' +
      '</div>';
    }).join('');
  }

  function renderParents() {
    var box = qs('studentParentList');
    if (!box) return;
    var rows = state.parentLinks.filter(function(link) {
      return link.status === 'active' || link.status === 'pending';
    });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Henüz bağlı veli hesabı görünmüyor.</div>';
      return;
    }
    var relationMap = { mother: 'Anne', father: 'Baba', parent: 'Veli', guardian: 'Vasi' };
    box.innerHTML = rows.map(function(link) {
      var profile = state.parentProfiles[link.parent_id] || {};
      var approved = link.teacher_review_status === 'approved' || link.teacher_review_status === 'not_required';
      return '<div class="student-row">' +
        '<div>' +
          '<div class="student-row-title">' + esc(getProfileName(profile) || 'Veli hesabı') + '</div>' +
          '<div class="student-row-sub">' + esc(relationMap[link.relationship] || 'Veli') + ' · ' + esc(approved ? 'Bağlandı' : 'Öğretmen onayı bekliyor') + '</div>' +
        '</div>' +
        '<span class="student-pill ' + (approved ? 'ok' : 'warn') + '">' + esc(approved ? 'Aktif' : 'Beklemede') + '</span>' +
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
      var progress = getProgressForAssignment(item);
      var metadata = getAssignmentMetadata(item);
      var teacherName = metadata.teacherName || state.teacherNames[item.teacher_id] || '';
      var done = progress.status === 'completed';
      return '<div class="student-row ' + (done ? 'assignment-done' : '') + '">' +
        '<div>' +
          '<div class="student-row-title">' + esc(item.title) + '</div>' +
          '<div class="student-row-sub">' + esc(getContentTypeLabel(item.content_type)) + ' · ' + formatDate(item.start_at) + ' - ' + formatDate(item.due_at) + '</div>' +
          (teacherName ? '<div class="student-row-sub">' + esc(teacherName) + ' tarafından verilmiştir.</div>' : '') +
          (metadata.contentTitle ? '<div class="student-row-sub">İçerik: ' + esc(metadata.contentTitle) + '</div>' : '') +
          (item.instructions ? '<div class="student-row-sub">' + esc(item.instructions) + '</div>' : '') +
          renderAssignmentPreview(item) +
        '</div>' +
        '<div class="student-row-actions">' +
          renderAssignmentAction(item) +
          '<span class="student-pill ' + (done ? 'ok' : 'warn') + '">' + esc(done ? 'Yapıldı' : getAssignmentStatusLabel(progress.status)) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function getTeacherMembershipRows() {
    var seen = {};
    return state.memberships.filter(function(item) {
      if (!item || !item.teacher_id) return false;
      var key = String(item.teacher_id) + ':' + String(item.class_id || '');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function fillMessageTeachers() {
    var select = qs('studentMessageTeacher');
    if (!select) return;
    var rows = getTeacherMembershipRows();
    select.innerHTML = rows.length
      ? rows.map(function(item) {
        var classRow = item.teacher_classes || {};
        var label = (state.teacherNames[item.teacher_id] || 'Öğretmen') +
          (classRow.name ? ' · ' + classRow.name : '');
        return '<option value="' + esc(item.id) + '">' + esc(label) + '</option>';
      }).join('')
      : '<option value="">Bağlı öğretmen yok</option>';
    select.disabled = !rows.length;
  }

  function renderMessages() {
    fillMessageTeachers();
    var box = qs('studentMessageList');
    if (!box) return;
    var tabs = qs('studentMessageTabs');
    if (tabs) {
      var tabRows = [
        { id: 'inbox', label: 'Gelen Mesajlar', count: getMessageRows('inbox').length },
        { id: 'sent', label: 'Gönderilenler', count: getMessageRows('sent').length },
        { id: 'read', label: 'Okunanlar', count: getMessageRows('read').length },
      ];
      tabs.innerHTML = tabRows.map(function(tab) {
        return '<button class="student-message-tab ' + (state.messageTab === tab.id ? 'active' : '') + '" type="button" data-message-tab="' + esc(tab.id) + '">' + esc(tab.label) + ' <span>' + tab.count + '</span></button>';
      }).join('');
    }
    var rows = getMessageRows();
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Bu sekmede mesaj yok.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      var mine = sameId(item.sender_id, state.user.id);
      var otherId = mine ? item.recipient_id : item.sender_id;
      var read = !mine && item.status === 'read';
      var active = sameId(state.activeMessageId, item.id);
      return '<div class="student-row ' + (read ? 'message-read' : '') + '">' +
        '<div>' +
          '<div class="student-row-title">' + esc(item.subject || 'Mesaj') + '</div>' +
          '<div class="student-row-sub">' + esc(mine ? 'Alıcı: ' + getPersonName(otherId) : 'Gönderen: ' + getPersonName(otherId)) + ' · ' + esc(formatDate(item.created_at)) + '</div>' +
          (active ? renderMessageDetail(item, mine) : '') +
        '</div>' +
        '<div class="student-row-actions">' +
          '<span class="student-pill ' + (read ? '' : 'ok') + '">' + esc(mine ? 'Gönderildi' : (read ? 'Okundu' : 'Gelen')) + '</span>' +
          '<button class="student-btn secondary" type="button" data-message-open="' + esc(item.id) + '">' + esc(active ? 'Kapat' : 'Oku') + '</button>' +
          '<button class="student-btn danger" type="button" data-message-delete="' + esc(item.id) + '">Sil</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderMessageDetail(item, mine) {
    return '<div class="student-message-detail">' +
      '<div>' + esc(item.body || '') + '</div>' +
      '<label class="student-field"><span>Cevap yaz</span><textarea data-message-reply-body="' + esc(item.id) + '" placeholder="Cevabını yaz"></textarea></label>' +
      '<div class="student-row-actions">' +
        '<button class="student-btn secondary" type="button" data-message-reply="' + esc(item.id) + '">' + esc(mine ? 'Tekrar Gönder' : 'Cevapla') + '</button>' +
      '</div>' +
    '</div>';
  }

  function filterText(value) {
    return clean(value).toLocaleLowerCase('tr-TR');
  }

  function renderExamProgress() {
    var box = qs('studentExamList');
    if (!box) return;
    var query = filterText(qs('studentExamFilter') && qs('studentExamFilter').value);
    var scoreFilter = qs('studentExamScoreFilter') ? qs('studentExamScoreFilter').value : '';
    var rows = getCompletedExamRecords().filter(function(item) {
      var meta = item.meta || {};
      var haystack = filterText([item.title, item.subject, item.grade].join(' '));
      var score = Number(meta.score || 0);
      if (query && haystack.indexOf(query) < 0) return false;
      if (scoreFilter === '85' && score < 85) return false;
      if (scoreFilter === '50' && score < 50) return false;
      if (scoreFilter === '0' && score >= 50) return false;
      return true;
    });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Kayıtlı sınav sonucun yok.</div>';
      return;
    }
    box.innerHTML = '<div class="student-table-head"><div>Sınav</div><div>Soru</div><div>Doğru</div><div>Yanlış</div><div>Boş</div><div>Tarih</div><div>Süre</div></div>' +
      rows.map(function(item) {
        var meta = item.meta || {};
        return '<div class="student-table-row">' +
          '<div><strong>' + esc(item.title || 'Sınav') + '</strong><small>' + esc([item.grade, item.subject, meta.score !== undefined ? '%' + meta.score : ''].filter(Boolean).join(' · ')) + '</small></div>' +
          '<div>' + esc(meta.total || '-') + '</div>' +
          '<div>' + esc(meta.correct || 0) + '</div>' +
          '<div>' + esc(meta.wrong || 0) + '</div>' +
          '<div>' + esc(meta.blank || 0) + '</div>' +
          '<div>' + esc(formatDate(meta.date || item.updatedAt)) + '</div>' +
          '<div>' + esc(formatDuration(meta.elapsed)) + '<small>' + examKarneButton(item) + '</small></div>' +
        '</div>';
      }).join('');
  }

  function examKarneButton(item) {
    var meta = item.meta || {};
    if (!meta.resultSnapshot) {
      return '<a href="' + esc(item.href || '/sinav_sitesi/index.html') + '">Sınava Git</a>';
    }
    return '<button class="student-btn secondary" type="button" data-exam-karne="' + esc(item.key) + '">Karne</button>';
  }

  function renderReadingProgress() {
    var box = qs('studentReadingList');
    if (!box) return;
    var query = filterText(qs('studentReadingFilter') && qs('studentReadingFilter').value);
    var statusFilter = qs('studentReadingStatusFilter') ? qs('studentReadingStatusFilter').value : '';
    var rows = getCompletedReadingRecords().filter(function(item) {
      var meta = item.meta || {};
      var haystack = filterText([item.title, item.grade, item.subject].join(' '));
      if (query && haystack.indexOf(query) < 0) return false;
      if (statusFilter === 'target' && !(Number(meta.wpm || 0) >= Number(meta.targetWpm || 0) && Number(meta.targetWpm || 0) > 0)) return false;
      if (statusFilter === 'comprehension' && Number(meta.comprehensionPercent || 0) < 50) return false;
      return true;
    });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Kayıtlı okuma sonucun yok.</div>';
      return;
    }
    box.innerHTML = '<div class="student-table-head"><div>Metin</div><div>Hız</div><div>Hedef</div><div>Anlama</div><div>Doğru</div><div>Tarih</div><div>Süre</div></div>' +
      rows.map(function(item) {
        var meta = item.meta || {};
        return '<div class="student-table-row">' +
          '<div><strong>' + esc(item.title || 'Okuma Metni') + '</strong><small>' + esc(item.grade || '') + '</small></div>' +
          '<div>' + esc(meta.wpm || 0) + ' k/d</div>' +
          '<div>' + esc(meta.targetWpm || 0) + ' k/d</div>' +
          '<div>%' + esc(meta.comprehensionPercent || 0) + '</div>' +
          '<div>' + esc(meta.correct || 0) + '/' + esc(meta.total || 0) + '</div>' +
          '<div>' + esc(formatDate(meta.date || item.updatedAt)) + '</div>' +
          '<div>' + esc(formatDuration(meta.durationSeconds)) + '<small>' + readingKarneButton(item) + '</small></div>' +
        '</div>';
      }).join('');
  }

  function readingKarneButton(item) {
    var meta = item.meta || {};
    if (!meta.readingResult) {
      return '<a href="' + esc(item.href || '/hizli-okuma/index.html') + '">Metne Git</a>';
    }
    return '<button class="student-btn secondary" type="button" data-reading-karne="' + esc(item.key) + '">Karne</button>';
  }

  function renderDocumentProgress() {
    var box = qs('studentDocumentList');
    if (!box) return;
    var query = filterText(qs('studentDocumentFilter') && qs('studentDocumentFilter').value);
    var rows = getContentRecords().filter(function(item) {
      var meta = item.meta || {};
      var isDocType = item.type === 'document' || item.type === 'video' || item.type === 'worksheet';
      var isSaved = Boolean(meta.saved) || item.type === 'worksheet';
      var haystack = filterText([item.title, item.subject, item.grade].join(' '));
      return isDocType && isSaved && (!query || haystack.indexOf(query) >= 0);
    });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Henüz kaydettiğin döküman, video veya çalışma yok.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      return '<div class="student-row">' +
        '<div>' +
          '<div class="student-row-title">' + esc(item.title || getContentTypeLabel(item.type)) + '</div>' +
          '<div class="student-row-sub">' + esc(getContentTypeLabel(item.type)) + (item.grade ? ' · ' + esc(item.grade) : '') + (item.subject ? ' · ' + esc(item.subject) : '') + ' · ' + esc(formatDate(item.updatedAt)) + '</div>' +
        '</div>' +
        '<a class="student-pill ok" href="' + esc(item.href || '#') + '">Aç</a>' +
      '</div>';
    }).join('');
  }

  function renderGameProgress() {
    var box = qs('studentGameList');
    if (!box) return;
    var rows = getContentRecords().filter(function(item) { return item.type === 'game'; });
    if (!rows.length) {
      box.innerHTML = '<div class="student-empty">Oyun geçmişin henüz oluşmadı.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      return '<div class="student-row">' +
        '<div>' +
          '<div class="student-row-title">' + esc(item.title || 'Oyun') + '</div>' +
          '<div class="student-row-sub">' + esc(formatDate(item.updatedAt)) + '</div>' +
        '</div>' +
        '<a class="student-pill ok" href="' + esc(item.href || '#') + '">Oyna</a>' +
      '</div>';
    }).join('');
  }

  function getSavedRecords() {
    return getContentRecords().filter(function(item) {
      return Boolean(item && item.meta && item.meta.saved);
    });
  }

  function getSavedGroups() {
    return [
      {
        id: 'games',
        title: 'Oyunlarım',
        empty: 'Henüz kaydettiğin oyun yok.',
        filter: function(item) { return item.type === 'game'; },
      },
      {
        id: 'documents',
        title: 'Dökümanlarım',
        empty: 'Henüz kaydettiğin döküman veya çalışma yok.',
        filter: function(item) { return item.type === 'document' || item.type === 'worksheet'; },
      },
      {
        id: 'videos',
        title: 'Videolarım',
        empty: 'Henüz kaydettiğin video yok.',
        filter: function(item) { return item.type === 'video'; },
      },
      {
        id: 'readings',
        title: 'Okumalarım',
        empty: 'Henüz kaydettiğin okuma metni yok.',
        filter: function(item) { return item.type === 'reading'; },
      },
      {
        id: 'exams',
        title: 'Testlerim ve Denemelerim',
        empty: 'Henüz kaydettiğin test veya deneme yok.',
        filter: function(item) { return item.type === 'exam'; },
      },
    ];
  }

  function getSavedActionLabel(type) {
    if (type === 'game') return 'Oyna';
    if (type === 'video') return 'İzle';
    if (type === 'exam') return 'Aç';
    return 'Aç';
  }

  function renderSavedItem(item) {
    var meta = item.meta || {};
    var savedAt = meta.savedAt || item.updatedAt;
    var href = item.href || '#';
    return '<div class="student-row">' +
      '<div>' +
        '<div class="student-row-title">' + esc(item.title || getContentTypeLabel(item.type)) + '</div>' +
        '<div class="student-row-sub">' + esc(getContentTypeLabel(item.type)) + (item.grade ? ' · ' + esc(item.grade) : '') + (item.subject ? ' · ' + esc(item.subject) : '') + ' · Kaydedildi: ' + esc(formatDate(savedAt)) + '</div>' +
      '</div>' +
      '<a class="student-pill ok" href="' + esc(href) + '">' + esc(getSavedActionLabel(item.type)) + '</a>' +
    '</div>';
  }

  function renderSavedContent() {
    var box = qs('studentSavedGroups');
    if (!box) return;
    var query = filterText(qs('studentSavedFilter') && qs('studentSavedFilter').value);
    var saved = getSavedRecords().filter(function(item) {
      if (!query) return true;
      return filterText([item.title, item.subject, item.grade, getContentTypeLabel(item.type)].join(' ')).indexOf(query) >= 0;
    });
    box.innerHTML = getSavedGroups().map(function(group) {
      var rows = saved.filter(group.filter);
      return '<article class="student-saved-group" data-saved-group="' + esc(group.id) + '">' +
        '<div class="student-saved-head">' +
          '<h3>' + esc(group.title) + '</h3>' +
          '<span class="student-pill">' + rows.length + '</span>' +
        '</div>' +
        '<div class="student-saved-body">' +
          (rows.length ? rows.map(renderSavedItem).join('') : '<div class="student-empty">' + esc(group.empty) + '</div>') +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderContentProgress() {
    renderExamProgress();
    renderReadingProgress();
  }

  function renderAll() {
    renderStats();
    renderAccount();
    renderClasses();
    renderParents();
    renderAssignments();
    renderMessages();
    renderContentProgress();
    renderSavedContent();
    renderPanelBadges();
  }

  async function loadAssignmentTeacherNames() {
    state.teacherNames = {};
    var ids = Array.from(new Set(state.assignments.map(function(item) {
      return item.teacher_id;
    }).concat(state.memberships.map(function(item) {
      return item.teacher_id;
    })).filter(Boolean)));
    if (!ids.length) return;
    try {
      var result = await getClient()
        .from('user_profiles')
        .select('id,full_name,first_name,last_name,email')
        .in('id', ids);
      if (result.error) throw result.error;
      (result.data || []).forEach(function(row) {
        state.teacherNames[row.id] = clean(row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Öğretmen');
      });
    } catch (error) {
      state.teacherNames = {};
    }
  }

  async function loadMessages() {
    state.messages = [];
    if (!state.user || !state.user.id) return;
    try {
      var result = await getClient()
        .from('panel_messages')
        .select('*')
        .or('sender_id.eq.' + state.user.id + ',recipient_id.eq.' + state.user.id)
        .order('created_at', { ascending: false })
        .limit(80);
      if (result.error) throw result.error;
      state.messages = result.data || [];
      await loadMessageProfiles();
    } catch (error) {
      state.messages = [];
      state.messageProfiles = {};
    }
  }

  async function loadParentLinks() {
    state.parentLinks = [];
    state.parentProfiles = {};
    if (!state.user || !state.user.id) return;
    try {
      var result = await getClient()
        .from('parent_student_links')
        .select('*')
        .eq('student_profile_id', state.user.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      state.parentLinks = result.data || [];
      var ids = Array.from(new Set(state.parentLinks.map(function(link) { return link.parent_id; }).filter(Boolean)));
      if (ids.length) {
        var profiles = await getClient()
          .from('user_profiles')
          .select('id,email,full_name,first_name,last_name')
          .in('id', ids);
        if (!profiles.error) {
          (profiles.data || []).forEach(function(profile) {
            state.parentProfiles[profile.id] = profile;
          });
        }
      }
    } catch (error) {
      state.parentLinks = [];
      state.parentProfiles = {};
    }
  }

  async function loadMessageProfiles() {
    state.messageProfiles = {};
    var ids = Array.from(new Set(state.messages.reduce(function(list, message) {
      list.push(message.sender_id, message.recipient_id);
      return list;
    }, []).filter(function(id) {
      return id && !sameId(id, state.user && state.user.id) && !state.teacherNames[id];
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

  async function loadProfile() {
    var auth = await getClient().auth.getUser();
    state.user = auth && auth.data ? auth.data.user : null;
    if (!state.user) {
      window.location.href = '/giris.html';
      return false;
    }
    var result = await getClient()
      .from('user_profiles')
      .select('id,role,approval_status,active,full_name,first_name,last_name,school_name,email,grade_level,branch,city,avatar_url')
      .eq('id', state.user.id)
      .maybeSingle();
    if (result.error && String(result.error.message || '').indexOf('avatar_url') >= 0) {
      result = await getClient()
        .from('user_profiles')
        .select('id,role,approval_status,active,full_name,first_name,last_name,school_name,email,grade_level,branch,city')
        .eq('id', state.user.id)
        .maybeSingle();
    }
    if (result.error) throw result.error;
    state.profile = result.data || null;
    if (!state.profile || state.profile.role !== 'student' || state.profile.active === false) {
      window.location.href = '/giris.html';
      return false;
    }
    var displayName = state.profile.full_name || state.user.email || 'Öğrenci';
    setText('studentIntro', displayName + ', bugün de küçük bir ilerleme büyük fark yaratır. Sınavlarını, okumalarını, kaydettiklerini ve yıldız yolculuğunu buradan takip edebilirsin.');
    setText('studentSidebarName', displayName);
    setText('studentStatus', 'Aktif öğrenci');
    renderAccount();
    if (window.kemalContentProgress && typeof window.kemalContentProgress.syncRemote === 'function') {
      await window.kemalContentProgress.syncRemote();
    }
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
      state.teacherNames = {};
      await loadParentLinks();
      await loadMessages();
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
    await loadAssignmentTeacherNames();
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
    await loadParentLinks();
    await loadMessages();
    renderAll();
  }

  async function joinClass(event) {
    event.preventDefault();
    var code = normalizeCode(qs('joinClassCode').value);
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

  async function connectParentCode(event) {
    event.preventDefault();
    var code = normalizeCode(qs('studentParentCode') && qs('studentParentCode').value);
    var relationship = qs('studentParentRelationship') ? qs('studentParentRelationship').value : 'parent';
    if (!code) {
      toast('Veli kodunu yazmalısın.', 'error');
      return;
    }
    try {
      var result = await getClient().rpc('connect_student_with_parent_code', {
        p_code: code,
        p_relationship: relationship,
      });
      if (result.error) throw result.error;
      if (qs('studentParentCodeForm')) qs('studentParentCodeForm').reset();
      toast('Veli hesabı öğrencine bağlandı.');
      await loadData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendStudentMessage(event) {
    event.preventDefault();
    var membershipId = qs('studentMessageTeacher') ? qs('studentMessageTeacher').value : '';
    var membership = state.memberships.find(function(item) { return String(item.id) === String(membershipId); }) || null;
    var subject = clean(qs('studentMessageSubject') && qs('studentMessageSubject').value) || 'Öğrenci mesajı';
    var body = clean(qs('studentMessageBody') && qs('studentMessageBody').value);
    if (!membership || !membership.teacher_id) {
      toast('Mesaj göndermek için bağlı bir öğretmen seçmelisin.', 'error');
      return;
    }
    if (!body) {
      toast('Mesajını yazmalısın.', 'error');
      return;
    }
    if (!validateSafeText([
      { element: qs('studentMessageSubject'), label: 'mesaj_konusu', value: subject },
      { element: qs('studentMessageBody'), label: 'mesaj_metni', value: body },
    ], 'student_message')) return;
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: state.user.id,
        sender_role: 'student',
        recipient_id: membership.teacher_id,
        class_id: membership.class_id,
        related_student_profile_id: state.user.id,
        subject: subject,
        body: body,
      });
      if (result.error) throw result.error;
      if (qs('studentMessageForm')) qs('studentMessageForm').reset();
      toast('Mesajın öğretmenine gönderildi.');
      await loadMessages();
      renderMessages();
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
    ], 'student_message_reply')) return;
    var recipientId = sameId(message.sender_id, state.user.id) ? message.recipient_id : message.sender_id;
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: state.user.id,
        sender_role: 'student',
        recipient_id: recipientId,
        class_id: message.class_id || null,
        related_student_profile_id: state.user.id,
        subject: message.subject && /^Re:/i.test(message.subject) ? message.subject : 'Re: ' + (message.subject || 'Mesaj'),
        body: body,
      });
      if (result.error) throw result.error;
      toast('Cevap gönderildi.');
      await loadMessages();
      renderMessages();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function markAssignmentCompleted(assignmentId) {
    var assignment = state.assignments.find(function(item) { return sameId(item.id, assignmentId); }) || null;
    var membership = assignment ? getMembershipForAssignment(assignment) : null;
    if (!assignment || !membership) return;
    try {
      var payload = {
        assignment_id: assignment.id,
        student_membership_id: membership.id,
        student_profile_id: state.user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        detail_json: { opened_from_panel: true },
      };
      var result = await getClient()
        .from('teacher_assignment_progress')
        .upsert(payload, { onConflict: 'assignment_id,student_membership_id' })
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      var row = result.data || payload;
      var index = state.progress.findIndex(function(item) {
        return sameId(item.assignment_id, assignment.id) && sameId(item.student_membership_id, membership.id);
      });
      if (index >= 0) state.progress[index] = Object.assign({}, state.progress[index], row);
      else state.progress.push(row);
      renderAssignments();
      renderStats();
      renderPanelBadges();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    var payload = {
      city: normalizePlace(qs('studentAccountCity').value),
      school_name: clean(qs('studentAccountSchool').value),
      school_missing: true,
      school_id: null,
      grade_level: Number(qs('studentAccountGrade').value || 0) || null,
      branch: clean(qs('studentAccountBranch').value).toLocaleUpperCase('tr-TR'),
    };
    if (!validateSafeText([
      { element: qs('studentAccountSchool'), label: 'okul_adi', value: payload.school_name },
    ], 'student_profile')) return;
    if (state.avatarDraft) {
      payload.avatar_url = state.avatarDraft;
    }
    try {
      var result = await getClient()
        .from('user_profiles')
        .update(payload)
        .eq('id', state.user.id)
        .select('id,role,approval_status,active,full_name,first_name,last_name,school_name,email,grade_level,branch,city,avatar_url')
        .maybeSingle();
      if (result.error && String(result.error.message || '').indexOf('avatar_url') >= 0) {
        delete payload.avatar_url;
        result = await getClient()
          .from('user_profiles')
          .update(payload)
          .eq('id', state.user.id)
          .select('id,role,approval_status,active,full_name,first_name,last_name,school_name,email,grade_level,branch,city')
          .maybeSingle();
      }
      if (result.error) throw result.error;
      state.profile = result.data || Object.assign({}, state.profile, payload);
      state.avatarDraft = '';
      renderAll();
      if (window.kemalUserAuth && typeof window.kemalUserAuth.refresh === 'function') {
        window.kemalUserAuth.refresh();
      }
      toast('Kişisel bilgilerin kaydedildi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  function resizeAvatar(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var size = 240;
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          var minSide = Math.min(img.width, img.height);
          var sx = (img.width - minSide) / 2;
          var sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      state.avatarDraft = await resizeAvatar(file);
      renderAccount();
      toast('Görsel hazırlandı. Kalıcı olması için bilgilerini kaydet.');
    } catch (error) {
      toast('Görsel yüklenemedi.', 'error');
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

  async function sendPasswordReset() {
    try {
      var email = state.user && state.user.email ? state.user.email : '';
      if (!email) {
        throw new Error('E-posta bilgisi bulunamadı.');
      }
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

  function getRecordByKey(key) {
    return getContentRecords().find(function(item) { return item.key === key; }) || null;
  }

  function openExamKarne(key) {
    var record = getRecordByKey(key);
    var snapshot = record && record.meta ? record.meta.resultSnapshot : null;
    if (!snapshot) return;
    localStorage.setItem(EXAM_KARNE_KEY, JSON.stringify(snapshot));
    window.location.href = '/sinav_sitesi/sinav.html?adminKarne=1';
  }

  function openReadingKarne(key) {
    var record = getRecordByKey(key);
    var meta = record && record.meta ? record.meta : {};
    var row = meta.readingResult || null;
    if (!row) return;
    sessionStorage.setItem('okuma_metin', JSON.stringify({
      id: row.metin_id || record.id,
      baslik: row.metin_adi || record.title,
      kelime_sayisi: row.kelime_sayisi || meta.wordCount || 0,
      hedef_hiz: row.hedef_hiz || meta.targetWpm || 0,
      sorular: [],
    }));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify({
      ad: row.ad || (state.profile && state.profile.first_name) || '',
      soyad: row.soyad || (state.profile && state.profile.last_name) || '',
      sinif: row.sinif || (state.profile && state.profile.grade_level) || '',
      sube: row.sube || (state.profile && state.profile.branch) || '',
      accountUid: state.user && state.user.id ? state.user.id : '',
      email: state.user && state.user.email ? state.user.email : '',
    }));
    sessionStorage.setItem('okuma_sure_sn', String(row.okuma_suresi_sn || meta.durationSeconds || 0));
    sessionStorage.setItem('okuma_wpm', String(row.dakika_kelime || meta.wpm || 0));
    sessionStorage.setItem('okuma_cevaplar', JSON.stringify({
      dogru: row.dogru_sayisi || meta.correct || 0,
      yanlis: row.yanlis_sayisi || meta.wrong || 0,
      detay: [],
    }));
    sessionStorage.setItem('okuma_attempt_id', meta.attemptId || 'panel_' + Date.now());
    window.location.href = '/hizli-okuma/karne.html';
  }

  function bindEvents() {
    bindCodeInput('joinClassCode');
    bindCodeInput('studentParentCode');
    if (qs('joinClassForm')) qs('joinClassForm').addEventListener('submit', joinClass);
    if (qs('studentParentCodeForm')) qs('studentParentCodeForm').addEventListener('submit', connectParentCode);
    if (qs('studentMessageForm')) qs('studentMessageForm').addEventListener('submit', sendStudentMessage);
    if (qs('studentProfileForm')) qs('studentProfileForm').addEventListener('submit', saveProfile);
    if (qs('studentAvatarBtn')) qs('studentAvatarBtn').addEventListener('click', function() { qs('studentAvatarInput').click(); });
    if (qs('studentAvatarInput')) qs('studentAvatarInput').addEventListener('change', handleAvatarFile);
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
    if (qs('studentPasswordResetBtn')) qs('studentPasswordResetBtn').addEventListener('click', sendPasswordReset);
    ['studentExamFilter', 'studentExamScoreFilter', 'studentReadingFilter', 'studentReadingStatusFilter'].forEach(function(id) {
      if (qs(id)) qs(id).addEventListener('input', renderContentProgress);
      if (qs(id)) qs(id).addEventListener('change', renderContentProgress);
    });
    if (qs('studentSavedFilter')) {
      qs('studentSavedFilter').addEventListener('input', renderSavedContent);
      qs('studentSavedFilter').addEventListener('change', renderSavedContent);
    }
    document.addEventListener('click', function(event) {
      var target = event.target;
      if (!target) return;
      var tabTarget = target.closest ? target.closest('[data-tab]') : null;
      if (tabTarget && tabTarget.dataset.tab) {
        document.querySelectorAll('.student-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === tabTarget.dataset.tab);
        });
        document.querySelectorAll('.student-section').forEach(function(section) {
          section.classList.toggle('active', section.id === 'student-section-' + tabTarget.dataset.tab);
        });
      }
      var contentTabTarget = target.closest ? target.closest('[data-content-tab]') : null;
      if (contentTabTarget && contentTabTarget.dataset.contentTab) {
        document.querySelectorAll('.content-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.contentTab === contentTabTarget.dataset.contentTab);
        });
        document.querySelectorAll('.content-pane').forEach(function(section) {
          section.classList.toggle('active', section.id === 'content-pane-' + contentTabTarget.dataset.contentTab);
        });
      }
      var messageTab = target.closest ? target.closest('[data-message-tab]') : null;
      if (messageTab) {
        state.messageTab = messageTab.dataset.messageTab || 'inbox';
        state.activeMessageId = '';
        renderMessages();
      }
      var assignmentOpen = target.closest ? target.closest('[data-assignment-open]') : null;
      if (assignmentOpen) {
        event.preventDefault();
        var href = assignmentOpen.getAttribute('href') || '#';
        markAssignmentCompleted(assignmentOpen.dataset.assignmentOpen).then(function() {
          if (href && href !== '#') window.location.href = href;
        });
      }
      if (target.dataset.messageOpen) openPanelMessage(target.dataset.messageOpen);
      if (target.dataset.messageDelete) deletePanelMessage(target.dataset.messageDelete);
      if (target.dataset.messageReply) replyPanelMessage(target.dataset.messageReply);
      if (target.dataset.examKarne) openExamKarne(target.dataset.examKarne);
      if (target.dataset.readingKarne) openReadingKarne(target.dataset.readingKarne);
    });
  }

  async function init() {
    bindEvents();
    window.addEventListener('kemal-content-progress-changed', function() {
      renderStats();
      renderContentProgress();
      renderSavedContent();
    });
    window.addEventListener('kemal-user-activity-changed', renderStats);
    window.addEventListener('kemal-reaction-merit-changed', renderStats);
    try {
      await loadLocations();
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
