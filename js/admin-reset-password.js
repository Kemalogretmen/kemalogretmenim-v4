(function() {
  'use strict';

  const state = {
    client: null,
    target: null,
  };

  function parseParams(raw) {
    const source = String(raw || '').replace(/^[?#]/, '');
    const output = {};
    if (!source) {
      return output;
    }

    source.split('&').forEach(function(part) {
      if (!part) {
        return;
      }
      const eqIndex = part.indexOf('=');
      const rawKey = eqIndex >= 0 ? part.slice(0, eqIndex) : part;
      const rawValue = eqIndex >= 0 ? part.slice(eqIndex + 1) : '';
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      output[key] = value;
    });

    return output;
  }

  function getParams() {
    return Object.assign({}, parseParams(window.location.search), parseParams(window.location.hash));
  }

  function getProjectRef(url) {
    const match = String(url || '').match(/^https:\/\/([^.]+)\.supabase\.co/i);
    return match ? match[1] : 'bilinmeyen-proje';
  }

  function showStatus(text, type) {
    const el = document.getElementById('statusBox');
    el.className = 'status show ' + (type || 'info');
    el.textContent = text;
  }

  function showProject(target, email) {
    const chip = document.getElementById('projectChip');
    chip.textContent = target.label + ' (' + target.projectRef + ')';
    chip.className = 'chip show';

    const emailEl = document.getElementById('emailText');
    if (email) {
      emailEl.textContent = 'Hesap: ' + email;
      emailEl.className = 'email show';
    } else {
      emailEl.className = 'email';
      emailEl.textContent = '';
    }
  }

  function setFormVisible(visible) {
    document.getElementById('resetForm').className = visible ? 'form show' : 'form';
  }

  function setSuccessVisible(visible) {
    document.getElementById('successActions').className = visible ? 'success-actions show' : 'success-actions';
  }

  function getTargets() {
    if (!window.kemalSiteStore) {
      throw new Error('Site ayarlari yuklenemedi.');
    }

    const store = window.kemalSiteStore;
    const targets = [
      {
        scope: 'default',
        label: 'Ana site yonetimi',
        panelHref: '/admin/index.html',
        panelLabel: 'Ana yonetim paneline git',
        config: store.getConfig(),
      },
      {
        scope: 'reading',
        label: 'Okuma ve dokuman panelleri',
        panelHref: '/admin/okuma-editor.html',
        panelLabel: 'Okuma paneline git',
        config: typeof store.getReadingConfig === 'function' ? store.getReadingConfig() : store.getConfig(),
      },
    ];

    if (typeof store.getDocumentsConfig === 'function') {
      const docConfig = store.getDocumentsConfig();
      const docRef = getProjectRef(docConfig.supabaseUrl);
      const exists = targets.some(function(target) {
        return getProjectRef(target.config.supabaseUrl) === docRef;
      });
      if (!exists) {
        targets.push({
          scope: 'documents',
          label: 'Dokuman yonetimi',
          panelHref: '/admin/dokuman-yonetimi.html',
          panelLabel: 'Dokuman paneline git',
          config: docConfig,
        });
      }
    }

    return targets.map(function(target) {
      return Object.assign({}, target, {
        projectRef: getProjectRef(target.config.supabaseUrl),
      });
    });
  }

  function createClient(target) {
    return window.supabase.createClient(target.config.supabaseUrl, target.config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  async function tryRecoverSession(client, params) {
    if (params.code && typeof client.auth.exchangeCodeForSession === 'function') {
      const codeResult = await client.auth.exchangeCodeForSession(params.code);
      if (!codeResult.error && codeResult.data && codeResult.data.session) {
        return true;
      }
    }

    if (params.access_token && params.refresh_token) {
      const sessionResult = await client.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (!sessionResult.error && sessionResult.data && sessionResult.data.session) {
        return true;
      }
    }

    if (params.token_hash && typeof client.auth.verifyOtp === 'function') {
      const verifyResult = await client.auth.verifyOtp({
        token_hash: params.token_hash,
        type: params.type || 'recovery',
      });
      if (!verifyResult.error) {
        const sessionResult = await client.auth.getSession();
        if (!sessionResult.error && sessionResult.data && sessionResult.data.session) {
          return true;
        }
      }
    }

    const existingSession = await client.auth.getSession();
    return Boolean(existingSession.data && existingSession.data.session);
  }

  async function resolveTargetSession() {
    const params = getParams();
    const targets = getTargets();

    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      const client = createClient(target);

      try {
        const ok = await tryRecoverSession(client, params);
        if (!ok) {
          continue;
        }

        const userResult = await client.auth.getUser();
        const user = userResult && userResult.data ? userResult.data.user : null;
        if (!user) {
          continue;
        }

        return {
          target: target,
          client: client,
          user: user,
        };
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  function clearSensitiveUrl(target) {
    const query = '?project=' + encodeURIComponent(target.projectRef);
    window.history.replaceState({}, document.title, window.location.pathname + query);
  }

  async function bootstrap() {
    setFormVisible(false);
    setSuccessVisible(false);

    if (!window.supabase) {
      showStatus('Supabase kutuphanesi yuklenemedi.', 'error');
      return;
    }

    const result = await resolveTargetSession();
    if (!result) {
      showStatus('Link gecersiz, suresi dolmus veya farkli bir Supabase projesine ait olabilir. Supabase uzerinden yeniden sifre yenileme maili gonderip linke tekrar tiklayin.', 'error');
      return;
    }

    state.client = result.client;
    state.target = result.target;

    clearSensitiveUrl(result.target);
    showProject(result.target, result.user.email || '');
    showStatus('Yeni sifreni girip kaydedebilirsin.', 'info');
    setFormVisible(true);

    const panelLink = document.getElementById('panelLink');
    panelLink.href = result.target.panelHref;
    panelLink.textContent = result.target.panelLabel;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!state.client || !state.target) {
      showStatus('Gecerli bir yenileme oturumu bulunamadi.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const password = document.getElementById('newPassword').value;
    const password2 = document.getElementById('newPassword2').value;

    if (password.length < 6) {
      showStatus('Yeni sifre en az 6 karakter olmali.', 'error');
      return;
    }

    if (password !== password2) {
      showStatus('Yeni sifre alanlari eslesmiyor.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Kaydediliyor...';

    try {
      const updateResult = await state.client.auth.updateUser({
        password: password,
      });
      if (updateResult.error) {
        throw updateResult.error;
      }

      await state.client.auth.signOut().catch(function() {
        return null;
      });

      document.getElementById('newPassword').value = '';
      document.getElementById('newPassword2').value = '';
      setFormVisible(false);
      setSuccessVisible(true);
      showStatus('Sifre basariyla guncellendi. Artik yeni sifrenle tekrar giris yapabilirsin.', 'success');
    } catch (error) {
      const message = error && error.message ? error.message : 'Sifre guncellenemedi.';
      showStatus(message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sifreyi Guncelle';
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('resetForm').addEventListener('submit', handleSubmit);
    bootstrap();
  });
})();
