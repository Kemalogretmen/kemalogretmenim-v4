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
    adminler: '👥 Alt Adminler',
    analytics: '📈 Site Analizleri',
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
    accessProfile: null,
    adminUsers: [],
    adminUsersLoading: false,
    adminUsersError: '',
    adminUserEditingEmail: '',
    analytics: {
      days: 7,
      loadedDays: 0,
      loading: false,
      summary: null,
      error: '',
    },
  };

  function escHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('tr-TR').format(Number(value || 0));
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    if (total < 60) {
      return total + ' sn';
    }

    const minutes = Math.floor(total / 60);
    const restSeconds = total % 60;
    if (minutes < 60) {
      return minutes + ' dk' + (restSeconds ? ' ' + restSeconds + ' sn' : '');
    }

    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    return hours + ' sa' + (restMinutes ? ' ' + restMinutes + ' dk' : '');
  }

  function formatDay(value) {
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(value));
    } catch (error) {
      return String(value || '-');
    }
  }

  function formatDateTime(value) {
    try {
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch (error) {
      return String(value || '-');
    }
  }

  function formatPathLabel(path) {
    const raw = String(path || '').trim();
    if (!raw) {
      return 'Bilinmeyen sayfa';
    }
    if (raw === '/' || raw === '/index.html') {
      return 'Ana sayfa';
    }
    try {
      return decodeURIComponent(raw);
    } catch (error) {
      return raw;
    }
  }

  function emptyStateHtml(message) {
    return '<div class="analytics-empty">' + escHtml(message) + '</div>';
  }

  function humanizeAnalyticsError(error) {
    const message = String((error && error.message) || '');
    if (
      message.includes('site_analytics_events') ||
      message.includes('get_site_analytics_summary') ||
      message.includes('Could not find the function public.get_site_analytics_summary')
    ) {
      return 'Site analizleri tablosu veya rapor fonksiyonu henüz kurulmamış görünüyor. `supabase-v1-ucretsiz-mimari.sql` dosyasını Supabase SQL Editor içinde tekrar çalıştırın.';
    }
    return window.kemalAdminAuth.humanizeError(error);
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

  function getPermissionDefs() {
    return window.kemalAdminAuth && typeof window.kemalAdminAuth.getAdminPermissionDefs === 'function'
      ? window.kemalAdminAuth.getAdminPermissionDefs()
      : [];
  }

  function getAccessProfile() {
    return state.accessProfile || {
      email: '',
      displayName: '',
      active: true,
      isOwner: true,
      legacyMode: true,
      permissions: getPermissionDefs().reduce(function(map, item) {
        map[item.key] = true;
        return map;
      }, {}),
      allowedPanels: getPermissionDefs().map(function(item) { return item.key; }),
      row: null,
      rows: [],
    };
  }

  function canAccess(permissionKey) {
    const profile = getAccessProfile();
    if (!permissionKey) {
      return true;
    }
    if (profile.isOwner || profile.legacyMode) {
      return true;
    }
    return !!(profile.permissions && profile.permissions[permissionKey]);
  }

  function isOwnerUser() {
    const profile = getAccessProfile();
    return !!(profile.isOwner || profile.legacyMode);
  }

  function setElementVisible(id, visible, displayValue) {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }
    el.style.display = visible ? (displayValue || '') : 'none';
  }

  function getOverviewQuickButtonMap() {
    return {
      'quick-analytics': 'site_admin_dashboard',
      'quick-duyurular': 'site_admin_dashboard',
      'quick-yeni': 'site_admin_dashboard',
      'quick-badges': 'site_admin_dashboard',
      'quick-hizli': 'site_admin_dashboard',
      'quick-okuma-editor': 'okuma_editor',
      'quick-dokuman-yonetimi': 'dokuman_yonetimi',
      'quick-menu-yonetimi': 'menu_yonetimi',
      'quick-calisma-kagidi': 'calisma_kagidi',
      'quick-okuma-sonuclari': 'okuma_sonuclari',
      'quick-okuma-karne': 'okuma_karne',
      'quick-adminler': '__owner__',
      'quick-sinav-admin': '__owner__',
    };
  }

  function getSidebarPermissionMap() {
    return {
      'btn-analytics': 'site_admin_dashboard',
      'btn-duyurular': 'site_admin_dashboard',
      'btn-badges': 'site_admin_dashboard',
      'btn-hizli': 'site_admin_dashboard',
      'btn-onecikarlar': 'site_admin_dashboard',
      'btn-yeni': 'site_admin_dashboard',
      'btn-hakkimda': 'site_admin_dashboard',
      'btn-menuler': 'site_admin_dashboard',
      'btn-oyunlar': 'oyunlar_admin',
      'btn-okuma-editor': 'okuma_editor',
      'btn-dokuman-yonetimi': 'dokuman_yonetimi',
      'btn-menu-yonetimi': 'menu_yonetimi',
      'btn-calisma-kagidi': 'calisma_kagidi',
      'btn-okuma-sonuclar': 'okuma_sonuclari',
      'btn-okuma-karne': 'okuma_karne',
      'btn-adminler': '__owner__',
      'btn-yedek': '__owner__',
      'btn-sinav-admin': '__owner__',
    };
  }

  function renderAccessSummary() {
    const profile = getAccessProfile();
    const defs = getPermissionDefs();
    const allowedDefs = defs.filter(function(item) {
      return canAccess(item.key);
    });

    const roleValueEl = document.getElementById('accessRoleValue');
    const roleSubEl = document.getElementById('accessRoleSub');
    const countValueEl = document.getElementById('accessCountValue');
    const countSubEl = document.getElementById('accessCountSub');
    const chipsEl = document.getElementById('accessPermissionChips');
    const hintEl = document.getElementById('overviewAccessHint');

    if (roleValueEl) {
      roleValueEl.textContent = isOwnerUser() ? 'Ana Yönetici' : 'Alt Admin';
    }
    if (roleSubEl) {
      if (profile.legacyMode) {
        roleSubEl.textContent = 'Alt admin sistemi henüz veritabanında başlatılmamış. Bu hesap geçici olarak tam erişimle açıldı.';
      } else if (isOwnerUser()) {
        roleSubEl.textContent = 'Bu hesap tüm Supabase tabanlı admin panellerini yönetebilir.';
      } else {
        roleSubEl.textContent = 'Bu hesap yalnızca ana yönetici tarafından açılan panellere erişebilir.';
      }
    }
    if (countValueEl) {
      countValueEl.textContent = String(allowedDefs.length);
    }
    if (countSubEl) {
      countSubEl.textContent = allowedDefs.length
        ? 'Bu hesap için açık yönetim paneli sayısı'
        : 'Bu hesap için henüz panel yetkisi açılmadı.';
    }
    if (chipsEl) {
      if (!allowedDefs.length) {
        chipsEl.innerHTML = '<span class="perm-chip muted">Henüz panel yetkisi açık değil</span>';
      } else {
        chipsEl.innerHTML = allowedDefs.map(function(item) {
          return '<span class="perm-chip">✅ ' + escHtml(item.label) + '</span>';
        }).join('');
      }
    }
    if (hintEl) {
      const hasSiteDashboard = canAccess('site_admin_dashboard');
      hintEl.style.display = hasSiteDashboard ? 'none' : 'block';
      hintEl.textContent = isOwnerUser()
        ? 'Ana yönetici olarak tüm panellere erişimin açık. İstersen alt adminleri bu ekrandan daha sınırlı yetkilerle tanımlayabilirsin.'
        : 'Bu hesapta ana site içerik panelleri kapalı. Aşağıdaki açık yetki kartlarından yalnızca size tanımlanan bölümlere geçebilirsiniz.';
    }
  }

  function applyAccessControl() {
    const showSiteDashboard = canAccess('site_admin_dashboard');
    const ownerMode = isOwnerUser();

    Object.entries(getSidebarPermissionMap()).forEach(function(entry) {
      const elementId = entry[0];
      const permissionKey = entry[1];
      const visible = permissionKey === '__owner__'
        ? ownerMode
        : canAccess(permissionKey);
      setElementVisible(elementId, visible);
    });

    Object.entries(getOverviewQuickButtonMap()).forEach(function(entry) {
      const elementId = entry[0];
      const permissionKey = entry[1];
      const visible = permissionKey === '__owner__'
        ? ownerMode
        : canAccess(permissionKey);
      setElementVisible(elementId, visible);
    });

    setElementVisible('statsRow', showSiteDashboard, 'grid');

    if (!showSiteDashboard && ['analytics', 'duyurular', 'badges', 'hizli', 'onecikarlar', 'yeni', 'hakkimda', 'menuler', 'yedek'].includes(state.currentPanel)) {
      state.currentPanel = 'overview';
    }
    if (!ownerMode && state.currentPanel === 'adminler') {
      state.currentPanel = 'overview';
    }
    renderAccessSummary();
  }

  function updateStats() {
    const data = getData();
    document.getElementById('sDuyuru').textContent = (data.duyurular || []).filter((item) => item.aktif).length;
    document.getElementById('sYeni').textContent = (data.yeniIcerikler || []).filter((item) => item.aktif).length;
    document.getElementById('sHizli').textContent = (data.hizliErisim || []).filter((item) => item.aktif).length;
    document.getElementById('sBadge').textContent = Object.values(data.menuBadges || {}).filter(Boolean).length;
  }

  async function persistData(successMessage) {
    if (!canAccess('site_admin_dashboard')) {
      toast('Bu içerik alanında değişiklik yapma yetkin açık değil.', 'error');
      return;
    }
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

  function getRequestedPanelFromHash() {
    const hash = String(window.location.hash || '').replace(/^#/, '').trim();
    if (!hash) {
      return '';
    }
    return Object.prototype.hasOwnProperty.call(TITLES, hash) ? hash : '';
  }

  function syncSidebarState() {
    const activeButton = document.querySelector('.side-btn.active');
    if (!activeButton) {
      return;
    }
    document.querySelectorAll('.admin-nav-group').forEach(function(group) {
      if (group.contains(activeButton)) {
        group.classList.add('is-open');
      }
    });
  }

  function showPanel(id) {
    const ownerMode = isOwnerUser();
    const siteDashboardPanels = ['analytics', 'duyurular', 'badges', 'hizli', 'onecikarlar', 'yeni', 'hakkimda', 'menuler'];
    if (siteDashboardPanels.includes(id) && !canAccess('site_admin_dashboard')) {
      toast('Bu içerik alanı için yetkin açık değil.', 'error');
      return;
    }
    if (id === 'adminler' && !ownerMode) {
      toast('Alt admin yönetimi yalnızca ana yöneticiye açık.', 'error');
      return;
    }
    if (id === 'yedek' && !ownerMode) {
      toast('Yedek ve sıfırlama alanı yalnızca ana yöneticiye açık.', 'error');
      return;
    }

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
    const targetHash = '#' + id;
    if (window.location.hash !== targetHash) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search + targetHash);
    }
    document.getElementById('panelTitle').textContent = TITLES[id] || TITLES.overview;
    syncSidebarState();
    renderCurrentPanel();
    if (id === 'adminler') {
      loadAdminUsers(false);
    }
    if (id === 'analytics') {
      loadAnalytics(false);
    }
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

  function syncAdminActiveLabel() {
    const toggle = document.getElementById('subAdminActive');
    const label = document.getElementById('subAdminActiveLabel');
    if (!toggle || !label) {
      return;
    }
    label.textContent = toggle.checked ? 'Aktif' : 'Pasif';
  }

  function buildPermissionCheckboxes() {
    const container = document.getElementById('subAdminPermissionList');
    if (!container) {
      return;
    }
    const defs = getPermissionDefs();
    container.innerHTML = defs.map(function(item) {
      return (
        '<label class="admin-permission-card">' +
          '<input type="checkbox" data-admin-permission="' + escHtml(item.key) + '">' +
          '<div>' +
            '<strong>' + escHtml(item.label) + '</strong>' +
            '<span>' + escHtml(item.description) + '</span>' +
          '</div>' +
        '</label>'
      );
    }).join('');
  }

  function resetAdminMemberForm() {
    const emailInput = document.getElementById('subAdminEmail');
    const displayNameInput = document.getElementById('subAdminDisplayName');
    const activeInput = document.getElementById('subAdminActive');
    const noteEl = document.getElementById('subAdminFormNote');

    state.adminUserEditingEmail = '';
    if (emailInput) {
      emailInput.value = '';
      emailInput.disabled = false;
    }
    if (displayNameInput) {
      displayNameInput.value = '';
    }
    if (activeInput) {
      activeInput.checked = true;
    }
    syncAdminActiveLabel();
    document.querySelectorAll('[data-admin-permission]').forEach(function(input) {
      input.checked = false;
      input.disabled = false;
    });
    if (noteEl) {
      noteEl.textContent = 'Alt admin giriş yaptıktan sonra yalnızca seçtiğiniz paneller görünür. Şifre değişikliği kullanıcıya aittir; bu ekranda erişim yönetilir.';
    }
  }

  function fillAdminMemberForm(row) {
    const emailInput = document.getElementById('subAdminEmail');
    const displayNameInput = document.getElementById('subAdminDisplayName');
    const activeInput = document.getElementById('subAdminActive');
    const noteEl = document.getElementById('subAdminFormNote');
    if (!row) {
      resetAdminMemberForm();
      return;
    }

    state.adminUserEditingEmail = row.email;
    if (emailInput) {
      emailInput.value = row.email;
      emailInput.disabled = !!row.isOwner;
    }
    if (displayNameInput) {
      displayNameInput.value = row.displayName || '';
    }
    if (activeInput) {
      activeInput.checked = row.active !== false;
    }
    syncAdminActiveLabel();
    document.querySelectorAll('[data-admin-permission]').forEach(function(input) {
      const key = input.getAttribute('data-admin-permission');
      input.checked = !!(row.permissions && row.permissions[key]);
      input.disabled = !!row.isOwner;
    });
    if (noteEl) {
      noteEl.textContent = row.isOwner
        ? 'Ana yönetici hesabı burada yalnızca görüntülenir. Silinemez veya yetkisi kapatılamaz.'
        : 'Düzenleme modundasın. E-postayı değiştirmek yerine yeni kayıt açmak daha güvenli olur.';
    }
  }

  function renderAdminUsersPanel() {
    const listEl = document.getElementById('adminUsersList');
    const statusEl = document.getElementById('adminUsersStatus');
    const ownerEmailEl = document.getElementById('ownerEmailValue');
    const ownerModeEl = document.getElementById('ownerModeValue');
    const subAdminCountEl = document.getElementById('subAdminCountValue');
    const subAdminCountSubEl = document.getElementById('subAdminCountSub');

    if (!listEl || !statusEl) {
      return;
    }

    const profile = getAccessProfile();
    const rows = Array.isArray(state.adminUsers) ? state.adminUsers : [];
    const ownerRow = rows.find(function(row) { return row.isOwner; }) || null;
    const subAdmins = rows.filter(function(row) { return !row.isOwner; });
    const activeSubAdmins = subAdmins.filter(function(row) { return row.active !== false; });

    if (ownerEmailEl) {
      ownerEmailEl.textContent = ownerRow ? ownerRow.email : (profile.email || '-');
    }
    if (ownerModeEl) {
      ownerModeEl.textContent = profile.legacyMode
        ? 'Veritabanında admin_users yapısı henüz başlatılmadı. İlk kayıtla birlikte ana yönetici satırı oluşturulur.'
        : 'Ana yönetici tüm alt adminleri yönetir ve gerekirse pasife alabilir.';
    }
    if (subAdminCountEl) {
      subAdminCountEl.textContent = String(activeSubAdmins.length);
    }
    if (subAdminCountSubEl) {
      subAdminCountSubEl.textContent = subAdmins.length
        ? subAdmins.length + ' kayıtlı alt admin bulunuyor.'
        : 'Henüz alt admin eklenmedi.';
    }

    if (!isOwnerUser()) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Alt admin yönetimi yalnızca ana yönetici hesabında görünür.';
      listEl.innerHTML = '';
      return;
    }

    if (state.adminUsersLoading) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Alt admin listesi yükleniyor…';
      listEl.innerHTML = '';
      return;
    }

    if (state.adminUsersError) {
      statusEl.style.display = 'block';
      statusEl.textContent = state.adminUsersError;
      listEl.innerHTML = '';
      return;
    }

    statusEl.style.display = rows.length ? 'none' : 'block';
    statusEl.textContent = rows.length
      ? ''
      : 'Henüz veritabanına kaydedilmiş admin satırı yok. İlk alt admin kaydında ana yönetici hesabı otomatik hazırlanır.';

    listEl.innerHTML = rows.length
      ? rows.map(function(row) {
          const permissionChips = row.isOwner
            ? '<span class="perm-chip">👑 Tüm Supabase panelleri</span>'
            : Object.keys(row.permissions || {}).filter(function(key) {
                return !!row.permissions[key];
              }).map(function(key) {
                const def = getPermissionDefs().find(function(item) {
                  return item.key === key;
                });
                return '<span class="perm-chip">' + escHtml(def ? def.label : key) + '</span>';
              }).join('') || '<span class="perm-chip muted">Henüz panel açılmadı</span>';

          return (
            '<div class="admin-user-row">' +
              '<div class="admin-user-head">' +
                '<div class="admin-user-title">' + escHtml(row.displayName || row.email) +
                  '<small>' + escHtml(row.email) + '</small>' +
                '</div>' +
                '<div class="admin-badge-row">' +
                  (row.isOwner ? '<span class="admin-pill owner">Ana Yönetici</span>' : '<span class="admin-pill">Alt Admin</span>') +
                  '<span class="admin-pill ' + (row.active ? 'active' : 'passive') + '">' + (row.active ? 'Aktif' : 'Pasif') + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="perm-chip-wrap">' + permissionChips + '</div>' +
              '<div class="admin-row-actions">' +
                (row.isOwner
                  ? '<button class="btn-secondary" onclick="resetAdminMemberForm()">Ana yönetici hesabı</button>'
                  : '<button class="btn-add" onclick="editAdminMember(\'' + escHtml(row.email) + '\')">✏️ Düzenle</button>' +
                    '<button class="btn-toggle ' + (row.active ? 'on' : 'off') + '" onclick="toggleAdminMember(\'' + escHtml(row.email) + '\')">' + (row.active ? 'Pasife Al' : 'Aktifleştir') + '</button>' +
                    '<button class="btn-danger" onclick="removeAdminMember(\'' + escHtml(row.email) + '\')">Sil</button>') +
              '</div>' +
            '</div>'
          );
        }).join('')
      : '';
  }

  async function loadAdminUsers(force) {
    if (!isOwnerUser()) {
      state.adminUsers = [];
      state.adminUsersError = '';
      renderAdminUsersPanel();
      return;
    }
    if (state.adminUsersLoading && !force) {
      return;
    }

    state.adminUsersLoading = true;
    state.adminUsersError = '';
    renderAdminUsersPanel();

    try {
      state.adminUsers = await window.kemalAdminAuth.listAdminUsers();
    } catch (error) {
      state.adminUsers = [];
      state.adminUsersError = window.kemalAdminAuth.humanizeError(error);
    } finally {
      state.adminUsersLoading = false;
      renderAdminUsersPanel();
    }
  }

  function renderAnalytics() {
    const analytics = state.analytics;
    const statusEl = document.getElementById('analyticsStatus');
    const summaryEl = document.getElementById('analyticsSummary');
    const topPagesEl = document.getElementById('analyticsTopPages');
    const referrersEl = document.getElementById('analyticsReferrers');
    const dailyEl = document.getElementById('analyticsDaily');
    const recentEl = document.getElementById('analyticsRecent');

    [7, 30, 90].forEach(function(days) {
      const button = document.getElementById('analyticsDays' + days);
      if (!button) {
        return;
      }
      button.classList.toggle('on', analytics.days === days);
      button.classList.toggle('off', analytics.days !== days);
    });

    if (!statusEl || !summaryEl || !topPagesEl || !referrersEl || !dailyEl || !recentEl) {
      return;
    }

    if (analytics.loading && !analytics.summary) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Analiz verileri yükleniyor…';
      summaryEl.style.display = 'none';
      topPagesEl.innerHTML = emptyStateHtml('Veriler geldiğinde en çok açılan sayfalar burada listelenecek.');
      referrersEl.innerHTML = emptyStateHtml('Trafik kaynakları burada görünecek.');
      dailyEl.innerHTML = emptyStateHtml('Günlük hareket akışı burada görünecek.');
      recentEl.innerHTML = emptyStateHtml('Son ziyaretler burada görünecek.');
      return;
    }

    if (analytics.error) {
      statusEl.style.display = 'block';
      statusEl.textContent = analytics.error;
      summaryEl.style.display = 'none';
      topPagesEl.innerHTML = emptyStateHtml('Analiz raporu okunamadı.');
      referrersEl.innerHTML = emptyStateHtml('Analiz raporu okunamadı.');
      dailyEl.innerHTML = emptyStateHtml('Analiz raporu okunamadı.');
      recentEl.innerHTML = emptyStateHtml('Analiz raporu okunamadı.');
      return;
    }

    if (!analytics.summary) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Henüz ziyaret verisi oluşmadı. Siteye trafik geldikçe burası dolacak.';
      summaryEl.style.display = 'none';
      topPagesEl.innerHTML = emptyStateHtml('Henüz ziyaret verisi yok.');
      referrersEl.innerHTML = emptyStateHtml('Henüz ziyaret verisi yok.');
      dailyEl.innerHTML = emptyStateHtml('Henüz ziyaret verisi yok.');
      recentEl.innerHTML = emptyStateHtml('Henüz ziyaret verisi yok.');
      return;
    }

    const summary = analytics.summary.summary || {};
    const topPage = summary.top_page || null;
    const topPages = Array.isArray(analytics.summary.top_pages) ? analytics.summary.top_pages : [];
    const referrers = Array.isArray(analytics.summary.referrers) ? analytics.summary.referrers : [];
    const daily = Array.isArray(analytics.summary.daily) ? analytics.summary.daily : [];
    const recent = Array.isArray(analytics.summary.recent) ? analytics.summary.recent : [];
    const maxPageviews = topPages.reduce(function(max, item) {
      return Math.max(max, Number(item.pageviews || 0));
    }, 0);

    statusEl.style.display = analytics.loading ? 'block' : 'none';
    statusEl.textContent = analytics.loading ? 'Veriler yenileniyor…' : '';
    summaryEl.style.display = 'grid';
    summaryEl.innerHTML = [
      {
        label: 'Sayfa Görüntüleme',
        value: formatNumber(summary.pageviews),
        sub: analytics.days + ' günlük toplam görüntüleme',
      },
      {
        label: 'Tekil Oturum',
        value: formatNumber(summary.sessions),
        sub: 'Aynı ziyaretçinin 30 dakika içindeki gezintisi tek oturum sayılır',
      },
      {
        label: 'Ortalama Açık Kalma',
        value: formatDuration(summary.avg_open_seconds),
        sub: 'Sayfa değişene veya sekme kapanana kadar geçen ortalama süre',
      },
      {
        label: 'En Popüler Sayfa',
        value: topPage ? formatNumber(topPage.pageviews) : '0',
        sub: topPage ? formatPathLabel(topPage.page_path || topPage.page_title) : 'Henüz veri yok',
      },
    ].map(function(card) {
      return (
        '<div class="analytics-card">' +
          '<div class="analytics-card-label">' + escHtml(card.label) + '</div>' +
          '<div class="analytics-card-value">' + escHtml(card.value) + '</div>' +
          '<div class="analytics-card-sub">' + escHtml(card.sub) + '</div>' +
        '</div>'
      );
    }).join('');

    topPagesEl.innerHTML = topPages.length
      ? topPages.map(function(item) {
          const width = maxPageviews ? Math.max(8, Math.round((Number(item.pageviews || 0) / maxPageviews) * 100)) : 0;
          return (
            '<div class="analytics-row">' +
              '<div class="analytics-row-top">' +
                '<div class="analytics-row-title">' + escHtml(formatPathLabel(item.page_title || item.page_path)) +
                  '<small>' + escHtml(item.page_path || '') + '</small>' +
                '</div>' +
                '<div class="analytics-row-value">' + escHtml(formatNumber(item.pageviews)) + ' görüntüleme</div>' +
              '</div>' +
              '<div class="analytics-bar"><span style="width:' + width + '%"></span></div>' +
              '<div class="analytics-row-sub">' +
                '<span>Ortalama aktif süre: ' + escHtml(formatDuration(item.avg_active_seconds)) + '</span>' +
                '<span>Son ' + escHtml(String(analytics.days)) + ' gün</span>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : emptyStateHtml('Henüz ziyaret edilen sayfa kaydı yok.');

    referrersEl.innerHTML = referrers.length
      ? referrers.map(function(item) {
          const label = item.source === 'site-ici'
            ? 'Site içi yönlendirme'
            : (item.source || 'Direkt / Bilinmiyor');
          return (
            '<div class="analytics-row">' +
              '<div class="analytics-row-top">' +
                '<div class="analytics-row-title">' + escHtml(label) + '</div>' +
                '<div class="analytics-row-value">' + escHtml(formatNumber(item.pageviews)) + '</div>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : emptyStateHtml('Henüz referrer verisi yok.');

    dailyEl.innerHTML = daily.length
      ? daily.slice().reverse().map(function(item) {
          return (
            '<div class="analytics-row">' +
              '<div class="analytics-row-top">' +
                '<div class="analytics-row-title">' + escHtml(formatDay(item.day)) + '</div>' +
                '<div class="analytics-row-value">' + escHtml(formatNumber(item.pageviews)) + ' görüntüleme</div>' +
              '</div>' +
              '<div class="analytics-row-sub">' +
                '<span>' + escHtml(formatNumber(item.sessions)) + ' tekil oturum</span>' +
                '<span>' + escHtml(item.day || '') + '</span>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : emptyStateHtml('Henüz günlük akış verisi yok.');

    recentEl.innerHTML = recent.length
      ? recent.map(function(item) {
          const referrerLabel = item.referrer_host === 'site-ici'
            ? 'Site içi'
            : (item.referrer_host || 'Direkt');
          return (
            '<div class="analytics-row">' +
              '<div class="analytics-row-top">' +
                '<div class="analytics-row-title">' + escHtml(formatPathLabel(item.page_title || item.page_path)) +
                  '<small>' + escHtml(item.page_path || '') + '</small>' +
                '</div>' +
                '<div class="analytics-row-value">' + escHtml(formatDateTime(item.created_at)) + '</div>' +
              '</div>' +
              '<div class="analytics-row-sub">' +
                '<span>Kaynak: ' + escHtml(referrerLabel) + '</span>' +
                '<span>Açık: ' + escHtml(formatDuration(item.open_seconds)) + ' · Aktif: ' + escHtml(formatDuration(item.active_seconds)) + '</span>' +
              '</div>' +
            '</div>'
          );
        }).join('')
      : emptyStateHtml('Henüz son ziyaret kaydı yok.');
  }

  async function loadAnalytics(force) {
    if (state.analytics.loading) {
      return;
    }
    if (!force && state.analytics.summary && state.analytics.loadedDays === state.analytics.days) {
      renderAnalytics();
      return;
    }

    state.analytics.loading = true;
    state.analytics.error = '';
    renderAnalytics();

    try {
      const client = window.kemalAdminAuth.getClient();
      const result = await client.rpc('get_site_analytics_summary', {
        days: state.analytics.days,
      });
      if (result.error) {
        throw result.error;
      }
      state.analytics.summary = result.data || null;
      state.analytics.loadedDays = state.analytics.days;
    } catch (error) {
      state.analytics.summary = null;
      state.analytics.loadedDays = 0;
      state.analytics.error = humanizeAnalyticsError(error);
    } finally {
      state.analytics.loading = false;
      renderAnalytics();
    }
  }

  function setAnalyticsDays(days) {
    if (![7, 30, 90].includes(days)) {
      return;
    }
    state.analytics.days = days;
    state.analytics.error = '';
    if (state.currentPanel === 'analytics') {
      loadAnalytics(true);
    } else {
      renderAnalytics();
    }
  }

  function refreshAnalytics() {
    state.analytics.summary = null;
    state.analytics.loadedDays = 0;
    loadAnalytics(true);
  }

  function renderCurrentPanel() {
    switch (state.currentPanel) {
      case 'adminler':
        renderAdminUsersPanel();
        break;
      case 'analytics':
        renderAnalytics();
        break;
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
    buildPermissionCheckboxes();
    state.data = await window.kemalSiteStore.loadSiteData();
    state.accessProfile = await window.kemalAdminAuth.getAdminAccessProfile(true);
    updateStats();
    applyAccessControl();
    document.getElementById('yeniTarih').value = new Date().toISOString().split('T')[0];
    document.getElementById('onecTarih').value = new Date().toISOString().split('T')[0];
    try {
      const user = await window.kemalAdminAuth.getUser();
      document.getElementById('adminEmailDisplay').value = user && user.email ? user.email : '';
    } catch (error) {
      document.getElementById('adminEmailDisplay').value = '';
    }
    if (isOwnerUser()) {
      await loadAdminUsers(false);
    }
    showPanel(getRequestedPanelFromHash() || 'overview');
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

  function collectAdminPermissions() {
    const permissions = {};
    document.querySelectorAll('[data-admin-permission]').forEach(function(input) {
      permissions[input.getAttribute('data-admin-permission')] = !!input.checked;
    });
    return permissions;
  }

  async function saveAdminMember() {
    if (!isOwnerUser()) {
      toast('Alt adminleri yalnızca ana yönetici yönetebilir.', 'error');
      return;
    }

    const email = document.getElementById('subAdminEmail').value.trim();
    const displayName = document.getElementById('subAdminDisplayName').value.trim();
    const active = !!document.getElementById('subAdminActive').checked;
    const permissions = collectAdminPermissions();

    if (!email) {
      toast('Alt admin için e-posta zorunlu.', 'error');
      return;
    }

    if (!Object.values(permissions).some(Boolean)) {
      toast('En az bir panel yetkisi açmalısın.', 'error');
      return;
    }

    try {
      state.adminUsersLoading = true;
      state.adminUsersError = '';
      renderAdminUsersPanel();
      state.accessProfile = await window.kemalAdminAuth.saveAdminUser({
        originalEmail: state.adminUserEditingEmail || email,
        email,
        displayName,
        active,
        permissions,
      });
      toast(state.adminUserEditingEmail ? '✅ Alt admin güncellendi.' : '✅ Alt admin eklendi.', 'success');
      resetAdminMemberForm();
      applyAccessControl();
      await loadAdminUsers(true);
    } catch (error) {
      state.adminUsersLoading = false;
      state.adminUsersError = window.kemalAdminAuth.humanizeError(error);
      renderAdminUsersPanel();
      toast(window.kemalAdminAuth.humanizeError(error), 'error');
    }
  }

  function editAdminMember(email) {
    const row = (state.adminUsers || []).find(function(item) {
      return item.email === String(email || '').trim().toLocaleLowerCase('tr-TR');
    });
    if (!row) {
      toast('Düzenlenecek admin kaydı bulunamadı.', 'error');
      return;
    }
    fillAdminMemberForm(row);
    showPanel('adminler');
  }

  async function toggleAdminMember(email) {
    const row = (state.adminUsers || []).find(function(item) {
      return item.email === String(email || '').trim().toLocaleLowerCase('tr-TR');
    });
    if (!row) {
      toast('Admin kaydı bulunamadı.', 'error');
      return;
    }

    try {
      state.accessProfile = await window.kemalAdminAuth.saveAdminUser({
        originalEmail: row.email,
        email: row.email,
        displayName: row.displayName,
        active: !row.active,
        permissions: row.permissions,
      });
      toast(row.active ? '⏸️ Alt admin pasife alındı.' : '✅ Alt admin yeniden aktifleştirildi.', 'success');
      applyAccessControl();
      await loadAdminUsers(true);
    } catch (error) {
      toast(window.kemalAdminAuth.humanizeError(error), 'error');
    }
  }

  async function removeAdminMember(email) {
    if (!confirm('Bu alt admin kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await window.kemalAdminAuth.deleteAdminUser(email);
      toast('🗑️ Alt admin silindi.', 'success');
      if (state.adminUserEditingEmail && state.adminUserEditingEmail === String(email || '').trim().toLocaleLowerCase('tr-TR')) {
        resetAdminMemberForm();
      }
      await loadAdminUsers(true);
    } catch (error) {
      toast(window.kemalAdminAuth.humanizeError(error), 'error');
    }
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
    if (!isOwnerUser()) {
      toast('Yedek indirme yalnızca ana yöneticiye açık.', 'error');
      return;
    }
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
    if (!isOwnerUser()) {
      toast('Yalnızca ana yönetici verileri sıfırlayabilir.', 'error');
      return;
    }
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
    const activeInput = document.getElementById('subAdminActive');
    if (activeInput) {
      activeInput.addEventListener('change', syncAdminActiveLabel);
      syncAdminActiveLabel();
    }
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
    if (window.KemalAdminShell) {
      window.KemalAdminShell.bindSidebar(document.querySelector('.sidebar'));
    }
    window.addEventListener('hashchange', function() {
      const requestedPanel = getRequestedPanelFromHash();
      if (requestedPanel && requestedPanel !== state.currentPanel) {
        showPanel(requestedPanel);
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
  window.resetAdminMemberForm = resetAdminMemberForm;
  window.saveAdminMember = saveAdminMember;
  window.editAdminMember = editAdminMember;
  window.toggleAdminMember = toggleAdminMember;
  window.removeAdminMember = removeAdminMember;
  window.changePassword = changePassword;
  window.exportData = exportData;
  window.resetConfirm = resetConfirm;
  window.setAnalyticsDays = setAnalyticsDays;
  window.refreshAnalytics = refreshAnalytics;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
