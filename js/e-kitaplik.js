(function() {
  'use strict';

  const CACHE_KEY = 'kemal_e_kitap_listesi_v1';
  const BUCKET = 'e-kitaplar';
  const config = window.kemalSiteStore.getReadingConfig
    ? window.kemalSiteStore.getReadingConfig()
    : window.kemalSiteStore.getConfig();
  const sb = window.kemalUserAuth && typeof window.kemalUserAuth.getClient === 'function'
    ? window.kemalUserAuth.getClient()
    : window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const state = {
    books: [],
    grade: 0,
    search: '',
    coverUrls: [],
    likes: {},
  };

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char];
    });
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function saveCache(rows) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rows || []));
    } catch (error) {}
  }

  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function getGrades(book) {
    const values = Array.isArray(book.siniflar) && book.siniflar.length
      ? book.siniflar
      : [book.sinif];
    return values.map(Number).filter(Number.isFinite).sort(function(a, b) { return a - b; });
  }

  function renderGradeTabs() {
    const node = document.getElementById('gradeTabs');
    node.innerHTML = '<button class="grade-tab ' + (!state.grade ? 'active' : '') + '" type="button" data-grade="0">Tümü</button>' +
      Array.from({ length: 8 }, function(_, index) {
        const grade = index + 1;
        return '<button class="grade-tab ' + (state.grade === grade ? 'active' : '') + '" type="button" data-grade="' + grade + '">' + grade + '. Sınıf</button>';
      }).join('');
  }

  function filteredBooks() {
    const term = state.search.toLocaleLowerCase('tr-TR');
    return state.books.filter(function(book) {
      if (book.gizli) return false;
      if (state.grade && !getGrades(book).includes(state.grade)) return false;
      if (term && !(book.baslik + ' ' + (book.yazar || '') + ' ' + (book.aciklama || '')).toLocaleLowerCase('tr-TR').includes(term)) return false;
      return true;
    });
  }

  function sourceLabel(book) {
    if (book.kaynak_turu === 'images') return 'Görsel kitap';
    if (book.kaynak_turu === 'external_pdf') return 'Bağlantılı PDF';
    return 'PDF kitap';
  }

  function renderBooks(note) {
    const grid = document.getElementById('ebookGrid');
    const rows = filteredBooks();
    document.getElementById('bookCount').textContent = state.books.length;
    const gradeSet = new Set();
    state.books.forEach(function(book) { getGrades(book).forEach(function(grade) { gradeSet.add(grade); }); });
    document.getElementById('gradeCount').textContent = gradeSet.size;

    if (!rows.length) {
      grid.innerHTML = '<div class="ebook-empty">' +
        '<i data-lucide="book-open"></i>' +
        '<p>' + esc(note || (state.books.length
          ? 'Bu filtreye uygun e-kitap bulunamadı.'
          : 'Henüz yayında e-kitap bulunmuyor.')) + '</p>' +
      '</div>';
      refreshIcons();
      return;
    }

    grid.innerHTML = (note ? '<div class="ebook-empty" style="padding:12px 16px;text-align:left">' + esc(note) + '</div>' : '') +
      rows.map(function(book) {
        const grades = getGrades(book);
        const href = '/hizli-okuma/e-kitap-oku.html?id=' + encodeURIComponent(book.id);
        const likeCount = Number(state.likes[book.id] || 0);
        return '<article class="ebook-card" ' +
          'data-reaction-type="ebook" ' +
          'data-reaction-id="' + esc(book.id) + '" ' +
          'data-reaction-title="' + esc(book.baslik) + '" ' +
          'data-reaction-href="' + esc(href) + '" ' +
          'data-reaction-grade="' + esc(grades.join(', ')) + '" ' +
          'data-reaction-subject="E-Kitap" ' +
          'data-reaction-source="E-Kitaplık">' +
          '<div class="ebook-card-cover" data-cover-path="' + esc(book.kapak_yolu || '') + '" style="--cover:' + esc(book.kapak_renk || '#0F9F8F') + '"><i data-lucide="book-open"></i></div>' +
          '<div class="ebook-card-main">' +
            '<div class="ebook-card-grades">' +
              grades.map(function(grade) { return '<span class="ebook-pill">' + grade + '. Sınıf</span>'; }).join('') +
              '<span class="ebook-pill coral">' + esc(sourceLabel(book)) + '</span>' +
            '</div>' +
            '<h2>' + esc(book.baslik) + '</h2>' +
            '<div class="ebook-card-author">' + esc(book.yazar || 'Kemal Öğretmenim') + '</div>' +
            '<p class="ebook-card-description">' + esc(book.aciklama || 'Kısa okuma, anlama soruları ve ayrıntılı karne.') + '</p>' +
            '<div class="ebook-card-meta">' +
              '<span><i data-lucide="files"></i>' + Number(book.sayfa_sayisi || 0) + ' sayfa</span>' +
              '<span><i data-lucide="timer"></i>' + Number(book.tahmini_dk || 5) + ' dk</span>' +
              '<span><i data-lucide="gauge"></i>Hedef ' + Number(book.hedef_hiz || 0) + '</span>' +
            '</div>' +
          '</div>' +
          '<a class="ebook-card-open" href="' + esc(href) + '">' +
            '<span>Kitabı Aç <i data-lucide="arrow-right"></i></span>' +
            '<span class="ebook-card-social"><span><i data-lucide="heart"></i>' + likeCount + '</span></span>' +
          '</a>' +
        '</article>';
      }).join('');

    refreshIcons();
    hydrateCovers();
    if (window.kemalContentSaves && typeof window.kemalContentSaves.scheduleScan === 'function') {
      window.kemalContentSaves.scheduleScan(grid);
    }
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  async function hydrateCover(node) {
    const path = node.dataset.coverPath;
    if (!path) return;
    try {
      const response = await sb.storage.from(BUCKET).download(path);
      if (response.error) throw response.error;
      const url = URL.createObjectURL(response.data);
      state.coverUrls.push(url);
      node.innerHTML = '<img src="' + esc(url) + '" alt="">';
    } catch (error) {
      node.innerHTML = '<i data-lucide="book-open"></i>';
      refreshIcons();
    }
  }

  function hydrateCovers() {
    document.querySelectorAll('[data-cover-path]').forEach(function(node) {
      hydrateCover(node);
    });
  }

  async function loadSocialCounts(ids) {
    if (!ids.length) return;
    const result = await sb.from('e_kitap_begenileri').select('e_kitap_id').in('e_kitap_id', ids);
    state.likes = {};
    (result.data || []).forEach(function(row) {
      state.likes[row.e_kitap_id] = (state.likes[row.e_kitap_id] || 0) + 1;
    });
  }

  async function loadBooks() {
    const response = await sb
      .from('e_kitaplar')
      .select('id,baslik,yazar,aciklama,sinif,siniflar,kelime_sayisi,hedef_hiz,tahmini_dk,kaynak_turu,sayfa_sayisi,kapak_yolu,kapak_renk,gizli,oturum_gerekli,siralama,olusturma_tarihi')
      .eq('aktif', true)
      .eq('gizli', false)
      .order('siralama', { ascending: true })
      .order('olusturma_tarihi', { ascending: false });

    if (response.error) {
      const cached = loadCache();
      state.books = cached;
      renderBooks(cached.length
        ? 'Canlı bağlantıya ulaşılamadı. Son kaydedilmiş e-kitap listesi gösteriliyor.'
        : 'E-kitaplık henüz veritabanına kurulmamış veya bağlantı şu anda kullanılamıyor.');
      return;
    }
    state.books = response.data || [];
    saveCache(state.books);
    await loadSocialCounts(state.books.map(function(book) { return book.id; }));
    renderBooks();
  }

  function bindEvents() {
    document.getElementById('gradeTabs').addEventListener('click', function(event) {
      const button = event.target.closest('[data-grade]');
      if (!button) return;
      state.grade = Number(button.dataset.grade || 0);
      renderGradeTabs();
      renderBooks();
    });
    document.getElementById('bookSearch').addEventListener('input', function(event) {
      state.search = clean(event.target.value);
      renderBooks();
    });
  }

  async function applyAccountGrade() {
    if (!window.kemalUserAuth || typeof window.kemalUserAuth.ready !== 'function') return;
    await window.kemalUserAuth.ready();
    const grade = window.kemalUserAuth.getStudentGradeLevel
      ? Number(window.kemalUserAuth.getStudentGradeLevel() || 0)
      : 0;
    if (grade >= 1 && grade <= 8) {
      state.grade = grade;
      renderGradeTabs();
      renderBooks();
    }
  }

  document.addEventListener('DOMContentLoaded', async function() {
    renderGradeTabs();
    bindEvents();
    refreshIcons();
    await loadBooks();
    await applyAccountGrade();
  });

  window.addEventListener('beforeunload', function() {
    state.coverUrls.forEach(function(url) {
      try { URL.revokeObjectURL(url); } catch (error) {}
    });
  });
})();
