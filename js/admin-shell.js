(function() {
  const NAV_SECTIONS = [
    {
      label: 'Genel Yönetim',
      groups: [
        {
          id: 'site-admin',
          icon: '⚙️',
          label: 'Ana Admin Paneli',
          description: 'Genel site ayarları ve yönetim',
          href: '/admin/index.html',
          children: [
            { key: 'main-overview', icon: '📊', label: 'Genel Bakış', description: 'Site durumu ve yönetim özetini aç', href: '/admin/index.html#overview' },
            { key: 'main-analytics', icon: '📈', label: 'Site Analizleri', description: 'Ziyaret ve içerik istatistiklerini incele', href: '/admin/index.html#analytics' },
            { key: 'main-reactions', icon: '👍', label: 'Beğeni Analizi', description: 'İçerik beğenilerini ve geri bildirimleri gör', href: '/admin/index.html#reactions' },
            { key: 'main-duyurular', icon: '📢', label: 'Duyurular', description: 'Ana sayfa duyurularını yönet', href: '/admin/index.html#duyurular' },
            { key: 'main-badges', icon: '🔔', label: 'YENİ Rozetleri', description: 'Yeni içerik rozetlerini düzenle', href: '/admin/index.html#badges' },
            { key: 'main-hizli', icon: '⚡', label: 'Hızlı Erişim', description: 'Ana sayfa hızlı bağlantılarını ayarla', href: '/admin/index.html#hizli' },
            { key: 'main-onecikarlar', icon: '📰', label: 'Öne Çıkanlar', description: 'Öne çıkan içerik alanını düzenle', href: '/admin/index.html#onecikarlar' },
            { key: 'main-yeni', icon: '🌟', label: 'Yeni İçerikler', description: 'Yeni içerik akışını yönet', href: '/admin/index.html#yeni' },
            { key: 'main-hakkimda', icon: '👤', label: 'Hakkımda', description: 'Hakkımda sayfası metinlerini güncelle', href: '/admin/index.html#hakkimda' },
            { key: 'main-menuler', icon: '🔗', label: 'Ekstra Menü', description: 'Ek bağlantı ve menü alanlarını düzenle', href: '/admin/index.html#menuler' },
            { key: 'main-adminler', icon: '🛡️', label: 'Alt Adminler', description: 'Yönetici erişimlerini ve yetkileri ayarla', href: '/admin/index.html#adminler' },
            { key: 'main-kullanicilar', icon: '👥', label: 'Kullanıcılar', description: 'Kullanıcı kayıtlarını ve hesapları incele', href: '/admin/index.html#kullanicilar' },
            { key: 'main-saglik', icon: '🩺', label: 'Sistem Sağlığı', description: 'Kayıt, policy ve storage kontrollerini aç', href: '/admin/index.html#saglik' },
            { key: 'main-sifre', icon: '🔑', label: 'Şifre Değiştir', description: 'Yönetici hesabı şifresini güncelle', href: '/admin/index.html#sifre' },
            { key: 'main-yedek', icon: '💾', label: 'Yedek / Sıfırla', description: 'Yedekleme ve sıfırlama araçlarını aç', href: '/admin/index.html#yedek' }
          ]
        }
      ]
    },
    {
      label: 'İçerik Yönetimi',
      groups: [
        {
          id: 'reading-admin',
          icon: '📚',
          label: 'Okuma Admin',
          description: 'Metinler, sonuçlar ve karne',
          href: '/admin/okuma-editor.html',
          children: [
            { key: 'okuma-editor', icon: '📝', label: 'Okuma Metinleri', description: 'Metinleri, soruları ve yayın durumunu düzenle', href: '/admin/okuma-editor.html' },
            { key: 'e-kitap-admin', icon: '📗', label: 'E-Kitap Yönetimi', description: 'PDF ve görsel kitapları, soruları ve yayın ayarlarını yönet', href: '/admin/e-kitap-yonetimi.html' },
            { key: 'e-kitap-sonuclari', icon: '📈', label: 'E-Kitap Sonuçları', description: 'E-kitap hız, anlama ve öğrenci kayıtlarını incele', href: '/admin/e-kitap-sonuclari.html' },
            { key: 'okuma-sonuclari', icon: '📊', label: 'Okuma Sonuçları', description: 'Öğrenci okuma performanslarını incele', href: '/admin/okuma-sonuclari.html' },
            { key: 'okuma-karne', icon: '📘', label: 'Karne Merkezi', description: 'Okuma karneleri ve raporlarını yönet', href: '/admin/okuma-karne.html' }
          ]
        },
        {
          id: 'document-menu-admin',
          icon: '🗂️',
          label: 'Döküman ve Menü Paneli',
          description: 'Oyun, doküman, menü ve çalışma kağıdı',
          href: '/admin/dokuman-yonetimi.html',
          children: [
            { key: 'oyunlar-admin', icon: '🎮', label: 'Oyunlar Yönetimi', description: 'Oyun kartları ve bağlantılarını düzenle', href: '/admin/oyunlar-admin.html' },
            { key: 'homepage-vitrin', icon: '✨', label: 'Ana Sayfa Vitrini', description: 'Hero slaytlarını, görselleri ve videoları yönet', href: '/admin/dokuman-yonetimi.html#vitrin' },
            { key: 'dokuman-yonetimi', icon: '📄', label: 'Doküman Yönetimi', description: 'PDF içerikler ve yayın akışını yönet', href: '/admin/dokuman-yonetimi.html' },
            { key: 'menu-yonetimi', icon: '🗂️', label: 'Menü & Ders Yönetimi', description: 'Site navigasyonuna ders sayfaları ekle', href: '/admin/menu-yonetimi.html' },
            { key: 'calisma-kagidi-editor', icon: '🧩', label: 'Çalışma Kağıdı', description: 'Etkileşimli çalışma kağıdı tasarımını aç', href: '/admin/calisma-kagidi-editor.html' }
          ]
        }
      ]
    },
    {
      label: 'Ölçme Değerlendirme',
      groups: [
        {
          id: 'exam-admin',
          icon: '🧪',
          label: 'Sınav Admin',
          description: 'Sınav, kategori ve sonuç yönetimi',
          href: '/sinav_sitesi/admin.html',
          children: [
            { key: 'exam-create', icon: '✏️', label: 'Sınav Oluştur', description: 'Yeni sınav hazırlama ve yayınlama alanı', href: '/sinav_sitesi/admin.html#create' },
            { key: 'exam-categories', icon: '🏷️', label: 'Kategoriler', description: 'Sınav kategori düzenini yönet', href: '/sinav_sitesi/admin.html#categories' },
            { key: 'exam-exams', icon: '🧪', label: 'Sınavlar', description: 'Yayındaki sınavları düzenle ve kontrol et', href: '/sinav_sitesi/admin.html#exams' },
            { key: 'exam-results', icon: '📈', label: 'Sonuçlar', description: 'Sınav sonuçları ve raporlarını incele', href: '/sinav_sitesi/admin.html#results' },
            { key: 'exam-student', icon: '🎓', label: 'Öğrenci Sayfası', description: 'Öğrenci sınav ekranını aç', href: '/sinav_sitesi/index.html' }
          ]
        }
      ]
    }
  ];

  const NAV_PERMISSION_MAP = {
    'main-overview': ['site_admin_dashboard'],
    'main-analytics': ['site_admin_dashboard'],
    'main-reactions': ['site_admin_dashboard'],
    'main-duyurular': ['site_admin_dashboard'],
    'main-badges': ['site_admin_dashboard'],
    'main-hizli': ['site_admin_dashboard'],
    'main-onecikarlar': ['site_admin_dashboard'],
    'main-yeni': ['site_admin_dashboard'],
    'main-hakkimda': ['site_admin_dashboard'],
    'main-menuler': ['site_admin_dashboard'],
    'main-adminler': ['site_admin_dashboard'],
    'main-kullanicilar': ['user_management'],
    'main-saglik': ['system_health'],
    'main-sifre': ['site_admin_dashboard'],
    'main-yedek': ['site_admin_dashboard'],
    'oyunlar-admin': ['oyun_ekleme'],
    'homepage-vitrin': ['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme', 'site_admin_dashboard'],
    'okuma-editor': ['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'],
    'e-kitap-admin': ['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'],
    'e-kitap-sonuclari': ['okuma_sonuclari', 'okuma_sonuclari_duzenleme', 'okuma_karne'],
    'okuma-sonuclari': ['okuma_sonuclari', 'okuma_sonuclari_duzenleme'],
    'okuma-karne': ['okuma_karne'],
    'dokuman-yonetimi': ['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'],
    'menu-yonetimi': ['menu_yonetimi'],
    'calisma-kagidi-editor': ['calisma_kagidi'],
    'exam-create': ['exam_create'],
    'exam-categories': ['exam_categories', 'exam_category_create', 'exam_category_edit', 'exam_category_delete'],
    'exam-exams': ['exam_list', 'exam_edit', 'exam_delete'],
    'exam-results': ['exam_results', 'exam_results_edit', 'exam_results_delete', 'exam_single_report', 'exam_report_center', 'exam_appeals'],
    'exam-student': ['exam_create', 'exam_categories', 'exam_list', 'exam_results', 'exam_appeals', 'exam_single_report', 'exam_report_center'],
    'exam-admin': ['exam_create', 'exam_categories', 'exam_list', 'exam_results', 'exam_appeals', 'exam_single_report', 'exam_report_center'],
  };

  const QUICK_CARD_TONES = ['tone-pink', 'tone-blue', 'tone-orange', 'tone-purple', 'tone-teal', 'tone-yellow'];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function stripLeadingUtilityIcon(label) {
    return String(label || '')
      .replace(/^(?:🏠|🌐|↩️|←)\s*/u, '')
      .trim();
  }

  function getVisibleChildren(group, permissionProfile) {
    return Array.isArray(group && group.children)
      ? group.children.filter(function(child) { return profileCanSeeKey(child.key, permissionProfile); })
      : [];
  }

  function findNavGroup(groupId) {
    let found = null;
    NAV_SECTIONS.some(function(section) {
      return section.groups.some(function(group) {
        if (group.id === groupId) {
          found = group;
          return true;
        }
        return false;
      });
    });
    return found;
  }

  async function getQuickPermissionProfile() {
    if (!window.kemalAdminAuth || typeof window.kemalAdminAuth.getAdminAccessProfile !== 'function') {
      return null;
    }
    try {
      return await window.kemalAdminAuth.getAdminAccessProfile(false);
    } catch (error) {
      return null;
    }
  }

  function closeQuickPanel(main) {
    if (!main) {
      return;
    }
    const quickPanel = main.querySelector('[data-admin-shell-quick-panel]');
    if (quickPanel) {
      quickPanel.remove();
    }
    Array.prototype.slice.call(main.children).forEach(function(child) {
      if (Object.prototype.hasOwnProperty.call(child.dataset, 'adminShellQuickHidden')) {
        child.hidden = child.dataset.adminShellQuickHidden === 'true';
        delete child.dataset.adminShellQuickHidden;
      }
    });
  }

  function buildQuickPanelHtml(group, children) {
    const cards = children.map(function(child, index) {
      const tone = QUICK_CARD_TONES[index % QUICK_CARD_TONES.length];
      return '' +
        '<a class="admin-shell-quick-card ' + tone + '" href="' + escapeHtml(child.href) + '">' +
          '<span class="admin-shell-quick-card-icon">' + escapeHtml(child.icon || group.icon || '✨') + '</span>' +
          '<strong>' + escapeHtml(child.label) + '</strong>' +
          '<small>' + escapeHtml(child.description || group.description || 'Bu yönetim bölümünü aç') + '</small>' +
        '</a>';
    }).join('');

    return '' +
      '<section class="admin-shell-quick-panel" data-admin-shell-quick-panel>' +
        '<div class="admin-shell-quick-hero">' +
          '<div>' +
            '<span class="admin-shell-quick-kicker">Hızlı erişim</span>' +
            '<h1>' + escapeHtml(group.label) + '</h1>' +
            '<p>' + escapeHtml(group.description || 'Bu panelin alt yönetim alanlarına hızlıca geçebilirsin.') + '</p>' +
          '</div>' +
          '<button class="admin-shell-quick-close" type="button" data-admin-shell-quick-close>Paneli Göster</button>' +
        '</div>' +
        '<div class="admin-shell-quick-grid">' + cards + '</div>' +
      '</section>';
  }

  async function showGroupQuickPanel(root, groupId) {
    const group = findNavGroup(groupId);
    const layout = root && root.closest ? root.closest('.admin-shell-layout') : document.querySelector('.admin-shell-layout');
    const main = layout ? layout.querySelector('.admin-shell-main') : null;
    if (!group || !main) {
      return;
    }
    const permissionProfile = await getQuickPermissionProfile();
    const children = getVisibleChildren(group, permissionProfile);
    if (!children.length) {
      window.location.href = group.href;
      return;
    }

    closeQuickPanel(main);
    Array.prototype.slice.call(main.children).forEach(function(child) {
      child.dataset.adminShellQuickHidden = String(child.hidden);
      child.hidden = true;
    });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildQuickPanelHtml(group, children);
    const panel = wrapper.firstElementChild;
    main.insertBefore(panel, main.firstChild);

    const closeButton = panel.querySelector('[data-admin-shell-quick-close]');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        closeQuickPanel(main);
      });
    }

    panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function isGroupActive(group, activeKey) {
    if (!activeKey) {
      return false;
    }
    if (group.key === activeKey) {
      return true;
    }
    return Array.isArray(group.children) && group.children.some(function(child) {
      return child.key === activeKey;
    });
  }

  function profileCanSeeKey(key, profile) {
    if (!key || !profile || profile.isOwner || profile.legacyMode) {
      return true;
    }
    const needed = NAV_PERMISSION_MAP[key] || [key];
    if (window.kemalAdminAuth && typeof window.kemalAdminAuth.hasAnyPermission === 'function') {
      return window.kemalAdminAuth.hasAnyPermission(needed, profile);
    }
    return needed.some(function(item) {
      return profile.active !== false && profile.permissions && profile.permissions[item];
    });
  }

  function renderGroup(group, activeKey, permissionProfile) {
    const originalHasChildren = Array.isArray(group.children) && group.children.length > 0;
    const visibleChildren = getVisibleChildren(group, permissionProfile);
    const canSeeGroupLink = profileCanSeeKey(group.key, permissionProfile);
    if ((!canSeeGroupLink && !visibleChildren.length) || (originalHasChildren && !visibleChildren.length)) {
      return '';
    }

    const active = isGroupActive(group, activeKey);
    const hasChildren = visibleChildren.length > 0;
    const groupHref = group.href || (visibleChildren[0] && visibleChildren[0].href) || '#';
    const quickGroupAttr = originalHasChildren && visibleChildren.length ? ' data-admin-quick-group="' + group.id + '"' : '';
    const linkClass = 'admin-nav-group-link' + (active ? ' is-active' : '');
    let html = '<div class="admin-nav-group' + (active ? ' is-open' : '') + '" data-admin-group="' + group.id + '">';
    html += '<div class="admin-nav-group-head">';
    html += '<a class="' + linkClass + '" href="' + groupHref + '"' + quickGroupAttr + (group.key ? ' data-admin-permission-key="' + group.key + '"' : '') + '>';
    html += '<span class="icon">' + group.icon + '</span>';
    html += '<span class="copy"><strong>' + group.label + '</strong><span>' + (group.description || '') + '</span></span>';
    html += '</a>';
    if (hasChildren) {
      html += '<button class="admin-nav-group-toggle" type="button" aria-label="' + group.label + ' alt menülerini açıp kapat">';
      html += '<span class="caret">⌄</span>';
      html += '</button>';
    }
    html += '</div>';
    if (hasChildren) {
      html += '<div class="admin-nav-submenu">';
      html += visibleChildren.map(function(child) {
        const childClass = 'admin-nav-submenu-link' + (child.key === activeKey ? ' is-active is-current' : '');
        return '<a class="' + childClass + '" href="' + child.href + '" data-admin-permission-key="' + child.key + '">' + child.label + '</a>';
      }).join('');
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderSidebar(options) {
    const activeKey = options && options.activeKey ? options.activeKey : '';
    const permissionProfile = options && options.permissionProfile ? options.permissionProfile : null;
    const utilityHref = options && options.homeHref ? options.homeHref : '/index.html';
    const utilityLabel = stripLeadingUtilityIcon(options && options.homeLabel ? options.homeLabel : 'Siteyi Aç') || 'Siteyi Aç';
    return '' +
      '<aside class="admin-nav-sidebar">' +
        '<div class="admin-nav-brand">' +
          '<span class="admin-nav-brand-badge">🌟</span>' +
          '<div class="admin-nav-brand-copy">' +
            '<strong>Kemal Öğretmenim</strong>' +
            '<span>Yönetim merkezi</span>' +
          '</div>' +
        '</div>' +
        NAV_SECTIONS.map(function(section) {
          const groupsHtml = section.groups.map(function(group) {
            return renderGroup(group, activeKey, permissionProfile);
          }).join('');
          if (!groupsHtml) {
            return '';
          }
          return '' +
            '<div class="admin-nav-section">' +
              '<div class="admin-nav-section-label">' + section.label + '</div>' +
              groupsHtml +
            '</div>';
        }).join('') +
        '<div class="admin-nav-footer">' +
          '<a href="' + utilityHref + '"' + ((options && options.homeTarget) ? ' target="' + options.homeTarget + '"' : '') + '>' +
            '<span>🏠</span><span>' + utilityLabel + '</span>' +
          '</a>' +
          '<button type="button" class="logout" data-admin-logout>' +
            '<span>🚪</span><span>Çıkış Yap</span>' +
          '</button>' +
        '</div>' +
      '</aside>';
  }

  function bindSidebar(root, onLogout) {
    if (!root) {
      return;
    }
    root.querySelectorAll('.admin-nav-group-toggle').forEach(function(toggle) {
      toggle.addEventListener('click', function() {
        const group = toggle.closest('.admin-nav-group');
        if (group) {
          group.classList.toggle('is-open');
        }
      });
    });
    root.querySelectorAll('[data-admin-quick-group]').forEach(function(link) {
      link.addEventListener('click', function(event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        showGroupQuickPanel(root, link.getAttribute('data-admin-quick-group'));
      });
    });
    const logoutBtn = root.querySelector('[data-admin-logout]');
    if (logoutBtn && typeof onLogout === 'function') {
      logoutBtn.addEventListener('click', onLogout);
    }
    applyPermissionVisibility(root);
  }

  async function applyPermissionVisibility(root) {
    if (!root || !window.kemalAdminAuth || typeof window.kemalAdminAuth.getAdminAccessProfile !== 'function') {
      return;
    }
    try {
      const profile = await window.kemalAdminAuth.getAdminAccessProfile(false);
      if (!profile || profile.isOwner || profile.legacyMode) {
        return;
      }
      root.querySelectorAll('[data-admin-permission-key]').forEach(function(node) {
        const key = node.getAttribute('data-admin-permission-key');
        const needed = NAV_PERMISSION_MAP[key] || [key];
        const visible = typeof window.kemalAdminAuth.hasAnyPermission === 'function'
          ? window.kemalAdminAuth.hasAnyPermission(needed, profile)
          : needed.some(function(item) { return profile.permissions && profile.permissions[item]; });
        node.style.display = visible ? '' : 'none';
      });
      root.querySelectorAll('.admin-nav-group').forEach(function(group) {
        const link = group.querySelector('.admin-nav-group-link[data-admin-permission-key]');
        const submenuLinks = group.querySelectorAll('.admin-nav-submenu [data-admin-permission-key]');
        const visibleChildren = Array.prototype.slice.call(group.querySelectorAll('.admin-nav-submenu [data-admin-permission-key]')).some(function(node) {
          return node.style.display !== 'none';
        });
        if ((link && link.style.display === 'none' && !visibleChildren) || (!link && submenuLinks.length && !visibleChildren)) {
          group.style.display = 'none';
        }
      });
    } catch (error) {
      /* Yetki profili okunamazsa menüyü olduğu gibi bırak; sayfa erişimi ayrıca korunur. */
    }
  }

  function enhanceTopbar(topbar, options) {
    if (!topbar || topbar.dataset.adminShellReady === 'true') {
      return;
    }
    topbar.dataset.adminShellReady = 'true';
    topbar.classList.add('admin-shell-topbar');
    const actions = document.createElement('div');
    actions.className = 'admin-shell-actions';

    if (options && options.utilityHref) {
      const utilityLink = document.createElement('a');
      utilityLink.className = 'admin-shell-utility-link';
      utilityLink.href = options.utilityHref;
      utilityLink.textContent = options.utilityLabel || '🌐 Siteyi Aç';
      if (options.utilityTarget) {
        utilityLink.target = options.utilityTarget;
      }
      if (options.utilityRel) {
        utilityLink.rel = options.utilityRel;
      }
      actions.appendChild(utilityLink);
    }

    const logoutBtn = topbar.querySelector('.logout-btn');
    if (logoutBtn) {
      actions.appendChild(logoutBtn);
    }

    const links = topbar.querySelector('.topbar-links');
    if (links) {
      links.setAttribute('hidden', 'hidden');
    }

    topbar.appendChild(actions);
  }

  function initStandalone(options) {
    const app = document.getElementById(options && options.appId ? options.appId : 'app');
    if (!app || app.dataset.adminShellMounted === 'true') {
      return;
    }

    const children = Array.prototype.slice.call(app.childNodes);
    const layout = document.createElement('div');
    layout.className = 'admin-shell-layout';
    layout.innerHTML = renderSidebar({
      activeKey: options && options.activeKey,
      homeHref: options && options.homeHref,
      homeLabel: options && options.homeLabel,
      homeTarget: options && options.homeTarget,
      permissionProfile: options && options.permissionProfile
    });

    const main = document.createElement('div');
    main.className = 'admin-shell-main';
    children.forEach(function(node) {
      main.appendChild(node);
    });
    layout.appendChild(main);

    app.innerHTML = '';
    app.appendChild(layout);
    app.dataset.adminShellMounted = 'true';
    app.classList.add('admin-shell-app');
    document.body.classList.add('admin-shell-body');

    enhanceTopbar(main.querySelector('.topbar'), {
      utilityHref: options && options.utilityHref,
      utilityLabel: options && options.utilityLabel,
      utilityTarget: options && options.utilityTarget,
      utilityRel: options && options.utilityRel
    });

    bindSidebar(layout.querySelector('.admin-nav-sidebar'), function() {
      if (typeof options.onLogout === 'function') {
        options.onLogout();
      } else {
        const pageLogout = document.querySelector('.admin-shell-main .logout-btn');
        if (pageLogout) {
          pageLogout.click();
        }
      }
    });
  }

  window.KemalAdminShell = {
    bindSidebar: bindSidebar,
    initStandalone: initStandalone,
    renderSidebar: renderSidebar,
    showGroupQuickPanel: showGroupQuickPanel
  };
})();
