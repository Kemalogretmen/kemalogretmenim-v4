// Source for the generated WebView script. Run npm run bridge:generate after changes.
function install(config: { origin: string; authKey: string; session: unknown; userId: string | null; dark: boolean; module: string; nonce: string; agendaSeed?: { userId: string; agenda_state: unknown; lesson_planner_state: unknown; updated_at: string; client_updated_at?: string }; bundledWhiteboard?: boolean; bundledAgenda?: boolean; agendaPath?: string; profile?: unknown; supabaseUrl?: string; supabaseKey?: string; webAgendaHost?: string }) {
  const w = window as any;
  const bundledRequested = config.module === 'whiteboard' && config.bundledWhiteboard === true;
  const bundled = bundledRequested && document.querySelector('meta[name="kemal-native-whiteboard"]')?.getAttribute('content') === config.nonce;
  const agendaRequested = config.module === 'agenda' && config.bundledAgenda === true;
  const agenda = agendaRequested && document.querySelector('meta[name="kemal-native-agenda"]')?.getAttribute('content') === config.nonce;
  // Android may inject before the HTML marker has been parsed. The bundled
  // document runs its own bootstrap after that marker; never touch account storage.
  if ((bundledRequested && !bundled) || (agendaRequested && !agenda)) return;
  let hostAuth: any = null;
  if (agenda && config.webAgendaHost && window.parent !== window.self) {
    try { hostAuth = (window.parent as any)[config.webAgendaHost]?.connect(window, config.nonce); } catch { return; }
    if (!hostAuth) return;
  }
  if (!hostAuth && (window.top !== window.self || (location.origin !== config.origin && !((bundled || agenda) && location.href === 'about:blank')))) return;
  w.__KEMAL_MOBILE_APP__ = true;
  function post(type: string, payload: unknown = {}) {
    if (hostAuth) hostAuth.notify(type, payload);
    else w.ReactNativeWebView?.postMessage(JSON.stringify({ type, payload, nonce: config.nonce }));
  }
  try {
    if (!bundled) {
    const storedSession = localStorage.getItem(config.authKey);
    let legacyOwner: string | null = config.userId === null ? 'guest' : null;
    try { const id = storedSession && JSON.parse(storedSession)?.user?.id; if (typeof id === 'string') legacyOwner = id; } catch { /* Unowned data is archived rather than assigned to a different account. */ }
    if (agenda && !hostAuth) localStorage.removeItem(config.authKey);
    // Never retain a previous account's token if writing the new session fails.
    if (!agenda) {
      localStorage.removeItem(config.authKey);
      if (config.session) localStorage.setItem(config.authKey, JSON.stringify(config.session));
    }
    // Keep local agenda state separate for every account, including guest use.
    const ownerKey = 'kemal.mobile.agenda.owner';
    const owner = config.userId || 'guest';
    const previous = localStorage.getItem(ownerKey) || legacyOwner;
    for (const key of ['kemalOgretmenAjandasi.v1', 'ogretmen_plan_v2']) {
      if (previous !== owner) {
        const old = localStorage.getItem(key);
        if (old) localStorage.setItem('kemal.mobile.account.' + (previous || 'legacy') + '.' + key, old);
        const saved = localStorage.getItem('kemal.mobile.account.' + owner + '.' + key);
        if (saved) localStorage.setItem(key, saved); else localStorage.removeItem(key);
      }
    }
    localStorage.setItem(ownerKey, owner);
    const seed = config.agendaSeed;
    if (!w.__KEMAL_AGENDA_SEEDED__ && seed && seed.userId === config.userId && (agenda || /^\/ogretmen-ajandasi\/(?:index(?:\.html)?)?$/.test(location.pathname))) {
      const incoming = seed.agenda_state as any;
      if (incoming && Array.isArray(incoming.classes) && Array.isArray(incoming.students) && Array.isArray(incoming.exams)) {
        const agendaRaw = localStorage.getItem('kemalOgretmenAjandasi.v1');
        const plannerRaw = localStorage.getItem('ogretmen_plan_v2');
        let local: any = null, planner: any = null;
        try { local = agendaRaw ? JSON.parse(agendaRaw) : null; } catch { /* Retain malformed local data in the backup. */ }
        try { planner = plannerRaw ? JSON.parse(plannerRaw) : null; } catch { /* Retain malformed planner data in the backup. */ }
        const programHasLessons = Object.values(planner?.programs || {}).some((days: any) => Object.values(days || {}).some((items: any) => Array.isArray(items) && items.some(item => item?.ders && !item?.isHoliday)));
        const meaningful = Boolean(local?.students?.length || local?.exams?.length || local?.scheduleItems?.length || local?.calendarEvents?.length || local?.classes?.length > 1 || local?.classes?.some((item: any) => item?.name && item.name !== 'Sınıfım') || local?.teacher?.schoolName || local?.teacher?.photo || local?.teacher?.schoolLogo || planner?.etutler?.length || programHasLessons || Object.values(planner?.yillikPlanlar || {}).some((items: any) => Array.isArray(items) && items.length));
        const localTime = Date.parse(local?.updatedAt || '') || 0;
        const remoteTime = Date.parse(seed.client_updated_at || incoming.updatedAt || seed.updated_at) || 0;
        const baseKey = 'kemal.mobile.agenda.base.' + owner;
        if (!meaningful || localTime <= remoteTime) {
          if (agendaRaw || plannerRaw) localStorage.setItem('kemal.mobile.account.' + owner + '.seed-backup.latest', JSON.stringify({ agenda: agendaRaw, planner: plannerRaw }));
          localStorage.setItem('kemalOgretmenAjandasi.v1', JSON.stringify(incoming));
          if (seed.lesson_planner_state && typeof seed.lesson_planner_state === 'object') localStorage.setItem('ogretmen_plan_v2', JSON.stringify(seed.lesson_planner_state));
          else localStorage.removeItem('ogretmen_plan_v2');
          localStorage.setItem(baseKey, JSON.stringify({ revision: seed.updated_at }));
          w.__KEMAL_AGENDA_LOCAL_BASE__ = { revision: seed.updated_at, checked: true, preserved: false };
        } else {
          let base: any = null;
          try { base = JSON.parse(localStorage.getItem(baseKey) || 'null'); } catch { /* A missing/old baseline cannot authorize an overwrite. */ }
          const valid = base && (typeof base.revision === 'string' || base.revision === null);
          w.__KEMAL_AGENDA_LOCAL_BASE__ = { revision: valid ? base.revision : null, checked: Boolean(valid), preserved: true };
        }
        w.__KEMAL_AGENDA_SEEDED__ = true;
      }
    }
    localStorage.setItem('kemal-theme', config.dark ? 'dark' : 'light');
    }
  } catch {
    if (document.documentElement) document.documentElement.style.visibility = 'hidden';
    post('storageError');
    return;
  }
  const html = document.documentElement;
  if (!html) return;
  if (agenda) {
    // The app owns authentication. The embedded engine never stores a second
    // refresh token or starts another Auth session/refresh timer.
    if (hostAuth) w.kemalUserAuth = hostAuth;
    else {
      const source = config.session as any;
      w.__KEMAL_AGENDA_AUTH__ = { token: source?.access_token || '', user: source?.user || null, profile: config.profile || null };
      if (!w.__KEMAL_AGENDA_CLIENT__) w.__KEMAL_AGENDA_CLIENT__ = w.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        accessToken: async () => w.__KEMAL_AGENDA_AUTH__?.token || null,
      });
      if (!w.kemalUserAuth) w.kemalUserAuth = {
        ready: async () => ({ user: w.__KEMAL_AGENDA_AUTH__.user, profile: w.__KEMAL_AGENDA_AUTH__.profile }),
        getClient: () => w.__KEMAL_AGENDA_CLIENT__,
      };
    }
  }
  function protectAgendaCloud() {
    if (config.module !== 'agenda' || !config.userId || w.__KEMAL_AGENDA_CLOUD_GUARD__) return;
    w.__KEMAL_AGENDA_CLOUD_GUARD__ = true;
    // The currently published agenda uses upsert. Adapt that one table's writes
    // to compare-and-swap, so this APK also protects legacy activity documents.
    // Auth/session methods and every other Supabase table remain untouched.
    let checked = false;
    let revision: string | null = null;
    const localBase = w.__KEMAL_AGENDA_LOCAL_BASE__;
    let locked = Boolean(localBase?.preserved && !localBase?.checked);
    if (localBase?.checked) { checked = true; revision = localBase.revision; }
    const backupKey = 'kemalOgretmenAjandasi.v1.bulut-oncesi-yedek';
    let latestRead: { data: any; at: number; backup: string | null } | null = null;
    function remember(value: string | null) {
      checked = true; revision = value; locked = false;
      try { localStorage.setItem('kemal.mobile.agenda.base.' + config.userId, JSON.stringify({ revision })); } catch { /* A future mount safely refuses a write if its baseline cannot be persisted. */ }
    }
    function acceptExplicitCloudLoad() {
      if (!latestRead?.data?.updated_at) return;
      const raw = localStorage.getItem(backupKey);
      if (!raw || raw === latestRead.backup) return;
      try {
        const backup = JSON.parse(raw);
        // The legacy applyCloudRow writes this safety backup only after the user
        // accepts cloud hydration. A read alone must never rebase stale edits.
        if ((Date.parse(backup.savedBeforeCloudLoadAt || '') || 0) >= latestRead.at) remember(latestRead.data.updated_at);
      } catch { /* An invalid backup cannot authorize a rebase. */ }
    }
    const clients = new WeakMap<object, any>();
    function conflict(message: string) { return { data: null, error: { code: '409', message }, status: 409, statusText: 'Conflict' }; }
    function rejected(message: string): any {
      const result = conflict(message);
      const query: any = { select: () => query, maybeSingle: async () => result, then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) };
      return query;
    }
    function observe(query: any, context: { read?: boolean; scoped?: boolean; guarded?: boolean }): any {
      async function complete(work: any) {
        const result = await work;
        if (context.guarded && !result.error && !result.data) return conflict('Ajanda başka bir cihazda değişti. Yerel çalışmanız korundu; son bulut kaydını yükleyip yeniden deneyin.');
        if (!result.error && context.read && context.scoped) {
          latestRead = { data: result.data, at: Date.now(), backup: localStorage.getItem(backupKey) };
          if (!checked && !locked) {
            if (!result.data) remember(null);
            else if (typeof result.data.updated_at === 'string') remember(result.data.updated_at);
          }
        }
        if (!result.error && context.guarded) {
          if (typeof result.data?.updated_at === 'string') remember(result.data.updated_at);
          else { checked = false; revision = null; locked = true; }
        }
        return result;
      }
      return new Proxy(query, { get(target, key) {
        if (key === 'maybeSingle') return (...args: any[]) => complete(target.maybeSingle(...args));
        if (key === 'then') return (resolve: any, reject: any) => complete(target).then(resolve, reject);
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        return (...args: any[]) => {
          const next = value.apply(target, args);
          if (key === 'eq' && args[0] === 'user_id') context.scoped = args[1] === config.userId;
          return next && typeof next === 'object' ? observe(next, context) : next;
        };
      } });
    }
    function adaptClient(client: any) {
      if (!client || typeof client !== 'object' || typeof client.from !== 'function') return client;
      if (clients.has(client)) return clients.get(client);
      const adapted = new Proxy(client, { get(target, key) {
        if (key !== 'from') { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; }
        return (table: string) => {
          const builder = target.from(table);
          if (table !== 'teacher_agenda_states') return builder;
          return new Proxy(builder, { get(source, method) {
            if (method === 'upsert') return (payload: any) => {
              acceptExplicitCloudLoad();
              if (!checked) return rejected('Bulut sürümü henüz doğrulanmadı. Ajandayı yenileyip yeniden deneyin.');
              if (!payload || Array.isArray(payload) || payload.user_id !== config.userId) return rejected('Bu ajanda kaydı oturumdaki öğretmene ait değil.');
              const write = revision ? target.from(table).update(payload).eq('user_id', config.userId).eq('updated_at', revision) : target.from(table).insert(payload);
              return observe(write, { guarded: true, scoped: true });
            };
            if (method === 'select') return (...args: any[]) => observe(source.select(...args), { read: true, scoped: false });
            const value = Reflect.get(source, method); return typeof value === 'function' ? value.bind(source) : value;
          } });
        };
      } });
      clients.set(client, adapted); return adapted;
    }
    const adaptedAuth = new WeakSet<object>();
    function adaptAuth(auth: any) {
      if (!auth || typeof auth !== 'object' || typeof auth.getClient !== 'function' || adaptedAuth.has(auth)) return;
      const original = auth.getClient;
      auth.getClient = function(...args: any[]) { return adaptClient(original.apply(this, args)); };
      adaptedAuth.add(auth);
    }
    let auth = w.kemalUserAuth;
    adaptAuth(auth);
    const descriptor = Object.getOwnPropertyDescriptor(w, 'kemalUserAuth');
    if (!descriptor || descriptor.configurable) Object.defineProperty(w, 'kemalUserAuth', {
      configurable: true, enumerable: true, get: () => auth,
      set: value => { adaptAuth(value); auth = value; },
    });
  }
  protectAgendaCloud();
  html.classList.add('kemal-native');
  html.dataset.kemalNativeModule = config.module;
  html.dataset.theme = config.dark ? 'dark' : 'light';
  if (!document.getElementById('kemalNativeStyles')) {
    const style = document.createElement('style'); style.id = 'kemalNativeStyles';
    style.textContent = `
      html.kemal-native { -webkit-text-size-adjust:100%; overscroll-behavior:none; }
      .kemal-native #kemalNavMount,.kemal-native #kemalFooter,.kemal-native #shortcutDock,.kemal-native #announceBar,.kemal-native .theme-control-floating,.kemal-native .site-header,.kemal-native .site-footer,.kemal-native .site-nav,.kemal-native .site-account-bar,.kemal-native .skip-link { display:none!important; }
      .kemal-native body { padding-top:0!important; margin-top:0!important; }
      .kemal-native body.has-shortcut-dock { padding-bottom:0!important; }
      html.kemal-native[data-kemal-native-module="agenda"] { --ink:${config.dark ? '#EDF0F8' : '#222B42'};--muted:${config.dark ? '#A2AFC2' : '#737B8D'};--paper:${config.dark ? '#1B2230' : '#FFFFFF'};--cloud:${config.dark ? '#111620' : '#F7F8FC'};--mint:${config.dark ? '#29243A' : '#F0EDF8'};--mint-strong:${config.dark ? '#BB9AEF' : '#7654B7'};--shadow:none;--radius:18px; }
      .kemal-native[data-kemal-native-module="agenda"] body { background:var(--cloud)!important; }
      .kemal-native[data-kemal-native-module="agenda"] .app { min-height:100dvh; }
      .kemal-native[data-kemal-native-module="agenda"] .sidebar { top:0;height:auto; }
      @media(min-width:1021px) { .kemal-native[data-kemal-native-module="agenda"] .sidebar { height:100dvh; } }
      .kemal-native input,.kemal-native select,.kemal-native textarea { font-size:max(16px,1em); }
      .kemal-native .ho-hero,.kemal-native .exam-hero,.kemal-native .games-hero { padding-top:24px!important;padding-bottom:24px!important; }
      .kemal-native .ho-hero-em,.kemal-native .exam-hero-stats,.kemal-native .games-hero-note { display:none!important; }
      .kemal-native .ho-hero h1,.kemal-native .exam-hero-title,.kemal-native .games-hero h1 { font-size:clamp(26px,4vw,42px)!important; }
      .kemal-native #screenExam { height:100dvh!important; }
      .kemal-native .exam-layout,.kemal-native .exam-main { min-height:0; }
      .kemal-native .modal-box,.kemal-native dialog { max-width:calc(100vw - 16px)!important;max-height:calc(100dvh - 16px); }
      .kemal-native[data-kemal-native-module="whiteboard"] { touch-action:none; }
      .kemal-native[data-kemal-native-module="whiteboard"] .board-stage { height:100dvh; }
      @media(max-width:599px) {
        .kemal-native .sinif-grid,.kemal-native .exam-grade-grid { grid-template-columns:repeat(2,minmax(0,1fr))!important; }
        .kemal-native .metin-filter-panel,.kemal-native .exam-filter-panel { grid-template-columns:1fr!important; }
        .kemal-native .exam-grid,.kemal-native .metin-grid,.kemal-native .form-row-2,.kemal-native .form-row-3 { grid-template-columns:1fr!important; }
        .kemal-native .kitap-wrapper { max-width:100%;padding:0 12px; }
        .kemal-native .kitap-metin { padding:20px 16px;line-height:1.7; }
        .kemal-native .app { display:block!important; }
        .kemal-native .sidebar { position:static!important;width:auto!important;height:auto!important;min-height:0!important;padding:12px!important; }
        .kemal-native .sidebar .brand,.kemal-native .sidebar .side-card { display:none!important; }
        .kemal-native .sidebar .nav { display:flex!important;overflow-x:auto;gap:6px; }
        .kemal-native .sidebar .nav button { flex:0 0 auto;min-height:44px; }
        .kemal-native .app>.main { padding:12px!important;min-width:0; }
        .kemal-native .app .topbar { top:0!important;position:relative!important; }
        .kemal-native .app .grid.two,.kemal-native .app .grid.three,.kemal-native .app .form-grid,.kemal-native .app .topbar,.kemal-native .app .student-grid { grid-template-columns:1fr!important; }
        .kemal-native .table-wrap,.kemal-native .report-stage { overflow-x:auto;max-width:100%; }
      }
      @media print { .kemal-native #kemalNavMount {display:none!important;} }
    `;
    (document.head || html).appendChild(style);
  }
  if (w.__KEMAL_NATIVE_BRIDGE_INSTALLED__) return;
  w.__KEMAL_NATIVE_BRIDGE_INSTALLED__ = true;
  let lastGesture = 0;
  function installDeviceActions(surface: Document) {
  // In a desktop browser preview, its own download and print handlers apply.
  if (hostAuth) return;
  surface.addEventListener('pointerdown', () => { lastGesture = Date.now(); }, true);
  if (surface.defaultView) surface.defaultView.print = () => {
    if (Date.now() - lastGesture > 10000) return;
    const copy = surface.documentElement.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('script,iframe,noscript').forEach(node => node.remove());
    const base = surface.createElement('base'); base.href = surface.baseURI;
    copy.querySelector('head')?.prepend(base);
    post('print', { html: '<!doctype html>' + copy.outerHTML });
  };
  surface.addEventListener('click', async event => {
    const anchor = (event.target as Element)?.closest?.('a[download]') as HTMLAnchorElement | null;
    if (!anchor || Date.now() - lastGesture > 10000) return;
    if (!anchor.href.startsWith('blob:') && !anchor.href.startsWith('data:')) return;
    event.preventDefault();
    try {
      const blob = await (await fetch(anchor.href)).blob();
      if (blob.size > 15 * 1024 * 1024) { post('exportError'); return; }
      const reader = new FileReader();
      reader.onload = () => post('exportFile', { name: anchor.download, mime: blob.type, base64: String(reader.result).split(',')[1] || '' });
      reader.onerror = () => post('exportError'); reader.readAsDataURL(blob);
    } catch { post('exportError'); }
  }, true);
  }
  installDeviceActions(document);
  if (bundled) document.addEventListener('kemal-whiteboard-print', (event: Event) => {
    const value = (event as CustomEvent).detail;
    if (Date.now() - lastGesture > 10000 || typeof value !== 'string' || value.length > 6 * 1024 * 1024 || !/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value)) return;
    post('print', { html: '<!doctype html><html><body style="margin:0"><img style="max-width:100%;max-height:100vh" src="' + value + '"></body></html>' });
  });
  function adaptFrame(frame: HTMLIFrameElement) {
    try {
      if (!(agenda && frame.hasAttribute('srcdoc')) && new URL(frame.src, location.href).origin !== config.origin) return;
      const doc = frame.contentDocument;
      if (!doc || (!agenda && doc.location.origin !== config.origin) || doc.documentElement.dataset.kemalNativeSurface) return;
      doc.documentElement.dataset.kemalNativeSurface = '1';
      doc.documentElement.classList.add('kemal-native');
      doc.documentElement.dataset.theme = config.dark ? 'dark' : 'light';
      const style = document.getElementById('kemalNativeStyles')?.cloneNode(true);
      if (style) doc.head.appendChild(style);
      installDeviceActions(doc);
      if (agenda && config.agendaPath) {
        const requested = new URLSearchParams(config.agendaPath.split('?')[1] || '').get('plannerTab');
        if (requested && ['tab-program', 'tab-plan', 'tab-yukle', 'tab-tatil'].includes(requested) && typeof (frame.contentWindow as any)?.showTab === 'function') (frame.contentWindow as any).showTab(requested);
      }
    } catch { /* Third-party frames stay isolated and receive no session or styles. */ }
  }
  function watchFrames(root: ParentNode) {
    root.querySelectorAll<HTMLIFrameElement>('iframe').forEach(frame => {
      if (!frame.dataset.kemalNativeWatched) { frame.dataset.kemalNativeWatched = '1'; frame.addEventListener('load', () => adaptFrame(frame)); }
      adaptFrame(frame);
    });
  }
  function installWhiteboardLayout() {
    const canvas = document.getElementById('sandCanvas') as HTMLCanvasElement | null;
    const stage = document.getElementById('whiteboardStage') as HTMLElement | null;
    if (!canvas || !stage) return;
    // The website's sand canvas is initialized while the native WebView is still
    // settling its first portrait viewport. Re-run its existing size handler
    // after the sand layer becomes visible, without replacing any canvas or marks.
    let queued = false;
    function settle() {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        window.dispatchEvent(new Event('resize'));
      }, 32);
    }
    // The drawing surface owns its gesture, but the surrounding stage must keep
    // normal vertical scrolling in landscape. Otherwise Android WebView treats
    // the entire long board as a non-scrollable drawing target after rotation.
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.minHeight = '100%';
    stage.style.overflowY = 'auto';
    stage.style.overflowX = 'auto';
    stage.style.touchAction = 'pan-y';
    (stage.style as any).webkitOverflowScrolling = 'touch';
    canvas.style.touchAction = 'none';
    const bed = document.getElementById('sandboxBed');
    if (bed) bed.style.touchAction = 'none';
    let exit = document.getElementById('kemalNativeFullscreenExit') as HTMLButtonElement | null;
    if (!exit) {
      exit = document.createElement('button');
      exit.id = 'kemalNativeFullscreenExit';
      exit.type = 'button';
      exit.hidden = true;
      exit.textContent = '↙ Çık';
      exit.setAttribute('aria-label', 'Tam ekrandan çık');
      exit.style.cssText = 'position:absolute;top:12px;right:12px;z-index:2147483647;min-height:42px;padding:0 14px;border:1px solid rgba(255,255,255,.68);border-radius:14px;background:rgba(20,27,45,.48);color:#fff;font:700 14px system-ui,-apple-system,sans-serif;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 18px rgba(0,0,0,.22);';
      stage.appendChild(exit);
    }
    function syncExit() { if (exit) exit.hidden = !(document.fullscreenElement || (document as any).webkitFullscreenElement); }
    exit.addEventListener('click', () => {
      const leave = document.exitFullscreen || (document as any).webkitExitFullscreen;
      if (typeof leave === 'function') { try { leave.call(document); } catch { /* native focus still exits below */ } }
      post('exitFocus', { source: 'whiteboard-fullscreen' });
    });
    document.addEventListener('fullscreenchange', () => { syncExit(); settle(); });
    document.addEventListener('webkitfullscreenchange' as any, () => { syncExit(); settle(); });
    document.getElementById('sandGroupBtn')?.addEventListener('click', settle);
    window.visualViewport?.addEventListener('resize', settle);
    // Observe visibility and geometry, rather than waiting for a device rotation.
    if (typeof ResizeObserver !== 'undefined') {
      let size = '';
      new ResizeObserver(() => {
        const rect = canvas.getBoundingClientRect();
        const next = Math.round(rect.width) + ':' + Math.round(rect.height);
        if (rect.width > 3 && rect.height > 3 && next !== size) { size = next; settle(); }
      }).observe(canvas);
    }
    syncExit(); settle();
  }
  function ready() {
    // Run after the activity's own DOMContentLoaded setup has bound its controls.
    setTimeout(() => {
    watchFrames(document);
    if (config.module === 'whiteboard') installWhiteboardLayout();
    if (config.module === 'agenda') document.querySelectorAll<HTMLButtonElement>('.sidebar [data-view]').forEach(button => { button.textContent = (button.textContent || '').replace(/^[^\p{L}\p{N}]+/u, ''); });
    const query = new URLSearchParams(agenda && config.agendaPath ? config.agendaPath.split('?')[1] || '' : location.search);
    function selectExisting(id: string, value: string | null) {
      const select = document.getElementById(id) as HTMLSelectElement | null;
      if (value && select && Array.from(select.options).some(option => option.value === value)) { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    if (config.module === 'agenda') selectExisting('activeClassSelect', query.get('classId'));
    const view = query.get('mobileView');
    if (view && ['dashboardView','studentsView','examsView','scheduleView','calendarView','reportsView','backupView'].includes(view)) {
      const button = document.querySelector<HTMLButtonElement>('.sidebar [data-view="' + view + '"]'); button?.click();
    }
    const focusDate = query.get('focusDate');
    const parsedDate = focusDate && /^\d{4}-\d{2}-\d{2}$/.test(focusDate) ? new Date(focusDate + 'T12:00:00Z') : null;
    if (config.module === 'agenda' && focusDate && parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === focusDate) {
      const input = document.getElementById('lessonPlannerFocusDate') as HTMLInputElement | null;
      if (input) { input.value = focusDate; input.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    if (config.module === 'agenda' && view === 'reportsView') selectExisting('reportStudent', query.get('studentId'));
    const grade = Number(new URLSearchParams(location.search).get('grade'));
    if (location.pathname.startsWith('/hizli-okuma/') && Number.isInteger(grade) && grade >= 1 && grade <= 8) document.querySelector<HTMLButtonElement>('.sinif-btn[data-s="' + grade + '"]')?.click();
    }, 0);
    post('ready', { title: document.title });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
}

export {};
