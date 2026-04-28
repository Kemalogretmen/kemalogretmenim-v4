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

  // Dinamik dersler Supabase'den yüklendikçe buraya eklenir
  let SUBJECTS = BASE_SUBJECTS.slice();
  let SUBJECT_MAP = buildSubjectMap(SUBJECTS);

  function buildSubjectMap(list) {
    return list.reduce(function(map, subject) {
      map[subject.key] = subject;
      return map;
    }, {});
  }

  // menu_ogeler tablosundaki yeni dersleri SUBJECTS listesine ekler
  function mergeMenuItems(rows) {
    if (!Array.isArray(rows)) return;
    rows.forEach(function(row) {
      var key = String(row.ders_key || '').trim().toLowerCase();
      if (!key) return;
      if (SUBJECT_MAP[key]) return; // zaten var
      var entry = { key: key, label: row.label || key, icon: row.icon || '📄' };
      SUBJECTS.push(entry);
      SUBJECT_MAP[key] = entry;
    });
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

  function getSubjectMeta(subjectKey) {
    return SUBJECT_MAP[normalizeSubjectKey(subjectKey)] || null;
  }

  function getGradeLabel(value) {
    return GRADE_LABELS[Number(value)] || (String(value || '').trim() ? String(value).trim() + '. Sınıf' : 'Sınıf');
  }

  function buildViewerUrl(documentId) {
    return '/dokuman.html?id=' + encodeURIComponent(documentId);
  }

  function getPublicFileUrl(path) {
    if (!path) {
      return '';
    }
    const response = getPublicClient().storage.from(BUCKET_NAME).getPublicUrl(path);
    return response && response.data && response.data.publicUrl ? response.data.publicUrl : '';
  }

  async function listDocumentsBySubject(grade, subject, options) {
    const includeInactive = Boolean(options && options.includeInactive);
    const normalizedSubject = normalizeSubjectKey(subject);
    let query = getPublicClient()
      .from('dokumanlar')
      .select('id,baslik,aciklama,sinif,ders,dosya_adi,dosya_yolu,kapak_renk,sayfa_sayisi,aktif,oturum_gerekli,siralama,olusturma_tarihi')
      .eq('sinif', Number(grade))
      .eq('ders', normalizedSubject)
      .order('siralama', { ascending: true })
      .order('olusturma_tarihi', { ascending: false });

    if (!includeInactive) {
      query = query.eq('aktif', true).eq('oturum_gerekli', false);
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }

    return (result.data || []).map(function(item) {
      return Object.assign({}, item, {
        dersLabel: getSubjectMeta(item.ders) ? getSubjectMeta(item.ders).label : item.ders,
        sinifLabel: getGradeLabel(item.sinif),
        dosyaUrl: getPublicFileUrl(item.dosya_yolu),
        viewerUrl: buildViewerUrl(item.id),
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
      query = query.eq('aktif', true).eq('oturum_gerekli', false);
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
      dersLabel: getSubjectMeta(item.ders) ? getSubjectMeta(item.ders).label : item.ders,
      sinifLabel: getGradeLabel(item.sinif),
      dosyaUrl: getPublicFileUrl(item.dosya_yolu),
      viewerUrl: buildViewerUrl(item.id),
    });
  }

  window.kemalDocumentStore = {
    getConfig: getConfig,
    getBucketName: function() {
      return BUCKET_NAME;
    },
    getPublicClient: getPublicClient,
    getSubjects: function() {
      return SUBJECTS.slice();
    },
    getSubjectMeta: getSubjectMeta,
    normalizeSubjectKey: normalizeSubjectKey,
    getGradeLabel: getGradeLabel,
    getPublicFileUrl: getPublicFileUrl,
    buildViewerUrl: buildViewerUrl,
    listDocumentsBySubject: listDocumentsBySubject,
    getDocumentById: getDocumentById,
    mergeMenuItems: mergeMenuItems,
  };
})();
