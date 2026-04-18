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

  function renderGroup(group, activeKey) {
    const active = isGroupActive(group, activeKey);
    const hasChildren = Array.isArray(group.children) && group.children.length > 0;
    const linkClass = 'admin-nav-group-link' + (active ? ' is-active' : '');
    let html = '<div class="admin-nav-group' + (active ? ' is-open' : '') + '" data-admin-group="' + group.id + '">';
    html += '<div class="admin-nav-group-head">';
    html += '<a class="' + linkClass + '" href="' + group.href + '">';
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
      html += group.children.map(function(child) {
        const childClass = 'admin-nav-submenu-link' + (child.key === activeKey ? ' is-active is-current' : '');
        return '<a class="' + childClass + '" href="' + child.href + '">' + child.label + '</a>';
      }).join('');
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderSidebar(options) {
    const activeKey = options && options.activeKey ? options.activeKey : '';
    const utilityHref = options && options.homeHref ? options.homeHref : '/index.html';
    const utilityLabel = options && options.homeLabel ? options.homeLabel : '🌐 Siteyi Aç';
    return '' +
      '<aside class="admin-nav-sidebar">' +
        '<div class="admin-nav-brand">' +
          '<span class="admin-nav-brand-badge">🌟</span>' +
          '<div class="admin-nav-brand-copy">' +
            '<strong>Kemal Öğretmenim</strong>' +
            '<span>Ortak admin gezinme menüsü</span>' +
          '</div>' +
        '</div>' +
        NAV_SECTIONS.map(function(section) {
          return '' +
            '<div class="admin-nav-section">' +
              '<div class="admin-nav-section-label">' + section.label + '</div>' +
              section.groups.map(function(group) {
                return renderGroup(group, activeKey);
              }).join('') +
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
      homeTarget: options && options.homeTarget
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
