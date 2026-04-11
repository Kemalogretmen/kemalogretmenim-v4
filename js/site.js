/* ================================================
   KEMAL OGRETMENIM — SITE.JS v5.0
   Ortak navbar/footer, eski menu yapisi ve rota eslemeleri
   ================================================ */
(function() {
  'use strict';

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

  const SITE_ORIGIN = 'https://www.kemalogretmenim.com.tr';
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

  function safeTrim(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
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

    if (safeGrade === '1' && safeSubject === 'okuma-anlama') {
      return '/1_sinif/okuma_anlama/1_okuma_anlama.html';
    }

    return '/ders.html?sinif=' + encodeURIComponent(safeGrade) + '&ders=' + encodeURIComponent(safeSubject);
  }

  function getSubjectPageData(grade, subject) {
    const safeGrade = normalizeGradeKey(grade);
    const safeSubject = normalizeSubjectKey(subject);
    const gradeMeta = GRADE_META[safeGrade];
    const subjectMeta = SUBJECT_META[safeSubject];

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
    return [
      {
        navKey: '1',
        gradeKey: '1',
        label: '1. Sınıf',
        badgeKey: '1sinif',
        items: [
          { href: GRADE_META['1'].panelHref, label: GRADE_META['1'].panelLabel, icon: '🏠', panel: true },
          { href: '/1_sinif/okuma_anlama/1_okuma_anlama.html', label: 'Eski Okuma Metinleri', icon: '📚' },
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

  function buildExtraMenuItems(data) {
    const extraMenus = Array.isArray(data.ekMenuler)
      ? data.ekMenuler.filter(function(item) { return item && item.ad && item.url; })
      : [];

    return extraMenus.map(function(item) {
      return '<li class="nav-item nav-item-extra"><a href="' + item.url + '" class="nav-btn">' + item.ad + '</a></li>';
    }).join('');
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
      '<a href="/index.html" class="nav-logo">' +
        '<img src="/gorseller/logo.png" alt="Kemal Öğretmenim" onerror="this.style.display=\'none\'">' +
        'Kemal Öğretmenim' +
      '</a>' +
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
            '<a href="/yeni.html" class="dd-item"><span class="dd-icon">🌟</span> Yeni İçerikler</a>' +
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
            '<li><a href="/yeni.html">🌟 Yeni İçerikler</a></li>' +
            '<li><a href="/hakkimda.html">Hakkımda</a></li>' +
            '<li><a href="/iletisim.html">İletişim</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<span>© 2026 Kemal Öğretmen | <a href="https://www.kemalogretmenim.com.tr" style="color:inherit;">www.kemalogretmenim.com.tr</a></span>' +
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
    navTarget.innerHTML = buildNavbar(data);
    footerTarget.innerHTML = buildFooter();
  }

  function initHamburger() {
    const btn = document.getElementById('hamBtn');
    const links = document.getElementById('navLinks');
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
        if (window.innerWidth <= 1060) {
          item.classList.toggle('open');
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
    if (path === '/hakkimda.html' || path === '/iletisim.html' || path === '/yeni.html') {
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
    if (path === '/1_sinif/okuma_anlama/1_okuma_anlama.html' || path.startsWith('/siniflar/1-sinif.html') || path.startsWith('/1_sinif/')) {
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

    document.querySelectorAll('.nav-item').forEach(function(item) {
      item.classList.toggle('is-active', item.dataset.navKey === activeNavKey);
    });

    document.querySelectorAll('.dd-item, .nav-btn').forEach(function(link) {
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

  async function hydrateChrome() {
    const initialData = getSyncData();

    if (isChromeEnabled()) {
      renderChrome(initialData);
    }
    repairLegacyLinks(document);
    initHamburger();
    highlightActiveLink();
    initScrollReveal();

    if (!window.kemalSiteStore) {
      return initialData;
    }

    const remoteData = await window.kemalSiteStore.loadSiteData();
    if (isChromeEnabled()) {
      renderChrome(remoteData);
    }
    repairLegacyLinks(document);
    initHamburger();
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
    }
    repairLegacyLinks(document);
    initHamburger();
    highlightActiveLink();
    return saved;
  }

  const seoState = initSeo();
  initAnalytics();
  const ready = hydrateChrome();

  window.kemalSiteRoutes = {
    buildSubjectUrl: buildSubjectUrl,
    getSubjectPageData: getSubjectPageData,
    getLegacyRedirectPath: getLegacyRedirectPath,
    repairLegacyLinks: repairLegacyLinks,
    getGradeMenuSections: getGradeMenuSections,
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
      }
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
