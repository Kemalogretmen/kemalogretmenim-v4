(function() {
  'use strict';

  const ADMIN_PERMISSION_DEFS = [
    {
      key: 'site_admin_dashboard',
      label: 'Site Yönetim Paneli',
      description: 'Ana site içerikleri, analizler ve genel ayarlar',
      group: 'Genel Yönetim',
    },
    {
      key: 'menu_yonetimi',
      label: 'Menü & Ders Yönetimi',
      description: 'Üst menüye ders sayfaları ekleme',
      group: 'Genel Yönetim',
    },
    {
      key: 'calisma_kagidi',
      label: 'Çalışma Kağıtları',
      description: 'Çalışma kağıdı editörü ve alan yerleşimi',
      group: 'İçerik Yönetimi',
    },
    {
      key: 'oyun_ekleme',
      label: 'Oyun Yönetimi / Oyun Ekleme',
      description: 'Oyun kartlarını ekleme ve düzenleme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_metinleri',
      label: 'Okuma Metinleri',
      description: 'Okuma metni listesini görüntüleme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_metni_ekleme',
      label: 'Okuma Metni Ekleme',
      description: 'Yeni okuma metni ve soru ekleme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_metni_duzenleme',
      label: 'Okuma Metinlerini Düzenleme',
      description: 'Mevcut okuma metinlerini güncelleme veya silme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_sonuclari',
      label: 'Okuma Sonuçları',
      description: 'Okuma performans ve sonuç ekranını görüntüleme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_sonuclari_duzenleme',
      label: 'Okuma Sonuçlarını Düzenleme',
      description: 'Okuma sonuçlarını silme veya toplu temizleme',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'okuma_karne',
      label: 'Okuma Karne Merkezi',
      description: 'Karne ve rapor ekranları',
      group: 'Okuma Admin Paneli',
    },
    {
      key: 'dokuman_ekleme',
      label: 'Doküman Ekleme',
      description: 'Yeni PDF dokümanı yükleme',
      group: 'Doküman Yönetimi',
    },
    {
      key: 'dokuman_duzenleme',
      label: 'Doküman Düzenleme',
      description: 'Mevcut doküman bilgilerini güncelleme',
      group: 'Doküman Yönetimi',
    },
    {
      key: 'dokuman_silme',
      label: 'Doküman Silme',
      description: 'Doküman kaydı ve dosyasını silme',
      group: 'Doküman Yönetimi',
    },
    {
      key: 'exam_create',
      label: 'Sınav Oluşturma',
      description: 'Yeni sınav oluşturma ve yayınlama',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_categories',
      label: 'Kategoriler',
      description: 'Kategori ekranını görüntüleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_category_create',
      label: 'Kategori Ekleme',
      description: 'Sınav kategorisi ekleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_category_edit',
      label: 'Kategori Düzenleme',
      description: 'Sınav kategorilerini güncelleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_category_delete',
      label: 'Kategori Silme',
      description: 'Sınav kategorisi silme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_list',
      label: 'Sınavlar',
      description: 'Sınav listesini görüntüleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_edit',
      label: 'Sınavları Düzenleme',
      description: 'Sınav içeriği, durum ve sıralama güncelleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_delete',
      label: 'Sınavları Silme',
      description: 'Sınav ve sorularını silme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_results',
      label: 'Sonuçlar',
      description: 'Sınav sonuçlarını görüntüleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_results_edit',
      label: 'Sonuçları Düzenleme',
      description: 'Öğrenci sonuç kayıtlarını güncelleme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_results_delete',
      label: 'Sonuçları Silme',
      description: 'Sınav sonucu silme',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_single_report',
      label: 'Tek Sınav Karnesi',
      description: 'Tek sınav karne görünümünü açma',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_report_center',
      label: 'Sınav Karne Merkezi',
      description: 'Öğrenci sınav karne merkezini açma',
      group: 'Sınav Admin',
    },
    {
      key: 'exam_appeals',
      label: 'İtirazlar',
      description: 'Sınav itirazlarını inceleme ve yönetme',
      group: 'Sınav Admin',
    },
  ];

  const PAGE_PERMISSION_MAP = [
    { suffix: '/admin/okuma-editor.html', anyOf: ['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'] },
    { suffix: '/admin/dokuman-yonetimi.html', anyOf: ['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'] },
    { suffix: '/admin/menu-yonetimi.html', key: 'menu_yonetimi' },
    { suffix: '/admin/calisma-kagidi-editor.html', key: 'calisma_kagidi' },
    { suffix: '/admin/okuma-sonuclari.html', anyOf: ['okuma_sonuclari', 'okuma_sonuclari_duzenleme'] },
    { suffix: '/admin/okuma-karne.html', key: 'okuma_karne' },
    { suffix: '/admin/oyunlar-admin.html', key: 'oyun_ekleme' },
    { suffix: '/sinav_sitesi/admin.html', anyOf: ['exam_create', 'exam_categories', 'exam_list', 'exam_results', 'exam_appeals', 'exam_single_report', 'exam_report_center'] },
  ];

  const PERMISSION_ALIASES = {
    oyunlar_admin: ['oyun_ekleme'],
    okuma_editor: ['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'],
    dokuman_yonetimi: ['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'],
    exam_admin: ['exam_create', 'exam_categories', 'exam_category_create', 'exam_category_edit', 'exam_category_delete', 'exam_list', 'exam_edit', 'exam_delete', 'exam_results', 'exam_results_edit', 'exam_results_delete', 'exam_single_report', 'exam_report_center', 'exam_appeals'],
  };

  const ADMIN_USERS_TABLE = 'admin_users';

  function getConfig() {
    if (!window.kemalSiteStore) {
      throw new Error('kemalSiteStore bulunamadi.');
    }
    return window.kemalSiteStore.getConfig();
  }

  function getAuthScope() {
    if (typeof window.kemalAdminScope === 'string' && window.kemalAdminScope.trim()) {
      return window.kemalAdminScope.trim();
    }
    const path = String(window.location && window.location.pathname ? window.location.pathname : '');
    if (
      path.endsWith('/admin/okuma-editor.html') ||
      path.endsWith('/admin/okuma-sonuclari.html') ||
      path.endsWith('/admin/okuma-karne.html')
    ) {
      return 'reading';
    }
    if (path.endsWith('/admin/dokuman-yonetimi.html')) {
      return 'documents';
    }
    return 'default';
  }

  function getScopedConfig() {
    return getConfigForScope(getAuthScope());
  }

  function getConfigForScope(scope) {
    const store = window.kemalSiteStore;
    if (!store) {
      throw new Error('kemalSiteStore bulunamadi.');
    }
    if (scope === 'reading' && typeof store.getReadingConfig === 'function') {
      return store.getReadingConfig();
    }
    if (scope === 'documents' && typeof store.getDocumentsConfig === 'function') {
      return store.getDocumentsConfig();
    }
    return store.getConfig();
  }

  function getProjectRef(url) {
    const match = String(url || '').match(/^https:\/\/([^.]+)\.supabase\.co/i);
    return match ? match[1] : 'bilinmeyen-proje';
  }

  function ensureSupabase() {
    if (!window.supabase) {
      throw new Error('Supabase kutuphanesi yuklenemedi.');
    }
    return window.supabase;
  }

  function getCurrentPath() {
    return String(window.location && window.location.pathname ? window.location.pathname : '');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function createPermissionMap(allEnabled) {
    return ADMIN_PERMISSION_DEFS.reduce(function(map, item) {
      map[item.key] = !!allEnabled;
      return map;
    }, {});
  }

  function expandPermissionKey(key) {
    const raw = String(key || '').trim();
    if (!raw) {
      return [];
    }
    const expanded = [raw].concat(PERMISSION_ALIASES[raw] || []);
    return expanded.filter(function(item, index) {
      return item && expanded.indexOf(item) === index;
    });
  }

  function normalizePermissions(value, isOwner) {
    if (isOwner) {
      return createPermissionMap(true);
    }

    const normalized = createPermissionMap(false);
    if (Array.isArray(value)) {
      value.forEach(function(key) {
        expandPermissionKey(key).forEach(function(expandedKey) {
          if (Object.prototype.hasOwnProperty.call(normalized, expandedKey)) {
            normalized[expandedKey] = true;
          }
        });
      });
      return normalized;
    }

    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function(key) {
        if (!value[key]) {
          return;
        }
        expandPermissionKey(key).forEach(function(expandedKey) {
          if (Object.prototype.hasOwnProperty.call(normalized, expandedKey)) {
            normalized[expandedKey] = true;
          }
        });
      });
    }
    return normalized;
  }

  function getCurrentPagePermission() {
    const match = getPagePermissionMatch();
    if (!match) {
      return null;
    }
    return match.key || (Array.isArray(match.anyOf) ? match.anyOf[0] : null);
  }

  function getPermissionDefinition(key) {
    return ADMIN_PERMISSION_DEFS.find(function(item) {
      return item.key === key;
    }) || null;
  }

  function profileHasPermission(profile, key) {
    if (!profile) {
      return false;
    }
    if (profile.isOwner || profile.legacyMode) {
      return true;
    }
    return !!(profile.active !== false && profile.permissions && profile.permissions[key]);
  }

  function profileHasAnyPermission(profile, keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return list.some(function(key) {
      return profileHasPermission(profile, key);
    });
  }

  function getPagePermissionMatch(path) {
    const currentPath = path || getCurrentPath();
    return PAGE_PERMISSION_MAP.find(function(item) {
      return currentPath.endsWith(item.suffix);
    }) || null;
  }

  function isSetupError(error) {
    const message = String((error && error.message) || '');
    return (
      message.includes('relation "public.admin_users" does not exist') ||
      message.includes('Could not find the table') ||
      message.includes('admin_users') && message.includes('column') ||
      message.includes('schema cache')
    );
  }

  let client = null;
  let clientScope = null;
  let accessCache = null;
  let accessCacheEmail = '';
  let accessPromise = null;

  function clearAccessCache() {
    accessCache = null;
    accessCacheEmail = '';
    accessPromise = null;
  }

  function getClient() {
    const scope = getAuthScope();
    if (client && clientScope === scope) {
      return client;
    }

    const supabase = ensureSupabase();
    const config = getScopedConfig();
    client = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    clientScope = scope;
    clearAccessCache();
    return client;
  }

  function normalizeAdminUserRow(row) {
    const email = normalizeEmail(row && row.email ? row.email : '');
    const isOwner = !!(row && (row.is_owner === true || row.role === 'owner'));
    return {
      email,
      displayName: row && row.display_name ? String(row.display_name) : (email ? email.split('@')[0] : ''),
      active: row ? row.active !== false : true,
      isOwner,
      permissions: normalizePermissions(row && row.permissions ? row.permissions : null, isOwner),
      createdAt: row && row.created_at ? row.created_at : '',
      updatedAt: row && row.updated_at ? row.updated_at : '',
      raw: row || {},
    };
  }

  function buildLegacyOwnerProfile(email) {
    const normalizedEmail = normalizeEmail(email);
    return {
      email: normalizedEmail,
      displayName: normalizedEmail ? normalizedEmail.split('@')[0] : 'Ana Yönetici',
      active: true,
      isOwner: true,
      legacyMode: true,
      permissions: createPermissionMap(true),
      allowedPanels: ADMIN_PERMISSION_DEFS.map(function(item) { return item.key; }),
      row: null,
      rows: [],
    };
  }

  function hasConfiguredPermissions(rows) {
    return rows.some(function(row) {
      return row.isOwner || Object.values(row.permissions || {}).some(Boolean);
    });
  }

  async function fetchAdminRows() {
    const { data, error } = await getClient()
      .from(ADMIN_USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  async function fetchPublicUserProfile(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return null;
    }
    try {
      const { data, error } = await getClient()
        .from('user_profiles')
        .select('role,approval_status,active,email,full_name')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (error) {
        return null;
      }
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async function getSessionRaw() {
    const { data, error } = await getClient().auth.getSession();
    if (error) {
      throw error;
    }
    return data.session;
  }

  async function getUser() {
    const { data, error } = await getClient().auth.getUser();
    if (error) {
      throw error;
    }
    return data.user;
  }

  async function resolveUserEmail(sessionLike) {
    const sessionEmail = normalizeEmail(sessionLike && sessionLike.user && sessionLike.user.email ? sessionLike.user.email : '');
    if (sessionEmail) {
      return sessionEmail;
    }
    const user = await getUser();
    return normalizeEmail(user && user.email ? user.email : '');
  }

  async function getAdminAccessProfile(force, sessionLike) {
    const email = await resolveUserEmail(sessionLike);
    if (!email) {
      return null;
    }

    if (!force && accessCache && accessCacheEmail === email) {
      return accessCache;
    }

    if (!force && accessPromise && accessCacheEmail === email) {
      return accessPromise;
    }

    accessCacheEmail = email;
    accessPromise = (async function() {
      try {
        const publicProfile = await fetchPublicUserProfile(email);
        const rows = await fetchAdminRows();
        const normalizedRows = rows
          .map(normalizeAdminUserRow)
          .filter(function(row) { return !!row.email; });

        if (!normalizedRows.length) {
          if (publicProfile && (publicProfile.role === 'teacher' || publicProfile.role === 'student')) {
            accessCache = {
              email,
              displayName: publicProfile.full_name || email.split('@')[0],
              active: false,
              isOwner: false,
              legacyMode: false,
              permissions: createPermissionMap(false),
              allowedPanels: [],
              row: null,
              rows: [],
              publicRole: publicProfile.role,
              approvalStatus: publicProfile.approval_status || '',
            };
            return accessCache;
          }
          accessCache = buildLegacyOwnerProfile(email);
          return accessCache;
        }

        if (!hasConfiguredPermissions(normalizedRows)) {
          const bootstrapRow = normalizedRows.find(function(row) {
            return row.email === email;
          });
          if (bootstrapRow) {
            accessCache = buildLegacyOwnerProfile(email);
            accessCache.rows = normalizedRows;
            return accessCache;
          }
        }

        const matchedRow = normalizedRows.find(function(row) {
          return row.email === email;
        });

        if (!matchedRow) {
          accessCache = {
            email,
            displayName: email.split('@')[0],
            active: false,
            isOwner: false,
            legacyMode: false,
            permissions: createPermissionMap(false),
            allowedPanels: [],
            row: null,
            rows: [],
          };
          return accessCache;
        }

        const profile = {
          email,
          displayName: matchedRow.displayName,
          active: matchedRow.active,
          isOwner: matchedRow.isOwner,
          legacyMode: false,
          permissions: matchedRow.permissions,
          allowedPanels: Object.keys(matchedRow.permissions).filter(function(key) {
            return !!matchedRow.permissions[key];
          }),
          row: matchedRow,
          rows: matchedRow.isOwner ? normalizedRows : [matchedRow],
        };
        accessCache = profile;
        return profile;
      } catch (error) {
        if (isSetupError(error)) {
          accessCache = buildLegacyOwnerProfile(email);
          return accessCache;
        }
        throw error;
      } finally {
        accessPromise = null;
      }
    })();

    return accessPromise;
  }

  async function ensureOwnerRecord(currentEmail) {
    const email = normalizeEmail(currentEmail);
    const rows = (await fetchAdminRows()).map(normalizeAdminUserRow);
    if (rows.some(function(row) { return row.isOwner; })) {
      return rows;
    }

    const existingCurrentRow = rows.find(function(row) {
      return row.email === email;
    });

    if (existingCurrentRow) {
      const { error: updateError } = await getClient()
        .from(ADMIN_USERS_TABLE)
        .update({
          display_name: existingCurrentRow.displayName || 'Ana Yönetici',
          active: true,
          is_owner: true,
          permissions: createPermissionMap(true),
        })
        .eq('email', email);
      if (updateError) {
        throw updateError;
      }
      clearAccessCache();
      return (await fetchAdminRows()).map(normalizeAdminUserRow);
    }

    const ownerPayload = {
      email,
      display_name: 'Ana Yönetici',
      active: true,
      is_owner: true,
      permissions: createPermissionMap(true),
    };

    const { error } = await getClient().from(ADMIN_USERS_TABLE).insert(ownerPayload);
    if (error) {
      throw error;
    }
    clearAccessCache();
    return (await fetchAdminRows()).map(normalizeAdminUserRow);
  }

  function buildAdminUserPayload(input) {
    const email = normalizeEmail(input && input.email ? input.email : '');
    if (!email) {
      throw new Error('Alt admin e-postası zorunlu.');
    }

    const isOwner = !!(input && input.isOwner);
    return {
      email,
      display_name: input && input.displayName ? String(input.displayName).trim() : '',
      active: input ? input.active !== false : true,
      is_owner: isOwner,
      permissions: normalizePermissions(input && input.permissions ? input.permissions : null, isOwner),
    };
  }

  async function listAdminUsers() {
    const profile = await getAdminAccessProfile(true);
    if (!profile) {
      throw new Error('Önce yönetici girişi yapmalısın.');
    }
    if (!profile.isOwner && !profile.legacyMode) {
      throw new Error('Alt adminleri yalnızca ana yönetici görebilir.');
    }

    try {
      let rows = (await fetchAdminRows()).map(normalizeAdminUserRow);
      if (profile.legacyMode && rows.length) {
        rows = rows.map(function(row) {
          if (row.email !== profile.email) {
            return row;
          }
          return Object.assign({}, row, {
            isOwner: true,
            permissions: createPermissionMap(true),
          });
        });
      }
      if (!rows.length) {
        return [normalizeAdminUserRow({
          email: profile.email,
          display_name: 'Ana Yönetici',
          active: true,
          is_owner: true,
          permissions: createPermissionMap(true),
        })];
      }
      return rows;
    } catch (error) {
      if (isSetupError(error)) {
        return [normalizeAdminUserRow({
          email: profile.email,
          display_name: 'Ana Yönetici',
          active: true,
          is_owner: true,
          permissions: createPermissionMap(true),
        })];
      }
      throw error;
    }
  }

  async function saveAdminUser(input) {
    const profile = await getAdminAccessProfile(true);
    if (!profile) {
      throw new Error('Önce yönetici girişi yapmalısın.');
    }
    if (!profile.isOwner && !profile.legacyMode) {
      throw new Error('Alt admin yönetimi yalnızca ana yöneticiye açıktır.');
    }

    const currentEmail = normalizeEmail(profile.email);
    const payload = buildAdminUserPayload(input);
    const originalEmail = normalizeEmail(input && input.originalEmail ? input.originalEmail : payload.email);
    const rows = await ensureOwnerRecord(currentEmail);
    const existingRow = rows.find(function(row) {
      return row.email === originalEmail;
    });

    if (originalEmail === currentEmail && payload.is_owner === false) {
      throw new Error('Ana yönetici yetkisi kapatılamaz.');
    }

    if (existingRow && existingRow.isOwner && originalEmail !== currentEmail) {
      throw new Error('Sistemde yalnızca bir ana yönetici tutulur.');
    }

    let error = null;
    if (existingRow) {
      const result = await getClient()
        .from(ADMIN_USERS_TABLE)
        .update(payload)
        .eq('email', originalEmail);
      error = result.error;
    } else {
      const result = await getClient()
        .from(ADMIN_USERS_TABLE)
        .insert(payload);
      error = result.error;
    }

    if (error) {
      throw error;
    }

    clearAccessCache();
    return getAdminAccessProfile(true);
  }

  async function deleteAdminUser(email) {
    const profile = await getAdminAccessProfile(true);
    if (!profile) {
      throw new Error('Önce yönetici girişi yapmalısın.');
    }
    if (!profile.isOwner && !profile.legacyMode) {
      throw new Error('Alt admin yönetimi yalnızca ana yöneticiye açıktır.');
    }

    const currentEmail = normalizeEmail(profile.email);
    const targetEmail = normalizeEmail(email);
    if (!targetEmail) {
      throw new Error('Silinecek admin e-postası boş olamaz.');
    }
    if (targetEmail === currentEmail) {
      throw new Error('Ana yönetici hesabı silinemez.');
    }

    await ensureOwnerRecord(currentEmail);
    const rows = (await fetchAdminRows()).map(normalizeAdminUserRow);
    const targetRow = rows.find(function(row) {
      return row.email === targetEmail;
    });

    if (targetRow && targetRow.isOwner) {
      throw new Error('Ana yönetici hesabı silinemez.');
    }

    const { error } = await getClient()
      .from(ADMIN_USERS_TABLE)
      .delete()
      .eq('email', targetEmail);
    if (error) {
      throw error;
    }
    clearAccessCache();
  }

  async function ensureCurrentPageAccess(sessionLike) {
    const profile = await getAdminAccessProfile(true, sessionLike);
    if (!profile) {
      throw new Error('Önce yönetici girişi yapmalısın.');
    }
    if (profile.legacyMode) {
      return profile;
    }
    if (!profile.row) {
      throw new Error('Bu hesap için yönetici erişimi tanımlı değil.');
    }
    if (!profile.active) {
      throw new Error('Bu yönetici hesabı pasif durumda.');
    }

    const permissionMatch = getPagePermissionMatch();
    if (!permissionMatch || profile.isOwner) {
      return profile;
    }
    const allowed = permissionMatch.anyOf
      ? profileHasAnyPermission(profile, permissionMatch.anyOf)
      : profileHasPermission(profile, permissionMatch.key);
    if (!allowed) {
      const permissionDef = getPermissionDefinition(permissionMatch.key || (permissionMatch.anyOf && permissionMatch.anyOf[0]));
      throw new Error((permissionDef ? permissionDef.label : 'Bu panel') + ' için erişim iznin yok.');
    }
    return profile;
  }

  function humanizeError(error) {
    const message = String(error && error.message ? error.message : '');
    if (message.includes('Invalid login credentials')) {
      const scope = getAuthScope();
      if (scope === 'reading') {
        const readingRef = getProjectRef(getConfigForScope('reading').supabaseUrl);
        return 'Bu panel okuma veritabani projesini kullanir (' + readingRef + '). E-posta/sifre bu projedeki Auth kullanicisiyla eslesmiyor.';
      }
      if (scope === 'documents') {
        const documentRef = getProjectRef(getConfigForScope('documents').supabaseUrl);
        return 'Bu panel dokuman projesini kullanir (' + documentRef + '). E-posta/sifre bu projedeki Auth kullanicisiyla eslesmiyor.';
      }

      const siteRef = getProjectRef(getConfigForScope('default').supabaseUrl);
      const readingConfig = window.kemalSiteStore && typeof window.kemalSiteStore.getReadingConfig === 'function'
        ? window.kemalSiteStore.getReadingConfig()
        : null;
      const readingRef = readingConfig && readingConfig.supabaseUrl
        ? getProjectRef(readingConfig.supabaseUrl)
        : '';

      if (readingRef && readingRef !== siteRef) {
        return 'Bu panel ana site projesindeki Auth hesabini bekler (' + siteRef + '). Hesabi sadece okuma projesinde (' + readingRef + ') olusturduysan burada giris yapamazsin. Ayni e-posta/sifreyi ana site projesinde de Authentication > Users altinda eklemelisin.';
      }
      return 'E-posta veya şifre hatalı görünüyor.';
    }
    if (message.includes('Email not confirmed')) {
      return 'Bu e-posta adresi doğrulanmamış görünüyor.';
    }
    if (message.includes('Bu hesap için yönetici erişimi tanımlı değil')) {
      return 'Bu hesap ana yönetim paneline yetkili değil. Öğretmen hesabıysan Giriş Yap ekranından öğretmen paneline yönlendirilmelisin.';
    }
    if (message.includes('pasif durumda')) {
      return 'Bu yönetici hesabı şu anda pasif durumda.';
    }
    if (message.includes('için erişim iznin yok')) {
      return message;
    }
    if (isSetupError(error)) {
      return 'Alt admin sistemi için Supabase `admin_users` yapısı hazır değil. Supabase SQL Editor içinde `supabase-admin-users.sql` dosyasını çalıştırdıktan sonra tekrar deneyebilirsin.';
    }
    return message || 'İşlem sırasında beklenmeyen bir hata oluştu.';
  }

  async function getSession() {
    const session = await getSessionRaw();
    if (!session) {
      return null;
    }
    try {
      await ensureCurrentPageAccess(session);
    } catch (error) {
      await getClient().auth.signOut().catch(function() {
        return null;
      });
      clearAccessCache();
      throw error;
    }
    return session;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    });
    if (error) {
      throw error;
    }
    try {
      await ensureCurrentPageAccess(data.session);
    } catch (accessError) {
      await getClient().auth.signOut().catch(function() {
        return null;
      });
      clearAccessCache();
      throw accessError;
    }
    return data.session;
  }

  async function signOut() {
    clearAccessCache();
    const { error } = await getClient().auth.signOut();
    if (error) {
      throw error;
    }
  }

  async function updatePassword(newPassword) {
    const { data, error } = await getClient().auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw error;
    }
    return data.user;
  }

  async function sendPasswordSetupEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('Şifre linki için e-posta zorunlu.');
    }
    const redirectTo = window.location.origin + '/admin/reset-password.html';
    const { error } = await getClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
    if (error) {
      throw error;
    }
    return true;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session ? session.access_token : null;
  }

  window.kemalAdminAuth = {
    getClient,
    getSession,
    getUser,
    signIn,
    signOut,
    updatePassword,
    sendPasswordSetupEmail,
    getAccessToken,
    getAdminAccessProfile,
    ensureCurrentPageAccess,
    getAdminPermissionDefs: function() {
      return ADMIN_PERMISSION_DEFS.map(function(item) {
        return Object.assign({}, item);
      });
    },
    getCurrentPagePermission,
    hasPermission: function(key, profile) {
      return profileHasPermission(profile || accessCache, key);
    },
    hasAnyPermission: function(keys, profile) {
      return profileHasAnyPermission(profile || accessCache, keys);
    },
    listAdminUsers,
    saveAdminUser,
    deleteAdminUser,
    humanizeError,
  };
})();
