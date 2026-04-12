(function() {
  'use strict';

  let allResults = [];
  let filteredResults = [];
  let toastTimer = null;

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function escHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseDetailJson(value) {
    if (!value) {
      return null;
    }
    if (typeof value === 'object') {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function getLocationMeta(row) {
    const detail = parseDetailJson(row.detay_json);
    const userInfo = detail && detail.kullanici_bilgileri ? detail.kullanici_bilgileri : {};
    return [row.il || userInfo.il || '', row.okul || userInfo.okul || ''].filter(Boolean).join(' · ');
  }

  function toast(message, type) {
    const el = document.getElementById('toast');
    if (!el) {
      return;
    }
    el.textContent = message;
    el.className = 'toast ' + (type || 'success') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      el.classList.remove('show');
    }, 2800);
  }

  function formatDuration(seconds) {
    const safe = Math.round(seconds || 0);
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return minutes > 0 ? minutes + 'dk ' + rest + 'sn' : safe + 'sn';
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('tr-TR');
  }

  function speedClass(wpm, target) {
    if (!target) {
      return wpm >= 100 ? 'hiz-y' : wpm >= 60 ? 'hiz-n' : 'hiz-d';
    }
    if (wpm >= target) {
      return 'hiz-y';
    }
    if (wpm >= target * 0.75) {
      return 'hiz-n';
    }
    return 'hiz-d';
  }

  function comprehensionClass(percent, totalQuestions) {
    if (!totalQuestions) {
      return 'an-y';
    }
    if (percent >= 80) {
      return 'an-g';
    }
    if (percent >= 50) {
      return 'an-o';
    }
    return 'an-d';
  }

  function updateStats() {
    const source = filteredResults;
    const answerable = source.filter(function(row) {
      return (row.toplam_soru || 0) > 0;
    });
    const avgWpm = source.length
      ? Math.round(source.reduce(function(total, row) { return total + (row.dakika_kelime || 0); }, 0) / source.length)
      : 0;
    const avgComprehension = answerable.length
      ? Math.round(answerable.reduce(function(total, row) { return total + (row.anlama_yuzdesi || 0); }, 0) / answerable.length)
      : 0;
    const bestWpm = source.length
      ? Math.max.apply(null, source.map(function(row) { return row.dakika_kelime || 0; }))
      : 0;

    document.getElementById('sToplam').textContent = String(source.length);
    document.getElementById('sOrtWpm').textContent = avgWpm + ' k/dk';
    document.getElementById('sOrtAnlama').textContent = avgComprehension + '%';
    document.getElementById('sEnIyi').textContent = bestWpm + ' k/dk';
  }

  function getSelectedIds() {
    return Array.from(document.querySelectorAll('.row-cb:checked')).map(function(node) {
      return node.value;
    });
  }

  function renderDesktopRows() {
    const body = document.getElementById('tabloGovde');
    document.getElementById('tabloCount').textContent = filteredResults.length + ' kayıt';

    if (!filteredResults.length) {
      body.innerHTML = '<div class="bos-durum"><span>📭</span><p>Sonuç bulunamadı.</p></div>';
      return;
    }

    body.innerHTML = filteredResults.map(function(row) {
      const wpm = row.dakika_kelime || 0;
      const target = row.hedef_hiz || 0;
      const percent = row.toplam_soru > 0 ? (row.anlama_yuzdesi || 0) : -1;
      const comprehensionText = row.toplam_soru > 0 ? percent + '%' : '—';
      const locationMeta = getLocationMeta(row);
      return (
        '<div class="tablo-satir" id="row_' + row.id + '">' +
          '<div class="td"><input type="checkbox" class="row-cb" value="' + row.id + '" onchange="satirSecimiGuncelle()"></div>' +
          '<div class="td bold">' + escHtml((row.ad || '') + ' ' + (row.soyad || '')) + (locationMeta ? '<div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:4px">' + escHtml(locationMeta) + '</div>' : '') + '</div>' +
          '<div class="td">' + (row.sinif || '?') + '/' + (row.sube || '?') + '</div>' +
          '<div class="td"><span class="hiz-badge ' + speedClass(wpm, target) + '">' + wpm + '</span></div>' +
          '<div class="td"><span class="anlama-badge ' + comprehensionClass(percent, row.toplam_soru || 0) + '">' + comprehensionText + '</span></div>' +
          '<div class="td">' + escHtml(row.metin_adi || '—') + '</div>' +
          '<div class="td">' + formatDuration(row.okuma_suresi_sn || 0) + '</div>' +
          '<div class="td">' + formatDate(row.olusturma_tarihi) + '</div>' +
          '<div class="td"><div class="islem-grup"><button class="btn-karne-row" onclick="karneAc(\'' + row.id + '\')">Karne</button><button class="btn-sil-row" onclick="tekSil(\'' + row.id + '\')">Sil</button></div></div>' +
        '</div>'
      );
    }).join('');
  }

  function renderMobileCards() {
    const list = document.getElementById('mobilKartList');
    if (!list) {
      return;
    }
    if (!filteredResults.length) {
      list.innerHTML = '<div class="bos-durum"><span>📭</span><p>Sonuç bulunamadı.</p></div>';
      return;
    }
    list.innerHTML = filteredResults.map(function(row) {
      const percent = row.toplam_soru > 0 ? (row.anlama_yuzdesi || 0) + '%' : 'Soru yok';
      const locationMeta = getLocationMeta(row);
      return (
        '<div class="mobil-sonuc-kart">' +
          '<div class="msk-head">' +
            '<div>' +
              '<div class="msk-title">' + escHtml((row.ad || '') + ' ' + (row.soyad || '')) + '</div>' +
              '<div class="msk-sub">' + (row.sinif || '?') + '. sınıf / ' + (row.sube || '?') + ' şubesi' + (locationMeta ? ' · ' + escHtml(locationMeta) : '') + '</div>' +
            '</div>' +
            '<div class="islem-grup"><button class="btn-karne-row" onclick="karneAc(\'' + row.id + '\')">Karne</button><button class="btn-sil-row" onclick="tekSil(\'' + row.id + '\')">Sil</button></div>' +
          '</div>' +
          '<div class="msk-grid">' +
            '<div class="msk-item"><span>Metin</span><strong>' + escHtml(row.metin_adi || '—') + '</strong></div>' +
            '<div class="msk-item"><span>Okuma Hızı</span><strong>' + (row.dakika_kelime || 0) + ' k/dk</strong></div>' +
            '<div class="msk-item"><span>Anlama</span><strong>' + percent + '</strong></div>' +
            '<div class="msk-item"><span>Süre</span><strong>' + formatDuration(row.okuma_suresi_sn || 0) + '</strong></div>' +
          '</div>' +
          '<div class="msk-footer">' + formatDate(row.olusturma_tarihi) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function render() {
    renderDesktopRows();
    renderMobileCards();
    updateStats();
  }

  function applyFilters() {
    const name = document.getElementById('fAd').value.trim().toLowerCase();
    const grade = document.getElementById('fSinif').value;
    const section = document.getElementById('fSube').value;
    const text = document.getElementById('fMetin').value.trim().toLowerCase();

    filteredResults = allResults.filter(function(row) {
      const fullName = ((row.ad || '') + ' ' + (row.soyad || '') + ' ' + getLocationMeta(row)).toLowerCase();
      const matchesName = !name || fullName.includes(name);
      const matchesGrade = !grade || String(row.sinif) === grade;
      const matchesSection = !section || row.sube === section;
      const matchesText = !text || (row.metin_adi || '').toLowerCase().includes(text);
      return matchesName && matchesGrade && matchesSection && matchesText;
    });

    render();
  }

  function clearFilters() {
    document.getElementById('fAd').value = '';
    document.getElementById('fMetin').value = '';
    document.getElementById('fSinif').value = '';
    document.getElementById('fSube').value = '';
    filteredResults = allResults.slice();
    render();
  }

  async function loadData() {
    const { data, error } = await getClient()
      .from('sonuclar')
      .select('*')
      .order('olusturma_tarihi', { ascending: false });

    if (error) {
      toast('Sonuçlar yüklenemedi: ' + error.message, 'error');
      return;
    }

    allResults = (data || []).map(function(row) {
      const detail = parseDetailJson(row.detay_json);
      const userInfo = detail && detail.kullanici_bilgileri ? detail.kullanici_bilgileri : {};
      return Object.assign({}, row, {
        il: row.il || userInfo.il || '',
        okul: row.okul || userInfo.okul || '',
      });
    });
    filteredResults = allResults.slice();
    render();
  }

  async function deleteOne(id) {
    if (!window.confirm('Bu kayıt silinsin mi?')) {
      return;
    }

    const { error } = await getClient().from('sonuclar').delete().eq('id', id);
    if (error) {
      toast('Kayıt silinemedi: ' + error.message, 'error');
      return;
    }

    allResults = allResults.filter(function(row) { return row.id !== id; });
    filteredResults = filteredResults.filter(function(row) { return row.id !== id; });
    render();
    toast('Kayıt silindi.', 'success');
  }

  async function deleteSelected() {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast('Önce satır seçmelisin.', 'error');
      return;
    }
    if (!window.confirm(ids.length + ' kayıt silinsin mi?')) {
      return;
    }

    const { error } = await getClient().from('sonuclar').delete().in('id', ids);
    if (error) {
      toast('Toplu silme başarısız: ' + error.message, 'error');
      return;
    }

    allResults = allResults.filter(function(row) { return !ids.includes(row.id); });
    filteredResults = filteredResults.filter(function(row) { return !ids.includes(row.id); });
    render();
    toast(ids.length + ' kayıt silindi.', 'success');
  }

  function toggleSelectAll() {
    const checked = document.getElementById('hepsiniSec').checked;
    document.querySelectorAll('.row-cb').forEach(function(node) {
      node.checked = checked;
    });
    updateRowSelectionState();
  }

  function updateRowSelectionState() {
    const checkedIds = getSelectedIds();
    document.querySelectorAll('.tablo-satir').forEach(function(row) {
      const checkbox = row.querySelector('.row-cb');
      row.classList.toggle('secili', checkbox && checkbox.checked);
    });
    const allCheckboxes = Array.from(document.querySelectorAll('.row-cb'));
    const allChecked = allCheckboxes.length > 0 && checkedIds.length === allCheckboxes.length;
    document.getElementById('hepsiniSec').checked = allChecked;
  }

  function exportCsv() {
    if (!filteredResults.length) {
      toast('Dışa aktarılacak veri yok.', 'error');
      return;
    }

    const header = ['Ad', 'Soyad', 'Sınıf', 'Şube', 'Metin', 'WPM', 'Hedef WPM', 'Süre (sn)', 'Doğru', 'Yanlış', 'Toplam Soru', 'Anlama %', 'Tarih'];
    const rows = filteredResults.map(function(row) {
      return [
        row.ad,
        row.soyad,
        row.sinif,
        row.sube,
        row.metin_adi,
        row.dakika_kelime,
        row.hedef_hiz,
        row.okuma_suresi_sn,
        row.dogru_sayisi,
        row.yanlis_sayisi,
        row.toplam_soru,
        row.anlama_yuzdesi,
        formatDate(row.olusturma_tarihi),
      ];
    });
    const csv = [header].concat(rows)
      .map(function(row) {
        return row.map(function(cell) {
          return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"';
        }).join(';');
      })
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'okuma_sonuclari_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast('CSV indirildi.', 'success');
  }

  function openKarne(id) {
    const row = allResults.find(function(item) {
      return item.id === id;
    });

    if (!row) {
      toast('Karne için kayıt bulunamadı.', 'error');
      return;
    }

    localStorage.setItem('kemal_okuma_karne_selected_result_v1', JSON.stringify(row));
    window.open('/admin/okuma-karne.html', '_blank');
  }

  async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginErr');

    if (!email || !password) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ E-posta ve şifre zorunlu.';
      return;
    }

    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorEl.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      await loadData();
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ ' + window.kemalAdminAuth.humanizeError(error);
      document.getElementById('loginPass').value = '';
    }
  }

  async function doLogout() {
    try {
      await window.kemalAdminAuth.signOut();
    } finally {
      window.location.reload();
    }
  }

  async function initAuth() {
    try {
      const session = await window.kemalAdminAuth.getSession();
      if (session) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        await loadData();
        return;
      }
    } catch (error) {
      console.warn('Oturum okunamadi:', error);
    }

    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginEmail').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    document.getElementById('loginPass').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    initAuth();
  });

  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.uygula = applyFilters;
  window.filtreTemizle = clearFilters;
  window.tekSil = deleteOne;
  window.topluSil = deleteSelected;
  window.hepsiniSecToggle = toggleSelectAll;
  window.satirSecimiGuncelle = updateRowSelectionState;
  window.excelIndir = exportCsv;
  window.karneAc = openKarne;
})();
