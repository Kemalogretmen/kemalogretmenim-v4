(function() {
  'use strict';

  const state = {
    rows: [],
    filtered: [],
  };
  let toastTimer = 0;

  function client() {
    return window.kemalAdminAuth.getClient();
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

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

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function toast(message, type) {
    const node = document.getElementById('toast');
    node.textContent = message;
    node.className = 'toast ' + (type === 'error' ? 'error ' : '') + 'show';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function() {
      node.classList.remove('show');
    }, 4000);
  }

  function formatDuration(value) {
    const total = Math.max(0, Math.round(Number(value || 0)));
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  function scoreClass(value, good, mid) {
    const score = Number(value || 0);
    if (score >= good) return 'good';
    if (score >= mid) return 'mid';
    return 'low';
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort(function(a, b) {
      return String(a).localeCompare(String(b), 'tr');
    });
  }

  function setOptions(id, rows, placeholder, formatter) {
    const select = document.getElementById(id);
    const current = select.value;
    select.innerHTML = '<option value="">' + esc(placeholder) + '</option>' + rows.map(function(value) {
      return '<option value="' + esc(value) + '">' + esc(formatter ? formatter(value) : value) + '</option>';
    }).join('');
    if (rows.map(String).includes(String(current))) select.value = current;
  }

  function populateFilters() {
    setOptions('gradeFilter', uniqueSorted(state.rows.map(function(row) { return Number(row.sinif || 0); })), 'Tüm sınıflar', function(value) {
      return value + '. Sınıf';
    });
    setOptions('branchFilter', uniqueSorted(state.rows.map(function(row) { return clean(row.sube); })), 'Tüm şubeler');
    setOptions('bookFilter', uniqueSorted(state.rows.map(function(row) { return clean(row.e_kitap_adi); })), 'Tüm kitaplar');
  }

  function calculateStats(rows) {
    const total = rows.length;
    const readerKeys = new Set(rows.map(function(row) {
      return row.user_id || [clean(row.ad), clean(row.soyad), row.sinif, clean(row.sube), clean(row.okul)].join('|').toLocaleLowerCase('tr-TR');
    }));
    const averageSpeed = total
      ? Math.round(rows.reduce(function(sum, row) { return sum + Number(row.dakika_kelime || 0); }, 0) / total)
      : 0;
    const averageComprehension = total
      ? Math.round(rows.reduce(function(sum, row) { return sum + Number(row.anlama_yuzdesi || 0); }, 0) / total)
      : 0;
    document.getElementById('totalStat').textContent = total;
    document.getElementById('readerStat').textContent = readerKeys.size;
    document.getElementById('speedStat').textContent = averageSpeed;
    document.getElementById('comprehensionStat').textContent = averageComprehension + '%';
  }

  function renderDesktop(rows) {
    const body = document.getElementById('resultsBody');
    if (!rows.length) {
      body.innerHTML = '<div class="empty">Filtreye uygun e-kitap sonucu bulunamadı.</div>';
      return;
    }
    body.innerHTML = rows.map(function(row) {
      return '<article class="result-row">' +
        '<div class="cell"><strong>' + esc(clean(row.ad + ' ' + row.soyad)) + '</strong><small>' + esc(row.il || '-') + '</small></div>' +
        '<div class="cell"><strong>' + Number(row.sinif || 0) + '/' + esc(row.sube || '-') + '</strong></div>' +
        '<div class="cell"><strong>' + esc(row.okul || '-') + '</strong><small>' + esc(row.ilce || row.il || '-') + '</small></div>' +
        '<div class="cell"><strong>' + esc(row.e_kitap_adi || '-') + '</strong><small>' + Number(row.toplam_sayfa || 0) + ' sayfa</small></div>' +
        '<div class="cell"><span class="score ' + scoreClass(row.dakika_kelime, row.hedef_hiz || 60, Math.max(1, Number(row.hedef_hiz || 60) * .75)) + '">' + Number(row.dakika_kelime || 0) + '</span></div>' +
        '<div class="cell"><span class="score ' + scoreClass(row.anlama_yuzdesi, 80, 50) + '">%' + Number(row.anlama_yuzdesi || 0) + '</span></div>' +
        '<div class="cell"><strong>' + formatDuration(row.okuma_suresi_sn) + '</strong></div>' +
        '<div class="cell"><strong>' + esc(formatDate(row.olusturma_tarihi)) + '</strong></div>' +
        '<div class="cell"><button class="detail-btn" type="button" data-detail-id="' + esc(row.id) + '" title="Sonuç detayını aç"><i data-lucide="eye"></i></button></div>' +
      '</article>';
    }).join('');
  }

  function renderMobile(rows) {
    const node = document.getElementById('mobileResults');
    if (!rows.length) {
      node.innerHTML = '<div class="empty">Filtreye uygun e-kitap sonucu bulunamadı.</div>';
      return;
    }
    node.innerHTML = rows.map(function(row) {
      return '<article class="mobile-card">' +
        '<div class="mobile-card-head"><div><h2>' + esc(clean(row.ad + ' ' + row.soyad)) + '</h2><p>' + Number(row.sinif || 0) + '. Sınıf / ' + esc(row.sube || '-') + ' · ' + esc(row.e_kitap_adi || '-') + '</p></div>' +
          '<button class="detail-btn" type="button" data-detail-id="' + esc(row.id) + '" title="Sonuç detayını aç"><i data-lucide="eye"></i></button></div>' +
        '<div class="mobile-grid">' +
          '<div class="mobile-item"><span>Okuma Hızı</span><strong>' + Number(row.dakika_kelime || 0) + ' kelime/dk</strong></div>' +
          '<div class="mobile-item"><span>Anlama</span><strong>%' + Number(row.anlama_yuzdesi || 0) + '</strong></div>' +
          '<div class="mobile-item"><span>Süre</span><strong>' + formatDuration(row.okuma_suresi_sn) + '</strong></div>' +
          '<div class="mobile-item"><span>Tarih</span><strong>' + esc(formatDate(row.olusturma_tarihi)) + '</strong></div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function render() {
    document.getElementById('resultCount').textContent = state.filtered.length + ' kayıt';
    calculateStats(state.filtered);
    renderDesktop(state.filtered);
    renderMobile(state.filtered);
    refreshIcons();
  }

  function applyFilters() {
    const search = clean(document.getElementById('searchFilter').value).toLocaleLowerCase('tr-TR');
    const grade = document.getElementById('gradeFilter').value;
    const branch = document.getElementById('branchFilter').value;
    const book = document.getElementById('bookFilter').value;
    state.filtered = state.rows.filter(function(row) {
      const haystack = [row.ad, row.soyad, row.okul, row.il, row.ilce, row.e_kitap_adi].join(' ').toLocaleLowerCase('tr-TR');
      return (!search || haystack.includes(search)) &&
        (!grade || String(row.sinif) === grade) &&
        (!branch || clean(row.sube) === branch) &&
        (!book || clean(row.e_kitap_adi) === book);
    });
    render();
  }

  async function loadResults() {
    document.getElementById('resultsBody').innerHTML = '<div class="empty">Kayıtlar yükleniyor...</div>';
    document.getElementById('mobileResults').innerHTML = '';
    const response = await client()
      .from('e_kitap_sonuclari')
      .select('id,attempt_id,e_kitap_id,e_kitap_adi,user_id,visitor_id,ad,soyad,sinif,sube,il,ilce,okul,okuma_suresi_sn,tamamlanan_sayfa,toplam_sayfa,kelime_sayisi,dakika_kelime,hedef_hiz,dogru_sayisi,yanlis_sayisi,toplam_soru,anlama_yuzdesi,cevaplar_json,detay_json,olusturma_tarihi')
      .order('olusturma_tarihi', { ascending: false })
      .limit(5000);
    if (response.error) {
      state.rows = [];
      state.filtered = [];
      render();
      toast('E-kitap sonuçları alınamadı: ' + response.error.message, 'error');
      return;
    }
    state.rows = response.data || [];
    populateFilters();
    applyFilters();
  }

  function metric(label, value) {
    return '<div class="detail-metric"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
  }

  function openDetail(id) {
    const row = state.rows.find(function(item) { return item.id === id; });
    if (!row) return;
    document.getElementById('detailTitle').textContent = clean(row.ad + ' ' + row.soyad);
    document.getElementById('detailSubtitle').textContent = row.e_kitap_adi + ' · ' + formatDate(row.olusturma_tarihi);
    document.getElementById('detailMetrics').innerHTML =
      metric('Sınıf / Şube', row.sinif + '. Sınıf / ' + (row.sube || '-')) +
      metric('Okuma Hızı', row.dakika_kelime + ' kelime/dk') +
      metric('Hedef Hız', row.hedef_hiz + ' kelime/dk') +
      metric('Anlama', '%' + row.anlama_yuzdesi) +
      metric('Aktif Süre', formatDuration(row.okuma_suresi_sn)) +
      metric('Doğru / Toplam', row.dogru_sayisi + ' / ' + row.toplam_soru) +
      metric('Okul', row.okul || '-') +
      metric('Konum', [row.ilce, row.il].filter(Boolean).join(' / ') || '-');
    const answers = Array.isArray(row.cevaplar_json) ? row.cevaplar_json : [];
    document.getElementById('detailAnswers').innerHTML = answers.length
      ? answers.map(function(answer, index) {
        return '<article class="answer ' + (answer.dogru_mu ? '' : 'wrong') + '">' +
          '<strong>' + (index + 1) + '. ' + esc(answer.soru_metni || 'Soru') + '</strong>' +
          '<p>Öğrenci cevabı: ' + esc(answer.cevap_metni || 'Boş') +
          (answer.dogru_mu ? ' · Doğru' : ' · Doğru cevap: ' + esc(answer.dogru_metin || '-')) + '</p>' +
        '</article>';
      }).join('')
      : '<div class="empty">Bu sonuçta soru cevap kaydı bulunmuyor.</div>';
    document.getElementById('detailModal').classList.add('show');
    refreshIcons();
  }

  function closeDetail() {
    document.getElementById('detailModal').classList.remove('show');
  }

  function csvCell(value) {
    return '"' + String(value === null || value === undefined ? '' : value).replace(/"/g, '""') + '"';
  }

  function downloadCsv() {
    if (!state.filtered.length) {
      toast('İndirilecek sonuç bulunmuyor.', 'error');
      return;
    }
    const headers = ['Tarih','Ad','Soyad','Sınıf','Şube','İl','İlçe','Okul','E-Kitap','Süre (sn)','Kelime/Dk','Hedef Hız','Anlama %','Doğru','Yanlış','Toplam Soru'];
    const lines = [headers.map(csvCell).join(';')].concat(state.filtered.map(function(row) {
      return [
        formatDate(row.olusturma_tarihi), row.ad, row.soyad, row.sinif, row.sube,
        row.il, row.ilce, row.okul, row.e_kitap_adi, row.okuma_suresi_sn,
        row.dakika_kelime, row.hedef_hiz, row.anlama_yuzdesi,
        row.dogru_sayisi, row.yanlis_sayisi, row.toplam_soru,
      ].map(csvCell).join(';');
    }));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'e-kitap-sonuclari-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function signIn() {
    const email = clean(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPass').value;
    const errorNode = document.getElementById('loginErr');
    if (!email || !password) {
      errorNode.style.display = 'block';
      errorNode.textContent = 'E-posta ve şifre zorunlu.';
      return;
    }
    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorNode.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await loadResults();
    } catch (error) {
      errorNode.style.display = 'block';
      errorNode.textContent = window.kemalAdminAuth.humanizeError(error);
    }
  }

  async function initAuth() {
    try {
      const session = await window.kemalAdminAuth.getSession();
      if (session) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        await loadResults();
        return;
      }
    } catch (error) {
      console.warn(error);
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  function bindEvents() {
    document.getElementById('loginButton').addEventListener('click', signIn);
    ['loginEmail', 'loginPass'].forEach(function(id) {
      document.getElementById(id).addEventListener('keydown', function(event) {
        if (event.key === 'Enter') signIn();
      });
    });
    document.getElementById('logoutButton').addEventListener('click', async function() {
      await window.kemalAdminAuth.signOut();
      window.location.reload();
    });
    ['searchFilter'].forEach(function(id) {
      document.getElementById(id).addEventListener('input', applyFilters);
    });
    ['gradeFilter', 'branchFilter', 'bookFilter'].forEach(function(id) {
      document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('refreshButton').addEventListener('click', loadResults);
    document.getElementById('csvButton').addEventListener('click', downloadCsv);
    document.getElementById('closeModalButton').addEventListener('click', closeDetail);
    document.getElementById('detailModal').addEventListener('click', function(event) {
      if (event.target === this) closeDetail();
    });
    document.addEventListener('click', function(event) {
      const button = event.target.closest('[data-detail-id]');
      if (button) openDetail(button.dataset.detailId);
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeDetail();
    });
  }

  document.addEventListener('DOMContentLoaded', async function() {
    bindEvents();
    refreshIcons();
    await initAuth();
  });
})();
