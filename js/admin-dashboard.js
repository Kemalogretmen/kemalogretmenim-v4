(function() {
  'use strict';

  const GRADE_DEFS = [
    { key: '1sinif', label: '1. Sınıf', em: '📕' },
    { key: '2sinif', label: '2. Sınıf', em: '📗' },
    { key: '3sinif', label: '3. Sınıf', em: '📘' },
    { key: '4sinif', label: '4. Sınıf', em: '📙' },
    { key: 'ortaokul', label: 'Ortaokul', em: '🎒' },
    { key: 'hizliokuma', label: 'Hızlı Okuma', em: '📖' },
    { key: 'oyunlar', label: 'Oyunlar', em: '🎮' },
    { key: 'sinavlar', label: 'Sınav Merkezi', em: '📝' },
  ];

  const TITLES = {
    overview: '📊 Genel Bakış',
    duyurular: '📢 Duyurular',
    badges: '🔔 YENİ Rozetleri',
    hizli: '⚡ Hızlı Erişim',
    onecikarlar: '📰 Öne Çıkanlar',
    yeni: '🌟 Yeni İçerikler',
    hakkimda: '👤 Hakkımda',
    menuler: '🔗 Ekstra Menü',
    sifre: '🔑 Yönetici Hesabı',
    yedek: '💾 Yedek / Sıfırla',
  };

  let state = {
    currentPanel: 'overview',
    data: window.kemalSiteStore ? window.kemalSiteStore.getDefaults() : {},
  };

  function escHtml(value) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let toastTimer = null;
  function toast(message, type) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast ' + (type || 'success') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      el.classList.remove('show');
    }, 2800);
  }

  function getData() {
    return state.data;
  }

  function updateStats() {
    const data = getData();
    document.getElementById('sDuyuru').textContent = (data.duyurular || []).filter((item) => item.aktif).length;
    document.getElementById('sYeni').textContent = (data.yeniIcerikler || []).filter((item) => item.aktif).length;
    document.getElementById('sHizli').textContent = (data.hizliErisim || []).filter((item) => item.aktif).length;
    document.getElementById('sBadge').textContent = Object.values(data.menuBadges || {}).filter(Boolean).length;
  }

  async function persistData(successMessage) {
    try {
      const accessToken = await window.kemalAdminAuth.getAccessToken();
      state.data = await window.kemalSiteStore.saveSiteData(state.data, accessToken);
      updateStats();
      renderCurrentPanel();
      if (successMessage) {
        toast(successMessage, 'success');
      }
    } catch (error) {
      toast(window.kemalAdminAuth.humanizeError(error), 'error');
    }
  }

  function showPanel(id) {
    state.currentPanel = id;
    document.querySelectorAll('.panel').forEach(function(panel) {
      panel.classList.remove('active');
    });
    document.querySelectorAll('.side-btn').forEach(function(button) {
      button.classList.remove('active');
    });
    const panel = document.getElementById('panel-' + id);
    if (panel) {
      panel.classList.add('active');
    }
    const button = document.getElementById('btn-' + id);
    if (button) {
      button.classList.add('active');
    }
    document.getElementById('panelTitle').textContent = TITLES[id] || TITLES.overview;
    renderCurrentPanel();
  }

  function renderDuyurular() {
    const list = getData().duyurular || [];
    document.getElementById('duyuruCount').textContent = list.filter((item) => item.aktif).length;
    document.getElementById('duyuruList').innerHTML = list.length
      ? list.map(function(item, index) {
          return `
            <div class="item-row">
              <span class="item-em">📢</span>
              <div class="item-info">
                <div class="item-name">${escHtml(item.metin)}</div>
              </div>
              <div class="item-actions">
                <button class="btn-toggle ${item.aktif ? 'on' : 'off'}" onclick="toggleDuyuru(${index})">${item.aktif ? 'Açık' : 'Kapalı'}</button>
                <button class="btn-danger" onclick="delDuyuru(${index})">Sil</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:14px;">Henüz duyuru eklenmedi.</p>';
  }

  function renderBadges() {
    const badges = getData().menuBadges || {};
    document.getElementById('badgeList').innerHTML = GRADE_DEFS.map(function(grade) {
      return `
        <div class="item-row">
          <span class="item-em">${grade.em}</span>
          <div class="item-info"><div class="item-name">${grade.label}</div></div>
          <label class="toggle">
            <input type="checkbox" id="badge_${grade.key}" ${badges[grade.key] ? 'checked' : ''} onchange="previewBadge()">
            <span class="slider"></span>
          </label>
          ${badges[grade.key] ? '<span class="badge-preview">YENİ</span>' : ''}
        </div>`;
    }).join('');
  }

  function renderHizli() {
    const list = getData().hizliErisim || [];
    document.getElementById('hizliCount').textContent = list.length;
    document.getElementById('hizliList').innerHTML = list.length
      ? list.map(function(item, index) {
          return `
            <div class="item-row">
              <span class="item-em">${item.emoji}</span>
              <div class="item-info">
                <div class="item-name">${escHtml(item.baslik)}</div>
                <div class="item-sub">${escHtml(item.link)}</div>
              </div>
              <div class="item-actions">
                <button class="btn-toggle ${item.aktif ? 'on' : 'off'}" onclick="toggleHizli(${index})">${item.aktif ? 'Açık' : 'Kapalı'}</button>
                <button class="btn-danger" onclick="delHizli(${index})">Sil</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:14px;">Henüz kart eklenmedi.</p>';
  }

  function renderOnec() {
    const list = getData().onecikarlar || [];
    document.getElementById('onecCount').textContent = list.filter((item) => item.aktif).length;
    document.getElementById('onecList').innerHTML = list.length
      ? list.map(function(item, index) {
          return `
            <div class="item-row">
              <span class="item-em">${item.emoji || '📌'}</span>
              <div class="item-info">
                <div class="item-name">${escHtml(item.baslik)}</div>
                <div class="item-sub">${escHtml(item.tarih || '')} · ${escHtml(item.link || '')}</div>
              </div>
              <div class="item-actions">
                <button class="btn-toggle ${item.aktif ? 'on' : 'off'}" onclick="toggleOnec(${index})">${item.aktif ? 'Açık' : 'Kapalı'}</button>
                <button class="btn-danger" onclick="delOnec(${index})">Sil</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:14px;">Henüz öne çıkan eklenmedi.</p>';
  }

  function renderYeni() {
    const list = getData().yeniIcerikler || [];
    document.getElementById('yeniCount').textContent = list.filter((item) => item.aktif).length;
    document.getElementById('yeniList').innerHTML = list.length
      ? list.map(function(item, index) {
          return `
            <div class="item-row">
              <span class="item-em">${item.emoji}</span>
              <div class="item-info">
                <div class="item-name">${escHtml(item.baslik)}</div>
                <div class="item-sub">${escHtml(item.tarih || '')} · ${escHtml(item.link)}</div>
              </div>
              <div class="item-actions">
                <button class="btn-toggle ${item.aktif ? 'on' : 'off'}" onclick="toggleYeni(${index})">${item.aktif ? 'Açık' : 'Kapalı'}</button>
                <button class="btn-danger" onclick="delYeni(${index})">Sil</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:14px;">Henüz içerik eklenmedi.</p>';
  }

  function renderStats() {
    const stats = getData().hakkimda && getData().hakkimda.istatistikler ? getData().hakkimda.istatistikler : [];
    document.getElementById('hmStatList').innerHTML = stats.map(function(item, index) {
      return `
        <div style="display:flex;gap:10px;align-items:center;">
          <input type="text" placeholder="Sayı (Örn: 21+)" value="${escHtml(item.sayi)}" oninput="updateStat(${index},'sayi',this.value)" style="flex:1;margin-bottom:0;">
          <input type="text" placeholder="Etiket (Örn: Yıl)" value="${escHtml(item.etiket)}" oninput="updateStat(${index},'etiket',this.value)" style="flex:1;margin-bottom:0;">
          <button class="btn-danger" onclick="delStat(${index})">✕</button>
        </div>`;
    }).join('');
  }

  function renderHakkimda() {
    const about = getData().hakkimda || {};
    document.getElementById('hmIsim').value = about.isim || '';
    document.getElementById('hmUnvan').value = about.unvan || '';
    document.getElementById('hmMetin').value = about.metin || '';
    renderStats();
  }

  function renderMenuler() {
    const list = getData().ekMenuler || [];
    document.getElementById('menuList').innerHTML = list.length
      ? list.map(function(item, index) {
          return `
            <div class="item-row">
              <span class="item-em">🔗</span>
              <div class="item-info">
                <div class="item-name">${escHtml(item.ad)}</div>
                <div class="item-sub">${escHtml(item.url)}</div>
              </div>
              <div class="item-actions">
                <button class="btn-danger" onclick="delMenu(${index})">Sil</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--muted);font-size:14px;">Henüz ekstra bağlantı eklenmedi.</p>';
  }

  function renderCurrentPanel() {
    switch (state.currentPanel) {
      case 'duyurular':
        renderDuyurular();
        break;
      case 'badges':
        renderBadges();
        break;
      case 'hizli':
        renderHizli();
        break;
      case 'onecikarlar':
        renderOnec();
        break;
      case 'yeni':
        renderYeni();
        break;
      case 'hakkimda':
        renderHakkimda();
        break;
      case 'menuler':
        renderMenuler();
        break;
      default:
        renderDuyurular();
        renderBadges();
        renderHizli();
        renderOnec();
        renderYeni();
        renderHakkimda();
        renderMenuler();
        break;
    }
  }

  async function initDashboard() {
    state.data = await window.kemalSiteStore.loadSiteData();
    updateStats();
    renderCurrentPanel();
    document.getElementById('yeniTarih').value = new Date().toISOString().split('T')[0];
    document.getElementById('onecTarih').value = new Date().toISOString().split('T')[0];
    try {
      const user = await window.kemalAdminAuth.getUser();
      document.getElementById('adminEmailDisplay').value = user && user.email ? user.email : '';
    } catch (error) {
      document.getElementById('adminEmailDisplay').value = '';
    }
  }

  async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginErr');
    if (!email || !password) {
      errorEl.style.display = 'block';
      errorEl.textContent = '❌ E-posta ve şifre alanlarını doldurun.';
      return;
    }

    try {
      await window.kemalAdminAuth.signIn(email, password);
      errorEl.style.display = 'none';
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'flex';
      await initDashboard();
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
      location.reload();
    }
  }

  function addDuyuru() {
    const metin = document.getElementById('newDuyuruMetin').value.trim();
    if (!metin) {
      toast('Duyuru metni boş olamaz!', 'error');
      return;
    }
    state.data.duyurular.unshift({ id: Date.now(), metin, aktif: true });
    document.getElementById('newDuyuruMetin').value = '';
    persistData('✅ Duyuru kaydedildi!');
  }

  function toggleDuyuru(index) {
    state.data.duyurular[index].aktif = !state.data.duyurular[index].aktif;
    persistData();
  }

  function delDuyuru(index) {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }
    state.data.duyurular.splice(index, 1);
    persistData('🗑️ Duyuru silindi');
  }

  function previewBadge() {
    saveBadges(false);
  }

  function saveBadges(showToast) {
    state.data.menuBadges = {};
    GRADE_DEFS.forEach(function(grade) {
      const input = document.getElementById('badge_' + grade.key);
      state.data.menuBadges[grade.key] = !!(input && input.checked);
    });
    persistData(showToast === false ? '' : '✅ Rozetler güncellendi!');
  }

  function addHizli() {
    const baslik = document.getElementById('hizliBaslik').value.trim();
    const emoji = document.getElementById('hizliEmoji').value.trim() || '📄';
    const aciklama = document.getElementById('hizliAciklama').value.trim();
    const link = document.getElementById('hizliLink').value.trim();
    const renk = document.getElementById('hizliRenk').value;
    if (!baslik || !link) {
      toast('Başlık ve link zorunludur!', 'error');
      return;
    }
    state.data.hizliErisim.push({ id: Date.now(), baslik, emoji, aciklama, link, renk, aktif: true });
    ['hizliBaslik', 'hizliEmoji', 'hizliAciklama', 'hizliLink'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    persistData('✅ Hızlı erişim kartı kaydedildi!');
  }

  function toggleHizli(index) {
    state.data.hizliErisim[index].aktif = !state.data.hizliErisim[index].aktif;
    persistData();
  }

  function delHizli(index) {
    if (!confirm('Bu kartı silmek istediğinizden emin misiniz?')) {
      return;
    }
    state.data.hizliErisim.splice(index, 1);
    persistData('🗑️ Kart silindi');
  }

  function addOnec() {
    const baslik = document.getElementById('onecBaslik').value.trim();
    const emoji = document.getElementById('onecEmoji').value.trim() || '📌';
    const aciklama = document.getElementById('onecAciklama').value.trim();
    const link = document.getElementById('onecLink').value.trim();
    const renk = document.getElementById('onecRenk').value;
    const tarih = document.getElementById('onecTarih').value;
    if (!baslik || !link) {
      toast('Başlık ve link zorunludur!', 'error');
      return;
    }
    state.data.onecikarlar.unshift({ id: Date.now(), baslik, emoji, aciklama, link, renk, tarih, aktif: true });
    ['onecBaslik', 'onecEmoji', 'onecAciklama', 'onecLink'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    persistData('✅ Öne çıkan kartı kaydedildi!');
  }

  function toggleOnec(index) {
    state.data.onecikarlar[index].aktif = !state.data.onecikarlar[index].aktif;
    persistData();
  }

  function delOnec(index) {
    if (!confirm('Bu öne çıkanı silmek istiyor musunuz?')) {
      return;
    }
    state.data.onecikarlar.splice(index, 1);
    persistData('🗑️ Öne çıkan kartı silindi');
  }

  function addYeni() {
    const baslik = document.getElementById('yeniBaslik').value.trim();
    const emoji = document.getElementById('yeniEmoji').value.trim() || '📄';
    const aciklama = document.getElementById('yeniAciklama').value.trim();
    const link = document.getElementById('yeniLink').value.trim();
    const tarih = document.getElementById('yeniTarih').value;
    if (!baslik || !link) {
      toast('Başlık ve link zorunludur!', 'error');
      return;
    }
    state.data.yeniIcerikler.unshift({ id: Date.now(), baslik, emoji, aciklama, link, tarih, aktif: true });
    ['yeniBaslik', 'yeniEmoji', 'yeniAciklama', 'yeniLink'].forEach(function(id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('yeniTarih').value = new Date().toISOString().split('T')[0];
    persistData('✅ Yeni içerik kaydedildi!');
  }

  function toggleYeni(index) {
    state.data.yeniIcerikler[index].aktif = !state.data.yeniIcerikler[index].aktif;
    persistData();
  }

  function delYeni(index) {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) {
      return;
    }
    state.data.yeniIcerikler.splice(index, 1);
    persistData('🗑️ İçerik silindi');
  }

  function updateStat(index, key, value) {
    if (state.data.hakkimda && state.data.hakkimda.istatistikler[index]) {
      state.data.hakkimda.istatistikler[index][key] = value;
      window.kemalSiteStore.updateLocalCache(state.data);
    }
  }

  function addStat() {
    state.data.hakkimda.istatistikler.push({ sayi: '', etiket: '' });
    renderStats();
  }

  function delStat(index) {
    state.data.hakkimda.istatistikler.splice(index, 1);
    renderStats();
  }

  function saveHakkimda() {
    state.data.hakkimda.isim = document.getElementById('hmIsim').value.trim();
    state.data.hakkimda.unvan = document.getElementById('hmUnvan').value.trim();
    state.data.hakkimda.metin = document.getElementById('hmMetin').value.trim();
    persistData('✅ Hakkımda alanı kaydedildi!');
  }

  function addMenu() {
    const ad = document.getElementById('menuAd').value.trim();
    const url = document.getElementById('menuUrl').value.trim();
    if (!ad || !url) {
      toast('Ad ve URL zorunludur!', 'error');
      return;
    }
    state.data.ekMenuler.push({ id: Date.now(), ad, url });
    document.getElementById('menuAd').value = '';
    document.getElementById('menuUrl').value = '';
    persistData('✅ Menü bağlantısı kaydedildi!');
  }

  function delMenu(index) {
    if (!confirm('Bu bağlantıyı silmek istediğinizden emin misiniz?')) {
      return;
    }
    state.data.ekMenuler.splice(index, 1);
    persistData('🗑️ Menü bağlantısı silindi');
  }

  async function changePassword() {
    const password = document.getElementById('sifreYeni').value;
    const password2 = document.getElementById('sifreYeniTekrar').value;
    if (password.length < 6) {
      toast('Yeni şifre en az 6 karakter olmalı!', 'error');
      return;
    }
    if (password !== password2) {
      toast('Yeni şifreler eşleşmiyor!', 'error');
      return;
    }

    try {
      await window.kemalAdminAuth.updatePassword(password);
      document.getElementById('sifreYeni').value = '';
      document.getElementById('sifreYeniTekrar').value = '';
      toast('✅ Supabase yönetici şifresi güncellendi!', 'success');
    } catch (error) {
      toast(window.kemalAdminAuth.humanizeError(error), 'error');
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kemalogretmenim_yedek_' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    URL.revokeObjectURL(url);
    toast('✅ Yedek indirildi!', 'success');
  }

  async function resetConfirm() {
    if (!confirm('TÜM içerik verileri varsayılan içeriğe dönecek. Emin misiniz?')) {
      return;
    }
    state.data = window.kemalSiteStore.getDefaults();
    await persistData('♻️ Veriler varsayılan yapıya döndürüldü');
  }

  async function bootstrap() {
    const session = await window.kemalAdminAuth.getSession().catch(function() {
      return null;
    });
    document.getElementById('loginPass').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });
    document.getElementById('loginEmail').addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        doLogin();
      }
    });

    if (session) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashboard').style.display = 'flex';
      await initDashboard();
    }
  }

  window.showPanel = showPanel;
  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.addDuyuru = addDuyuru;
  window.toggleDuyuru = toggleDuyuru;
  window.delDuyuru = delDuyuru;
  window.previewBadge = previewBadge;
  window.saveBadges = saveBadges;
  window.addHizli = addHizli;
  window.toggleHizli = toggleHizli;
  window.delHizli = delHizli;
  window.addOnec = addOnec;
  window.toggleOnec = toggleOnec;
  window.delOnec = delOnec;
  window.addYeni = addYeni;
  window.toggleYeni = toggleYeni;
  window.delYeni = delYeni;
  window.updateStat = updateStat;
  window.addStat = addStat;
  window.delStat = delStat;
  window.saveHakkimda = saveHakkimda;
  window.addMenu = addMenu;
  window.delMenu = delMenu;
  window.changePassword = changePassword;
  window.exportData = exportData;
  window.resetConfirm = resetConfirm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
