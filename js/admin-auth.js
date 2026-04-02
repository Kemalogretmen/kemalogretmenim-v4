(function() {
  'use strict';

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
    const store = window.kemalSiteStore;
    if (!store) {
      throw new Error('kemalSiteStore bulunamadi.');
    }
    if (getAuthScope() === 'reading' && typeof store.getReadingConfig === 'function') {
      return store.getReadingConfig();
    }
    if (getAuthScope() === 'documents' && typeof store.getDocumentsConfig === 'function') {
      return store.getDocumentsConfig();
    }
    return store.getConfig();
  }

  function ensureSupabase() {
    if (!window.supabase) {
      throw new Error('Supabase kutuphanesi yuklenemedi.');
    }
    return window.supabase;
  }

  let client = null;
  let clientScope = null;

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
    return client;
  }

  function humanizeError(error) {
    const message = error && error.message ? error.message : '';
    if (message.includes('Invalid login credentials')) {
      if (getAuthScope() === 'reading') {
        return 'Bu e-posta/şifre okuma veritabani projesinde tanimli bir Auth kullanicisiyla eslesmiyor. Aynı kullaniciyi mwxcvlyrkptxrwgkmqum projesinde de olusturmaniz gerekir.';
      }
      return 'E-posta veya şifre hatalı görünüyor.';
    }
    if (message.includes('Email not confirmed')) {
      return 'Bu e-posta adresi doğrulanmamış görünüyor.';
    }
    return message || 'İşlem sırasında beklenmeyen bir hata oluştu.';
  }

  async function getSession() {
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

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw error;
    }
    return data.session;
  }

  async function signOut() {
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
    getAccessToken,
    humanizeError,
  };
})();
