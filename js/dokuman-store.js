(function() {
  'use strict';

  const BASE_SUBJECTS = [
    { key: 'turkce', label: 'Türkçe', icon: '📝' },
    { key: 'matematik', label: 'Matematik', icon: '🔢' },
    { key: 'hayat-bilgisi', label: 'Hayat Bilgisi', icon: '🌱' },
    { key: 'fen-bilimleri', label: 'Fen Bilimleri', icon: '🔬' },
    { key: 'sosyal-bilgiler', label: 'Sosyal Bilgiler', icon: '🌍' },
    { key: 'okuma-anlama', label: 'Okuma Anlama', icon: '📖' },
  ];

  // Dinamik dersler Supabase'den yüklendikçe buraya eklenir.
  // Her dinamik ders sınıf bilgisiyle tutulur; doküman hedefi seçerken
  // başka sınıfa ait özel menülerin görünmesini engeller.
  let SUBJECTS = BASE_SUBJECTS.slice();
  let SUBJECT_MAP = buildSubjectMap(SUBJECTS);
  let DYNAMIC_SUBJECTS = [];

  function buildSubjectMap(list) {
    return list.reduce(function(map, subject) {
      map[subject.key] = subject;
      return map;
    }, {});
  }

  function normalizeGrade(value) {
    const grade = parseInt(value, 10);
    return grade && GRADE_LABELS[grade] ? grade : 0;
  }

  function syncGlobalSubjects() {
    SUBJECTS = BASE_SUBJECTS.slice();
    SUBJECT_MAP = buildSubjectMap(SUBJECTS);
    DYNAMIC_SUBJECTS.forEach(function(subject) {
      if (SUBJECT_MAP[subject.key]) return;
      const entry = { key: subject.key, label: subject.label, icon: subject.icon };
      SUBJECTS.push(entry);
      SUBJECT_MAP[entry.key] = entry;
    });
  }

  // menu_ogeler tablosundaki yeni dersleri sınıf bilgisiyle ekler
  function mergeMenuItems(rows) {
    if (!Array.isArray(rows)) return;
    const seen = {};
    rows.forEach(function(row) {
      var key = String(row.ders_key || '').trim().toLowerCase();
      if (!key) return;
      var grade = normalizeGrade(row.sinif);
      var dedupeKey = (grade || 'all') + '::' + key;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      DYNAMIC_SUBJECTS.push({
        key: key,
        label: row.label || key,
        icon: row.icon || '📄',
        sinif: grade,
        sortOrder: Number(row.sort_order || 99),
      });
    });
    syncGlobalSubjects();
  }

  const SUBJECT_ALIASES = {
    turkce: 'turkce',
    türkçe: 'turkce',
    matematik: 'matematik',
    hayat_bilgisi: 'hayat-bilgisi',
    'hayat-bilgisi': 'hayat-bilgisi',
    'hayat bilgisi': 'hayat-bilgisi',
    fen_bilimleri: 'fen-bilimleri',
    'fen-bilimleri': 'fen-bilimleri',
    'fen bilimleri': 'fen-bilimleri',
    sosyal_bilgiler: 'sosyal-bilgiler',
    'sosyal-bilgiler': 'sosyal-bilgiler',
    'sosyal bilgiler': 'sosyal-bilgiler',
    okuma_anlama: 'okuma-anlama',
    'okuma-anlama': 'okuma-anlama',
    'okuma anlama': 'okuma-anlama',
  };

  const GRADE_LABELS = {
    1: '1. Sınıf',
    2: '2. Sınıf',
    3: '3. Sınıf',
    4: '4. Sınıf',
    5: '5. Sınıf',
    6: '6. Sınıf',
    7: '7. Sınıf',
    8: '8. Sınıf',
  };

  const BUCKET_NAME = 'dokumanlar';
  let publicClient = null;
  let publicClientUrl = '';

  function ensureSupabase() {
    if (!window.supabase) {
      throw new Error('Supabase kutuphanesi yuklenemedi.');
    }
    return window.supabase;
  }

  function getConfig() {
    if (!window.kemalSiteStore) {
      throw new Error('kemalSiteStore bulunamadi.');
    }
    if (typeof window.kemalSiteStore.getDocumentsConfig === 'function') {
      return window.kemalSiteStore.getDocumentsConfig();
    }
    if (typeof window.kemalSiteStore.getReadingConfig === 'function') {
      return window.kemalSiteStore.getReadingConfig();
    }
    return window.kemalSiteStore.getConfig();
  }

  function getPublicClient() {
    const config = getConfig();
    if (!publicClient || publicClientUrl !== config.supabaseUrl) {
      publicClient = ensureSupabase().createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      publicClientUrl = config.supabaseUrl;
    }
    return publicClient;
  }

  function normalizeSubjectKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    return SUBJECT_ALIASES[raw] || raw;
  }

  function getSubjects(grade) {
    const safeGrade = normalizeGrade(grade);
    if (!safeGrade) {
      return SUBJECTS.slice();
    }

    const subjects = BASE_SUBJECTS.slice();
    const map = buildSubjectMap(subjects);
    DYNAMIC_SUBJECTS
      .filter(function(subject) { return !subject.sinif || subject.sinif === safeGrade; })
      .sort(function(a, b) { return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'tr'); })
      .forEach(function(subject) {
        if (map[subject.key]) return;
        const entry = { key: subject.key, label: subject.label, icon: subject.icon };
        subjects.push(entry);
        map[entry.key] = entry;
      });
    return subjects;
  }

  function getSubjectMeta(subjectKey, grade) {
    const key = normalizeSubjectKey(subjectKey);
    const safeGrade = normalizeGrade(grade);
    if (safeGrade) {
      const gradeSubject = DYNAMIC_SUBJECTS.find(function(subject) {
        return subject.sinif === safeGrade && subject.key === key;
      });
      if (gradeSubject) {
        return gradeSubject;
      }
    }
    return SUBJECT_MAP[key] || null;
  }

  function getGradeLabel(value) {
    return GRADE_LABELS[Number(value)] || (String(value || '').trim() ? String(value).trim() + '. Sınıf' : 'Sınıf');
  }

  function getDocumentTargets(item) {
    var targets = Array.isArray(item && item.hedefler) ? item.hedefler : [];
    var normalized = targets.map(function(target) {
      var grade = parseInt(target && target.sinif, 10);
      var subject = normalizeSubjectKey(target && target.ders);
      if (!grade || !subject) return null;
      return { sinif: grade, ders: subject };
    }).filter(Boolean);

    if (!normalized.length && item && item.sinif && item.ders) {
      normalized.push({
        sinif: parseInt(item.sinif, 10),
        ders: normalizeSubjectKey(item.ders),
      });
    }

    var seen = {};
    return normalized.filter(function(target) {
      var key = target.sinif + '::' + target.ders;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function buildViewerUrl(documentId, context) {
    var url = '/dokuman.html?id=' + encodeURIComponent(documentId);
    if (context && context.sinif && context.ders) {
      url += '&sinif=' + encodeURIComponent(context.sinif) + '&ders=' + encodeURIComponent(normalizeSubjectKey(context.ders));
    }
    return url;
  }

  function getPublicFileUrl(path) {
    if (!path) {
      return '';
    }
    if (/^https?:\/\//i.test(String(path))) {
      return String(path);
    }
    const response = getPublicClient().storage.from(BUCKET_NAME).getPublicUrl(path);
    return response && response.data && response.data.publicUrl ? response.data.publicUrl : '';
  }

  function getDocumentKind(item) {
    return item && item.icerik_turu === 'video' ? 'video' : 'document';
  }

  function getVideoEmbedUrl(item) {
    if (!item || getDocumentKind(item) !== 'video') {
      return '';
    }
    return item.video_embed_url || item.video_url || item.dosya_yolu || '';
  }

  function getDocumentSource(item) {
    const raw = String(item && (item.dosya_kaynak_turu || item.dosyaKaynakTuru) || '').trim().toLowerCase();
    if (raw) {
      return raw === 'storage' ? 'supabase' : raw;
    }
    return /^https?:\/\//i.test(String(item && item.dosya_yolu || '')) ? 'external' : 'supabase';
  }

  function getDocumentUrl(item) {
    if (getDocumentKind(item) === 'video') {
      return getVideoEmbedUrl(item);
    }
    if (getDocumentSource(item) !== 'supabase') {
      return item.harici_embed_url && item.harici_provider === 'google-drive'
        ? (item.dosya_yolu || item.harici_url || item.harici_embed_url)
        : (item.dosya_yolu || item.harici_url || item.harici_embed_url || '');
    }
    return getPublicFileUrl(item && item.dosya_yolu);
  }

  async function listDocumentsBySubject(grade, subject, options) {
    const includeInactive = Boolean(options && options.includeInactive);
    const normalizedSubject = normalizeSubjectKey(subject);
    const selectFields = 'id,baslik,aciklama,sinif,ders,hedefler,dosya_adi,dosya_yolu,dosya_boyutu,dosya_kaynak_turu,harici_url,harici_provider,harici_embed_url,kapak_renk,sayfa_sayisi,icerik_turu,video_url,video_embed_url,video_provider,video_html,aktif,gizli,oturum_gerekli,siralama,olusturma_tarihi';
    const fallbackFields = 'id,baslik,aciklama,sinif,ders,dosya_adi,dosya_yolu,kapak_renk,sayfa_sayisi,aktif,oturum_gerekli,siralama,olusturma_tarihi';
    let query = getPublicClient()
      .from('dokumanlar')
      .select(selectFields)
      .order('siralama', { ascending: true })
      .order('olusturma_tarihi', { ascending: false });

    if (!includeInactive) {
      query = query.eq('aktif', true);
    }

    let result = await query;
    if (result.error && (
      String(result.error.message || '').toLowerCase().includes('hedefler') ||
      String(result.error.message || '').toLowerCase().includes('icerik_turu') ||
      String(result.error.message || '').toLowerCase().includes('video_embed_url') ||
      String(result.error.message || '').toLowerCase().includes('dosya_kaynak') ||
      String(result.error.message || '').toLowerCase().includes('gizli')
    )) {
      query = getPublicClient()
        .from('dokumanlar')
        .select(fallbackFields)
        .order('siralama', { ascending: true })
        .order('olusturma_tarihi', { ascending: false });
      if (!includeInactive) {
        query = query.eq('aktif', true);
      }
      result = await query;
    }
    if (result.error) {
      throw result.error;
    }

    return (result.data || []).filter(function(item) {
      if (item && item.gizli === true) {
        return false;
      }
      return getDocumentTargets(item).some(function(target) {
        return target.sinif === Number(grade) && target.ders === normalizedSubject;
      });
    }).map(function(item) {
      var context = { sinif: Number(grade), ders: normalizedSubject };
      var subjectMeta = getSubjectMeta(normalizedSubject, grade);
      return Object.assign({}, item, {
        dersLabel: subjectMeta ? subjectMeta.label : normalizedSubject,
        sinifLabel: getGradeLabel(grade),
        dosyaUrl: getDocumentUrl(item),
        icerikTuru: getDocumentKind(item),
        dosyaKaynakTuru: getDocumentSource(item),
        viewerUrl: buildViewerUrl(item.id, context),
      });
    });
  }

  async function getDocumentById(documentId, options) {
    const includeInactive = Boolean(options && options.includeInactive);
    let query = getPublicClient()
      .from('dokumanlar')
      .select('*')
      .eq('id', documentId)
      .limit(1);

    if (!includeInactive) {
      query = query.eq('aktif', true);
    }

    const result = await query.maybeSingle();
    if (result.error) {
      throw result.error;
    }
    if (!result.data) {
      return null;
    }

    const item = result.data;
    return Object.assign({}, item, {
      dersLabel: getSubjectMeta(item.ders, item.sinif) ? getSubjectMeta(item.ders, item.sinif).label : item.ders,
      sinifLabel: getGradeLabel(item.sinif),
      hedefler: getDocumentTargets(item),
      dosyaUrl: getDocumentUrl(item),
      icerikTuru: getDocumentKind(item),
      dosyaKaynakTuru: getDocumentSource(item),
      viewerUrl: buildViewerUrl(item.id),
    });
  }

  window.kemalDocumentStore = {
    getConfig: getConfig,
    getBucketName: function() {
      return BUCKET_NAME;
    },
    getPublicClient: getPublicClient,
    getSubjects: getSubjects,
    getSubjectMeta: getSubjectMeta,
    normalizeSubjectKey: normalizeSubjectKey,
    getGradeLabel: getGradeLabel,
    getPublicFileUrl: getPublicFileUrl,
    getDocumentKind: getDocumentKind,
    getVideoEmbedUrl: getVideoEmbedUrl,
    getDocumentSource: getDocumentSource,
    buildViewerUrl: buildViewerUrl,
    getDocumentTargets: getDocumentTargets,
    listDocumentsBySubject: listDocumentsBySubject,
    getDocumentById: getDocumentById,
    mergeMenuItems: mergeMenuItems,
  };
})();
