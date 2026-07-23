(function() {
  'use strict';

  const state = {
    loading: false,
    loaded: false,
    error: '',
    rows: [],
  };

  let deps = {
    canAccess: function() { return false; },
    toast: function() {},
    getClient: function() {
      if (!window.kemalAdminAuth || typeof window.kemalAdminAuth.getClient !== 'function') {
        throw new Error('Admin Supabase istemcisi bulunamadi.');
      }
      return window.kemalAdminAuth.getClient();
    },
    humanizeError: function(error) {
      return error && error.message ? error.message : String(error || '');
    },
    formatNumber: function(value) {
      return new Intl.NumberFormat('tr-TR').format(Number(value || 0));
    },
    escHtml: function(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    emptyStateHtml: function(message) {
      return '<div class="analytics-empty">' + String(message || '') + '</div>';
    },
  };

  function configure(nextDeps) {
    deps = Object.assign({}, deps, nextDeps || {});
  }

  function getLocalQueueCount(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (error) {
      return 0;
    }
  }

  function renderLocalQueueHealth() {
    const el = document.getElementById('localQueueHealth');
    if (!el) {
      return;
    }
    const items = [
      {
        label: 'Okuma Sonucu',
        count: getLocalQueueCount('kemal_okuma_pending_results_v1'),
        detail: 'Bu tarayıcıdan gönderilemeyip bekleyen hızlı okuma sonucu',
      },
      {
        label: 'Sınav Sonucu',
        count: getLocalQueueCount('kemal_exam_pending_results_v1'),
        detail: 'Bu tarayıcıdan gönderilemeyip bekleyen sınav sonucu',
      },
    ];
    el.innerHTML = items.map(function(item) {
      return (
        '<div class="health-local-card">' +
          '<strong>' + deps.formatNumber(item.count) + '</strong>' +
          '<span>' + deps.escHtml(item.label) + '<br>' + deps.escHtml(item.detail) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function healthPillClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'OK') {
      return 'ok';
    }
    if (value === 'UYARI' || value === 'WARNING') {
      return 'warn';
    }
    return 'missing';
  }

  function normalizeHealthRow(row) {
    return {
      area: row.alan || row.area || 'Sistem',
      check: row.kontrol || row.check || 'Kontrol',
      status: row.durum || row.status || 'EKSIK',
      detail: row.detay || row.detail || '',
      order: Number(row.sira || row.order || 999),
    };
  }

  function humanizeSystemHealthError(error) {
    const message = String(error && error.message ? error.message : '');
    if (
      message.includes('get_system_health_report') ||
      message.includes('Could not find the function') ||
      message.includes('schema cache')
    ) {
      return '`supabase-kayit-sagligi-kontrol.sql` dosyası Supabase SQL Editor içinde henüz çalıştırılmamış görünüyor.';
    }
    return deps.humanizeError(error);
  }

  function renderPanel() {
    const statusEl = document.getElementById('systemHealthStatus');
    const summaryEl = document.getElementById('systemHealthSummary');
    const listEl = document.getElementById('systemHealthList');
    if (!statusEl || !summaryEl || !listEl) {
      return;
    }

    renderLocalQueueHealth();

    if (state.loading && !state.loaded) {
      statusEl.style.display = 'block';
      statusEl.textContent = 'Sistem sağlığı kontrol ediliyor...';
      summaryEl.innerHTML = '';
      listEl.innerHTML = '';
      return;
    }

    if (state.error) {
      statusEl.style.display = 'block';
      statusEl.textContent = state.error;
      summaryEl.innerHTML = '';
      listEl.innerHTML = deps.emptyStateHtml('Rapor yüklenemedi. SQL dosyasını çalıştırdıktan sonra Kontrol Et butonunu tekrar kullan.');
      return;
    }

    const rows = (state.rows || []).map(normalizeHealthRow).sort(function(a, b) {
      return a.order - b.order || a.area.localeCompare(b.area, 'tr') || a.check.localeCompare(b.check, 'tr');
    });

    if (!rows.length) {
      statusEl.style.display = 'block';
      statusEl.textContent = state.loaded
        ? 'Henüz sağlık raporu satırı gelmedi.'
        : 'Raporu görmek için Kontrol Et butonuna bas.';
      summaryEl.innerHTML = '';
      listEl.innerHTML = deps.emptyStateHtml('Sistem sağlığı raporu henüz yüklenmedi.');
      return;
    }

    statusEl.style.display = 'none';
    const okCount = rows.filter(function(row) { return String(row.status).toUpperCase() === 'OK'; }).length;
    const warnCount = rows.filter(function(row) { return String(row.status).toUpperCase() === 'UYARI'; }).length;
    const missingCount = rows.length - okCount - warnCount;
    summaryEl.innerHTML = [
      { label: 'Sağlam Kontrol', value: okCount },
      { label: 'Uyarı', value: warnCount },
      { label: 'Eksik / Kritik', value: missingCount },
      { label: 'Toplam Kontrol', value: rows.length },
    ].map(function(item) {
      return (
        '<div class="health-summary-card">' +
          '<strong>' + deps.formatNumber(item.value) + '</strong>' +
          '<span>' + deps.escHtml(item.label) + '</span>' +
        '</div>'
      );
    }).join('');

    listEl.innerHTML = rows.map(function(row) {
      const status = String(row.status || 'EKSIK').toUpperCase();
      return (
        '<div class="health-row">' +
          '<div class="health-area">' + deps.escHtml(row.area) + '</div>' +
          '<div class="health-main">' +
            '<strong>' + deps.escHtml(row.check) + '</strong>' +
            '<small>' + deps.escHtml(row.detail) + '</small>' +
          '</div>' +
          '<span class="health-pill ' + healthPillClass(status) + '">' + deps.escHtml(status) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  async function load(force) {
    if (!deps.canAccess('system_health')) {
      deps.toast('Sistem sağlığı için yetkin açık değil.', 'error');
      return;
    }
    if (state.loading) {
      return;
    }
    if (state.loaded && !force) {
      renderPanel();
      return;
    }

    state.loading = true;
    state.error = '';
    renderPanel();
    try {
      const result = await deps.getClient().rpc('get_system_health_report');
      if (result.error) {
        throw result.error;
      }
      state.rows = Array.isArray(result.data) ? result.data : [];
      state.loaded = true;
      state.error = '';
    } catch (error) {
      state.error = humanizeSystemHealthError(error);
      state.rows = [];
    } finally {
      state.loading = false;
      renderPanel();
    }
  }

  window.KemalAdminSystemHealth = {
    configure: configure,
    renderPanel: renderPanel,
    load: load,
  };
})();
