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
            { key: 'main-overview', label: 'Genel Bakış', href: '/admin/index.html#overview' },
            { key: 'main-analytics', label: 'Site Analizleri', href: '/admin/index.html#analytics' },
            { key: 'main-duyurular', label: 'Duyurular', href: '/admin/index.html#duyurular' },
            { key: 'main-badges', label: 'YENİ Rozetleri', href: '/admin/index.html#badges' },
            { key: 'main-hizli', label: 'Hızlı Erişim', href: '/admin/index.html#hizli' },
            { key: 'main-onecikarlar', label: 'Öne Çıkanlar', href: '/admin/index.html#onecikarlar' },
            { key: 'main-yeni', label: 'Yeni İçerikler', href: '/admin/index.html#yeni' },
            { key: 'main-hakkimda', label: 'Hakkımda', href: '/admin/index.html#hakkimda' },
            { key: 'main-menuler', label: 'Ekstra Menü', href: '/admin/index.html#menuler' },
            { key: 'main-adminler', label: 'Alt Adminler', href: '/admin/index.html#adminler' },
            { key: 'main-sifre', label: 'Şifre Değiştir', href: '/admin/index.html#sifre' },
            { key: 'main-yedek', label: 'Yedek / Sıfırla', href: '/admin/index.html#yedek' }
          ]
        }
      ]
    },
    {
      label: 'İçerik Yönetimi',
      groups: [
        {
          id: 'games-admin',
          icon: '🎮',
          label: 'Oyunlar Yönetimi',
          description: 'Oyun kartları ve bağlantıları',
          href: '/admin/oyunlar-admin.html',
          key: 'oyunlar-admin'
        },
        {
          id: 'reading-admin',
          icon: '📚',
          label: 'Okuma Admin',
          description: 'Metinler, sonuçlar ve karne',
          href: '/admin/okuma-editor.html',
          children: [
            { key: 'okuma-editor', label: 'Okuma Metinleri', href: '/admin/okuma-editor.html' },
            { key: 'okuma-sonuclari', label: 'Okuma Sonuçları', href: '/admin/okuma-sonuclari.html' },
            { key: 'okuma-karne', label: 'Karne Merkezi', href: '/admin/okuma-karne.html' }
          ]
        },
        {
          id: 'documents-admin',
          icon: '📄',
          label: 'Doküman Yönetimi',
          description: 'PDF içerikler ve yayın akışı',
          href: '/admin/dokuman-yonetimi.html',
          key: 'dokuman-yonetimi'
        },
        {
          id: 'menu-admin',
          icon: '🗂️',
          label: 'Menü & Ders Yönetimi',
          description: 'Site navigasyonuna ders sayfaları ekle',
          href: '/admin/menu-yonetimi.html',
          key: 'menu-yonetimi'
        },
        {
          id: 'worksheet-admin',
          icon: '🧩',
          label: 'Çalışma Kağıdı',
          description: 'Etkileşimli çalışma kağıdı tasarımı',
          href: '/admin/calisma-kagidi-editor.html',
          key: 'calisma-kagidi-editor'
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
            { key: 'exam-create', label: 'Sınav Oluştur', href: '/sinav_sitesi/admin.html#create' },
            { key: 'exam-categories', label: 'Kategoriler', href: '/sinav_sitesi/admin.html#categories' },
            { key: 'exam-exams', label: 'Sınavlar', href: '/sinav_sitesi/admin.html#exams' },
            { key: 'exam-results', label: 'Sonuçlar', href: '/sinav_sitesi/admin.html#results' },
            { key: 'exam-student', label: 'Öğrenci Sayfası', href: '/sinav_sitesi/index.html' }
          ]
        }
      ]
    }
  ];

  const NAV_PERMISSION_MAP = {
    'main-overview': ['site_admin_dashboard'],
    'main-analytics': ['site_admin_dashboard'],
    'main-duyurular': ['site_admin_dashboard'],
    'main-badges': ['site_admin_dashboard'],
    'main-hizli': ['site_admin_dashboard'],
    'main-onecikarlar': ['site_admin_dashboard'],
    'main-yeni': ['site_admin_dashboard'],
    'main-hakkimda': ['site_admin_dashboard'],
    'main-menuler': ['site_admin_dashboard'],
    'main-adminler': ['site_admin_dashboard'],
    'main-sifre': ['site_admin_dashboard'],
    'main-yedek': ['site_admin_dashboard'],
    'oyunlar-admin': ['oyun_ekleme'],
    'okuma-editor': ['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'],
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
    const visibleChildren = Array.isArray(group.children)
      ? group.children.filter(function(child) { return profileCanSeeKey(child.key, permissionProfile); })
      : [];
    const canSeeGroupLink = profileCanSeeKey(group.key, permissionProfile);
    if ((!canSeeGroupLink && !visibleChildren.length) || (originalHasChildren && !visibleChildren.length)) {
      return '';
    }

    const active = isGroupActive(group, activeKey);
    const hasChildren = visibleChildren.length > 0;
    const groupHref = originalHasChildren && visibleChildren.length ? visibleChildren[0].href : group.href;
    const linkClass = 'admin-nav-group-link' + (active ? ' is-active' : '');
    let html = '<div class="admin-nav-group' + (active ? ' is-open' : '') + '" data-admin-group="' + group.id + '">';
    html += '<div class="admin-nav-group-head">';
    html += '<a class="' + linkClass + '" href="' + groupHref + '"' + (group.key ? ' data-admin-permission-key="' + group.key + '"' : '') + '>';
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
    const utilityLabel = options && options.homeLabel ? options.homeLabel : '🌐 Siteyi Aç';
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
    renderSidebar: renderSidebar
  };
})();
