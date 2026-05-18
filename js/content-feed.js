(function() {
  'use strict';

  var cachePromise = null;
  var CACHE_TTL_MS = 2 * 60 * 1000;
  var cacheExpiresAt = 0;

  var GRADE_META = {
    1: { label: '1. Sınıf', color: '#FF7A59', soft: '#FFF1EC', border: '#FFD7CB' },
    2: { label: '2. Sınıf', color: '#FF9F43', soft: '#FFF5EA', border: '#FFD8B1' },
    3: { label: '3. Sınıf', color: '#00B894', soft: '#EAFBF6', border: '#BAF0E3' },
    4: { label: '4. Sınıf', color: '#3B82F6', soft: '#EDF5FF', border: '#CFE2FF' },
    5: { label: '5. Sınıf', color: '#6C3DED', soft: '#F1ECFF', border: '#D9CBFF' },
    6: { label: '6. Sınıf', color: '#7C3AED', soft: '#F4EEFF', border: '#DDCEFF' },
    7: { label: '7. Sınıf', color: '#8B5CF6', soft: '#F5F0FF', border: '#E2D4FF' },
    8: { label: '8. Sınıf', color: '#EC4899', soft: '#FFF0F7', border: '#FFD0E7' },
  };

  var SUBJECT_META = {
    'okuma-anlama': { label: 'Okuma Anlama', icon: '📖' },
    turkce: { label: 'Türkçe', icon: '📝' },
    matematik: { label: 'Matematik', icon: '🔢' },
    'hayat-bilgisi': { label: 'Hayat Bilgisi', icon: '🌱' },
    'fen-bilimleri': { label: 'Fen Bilimleri', icon: '🔬' },
    'sosyal-bilgiler': { label: 'Sosyal Bilgiler', icon: '🌍' },
    deneme: { label: 'Deneme', icon: '🧠' },
    agisler: { label: 'Agisler', icon: '🧩' },
    oyun: { label: 'Oyunlar', icon: '🎮' },
  };

  var SUBJECT_ALIASES = {
    'okuma anlama': 'okuma-anlama',
    'okuma-anlama': 'okuma-anlama',
    okuma_anlama: 'okuma-anlama',
    turkce: 'turkce',
    'türkçe': 'turkce',
    matematik: 'matematik',
    'hayat bilgisi': 'hayat-bilgisi',
    'hayat-bilgisi': 'hayat-bilgisi',
    hayat_bilgisi: 'hayat-bilgisi',
    'fen bilimleri': 'fen-bilimleri',
    'fen-bilimleri': 'fen-bilimleri',
    fen_bilimleri: 'fen-bilimleri',
    'sosyal bilgiler': 'sosyal-bilgiler',
    'sosyal-bilgiler': 'sosyal-bilgiler',
    sosyal_bilgiler: 'sosyal-bilgiler',
    deneme: 'deneme',
    agisler: 'agisler',
    oyun: 'oyun',
    oyunlar: 'oyun',
  };

  var GAME_STORAGE_KEY = 'kemal_oyunlar';

  var GAME_ICON_MAP = {
    cube: '🧊',
    dice: '🎲',
    music: '🎵',
    numbers: '🔢',
    calculator: '🧮',
    trophy: '🏆',
    plus: '➕',
    globe: '🌍',
    clock: '🕒',
    lira: '₺',
    scale: '⚖️',
    paddle: '🏓',
    memory: '🧠',
    train: '🚂',
    shadow: '🕵️',
    robot: '🤖',
    gamepad: '🎮',
  };

  var GAME_COLOR_PALETTES = {
    purple: { label: 'Oyunlar', color: '#6C3DED', soft: '#F1ECFF', border: '#D9CBFF' },
    coral: { label: 'Oyunlar', color: '#FF6052', soft: '#FFF0EC', border: '#FFD0C6' },
    orange: { label: 'Oyunlar', color: '#FF8A2A', soft: '#FFF4E9', border: '#FFD9B5' },
    green: { label: 'Oyunlar', color: '#00A891', soft: '#E8FFF9', border: '#B7F0E6' },
    yellow: { label: 'Oyunlar', color: '#D69B00', soft: '#FFF8DD', border: '#FFE7A5' },
    blue: { label: 'Oyunlar', color: '#0B78E3', soft: '#ECF6FF', border: '#C8E4FF' },
    pink: { label: 'Oyunlar', color: '#D7337A', soft: '#FFF0F7', border: '#FFD0E7' },
  };

  var CONTENT_TYPE_META = {
    reading: {
      label: 'Okuma Parçası',
      icon: '📖',
      color: '#6C3DED',
      soft: '#F1ECFF',
      border: '#D9CBFF',
      gradient: 'linear-gradient(135deg,#6C3DED,#8B5CF6)',
    },
    exam: {
      label: 'Sınav',
      icon: '📋',
      color: '#D35400',
      soft: '#FFF0EC',
      border: '#FFD0C6',
      gradient: 'linear-gradient(135deg,#FF6052,#FF9F43)',
    },
    document: {
      label: 'Doküman',
      icon: '📄',
      color: '#00856A',
      soft: '#E9FFFA',
      border: '#B7F0E6',
      gradient: 'linear-gradient(135deg,#00A891,#00C9B1)',
    },
    video: {
      label: 'Ders Videosu',
      icon: '🎬',
      color: '#0B78E3',
      soft: '#ECF6FF',
      border: '#C8E4FF',
      gradient: 'linear-gradient(135deg,#0B78E3,#4CC9F0)',
    },
    game: {
      label: 'Oyun',
      icon: '🎮',
      color: '#B7791F',
      soft: '#FFF8DD',
      border: '#FFE7A5',
      gradient: 'linear-gradient(135deg,#FFD93D,#FF9F43)',
    },
    content: {
      label: 'Yeni İçerik',
      icon: '🌟',
      color: '#6C3DED',
      soft: '#F1ECFF',
      border: '#D9CBFF',
      gradient: 'linear-gradient(135deg,#6C3DED,#4CC9F0)',
    },
  };

  function getSiteStore() {
    return window.kemalSiteStore || null;
  }

  function getReadingConfig() {
    if (!getSiteStore()) {
      return null;
    }
    return typeof getSiteStore().getReadingConfig === 'function'
      ? getSiteStore().getReadingConfig()
      : getSiteStore().getConfig();
  }

  function getDocumentsConfig() {
    if (!getSiteStore()) {
      return null;
    }
    return typeof getSiteStore().getDocumentsConfig === 'function'
      ? getSiteStore().getDocumentsConfig()
      : getSiteStore().getConfig();
  }

  function buildHeaders(config) {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: 'Bearer ' + config.supabaseAnonKey,
      'Content-Type': 'application/json',
    };
  }

  async function fetchSupabaseRows(config, table, select, queryParts) {
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
      return [];
    }

    var query = ['select=' + encodeURIComponent(select)];
    (Array.isArray(queryParts) ? queryParts : []).forEach(function(part) {
      if (part) {
        query.push(part);
      }
    });

    var url = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + table + '?' + query.join('&');
    var response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config),
    });

    if (!response.ok) {
      throw new Error(table + ' okunamadi');
    }

    var rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  }

  function normalizeGradeList(item) {
    var list = Array.isArray(item && item.siniflar) ? item.siniflar.slice() : [];
    if ((!list || !list.length) && item && item.sinif !== undefined && item.sinif !== null && item.sinif !== '') {
      list = [item.sinif];
    }
    return list
      .map(function(value) {
        return parseInt(value, 10);
      })
      .filter(function(value) {
        return Number.isFinite(value) && value > 0;
      });
  }

  function normalizeSubjectKey(value) {
    var raw = String(value || '').trim().toLocaleLowerCase('tr-TR');
    return SUBJECT_ALIASES[raw] || raw;
  }

  function getSubjectMeta(subject) {
    return SUBJECT_META[normalizeSubjectKey(subject)] || {
      label: String(subject || 'Genel'),
      icon: '📘',
    };
  }

  function getGradeMeta(grade) {
    return GRADE_META[parseInt(grade, 10)] || {
      label: grade ? String(grade) + '. Sınıf' : 'Genel',
      color: '#6C3DED',
      soft: '#F1ECFF',
      border: '#D9CBFF',
    };
  }

  function getContentTypeMeta(type) {
    return CONTENT_TYPE_META[String(type || '').trim().toLocaleLowerCase('tr-TR')] || CONTENT_TYPE_META.content;
  }

  function getGradeLabels(grades) {
    return (Array.isArray(grades) ? grades : []).map(function(grade) {
      return getGradeMeta(grade).label;
    });
  }

  function getPrimaryGrade(grades) {
    if (!Array.isArray(grades) || !grades.length) {
      return null;
    }
    return grades.slice().sort(function(a, b) {
      return a - b;
    })[0];
  }

  function getTimeValue(rawValue) {
    if (!rawValue) {
      return 0;
    }
    if (typeof rawValue === 'object' && rawValue.seconds) {
      return rawValue.seconds * 1000;
    }
    var parsed = Date.parse(String(rawValue));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function formatIso(rawValue) {
    var value = getTimeValue(rawValue);
    return value ? new Date(value).toISOString() : '';
  }

  function getAccessScope(row) {
    var raw = row && (row.accessScope || row.access_scope || row.visibility || row.access);
    if (row && (row.oturum_gerekli === true || row.authRequired === true || row.requiresAuth === true || row.login_required === true)) {
      return 'registered';
    }
    var value = String(raw || '').trim().toLocaleLowerCase('tr-TR');
    if (value.indexOf('registered') !== -1 || value.indexOf('kayit') !== -1 || value.indexOf('kayıt') !== -1 || value.indexOf('uye') !== -1 || value.indexOf('üye') !== -1 || value.indexOf('auth') !== -1 || value.indexOf('login') !== -1 || value === 'private') {
      return 'registered';
    }
    return 'public';
  }

  function isPublicItem(item) {
    return getAccessScope(item) === 'public';
  }

  function buildReadingItem(row) {
    var grades = normalizeGradeList(row);
    var primaryGrade = getPrimaryGrade(grades);
    var gradeMeta = getGradeMeta(primaryGrade);
    var subjectMeta = getSubjectMeta('okuma-anlama');
    return {
      uid: 'reading:' + row.id,
      type: 'reading',
      id: String(row.id),
      title: row.baslik || 'Hızlı Okuma Metni',
      href: '/hizli-okuma/index.html?metinId=' + encodeURIComponent(row.id),
      grade: primaryGrade,
      grades: grades,
      gradeLabel: getGradeLabels(grades).join(' · ') || gradeMeta.label,
      subject: 'okuma-anlama',
      subjectLabel: subjectMeta.label,
      contentType: 'reading',
      contentTypeLabel: 'Hızlı Okuma',
      icon: getContentTypeMeta('reading').icon,
      sourceLabel: 'Hızlı Okuma',
      contentMeta: getContentTypeMeta('reading'),
      accessScope: getAccessScope(row),
      createdAt: formatIso(row.olusturma_tarihi),
      createdAtValue: getTimeValue(row.olusturma_tarihi),
      palette: gradeMeta,
      statusMeta: window.kemalContentProgress ? window.kemalContentProgress.getStatusMeta({
        type: 'reading',
        id: row.id,
      }) : null,
    };
  }

  function buildDocumentItem(row) {
    var targets = Array.isArray(row.hedefler) ? row.hedefler.map(function(target) {
      return {
        sinif: parseInt(target && target.sinif, 10) || null,
        ders: normalizeSubjectKey(target && target.ders),
      };
    }).filter(function(target) {
      return target.sinif && target.ders;
    }) : [];
    if (!targets.length) {
      targets = [{
        sinif: parseInt(row.sinif, 10) || null,
        ders: normalizeSubjectKey(row.ders),
      }].filter(function(target) {
        return target.sinif && target.ders;
      });
    }
    var primaryTarget = targets[0] || { sinif: row.sinif, ders: row.ders };
    var grades = targets.map(function(target) { return target.sinif; }).filter(Boolean);
    var gradeMeta = getGradeMeta(primaryTarget.sinif);
    var subjectMeta = getSubjectMeta(primaryTarget.ders);
    var isVideo = row.icerik_turu === 'video';
    var typeMeta = getContentTypeMeta(isVideo ? 'video' : 'document');
    return {
      uid: (isVideo ? 'video:' : 'document:') + row.id,
      type: isVideo ? 'video' : 'document',
      id: String(row.id),
      title: row.baslik || (isVideo ? 'Ders Videosu' : 'Doküman'),
      href: '/dokuman.html?id=' + encodeURIComponent(row.id) + '&sinif=' + encodeURIComponent(primaryTarget.sinif || '') + '&ders=' + encodeURIComponent(primaryTarget.ders || ''),
      grade: parseInt(primaryTarget.sinif, 10) || null,
      grades: grades,
      gradeLabel: getGradeLabels(grades).join(' · ') || gradeMeta.label,
      subject: normalizeSubjectKey(primaryTarget.ders),
      subjectLabel: subjectMeta.label,
      contentType: isVideo ? 'video' : 'document',
      contentTypeLabel: isVideo ? 'Ders Videoları' : 'Dokümanlar',
      icon: typeMeta.icon,
      sourceLabel: isVideo ? 'Ders Videosu' : 'Doküman',
      contentMeta: typeMeta,
      accessScope: getAccessScope(row),
      createdAt: formatIso(row.olusturma_tarihi),
      createdAtValue: getTimeValue(row.olusturma_tarihi),
      palette: gradeMeta,
      statusMeta: window.kemalContentProgress ? window.kemalContentProgress.getStatusMeta({
        type: isVideo ? 'video' : 'document',
        id: row.id,
      }) : null,
    };
  }

  function buildExamItem(row, id) {
    var gradeMeta = getGradeMeta(row.grade);
    var subjectMeta = getSubjectMeta(row.subject);
    var typeMeta = getContentTypeMeta('exam');
    return {
      uid: 'exam:' + id,
      type: 'exam',
      id: String(id),
      title: row.title || 'Sınav',
      href: '/sinav_sitesi/index.html?examId=' + encodeURIComponent(id),
      grade: parseInt(row.grade, 10) || null,
      grades: [parseInt(row.grade, 10) || null].filter(Boolean),
      gradeLabel: gradeMeta.label,
      subject: normalizeSubjectKey(row.subject),
      subjectLabel: subjectMeta.label,
      contentType: 'exam',
      contentTypeLabel: 'Sınavlar',
      icon: typeMeta.icon,
      sourceLabel: 'Sınav',
      contentMeta: typeMeta,
      accessScope: getAccessScope(row),
      createdAt: formatIso(row.createdAt),
      createdAtValue: getTimeValue(row.createdAt),
      palette: gradeMeta,
      statusMeta: window.kemalContentProgress ? window.kemalContentProgress.getStatusMeta({
        type: 'exam',
        id: id,
      }) : null,
    };
  }

  function getStoredGames() {
    try {
      var rows = JSON.parse(window.localStorage.getItem(GAME_STORAGE_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return [];
    }
  }

  function getGameTimestamp(row) {
    var explicitValue = getTimeValue(row && (row.createdAt || row.updatedAt || row.tarih));
    if (explicitValue) {
      return explicitValue;
    }
    var idMatch = String(row && row.id || '').match(/(\d{10,})/);
    return idMatch ? Number(idMatch[1]) : 0;
  }

  function getGameHref(row) {
    if (row && row.tip === 'iframe') {
      return '/oyun/iframe-oyun.html?id=' + encodeURIComponent(row.id || '');
    }
    return row && row.url ? row.url : '/oyun/oyunlar.html';
  }

  function normalizeCatalogHref(rawHref) {
    var href = String(rawHref || '').trim();
    if (!href) {
      return '/oyun/oyunlar.html';
    }
    if (/^(https?:)?\/\//i.test(href) || href.charAt(0) === '/') {
      return href;
    }
    return '/oyun/' + href.replace(/^\.?\//, '');
  }

  function textFromElement(parent, selector) {
    var node = parent && parent.querySelector(selector);
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function getGameCategoryLabel(value) {
    var raw = String(value || '').trim();
    var labels = {
      'tümü': 'Oyunlar',
      matematik: 'Matematik',
      'türkçe': 'Türkçe',
      turkce: 'Türkçe',
      fen: 'Fen',
      hayat: 'Hayat Bilgisi',
      strateji: 'Strateji',
      'hafıza': 'Hafıza',
      hafiza: 'Hafıza',
      bulmaca: 'Bulmaca',
    };
    return labels[raw.toLocaleLowerCase('tr-TR')] || raw || 'Oyunlar';
  }

  function buildGameItem(row, index) {
    var grade = row && row.sinif && row.sinif !== 'Tümü' ? parseInt(row.sinif, 10) : null;
    var grades = Number.isFinite(grade) ? [grade] : [];
    var gradeMeta = getGradeMeta(grade);
    var subjectMeta = getSubjectMeta('oyun');
    var timestamp = getGameTimestamp(row);
    var typeMeta = getContentTypeMeta('game');
    return {
      uid: 'game:' + (row.id || index),
      type: 'game',
      id: String(row.id || index),
      title: row.ad || 'Yeni Oyun',
      href: getGameHref(row),
      grade: grade,
      grades: grades,
      gradeLabel: grades.length ? getGradeLabels(grades).join(' · ') : 'Genel',
      subject: 'oyun',
      subjectLabel: subjectMeta.label,
      contentType: 'game',
      contentTypeLabel: 'Oyunlar',
      icon: row.emoji || subjectMeta.icon,
      sourceLabel: 'Oyun',
      contentMeta: typeMeta,
      accessScope: getAccessScope(row),
      createdAt: timestamp ? new Date(timestamp).toISOString() : '',
      createdAtValue: timestamp,
      palette: gradeMeta,
      statusMeta: null,
    };
  }

  function buildStaticGameItem(card, index) {
    var title = textFromElement(card, '.gc-title') || card.getAttribute('data-title') || 'Yeni Oyun';
    var category = getGameCategoryLabel(card.getAttribute('data-cat'));
    var colorKey = card.getAttribute('data-color') || '';
    var iconKey = card.getAttribute('data-icon') || '';
    var timestamp = getTimeValue(card.getAttribute('data-date'));
    var href = normalizeCatalogHref(card.getAttribute('href'));
    var palette = GAME_COLOR_PALETTES[colorKey] || getGradeMeta(null);
    var typeMeta = getContentTypeMeta('game');

    return {
      uid: 'static-game:' + href,
      type: 'game',
      id: href,
      title: title,
      href: href,
      grade: null,
      grades: [],
      gradeLabel: 'Oyunlar',
      subject: 'oyun',
      subjectLabel: category,
      contentType: 'game',
      contentTypeLabel: 'Oyun',
      icon: GAME_ICON_MAP[iconKey] || textFromElement(card, '.gc-banner-em') || '🎮',
      sourceLabel: 'Oyun',
      contentMeta: typeMeta,
      accessScope: getAccessScope({
        accessScope: card.getAttribute('data-access-scope'),
        authRequired: card.getAttribute('data-auth-required') === 'true',
      }),
      createdAt: timestamp ? new Date(timestamp).toISOString() : '',
      createdAtValue: timestamp,
      palette: palette,
      statusMeta: null,
    };
  }

  function dedupeByUidAndHref(items) {
    var seen = {};
    return (Array.isArray(items) ? items : []).filter(function(item) {
      var key = (item.href || item.uid || '') + '|' + (item.title || '');
      if (!item || !item.title || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  async function fetchReadingItems() {
    var config = getReadingConfig();
    var rows;
    try {
      rows = await fetchSupabaseRows(
        config,
        'metinler',
        'id,baslik,sinif,siniflar,aktif,gizli,oturum_gerekli,olusturma_tarihi',
        ['aktif=eq.true', 'order=olusturma_tarihi.desc']
      );
    } catch (error) {
      rows = await fetchSupabaseRows(
        config,
        'metinler',
        'id,baslik,sinif,siniflar,aktif,olusturma_tarihi',
        ['aktif=eq.true', 'order=olusturma_tarihi.desc']
      );
    }
    return rows
      .filter(function(row) {
        return row && row.id && row.gizli !== true;
      })
      .map(buildReadingItem);
  }

  async function fetchDocumentItems() {
    var config = getDocumentsConfig();
    var rows;
    try {
      rows = await fetchSupabaseRows(
        config,
        'dokumanlar',
        'id,baslik,sinif,ders,hedefler,icerik_turu,aktif,gizli,oturum_gerekli,olusturma_tarihi',
        ['aktif=eq.true', 'order=olusturma_tarihi.desc']
      );
    } catch (error) {
      rows = await fetchSupabaseRows(
        config,
        'dokumanlar',
        'id,baslik,sinif,ders,aktif,oturum_gerekli,olusturma_tarihi',
        ['aktif=eq.true', 'order=olusturma_tarihi.desc']
      );
    }
    return rows
      .filter(function(row) {
        return row && row.id && row.gizli !== true;
      })
      .map(buildDocumentItem);
  }

  async function fetchExamItems() {
    var firebaseModule = await import('/sinav_sitesi/js/firebase.js');
    var firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    var snapshot = await firestoreModule.getDocs(
      firestoreModule.query(
        firestoreModule.collection(firebaseModule.db, 'exams'),
        firestoreModule.where('published', '==', true)
      )
    );

    return snapshot.docs
      .filter(function(doc) {
        var data = doc.data() || {};
        return data.hidden !== true && data.gizli !== true;
      })
      .map(function(doc) {
        return buildExamItem(doc.data() || {}, doc.id);
      })
      .filter(function(item) {
        return item && item.id;
      });
  }

  async function fetchGameItems() {
    var storedItems = getStoredGames()
      .filter(function(row) {
        return row && row.aktif !== false && row.ad;
      })
      .map(buildGameItem);

    var staticItems = [];
    if (window.DOMParser && typeof fetch === 'function') {
      try {
        var response = await fetch('/oyun/oyunlar.html', { cache: 'no-store' });
        if (response.ok) {
          var html = await response.text();
          var doc = new DOMParser().parseFromString(html, 'text/html');
          staticItems = Array.prototype.slice.call(doc.querySelectorAll('.game-card[data-date]'))
            .filter(function(card) {
              return card.getAttribute('href') && textFromElement(card, '.gc-title');
            })
            .map(buildStaticGameItem);
        }
      } catch (error) {
        staticItems = [];
      }
    }

    return dedupeByUidAndHref(storedItems.concat(staticItems));
  }

  function sortByNewest(list) {
    return (Array.isArray(list) ? list.slice() : []).sort(function(a, b) {
      return (b.createdAtValue || 0) - (a.createdAtValue || 0);
    });
  }

  function fallbackItemsFromSiteData() {
    var siteData = window.kemalSite && typeof window.kemalSite.getDataSync === 'function'
      ? window.kemalSite.getDataSync()
      : null;
    var items = siteData && Array.isArray(siteData.yeniIcerikler)
      ? siteData.yeniIcerikler.filter(function(item) { return item && item.aktif; })
      : [];

    return items.map(function(item, index) {
      return {
        uid: 'fallback:' + index,
        type: 'content',
        id: String(index + 1),
        title: item.baslik || 'Yeni içerik',
        href: item.link || '#',
        grade: null,
        grades: [],
        gradeLabel: 'Genel',
        subject: 'genel',
        subjectLabel: 'Genel',
        contentType: 'content',
        contentTypeLabel: 'Yeni İçerik',
        icon: item.emoji || '🌟',
        sourceLabel: 'Yeni İçerik',
        contentMeta: getContentTypeMeta('content'),
        accessScope: getAccessScope(item),
        createdAt: formatIso(item.tarih),
        createdAtValue: getTimeValue(item.tarih),
        palette: getGradeMeta(null),
        statusMeta: null,
      };
    });
  }

  async function loadAllItems() {
    var result = await Promise.allSettled([
      fetchReadingItems(),
      fetchDocumentItems(),
      fetchExamItems(),
      fetchGameItems(),
    ]);

    var combined = [];
    result.forEach(function(entry) {
      if (entry.status === 'fulfilled' && Array.isArray(entry.value)) {
        combined = combined.concat(entry.value);
      }
    });

    if (!combined.length) {
      return fallbackItemsFromSiteData();
    }

    return sortByNewest(combined);
  }

  async function getAllItems(options) {
    var forceRefresh = Boolean(options && options.forceRefresh);
    if (!forceRefresh && cachePromise && Date.now() < cacheExpiresAt) {
      return cachePromise;
    }
    cachePromise = loadAllItems().then(function(items) {
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return items;
    }).catch(function(error) {
      cacheExpiresAt = Date.now() + 15 * 1000;
      throw error;
    });
    return cachePromise;
  }

  function matchesGrade(item, grade) {
    if (!grade) {
      return true;
    }
    var safeGrade = parseInt(grade, 10);
    if (!Number.isFinite(safeGrade)) {
      return true;
    }
    return Array.isArray(item.grades)
      ? item.grades.indexOf(safeGrade) !== -1
      : parseInt(item.grade, 10) === safeGrade;
  }

  function matchesLockedGrade(item, grade) {
    if (isPublicItem(item)) {
      return true;
    }
    return matchesGrade(item, grade);
  }

  function matchesSubject(item, subject) {
    if (!subject || subject === 'all') {
      return true;
    }
    return normalizeSubjectKey(item.subject) === normalizeSubjectKey(subject);
  }

  async function getLatestContent(options) {
    var settings = options || {};
    var maxItems = Math.max(1, parseInt(settings.maxItems, 10) || 30);
    var allItems = await getAllItems(settings);
    return sortByNewest(allItems)
      .filter(function(item) {
        var gradeMatches = settings.includePublicOutsideGrade
          ? matchesLockedGrade(item, settings.grade)
          : matchesGrade(item, settings.grade);
        return gradeMatches && matchesSubject(item, settings.subject);
      })
      .slice(0, maxItems);
  }

  async function getTickerItems(options) {
    var settings = options || {};
    return getLatestContent({
      forceRefresh: settings.forceRefresh,
      maxItems: Math.max(1, parseInt(settings.maxItems, 10) || 5),
      grade: settings.grade,
      subject: settings.subject,
    });
  }

  async function getFilterOptions(options) {
    var items = await getAllItems(options || {});
    var gradeMap = {};
    var subjectMap = {};

    items.forEach(function(item) {
      (Array.isArray(item.grades) ? item.grades : []).forEach(function(grade) {
        if (!gradeMap[grade]) {
          gradeMap[grade] = {
            value: String(grade),
            label: getGradeMeta(grade).label,
            palette: getGradeMeta(grade),
          };
        }
      });

      var subjectKey = normalizeSubjectKey(item.subject);
      if (subjectKey && !subjectMap[subjectKey]) {
        var subjectMeta = getSubjectMeta(subjectKey);
        subjectMap[subjectKey] = {
          value: subjectKey,
          label: subjectMeta.label,
          icon: subjectMeta.icon,
        };
      }
    });

    return {
      grades: Object.keys(gradeMap).sort(function(a, b) { return Number(a) - Number(b); }).map(function(key) {
        return gradeMap[key];
      }),
      subjects: Object.keys(subjectMap).sort(function(a, b) {
        return subjectMap[a].label.localeCompare(subjectMap[b].label, 'tr');
      }).map(function(key) {
        return subjectMap[key];
      }),
    };
  }

  window.kemalContentFeed = {
    getAllItems: getAllItems,
    getLatestContent: getLatestContent,
    getTickerItems: getTickerItems,
    getFilterOptions: getFilterOptions,
    getGradeMeta: getGradeMeta,
    getSubjectMeta: getSubjectMeta,
    getContentTypeMeta: getContentTypeMeta,
    normalizeSubjectKey: normalizeSubjectKey,
    matchesGrade: matchesGrade,
    matchesLockedGrade: matchesLockedGrade,
    isPublicItem: isPublicItem,
    matchesSubject: matchesSubject,
  };
})();
