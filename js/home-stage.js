(function() {
  'use strict';

  const FALLBACK_SLIDES = [
    { id: 'reading', baslik: 'Her hikâye, yeni bir başlangıç.', aciklama_html: 'Metnini seç, okuma akıcılığını çalış ve gelişimini takip et.', icerik_turu: 'image', kategori: 'Okuma atölyesi', media_url: '/assets/vitrin-sade/reading.svg', media_fit: 'contain', link_url: '/hizli-okuma/index.html', link_label: 'Okumaya başla', gecis_suresi_ms: 6000 },
    { id: 'resources', baslik: 'Bir sonraki dersine yer aç.', aciklama_html: 'Çalışma kâğıtları, konu özetleri ve etkinlikleri sınıfına göre keşfet.', icerik_turu: 'image', kategori: 'Ders kaynakları', media_url: '/assets/vitrin-sade/resources.svg', media_fit: 'contain', link_url: '/sinif-kaynaklari.html', link_label: 'Kaynakları keşfet', gecis_suresi_ms: 6000 },
    { id: 'aquarium', baslik: 'Sınıfınızın yaşayan dünyası.', aciklama_html: 'Küçük sorumluluklar ve birlikte büyüyen bir sınıf. Örnek akvaryuma göz atın.', icerik_turu: 'image', kategori: 'Sınıf Akvaryumu', media_url: '/assets/vitrin-sade/aquarium.svg', media_fit: 'contain', link_url: '/ogretmen/akvaryum.html?demo=1', link_label: 'Örnek sınıfı keşfet', gecis_suresi_ms: 6000 }
  ];
  const KIND_LABELS = { text: 'Mini yazı', image: 'Öne çıkan', document: 'Ders kaynağı', youtube: 'Video' };
  const REPUBLIC_SLIDE_ID = '0b98c047-4fd5-47fe-ad17-fb4a3eb00aff';
  // Restyle only the audited covers. A later upload by the administrator wins.
  // Original CMS rows, articles, links and storage files are never changed here.
  const COVER_REVISIONS = {
    '087d09d2-b8e7-4a85-ae0c-601c4ff9f497': { path: 'homepage-vitrin/087d09d2-b8e7-4a85-ae0c-601c4ff9f497/1787408247664-1-sinif-yaz-tatil-yeni-testleri-yayinda.webp', cover: 'summer-practice.svg' },
    '6315ce4c-50d9-4e83-b103-3fbebd3c2c9b': { path: 'homepage-vitrin/6315ce4c-50d9-4e83-b103-3fbebd3c2c9b/1786468452102-egitim-sevgi-ile-baslar.webp', cover: 'learning.svg' },
    'ea6f2486-4834-491a-9bb4-2bfc4d9c3202': { path: 'homepage-vitrin/ea6f2486-4834-491a-9bb4-2bfc4d9c3202/1786351824664-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', cover: 'math-practice-a.svg' },
    '377ec1fd-dc21-441d-8e0b-128c768998dd': { path: 'homepage-vitrin/377ec1fd-dc21-441d-8e0b-128c768998dd/1786323553958-6-sinif-sayisal-1-tema-tekrar-denemesi-1.webp', cover: 'math-practice-b.svg' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function safeUrl(value) {
    if (!String(value || '').trim()) return '';
    try {
      const url = new URL(String(value).trim(), window.location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) { return ''; }
  }

  function sanitizeDescription(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    const allowed = new Set(['A', 'B', 'BR', 'DIV', 'EM', 'I', 'LI', 'OL', 'P', 'SPAN', 'STRONG', 'U', 'UL']);
    function clean(parent) {
      Array.from(parent.childNodes).forEach(function(node) {
        if (node.nodeType === 3) return;
        if (node.nodeType !== 1) { node.remove(); return; }
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)) { node.remove(); return; }
        clean(node);
        if (!allowed.has(node.tagName)) { node.replaceWith(...Array.from(node.childNodes)); return; }
        const href = node.tagName === 'A' ? safeUrl(node.getAttribute('href')) : '';
        Array.from(node.attributes).forEach(function(attribute) { node.removeAttribute(attribute.name); });
        if (href) { node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
      });
    }
    clean(template.content);
    return template.innerHTML;
  }

  function storageImage(item, config) {
    const direct = safeUrl(item.media_url);
    if (direct) return direct;
    if (!item.media_path || !config || !config.supabaseUrl) return '';
    return safeUrl(config.supabaseUrl.replace(/\/$/, '') + '/storage/v1/object/public/dokumanlar/' + String(item.media_path).split('/').map(encodeURIComponent).join('/'));
  }

  function presentationImage(item, config) {
    const original = storageImage(item, config);
    const unchanged = { src: original, fit: item.media_fit === 'cover' ? 'is-cover' : 'is-contain', editorial: false };
    if (item.id === REPUBLIC_SLIDE_ID || item.icerik_turu === 'youtube') return unchanged;
    const revision = COVER_REVISIONS[item.id];
    if (revision && config?.supabaseUrl) {
      const expected = storageImage({ media_path: revision.path }, config);
      if (original && original === expected) return { src: safeUrl('/assets/vitrin-sade/' + revision.cover), fit: 'is-contain', editorial: true };
    }
    if (original) {
      const local = new URL(original);
      if (local.origin === window.location.origin && local.pathname.startsWith('/assets/vitrin-sade/')) return { src: original, fit: 'is-contain', editorial: true };
    }
    return unchanged;
  }

  function videoId(item) {
    if (/^[\w-]{11}$/.test(item.youtube_video_id || '')) return item.youtube_video_id;
    try {
      const url = new URL(item.youtube_embed_url);
      if (!['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(url.hostname)) return '';
      const match = url.pathname.match(/^\/embed\/([\w-]{11})$/);
      return match ? match[1] : '';
    } catch (error) { return ''; }
  }

  function itemLink(item) {
    if (item.icerik_turu === 'text' && item.makale_html && item.id) return safeUrl('/makale.html?id=' + encodeURIComponent(item.id));
    return safeUrl(item.link_url) || (item.dokuman_id ? safeUrl('/dokuman.html?id=' + encodeURIComponent(item.dokuman_id)) : '');
  }

  async function fetchPublishedSlides() {
    const config = window.kemalSiteStore?.getDocumentsConfig?.();
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return [];
    const fields = 'id,baslik,aciklama_html,makale_html,icerik_turu,ikon,tema_renk,media_url,media_path,media_fit,youtube_embed_url,youtube_video_id,dokuman_id,link_url,link_label,gecis_suresi_ms,siralama,aktif';
    const url = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/homepage_slides?select=' + encodeURIComponent(fields) + '&aktif=eq.true&order=siralama.asc,olusturma_tarihi.desc&limit=5';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timeout;
    try {
      const rows = await Promise.race([
        fetch(url, { headers: { apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + config.supabaseAnonKey }, ...(controller ? { signal: controller.signal } : {}) })
          .then(function(response) { return response.ok ? response.json() : []; }),
        new Promise(function(resolve) {
          timeout = window.setTimeout(function() { if (controller) controller.abort(); resolve([]); }, 8000);
        })
      ]);
      return Array.isArray(rows) ? rows.filter(function(item) {
        return item && item.aktif !== false && item.baslik && ['text', 'image', 'document', 'youtube'].includes(item.icerik_turu);
      }) : [];
    } catch (error) { return []; }
    finally { window.clearTimeout(timeout); }
  }

  function initShowcase() {
    const panel = document.getElementById('homeShowcasePanel');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = '1';
    const stage = document.getElementById('homeShowcaseStage');
    const dots = document.getElementById('homeShowcaseDots');
    const prev = document.getElementById('homeShowcasePrev');
    const next = document.getElementById('homeShowcaseNext');
    const pause = document.getElementById('homeShowcasePause');
    const count = document.getElementById('homeShowcaseCount');
    const status = document.getElementById('homeShowcaseStatus');
    const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const config = window.kemalSiteStore?.getDocumentsConfig?.();
    let slides = FALLBACK_SLIDES.slice();
    let activeIndex = 0;
    let timer;
    let manualPaused = Boolean(motion && motion.matches);
    let hovered = false;
    let focused = false;
    let interacted = false;
    let playingVideo = false;

    function clearTimer() { window.clearTimeout(timer); timer = null; }
    function schedule() {
      clearTimer();
      if (manualPaused || hovered || focused || playingVideo || document.hidden || slides.length < 2) return;
      const duration = Number(slides[activeIndex]?.gecis_suresi_ms) || 6000;
      timer = window.setTimeout(function() { go(activeIndex + 1, false); }, Math.max(3000, Math.min(10000, duration)));
    }
    function syncPause() {
      pause.innerHTML = manualPaused ? '<span aria-hidden="true">▷</span> Devam et' : '<span aria-hidden="true">Ⅱ</span> Duraklat';
      pause.setAttribute('aria-pressed', String(manualPaused));
      pause.setAttribute('aria-label', manualPaused ? 'Vitrini devam ettir' : 'Vitrini duraklat');
    }

    function mediaHtml(item, index) {
      const href = itemLink(item);
      const id = item.icerik_turu === 'youtube' ? videoId(item) : '';
      if (id) {
        return '<div class="home-showcase-media is-cover"><button type="button" class="home-showcase-video-play" data-video-id="' + id + '" aria-label="' + escapeHtml(item.baslik + ' videosunu oynat') + '"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy"><span aria-hidden="true">▶</span></button></div>';
      }
      const visual = presentationImage(item, config);
      const image = visual.src;
      const fit = visual.fit;
      let inner = image
        ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.baslik) + '" loading="' + (index === 0 ? 'eager' : 'lazy') + '" decoding="async">'
        : '<span class="home-showcase-placeholder"><svg class="home-icon" aria-hidden="true"><use href="#hi-' + (item.icerik_turu === 'document' ? 'document' : 'book') + '"/></svg></span>';
      if (href && !/\.apk(?:$|[?#])/i.test(href)) inner = '<a class="home-showcase-media-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(item.baslik) + '">' + inner + '</a>';
      return '<div class="home-showcase-media ' + fit + (visual.editorial ? ' is-editorial' : '') + '">' + inner + '</div>';
    }

    function stopVideo() {
      if (!playingVideo) return;
      stage.querySelectorAll('iframe').forEach(function(frame) {
        const article = frame.closest('.home-showcase-slide');
        const index = Number(article.dataset.slideIndex);
        frame.src = 'about:blank';
        article.querySelector('.home-showcase-media').outerHTML = mediaHtml(slides[index], index);
      });
      playingVideo = false;
    }

    function go(index, manual) {
      stopVideo();
      activeIndex = (index + slides.length) % slides.length;
      stage.querySelectorAll('.home-showcase-slide').forEach(function(article, i) {
        const active = i === activeIndex;
        article.hidden = !active;
        article.toggleAttribute('inert', !active);
        article.setAttribute('aria-hidden', String(!active));
        article.classList.toggle('active', active);
      });
      dots.querySelectorAll('[data-vitrin-index]').forEach(function(dot, i) { dot.setAttribute('aria-current', String(i === activeIndex)); });
      count.textContent = (activeIndex + 1) + ' / ' + slides.length;
      if (manual) { interacted = true; status.textContent = (activeIndex + 1) + '. slayt: ' + slides[activeIndex].baslik; }
      schedule();
    }

    function render(items, keepCurrent) {
      const currentId = slides[activeIndex]?.id;
      const currentLink = itemLink(slides[activeIndex]);
      const focusedElement = document.activeElement;
      const focusedDotId = focusedElement && dots.contains(focusedElement)
        ? slides[Number(focusedElement.dataset.vitrinIndex)]?.id : null;
      const focusedLink = focusedElement && stage.contains(focusedElement)
        ? focusedElement.closest('a')?.getAttribute('href') : null;
      stopVideo();
      slides = items;
      stage.innerHTML = slides.map(function(item, index) {
        const href = itemLink(item);
        const articleLink = item.icerik_turu === 'text' && item.makale_html;
        const label = articleLink ? 'Devamını oku' : (item.link_label || 'Keşfet');
        return '<article class="home-showcase-slide" id="homeShowcaseSlide-' + index + '" data-slide-index="' + index + '" hidden inert aria-hidden="true" role="group" aria-roledescription="slayt" aria-label="' + (index + 1) + '. slayt: ' + escapeHtml(item.baslik) + '">' +
          mediaHtml(item, index) + '<div class="home-showcase-copy"><span class="home-showcase-kind">' + escapeHtml(item.kategori || KIND_LABELS[item.icerik_turu] || 'Vitrin') + '</span><h3>' + escapeHtml(item.baslik) + '</h3><div class="home-showcase-desc">' + sanitizeDescription(item.aciklama_html) + '</div>' +
          (href ? '<a class="home-showcase-cta" href="' + escapeHtml(href) + '"' + (/\.apk(?:$|[?#])/i.test(href) ? ' download' : '') + '>' + escapeHtml(label) + ' <span aria-hidden="true">→</span></a>' : '') + '</div></article>';
      }).join('');
      dots.innerHTML = slides.map(function(item, index) {
        return '<button class="home-showcase-dot" type="button" data-vitrin-index="' + index + '" aria-label="' + (index + 1) + '. slayt: ' + escapeHtml(item.baslik) + '" aria-controls="homeShowcaseSlide-' + index + '" aria-current="false"></button>';
      }).join('');
      prev.disabled = next.disabled = pause.disabled = slides.length < 2;
      let preserved = keepCurrent ? slides.findIndex(function(item) { return item.id === currentId; }) : 0;
      if (keepCurrent && preserved < 0 && currentLink) preserved = slides.findIndex(function(item) { return itemLink(item) === currentLink; });
      go(Math.max(0, preserved), false);
      syncPause();
      if (focusedDotId) {
        const index = slides.findIndex(function(item) { return item.id === focusedDotId; });
        const target = dots.querySelector('[data-vitrin-index="' + Math.max(0, index) + '"]');
        if (target) target.focus({ preventScroll: true });
      } else if (focusedLink) {
        const article = stage.querySelector('.home-showcase-slide.active');
        const target = Array.from(article.querySelectorAll('a')).find(function(link) { return link.getAttribute('href') === focusedLink; });
        (target || pause).focus({ preventScroll: true });
      }
    }

    prev.addEventListener('click', function() { go(activeIndex - 1, true); });
    next.addEventListener('click', function() { go(activeIndex + 1, true); });
    dots.addEventListener('click', function(event) {
      const dot = event.target.closest('[data-vitrin-index]');
      if (dot) go(Number(dot.dataset.vitrinIndex), true);
    });
    pause.addEventListener('click', function() { interacted = true; manualPaused = !manualPaused; syncPause(); schedule(); });
    panel.addEventListener('mouseenter', function() { hovered = true; clearTimer(); });
    panel.addEventListener('mouseleave', function() { hovered = false; schedule(); });
    panel.addEventListener('focusin', function() { focused = true; clearTimer(); });
    panel.addEventListener('focusout', function(event) { focused = Boolean(event.relatedTarget && panel.contains(event.relatedTarget)); schedule(); });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', clearTimer);
    window.addEventListener('pageshow', schedule);
    if (motion && motion.addEventListener) motion.addEventListener('change', function(event) {
      if (event.matches) { manualPaused = true; syncPause(); }
      schedule();
    });
    stage.addEventListener('click', function(event) {
      const play = event.target.closest('[data-video-id]');
      if (!play || play.closest('.home-showcase-slide').hidden) return;
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + play.dataset.videoId + '?autoplay=1&rel=0';
      frame.title = slides[activeIndex].baslik;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.setAttribute('allowfullscreen', '');
      play.replaceWith(frame);
      playingVideo = true; interacted = true; clearTimer();
    });
    stage.addEventListener('error', function(event) {
      if (event.target.tagName === 'IMG') {
        event.target.replaceWith(document.createTextNode('Görsel şu anda görüntülenemiyor.'));
      }
    }, true);

    render(FALLBACK_SLIDES.slice(), false);
    fetchPublishedSlides().then(function(rows) {
      if (!rows.length) return;
      // Keep every published CMS item; editorial defaults follow without hiding any.
      const links = new Set(rows.map(itemLink).filter(Boolean));
      const defaults = FALLBACK_SLIDES.filter(function(item) { return !links.has(itemLink(item)); });
      render(rows.concat(defaults), interacted || hovered || focused || manualPaused);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initShowcase, { once: true });
  else initShowcase();
})();
