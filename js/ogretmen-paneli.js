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
  var READING_KARNE_KEY = 'kemal_hizli_okuma_karne_result_v1';
  var state = {
    user: null,
    profile: null,
    classes: [],
    students: [],
    assignments: [],
    progress: [],
    merit: [],
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
    var name = clean(profile && (profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ')));
    if (!name && state.user) name = state.user.email || '';
    var parts = name.split(/\s+/).filter(Boolean);
    var first = parts[0] ? parts[0].charAt(0) : 'Ö';
    var second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + second).toLocaleUpperCase('tr-TR');
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
    box.innerHTML = '<table class="teacher-table"><thead><tr><th>Öğrenci</th><th>Sınıf</th><th>Durum</th><th></th></tr></thead><tbody>' +
      students.map(function(item) {
        var classRow = getClassById(item.class_id);
        return '<tr>' +
          '<td>' + esc(item.display_name) + '<div class="teacher-row-sub">' + esc(item.email || item.student_no || 'Manuel kayıt') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf bulunamadı') + '</td>' +
          '<td><span class="teacher-pill ok">' + esc(getAssignmentStatusLabel(item.status || 'active')) + '</span></td>' +
          '<td><button class="teacher-mini-btn danger" type="button" data-remove-student="' + esc(item.id) + '">Çıkar</button></td>' +
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
      var targets = getAssignmentTargets(item);
      var completed = state.progress.filter(function(row) {
        return String(row.assignment_id) === String(item.id) && row.status === 'completed';
      }).length;
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
        '</div>' +
        '<div class="teacher-row-actions">' +
          refLink +
          '<span class="teacher-pill ' + (ratio >= 80 ? 'ok' : 'warn') + '">' + esc(getAssignmentStatusLabel(item.status)) + '</span>' +
          '<button class="teacher-mini-btn danger" type="button" data-archive-assignment="' + esc(item.id) + '">Arşivle</button>' +
          '<button class="teacher-mini-btn danger" type="button" data-delete-assignment="' + esc(item.id) + '">Sil</button>' +
        '</div>' +
      '</div>';
    }).join('');
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

  function latestProgressWith(student, predicate) {
    return getProgressForStudent(student).find(function(row) {
      return predicate(row, getRemoteMeta(row));
    }) || null;
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
    var latestExam = latestProgressWith(student, function(row, meta) {
      return row.content_type === 'exam' && meta.resultSnapshot;
    });
    var latestReading = latestProgressWith(student, function(row, meta) {
      return row.content_type === 'reading' && meta.readingResult;
    });
    var buttons = [];
    if (latestExam) {
      buttons.push('<button class="teacher-mini-btn primary" type="button" data-teacher-exam-karne="' + esc(latestExam.id) + '">Sınav Karnesi</button>');
    }
    if (latestReading) {
      buttons.push('<button class="teacher-mini-btn primary" type="button" data-teacher-reading-karne="' + esc(latestReading.id) + '">Okuma Karnesi</button>');
    }
    return buttons.length ? buttons.join(' ') : '<span class="teacher-pill warn">Karne verisi yok</span>';
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
        var teacherEventMerit = state.merit.filter(function(row) {
          return String(row.student_membership_id) === String(student.id);
        }).reduce(function(total, row) {
          return total + Number(row.points || 0);
        }, 0);
        var cachedMerit = Number(student.merit_points || 0);
        var merit = cachedMerit > 0 ? cachedMerit : teacherEventMerit;
        var records = getProgressForStudent(student);
        var exams = records.filter(isCompletedExam).length;
        var readings = records.filter(isCompletedReading).length;
        var registered = student.student_profile_id ? 'Kayıtlı' : 'Manuel';
        return '<tr>' +
          '<td>' + esc(student.display_name) + '<div class="teacher-row-sub">' + esc(student.email || student.student_no || '') + '</div></td>' +
          '<td>' + esc(classRow ? classRow.name : 'Sınıf yok') + '</td>' +
          '<td><span class="teacher-pill ' + (student.student_profile_id ? 'ok' : 'warn') + '">' + esc(registered) + '</span></td>' +
          '<td>' + done + ' / ' + assigned.length + '</td>' +
          '<td><span class="teacher-pill ok">' + merit + ' puan</span></td>' +
          '<td>' + exams + ' sınav · ' + readings + ' okuma</td>' +
          '<td><div class="teacher-row-actions">' + renderStudentReportActions(student) + '</div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderAll() {
    renderApprovalState();
    fillClassSelects();
    renderStats();
    renderClasses();
    renderStudents();
    renderAssignments();
    renderReports();
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
      var studentProgressResult = await getClient()
        .from('user_content_progress')
        .select('*')
        .in('user_id', profileIds)
        .order('updated_at', { ascending: false })
        .limit(1000);
      if (studentProgressResult.error) throw studentProgressResult.error;
      state.studentProgress = studentProgressResult.data || [];
    } else {
      state.studentProgress = [];
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

  async function refreshData() {
    try {
      await Promise.all([loadTeacherData(), loadLibraryItems()]);
    } catch (error) {
      toast(humanizeError(error), 'error');
      renderAll();
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
      return String(item.student_profile_id || '') === String(profileId || '');
    }) || null;
  }

  function getRemoteProgressById(id) {
    return state.studentProgress.find(function(row) {
      return String(row.id) === String(id);
    }) || null;
  }

  function openTeacherExamKarne(id) {
    var row = getRemoteProgressById(id);
    var meta = getRemoteMeta(row);
    if (!meta.resultSnapshot) {
      toast('Bu öğrenci için sınav karnesi bulunamadı.', 'error');
      return;
    }
    localStorage.setItem(EXAM_KARNE_KEY, JSON.stringify(meta.resultSnapshot));
    window.location.href = '/sinav_sitesi/sinav.html?adminKarne=1';
  }

  function openTeacherReadingKarne(id) {
    var row = getRemoteProgressById(id);
    var meta = getRemoteMeta(row);
    var result = meta.readingResult || null;
    if (!result) {
      toast('Bu öğrenci için okuma karnesi bulunamadı.', 'error');
      return;
    }
    var student = getStudentByProfileId(row.user_id) || {};
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
    if (classForm) classForm.addEventListener('submit', saveClass);
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    if (assignmentForm) assignmentForm.addEventListener('submit', saveAssignment);
    if (profileForm) profileForm.addEventListener('submit', saveTeacherProfile);
    if (qs('accountAvatarButton')) qs('accountAvatarButton').addEventListener('click', function() {
      if (qs('accountAvatarInput')) qs('accountAvatarInput').click();
    });
    if (qs('accountAvatarInput')) qs('accountAvatarInput').addEventListener('change', handleAvatarFile);
    if (qs('refreshBtn')) qs('refreshBtn').addEventListener('click', refreshData);
    if (qs('deactivateAccountBtn')) qs('deactivateAccountBtn').addEventListener('click', function() {
      updateAccountStatus('deactivate');
    });
    if (qs('requestDeleteBtn')) qs('requestDeleteBtn').addEventListener('click', function() {
      updateAccountStatus('delete');
    });
    if (qs('teacherPasswordResetBtn')) qs('teacherPasswordResetBtn').addEventListener('click', sendPasswordReset);
    if (qs('uploadVerificationBtn')) qs('uploadVerificationBtn').addEventListener('click', handleVerificationUpload);
    if (qs('logoutBtn')) qs('logoutBtn').addEventListener('click', async function() {
      await getClient().auth.signOut();
      window.location.href = '/giris.html';
    });
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
      if (target.dataset.completeClass) completeClass(target.dataset.completeClass);
      if (target.dataset.deleteClass) deleteClass(target.dataset.deleteClass);
      if (target.dataset.removeStudent) removeStudent(target.dataset.removeStudent);
      if (target.dataset.archiveAssignment) archiveAssignment(target.dataset.archiveAssignment);
      if (target.dataset.deleteAssignment) deleteAssignment(target.dataset.deleteAssignment);
      if (target.dataset.assignLibrary) selectAssignmentItem(findLibraryItem(target.dataset.assignLibrary));
      if (target.dataset.assignSaved) selectAssignmentItem(findSavedRecord(target.dataset.assignSaved));
      if (target.dataset.assignLiked) selectAssignmentItem(findLikedRecord(target.dataset.assignLiked));
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
