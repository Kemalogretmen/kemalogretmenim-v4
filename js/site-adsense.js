(function() {
  'use strict';
  const routes = {
    home: '/', games: '/oyun/oyunlar', reading: '/hizli-okuma', exams: '/sinav_sitesi',
    resources: '/sinif-kaynaklari', 'teacher-tools': '/ogretmen-araclari',
    'teacher-panel': '/ogretmen-paneli', 'student-panel': '/ogrenci-paneli', article: '/makale',
  };
  let googleScript;
  const preferenceKey = 'kemal:ad-cookie-choice:v1';
  const preferenceAge = 90 * 24 * 60 * 60 * 1000;
  function readLocalChoice() {
    try {
      const value = JSON.parse(window.localStorage.getItem(preferenceKey) || 'null');
      const age = Date.now() - value?.at;
      return value?.version === 1 && typeof value.allowed === 'boolean' && Number.isFinite(age) && age >= 0 && age < preferenceAge
        ? value.allowed : null;
    } catch (_) { return null; }
  }
  function saveLocalChoice(allowed) {
    try {
      window.localStorage.setItem(preferenceKey, JSON.stringify({ version: 1, allowed, at: Date.now() }));
      return readLocalChoice() === allowed;
    } catch (_) { return false; }
  }
  function localPreference(onChoice) {
    const box = document.createElement('section');
    box.className = 'site-ad-preferences';
    box.setAttribute('aria-label', 'Reklam çerezi tercihi');
    const title = document.createElement('h2');
    title.textContent = 'Reklam çerezleri';
    const text = document.createElement('p');
    text.textContent = 'Google’ın kişiselleştirilmemiş reklamlar sunmak, güvenliği sağlamak ve toplu ölçüm yapmak için çerez kullanmasına izin veriyor musun? İzin vermeden eğitim içeriklerini kullanabilirsin. Çocukların bu tercihi veli veya yetkili yetişkin desteğiyle yönetmesi gerekir.';
    const actions = document.createElement('div');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const saved = readLocalChoice();
    if (saved !== null) status.textContent = saved ? 'Kayıtlı tercihin: izin verildi.' : 'Kayıtlı tercihin: izin verilmedi.';
    for (const [label, allowed] of [['İzin verme', false], ['İzin ver', true]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.adChoice = allowed ? 'allow' : 'deny';
      button.textContent = label;
      button.addEventListener('click', () => {
        const persisted = saveLocalChoice(allowed);
        if (allowed && !persisted) {
          status.textContent = 'Tercihin bu tarayıcıda saklanamadı. Reklam kapalı kalacak.';
          onChoice(false);
          return;
        }
        onChoice(allowed);
        box.remove();
      });
      actions.append(button);
    }
    const more = document.createElement('a');
    more.href = '/cerez-politikasi.html';
    more.textContent = 'Çerez kullanımını incele';
    actions.append(more);
    box.append(title, text, actions, status);
    return box;
  }
  function isProduction() {
    return ['https://kemalogretmenim.com.tr', 'https://www.kemalogretmenim.com.tr'].includes(window.location.origin) && !window.ReactNativeWebView;
  }
  async function readSettings() {
    const config = window.kemalSiteStore?.getConfig?.();
    if (!config) return null;
    const response = await fetch(config.supabaseUrl + '/rest/v1/site_adsense_settings?id=eq.1&select=enabled,publisher_id,slot_id,article_ids,placements', {
      cache: 'no-store', headers: { apikey: config.supabaseAnonKey }, signal: window.AbortSignal?.timeout?.(3500),
    });
    if (!response.ok) return null;
    const [settings] = await response.json();
    return settings;
  }
  const validPublisher = settings => /^ca-pub-[0-9]{16}$/.test(settings?.publisher_id || '');
  function canAdvertise(settings, placement, articleId) {
    const selected = placement === 'article' ? settings?.article_ids?.includes(articleId) : settings?.placements?.includes(placement);
    return settings?.enabled === true && selected && validPublisher(settings) && /^[0-9]{1,20}$/.test(settings.slot_id);
  }
  function isEligibleRoute(placement) {
    if (!isProduction()) return false;
    const { pathname, search, hash } = window.location;
    const path = pathname.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '').replace(/\/$/, '') || '/';
    if (routes[placement] !== path) return false;
    if (placement === 'article') {
      const params = new URLSearchParams(search);
      return params.size === 1 && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(params.get('id') || '');
    }
    return !search && !(hash && placement.endsWith('-panel'));
  }
  function isVisible(host) {
    if (!host?.isConnected || host.clientWidth < 300) return false;
    for (let node = host; node && node !== document; node = node.parentElement) {
      if (node.hidden || node.style?.display === 'none') return false;
    }
    return typeof host.getClientRects !== 'function' || host.getClientRects().length > 0;
  }
  function adsQueue() {
    const queue = window.adsbygoogle = window.adsbygoogle || [];
    queue.requestNonPersonalizedAds = 1;
    return queue;
  }
  function ensureMessaging(settings, mayShowMessage, onFailure) {
    const queue = adsQueue();
    // Google's published CMP is bootstrapped while ad requests stay paused.
    queue.pauseAdRequests = 1;
    const fc = window.googlefc = window.googlefc || {};
    fc.callbackQueue = fc.callbackQueue || [];
    if (!googleScript) {
      fc.controlledMessagingFunction = message => message.proceed(Boolean(mayShowMessage()));
      googleScript = document.createElement('script');
      googleScript.async = true;
      googleScript.crossOrigin = 'anonymous';
      googleScript.dataset.privacyTreatments = 'disablePersonalization';
      googleScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + settings.publisher_id;
      googleScript.addEventListener('error', () => { queue.pauseAdRequests = 1; onFailure?.(); }, { once: true });
      document.head.append(googleScript);
    }
    return fc;
  }
  function hasConsent(data, success) {
    if (!success || data?.cmpStatus !== 'loaded' || !data.tcString ||
        !['tcloaded', 'useractioncomplete'].includes(data.eventStatus) ||
        data.purpose?.consents?.[1] !== true || data.vendor?.consents?.[755] !== true) return false;
    // Also require the legal bases for non-personalized ads. Google evaluates
    // the actual TC string; an absent API or a teacher role never means consent.
    return [2, 7, 9, 10].every(id => data.purpose.consents[id] === true ||
      (data.purpose?.legitimateInterests?.[id] === true && data.vendor?.legitimateInterests?.[755] === true));
  }
  function renderAd(host, settings) {
    const section = document.createElement('aside');
    section.className = 'site-ad';
    section.setAttribute('aria-label', 'Reklamlar');
    const label = document.createElement('p');
    label.textContent = 'Reklamlar';
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle site-ad-unit';
    ad.dataset.adClient = settings.publisher_id;
    ad.dataset.adSlot = settings.slot_id;
    // Public teacher catalogs are accessible to children as well.
    ad.dataset.tagForAgeTreatment = '1';
    section.append(label, ad);
    host.append(section);
    const observer = new MutationObserver(() => {
      if (!ad.dataset.adStatus) return;
      observer.disconnect();
      if (ad.dataset.adStatus === 'unfilled') section.remove();
    });
    observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] });
    const queue = adsQueue();
    queue.push({ params: { google_privacy_treatments: 'disablePersonalization' } });
    queue.pauseAdRequests = 0;
    return section;
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
    host.dataset.adMounted = 'true';
    let near = false, prepared = false, consent = false, requested = false, rendering = false, subscribed = false, outsideGdpr = false;
    let section, preference;
    const mayShow = () => near && isEligibleRoute(placement) && isVisible(host);
    const stop = () => { consent = false; adsQueue().pauseAdRequests = 1; section?.remove(); };
    function showLocalPreference() {
      if (!outsideGdpr || !mayShow() || readLocalChoice() !== null || preference?.isConnected) return;
      preference = localPreference(allowed => {
        consent = allowed;
        if (allowed) maybeRender();
        else stop();
      });
      host.append(preference);
    }
    async function maybeRender() {
      if (!consent || !mayShow() || requested || rendering) return;
      rendering = true;
      try {
        // A shutdown made while the consent dialog was open must take effect.
        const settings = await readSettings();
        if (consent && mayShow() && canAdvertise(settings, placement, articleId)) {
          requested = true;
          observer.disconnect();
          section = renderAd(host, settings);
        }
      } catch (_) { stop(); }
      finally { rendering = false; }
    }
    function subscribe() {
      if (subscribed || typeof window.__tcfapi !== 'function') return;
      subscribed = true;
      window.__tcfapi('addEventListener', 2, (data, success) => {
        if (success && data?.eventStatus === 'cmpuishown') return;
        // A real CMP determines applicability. Outside GDPR, an explicit
        // first-party cookie choice is used; no TC string is fabricated and
        // gdprApplies=false is never treated as the visitor granting consent.
        outsideGdpr = Boolean(success && data?.cmpStatus === 'loaded' && data.gdprApplies === false &&
          ['tcloaded', 'useractioncomplete'].includes(data.eventStatus));
        if (outsideGdpr) {
          consent = readLocalChoice() === true;
          if (consent) maybeRender();
          else { stop(); showLocalPreference(); }
          return;
        }
        preference?.remove();
        consent = hasConsent(data, success);
        if (!consent) stop();
        else maybeRender();
      });
    }
    async function prepare() {
      if (prepared || !mayShow()) return;
      prepared = true;
      try {
        const settings = await readSettings();
        if (!mayShow() || !canAdvertise(settings, placement, articleId)) return;
        const fc = ensureMessaging(settings, mayShow, stop);
        fc.callbackQueue.push({ CONSENT_API_READY: subscribe });
        subscribe();
      } catch (_) { stop(); }
    }
    const observer = new IntersectionObserver(entries => {
      near = entries.some(entry => entry.isIntersecting);
      if (near) { prepare(); showLocalPreference(); maybeRender(); }
    }, { rootMargin: '400px 0px' });
    observer.observe(host);
    window.addEventListener('storage', event => {
      if (event.key !== preferenceKey || !outsideGdpr) return;
      consent = readLocalChoice() === true;
      if (consent) maybeRender();
      else stop();
    });
  }
  async function openPrivacy() {
    const status = document.getElementById('adPrivacyStatus');
    const say = value => { if (status) status.textContent = value; };
    if (!isProduction()) { say('Bu önizlemede Google reklam hizmeti açılmaz. Tercihler yayımlanan sitede yönetilir.'); return; }
    say('Google reklam tercihleri hazırlanıyor…');
    try {
      const settings = await readSettings();
      if (!validPublisher(settings)) { say('Reklam hizmeti şu anda yapılandırılmamış. Yeni reklam isteği yapılmıyor.'); return; }
      const fc = ensureMessaging(settings, () => true, () => say('Google tercih ekranı yüklenemedi. Reklam birimi isteği yapılmadı; daha sonra tekrar deneyebilirsin.'));
      fc.callbackQueue.push({ CONSENT_API_READY: () => {
        if (typeof window.__tcfapi !== 'function') { say('Tercih bölgesi doğrulanamadı. Reklam birimi isteği yapılmadı.'); return; }
        let handled = false;
        window.__tcfapi('addEventListener', 2, (data, success) => {
          if (handled || !success || data?.cmpStatus !== 'loaded' || typeof data.gdprApplies !== 'boolean') return;
          handled = true;
          if (data.gdprApplies === false) {
            document.getElementById('localAdPreference')?.remove();
            const choice = localPreference(allowed => say(allowed ? 'Tercihin kaydedildi. Uygun giriş sayfalarında kişiselleştirilmemiş reklamlar istenebilir.' : 'İzin verilmedi. Yeni reklam birimi isteği yapılmayacak.'));
            choice.id = 'localAdPreference';
            status?.insertAdjacentElement('afterend', choice);
            say('Aşağıdaki seçeneklerle reklam çerezi tercihini değiştirebilirsin.');
          } else if (typeof fc.showRevocationMessage === 'function') {
            fc.showRevocationMessage();
            say('Tercihini Google ekranında değiştirebilir veya iznini geri alabilirsin.');
          } else say('Google tercih ekranı şu anda kullanılamıyor. Yeni reklam isteği yapılmadı.');
        });
      } });
    } catch (_) { say('Reklam tercihleri şu anda yüklenemedi. Eğitim içeriklerini kullanmaya devam edebilirsin.'); }
  }
  window.KemalSiteAdSense = { mount, openPrivacy };
  document.getElementById('manageAdPrivacy')?.addEventListener('click', openPrivacy);
  const host = document.querySelector('[data-site-ad]:not([data-site-ad="article"])');
  if (host) mount(host).catch(() => {});
})();
