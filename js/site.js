/* ================================================
   KEMAL OGRETMENIM — SITE.JS v5.0
   Ortak navbar/footer, eski menu yapisi ve rota eslemeleri
   ================================================ */
(function() {
  'use strict';

  // Supabase'den yüklenen dinamik menü öğeleri
  var dynamicNavItems = [];

  function hasRecoveryRedirectPayload() {
    const path = String(window.location && window.location.pathname ? window.location.pathname : '');
    const isHomePage = path === '/' || path === '/index.html' || path.endsWith('/index.html');
    if (!isHomePage) {
      return false;
    }

    const combined = String(window.location.search || '') + '&' + String(window.location.hash || '').replace(/^#/, '');
    return (
      combined.includes('type=recovery') ||
      combined.includes('access_token=') ||
      combined.includes('refresh_token=') ||
      combined.includes('token_hash=') ||
      combined.includes('code=')
    );
  }

  if (hasRecoveryRedirectPayload()) {
    window.location.replace('/admin/reset-password.html' + String(window.location.search || '') + String(window.location.hash || ''));
    return;
  }

  const GRADE_META = {
    '1': {
      label: '1. Sınıf',
      panelHref: '/siniflar/1-sinif.html',
      panelLabel: '1. Sınıf Paneli',
      color: '#FF7A59',
      theme: '1',
      ribbon: 'İlk adımlar',
    },
    '2': {
      label: '2. Sınıf',
      panelHref: '/siniflar/2-sinif.html',
      panelLabel: '2. Sınıf Paneli',
      color: '#FF9F43',
      theme: '2',
      ribbon: 'Temel beceriler',
    },
    '3': {
      label: '3. Sınıf',
      panelHref: '/siniflar/3-sinif.html',
      panelLabel: '3. Sınıf Paneli',
      color: '#00B894',
      theme: '3',
      ribbon: 'Keşfetme zamanı',
    },
    '4': {
      label: '4. Sınıf',
      panelHref: '/siniflar/4-sinif.html',
      panelLabel: '4. Sınıf Paneli',
      color: '#3B82F6',
      theme: '4',
      ribbon: 'Yeni ufuklar',
    },
    '5': {
      label: '5. Sınıf',
      panelHref: '/siniflar/ortaokul.html',
      panelLabel: 'Ortaokul Paneli',
      color: '#6C3DED',
      theme: 'orta',
      ribbon: 'Ortaokul rotası',
    },
    '6': {
      label: '6. Sınıf',
      panelHref: '/siniflar/ortaokul.html',
      panelLabel: 'Ortaokul Paneli',
      color: '#6C3DED',
      theme: 'orta',
      ribbon: 'Ortaokul rotası',
    },
    '7': {
      label: '7. Sınıf',
      panelHref: '/siniflar/ortaokul.html',
      panelLabel: 'Ortaokul Paneli',
      color: '#6C3DED',
      theme: 'orta',
      ribbon: 'Ortaokul rotası',
    },
    '8': {
      label: '8. Sınıf',
      panelHref: '/siniflar/ortaokul.html',
      panelLabel: 'Ortaokul Paneli',
      color: '#6C3DED',
      theme: 'orta',
      ribbon: 'Ortaokul rotası',
    },
  };

  const SUBJECT_META = {
    'okuma-anlama': {
      label: 'Okuma Anlama',
      icon: '📖',
      color: '#7C4DFF',
      description: 'Akıcı okuma, dikkat ve anlama becerilerini destekleyen metin odaklı çalışmalar.',
      focus: 'Kısa metinler, anlama soruları ve ritimli okuma akışı',
      features: [
        'Metin okuma ve anlama odaklı çalışma akışı',
        'Yaşa uygun soru yapılarıyla pekiştirme',
        'Akıcılığı destekleyen düzenli tekrar önerileri',
      ],
    },
    turkce: {
      label: 'Türkçe',
      icon: '📝',
      color: '#FF7A59',
      description: 'Okuma, yazma, kelime bilgisi ve anlam kurma becerilerini güçlendiren Türkçe merkezi.',
      focus: 'Okuma anlama, yazma ve dil becerilerinin dengeli gelişimi',
      features: [
        'Metin üzerinden okuma ve anlama etkinlikleri',
        'Kelime, cümle ve anlatım çalışmalarına uygun rota',
        'Dersi oyun ve tekrar ile pekiştirecek bağlantılar',
      ],
    },
    matematik: {
      label: 'Matematik',
      icon: '🔢',
      color: '#3B82F6',
      description: 'Sayılar, işlemler, problemler ve görsel pekiştirmelerle ilerleyen matematik merkezi.',
      focus: 'Kademeli konu akışı, problem çözme ve tekrar',
      features: [
        'Konu takibi için net sınıf geçişleri',
        'İşlem becerilerini destekleyen pratik akışı',
        'Oyunlaştırılmış tekrar ve pekiştirme önerileri',
      ],
    },
    'hayat-bilgisi': {
      label: 'Hayat Bilgisi',
      icon: '🌱',
      color: '#10B981',
      description: 'Günlük yaşam, değerler ve çevre bilinci temelli içerik akışı için hazırlanan hayat bilgisi merkezi.',
      focus: 'Yakın çevre, değerler eğitimi ve günlük yaşam becerileri',
      features: [
        'Sınıf düzeyine uygun yaşam becerisi başlıkları',
        'Merak uyandıran mini görev ve konu bağlantıları',
        'Aile ve okul yaşamını destekleyen yönlendirmeler',
      ],
    },
    'fen-bilimleri': {
      label: 'Fen Bilimleri',
      icon: '🔬',
      color: '#14B8A6',
      description: 'Gözlem, deney ve bilimsel düşünmeyi merkeze alan fen bilimleri sayfası.',
      focus: 'Gözlem, deney ve keşif temelli ilerleyen konu başlıkları',
      features: [
        'Konu başlıklarını sade bir merkezde toplar',
        'Bilimsel merakı besleyen yönlendirmeler sunar',
        'Sınav ve tekrar araçlarına hızlı erişim sağlar',
      ],
    },
    'sosyal-bilgiler': {
      label: 'Sosyal Bilgiler',
      icon: '🌍',
      color: '#F59E0B',
      description: 'Tarih, coğrafya ve vatandaşlık kazanımlarını düzenli bir akışta bir araya getiren merkez.',
      focus: 'Tarihsel bakış, çevre bilinci ve toplumsal yaşam',
      features: [
        'Konu takibi için sınıf seviyesine uygun girişler',
        'Görsel ve metin odaklı çalışma akışı',
        'Yeni içerikler geldikçe tek merkezden erişim kolaylığı',
      ],
    },
  };

  const SUBJECT_ALIASES = {
    hayat_bilgisi: 'hayat-bilgisi',
    'hayat-bilgisi': 'hayat-bilgisi',
    fen_bilimleri: 'fen-bilimleri',
    'fen-bilimleri': 'fen-bilimleri',
    sosyal_bilgiler: 'sosyal-bilgiler',
    'sosyal-bilgiler': 'sosyal-bilgiler',
    okuma_anlama: 'okuma-anlama',
    'okuma-anlama': 'okuma-anlama',
  };

  const SITE_ORIGIN = 'https://kemalogretmenim.com.tr';
  const SITE_NAME = 'Kemal Öğretmenim';
  const DEFAULT_OG_IMAGE = SITE_ORIGIN + '/gorseller/logo.png';
  const TRACKING_PARAM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'msclkid',
  ];
  const PRODUCTION_HOSTS = {
    'www.kemalogretmenim.com.tr': true,
    'kemalogretmenim.com.tr': true,
  };
  const SEO_DESCRIPTION_MAP = {
    '/': '1-7. sınıf öğrencileri için interaktif eğitim, okuma anlama, matematik, fen bilimleri, sınav ve eğitim oyunları içerikleri.',
    '/index.html': '1-7. sınıf öğrencileri için interaktif eğitim, okuma anlama, matematik, fen bilimleri, sınav ve eğitim oyunları içerikleri.',
    '/hakkimda.html': 'Kemal Öğretmen hakkında bilgiler, eğitim yaklaşımı ve yıllara dayanan öğretmenlik deneyimi.',
    '/iletisim.html': 'Kemal Öğretmen ile iletişime geçin, soru ve önerilerinizi paylaşın.',
    '/yeni.html': 'Kemal Öğretmenim sitesine eklenen en yeni ders içerikleri, dokümanlar ve güncellemeler.',
    '/ogretmen-ders-plani.html': 'Öğretmenler için yıllık planlardan öğrenme çıktılarını okuyup haftalık ders programına yerleştiren ders planlama aracı.',
    '/ogretmen-araclari.html': 'Akıllı tahta ve tablet uyumlu öğretmen araçları: kronometre, zamanlayıcı ve sınıf içi yardımcı araçlar.',
    '/hizli-okuma/index.html': 'Sınıfa özel metinlerle hızlı okuma, anlama ve sonuç takibi için hazırlanan merkez.',
    '/oyun/oyunlar.html': 'Eğitimi destekleyen öğretici oyunlar, tekrar çalışmaları ve eğlenceli etkinlikler.',
    '/sinav_sitesi/index.html': 'Sınıf düzeyine uygun online sınavlar, denemeler ve konu pekiştirme merkezi.',
    '/siniflar/1-sinif.html': '1. sınıf için okuma, matematik ve hayat bilgisi içeriklerini tek yerden keşfedin.',
    '/siniflar/2-sinif.html': '2. sınıf için Türkçe, matematik ve hayat bilgisi içeriklerini tek yerden keşfedin.',
    '/siniflar/3-sinif.html': '3. sınıf için Türkçe, matematik, hayat bilgisi ve fen bilimleri içeriklerini keşfedin.',
    '/siniflar/4-sinif.html': '4. sınıf için Türkçe, matematik, sosyal bilgiler ve fen bilimleri içeriklerini keşfedin.',
    '/siniflar/ortaokul.html': '5, 6 ve 7. sınıf ortaokul ders içerikleri, sınavlar ve konu destek sayfaları.',
    '/ders.html': 'Sınıf ve derse göre yönlendirilmiş içerikler, PDF dokümanlar ve destek araçları.',
    '/dokuman.html': 'Ders bazlı PDF dokümanları görüntüleyin, inceleyin ve çalışma akışını destekleyin.',
    '/calisma-kagidi.html': 'Etkileşimli çalışma kağıtlarını çözün, sonuçlarınızı görün ve öğrenmeyi pekiştirin.',
    '/404.html': 'Aradığınız sayfa bulunamadı. Kemal Öğretmenim ana sayfasına veya iletişim sayfasına dönebilirsiniz.',
  };
  const analyticsState = {
    initialized: false,
    sessionId: '',
    viewId: '',
    pageStartedAt: 0,
    visibleStartedAt: 0,
    visibleMs: 0,
    finishSent: false,
    heartbeatTimer: 0,
  };
  const siteSearchState = {
    bound: false,
    loading: false,
    items: null,
    query: '',
  };
  let contentFeedScriptPromise = null;
  let contentReactionsScriptPromise = null;
  let contentSavesScriptPromise = null;
  let userAuthScriptPromise = null;

  function safeTrim(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(value) {
    return escHtml(value).replace(/'/g, '&#39;');
  }

  function clampText(value, maxLength) {
    const text = safeTrim(value);
    if (!maxLength || text.length <= maxLength) {
      return text;
    }
    return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
  }

  function ensureHead() {
    return document.head || document.getElementsByTagName('head')[0] || null;
  }

  function ensureMeta(attrName, attrValue) {
    const head = ensureHead();
    if (!head) {
      return null;
    }

    let selector = 'meta[' + attrName + '="' + attrValue.replace(/"/g, '\\"') + '"]';
    let tag = head.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attrName, attrValue);
      head.appendChild(tag);
    }
    return tag;
  }

  function ensureLink(relValue) {
    const head = ensureHead();
    if (!head) {
      return null;
    }

    let link = head.querySelector('link[rel="' + relValue + '"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', relValue);
      head.appendChild(link);
    }
    return link;
  }

  function readMetaContent(attrName, attrValue) {
    const head = ensureHead();
    if (!head) {
      return '';
    }
    const tag = head.querySelector('meta[' + attrName + '="' + attrValue.replace(/"/g, '\\"') + '"]');
    return tag && tag.content ? safeTrim(tag.content) : '';
  }

  function createUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(char) {
      const random = Math.random() * 16 | 0;
      const value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function sanitizeUrl(inputUrl) {
    let parsed;

    try {
      parsed = new URL(inputUrl || window.location.href, SITE_ORIGIN);
    } catch (error) {
      parsed = new URL(window.location.pathname || '/', SITE_ORIGIN);
    }

    const clean = new URL(parsed.pathname + parsed.search, SITE_ORIGIN);
    TRACKING_PARAM_KEYS.forEach(function(key) {
      clean.searchParams.delete(key);
    });

    if (clean.pathname === '/index.html') {
      clean.pathname = '/';
    }

    clean.hash = '';
    return clean;
  }

  function getCanonicalPath() {
    const clean = sanitizeUrl(window.location.href);
    return clean.pathname + clean.search;
  }

  function guessSeoDescription(pathname) {
    const existing = readMetaContent('name', 'description');
    if (existing) {
      return existing;
    }

    if (SEO_DESCRIPTION_MAP[pathname]) {
      return SEO_DESCRIPTION_MAP[pathname];
    }

    const lead =
      document.querySelector('.hero p') ||
      document.querySelector('.subject-lead') ||
      document.querySelector('.sec-sub') ||
      document.querySelector('main p') ||
      document.querySelector('p');

    if (lead && lead.textContent) {
      return clampText(lead.textContent, 170);
    }

    return SEO_DESCRIPTION_MAP['/'];
  }

  function setMetaContent(attrName, attrValue, content) {
    const tag = ensureMeta(attrName, attrValue);
    if (tag) {
      tag.setAttribute('content', content);
    }
  }

  function updateSeo(options) {
    const cleanUrl = sanitizeUrl(options && options.url ? options.url : window.location.href);
    const path = cleanUrl.pathname;
    const title = safeTrim(options && options.title ? options.title : document.title || SITE_NAME) || SITE_NAME;
    const description = clampText(
      options && options.description ? options.description : guessSeoDescription(path),
      170
    );
    const robots = options && options.robots
      ? options.robots
      : (path === '/404.html' ? 'noindex,follow' : 'index,follow,max-image-preview:large');

    setMetaContent('name', 'description', description);
    setMetaContent('name', 'robots', robots);
    setMetaContent('property', 'og:locale', 'tr_TR');
    setMetaContent('property', 'og:type', 'website');
    setMetaContent('property', 'og:title', title);
    setMetaContent('property', 'og:description', description);
    setMetaContent('property', 'og:url', cleanUrl.toString());
    setMetaContent('property', 'og:site_name', SITE_NAME);
    setMetaContent('property', 'og:image', DEFAULT_OG_IMAGE);
    setMetaContent('name', 'twitter:card', 'summary');
    setMetaContent('name', 'twitter:title', title);
    setMetaContent('name', 'twitter:description', description);
    setMetaContent('name', 'twitter:image', DEFAULT_OG_IMAGE);

    const canonical = ensureLink('canonical');
    if (canonical) {
      canonical.setAttribute('href', cleanUrl.toString());
    }

    return {
      title: title,
      description: description,
      url: cleanUrl.toString(),
      path: path,
    };
  }

  function injectHomeSchema() {
    const cleanUrl = sanitizeUrl(window.location.href);
    if (cleanUrl.pathname !== '/') {
      return;
    }

    const head = ensureHead();
    if (!head) {
      return;
    }

    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': SITE_ORIGIN + '/#organization',
          name: SITE_NAME,
          url: SITE_ORIGIN,
          logo: DEFAULT_OG_IMAGE,
          sameAs: [
            'https://instagram.com/kemalkogretmenim',
            'https://youtube.com/@kemalkogretmenim',
            'https://twitter.com/kemalkogretmen',
          ],
        },
        {
          '@type': 'WebSite',
          '@id': SITE_ORIGIN + '/#website',
          url: SITE_ORIGIN,
          name: SITE_NAME,
          inLanguage: 'tr-TR',
          publisher: {
            '@id': SITE_ORIGIN + '/#organization',
          },
        },
      ],
    };

    let schemaTag = document.getElementById('kemal-home-schema');
    if (!schemaTag) {
      schemaTag = document.createElement('script');
      schemaTag.type = 'application/ld+json';
      schemaTag.id = 'kemal-home-schema';
      head.appendChild(schemaTag);
    }

    schemaTag.textContent = JSON.stringify(payload);
  }

  function initSeo() {
    const state = updateSeo();
    injectHomeSchema();
    return state;
  }

  function readStoredJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStoredJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* no-op */
    }
  }

  function isTrackingEnabled() {
    const protocol = String(window.location.protocol || '').toLowerCase();
    const host = String(window.location.hostname || '').toLowerCase();

    if ((document.body && document.body.dataset.kemalAnalytics === 'off') || !/^https?:$/.test(protocol)) {
      return false;
    }

    return !!PRODUCTION_HOSTS[host];
  }

  function getAnalyticsSessionId() {
    const storageKey = 'kemal_site_analytics_session';
    const ttlMs = 30 * 60 * 1000;
    const now = Date.now();
    const existing = readStoredJson(storageKey);

    if (existing && existing.id && existing.lastSeenAt && (now - Number(existing.lastSeenAt)) < ttlMs) {
      writeStoredJson(storageKey, {
        id: existing.id,
        lastSeenAt: now,
      });
      return existing.id;
    }

    const nextId = createUuid();
    writeStoredJson(storageKey, {
      id: nextId,
      lastSeenAt: now,
    });
    return nextId;
  }

  function touchAnalyticsSession() {
    const storageKey = 'kemal_site_analytics_session';
    if (!analyticsState.sessionId) {
      return;
    }
    writeStoredJson(storageKey, {
      id: analyticsState.sessionId,
      lastSeenAt: Date.now(),
    });
  }

  function parseReferrer() {
    const raw = String(document.referrer || '');
    if (!raw) {
      return {
        referrer: '',
        referrerHost: '',
      };
    }

    try {
      const parsed = new URL(raw);
      const referrerHost = parsed.hostname && PRODUCTION_HOSTS[parsed.hostname]
        ? 'site-ici'
        : parsed.hostname;
      return {
        referrer: parsed.origin + parsed.pathname,
        referrerHost: referrerHost || '',
      };
    } catch (error) {
      return {
        referrer: '',
        referrerHost: '',
      };
    }
  }

  function getActiveSeconds() {
    const currentVisibleMs = analyticsState.visibleStartedAt
      ? (Date.now() - analyticsState.visibleStartedAt)
      : 0;
    const totalMs = analyticsState.visibleMs + currentVisibleMs;
    return Math.min(21600, Math.max(0, totalMs / 1000));
  }

  function getOpenSeconds() {
    return Math.min(21600, Math.max(0, (Date.now() - analyticsState.pageStartedAt) / 1000));
  }

  function buildAnalyticsPayload(eventType, extra) {
    const cleanUrl = sanitizeUrl(extra && extra.url ? extra.url : window.location.href);
    const referrer = parseReferrer();
    const liveUrl = new URL(window.location.href);

    return {
      view_id: analyticsState.viewId,
      session_id: analyticsState.sessionId,
      event_type: eventType,
      page_url: cleanUrl.toString(),
      page_path: cleanUrl.pathname + cleanUrl.search,
      page_title: clampText(extra && extra.title ? extra.title : document.title, 200),
      referrer: referrer.referrer,
      referrer_host: referrer.referrerHost,
      utm_source: liveUrl.searchParams.get('utm_source') || '',
      utm_medium: liveUrl.searchParams.get('utm_medium') || '',
      utm_campaign: liveUrl.searchParams.get('utm_campaign') || '',
      screen_width: window.screen && window.screen.width ? Number(window.screen.width) : null,
      screen_height: window.screen && window.screen.height ? Number(window.screen.height) : null,
      language: navigator.language || 'tr-TR',
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      active_seconds: typeof (extra && extra.activeSeconds) === 'number'
        ? Number(extra.activeSeconds.toFixed(2))
        : null,
      event_payload: Object.assign({
        open_seconds: Number(getOpenSeconds().toFixed(2)),
      }, extra && extra.payload ? extra.payload : {}),
    };
  }

  function sendAnalyticsEvent(eventType, extra, keepalive) {
    if (!analyticsState.sessionId || !analyticsState.viewId) {
      return Promise.resolve();
    }

    touchAnalyticsSession();

    return fetch('https://mwxcvlyrkptxrwgkmqum.supabase.co/rest/v1/site_analytics_events', {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: !!keepalive,
      headers: {
        apikey: 'sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
        Authorization: 'Bearer sb_publishable__nk391uzfRC4bg3HQFHjlA_tH5kzmDY',
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(buildAnalyticsPayload(eventType, extra)),
    }).catch(function() {
      /* no-op */
    });
  }

  function syncVisibilityState() {
    if (document.visibilityState === 'hidden') {
      if (analyticsState.visibleStartedAt) {
        analyticsState.visibleMs += (Date.now() - analyticsState.visibleStartedAt);
        analyticsState.visibleStartedAt = 0;
      }
      touchAnalyticsSession();
      return;
    }

    if (!analyticsState.visibleStartedAt) {
      analyticsState.visibleStartedAt = Date.now();
    }
    touchAnalyticsSession();
  }

  function sendPageLeaveOnce(reason) {
    if (!analyticsState.initialized || analyticsState.finishSent) {
      return;
    }

    analyticsState.finishSent = true;
    syncVisibilityState();
    sendAnalyticsEvent('page_leave', {
      activeSeconds: getActiveSeconds(),
      payload: {
        reason: reason || 'pagehide',
      },
    }, true);
  }

  function initAnalytics() {
    if (analyticsState.initialized || !isTrackingEnabled()) {
      return;
    }

    analyticsState.initialized = true;
    analyticsState.sessionId = getAnalyticsSessionId();
    analyticsState.viewId = createUuid();
    analyticsState.pageStartedAt = Date.now();
    analyticsState.visibleMs = 0;
    analyticsState.finishSent = false;
    analyticsState.visibleStartedAt = document.visibilityState === 'hidden' ? 0 : Date.now();

    window.setTimeout(function() {
      if (!analyticsState.finishSent) {
        sendAnalyticsEvent('page_view');
      }
    }, 300);

    document.addEventListener('visibilitychange', syncVisibilityState, { passive: true });
    window.addEventListener('pagehide', function() {
      sendPageLeaveOnce('pagehide');
    });
    window.addEventListener('beforeunload', function() {
      sendPageLeaveOnce('beforeunload');
    });

    analyticsState.heartbeatTimer = window.setInterval(function() {
      touchAnalyticsSession();
    }, 60000);
  }

  function fallbackDefaults() {
    return {
      menuBadges: {},
      duyurular: [],
      onecikarlar: [],
      yeniIcerikler: [],
      hizliErisim: [],
      hakkimda: {
        isim: 'Kemal Öğretmen',
        unvan: '',
        metin: '',
        istatistikler: [],
      },
      ekMenuler: [],
    };
  }

  function getSyncData() {
    if (!window.kemalSiteStore) {
      return fallbackDefaults();
    }
    return window.kemalSiteStore.getCurrentDataSync();
  }

  function normalizeGradeKey(value) {
    const key = String(value || '').trim();
    if (GRADE_META[key]) {
      return key;
    }
    if (key === 'ortaokul') {
      return '5';
    }
    return '';
  }

  function normalizeSubjectKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    return SUBJECT_ALIASES[raw] || raw;
  }

  function buildSubjectUrl(grade, subject) {
    const safeGrade = normalizeGradeKey(grade);
    const safeSubject = normalizeSubjectKey(subject);

    if (!safeGrade || !safeSubject) {
      return '#';
    }

    return '/ders.html?sinif=' + encodeURIComponent(safeGrade) + '&ders=' + encodeURIComponent(safeSubject);
  }

  function findDynamicSubject(grade, subject) {
    const safeGrade = normalizeGradeKey(grade);
    const safeSubject = normalizeSubjectKey(subject);
    return dynamicNavItems.find(function(item) {
      return normalizeGradeKey(item.sinif) === safeGrade && normalizeSubjectKey(item.ders_key) === safeSubject;
    }) || dynamicNavItems.find(function(item) {
      return normalizeSubjectKey(item.ders_key) === safeSubject;
    }) || null;
  }

  function stripGradePrefix(label, gradeLabel) {
    const cleanLabel = String(label || '').trim();
    const cleanGrade = String(gradeLabel || '').trim();
    if (cleanGrade && cleanLabel.toLowerCase().indexOf(cleanGrade.toLowerCase()) === 0) {
      return cleanLabel.slice(cleanGrade.length).replace(/^[-\s.]+/, '').trim() || cleanLabel;
    }
    return cleanLabel;
  }

  function getSubjectPageData(grade, subject) {
    const safeGrade = normalizeGradeKey(grade);
    const safeSubject = normalizeSubjectKey(subject);
    const gradeMeta = GRADE_META[safeGrade];
    const dynamicSubject = findDynamicSubject(safeGrade, safeSubject);
    const subjectMeta = SUBJECT_META[safeSubject] || (dynamicSubject ? {
      label: stripGradePrefix(dynamicSubject.label, gradeMeta ? gradeMeta.label : ''),
      icon: dynamicSubject.icon || '📄',
      color: gradeMeta ? gradeMeta.color : '#6C3DED',
      description: dynamicSubject.label + ' için eklenen dokümanlar, bağlantılar ve sınıf içeriği bu sayfada toplanır.',
      focus: 'Bu ders için eklenen PDF dokümanlar ve güncel içerikler',
      features: [
        'Üst menüden doğrudan erişilebilir ders sayfası',
        'Doküman yönetiminden eklenen PDF içeriklerle otomatik beslenir',
        'Sınıf paneli ve ana site akışıyla birlikte çalışır',
      ],
    } : null);

    if (!gradeMeta || !subjectMeta) {
      return null;
    }

    const title = gradeMeta.label + ' ' + subjectMeta.label;
    const tertiaryHref = Number(safeGrade) >= 5 ? '/sinav_sitesi/index.html' : '/yeni.html';
    const tertiaryLabel = Number(safeGrade) >= 5 ? 'Sınav Merkezi' : 'Yeni İçerikler';
    const tertiaryIcon = Number(safeGrade) >= 5 ? '📝' : '🌟';

    return {
      grade: safeGrade,
      subject: safeSubject,
      title,
      icon: subjectMeta.icon,
      color: subjectMeta.color || gradeMeta.color,
      ribbon: gradeMeta.ribbon,
      description: subjectMeta.description,
      focus: subjectMeta.focus,
      features: subjectMeta.features || [],
      panelHref: gradeMeta.panelHref,
      panelLabel: gradeMeta.panelLabel,
      gradeLabel: gradeMeta.label,
      actions: [
        {
          label: gradeMeta.panelLabel,
          href: gradeMeta.panelHref,
          emoji: '🏠',
          tone: 'purple',
          description: 'Sınıfın tüm içerik akışına geri dön.',
        },
        {
          label: 'Hızlı Okuma Merkezi',
          href: '/hizli-okuma/index.html',
          emoji: '📖',
          tone: 'coral',
          description: 'Akıcılık ve dikkat çalışmalarıyla destekle.',
        },
        {
          label: 'Eğitim Oyunları',
          href: '/oyun/oyunlar.html',
          emoji: '🎮',
          tone: 'teal',
          description: 'Dersi oyunlaştırılmış etkinliklerle pekiştir.',
        },
        {
          label: tertiaryLabel,
          href: tertiaryHref,
          emoji: tertiaryIcon,
          tone: 'yellow',
          description: 'Güncel eklenen içerik ve araçlara hızlı ulaş.',
        },
      ],
      support: [
        'Bu ders için eski kırık bağlantılar yeni bir merkezde toplandı.',
        'Yeni içerikler eklendikçe aynı rota üzerinden erişilebilir olacak.',
        'Sınıf paneli, hızlı okuma ve oyunlar arasında tek tıkla geçiş yapabilirsin.',
      ],
    };
  }

  function getGradeMenuSections() {
    function getItemGrade(item) {
      if (item && item.grade) {
        return normalizeGradeKey(item.grade);
      }
      try {
        const query = String(item && item.href ? item.href : '').split('?')[1] || '';
        return normalizeGradeKey(new URLSearchParams(query).get('sinif'));
      } catch (error) {
        return '';
      }
    }

    function insertDynamicItem(section, item) {
      const grade = normalizeGradeKey(item.sinif);
      const href = buildSubjectUrl(grade, item.ders_key);
      if (href === '#') return;
      const exists = section.items.some(function(existing) { return existing.href === href; });
      if (exists) return;

      const menuItem = { href: href, label: item.label, icon: item.icon || '📄', grade: grade };
      if (section.navKey !== 'ortaokul') {
        section.items.push(menuItem);
        return;
      }

      let insertAfterIndex = -1;
      section.items.forEach(function(existing, index) {
        if (getItemGrade(existing) === grade) {
          insertAfterIndex = index;
        }
      });

      if (insertAfterIndex >= 0) {
        section.items.splice(insertAfterIndex + 1, 0, menuItem);
      } else {
        section.items.push(menuItem);
      }
    }

    const sections = [
      {
        navKey: '1',
        gradeKey: '1',
        label: '1. Sınıf',
        badgeKey: '1sinif',
        items: [
          { href: GRADE_META['1'].panelHref, label: GRADE_META['1'].panelLabel, icon: '🏠', panel: true },
          { href: buildSubjectUrl('1', 'turkce'), label: 'Türkçe', icon: '📝' },
          { href: buildSubjectUrl('1', 'matematik'), label: 'Matematik', icon: '🔢' },
          { href: buildSubjectUrl('1', 'hayat-bilgisi'), label: 'Hayat Bilgisi', icon: '🌱' },
        ],
      },
      {
        navKey: '2',
        gradeKey: '2',
        label: '2. Sınıf',
        badgeKey: '2sinif',
        items: [
          { href: GRADE_META['2'].panelHref, label: GRADE_META['2'].panelLabel, icon: '🏠', panel: true },
          { href: buildSubjectUrl('2', 'turkce'), label: 'Türkçe', icon: '📝' },
          { href: buildSubjectUrl('2', 'matematik'), label: 'Matematik', icon: '🔢' },
          { href: buildSubjectUrl('2', 'hayat-bilgisi'), label: 'Hayat Bilgisi', icon: '🌱' },
        ],
      },
      {
        navKey: '3',
        gradeKey: '3',
        label: '3. Sınıf',
        badgeKey: '3sinif',
        items: [
          { href: GRADE_META['3'].panelHref, label: GRADE_META['3'].panelLabel, icon: '🏠', panel: true },
          { href: buildSubjectUrl('3', 'turkce'), label: 'Türkçe', icon: '📝' },
          { href: buildSubjectUrl('3', 'matematik'), label: 'Matematik', icon: '🔢' },
          { href: buildSubjectUrl('3', 'hayat-bilgisi'), label: 'Hayat Bilgisi', icon: '🌱' },
          { href: buildSubjectUrl('3', 'fen-bilimleri'), label: 'Fen Bilimleri', icon: '🔬' },
        ],
      },
      {
        navKey: '4',
        gradeKey: '4',
        label: '4. Sınıf',
        badgeKey: '4sinif',
        items: [
          { href: GRADE_META['4'].panelHref, label: GRADE_META['4'].panelLabel, icon: '🏠', panel: true },
          { href: buildSubjectUrl('4', 'turkce'), label: 'Türkçe', icon: '📝' },
          { href: buildSubjectUrl('4', 'matematik'), label: 'Matematik', icon: '🔢' },
          { href: buildSubjectUrl('4', 'sosyal-bilgiler'), label: 'Sosyal Bilgiler', icon: '🌍' },
          { href: buildSubjectUrl('4', 'fen-bilimleri'), label: 'Fen Bilimleri', icon: '🔬' },
        ],
      },
      {
        navKey: 'ortaokul',
        gradeKey: 'orta',
        label: 'Ortaokul',
        badgeKey: 'ortaokul',
        items: [
          { href: '/siniflar/ortaokul.html', label: 'Ortaokul Paneli', icon: '🏠', panel: true },
          { href: buildSubjectUrl('5', 'matematik'), label: '5. Sınıf Matematik', icon: '🔢' },
          { href: buildSubjectUrl('5', 'fen-bilimleri'), label: '5. Sınıf Fen', icon: '🔬' },
          { href: buildSubjectUrl('6', 'matematik'), label: '6. Sınıf Matematik', icon: '🔢' },
          { href: buildSubjectUrl('6', 'fen-bilimleri'), label: '6. Sınıf Fen', icon: '🔬' },
          { href: buildSubjectUrl('7', 'matematik'), label: '7. Sınıf Matematik', icon: '🔢' },
          { href: buildSubjectUrl('7', 'fen-bilimleri'), label: '7. Sınıf Fen', icon: '🔬' },
        ],
      },
    ];

    // Dinamik öğeleri statik sectionlara ekle
    if (dynamicNavItems.length) {
      dynamicNavItems.forEach(function(extra) {
        var section = sections.find(function(s) { return s.navKey === extra.nav_key; });
        if (!section) return;
        insertDynamicItem(section, extra);
      });
    }

    return sections;
  }

  function buildLegacyRouteMap() {
    const map = {
      '/sinav.html': '/sinav_sitesi/index.html',
      '/oyunlar.html': '/oyun/oyunlar.html',
      '/3_sinif/fen/fen.html': buildSubjectUrl('3', 'fen-bilimleri'),
      '/4_sinif/sosyal/sosyal.html': buildSubjectUrl('4', 'sosyal-bilgiler'),
      '/7_sinif/fen_bilimleri/matematik.html': buildSubjectUrl('7', 'matematik'),
      '/ortaokul/mat/matematik.html': buildSubjectUrl('5', 'matematik'),
    };

    [
      ['1', 'turkce', '/1_sinif/turkce/turkce.html'],
      ['1', 'matematik', '/1_sinif/matematik/matematik.html'],
      ['1', 'hayat-bilgisi', '/1_sinif/hayat_bilgisi/hayat_bilgisi.html'],
      ['2', 'okuma-anlama', '/2_sinif/okuma_anlama/okuma_anlama.html'],
      ['2', 'turkce', '/2_sinif/turkce/turkce.html'],
      ['2', 'matematik', '/2_sinif/matematik/matematik.html'],
      ['2', 'hayat-bilgisi', '/2_sinif/hayat_bilgisi/hayat_bilgisi.html'],
      ['3', 'okuma-anlama', '/3_sinif/okuma_anlama/okuma_anlama.html'],
      ['3', 'turkce', '/3_sinif/turkce/turkce.html'],
      ['3', 'matematik', '/3_sinif/matematik/matematik.html'],
      ['3', 'hayat-bilgisi', '/3_sinif/hayat_bilgisi/hayat_bilgisi.html'],
      ['3', 'fen-bilimleri', '/3_sinif/fen_bilimleri/fen_bilimleri.html'],
      ['4', 'okuma-anlama', '/4_sinif/okuma_anlama/okuma_anlama.html'],
      ['4', 'turkce', '/4_sinif/turkce/turkce.html'],
      ['4', 'matematik', '/4_sinif/matematik/matematik.html'],
      ['4', 'sosyal-bilgiler', '/4_sinif/sosyal_bilgiler/sosyal_bilgiler.html'],
      ['4', 'fen-bilimleri', '/4_sinif/fen_bilimleri/fen_bilimleri.html'],
      ['5', 'matematik', '/5_sinif/matematik/matematik.html'],
      ['5', 'fen-bilimleri', '/5_sinif/fen_bilimleri/fen_bilimleri.html'],
      ['6', 'matematik', '/6_sinif/matematik/matematik.html'],
      ['6', 'fen-bilimleri', '/6_sinif/fen_bilimleri/fen_bilimleri.html'],
      ['7', 'matematik', '/7_sinif/matematik/matematik.html'],
      ['7', 'fen-bilimleri', '/7_sinif/fen_bilimleri/fen_bilimleri.html'],
    ].forEach(function(entry) {
      map[entry[2]] = buildSubjectUrl(entry[0], entry[1]);
    });

    [
      '/1_sinif/oyun/oyunlar.html',
      '/2_sinif/oyun/oyunlar.html',
      '/3_sinif/oyun/oyunlar.html',
      '/4_sinif/oyun/oyunlar.html',
    ].forEach(function(pathname) {
      map[pathname] = '/oyun/oyunlar.html';
    });

    return map;
  }

  const LEGACY_ROUTE_MAP = buildLegacyRouteMap();

  function normalizePathname(pathname) {
    if (!pathname) {
      return '';
    }
    const cleaned = pathname.replace(/\/{2,}/g, '/');
    if (cleaned.length > 1 && cleaned.endsWith('/')) {
      return cleaned.slice(0, -1);
    }
    return cleaned;
  }

  function getLegacyRedirectPath(pathname) {
    const normalized = normalizePathname(pathname);
    return LEGACY_ROUTE_MAP[normalized] || '';
  }

  function repairLegacyLinks(scope) {
    const root = scope || document;

    root.querySelectorAll('a[href]').forEach(function(link) {
      const rawHref = link.getAttribute('href');
      if (!rawHref) {
        return;
      }

      if (
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:') ||
        rawHref.startsWith('http://') ||
        rawHref.startsWith('https://')
      ) {
        return;
      }

      try {
        const parsed = new URL(rawHref, window.location.origin);
        if (parsed.origin !== window.location.origin) {
          return;
        }
        const redirect = getLegacyRedirectPath(parsed.pathname);
        if (!redirect) {
          return;
        }
        const target = new URL(redirect, window.location.origin);
        if (parsed.hash && !target.hash) {
          target.hash = parsed.hash;
        }
        link.setAttribute('href', target.pathname + target.search + target.hash);
      } catch (error) {
        /* no-op */
      }
    });
  }

  function ensureScript(src, globalName) {
    if (globalName && window[globalName]) {
      return Promise.resolve(window[globalName]);
    }

    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      return new Promise(function(resolve, reject) {
        if (!globalName || window[globalName]) {
          resolve(globalName ? window[globalName] : true);
          return;
        }
        existing.addEventListener('load', function() {
          resolve(globalName ? window[globalName] : true);
        }, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }

    return new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function() {
        resolve(globalName ? window[globalName] : true);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function ensureContentFeed() {
    if (window.kemalContentFeed) {
      return Promise.resolve(window.kemalContentFeed);
    }
    if (!contentFeedScriptPromise) {
      contentFeedScriptPromise = ensureScript('/js/content-feed.js', 'kemalContentFeed');
    }
    return contentFeedScriptPromise;
  }

  function ensureContentReactions() {
    if (window.kemalContentReactions) {
      return Promise.resolve(window.kemalContentReactions);
    }
    if (!contentReactionsScriptPromise) {
      contentReactionsScriptPromise = ensureScript('/js/content-reactions.js', 'kemalContentReactions')
        .catch(function() {
          return null;
        });
    }
    return contentReactionsScriptPromise;
  }

  function ensureContentSaves() {
    if (window.kemalContentSaves) {
      return Promise.resolve(window.kemalContentSaves);
    }
    if (!contentSavesScriptPromise) {
      contentSavesScriptPromise = ensureScript('/js/content-saves.js', 'kemalContentSaves')
        .catch(function() {
          return null;
        });
    }
    return contentSavesScriptPromise;
  }

  function scanContentControls(root) {
    ensureContentReactions().then(function(api) {
      if (api && typeof api.scheduleScan === 'function') api.scheduleScan(root || document);
    });
    ensureContentSaves().then(function(api) {
      if (api && typeof api.scheduleScan === 'function') api.scheduleScan(root || document);
    });
  }

  function ensureUserAuth() {
    if (window.kemalUserAuth) {
      return Promise.resolve(window.kemalUserAuth);
    }
    if (!userAuthScriptPromise) {
      userAuthScriptPromise = ensureScript('/js/user-auth.js', 'kemalUserAuth')
        .catch(function() {
          return null;
        });
    }
    return userAuthScriptPromise;
  }

  function getStaticSearchItems() {
    return [
      { uid: 'static:home', title: 'Ana Sayfa', href: '/index.html', icon: '🏠', gradeLabel: 'Genel', subjectLabel: 'Başlangıç', contentTypeLabel: 'Sayfa' },
      { uid: 'static:latest', title: 'Yeni İçerikler', href: '/yeni.html', icon: '🌟', gradeLabel: 'Genel', subjectLabel: 'Güncel', contentTypeLabel: 'Liste' },
      { uid: 'static:reading', title: 'Hızlı Okuma Merkezi', href: '/hizli-okuma/index.html', icon: '📖', gradeLabel: '1-8. Sınıf', subjectLabel: 'Okuma Anlama', contentTypeLabel: 'Merkez' },
      { uid: 'static:games', title: 'Eğitim Oyunları', href: '/oyun/oyunlar.html', icon: '🎮', gradeLabel: 'Genel', subjectLabel: 'Oyunlar', contentTypeLabel: 'Merkez' },
      { uid: 'static:exams', title: 'Sınav Merkezi', href: '/sinav_sitesi/index.html', icon: '📝', gradeLabel: '1-8. Sınıf', subjectLabel: 'Deneme ve Test', contentTypeLabel: 'Merkez' },
      { uid: 'static:tools', title: 'Öğretmen Araçları', href: '/ogretmen-araclari.html', icon: '⏱️', gradeLabel: 'Öğretmen', subjectLabel: 'Araçlar', contentTypeLabel: 'Sayfa' },
      { uid: 'static:certificate-studio', title: 'Belge ve Sertifika Stüdyosu', href: '/ogretmen/belge-studyo.html', icon: '🏅', gradeLabel: 'Öğretmen', subjectLabel: 'Belge Tasarımı', contentTypeLabel: 'Araç' },
      { uid: 'static:plan', title: 'Öğretmen Ders Programı', href: '/ogretmen-ders-plani.html', icon: '📅', gradeLabel: 'Öğretmen', subjectLabel: 'Planlama', contentTypeLabel: 'Araç' },
      { uid: 'static:about', title: 'Hakkımda', href: '/hakkimda.html', icon: '👨‍🏫', gradeLabel: 'Genel', subjectLabel: 'Kemal Öğretmen', contentTypeLabel: 'Sayfa' },
      { uid: 'static:contact', title: 'İletişim', href: '/iletisim.html', icon: '✉️', gradeLabel: 'Genel', subjectLabel: 'Destek', contentTypeLabel: 'Sayfa' },
      { uid: 'static:grade1', title: '1. Sınıf Paneli', href: '/siniflar/1-sinif.html', icon: '📕', gradeLabel: '1. Sınıf', subjectLabel: 'Panel', contentTypeLabel: 'Sınıf' },
      { uid: 'static:grade2', title: '2. Sınıf Paneli', href: '/siniflar/2-sinif.html', icon: '📗', gradeLabel: '2. Sınıf', subjectLabel: 'Panel', contentTypeLabel: 'Sınıf' },
      { uid: 'static:grade3', title: '3. Sınıf Paneli', href: '/siniflar/3-sinif.html', icon: '📘', gradeLabel: '3. Sınıf', subjectLabel: 'Panel', contentTypeLabel: 'Sınıf' },
      { uid: 'static:grade4', title: '4. Sınıf Paneli', href: '/siniflar/4-sinif.html', icon: '📙', gradeLabel: '4. Sınıf', subjectLabel: 'Panel', contentTypeLabel: 'Sınıf' },
      { uid: 'static:middle', title: 'Ortaokul Paneli', href: '/siniflar/ortaokul.html', icon: '🎒', gradeLabel: '5-8. Sınıf', subjectLabel: 'Panel', contentTypeLabel: 'Sınıf' },
    ];
  }

  function normalizeSearchText(value) {
    return safeTrim(value)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function itemSearchBlob(item) {
    return normalizeSearchText([
      item.title,
      item.gradeLabel,
      item.subjectLabel,
      item.contentTypeLabel,
      item.sourceLabel,
      item.href,
    ].join(' '));
  }

  function getLockedStudentGrade() {
    return window.kemalUserAuth && typeof window.kemalUserAuth.getStudentGradeLevel === 'function'
      ? window.kemalUserAuth.getStudentGradeLevel()
      : null;
  }

  function itemMatchesLockedGrade(item, lockedGrade) {
    if (!lockedGrade || !item) return true;
    if (window.kemalContentFeed && typeof window.kemalContentFeed.isPublicItem === 'function' && window.kemalContentFeed.isPublicItem(item)) {
      return true;
    }
    const grades = Array.isArray(item.grades) ? item.grades : (item.grade ? [item.grade] : []);
    if (!grades.length && !item.gradeLabel) return true;
    return grades.some(function(grade) {
      return String(grade) === String(lockedGrade);
    }) || String(item.gradeLabel || '').indexOf(String(lockedGrade) + '.') === 0;
  }

  async function loadSiteSearchItems() {
    if (siteSearchState.items) {
      return siteSearchState.items;
    }
    siteSearchState.loading = true;
    renderSiteSearch();

    let dynamicItems = [];
    try {
      const feed = await ensureContentFeed();
      dynamicItems = await feed.getAllItems({ forceRefresh: false });
    } catch (error) {
      dynamicItems = [];
    }

    const lockedGrade = getLockedStudentGrade();
    const seen = {};
    siteSearchState.items = getStaticSearchItems().concat(dynamicItems || []).filter(function(item) {
      const key = (item.href || '') + '|' + (item.title || '');
      if (!item || !item.title || seen[key]) {
        return false;
      }
      if (!itemMatchesLockedGrade(item, lockedGrade)) {
        return false;
      }
      seen[key] = true;
      return true;
    });
    siteSearchState.loading = false;
    renderSiteSearch();
    return siteSearchState.items;
  }

  function buildSearchShell() {
    return '' +
      '<div class="site-search-overlay" id="siteSearchOverlay" aria-hidden="true">' +
        '<div class="site-search-panel" role="dialog" aria-modal="true" aria-labelledby="siteSearchTitle">' +
          '<div class="site-search-head">' +
            '<div>' +
              '<div class="site-search-kicker">Site içi arama</div>' +
              '<h2 id="siteSearchTitle">İçerik bul</h2>' +
            '</div>' +
            '<button class="site-search-close" type="button" id="siteSearchClose" aria-label="Aramayı kapat">×</button>' +
          '</div>' +
          '<label class="site-search-box" for="siteSearchInput">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>' +
            '<input id="siteSearchInput" type="search" autocomplete="off" placeholder="Doküman, test, okuma metni veya oyun ara">' +
          '</label>' +
          '<div class="site-search-status" id="siteSearchStatus">Aramak için en az 2 harf yaz.</div>' +
          '<div class="site-search-results" id="siteSearchResults"></div>' +
        '</div>' +
      '</div>';
  }

  function renderSiteSearch() {
    const status = document.getElementById('siteSearchStatus');
    const results = document.getElementById('siteSearchResults');
    const input = document.getElementById('siteSearchInput');
    if (!status || !results || !input) {
      return;
    }

    const query = normalizeSearchText(input.value);
    siteSearchState.query = query;
    if (siteSearchState.loading) {
      status.textContent = 'İçerikler taranıyor...';
      results.innerHTML = '';
      return;
    }
    if (query.length < 2) {
      status.textContent = 'Aramak için en az 2 harf yaz.';
      results.innerHTML = '';
      return;
    }

    const items = (siteSearchState.items || []).filter(function(item) {
      return itemSearchBlob(item).indexOf(query) !== -1;
    }).slice(0, 36);

    status.textContent = items.length
      ? items.length + ' sonuç bulundu'
      : 'Sonuç bulunamadı';

    results.innerHTML = items.length
      ? items.map(function(item) {
        return '' +
          '<a class="site-search-result" href="' + escAttr(item.href || '#') + '" data-access-scope="' + escAttr(item.accessScope || 'public') + '">' +
            '<span class="site-search-result-icon">' + escHtml(item.icon || '📄') + '</span>' +
            '<span class="site-search-result-copy">' +
              '<strong>' + escHtml(item.title || 'İçerik') + '</strong>' +
              '<small>' + escHtml([item.gradeLabel, item.subjectLabel, item.contentTypeLabel || item.sourceLabel].filter(Boolean).join(' · ')) + '</small>' +
            '</span>' +
          '</a>';
      }).join('')
      : '<div class="site-search-empty">Bu kelimeyle eşleşen içerik bulunamadı.</div>';
  }

  function openSiteSearch() {
    const overlay = document.getElementById('siteSearchOverlay');
    const input = document.getElementById('siteSearchInput');
    if (!overlay || !input) {
      return;
    }
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(function() {
      input.focus();
      input.select();
    }, 40);
    loadSiteSearchItems();
  }

  function closeSiteSearch() {
    const overlay = document.getElementById('siteSearchOverlay');
    if (!overlay) {
      return;
    }
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initSiteSearch() {
    const trigger = document.getElementById('siteSearchOpen');
    const overlay = document.getElementById('siteSearchOverlay');
    const close = document.getElementById('siteSearchClose');
    const input = document.getElementById('siteSearchInput');
    if (!trigger || !overlay || !close || !input || trigger.dataset.bound === '1') {
      return;
    }

    trigger.dataset.bound = '1';
    trigger.addEventListener('click', function(event) {
      event.preventDefault();
      openSiteSearch();
    });
    close.addEventListener('click', closeSiteSearch);
    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) {
        closeSiteSearch();
      }
    });
    input.addEventListener('input', function() {
      loadSiteSearchItems().then(renderSiteSearch);
    });

    if (!document.body.dataset.kemalSearchKeyBound) {
      document.body.dataset.kemalSearchKeyBound = '1';
      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
          closeSiteSearch();
        }
        if (
          (event.key === '/' || (event.key && event.key.toLocaleLowerCase('tr-TR') === 'k' && (event.metaKey || event.ctrlKey))) &&
          !event.target.closest('input, textarea, select, [contenteditable="true"]')
        ) {
          event.preventDefault();
          openSiteSearch();
        }
      });
    }
  }

  function buildExtraMenuItems(data) {
    const extraMenus = Array.isArray(data.ekMenuler)
      ? data.ekMenuler.filter(function(item) {
        if (!item || !item.ad || !item.url) return false;
        const url = String(item.url || '').toLowerCase();
        return !(
          url.indexOf('/admin') === 0 ||
          url.indexOf('/sinav_sitesi/admin') === 0 ||
          url.indexOf('/giris.html') === 0 ||
          url.indexOf('/kayit.html') === 0 ||
          url.indexOf('/ogretmen-paneli.html') === 0 ||
          url.indexOf('/ogrenci-paneli.html') === 0 ||
          url.indexOf('/veli-paneli.html') === 0
        );
      })
      : [];

    return extraMenus.map(function(item) {
      return '<li class="nav-item nav-item-extra"><a href="' + item.url + '" class="nav-btn">' + item.ad + '</a></li>';
    }).join('');
  }

  function buildAccountBar() {
    return '<div class="site-account-bar" id="siteAccountBar">' +
      '<div class="site-account-inner">' +
        '<span id="siteAccountSummary">Hesap bilgisi kontrol ediliyor…</span>' +
        '<span class="site-account-sep" id="siteAccountSep">•</span>' +
        '<a class="site-account-link strong" id="siteAccountPrimary" href="/giris.html">Giriş Yap</a>' +
        '<a class="site-account-link" id="siteAccountSecondary" href="/kayit.html">Kayıt Ol</a>' +
        '<button class="site-account-link site-account-button" id="siteAccountLogout" type="button" hidden>Çıkış</button>' +
      '</div>' +
    '</div>';
  }

  function getAccountPanelHref(profile) {
    if (window.kemalUserAuth && typeof window.kemalUserAuth.getPanelHref === 'function') {
      return window.kemalUserAuth.getPanelHref(profile);
    }
    if (profile && profile.role === 'teacher') return '/ogretmen-paneli.html';
    if (profile && profile.role === 'student') return '/ogrenci-paneli.html';
    if (profile && profile.role === 'parent') return '/veli-paneli.html';
    return '/giris.html';
  }

  function renderAccountBar(authState) {
    const summary = document.getElementById('siteAccountSummary');
    const primary = document.getElementById('siteAccountPrimary');
    const secondary = document.getElementById('siteAccountSecondary');
    const logout = document.getElementById('siteAccountLogout');
    const sep = document.getElementById('siteAccountSep');
    if (!summary || !primary || !secondary || !logout) {
      return;
    }

    const state = authState || (window.kemalUserAuth && window.kemalUserAuth.getState ? window.kemalUserAuth.getState() : {});
    const user = state && state.user;
    const profile = state && state.profile;

    if (user) {
      const displayName = window.kemalUserAuth && window.kemalUserAuth.getDisplayName
        ? window.kemalUserAuth.getDisplayName()
        : ((profile && profile.full_name) || user.email || 'Hesabım');
      summary.textContent = 'Merhaba, ' + displayName;
      primary.textContent = 'Hesabım';
      primary.href = getAccountPanelHref(profile);
      secondary.textContent = profile && profile.role === 'teacher'
        ? 'Öğretmen Paneli'
        : (profile && profile.role === 'parent' ? 'Veli Paneli' : 'Öğrenci Paneli');
      secondary.href = getAccountPanelHref(profile);
      logout.hidden = false;
      if (sep) sep.hidden = false;
      return;
    }

    summary.textContent = 'İlerlemeni saklamak için öğrenci hesabınla giriş yap.';
    primary.textContent = 'Giriş Yap';
    primary.href = '/giris.html';
    secondary.textContent = 'Kayıt Ol';
    secondary.href = '/kayit.html';
    logout.hidden = true;
    if (sep) sep.hidden = false;
  }

  function initSiteAccount() {
    const logout = document.getElementById('siteAccountLogout');
    if (document.body && document.body.dataset.kemalAccountBound !== '1') {
      document.body.dataset.kemalAccountBound = '1';
      window.addEventListener('kemal-user-auth-changed', function(event) {
        renderAccountBar(event.detail || {});
      });
    }
    if (logout && logout.dataset.bound !== '1') {
      logout.dataset.bound = '1';
      logout.addEventListener('click', function() {
        ensureUserAuth().then(function(api) {
          if (api && typeof api.signOut === 'function') {
            api.signOut().then(function() {
              renderAccountBar();
              if (/\/(ogrenci-paneli|ogretmen-paneli)\.html$/.test(window.location.pathname)) {
                window.location.href = '/giris.html';
              }
            });
          }
        });
      });
    }

    ensureUserAuth().then(function(api) {
      if (!api) {
        renderAccountBar({ user: null, profile: null });
        return;
      }
      return api.ready().then(renderAccountBar);
    });
  }

  function buildNavbar(data) {
    const badges = data.menuBadges || {};
    const menuSections = getGradeMenuSections();
    const extraMenuItems = buildExtraMenuItems(data);

    function badge(key, defaultActive) {
      if (badges[key] === false) {
        return '';
      }
      if (badges[key] || defaultActive) {
        return '<span class="new-badge">YENİ</span>';
      }
      return '';
    }

    function renderDropdown(section) {
      const dropdownItems = section.items.map(function(item, index) {
        const classNames = ['dd-item'];
        if (item.panel) {
          classNames.push('dd-panel-link');
        }
        const separator = index === 1 ? '<div class="dd-sep"></div>' : '';
        return separator + '<a href="' + item.href + '" class="' + classNames.join(' ') + '"><span class="dd-icon">' + item.icon + '</span> ' + item.label + '</a>';
      }).join('');

      return '<li class="nav-item" data-grade="' + section.gradeKey + '" data-nav-key="' + section.navKey + '">' +
        '<button class="nav-btn">' + section.label + ' ' + badge(section.badgeKey) +
          '<svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>' +
        '</button>' +
        '<div class="dropdown-panel">' + dropdownItems + '</div>' +
      '</li>';
    }

    return '<nav class="navbar" id="mainNav">' +
      '<a href="/index.html" class="nav-logo" aria-label="Kemal Öğretmenim ana sayfa" title="Kemal Öğretmenim">' +
        '<img src="/gorseller/logo.png" alt="Kemal Öğretmenim" onerror="this.style.display=\'none\'">' +
      '</a>' +
      '<button class="site-search-trigger" id="siteSearchOpen" type="button" aria-label="Site içinde ara">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4.2-4.2"></path></svg>' +
        '<span>Ara</span>' +
      '</button>' +
      '<button class="hamburger" id="hamBtn" aria-label="Menüyü Aç/Kapat">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<ul class="nav-links" id="navLinks">' +
        menuSections.map(renderDropdown).join('') +
        '<li class="nav-item" data-grade="hizli" data-nav-key="hizliokuma">' +
          '<a href="/hizli-okuma/index.html" class="nav-btn nav-btn-okuma">📖 Hızlı Okuma ' + badge('hizliokuma', true) + '</a>' +
        '</li>' +
        '<li class="nav-item" data-grade="sinav" data-nav-key="sinavlar">' +
          '<a href="/sinav_sitesi/index.html" class="nav-btn nav-btn-sinav">📝 Sınavlar ' + badge('sinavlar', true) + '</a>' +
        '</li>' +
        '<li class="nav-item" data-grade="oyunlar" data-nav-key="oyunlar">' +
          '<a href="/oyun/oyunlar.html" class="nav-btn nav-btn-oyun">🎮 Oyunlar ' + badge('oyunlar', true) + '</a>' +
        '</li>' +
        extraMenuItems +
        '<li class="nav-item" data-grade="ogretmen" data-nav-key="ogretmen">' +
          '<button class="nav-btn">Öğretmen' +
            '<svg class="nav-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l4 4 4-4"/></svg>' +
          '</button>' +
          '<div class="dropdown-panel">' +
            '<a href="/hakkimda.html" class="dd-item"><span class="dd-icon">👨‍🏫</span> Hakkımda</a>' +
            '<a href="/iletisim.html" class="dd-item"><span class="dd-icon">✉️</span> İletişim</a>' +
            '<a href="/ogretmen-ders-plani.html" class="dd-item"><span class="dd-icon">📅</span> Ders Programı</a>' +
            '<a href="/ogretmen-araclari.html" class="dd-item"><span class="dd-icon">⏱️</span> Öğretmen Araçları</a>' +
            '<a href="/ogretmen/belge-studyo.html" class="dd-item"><span class="dd-icon">🏅</span> Belge ve Sertifika Stüdyosu</a>' +
            '<a href="/admin/index.html" class="dd-item"><span class="dd-icon">⚙️</span> Yönetim Merkezi</a>' +
          '</div>' +
        '</li>' +
      '</ul>' +
    '</nav>';
  }

  function buildFooter() {
    return '<footer class="site-footer" id="kemalFooter">' +
      '<div class="footer-grid">' +
        '<div class="footer-brand">' +
          '<h3>🌟 Kemal Öğretmenim</h3>' +
          '<p>Eğitim sevgi ile başlar. Çocuklarımızın merakla öğrenmesi için buradayım.</p>' +
          '<div class="social-row">' +
            '<a href="https://instagram.com/kemalkogretmenim" target="_blank" rel="noopener" class="soc-btn">📸</a>' +
            '<a href="https://youtube.com/@kemalkogretmenim" target="_blank" rel="noopener" class="soc-btn">▶️</a>' +
            '<a href="https://twitter.com/kemalkogretmen" target="_blank" rel="noopener" class="soc-btn">🐦</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Sınıflar</h4>' +
          '<ul class="footer-links">' +
            '<li><a href="/siniflar/1-sinif.html">1. Sınıf</a></li>' +
            '<li><a href="/siniflar/2-sinif.html">2. Sınıf</a></li>' +
            '<li><a href="/siniflar/3-sinif.html">3. Sınıf</a></li>' +
            '<li><a href="/siniflar/4-sinif.html">4. Sınıf</a></li>' +
            '<li><a href="/siniflar/ortaokul.html">Ortaokul</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Keşfet</h4>' +
          '<ul class="footer-links">' +
            '<li><a href="/hizli-okuma/index.html">📖 Hızlı Okuma</a></li>' +
            '<li><a href="/oyun/oyunlar.html">🎮 Oyunlar</a></li>' +
            '<li><a href="/sinav_sitesi/index.html">📝 Sınav Merkezi</a></li>' +
            '<li><a href="/ogretmen-ders-plani.html">📅 Ders Programı</a></li>' +
            '<li><a href="/ogretmen-araclari.html">⏱️ Öğretmen Araçları</a></li>' +
            '<li><a href="/hakkimda.html">Hakkımda</a></li>' +
            '<li><a href="/iletisim.html">İletişim</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>© 2026 Kemal Öğretmen | <a href="https://kemalogretmenim.com.tr" style="color:inherit;">kemalogretmenim.com.tr</a></span>' +
        '<span style="font-size:12px;">🌟 Eğitim Sevgi ile Başlar 🌟</span>' +
      '</div>' +
    '</footer>';
  }

  function buildAnnounce(data) {
    const activeAnnouncements = (data.duyurular || []).filter(function(item) {
      return item && item.aktif && item.metin;
    });

    if (!activeAnnouncements.length) {
      return '';
    }

    const lane = activeAnnouncements.map(function(item, index) {
      const separator = index === activeAnnouncements.length - 1 ? '' : '<span class="announce-sep">•</span>';
      return '<span class="announce-item">' + item.metin + '</span>' + separator;
    }).join('');

    return '<div class="announce-bar" id="announceBar"><div class="announce-track">' + lane + lane + '</div></div>';
  }

  function renderChrome(data) {
    const announceTargetId = 'kemalAnnounceMount';
    const navTargetId = 'kemalNavMount';
    const footerTargetId = 'kemalFooterMount';

    let announceTarget = document.getElementById(announceTargetId);
    if (!announceTarget) {
      announceTarget = document.createElement('div');
      announceTarget.id = announceTargetId;
      document.body.insertAdjacentElement('afterbegin', announceTarget);
    }

    let navTarget = document.getElementById(navTargetId);
    if (!navTarget) {
      navTarget = document.createElement('div');
      navTarget.id = navTargetId;
      announceTarget.insertAdjacentElement('afterend', navTarget);
    }

    let footerTarget = document.getElementById(footerTargetId);
    if (!footerTarget) {
      footerTarget = document.createElement('div');
      footerTarget.id = footerTargetId;
      document.body.insertAdjacentElement('beforeend', footerTarget);
    }

    announceTarget.innerHTML = buildAnnounce(data);
    navTarget.innerHTML = buildAccountBar() + buildNavbar(data) + buildSearchShell();
    footerTarget.innerHTML = buildFooter();
  }

  function initHamburger() {
    const btn = document.getElementById('hamBtn');
    const links = document.getElementById('navLinks');
    const navRoot = document.getElementById('mainNav');
    if (!btn || !links || btn.dataset.bound === '1') {
      return;
    }

    btn.dataset.bound = '1';
    btn.addEventListener('click', function() {
      btn.classList.toggle('open');
      links.classList.toggle('open');
      document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    links.querySelectorAll('.nav-item').forEach(function(item) {
      const navBtn = item.querySelector('.nav-btn:not(a)');
      if (!navBtn) {
        return;
      }
      navBtn.addEventListener('click', function() {
        const localNavRoot = document.getElementById('mainNav');
        if (window.innerWidth <= 1180 || (localNavRoot && localNavRoot.classList.contains('is-compact'))) {
          item.classList.toggle('open');
          if (item.classList.contains('open')) {
            window.setTimeout(function() {
              item.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }, 80);
          }
        }
      });
    });

    if (!document.body.dataset.kemalOutsideNavBound) {
      document.body.dataset.kemalOutsideNavBound = '1';
      document.addEventListener('click', function(event) {
        if (!event.target.closest('.navbar')) {
          const localBtn = document.getElementById('hamBtn');
          const localLinks = document.getElementById('navLinks');
          if (localBtn) {
            localBtn.classList.remove('open');
          }
          if (localLinks) {
            localLinks.classList.remove('open');
          }
          document.body.style.overflow = '';
        }
      });
    }

    if (navRoot) {
      syncAdaptiveNav();
    }
  }

  function syncAdaptiveNav() {
    const navRoot = document.getElementById('mainNav');
    const logo = navRoot ? navRoot.querySelector('.nav-logo') : null;
    const links = document.getElementById('navLinks');
    const btn = document.getElementById('hamBtn');
    if (!navRoot || !logo || !links || !btn) {
      return;
    }

    if (window.innerWidth <= 1180) {
      navRoot.classList.add('is-compact');
      return;
    }

    if (window.innerWidth >= 1440) {
      navRoot.classList.remove('is-compact');
      links.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
      return;
    }

    const wasOpen = links.classList.contains('open');
    navRoot.classList.remove('is-compact');
    links.classList.remove('open');
    btn.classList.remove('open');

    const availableWidth = navRoot.clientWidth - logo.offsetWidth - btn.offsetWidth - 36;
    const needsCompact = links.scrollWidth > availableWidth;
    navRoot.classList.toggle('is-compact', needsCompact);

    if (needsCompact && wasOpen) {
      links.classList.add('open');
      btn.classList.add('open');
    } else if (!needsCompact) {
      document.body.style.overflow = '';
    }
  }

  function bindAdaptiveNavResize() {
    if (document.body.dataset.kemalAdaptiveNavBound === '1') {
      return;
    }
    document.body.dataset.kemalAdaptiveNavBound = '1';
    let resizeTimer = 0;
    window.addEventListener('resize', function() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(syncAdaptiveNav, 120);
    }, { passive: true });
  }

  function getActiveNavKey() {
    const current = new URL(window.location.href);
    const path = current.pathname;

    if (path.startsWith('/hizli-okuma/')) {
      return 'hizliokuma';
    }
    if (path.startsWith('/sinav_sitesi/')) {
      return 'sinavlar';
    }
    if (path.startsWith('/oyun/')) {
      return 'oyunlar';
    }
    if (path === '/hakkimda.html' || path === '/iletisim.html' || path === '/yeni.html' || path === '/ogretmen-ders-plani.html') {
      return 'ogretmen';
    }
    if (path === '/ders.html') {
      const grade = normalizeGradeKey(current.searchParams.get('sinif'));
      if (grade === '1' || grade === '2' || grade === '3' || grade === '4') {
        return grade;
      }
      if (grade === '5' || grade === '6' || grade === '7') {
        return 'ortaokul';
      }
    }
    if (path.startsWith('/siniflar/1-sinif.html') || path.startsWith('/1_sinif/')) {
      return '1';
    }
    if (path.startsWith('/siniflar/2-sinif.html') || path.startsWith('/2_sinif/')) {
      return '2';
    }
    if (path.startsWith('/siniflar/3-sinif.html') || path.startsWith('/3_sinif/')) {
      return '3';
    }
    if (path.startsWith('/siniflar/4-sinif.html') || path.startsWith('/4_sinif/')) {
      return '4';
    }
    if (path.startsWith('/siniflar/ortaokul.html') || path.startsWith('/5_sinif/') || path.startsWith('/6_sinif/') || path.startsWith('/7_sinif/')) {
      return 'ortaokul';
    }
    return '';
  }

  function highlightActiveLink() {
    const current = new URL(window.location.href);
    const activeNavKey = getActiveNavKey();
    const navRoot = document.getElementById('mainNav');

    if (!navRoot) {
      return;
    }

    navRoot.querySelectorAll('.nav-item').forEach(function(item) {
      item.classList.toggle('is-active', item.dataset.navKey === activeNavKey);
    });

    navRoot.querySelectorAll('.dd-item, .nav-btn').forEach(function(link) {
      if (!link.href) {
        return;
      }
      try {
        const target = new URL(link.href, current.origin);
        const samePath = normalizePathname(target.pathname) === normalizePathname(current.pathname);
        const sameSubject =
          target.pathname !== '/ders.html' ||
          (
            target.searchParams.get('sinif') === current.searchParams.get('sinif') &&
            target.searchParams.get('ders') === current.searchParams.get('ders')
          );

        if (samePath && sameSubject && current.pathname !== '/') {
          link.style.color = 'var(--purple)';
          link.style.fontWeight = '800';
        } else {
          link.style.color = '';
          link.style.fontWeight = '';
        }
      } catch (error) {
        /* no-op */
      }
    });
  }

  function initScrollReveal() {
    const elements = document.querySelectorAll('.grade-card, .qcard, .hstat');
    if (!elements.length || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'slideUp .5s ease both';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(function(element) {
      observer.observe(element);
    });
  }

  function isChromeEnabled() {
    return !document.body || document.body.dataset.kemalChrome !== 'off';
  }

  async function fetchDynamicMenuItems() {
    try {
      if (!window.kemalSiteStore) return;
      var config = window.kemalSiteStore.getConfig ? window.kemalSiteStore.getConfig() : null;
      if (!config || !config.supabaseUrl) return;
      if (window.supabase) {
        var client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        });
        var result = await client.from('menu_ogeler').select('*').eq('active', true).order('sort_order', { ascending: true });
        if (!result.error && Array.isArray(result.data)) {
          dynamicNavItems = result.data;
        }
        return;
      }

      var endpoint = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/menu_ogeler?select=*&active=eq.true&order=sort_order.asc';
      var response = await fetch(endpoint, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: 'Bearer ' + config.supabaseAnonKey,
        },
      });
      if (response.ok) {
        var rows = await response.json();
        if (Array.isArray(rows)) {
          dynamicNavItems = rows;
        }
      }
    } catch (e) {
      /* Tablo henüz oluşturulmamışsa sessizce atla */
    }
  }

  function getClassPanelGrades() {
    const path = String(window.location && window.location.pathname ? window.location.pathname : '');
    const match = path.match(/\/siniflar\/([1-4])-sinif\.html$/);
    if (match) {
      return [match[1]];
    }
    if (path.endsWith('/siniflar/ortaokul.html')) {
      return ['5', '6', '7', '8'];
    }
    return [];
  }

  function injectDynamicClassCards() {
    const grades = getClassPanelGrades();
    if (!grades.length || !dynamicNavItems.length) {
      return;
    }

    const grid = document.querySelector('.sp-grid');
    if (!grid) {
      return;
    }

    const existingHrefs = new Set(Array.prototype.slice.call(grid.querySelectorAll('a[href]')).map(function(link) {
      return link.getAttribute('href');
    }));

    dynamicNavItems.forEach(function(item) {
      const grade = normalizeGradeKey(item.sinif);
      if (!grades.includes(grade)) {
        return;
      }

      const href = buildSubjectUrl(grade, item.ders_key);
      if (href === '#' || existingHrefs.has(href)) {
        return;
      }

      const gradeMeta = GRADE_META[grade] || {};
      const card = document.createElement('a');
      card.href = href;
      card.className = 'sp-card';
      card.style.setProperty('--sp-color', gradeMeta.color || '#6C3DED');
      card.innerHTML =
        '<span class="sp-card-em">' + escHtml(item.icon || '📄') + '</span>' +
        '<div class="sp-card-title">' + escHtml(item.label) + '</div>' +
        '<div class="sp-card-sub">Bu ders için eklenen sayfa ve dokümanlar.</div>' +
        '<span class="sp-card-btn">Derse Git →</span>';
      grid.appendChild(card);
      existingHrefs.add(href);
    });
  }

  async function hydrateChrome() {
    const initialData = getSyncData();

    if (isChromeEnabled()) {
      renderChrome(initialData);
      initSiteSearch();
      initSiteAccount();
      scanContentControls(document);
    }
    repairLegacyLinks(document);
    initHamburger();
    bindAdaptiveNavResize();
    syncAdaptiveNav();
    highlightActiveLink();
    initScrollReveal();

    if (!window.kemalSiteStore) {
      return initialData;
    }

    const remoteData = await window.kemalSiteStore.loadSiteData();
    // Dinamik menü öğelerini çek ve nav'ı güncelle
    await fetchDynamicMenuItems();
    if (isChromeEnabled()) {
      renderChrome(remoteData);
      initSiteSearch();
      initSiteAccount();
      scanContentControls(document);
    }
    injectDynamicClassCards();
    repairLegacyLinks(document);
    initHamburger();
    bindAdaptiveNavResize();
    syncAdaptiveNav();
    highlightActiveLink();
    initScrollReveal();
    return remoteData;
  }

  async function getDataAsync() {
    if (!window.kemalSiteStore) {
      return getSyncData();
    }
    return window.kemalSiteStore.loadSiteData();
  }

  async function saveData(data, accessToken) {
    if (!window.kemalSiteStore) {
      return data;
    }
    const saved = await window.kemalSiteStore.saveSiteData(data, accessToken);
    if (isChromeEnabled()) {
      renderChrome(saved);
      initSiteSearch();
      initSiteAccount();
      scanContentControls(document);
    }
    repairLegacyLinks(document);
    initHamburger();
    highlightActiveLink();
    return saved;
  }

  const seoState = initSeo();
  initAnalytics();
  const ready = hydrateChrome();
  window.addEventListener('kemal-user-auth-changed', function() {
    siteSearchState.items = null;
  });

  window.kemalSiteRoutes = {
    buildSubjectUrl: buildSubjectUrl,
    getSubjectPageData: getSubjectPageData,
    getLegacyRedirectPath: getLegacyRedirectPath,
    repairLegacyLinks: repairLegacyLinks,
    getGradeMenuSections: getGradeMenuSections,
    loadDynamicMenuItems: fetchDynamicMenuItems,
  };

  window.kemalSite = {
    ready: ready,
    getData: getSyncData,
    getDataSync: getSyncData,
    getDataAsync: getDataAsync,
    saveData: saveData,
    refreshChrome: async function() {
      const data = await getDataAsync();
      if (isChromeEnabled()) {
        renderChrome(data);
        initSiteSearch();
        initSiteAccount();
        scanContentControls(document);
      }
      await fetchDynamicMenuItems();
      injectDynamicClassCards();
      repairLegacyLinks(document);
      initHamburger();
      highlightActiveLink();
      return data;
    },
  };

  window.kemalSeo = {
    state: seoState,
    update: function(options) {
      return updateSeo(options);
    },
    getCanonicalPath: getCanonicalPath,
  };

  window.kemalAnalytics = {
    init: initAnalytics,
    trackPageview: function(options) {
      return sendAnalyticsEvent('page_view', options || {});
    },
    finish: sendPageLeaveOnce,
  };
})();
