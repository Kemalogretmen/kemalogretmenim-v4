(function() {
  'use strict';

  let allResults = [];
  let filteredResults = [];
  let toastTimer = null;
  let rawResultsCount = 0;
  let hiddenResultsCount = 0;
  let nameEditTargetIds = [];
  let currentAccessProfile = null;

  function getClient() {
    return window.kemalAdminAuth.getClient();
  }

  function escHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function normalizeStudentText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCaseStudentText(value) {
    return normalizeStudentText(value)
      .split(' ')
      .filter(Boolean)
      .map(function(part) {
        return part
          .split(/([-'])/g)
          .map(function(piece) {
            if (piece === '-' || piece === "'") {
              return piece;
            }
            if (!piece) {
              return '';
            }
            return piece.charAt(0).toLocaleUpperCase('tr-TR') + piece.slice(1).toLocaleLowerCase('tr-TR');
          })
          .join('');
      })
      .join(' ');
  }

  function cloneDetailJson(row) {
    const detail = parseDetailJson(row && row.detay_json);
    return detail ? JSON.parse(JSON.stringify(detail)) : {};
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

  function normalizeKeyPart(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function getAttemptId(row) {
    const detail = parseDetailJson(row.detay_json);
    return detail && detail.attempt_id ? String(detail.attempt_id) : '';
  }

  function getRowTime(row) {
    const value = row && row.olusturma_tarihi ? new Date(row.olusturma_tarihi).getTime() : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function getStudentTextKey(row) {
    return [
      normalizeKeyPart(row.ad),
      normalizeKeyPart(row.soyad),
      normalizeKeyPart(row.sinif),
      normalizeKeyPart(row.sube),
      normalizeKeyPart(row.il),
      normalizeKeyPart(row.okul),
      normalizeKeyPart(row.metin_id || row.metin_adi),
    ].join('|');
  }

  function getAttemptStatus(row) {
    const detail = parseDetailJson(row.detay_json);
    return detail && detail.attempt_status === 'started' ? 'started' : 'completed';
  }

  function getAttemptStatusMeta(row) {
    return getAttemptStatus(row) === 'started'
      ? { label: 'Devam ediyor', color: '#92400E', bg: '#FEF3C7' }
      : { label: 'Tamamlandı', color: '#166534', bg: '#DCFCE7' };
  }

  function isCompletedAttempt(row) {
    return getAttemptStatus(row) === 'completed';
  }

  function collapseDuplicateCompletedAttempts(rows) {
    const seenAttemptIds = new Set();
    return rows.filter(function(row) {
      if (!isCompletedAttempt(row)) {
        return true;
      }
      const attemptId = getAttemptId(row);
      if (!attemptId) {
        return true;
      }
      if (seenAttemptIds.has(attemptId)) {
        return false;
      }
      seenAttemptIds.add(attemptId);
      return true;
    });
  }

  function collapseShadowStartedRows(rows) {
    const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;
    const completedByAttempt = new Map();
    const completedByKey = new Map();

    rows.filter(isCompletedAttempt).forEach(function(row) {
      const attemptId = getAttemptId(row);
      const key = getStudentTextKey(row);
      if (attemptId) {
        completedByAttempt.set(attemptId, row);
      }
      if (!completedByKey.has(key)) {
        completedByKey.set(key, []);
      }
      completedByKey.get(key).push(row);
    });

    return rows.filter(function(row) {
      if (isCompletedAttempt(row)) {
        return true;
      }

      const rowTime = getRowTime(row);
      const attemptId = getAttemptId(row);
      if (attemptId && completedByAttempt.has(attemptId)) {
        const completedTime = getRowTime(completedByAttempt.get(attemptId));
        if (completedTime >= rowTime) {
          return false;
        }
      }

      const siblings = completedByKey.get(getStudentTextKey(row)) || [];
      return !siblings.some(function(completedRow) {
        const completedTime = getRowTime(completedRow);
        return completedTime >= rowTime && (completedTime - rowTime) <= DUPLICATE_WINDOW_MS;
      });
    });
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

  function canEditResults() {
    if (!window.kemalAdminAuth || typeof window.kemalAdminAuth.hasPermission !== 'function') {
      return true;
    }
    return window.kemalAdminAuth.hasPermission('okuma_sonuclari_duzenleme', currentAccessProfile);
  }

  function requireEditPermission(actionLabel) {
    if (canEditResults()) {
      return true;
    }
    toast((actionLabel || 'Bu işlem') + ' için yetkiniz yok.', 'error');
    return false;
  }

  function syncEditControlsVisibility() {
    const editable = canEditResults();
    document.querySelectorAll('.fb-btn-duzenle,.fb-btn-toplu-sil').forEach(function(node) {
      node.style.display = editable ? '' : 'none';
    });
    const selectAll = document.getElementById('hepsiniSec');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.style.display = editable ? '' : 'none';
    }
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
    const source = filteredResults.filter(isCompletedAttempt);
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
    if (!canEditResults()) {
      return [];
    }
    return Array.from(document.querySelectorAll('.row-cb:checked')).map(function(node) {
      return node.value;
    });
  }

  function renderDesktopRows() {
    const body = document.getElementById('tabloGovde');
    document.getElementById('tabloCount').textContent = filteredResults.length + ' kayıt' + (
      hiddenResultsCount > 0
        ? ' · ' + hiddenResultsCount + ' tamamlanmamış / eski kayıt gizlendi'
        : ''
    );

    if (!filteredResults.length) {
      body.innerHTML = '<div class="bos-durum"><span>📭</span><p>Sonuç bulunamadı.</p></div>';
      return;
    }

    const editable = canEditResults();
    body.innerHTML = filteredResults.map(function(row) {
      const wpm = row.dakika_kelime || 0;
      const target = row.hedef_hiz || 0;
      const percent = row.toplam_soru > 0 ? (row.anlama_yuzdesi || 0) : -1;
      const comprehensionText = row.toplam_soru > 0 ? percent + '%' : '—';
      const locationMeta = getLocationMeta(row);
      const statusMeta = getAttemptStatusMeta(row);
      const karneButton = isCompletedAttempt(row)
        ? '<button class="btn-karne-row" onclick="karneAc(\'' + row.id + '\')">Karne</button>'
        : '<button class="btn-karne-row" disabled style="opacity:.5;cursor:not-allowed">Karne</button>';
      const editButton = editable ? '<button class="btn-edit-row" onclick="isimDuzenle(\'' + row.id + '\')">Düzenle</button>' : '';
      const deleteButton = editable ? '<button class="btn-sil-row" onclick="tekSil(\'' + row.id + '\')">Sil</button>' : '';
      const selectCell = editable
        ? '<input type="checkbox" class="row-cb" value="' + row.id + '" onchange="satirSecimiGuncelle()">'
        : '';
      return (
        '<div class="tablo-satir" id="row_' + row.id + '">' +
          '<div class="td">' + selectCell + '</div>' +
          '<div class="td bold">' + escHtml((row.ad || '') + ' ' + (row.soyad || '')) + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">' + (locationMeta ? '<span style="font-size:11px;color:var(--muted);font-weight:700">' + escHtml(locationMeta) + '</span>' : '') + '<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:' + statusMeta.bg + ';color:' + statusMeta.color + ';font-size:10px;font-weight:800">' + statusMeta.label + '</span></div></div>' +
          '<div class="td">' + (row.sinif || '?') + '/' + (row.sube || '?') + '</div>' +
          '<div class="td"><span class="hiz-badge ' + speedClass(wpm, target) + '">' + wpm + '</span></div>' +
          '<div class="td"><span class="anlama-badge ' + comprehensionClass(percent, row.toplam_soru || 0) + '">' + comprehensionText + '</span></div>' +
          '<div class="td">' + escHtml(row.metin_adi || '—') + '</div>' +
          '<div class="td">' + formatDuration(row.okuma_suresi_sn || 0) + '</div>' +
          '<div class="td">' + formatDate(row.olusturma_tarihi) + '</div>' +
          '<div class="td"><div class="islem-grup">' + karneButton + editButton + deleteButton + '</div></div>' +
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
    const editable = canEditResults();
    list.innerHTML = filteredResults.map(function(row) {
      const percent = row.toplam_soru > 0 ? (row.anlama_yuzdesi || 0) + '%' : 'Soru yok';
      const locationMeta = getLocationMeta(row);
      const statusMeta = getAttemptStatusMeta(row);
      const karneButton = isCompletedAttempt(row)
        ? '<button class="btn-karne-row" onclick="karneAc(\'' + row.id + '\')">Karne</button>'
        : '<button class="btn-karne-row" disabled style="opacity:.5;cursor:not-allowed">Karne</button>';
      const editButton = editable ? '<button class="btn-edit-row" onclick="isimDuzenle(\'' + row.id + '\')">Düzenle</button>' : '';
      const deleteButton = editable ? '<button class="btn-sil-row" onclick="tekSil(\'' + row.id + '\')">Sil</button>' : '';
      return (
        '<div class="mobil-sonuc-kart">' +
          '<div class="msk-head">' +
            '<div>' +
              '<div class="msk-title">' + escHtml((row.ad || '') + ' ' + (row.soyad || '')) + '</div>' +
              '<div class="msk-sub">' + (row.sinif || '?') + '. sınıf / ' + (row.sube || '?') + ' şubesi' + (locationMeta ? ' · ' + escHtml(locationMeta) : '') + '</div>' +
              '<div style="margin-top:6px"><span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:' + statusMeta.bg + ';color:' + statusMeta.color + ';font-size:10px;font-weight:800">' + statusMeta.label + '</span></div>' +
            '</div>' +
            '<div class="islem-grup">' + karneButton + editButton + deleteButton + '</div>' +
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
    syncEditControlsVisibility();
    renderDesktopRows();
    renderMobileCards();
    updateStats();
  }

  function getRowsByIds(ids) {
    const wanted = new Set(ids);
    return allResults.filter(function(row) { return wanted.has(row.id); });
  }

  function closeNameEditModal() {
    const modal = document.getElementById('nameEditModal');
    if (modal) {
      modal.classList.remove('show');
    }
    nameEditTargetIds = [];
  }

  function openNameEditModal(ids) {
    if (!requireEditPermission('İsim düzenleme')) {
      return;
    }
    const rows = getRowsByIds(ids);
    if (!rows.length) {
      toast('Düzenlenecek kayıt bulunamadı.', 'error');
      return;
    }

    nameEditTargetIds = rows.map(function(row) { return row.id; });
    const first = rows[0];
    const sameName = rows.every(function(row) {
      return normalizeStudentText(row.ad) === normalizeStudentText(first.ad) &&
        normalizeStudentText(row.soyad) === normalizeStudentText(first.soyad);
    });

    document.getElementById('editStudentName').value = sameName ? (first.ad || '') : '';
    document.getElementById('editStudentSurname').value = sameName ? (first.soyad || '') : '';
    document.getElementById('nameEditSummary').textContent = rows.length === 1
      ? 'Bu kaydın öğrenci adı düzeltilecek.'
      : rows.length + ' kayıt aynı ad ve soyada çevrilecek.';
    document.getElementById('nameEditModal').classList.add('show');
    document.getElementById('editStudentName').focus();
  }

  function openSelectedNameEditor() {
    if (!requireEditPermission('Toplu isim düzenleme')) {
      return;
    }
    const ids = getSelectedIds();
    if (!ids.length) {
      toast('Önce aynı öğrenciye ait satırları seçmelisin.', 'error');
      return;
    }
    openNameEditModal(ids);
  }

  async function saveNameEdit() {
    if (!requireEditPermission('İsim kaydetme')) {
      return;
    }
    const ad = titleCaseStudentText(document.getElementById('editStudentName').value);
    const soyad = titleCaseStudentText(document.getElementById('editStudentSurname').value);
    if (!ad || !soyad) {
      toast('Ad ve soyad boş bırakılamaz.', 'error');
      return;
    }
    const ids = nameEditTargetIds.slice();
    if (!ids.length) {
      toast('Düzenlenecek kayıt bulunamadı.', 'error');
      return;
    }

    const rows = getRowsByIds(ids);
    const client = getClient();
    const responses = await Promise.all(rows.map(async function(row) {
      const detail = cloneDetailJson(row);
      if (!detail.kullanici_bilgileri || typeof detail.kullanici_bilgileri !== 'object') {
        detail.kullanici_bilgileri = {};
      }
      detail.kullanici_bilgileri.ad = ad;
      detail.kullanici_bilgileri.soyad = soyad;

      let response = await client
        .from('sonuclar')
        .update({ ad: ad, soyad: soyad, detay_json: detail })
        .eq('id', row.id)
        .select('*')
        .maybeSingle();

      if (response.error && response.error.message && response.error.message.includes('detay_json')) {
        response = await client
          .from('sonuclar')
          .update({ ad: ad, soyad: soyad })
          .eq('id', row.id)
          .select('*')
          .maybeSingle();
      }

      return { row: row, response: response };
    }));

    const failed = responses.find(function(item) { return item.response.error; });
    if (failed) {
      toast('İsim güncellenemedi: ' + failed.response.error.message, 'error');
      return;
    }

    responses.forEach(function(item) {
      const updated = item.response.data || {};
      const nextDetail = updated.detay_json != null ? updated.detay_json : item.row.detay_json;
      const nextRow = Object.assign({}, item.row, updated, {
        ad: ad,
        soyad: soyad,
        detay_json: nextDetail
      });
      allResults = allResults.map(function(row) {
        return row.id === item.row.id ? nextRow : row;
      });
    });

    closeNameEditModal();
    applyFilters();
    toast(ids.length === 1 ? 'Öğrenci adı güncellendi.' : ids.length + ' kayıt aynı isimde birleştirildi.', 'success');
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

    rawResultsCount = (data || []).length;
    allResults = collapseDuplicateCompletedAttempts(collapseShadowStartedRows((data || []).map(function(row) {
      const detail = parseDetailJson(row.detay_json);
      const userInfo = detail && detail.kullanici_bilgileri ? detail.kullanici_bilgileri : {};
      return Object.assign({}, row, {
        il: row.il || userInfo.il || '',
        okul: row.okul || userInfo.okul || '',
      });
    }))).filter(isCompletedAttempt);
    hiddenResultsCount = Math.max(0, rawResultsCount - allResults.length);
    filteredResults = allResults.slice();
    render();
  }

  async function deleteOne(id) {
    if (!requireEditPermission('Kayıt silme')) {
      return;
    }
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
    if (!requireEditPermission('Toplu silme')) {
      return;
    }
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
    if (!requireEditPermission('Satır seçme')) {
      const selectAll = document.getElementById('hepsiniSec');
      if (selectAll) {
        selectAll.checked = false;
      }
      return;
    }
    const checked = document.getElementById('hepsiniSec').checked;
    document.querySelectorAll('.row-cb').forEach(function(node) {
      node.checked = checked;
    });
    updateRowSelectionState();
  }

  function updateRowSelectionState() {
    if (!canEditResults()) {
      return;
    }
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

    const header = ['Ad', 'Soyad', 'Sınıf', 'Şube', 'İl', 'Okul', 'Durum', 'Metin', 'WPM', 'Hedef WPM', 'Süre (sn)', 'Doğru', 'Yanlış', 'Toplam Soru', 'Anlama %', 'Tarih'];
    const rows = filteredResults.map(function(row) {
      return [
        row.ad,
        row.soyad,
        row.sinif,
        row.sube,
        row.il || '',
        row.okul || '',
        getAttemptStatusMeta(row).label,
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
    if (!isCompletedAttempt(row)) {
      toast('Bu okuma oturumu henüz tamamlanmadığı için karne hazır değil.', 'error');
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
      currentAccessProfile = await window.kemalAdminAuth.ensureCurrentPageAccess();
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
        currentAccessProfile = await window.kemalAdminAuth.ensureCurrentPageAccess(session);
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
    document.getElementById('nameEditModal').addEventListener('click', function(event) {
      if (event.target === this) {
        closeNameEditModal();
      }
    });
    document.getElementById('editStudentName').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        saveNameEdit();
      }
    });
    document.getElementById('editStudentSurname').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        saveNameEdit();
      }
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeNameEditModal();
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
  window.isimDuzenle = function(id) { openNameEditModal([id]); };
  window.secilileriDuzenle = openSelectedNameEditor;
  window.isimKaydet = saveNameEdit;
  window.isimModalKapat = closeNameEditModal;
})();
