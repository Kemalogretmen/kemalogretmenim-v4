(function() {
  'use strict';

  let client = null;

  function getConfig() {
    if (!window.kemalSiteStore || typeof window.kemalSiteStore.getConfig !== 'function') {
      throw new Error('Site yapılandırması yüklenemedi.');
    }
    return window.kemalSiteStore.getConfig();
  }

  function getClient() {
    if (client) return client;
    const config = getConfig();
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function showMessage(type, text) {
    const el = document.getElementById('loginMessage');
    if (!el) return;
    el.className = 'login-message show ' + (type === 'ok' ? 'ok' : 'err');
    el.textContent = text;
  }

  function setBusy(isBusy) {
    const btn = document.getElementById('loginSubmit');
    if (!btn) return;
    btn.disabled = isBusy;
    btn.textContent = isBusy ? 'Giriş yapılıyor...' : 'Giriş Yap';
  }

  async function getUserProfile(email) {
    const result = await getClient()
      .from('user_profiles')
      .select('role,approval_status,active,email,full_name')
      .eq('email', normalizeEmail(email))
      .maybeSingle();
    if (result.error) {
      return null;
    }
    return result.data || null;
  }

  async function hasAdminAccess(email) {
    const result = await getClient()
      .from('admin_users')
      .select('email,active,is_owner')
      .eq('email', normalizeEmail(email))
      .eq('active', true)
      .maybeSingle();
    return !result.error && !!result.data;
  }

  function routeForProfile(profile, isAdmin) {
    if (isAdmin) return '/admin/index.html';
    if (profile && profile.role === 'teacher') return '/ogretmen-paneli.html';
    if (profile && profile.role === 'student') return '/ogrenci-paneli.html';
    return '/kayit.html';
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = normalizeEmail(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      showMessage('err', 'E-posta ve şifre alanlarını doldurun.');
      return;
    }

    setBusy(true);
    try {
      const result = await getClient().auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;

      const profile = await getUserProfile(email);
      if (profile && profile.active === false) {
        throw new Error('Bu hesap şu anda pasif durumda.');
      }
      if (profile && profile.role === 'teacher' && profile.approval_status !== 'active') {
        window.location.href = '/ogretmen-paneli.html';
        return;
      }

      const isAdmin = await hasAdminAccess(email);
      window.location.href = routeForProfile(profile, isAdmin);
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      showMessage('err', message.includes('Email not confirmed')
        ? 'E-posta adresi henüz doğrulanmamış. Mail kutundaki doğrulama bağlantısına tıklamalısın.'
        : message);
    } finally {
      setBusy(false);
    }
  }

  function init() {
    const form = document.getElementById('roleLoginForm');
    if (form) form.addEventListener('submit', handleLogin);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
