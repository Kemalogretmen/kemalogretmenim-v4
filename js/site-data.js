(function() {
  'use strict';

  const CONFIG = {
    supabaseUrl: 'https://mwxcvlyrkptxrwgkmqum.supabase.co',
    supabaseAnonKey: 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
    readingSupabaseUrl: 'https://mwxcvlyrkptxrwgkmqum.supabase.co',
    readingSupabaseAnonKey: 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
    documentSupabaseUrl: 'https://mwxcvlyrkptxrwgkmqum.supabase.co',
    documentSupabaseAnonKey: 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
    legacySiteSettingsUrl: 'https://spaquvxaldxgjieqmzio.supabase.co',
    legacySiteSettingsAnonKey: 'sb_publishable_60Rg38eHmnV2UMXW7GYmPw_F-QBWhEz',
    siteSettingsTable: 'site_settings',
    siteSettingsRowKey: 'site_content',
    cacheKey: 'kemal_site_data',
  };

  const DEFAULT_SITE_DATA = {
    menuBadges: {
      hizliokuma: true,
      sinavlar: true,
      oyunlar: true,
    },
    duyurular: [
      { id: 1, metin: '🎉 Yeni 1. Sınıf Okuma Çalışmaları eklendi!', aktif: true },
      { id: 2, metin: '📖 Hızlı Okuma sistemi artık yayında!', aktif: true },
      { id: 3, metin: '🎮 Yeni eğitim oyunlarıyla tekrar zamanı!', aktif: true },
    ],
    onecikarlar: [
      {
        id: 1,
        baslik: 'Hızlı Okuma Sistemi',
        aciklama: 'Sınıfına göre metinleri seç, oku, karnen çıksın!',
        link: '/hizli-okuma/index.html',
        emoji: '📖',
        renk: 'purple',
        tarih: '2026-03-17',
        aktif: true,
      },
      {
        id: 2,
        baslik: 'Eğitim Oyunları',
        aciklama: 'Eğlenceli oyunlarla öğren!',
        link: '/oyun/oyunlar.html',
        emoji: '🎮',
        renk: 'coral',
        tarih: '2026-03-15',
        aktif: true,
      },
      {
        id: 3,
        baslik: 'Sınav Merkezi',
        aciklama: 'Sınıfına göre sınavını seç ve çöz.',
        link: '/sinav_sitesi/index.html',
        emoji: '📝',
        renk: 'teal',
        tarih: '2026-03-19',
        aktif: true,
      },
    ],
    yeniIcerikler: [
      {
        id: 1,
        baslik: '1. Sınıf Hızlı Okuma',
        aciklama: 'Yeni metinler eklendi.',
        link: '/hizli-okuma/index.html',
        emoji: '🚀',
        tarih: '2026-03-10',
        aktif: true,
      },
    ],
    hizliErisim: [
      {
        id: 1,
        baslik: 'Hızlı Okuma',
        aciklama: 'Sınıfına göre metin seç!',
        link: '/hizli-okuma/index.html',
        emoji: '📖',
        renk: 'purple',
        aktif: true,
      },
      {
        id: 2,
        baslik: 'Eğitim Oyunları',
        aciklama: 'Eğlenceli oyunlarla öğren!',
        link: '/oyun/oyunlar.html',
        emoji: '🎮',
        renk: 'coral',
        aktif: true,
      },
      {
        id: 3,
        baslik: 'Sınav Merkezi',
        aciklama: 'Sınıfını seç, sınavını çöz.',
        link: '/sinav_sitesi/index.html',
        emoji: '📝',
        renk: 'teal',
        aktif: true,
      },
    ],
    hakkimda: {
      isim: 'Kemal Öğretmen',
      unvan: '21 Yıllık Öğretmen & Eğitim İçerik Üreticisi',
      metin: 'Öğretmenlik hayatımın 21. yılında, her sabah sınıfa aynı inançla giriyorum.',
      istatistikler: [
        { sayi: '21+', etiket: 'Yıl Deneyim' },
        { sayi: '5000+', etiket: 'Öğrenci' },
        { sayi: '200+', etiket: 'İçerik' },
      ],
    },
    ekMenuler: [],
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeStats(value) {
    return normalizeArray(value).map((item, index) => ({
      sayi: item && item.sayi ? String(item.sayi) : '',
      etiket: item && item.etiket ? String(item.etiket) : `İstatistik ${index + 1}`,
    }));
  }

  function normalizeSiteData(rawData) {
    const defaults = deepClone(DEFAULT_SITE_DATA);
    const source = rawData && typeof rawData === 'object' ? rawData : {};

    return {
      menuBadges: source.menuBadges && typeof source.menuBadges === 'object' ? source.menuBadges : defaults.menuBadges,
      duyurular: normalizeArray(source.duyurular).map((item, index) => ({
        id: item && item.id ? item.id : Date.now() + index,
        metin: item && item.metin ? String(item.metin) : '',
        aktif: item && typeof item.aktif === 'boolean' ? item.aktif : true,
      })),
      onecikarlar: normalizeArray(source.onecikarlar).map((item, index) => ({
        id: item && item.id ? item.id : Date.now() + index,
        baslik: item && item.baslik ? String(item.baslik) : '',
        aciklama: item && item.aciklama ? String(item.aciklama) : '',
        link: item && item.link ? String(item.link) : '#',
        emoji: item && item.emoji ? String(item.emoji) : '📌',
        renk: item && item.renk ? String(item.renk) : 'purple',
        tarih: item && item.tarih ? String(item.tarih) : '',
        aktif: item && typeof item.aktif === 'boolean' ? item.aktif : true,
      })),
      yeniIcerikler: normalizeArray(source.yeniIcerikler).map((item, index) => ({
        id: item && item.id ? item.id : Date.now() + index,
        baslik: item && item.baslik ? String(item.baslik) : '',
        aciklama: item && item.aciklama ? String(item.aciklama) : '',
        link: item && item.link ? String(item.link) : '#',
        emoji: item && item.emoji ? String(item.emoji) : '📄',
        tarih: item && item.tarih ? String(item.tarih) : '',
        aktif: item && typeof item.aktif === 'boolean' ? item.aktif : true,
      })),
      hizliErisim: normalizeArray(source.hizliErisim).map((item, index) => ({
        id: item && item.id ? item.id : Date.now() + index,
        baslik: item && item.baslik ? String(item.baslik) : '',
        aciklama: item && item.aciklama ? String(item.aciklama) : '',
        link: item && item.link ? String(item.link) : '#',
        emoji: item && item.emoji ? String(item.emoji) : '📄',
        renk: item && item.renk ? String(item.renk) : 'purple',
        aktif: item && typeof item.aktif === 'boolean' ? item.aktif : true,
      })),
      hakkimda: {
        isim: source.hakkimda && source.hakkimda.isim ? String(source.hakkimda.isim) : defaults.hakkimda.isim,
        unvan: source.hakkimda && source.hakkimda.unvan ? String(source.hakkimda.unvan) : defaults.hakkimda.unvan,
        metin: source.hakkimda && source.hakkimda.metin ? String(source.hakkimda.metin) : defaults.hakkimda.metin,
        istatistikler: source.hakkimda && source.hakkimda.istatistikler
          ? normalizeStats(source.hakkimda.istatistikler)
          : defaults.hakkimda.istatistikler,
      },
      ekMenuler: normalizeArray(source.ekMenuler).map((item, index) => ({
        id: item && item.id ? item.id : Date.now() + index,
        ad: item && item.ad ? String(item.ad) : '',
        url: item && item.url ? String(item.url) : '#',
      })),
    };
  }

  function getCachedData() {
    try {
      const raw = localStorage.getItem(CONFIG.cacheKey);
      if (!raw) {
        return normalizeSiteData(DEFAULT_SITE_DATA);
      }
      return normalizeSiteData(JSON.parse(raw));
    } catch (error) {
      return normalizeSiteData(DEFAULT_SITE_DATA);
    }
  }

  function setCachedData(data) {
    const normalized = normalizeSiteData(data);
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify(normalized));
    return normalized;
  }

  function buildHeaders(accessToken) {
    const token = accessToken || CONFIG.supabaseAnonKey;
    return {
      apikey: CONFIG.supabaseAnonKey,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    };
  }

  function buildSettingsUrl(baseUrl) {
    return (
      baseUrl +
      '/rest/v1/' +
      CONFIG.siteSettingsTable +
      '?key=eq.' +
      encodeURIComponent(CONFIG.siteSettingsRowKey) +
      '&select=value_json,updated_at&limit=1'
    );
  }

  function isMeaningfulSiteData(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    return Object.keys(normalizeSiteData(value)).some(function(key) {
      const entry = value[key];
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }
      if (entry && typeof entry === 'object') {
        return Object.keys(entry).length > 0;
      }
      return Boolean(entry);
    });
  }

  async function fetchSiteDataFrom(baseUrl, anonKey) {
    const response = await fetch(buildSettingsUrl(baseUrl), {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Site ayarlari okunamadi');
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }

    return rows[0].value_json || null;
  }

  async function fetchRemoteData() {
    let primaryValue = null;
    try {
      primaryValue = await fetchSiteDataFrom(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
      if (isMeaningfulSiteData(primaryValue)) {
        return setCachedData(primaryValue);
      }
    } catch (error) {
      primaryValue = null;
    }

    if (
      CONFIG.legacySiteSettingsUrl &&
      CONFIG.legacySiteSettingsAnonKey &&
      CONFIG.legacySiteSettingsUrl !== CONFIG.supabaseUrl
    ) {
      try {
        const legacyValue = await fetchSiteDataFrom(CONFIG.legacySiteSettingsUrl, CONFIG.legacySiteSettingsAnonKey);
        if (isMeaningfulSiteData(legacyValue)) {
          return setCachedData(legacyValue);
        }
      } catch (error) {
        return getCachedData();
      }
    }

    if (primaryValue && typeof primaryValue === 'object') {
      return setCachedData(primaryValue);
    }

    return getCachedData();
  }

  async function saveRemoteData(data, accessToken) {
    if (!accessToken) {
      throw new Error('Kaydetmek icin giris yapilmis bir yonetici oturumu gerekli.');
    }

    const normalized = setCachedData(data);
    const url =
      CONFIG.supabaseUrl +
      '/rest/v1/' +
      CONFIG.siteSettingsTable +
      '?on_conflict=key';

    const payload = {
      key: CONFIG.siteSettingsRowKey,
      value_json: normalized,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: Object.assign({}, buildHeaders(accessToken), {
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Site ayarlari kaydedilemedi');
    }

    return normalized;
  }

  let currentData = getCachedData();
  let loadPromise = null;

  async function loadSiteData() {
    if (!loadPromise) {
      loadPromise = fetchRemoteData()
        .then((remoteData) => {
          currentData = normalizeSiteData(remoteData);
          return currentData;
        })
        .catch(() => {
          currentData = getCachedData();
          return currentData;
        });
    }
    return loadPromise;
  }

  function getCurrentDataSync() {
    return normalizeSiteData(currentData);
  }

  window.kemalSiteStore = {
    getConfig: function() {
      return Object.assign({}, CONFIG);
    },
    getReadingConfig: function() {
      return {
        supabaseUrl: CONFIG.readingSupabaseUrl || CONFIG.supabaseUrl,
        supabaseAnonKey: CONFIG.readingSupabaseAnonKey || CONFIG.supabaseAnonKey,
      };
    },
    getDocumentsConfig: function() {
      return {
        supabaseUrl: CONFIG.documentSupabaseUrl || CONFIG.readingSupabaseUrl || CONFIG.supabaseUrl,
        supabaseAnonKey: CONFIG.documentSupabaseAnonKey || CONFIG.readingSupabaseAnonKey || CONFIG.supabaseAnonKey,
      };
    },
    getLegacySiteConfig: function() {
      return CONFIG.legacySiteSettingsUrl
        ? {
          supabaseUrl: CONFIG.legacySiteSettingsUrl,
          supabaseAnonKey: CONFIG.legacySiteSettingsAnonKey,
        }
        : null;
    },
    getDefaults: function() {
      return normalizeSiteData(DEFAULT_SITE_DATA);
    },
    getCachedData: function() {
      currentData = getCachedData();
      return getCurrentDataSync();
    },
    getCurrentDataSync,
    loadSiteData,
    saveSiteData: async function(data, accessToken) {
      const saved = await saveRemoteData(data, accessToken);
      currentData = saved;
      loadPromise = Promise.resolve(saved);
      return getCurrentDataSync();
    },
    updateLocalCache: function(data) {
      currentData = setCachedData(data);
      return getCurrentDataSync();
    },
  };
})();
