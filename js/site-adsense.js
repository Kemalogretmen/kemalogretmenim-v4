(function() {
  'use strict';

  const routes = {
    home: '/',
    games: '/oyun/oyunlar',
    reading: '/hizli-okuma',
    exams: '/sinav_sitesi',
    resources: '/sinif-kaynaklari',
    'teacher-tools': '/ogretmen-araclari',
    'teacher-panel': '/ogretmen-paneli',
    'student-panel': '/ogrenci-paneli',
    article: '/makale',
  };

  async function readSettings() {
    const { supabaseUrl, supabaseAnonKey } = window.kemalSiteStore.getConfig();
    const url = supabaseUrl + '/rest/v1/site_adsense_settings?id=eq.1&select=enabled,publisher_id,slot_id,article_ids,placements';
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { apikey: supabaseAnonKey },
      signal: window.AbortSignal?.timeout?.(3500),
    });
    if (!response.ok) return null;
    const [settings] = await response.json();
    return settings;
  }

  function renderAd(host, settings, placement) {
    const section = document.createElement('aside');
    section.className = 'site-ad';
    section.setAttribute('aria-label', 'Reklamlar');
    const label = document.createElement('p');
    label.textContent = 'Reklamlar';
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle site-ad-unit';
    ad.dataset.adClient = settings.publisher_id;
    ad.dataset.adSlot = settings.slot_id;
    if (['home', 'games', 'reading', 'exams', 'resources', 'student-panel'].includes(placement)) {
      ad.dataset.tagForAgeTreatment = '1';
    }
    section.append(label, ad);
    host.append(section);

    const observer = new MutationObserver(() => {
      if (!ad.dataset.adStatus) return;
      observer.disconnect();
      if (ad.dataset.adStatus === 'unfilled') section.remove();
    });
    observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + settings.publisher_id;
    script.addEventListener('error', () => {
      observer.disconnect();
      section.remove();
    }, { once: true });
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    document.head.append(script);
    return section;
  }

  function isEligibleRoute(placement) {
    const { origin, pathname, search, hash } = window.location;
    if (!['https://kemalogretmenim.com.tr', 'https://www.kemalogretmenim.com.tr'].includes(origin) || window.ReactNativeWebView) return false;
    const path = pathname.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '').replace(/\/$/, '') || '/';
    if (routes[placement] !== path) return false;
    if (placement === 'article') {
      const params = new URLSearchParams(search);
      return params.size === 1 && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(params.get('id') || '');
    }
    // Shared reading and exam links can open the activity or its personal-data form directly.
    return !search && !(hash && placement.endsWith('-panel'));
  }

  async function mount(host, articleId) {
    const placement = host?.dataset.siteAd;
    if (!isEligibleRoute(placement) || typeof IntersectionObserver !== 'function' || host.dataset.adMounted) return;

    if (placement === 'teacher-panel' || placement === 'student-panel') {
      const auth = window.kemalUserAuth;
      await auth?.ready?.();
      const profile = auth?.getProfile?.();
      if (profile?.role !== placement.split('-')[0] || profile.active === false || profile.approval_status !== 'active') return;
    }
    if (typeof window.__tcfapi !== 'function') return;
    host.dataset.adMounted = 'true';

    let near = false;
    let consent = false;
    let requested = false;
    let section;

    async function maybeRender() {
      if (!near || !consent || requested || host.clientWidth < 300 || !isEligibleRoute(placement)) return;
      requested = true;
      observer.disconnect();
      try {
        const settings = await readSettings();
        const enabledForPage = placement === 'article' ? settings?.article_ids?.includes(articleId) : settings?.placements?.includes(placement);
        if (consent && host.clientWidth >= 300 && isEligibleRoute(placement) && settings?.enabled === true && enabledForPage &&
            /^ca-pub-[0-9]{16}$/.test(settings.publisher_id) && /^[0-9]{1,20}$/.test(settings.slot_id)) {
          section = renderAd(host, settings, placement);
        }
      } catch {
        // The page remains usable when the settings or ad network are unavailable.
      }
    }

    const observer = new IntersectionObserver(entries => {
      near = entries.some(entry => entry.isIntersecting);
      maybeRender();
    }, { rootMargin: '400px 0px' });
    observer.observe(host);

    window.__tcfapi('addEventListener', 2, (data, success) => {
      if (success && data?.eventStatus === 'cmpuishown') return;
      consent = Boolean(success && data?.cmpStatus === 'loaded' && data.tcString &&
        ['tcloaded', 'useractioncomplete'].includes(data.eventStatus) && data.purpose?.consents?.[1] && data.vendor?.consents?.[755]);
      if (!consent) section?.remove();
      maybeRender();
    });
  }

  window.KemalSiteAdSense = { mount };
  const host = document.querySelector('[data-site-ad]:not([data-site-ad="article"])');
  if (host) mount(host).catch(() => {});
})();
