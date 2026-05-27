(function() {
  'use strict';

  var GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
  var TEACHER_VERIFICATION_BUCKET = 'teacher-verifications';
  var MAX_IMAGE_EDGE = 1600;
  var IMAGE_QUALITY = 0.72;
  var MAX_PDF_SIZE = 12 * 1024 * 1024;
  var AVATAR_MAX_EDGE = 520;
  var AVATAR_QUALITY = 0.78;
  var EXAM_KARNE_KEY = 'kemal_exam_admin_karne_result_v1';
  var state = {
    user: null,
    profile: null,
    classes: [],
    students: [],
    assignments: [],
    progress: [],
    merit: [],
    parentLinks: [],
    parentProfiles: {},
    studentMemberships: {},
    messageProfiles: {},
    messages: [],
    messageTab: 'inbox',
    activeMessageId: '',
    activeAssignmentDetailsId: '',
    activeReportStudentId: '',
    activeReportTab: 'exam',
    studentProgress: [],
    libraryItems: [],
    avatarDraft: '',
    selectedAssignmentItem: null,
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

  function clean(value) {
    return String(value || '').trim();
  }

  function filterText(value) {
    return clean(value).toLocaleLowerCase('tr-TR');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function getInitials(profile) {
    var name = getProfileName(profile);
    if (!name && state.user) name = state.user.email || '';
    var parts = name.split(/\s+/).filter(Boolean);
    var first = parts[0] ? parts[0].charAt(0) : 'Ö';
    var second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + second).toLocaleUpperCase('tr-TR');
  }

  function getProfileName(profile) {
    return clean(profile && (profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email));
  }

  function paintAvatar(el, profile) {
    if (!el) return;
    var src = state.avatarDraft || (profile && profile.avatar_url) || '';
    if (src) {
      el.innerHTML = '<img src="' + esc(src) + '" alt="Profil fotoğrafı">';
    } else {
      el.textContent = getInitials(profile);
    }
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
    if (message.indexOf('panel_messages') >= 0) {
      return 'Mesaj ve hatırlatma sistemi için Supabase içinde panel_messages tablosu eksik görünüyor. supabase-veli-paneli.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('user_content_progress') >= 0) {
      return 'Öğrenci içerik ilerleme tablosu eksik görünüyor. Panel çalışır; karne/ilerleme kısmı için içerik ilerleme SQL ayarını kontrol etmelisin.';
    }
    if (message.indexOf('parent_note') >= 0 || message.indexOf('sender_deleted_at') >= 0 || message.indexOf('recipient_deleted_at') >= 0) {
      return 'Panel güncelleme alanları Supabase içinde eksik görünüyor. supabase-panel-guncelleme-2026-05-27.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('relation') >= 0 || message.indexOf('does not exist') >= 0) {
      return 'Öğretmen paneli tabloları henüz Supabase içinde kurulmamış. supabase-ogretmen-paneli.sql dosyasını çalıştırmalısın.';
    }
    if (message.indexOf('permission denied') >= 0 || message.indexOf('policy') >= 0) {
      return 'Bu işlem için veritabanı yetkisi eksik görünüyor. RLS politikalarını kontrol etmelisin.';
    }
    if (message.indexOf('teacher-verifications') >= 0 || message.indexOf('Bucket not found') >= 0 || message.indexOf('storage') >= 0) {
      return 'Öğretmen belge alanı henüz Supabase içinde hazır değil. supabase-ogretmen-paneli.sql dosyasını tekrar çalıştırmalısın.';
    }
    return message || 'Beklenmeyen bir hata oluştu.';
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

  function getTeacherNameById(id) {
    if (sameId(id, getTeacherId())) return 'Sen';
    var student = state.students.find(function(item) {
      return sameId(item.student_profile_id, id);
    });
    if (student) return student.display_name || 'Öğrenci';
    return getProfileName(state.parentProfiles[id]) || getProfileName(state.messageProfiles[id]) || 'Kullanıcı';
  }

  function isOwnMessageDeleted(message) {
    return sameId(message.sender_id, getTeacherId()) ? !!message.sender_deleted_at : !!message.recipient_deleted_at;
  }

  function getUnreadMessageCount() {
    return state.messages.filter(function(message) {
      return sameId(message.recipient_id, getTeacherId()) && message.status !== 'read' && !message.recipient_deleted_at;
    }).length;
  }

  function getMessageRows(tab) {
    var selected = tab || state.messageTab || 'inbox';
    return state.messages.filter(function(message) {
      if (isOwnMessageDeleted(message) || message.status === 'archived') return false;
      var mine = sameId(message.sender_id, getTeacherId());
      var received = sameId(message.recipient_id, getTeacherId());
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
    setPanelBadge('assignments', 0);
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

  function isTeacherApproved() {
    return !!(state.profile && state.profile.approval_status === 'active' && state.profile.active !== false);
  }

  function sanitizeFileName(name) {
    var base = String(name || 'ogretmen-belgesi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return base || 'ogretmen-belgesi';
  }

  function loadImage(file) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Belge görseli okunamadı.'));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) resolve(blob);
        else reject(new Error('Belge sıkıştırılamadı.'));
      }, type, quality);
    });
  }

  async function compressImageFile(file) {
    var image = await loadImage(file);
    var ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    var width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    var height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    var blob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY);
    return {
      blob: blob,
      fileName: sanitizeFileName(file.name || 'ogretmen-belgesi.jpg').replace(/\.[^.]+$/, '') + '.jpg',
      contentType: 'image/jpeg',
    };
  }

  async function resizeAvatarFile(file) {
    if (!file) return '';
    var type = String(file.type || '').toLowerCase();
    if (type !== 'image/jpeg' && type !== 'image/png') {
      throw new Error('Profil fotoğrafı için JPEG veya PNG seçmelisin.');
    }
    var image = await loadImage(file);
    var ratio = Math.min(1, AVATAR_MAX_EDGE / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    var width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    var height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    var blob = await canvasToBlob(canvas, 'image/jpeg', AVATAR_QUALITY);
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(String(reader.result || '')); };
      reader.onerror = function() { reject(new Error('Profil fotoğrafı okunamadı.')); };
      reader.readAsDataURL(blob);
    });
  }

  async function prepareVerificationFile(file) {
    if (!file) return null;
    var type = String(file.type || '').toLowerCase();
    if (type === 'image/jpeg' || type === 'image/png') {
      return compressImageFile(file);
    }
    if (type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
      if (file.size > MAX_PDF_SIZE) {
        throw new Error('PDF belge 12 MB altında olmalı. Lütfen dosyayı küçültüp tekrar yükleyin.');
      }
      return {
        blob: file,
        fileName: sanitizeFileName(file.name || 'ogretmen-belgesi.pdf'),
        contentType: 'application/pdf',
      };
    }
    throw new Error('Öğretmen belgesi için JPEG, PNG veya PDF yükleyebilirsin.');
  }

  async function uploadVerificationFile(file) {
    var prepared = await prepareVerificationFile(file);
    if (!prepared) {
      throw new Error('Lütfen öğretmen kimliği veya çalışma belgesi seç.');
    }
    var path = getTeacherId() + '/' + Date.now() + '-' + prepared.fileName;
    var upload = await getClient()
      .storage
      .from(TEACHER_VERIFICATION_BUCKET)
      .upload(path, prepared.blob, {
        cacheControl: '3600',
        contentType: prepared.contentType,
        upsert: true,
      });
    if (upload.error) throw upload.error;
    var update = await getClient()
      .from('user_profiles')
      .update({
        verification_status: 'submitted',
        verification_file_path: path,
        verification_file_name: prepared.fileName,
        verification_file_type: prepared.contentType,
        verification_submitted_at: new Date().toISOString(),
        approval_status: 'pending',
      })
      .eq('id', getTeacherId());
    if (update.error) throw update.error;
    return path;
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

  function getAssignmentTargetStudents(assignment) {
    var targetIds = getAssignmentTargets(assignment).map(function(id) { return String(id); });
    return state.students.filter(function(student) {
      return student.status !== 'removed' && targetIds.indexOf(String(student.id)) >= 0;
    });
  }

  function getAssignmentProgressForStudent(assignment, student) {
    return state.progress.find(function(row) {
      return String(row.assignment_id) === String(assignment.id) && String(row.student_membership_id) === String(student.id);
    }) || null;
  }

  function getAssignmentProgressRows(assignment) {
    return getAssignmentTargetStudents(assignment).map(function(student) {
      return {
        student: student,
        progress: getAssignmentProgressForStudent(assignment, student),
      };
    });
  }

  function getContentTypeLabel(type) {
    var map = {
      reading: 'Hızlı okuma',
      exam: 'Sınav / deneme',
      document: 'Doküman',
      worksheet: 'Çalışma',
      video: 'Video',
      game: 'Oyun',
      custom: 'Harici bağlantı',
      content: 'İçerik',
    };
    return map[type] || 'İçerik';
  }

  function normalizeAssignmentType(type) {
    var value = String(type || '').trim();
    return ['reading', 'exam', 'document', 'worksheet', 'video', 'game', 'custom'].indexOf(value) >= 0
      ? value
      : 'custom';
  }

  function getItemGrades(item) {
    var grades = Array.isArray(item && item.grades) ? item.grades : [];
    if (!grades.length && item && item.grade) {
      grades = [item.grade];
    }
    return grades.map(function(value) {
      return parseInt(value, 10);
    }).filter(function(value) {
      return Number.isFinite(value) && value > 0;
    });
  }

  function getGradeLabel(value) {
    var grade = parseInt(value, 10);
    return Number.isFinite(grade) && grade > 0 ? grade + '. Sınıf' : 'Genel';
  }

  function getSavedRecords() {
    if (!window.kemalContentProgress || typeof window.kemalContentProgress.listRecords !== 'function') {
      return [];
    }
    return window.kemalContentProgress.listRecords().filter(function(item) {
      return item && item.meta && item.meta.saved;
    });
  }

  function getLikedRecords() {
    if (!window.kemalContentProgress || typeof window.kemalContentProgress.listRecords !== 'function') {
      return [];
    }
    return window.kemalContentProgress.listRecords().filter(function(item) {
      return item && item.meta && item.meta.liked === true;
    });
  }

  function getAssignmentStatusLabel(status) {
    var map = {
      draft: 'Taslak',
      active: 'Aktif',
      archived: 'Arşivlendi',
      completed: 'Bitirildi',
      invited: 'Davetli',
      removed: 'Çıkarıldı',
    };
    return map[status] || 'Aktif';
  }

  function findLibraryItem(uid) {
    return state.libraryItems.find(function(item) {
      return String(item.uid) === String(uid);
    }) || null;
  }

  function findSavedRecord(key) {
    return getSavedRecords().find(function(item) {
      return String(item.key) === String(key);
    }) || null;
  }

  function findLikedRecord(key) {
    return getLikedRecords().find(function(item) {
      return String(item.key) === String(key);
    }) || null;
  }

  function toAssignmentItem(item) {
    if (!item) return null;
    var meta = item.meta || {};
    return {
      uid: item.uid || item.key || (item.type + ':' + item.id),
      key: item.key || item.uid || '',
      type: item.type || item.contentType || 'custom',
      id: item.id || item.content_id || '',
      title: item.title || getContentTypeLabel(item.type),
      href: item.href || '',
      grade: item.grade || '',
      grades: getItemGrades(item),
      gradeLabel: item.gradeLabel || (item.grade ? getGradeLabel(item.grade) : ''),
      subject: item.subject || '',
      subjectLabel: item.subjectLabel || meta.sourceLabel || '',
      sourceLabel: item.sourceLabel || meta.sourceLabel || getContentTypeLabel(item.type),
    };
  }

  function fillLibraryGradeFilter() {
    var el = qs('libraryGradeFilter');
    if (!el) return;
    var current = el.value;
    var map = {};
    state.libraryItems.forEach(function(item) {
      getItemGrades(item).forEach(function(grade) {
        map[grade] = true;
      });
    });
    var options = Object.keys(map).sort(function(a, b) { return Number(a) - Number(b); }).map(function(grade) {
      return '<option value="' + esc(grade) + '">' + esc(getGradeLabel(grade)) + '</option>';
    }).join('');
    el.innerHTML = '<option value="">Tüm sınıflar</option>' + options;
    if (current && map[current]) {
      el.value = current;
    }
  }

  function selectAssignmentItem(item) {
    var safeItem = toAssignmentItem(item);
    state.selectedAssignmentItem = safeItem;
    if (!safeItem) {
      updateAssignmentWarning();
      return;
    }
    if (qs('assignmentTitle') && !qs('assignmentTitle').value.trim()) {
      qs('assignmentTitle').value = safeItem.title || '';
    }
    if (qs('assignmentType')) {
      qs('assignmentType').value = normalizeAssignmentType(safeItem.type);
    }
    if (qs('assignmentUrl')) {
      qs('assignmentUrl').value = safeItem.href || safeItem.id || '';
    }
    updateAssignmentWarning();
    toast('İçerik ödev formuna seçildi.');
    var form = qs('assignmentForm');
    if (form && typeof form.scrollIntoView === 'function') {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function getSelectedClassGrade() {
    var classId = qs('assignmentClass') ? qs('assignmentClass').value : '';
    var classRow = getClassById(classId);
    var grade = parseInt(classRow && classRow.grade_level, 10);
    return Number.isFinite(grade) ? grade : null;
  }

  function getAssignmentMismatchMessage(item) {
    var classGrade = getSelectedClassGrade();
    var grades = getItemGrades(item || state.selectedAssignmentItem);
    if (!classGrade || !grades.length || grades.indexOf(classGrade) !== -1) {
      return '';
    }
    return 'Bu içerik ' + grades.map(getGradeLabel).join(', ') + ' düzeyinde görünüyor. Seçili sınıf ' + getGradeLabel(classGrade) + '; öğrenci sınıf filtreleri nedeniyle bu içeriği görüntüleyemeyebilir. Ödev için mümkünse sınıf düzeyine uygun materyal seç.';
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

  function getTrustedEmbed(value) {
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

  function renderEmbedPreviewHtml(value) {
    var embed = getTrustedEmbed(value);
    if (!embed) return '';
    return '<div class="teacher-embed-preview"><iframe src="' + esc(embed.url) + '" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  }

  function updateAssignmentWarning() {
    var warning = qs('assignmentWarning');
    var preview = qs('assignmentPreview');
    var message = getAssignmentMismatchMessage();
    if (warning) {
      warning.textContent = message;
      warning.classList.toggle('show', Boolean(message));
    }
    if (preview) {
      preview.innerHTML = renderEmbedPreviewHtml(qs('assignmentUrl') ? qs('assignmentUrl').value : '');
    }
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
    fillMessageStudents();
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

  function fillMessageStudents() {
    var el = qs('teacherMessageStudent');
    if (!el) return;
    var students = state.students.filter(function(item) { return item.status !== 'removed'; });
    el.innerHTML = students.length
      ? students.map(function(item) {
        return '<option value="' + esc(item.id) + '">' + esc(item.display_name) + '</option>';
      }).join('')
      : '<option value="">Öğrenci yok</option>';
  }

  function fillSavedContentSelect() {
    var el = qs('assignmentSavedContent');
    if (!el) return;
    var saved = getSavedRecords();
    if (!saved.length) {
      el.innerHTML = '<option value="">Kaydedilen içerik yok / elle bağlantı gir</option>';
      return;
    }
    el.innerHTML = '<option value="">Kaydedilen içerikten seç veya elle gir</option>' + saved.map(function(item) {
      return '<option value="' + esc(item.key) + '">' + esc(getContentTypeLabel(item.type)) + ' · ' + esc(item.title || 'İçerik') + '</option>';
    }).join('');
  }

  function renderTeacherContentCard(item, source) {
    var safeItem = toAssignmentItem(item);
    if (!safeItem) return '';
    var grades = getItemGrades(safeItem);
    var gradeText = grades.length ? grades.map(getGradeLabel).join(' · ') : 'Genel';
    var id = safeItem.id || safeItem.uid || safeItem.key || safeItem.href;
    var assignAttr = source === 'saved'
      ? ' data-assign-saved="' + esc(item.key || safeItem.key) + '"'
      : (source === 'liked'
        ? ' data-assign-liked="' + esc(item.key || safeItem.key) + '"'
        : ' data-assign-library="' + esc(item.uid || safeItem.uid) + '"');
    return '<article class="teacher-content-card" data-reaction-type="' + esc(safeItem.type) + '" data-reaction-id="' + esc(id) + '" data-reaction-title="' + esc(safeItem.title) + '" data-reaction-href="' + esc(safeItem.href) + '" data-reaction-grade="' + esc(gradeText) + '" data-reaction-subject="' + esc(safeItem.subjectLabel || safeItem.subject) + '" data-reaction-source="' + esc(safeItem.sourceLabel) + '">' +
      '<h3>' + esc(safeItem.title) + '</h3>' +
      '<div class="teacher-content-meta">' +
        '<span class="teacher-pill">' + esc(getContentTypeLabel(safeItem.type)) + '</span>' +
        '<span class="teacher-pill">' + esc(gradeText) + '</span>' +
        (safeItem.subjectLabel || safeItem.subject ? '<span class="teacher-pill">' + esc(safeItem.subjectLabel || safeItem.subject) + '</span>' : '') +
      '</div>' +
      '<div class="teacher-content-actions">' +
        '<a class="teacher-mini-btn" href="' + esc(safeHref(safeItem.href)) + '">Aç</a>' +
        '<button class="teacher-mini-btn primary" type="button"' + assignAttr + '>Ödeve Seç</button>' +
      '</div>' +
    '</article>';
  }

  function hydrateContentActions(container) {
    if (!container) return;
    if (window.kemalContentReactions && typeof window.kemalContentReactions.scan === 'function') {
      window.kemalContentReactions.scan(container);
    }
    if (window.kemalContentSaves && typeof window.kemalContentSaves.scan === 'function') {
      window.kemalContentSaves.scan(container);
    }
  }

  function renderLibrary() {
    var box = qs('teacherLikedList');
    if (!box) return;
    var rows = getLikedRecords();
    if (!rows.length) {
      box.innerHTML = '<div class="teacher-empty">Henüz beğendiğin içerik yok. Sitede gezinirken beğen tuşuna bastığın içerikler burada görünecek.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      return renderTeacherContentCard(item, 'liked');
    }).join('');
    hydrateContentActions(box);
  }

  function renderSavedContent() {
    var box = qs('teacherSavedList');
    if (!box) return;
    var saved = getSavedRecords();
    fillSavedContentSelect();
    if (!saved.length) {
      box.innerHTML = '<div class="teacher-empty">Henüz kaydettiğin içerik yok. Sitede gezinirken kaydet ikonunu kullanarak favorilerini oluşturabilirsin.</div>';
      return;
    }
    box.innerHTML = saved.map(function(item) {
      return renderTeacherContentCard(item, 'saved');
    }).join('');
    hydrateContentActions(box);
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
          '<button class="teacher-mini-btn" type="button" data-complete-class="' + esc(item.id) + '">Sınıfı Bitir</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-archive-class="' + esc(item.id) + '">Pasifleştir</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-delete-class="' + esc(item.id) + '">Sil</button>' +
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
    box.innerHTML = '<table class="teacher-table"><thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Liyakat</th><th>İçerik</th><th>Durum</th><th></th></tr></thead><tbody>' +
      students.map(function(item) {
        var classRow = getClassById(item.class_id);
        var records = getProgressForStudent(item);
        var exams = records.filter(isCompletedExam).length;
        var readings = records.filter(isCompletedReading).length;
        var merit = getStudentMeritPoints(item);
        return '<tr>' +
          '<td>' + esc(item.display_name) + '<div class="teacher-row-sub">' + esc(item.email || item.student_no || 'Manuel kayıt') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf bulunamadı') + '</td>' +
          '<td><span class="teacher-pill ok">' + merit + ' puan</span></td>' +
          '<td>' + exams + ' test · ' + readings + ' okuma</td>' +
          '<td><span class="teacher-pill ok">' + esc(getAssignmentStatusLabel(item.status || 'active')) + '</span></td>' +
          '<td><div class="teacher-row-actions"><button class="teacher-mini-btn primary" type="button" data-parent-code="' + esc(item.id) + '">Veli Kodu</button><button class="teacher-mini-btn danger" type="button" data-remove-student="' + esc(item.id) + '">Çıkar</button></div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function getAssignmentMetadata(item) {
    return item && item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
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
      var metadata = getAssignmentMetadata(item);
      var rows = getAssignmentProgressRows(item);
      var completed = rows.filter(function(row) {
        return row.progress && row.progress.status === 'completed';
      }).length;
      var targets = rows.map(function(row) { return row.student.id; });
      var total = Math.max(targets.length, 1);
      var ratio = Math.round((completed / total) * 100);
      var refTitle = metadata.contentTitle || item.content_ref || '';
      var refLink = item.content_ref && !String(item.content_ref).trim().match(/^<iframe/i)
        ? '<a class="teacher-mini-btn" href="' + esc(safeHref(item.content_ref)) + '">İçeriği Aç</a>'
        : '';
      return '<div class="teacher-row">' +
        '<div>' +
          '<div class="teacher-row-title">' + esc(item.title) + '</div>' +
          '<div class="teacher-row-sub">' + esc(classRow ? classRow.name : 'Sınıf yok') + ' · ' + esc(getContentTypeLabel(item.content_type)) + ' · ' + formatDate(item.start_at) + ' - ' + formatDate(item.due_at) + '</div>' +
          (refTitle ? '<div class="teacher-row-sub">İçerik: ' + esc(refTitle) + '</div>' : '') +
          (metadata.gradeWarning ? '<div class="teacher-row-sub"><span class="teacher-pill warn">' + esc(metadata.gradeWarning) + '</span></div>' : '') +
          '<div class="teacher-row-sub">Tamamlayan: ' + completed + ' / ' + total + ' · %' + ratio + '</div>' +
          renderEmbedPreviewHtml(item.content_ref) +
          renderAssignmentProgressDetail(item) +
        '</div>' +
        '<div class="teacher-row-actions">' +
          refLink +
          '<span class="teacher-pill ' + (ratio >= 80 ? 'ok' : 'warn') + '">' + esc(getAssignmentStatusLabel(item.status)) + '</span>' +
          '<button class="teacher-mini-btn primary" type="button" data-show-assignment-details="' + esc(item.id) + '">' + esc(String(state.activeAssignmentDetailsId) === String(item.id) ? 'Kapat' : 'Göster') + '</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-archive-assignment="' + esc(item.id) + '">Arşivle</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-delete-assignment="' + esc(item.id) + '">Sil</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderAssignmentProgressDetail(item) {
    if (String(state.activeAssignmentDetailsId || '') !== String(item.id)) return '';
    var rows = getAssignmentProgressRows(item);
    var completed = rows.filter(function(row) {
      return row.progress && row.progress.status === 'completed';
    });
    var missing = rows.filter(function(row) {
      return !row.progress || row.progress.status !== 'completed';
    });
    var completedList = completed.length
      ? completed.map(function(row) {
        return '<li>' + esc(row.student.display_name || 'Öğrenci') + (row.progress && row.progress.completed_at ? ' · ' + esc(formatDate(row.progress.completed_at)) : '') + '</li>';
      }).join('')
      : '<li>Henüz tamamlayan yok.</li>';
    var missingList = missing.length
      ? missing.map(function(row) {
        return '<li>' + esc(row.student.display_name || 'Öğrenci') + (row.student.email ? ' · ' + esc(row.student.email) : '') + '</li>';
      }).join('')
      : '<li>Tüm öğrenciler tamamladı.</li>';
    return '<div class="teacher-assignment-detail">' +
      '<div class="teacher-row-actions" style="justify-content:space-between">' +
        '<span class="teacher-pill ok">Tamamlayan: ' + completed.length + '</span>' +
        '<span class="teacher-pill warn">Tamamlamayan: ' + missing.length + '</span>' +
        (missing.length ? '<button class="teacher-mini-btn primary" type="button" data-remind-assignment="' + esc(item.id) + '">Tamamlamayanlara Hatırlat</button>' : '') +
      '</div>' +
      '<div class="teacher-assignment-columns">' +
        '<div class="teacher-assignment-group"><h3>Tamamlayanlar</h3><ul>' + completedList + '</ul></div>' +
        '<div class="teacher-assignment-group"><h3>Tamamlamayanlar</h3><ul>' + missingList + '</ul></div>' +
      '</div>' +
    '</div>';
  }

  function getRemoteMeta(row) {
    var detail = row && row.detail_json && typeof row.detail_json === 'object' ? row.detail_json : {};
    return detail.meta && typeof detail.meta === 'object' ? detail.meta : {};
  }

  function getProgressForStudent(student) {
    if (!student || !student.student_profile_id) return [];
    return state.studentProgress.filter(function(row) {
      return String(row.user_id) === String(student.student_profile_id);
    });
  }

  function getStudentMeritPoints(student) {
    if (!student) return 0;
    var teacherEventMerit = state.merit.filter(function(row) {
      return String(row.student_membership_id) === String(student.id);
    }).reduce(function(total, row) {
      return total + Number(row.points || 0);
    }, 0);
    return Math.max(Number(student.merit_points || 0), teacherEventMerit);
  }

  function isCompletedExam(row) {
    var meta = getRemoteMeta(row);
    return row.content_type === 'exam' && (row.status === 'completed' || Boolean(meta.resultSnapshot));
  }

  function isCompletedReading(row) {
    var meta = getRemoteMeta(row);
    return row.content_type === 'reading' && (row.status === 'completed' || Boolean(meta.readingResult));
  }

  function renderStudentReportActions(student) {
    var records = getProgressForStudent(student);
    var exams = records.filter(function(row) {
      return row.content_type === 'exam' && getRemoteMeta(row).resultSnapshot;
    });
    var readings = records.filter(function(row) {
      return row.content_type === 'reading' && getRemoteMeta(row).readingResult;
    });
    var count = exams.length + readings.length;
    if (!count) {
      return '<span class="teacher-pill warn">Karne verisi yok</span>';
    }
    var open = String(state.activeReportStudentId || '') === String(student.id);
    return '<button class="teacher-mini-btn primary" type="button" data-show-student-reports="' + esc(student.id) + '">' +
      esc(open ? 'Karneleri Gizle' : 'Karneleri Göster') +
    '</button>';
  }

  function renderStudentReportDetail(student) {
    if (String(state.activeReportStudentId || '') !== String(student.id)) return '';
    var records = getProgressForStudent(student);
    var exams = records.filter(function(row) {
      return row.content_type === 'exam' && getRemoteMeta(row).resultSnapshot;
    });
    var readings = records.filter(function(row) {
      return row.content_type === 'reading' && getRemoteMeta(row).readingResult;
    });
    var tab = state.activeReportTab === 'reading' ? 'reading' : 'exam';
    var rows = tab === 'reading' ? readings : exams;
    var emptyText = tab === 'reading' ? 'Bu öğrenci için okuma karnesi yok.' : 'Bu öğrenci için sınav karnesi yok.';
    return '<tr class="teacher-report-detail-row"><td colspan="7">' +
      '<div class="teacher-assignment-detail">' +
        '<div class="teacher-message-tabs">' +
          '<button class="teacher-message-tab ' + (tab === 'exam' ? 'active' : '') + '" type="button" data-student-report-tab="exam">Sınavlar <span>' + exams.length + '</span></button>' +
          '<button class="teacher-message-tab ' + (tab === 'reading' ? 'active' : '') + '" type="button" data-student-report-tab="reading">Okumalar <span>' + readings.length + '</span></button>' +
        '</div>' +
        '<div class="teacher-list">' +
          (rows.length ? rows.map(function(row, index) {
            return tab === 'reading' ? renderReadingReportCard(row, index) : renderExamReportCard(row, index);
          }).join('') : '<div class="teacher-empty">' + esc(emptyText) + '</div>') +
        '</div>' +
      '</div>' +
    '</td></tr>';
  }

  function renderExamReportCard(row, index) {
    var meta = getRemoteMeta(row);
    var result = meta.resultSnapshot || {};
    var title = result.examTitle || row.title || 'Sınav Karnesi';
    var scoreText = result.score ? '%' + Math.round(Number(result.score || 0)) : '';
    var detail = [
      result.subject || row.subject || '',
      scoreText,
      formatDate(result.date || row.updated_at || row.created_at),
    ].filter(Boolean).join(' · ');
    return '<div class="teacher-row">' +
      '<div>' +
        '<div class="teacher-row-title">' + esc((index + 1) + '. ' + title) + '</div>' +
        '<div class="teacher-row-sub">' + esc(detail || 'Sınav sonucu') + '</div>' +
      '</div>' +
      '<div class="teacher-row-actions">' +
        '<button class="teacher-mini-btn primary" type="button" data-teacher-exam-karne="' + esc(row.id) + '">Sınav Karnesi</button>' +
      '</div>' +
    '</div>';
  }

  function renderReadingReportCard(row, index) {
    var meta = getRemoteMeta(row);
    var result = meta.readingResult || {};
    var title = result.metin_adi || result.metin || row.title || 'Okuma Karnesi';
    var wpm = result.dakika_kelime || result.dakikada_kelime || meta.wpm || 0;
    var comprehension = result.anlama_yuzdesi || result.anlama || meta.comprehension || 0;
    var detail = [
      wpm ? wpm + ' kelime/dk' : '',
      comprehension ? '%' + Math.round(Number(comprehension || 0)) : '',
      formatDate(result.tarih || result.olusturma_tarihi || row.updated_at || row.created_at),
    ].filter(Boolean).join(' · ');
    return '<div class="teacher-row">' +
      '<div>' +
        '<div class="teacher-row-title">' + esc((index + 1) + '. ' + title) + '</div>' +
        '<div class="teacher-row-sub">' + esc(detail || 'Okuma sonucu') + '</div>' +
      '</div>' +
      '<div class="teacher-row-actions">' +
        '<button class="teacher-mini-btn primary" type="button" data-teacher-reading-karne="' + esc(row.id) + '">Okuma Karnesi</button>' +
      '</div>' +
    '</div>';
  }

  function renderReports() {
    var box = qs('reportList');
    if (!box) return;
    var students = state.students.filter(function(item) { return item.status !== 'removed'; });
    if (!students.length) {
      box.innerHTML = '<div class="teacher-empty">Karne için önce öğrenci eklemelisin.</div>';
      return;
    }
    box.innerHTML = '<table class="teacher-table"><thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Kayıt</th><th>Ödev</th><th>Liyakat</th><th>Sınav / Okuma</th><th>Karne</th></tr></thead><tbody>' +
      students.map(function(student) {
        var classRow = getClassById(student.class_id);
        var assigned = state.assignments.filter(function(item) {
          return getAssignmentTargets(item).indexOf(student.id) >= 0 && item.status !== 'archived';
        });
        var done = state.progress.filter(function(row) {
          return String(row.student_membership_id) === String(student.id) && row.status === 'completed';
        }).length;
        var merit = getStudentMeritPoints(student);
        var records = getProgressForStudent(student);
        var exams = records.filter(function(row) {
          return row.content_type === 'exam' && getRemoteMeta(row).resultSnapshot;
        }).length;
        var readings = records.filter(function(row) {
          return row.content_type === 'reading' && getRemoteMeta(row).readingResult;
        }).length;
        var registered = student.student_profile_id ? 'Kayıtlı' : 'Manuel';
        return '<tr>' +
          '<td>' + esc(student.display_name) + '<div class="teacher-row-sub">' + esc(student.email || student.student_no || '') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf yok') + '</td>' +
          '<td><span class="teacher-pill ' + (student.student_profile_id ? 'ok' : 'warn') + '">' + esc(registered) + '</span></td>' +
          '<td>' + done + ' / ' + assigned.length + '</td>' +
          '<td><span class="teacher-pill ok">' + merit + ' puan</span></td>' +
          '<td>' + exams + ' sınav · ' + readings + ' okuma</td>' +
          '<td><div class="teacher-row-actions">' + renderStudentReportActions(student) + '</div></td>' +
        '</tr>' + renderStudentReportDetail(student);
      }).join('') +
      '</tbody></table>';
  }

  function renderMessages() {
    var box = qs('teacherMessageList');
    if (!box) return;
    var tabs = qs('teacherMessageTabs');
    if (tabs) {
      var tabRows = [
        { id: 'inbox', label: 'Gelen Mesajlar', count: getMessageRows('inbox').length },
        { id: 'sent', label: 'Gönderilenler', count: getMessageRows('sent').length },
        { id: 'read', label: 'Okunanlar', count: getMessageRows('read').length },
      ];
      tabs.innerHTML = tabRows.map(function(tab) {
        return '<button class="teacher-message-tab ' + (state.messageTab === tab.id ? 'active' : '') + '" type="button" data-message-tab="' + esc(tab.id) + '">' + esc(tab.label) + ' <span>' + tab.count + '</span></button>';
      }).join('');
    }
    var rows = getMessageRows();
    if (!rows.length) {
      box.innerHTML = '<div class="teacher-empty">Bu sekmede mesaj yok.</div>';
      return;
    }
    box.innerHTML = rows.map(function(item) {
      var mine = sameId(item.sender_id, getTeacherId());
      var read = !mine && item.status === 'read';
      var otherId = mine ? item.recipient_id : item.sender_id;
      var active = sameId(state.activeMessageId, item.id);
      return '<div class="teacher-row ' + (read ? 'message-read' : '') + '">' +
        '<div>' +
          '<div class="teacher-row-title">' + esc(item.subject || (mine ? 'Gönderilen mesaj' : 'Gelen mesaj')) + '</div>' +
          '<div class="teacher-row-sub">' + esc(mine ? 'Alıcı: ' + getTeacherNameById(otherId) : 'Gönderen: ' + getTeacherNameById(otherId)) + ' · ' + esc(formatDate(item.created_at)) + '</div>' +
          (active ? renderMessageDetail(item, mine) : '') +
        '</div>' +
        '<div class="teacher-row-actions">' +
          '<span class="teacher-pill ' + (read ? '' : 'ok') + '">' + esc(mine ? 'Gönderildi' : (read ? 'Okundu' : 'Gelen')) + '</span>' +
          '<button class="teacher-mini-btn primary" type="button" data-message-open="' + esc(item.id) + '">' + esc(active ? 'Kapat' : 'Oku') + '</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-message-delete="' + esc(item.id) + '">Sil</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderMessageDetail(item, mine) {
    return '<div class="teacher-message-detail">' +
      '<div>' + esc(item.body || '') + '</div>' +
      '<label class="teacher-field"><span>Cevap yaz</span><textarea data-message-reply-body="' + esc(item.id) + '" placeholder="Cevabını yaz"></textarea></label>' +
      '<div class="teacher-row-actions">' +
        '<button class="teacher-mini-btn primary" type="button" data-message-reply="' + esc(item.id) + '">' + esc(mine ? 'Tekrar Gönder' : 'Cevapla') + '</button>' +
      '</div>' +
    '</div>';
  }

  function renderParentLinks() {
    var box = qs('parentLinkReviewList');
    if (!box) return;
    if (!state.parentLinks.length) {
      box.innerHTML = '<div class="teacher-empty">Henüz veli bağlantısı yok.</div>';
      return;
    }
    var relationMap = {
      mother: 'Anne',
      father: 'Baba',
      parent: 'Veli',
      guardian: 'Vasi',
    };
    box.innerHTML = state.parentLinks.map(function(link) {
      var student = state.students.find(function(item) {
        return String(item.id) === String(link.student_membership_id) || String(item.student_profile_id) === String(link.student_profile_id);
      }) || {};
      var parent = state.parentProfiles[link.parent_id] || {};
      var review = link.teacher_review_status === 'pending' ? 'Onay bekliyor' : (link.teacher_review_status === 'rejected' ? 'Reddedildi' : 'Onaylı');
      var actions = link.teacher_review_status === 'pending'
        ? '<button class="teacher-mini-btn primary" type="button" data-review-parent-link="' + esc(link.id) + '" data-review-status="approved">Onayla</button><button class="teacher-mini-btn danger" type="button" data-review-parent-link="' + esc(link.id) + '" data-review-status="rejected">Reddet</button>'
        : '<span class="teacher-pill ' + (link.teacher_review_status === 'rejected' ? 'warn' : 'ok') + '">' + esc(review) + '</span>';
      return '<div class="teacher-row">' +
        '<div>' +
          '<div class="teacher-row-title">' + esc(student.display_name || 'Öğrenci') + '</div>' +
          '<div class="teacher-row-sub">' + esc(getProfileName(parent) || 'Veli hesabı') + ' · ' + esc(relationMap[link.relationship] || 'Veli') + '</div>' +
          '<div class="teacher-row-sub">' + esc(link.source === 'student_code' ? 'Öğrenci kodu ile bağlandı' : 'Öğretmen kodu ile bağlandı') + '</div>' +
        '</div>' +
        '<div class="teacher-row-actions">' + actions + '</div>' +
      '</div>';
    }).join('');
  }

  function renderAll() {
    renderApprovalState();
    fillClassSelects();
    renderStats();
    renderClasses();
    renderStudents();
    renderAssignments();
    renderReports();
    renderMessages();
    renderParentLinks();
    renderPanelBadges();
    renderLibrary();
    renderSavedContent();
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
    paintAvatar(qs('teacherHeroAvatar'), profile);
    paintAvatar(qs('teacherAccountAvatar'), profile);
    setText('accountEmailSummary', email || '-');
    setText('accountApprovalSummary', approvalLabel(profile.approval_status));
    setText('accountActiveSummary', active ? 'Aktif' : 'Pasif');
    if (qs('accountName')) qs('accountName').value = profile.full_name || '';
    if (qs('accountEmail')) qs('accountEmail').value = email;
    if (qs('accountRole')) qs('accountRole').value = 'Öğretmen';
    if (qs('accountStatusText')) qs('accountStatusText').value = (active ? 'Aktif' : 'Pasif') + ' · ' + approvalLabel(profile.approval_status);
    if (qs('accountSchool')) qs('accountSchool').value = profile.school_name || '';
  }

  function renderApprovalState() {
    var panel = document.querySelector('.teacher-panel');
    var notice = qs('teacherApprovalNotice');
    var text = qs('teacherApprovalText');
    var upload = qs('teacherApprovalUpload');
    var profile = state.profile || {};
    var approved = isTeacherApproved();
    if (panel) {
      panel.classList.toggle('teacher-locked', !approved);
    }
    if (!notice) {
      return;
    }
    notice.classList.toggle('show', !approved);
    if (approved) {
      return;
    }
    var status = profile.approval_status || 'pending';
    var verificationStatus = profile.verification_status || (profile.verification_file_path ? 'submitted' : 'not_submitted');
    var hasFile = !!profile.verification_file_path;
    if (status === 'rejected') {
      text.textContent = 'Başvurun yönetici tarafından tekrar inceleme için geri çevrildi. Gerekirse yeni belge gönderip yeniden değerlendirme isteyebilirsin.';
    } else if (hasFile || verificationStatus === 'submitted') {
      text.textContent = 'Belgen sisteme ulaştı. Ana yönetici inceleyip onay verdiğinde sınıf, ödev ve rapor ekranları açılacak.';
    } else {
      text.textContent = 'Sınıf ve ödev araçları açılmadan önce öğretmen kimliği veya çalışma belgesi göndermelisin.';
    }
    if (upload) {
      upload.style.display = (status === 'rejected' || !hasFile) ? 'grid' : 'none';
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
      .select('id,role,approval_status,active,full_name,school_name,email,avatar_url,verification_status,verification_file_path,verification_file_name,verification_review_note')
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
    setText('teacherSidebarName', name);
    renderApprovalState();
    renderAccount();
    return true;
  }

  async function loadTeacherData() {
    var teacherId = getTeacherId();
    var classResult = await getClient()
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (classResult.error) throw classResult.error;
    state.classes = classResult.data || [];

    var classIds = state.classes.map(function(item) { return item.id; });
    if (!classIds.length) {
      state.students = [];
      state.assignments = [];
      state.progress = [];
      state.merit = [];
      state.studentProgress = [];
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

    var profileIds = state.students.map(function(item) {
      return item.student_profile_id;
    }).filter(Boolean);
    if (profileIds.length) {
      try {
        var studentProgressResult = await getClient()
          .from('user_content_progress')
          .select('*')
          .in('user_id', profileIds)
          .order('updated_at', { ascending: false })
          .limit(1000);
        state.studentProgress = studentProgressResult.error ? [] : (studentProgressResult.data || []);
      } catch (error) {
        state.studentProgress = [];
      }
    } else {
      state.studentProgress = [];
    }

    try {
      var parentResult = await getClient()
        .from('parent_student_links')
        .select('*')
        .eq('teacher_id', getTeacherId())
        .in('status', ['active', 'pending']);
      state.parentLinks = parentResult.error ? [] : (parentResult.data || []);
      state.parentProfiles = {};
      var parentIds = Array.from(new Set(state.parentLinks.map(function(item) { return item.parent_id; }).filter(Boolean)));
      if (parentIds.length) {
        var parentProfiles = await getClient()
          .from('user_profiles')
          .select('id,email,full_name,first_name,last_name')
          .in('id', parentIds);
        if (!parentProfiles.error) {
          (parentProfiles.data || []).forEach(function(profile) {
            state.parentProfiles[profile.id] = profile;
          });
        }
      }
    } catch (error) {
      state.parentLinks = [];
      state.parentProfiles = {};
    }

    try {
      var messageResult = await getClient()
        .from('panel_messages')
        .select('*')
        .or('sender_id.eq.' + getTeacherId() + ',recipient_id.eq.' + getTeacherId())
        .order('created_at', { ascending: false })
        .limit(80);
      state.messages = messageResult.error ? [] : (messageResult.data || []);
      await loadMessageProfiles();
    } catch (error) {
      state.messages = [];
      state.messageProfiles = {};
    }
    renderAll();
  }

  async function loadLibraryItems() {
    if (!window.kemalContentFeed || typeof window.kemalContentFeed.getAllItems !== 'function') {
      state.libraryItems = [];
      renderLibrary();
      return;
    }
    try {
      state.libraryItems = await window.kemalContentFeed.getAllItems({ forceRefresh: true });
      fillLibraryGradeFilter();
      renderLibrary();
    } catch (error) {
      state.libraryItems = [];
      fillLibraryGradeFilter();
      renderLibrary();
    }
  }

  async function loadMessageProfiles() {
    state.messageProfiles = {};
    var ids = Array.from(new Set(state.messages.reduce(function(list, message) {
      list.push(message.sender_id, message.recipient_id);
      return list;
    }, []).filter(function(id) {
      return id && !sameId(id, getTeacherId());
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

  async function refreshData() {
    try {
      await Promise.all([loadTeacherData(), loadLibraryItems()]);
    } catch (error) {
      toast(humanizeError(error), 'error');
      renderAll();
    }
  }

  function resolveActionButton(event, selector, fallbackId) {
    if (event && event.target && typeof event.target.closest === 'function') {
      var found = event.target.closest(selector);
      if (found) return found;
    }
    return qs(fallbackId);
  }

  async function refreshTeacherPanel(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    var button = resolveActionButton(event, '[data-teacher-refresh]', 'refreshBtn');
    var oldText = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Yenileniyor...';
    }
    try {
      await refreshData();
      toast('Panel yenilendi.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText || 'Yenile';
      }
    }
  }

  async function saveClass(event) {
    event.preventDefault();
    if (!isTeacherApproved()) {
      toast('Sınıf oluşturmak için yönetici onayı bekleniyor.', 'error');
      return;
    }
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
    if (!isTeacherApproved()) {
      toast('Öğrenci eklemek için yönetici onayı bekleniyor.', 'error');
      return;
    }
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
    if (!isTeacherApproved()) {
      toast('Ödev vermek için yönetici onayı bekleniyor.', 'error');
      return;
    }
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
      var selectedItem = state.selectedAssignmentItem || null;
      var contentRef = qs('assignmentUrl').value.trim();
      var embed = getTrustedEmbed(contentRef);
      var gradeWarning = getAssignmentMismatchMessage(selectedItem);
      var payload = {
        teacher_id: getTeacherId(),
        class_id: classId,
        title: title,
        content_type: normalizeAssignmentType(qs('assignmentType').value),
        content_ref: contentRef,
        target_type: targetType,
        target_student_ids: targetType === 'students' ? selectedStudents : [],
        start_at: qs('assignmentStart').value || todayIso(),
        due_at: qs('assignmentDue').value || null,
        instructions: qs('assignmentNote').value.trim(),
        metadata: {
          contentTitle: selectedItem ? selectedItem.title : '',
          contentUid: selectedItem ? selectedItem.uid : '',
          contentId: selectedItem ? selectedItem.id : '',
          href: contentRef,
          grade: selectedItem ? selectedItem.grade : '',
          grades: selectedItem ? getItemGrades(selectedItem) : [],
          subject: selectedItem ? selectedItem.subject : '',
          sourceLabel: selectedItem ? selectedItem.sourceLabel : '',
          previewType: embed ? embed.type : '',
          embedUrl: embed ? embed.url : '',
          gradeWarning: gradeWarning,
          teacherName: state.profile ? clean(state.profile.full_name || [state.profile.first_name, state.profile.last_name].filter(Boolean).join(' ') || state.profile.email) : '',
        },
        status: 'active',
      };
      var result = await getClient()
        .from('teacher_assignments')
        .insert(payload)
        .select('*')
        .single();
      if (result.error) {
        if (String(result.error.message || '').indexOf('metadata') >= 0) {
          delete payload.metadata;
          result = await getClient()
            .from('teacher_assignments')
            .insert(payload)
            .select('*')
            .single();
        }
        if (result.error) throw result.error;
      }
      qs('assignmentForm').reset();
      qs('assignmentStart').value = todayIso();
      state.selectedAssignmentItem = null;
      updateAssignmentWarning();
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

  async function completeClass(id) {
    if (!window.confirm('Bu sınıfı bitirip aktif listeden kaldırmak istediğine emin misin?')) return;
    try {
      var result = await getClient()
        .from('teacher_classes')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.classes = state.classes.filter(function(item) { return String(item.id) !== String(id); });
      renderAll();
      toast('Sınıf bitirildi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function deleteClass(id) {
    if (!window.confirm('Bu sınıfı silmek istediğine emin misin? Sınıfa bağlı öğrenci ve ödev kayıtları da kaldırılır.')) return;
    try {
      var result = await getClient()
        .from('teacher_classes')
        .delete()
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.classes = state.classes.filter(function(item) { return String(item.id) !== String(id); });
      state.students = state.students.filter(function(item) { return String(item.class_id) !== String(id); });
      state.assignments = state.assignments.filter(function(item) { return String(item.class_id) !== String(id); });
      renderAll();
      toast('Sınıf silindi.');
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

  async function createParentCodeForStudent(id) {
    try {
      var result = await getClient().rpc('create_teacher_parent_code', {
        p_student_membership_id: id,
        p_max_uses: 2,
      });
      if (result.error) throw result.error;
      var row = result.data || {};
      if (row.code && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(row.code).catch(function() {});
      }
      var box = qs('teacherParentCodeBox');
      if (box) {
        box.classList.add('show');
        box.innerHTML = 'Veli bağlantı kodu: <strong>' + esc(row.code || '') + '</strong> <button class="teacher-mini-btn primary" type="button" data-copy-parent-code="' + esc(row.code || '') + '">Kopyala</button>';
      }
      toast('Veli kodu oluşturuldu: ' + (row.code || 'Kod alındı'));
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function updateParentLinkReview(linkId, reviewStatus) {
    try {
      var approved = reviewStatus === 'approved';
      var result = await getClient().rpc('review_parent_student_link', {
        p_link_id: linkId,
        p_review: approved ? 'approved' : 'rejected',
      });
      if (result.error) throw result.error;
      toast(approved ? 'Veli bağlantısı onaylandı.' : 'Veli bağlantısı reddedildi.');
      await loadTeacherData();
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
    if (sameId(message.recipient_id, getTeacherId()) && message.status !== 'read') {
      try {
        var result = await getClient()
          .from('panel_messages')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('id', message.id)
          .eq('recipient_id', getTeacherId());
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
    var mine = sameId(message.sender_id, getTeacherId());
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
    var recipientId = sameId(message.sender_id, getTeacherId()) ? message.recipient_id : message.sender_id;
    try {
      var result = await getClient().from('panel_messages').insert({
        sender_id: getTeacherId(),
        sender_role: 'teacher',
        recipient_id: recipientId,
        related_student_profile_id: message.related_student_profile_id || null,
        class_id: message.class_id || null,
        subject: message.subject && /^Re:/i.test(message.subject) ? message.subject : 'Re: ' + (message.subject || 'Mesaj'),
        body: body,
      });
      if (result.error) throw result.error;
      toast('Cevap gönderildi.');
      await loadTeacherData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendTeacherMessage(event) {
    event.preventDefault();
    if (!isTeacherApproved()) {
      toast('Mesaj göndermek için yönetici onayı bekleniyor.', 'error');
      return;
    }
    var target = qs('teacherMessageTarget') ? qs('teacherMessageTarget').value : 'all_students';
    var studentId = qs('teacherMessageStudent') ? qs('teacherMessageStudent').value : '';
    var subject = clean(qs('teacherMessageSubject') && qs('teacherMessageSubject').value);
    var body = clean(qs('teacherMessageBody') && qs('teacherMessageBody').value);
    if (!body) {
      toast('Mesaj metni gerekli.', 'error');
      return;
    }
    var recipients = [];
    var relatedStudent = null;
    var seenRecipients = {};
    function addRecipient(recipientId, studentId, classId) {
      if (!recipientId) return;
      var key = String(recipientId) + ':' + String(studentId || '') + ':' + String(classId || '');
      if (seenRecipients[key]) return;
      seenRecipients[key] = true;
      recipients.push({ recipient_id: recipientId, student_id: studentId || null, class_id: classId || null });
    }
    if (target === 'all_students') {
      state.students.filter(function(item) { return item.student_profile_id && item.status !== 'removed'; }).forEach(function(item) {
        addRecipient(item.student_profile_id, item.student_profile_id, item.class_id);
      });
    } else if (target === 'all_parents') {
      state.parentLinks.filter(function(item) { return item.parent_id && item.status === 'active'; }).forEach(function(item) {
        addRecipient(item.parent_id, item.student_profile_id, item.class_id);
      });
    } else if (target === 'all_students_and_parents') {
      state.students.filter(function(item) { return item.student_profile_id && item.status !== 'removed'; }).forEach(function(item) {
        addRecipient(item.student_profile_id, item.student_profile_id, item.class_id);
      });
      state.parentLinks.filter(function(item) { return item.parent_id && item.status === 'active'; }).forEach(function(item) {
        addRecipient(item.parent_id, item.student_profile_id, item.class_id);
      });
    } else {
      relatedStudent = state.students.find(function(item) { return String(item.id) === String(studentId); }) || null;
      if (target === 'student' && relatedStudent && relatedStudent.student_profile_id) {
        addRecipient(relatedStudent.student_profile_id, relatedStudent.student_profile_id, relatedStudent.class_id);
      }
      if ((target === 'parents_of_student' || target === 'student_and_parents') && relatedStudent) {
        if (target === 'student_and_parents' && relatedStudent.student_profile_id) {
          addRecipient(relatedStudent.student_profile_id, relatedStudent.student_profile_id, relatedStudent.class_id);
        }
        state.parentLinks.filter(function(item) {
          return String(item.student_membership_id) === String(relatedStudent.id) && item.parent_id && item.status === 'active';
        }).forEach(function(item) {
          addRecipient(item.parent_id, item.student_profile_id, item.class_id);
        });
      }
    }
    if (!recipients.length) {
      toast('Bu seçim için bağlı alıcı bulunamadı.', 'error');
      return;
    }
    try {
      var payload = recipients.map(function(item) {
        return {
          sender_id: getTeacherId(),
          sender_role: 'teacher',
          recipient_id: item.recipient_id,
          related_student_profile_id: item.student_id || null,
          class_id: item.class_id || null,
          subject: subject,
          body: body,
        };
      });
      var result = await getClient().from('panel_messages').insert(payload);
      if (result.error) throw result.error;
      if (qs('teacherMessageForm')) qs('teacherMessageForm').reset();
      toast(payload.length + ' alıcıya mesaj gönderildi.');
      await loadTeacherData();
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function sendAssignmentReminder(assignmentId) {
    var assignment = state.assignments.find(function(item) { return String(item.id) === String(assignmentId); }) || null;
    if (!assignment) return;
    var rows = getAssignmentProgressRows(assignment).filter(function(row) {
      return !row.progress || row.progress.status !== 'completed';
    });
    if (!rows.length) {
      toast('Bu ödevi tüm öğrenciler tamamlamış.');
      return;
    }
    var recipients = [];
    var seen = {};
    function addRecipient(student, recipientId, role) {
      if (!recipientId) return;
      var key = String(recipientId) + ':' + String(student.id);
      if (seen[key]) return;
      seen[key] = true;
      recipients.push({
        student: student,
        recipientId: recipientId,
        role: role,
      });
    }
    rows.forEach(function(row) {
      var student = row.student;
      addRecipient(student, student.student_profile_id, 'student');
      state.parentLinks.filter(function(link) {
        return String(link.student_membership_id) === String(student.id)
          && link.parent_id
          && link.status === 'active'
          && (link.teacher_review_status === 'approved' || link.teacher_review_status === 'not_required');
      }).forEach(function(link) {
        addRecipient(student, link.parent_id, 'parent');
      });
    });
    if (!recipients.length) {
      toast('Hatırlatma gönderilecek öğrenci veya veli hesabı bulunamadı.', 'error');
      return;
    }
    var dueText = assignment.due_at ? formatDate(assignment.due_at) : 'Bitiş tarihi yok';
    var payload = recipients.map(function(item) {
      var studentName = item.student.display_name || 'Öğrenci';
      var body = item.role === 'parent'
        ? studentName + ' için "' + assignment.title + '" ödevi henüz tamamlanmadı. Bitiş tarihi: ' + dueText + '. Lütfen ödevler bölümünden kontrol edin.'
        : '"' + assignment.title + '" ödevin henüz tamamlanmadı. Bitiş tarihi: ' + dueText + '. Lütfen görevler bölümünden kontrol et.';
      return {
        sender_id: getTeacherId(),
        sender_role: 'teacher',
        recipient_id: item.recipientId,
        related_student_profile_id: item.student.student_profile_id || null,
        class_id: assignment.class_id,
        subject: 'Ödev Hatırlatma: ' + assignment.title,
        body: body,
      };
    });
    try {
      var result = await getClient().from('panel_messages').insert(payload);
      if (result.error) throw result.error;
      toast(rows.length + ' öğrenci için ' + payload.length + ' hatırlatma gönderildi.');
      await loadTeacherData();
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

  async function deleteAssignment(id) {
    if (!window.confirm('Bu ödevi tamamen silmek istediğine emin misin?')) return;
    try {
      var result = await getClient()
        .from('teacher_assignments')
        .delete()
        .eq('id', id)
        .eq('teacher_id', getTeacherId());
      if (result.error) throw result.error;
      state.assignments = state.assignments.filter(function(item) { return String(item.id) !== String(id); });
      state.progress = state.progress.filter(function(item) { return String(item.assignment_id) !== String(id); });
      renderAll();
      toast('Ödev silindi.');
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

  async function signOutTeacher(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    var button = resolveActionButton(event, '[data-teacher-logout]', 'logoutBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Çıkılıyor...';
    }
    var timeout = new Promise(function(resolve) {
      window.setTimeout(resolve, 1800);
    });
    try {
      if (window.kemalUserAuth && typeof window.kemalUserAuth.signOut === 'function') {
        await Promise.race([window.kemalUserAuth.signOut(), timeout]);
      }
    } catch (error) {
      // Fallback aşağıda Supabase oturumunu doğrudan kapatır.
    }
    try {
      await Promise.race([getClient().auth.signOut(), timeout]);
    } catch (error) {
      // Yönlendirme yine de yapılır; giriş sayfası oturum durumunu tekrar kontrol eder.
    }
    window.location.assign('/giris.html');
  }

  async function sendPasswordReset() {
    var email = state.user && state.user.email ? state.user.email : '';
    if (!email) {
      toast('Şifre yenileme maili için hesap e-postası bulunamadı.', 'error');
      return;
    }
    try {
      var redirectTo = window.location.origin + '/admin/reset-password.html';
      var result = await getClient().auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
      if (result.error) throw result.error;
      toast('Şifre yenileme bağlantısı e-posta adresine gönderildi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function handleAvatarFile(event) {
    var file = event && event.target && event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) return;
    try {
      state.avatarDraft = await resizeAvatarFile(file);
      paintAvatar(qs('teacherHeroAvatar'), state.profile || {});
      paintAvatar(qs('teacherAccountAvatar'), state.profile || {});
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function saveTeacherProfile(event) {
    event.preventDefault();
    if (!state.profile) return;
    var fullName = qs('accountName') ? qs('accountName').value.trim() : '';
    var school = qs('accountSchool') ? qs('accountSchool').value.trim() : '';
    try {
      var payload = {
        full_name: fullName || state.profile.full_name || '',
        school_name: school,
        avatar_url: state.avatarDraft || state.profile.avatar_url || '',
      };
      var result = await getClient()
        .from('user_profiles')
        .update(payload)
        .eq('id', getTeacherId())
        .select('id,role,approval_status,active,full_name,school_name,email,avatar_url,verification_status,verification_file_path,verification_file_name,verification_review_note')
        .single();
      if (result.error) throw result.error;
      state.profile = result.data || Object.assign({}, state.profile, payload);
      state.avatarDraft = '';
      renderAccount();
      toast('Profil bilgileri güncellendi.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    }
  }

  async function handleVerificationUpload() {
    var input = qs('teacherVerificationFilePanel');
    var file = input && input.files && input.files[0] ? input.files[0] : null;
    if (!file) {
      toast('Lütfen öğretmen kimliği veya çalışma belgesi seç.', 'error');
      return;
    }
    var btn = qs('uploadVerificationBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Yükleniyor...';
    }
    try {
      await uploadVerificationFile(file);
      if (input) input.value = '';
      await loadProfile();
      renderAll();
      toast('Belge gönderildi. Yönetici onayı bekleniyor.');
    } catch (error) {
      toast(humanizeError(error), 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Belgeyi Gönder';
      }
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

  function getStudentByProfileId(profileId) {
    return state.students.find(function(item) {
      return String(item.student_profile_id || '') === String(profileId || '') && item.status !== 'removed';
    }) || null;
  }

  function getRemoteProgressById(id) {
    return state.studentProgress.find(function(row) {
      return String(row.id) === String(id);
    }) || null;
  }

  function openTeacherExamKarne(id) {
    var row = getRemoteProgressById(id);
    var student = getStudentByProfileId(row && row.user_id);
    var meta = getRemoteMeta(row);
    if (!student || !meta.resultSnapshot) {
      toast('Bu öğrenci için sınav karnesi bulunamadı.', 'error');
      return;
    }
    localStorage.setItem(EXAM_KARNE_KEY, JSON.stringify(meta.resultSnapshot));
    window.location.href = '/sinav_sitesi/sinav.html?adminKarne=1';
  }

  function openTeacherReadingKarne(id) {
    var row = getRemoteProgressById(id);
    var student = getStudentByProfileId(row && row.user_id) || {};
    var meta = getRemoteMeta(row);
    var result = meta.readingResult || null;
    if (!student.id || !result) {
      toast('Bu öğrenci için okuma karnesi bulunamadı.', 'error');
      return;
    }
    sessionStorage.setItem('okuma_metin', JSON.stringify({
      id: result.metin_id || row.content_id,
      baslik: result.metin_adi || row.title,
      kelime_sayisi: result.kelime_sayisi || meta.wordCount || 0,
      hedef_hiz: result.hedef_hiz || meta.targetWpm || 0,
      sorular: [],
    }));
    sessionStorage.setItem('okuma_kullanici', JSON.stringify({
      ad: result.ad || student.display_name || '',
      soyad: result.soyad || '',
      sinif: result.sinif || '',
      sube: result.sube || '',
      accountUid: row.user_id || '',
      email: student.email || '',
    }));
    sessionStorage.setItem('okuma_sure_sn', String(result.okuma_suresi_sn || meta.durationSeconds || 0));
    sessionStorage.setItem('okuma_wpm', String(result.dakika_kelime || meta.wpm || 0));
    sessionStorage.setItem('okuma_cevaplar', JSON.stringify({
      dogru: result.dogru_sayisi || meta.correct || 0,
      yanlis: result.yanlis_sayisi || meta.wrong || 0,
      detay: [],
    }));
    sessionStorage.setItem('okuma_attempt_id', meta.attemptId || 'teacher_panel_' + Date.now());
    window.location.href = '/hizli-okuma/karne.html';
  }

  function bindEvents() {
    var classForm = qs('classForm');
    var studentForm = qs('studentForm');
    var assignmentForm = qs('assignmentForm');
    var profileForm = qs('teacherProfileForm');
    var messageForm = qs('teacherMessageForm');
    if (classForm) classForm.addEventListener('submit', saveClass);
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    if (assignmentForm) assignmentForm.addEventListener('submit', saveAssignment);
    if (profileForm) profileForm.addEventListener('submit', saveTeacherProfile);
    if (messageForm) messageForm.addEventListener('submit', sendTeacherMessage);
    if (qs('accountAvatarButton')) qs('accountAvatarButton').addEventListener('click', function() {
      if (qs('accountAvatarInput')) qs('accountAvatarInput').click();
    });
    if (qs('accountAvatarInput')) qs('accountAvatarInput').addEventListener('change', handleAvatarFile);
    if (qs('refreshBtn')) qs('refreshBtn').addEventListener('click', refreshTeacherPanel);
    if (qs('deactivateAccountBtn')) qs('deactivateAccountBtn').addEventListener('click', function() {
      updateAccountStatus('deactivate');
    });
    if (qs('requestDeleteBtn')) qs('requestDeleteBtn').addEventListener('click', function() {
      updateAccountStatus('delete');
    });
    if (qs('teacherPasswordResetBtn')) qs('teacherPasswordResetBtn').addEventListener('click', sendPasswordReset);
    if (qs('uploadVerificationBtn')) qs('uploadVerificationBtn').addEventListener('click', handleVerificationUpload);
    if (qs('logoutBtn')) qs('logoutBtn').addEventListener('click', signOutTeacher);
    if (qs('assignmentClass')) qs('assignmentClass').addEventListener('change', function() {
      fillAssignmentStudents();
      updateAssignmentWarning();
    });
    if (qs('assignmentUrl')) qs('assignmentUrl').addEventListener('input', function() {
      state.selectedAssignmentItem = null;
      updateAssignmentWarning();
    });
    if (qs('assignmentSavedContent')) qs('assignmentSavedContent').addEventListener('change', function(event) {
      var record = event.target.value ? findSavedRecord(event.target.value) : null;
      selectAssignmentItem(record);
    });
    ['librarySearch', 'libraryTypeFilter', 'libraryGradeFilter'].forEach(function(id) {
      var el = qs(id);
      if (!el) return;
      el.addEventListener(id === 'librarySearch' ? 'input' : 'change', renderLibrary);
    });
    window.addEventListener('kemal-content-progress-changed', function() {
      renderSavedContent();
      renderLibrary();
    });
    if (qs('assignmentTarget')) qs('assignmentTarget').addEventListener('change', function(event) {
      qs('assignmentStudentsWrap').style.display = event.target.value === 'students' ? 'block' : 'none';
    });
    document.addEventListener('click', function(event) {
      var target = event.target;
      if (!target) return;
      var tabTarget = target.closest ? target.closest('[data-tab]') : null;
      if (tabTarget && tabTarget.dataset.tab) {
        document.querySelectorAll('.teacher-tab').forEach(function(btn) {
          btn.classList.toggle('active', btn.dataset.tab === tabTarget.dataset.tab);
        });
        document.querySelectorAll('.teacher-section').forEach(function(section) {
          section.classList.toggle('active', section.id === 'section-' + tabTarget.dataset.tab);
        });
      }
      var messageTab = target.closest ? target.closest('[data-message-tab]') : null;
      if (messageTab) {
        state.messageTab = messageTab.dataset.messageTab || 'inbox';
        state.activeMessageId = '';
        renderMessages();
      }
      var refreshButton = target.closest ? target.closest('[data-teacher-refresh]') : null;
      var logoutButton = target.closest ? target.closest('[data-teacher-logout]') : null;
      if (refreshButton) refreshTeacherPanel(event);
      if (logoutButton) signOutTeacher(event);
      if (target.dataset.copyCode) copyCode(target.dataset.copyCode);
      if (target.dataset.archiveClass) archiveClass(target.dataset.archiveClass);
      if (target.dataset.completeClass) completeClass(target.dataset.completeClass);
      if (target.dataset.deleteClass) deleteClass(target.dataset.deleteClass);
      if (target.dataset.removeStudent) removeStudent(target.dataset.removeStudent);
      if (target.dataset.parentCode) createParentCodeForStudent(target.dataset.parentCode);
      if (target.dataset.copyParentCode) copyCode(target.dataset.copyParentCode);
      if (target.dataset.reviewParentLink) updateParentLinkReview(target.dataset.reviewParentLink, target.dataset.reviewStatus);
      if (target.dataset.messageOpen) openPanelMessage(target.dataset.messageOpen);
      if (target.dataset.messageDelete) deletePanelMessage(target.dataset.messageDelete);
      if (target.dataset.messageReply) replyPanelMessage(target.dataset.messageReply);
      if (target.dataset.showAssignmentDetails) {
        state.activeAssignmentDetailsId = String(state.activeAssignmentDetailsId) === String(target.dataset.showAssignmentDetails)
          ? ''
          : target.dataset.showAssignmentDetails;
        renderAssignments();
      }
      if (target.dataset.remindAssignment) sendAssignmentReminder(target.dataset.remindAssignment);
      if (target.dataset.archiveAssignment) archiveAssignment(target.dataset.archiveAssignment);
      if (target.dataset.deleteAssignment) deleteAssignment(target.dataset.deleteAssignment);
      if (target.dataset.assignLibrary) selectAssignmentItem(findLibraryItem(target.dataset.assignLibrary));
      if (target.dataset.assignSaved) selectAssignmentItem(findSavedRecord(target.dataset.assignSaved));
      if (target.dataset.assignLiked) selectAssignmentItem(findLikedRecord(target.dataset.assignLiked));
      if (target.dataset.showStudentReports) {
        var nextReportStudentId = target.dataset.showStudentReports;
        state.activeReportStudentId = String(state.activeReportStudentId) === String(nextReportStudentId) ? '' : nextReportStudentId;
        if (state.activeReportStudentId) {
          var reportStudent = state.students.find(function(item) {
            return String(item.id) === String(state.activeReportStudentId);
          });
          var reportRecords = getProgressForStudent(reportStudent || {});
          var hasExamReport = reportRecords.some(function(row) {
            return row.content_type === 'exam' && getRemoteMeta(row).resultSnapshot;
          });
          var hasReadingReport = reportRecords.some(function(row) {
            return row.content_type === 'reading' && getRemoteMeta(row).readingResult;
          });
          if (!hasExamReport && hasReadingReport) state.activeReportTab = 'reading';
          if (hasExamReport && !hasReadingReport) state.activeReportTab = 'exam';
        }
        renderReports();
      }
      var reportTab = target.closest ? target.closest('[data-student-report-tab]') : null;
      if (reportTab) {
        state.activeReportTab = reportTab.dataset.studentReportTab === 'reading' ? 'reading' : 'exam';
        renderReports();
      }
      if (target.dataset.teacherExamKarne) openTeacherExamKarne(target.dataset.teacherExamKarne);
      if (target.dataset.teacherReadingKarne) openTeacherReadingKarne(target.dataset.teacherReadingKarne);
    });
  }

  async function init() {
    fillGradeSelects();
    bindEvents();
    if (qs('assignmentStart')) qs('assignmentStart').value = todayIso();
    try {
      var ok = await loadProfile();
      if (ok && isTeacherApproved()) {
        await Promise.all([loadTeacherData(), loadLibraryItems()]);
      } else if (ok) {
        renderAll();
      }
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
