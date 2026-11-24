// game.js — Roket Arena 3D (Enlarged 84x104m Stadium, True Open 3D Goal Pockets, 6 Balanced Cars w/ Active Specials, Day/Sunset/Night)

(() => {
  const { Vec3, Mat4, clamp, lerp, wrapAngle, lerpAngle, unprojectRay, raySphereIntersect } = Math3D;

  const PITCH_HALF_W = Engine3D.PITCH_HALF_W;   // 42.0m (84m wide!)
  const PITCH_HALF_L = Engine3D.PITCH_HALF_L;   // 52.0m (104m long!)
  const PAINT_ARENA_R = Engine3D.PAINT_ARENA_R; // 40.0m

  const P1_RIM = [0.14, 0.86, 1.0];
  const P2_RIM = [1.0, 0.54, 0.16];

  const BALLOON_PALETTE = [
    { rgb: [0.14, 0.82, 0.98], hex: '#0284c7' },
    { rgb: [0.98, 0.32, 0.56], hex: '#db2777' },
    { rgb: [0.22, 0.88, 0.48], hex: '#059669' },
    { rgb: [0.98, 0.68, 0.14], hex: '#d97706' },
    { rgb: [0.64, 0.36, 0.98], hex: '#7c3aed' },
  ];

  const GOAL_COLORS_EDU = [
    { rgb: [0.14, 0.86, 1.0], hex: '#22d3ee' },
    { rgb: [1.0, 0.80, 0.18], hex: '#ffd147' },
    { rgb: [0.96, 0.34, 0.72], hex: '#f472b6' },
  ];

  // ==================== PERSISTENT PREFERENCES ====================

  const DEFAULT_PREFS = {
    gameType: 'edu',        // 'edu' | 'fun'
    arenaVersion: 'soccer', // 'soccer' | 'paint'
    players: 1,             // 1 | 2
    nameP1: '',
    nameP2: '',
    carP1: 'gt',
    carP2: 'monster',
    theme: 'day',           // 'day' | 'sunset' | 'night'
    grade: 2,               // 2 | 3 | 4
    roundMode: 'ten',       // 'ten' | 'hundred' | 'mixed'
    questionCount: 12,      // 8 | 12 | 16
    diffEdu: 'easy',        // 'easy' | 'normal' | 'hard'
    diffFun: 'easy',
    funDuration: 90,        // 60 | 90 | 120
    speedPct: 100,          // 65..140
    musicOn: true,
    sfxOn: true,
    speechOn: true,
    musicVol: 48,
    sfxVol: 85,
    hintOn: true,
    touchMode: 'auto',      // 'auto' | 'on' | 'off'
    camMode: 0,             // 0: Klasik TPS | 1: Top Odaklı | 2: Geniş Stadyum
  };

  let prefs = Scoreboard.loadPrefs(DEFAULT_PREFS);
  if (prefs.grade === 2) prefs.roundMode = 'ten';

  // ==================== DOM REFERENCES ====================

  const $ = (id) => document.getElementById(id);
  const gameArea = $('main-content');
  const gameCanvas = $('gameCanvas');
  const overlayCanvas = $('overlayCanvas');
  const octx = overlayCanvas.getContext('2d');
  let topDown = false;

  const els = {
    startOverlay: $('startOverlay'),
    settingsOverlay: $('settingsOverlay'),
    scoreboardOverlay: $('scoreboardOverlay'),
    pauseOverlay: $('pauseOverlay'),
    endOverlay: $('endOverlay'),
    hudSingle: $('hudSingle'),
    hudSplit: $('hudSplit'),

    // Clean Entry Screen
    quickModeSelector: $('quickModeSelector'),
    quickVersionSelector: $('quickVersionSelector'),
    chipGrade: $('chipGrade'),
    chipPlayers: $('chipPlayers'),
    chipCar: $('chipCar'),
    chipWeather: $('chipWeather'),
    musicTitleLabel: $('musicTitleLabel'),
    musicHudLabel: $('musicHudLabel'),

    // 3-Tab Studio Modal
    settingsTabs: $('settingsTabs'),
    stabSetup: $('stabSetup'),
    stabGarage: $('stabGarage'),
    stabSystem: $('stabSystem'),
    gameTypeSelector: $('gameTypeSelector'),
    arenaVersionSelector: $('arenaVersionSelector'),
    playerCountSelector: $('playerCountSelector'),
    themeSelector: $('themeSelector'),
    inputNameP1: $('inputNameP1'),
    inputNameP2: $('inputNameP2'),
    inputWrapP2: $('inputWrapP2'),
    eduConfigPanel: $('eduConfigPanel'),
    funConfigPanel: $('funConfigPanel'),
    gradeSelector: $('gradeSelector'),
    roundTypeSelector: $('roundTypeSelector'),
    btnRoundHundred: $('btnRoundHundred'),
    btnRoundMixed: $('btnRoundMixed'),
    gradeRulePreview: $('gradeRulePreview'),
    questionCountSelector: $('questionCountSelector'),
    diffSelectorEdu: $('diffSelectorEdu'),
    funDurationSelector: $('funDurationSelector'),
    diffSelectorFun: $('diffSelectorFun'),
    soccerVerDesc: $('soccerVerDesc'),
    paintVerDesc: $('paintVerDesc'),
    titleFunBest: $('titleFunBest'),

    // Garage
    garagePlayerToggle: $('garagePlayerToggle'),
    carGarageGrid: $('carGarageGrid'),

    // 1P HUD
    singleModeTag: $('singleModeTag'),
    singleTimer: $('singleTimer'),
    sStat1Lbl: $('sStat1Lbl'),
    sStat1Val: $('sStat1Val'),
    sStat2Lbl: $('sStat2Lbl'),
    sStat2Val: $('sStat2Val'),
    sStat3Lbl: $('sStat3Lbl'),
    sStat3Val: $('sStat3Val'),
    singlePlayerName: $('singlePlayerName'),
    singleBestTag: $('singleBestTag'),
    singleProgressBar: $('singleProgressBar'),
    singlePowerStrip: $('singlePowerStrip'),
    singlePowerText: $('singlePowerText'),
    singlePowerTime: $('singlePowerTime'),

    eduQuestionBanner: $('eduQuestionBanner'),
    qbTypeBadge: $('qbTypeBadge'),
    qbStreakPill: $('qbStreakPill'),
    qbNumberDisplay: $('qbNumberDisplay'),
    qbSubHint: $('qbSubHint'),

    funSoccerBanner: $('funSoccerBanner'),
    funSoccerP1Name: $('funSoccerP1Name'),
    funSoccerP1Score: $('funSoccerP1Score'),
    funSoccerClock: $('funSoccerClock'),
    funSoccerP2Score: $('funSoccerP2Score'),
    funSoccerP2Name: $('funSoccerP2Name'),

    funPaintBanner: $('funPaintBanner'),
    funPaintClock: $('funPaintClock'),
    funPaintCombo: $('funPaintCombo'),
    singleControlHint: $('singleControlHint'),

    radarSingle: $('radarSingle'),
    actionMeterLabel: $('actionMeterLabel'),
    p1SpeedReadout: $('p1SpeedReadout'),
    p1TurboBar: $('p1TurboBar'),
    p1SpecialPill: $('p1SpecialPill'),
    p1SpecialTitle: $('p1SpecialTitle'),
    p1SpecialState: $('p1SpecialState'),
    p1ActionPill: $('p1ActionPill'),
    p1ActionTitle: $('p1ActionTitle'),
    p1ActionState: $('p1ActionState'),
    camModeLabel: $('camModeLabel'),
    touchSingle: $('touchSingle'),
    joyBase: $('joyBase'),
    joyKnob: $('joyKnob'),
    t1Reverse: $('t1Reverse'),
    t1Special: $('t1Special'),
    t1Turbo: $('t1Turbo'),
    t1Primary: $('t1Primary'),

    // 2P Split HUD
    splitModeTag: $('splitModeTag'),
    splitTimer: $('splitTimer'),
    splitEduBanner: $('splitEduBanner'),
    splitQbBadge: $('splitQbBadge'),
    splitQbNumber: $('splitQbNumber'),
    splitQbProgress: $('splitQbProgress'),
    sp1Name: $('sp1Name'),
    sp1ScoreBadge: $('sp1ScoreBadge'),
    sp1Detail: $('sp1Detail'),
    sp1SpecialTag: $('sp1SpecialTag'),
    sp1Turbo: $('sp1Turbo'),
    sp1KeysHint: $('sp1KeysHint'),
    radarP1: $('radarP1'),
    sp2Name: $('sp2Name'),
    sp2ScoreBadge: $('sp2ScoreBadge'),
    sp2Detail: $('sp2Detail'),
    sp2SpecialTag: $('sp2SpecialTag'),
    sp2Turbo: $('sp2Turbo'),
    sp2KeysHint: $('sp2KeysHint'),
    radarP2: $('radarP2'),
    touchSplitP1: $('touchSplitP1'),
    touchSplitP2: $('touchSplitP2'),

    // Toasts
    toastCenter: $('toastCenter'),
    toastLeft: $('toastLeft'),
    toastRight: $('toastRight'),

    // System Settings
    sliderSpeed: $('sliderSpeed'),
    setSpeedVal: $('setSpeedVal'),
    speedPresets: $('speedPresets'),
    swMusic: $('swMusic'),
    sliderMusicVol: $('sliderMusicVol'),
    setMusicVolVal: $('setMusicVolVal'),
    swSfx: $('swSfx'),
    sliderSfxVol: $('sliderSfxVol'),
    setSfxVolVal: $('setSfxVolVal'),
    swSpeech: $('swSpeech'),
    swHint: $('swHint'),
    touchModeSelector: $('touchModeSelector'),
    camSelector: $('camSelector'),

    // Scoreboard
    sbTabs: $('sbTabs'),
    sbListWrap: $('sbListWrap'),

    // End modal
    endBadge: $('endBadge'),
    endRecordBanner: $('endRecordBanner'),
    endTitle: $('endTitle'),
    endDesc: $('endDesc'),
    endSummarySingle: $('endSummarySingle'),
    endSummarySplit: $('endSummarySplit'),
    endStat1Lbl: $('endStat1Lbl'),
    endStat1Val: $('endStat1Val'),
    endStat2Lbl: $('endStat2Lbl'),
    endStat2Val: $('endStat2Val'),
    endStat3Lbl: $('endStat3Lbl'),
    endStat3Val: $('endStat3Val'),
    endStat4Lbl: $('endStat4Lbl'),
    endStat4Val: $('endStat4Val'),
    endP1Name: $('endP1Name'),
    endP1Val: $('endP1Val'),
    endP1Detail: $('endP1Detail'),
    endP2Name: $('endP2Name'),
    endP2Val: $('endP2Val'),
    endP2Detail: $('endP2Detail'),
  };

  // ==================== RUNTIME STATE ====================

  let modeState = 'menu'; // 'menu' | 'playing' | 'paused' | 'ended'
  let activeSettingsTab = 'setup';
  let activeGaragePlayer = 1; // 1 | 2
  let sbActiveTab = 'edu';
  let simTime = 0;
  let lastFrameMs = 0;

  let session = null;
  let renderedViews = [];

  const keys = new Set();
  const touchInput = {
    p1: { steer: 0, throttle: 0, turbo: false, primary: false, special: false },
    p2: { steer: 0, throttle: 0, turbo: false, primary: false, special: false },
  };
  const heldControls = new Set();
  let joyPointerId = null;

  // ==================== HELPERS ====================

  function formatClock(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function speedScale() {
    return clamp(prefs.speedPct / 100, 0.65, 1.40);
  }

  function speedWord(pct) {
    if (pct <= 80) return 'Yavaş';
    if (pct >= 120) return 'Hızlı';
    return 'Normal';
  }

  function themeLabel(t) {
    if (t === 'sunset') return '🌅 Gün Batımı';
    if (t === 'night') return '🌙 Gece Stadyumu';
    return '☀️ Gündüz';
  }

  function isTouchVisible() {
    if (prefs.touchMode === 'on') return true;
    if (prefs.touchMode === 'off') return false;
    return navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showToast(text, kind = 'good', side = 'center', duration = 2200) {
    const host = side === 'left' ? els.toastLeft : side === 'right' ? els.toastRight : els.toastCenter;
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast-msg ${kind}`;
    el.textContent = text;
    host.appendChild(el);
    while (host.children.length > 2) host.removeChild(host.firstChild);
    setTimeout(() => {
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  function addBannerSplash(text, color = '#ffd147', duration = 1.3) {
    if (!session) return;
    session.bannerText = text;
    session.bannerColor = color;
    session.bannerTimer = duration;
    session.bannerMax = duration;
  }

  function addCameraShake(amount) {
    if (!session) return;
    session.camShake = Math.min(1.6, Math.max(session.camShake || 0, amount));
  }

  function spawnParticles(pos, color, count = 24, speed = 14, shape = 'sphere', upward = 6) {
    if (!session) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      const col = Array.isArray(color[0])
        ? color[i % color.length]
        : [
            clamp(color[0] + (Math.random() - 0.5) * 0.16, 0, 1),
            clamp(color[1] + (Math.random() - 0.5) * 0.16, 0, 1),
            clamp(color[2] + (Math.random() - 0.5) * 0.16, 0, 1),
          ];
      session.particles.push({
        pos: [pos[0], pos[1], pos[2]],
        vel: [Math.cos(a) * spd, upward + Math.random() * speed * 0.7, Math.sin(a) * spd],
        color: col,
        size: 0.30 + Math.random() * 0.44,
        rot: Math.random() * 6.28,
        vrot: (Math.random() - 0.5) * 10,
        life: 0.55 + Math.random() * 0.65,
        maxLife: 1.2,
        shape,
      });
    }
    if (session.particles.length > 360) session.particles.splice(0, session.particles.length - 360);
  }

  function spawnConfettiBurst(pos, count = 56) {
    const palette = [
      [0.16, 0.88, 1.0],
      [1.0, 0.82, 0.20],
      [0.24, 0.92, 0.54],
      [0.98, 0.34, 0.64],
      [1.0, 0.54, 0.18],
    ];
    spawnParticles(pos, palette, count, 20, 'box', 11);
  }

  function spawnShockwave(pos, color, startR = 1.6, endR = 13.0, dur = 0.55) {
    if (!session) return;
    session.shockwaves.push({
      pos: [pos[0], Math.max(0.25, pos[1]), pos[2]],
      color,
      startR,
      endR,
      life: dur,
      maxLife: dur,
    });
  }

  function addFloorSplatter(x, z, color, size = 5.2) {
    if (!session) return;
    const r = Math.hypot(x, z);
    if (r > PAINT_ARENA_R - 2.5) {
      const s = (PAINT_ARENA_R - 2.5) / r;
      x *= s;
      z *= s;
    }
    session.splatters.push({
      x,
      z,
      size: size * (0.85 + Math.random() * 0.35),
      rot: Math.random() * Math.PI * 2,
      seed: Math.random() * 100,
      color: [color[0], color[1], color[2]],
      color2: [clamp(color[0] * 1.2 + 0.1, 0, 1), clamp(color[1] * 1.2 + 0.1, 0, 1), clamp(color[2] * 1.2 + 0.1, 0, 1)],
      alpha: 0.90,
      layer: session.splatters.length % 40,
    });
    if (session.splatters.length > 64) session.splatters.shift();
  }

  // ==================== UI SYNC & GARAGE RENDERER ====================

  function applyAudioPrefs() {
    SoundFX.setMusicEnabled(prefs.musicOn);
    SoundFX.setSfxEnabled(prefs.sfxOn);
    SoundFX.setSpeechEnabled(prefs.speechOn);
    SoundFX.setMusicVolume(prefs.musicVol / 100);
    SoundFX.setSfxVolume(prefs.sfxVol / 100);
    els.musicTitleLabel.textContent = `Müzik: ${prefs.musicOn ? 'Açık' : 'Kapalı'}`;
    els.musicHudLabel.textContent = prefs.musicOn ? 'Açık' : 'Kapalı';
  }

  function renderCarGarage() {
    const cars = CarCatalog.getAll();
    const selectedId = activeGaragePlayer === 2 ? prefs.carP2 : prefs.carP1;
    els.garagePlayerToggle.classList.toggle('hidden', prefs.players !== 2);
    els.garagePlayerToggle.querySelectorAll('.opt-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.gplayer) === activeGaragePlayer);
    });

    const isPaint = prefs.arenaVersion === 'paint';
    els.carGarageGrid.innerHTML = cars
      .map((car) => {
        const isSel = car.id === selectedId;
        const specDesc = isPaint ? car.special.paintDesc : car.special.soccerDesc;
        return `
          <button class="car-card ${isSel ? 'selected' : ''}" data-carid="${car.id}" style="--car-accent:${car.hex}">
            <div class="car-head">
              <div class="car-badge-ico">${car.icon}</div>
              <div class="car-title-wrap">
                <strong>${escapeHtml(car.name)}</strong>
                <small>${escapeHtml(car.tag)}</small>
              </div>
              ${isSel ? '<span class="car-selected-tag">SEÇİLİ ✓</span>' : ''}
            </div>
            <div class="car-stats-mini">
              <div class="c-stat"><span>Hız</span><div class="c-bar-track"><div class="c-bar-fill" style="width:${(car.bars.speed / 5) * 100}%"></div></div></div>
              <div class="c-stat"><span>İvme</span><div class="c-bar-track"><div class="c-bar-fill" style="width:${(car.bars.accel / 5) * 100}%"></div></div></div>
              <div class="c-stat"><span>Kontrol</span><div class="c-bar-track"><div class="c-bar-fill" style="width:${(car.bars.control / 5) * 100}%"></div></div></div>
              <div class="c-stat"><span>Şut</span><div class="c-bar-track"><div class="c-bar-fill" style="width:${(car.bars.power / 5) * 100}%"></div></div></div>
            </div>
            <div class="car-special-box">
              <strong>${car.special.icon} Özel Güç: ${escapeHtml(car.special.name)}</strong>
              <p>${escapeHtml(specDesc)}</p>
            </div>
          </button>
        `;
      })
      .join('');
  }

  function switchSettingsTab(tabName) {
    activeSettingsTab = tabName;
    els.settingsTabs.querySelectorAll('.m-tab').forEach((t) => t.classList.toggle('active', t.dataset.stab === tabName));
    els.stabSetup.classList.toggle('hidden', tabName !== 'setup');
    els.stabGarage.classList.toggle('hidden', tabName !== 'garage');
    els.stabSystem.classList.toggle('hidden', tabName !== 'system');
    if (tabName === 'garage') renderCarGarage();
  }

  function syncAllUI() {
    if (prefs.grade === 2) prefs.roundMode = 'ten';
    Engine3D.setTheme(prefs.theme);

    // Quick Entry Screen Pills
    els.quickModeSelector.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.gametype === prefs.gameType));
    els.quickVersionSelector.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.version === prefs.arenaVersion));

    // Entry Screen Compact Setup Summary Chips
    const c1 = CarCatalog.getById(prefs.carP1);
    const c2 = CarCatalog.getById(prefs.carP2);
    if (prefs.gameType === 'edu') {
      const rt = prefs.roundMode === 'ten' ? 'Onluk' : prefs.roundMode === 'hundred' ? 'Yüzlük' : 'Karışık';
      els.chipGrade.textContent = `🎓 ${prefs.grade}. Sınıf • ${rt} (${prefs.questionCount} Soru)`;
    } else {
      els.chipGrade.textContent = `🎮 ${prefs.funDuration} sn • ${prefs.diffFun === 'easy' ? 'Kolay' : prefs.diffFun === 'normal' ? 'Orta' : 'Zor'}`;
    }
    els.chipPlayers.textContent = prefs.players === 2 ? '👥 2 Oyuncu (İkili Ekran)' : '👤 1 Oyuncu';
    els.chipCar.textContent = prefs.players === 2
      ? `${c1.icon} ${c1.name} vs ${c2.icon} ${c2.name}`
      : `${c1.icon} ${c1.name} (${c1.special.icon} ${c1.special.name})`;
    els.chipWeather.textContent = themeLabel(prefs.theme);

    // Settings Modal Tab 1 Controls
    els.gameTypeSelector.querySelectorAll('.pillar-card').forEach((b) => b.classList.toggle('active', b.dataset.gametype === prefs.gameType));
    els.arenaVersionSelector.querySelectorAll('.version-card').forEach((b) => b.classList.toggle('active', b.dataset.version === prefs.arenaVersion));
    els.eduConfigPanel.classList.toggle('hidden', prefs.gameType !== 'edu');
    els.funConfigPanel.classList.toggle('hidden', prefs.gameType !== 'fun');

    els.soccerVerDesc.textContent = prefs.gameType === 'edu'
      ? 'Geniş 3D stadyumda dev topu doğru yuvarlama kalesine şutla!'
      : 'Geniş 3D stadyumda 1v1 veya AI Bot ile Roket Futbol maçı!';
    els.paintVerDesc.textContent = prefs.gameType === 'edu'
      ? '3D boya topunla nişan al veya dokun, doğru yuvarlama balonunu patlat!'
      : 'Boya Festivalinde altın yıldız ve gökkuşağı balonlarıyla rekor kır!';

    els.playerCountSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.players) === prefs.players));
    els.themeSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', b.dataset.theme === prefs.theme));
    els.inputWrapP2.classList.toggle('hidden', prefs.players !== 2);
    els.inputNameP1.value = prefs.nameP1 || '';
    els.inputNameP2.value = prefs.nameP2 || '';
    if (prefs.players === 1) activeGaragePlayer = 1;

    // Grade & Strict Grade 2 Lock
    const gMeta = RoundingEdu.getGradeMeta(prefs.grade);
    els.gradeSelector.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.grade) === prefs.grade));
    els.btnRoundHundred.disabled = !gMeta.allowHundred;
    els.btnRoundMixed.disabled = !gMeta.allowHundred;
    els.btnRoundHundred.classList.toggle('locked', !gMeta.allowHundred);
    els.btnRoundMixed.classList.toggle('locked', !gMeta.allowHundred);
    els.roundTypeSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', b.dataset.rtype === prefs.roundMode));

    if (prefs.grade === 2) {
      els.gradeRulePreview.textContent = "2. Sınıf: 100'e kadar sadece onluğa yuvarlama (Örn: 47 → 50)";
    } else if (prefs.grade === 3) {
      els.gradeRulePreview.textContent = "3. Sınıf: 1.000'e kadar onluğa & yüzlüğe yuvarlama (Örn: 347 → 350 / 300)";
    } else {
      els.gradeRulePreview.textContent = "4. Sınıf: 10.000'e kadar onluğa & yüzlüğe yuvarlama (Örn: 4.367 → 4.370 / 4.400)";
    }

    els.questionCountSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.qcount) === prefs.questionCount));
    els.diffSelectorEdu.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', b.dataset.diff === prefs.diffEdu));
    els.funDurationSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.dur) === prefs.funDuration));
    els.diffSelectorFun.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', b.dataset.diff === prefs.diffFun));
    els.titleFunBest.textContent = Scoreboard.getBest('fun');

    // Tab 3 System Controls
    els.sliderSpeed.value = prefs.speedPct;
    els.setSpeedVal.textContent = `%${prefs.speedPct} (${speedWord(prefs.speedPct)})`;
    els.swMusic.classList.toggle('on', prefs.musicOn);
    els.swSfx.classList.toggle('on', prefs.sfxOn);
    els.swSpeech.classList.toggle('on', prefs.speechOn);
    els.swHint.classList.toggle('on', prefs.hintOn);
    els.sliderMusicVol.value = prefs.musicVol;
    els.setMusicVolVal.textContent = `%${prefs.musicVol}`;
    els.sliderSfxVol.value = prefs.sfxVol;
    els.setSfxVolVal.textContent = `%${prefs.sfxVol}`;
    els.touchModeSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', b.dataset.touch === prefs.touchMode));
    els.camSelector.querySelectorAll('.opt-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.cam) === prefs.camMode));

    const camNames = ['KLASİK TPS', 'TOP ODAKLI', 'GENİŞ STADYUM'];
    els.camModeLabel.textContent = camNames[prefs.camMode] || 'KLASİK TPS';

    if (activeSettingsTab === 'garage') renderCarGarage();
    applyAudioPrefs();
    Scoreboard.savePrefs(prefs);
  }

  function renderScoreboardList() {
    const list = Scoreboard.getList(sbActiveTab);
    els.sbTabs.querySelectorAll('.sb-tab').forEach((t) => t.classList.toggle('active', t.dataset.sbtab === sbActiveTab));
    if (!list.length) {
      els.sbListWrap.innerHTML = `<div class="sb-empty">Henüz kayıtlı skor yok.<br/>Hemen arenaya gir ve ilk rekoru sen kır! 🏆</div>`;
      return;
    }
    els.sbListWrap.innerHTML = list
      .map((item, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        return `
          <div class="sb-row ${i === 0 ? 'top1' : ''}">
            <div class="sb-rank">${medal}</div>
            <div class="sb-info">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.variant || '')} &bull; ${escapeHtml(item.detail || '')} &bull; ${escapeHtml(item.date || '')}</small>
            </div>
            <div class="sb-score">${escapeHtml(item.score)}</div>
          </div>
        `;
      })
      .join('');
  }

  // ==================== SESSION CREATION ====================

  function makeCar(id, x, z, yaw, spec, teamRim, name, isAI = false, forceAltColor = false) {
    const bodyCol = forceAltColor ? [1.0, 0.46, 0.14] : spec.color;
    return {
      id,
      name,
      isAI,
      spec,
      bodyStyle: spec.bodyStyle,
      stats: spec.stats,
      special: spec.special,
      specialCooldown: 0,
      overdriveTimer: 0,
      slowFieldTimer: 0,
      pos: [x, 0, z],
      vel: [0, 0, 0],
      yaw,
      pitch: 0,
      roll: 0,
      steerInput: 0,
      wheelSpin: 0,
      turbo: 100,
      boosting: false,
      jumpCooldown: 0,
      onGround: true,
      color: bodyCol,
      accent: spec.accent,
      teamRim,
      score: 0,
      goals: 0,
      streak: 0,
      bestStreak: 0,
      superTurboTimer: 0,
      magnetTimer: 0,
      camPos: [x - Math.sin(yaw) * 16, 8.2, z - Math.cos(yaw) * 16],
      camTarget: [x, 2.2, z],
      curFov: 58,
    };
  }

  function makeRover(id, x, z, yaw, spec, name) {
    return {
      id,
      name,
      spec,
      special: spec.special,
      specialCooldown: 0,
      pos: [x, 0, z],
      vel: [0, 0, 0],
      yaw,
      aimYaw: yaw,
      aimPitch: 0.14,
      aimDist: 26,
      lockedTarget: null,
      fireCooldown: 0,
      recoil: 0,
      color: id === 1 && prefs.carP1 === prefs.carP2 ? [1.0, 0.48, 0.16] : spec.color,
      accent: spec.accent,
      nextPaintColor: BALLOON_PALETTE[id === 0 ? 0 : 1].rgb,
      paintIdx: id * 2,
      score: 0,
      hits: 0,
      streak: 0,
      bestStreak: 0,
      rapidTimer: 0,
      camPos: [x - Math.sin(yaw) * 13, 8.0, z - Math.cos(yaw) * 13],
      camTarget: [0, 4.5, -5],
    };
  }

  function createBoostPads() {
    return [
      { x: -38, z: -42, yaw: 0, ready: true, timer: 0 },
      { x:  38, z: -42, yaw: 0, ready: true, timer: 0 },
      { x: -42, z: -18, yaw: 0, ready: true, timer: 0 },
      { x:  42, z: -18, yaw: 0, ready: true, timer: 0 },
      { x: -44, z:   0, yaw: 0, ready: true, timer: 0 },
      { x:  44, z:   0, yaw: 0, ready: true, timer: 0 },
      { x: -42, z:  18, yaw: 0, ready: true, timer: 0 },
      { x:  42, z:  18, yaw: 0, ready: true, timer: 0 },
      { x: -38, z:  42, yaw: 0, ready: true, timer: 0 },
      { x:  38, z:  42, yaw: 0, ready: true, timer: 0 },
    ];
  }

  function createJumpPads() {
    return [
      { x: -44, z: -28, cooldown: 0 },
      { x:  44, z: -28, cooldown: 0 },
      { x: -44, z:  28, cooldown: 0 },
      { x:  44, z:  28, cooldown: 0 },
    ];
  }

  function createGoalkeepers(isEdu, isSplit, diff) {
    if (!isEdu) {
      // Fun Mode: Readable rhythmic 3D Hover-Goalkeepers guarding both goals!
      // Blocks lazy straight shots; players time & angle shots into the open corner to score!
      const freq = diff === 'easy' ? 1.10 : diff === 'normal' ? 1.50 : 1.95;
      return [
        {
          id: 0,
          mode: 'goal',
          x: 0,
          z: -PITCH_HALF_L + 3.4,
          minX: -4.6,
          maxX:  4.6,
          width: 3.2,
          height: 3.9,
          freq,
          facingSouth: true,
          color: P2_RIM,
          saveFlash: 0,
          saveCooldown: 0,
          phase: 0,
        },
        {
          id: 1,
          mode: 'goal',
          x: 0,
          z: PITCH_HALF_L - 3.4,
          minX: -4.6,
          maxX:  4.6,
          width: 3.2,
          height: 3.9,
          freq,
          facingSouth: false,
          color: P1_RIM,
          saveFlash: 0,
          saveCooldown: 0,
          phase: 2.2,
        },
      ];
    }
    // Education Mode: Patrolling penalty-box defender in 2-Player races & Orta/Zor difficulties!
    if (isSplit || diff !== 'easy') {
      const patrolSpd = diff === 'hard' ? 14.5 : diff === 'normal' ? 11.0 : 8.5;
      return [
        {
          id: 0,
          mode: 'patrol',
          x: 0,
          z: -PITCH_HALF_L + 6.8,
          minX: -36.0,
          maxX:  36.0,
          width: 4.8,
          height: 3.9,
          speed: patrolSpd,
          dir: 1,
          facingSouth: true,
          color: [1.0, 0.78, 0.22],
          saveFlash: 0,
          saveCooldown: 0,
          phase: 0,
        },
      ];
    }
    return [];
  }

  function startSession() {
    resetControls();
    SoundFX.ensure();
    SoundFX.playWhistle();
    SoundFX.setMusicIntensity(prefs.gameType);
    Engine3D.setTheme(prefs.theme);
    RoundingEdu.resetHistory();

    const p1Name = (els.inputNameP1.value || '').trim() || '1. Oyuncu';
    const p2Name = (els.inputNameP2.value || '').trim() || (prefs.players === 2 ? '2. Oyuncu' : 'Roket Bot');
    prefs.nameP1 = (els.inputNameP1.value || '').trim();
    prefs.nameP2 = (els.inputNameP2.value || '').trim();
    Scoreboard.savePrefs(prefs);

    const isEdu = prefs.gameType === 'edu';
    const isPaint = prefs.arenaVersion === 'paint';
    const isSplit = prefs.players === 2;
    const diff = isEdu ? prefs.diffEdu : prefs.diffFun;

    const specP1 = CarCatalog.getById(prefs.carP1);
    const specP2 = isSplit
      ? CarCatalog.getById(prefs.carP2)
      : CarCatalog.getById(prefs.carP1 === 'monster' ? 'formula' : 'monster');
    const sameCar = isSplit && specP1.id === specP2.id;

    session = {
      isEdu,
      isPaint,
      isSplit,
      diff,
      grade: prefs.grade,
      roundMode: prefs.grade === 2 ? 'ten' : prefs.roundMode,
      totalQuestions: prefs.questionCount,
      questionIndex: 0,
      wrongOnCurrent: 0,
      totalWrongs: 0,
      correctCount: 0,
      currentQuestion: null,

      elapsed: 0,
      timeLeft: isEdu ? 0 : prefs.funDuration,
      countdown: 1.8,
      kickoffResetTimer: 0,
      kickoffCalmTimer: 1.65,
      kickoffSide: 1,
      goalScoredLocked: false,
      camShake: 0,
      bannerText: 'HAZIR OL!',
      bannerColor: '#22d3ee',
      bannerTimer: 1.5,
      bannerMax: 1.5,

      cars: [],
      ball: null,
      goals: [],
      keepers: isPaint ? [] : createGoalkeepers(isEdu, isSplit, diff),
      boostPads: isPaint ? [] : createBoostPads(),
      jumpPads: isPaint ? [] : createJumpPads(),
      powerUps: [],
      powerUpSpawnTimer: 6.5,
      lastBallTouchCarId: 0,

      rovers: [],
      balloons: [],
      paintballs: [],
      splatters: [],
      freezeTimer: 0,
      balloonSpawnTimer: 0.4,

      skidMarks: [],
      particles: [],
      shockwaves: [],
    };

    if (!isPaint) {
      if (isEdu) {
        // 3 Balanced Pro Goals along North Wall (Z = -72, grand 108m x 144m stadium!)
        const xs = [-31.0, 0.0, 31.0];
        session.goals = xs.map((gx, idx) => ({
          id: idx,
          x: gx,
          z: -PITCH_HALF_L,
          width: 12.4,
          height: 6.2,
          depth: 7.0,
          facingSouth: true,
          color: GOAL_COLORS_EDU[idx].rgb,
          hex: GOAL_COLORS_EDU[idx].hex,
          labelSlot: idx,
          answerVal: 0,
          isCorrect: false,
          flash: 0,
          hintGlow: 0,
        }));

        if (isSplit) {
          session.cars.push(makeCar(0, -16.0, 48, Math.PI, specP1, P1_RIM, p1Name, false, false));
          session.cars.push(makeCar(1,  16.0, 48, Math.PI, specP2, P2_RIM, p2Name, false, sameCar));
        } else {
          session.cars.push(makeCar(0, 0, 48, Math.PI, specP1, P1_RIM, p1Name, false, false));
        }
      } else {
        // Fun Mode 2 Challenging Pro Stadium Goals (North & South, 16.4m x 6.2m + 3D Goalkeepers!)
        session.goals = [
          {
            id: 0,
            teamOwner: 1, // P1 scores HERE (North)
            x: 0,
            z: -PITCH_HALF_L,
            width: 16.4,
            height: 6.2,
            depth: 7.6,
            facingSouth: true,
            color: P2_RIM,
            labelSlot: -1,
            flash: 0,
            hintGlow: 0,
          },
          {
            id: 1,
            teamOwner: 0, // P2 / AI scores HERE (South)
            x: 0,
            z: PITCH_HALF_L,
            width: 16.4,
            height: 6.2,
            depth: 7.6,
            facingSouth: false,
            color: P1_RIM,
            labelSlot: -1,
            flash: 0,
            hintGlow: 0,
          },
        ];

        const p1Yaw = Math.atan2(15.0, -48.0);
        const p2Yaw = Math.atan2(-15.0, 48.0);
        session.cars.push(makeCar(0, -15.0,  48.0, p1Yaw, specP1, P1_RIM, p1Name, false, false));
        session.cars.push(makeCar(1,  15.0, -48.0, p2Yaw, specP2, P2_RIM, isSplit ? p2Name : `${specP2.name} Bot`, !isSplit, sameCar));
      }

      for (const c of session.cars) {
        c.specialCooldown = 3.2; // Prevent frame-0 special kickoff cheese
        c.turbo = 55;
      }

      session.ball = {
        pos: [0, 2.5, isEdu ? 18.0 : 0.0],
        vel: [0, 0, 0],
        radius: 2.35,
        baseRadius: 2.35,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        giantTimer: 0,
        slowTimer: 0,
      };
    } else {
      if (isSplit) {
        session.rovers.push(makeRover(0, -9.5, 25.0, Math.PI, specP1, p1Name));
        session.rovers.push(makeRover(1,  9.5, 25.0, Math.PI, specP2, p2Name));
      } else {
        session.rovers.push(makeRover(0, 0, 25.0, Math.PI, specP1, p1Name));
      }
    }

    if (isEdu) {
      loadNextRoundingQuestion(true);
    } else if (isPaint) {
      for (let i = 0; i < 7; i++) spawnFunBalloon();
    }

    modeState = 'playing';
    els.startOverlay.classList.add('hidden');
    els.pauseOverlay.classList.add('hidden');
    els.endOverlay.classList.add('hidden');
    els.settingsOverlay.classList.add('hidden');
    els.scoreboardOverlay.classList.add('hidden');

    setupHudLayout();
    updateHudValues();
    gameCanvas.focus({ preventScroll: true });
  }

  function setupHudLayout() {
    const s = session;
    els.hudSingle.classList.toggle('hidden', s.isSplit);
    els.hudSplit.classList.toggle('hidden', !s.isSplit);

    const showTouch = isTouchVisible();
    els.touchSingle.classList.toggle('hidden', s.isSplit || !showTouch);
    els.touchSplitP1.classList.toggle('hidden', !s.isSplit || !showTouch);
    els.touchSplitP2.classList.toggle('hidden', !s.isSplit || !showTouch);

    if (!s.isSplit) {
      els.eduQuestionBanner.classList.toggle('hidden', !s.isEdu);
      els.funSoccerBanner.classList.toggle('hidden', s.isEdu || s.isPaint);
      els.funPaintBanner.classList.toggle('hidden', s.isEdu || !s.isPaint);

      const p1 = s.isPaint ? s.rovers[0] : s.cars[0];
      els.singlePlayerName.textContent = `${p1.spec.icon} ${p1.name}`;
      els.singleBestTag.textContent = `🏆 Rekor: ${Scoreboard.getBest(s.isEdu ? 'edu' : 'fun')}`;
      els.p1SpecialTitle.innerHTML = `${p1.special.icon} ${p1.special.name.toUpperCase()} <kbd>E</kbd>`;
      els.t1Special.textContent = `${p1.special.icon} ÖZEL`;

      if (s.isEdu) {
        const rtTxt = s.roundMode === 'ten' ? 'ONLUK' : s.roundMode === 'hundred' ? 'YÜZLÜK' : 'KARIŞIK';
        els.singleModeTag.textContent = `${s.grade}. SINIF • ${rtTxt}`;
        els.singleModeTag.classList.remove('fun');
        els.sStat1Lbl.textContent = 'PUAN';
        els.sStat2Lbl.textContent = 'SORU';
        els.sStat3Lbl.textContent = 'SERİ';
      } else {
        els.singleModeTag.textContent = s.isPaint ? 'BOYA FESTİVALİ' : 'ROKET FUTBOL';
        els.singleModeTag.classList.add('fun');
        els.sStat1Lbl.textContent = s.isPaint ? 'SKOR' : 'GOLLER';
        els.sStat2Lbl.textContent = s.isPaint ? 'İSABET' : 'RAKİP';
        els.sStat3Lbl.textContent = s.isPaint ? 'KOMBO' : 'PUAN';
      }

      if (s.isPaint) {
        els.singleControlHint.innerHTML = '<strong>Fare / Dokun</strong> Nişan &amp; Ateş &bull; <strong>A/D</strong> Dön &bull; <strong>Space</strong> Ateş &bull; <strong>E</strong> Özel Güç';
        els.actionMeterLabel.innerHTML = 'BOYA ENERJİSİ <kbd>Shift</kbd>';
        els.p1ActionTitle.innerHTML = 'BOYA FIRLAT <kbd>Space</kbd>';
        els.t1Primary.textContent = 'ATEŞ';
        els.t1Turbo.textContent = 'HIZLI';
      } else {
        els.singleControlHint.innerHTML = '<strong>W/S</strong> Gaz &bull; <strong>A/D</strong> Dön &bull; <strong>Shift</strong> Turbo &bull; <strong>Space</strong> Zıpla &bull; <strong>E</strong> Özel Güç';
        els.actionMeterLabel.innerHTML = 'ROKET TURBO <kbd>Shift</kbd>';
        els.p1ActionTitle.innerHTML = 'ZIPLA / ŞUT <kbd>Space</kbd>';
        els.t1Primary.textContent = 'ZIPLA';
        els.t1Turbo.textContent = 'TURBO';
      }

      if (!s.isEdu && !s.isPaint) {
        els.funSoccerP1Name.textContent = p1.name.slice(0, 10).toUpperCase();
        els.funSoccerP2Name.textContent = s.cars[1].name.slice(0, 10).toUpperCase();
      }
    } else {
      const p1 = s.isPaint ? s.rovers[0] : s.cars[0];
      const p2 = s.isPaint ? s.rovers[1] : s.cars[1];
      els.sp1Name.textContent = `${p1.spec.icon} ${p1.name}`;
      els.sp2Name.textContent = `${p2.spec.icon} ${p2.name}`;
      els.splitEduBanner.classList.toggle('hidden', !s.isEdu);

      els.splitModeTag.textContent = s.isEdu
        ? `${s.grade}. SINIF YARIŞI`
        : s.isPaint ? '🎨 BOYA DÜELLOSU' : '⚽ 1v1 ROKET MAÇI';

      if (s.isPaint) {
        els.sp1KeysHint.innerHTML = '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <strong>Sol Dokun</strong> &bull; <kbd>Space</kbd> Ateş &bull; <kbd>E</kbd> Özel';
        els.sp2KeysHint.innerHTML = '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> / <strong>Sağ Dokun</strong> &bull; <kbd>Enter</kbd> Ateş &bull; <kbd>K</kbd> Özel';
        $('tp1Primary').textContent = 'ATEŞ';
        $('tp2Primary').textContent = 'ATEŞ';
      } else {
        els.sp1KeysHint.innerHTML = '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> &bull; <kbd>Shift</kbd> Turbo &bull; <kbd>Space</kbd> Zıpla &bull; <kbd>E</kbd> Özel';
        els.sp2KeysHint.innerHTML = '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> &bull; <kbd>M</kbd> Turbo &bull; <kbd>Enter</kbd> Zıpla &bull; <kbd>K</kbd> Özel';
        $('tp1Primary').textContent = 'ZIPLA';
        $('tp2Primary').textContent = 'ZIPLA';
      }
    }
  }

  // ==================== ROUNDING QUESTION FLOW ====================

  function loadNextRoundingQuestion(isFirst = false) {
    const s = session;
    const choiceCount = s.isPaint ? (s.diff === 'easy' ? 3 : 4) : 3;
    const q = RoundingEdu.generateQuestion(s.grade, s.roundMode, choiceCount);
    s.currentQuestion = q;
    s.wrongOnCurrent = 0;
    s.goalScoredLocked = false;

    const numHtml = prefs.hintOn ? `${q.prefix}<span class="hl-digit">${q.deciding}</span>` : q.numFormatted;
    const isTen = q.targetType === 'ten';
    const badgeClass = isTen ? 'qb-badge ten' : 'qb-badge hundred';
    const badgeTxt = isTen ? 'EN YAKIN ONLUĞA YUVARLA' : 'EN YAKIN YÜZLÜĞE YUVARLA';

    els.eduQuestionBanner.classList.toggle('hundred', !isTen);
    els.qbTypeBadge.className = badgeClass;
    els.qbTypeBadge.textContent = badgeTxt;
    els.qbNumberDisplay.innerHTML = numHtml;
    els.qbSubHint.textContent = s.isPaint
      ? 'Doğru cevabın yazdığı 3D balona boya fırlat (veya üstüne tıkla)!'
      : 'Dev topu doğru cevabın yazdığı 3D kaleye şutla!';

    els.splitEduBanner.classList.toggle('hundred', !isTen);
    els.splitQbBadge.className = badgeClass;
    els.splitQbBadge.textContent = q.typeBadge;
    els.splitQbNumber.innerHTML = numHtml;
    els.splitQbProgress.textContent = `${s.questionIndex + 1} / ${s.totalQuestions}`;

    if (!s.isPaint) {
      if (!topDown) Engine3D.setLabelTile(5, { kind: 'ballTarget', text: q.numFormatted, targetType: q.targetType });
      s.goals.forEach((g, idx) => {
        const val = q.choices[idx];
        g.answerVal = val;
        g.isCorrect = val === q.correct;
        g.flash = 0;
        g.hintGlow = 0;
        if (!topDown) Engine3D.setLabelTile(g.labelSlot, { kind: 'goalSign', text: RoundingEdu.formatNum(val), border: g.hex });
      });
      resetSoccerPositions(false);
    } else {
      s.balloons = [];
      const count = q.choices.length;
      const spreadAngles = count === 3 ? [-0.62, 0, 0.62] : [-0.82, -0.28, 0.28, 0.82];
      const baseSpeed = s.diff === 'easy' ? 0.55 : s.diff === 'normal' ? 1.15 : 1.75;

      for (let i = 0; i < count; i++) {
        const ang = spreadAngles[i];
        const dist = 18 + (i % 2) * 4.8;
        const bx = Math.sin(ang) * dist;
        const bz = -Math.cos(ang) * dist + 4.0;
        const by = 5.0 + (i % 2) * 1.6;
        const pal = BALLOON_PALETTE[i % BALLOON_PALETTE.length];
        const val = q.choices[i];
        const slot = 10 + i;

        if (!topDown) Engine3D.setLabelTile(slot, { kind: 'balloonNum', text: RoundingEdu.formatNum(val), border: pal.hex });

        s.balloons.push({
          id: i + 1,
          kind: 'edu',
          answerVal: val,
          isCorrect: val === q.correct,
          pos: [bx, by, bz],
          anchor: [bx, by, bz],
          vel: [0, 0, 0],
          radius: 2.85,
          color: pal.rgb,
          labelSlot: slot,
          phase: i * 1.65 + Math.random(),
          moveSpeed: baseSpeed * speedScale(),
          moveAmpX: s.diff === 'easy' ? 1.8 : s.diff === 'normal' ? 4.0 : 6.2,
          moveAmpY: s.diff === 'easy' ? 0.65 : 1.35,
          wobble: 0,
          hintGlow: 0,
          spin: 0,
        });
      }
    }

    if (!isFirst) {
      SoundFX.speak(q.speechText);
    } else {
      setTimeout(() => {
        if (modeState === 'playing' && session && session.currentQuestion === q) SoundFX.speak(q.speechText);
      }, 900);
    }
  }

  function resetSoccerPositions(withCountdown = false) {
    const s = session;
    if (!s || s.isPaint) return;
    s.goalScoredLocked = false;
    s.kickoffCalmTimer = 1.65;
    s.kickoffSide = -(s.kickoffSide || 1);
    s.ball.pos = [0, 2.5, s.isEdu ? 18.0 : 0.0];
    s.ball.vel = [0, 0, 0];
    s.ball.rotX = 0;
    s.ball.rotZ = 0;
    s.ball.giantTimer = 0;
    s.ball.slowTimer = 0;
    s.ball.radius = s.ball.baseRadius;

    if (s.isEdu) {
      if (s.isSplit) {
        s.cars[0].pos = [-16.0, 0, 48]; s.cars[0].vel = [0, 0, 0]; s.cars[0].yaw = Math.PI;
        s.cars[1].pos = [ 16.0, 0, 48]; s.cars[1].vel = [0, 0, 0]; s.cars[1].yaw = Math.PI;
      } else {
        s.cars[0].pos = [0, 0, 48]; s.cars[0].vel = [0, 0, 0]; s.cars[0].yaw = Math.PI;
      }
    } else {
      // Diagonal alternating kickoff prevents dead-center bowling-alley 1-click goals!
      const side = s.kickoffSide;
      const p1x = -15.0 * side, p1z = 48.0;
      const p2x =  15.0 * side, p2z = -48.0;
      s.cars[0].pos = [p1x, 0, p1z]; s.cars[0].vel = [0, 0, 0]; s.cars[0].yaw = Math.atan2(-p1x, -p1z);
      s.cars[1].pos = [p2x, 0, p2z]; s.cars[1].vel = [0, 0, 0]; s.cars[1].yaw = Math.atan2(-p2x, -p2z);
    }

    for (const c of s.cars) {
      c.pitch = 0;
      c.roll = 0;
      c.turbo = 55;
      c.specialCooldown = Math.max(c.specialCooldown, 3.0);
    }
    if (withCountdown) {
      s.countdown = 1.25;
      addBannerSplash('SANTRADA HAZIRLAN!', '#38bdf8', 1.1);
    }
  }

  // ==================== SPECIAL ABILITIES (ALL 6 CARS!) ====================

  function triggerCarSpecial(car) {
    const s = session;
    if (!s || car.specialCooldown > 0 || s.countdown > 0) return;

    const spec = car.special;
    car.specialCooldown = spec.cooldown;
    SoundFX.playSpecial(spec.id);
    addCameraShake(0.45);

    const nfX = Math.sin(car.yaw);
    const nfZ = Math.cos(car.yaw);
    const toastSide = s.isSplit ? (car.id === 0 ? 'left' : 'right') : 'center';

    if (spec.id === 'dash') {
      // ⚡ Nitro Atılım: Controlled burst forward!
      car.vel[0] += nfX * 20.0;
      car.vel[2] += nfZ * 20.0;
      car.turbo = Math.min(100, car.turbo + 30);
      spawnParticles([car.pos[0], 1.2, car.pos[2]], [1.0, 0.85, 0.25], 26, 15, 'sphere', 4);
      spawnShockwave([car.pos[0], 0.8, car.pos[2]], car.color, 1.4, 9.0, 0.42);
    } else if (spec.id === 'shockwave') {
      // 💥 Şok Dalgası: Tactical blast on nearby ball & rival
      spawnShockwave([car.pos[0], 1.0, car.pos[2]], [1.0, 0.72, 0.16], 2.0, 16.0, 0.55);
      spawnParticles([car.pos[0], 1.5, car.pos[2]], [1.0, 0.65, 0.14], 34, 18, 'box', 7);
      const ball = s.ball;
      const dx = ball.pos[0] - car.pos[0];
      const dz = ball.pos[2] - car.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist < 15.0) {
        const d = Math.max(0.1, dist);
        const ax = (dx / d) * 0.65 + nfX * 0.35;
        const az = (dz / d) * 0.65 + nfZ * 0.35;
        const al = Math.hypot(ax, az) || 1;
        const blastSpd = s.kickoffCalmTimer > 0 ? 22.0 : 32.0;
        ball.vel[0] = (ax / al) * blastSpd;
        ball.vel[2] = (az / al) * blastSpd;
        ball.vel[1] = Math.max(ball.vel[1], 7.2);
        s.lastBallTouchCarId = car.id;
        SoundFX.playKick(1.0);
      }
    } else if (spec.id === 'overdrive') {
      // 🌀 Süper Turbo: 3.5s infinite turbo & sharp control!
      car.overdriveTimer = 3.5;
      car.turbo = 100;
      spawnShockwave([car.pos[0], 0.8, car.pos[2]], [1.0, 0.28, 0.44], 1.5, 10.0, 0.45);
    } else if (spec.id === 'magnet') {
      // 🧲 Manyetik Çekim: 3.5s smooth ball magnet!
      car.magnetTimer = 3.5;
      spawnShockwave([car.pos[0], 1.0, car.pos[2]], [0.88, 0.32, 0.98], 1.8, 12.0, 0.50);
    } else if (spec.id === 'megajump') {
      // 🦘 Süper Sıçrama: High aerial leap + volley kick!
      car.vel[1] = 16.5;
      car.onGround = false;
      car.vel[0] += nfX * 6.5;
      car.vel[2] += nfZ * 6.5;
      spawnShockwave([car.pos[0], 0.4, car.pos[2]], [0.22, 0.94, 0.52], 1.5, 10.0, 0.45);
      const ball = s.ball;
      const dist = Math.hypot(ball.pos[0] - car.pos[0], ball.pos[2] - car.pos[2]);
      if (dist < 10.5) {
        const volSpd = s.kickoffCalmTimer > 0 ? 22.0 : 28.0;
        ball.vel[0] = nfX * volSpd;
        ball.vel[2] = nfZ * volSpd;
        ball.vel[1] = 9.5;
        s.lastBallTouchCarId = car.id;
        SoundFX.playKick(0.95);
      }
    } else if (spec.id === 'slowfield') {
      // ❄️ Buz Alanı: Slows ball & opponent for surgical aiming!
      car.slowFieldTimer = 3.5;
      s.ball.slowTimer = 3.5;
      spawnShockwave([s.ball.pos[0], 1.0, s.ball.pos[2]], [0.35, 0.95, 1.0], 2.0, 14.0, 0.55);
      spawnParticles(s.ball.pos, [0.55, 0.96, 1.0], 24, 12, 'sphere', 5);
    }

    if (!car.isAI) {
      showToast(`${spec.icon} ${spec.name}!`, 'gold', toastSide, 1400);
    }
  }

  function triggerRoverSpecial(rover) {
    const s = session;
    if (!s || rover.specialCooldown > 0 || s.countdown > 0) return;

    const spec = rover.special;
    rover.specialCooldown = spec.cooldown;
    SoundFX.playSpecial(spec.id);
    const toastSide = s.isSplit ? (rover.id === 0 ? 'left' : 'right') : 'center';

    if (spec.id === 'dash') {
      // Triple fan shot
      for (const off of [-0.14, 0, 0.14]) {
        const y = rover.aimYaw + off;
        const p = rover.aimPitch;
        spawnSinglePaintball(rover, [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)], 0.78, false);
      }
    } else if (spec.id === 'shockwave') {
      // Giant mega paintball
      const y = rover.aimYaw, p = rover.aimPitch;
      spawnSinglePaintball(rover, [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)], 1.85, false);
    } else if (spec.id === 'overdrive') {
      rover.rapidTimer = 4.0;
    } else if (spec.id === 'magnet') {
      // Homing paintball locks onto nearest balloon!
      const y = rover.aimYaw, p = rover.aimPitch;
      spawnSinglePaintball(rover, [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)], 0.95, true);
    } else if (spec.id === 'megajump') {
      // Double quick shot
      const y = rover.aimYaw, p = rover.aimPitch;
      const dir = [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)];
      spawnSinglePaintball(rover, dir, 0.85, false);
      setTimeout(() => {
        if (modeState === 'playing' && session && session.isPaint) spawnSinglePaintball(rover, dir, 0.85, false);
      }, 120);
    } else if (spec.id === 'slowfield') {
      s.freezeTimer = 4.0;
      spawnShockwave([0, 2.0, -8], [0.35, 0.95, 1.0], 2.0, 28.0, 0.6);
    }

    showToast(`${spec.icon} ${spec.name}!`, 'gold', toastSide, 1400);
  }

  // ==================== INPUT READING ====================

  function getPlayerControls(playerIdx) {
    const s = session;
    const isSingle = !s.isSplit;
    const ti = playerIdx === 0 ? touchInput.p1 : touchInput.p2;

    let throttle = 0, steer = 0, turbo = false, primary = false, special = false;

    if (playerIdx === 0) {
      const up = keys.has('KeyW') || (isSingle && keys.has('ArrowUp'));
      const dn = keys.has('KeyS') || (isSingle && keys.has('ArrowDown'));
      const lt = keys.has('KeyA') || (isSingle && keys.has('ArrowLeft'));
      const rt = keys.has('KeyD') || (isSingle && keys.has('ArrowRight'));
      throttle = (up ? 1 : 0) - (dn ? 1 : 0);
      steer = (lt ? 1 : 0) - (rt ? 1 : 0);
      turbo = keys.has('ShiftLeft') || (isSingle && keys.has('ShiftRight'));
      primary = keys.has('Space');
      special = keys.has('KeyE') || keys.has('KeyF') || (isSingle && keys.has('KeyQ'));
    } else {
      const up = keys.has('ArrowUp');
      const dn = keys.has('ArrowDown');
      const lt = keys.has('ArrowLeft');
      const rt = keys.has('ArrowRight');
      throttle = (up ? 1 : 0) - (dn ? 1 : 0);
      steer = (lt ? 1 : 0) - (rt ? 1 : 0);
      turbo = keys.has('KeyM') || keys.has('Numpad0');
      primary = keys.has('Enter') || keys.has('NumpadEnter');
      special = keys.has('KeyK') || keys.has('ShiftRight') || keys.has('Numpad1');
    }

    const prefix = playerIdx === 0 ? 'tp1' : 'tp2';
    const digitalThrottle = Number(heldControls.has(prefix + 'Gas')) - Number(heldControls.has(prefix + 'Reverse'));
    const digitalSteer = Number(heldControls.has(prefix + 'Left')) - Number(heldControls.has(prefix + 'Right'));
    throttle = clamp(throttle + ti.throttle + digitalThrottle - Number(isSingle && heldControls.has('t1Reverse')), -1, 1);
    steer = clamp(steer + ti.steer + digitalSteer, -1, 1);
    if (ti.turbo) turbo = true;
    if (ti.primary) primary = true;
    if (ti.special) special = true;

    return { throttle, steer, turbo, primary, special };
  }

  // ==================== ROKET GOL 3D SIMULATION (FIXED TRUE OPEN GOAL POCKETS!) ====================

  function computeAICarControls(bot, ball, targetGoalZ, ownGoalZ) {
    const s = session;
    const diffFactor = s.diff === 'easy' ? 0.68 : s.diff === 'normal' ? 0.88 : 1.05;

    const dirToGoalX = 0 - ball.pos[0];
    const dirToGoalZ = targetGoalZ - ball.pos[2];
    const dLen = Math.hypot(dirToGoalX, dirToGoalZ) || 1;
    const nx = dirToGoalX / dLen;
    const nz = dirToGoalZ / dLen;

    const distBall = Math.hypot(ball.pos[0] - bot.pos[0], ball.pos[2] - bot.pos[2]);
    let aimX, aimZ;
    const botBehind = (targetGoalZ > 0 ? bot.pos[2] < ball.pos[2] - 1.5 : bot.pos[2] > ball.pos[2] + 1.5);
    if (botBehind && distBall < 18) {
      aimX = ball.pos[0] + nx * 1.4;
      aimZ = ball.pos[2] + nz * 1.4;
    } else {
      const offset = clamp(distBall * 0.45, 4.0, 9.5);
      aimX = clamp(ball.pos[0] - nx * offset, -PITCH_HALF_W + 5, PITCH_HALF_W - 5);
      aimZ = clamp(ball.pos[2] - nz * offset, -PITCH_HALF_L + 5, PITCH_HALF_L - 5);
    }

    if (Math.abs(ball.pos[2] - ownGoalZ) < 16 && distBall < 24) {
      aimX = ball.pos[0];
      aimZ = ball.pos[2];
    }

    const desiredYaw = Math.atan2(aimX - bot.pos[0], aimZ - bot.pos[2]);
    const angErr = wrapAngle(desiredYaw - bot.yaw);
    const steer = clamp(angErr * 2.2, -1, 1);
    const throttle = Math.abs(angErr) > 1.9 ? -0.55 : diffFactor;
    const turbo = botBehind && distBall > 5 && distBall < 28 && Math.abs(angErr) < 0.35 && bot.turbo > 25 && (s.diff !== 'easy' || Math.sin(simTime * 1.7) > 0.25);
    const primary = botBehind && distBall < 5.0 && Math.abs(angErr) < 0.45 && ball.pos[1] < 5.0 && s.diff !== 'easy';
    const special = botBehind && distBall < 14 && Math.abs(angErr) < 0.30 && bot.specialCooldown <= 0 && s.diff === 'hard';

    return { throttle, steer, turbo, primary, special };
  }

  function findOpenGoalMouth(pos, radius, goals) {
    for (const g of goals) {
      const sameEnd = g.facingSouth ? (pos[2] < 0) : (pos[2] > 0);
      if (!sameEnd) continue;
      if (Math.abs(pos[0] - g.x) < g.width * 0.5 - radius * 0.22 && pos[1] < g.height - radius * 0.15) {
        return g;
      }
    }
    return null;
  }

  function bounceOffGoalpostsAndCrossbar(ball, goals) {
    const postR = 0.58;
    const minD = ball.radius + postR;
    for (const g of goals) {
      // Left & Right vertical goalposts
      if (ball.pos[1] <= g.height + ball.radius) {
        for (const px of [g.x - g.width * 0.5, g.x + g.width * 0.5]) {
          const dx = ball.pos[0] - px;
          const dz = ball.pos[2] - g.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.001 && d < minD) {
            const nx = dx / d, nz = dz / d;
            ball.pos[0] = px + nx * minD;
            ball.pos[2] = g.z + nz * minD;
            const vn = ball.vel[0] * nx + ball.vel[2] * nz;
            if (vn < 0) {
              ball.vel[0] -= 1.82 * vn * nx;
              ball.vel[2] -= 1.82 * vn * nz;
              SoundFX.playPostClang();
              addCameraShake(0.32);
              spawnParticles([px, ball.pos[1], g.z], [1.0, 0.92, 0.55], 14, 11, 'sphere', 4);
            }
          }
        }
      }
      // Horizontal Top Crossbar
      if (Math.abs(ball.pos[0] - g.x) <= g.width * 0.5 + postR) {
        const dy = ball.pos[1] - g.height;
        const dz = ball.pos[2] - g.z;
        const d = Math.hypot(dy, dz);
        if (d > 0.001 && d < minD) {
          const ny = dy / d, nz = dz / d;
          ball.pos[1] = g.height + ny * minD;
          ball.pos[2] = g.z + nz * minD;
          const vn = ball.vel[1] * ny + ball.vel[2] * nz;
          if (vn < 0) {
            ball.vel[1] -= 1.82 * vn * ny;
            ball.vel[2] -= 1.82 * vn * nz;
            SoundFX.playPostClang();
            addCameraShake(0.32);
            spawnParticles([ball.pos[0], g.height, g.z], [1.0, 0.92, 0.55], 14, 11, 'sphere', 4);
          }
        }
      }
    }
  }

  function stepGoalkeepers(dt) {
    const s = session;
    if (!s || !s.keepers || !s.keepers.length) return;
    const ball = s.ball;

    for (const k of s.keepers) {
      if (k.saveFlash > 0) k.saveFlash = Math.max(0, k.saveFlash - dt * 2.4);
      if (k.saveCooldown > 0) k.saveCooldown = Math.max(0, k.saveCooldown - dt);

      if (k.mode === 'goal') {
        // Smooth, clearly readable rhythmic patrol across the goal line so players time & aim shots into the open corner!
        k.x = Math.sin(simTime * (k.freq || 1.4) + k.phase) * k.maxX;
      } else {
        // Sweeping patrol defender across Education penalty area
        k.x += k.dir * k.speed * dt;
        if (k.x > k.maxX) { k.x = k.maxX; k.dir = -1; }
        if (k.x < k.minX) { k.x = k.minX; k.dir =  1; }
      }
    }
  }

  function bounceOffGoalkeepers(ball, keepers) {
    if (!keepers || !keepers.length) return;
    const r = ball.radius;
    for (const k of keepers) {
      const halfW = k.width * 0.5 + r * 0.45;
      const halfZ = 0.72 + r * 0.80;
      if (
        ball.pos[1] - r * 0.5 < k.height &&
        Math.abs(ball.pos[0] - k.x) < halfW &&
        Math.abs(ball.pos[2] - k.z) < halfZ
      ) {
        // Deflect cleanly out toward midfield & slightly angled off the keeper's side!
        const pushDirZ = k.facingSouth ? 1 : -1;
        ball.pos[2] = k.z + pushDirZ * (halfZ + 0.15);
        const sideDeflect = clamp((ball.pos[0] - k.x) / Math.max(1, k.width * 0.5), -1, 1);
        const inSpd = Math.hypot(ball.vel[0], ball.vel[2]);
        const outSpd = clamp(inSpd * 0.82, 13.0, 26.0);
        ball.vel[2] = pushDirZ * outSpd;
        ball.vel[0] = sideDeflect * outSpd * 0.65 + ball.vel[0] * 0.25;
        ball.vel[1] = Math.max(ball.vel[1], 4.5);

        if (k.saveCooldown <= 0) {
          k.saveFlash = 1.0;
          k.saveCooldown = 0.55;
          SoundFX.playPostClang();
          addCameraShake(0.38);
          spawnParticles([ball.pos[0], ball.pos[1], k.z], [1.0, 0.90, 0.30], 18, 13, 'sphere', 5);
          spawnShockwave([k.x, 1.5, k.z], k.color, 1.4, 7.5, 0.40);
          showToast(k.mode === 'goal' ? '🧤 KALECİ KURTARDI!' : '🛡️ SAVUNMA BLOKLADI!', 'warn', 'center', 1300);
        }
      }
    }
  }

  function stepSoccer(dt) {
    const s = session;
    const spdMul = speedScale();

    if (s.countdown <= 0 && s.kickoffCalmTimer > 0) {
      s.kickoffCalmTimer = Math.max(0, s.kickoffCalmTimer - dt);
    }

    for (const g of s.goals) {
      if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 1.5);
    }
    stepGoalkeepers(dt);
    for (const pad of s.boostPads) {
      if (!pad.ready) {
        pad.timer -= dt;
        if (pad.timer <= 0) pad.ready = true;
      }
    }
    for (const jp of s.jumpPads) {
      if (jp.cooldown > 0) jp.cooldown = Math.max(0, jp.cooldown - dt);
    }

    // Fun Power-Ups spawner
    if (!s.isEdu && s.kickoffResetTimer <= 0) {
      s.powerUpSpawnTimer -= dt;
      if (s.powerUpSpawnTimer <= 0 && s.powerUps.length < 3) {
        s.powerUpSpawnTimer = 10.5;
        const types = [
          { type: 'turbo', color: [0.14, 0.86, 1.0], iconSlot: 24, label: '⚡ SÜPER TURBO!' },
          { type: 'giant', color: [1.0, 0.78, 0.16], iconSlot: 25, label: '⚽ DEV TOP!' },
          { type: 'magnet', color: [0.96, 0.32, 0.72], iconSlot: 26, label: '🧲 TOP MIKNATISI!' },
        ];
        const pick = types[Math.floor(Math.random() * types.length)];
        s.powerUps.push({
          ...pick,
          x: (Math.random() - 0.5) * 76,
          z: (Math.random() - 0.5) * 86,
          phase: Math.random() * 6.28,
        });
      }
    }

    // During post-goal celebration, let ball visibly tumble inside the net pocket!
    if (s.kickoffResetTimer > 0) {
      s.kickoffResetTimer -= dt;
      const b = s.ball;
      b.vel[1] -= 21.0 * dt;
      b.pos[0] += b.vel[0] * dt * 0.55;
      b.pos[1] += b.vel[1] * dt * 0.55;
      b.pos[2] += b.vel[2] * dt * 0.55;
      if (b.pos[1] < b.radius) { b.pos[1] = b.radius; b.vel[1] *= -0.5; b.vel[0] *= 0.85; b.vel[2] *= 0.85; }
      // Keep inside goal net back wall
      for (const g of s.goals) {
        if (Math.abs(b.pos[0] - g.x) < g.width * 0.55) {
          const backLimit = g.facingSouth ? g.z - g.depth + b.radius : g.z + g.depth - b.radius;
          if (g.facingSouth && b.pos[2] < backLimit) { b.pos[2] = backLimit; b.vel[2] *= -0.45; }
          if (!g.facingSouth && b.pos[2] > backLimit) { b.pos[2] = backLimit; b.vel[2] *= -0.45; }
        }
      }
      if (s.kickoffResetTimer <= 0) {
        if (s.isEdu) {
          if (s.questionIndex >= s.totalQuestions) {
            finishSession();
            return;
          }
          loadNextRoundingQuestion(false);
        } else {
          resetSoccerPositions(true);
        }
      }
      stepParticlesAndFX(dt);
      return;
    }

    let anyBoosting = false;

    // ===== STEP CARS =====
    for (const car of s.cars) {
      if (car.specialCooldown > 0) car.specialCooldown = Math.max(0, car.specialCooldown - dt);
      if (car.overdriveTimer > 0) car.overdriveTimer = Math.max(0, car.overdriveTimer - dt);
      if (car.slowFieldTimer > 0) car.slowFieldTimer = Math.max(0, car.slowFieldTimer - dt);
      if (car.superTurboTimer > 0) {
        car.superTurboTimer = Math.max(0, car.superTurboTimer - dt);
        car.turbo = 100;
      }
      if (car.magnetTimer > 0) car.magnetTimer = Math.max(0, car.magnetTimer - dt);

      const ctrl = s.countdown > 0
        ? { throttle: 0, steer: 0, turbo: false, primary: false, special: false }
        : car.isAI
          ? computeAICarControls(car, s.ball, PITCH_HALF_L, -PITCH_HALF_L)
          : getPlayerControls(car.id);

      if (ctrl.special && car.specialCooldown <= 0) {
        triggerCarSpecial(car);
      }

      const st = car.stats;
      const fwdX = Math.sin(car.yaw);
      const fwdZ = Math.cos(car.yaw);
      const fwdSpeed = car.vel[0] * fwdX + car.vel[2] * fwdZ;

      const isOverdrive = car.overdriveTimer > 0 || car.superTurboTimer > 0;
      const canBoost = (ctrl.turbo || car.overdriveTimer > 0) && (car.turbo > 2 || isOverdrive);
      car.boosting = canBoost;
      if (canBoost) {
        anyBoosting = true;
        if (!isOverdrive) car.turbo = Math.max(0, car.turbo - dt * 32);
      } else {
        car.turbo = Math.min(100, car.turbo + dt * 16);
      }

      const turnRate = (2.65 * st.control + (car.overdriveTimer > 0 ? 0.55 : 0)) * (fwdSpeed < -1.0 ? -1 : 1);
      const speedTurnFactor = clamp(0.48 + Math.abs(fwdSpeed) / 16, 0.48, 1.06);
      car.yaw = wrapAngle(car.yaw + ctrl.steer * turnRate * speedTurnFactor * dt);
      car.steerInput = lerp(car.steerInput, ctrl.steer, clamp(dt * 12, 0, 1));

      const nfX = Math.sin(car.yaw);
      const nfZ = Math.cos(car.yaw);
      const accel = (canBoost ? 64 : 42) * st.accel * spdMul;
      const maxSpd = (canBoost ? 40 : 26) * st.speed * spdMul * (isOverdrive ? 1.14 : 1.0);

      if (Math.abs(ctrl.throttle) > 0.04) {
        car.vel[0] += nfX * ctrl.throttle * accel * dt;
        car.vel[2] += nfZ * ctrl.throttle * accel * dt;
      } else if (canBoost) {
        car.vel[0] += nfX * accel * 0.94 * dt;
        car.vel[2] += nfZ * accel * 0.94 * dt;
      }

      const rightX = Math.cos(car.yaw);
      const rightZ = -Math.sin(car.yaw);
      const latVel = car.vel[0] * rightX + car.vel[2] * rightZ;
      const grip = car.onGround ? clamp(0.84 * st.control, 0.78, 0.94) : 0.97;
      car.vel[0] -= rightX * latVel * (1 - Math.pow(1 - grip, dt * 10));
      car.vel[2] -= rightZ * latVel * (1 - Math.pow(1 - grip, dt * 10));

      // Leave realistic tire skid marks on grass when drifting hard!
      if (car.onGround && Math.abs(latVel) > 5.5 && Math.random() < 0.45) {
        s.skidMarks.push({ x: car.pos[0] - nfX * 1.2 + rightX * 1.1, z: car.pos[2] - nfZ * 1.2 + rightZ * 1.1, yaw: car.yaw, life: 3.5, maxLife: 3.5 });
        s.skidMarks.push({ x: car.pos[0] - nfX * 1.2 - rightX * 1.1, z: car.pos[2] - nfZ * 1.2 - rightZ * 1.1, yaw: car.yaw, life: 3.5, maxLife: 3.5 });
        if (s.skidMarks.length > 90) s.skidMarks.splice(0, 2);
      }

      const drag = Math.pow(Math.abs(ctrl.throttle) > 0.05 || canBoost ? 0.44 : 0.16, dt);
      car.vel[0] *= drag;
      car.vel[2] *= drag;

      const hSpd = Math.hypot(car.vel[0], car.vel[2]);
      if (hSpd > maxSpd) {
        car.vel[0] = (car.vel[0] / hSpd) * maxSpd;
        car.vel[2] = (car.vel[2] / hSpd) * maxSpd;
      }

      // Jump (Clean tactical vertical hop — no free forward speed-hack!)
      if (car.jumpCooldown > 0) car.jumpCooldown = Math.max(0, car.jumpCooldown - dt);
      if (ctrl.primary && car.onGround && car.jumpCooldown <= 0) {
        car.vel[1] = 11.4;
        car.onGround = false;
        car.jumpCooldown = 1.05;
        car.vel[0] += nfX * 1.6;
        car.vel[2] += nfZ * 1.6;
        SoundFX.playJump();
        spawnParticles([car.pos[0], 0.4, car.pos[2]], car.accent, 8, 6, 'sphere', 2.5);
      }

      if (!car.onGround || car.pos[1] > 0) {
        car.vel[1] -= 30.0 * dt;
        car.pos[1] += car.vel[1] * dt;
        if (car.pos[1] <= 0) {
          car.pos[1] = 0;
          car.vel[1] = 0;
          car.onGround = true;
        }
      }

      car.pos[0] += car.vel[0] * dt;
      car.pos[2] += car.vel[2] * dt;

      const targetRoll = -ctrl.steer * clamp(hSpd / 22, 0, 1) * 0.15;
      const targetPitch = !car.onGround ? -clamp(car.vel[1] * 0.032, -0.35, 0.35) : (canBoost ? -0.07 : 0);
      car.roll = lerp(car.roll, targetRoll, clamp(dt * 10, 0, 1));
      car.pitch = lerp(car.pitch, targetPitch, clamp(dt * 10, 0, 1));
      car.wheelSpin += (car.vel[0] * nfX + car.vel[2] * nfZ) * dt * 0.9;

      if (canBoost && Math.random() < 0.72) {
        s.particles.push({
          pos: [car.pos[0] - nfX * 2.8, car.pos[1] + 0.95, car.pos[2] - nfZ * 2.8],
          vel: [-nfX * 6 + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 1.6, -nfZ * 6 + (Math.random() - 0.5) * 2],
          color: car.teamRim || car.accent,
          size: 0.44,
          rot: 0,
          vrot: 4,
          life: 0.28,
          maxLife: 0.28,
          shape: 'sphere',
        });
      }

      // Arena bounds for car (allow driving cleanly right into goal mouth up to 2.5m deep!)
      const carR = 2.2;
      const carInGoal = findOpenGoalMouth(car.pos, carR, s.goals);
      if (car.pos[0] < -PITCH_HALF_W + carR) { car.pos[0] = -PITCH_HALF_W + carR; car.vel[0] *= -0.35; }
      if (car.pos[0] >  PITCH_HALF_W - carR) { car.pos[0] =  PITCH_HALF_W - carR; car.vel[0] *= -0.35; }
      const zLimN = carInGoal && carInGoal.facingSouth ? -PITCH_HALF_L - 2.6 : -PITCH_HALF_L + carR;
      const zLimS = carInGoal && !carInGoal.facingSouth ? PITCH_HALF_L + 2.6 : PITCH_HALF_L - carR;
      if (car.pos[2] < zLimN) { car.pos[2] = zLimN; car.vel[2] *= -0.35; }
      if (car.pos[2] > zLimS) { car.pos[2] = zLimS; car.vel[2] *= -0.35; }
      if (!carInGoal) applyCornerBevels(car.pos, car.vel, carR, 0.35);

      // Boost Pads
      for (const pad of s.boostPads) {
        if (pad.ready && Math.hypot(car.pos[0] - pad.x, car.pos[2] - pad.z) < 3.8) {
          pad.ready = false;
          pad.timer = 6.0;
          car.turbo = 100;
          car.vel[0] += nfX * 10.5;
          car.vel[2] += nfZ * 10.5;
          SoundFX.playBoostPad();
          spawnShockwave([pad.x, 0.3, pad.z], [1.0, 0.86, 0.22], 1.4, 6.2, 0.40);
        }
      }

      // Wing Spring Jump Launch Pads!
      for (const jp of s.jumpPads) {
        if (jp.cooldown <= 0 && car.onGround && Math.hypot(car.pos[0] - jp.x, car.pos[2] - jp.z) < 3.6) {
          jp.cooldown = 1.6;
          car.vel[1] = 18.5;
          car.onGround = false;
          car.vel[0] += (0 - jp.x) * 0.38;
          SoundFX.playRampLaunch();
          spawnShockwave([jp.x, 0.4, jp.z], [0.22, 1.0, 0.58], 1.8, 9.5, 0.45);
          spawnParticles([jp.x, 0.8, jp.z], [0.22, 1.0, 0.58], 18, 11, 'sphere', 8);
        }
      }

      // Power-Up Pickups
      for (let i = s.powerUps.length - 1; i >= 0; i--) {
        const pu = s.powerUps[i];
        if (Math.hypot(car.pos[0] - pu.x, car.pos[2] - pu.z) < 4.0) {
          SoundFX.playBoostPad();
          spawnParticles([pu.x, 2.0, pu.z], pu.color, 22, 11, 'sphere', 5);
          if (pu.type === 'turbo') { car.superTurboTimer = 7.0; car.turbo = 100; }
          else if (pu.type === 'giant') { s.ball.giantTimer = 8.0; }
          else if (pu.type === 'magnet') { car.magnetTimer = 7.0; }
          if (!car.isAI) showToast(pu.label, 'gold', s.isSplit ? (car.id === 0 ? 'left' : 'right') : 'center', 1700);
          s.powerUps.splice(i, 1);
        }
      }
    }

    SoundFX.setBoost(anyBoosting ? 0.9 : 0);

    // Car-vs-Car collision
    if (s.cars.length === 2) {
      const a = s.cars[0], b = s.cars[1];
      const dx = b.pos[0] - a.pos[0];
      const dz = b.pos[2] - a.pos[2];
      const dist = Math.hypot(dx, dz);
      const minDist = 4.0;
      if (dist > 0.01 && dist < minDist) {
        const nx = dx / dist, nz = dz / dist;
        const overlap = (minDist - dist) * 0.5;
        a.pos[0] -= nx * overlap; a.pos[2] -= nz * overlap;
        b.pos[0] += nx * overlap; b.pos[2] += nz * overlap;
        const bump = 9.0;
        a.vel[0] -= nx * bump; a.vel[2] -= nz * bump;
        b.vel[0] += nx * bump; b.vel[2] += nz * bump;
        SoundFX.playKick(0.45);
        addCameraShake(0.24);
      }
    }

    // ===== STEP SOCCER BALL =====
    const ball = s.ball;
    if (ball.giantTimer > 0) {
      ball.giantTimer = Math.max(0, ball.giantTimer - dt);
      ball.radius = lerp(ball.radius, 3.6, clamp(dt * 6, 0, 1));
    } else {
      ball.radius = lerp(ball.radius, ball.baseRadius, clamp(dt * 6, 0, 1));
    }
    if (ball.slowTimer > 0) {
      ball.slowTimer = Math.max(0, ball.slowTimer - dt);
    }

    // Magnet gentle pull toward car nose
    for (const car of s.cars) {
      if (car.magnetTimer > 0) {
        const tx = car.pos[0] + Math.sin(car.yaw) * 4.8;
        const tz = car.pos[2] + Math.cos(car.yaw) * 4.8;
        const dx = tx - ball.pos[0];
        const dz = tz - ball.pos[2];
        const d = Math.hypot(dx, dz);
        if (d > 0.4 && d < 24) {
          ball.vel[0] += (dx / d) * 32 * dt;
          ball.vel[2] += (dz / d) * 32 * dt;
        }
      }
    }

    // Car-to-Ball collision with forward aim assist + car power profile
    for (const car of s.cars) {
      const carCenterY = car.pos[1] + 1.15;
      const dx = ball.pos[0] - car.pos[0];
      const dy = ball.pos[1] - carCenterY;
      const dz = ball.pos[2] - car.pos[2];
      const dist = Math.hypot(dx, dy, dz);
      const hitDist = ball.radius + 2.55;

      if (dist > 0.001 && dist < hitDist) {
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const push = hitDist - dist + 0.08;
        ball.pos[0] += nx * push;
        ball.pos[1] = Math.max(ball.radius, ball.pos[1] + ny * push * 0.5);
        ball.pos[2] += nz * push;

        const carSpd = Math.hypot(car.vel[0], car.vel[2]);
        const nfX = Math.sin(car.yaw);
        const nfZ = Math.cos(car.yaw);
        const aimX = nx * 0.62 + nfX * 0.38;
        const aimZ = nz * 0.62 + nfZ * 0.38;
        const al = Math.hypot(aimX, aimZ) || 1;

        // Power shot requires genuine fast boost momentum — a simple kickoff hop cannot blast full-field!
        const isPowerShot = car.boosting && carSpd > 22.0;
        const kickSpd = Math.max(10.5, carSpd * (isPowerShot ? 1.18 : 1.02)) * car.stats.power * spdMul;
        const maxKick = s.kickoffCalmTimer > 0 ? 22.0 : 35.0;
        const clampedKick = Math.min(kickSpd, maxKick);
        ball.vel[0] = (aimX / al) * clampedKick + car.vel[0] * 0.14;
        ball.vel[2] = (aimZ / al) * clampedKick + car.vel[2] * 0.14;
        const chipLift = !car.onGround ? 5.2 : isPowerShot ? 4.8 : 2.0 + carSpd * 0.08;
        ball.vel[1] = Math.max(ball.vel[1], Math.min(chipLift, 6.8));

        s.lastBallTouchCarId = car.id;
        SoundFX.playKick(clamp(clampedKick / 28, 0.35, 1.15));
        if (isPowerShot) addCameraShake(0.30);
        spawnParticles(
          [ball.pos[0] - nx * ball.radius, ball.pos[1], ball.pos[2] - nz * ball.radius],
          isPowerShot ? [1.0, 0.86, 0.25] : car.accent,
          isPowerShot ? 16 : 8,
          isPowerShot ? 13 : 8,
          'sphere',
          4
        );
      }
    }

    // Ball motion (sub-stepped 2x for zero tunneling + realistic turf resistance!)
    const ballSlowMul = ball.slowTimer > 0 ? 0.58 : 1.0;
    const subSteps = 2;
    const subDt = (dt / subSteps) * ballSlowMul;
    const maxBallSpd = s.kickoffCalmTimer > 0 ? 23.0 : 36.0;

    for (let step = 0; step < subSteps; step++) {
      if (s.goalScoredLocked) break;

      ball.vel[1] -= 23.0 * subDt;
      ball.pos[0] += ball.vel[0] * subDt;
      ball.pos[1] += ball.vel[1] * subDt;
      ball.pos[2] += ball.vel[2] * subDt;

      if (ball.pos[1] < ball.radius) {
        ball.pos[1] = ball.radius;
        if (Math.abs(ball.vel[1]) > 2.4) {
          ball.vel[1] = -ball.vel[1] * 0.65;
          SoundFX.playKick(clamp(Math.abs(ball.vel[1]) / 26, 0.2, 0.45));
        } else {
          ball.vel[1] = 0;
        }
        // Realistic grass rolling resistance: midfield 1-tap shots stop ~20m short of the goal!
        const grassDrag = Math.pow(0.44, subDt);
        ball.vel[0] *= grassDrag;
        ball.vel[2] *= grassDrag;
      } else {
        const airDrag = Math.pow(0.74, subDt);
        ball.vel[0] *= airDrag;
        ball.vel[2] *= airDrag;
      }

      const bSpd = Math.hypot(ball.vel[0], ball.vel[2]);
      if (bSpd > maxBallSpd) {
        ball.vel[0] = (ball.vel[0] / bSpd) * maxBallSpd;
        ball.vel[2] = (ball.vel[2] / bSpd) * maxBallSpd;
      }

      // 1. Animated 3D Goalkeepers / Penalty Box Defenders block straight midfield shots!
      bounceOffGoalkeepers(ball, s.keepers);

      // 2. Solid Goalpost & Crossbar Physics (with metallic clang!)
      bounceOffGoalpostsAndCrossbar(ball, s.goals);

      // 2. Check if ball is cleanly inside ANY Open Goal Mouth!
      const mouthGoal = findOpenGoalMouth(ball.pos, ball.radius, s.goals);

      // 3. Side Walls always bounce
      const r = ball.radius;
      if (ball.pos[0] < -PITCH_HALF_W + r) { ball.pos[0] = -PITCH_HALF_W + r; ball.vel[0] = Math.abs(ball.vel[0]) * 0.84; }
      if (ball.pos[0] >  PITCH_HALF_W - r) { ball.pos[0] =  PITCH_HALF_W - r; ball.vel[0] = -Math.abs(ball.vel[0]) * 0.84; }

      // 4. End Walls: ONLY bounce if NOT inside an open goal mouth!!
      if (!mouthGoal) {
        if (ball.pos[2] < -PITCH_HALF_L + r) { ball.pos[2] = -PITCH_HALF_L + r; ball.vel[2] = Math.abs(ball.vel[2]) * 0.84; }
        if (ball.pos[2] >  PITCH_HALF_L - r) { ball.pos[2] =  PITCH_HALF_L - r; ball.vel[2] = -Math.abs(ball.vel[2]) * 0.84; }
        applyCornerBevels(ball.pos, ball.vel, r, 0.84);
      } else {
        // Ball IS inside the open goal mouth — check if it crossed the goal line!
        const crossed = mouthGoal.facingSouth
          ? ball.pos[2] <= mouthGoal.z - 0.15
          : ball.pos[2] >= mouthGoal.z + 0.15;
        if (crossed) {
          handleGoalScored(mouthGoal);
          break;
        }
      }
    }

    // Visual rolling rotation + glowing power-shot trail!
    ball.rotX += (ball.vel[2] / ball.radius) * dt;
    ball.rotZ -= (ball.vel[0] / ball.radius) * dt;

    if (Math.hypot(ball.vel[0], ball.vel[2]) > 26 && Math.random() < 0.70) {
      s.particles.push({
        pos: [ball.pos[0], ball.pos[1], ball.pos[2]],
        vel: [0, 0.6, 0],
        color: [1.0, 0.86, 0.28],
        size: 0.62,
        rot: 0,
        vrot: 3,
        life: 0.26,
        maxLife: 0.26,
        shape: 'sphere',
      });
    }

    stepParticlesAndFX(dt);
  }

  function applyCornerBevels(pos, vel, r, bounce) {
    // Only trims the outer 8.5m corners — stays completely clear of all 3 Edu goals!
    const limit = PITCH_HALF_W + PITCH_HALF_L - 8.5 - r * 1.414;
    const signs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [sx, sz] of signs) {
      const proj = sx * pos[0] + sz * pos[2];
      if (proj > limit) {
        const invSqrt2 = 0.70710678;
        const excess = (proj - limit) * 0.5;
        pos[0] -= sx * excess;
        pos[2] -= sz * excess;
        const vn = (vel[0] * sx + vel[2] * sz) * invSqrt2;
        if (vn > 0) {
          vel[0] -= (1 + bounce) * vn * sx * invSqrt2;
          vel[2] -= (1 + bounce) * vn * sz * invSqrt2;
        }
      }
    }
  }

  function handleGoalScored(goal) {
    const s = session;
    const ball = s.ball;

    if (s.isEdu) {
      const scorer = s.cars[s.lastBallTouchCarId] || s.cars[0];
      const toastSide = s.isSplit ? (scorer.id === 0 ? 'left' : 'right') : 'center';

      if (goal.isCorrect) {
        s.goalScoredLocked = true;
        goal.flash = 1.0;
        scorer.streak++;
        scorer.bestStreak = Math.max(scorer.bestStreak, scorer.streak);
        const pts = 100 + Math.min(scorer.streak - 1, 5) * 25 + (s.wrongOnCurrent === 0 ? 25 : 0);
        scorer.score += pts;
        scorer.goals++;
        s.correctCount++;
        s.questionIndex++;

        SoundFX.playGoal();
        addCameraShake(0.85);
        spawnConfettiBurst([goal.x, 4.5, goal.z - 1.5], 72);
        spawnShockwave([goal.x, 0.5, goal.z], [0.24, 1.0, 0.58], 2.5, 18.0, 0.75);
        addBannerSplash(`⚽ GOOOOL! ${s.currentQuestion.correctFormatted}`, '#2ee69b', 1.4);
        showToast(`Harika Gol ${scorer.name}! +${pts} Puan (Doğru: ${s.currentQuestion.correctFormatted})`, 'good', toastSide, 2200);
        SoundFX.speak(`Harika gol! Doğru cevap ${s.currentQuestion.correct}`);
        s.kickoffResetTimer = 1.55;
      } else {
        // Wrong goal -> Friendly bouncy shield pushes ball back onto the field + explains rounding!
        s.wrongOnCurrent++;
        s.totalWrongs++;
        scorer.streak = 0;

        ball.pos[2] = goal.z + ball.radius + 3.0;
        ball.vel[0] = (0 - goal.x) * 0.45 + (Math.random() - 0.5) * 6;
        ball.vel[1] = 8.5;
        ball.vel[2] = 24.0;

        SoundFX.playWrong();
        addCameraShake(0.35);
        spawnParticles([goal.x, 3.0, goal.z + 1.0], [1.0, 0.45, 0.2], 20, 12, 'sphere', 4);
        spawnShockwave([goal.x, 1.5, goal.z + 1.0], [1.0, 0.35, 0.25], 1.8, 10.0, 0.48);
        showToast(`Yaklaştın! ${s.currentQuestion.explanation}`, 'warn', 'center', 3400);

        if (s.wrongOnCurrent >= 2) {
          for (const g of s.goals) {
            if (g.isCorrect) g.hintGlow = 1.0;
          }
        }
      }
    } else {
      // Fun Mode Rocket Match Goal!
      s.goalScoredLocked = true;
      goal.flash = 1.0;
      const scoringCar = goal.teamOwner === 1 ? s.cars[0] : s.cars[1];
      scoringCar.goals++;
      scoringCar.score += 150;

      SoundFX.playGoal();
      addCameraShake(0.95);
      spawnConfettiBurst([goal.x, 4.5, goal.z], 82);
      spawnShockwave([goal.x, 0.5, goal.z], scoringCar.color, 2.8, 20.0, 0.78);
      addBannerSplash(`⚽ GOOOOL! ${scoringCar.name.toUpperCase()}`, scoringCar.id === 0 ? '#22d3ee' : '#ff8c38', 1.45);
      showToast(`${scoringCar.name} muhteşem bir gol attı!`, 'gold', 'center', 2000);
      s.kickoffResetTimer = 1.70;
    }
  }

  // ==================== BOYA TOPU 3D SIMULATION ====================

  let nextBalloonUid = 100;
  function spawnFunBalloon() {
    const s = session;
    if (!s) return;
    const roll = Math.random();
    let kind = 'normal', radius = 2.4, points = 15, labelSlot = -1, speedMul = 1.0;
    let color = BALLOON_PALETTE[Math.floor(Math.random() * BALLOON_PALETTE.length)].rgb;

    if (roll < 0.14) { kind = 'gold'; radius = 1.95; points = 50; color = [1.0, 0.84, 0.18]; labelSlot = 27; speedMul = 1.55; }
    else if (roll < 0.24) { kind = 'rainbow'; radius = 2.65; points = 30; color = [0.7, 0.4, 1.0]; labelSlot = 28; speedMul = 1.1; }
    else if (roll < 0.32) { kind = 'ice'; radius = 2.35; points = 20; color = [0.35, 0.92, 1.0]; labelSlot = 29; speedMul = 1.0; }
    else if (roll < (s.diff === 'hard' ? 0.48 : s.diff === 'normal' ? 0.43 : 0.38)) { kind = 'mine'; radius = 2.25; points = -25; color = [0.16, 0.18, 0.24]; labelSlot = 30; speedMul = 0.9; }

    const ang = (Math.random() - 0.5) * 2.25;
    const dist = 14 + Math.random() * 18;
    const bx = Math.sin(ang) * dist;
    const bz = -Math.cos(ang) * dist + 6.0;
    const by = 3.5 + Math.random() * 6.0;
    const diffSpd = s.diff === 'easy' ? 2.6 : s.diff === 'normal' ? 4.2 : 5.8;

    s.balloons.push({
      id: nextBalloonUid++,
      kind,
      points,
      pos: [bx, by, bz],
      anchor: [bx, by, bz],
      vel: [(Math.random() - 0.5) * diffSpd * speedMul, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * diffSpd * speedMul],
      radius,
      color,
      labelSlot,
      phase: Math.random() * 6.28,
      wobble: 0,
      hintGlow: 0,
      spin: 0,
      life: 16.0,
    });
  }

  function spawnSinglePaintball(rover, dir, radius = 0.72, homing = false) {
    const s = session;
    const muzzlePos = [rover.pos[0] + dir[0] * 2.7, 1.75 + dir[1] * 2.4, rover.pos[2] + dir[2] * 2.7];
    const pSpd = 60.0 * clamp(speedScale(), 0.8, 1.35);
    const col = rover.nextPaintColor;

    s.paintballs.push({
      ownerId: rover.id,
      pos: muzzlePos,
      vel: [dir[0] * pSpd, dir[1] * pSpd, dir[2] * pSpd],
      radius,
      homing,
      color: [col[0], col[1], col[2]],
      life: 1.8,
    });
    rover.paintIdx = (rover.paintIdx + 1) % BALLOON_PALETTE.length;
    rover.nextPaintColor = BALLOON_PALETTE[rover.paintIdx].rgb;
    spawnParticles(muzzlePos, col, 6, 5, 'sphere', 1.5);
  }

  function firePaintballFromRover(rover, customDir = null) {
    const s = session;
    if (!s || rover.fireCooldown > 0 || s.countdown > 0) return;

    rover.fireCooldown = rover.rapidTimer > 0 ? 0.12 : 0.24;
    rover.recoil = 1.0;

    const dir = customDir || [
      Math.sin(rover.aimYaw) * Math.cos(rover.aimPitch),
      Math.sin(rover.aimPitch),
      Math.cos(rover.aimYaw) * Math.cos(rover.aimPitch),
    ];
    spawnSinglePaintball(rover, dir, 0.72, false);
    SoundFX.playPaintFire();
  }

  function stepPaintArena(dt) {
    const s = session;
    const spdMul = speedScale();

    if (s.freezeTimer > 0) s.freezeTimer = Math.max(0, s.freezeTimer - dt);

    if (s.kickoffResetTimer > 0) {
      s.kickoffResetTimer -= dt;
      if (s.kickoffResetTimer <= 0) {
        if (s.questionIndex >= s.totalQuestions) {
          finishSession();
          return;
        }
        loadNextRoundingQuestion(false);
      }
    }

    for (const rover of s.rovers) {
      if (rover.fireCooldown > 0) rover.fireCooldown = Math.max(0, rover.fireCooldown - dt);
      if (rover.specialCooldown > 0) rover.specialCooldown = Math.max(0, rover.specialCooldown - dt);
      if (rover.recoil > 0) rover.recoil = Math.max(0, rover.recoil - dt * 5.2);
      if (rover.rapidTimer > 0) rover.rapidTimer = Math.max(0, rover.rapidTimer - dt);

      const ctrl = s.countdown > 0
        ? { throttle: 0, steer: 0, turbo: false, primary: false, special: false }
        : getPlayerControls(rover.id);

      if (ctrl.special && rover.specialCooldown <= 0) {
        triggerRoverSpecial(rover);
      }
      if (Math.abs(ctrl.steer) > 0.05) {
        rover.aimYaw = wrapAngle(rover.aimYaw + ctrl.steer * 2.2 * spdMul * dt);
        rover.yaw = lerpAngle(rover.yaw, rover.aimYaw, clamp(dt * 8, 0, 1));
      }
      if (Math.abs(ctrl.throttle) > 0.05) {
        rover.aimPitch = clamp(rover.aimPitch + ctrl.throttle * 1.05 * dt, -0.05, 0.58);
      }

      let bestLock = null, bestAng = 0.24, lockDist = 30;
      const aimDir = [
        Math.sin(rover.aimYaw) * Math.cos(rover.aimPitch),
        Math.sin(rover.aimPitch),
        Math.cos(rover.aimYaw) * Math.cos(rover.aimPitch),
      ];
      for (const b of s.balloons) {
        const vx = b.pos[0] - rover.pos[0], vy = b.pos[1] - 1.75, vz = b.pos[2] - rover.pos[2];
        const d = Math.hypot(vx, vy, vz);
        if (d < 1.5) continue;
        const ang = Math.acos(clamp((vx * aimDir[0] + vy * aimDir[1] + vz * aimDir[2]) / d, -1, 1));
        if (ang < bestAng) { bestAng = ang; bestLock = b; lockDist = d; }
      }
      rover.lockedTarget = bestLock;
      rover.aimDist = bestLock ? lockDist : 28;

      if (ctrl.primary) {
        if (bestLock) {
          const vx = bestLock.pos[0] - rover.pos[0], vy = bestLock.pos[1] - 1.75, vz = bestLock.pos[2] - rover.pos[2];
          const d = Math.hypot(vx, vy, vz) || 1;
          firePaintballFromRover(rover, [vx / d, vy / d, vz / d]);
        } else {
          firePaintballFromRover(rover);
        }
      }
    }

    const freezeMul = s.freezeTimer > 0 ? 0.35 : 1.0;
    if (!s.isEdu) {
      s.balloonSpawnTimer -= dt;
      const targetCount = s.diff === 'easy' ? 8 : s.diff === 'normal' ? 10 : 12;
      if (s.balloonSpawnTimer <= 0 && s.balloons.length < targetCount) {
        spawnFunBalloon();
        s.balloonSpawnTimer = s.diff === 'hard' ? 0.55 : 0.85;
      }
    }

    for (let i = s.balloons.length - 1; i >= 0; i--) {
      const b = s.balloons[i];
      if (b.wobble > 0) b.wobble = Math.max(0, b.wobble - dt * 2.5);
      b.spin += dt * 0.8;

      if (b.kind === 'edu') {
        const t = simTime * b.moveSpeed * freezeMul + b.phase;
        b.pos[0] = b.anchor[0] + Math.sin(t) * b.moveAmpX;
        b.pos[1] = b.anchor[1] + Math.cos(t * 1.35) * b.moveAmpY;
        b.pos[2] = b.anchor[2] + Math.sin(t * 0.7) * 1.8;
      } else {
        b.pos[0] += b.vel[0] * dt * freezeMul * spdMul;
        b.pos[1] += b.vel[1] * dt * freezeMul * spdMul + Math.sin(simTime * 3.0 + b.phase) * 0.4 * dt;
        b.pos[2] += b.vel[2] * dt * freezeMul * spdMul;

        if (b.pos[0] < -28) { b.pos[0] = -28; b.vel[0] = Math.abs(b.vel[0]); }
        if (b.pos[0] >  28) { b.pos[0] =  28; b.vel[0] = -Math.abs(b.vel[0]); }
        if (b.pos[2] < -28) { b.pos[2] = -28; b.vel[2] = Math.abs(b.vel[2]); }
        if (b.pos[2] >   8) { b.pos[2] =   8; b.vel[2] = -Math.abs(b.vel[2]); }
        if (b.pos[1] < 3.0) { b.pos[1] = 3.0; b.vel[1] = Math.abs(b.vel[1]) + 0.4; }
        if (b.pos[1] > 10.5){ b.pos[1] = 10.5; b.vel[1] = -Math.abs(b.vel[1]) - 0.3; }

        b.life -= dt;
        if (b.life <= 0) s.balloons.splice(i, 1);
      }
    }

    for (let i = s.paintballs.length - 1; i >= 0; i--) {
      const pb = s.paintballs[i];
      if (pb.homing && s.balloons.length > 0) {
        let best = null, bestD = Infinity;
        for (const b of s.balloons) {
          if (b.kind === 'mine') continue;
          const d = Vec3.dist(pb.pos, b.pos);
          if (d < bestD) { bestD = d; best = b; }
        }
        if (best) {
          const dx = best.pos[0] - pb.pos[0], dy = best.pos[1] - pb.pos[1], dz = best.pos[2] - pb.pos[2];
          const dl = Math.hypot(dx, dy, dz) || 1;
          const spd = Math.hypot(pb.vel[0], pb.vel[1], pb.vel[2]);
          pb.vel[0] = lerp(pb.vel[0], (dx / dl) * spd, clamp(dt * 9, 0, 1));
          pb.vel[1] = lerp(pb.vel[1], (dy / dl) * spd, clamp(dt * 9, 0, 1));
          pb.vel[2] = lerp(pb.vel[2], (dz / dl) * spd, clamp(dt * 9, 0, 1));
        }
      } else {
        pb.vel[1] -= 3.8 * dt;
      }

      pb.pos[0] += pb.vel[0] * dt;
      pb.pos[1] += pb.vel[1] * dt;
      pb.pos[2] += pb.vel[2] * dt;
      pb.life -= dt;

      let consumed = false;
      for (let j = s.balloons.length - 1; j >= 0; j--) {
        const b = s.balloons[j];
        if (Vec3.dist(pb.pos, b.pos) < b.radius + pb.radius + 0.65) {
          handleBalloonHit(b, j, pb);
          consumed = true;
          break;
        }
      }

      if (!consumed && pb.pos[1] <= 0.3) {
        addFloorSplatter(pb.pos[0], pb.pos[2], pb.color, 3.6);
        spawnParticles([pb.pos[0], 0.35, pb.pos[2]], pb.color, 10, 8, 'sphere', 4);
        consumed = true;
      }
      if (!consumed && (pb.life <= 0 || Math.hypot(pb.pos[0], pb.pos[2]) > PAINT_ARENA_R)) consumed = true;
      if (consumed) s.paintballs.splice(i, 1);
    }

    stepParticlesAndFX(dt);
  }

  function handleBalloonHit(balloon, idx, paintball) {
    const s = session;
    const shooter = s.rovers[paintball.ownerId] || s.rovers[0];
    const toastSide = s.isSplit ? (shooter.id === 0 ? 'left' : 'right') : 'center';

    if (s.isEdu) {
      if (s.kickoffResetTimer > 0) return;

      if (balloon.isCorrect) {
        shooter.streak++;
        shooter.bestStreak = Math.max(shooter.bestStreak, shooter.streak);
        shooter.hits++;
        const pts = 100 + Math.min(shooter.streak - 1, 5) * 25 + (s.wrongOnCurrent === 0 ? 25 : 0);
        shooter.score += pts;
        s.correctCount++;
        s.questionIndex++;

        SoundFX.playPaintPop(shooter.streak);
        addCameraShake(0.42);
        spawnConfettiBurst(balloon.pos, 56);
        spawnParticles(balloon.pos, paintball.color, 26, 16, 'sphere', 6);
        spawnShockwave(balloon.pos, balloon.color, 1.5, 13.0, 0.55);
        addFloorSplatter(balloon.pos[0], balloon.pos[2], balloon.color, 7.2);

        s.balloons.splice(idx, 1);
        addBannerSplash(`🎨 TAM İSABET! ${s.currentQuestion.correctFormatted}`, '#2ee69b', 1.15);
        showToast(`Harika ${shooter.name}! +${pts} Puan (Doğru: ${s.currentQuestion.correctFormatted})`, 'good', toastSide, 2000);
        SoundFX.speak(`Harika! Doğru cevap ${s.currentQuestion.correct}`);
        s.kickoffResetTimer = 1.05;
      } else {
        s.wrongOnCurrent++;
        s.totalWrongs++;
        shooter.streak = 0;
        balloon.wobble = 1.0;

        SoundFX.playWrong();
        spawnParticles(balloon.pos, [1.0, 0.65, 0.2], 14, 9, 'sphere', 3);
        showToast(`Tekrar dene! ${s.currentQuestion.explanation}`, 'warn', 'center', 3400);
        if (s.wrongOnCurrent >= 2) {
          for (const b of s.balloons) if (b.isCorrect) b.hintGlow = 1.0;
        }
      }
      return;
    }

    s.balloons.splice(idx, 1);
    if (balloon.kind === 'mine') {
      shooter.streak = 0;
      shooter.score = Math.max(0, shooter.score - 25);
      SoundFX.playBomb();
      addCameraShake(0.65);
      spawnParticles(balloon.pos, [[0.15, 0.15, 0.2], [1.0, 0.22, 0.28], [1.0, 0.6, 0.1]], 36, 18, 'box', 7);
      spawnShockwave(balloon.pos, [1.0, 0.22, 0.28], 1.8, 14.0, 0.5);
      showToast('💣 Dikenli Mayın! -25 Puan', 'warn', toastSide, 1500);
      return;
    }

    shooter.streak++;
    shooter.bestStreak = Math.max(shooter.bestStreak, shooter.streak);
    shooter.hits++;
    const mult = clamp(1 + Math.floor(shooter.streak / 3), 1, 5);
    const pts = balloon.points * mult;
    shooter.score += pts;

    addFloorSplatter(balloon.pos[0], balloon.pos[2], balloon.color, balloon.kind === 'rainbow' ? 8.2 : 5.4);
    spawnParticles(balloon.pos, balloon.color, 24, 15, 'sphere', 5);
    spawnShockwave(balloon.pos, balloon.color, 1.4, 9.5, 0.45);

    if (balloon.kind === 'rainbow') {
      SoundFX.playBomb();
      SoundFX.playPaintPop(shooter.streak + 2);
      addCameraShake(0.55);
      spawnConfettiBurst(balloon.pos, 52);
      let chainCount = 0;
      for (let k = s.balloons.length - 1; k >= 0; k--) {
        const nb = s.balloons[k];
        if (nb.kind !== 'mine' && Vec3.dist(nb.pos, balloon.pos) < 18.0) {
          shooter.score += nb.points * mult;
          shooter.hits++;
          chainCount++;
          addFloorSplatter(nb.pos[0], nb.pos[2], nb.color, 5.0);
          spawnParticles(nb.pos, nb.color, 16, 12, 'sphere', 4);
          s.balloons.splice(k, 1);
        }
      }
      showToast(`🌈 GÖKKUŞAĞI PATLAMASI! +${chainCount + 1} Balon!`, 'gold', toastSide, 1800);
    } else if (balloon.kind === 'ice') {
      s.freezeTimer = 5.0;
      SoundFX.playBoostPad();
      showToast('❄️ BUZ ETKİSİ! Balonlar yavaşladı!', 'good', toastSide, 1600);
    } else if (balloon.kind === 'gold') {
      SoundFX.playPaintPop(7);
      spawnConfettiBurst(balloon.pos, 32);
      showToast(`🌟 ALTIN YILDIZ! +${pts} Puan!`, 'gold', toastSide, 1500);
    } else {
      SoundFX.playPaintPop(shooter.streak - 1);
    }
  }

  function stepParticlesAndFX(dt) {
    const s = session;
    if (s.camShake > 0) s.camShake = Math.max(0, s.camShake - dt * 2.8);

    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.vel[1] -= 18.0 * dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[1] += p.vel[1] * dt;
      p.pos[2] += p.vel[2] * dt;
      if (p.pos[1] < 0.15) {
        p.pos[1] = 0.15;
        p.vel[1] *= -0.35;
        p.vel[0] *= 0.7;
        p.vel[2] *= 0.7;
      }
      p.rot += p.vrot * dt;
      p.life -= dt;
      if (p.life <= 0) s.particles.splice(i, 1);
    }

    for (let i = s.shockwaves.length - 1; i >= 0; i--) {
      const sw = s.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) s.shockwaves.splice(i, 1);
    }

    for (let i = s.skidMarks.length - 1; i >= 0; i--) {
      s.skidMarks[i].life -= dt;
      if (s.skidMarks[i].life <= 0) s.skidMarks.splice(i, 1);
    }
  }

  // ==================== CAMERA CALCULATION ====================

  function computeCameraForPlayer(playerIdx, dt) {
    const s = session;
    const shake = (s.camShake || 0) * 0.65;
    const shX = shake > 0.01 ? (Math.random() - 0.5) * shake : 0;
    const shY = shake > 0.01 ? (Math.random() - 0.5) * shake : 0;

    if (s.isPaint) {
      const rover = s.rovers[playerIdx];
      const lookYaw = rover.aimYaw;
      const dist = prefs.camMode === 2 ? 18.5 : prefs.camMode === 1 ? 10.2 : 13.8;
      const height = prefs.camMode === 2 ? 12.2 : prefs.camMode === 1 ? 6.4 : 8.4;

      const wantPos = [
        rover.pos[0] - Math.sin(lookYaw) * dist + shX,
        height + shY,
        rover.pos[2] - Math.cos(lookYaw) * dist,
      ];
      const wantTarget = [
        rover.pos[0] + Math.sin(lookYaw) * 22.0,
        5.0 + rover.aimPitch * 8.5,
        rover.pos[2] + Math.cos(lookYaw) * 22.0,
      ];
      const sm = clamp(dt * 8.5, 0, 1);
      Vec3.lerp(rover.camPos, rover.camPos, wantPos, sm);
      Vec3.lerp(rover.camTarget, rover.camTarget, wantTarget, sm);
      return { pos: rover.camPos, target: rover.camTarget, fovRad: (58 * Math.PI) / 180 };
    }

    const car = s.cars[playerIdx];
    const ball = s.ball;
    let camDirX = Math.sin(car.yaw);
    let camDirZ = Math.cos(car.yaw);

    if (prefs.camMode === 1) {
      const bdx = ball.pos[0] - car.pos[0];
      const bdz = ball.pos[2] - car.pos[2];
      const bl = Math.hypot(bdx, bdz);
      if (bl > 3.5) {
        camDirX = bdx / bl;
        camDirZ = bdz / bl;
      }
    }

    const dist = prefs.camMode === 2 ? 24.5 : prefs.camMode === 1 ? 16.5 : 16.2;
    const height = prefs.camMode === 2 ? 15.2 : prefs.camMode === 1 ? 7.8 : 8.2;

    const wantPos = [
      clamp(car.pos[0] - camDirX * dist, -PITCH_HALF_W - 8, PITCH_HALF_W + 8) + shX,
      height + car.pos[1] * 0.45 + shY,
      clamp(car.pos[2] - camDirZ * dist, -PITCH_HALF_L - 10, PITCH_HALF_L + 10),
    ];

    const wantTarget = prefs.camMode === 1
      ? [lerp(car.pos[0], ball.pos[0], 0.56), lerp(car.pos[1] + 2.0, ball.pos[1], 0.56), lerp(car.pos[2], ball.pos[2], 0.56)]
      : [car.pos[0] + camDirX * 12.0, car.pos[1] + 2.4, car.pos[2] + camDirZ * 12.0];

    const sm = clamp(dt * 8.2, 0, 1);
    Vec3.lerp(car.camPos, car.camPos, wantPos, sm);
    Vec3.lerp(car.camTarget, car.camTarget, wantTarget, sm);

    // Dynamic FOV rush during Turbo / Overdrive!
    const targetFov = (prefs.camMode === 2 ? 62 : 58) + (car.boosting || car.overdriveTimer > 0 ? 6.5 : 0);
    car.curFov = lerp(car.curFov || 58, targetFov, clamp(dt * 7, 0, 1));
    return { pos: car.camPos, target: car.camTarget, fovRad: (car.curFov * Math.PI) / 180 };
  }

  // ==================== 3D RENDERING & OVERLAY / RADAR ====================

  function buildAndRender3D(dt) {
    const { w, h } = Engine3D.resize();
    if (overlayCanvas.width !== w || overlayCanvas.height !== h) {
      overlayCanvas.width = w;
      overlayCanvas.height = h;
    }

    Engine3D.beginFrame();

    const s = session;
    Engine3D.drawStadium(s.isPaint, simTime);

    if (!s.isPaint) {
      for (const sk of s.skidMarks) Engine3D.drawSkidMark(sk);
      for (const pad of s.boostPads) Engine3D.drawBoostPad(pad, simTime);
      for (const jp of s.jumpPads) Engine3D.drawJumpPad(jp, simTime);
      for (const pu of s.powerUps) Engine3D.drawPowerUp(pu, simTime);
      for (const g of s.goals) Engine3D.drawGoal(g, simTime);
      for (const k of s.keepers) Engine3D.drawGoalkeeper(k, simTime);
      for (const car of s.cars) Engine3D.drawRocketCar(car, simTime);
      Engine3D.drawSoccerBall(s.ball, simTime, s.isEdu ? 5 : -1);
    } else {
      for (const splat of s.splatters) Engine3D.drawSplatter(splat);
      for (const b of s.balloons) Engine3D.drawBalloon(b, simTime);
      for (const pb of s.paintballs) Engine3D.drawPaintball(pb);
      for (const r of s.rovers) Engine3D.drawPaintRover(r, simTime);
    }

    for (const sw of s.shockwaves) Engine3D.drawShockwave(sw);
    for (const pt of s.particles) Engine3D.drawParticle(pt);

    Engine3D.renderShadowPass();

    renderedViews = [];
    if (!s.isSplit) {
      const cam = computeCameraForPlayer(0, dt);
      const rect = { x: 0, y: 0, w, h };
      const info = Engine3D.renderViewport(rect, cam, simTime);
      renderedViews.push({ playerIdx: 0, rect, ...info });
    } else {
      const halfW = Math.floor(w * 0.5);
      const cam1 = computeCameraForPlayer(0, dt);
      const rect1 = { x: 0, y: 0, w: halfW, h };
      const info1 = Engine3D.renderViewport(rect1, cam1, simTime);
      renderedViews.push({ playerIdx: 0, rect: rect1, ...info1 });

      const cam2 = computeCameraForPlayer(1, dt);
      const rect2 = { x: halfW, y: 0, w: w - halfW, h };
      const info2 = Engine3D.renderViewport(rect2, cam2, simTime);
      renderedViews.push({ playerIdx: 1, rect: rect2, ...info2 });
    }

    drawOverlay2D(w, h);
    drawRadars();
  }

  function drawOverlay2D(w, h) {
    octx.clearRect(0, 0, w, h);
    const s = session;
    if (!s || modeState !== 'playing') return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Off-Screen Ball Indicator Arrow in Rocket Gol!
    if (!s.isPaint && s.ball) {
      for (const view of renderedViews) {
        const ndc = Mat4.projectToNDC(view.vp, s.ball.pos);
        const onScreen = ndc.visible && Math.abs(ndc.x) < 0.94 && Math.abs(ndc.y) < 0.92;
        if (!onScreen) {
          let nx = ndc.visible ? ndc.x : -ndc.x;
          let ny = ndc.visible ? ndc.y : -Math.abs(ndc.y) - 0.5;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len; ny /= len;
          const cx = view.rect.x + view.rect.w * 0.5;
          const cy = h * 0.5;
          const ax = clamp(cx + nx * (view.rect.w * 0.42), view.rect.x + 42 * dpr, view.rect.x + view.rect.w - 42 * dpr);
          const ay = clamp(cy - ny * (h * 0.36), 95 * dpr, h - 95 * dpr);
          const ang = Math.atan2(-ny, nx);

          octx.save();
          octx.translate(ax, ay);
          octx.rotate(ang);
          octx.fillStyle = '#ffd147';
          octx.strokeStyle = '#071426';
          octx.lineWidth = 3 * dpr;
          octx.beginPath();
          octx.moveTo(16 * dpr, 0);
          octx.lineTo(-10 * dpr, -11 * dpr);
          octx.lineTo(-6 * dpr, 0);
          octx.lineTo(-10 * dpr, 11 * dpr);
          octx.closePath();
          octx.fill();
          octx.stroke();
          octx.restore();
        }
      }
    }

    // 2. Paint Mode Reticle
    if (s.isPaint) {
      for (const view of renderedViews) {
        const rover = s.rovers[view.playerIdx];
        const aimDir = [
          Math.sin(rover.aimYaw) * Math.cos(rover.aimPitch),
          Math.sin(rover.aimPitch),
          Math.cos(rover.aimYaw) * Math.cos(rover.aimPitch),
        ];
        const pt = rover.lockedTarget
          ? rover.lockedTarget.pos
          : [rover.pos[0] + aimDir[0] * 22, 1.75 + aimDir[1] * 22, rover.pos[2] + aimDir[2] * 22];
        const ndc = Mat4.projectToNDC(view.vp, pt);
        if (ndc.visible) {
          const sx = view.rect.x + (ndc.x * 0.5 + 0.5) * view.rect.w;
          const sy = h - (view.rect.y + (ndc.y * 0.5 + 0.5) * view.rect.h);
          const locked = !!rover.lockedTarget;
          const rad = (locked ? 22 : 16) * dpr;

          octx.save();
          octx.strokeStyle = locked ? '#2ee69b' : (rover.id === 0 ? '#22d3ee' : '#ff8c38');
          octx.lineWidth = (locked ? 3.2 : 2.2) * dpr;
          octx.beginPath();
          octx.arc(sx, sy, rad, 0, Math.PI * 2);
          octx.stroke();

          const tIn = rad * 0.45, tOut = rad * 1.38;
          octx.beginPath();
          octx.moveTo(sx - tOut, sy); octx.lineTo(sx - tIn, sy);
          octx.moveTo(sx + tIn, sy);  octx.lineTo(sx + tOut, sy);
          octx.moveTo(sx, sy - tOut); octx.lineTo(sx, sy - tIn);
          octx.moveTo(sx, sy + tIn);  octx.lineTo(sx, sy + tOut);
          octx.stroke();
          octx.fillStyle = octx.strokeStyle;
          octx.beginPath();
          octx.arc(sx, sy, 3.2 * dpr, 0, Math.PI * 2);
          octx.fill();
          octx.restore();
        }
      }
    }

    // 3. Center Splash Banner
    if (s.bannerTimer > 0) {
      const p = clamp(s.bannerTimer / Math.max(0.01, s.bannerMax), 0, 1);
      const scale = 1.0 + Math.sin((1 - p) * Math.PI) * 0.14;
      const alpha = p < 0.25 ? p / 0.25 : 1.0;

      octx.save();
      octx.globalAlpha = alpha;
      octx.translate(w * 0.5, h * 0.40);
      octx.scale(scale, scale);
      octx.font = `900 ${Math.round(44 * dpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.lineWidth = 10 * dpr;
      octx.strokeStyle = 'rgba(6, 16, 32, 0.88)';
      octx.strokeText(s.bannerText, 0, 0);
      octx.fillStyle = s.bannerColor || '#ffd147';
      octx.fillText(s.bannerText, 0, 0);
      octx.restore();
    }
  }

  function drawSingleRadar(canvas, focusIdx) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W * 0.5, cy = H * 0.5;
    const s = session;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = s.isPaint ? 'rgba(14, 42, 68, 0.85)' : 'rgba(18, 72, 34, 0.85)';
    ctx.fillRect(0, 0, W, H);

    const scaleX = (W * 0.42) / PITCH_HALF_W;
    const scaleZ = (H * 0.42) / PITCH_HALF_L;

    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 1.5;
    if (s.isPaint) {
      ctx.beginPath();
      ctx.arc(cx, cy, W * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - PITCH_HALF_W * scaleX, cy - PITCH_HALF_L * scaleZ, PITCH_HALF_W * 2 * scaleX, PITCH_HALF_L * 2 * scaleZ);
      ctx.beginPath();
      ctx.moveTo(cx - PITCH_HALF_W * scaleX, cy);
      ctx.lineTo(cx + PITCH_HALF_W * scaleX, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 13.5 * scaleX, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!s.isPaint) {
      for (const g of s.goals) {
        ctx.fillStyle = g.hex || (g.id === 0 ? '#ff8c38' : '#22d3ee');
        ctx.fillRect(cx + (g.x - g.width * 0.5) * scaleX, cy + g.z * scaleZ - 3, g.width * scaleX, 6);
      }
      for (const k of s.keepers) {
        ctx.fillStyle = '#ffd147';
        ctx.fillRect(cx + (k.x - k.width * 0.5) * scaleX, cy + k.z * scaleZ - 2, Math.max(4, k.width * scaleX), 4);
      }

      const bx = cx + s.ball.pos[0] * scaleX;
      const bz = cy + s.ball.pos[2] * scaleZ;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, bz, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd147';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (const car of s.cars) {
        const px = cx + car.pos[0] * scaleX;
        const pz = cy + car.pos[2] * scaleZ;
        ctx.save();
        ctx.translate(px, pz);
        ctx.rotate(Math.atan2(Math.sin(car.yaw), -Math.cos(car.yaw)));
        ctx.fillStyle = car.id === 0 ? '#22d3ee' : '#ff8c38';
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(4.8, 5.5);
        ctx.lineTo(-4.8, 5.5);
        ctx.closePath();
        ctx.fill();
        if (car.id === focusIdx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.restore();
      }
    } else {
      for (const b of s.balloons) {
        ctx.fillStyle = b.kind === 'mine' ? '#ff3b52' : b.kind === 'gold' ? '#ffd147' : '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + b.pos[0] * scaleX, cy + b.pos[2] * scaleZ, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of s.rovers) {
        ctx.fillStyle = r.id === 0 ? '#22d3ee' : '#ff8c38';
        ctx.beginPath();
        ctx.arc(cx + r.pos[0] * scaleX, cy + r.pos[2] * scaleZ, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  function drawRadars() {
    if (!session) return;
    if (!session.isSplit) drawSingleRadar(els.radarSingle, 0);
    else { drawSingleRadar(els.radarP1, 0); drawSingleRadar(els.radarP2, 1); }
  }

  // ==================== HUD UPDATE ====================

  function updateHudValues() {
    const s = session;
    if (!s) return;
    const clockStr = s.isEdu ? formatClock(s.elapsed) : formatClock(s.timeLeft);

    if (!s.isSplit) {
      els.singleTimer.textContent = clockStr;
      const p1 = s.isPaint ? s.rovers[0] : s.cars[0];

      if (s.isEdu) {
        els.sStat1Val.textContent = p1.score;
        els.sStat2Val.textContent = `${Math.min(s.questionIndex + 1, s.totalQuestions)} / ${s.totalQuestions}`;
        els.sStat3Val.textContent = `x${Math.max(1, p1.streak)}`;
        els.singleProgressBar.style.width = `${(s.questionIndex / s.totalQuestions) * 100}%`;
        els.qbStreakPill.classList.toggle('hidden', p1.streak < 2);
        els.qbStreakPill.textContent = `🔥 x${p1.streak}`;
      } else if (!s.isPaint) {
        const bot = s.cars[1];
        els.sStat1Val.textContent = p1.goals;
        els.sStat2Val.textContent = bot.goals;
        els.sStat3Val.textContent = p1.score;
        els.funSoccerP1Score.textContent = p1.goals;
        els.funSoccerP2Score.textContent = bot.goals;
        els.funSoccerClock.textContent = clockStr;
        els.singleProgressBar.style.width = `${(s.timeLeft / prefs.funDuration) * 100}%`;
      } else {
        const mult = clamp(1 + Math.floor(p1.streak / 3), 1, 5);
        els.sStat1Val.textContent = p1.score;
        els.sStat2Val.textContent = p1.hits;
        els.sStat3Val.textContent = `x${mult}`;
        els.funPaintClock.textContent = clockStr;
        els.funPaintCombo.textContent = `KOMBO x${mult}`;
        els.singleProgressBar.style.width = `${(s.timeLeft / prefs.funDuration) * 100}%`;
      }

      // Active Power-Up / Special Buff Strip
      let powerTxt = '', powerSec = 0;
      if (!s.isPaint) {
        if (p1.overdriveTimer > 0) { powerTxt = '🌀 SÜPER TURBO'; powerSec = p1.overdriveTimer; }
        else if (p1.superTurboTimer > 0) { powerTxt = '⚡ SÜPER TURBO'; powerSec = p1.superTurboTimer; }
        else if (p1.magnetTimer > 0) { powerTxt = '🧲 TOP MIKNATISI'; powerSec = p1.magnetTimer; }
        else if (s.ball.slowTimer > 0) { powerTxt = '❄️ BUZ ALANI'; powerSec = s.ball.slowTimer; }
        else if (s.ball.giantTimer > 0) { powerTxt = '⚽ DEV TOP'; powerSec = s.ball.giantTimer; }
      } else if (p1.rapidTimer > 0) {
        powerTxt = '🌀 SERİ ATIŞ'; powerSec = p1.rapidTimer;
      } else if (s.freezeTimer > 0) {
        powerTxt = '❄️ BUZ ETKİSİ'; powerSec = s.freezeTimer;
      }
      els.singlePowerStrip.classList.toggle('hidden', powerSec <= 0);
      if (powerSec > 0) {
        els.singlePowerText.textContent = powerTxt;
        els.singlePowerTime.textContent = `${powerSec.toFixed(1)}s`;
      }

      // Special Ability Readiness Pill
      const spReady = p1.specialCooldown <= 0.05;
      els.p1SpecialPill.classList.toggle('ready', spReady);
      els.p1SpecialPill.classList.toggle('cooldown', !spReady);
      els.p1SpecialState.textContent = spReady ? 'HAZIR!' : `${p1.specialCooldown.toFixed(1)}s`;

      if (!s.isPaint) {
        const kmh = Math.round(Math.hypot(p1.vel[0], p1.vel[2]) * 3.4);
        els.p1SpeedReadout.textContent = `${kmh} km/s`;
        els.p1TurboBar.style.width = `${clamp(p1.turbo, 0, 100)}%`;
        const jumpReady = p1.jumpCooldown <= 0.02 && p1.onGround;
        els.p1ActionPill.classList.toggle('cooldown', !jumpReady);
        els.p1ActionState.textContent = jumpReady ? 'HAZIR' : 'DOLUYOR';
      } else {
        els.p1SpeedReadout.textContent = p1.lockedTarget ? 'KİLİTLENDİ 🎯' : 'NİŞAN AL';
        els.p1TurboBar.style.width = `${clamp((1 - p1.fireCooldown / 0.24) * 100, 0, 100)}%`;
        els.p1ActionPill.classList.remove('cooldown');
        els.p1ActionState.textContent = 'ATEŞ HAZIR';
      }
    } else {
      els.splitTimer.textContent = clockStr;
      const p1 = s.isPaint ? s.rovers[0] : s.cars[0];
      const p2 = s.isPaint ? s.rovers[1] : s.cars[1];

      if (!s.isEdu && !s.isPaint) {
        els.sp1ScoreBadge.textContent = p1.goals;
        els.sp2ScoreBadge.textContent = p2.goals;
        els.sp1Detail.textContent = `Puan: ${p1.score}`;
        els.sp2Detail.textContent = `Puan: ${p2.score}`;
      } else {
        els.sp1ScoreBadge.textContent = p1.score;
        els.sp2ScoreBadge.textContent = p2.score;
        els.sp1Detail.textContent = `Seri: x${Math.max(1, p1.streak)}`;
        els.sp2Detail.textContent = `Seri: x${Math.max(1, p2.streak)}`;
      }

      const sp1R = p1.specialCooldown <= 0.05;
      const sp2R = p2.specialCooldown <= 0.05;
      els.sp1SpecialTag.classList.toggle('ready', sp1R);
      els.sp2SpecialTag.classList.toggle('ready', sp2R);
      els.sp1SpecialTag.textContent = sp1R ? `${p1.special.icon} HAZIR (E)` : `${p1.specialCooldown.toFixed(1)}s`;
      els.sp2SpecialTag.textContent = sp2R ? `${p2.special.icon} HAZIR (K)` : `${p2.specialCooldown.toFixed(1)}s`;

      if (!s.isPaint) {
        els.sp1Turbo.style.width = `${clamp(p1.turbo, 0, 100)}%`;
        els.sp2Turbo.style.width = `${clamp(p2.turbo, 0, 100)}%`;
      } else {
        els.sp1Turbo.style.width = `${clamp((1 - p1.fireCooldown / 0.24) * 100, 0, 100)}%`;
        els.sp2Turbo.style.width = `${clamp((1 - p2.fireCooldown / 0.24) * 100, 0, 100)}%`;
      }
    }
  }

  // ==================== SESSION FINISH ====================

  function finishSession() {
    if (modeState === 'ended' || !session) return;
    modeState = 'ended';
    SoundFX.setBoost(0);
    SoundFX.playWhistle();
    setTimeout(() => SoundFX.playVictory(), 280);
    SoundFX.setMusicIntensity('menu');

    const s = session;
    const modeKey = s.isEdu ? 'edu' : 'fun';
    const variantLabel = s.isPaint ? '🎨 Boya Topu' : '⚽ Roket Gol';
    const p1 = s.isPaint ? s.rovers[0] : s.cars[0];
    const p2 = s.isSplit ? (s.isPaint ? s.rovers[1] : s.cars[1]) : (s.cars[1] || null);

    let detail = '';
    if (s.isEdu) {
      const rTxt = s.roundMode === 'ten' ? 'Onluk' : s.roundMode === 'hundred' ? 'Yüzlük' : 'Karışık';
      detail = `${s.grade}. Sınıf • ${rTxt} • ${p1.spec.name}`;
    } else if (!s.isPaint) {
      detail = `Skor ${p1.goals}-${p2 ? p2.goals : 0} • ${p1.spec.name}`;
    } else {
      detail = `${p1.hits} İsabet • ${p1.spec.name}`;
    }

    let isNewRecord = false;
    if (!s.isSplit) {
      const finalScore = (!s.isEdu && !s.isPaint) ? p1.score + (p1.goals > (p2 ? p2.goals : 0) ? 250 : 0) : p1.score;
      const rec = Scoreboard.record(modeKey, { name: p1.name, score: finalScore, variant: variantLabel, detail, playersLabel: '1K' });
      isNewRecord = rec.isNewRecord;

      els.endSummarySingle.classList.remove('hidden');
      els.endSummarySplit.classList.add('hidden');
      els.endBadge.textContent = s.isEdu ? 'EĞİTİM TURU TAMAMLANDI' : 'MAÇ BİTTİ!';

      if (s.isEdu) {
        els.endTitle.textContent = `Harikasın ${p1.name}! 🎉`;
        els.endDesc.textContent = `${s.grade}. sınıf yuvarlama görevlerini ${p1.spec.name} ile tamamladın!`;
        els.endStat1Lbl.textContent = 'TOPLAM PUAN'; els.endStat1Val.textContent = p1.score;
        els.endStat2Lbl.textContent = 'TAMAMLANAN'; els.endStat2Val.textContent = `${s.correctCount} / ${s.totalQuestions}`;
        els.endStat3Lbl.textContent = 'SÜRE'; els.endStat3Val.textContent = formatClock(s.elapsed);
        els.endStat4Lbl.textContent = 'EN İYİ SERİ'; els.endStat4Val.textContent = `x${Math.max(1, p1.bestStreak)}`;
      } else if (!s.isPaint) {
        const won = p1.goals > p2.goals, draw = p1.goals === p2.goals;
        els.endTitle.textContent = won ? `🏆 ŞAMPİYON ${p1.name}!` : draw ? '🤝 BERABERE!' : `🤖 ${p2.name} Kazandı!`;
        els.endDesc.textContent = won ? 'Muhteşem gollerle kupayı kaldırdın!' : 'Harika mücadele! Rövanşta kesin kazanırsın!';
        els.endStat1Lbl.textContent = 'MAÇ SKORU'; els.endStat1Val.textContent = `${p1.goals} - ${p2.goals}`;
        els.endStat2Lbl.textContent = 'PUAN'; els.endStat2Val.textContent = finalScore;
        els.endStat3Lbl.textContent = 'SÜRE'; els.endStat3Val.textContent = `${prefs.funDuration} sn`;
        els.endStat4Lbl.textContent = 'ARABAN'; els.endStat4Val.textContent = `${p1.spec.icon} ${p1.spec.name}`;
      } else {
        els.endTitle.textContent = `🎨 Boya Şampiyonu ${p1.name}!`;
        els.endDesc.textContent = 'Arenayı rengarenk boyadın, müthiş nişancılık!';
        els.endStat1Lbl.textContent = 'TOPLAM SKOR'; els.endStat1Val.textContent = p1.score;
        els.endStat2Lbl.textContent = 'PATLATILAN'; els.endStat2Val.textContent = `${p1.hits} Balon`;
        els.endStat3Lbl.textContent = 'SÜRE'; els.endStat3Val.textContent = `${prefs.funDuration} sn`;
        els.endStat4Lbl.textContent = 'EN İYİ SERİ'; els.endStat4Val.textContent = `x${Math.max(1, p1.bestStreak)}`;
      }
    } else {
      const p1M = (!s.isEdu && !s.isPaint) ? p1.goals : p1.score;
      const p2M = (!s.isEdu && !s.isPaint) ? p2.goals : p2.score;
      const rec1 = Scoreboard.record(modeKey, { name: p1.name, score: p1.score, variant: variantLabel, detail, playersLabel: '2K' });
      const rec2 = Scoreboard.record(modeKey, { name: p2.name, score: p2.score, variant: variantLabel, detail, playersLabel: '2K' });
      isNewRecord = rec1.isNewRecord || rec2.isNewRecord;

      els.endSummarySingle.classList.add('hidden');
      els.endSummarySplit.classList.remove('hidden');
      els.endBadge.textContent = '2 OYUNCULU ARENA SONUCU';
      els.endTitle.textContent = p1M > p2M ? `🏆 ${p1.name} KAZANDI!` : p2M > p1M ? `🏆 ${p2.name} KAZANDI!` : '🤝 DOSTLUK KAZANDI!';
      els.endDesc.textContent = `${p1.spec.name} vs ${p2.spec.name} — harika mücadele!`;
      els.endP1Name.textContent = `${p1.spec.icon} ${p1.name}`;
      els.endP2Name.textContent = `${p2.spec.icon} ${p2.name}`;
      els.endP1Val.textContent = (!s.isEdu && !s.isPaint) ? `${p1.goals} Gol` : `${p1.score}`;
      els.endP2Val.textContent = (!s.isEdu && !s.isPaint) ? `${p2.goals} Gol` : `${p2.score}`;
      els.endP1Detail.textContent = `En İyi Seri: x${Math.max(1, p1.bestStreak)}`;
      els.endP2Detail.textContent = `En İyi Seri: x${Math.max(1, p2.bestStreak)}`;
    }

    els.endRecordBanner.classList.toggle('hidden', !isNewRecord);
    els.endOverlay.classList.remove('hidden');
    els.titleFunBest.textContent = Scoreboard.getBest('fun');
  }

  // ==================== MAIN GAME LOOP ====================

  function tick(nowMs) {
    requestAnimationFrame(tick);
    if (!lastFrameMs) lastFrameMs = nowMs;
    const dt = Math.min((nowMs - lastFrameMs) / 1000, 0.05);
    lastFrameMs = nowMs;
    simTime += dt;

    if (modeState === 'playing' && session) {
      const s = session;
      if (s.bannerTimer > 0) s.bannerTimer = Math.max(0, s.bannerTimer - dt);

      if (s.countdown > 0) {
        const prevCeil = Math.ceil(s.countdown);
        s.countdown = Math.max(0, s.countdown - dt);
        const curCeil = Math.ceil(s.countdown);
        if (curCeil !== prevCeil && curCeil > 0) {
          addBannerSplash(`${curCeil}`, '#ffd147', 0.8);
          SoundFX.playUiClick(520 + (3 - curCeil) * 140);
        } else if (s.countdown === 0) {
          addBannerSplash('BAŞLA! 🚀', '#2ee69b', 0.85);
          SoundFX.playWhistle();
        }
      } else {
        s.elapsed += dt;
        if (!s.isEdu) {
          s.timeLeft = Math.max(0, s.timeLeft - dt);
          if (s.timeLeft <= 0) finishSession();
        }
      }

      if (modeState === 'playing') {
        if (s.isPaint) stepPaintArena(dt);
        else stepSoccer(dt);
        updateHudValues();
      }
    }

    if (topDown) renderTopDown();
    else if (session) buildAndRender3D(dt);
  }

  // ==================== DIRECT CLICK / SMARTBOARD TAP AIMING (BOYA TOPU) ====================

  function arenaView(rect, isPaint) {
    const halfWidth = isPaint ? PAINT_ARENA_R : PITCH_HALF_W;
    const halfLength = isPaint ? PAINT_ARENA_R : PITCH_HALF_L;
    const scale = Math.min(rect.w * 0.90 / (halfWidth * 2), rect.h * 0.66 / (halfLength * 2));
    return { cx: rect.x + rect.w / 2, cy: rect.h / 2, scale, halfWidth, halfLength };
  }

  function renderTopDown() {
    if (!session) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.floor(overlayCanvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(overlayCanvas.clientHeight * dpr));
    if (overlayCanvas.width !== w || overlayCanvas.height !== h) {
      overlayCanvas.width = w;
      overlayCanvas.height = h;
    }
    drawOverlay2D(w, h);
    const s = session;
    const count = s.isSplit ? 2 : 1;
    const ctx = octx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    for (let i = 0; i < count; i++) {
      const { cx, cy, scale, halfWidth, halfLength } = arenaView({ x: i * w / count, w: w / count, h }, s.isPaint);
      const xAt = (x) => cx + x * scale;
      const yAt = (z) => cy + z * scale;
      const dot = (pos, radius, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xAt(pos[0]), yAt(pos[2]), Math.max(2, radius * scale), 0, Math.PI * 2);
        ctx.fill();
      };
      const label = (text, x, y) => {
        ctx.font = 'bold ' + Math.max(12 * dpr, 4.6 * scale) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = '#172437';
        ctx.fillStyle = '#fff';
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(i * w / count, 0, w / count, h);
      ctx.clip();
      for (const vehicle of s.isPaint ? s.rovers : s.cars) {
        ctx.save();
        ctx.translate(xAt(vehicle.pos[0]), yAt(vehicle.pos[2]));
        ctx.rotate(-vehicle.yaw);
        ctx.fillStyle = vehicle.id === 0 ? '#44d8ff' : '#ffad59';
        ctx.strokeStyle = vehicle.id === i ? '#fff' : '#142538';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, 4.5 * scale);
        ctx.lineTo(-3 * scale, -3 * scale);
        ctx.lineTo(3 * scale, -3 * scale);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }
      if (s.isPaint) {
        for (const b of s.balloons) {
          if (b.kind === 'edu') label(RoundingEdu.formatNum(b.answerVal), xAt(b.pos[0]), yAt(b.pos[2]));
          const color = 'rgb(' + b.color.map(c => Math.round(c * 255)).join(',') + ')';
          dot(b.pos, b.radius + 1.4, color);
        }
        for (const shot of s.paintballs) dot(shot.pos, 1.1, '#fff0a6');
      } else {
        dot(s.ball.pos, s.ball.radius, '#fffbe5');
        for (const g of s.goals) {
          if (s.isEdu) label(RoundingEdu.formatNum(g.answerVal), xAt(g.x), yAt(g.z) - 10 * dpr);
          ctx.fillStyle = g.hex;
          ctx.fillRect(xAt(g.x - g.width / 2), yAt(g.z) - 3 * dpr, g.width * scale, 6 * dpr);
        }
        for (const keeper of s.keepers) dot([keeper.x, 0, keeper.z], 2.2, '#ffd147');
        for (const pad of s.boostPads) dot([pad.x, 0, pad.z], 1.6, '#9ae2fa');
        for (const pad of s.jumpPads) dot([pad.x, 0, pad.z], 1.6, '#ffde77');
        for (const power of s.powerUps) if (power.pos) dot(power.pos, 2.4, '#fbc1ff');
      }
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = '#b3ded8';
      ctx.fillStyle = s.isPaint ? '#17364b' : '#255c47';
      ctx.beginPath();
      if (s.isPaint) ctx.arc(cx, cy, halfWidth * scale, 0, Math.PI * 2);
      else ctx.rect(xAt(-halfWidth), yAt(-halfLength), halfWidth * 2 * scale, halfLength * 2 * scale);
      ctx.stroke();
      ctx.fill();
      ctx.fillStyle = '#0d2237';
      ctx.fillRect(i * w / count, 0, w / count, h);
      ctx.restore();
    }
    ctx.restore();
    drawRadars();
  }

  function handleCanvasAimOrShoot(clientX, clientY, shouldFire) {
    if (modeState !== 'playing' || !session || !session.isPaint) return;
    const rect = gameCanvas.getBoundingClientRect();
    if (topDown) {
      const width = session.isSplit ? rect.width / 2 : rect.width;
      const posX = clientX - rect.left;
      const index = session.isSplit && posX >= width ? 1 : 0;
      const view = arenaView({ x: index * width, w: width, h: rect.height }, true);
      const x = (posX - view.cx) / view.scale;
      const z = (clientY - rect.top - view.cy) / view.scale;
      const hit = session.balloons.find(b => Math.hypot(b.pos[0] - x, b.pos[2] - z) <= b.radius + 1.6);
      aimPaintball(session.rovers[index], hit ? hit.pos : [x, 4, z], shouldFire);
      return;
    }
    const dpr = gameCanvas.width / Math.max(1, rect.width);
    const px = (clientX - rect.left) * dpr;
    const pyBottomUp = gameCanvas.height - (clientY - rect.top) * dpr;

    let targetView = null;
    for (const v of renderedViews) {
      if (px >= v.rect.x && px <= v.rect.x + v.rect.w) { targetView = v; break; }
    }
    if (!targetView) return;

    const rover = session.rovers[targetView.playerIdx];
    const ndcX = ((px - targetView.rect.x) / Math.max(1, targetView.rect.w)) * 2 - 1;
    const ndcY = ((pyBottomUp - targetView.rect.y) / Math.max(1, targetView.rect.h)) * 2 - 1;

    const ray = unprojectRay(targetView.camPos, targetView.camForward, targetView.camRight, targetView.camUp, targetView.fovRad, targetView.aspect, ndcX, ndcY);

    let hitBalloon = null, bestT = Infinity;
    for (const b of session.balloons) {
      const t = raySphereIntersect(ray.origin, ray.dir, b.pos, b.radius * 1.50);
      if (t > 0 && t < bestT) { bestT = t; hitBalloon = b; }
    }

    let aimPoint;
    if (hitBalloon) {
      const lead = hitBalloon.kind === 'edu' ? 0.08 : 0.14;
      aimPoint = [
        hitBalloon.pos[0] + (hitBalloon.vel ? hitBalloon.vel[0] * lead : 0),
        hitBalloon.pos[1] + (hitBalloon.vel ? hitBalloon.vel[1] * lead : 0),
        hitBalloon.pos[2] + (hitBalloon.vel ? hitBalloon.vel[2] * lead : 0),
      ];
    } else {
      let t = 28;
      if (Math.abs(ray.dir[1]) > 0.08) {
        const ty = (4.0 - ray.origin[1]) / ray.dir[1];
        if (ty > 4 && ty < 55) t = ty;
      }
      aimPoint = [ray.origin[0] + ray.dir[0] * t, clamp(ray.origin[1] + ray.dir[1] * t, 1.5, 12.0), ray.origin[2] + ray.dir[2] * t];
    }

    aimPaintball(rover, aimPoint, shouldFire);
  }

  function aimPaintball(rover, aimPoint, shouldFire) {
    const dx = aimPoint[0] - rover.pos[0];
    const dy = aimPoint[1] - 1.75;
    const dz = aimPoint[2] - rover.pos[2];
    const horiz = Math.hypot(dx, dz) || 1;
    const dist = Math.hypot(dx, dy, dz) || 1;

    rover.aimYaw = Math.atan2(dx, dz);
    rover.aimPitch = clamp(Math.atan2(dy, horiz), -0.05, 0.58);
    rover.yaw = lerpAngle(rover.yaw, rover.aimYaw, 0.55);

    if (shouldFire) firePaintballFromRover(rover, [dx / dist, dy / dist, dz / dist]);
  }

  gameCanvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || modeState !== 'playing' || !session || !session.isPaint) return;
    SoundFX.ensure();
    handleCanvasAimOrShoot(e.clientX, e.clientY, true);
  });
  gameCanvas.addEventListener('pointermove', (e) => {
    if (modeState !== 'playing' || !session || !session.isPaint || session.isSplit) return;
    if (e.pointerType === 'mouse') handleCanvasAimOrShoot(e.clientX, e.clientY, false);
  });

  // ==================== KEYBOARD & TOUCH BINDINGS ====================

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target !== document.body && !gameArea.contains(e.target)) return;
    if (e.target.closest?.('input, select, textarea, [contenteditable]') && e.code !== 'Escape') return;
    const playing = modeState === 'playing';
    const nativeControl = e.target.closest?.('button, a, input, select, textarea');
    if (playing && !nativeControl) {
      const gameplayKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];
      if (gameplayKeys.includes(e.code)) e.preventDefault();
      keys.add(e.code);
    }
    if (e.repeat) return;

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!els.settingsOverlay.classList.contains('hidden')) closeSettings();
      else if (!els.scoreboardOverlay.classList.contains('hidden')) closeScoreboard();
      else if (modeState === 'playing') pauseGame();
      else if (modeState === 'paused') resumeGame();
    } else if (e.code === 'KeyC' && modeState === 'playing') {
      prefs.camMode = (prefs.camMode + 1) % 3;
      syncAllUI();
      SoundFX.playUiClick(680);
    } else if (e.code === 'KeyN') {
      prefs.musicOn = !prefs.musicOn;
      syncAllUI();
      SoundFX.playToggle(prefs.musicOn);
    } else if (e.code === 'KeyR' && (modeState === 'paused' || modeState === 'ended')) {
      startSession();
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', resetControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetControls();
  });

  function resetControls() {
    keys.clear();
    heldControls.clear();
    releaseJoy();
    gameArea.querySelectorAll('.t-btn.active, .ts-btn.active').forEach(button => button.classList.remove('active'));
    for (const player of Object.values(touchInput)) {
      player.turbo = false;
      player.primary = false;
      player.special = false;
    }
  }

  function updateJoy(clientX, clientY) {
    const r = els.joyBase.getBoundingClientRect();
    const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.5, maxR = r.width * 0.38;
    let dx = clientX - cx, dy = clientY - cy;
    const distance = Math.hypot(dx, dy);
    if (distance > maxR) { dx = dx / distance * maxR; dy = dy / distance * maxR; }
    els.joyKnob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    touchInput.p1.steer = clamp(-dx / maxR, -1, 1);
    touchInput.p1.throttle = clamp(-dy / maxR, -1, 1);
  }

  function capturePointer(surface, event) {
    try { surface.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function releaseJoy(event) {
    if (event && joyPointerId !== event.pointerId) return;
    joyPointerId = null;
    els.joyKnob.style.transform = 'translate(0, 0)';
    touchInput.p1.steer = 0;
    touchInput.p1.throttle = 0;
  }

  els.joyBase.addEventListener('pointerdown', event => {
    if (event.button !== 0 || joyPointerId !== null) return;
    event.preventDefault();
    joyPointerId = event.pointerId;
    capturePointer(els.joyBase, event);
    updateJoy(event.clientX, event.clientY);
  });
  els.joyBase.addEventListener('pointermove', event => {
    if (event.pointerId === joyPointerId) updateJoy(event.clientX, event.clientY);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    els.joyBase.addEventListener(type, releaseJoy);
  }

  function bindHoldButton(button, player, action) {
    let pointerId = null;
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (pointerId !== null && heldControls.has(button.id))) return;
      event.preventDefault();
      pointerId = event.pointerId;
      capturePointer(button, event);
      heldControls.add(button.id);
      button.classList.add('active');
      if (action) player[action] = true;
    });
    function release(event) {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      heldControls.delete(button.id);
      button.classList.remove('active');
      if (action) player[action] = false;
    }
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, release);
    }
  }

  bindHoldButton(els.t1Reverse, touchInput.p1);
  bindHoldButton(els.t1Special, touchInput.p1, 'special');
  bindHoldButton(els.t1Turbo, touchInput.p1, 'turbo');
  bindHoldButton(els.t1Primary, touchInput.p1, 'primary');

  for (const prefix of ['tp1', 'tp2']) {
    const player = prefix === 'tp1' ? touchInput.p1 : touchInput.p2;
    for (const button of ['Left', 'Right', 'Gas', 'Reverse']) bindHoldButton($(prefix + button), player);
    bindHoldButton($(prefix + 'Special'), player, 'special');
    bindHoldButton($(prefix + 'Turbo'), player, 'turbo');
    bindHoldButton($(prefix + 'Primary'), player, 'primary');
  }

  // ==================== MODAL & MENU WIRING ====================

  function pauseGame() {
    if (modeState !== 'playing') return;
    modeState = 'paused';
    resetControls();
    SoundFX.setBoost(0);
    els.pauseOverlay.classList.remove('hidden');
    $('btnResume').focus({ preventScroll: true });
  }

  function resumeGame() {
    if (modeState !== 'paused') return;
    modeState = 'playing';
    els.pauseOverlay.classList.add('hidden');
    els.settingsOverlay.classList.add('hidden');
    setupHudLayout();
    gameCanvas.focus({ preventScroll: true });
  }

  function returnToMenu() {
    modeState = 'menu';
    session = null;
    SoundFX.setBoost(0);
    SoundFX.setMusicIntensity('menu');
    els.hudSingle.classList.add('hidden');
    els.hudSplit.classList.add('hidden');
    els.pauseOverlay.classList.add('hidden');
    els.endOverlay.classList.add('hidden');
    els.startOverlay.classList.remove('hidden');
    syncAllUI();
    $('btnStart').focus({ preventScroll: true });
  }

  function openSettings(initialTab = 'setup') {
    SoundFX.playUiClick(640);
    if (modeState === 'playing') pauseGame();
    switchSettingsTab(initialTab);
    syncAllUI();
    els.settingsOverlay.classList.remove('hidden');
  }

  function closeSettings() {
    SoundFX.playUiClick(560);
    prefs.nameP1 = (els.inputNameP1.value || '').trim();
    prefs.nameP2 = (els.inputNameP2.value || '').trim();
    syncAllUI();
    els.settingsOverlay.classList.add('hidden');
    if (session && modeState === 'paused') {
      setupHudLayout();
      if (session.isEdu && session.currentQuestion) {
        const q = session.currentQuestion;
        const html = prefs.hintOn ? `${q.prefix}<span class="hl-digit">${q.deciding}</span>` : q.numFormatted;
        els.qbNumberDisplay.innerHTML = html;
        els.splitQbNumber.innerHTML = html;
      }
    }
  }

  function openScoreboard(tab) {
    SoundFX.playUiClick(700);
    if (tab) sbActiveTab = tab;
    renderScoreboardList();
    els.scoreboardOverlay.classList.remove('hidden');
  }

  function closeScoreboard() {
    SoundFX.playUiClick(540);
    els.scoreboardOverlay.classList.add('hidden');
  }

  // Entry Screen Quick Pills
  els.quickModeSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    prefs.gameType = b.dataset.gametype;
    SoundFX.playUiClick(640);
    syncAllUI();
  });
  els.quickVersionSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    prefs.arenaVersion = b.dataset.version;
    SoundFX.playUiClick(720);
    syncAllUI();
  });

  // 3-Tab Settings Navigation
  els.settingsTabs.addEventListener('click', (e) => {
    const t = e.target.closest('.m-tab');
    if (!t) return;
    SoundFX.playUiClick(680);
    switchSettingsTab(t.dataset.stab);
  });

  // Tab 1 Setup Listeners
  els.gameTypeSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.pillar-card'); if (!b) return;
    prefs.gameType = b.dataset.gametype; SoundFX.playUiClick(640); syncAllUI();
  });
  els.arenaVersionSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.version-card'); if (!b) return;
    prefs.arenaVersion = b.dataset.version; SoundFX.playUiClick(720); syncAllUI();
  });
  els.playerCountSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.players = Number(b.dataset.players); SoundFX.playUiClick(660); syncAllUI();
  });
  els.themeSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.theme = b.dataset.theme; SoundFX.playUiClick(700); syncAllUI();
  });
  els.gradeSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.grade-btn'); if (!b) return;
    prefs.grade = Number(b.dataset.grade);
    if (prefs.grade === 2) prefs.roundMode = 'ten';
    SoundFX.playUiClick(700); syncAllUI();
  });
  els.roundTypeSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b || b.disabled) return;
    prefs.roundMode = b.dataset.rtype; SoundFX.playUiClick(680); syncAllUI();
  });
  els.questionCountSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.questionCount = Number(b.dataset.qcount); SoundFX.playUiClick(640); syncAllUI();
  });
  els.diffSelectorEdu.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.diffEdu = b.dataset.diff; SoundFX.playUiClick(640); syncAllUI();
  });
  els.funDurationSelector.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.funDuration = Number(b.dataset.dur); SoundFX.playUiClick(640); syncAllUI();
  });
  els.diffSelectorFun.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    prefs.diffFun = b.dataset.diff; SoundFX.playUiClick(640); syncAllUI();
  });

  // Tab 2 Car Garage Listeners
  els.garagePlayerToggle.addEventListener('click', (e) => {
    const b = e.target.closest('.opt-btn'); if (!b) return;
    activeGaragePlayer = Number(b.dataset.gplayer);
    SoundFX.playUiClick(660);
    renderCarGarage();
  });
  els.carGarageGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.car-card'); if (!card) return;
    if (activeGaragePlayer === 2) prefs.carP2 = card.dataset.carid;
    else prefs.carP1 = card.dataset.carid;
    SoundFX.playUiClick(780);
    syncAllUI();
    renderCarGarage();
  });

  // Tab 3 System Controls Listeners
  els.sliderSpeed.addEventListener('input', () => { prefs.speedPct = Number(els.sliderSpeed.value); syncAllUI(); SoundFX.playSliderTick(); });
  els.speedPresets.addEventListener('click', (e) => { const c = e.target.closest('.preset-chip'); if (!c) return; prefs.speedPct = Number(c.dataset.spd); syncAllUI(); SoundFX.playUiClick(660); });
  els.swMusic.addEventListener('click', () => { prefs.musicOn = !prefs.musicOn; syncAllUI(); SoundFX.playToggle(prefs.musicOn); });
  els.swSfx.addEventListener('click', () => { prefs.sfxOn = !prefs.sfxOn; syncAllUI(); SoundFX.playToggle(prefs.sfxOn); });
  els.swSpeech.addEventListener('click', () => { prefs.speechOn = !prefs.speechOn; syncAllUI(); SoundFX.playToggle(prefs.speechOn); });
  els.swHint.addEventListener('click', () => { prefs.hintOn = !prefs.hintOn; syncAllUI(); SoundFX.playToggle(prefs.hintOn); });
  els.sliderMusicVol.addEventListener('input', () => { prefs.musicVol = Number(els.sliderMusicVol.value); syncAllUI(); });
  els.sliderSfxVol.addEventListener('input', () => { prefs.sfxVol = Number(els.sliderSfxVol.value); syncAllUI(); SoundFX.playSliderTick(); });
  els.touchModeSelector.addEventListener('click', (e) => { const b = e.target.closest('.opt-btn'); if (!b) return; prefs.touchMode = b.dataset.touch; syncAllUI(); SoundFX.playUiClick(640); });
  els.camSelector.addEventListener('click', (e) => { const b = e.target.closest('.opt-btn'); if (!b) return; prefs.camMode = Number(b.dataset.cam); syncAllUI(); SoundFX.playUiClick(640); });

  // Buttons
  $('btnStart').addEventListener('click', startSession);
  $('btnOpenSettings').addEventListener('click', () => openSettings('setup'));
  $('btnOpenGarageDirect').addEventListener('click', () => openSettings('garage'));
  $('btnSettingsHud').addEventListener('click', () => openSettings('setup'));
  $('btnSettingsSplit').addEventListener('click', () => openSettings('setup'));
  $('btnSettingsPause').addEventListener('click', () => openSettings('setup'));
  $('btnCloseSettings').addEventListener('click', closeSettings);
  $('btnSaveSettings').addEventListener('click', closeSettings);
  $('btnSaveAndPlay').addEventListener('click', () => {
    prefs.nameP1 = (els.inputNameP1.value || '').trim();
    prefs.nameP2 = (els.inputNameP2.value || '').trim();
    syncAllUI();
    startSession();
  });

  $('btnOpenScoreboard').addEventListener('click', () => openScoreboard(prefs.gameType));
  $('btnEndScoreboard').addEventListener('click', () => openScoreboard(session ? (session.isEdu ? 'edu' : 'fun') : 'edu'));
  $('btnCloseScoreboard').addEventListener('click', closeScoreboard);
  $('btnCloseSbBottom').addEventListener('click', closeScoreboard);
  els.sbTabs.addEventListener('click', (e) => { const t = e.target.closest('.sb-tab'); if (!t) return; sbActiveTab = t.dataset.sbtab; SoundFX.playUiClick(640); renderScoreboardList(); });
  $('btnClearSb').addEventListener('click', () => { Scoreboard.clear(sbActiveTab); renderScoreboardList(); els.titleFunBest.textContent = Scoreboard.getBest('fun'); SoundFX.playToggle(false); });

  const toggleMusic = () => { SoundFX.ensure(); prefs.musicOn = !prefs.musicOn; syncAllUI(); SoundFX.playToggle(prefs.musicOn); };
  $('btnMusicTitle').addEventListener('click', toggleMusic);
  $('btnMusicHud').addEventListener('click', toggleMusic);
  $('btnMusicSplit').addEventListener('click', toggleMusic);

  $('btnCamera').addEventListener('click', () => { prefs.camMode = (prefs.camMode + 1) % 3; syncAllUI(); SoundFX.playUiClick(680); });
  $('btnPause').addEventListener('click', pauseGame);
  $('btnPauseSplit').addEventListener('click', pauseGame);
  $('btnResume').addEventListener('click', resumeGame);
  $('btnRestartPause').addEventListener('click', startSession);
  $('btnMenuPause').addEventListener('click', returnToMenu);
  $('btnPlayAgain').addEventListener('click', startSession);
  $('btnMenuEnd').addEventListener('click', returnToMenu);

  // ==================== BOOT ====================

  window.GameViewport.watch(window, gameArea);
  function useTopDown() {
    topDown = true;
    renderedViews = [];
    gameArea.classList.add('is-top-down');
    gameCanvas.setAttribute('aria-label', 'Üstten görünümlü oyun alanı');
    $('rocketRenderMode').hidden = false;
  }

  if (!octx) {
    els.startOverlay.classList.add('hidden');
    $('rocketUnavailable').hidden = false;
    return;
  }

  try {
    Engine3D.init(gameCanvas);
  } catch (_) {
    useTopDown();
  }
  gameCanvas.addEventListener('webglcontextlost', useTopDown);
  syncAllUI();
  renderCarGarage();
  requestAnimationFrame(tick);
})();
