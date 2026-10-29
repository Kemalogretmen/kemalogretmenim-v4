(function() {
  'use strict';

  function initHome() {
    const form = document.getElementById('homeSearchForm');
    const input = document.getElementById('homeSearchInput');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';

    async function search(query) {
      input.value = String(query || '').trim();
      if (input.value.length < 2) { input.focus(); return; }
      if (window.kemalSiteSearch) await window.kemalSiteSearch.open(input.value);
      else window.location.href = '/sinif-kaynaklari.html';
    }
    form.addEventListener('submit', function(event) { event.preventDefault(); search(input.value); });
    document.querySelectorAll('[data-search-query]').forEach(function(button) {
      button.addEventListener('click', function() { search(button.dataset.searchQuery); });
    });

    const fractionWords = ['sıfırı', 'biri', 'ikisi', 'üçü', 'dördü'];
    document.querySelectorAll('[data-fraction]').forEach(function(button) {
      button.addEventListener('click', function() {
        const selected = Number(button.dataset.fraction);
        document.querySelectorAll('[data-fraction]').forEach(function(control) {
          control.setAttribute('aria-pressed', String(control === button));
        });
        document.querySelectorAll('[data-fraction-part]').forEach(function(part) {
          part.setAttribute('fill', Number(part.dataset.fractionPart) <= selected ? '#7654c4' : '#e4def3');
        });
        document.getElementById('fractionNumerator').textContent = String(selected);
        const description = 'Dört eş parçanın ' + fractionWords[selected] + ' boyalı.';
        document.getElementById('fractionDiagram').setAttribute('aria-label', description);
        document.getElementById('fractionStatus').textContent = description;
      });
    });
    initLibrary();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function safeHref(value) {
    if (!String(value || '').trim()) return '';
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) { return ''; }
  }

  function gradeLabel(item) {
    return Array.from(new Set(String(item.gradeLabel || '').split(/\s*·\s*/).filter(Boolean))).join(' · ');
  }

  async function initLibrary() {
    const grid = document.getElementById('homeResourceGrid');
    const status = document.getElementById('homeLibraryStatus');
    const grade = document.getElementById('homeGradeFilter');
    const liveList = document.getElementById('heroLiveList');
    const controls = Array.from(document.querySelectorAll('[data-content-type]'));
    const fallbackMarkup = grid.innerHTML;
    let items = [];
    let activeType = 'all';
    let lockedGrade = null;
    let ready = false;

    function fallback() {
      ready = false;
      grid.innerHTML = fallbackMarkup;
      grid.setAttribute('aria-busy', 'false');
      status.textContent = 'İçerikler şu anda görüntülenemiyor. Bu alanlardan keşfetmeye devam edebilirsin.';
      controls.forEach(function(control) { control.disabled = true; });
      grade.disabled = true;
      if (liveList) {
        liveList.setAttribute('aria-busy', 'false');
        liveList.innerHTML = '<p class="home-live-state" role="status">Güncel içerikler şu anda görüntülenemiyor.<a href="/sinif-kaynaklari.html">Ders kaynaklarını keşfet →</a></p>';
      }
    }

    function drawLive() {
      if (!liveList || !ready) return;
      const feed = window.kemalContentFeed;
      const latest = items.filter(function(item) {
        return !lockedGrade || feed.matchesLockedGrade(item, lockedGrade);
      }).slice(0, 5);
      const icons = { reading: 'book', document: 'document', video: 'document', exam: 'exam', game: 'game' };
      liveList.setAttribute('aria-busy', 'false');
      if (!latest.length) {
        liveList.innerHTML = '<p class="home-live-state" role="status">Sınıfına uygun yeni çalışmalar burada görünecek.<a href="#kutuphane">İçerik kütüphanesine göz at →</a></p>';
        return;
      }
      liveList.innerHTML = latest.map(function(item) {
        const type = feed.getContentTypeMeta(item.type).label;
        const date = item.createdAt ? new Date(item.createdAt) : null;
        const formattedDate = date && Number.isFinite(date.getTime())
          ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }) : '';
        const meta = [type, gradeLabel(item), formattedDate].filter(Boolean);
        return '<a class="home-live-item" href="' + escapeHtml(safeHref(item.href)) + '" title="' + escapeHtml(item.title) + '" data-access-scope="' + escapeHtml(item.accessScope || 'public') + '">' +
          '<span class="home-live-icon is-' + item.type + '"><svg class="home-icon" aria-hidden="true"><use href="#hi-' + icons[item.type] + '"/></svg></span>' +
          '<span class="home-live-copy"><span class="home-live-meta">' + meta.map(function(value) { return '<span>' + escapeHtml(value) + '</span>'; }).join('') + '</span><span class="home-live-name">' + escapeHtml(item.title) + '</span></span></a>';
      }).join('');
    }

    function draw() {
      if (!ready) return;
      const feed = window.kemalContentFeed;
      const selectedGrade = lockedGrade || grade.value;
      const filtered = items.filter(function(item) {
        const typeMatches = activeType === 'all' || item.type === activeType || (activeType === 'document' && item.type === 'video');
        const gradeMatches = lockedGrade ? feed.matchesLockedGrade(item, selectedGrade) : feed.matchesGrade(item, selectedGrade);
        return typeMatches && gradeMatches;
      }).slice(0, 6);
      status.textContent = filtered.length ? (lockedGrade ? 'Sınıfına uygun çalışmalar ve herkese açık içerikler.' : '') : 'Bu seçime uygun içerik bulunamadı.';
      grid.setAttribute('aria-busy', 'false');
      if (!filtered.length) {
        grid.innerHTML = '<div class="home-library-empty"><p>Başka bir içerik türü veya sınıf seçerek keşfetmeye devam edebilirsin.</p><button type="button" id="homeClearFilters">Filtreleri temizle</button></div>';
        document.getElementById('homeClearFilters').addEventListener('click', function() {
          activeType = 'all';
          if (!lockedGrade) grade.value = '';
          controls.forEach(function(control) { control.setAttribute('aria-pressed', String(control.dataset.contentType === 'all')); });
          draw();
        });
        return;
      }
      const icons = { reading: 'book', document: 'document', video: 'document', exam: 'exam', game: 'game' };
      grid.innerHTML = filtered.map(function(item) {
        const meta = feed.getContentTypeMeta(item.type);
        return '<a class="home-resource" href="' + escapeHtml(safeHref(item.href)) + '" data-access-scope="' + escapeHtml(item.accessScope || 'public') + '">' +
          '<span class="home-resource-art home-art-' + item.type + '"><svg class="home-icon" aria-hidden="true"><use href="#hi-' + icons[item.type] + '"/></svg></span>' +
          '<span class="home-resource-body"><span class="home-resource-type">' + escapeHtml(meta.label) + '</span>' +
          '<h3>' + escapeHtml(item.title) + '</h3><span class="home-resource-meta"><span>' + escapeHtml(gradeLabel(item) || 'Tüm sınıflar') + '</span><span>' + escapeHtml(item.subjectLabel || item.sourceLabel || meta.label) + '</span>' +
          (item.accessScope === 'registered' ? '<span>Üyelik gerekir</span>' : '') + '</span></span></a>';
      }).join('');
    }

    controls.forEach(function(control) {
      control.addEventListener('click', function() {
        activeType = control.dataset.contentType;
        controls.forEach(function(other) { other.setAttribute('aria-pressed', String(other === control)); });
        draw();
      });
    });
    grade.addEventListener('change', draw);

    function syncAccount() {
      const auth = window.kemalUserAuth;
      lockedGrade = auth && auth.getStudentGradeLevel ? auth.getStudentGradeLevel() : null;
      if (lockedGrade && !Array.from(grade.options).some(function(option) { return option.value === String(lockedGrade); })) {
        grade.insertAdjacentHTML('beforeend', '<option value="' + Number(lockedGrade) + '">' + Number(lockedGrade) + '. Sınıf</option>');
      }
      grade.disabled = Boolean(lockedGrade);
      grade.value = lockedGrade ? String(lockedGrade) : '';
      draw();
      drawLive();
    }

    // A slow external catalog must not leave visitors on a loading message.
    // If it eventually recovers, the same request can still fill the library.
    const loadingDeadline = window.setTimeout(fallback, 10000);
    try {
      const feed = window.kemalContentFeed;
      if (!feed) { fallback(); return; }
      // Attach a rejection handler immediately while account/chrome initialise.
      const contentPromise = feed.getAllItems({ homeFeedOnly: true }).then(
        function(value) { return value; }, function() { return []; }
      );
      await window.kemalUserAuth?.ready?.();
      const loaded = await contentPromise;
      items = loaded.filter(function(item) {
        return ['reading', 'document', 'video', 'exam', 'game'].includes(item.type) && item.title && safeHref(item.href);
      }).sort(function(a, b) { return (b.createdAtValue || 0) - (a.createdAtValue || 0); });
      if (!items.length) { fallback(); return; }
      const availableGrades = Array.from(new Set(items.flatMap(function(item) {
        return item.grades || (item.grade ? [item.grade] : []);
      }))).sort(function(a, b) { return Number(a) - Number(b); });
      availableGrades.forEach(function(value) {
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 12) return;
        grade.insertAdjacentHTML('beforeend', '<option value="' + Number(value) + '">' + Number(value) + '. Sınıf</option>');
      });
      ready = true;
      controls.forEach(function(control) { control.disabled = false; });
      syncAccount();
      window.addEventListener('kemal-user-auth-changed', syncAccount);
    } catch (error) { fallback(); }
    finally { window.clearTimeout(loadingDeadline); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHome, { once: true });
  else initHome();
})();
