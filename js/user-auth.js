(function() {
  'use strict';

  var SUPABASE_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var READY_EVENT = 'kemal-user-auth-ready';
  var CHANGE_EVENT = 'kemal-user-auth-changed';
  var ACTIVITY_PREFIX = 'kemal_student_activity_v1_';
  var client = null;
  var readyPromise = null;
  var activityTimer = 0;
  var lastActivityTick = 0;
  var state = {
    ready: false,
    session: null,
    user: null,
    profile: null,
  };

  function getConfig() {
    if (!window.kemalSiteStore || typeof window.kemalSiteStore.getConfig !== 'function') {
      throw new Error('Site yapılandırması yüklenemedi.');
    }
    return window.kemalSiteStore.getConfig();
  }

  function ensureSupabase() {
    if (window.supabase) {
      return Promise.resolve(window.supabase);
    }
    var existing = document.querySelector('script[src="' + SUPABASE_SRC + '"]');
    if (existing) {
      return new Promise(function(resolve, reject) {
        existing.addEventListener('load', function() { resolve(window.supabase); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }
    return new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = SUPABASE_SRC;
      script.async = true;
      script.onload = function() { resolve(window.supabase); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function getClient() {
    if (client) {
      return client;
    }
    var config = getConfig();
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

  function normalizeRole(value) {
    var role = clean(value).toLocaleLowerCase('tr-TR');
    if (role === 'teacher' || role === 'student' || role === 'parent') {
      return role;
    }
    return 'student';
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  async function isAdminAccount(user) {
    var email = normalizeEmail(user && user.email);
    if (!email) return false;
    try {
      var result = await getClient()
        .from('admin_users')
        .select('email,active')
        .eq('active', true)
        .ilike('email', email)
        .maybeSingle();
      return !result.error && Boolean(result.data);
    } catch (error) {
      return false;
    }
  }

  function splitName(fullName) {
    var parts = clean(fullName).split(' ').filter(Boolean);
    return {
      firstName: parts.slice(0, Math.max(1, parts.length - 1)).join(' '),
      lastName: parts.length > 1 ? parts.slice(-1).join(' ') : '',
    };
  }

  function normalizeProfile(raw, user) {
    var profile = raw || {};
    var meta = user && user.user_metadata ? user.user_metadata : {};
    var metaName = clean(meta.full_name || meta.name || '');
    var fallback = splitName(metaName);
    var firstName = clean(profile.first_name || meta.first_name || fallback.firstName);
    var lastName = clean(profile.last_name || meta.last_name || fallback.lastName);
    var fullName = clean(profile.full_name || metaName || [firstName, lastName].filter(Boolean).join(' '));
    return Object.assign({}, profile, {
      id: profile.id || (user && user.id) || '',
      email: normalizeEmail(profile.email || (user && user.email) || ''),
      role: profile.role || '',
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      city: clean(profile.city),
      district: clean(profile.district),
      school_name: clean(profile.school_name),
      branch: clean(profile.branch),
      grade_level: profile.grade_level || '',
      avatar_url: clean(profile.avatar_url || meta.avatar_url),
      active: profile.active !== false,
    });
  }

  async function createProfileFromUser(user) {
    if (!user || !user.id) {
      return null;
    }
    var meta = user.user_metadata || {};
    var appMeta = user.app_metadata || {};
    if (await isAdminAccount(user)) {
      return null;
    }
    var name = clean(meta.full_name || meta.name || '');
    var split = splitName(name);
    var payload = {
      id: user.id,
      role: normalizeRole(meta.role),
      email: normalizeEmail(user.email),
      first_name: clean(meta.first_name || split.firstName),
      last_name: clean(meta.last_name || split.lastName),
      full_name: name || [meta.first_name || split.firstName, meta.last_name || split.lastName].filter(Boolean).join(' '),
      city: clean(meta.city),
      district: clean(meta.district),
      school_id: meta.school_id || null,
      school_name: clean(meta.school_name),
      school_missing: Boolean(meta.school_missing),
      branch: clean(meta.branch),
      grade_level: meta.grade_level ? Number(meta.grade_level) : null,
      teacher_code: clean(meta.teacher_code),
      parent_link_code: clean(meta.parent_link_code),
      approval_status: normalizeRole(meta.role) === 'teacher' ? 'pending' : 'active',
      account_status: 'active',
      auth_provider: clean(appMeta.provider || (Array.isArray(appMeta.providers) ? appMeta.providers[0] : '') || 'email'),
      active: true,
    };
    var response = await getClient()
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();
    if (response.error) {
      return null;
    }
    return response.data || payload;
  }

  async function loadProfile(user) {
    if (!user || !user.id) {
      return null;
    }
    var response = await getClient()
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (!response.error && response.data) {
      return normalizeProfile(response.data, user);
    }
    var created = await createProfileFromUser(user);
    return created ? normalizeProfile(created, user) : null;
  }

  function emit(eventName) {
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: getState(),
    }));
  }

  async function refresh() {
    await ensureSupabase();
    var sessionResult = await getClient().auth.getSession();
    state.session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    state.user = state.session ? state.session.user : null;
    state.profile = state.user ? await loadProfile(state.user) : null;
    state.ready = true;
    startActivityTracking();
    emit(CHANGE_EVENT);
    return getState();
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = ensureSupabase()
        .then(function() {
          getClient().auth.onAuthStateChange(function() {
            refresh().catch(function() {
              state.ready = true;
              emit(CHANGE_EVENT);
            });
          });
          return refresh();
        })
        .then(function(result) {
          emit(READY_EVENT);
          return result;
        })
        .catch(function(error) {
          state.ready = true;
          state.error = error && error.message ? error.message : String(error || '');
          emit(READY_EVENT);
          emit(CHANGE_EVENT);
          return getState();
        });
    }
    return readyPromise;
  }

  function getState() {
    return {
      ready: state.ready,
      session: state.session,
      user: state.user,
      profile: state.profile,
      error: state.error || '',
    };
  }

  function getPanelHref(profile) {
    var role = profile && profile.role;
    if (role === 'teacher') {
      return '/ogretmen-paneli.html';
    }
    if (role === 'student') {
      return '/ogrenci-paneli.html';
    }
    if (role === 'parent') {
      return '/veli-paneli.html';
    }
    return '/giris.html';
  }

  function getDisplayName() {
    var profile = state.profile || {};
    return clean(profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || (state.user && state.user.email) || '');
  }

  function getStudentInfo() {
    var profile = state.profile || {};
    var user = state.user || {};
    var nameParts = splitName(profile.full_name || '');
    var firstName = clean(profile.first_name || nameParts.firstName);
    var lastName = clean(profile.last_name || nameParts.lastName);
    return {
      accountUid: user.id || '',
      email: normalizeEmail(profile.email || user.email || ''),
      firstName: firstName,
      lastName: lastName,
      fullName: clean(profile.full_name || [firstName, lastName].filter(Boolean).join(' ')),
      grade: profile.grade_level ? String(profile.grade_level) : '',
      sube: clean(profile.branch),
      city: clean(profile.city),
      district: clean(profile.district),
      school: clean(profile.school_name),
      role: profile.role || '',
    };
  }

  function getStudentGradeLevel() {
    var info = getStudentInfo();
    if (!info || info.role !== 'student') {
      return null;
    }
    var grade = parseInt(info.grade, 10);
    return Number.isFinite(grade) && grade > 0 ? grade : null;
  }

  function studentCanAccessGrade(grade) {
    var lockedGrade = getStudentGradeLevel();
    var requestedGrade = parseInt(grade, 10);
    return !lockedGrade || !Number.isFinite(requestedGrade) || requestedGrade === lockedGrade;
  }

  function normalizeContentAccess(input) {
    var meta = input && typeof input === 'object' ? input : { accessScope: input };
    var raw = meta.accessScope || meta.access_scope || meta.visibility || meta.access || meta.contentAccess || '';
    if (meta.oturum_gerekli === true || meta.authRequired === true || meta.requiresAuth === true || meta.login_required === true) {
      raw = 'registered';
    }
    var value = clean(raw).toLocaleLowerCase('tr-TR');
    if (!value || value === 'public' || value === 'herkese-acik' || value === 'herkese açık' || value === 'everyone') {
      return 'public';
    }
    if (value.indexOf('registered') !== -1 || value.indexOf('kayit') !== -1 || value.indexOf('kayıt') !== -1 || value.indexOf('uye') !== -1 || value.indexOf('üye') !== -1 || value.indexOf('auth') !== -1 || value.indexOf('login') !== -1) {
      return 'registered';
    }
    return value === 'private' ? 'registered' : 'public';
  }

  function isSignedIn() {
    return Boolean(state.user && state.user.id);
  }

  function isRegisteredUser() {
    var profile = state.profile || {};
    return isSignedIn() && profile.active !== false;
  }

  function isContentPublic(meta) {
    return normalizeContentAccess(meta) === 'public';
  }

  function requiresRegistration(meta) {
    return normalizeContentAccess(meta) !== 'public';
  }

  function canAccessContent(meta) {
    return !requiresRegistration(meta) || isRegisteredUser();
  }

  function getRegisterRedirectUrl(returnTo) {
    var target = returnTo || (window.location.pathname + window.location.search);
    return '/kayit.html?redirect=' + encodeURIComponent(target);
  }

  function promptRegistration(meta, returnTo) {
    if (canAccessContent(meta)) {
      return true;
    }
    alert('Görüntüleyebilmek için lütfen kayıt olun.');
    window.location.href = getRegisterRedirectUrl(returnTo);
    return false;
  }

  function studentCanAccessContentGrade(meta, grade) {
    if (isContentPublic(meta)) {
      return true;
    }
    return studentCanAccessGrade(grade);
  }

  function readAccessMetaFromNode(node) {
    if (!node || !node.getAttribute) {
      return null;
    }
    return {
      accessScope: node.getAttribute('data-access-scope') || '',
      oturum_gerekli: node.getAttribute('data-oturum-gerekli') === 'true',
      authRequired: node.getAttribute('data-auth-required') === 'true',
    };
  }

  function installContentAccessGuard() {
    if (installContentAccessGuard.done) {
      return;
    }
    installContentAccessGuard.done = true;
    document.addEventListener('click', function(event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-access-scope],[data-auth-required],[data-oturum-gerekli]')
        : null;
      if (!target) {
        return;
      }
      var meta = readAccessMetaFromNode(target);
      if (!requiresRegistration(meta) || isRegisteredUser()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      promptRegistration(meta, target.getAttribute('href') || target.getAttribute('data-reaction-href') || window.location.href);
    }, true);
  }

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getActivityKey(userId) {
    return ACTIVITY_PREFIX + String(userId || '');
  }

  function loadActivity(userId) {
    if (!userId) {
      return { dates: {}, totalSeconds: 0 };
    }
    try {
      var raw = window.localStorage.getItem(getActivityKey(userId));
      var parsed = raw ? JSON.parse(raw) : null;
      return {
        dates: parsed && parsed.dates && typeof parsed.dates === 'object' ? parsed.dates : {},
        totalSeconds: Number(parsed && parsed.totalSeconds || 0),
        lastSeenAt: parsed && parsed.lastSeenAt || '',
      };
    } catch (error) {
      return { dates: {}, totalSeconds: 0 };
    }
  }

  function saveActivity(userId, activity) {
    if (!userId) {
      return;
    }
    try {
      window.localStorage.setItem(getActivityKey(userId), JSON.stringify(activity || {}));
    } catch (error) {
      /* Yerel depolama kapalıysa aktivite sessizce atlanır. */
    }
  }

  function getActivitySummary() {
    var userId = state.user && state.user.id ? state.user.id : '';
    var activity = loadActivity(userId);
    var dates = activity.dates && typeof activity.dates === 'object' ? activity.dates : {};
    return {
      userId: userId,
      dailyLoginCount: Object.keys(dates).filter(function(key) { return dates[key]; }).length,
      totalSeconds: Number(activity.totalSeconds || 0),
      hourPoints: Math.floor(Number(activity.totalSeconds || 0) / 3600),
      lastSeenAt: activity.lastSeenAt || '',
    };
  }

  function touchDailyLogin(userId) {
    var activity = loadActivity(userId);
    activity.dates[getTodayKey()] = true;
    activity.lastSeenAt = new Date().toISOString();
    saveActivity(userId, activity);
  }

  function startActivityTracking() {
    var userId = state.user && state.user.id ? state.user.id : '';
    var profile = state.profile || {};
    window.clearInterval(activityTimer);
    activityTimer = 0;
    lastActivityTick = 0;
    if (!userId || profile.role !== 'student') {
      return;
    }
    touchDailyLogin(userId);
    lastActivityTick = Date.now();
    activityTimer = window.setInterval(function() {
      if (document.hidden) {
        lastActivityTick = Date.now();
        return;
      }
      var now = Date.now();
      var delta = Math.max(0, Math.min(90, Math.round((now - lastActivityTick) / 1000)));
      lastActivityTick = now;
      if (!delta) {
        return;
      }
      var activity = loadActivity(userId);
      activity.dates[getTodayKey()] = true;
      activity.totalSeconds = Math.max(0, Number(activity.totalSeconds || 0)) + delta;
      activity.lastSeenAt = new Date().toISOString();
      saveActivity(userId, activity);
      window.dispatchEvent(new CustomEvent('kemal-user-activity-changed', { detail: getActivitySummary() }));
    }, 60000);
  }

  function getReactionVisitorId(fallback) {
    return state.user && state.user.id ? 'user:' + state.user.id : fallback;
  }

  async function signOut() {
    await ensureSupabase();
    await getClient().auth.signOut();
    await refresh();
  }

  async function signInWithGoogle(redirectTo) {
    await ensureSupabase();
    return getClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || (window.location.origin + '/giris.html'),
      },
    });
  }

  async function requestPasswordReset(email) {
    await ensureSupabase();
    return getClient().auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: window.location.origin + '/admin/reset-password.html',
    });
  }

  async function updateProfile(patch) {
    await ready();
    if (!state.user || !state.user.id) {
      throw new Error('Profil güncellemek için giriş yapmalısın.');
    }
    var payload = Object.assign({}, patch || {}, {
      id: state.user.id,
      email: normalizeEmail((patch && patch.email) || state.user.email),
    });
    var result = await getClient()
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();
    if (result.error) {
      throw result.error;
    }
    state.profile = normalizeProfile(result.data, state.user);
    emit(CHANGE_EVENT);
    return state.profile;
  }

  window.kemalUserAuth = {
    ready: ready,
    refresh: refresh,
    getClient: getClient,
    getState: getState,
    getUser: function() { return state.user; },
    getProfile: function() { return state.profile; },
    getDisplayName: getDisplayName,
    getPanelHref: getPanelHref,
    getStudentInfo: getStudentInfo,
    getStudentGradeLevel: getStudentGradeLevel,
    studentCanAccessGrade: studentCanAccessGrade,
    normalizeContentAccess: normalizeContentAccess,
    isSignedIn: isSignedIn,
    isRegisteredUser: isRegisteredUser,
    isContentPublic: isContentPublic,
    requiresRegistration: requiresRegistration,
    canAccessContent: canAccessContent,
    promptRegistration: promptRegistration,
    studentCanAccessContentGrade: studentCanAccessContentGrade,
    getActivitySummary: getActivitySummary,
    getReactionVisitorId: getReactionVisitorId,
    signOut: signOut,
    signInWithGoogle: signInWithGoogle,
    requestPasswordReset: requestPasswordReset,
    updateProfile: updateProfile,
  };

  installContentAccessGuard();
  ready();
})();
