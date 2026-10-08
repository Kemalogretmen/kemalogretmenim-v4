(function() {
  'use strict';

  let loginInProgress = false;

  function getConfig() {
    if (!window.kemalSiteStore || typeof window.kemalSiteStore.getConfig !== 'function') {
      throw new Error('Site yapılandırması yüklenemedi.');
    }
    return window.kemalSiteStore.getConfig();
  }

  function getClient() {
    if (!window.kemalUserAuth) throw new Error('Oturum sistemi yüklenemedi. Sayfayı yenileyin.');
    return window.kemalUserAuth.getClient();
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
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

  async function getUserProfile(user) {
    const userId = user && user.id ? user.id : '';
    const email = user && user.email ? user.email : user;
    const result = await getClient()
      .from('user_profiles')
      .select('id,role,approval_status,active,email,full_name,first_name,last_name,city,school_name,grade_level,branch')
      .eq(userId ? 'id' : 'email', userId || normalizeEmail(email))
      .maybeSingle();
    if (result.error) throw new Error('Hesap bilgileri yüklenemedi. Lütfen yeniden deneyin.');
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
    const requested = new URLSearchParams(window.location.search).get('redirect');
    if (profile?.role === 'teacher' && profile.active !== false && profile.approval_status === 'active' && ['/ogretmen/akvaryum.html','/ogretmen-paneli.html'].includes(requested)) return requested;
    if (profile && profile.active !== false && (profile.role !== 'teacher' || profile.approval_status === 'active')) {
      const gameReturn = window.kemalGameAuthReturn?.take();
      if (gameReturn) return gameReturn;
    }
    if (profile && profile.role === 'teacher') return '/ogretmen-paneli.html';
    if (profile && profile.role === 'student') return '/ogrenci-paneli.html';
    if (profile && profile.role === 'parent') return '/veli-paneli.html';
    if (isAdmin) return '/admin/index.html';
    return '/kayit.html?profil=tamamla';
  }

  function profileNeedsCompletion(profile) {
    if (!profile || profile.role !== 'student') return false;
    return !profile.full_name || !profile.city || !profile.school_name || !profile.grade_level;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = normalizeEmail(document.getElementById('loginEmail').value);
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      showMessage('err', 'E-posta ve şifre alanlarını doldurun.');
      return;
    }

    loginInProgress = true; setBusy(true);
    try {
      const result = await getClient().auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;

      const user = result.data && result.data.user ? result.data.user : null;
      const profile = await getUserProfile(user || email);
      if (profile && profile.active === false) {
        throw new Error('Bu hesap şu anda pasif durumda.');
      }
      if (profileNeedsCompletion(profile)) {
        window.location.href = '/kayit.html?profil=tamamla';
        return;
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
      loginInProgress = false; setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      const result = await getClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/giris.html',
        },
      });
      if (result.error) throw result.error;
    } catch (error) {
      showMessage('err', String(error && error.message ? error.message : error));
    }
  }

  async function handlePasswordReset() {
    const email = normalizeEmail(document.getElementById('loginEmail').value);
    if (!email) {
      showMessage('err', 'Şifre yenileme bağlantısı için e-posta adresini yazmalısın.');
      return;
    }
    try {
      const result = await getClient().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin/reset-password.html',
      });
      if (result.error) throw result.error;
      showMessage('ok', 'Şifre yenileme bağlantısı e-posta adresine gönderildi. Gelen kutusu ve spam klasörünü kontrol et.');
    } catch (error) {
      showMessage('err', String(error && error.message ? error.message : error));
    }
  }

  async function routeExistingSession() {
    try {
      await window.kemalUserAuth.ready();
      if (window.kemalUserAuth.getState().error) throw new Error(window.kemalUserAuth.getState().error);
      const sessionResult = await getClient().auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      if (!session || !session.user) return;
      const profile = await getUserProfile(session.user);
      if (loginInProgress) return;
      if (profile && profile.active === false) throw new Error('Bu hesap pasif durumda. Yeniden kayıt oluşturmak yerine destek isteyin.');
      if (profileNeedsCompletion(profile)) {
        window.location.href = '/kayit.html?profil=tamamla';
        return;
      }
      const isAdmin = await hasAdminAccess(session.user.email);
      if (!loginInProgress) window.location.href = routeForProfile(profile, isAdmin);
    } catch (error) {
      showMessage('err', error.message || 'Oturum kontrol edilemedi. Lütfen yeniden deneyin.');
    }
  }

  function init() {
    const form = document.getElementById('roleLoginForm');
    if (form) form.addEventListener('submit', handleLogin);
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) forgotBtn.addEventListener('click', handlePasswordReset);
    routeExistingSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
