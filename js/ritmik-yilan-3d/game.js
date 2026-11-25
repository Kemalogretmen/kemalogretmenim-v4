// game.js — Open-World 3D TPS Snake: Education (Rhythmic Counting) + Endless Fun Mode + 2P Split-Screen + Top-10 Scoreboards + Smartboard Multi-Touch

(() => {
  const { clamp, lerp, smoothstep, lerpAngle, Vec3, Mat4, Terrain } = Math3D;

  // ==================== CONFIG & CONSTANTS ====================

  const STEP_LABELS = {
    1: "1'er",  2: "2'şer", 3: "3'er",  4: "4'er",  5: "5'er",
    6: "6'şar", 7: "7'şer", 8: "8'er",  9: "9'ar", 10: "10'ar",
  };

  const PLAYER_SKINS = [
    {
      defaultName: 'Oyuncu 1',
      primary: [0.05, 0.58, 0.28],
      secondary: [0.30, 0.92, 0.52],
      eye: [1.0, 0.88, 0.18],
      radar: '#2ee69b',
    },
    {
      defaultName: 'Oyuncu 2',
      primary: [0.88, 0.34, 0.08],
      secondary: [1.00, 0.78, 0.20],
      eye: [0.24, 0.96, 1.0],
      radar: '#ff9f43',
    },
  ];

  const DIFF_CONFIG = {
    easy:   { label: 'Kolay', baseSpeed: 6.8,  maxSpeed: 8.6,  turnRate: 2.35, scoreMult: 1.0, trees: 14, rocks: 10, hurdles: 4, patrollers: 0 },
    normal: { label: 'Orta',  baseSpeed: 9.0,  maxSpeed: 11.4, turnRate: 2.58, scoreMult: 1.35, trees: 20, rocks: 15, hurdles: 6, patrollers: 3 },
    hard:   { label: 'Zor',   baseSpeed: 11.6, maxSpeed: 14.5, turnRate: 2.82, scoreMult: 1.75, trees: 26, rocks: 20, hurdles: 8, patrollers: 6 },
  };

  const TPS_CAMERAS = [
    { label: 'KLASİK TPS', dist: 11.4, height: 5.4, lookAhead: 8.2, fov: 62 },
    { label: 'YAKIN TPS',  dist: 7.6,  height: 3.5, lookAhead: 9.6, fov: 66 },
    { label: 'GENİŞ TPS',  dist: 16.0, height: 9.2, lookAhead: 7.0, fov: 60 },
  ];

  const HEAD_RADIUS = 0.82;
  const SEG_SPACING = 0.72;
  const FUN_APPLE_TARGET = 12;
  const COMBO_WINDOW = 7.0;

  // ==================== PERSISTENT SETTINGS ====================

  const settings = Scoreboard.loadPrefs({
    gameType: 'edu',     // 'edu' | 'fun'
    players: 1,          // 1 | 2
    step: 1,             // 1..10
    count: 20,           // 10 | 15 | 20
    diff: 'easy',        // 'easy' | 'normal' | 'hard'
    speedPct: 100,       // 50..160 (% custom speed multiplier)
    showHint: true,
    speech: true,
    musicEnabled: true,
    musicVol: 55,        // 0..100
    sfxEnabled: true,
    sfxVol: 85,          // 0..100
    touchMode: 'auto',   // 'auto' | 'on' | 'off'
    graphics: 'auto',    // 'auto' | 'top-down'
    camIndex: 0,
    nameP1: '',
    nameP2: '',
  });

  function persistSettings() {
    Scoreboard.savePrefs(settings);
  }

  function applyAudioSettings() {
    SoundFX.setMusicEnabled(settings.musicEnabled);
    SoundFX.setMusicVolume(settings.musicVol / 100);
    SoundFX.setSfxEnabled(settings.sfxEnabled);
    SoundFX.setSfxVolume(settings.sfxVol / 100);
    SoundFX.setSpeechEnabled(settings.speech);
  }

  // ==================== DOM ELEMENTS ====================

  const $ = (id) => document.getElementById(id);

  const gameCanvas = $('gameCanvas');
  const overlayCanvas = $('overlayCanvas');
  const overlayCtx = overlayCanvas.getContext('2d');

  const radarSingle = $('radarSingle');
  const radarP1 = $('radarP1');
  const radarP2 = $('radarP2');

  const hudSingle = $('hudSingle');
  const hudSplit = $('hudSplit');
  const eduHudPanel = $('eduHudPanel');
  const funHudPanel = $('funHudPanel');

  // 1P HUD elements
  const p1ModeTag = $('p1ModeTag');
  const singleTimer = $('singleTimer');
  const p1LastNum = $('p1LastNum');
  const p1NextNum = $('p1NextNum');
  const p1Progress = $('p1Progress');
  const p1ProgressBar = $('p1ProgressBar');
  const eduPlayerNameTag = $('eduPlayerNameTag');
  const p1EduScore = $('p1EduScore');

  const funPlayerNameTag = $('funPlayerNameTag');
  const funScoreEl = $('funScore');
  const funLengthEl = $('funLength');
  const funBestEl = $('funBest');
  const funComboBadge = $('funComboBadge');
  const funComboText = $('funComboText');
  const funComboBar = $('funComboBar');
  const funMagnetBadge = $('funMagnetBadge');
  const funMagnetTime = $('funMagnetTime');

  const p1Speed = $('p1Speed');
  const p1TurboBar = $('p1TurboBar');
  const p1JumpIndicator = $('p1JumpIndicator');
  const p1JumpStatus = $('p1JumpStatus');
  const camModeLabel = $('camModeLabel');
  const pointerHint = $('pointerHint');

  // 2P HUD elements
  const splitModeTag = $('splitModeTag');
  const splitTimer = $('splitTimer');
  const sp1Name = $('sp1Name');
  const sp1Prog = $('sp1Prog');
  const sp1LblA = $('sp1LblA');
  const sp1LblB = $('sp1LblB');
  const sp1Last = $('sp1Last');
  const sp1Next = $('sp1Next');
  const sp1Bar = $('sp1Bar');
  const sp1Turbo = $('sp1Turbo');

  const sp2Name = $('sp2Name');
  const sp2Prog = $('sp2Prog');
  const sp2LblA = $('sp2LblA');
  const sp2LblB = $('sp2LblB');
  const sp2Last = $('sp2Last');
  const sp2Next = $('sp2Next');
  const sp2Bar = $('sp2Bar');
  const sp2Turbo = $('sp2Turbo');

  // Touch containers
  const touchSingle = $('touchSingle');
  const touchSplitP1 = $('touchSplitP1');
  const touchSplitP2 = $('touchSplitP2');
  const joyBase = $('joyBase');
  const joyKnob = $('joyKnob');

  // Title Screen
  const startOverlay = $('startOverlay');
  const inputNameP1 = $('inputNameP1');
  const inputNameP2 = $('inputNameP2');
  const inputWrapP2 = $('inputWrapP2');
  const eduConfigPanel = $('eduConfigPanel');
  const funConfigPanel = $('funConfigPanel');
  const sequencePreview = $('sequencePreview');
  const titleFunBest = $('titleFunBest');
  const titleSpeedSummary = $('titleSpeedSummary');
  const musicTitleLabel = $('musicTitleLabel');
  const btnMusicTitle = $('btnMusicTitle');
  const btnMusicHud = $('btnMusicHud');
  const musicHudLabel = $('musicHudLabel');
  const btnMusicSplit = $('btnMusicSplit');

  // Modals
  const settingsOverlay = $('settingsOverlay');
  const scoreboardOverlay = $('scoreboardOverlay');
  const pauseOverlay = $('pauseOverlay');
  const endOverlay = $('endOverlay');

  // Settings modal controls
  const sliderSpeed = $('sliderSpeed');
  const setSpeedVal = $('setSpeedVal');
  const swMusic = $('swMusic');
  const sliderMusicVol = $('sliderMusicVol');
  const setMusicVolVal = $('setMusicVolVal');
  const swSfx = $('swSfx');
  const sliderSfxVol = $('sliderSfxVol');
  const setSfxVolVal = $('setSfxVolVal');
  const swSpeech = $('swSpeech');
  const swHint = $('swHint');

  // Scoreboard modal controls
  const sbListWrap = $('sbListWrap');
  const btnClearSb = $('btnClearSb');

  // End modal elements
  const endBadge = $('endBadge');
  const endRecordBanner = $('endRecordBanner');
  const endTitle = $('endTitle');
  const endDesc = $('endDesc');
  const endSummarySingle = $('endSummarySingle');
  const endSummarySplit = $('endSummarySplit');
  const endStat1Lbl = $('endStat1Lbl');
  const endStat1Val = $('endStat1Val');
  const endStat2Lbl = $('endStat2Lbl');
  const endStat2Val = $('endStat2Val');
  const endStat3Lbl = $('endStat3Lbl');
  const endStat3Val = $('endStat3Val');
  const endStat4Lbl = $('endStat4Lbl');
  const endStat4Val = $('endStat4Val');
  const endP1Name = $('endP1Name');
  const endP1Prog = $('endP1Prog');
  const endP1Detail = $('endP1Detail');
  const endP2Name = $('endP2Name');
  const endP2Prog = $('endP2Prog');
  const endP2Detail = $('endP2Detail');
  const btnNextLevel = $('btnNextLevel');

  // Toasts
  const toastCenter = $('toastCenter');
  const toastLeft = $('toastLeft');
  const toastRight = $('toastRight');

  // ==================== INITIALIZE RENDERER ====================

  const gameArea = $('main-content');
  window.GameViewport.watch(window, gameArea);
  const renderMode = $('snakeRenderMode');
  let hardwareRenderer;
  let renderer = null;
  let quality;
  let autoQuality = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ? 'top-down' : 'full';
  let slowFrameTime = 0;
  let needsPaint = true;

  function applyQuality(next) {
    if (next === quality) return;
    if (next !== 'top-down' && hardwareRenderer === undefined) {
      try { hardwareRenderer = Engine3D.createRenderer(gameCanvas); }
      catch { hardwareRenderer = null; autoQuality = 'top-down'; }
    }
    quality = hardwareRenderer && next !== 'top-down' ? next : 'top-down';
    renderer = quality === 'top-down' ? null : hardwareRenderer;
    if (!renderer) hardwareRenderer?.beginFrame();
    slowFrameTime = 0;
    needsPaint = true;
    gameArea.classList.toggle('is-top-down', !renderer);
    gameArea.classList.toggle('is-lite-render', quality !== 'full');
    gameCanvas.setAttribute('aria-label', renderer ? 'Üç boyutlu oyun alanı' : 'Üstten görünümlü oyun alanı');
    camModeLabel.textContent = renderer ? TPS_CAMERAS[settings.camIndex].label : 'ÜSTTEN GÖRÜNÜM';
    renderMode.hidden = quality === 'full';
    renderMode.textContent = renderer ? 'Hafif 3B' : 'Üstten görünüm';
  }

  function preferredQuality() {
    if (settings.graphics === 'top-down') return 'top-down';
    if (autoQuality === 'full' && (settings.players === 2 || settings.touchMode === 'on' || isTouchDevice())) return 'light-3d';
    return autoQuality;
  }

  if (!overlayCtx) {
    startOverlay.classList.add('hidden');
    $('snakeUnavailable').hidden = false;
    return;
  }
  gameCanvas.addEventListener('webglcontextlost', () => {
    hardwareRenderer = null;
    autoQuality = 'top-down';
    applyQuality('top-down');
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { needsPaint = true; }).observe(gameArea);
  window.addEventListener('resize', () => { needsPaint = true; });

  // ==================== GAME RUNTIME STATE ====================

  let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'ended'
  let settingsReturnState = 'menu';
  let activeSbTab = 'edu';
  let clearConfirmArmed = false;
  let countTouchedManually = false;

  let time = 0;
  let elapsed = 0;
  let sequence = [];

  let players = [];
  let apples = [];       // Edu: { num, atlasIdx, pos, baseY, phase, collected:[bool,bool] }
                         // Fun: { kind:'normal'|'golden'|'magnet', pos, baseY, phase, ttl }
  let trees = [];
  let rocks = [];
  let hurdles = [];
  let patrollers = [];
  let boostPads = [];
  let flowers = [];
  let fencePosts = [];
  let particles = [];
  let shockwaves = [];

  let funGoldenTimer = 9;
  let funMagnetTimer = 15;
  let endCamFocus = [0, 2, 0];
  let endCamAngle = 0;
  let endWasVictory = false;
  let funRecord = 0;

  // ==================== INPUT & MULTI-TOUCH / SMARTBOARD ====================

  const keys = Object.create(null);
  let pointerLocked = false;
  let mouseBoosting = false;
  let mouseDragging = false;
  let lastMouseY = 0;
  let mouseYawAccum = 0;
  let mousePitchAccum = 0;

  // Multi-touch state per player (supports simultaneous 2-player touch on Smartboards & Tablets!)
  const touch1P = { steer: 0, turbo: false, brake: false, joyPointerId: null };
  const touch2P = [
    { left: false, right: false, turbo: false },
    { left: false, right: false, turbo: false },
  ];
  const gestures = Array.from({ length: 2 }, () => ({
    pointerId: null, steer: 0, turbo: false, brake: false, lastTap: null,
  }));
  const resetTouchButtons = [];
  let receivedTouch = false;

  function isTouchDevice() {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches;
    return receivedTouch || navigator.maxTouchPoints > 0 || coarse;
  }

  function shouldShowTouchControls() {
    if (settings.touchMode === 'on') return true;
    if (settings.touchMode === 'off') return false;
    return isTouchDevice();
  }

  function refreshTouchVisibility() {
    const show = shouldShowTouchControls();
    touchSingle.classList.toggle('hidden', !show || settings.players !== 1);
    touchSplitP1.classList.toggle('hidden', !show || settings.players !== 2);
    touchSplitP2.classList.toggle('hidden', !show || settings.players !== 2);
    gameArea.classList.toggle('has-touch-controls', show);
    updatePointerHint();
  }

  function clearGesture(gesture) {
    const id = gesture.pointerId;
    gesture.pointerId = null;
    gesture.steer = 0;
    gesture.turbo = false;
    gesture.brake = false;
    if (id !== null && gameCanvas.hasPointerCapture?.(id)) gameCanvas.releasePointerCapture(id);
  }

  function resetTouchInput() {
    for (const gesture of gestures) {
      clearGesture(gesture);
      gesture.lastTap = null;
    }
    resetTouchButtons.forEach(reset => reset());
  }

  gameArea.addEventListener('pointerdown', event => {
    if (!receivedTouch && (event.pointerType === 'touch' || event.pointerType === 'pen')) {
      receivedTouch = true;
      refreshTouchVisibility();
    }
  }, true);

  gameCanvas.addEventListener('pointerdown', event => {
    if (state !== 'playing' || event.button !== 0 || event.pointerType === 'mouse' && settings.touchMode !== 'on') return;
    if (settings.touchMode === 'off') return;
    const bounds = gameCanvas.getBoundingClientRect();
    const player = settings.players === 2 && event.clientX >= bounds.left + bounds.width / 2 ? 1 : 0;
    const gesture = gestures[player];
    if (gesture.pointerId !== null) return;
    event.preventDefault();
    SoundFX.unlock();
    Object.assign(gesture, {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      started: event.timeStamp, moved: false, range: clamp(bounds.width / settings.players * 0.16, 36, 76),
    });
    try { gameCanvas.setPointerCapture(event.pointerId); } catch (_) {}
  });

  gameCanvas.addEventListener('pointermove', event => {
    const gesture = gestures.find(input => input.pointerId === event.pointerId);
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture.moved ||= Math.abs(dx) > 10 || Math.abs(dy) > 10;
    gesture.steer = Math.abs(dx) <= 9 ? 0 : -Math.sign(dx) * clamp((Math.abs(dx) - 9) / gesture.range, 0, 1);
    gesture.turbo = dy < -Math.min(35, gesture.range * 0.65);
    gesture.brake = dy > Math.min(40, gesture.range * 0.8);
  });

  gameCanvas.addEventListener('pointerup', event => {
    const player = gestures.findIndex(input => input.pointerId === event.pointerId);
    if (player < 0) return;
    const gesture = gestures[player];
    const tap = state === 'playing' && !gesture.moved && event.timeStamp - gesture.started <= 250 &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 12;
    const previous = gesture.lastTap;
    if (tap && previous && event.timeStamp - previous.time <= 350 &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 48) {
      gesture.lastTap = null;
      tryJump(players[player]);
    } else {
      gesture.lastTap = tap ? { x: event.clientX, y: event.clientY, time: event.timeStamp } : null;
    }
    clearGesture(gesture);
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    gameCanvas.addEventListener(type, event => {
      const gesture = gestures.find(input => input.pointerId === event.pointerId);
      if (!gesture) return;
      gesture.lastTap = null;
      clearGesture(gesture);
    });
  }

  // Virtual Analog Joystick for 1P (PointerEvent -> works on Phone, Tablet, Stylus & Smartboard!)
  function setupVirtualJoystick() {
    if (!joyBase || !joyKnob) return;
    let centerX = 0, centerY = 0, maxR = 44;

    const updateStick = (clientX, clientY) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, maxR);
      const ang = Math.atan2(dy, dx);
      const kx = Math.cos(ang) * clamped;
      const ky = Math.sin(ang) * clamped;
      joyKnob.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;

      // Horizontal axis drives smooth proportional TPS steering (-dx / maxR -> left=+1, right=-1)
      const normX = clamp(dx / maxR, -1, 1);
      touch1P.steer = Math.abs(normX) < 0.08 ? 0 : -normX;
    };

    const resetStick = () => {
      touch1P.joyPointerId = null;
      touch1P.steer = 0;
      joyKnob.style.transform = 'translate(0px, 0px)';
    };

    joyBase.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || touch1P.joyPointerId !== null) return;
      e.preventDefault();
      SoundFX.unlock();
      touch1P.joyPointerId = e.pointerId;
      try { joyBase.setPointerCapture(e.pointerId); } catch (_) {}
      const rect = joyBase.getBoundingClientRect();
      centerX = rect.left + rect.width * 0.5;
      centerY = rect.top + rect.height * 0.5;
      maxR = rect.width * 0.36;
      updateStick(e.clientX, e.clientY);
    });

    joyBase.addEventListener('pointermove', (e) => {
      if (e.pointerId !== touch1P.joyPointerId) return;
      e.preventDefault();
      updateStick(e.clientX, e.clientY);
    });

    joyBase.addEventListener('pointerup', (e) => {
      if (e.pointerId === touch1P.joyPointerId) resetStick();
    });
    for (const type of ['pointercancel', 'lostpointercapture']) {
      joyBase.addEventListener(type, (e) => {
        if (e.pointerId === touch1P.joyPointerId) resetStick();
      });
    }
    resetTouchButtons.push(resetStick);
  }

  function bindHoldButton(id, onDown, onUp) {
    const el = $(id);
    if (!el) return;
    let activePtr = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || activePtr !== null) return;
      e.preventDefault();
      SoundFX.unlock();
      activePtr = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add('pressed');
      onDown();
    });
    const release = (e) => {
      if (e && e.pointerId !== activePtr) return;
      activePtr = null;
      el.classList.remove('pressed');
      onUp();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    resetTouchButtons.push(release);
  }

  setupVirtualJoystick();
  bindHoldButton('t1Turbo', () => { touch1P.turbo = true; }, () => { touch1P.turbo = false; });
  bindHoldButton('t1Brake', () => { touch1P.brake = true; }, () => { touch1P.brake = false; });
  bindHoldButton('t1Jump',  () => { if (state === 'playing' && players[0]) tryJump(players[0]); }, () => {});

  // 2P Multi-Touch Smartboard bindings
  bindHoldButton('tp1Left',  () => { touch2P[0].left = true; },  () => { touch2P[0].left = false; });
  bindHoldButton('tp1Right', () => { touch2P[0].right = true; }, () => { touch2P[0].right = false; });
  bindHoldButton('tp1Turbo', () => { touch2P[0].turbo = true; }, () => { touch2P[0].turbo = false; });
  bindHoldButton('tp1Jump',  () => { if (state === 'playing' && players[0]) tryJump(players[0]); }, () => {});

  bindHoldButton('tp2Left',  () => { touch2P[1].left = true; },  () => { touch2P[1].left = false; });
  bindHoldButton('tp2Right', () => { touch2P[1].right = true; }, () => { touch2P[1].right = false; });
  bindHoldButton('tp2Turbo', () => { touch2P[1].turbo = true; }, () => { touch2P[1].turbo = false; });
  bindHoldButton('tp2Jump',  () => { if (state === 'playing' && players[1]) tryJump(players[1]); }, () => {});

  // Keyboard bindings (strictly ignored when typing inside player name inputs!)
  function isTypingInInput() {
    const el = document.activeElement;
    return !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'));
  }

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target !== document.body && e.target !== document.documentElement && !gameArea.contains(e.target)) return;
    if (isTypingInInput()) {
      if (e.code === 'Enter' && state === 'menu') {
        document.activeElement.blur();
      }
      return;
    }

    const code = e.code;
    if ((code === 'Space' || code === 'Enter') && e.target.closest?.('button, a, select')) return;
    keys[code] = true;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      if (state === 'playing' || state === 'ended') e.preventDefault();
    }
    if (e.repeat) return;
    SoundFX.unlock();

    // Close Settings or Scoreboard on Escape
    if (code === 'Escape') {
      if (!settingsOverlay.classList.contains('hidden')) { closeSettings(); return; }
      if (!scoreboardOverlay.classList.contains('hidden')) { closeScoreboard(); return; }
    }

    if (state === 'ended' && (code === 'Space' || code === 'KeyR' || code === 'Enter')) {
      if (scoreboardOverlay.classList.contains('hidden')) startGame();
      return;
    }

    if (code === 'KeyP' || (code === 'Escape' && !pointerLocked && (state === 'playing' || state === 'paused'))) {
      if (state === 'playing') pauseGame();
      else if (state === 'paused') resumeGame();
      return;
    }

    if (code === 'KeyR' && (state === 'playing' || state === 'paused')) {
      startGame();
      return;
    }

    if (code === 'KeyC' && state === 'playing') {
      cycleCamera();
      return;
    }

    if (code === 'KeyN') {
      toggleMusic();
      return;
    }

    if (code === 'KeyM') {
      settings.sfxEnabled = !settings.sfxEnabled;
      applyAudioSettings();
      persistSettings();
      syncSettingsUI();
      showToast(settings.sfxEnabled ? 'Ses Efektleri Açık' : 'Ses Efektleri Kapalı', 'cyan', 'center');
      return;
    }

    if (state === 'playing') {
      if (code === 'Space' && players[0]) tryJump(players[0]);
      if (settings.players === 2 && (code === 'Enter' || code === 'Numpad0') && players[1]) tryJump(players[1]);
    }
  });

  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  function resetInputs() {
    for (const k in keys) keys[k] = false;
    mouseBoosting = false;
    mouseDragging = false;
    mouseYawAccum = mousePitchAccum = 0;
    resetTouchInput();
  }
  window.addEventListener('blur', resetInputs);

  gameCanvas.addEventListener('pointerdown', (e) => {
    if (state !== 'playing' || settings.players !== 1 || e.pointerType !== 'mouse' || settings.touchMode === 'on') return;
    SoundFX.unlock();
    if (e.button === 0) {
      if (!pointerLocked) {
        if (gameCanvas.requestPointerLock) {
          try {
            const p = gameCanvas.requestPointerLock();
            if (p && p.catch) p.catch(() => {});
          } catch (_) {}
        }
        mouseDragging = true;
        lastMouseY = e.clientY;
      } else {
        mouseBoosting = true;
      }
    } else if (e.button === 2 && pointerLocked && players[0]) {
      tryJump(players[0]);
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { mouseBoosting = false; mouseDragging = false; }
  });
  gameCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mousemove', (e) => {
    if (state !== 'playing' || settings.players !== 1) return;
    if (pointerLocked) {
      mouseYawAccum += e.movementX || 0;
      mousePitchAccum += e.movementY || 0;
    } else if (mouseDragging && players[0]) {
      const dy = e.clientY - lastMouseY;
      lastMouseY = e.clientY;
      players[0].cam.userPitchOffset = clamp(players[0].cam.userPitchOffset + dy * 0.004, -0.18, 0.44);
    }
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === gameCanvas;
    updatePointerHint();
    if (!pointerLocked) mouseBoosting = false;
  });

  // Unlock music gently on very first pointer interaction anywhere on Title Screen!
  gameArea.addEventListener('pointerdown', () => {
    SoundFX.unlock();
  }, { once: true });

  // ==================== UI SYNCHRONIZATION & INTERACTIONS ====================

  function getEffectiveBaseSpeed() {
    return DIFF_CONFIG[settings.diff].baseSpeed * (settings.speedPct / 100);
  }

  function getPlayerName(id) {
    const raw = id === 0 ? (inputNameP1.value || settings.nameP1) : (inputNameP2.value || settings.nameP2);
    const cleaned = String(raw || '').trim().slice(0, 18);
    return cleaned || PLAYER_SKINS[id].defaultName;
  }

  function updatePointerHint() {
    if (pointerLocked) {
      pointerHint.classList.add('locked');
      pointerHint.innerHTML = 'TPS Fare Aktif &bull; <strong>Sol Tık</strong> Turbo &bull; <strong>S</strong> Yavaşla &bull; <strong>Space</strong> Zıpla &bull; <strong>ESC</strong> Çık';
    } else if (shouldShowTouchControls()) {
      pointerHint.classList.remove('locked');
      pointerHint.textContent = 'Sürükle: ← → Dön · ↑ Hızlan · ↓ Yavaşla · Çift dokun: Zıpla';
    } else {
      pointerHint.classList.remove('locked');
      pointerHint.innerHTML = '<strong>A/D</strong> Dön &bull; <strong>S</strong> Yavaşla &bull; <strong>Shift</strong> Turbo &bull; <strong>Space</strong> Zıpla &bull; <strong>N</strong> Müzik';
    }
  }

  function syncMusicButtons() {
    const on = settings.musicEnabled;
    musicTitleLabel.textContent = on ? 'Müzik: Açık' : 'Müzik: Kapalı';
    btnMusicTitle.classList.toggle('off', !on);
    musicHudLabel.textContent = on ? 'Müzik' : 'Sessiz';
    btnMusicHud.classList.toggle('off', !on);
    btnMusicSplit.textContent = on ? '🎵' : '🔇';
    btnMusicSplit.classList.toggle('off', !on);
  }

  function toggleMusic() {
    SoundFX.unlock();
    settings.musicEnabled = !settings.musicEnabled;
    applyAudioSettings();
    persistSettings();
    SoundFX.playToggle(settings.musicEnabled);
    syncMusicButtons();
    syncSettingsUI();
    if (state === 'playing') {
      showToast(settings.musicEnabled ? '🎵 Müzik Açıldı' : '🔇 Müzik Kapatıldı', 'cyan', 'center');
    }
  }

  function refreshTitleUI() {
    // Pillar active state
    document.querySelectorAll('#gameTypeSelector .pillar-card').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-gametype') === settings.gameType);
    });
    eduConfigPanel.classList.toggle('hidden', settings.gameType !== 'edu');
    funConfigPanel.classList.toggle('hidden', settings.gameType !== 'fun');

    // Player count & name boxes
    document.querySelectorAll('#playerCountSelector .opt-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-players')) === settings.players);
    });
    inputWrapP2.classList.toggle('hidden', settings.players !== 2);

    // Step & count
    const endVal = settings.step * settings.count;
    sequencePreview.textContent = `Hedef: ${settings.step} → ${settings.step * 2} → ${settings.step * 3} → ... → ${endVal}`;
    document.querySelectorAll('#stepSelector .step-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-step')) === settings.step);
    });
    document.querySelectorAll('#countSelector .opt-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-count')) === settings.count);
    });
    document.querySelectorAll('#diffSelectorEdu .opt-btn, #diffSelectorFun .opt-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-diff') === settings.diff);
    });

    titleFunBest.textContent = String(Scoreboard.getBest('fun'));
    const effSpd = getEffectiveBaseSpeed().toFixed(1);
    titleSpeedSummary.textContent = `%${settings.speedPct} • ${effSpd} m/s`;
    syncMusicButtons();
  }

  function syncSettingsUI() {
    sliderSpeed.value = String(settings.speedPct);
    setSpeedVal.textContent = `%${settings.speedPct} (${getEffectiveBaseSpeed().toFixed(1)} m/s)`;
    document.querySelectorAll('#speedPresets .preset-chip').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-spd')) === settings.speedPct);
    });

    swMusic.classList.toggle('on', settings.musicEnabled);
    swMusic.setAttribute('aria-checked', String(settings.musicEnabled));
    sliderMusicVol.value = String(settings.musicVol);
    setMusicVolVal.textContent = `%${settings.musicVol}`;

    swSfx.classList.toggle('on', settings.sfxEnabled);
    swSfx.setAttribute('aria-checked', String(settings.sfxEnabled));
    sliderSfxVol.value = String(settings.sfxVol);
    setSfxVolVal.textContent = `%${settings.sfxVol}`;

    swSpeech.classList.toggle('on', settings.speech);
    swSpeech.setAttribute('aria-checked', String(settings.speech));

    swHint.classList.toggle('on', settings.showHint);
    swHint.setAttribute('aria-checked', String(settings.showHint));

    document.querySelectorAll('#touchModeSelector .opt-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-touch') === settings.touchMode);
    });
    document.querySelectorAll('#graphicsSelector [data-graphics]').forEach(button => {
      const active = button.dataset.graphics === settings.graphics;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('#camSelector .opt-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-cam')) === settings.camIndex);
    });

    const effSpd = getEffectiveBaseSpeed().toFixed(1);
    titleSpeedSummary.textContent = `%${settings.speedPct} • ${effSpd} m/s`;
    camModeLabel.textContent = quality === 'top-down' ? 'ÜSTTEN GÖRÜNÜM' : TPS_CAMERAS[settings.camIndex].label;
  }

  function openSettings(fromState) {
    SoundFX.unlock();
    SoundFX.playTab();
    settingsReturnState = fromState;
    if (fromState === 'playing') {
      state = 'paused';
      resetInputs();
      SoundFX.updateBoost(false);
      if (document.pointerLockElement === gameCanvas && document.exitPointerLock) {
        document.exitPointerLock();
      }
    }
    syncSettingsUI();
    settingsOverlay.classList.remove('hidden');
  }

  function closeSettings() {
    SoundFX.playClick();
    settingsOverlay.classList.add('hidden');
    persistSettings();
    refreshTitleUI();
    refreshTouchVisibility();
    if (settingsReturnState !== 'menu') {
      const previous = renderer;
      applyQuality(preferredQuality());
      if (!previous && renderer) {
        if (settings.gameType === 'edu') renderer.updateNumberAtlas(sequence);
        for (const player of players) updateTPSCamera(player, 1);
      }
    }
    if (settingsReturnState === 'playing') {
      state = 'playing';
    }
  }

  function renderScoreboardList(mode) {
    activeSbTab = mode;
    clearConfirmArmed = false;
    btnClearSb.textContent = 'Bu Tabloyu Sıfırla';

    document.querySelectorAll('#sbTabs .sb-tab').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-sbtab') === mode);
    });

    const list = Scoreboard.getList(mode);
    if (list.length === 0) {
      sbListWrap.innerHTML = `<div class="sb-empty">Henüz <strong>${mode === 'edu' ? 'Eğitim Modu' : 'Eğlence Modu'}</strong> için kayıtlı skor yok.<br/>İlk rekoru kırmak için oyuna başla!</div>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    sbListWrap.innerHTML = list.map((item, idx) => {
      const topCls = idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : '';
      const rankTxt = idx < 3 ? medals[idx] : `#${idx + 1}`;
      return `
        <div class="sb-row ${topCls}" style="animation-delay:${idx * 35}ms">
          <div class="sb-rank">${rankTxt}</div>
          <div class="sb-name">${escapeHtml(item.name)} <small>${escapeHtml(item.playersLabel)}</small></div>
          <div class="sb-detail">${escapeHtml(item.detail)}</div>
          <div class="sb-score">${item.score}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function openScoreboard(defaultTab) {
    SoundFX.unlock();
    SoundFX.playTab();
    renderScoreboardList(defaultTab || settings.gameType);
    scoreboardOverlay.classList.remove('hidden');
  }

  function closeScoreboard() {
    SoundFX.playClick();
    scoreboardOverlay.classList.add('hidden');
  }

  // Wire Title Screen buttons
  document.querySelectorAll('#gameTypeSelector .pillar-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.unlock(); SoundFX.playTab();
      settings.gameType = btn.getAttribute('data-gametype');
      persistSettings();
      refreshTitleUI();
    });
  });

  document.querySelectorAll('#playerCountSelector .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.unlock(); SoundFX.playClick();
      settings.players = Number(btn.getAttribute('data-players'));
      persistSettings();
      refreshTitleUI();
    });
  });

  document.querySelectorAll('#stepSelector .step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.unlock(); SoundFX.playClick();
      settings.step = Number(btn.getAttribute('data-step'));
      if (!countTouchedManually) settings.count = settings.step === 1 ? 20 : 10;
      persistSettings();
      refreshTitleUI();
    });
  });

  document.querySelectorAll('#countSelector .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.unlock(); SoundFX.playClick();
      settings.count = Number(btn.getAttribute('data-count'));
      countTouchedManually = true;
      persistSettings();
      refreshTitleUI();
    });
  });

  document.querySelectorAll('#diffSelectorEdu .opt-btn, #diffSelectorFun .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.unlock(); SoundFX.playClick();
      settings.diff = btn.getAttribute('data-diff');
      persistSettings();
      refreshTitleUI();
    });
  });

  inputNameP1.addEventListener('input', () => { settings.nameP1 = inputNameP1.value; persistSettings(); });
  inputNameP2.addEventListener('input', () => { settings.nameP2 = inputNameP2.value; persistSettings(); });

  btnMusicTitle.addEventListener('click', toggleMusic);
  btnMusicHud.addEventListener('click', toggleMusic);
  btnMusicSplit.addEventListener('click', toggleMusic);

  $('btnOpenSettings').addEventListener('click', () => openSettings('menu'));
  $('btnQuickSpeed').addEventListener('click', () => openSettings('menu'));
  $('btnSettingsHud').addEventListener('click', () => openSettings('playing'));
  $('btnSettingsSplit').addEventListener('click', () => openSettings('playing'));
  $('btnSettingsPause').addEventListener('click', () => openSettings('paused'));
  $('btnCloseSettings').addEventListener('click', closeSettings);
  $('btnSaveSettings').addEventListener('click', closeSettings);

  $('btnOpenScoreboard').addEventListener('click', () => openScoreboard(settings.gameType));
  $('btnEndScoreboard').addEventListener('click', () => openScoreboard(settings.gameType));
  $('btnCloseScoreboard').addEventListener('click', closeScoreboard);
  $('btnCloseSbBottom').addEventListener('click', closeScoreboard);

  document.querySelectorAll('#sbTabs .sb-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.playTab();
      renderScoreboardList(btn.getAttribute('data-sbtab'));
    });
  });

  btnClearSb.addEventListener('click', () => {
    SoundFX.playClick();
    if (!clearConfirmArmed) {
      clearConfirmArmed = true;
      btnClearSb.textContent = 'Emin misin? (Tekrar Tıkla)';
      return;
    }
    Scoreboard.clear(activeSbTab);
    clearConfirmArmed = false;
    renderScoreboardList(activeSbTab);
    refreshTitleUI();
  });

  // Settings modal live controls
  sliderSpeed.addEventListener('input', () => {
    settings.speedPct = Number(sliderSpeed.value);
    SoundFX.playSlider();
    syncSettingsUI();
  });
  document.querySelectorAll('#speedPresets .preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.playClick();
      settings.speedPct = Number(btn.getAttribute('data-spd'));
      syncSettingsUI();
    });
  });

  swMusic.addEventListener('click', () => {
    settings.musicEnabled = !settings.musicEnabled;
    applyAudioSettings();
    SoundFX.playToggle(settings.musicEnabled);
    syncMusicButtons();
    syncSettingsUI();
  });
  sliderMusicVol.addEventListener('input', () => {
    settings.musicVol = Number(sliderMusicVol.value);
    applyAudioSettings();
    SoundFX.playSlider();
    syncSettingsUI();
  });

  swSfx.addEventListener('click', () => {
    settings.sfxEnabled = !settings.sfxEnabled;
    applyAudioSettings();
    if (settings.sfxEnabled) SoundFX.playToggle(true);
    syncSettingsUI();
  });
  sliderSfxVol.addEventListener('input', () => {
    settings.sfxVol = Number(sliderSfxVol.value);
    applyAudioSettings();
    SoundFX.playSlider();
    syncSettingsUI();
  });

  swSpeech.addEventListener('click', () => {
    settings.speech = !settings.speech;
    applyAudioSettings();
    SoundFX.playToggle(settings.speech);
    syncSettingsUI();
  });

  swHint.addEventListener('click', () => {
    settings.showHint = !settings.showHint;
    SoundFX.playToggle(settings.showHint);
    syncSettingsUI();
  });

  document.querySelectorAll('#touchModeSelector .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.playClick();
      settings.touchMode = btn.getAttribute('data-touch');
      resetTouchInput();
      syncSettingsUI();
      refreshTouchVisibility();
    });
  });

  document.querySelectorAll('#graphicsSelector [data-graphics]').forEach(button => {
    button.addEventListener('click', () => {
      SoundFX.playClick();
      settings.graphics = button.dataset.graphics;
      syncSettingsUI();
    });
  });

  document.querySelectorAll('#camSelector .opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      SoundFX.playClick();
      settings.camIndex = Number(btn.getAttribute('data-cam'));
      syncSettingsUI();
    });
  });

  // Main Flow Buttons
  $('btnStart').addEventListener('click', () => { SoundFX.unlock(); SoundFX.playClick(); startGame(); });
  $('btnResume').addEventListener('click', () => { SoundFX.playClick(); resumeGame(); });
  $('btnRestartPause').addEventListener('click', () => { SoundFX.playClick(); startGame(); });
  $('btnMenuPause').addEventListener('click', () => { SoundFX.playClick(); goToMenu(); });
  $('btnPlayAgain').addEventListener('click', () => { SoundFX.playClick(); startGame(); });
  $('btnMenuEnd').addEventListener('click', () => { SoundFX.playClick(); goToMenu(); });
  $('btnCamera').addEventListener('click', () => { SoundFX.playClick(); cycleCamera(); });
  $('btnPause').addEventListener('click', () => { SoundFX.playClick(); state === 'playing' ? pauseGame() : resumeGame(); });
  $('btnPauseSplit').addEventListener('click', () => { SoundFX.playClick(); state === 'playing' ? pauseGame() : resumeGame(); });

  btnNextLevel.addEventListener('click', () => {
    SoundFX.playClick();
    if (settings.step < 10) {
      settings.step += 1;
      if (!countTouchedManually) settings.count = 10;
    } else if (settings.diff === 'easy') {
      settings.diff = 'normal';
    } else if (settings.diff === 'normal') {
      settings.diff = 'hard';
    }
    persistSettings();
    refreshTitleUI();
    startGame();
  });

  function cycleCamera() {
    if (!renderer) return;
    settings.camIndex = (settings.camIndex + 1) % TPS_CAMERAS.length;
    persistSettings();
    const preset = TPS_CAMERAS[settings.camIndex];
    camModeLabel.textContent = preset.label;
    showToast(`Kamera: ${preset.label}`, 'cyan', 'center');
  }

  function showToast(msg, variant = '', slot = 'center') {
    const root = slot === 'left' ? toastLeft : slot === 'right' ? toastRight : toastCenter;
    const el = document.createElement('div');
    el.className = 'toast' + (variant ? ' ' + variant : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 1220);
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // ==================== PLAYER & SNAKE FACTORY ====================

  function createPlayer(id, startX, startZ, startYaw) {
    const baseSpd = getEffectiveBaseSpeed();
    const gy = Terrain.height(startX, startZ) + 0.85;
    const p = {
      id,
      name: getPlayerName(id),
      skin: PLAYER_SKINS[id],
      head: [startX, gy, startZ],
      yaw: startYaw,
      pitch: 0,
      vy: 0,
      grounded: true,
      jumpCooldown: 0,
      airborneJumpedTail: false,
      airborneJumpedHurdle: false,
      turnVel: 0,
      speed: baseSpd,
      turbo: 100,
      boosting: false,
      boostPadTimer: 0,
      magnetTimer: 0,
      chompTimer: 0,
      tonguePhase: id * 1.7,
      targetLength: 10,
      totalDist: 0,
      trail: [],
      segments: [],
      digestPulses: [],
      // Shared & mode stats
      score: 0,
      applesEaten: 0,
      combo: 1,
      maxCombo: 1,
      comboTimer: 0,
      // Education progression
      nextIdx: 0,
      lastEatenNum: null,
      lastEatenAtlasIdx: -1,
      eatFlash: 0,
      wallDanger: 0,
      fenceWarnCooldown: 0,
      alive: true,
      finished: false,
      cam: {
        pos: [startX, gy + 6, startZ + 12],
        target: [startX, gy + 1, startZ - 8],
        up: [0, 1, 0],
        fov: 62,
        yaw: startYaw,
        pitch: 0,
        userPitchOffset: 0.08,
        roll: 0,
        shake: 0,
      },
      lastVP: Mat4.create(),
    };

    const fx = Math.sin(startYaw);
    const fz = Math.cos(startYaw);
    const initLen = (p.targetLength + 4) * SEG_SPACING;
    const step = 0.25;
    const steps = Math.ceil(initLen / step);
    for (let i = steps; i >= 0; i--) {
      const back = i * step;
      const sx = startX - fx * back;
      const sz = startZ - fz * back;
      p.trail.push({ x: sx, y: Terrain.height(sx, sz) + 0.80, z: sz, s: -back });
    }
    rebuildSegments(p);
    updateTPSCamera(p, 1.0);
    return p;
  }

  function rebuildSegments(p) {
    const count = p.targetLength;
    p.segments.length = count;
    const trail = p.trail;
    let ti = trail.length - 1;

    for (let i = 0; i < count; i++) {
      const targetS = p.totalDist - (i + 1) * SEG_SPACING;
      while (ti > 1 && trail[ti - 1].s > targetS) ti--;

      const p1 = trail[ti];
      const p0 = trail[Math.max(0, ti - 1)];
      const span = p1.s - p0.s;
      const frac = span > 1e-5 ? clamp((targetS - p0.s) / span, 0, 1) : 1;

      const bx = lerp(p0.x, p1.x, frac);
      const by = lerp(p0.y, p1.y, frac);
      const bz = lerp(p0.z, p1.z, frac);

      let tx = p1.x - p0.x, ty = p1.y - p0.y, tz = p1.z - p0.z;
      const tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-5) { tx /= tl; ty /= tl; tz /= tl; }
      else { tx = Math.sin(p.yaw); ty = 0; tz = Math.cos(p.yaw); }

      const tNorm = i / Math.max(1, count - 1);
      const gHere = Terrain.height(bx, bz);
      const nearGround = (by - gHere) < 1.3;
      const waveAmp = (nearGround ? 0.15 : 0.08) * Math.sin(Math.min(1, tNorm * 3.5) * Math.PI * 0.5) * (1.0 - tNorm * 0.35);
      const wave = Math.sin(p.totalDist * 0.92 - i * 0.55) * waveAmp;

      const rx = tz, rz = -tx;
      const rl = Math.hypot(rx, rz) || 1;
      const px = bx + (rx / rl) * wave;
      const pz = bz + (rz / rl) * wave;

      let radius = 0.72;
      if (i === 0) radius = 0.70;
      else if (tNorm > 0.72) {
        const tailT = (tNorm - 0.72) / 0.28;
        radius = lerp(0.72, 0.24, tailT * tailT);
      } else {
        radius = 0.72 - tNorm * 0.04;
      }

      if (settings.gameType === 'edu' && i === 2 && p.lastEatenAtlasIdx >= 0) {
        radius = 0.96 + p.eatFlash * 0.16;
      }

      const minGroundY = Terrain.height(px, pz) + radius * 0.90;
      const py = Math.max(by, minGroundY);
      const segment = p.segments[i] ||= { pos: [0, 0, 0], fwd: [0, 0, 0] };
      segment.pos[0] = px; segment.pos[1] = py; segment.pos[2] = pz;
      segment.fwd[0] = tx; segment.fwd[1] = ty; segment.fwd[2] = tz;
      segment.radius = radius;
      segment.tNorm = tNorm;
    }

    const minKeepS = p.totalDist - (count + 8) * SEG_SPACING;
    let trimIdx = 0;
    while (trimIdx < trail.length - 4 && trail[trimIdx + 1].s < minKeepS) trimIdx++;
    if (trimIdx > 20) trail.splice(0, trimIdx);
  }

  // ==================== OPEN-WORLD GENERATION ====================

  function isAppleSpotFree(x, z, minAppleSpacing = 10.5) {
    const playR = Terrain.PLAY_RADIUS;
    if (Math.hypot(x, z) > playR - 7.0) return false;
    for (const t of trees) if (!t.scenic && Math.hypot(x - t.x, z - t.z) < t.r + 3.2) return false;
    for (const rk of rocks) if (Math.hypot(x - rk.x, z - rk.z) < rk.r + 3.0) return false;
    for (const h of hurdles) if (Math.hypot(x - h.x, z - h.z) < 5.5) return false;
    for (const b of boostPads) if (Math.hypot(x - b.x, z - b.z) < 5.0) return false;
    for (const pt of patrollers) if (Math.hypot(x - pt.cx, z - pt.cz) < pt.span + 2.8) return false;
    for (const ap of apples) if (Math.hypot(x - ap.pos[0], z - ap.pos[2]) < minAppleSpacing) return false;
    return true;
  }

  function spawnFunItem(kind = 'normal') {
    const playR = Terrain.PLAY_RADIUS;
    let ax = 0, az = -10;
    for (let tries = 0; tries < 60; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.sqrt(Math.random()) * (playR - 15);
      ax = Math.cos(a) * r;
      az = Math.sin(a) * r;
      let tooClosePlayer = false;
      for (const p of players) {
        if (Math.hypot(ax - p.head[0], az - p.head[2]) < 10) tooClosePlayer = true;
      }
      if (!tooClosePlayer && isAppleSpotFree(ax, az, 8.5)) break;
    }
    const baseY = Terrain.height(ax, az) + (kind === 'golden' && Math.random() < 0.45 ? 2.65 : 1.25);
    apples.push({
      kind,
      pos: [ax, baseY, az],
      baseY,
      phase: Math.random() * Math.PI * 2,
      ttl: kind === 'normal' ? Infinity : (kind === 'golden' ? 20 : 18),
    });
  }

  function buildOpenWorld() {
    trees = [];
    rocks = [];
    hurdles = [];
    patrollers = [];
    boostPads = [];
    flowers = [];
    fencePosts = [];
    apples = [];

    const cfg = DIFF_CONFIG[settings.diff];
    const playR = Terrain.PLAY_RADIUS;

    // 1. Valley Perimeter Wooden Fence Posts
    const postCount = 60;
    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2;
      const px = Math.cos(a) * playR;
      const pz = Math.sin(a) * playR;
      fencePosts.push({ x: px, y: Terrain.height(px, pz), z: pz, a });
    }

    // 2. Scenic Outer Valley Forest Ring
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + (i % 3) * 0.04;
      const r = playR + 6 + (i % 5) * 4.2;
      const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
      trees.push({
        x: tx, y: Terrain.height(tx, tz), z: tz,
        kind: i % 3 === 0 ? 'oak' : 'pine',
        r: 1.5, scale: 1.3 + (i % 4) * 0.25, scenic: true,
      });
    }

    function isSpotFree(x, z, clearance) {
      if (Math.hypot(x, z) > playR - 5.5) return false;
      if (Math.abs(x) < 13 && z > -16 && z < 18) return false;
      for (const t of trees) if (!t.scenic && Math.hypot(x - t.x, z - t.z) < t.r + clearance) return false;
      for (const rk of rocks) if (Math.hypot(x - rk.x, z - rk.z) < rk.r + clearance) return false;
      for (const h of hurdles) if (Math.hypot(x - h.x, z - h.z) < 4.5 + clearance) return false;
      for (const b of boostPads) if (Math.hypot(x - b.x, z - b.z) < 4.0 + clearance) return false;
      return true;
    }

    // 3. Meadow Wind Boost Pads
    const padCoords = [
      { x: -24, z: -24, rotY: -Math.PI * 0.25 },
      { x:  24, z: -24, rotY:  Math.PI * 0.25 },
      { x:  24, z:  24, rotY:  Math.PI * 0.75 },
      { x: -24, z:  24, rotY: -Math.PI * 0.75 },
    ];
    for (const pc of padCoords) {
      boostPads.push({ x: pc.x, y: Terrain.height(pc.x, pc.z) + 0.08, z: pc.z, rotY: pc.rotY, cooldowns: [0, 0] });
    }

    // 4. Jumpable Wooden Log Hurdles
    for (let i = 0; i < cfg.hurdles; i++) {
      for (let tries = 0; tries < 40; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 18 + Math.random() * (playR - 26);
        const hx = Math.cos(ang) * rad, hz = Math.sin(ang) * rad;
        if (isSpotFree(hx, hz, 6.5)) {
          hurdles.push({ x: hx, y: Terrain.height(hx, hz), z: hz, w: 6.4, h: 1.45, d: 0.9, rotY: Math.random() * Math.PI });
          break;
        }
      }
    }

    // 5. Pine & Oak Trees
    for (let i = 0; i < cfg.trees; i++) {
      for (let tries = 0; tries < 45; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 15 + Math.random() * (playR - 21);
        const tx = Math.cos(ang) * rad, tz = Math.sin(ang) * rad;
        if (isSpotFree(tx, tz, 5.2)) {
          const sc = 0.9 + Math.random() * 0.55;
          trees.push({ x: tx, y: Terrain.height(tx, tz), z: tz, kind: Math.random() < 0.58 ? 'pine' : 'oak', r: 0.50 * sc, scale: sc, scenic: false });
          break;
        }
      }
    }

    // 6. Mossy Boulders
    for (let i = 0; i < cfg.rocks; i++) {
      for (let tries = 0; tries < 45; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 14 + Math.random() * (playR - 20);
        const rx = Math.cos(ang) * rad, rz = Math.sin(ang) * rad;
        if (isSpotFree(rx, rz, 4.4)) {
          const sc = 1.25 + Math.random() * 0.95;
          rocks.push({ x: rx, y: Terrain.height(rx, rz), z: rz, r: sc * 0.70, scale: sc, rotY: Math.random() * Math.PI * 2 });
          break;
        }
      }
    }

    // 7. Patrolling Rolling Boulders (Orta & Zor)
    for (let i = 0; i < cfg.patrollers; i++) {
      const ang = (i / Math.max(1, cfg.patrollers)) * Math.PI * 2 + 0.5;
      const rad = 28 + (i % 2) * 16;
      const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
      patrollers.push({
        cx, cz, dirX: -Math.sin(ang), dirZ: Math.cos(ang),
        span: 11.5, speed: settings.diff === 'hard' ? 1.1 : 0.8,
        phase: i * 1.4, r: 1.45,
        pos: [cx, Terrain.height(cx, cz) + 1.35, cz], spin: 0,
      });
    }

    // 8. Wildflowers
    const flowerCols = [[1.0, 0.88, 0.22], [1.0, 0.45, 0.62], [0.95, 0.96, 1.0], [0.55, 0.72, 1.0]];
    for (let i = 0; i < 65; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * (playR - 8);
      const fx = Math.cos(a) * r, fz = Math.sin(a) * r;
      flowers.push({ x: fx, y: Terrain.height(fx, fz) + 0.16, z: fz, col: flowerCols[i % flowerCols.length], scale: 0.22 + (i % 3) * 0.06 });
    }

    // 9. Spawn Apples by Mode
    if (settings.gameType === 'edu') {
      sequence = [];
      for (let i = 0; i < settings.count; i++) sequence.push((i + 1) * settings.step);
      renderer?.updateNumberAtlas(sequence);

      for (let i = 0; i < sequence.length; i++) {
        let ax = 0, az = -11;
        if (i === 0) {
          ax = settings.players === 2 ? 0 : (Math.random() - 0.5) * 4;
          az = -11;
        } else {
          let placed = false;
          for (let tries = 0; tries < 80; tries++) {
            const a = Math.random() * Math.PI * 2;
            const r = 10 + Math.sqrt(Math.random()) * (playR - 17);
            ax = Math.cos(a) * r;
            az = Math.sin(a) * r;
            if (Math.hypot(ax, az - 8) < 11) continue;
            if (isAppleSpotFree(ax, az, 11.0)) { placed = true; break; }
          }
          if (!placed) {
            const fa = (i / sequence.length) * Math.PI * 2;
            ax = Math.cos(fa) * 32; az = Math.sin(fa) * 32;
          }
        }
        const ay = Terrain.height(ax, az) + 1.25;
        apples.push({
          kind: 'edu', num: sequence[i], atlasIdx: i,
          pos: [ax, ay, az], baseY: ay, phase: Math.random() * Math.PI * 2,
          collected: [false, false],
        });
      }
    } else {
      // FUN MODE (Endless Open World)
      sequence = [];
      // Welcoming red apple straight ahead!
      const ay0 = Terrain.height(0, -10) + 1.25;
      apples.push({ kind: 'normal', pos: [0, ay0, -10], baseY: ay0, phase: 0, ttl: Infinity });
      for (let i = 1; i < FUN_APPLE_TARGET; i++) spawnFunItem('normal');
      spawnFunItem('golden');
    }
  }

  // ==================== PARTICLES & FX ====================

  function spawnBurst(pos, color, count = 20, speed = 8.5, size = 0.24, life = 0.65) {
    if (!renderer) return;
    count = Math.min(count, quality === 'full' ? 96 - particles.length : Math.min(5, 16 - particles.length));
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.45 + Math.random() * 0.85);
      particles.push({
        pos: [pos[0], pos[1], pos[2]],
        vel: [Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp + 2.0, Math.sin(ph) * Math.sin(th) * sp],
        color, size: size * (0.7 + Math.random() * 0.6), life, maxLife: life,
      });
    }
  }

  function spawnShockwave(pos, color, maxRadius = 3.8, life = 0.42) {
    if (!renderer || shockwaves.length >= (quality === 'full' ? 16 : 4)) return;
    shockwaves.push({ pos: [pos[0], pos[1], pos[2]], color, radius: 0.4, maxRadius, life, maxLife: life });
  }

  // ==================== GAME LIFECYCLE ====================

  function startGame() {
    settings.nameP1 = getPlayerName(0);
    settings.nameP2 = getPlayerName(1);
    persistSettings();

    state = 'playing';
    resetInputs();
    applyQuality(preferredQuality());
    needsPaint = true;
    elapsed = 0;
    particles = [];
    shockwaves = [];
    endWasVictory = false;
    funGoldenTimer = 9;
    funMagnetTimer = 15;

    applyAudioSettings();
    SoundFX.setMusicIntensity(settings.gameType === 'fun' ? 'fun' : 'edu');
    buildOpenWorld();

    if (settings.players === 1) {
      players = [createPlayer(0, 0, 10, Math.PI)];
      hudSingle.classList.remove('hidden');
      hudSplit.classList.add('hidden');

      const isEdu = settings.gameType === 'edu';
      eduHudPanel.classList.toggle('hidden', !isEdu);
      funHudPanel.classList.toggle('hidden', isEdu);
      p1ModeTag.textContent = `${STEP_LABELS[settings.step].toUpperCase()} RİTMİK SAYMA`;
      eduPlayerNameTag.textContent = players[0].name;
      funPlayerNameTag.textContent = players[0].name;
      funRecord = Scoreboard.getBest('fun');
      funBestEl.textContent = String(funRecord);
      camModeLabel.textContent = renderer ? TPS_CAMERAS[settings.camIndex].label : 'ÜSTTEN GÖRÜNÜM';
      updatePointerHint();
    } else {
      players = [
        createPlayer(0, -4.5, 10, Math.PI),
        createPlayer(1,  4.5, 10, Math.PI),
      ];
      hudSingle.classList.add('hidden');
      hudSplit.classList.remove('hidden');

      sp1Name.textContent = players[0].name;
      sp2Name.textContent = players[1].name;
      if (settings.gameType === 'edu') {
        splitModeTag.textContent = `${STEP_LABELS[settings.step].toUpperCase()} SAYMA YARIŞI`;
        sp1LblA.textContent = 'Son:'; sp1LblB.textContent = 'Sıradaki:';
        sp2LblA.textContent = 'Son:'; sp2LblB.textContent = 'Sıradaki:';
      } else {
        splitModeTag.textContent = 'EĞLENCE YARIŞI (SONSUZ)';
        sp1LblA.textContent = 'Skor:'; sp1LblB.textContent = 'Boy:';
        sp2LblA.textContent = 'Skor:'; sp2LblB.textContent = 'Boy:';
      }
    }

    startOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    scoreboardOverlay.classList.add('hidden');

    syncMusicButtons();
    refreshTouchVisibility();
    syncHud();
    gameCanvas.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    resetInputs();
    SoundFX.updateBoost(false);
    if (document.pointerLockElement === gameCanvas && document.exitPointerLock) {
      document.exitPointerLock();
    }
    pauseOverlay.classList.remove('hidden');
  }

  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseOverlay.classList.add('hidden');
  }

  function goToMenu() {
    state = 'menu';
    resetInputs();
    SoundFX.updateBoost(false);
    SoundFX.setMusicIntensity('menu');
    if (document.pointerLockElement === gameCanvas && document.exitPointerLock) {
      document.exitPointerLock();
    }
    hudSingle.classList.add('hidden');
    hudSplit.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    scoreboardOverlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    refreshTitleUI();
    $('btnStart').focus({ preventScroll: true });
  }

  function finishRound({ victory, winnerId = 0, badge, title, desc, focusPos }) {
    if (state === 'ended') return;
    state = 'ended';
    resetInputs();
    window.dispatchEvent(new CustomEvent('kemal-game-complete', { detail: { source: 'ritmik_yilan_round' } }));
    endWasVictory = victory;
    SoundFX.updateBoost(false);
    SoundFX.setMusicIntensity('menu');

    if (document.pointerLockElement === gameCanvas && document.exitPointerLock) {
      document.exitPointerLock();
    }

    endCamFocus = Vec3.clone(focusPos || players[0].head);
    endCamAngle = (players[winnerId] ? players[winnerId].cam.yaw : 0) + Math.PI;

    // Determine who gets recorded onto the local Top-10 Scoreboard!
    // In 1P: player 0. In 2P: the WINNER (winnerId) writes their name & score to Top-10!
    const recPlayer = players[winnerId] || players[0];
    const modeKey = settings.gameType;
    let detailStr = '';
    if (modeKey === 'edu') {
      detailStr = `${STEP_LABELS[settings.step]} • ${recPlayer.nextIdx}/${sequence.length} • ${formatTime(elapsed)}`;
    } else {
      detailStr = `Boy: ${recPlayer.targetLength} • ${recPlayer.applesEaten} Elma • ${DIFF_CONFIG[settings.diff].label}`;
    }

    const sbResult = Scoreboard.record(modeKey, {
      name: recPlayer.name,
      score: recPlayer.score,
      detail: detailStr,
      playersLabel: settings.players === 2 ? '2K' : '1K',
    });

    if (victory) {
      SoundFX.playVictory();
      spawnBurst(endCamFocus, [1.0, 0.85, 0.22], 36, 13, 0.28, 1.2);
      spawnBurst([endCamFocus[0] + 2, endCamFocus[1] + 2, endCamFocus[2]], [0.22, 0.96, 0.65], 28, 11, 0.26, 1.1);
    } else {
      spawnBurst(endCamFocus, [1.0, 0.32, 0.24], 32, 11, 0.26, 0.95);
    }

    if (sbResult.isNewRecord) {
      setTimeout(() => SoundFX.playRecord(), 320);
      endRecordBanner.classList.remove('hidden');
      endRecordBanner.textContent = `🏆 YENİ REKOR! ${recPlayer.name} — 1. SIRADA!`;
    } else if (sbResult.enteredTop10) {
      endRecordBanner.classList.remove('hidden');
      endRecordBanner.textContent = `⭐ İLK 10'A GİRDİN! ${recPlayer.name} — ${sbResult.rank}. SIRA`;
    } else {
      endRecordBanner.classList.add('hidden');
    }

    endBadge.textContent = badge;
    endBadge.className = 'brand-badge' + (victory ? ' gold' : ' danger');
    endTitle.textContent = title;
    endDesc.textContent = desc;

    if (settings.players === 1) {
      endSummarySingle.classList.remove('hidden');
      endSummarySplit.classList.add('hidden');
      const p0 = players[0];
      if (modeKey === 'edu') {
        endStat1Lbl.textContent = 'PUAN'; endStat1Val.textContent = String(p0.score);
        endStat2Lbl.textContent = 'TOPLANAN'; endStat2Val.textContent = `${p0.nextIdx} / ${sequence.length}`;
        endStat3Lbl.textContent = 'SÜRE'; endStat3Val.textContent = formatTime(elapsed);
        endStat4Lbl.textContent = 'SON SAYI'; endStat4Val.textContent = p0.lastEatenNum !== null ? String(p0.lastEatenNum) : '—';
      } else {
        endStat1Lbl.textContent = 'SKOR'; endStat1Val.textContent = String(p0.score);
        endStat2Lbl.textContent = 'YILAN BOYU'; endStat2Val.textContent = String(p0.targetLength);
        endStat3Lbl.textContent = 'YENEN ELMA'; endStat3Val.textContent = String(p0.applesEaten);
        endStat4Lbl.textContent = 'EN İYİ KOMBO'; endStat4Val.textContent = `x${p0.maxCombo}`;
      }
    } else {
      endSummarySingle.classList.add('hidden');
      endSummarySplit.classList.remove('hidden');
      const p0 = players[0], p1 = players[1];
      endP1Name.textContent = p0.name;
      endP2Name.textContent = p1.name;
      if (modeKey === 'edu') {
        endP1Prog.textContent = `${p0.nextIdx} / ${sequence.length}`;
        endP1Detail.textContent = `Puan: ${p0.score} • Son: ${p0.lastEatenNum ?? '—'}`;
        endP2Prog.textContent = `${p1.nextIdx} / ${sequence.length}`;
        endP2Detail.textContent = `Puan: ${p1.score} • Son: ${p1.lastEatenNum ?? '—'}`;
      } else {
        endP1Prog.textContent = `${p0.score} Puan`;
        endP1Detail.textContent = `Boy: ${p0.targetLength} • ${p0.applesEaten} Elma`;
        endP2Prog.textContent = `${p1.score} Puan`;
        endP2Detail.textContent = `Boy: ${p1.targetLength} • ${p1.applesEaten} Elma`;
      }
    }

    if (modeKey === 'edu' && victory && (settings.step < 10 || settings.diff !== 'hard')) {
      btnNextLevel.classList.remove('hidden');
      btnNextLevel.textContent = settings.step < 10
        ? `SONRAKİ SEVİYE (${STEP_LABELS[settings.step + 1].toUpperCase()} SAYMA)`
        : `ZORLUĞU ARTIR (${settings.diff === 'easy' ? 'ORTA' : 'ZOR'})`;
    } else {
      btnNextLevel.classList.add('hidden');
    }

    setTimeout(() => {
      if (state === 'ended') endOverlay.classList.remove('hidden');
    }, 460);
  }

  function tryJump(p) {
    if (!p.alive || !p.grounded || p.jumpCooldown > 0) return;
    p.grounded = false;
    p.vy = 14.0;
    p.airborneJumpedTail = false;
    p.airborneJumpedHurdle = false;
    SoundFX.playJump();
    const gy = Terrain.height(p.head[0], p.head[2]) + 0.1;
    spawnShockwave([p.head[0], gy, p.head[2]], p.skin.secondary, 2.8, 0.35);
    spawnBurst([p.head[0], gy + 0.2, p.head[2]], p.skin.secondary, 9, 5.2, 0.16, 0.35);
  }

  // ==================== UPDATE SIMULATION ====================

  function updatePatrollers(dt) {
    for (const pt of patrollers) {
      const s = Math.sin(time * pt.speed + pt.phase) * pt.span;
      const nx = pt.cx + pt.dirX * s;
      const nz = pt.cz + pt.dirZ * s;
      pt.spin += Math.hypot(nx - pt.pos[0], nz - pt.pos[2]) / pt.r;
      pt.pos[0] = nx;
      pt.pos[2] = nz;
      pt.pos[1] = Terrain.height(nx, nz) + pt.r * 0.92;
    }
  }

  function updatePlaying(dt) {
    elapsed += dt;
    updatePatrollers(dt);

    // Fun mode periodic Golden Apple & Magnet Crystal spawns
    if (settings.gameType === 'fun') {
      funGoldenTimer -= dt;
      if (funGoldenTimer <= 0) {
        if (!apples.some((a) => a.kind === 'golden')) spawnFunItem('golden');
        funGoldenTimer = 14 + Math.random() * 8;
      }
      funMagnetTimer -= dt;
      if (funMagnetTimer <= 0) {
        if (!apples.some((a) => a.kind === 'magnet')) spawnFunItem('magnet');
        funMagnetTimer = 20 + Math.random() * 10;
      }
      for (let i = apples.length - 1; i >= 0; i--) {
        const a = apples[i];
        if (a.ttl !== Infinity) {
          a.ttl -= dt;
          if (a.ttl <= 0) { apples.splice(i, 1); continue; }
        }
        a.pos[1] = a.baseY + Math.sin(time * 2.8 + a.phase) * 0.22;
      }
    } else {
      for (const a of apples) {
        a.pos[1] = a.baseY + Math.sin(time * 2.8 + a.phase) * 0.22;
      }
    }

    let anyBoost = false;
    for (let pi = 0; pi < players.length; pi++) {
      if (state !== 'playing') break;
      updatePlayer(players[pi], dt);
      if (players[pi].boosting || players[pi].boostPadTimer > 0) anyBoost = true;
    }
    SoundFX.updateBoost(anyBoost);
  }

  function updatePlayer(p, dt) {
    const diffCfg = DIFF_CONFIG[settings.diff];
    const isSingle = settings.players === 1;
    const toastSlot = isSingle ? 'center' : (p.id === 0 ? 'left' : 'right');
    const speedFactor = settings.speedPct / 100;

    // ---- 1. Keyboard + Mouse + Multi-Touch / Smartboard Steering ----
    let turnInput = 0;
    let wantBoost = false;
    let wantBrake = false;

    if (isSingle) {
      if (keys['KeyA'] || keys['ArrowLeft']) turnInput += 1;
      if (keys['KeyD'] || keys['ArrowRight']) turnInput -= 1;
      if (Math.abs(touch1P.steer) > 0.01) turnInput = clamp(turnInput + touch1P.steer, -1, 1);
      wantBoost = !!(keys['ShiftLeft'] || keys['ShiftRight'] || mouseBoosting || touch1P.turbo);
      wantBrake = !!(keys['KeyS'] || keys['ArrowDown'] || touch1P.brake);
    } else if (p.id === 0) {
      if (keys['KeyA'] || touch2P[0].left) turnInput += 1;
      if (keys['KeyD'] || touch2P[0].right) turnInput -= 1;
      wantBoost = !!(keys['KeyW'] || keys['ShiftLeft'] || touch2P[0].turbo);
      wantBrake = !!keys['KeyS'];
    } else {
      if (keys['ArrowLeft'] || touch2P[1].left) turnInput += 1;
      if (keys['ArrowRight'] || touch2P[1].right) turnInput -= 1;
      wantBoost = !!(keys['ArrowUp'] || keys['ShiftRight'] || touch2P[1].turbo);
      wantBrake = !!keys['ArrowDown'];
    }

    const gesture = gestures[p.id];
    turnInput = clamp(turnInput + gesture.steer, -1, 1);
    wantBoost ||= gesture.turbo;
    wantBrake ||= gesture.brake;
    const scaledTurnRate = diffCfg.turnRate * lerp(0.85, 1.15, clamp((speedFactor - 0.5) / 1.1, 0, 1));
    p.turnVel = lerp(p.turnVel, turnInput * scaledTurnRate, 1 - Math.exp(-15 * dt));
    p.yaw += p.turnVel * dt;

    if (isSingle && mouseYawAccum !== 0) {
      const md = clamp(mouseYawAccum, -140, 140) * 0.0034;
      p.yaw -= md;
      p.turnVel = clamp(p.turnVel - md * 14, -4.2, 4.2);
      mouseYawAccum = 0;
    }
    if (isSingle && mousePitchAccum !== 0) {
      const mp = clamp(mousePitchAccum, -120, 120);
      p.cam.userPitchOffset = clamp(p.cam.userPitchOffset + mp * 0.0022, -0.18, 0.44);
      mousePitchAccum = 0;
    }

    // ---- 2. Speed (Respects User Speed Slider!), Turbo & Brake ----
    if (wantBoost && !wantBrake && p.turbo > 4) {
      p.boosting = true;
      p.turbo = Math.max(0, p.turbo - 30 * dt);
    } else {
      p.boosting = false;
      p.turbo = Math.min(100, p.turbo + 22 * dt);
    }
    if (p.boostPadTimer > 0) p.boostPadTimer = Math.max(0, p.boostPadTimer - dt);
    if (p.magnetTimer > 0) p.magnetTimer = Math.max(0, p.magnetTimer - dt);
    if (p.fenceWarnCooldown > 0) p.fenceWarnCooldown = Math.max(0, p.fenceWarnCooldown - dt);
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) { p.combo = 1; p.comboTimer = 0; }
    }

    const growthSpd = Math.min(1.8, p.applesEaten * 0.06);
    const baseSpd = Math.min(diffCfg.maxSpeed, diffCfg.baseSpeed + growthSpd) * speedFactor;
    const mult = p.boostPadTimer > 0
      ? 1.50
      : (p.boosting ? (isSingle ? 1.42 : 1.38) : (wantBrake ? 0.58 : 1.0));
    p.speed = lerp(p.speed, baseSpd * mult, 1 - Math.exp(-8.5 * dt));

    // ---- 3. 3D Rolling Terrain Movement & Jump ----
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    p.head[0] += fx * p.speed * dt;
    p.head[2] += fz * p.speed * dt;

    const gY = Terrain.height(p.head[0], p.head[2]) + 0.85;
    if (p.jumpCooldown > 0) p.jumpCooldown = Math.max(0, p.jumpCooldown - dt);

    if (!p.grounded) {
      p.vy -= 30.5 * dt;
      p.head[1] += p.vy * dt;
      p.pitch = clamp(Math.atan2(p.vy, Math.max(4, p.speed) * 1.15), -0.68, 0.72);
      if (p.head[1] <= gY) {
        p.head[1] = gY;
        p.vy = 0;
        p.grounded = true;
        p.jumpCooldown = 0.28;
        SoundFX.playLand();
        p.cam.shake = Math.max(p.cam.shake, 0.14);
        spawnShockwave([p.head[0], gY - 0.75, p.head[2]], p.skin.secondary, 2.2, 0.28);
      }
    } else {
      p.head[1] = gY;
      const hAhead = Terrain.height(p.head[0] + fx * 1.6, p.head[2] + fz * 1.6);
      const slopePitch = clamp(Math.atan2(hAhead - (gY - 0.85), 1.6), -0.52, 0.52);
      p.pitch = lerp(p.pitch, slopePitch, 1 - Math.exp(-12 * dt));
    }

    // ---- 4. Update Arc-Length Spine Trail ----
    const last = p.trail[p.trail.length - 1];
    const stepD = Vec3.dist(p.head, [last.x, last.y, last.z]);
    if (stepD > 0.08) {
      p.totalDist += stepD;
      p.trail.push({ x: p.head[0], y: p.head[1], z: p.head[2], s: p.totalDist });
      rebuildSegments(p);
    }

    if ((p.boosting || p.boostPadTimer > 0) && Math.random() < 0.55) {
      const seg = p.segments[Math.min(2, p.segments.length - 1)];
      if (seg) {
        particles.push({
          pos: [seg.pos[0] + (Math.random() - 0.5) * 0.6, seg.pos[1], seg.pos[2] + (Math.random() - 0.5) * 0.6],
          vel: [-seg.fwd[0] * 3.5, 1.4 + Math.random() * 1.5, -seg.fwd[2] * 3.5],
          color: p.boostPadTimer > 0 ? [0.3, 0.95, 1.0] : p.skin.secondary,
          size: 0.17, life: 0.32, maxLife: 0.32,
        });
      }
    }

    if (p.chompTimer > 0) p.chompTimer = Math.max(0, p.chompTimer - dt);
    if (p.eatFlash > 0) p.eatFlash = Math.max(0, p.eatFlash - dt * 2.2);
    for (let i = p.digestPulses.length - 1; i >= 0; i--) {
      p.digestPulses[i].t += dt * 0.9;
      if (p.digestPulses[i].t > 1.15) p.digestPulses.splice(i, 1);
    }

    // ---- 5. Meadow Boost Pads ----
    for (const pad of boostPads) {
      if (pad.cooldowns[p.id] > 0) pad.cooldowns[p.id] = Math.max(0, pad.cooldowns[p.id] - dt);
      if (pad.cooldowns[p.id] <= 0 && (p.head[1] - pad.y) < 2.0) {
        const dx = p.head[0] - pad.x, dz = p.head[2] - pad.z;
        if (dx * dx + dz * dz < 3.0 * 3.0) {
          pad.cooldowns[p.id] = 2.2;
          p.boostPadTimer = 1.45;
          p.turbo = Math.min(100, p.turbo + 40);
          p.cam.shake = Math.max(p.cam.shake, 0.18);
          SoundFX.playBoostPad();
          spawnShockwave([pad.x, pad.y + 0.08, pad.z], [0.25, 0.95, 1.0], 4.4, 0.38);
          showToast('RÜZGAR HIZI!', 'cyan', toastSlot);
        }
      }
    }

    // ---- 6. Collectibles (Education Mode vs Endless Fun Mode) ----
    let nearestAppleD = 999;

    if (settings.gameType === 'edu') {
      const expectedNum = sequence[p.nextIdx];
      for (const a of apples) {
        if (a.collected[p.id]) continue;
        const d = Vec3.dist(p.head, a.pos);
        if (d < nearestAppleD) nearestAppleD = d;

        const hitDist = a.num === expectedNum ? 2.25 : 1.50;
        if (d < hitDist) {
          if (a.num === expectedNum) {
            a.collected[p.id] = true;
            p.lastEatenNum = a.num;
            p.lastEatenAtlasIdx = a.atlasIdx;
            p.nextIdx += 1;
            p.applesEaten += 1;
            p.targetLength += 3;
            p.turbo = Math.min(100, p.turbo + 32);
            p.chompTimer = 0.30;
            p.eatFlash = 1.0;
            p.digestPulses.push({ t: 0 });

            const pts = Math.round((10 + settings.step * 2) * diffCfg.scoreMult);
            p.score += pts;

            SoundFX.playEat(p.nextIdx - 1);
            SoundFX.speakNumber(a.num);
            spawnBurst(a.pos, [1.0, 0.85, 0.25], 22, 8.5, 0.24, 0.58);
            spawnShockwave([a.pos[0], Terrain.height(a.pos[0], a.pos[2]) + 0.12, a.pos[2]], [0.3, 0.98, 0.62], 3.4, 0.36);

            if (p.nextIdx >= sequence.length) {
              p.finished = true;
              const timeBonus = Math.max(0, Math.round(140 - elapsed * 1.2));
              p.score += Math.round(150 * diffCfg.scoreMult) + timeBonus;
              showToast(`TEBRİKLER! ${a.num}`, 'gold', toastSlot);
              finishRound({
                victory: true,
                winnerId: p.id,
                badge: settings.players === 1 ? 'TUR TAMAMLANDI!' : `${p.name.toUpperCase()} KAZANDI!`,
                title: settings.players === 1 ? 'Harika İş Çıkardın!' : `${p.name} Şampiyon!`,
                desc: settings.players === 1
                  ? `${STEP_LABELS[settings.step]} ritmik saymayı ${sequence[0]}'den ${sequence[sequence.length - 1]}'ye kadar hatasız bitirdin!`
                  : `${p.name} tüm sayıları (${sequence[0]} → ${sequence[sequence.length - 1]}) önce tamamlayarak yarışı kazandı!`,
                focusPos: p.head,
              });
              return;
            } else {
              const nextHint = settings.showHint ? ` • Sıradaki: ${sequence[p.nextIdx]}` : '';
              showToast(`DOĞRU! ${a.num}${nextHint}`, 'gold', toastSlot);
            }
            break;
          } else {
            p.alive = false;
            p.cam.shake = 0.75;
            SoundFX.playWrongApple();
            showToast(`YANLIŞ! (${a.num})`, 'danger', toastSlot);

            if (settings.players === 1) {
              finishRound({
                victory: false,
                winnerId: 0,
                badge: 'YANLIŞ SIRA!',
                title: 'Sırayı Karıştırdın!',
                desc: `Sıradaki sayı ${expectedNum} olmalıydı, sen ${a.num} numaralı elmayı yedin!`,
                focusPos: a.pos,
              });
            } else {
              const otherId = 1 - p.id;
              players[otherId].score += 100;
              finishRound({
                victory: true,
                winnerId: otherId,
                badge: `${players[otherId].name.toUpperCase()} KAZANDI!`,
                title: `${players[otherId].name} Kazandı!`,
                desc: `${p.name} sıradaki ${expectedNum} yerine yanlışlıkla ${a.num} numaralı elmayı yedi!`,
                focusPos: players[otherId].head,
              });
            }
            return;
          }
        }
      }
    } else {
      // FUN MODE (Endless Growth & Combos!)
      for (let i = apples.length - 1; i >= 0; i--) {
        const a = apples[i];
        const d = Vec3.dist(p.head, a.pos);
        if (d < nearestAppleD) nearestAppleD = d;

        // Magnetic attraction when magnet powerup is active!
        if (p.magnetTimer > 0 && d < 14.5) {
          const pull = (1 - d / 14.5) * 24 * dt;
          const dir = Vec3.normalize([0, 0, 0], Vec3.sub([0, 0, 0], p.head, a.pos));
          a.pos[0] += dir[0] * pull;
          a.pos[1] += dir[1] * pull;
          a.pos[2] += dir[2] * pull;
          a.baseY = a.pos[1];
        }

        if (Vec3.dist(p.head, a.pos) < 2.25) {
          p.applesEaten += 1;
          p.chompTimer = 0.28;
          p.digestPulses.push({ t: 0 });

          if (p.comboTimer > 0) p.combo = Math.min(8, p.combo + 1);
          else p.combo = 1;
          p.maxCombo = Math.max(p.maxCombo, p.combo);
          p.comboTimer = COMBO_WINDOW;

          if (a.kind === 'normal') {
            const pts = Math.round(10 * p.combo * diffCfg.scoreMult);
            p.score += pts;
            p.targetLength += 3; // Unlimited endless growth!
            p.turbo = Math.min(100, p.turbo + 26);
            SoundFX.playEat(p.combo - 1);
            spawnBurst(a.pos, [1.0, 0.26, 0.28], 18, 8.2, 0.22, 0.52);
            showToast(p.combo > 1 ? `+${pts} (x${p.combo})` : `+${pts}`, '', toastSlot);
            apples.splice(i, 1);
            spawnFunItem('normal');
          } else if (a.kind === 'golden') {
            const pts = Math.round(35 * p.combo * diffCfg.scoreMult);
            p.score += pts;
            p.targetLength += 5;
            p.turbo = 100;
            SoundFX.playGolden();
            spawnBurst(a.pos, [1.0, 0.86, 0.2], 32, 11, 0.26, 0.72);
            spawnShockwave([a.pos[0], Terrain.height(a.pos[0], a.pos[2]) + 0.12, a.pos[2]], [1.0, 0.85, 0.22], 5.0, 0.45);
            showToast(`ALTIN ELMA +${pts}!`, 'gold', toastSlot);
            apples.splice(i, 1);
          } else if (a.kind === 'magnet') {
            const pts = Math.round(20 * p.combo * diffCfg.scoreMult);
            p.score += pts;
            p.targetLength += 2;
            p.magnetTimer = 8.0;
            p.turbo = Math.min(100, p.turbo + 40);
            SoundFX.playMagnet();
            spawnBurst(a.pos, [0.22, 0.88, 1.0], 28, 9.5, 0.24, 0.62);
            showToast(`MIKNATIS +${pts}!`, 'cyan', toastSlot);
            apples.splice(i, 1);
          }
          break;
        }
      }
    }

    p.tonguePhase += dt * (nearestAppleD < 9 ? 7.2 : 2.8);

    // ---- 7. Obstacles, Valley Fence & Own Body Collision ----
    checkPlayerCollisions(p, toastSlot);

    // ---- 8. TPS Camera ----
    if (renderer) updateTPSCamera(p, dt);
  }

  function handlePlayerCrash(p, badge, reasonSingle, reasonSplit) {
    p.alive = false;
    p.cam.shake = 0.85;
    SoundFX.playCrash();
    if (settings.players === 1) {
      finishRound({
        victory: false,
        winnerId: 0,
        badge,
        title: settings.gameType === 'fun' ? 'Tur Tamamlandı!' : 'Oyun Bitti!',
        desc: reasonSingle,
        focusPos: p.head,
      });
    } else {
      const otherId = 1 - p.id;
      players[otherId].score += 75;
      finishRound({
        victory: true,
        winnerId: otherId,
        badge: `${players[otherId].name.toUpperCase()} KAZANDI!`,
        title: `${players[otherId].name} Kazandı!`,
        desc: reasonSplit,
        focusPos: players[otherId].head,
      });
    }
  }

  function checkPlayerCollisions(p, toastSlot) {
    const hx = p.head[0], hy = p.head[1], hz = p.head[2];
    const rFromCenter = Math.hypot(hx, hz);
    const playR = Terrain.PLAY_RADIUS;

    p.wallDanger = smoothstep(playR - 9.0, playR - 1.5, rFromCenter);

    // 1. Valley Wooden Fence Smooth Inward Deflection
    const maxR = playR - 1.0;
    if (rFromCenter > maxR) {
      const invR = 1.0 / Math.max(0.001, rFromCenter);
      const nx = hx * invR, nz = hz * invR;
      p.head[0] = nx * maxR;
      p.head[2] = nz * maxR;
      p.yaw = lerpAngle(p.yaw, Math.atan2(-nx, -nz), 0.28);
      if (p.fenceWarnCooldown <= 0) {
        p.fenceWarnCooldown = 1.8;
        showToast('VADİ ÇİTİ — İÇERİ DÖN!', 'cyan', toastSlot);
      }
    }

    // 2. Trees
    for (const t of trees) {
      if (t.scenic) continue;
      if (Math.hypot(p.head[0] - t.x, p.head[2] - t.z) < t.r + HEAD_RADIUS * 0.55) {
        handlePlayerCrash(p, 'AĞAÇ ÇARPIŞMASI', 'Ormandaki ağacın gövdesine çarptın!', `${p.name} bir ağaca çarptı!`);
        return;
      }
    }

    // 3. Mossy Rocks
    for (const rk of rocks) {
      const d = Math.hypot(p.head[0] - rk.x, p.head[2] - rk.z);
      if (d < rk.r + HEAD_RADIUS * 0.55 && hy < rk.y + rk.scale * 0.98) {
        handlePlayerCrash(p, 'KAYA ENGELİ', 'Arazideki büyük kayaya çarptın!', `${p.name} kayaya çarptı!`);
        return;
      }
    }

    // 4. Jumpable Wooden Log Hurdles (exact +rotY inverse transform)
    for (const h of hurdles) {
      const dx = p.head[0] - h.x, dz = p.head[2] - h.z;
      const cy = Math.cos(h.rotY), sy = Math.sin(h.rotY);
      const lx = dx * cy - dz * sy;
      const lz = dx * sy + dz * cy;
      if (Math.abs(lx) < h.w * 0.5 + HEAD_RADIUS * 0.45 && Math.abs(lz) < h.d * 0.5 + HEAD_RADIUS * 0.45) {
        if (hy < h.y + h.h + 0.15) {
          handlePlayerCrash(p, 'AHŞAP KÜTÜK', 'Yerdeki kütük engele çarptın! Zıplayarak üstünden atlayabilirsin.', `${p.name} kütük engele çarptı!`);
          return;
        } else if (!p.grounded && !p.airborneJumpedHurdle) {
          p.airborneJumpedHurdle = true;
          p.score += 20;
          p.turbo = Math.min(100, p.turbo + 22);
          SoundFX.playTailJump();
          showToast('KÜTÜK ATLADIN +20!', 'cyan', toastSlot);
        }
      }
    }

    // 5. Patrolling Rolling Boulders
    for (const pt of patrollers) {
      if (Vec3.dist(p.head, pt.pos) < pt.r + HEAD_RADIUS * 0.55) {
        handlePlayerCrash(p, 'HAREKETLİ KAYA', 'Yuvarlanan hareketli kayaya çarptın!', `${p.name} hareketli kayaya çarptı!`);
        return;
      }
    }

    // 6. Own Body Self-Collision (neck buffer = 14)
    const NECK_SKIP = 14;
    for (let i = NECK_SKIP; i < p.segments.length; i++) {
      const seg = p.segments[i];
      const dx = p.head[0] - seg.pos[0], dy = hy - seg.pos[1], dz = p.head[2] - seg.pos[2];
      const hitR = (HEAD_RADIUS + seg.radius) * 0.56;
      if (dx * dx + dy * dy + dz * dz < hitR * hitR) {
        handlePlayerCrash(p, 'KENDİ KUYRUĞUN', 'Kendi kuyruğuna çarptın! Zıplayarak gövdenin üstünden atlayabilirsin.', `${p.name} kendi kuyruğuna çarptı!`);
        return;
      }
      if (!p.grounded && !p.airborneJumpedTail) {
        if (dx * dx + dz * dz < 1.25 * 1.25 && dy > 1.0 && dy < 4.8) {
          p.airborneJumpedTail = true;
          p.score += 25;
          p.turbo = Math.min(100, p.turbo + 24);
          SoundFX.playTailJump();
          showToast('KUYRUK ATLADIN +25!', 'gold', toastSlot);
        }
      }
    }
  }

  function updateTPSCamera(p, dt) {
    const cam = p.cam;
    const preset = TPS_CAMERAS[settings.camIndex];
    const smoothK = dt >= 0.99 ? 1.0 : 1 - Math.exp(-7.8 * dt);

    cam.yaw = lerpAngle(cam.yaw, p.yaw, smoothK);
    cam.roll = lerp(cam.roll, clamp(-p.turnVel * 0.025, -0.085, 0.085), 1 - Math.exp(-8.0 * dt));
    const targetFov = preset.fov + (p.boostPadTimer > 0 ? 12 : p.boosting ? 8.5 : 0);
    cam.fov = lerp(cam.fov, targetFov, 1 - Math.exp(-6.5 * dt));

    const fwdX = Math.sin(cam.yaw), fwdZ = Math.cos(cam.yaw);
    const backDist = preset.dist * (p.boosting ? 1.06 : 1.0);
    const extraH = preset.height + cam.userPitchOffset * 8.0;

    const camX = p.head[0] - fwdX * backDist;
    const camZ = p.head[2] - fwdZ * backDist;
    const groundAtCam = Terrain.height(camX, camZ);
    const desiredPos = [camX, Math.max(p.head[1] + extraH, groundAtCam + 2.6), camZ];

    const hFwdX = Math.sin(p.yaw) * Math.cos(p.pitch);
    const hFwdY = Math.sin(p.pitch);
    const hFwdZ = Math.cos(p.yaw) * Math.cos(p.pitch);
    const desiredTarget = [
      p.head[0] + hFwdX * preset.lookAhead,
      p.head[1] + hFwdY * preset.lookAhead + 0.85,
      p.head[2] + hFwdZ * preset.lookAhead,
    ];

    const posLerp = dt >= 0.99 ? 1.0 : 1 - Math.exp(-12.5 * dt);
    Vec3.lerp(cam.pos, cam.pos, desiredPos, posLerp);
    Vec3.lerp(cam.target, cam.target, desiredTarget, posLerp);

    if (cam.shake > 0.001) {
      cam.pos[0] += (Math.random() - 0.5) * cam.shake * 0.85;
      cam.pos[1] += (Math.random() - 0.5) * cam.shake * 0.85;
      cam.pos[2] += (Math.random() - 0.5) * cam.shake * 0.85;
      cam.shake = Math.max(0, cam.shake - dt * 2.2);
    }

    const viewDir = Vec3.normalize([0, 0, 0], Vec3.sub([0, 0, 0], cam.target, cam.pos));
    const baseRight = Vec3.normalize([0, 0, 0], Vec3.cross([0, 0, 0], viewDir, [0, 1, 0]));
    const baseUp = Vec3.cross([0, 0, 0], baseRight, viewDir);
    const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
    cam.up = [
      baseUp[0] * cr + baseRight[0] * sr,
      baseUp[1] * cr + baseRight[1] * sr,
      baseUp[2] * cr + baseRight[2] * sr,
    ];
  }

  function updateEndCamera(dt) {
    endCamAngle += dt * 0.48;
    for (const p of players) {
      const fx = endCamFocus[0] + Math.sin(endCamAngle) * 14.5;
      const fz = endCamFocus[2] + Math.cos(endCamAngle) * 14.5;
      const fy = Math.max(endCamFocus[1] + 6.5, Terrain.height(fx, fz) + 3.2);
      Vec3.lerp(p.cam.pos, p.cam.pos, [fx, fy, fz], 1 - Math.exp(-3.5 * dt));
      Vec3.lerp(p.cam.target, p.cam.target, endCamFocus, 1 - Math.exp(-6.0 * dt));
      p.cam.up = [0, 1, 0];
      p.cam.fov = lerp(p.cam.fov, 56, 1 - Math.exp(-3.0 * dt));
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(i, 1); continue; }
      pt.vel[1] -= 15.5 * dt;
      pt.pos[0] += pt.vel[0] * dt;
      pt.pos[1] += pt.vel[1] * dt;
      pt.pos[2] += pt.vel[2] * dt;
      const gy = Terrain.height(pt.pos[0], pt.pos[2]) + 0.12;
      if (pt.pos[1] < gy) { pt.pos[1] = gy; pt.vel[1] *= -0.45; }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) { shockwaves.splice(i, 1); continue; }
      const prog = 1 - sw.life / sw.maxLife;
      sw.radius = lerp(0.45, sw.maxRadius, 1 - Math.pow(1 - prog, 2.4));
    }
  }

  // ==================== 3D OPEN-WORLD RENDERING ====================

  function renderScene(width, height) {
    if (!renderer) return;
    renderer.prepareCanvas(width, height);
    const detailed = quality === 'full';

    renderer.beginFrame();

    // 1. Open-World Terrain
    renderer.submit({ mesh: 'terrain', model: Mat4.create(), color: [0.22, 0.58, 0.20], matType: 1, castShadow: false });

    // 2. Continuous Wooden Valley Fence
    for (let i = 0; i < fencePosts.length; i += detailed ? 1 : 3) {
      const fp = fencePosts[i];
      renderer.submit({
        mesh: 'cylinder',
        model: Mat4.fromTRS(Mat4.create(), [fp.x, fp.y + 1.0, fp.z], 0, 0, 0, [0.24, 2.2, 0.24]),
        color: [0.46, 0.30, 0.16], color2: [0.36, 0.22, 0.12], extra: [1, 0, 0, 0], castShadow: false,
      });
      if (!detailed) continue;
      const nxt = fencePosts[(i + 1) % fencePosts.length];
      const dx = nxt.x - fp.x, dy = nxt.y - fp.y, dz = nxt.z - fp.z;
      const span = Math.hypot(dx, dy, dz);
      const midX = (fp.x + nxt.x) * 0.5, midY = (fp.y + nxt.y) * 0.5, midZ = (fp.z + nxt.z) * 0.5;
      const fwd = [dx / span, dy / span, dz / span];
      for (const railH of [0.78, 1.48]) {
        renderer.submit({
          mesh: 'box',
          model: Mat4.fromBasis(Mat4.create(), [midX, midY + railH, midZ], fwd, [0, 1, 0], [0.16, 0.20, span + 0.1]),
          color: [0.56, 0.37, 0.19], color2: [0.44, 0.28, 0.14], castShadow: false,
        });
      }
    }

    // 3. Boost Pads
    for (const pad of boostPads) {
      const n = Terrain.normal(pad.x, pad.z);
      renderer.submit({
        mesh: 'plane',
        model: Mat4.fromBasis(Mat4.create(), [pad.x, pad.y + 0.08, pad.z], [Math.sin(pad.rotY), 0, Math.cos(pad.rotY)], n, [3.2, 1, 5.4]),
        color: [0.10, 0.78, 0.96], color2: [0.42, 1.0, 0.78], matType: 6, castShadow: false,
      });
    }

    // 4. Trees
    for (const t of trees) {
      if (!detailed && t.scenic) continue;
      const s = t.scale;
      renderer.submit({
        mesh: 'taperTrunk',
        model: Mat4.fromTRS(Mat4.create(), [t.x, t.y + 1.7 * s, t.z], 0, 0, 0, [0.55 * s, 3.6 * s, 0.55 * s]),
        color: [0.44, 0.27, 0.14], color2: [0.34, 0.20, 0.10], extra: [1, 0, 0, 0], castShadow: !t.scenic,
      });
      if (t.kind === 'pine') {
        renderer.submit({ mesh: 'cone', model: Mat4.fromTRS(Mat4.create(), [t.x, t.y + 3.8 * s, t.z], 0, 0, 0, [2.3 * s, 3.2 * s, 2.3 * s]), color: [0.10, 0.42, 0.18], color2: [0.16, 0.56, 0.22], extra: [1, 0, 0, 0], castShadow: !t.scenic });
        renderer.submit({ mesh: 'cone', model: Mat4.fromTRS(Mat4.create(), [t.x, t.y + 5.7 * s, t.z], 0.5, 0, 0, [1.8 * s, 2.7 * s, 1.8 * s]), color: [0.13, 0.50, 0.21], color2: [0.22, 0.64, 0.26], extra: [1, 0, 0, 0], castShadow: !t.scenic });
        if (!detailed) continue;
        renderer.submit({ mesh: 'cone', model: Mat4.fromTRS(Mat4.create(), [t.x, t.y + 7.2 * s, t.z], 1.1, 0, 0, [1.15 * s, 2.1 * s, 1.15 * s]), color: [0.18, 0.58, 0.24], color2: [0.28, 0.72, 0.28], extra: [1, 0, 0, 0], castShadow: false });
      } else {
        renderer.submit({ mesh: 'sphere', model: Mat4.fromTRS(Mat4.create(), [t.x, t.y + 4.4 * s, t.z], 0, 0, 0, [2.2 * s, 1.9 * s, 2.2 * s]), color: [0.18, 0.56, 0.20], color2: [0.34, 0.74, 0.25], extra: [1, 0, 0, 0], castShadow: !t.scenic });
        renderer.submit({ mesh: 'lowSphere', model: Mat4.fromTRS(Mat4.create(), [t.x + 1.0 * s, t.y + 3.9 * s, t.z + 0.6 * s], 0, 0, 0, [1.4 * s, 1.3 * s, 1.4 * s]), color: [0.22, 0.62, 0.22], castShadow: false });
      }
    }

    // 5. Mossy Boulders
    for (const rk of rocks) {
      renderer.submit({
        mesh: 'rock',
        model: Mat4.fromTRS(Mat4.create(), [rk.x, rk.y + rk.scale * 0.42, rk.z], rk.rotY, 0, 0, [rk.scale * 1.15, rk.scale * 0.92, rk.scale * 1.05]),
        color: [0.46, 0.47, 0.45], color2: [0.30, 0.46, 0.26], extra: [1, 0, 0, 0],
      });
    }

    // 6. Jumpable Hurdles
    for (const h of hurdles) {
      const halfW = h.w * 0.5, cr = Math.cos(h.rotY), sr = Math.sin(h.rotY);
      for (const side of [-1, 1]) {
        renderer.submit({
          mesh: 'cylinder',
          model: Mat4.fromTRS(Mat4.create(), [h.x + cr * halfW * side, h.y + h.h * 0.55, h.z - sr * halfW * side], 0, 0, 0, [0.36, h.h * 1.15, 0.36]),
          color: [0.42, 0.26, 0.14], color2: [1.0, 0.78, 0.18],
        });
      }
      renderer.submit({ mesh: 'box', model: Mat4.fromTRS(Mat4.create(), [h.x, h.y + h.h * 0.76, h.z], h.rotY, 0, 0, [h.w, 0.42, 0.48]), color: [0.68, 0.40, 0.16], color2: [1.0, 0.82, 0.26], emissive: [0.12, 0.07, 0.02] });
      renderer.submit({ mesh: 'box', model: Mat4.fromTRS(Mat4.create(), [h.x, h.y + h.h * 0.32, h.z], h.rotY, 0, 0, [h.w, 0.24, 0.32]), color: [0.54, 0.32, 0.14] });
    }

    // 7. Patrolling Rolling Boulders
    for (const pt of patrollers) {
      renderer.submit({
        mesh: 'rock',
        model: Mat4.fromTRS(Mat4.create(), pt.pos, Math.atan2(pt.dirX, pt.dirZ), pt.spin, 0, [pt.r, pt.r, pt.r]),
        color: [0.62, 0.26, 0.22], color2: [0.95, 0.52, 0.22], emissive: [0.14, 0.04, 0.02], extra: [1, 0, 0, 0],
      });
    }

    // 8. Wildflowers
    if (detailed) for (const fl of flowers) {
      renderer.submit({
        mesh: 'lowSphere',
        model: Mat4.fromTRS(Mat4.create(), [fl.x, fl.y, fl.z], 0, 0, 0, [fl.scale, fl.scale * 0.55, fl.scale]),
        color: fl.col, emissive: [fl.col[0] * 0.2, fl.col[1] * 0.2, fl.col[2] * 0.2], castShadow: false,
      });
    }

    // 9. Apples & Collectibles
    for (const a of apples) {
      const isEdu = settings.gameType === 'edu';
      const vMask = isEdu ? ((!a.collected[0] ? 1 : 0) | ((settings.players === 2 && !a.collected[1]) ? 2 : 0)) : 3;
      if (vMask === 0) continue;

      const rot = time * (a.kind === 'golden' ? 2.4 : 1.35) + a.phase;
      const appleR = a.kind === 'golden' ? 1.18 : 1.12;
      const gAt = detailed ? Terrain.height(a.pos[0], a.pos[2]) + 0.12 : 0;
      const gNorm = detailed ? Terrain.normal(a.pos[0], a.pos[2]) : null;

      if (a.kind === 'magnet') {
        renderer.submit({
          mesh: 'crystal',
          model: Mat4.fromTRS(Mat4.create(), a.pos, rot, Math.sin(time * 2.2) * 0.2, 0, [1.05, 1.45, 1.05]),
          color: [0.14, 0.78, 0.98], color2: [0.75, 0.98, 1.0], matType: 3, viewerMask: vMask, castShadow: false,
        });
        if (detailed) renderer.submit({
          mesh: 'ring', model: Mat4.fromBasis(Mat4.create(), [a.pos[0], gAt, a.pos[2]], [0, 0, 1], gNorm, [1.65, 1, 1.65]),
          color: [0.22, 0.88, 1.0], emissive: [0.2, 0.85, 1.0], alpha: 0.72, matType: 5, extra: [2, a.phase, 0, 0],
          additive: true, doubleSided: true, viewerMask: vMask, castShadow: false,
        });
      } else {
        const isGold = a.kind === 'golden';
        renderer.submit({
          mesh: 'apple',
          model: Mat4.fromTRS(Mat4.create(), a.pos, rot, 0, 0, [appleR, appleR, appleR]),
          color: isGold ? [1.0, 0.74, 0.08] : [0.86, 0.06, 0.10],
          color2: isGold ? [1.0, 0.96, 0.55] : [1.0, 0.36, 0.16],
          matType: 3, viewerMask: vMask, castShadow: settings.players === 1,
        });
        if (detailed) renderer.submit({
          mesh: 'cylinder',
          model: Mat4.fromTRS(Mat4.create(), [a.pos[0], a.pos[1] + appleR * 0.92, a.pos[2]], rot, 0.16, 0, [0.11, 0.50, 0.11]),
          color: [0.38, 0.22, 0.10], viewerMask: vMask, castShadow: false,
        });
        if (detailed) renderer.submit({
          mesh: 'lowSphere',
          model: Mat4.fromTRS(Mat4.create(), [a.pos[0] + Math.cos(rot) * 0.36, a.pos[1] + appleR * 1.06, a.pos[2] - Math.sin(rot) * 0.36], rot, 0.3, 0.4, [0.42, 0.10, 0.22]),
          color: [0.16, 0.72, 0.24], emissive: [0.04, 0.18, 0.06], viewerMask: vMask, castShadow: false,
        });

        if (isEdu) {
          // Crisp Number Badge cleanly in front of apple (ZERO clipping!)
          renderer.submit({
            mesh: 'billboardQuad',
            model: Mat4.fromTRS(Mat4.create(), [a.pos[0], a.pos[1] + 0.08, a.pos[2]], 0, 0, 0, [1, 1, 1]),
            matType: 7, billboard: true, color: [1.0, 1.0, 1.0],
            extra: [a.atlasIdx, appleR * 1.44, 1.64, 1.64],
            viewerMask: vMask, castShadow: false,
          });
        } else if (isGold) {
          renderer.submit({
            mesh: 'ring', model: Mat4.fromTRS(Mat4.create(), a.pos, rot * 1.4, 0.75, time * 1.4, [1.6, 1.6, 1.6]),
            color: [1.0, 0.88, 0.32], emissive: [0.9, 0.65, 0.12], alpha: 0.85, matType: 5, extra: [2, a.phase, 0, 0],
            additive: true, doubleSided: true, viewerMask: vMask, castShadow: false,
          });
        }

        if (detailed) renderer.submit({
          mesh: 'ring', model: Mat4.fromBasis(Mat4.create(), [a.pos[0], gAt, a.pos[2]], [0, 0, 1], gNorm, [isGold ? 1.9 : 1.5, 1, isGold ? 1.9 : 1.5]),
          color: isGold ? [1.0, 0.86, 0.24] : [1.0, 0.82, 0.28],
          emissive: isGold ? [1.0, 0.72, 0.15] : [0.85, 0.40, 0.14],
          alpha: 0.60, matType: 5, extra: [2, a.phase, 0, 0],
          additive: true, doubleSided: true, viewerMask: vMask, castShadow: false,
        });
      }
    }

    // 10. Snakes
    for (const p of players) renderSnake(p);

    // 11. Shockwaves & Particles
    for (const sw of shockwaves) {
      renderer.submit({
        mesh: 'ring', model: Mat4.fromTRS(Mat4.create(), sw.pos, 0, 0, 0, [sw.radius, 1, sw.radius]),
        color: sw.color, emissive: sw.color, alpha: (sw.life / sw.maxLife) * 0.82,
        matType: 5, additive: true, doubleSided: true, castShadow: false,
      });
    }
    for (const pt of particles) {
      const t = pt.life / pt.maxLife, s = pt.size * (0.35 + 0.65 * t);
      renderer.submit({
        mesh: 'lowSphere', model: Mat4.fromTRS(Mat4.create(), pt.pos, 0, 0, 0, [s, s, s]),
        color: pt.color, emissive: pt.color, alpha: t, matType: 5, additive: true, castShadow: false,
      });
    }

    // Shadow Map Pass
    if (detailed) renderer.renderShadowPass(players[0].head, 52);

    const sceneInfo = { time, detailed, fogColor: [0.64, 0.84, 0.96], fogDensity: 0.0052 };

    if (settings.players === 1) {
      players[0].lastVP = renderer.renderViewport(players[0].cam, { x: 0, y: 0, w: width, h: height }, sceneInfo, 1);
    } else {
      const halfW = Math.floor(width * 0.5);
      players[0].lastVP = renderer.renderViewport(players[0].cam, { x: 0, y: 0, w: halfW, h: height }, sceneInfo, 1);
      players[1].lastVP = renderer.renderViewport(players[1].cam, { x: halfW, y: 0, w: width - halfW, h: height }, sceneInfo, 2);
    }
  }

  function renderSnake(p) {
    const skin = p.skin;
    const boostIntensity = p.boostPadTimer > 0 ? 1.2 : (p.boosting ? 0.85 : 0.0);
    const segs = p.segments;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      let digest = 0;
      for (let d = 0; d < p.digestPulses.length; d++) {
        const dp = Math.abs(seg.tNorm - p.digestPulses[d].t);
        if (dp < 0.16) digest = Math.max(digest, 1 - dp / 0.16);
      }

      const r = seg.radius * (1 + digest * 0.15);
      const isTail = i === segs.length - 1;
      const isSwollenBelly = settings.gameType === 'edu' && i === 2 && p.lastEatenAtlasIdx >= 0;

      renderer.submit({
        mesh: quality === 'full' ? 'sphere' : 'lowSphere',
        model: Mat4.fromBasis(
          Mat4.create(), seg.pos, seg.fwd, [0, 1, 0],
          isTail ? [r * 0.9, r * 0.85, r * 2.1]
            : isSwollenBelly ? [r * 1.15, r * 1.05, r * 1.38]
            : [r * 1.04, r * 0.92, r * 1.32]
        ),
        color: skin.primary, color2: skin.secondary, matType: 2,
        extra: [seg.tNorm, Math.max(digest, isSwollenBelly ? p.eatFlash * 0.8 : 0), boostIntensity, 0],
      });

      if (isSwollenBelly) {
        const segBasis = Mat4.fromBasis(Mat4.create(), seg.pos, seg.fwd, [0, 1, 0], [1, 1, 1]);
        const upVec = [segBasis[4], segBasis[5], segBasis[6]];
        const tiltedFwd = Vec3.normalize([0, 0, 0], [
          seg.fwd[0] + upVec[0] * 0.24,
          seg.fwd[1] + upVec[1] * 0.24,
          seg.fwd[2] + upVec[2] * 0.24,
        ]);
        const badgePos = [
          seg.pos[0] + upVec[0] * (r * 1.44),
          seg.pos[1] + upVec[1] * (r * 1.44),
          seg.pos[2] + upVec[2] * (r * 1.44),
        ];
        const badgeScale = 1.46 + p.eatFlash * 0.20;
        renderer.submit({
          mesh: 'backBadge',
          model: Mat4.fromBasis(Mat4.create(), badgePos, tiltedFwd, upVec, [badgeScale, 1.0, badgeScale]),
          matType: 7, billboard: false, color: [1.0, 1.0, 1.0],
          emissive: p.eatFlash > 0.05 ? [p.eatFlash * 0.3, p.eatFlash * 0.25, 0] : [0, 0, 0],
          extra: [p.lastEatenAtlasIdx, 0, 0, 0], doubleSided: true, castShadow: false,
        });
      }
    }

    const cp = Math.cos(p.pitch);
    const headFwd = [Math.sin(p.yaw) * cp, Math.sin(p.pitch), Math.cos(p.yaw) * cp];
    const headRoll = clamp(-p.turnVel * 0.11, -0.30, 0.30);
    const chomp = 1 + Math.sin((p.chompTimer / 0.30) * Math.PI) * 0.18;

    renderer.submit({
      mesh: 'snakeHead',
      model: Mat4.fromBasis(Mat4.create(), p.head, headFwd, [0, 1, 0], [0.86 * chomp, 0.78 * chomp, 0.92 * chomp], headRoll),
      color: skin.primary, color2: skin.secondary, matType: 2,
      extra: [0, p.chompTimer > 0 ? 0.7 : 0, boostIntensity, 0],
    });

    const headBasis = Mat4.fromBasis(Mat4.create(), p.head, headFwd, [0, 1, 0], [1, 1, 1], headRoll);
    const toWorld = (lx, ly, lz) => [
      headBasis[0] * lx + headBasis[4] * ly + headBasis[8]  * lz + headBasis[12],
      headBasis[1] * lx + headBasis[5] * ly + headBasis[9]  * lz + headBasis[13],
      headBasis[2] * lx + headBasis[6] * ly + headBasis[10] * lz + headBasis[14],
    ];

    for (const side of [-1, 1]) {
      renderer.submit({
        mesh: 'lowSphere',
        model: Mat4.fromBasis(Mat4.create(), toWorld(side * 0.44, 0.30, 0.36), headFwd, [0, 1, 0], [0.22, 0.20, 0.22], headRoll),
        color: skin.eye, emissive: [skin.eye[0] * 0.55, skin.eye[1] * 0.55, skin.eye[2] * 0.55], shininess: 96, castShadow: false,
      });
      renderer.submit({
        mesh: 'lowSphere',
        model: Mat4.fromBasis(Mat4.create(), toWorld(side * 0.50, 0.31, 0.49), headFwd, [0, 1, 0], [0.06, 0.14, 0.10], headRoll),
        color: [0.04, 0.04, 0.06], shininess: 120, castShadow: false,
      });
      const hornFwd = Vec3.normalize([0, 0, 0], [
        -headFwd[0] + headBasis[4] * 0.42 + headBasis[0] * side * 0.32,
        -headFwd[1] + headBasis[5] * 0.42 + headBasis[1] * side * 0.32,
        -headFwd[2] + headBasis[6] * 0.42 + headBasis[2] * side * 0.32,
      ]);
      renderer.submit({
        mesh: 'zCone',
        model: Mat4.fromBasis(Mat4.create(), toWorld(side * 0.34, 0.38, -0.20), hornFwd, [0, 1, 0], [0.15, 0.15, 0.68]),
        color: skin.secondary, emissive: [skin.secondary[0] * 0.22, skin.secondary[1] * 0.22, skin.secondary[2] * 0.22], castShadow: false,
      });
    }

    const flick = Math.sin(p.tonguePhase);
    if (flick > 0.25) {
      const ext = smoothstep(0.25, 0.95, flick);
      renderer.submit({
        mesh: 'tongue',
        model: Mat4.fromBasis(Mat4.create(), toWorld(0, -0.08, 1.12), headFwd, [0, 1, 0], [0.85, 1.0, 0.95 * ext], headRoll + Math.sin(time * 28) * 0.22),
        color: [1.0, 0.16, 0.28], emissive: [0.45, 0.08, 0.12], doubleSided: true, castShadow: false,
      });
    }

    if (p.magnetTimer > 0) {
      renderer.submit({
        mesh: 'ring',
        model: Mat4.fromTRS(Mat4.create(), p.head, time * 3.4, 0.35, 0, [2.15, 2.15, 2.15]),
        color: [0.22, 0.88, 1.0], emissive: [0.25, 0.92, 1.0], alpha: 0.75,
        matType: 5, additive: true, doubleSided: true, castShadow: false,
      });
    }
  }

  // ==================== 2D OVERLAY & ROTATING TPS RADAR ====================

  function drawOverlay2D(w, h, dpr) {
    if (overlayCanvas.width !== w || overlayCanvas.height !== h) {
      overlayCanvas.width = w; overlayCanvas.height = h;
    }
    const ctx = overlayCtx;
    if (!renderer) {
      drawTopDown(ctx, w, h, dpr);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    if (state !== 'playing') return;

    const rects = settings.players === 1
      ? [{ x: 0, y: 0, w, h, p: players[0] }]
      : [{ x: 0, y: 0, w: w * 0.5, h, p: players[0] }, { x: w * 0.5, y: 0, w: w * 0.5, h, p: players[1] }];

    for (const r of rects) {
      const p = r.p;
      const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5;
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();

      if (quality === 'full' && (p.boosting || p.boostPadTimer > 0)) {
        ctx.strokeStyle = p.boostPadTimer > 0 ? 'rgba(140, 245, 255, 0.45)' : 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.6 * dpr;
        const outerR = Math.hypot(r.w * 0.5, r.h * 0.5);
        for (let i = 0; i < 20; i++) {
          const ang = (i / 20) * Math.PI * 2 + Math.sin(time * 9 + i * 3.1) * 0.04;
          const innerR = outerR * (0.70 + 0.12 * ((i * 7 + Math.floor(time * 24)) % 5) / 5);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
          ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR);
          ctx.stroke();
        }
      }

      if (quality === 'full' && p.wallDanger > 0.02) {
        const grad = ctx.createRadialGradient(cx, cy, Math.min(r.w, r.h) * 0.34, cx, cy, Math.hypot(r.w * 0.5, r.h * 0.5));
        grad.addColorStop(0, 'rgba(255, 50, 65, 0)');
        grad.addColorStop(1, `rgba(255, 50, 65, ${(p.wallDanger * 0.38).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      // Easy Edu Mode off-screen golden compass arrow for next expected number
      if (renderer && settings.gameType === 'edu' && settings.diff === 'easy' && settings.showHint && p.nextIdx < sequence.length) {
        const nextApple = apples[p.nextIdx];
        if (nextApple && !nextApple.collected[p.id]) {
          const ndc = Mat4.projectToNDC(p.lastVP, nextApple.pos);
          let sx = r.x + (ndc.x * 0.5 + 0.5) * r.w;
          let sy = r.y + (1 - (ndc.y * 0.5 + 0.5)) * r.h;
          const pad = 44 * dpr;
          const onScreen = ndc.visible && sx > r.x + pad && sx < r.x + r.w - pad && sy > r.y + pad && sy < r.y + r.h - pad;
          if (!onScreen) {
            if (!ndc.visible) { sx = r.x + r.w - (sx - r.x); sy = r.y + r.h - (sy - r.y); }
            const ang = Math.atan2(sy - cy, sx - cx);
            const ca = Math.cos(ang), sa = Math.sin(ang);
            const tE = Math.min(
              Math.abs(ca) > 1e-4 ? (r.w * 0.5 - pad) / Math.abs(ca) : 1e9,
              Math.abs(sa) > 1e-4 ? (r.h * 0.5 - pad) / Math.abs(sa) : 1e9
            );
            const px = cx + ca * tE, py = cy + sa * tE;
            ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
            ctx.fillStyle = '#ffd147'; ctx.strokeStyle = '#7c3200'; ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath(); ctx.moveTo(12 * dpr, 0); ctx.lineTo(-7 * dpr, -8 * dpr); ctx.lineTo(-3 * dpr, 0); ctx.lineTo(-7 * dpr, 8 * dpr); ctx.closePath();
            ctx.fill(); ctx.stroke(); ctx.restore();
            ctx.font = `900 ${12 * dpr}px -apple-system, sans-serif`;
            ctx.fillStyle = '#fff9d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(nextApple.num), px - ca * 22 * dpr, py - sa * 22 * dpr);
          }
        }
      }
      ctx.restore();
    }
  }

  function drawTopDown(ctx, width, height, dpr) {
    const share = width / players.length;
    const radius = Terrain.PLAY_RADIUS;
    for (const p of players) {
      const left = p.id * share;
      const scale = Math.min(share / 64, height / 64);
      const xAt = x => left + share / 2 + (x - p.head[0]) * scale;
      const yAt = z => height / 2 + (z - p.head[2]) * scale;
      const circle = (x, z, size, color) => {
        const cx = xAt(x), cy = yAt(z);
        const r = Math.max(2 * dpr, size * scale);
        if (cx + r < left || cx - r > left + share || cy + r < 0 || cy - r > height) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(left, 0, share, height);
      ctx.clip();
      ctx.fillStyle = '#213a30';
      ctx.fillRect(left, 0, share, height);
      circle(0, 0, radius, '#385f3c');
      ctx.strokeStyle = '#d4ab70';
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();
      for (const tree of trees) circle(tree.x, tree.z, tree.scale * 1.7, '#18452b');
      for (const rock of rocks) circle(rock.x, rock.z, rock.scale, '#909d89');
      for (const pad of boostPads) circle(pad.x, pad.z, 2.1, '#86e2f3');
      for (const rock of patrollers) circle(rock.pos[0], rock.pos[2], rock.r, '#cb804d');
      for (const hurdle of hurdles) {
        ctx.save();
        ctx.translate(xAt(hurdle.x), yAt(hurdle.z));
        ctx.rotate(-hurdle.rotY);
        ctx.fillStyle = '#f6c768';
        ctx.fillRect(-hurdle.w * scale / 2, -scale / 2, hurdle.w * scale, scale);
        ctx.restore();
      }
      for (const snake of players) {
        const [x, y, z] = snake.head;
        ctx.strokeStyle = snake.skin.radar;
        ctx.lineWidth = Math.max(4 * dpr, 1.5 * scale);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xAt(x), yAt(z));
        for (const seg of snake.segments) ctx.lineTo(xAt(seg.pos[0]), yAt(seg.pos[2]));
        ctx.stroke();
        if (snake.boosting || snake.boostPadTimer > 0) circle(x, z, 1.9, '#8de5ff');
        circle(x, z, 1.1 + Math.max(0, y - Terrain.height(x, z)) * 0.12, snake.skin.radar);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(xAt(x), yAt(z));
        ctx.lineTo(xAt(x + Math.sin(snake.yaw) * 2.5), yAt(z + Math.cos(snake.yaw) * 2.5));
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.max(12 * dpr, 2.15 * scale) + 'px system-ui';
      for (const item of apples) {
        if (item.collected?.[p.id]) continue;
        const [x, , z] = item.pos;
        const sx = xAt(x), sy = yAt(z);
        if (sx < left - 3 * scale || sx > left + share + 3 * scale || sy < -3 * scale || sy > height + 3 * scale) continue;
        const next = settings.showHint && settings.diff === 'easy' && item.num === sequence[p.nextIdx];
        if (next) circle(x, z, 2.4, '#ffd147');
        circle(x, z, 1.65, item.kind === 'golden' ? '#ffc540' : item.kind === 'magnet' ? '#58cefa' : '#bd324b');
        if (item.kind === 'edu') {
          ctx.fillStyle = '#fff';
          ctx.fillText(item.num, sx, sy);
        }
      }
      if (settings.gameType === 'edu' && settings.diff === 'easy' && settings.showHint && apples[p.nextIdx]) {
        const [x, , z] = apples[p.nextIdx].pos;
        const sx = xAt(x), sy = yAt(z);
        if (sx < left || sx > left + share || sy < 0 || sy > height) {
          ctx.save();
          ctx.translate(clamp(sx, left + 22 * dpr, left + share - 22 * dpr), clamp(sy, 65 * dpr, height - 55 * dpr));
          ctx.rotate(Math.atan2(z - p.head[2], x - p.head[0]));
          ctx.fillStyle = '#ffd147';
          ctx.font = 'bold ' + 22 * dpr + 'px system-ui';
          ctx.fillText('➜', 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  function drawRadarForPlayer(canvas, p) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height, cx = W * 0.5, cy = H * 0.5, R = W * 0.45;
    const playR = Terrain.PLAY_RADIUS;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    ctx.strokeStyle = 'rgba(110, 240, 178, 0.16)'; ctx.lineWidth = 1;
    for (const f of [0.35, 0.7]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke(); }

    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 0.85);
    grad.addColorStop(0, 'rgba(110, 250, 190, 0.24)'); grad.addColorStop(1, 'rgba(110, 250, 190, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.85, -Math.PI * 0.5 - 0.52, -Math.PI * 0.5 + 0.52); ctx.closePath(); ctx.fill();

    const scale = R / (playR * 1.15);
    const sy = Math.sin(p.yaw), cyaw = Math.cos(p.yaw);
    const toRadar = (wx, wz) => {
      const dx = wx - p.head[0], dz = wz - p.head[2];
      return [cx + (-dx * cyaw + dz * sy) * scale, cy - (dx * sy + dz * cyaw) * scale];
    };

    const [vcx, vcy] = toRadar(0, 0);
    ctx.strokeStyle = 'rgba(255, 214, 110, 0.58)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(vcx, vcy, playR * scale, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(120, 185, 130, 0.45)';
    for (const t of trees) {
      if (t.scenic) continue;
      const [tx, ty] = toRadar(t.x, t.z);
      ctx.beginPath(); ctx.arc(tx, ty, 2.0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 115, 70, 0.85)';
    for (const pt of patrollers) {
      const [px, py] = toRadar(pt.pos[0], pt.pos[2]);
      ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.fill();
    }

    for (const op of players) {
      if (op.id === p.id) continue;
      const [ox, oy] = toRadar(op.head[0], op.head[2]);
      ctx.fillStyle = op.skin.radar;
      ctx.beginPath(); ctx.arc(ox, oy, 4.0, 0, Math.PI * 2); ctx.fill();
    }

    if (p.segments.length > 0) {
      ctx.strokeStyle = p.skin.radar; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let i = 0; i < p.segments.length; i++) {
        const [sx, sy2] = toRadar(p.segments[i].pos[0], p.segments[i].pos[2]);
        ctx.lineTo(sx, sy2);
      }
      ctx.stroke();
    }

    const highlightNext = settings.gameType === 'edu' && settings.diff === 'easy' && settings.showHint;
    for (let i = 0; i < apples.length; i++) {
      const a = apples[i];
      if (settings.gameType === 'edu' && a.collected[p.id]) continue;
      const [ax, ay] = toRadar(a.pos[0], a.pos[2]);
      if (highlightNext && i === p.nextIdx) {
        ctx.strokeStyle = '#ffd147'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(ax, ay, 5.5 + Math.sin(time * 7) * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd147'; ctx.beginPath(); ctx.arc(ax, ay, 3.6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = a.kind === 'golden' ? '#ffd147' : a.kind === 'magnet' ? '#38bdf8' : '#ff495c';
        ctx.beginPath(); ctx.arc(ax, ay, a.kind === 'golden' ? 3.8 : 2.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 4.2, cy + 4); ctx.lineTo(cx, cy + 1.8); ctx.lineTo(cx - 4.2, cy + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ==================== HUD SYNC ====================

  function syncHud() {
    if (state !== 'playing') return;
    const tStr = formatTime(elapsed);

    if (settings.players === 1) {
      const p = players[0];
      if (settings.gameType === 'edu') {
        singleTimer.textContent = tStr;
        p1LastNum.textContent = p.lastEatenNum !== null ? String(p.lastEatenNum) : '—';
        const nextVal = p.nextIdx < sequence.length ? sequence[p.nextIdx] : '✓';
        p1NextNum.textContent = settings.showHint ? String(nextVal) : '?';
        p1Progress.textContent = `${p.nextIdx} / ${sequence.length}`;
        p1EduScore.textContent = String(p.score);
        p1ProgressBar.style.width = `${(p.nextIdx / Math.max(1, sequence.length) * 100).toFixed(1)}%`;
      } else {
        funScoreEl.textContent = String(p.score);
        funLengthEl.textContent = String(p.targetLength);
        funBestEl.textContent = String(Math.max(p.score, funRecord));
        if (p.combo > 1 && p.comboTimer > 0) {
          funComboBadge.classList.remove('hidden');
          funComboText.textContent = `KOMBO x${p.combo}`;
          funComboBar.style.width = `${clamp((p.comboTimer / COMBO_WINDOW) * 100, 0, 100).toFixed(1)}%`;
        } else {
          funComboBadge.classList.add('hidden');
        }
        if (p.magnetTimer > 0) {
          funMagnetBadge.classList.remove('hidden');
          funMagnetTime.textContent = `${p.magnetTimer.toFixed(1)}s`;
        } else {
          funMagnetBadge.classList.add('hidden');
        }
      }

      p1Speed.textContent = `${p.speed.toFixed(1)} m/s`;
      p1TurboBar.style.width = `${p.turbo.toFixed(1)}%`;
      p1TurboBar.classList.toggle('low', p.turbo < 22);

      p1JumpIndicator.classList.remove('ready', 'cooldown', 'airborne');
      if (!p.grounded) { p1JumpIndicator.classList.add('airborne'); p1JumpStatus.textContent = 'HAVADA'; }
      else if (p.jumpCooldown > 0) { p1JumpIndicator.classList.add('cooldown'); p1JumpStatus.textContent = 'DOLUYOR'; }
      else { p1JumpIndicator.classList.add('ready'); p1JumpStatus.textContent = 'HAZIR'; }
    } else {
      splitTimer.textContent = tStr;
      const p0 = players[0], p1 = players[1];
      if (settings.gameType === 'edu') {
        sp1Prog.textContent = `${p0.nextIdx} / ${sequence.length}`;
        sp1Last.textContent = p0.lastEatenNum !== null ? String(p0.lastEatenNum) : '—';
        sp1Next.textContent = settings.showHint ? String(sequence[p0.nextIdx] ?? '✓') : '?';
        sp1Bar.style.width = `${(p0.nextIdx / Math.max(1, sequence.length) * 100).toFixed(1)}%`;

        sp2Prog.textContent = `${p1.nextIdx} / ${sequence.length}`;
        sp2Last.textContent = p1.lastEatenNum !== null ? String(p1.lastEatenNum) : '—';
        sp2Next.textContent = settings.showHint ? String(sequence[p1.nextIdx] ?? '✓') : '?';
        sp2Bar.style.width = `${(p1.nextIdx / Math.max(1, sequence.length) * 100).toFixed(1)}%`;
      } else {
        const maxScore = Math.max(100, p0.score, p1.score);
        sp1Prog.textContent = `${p0.applesEaten} 🍎`;
        sp1Last.textContent = String(p0.score);
        sp1Next.textContent = String(p0.targetLength);
        sp1Bar.style.width = `${(p0.score / maxScore * 100).toFixed(1)}%`;

        sp2Prog.textContent = `${p1.applesEaten} 🍎`;
        sp2Last.textContent = String(p1.score);
        sp2Next.textContent = String(p1.targetLength);
        sp2Bar.style.width = `${(p1.score / maxScore * 100).toFixed(1)}%`;
      }
      sp1Turbo.style.width = `${p0.turbo.toFixed(1)}%`;
      sp2Turbo.style.width = `${p1.turbo.toFixed(1)}%`;
    }
  }

  // ==================== MAIN LOOP ====================

  let lastFrame = performance.now();
  let paintedState;
  let nextPaint = 0;
  let nextHud = 0;
  let nextRadar = 0;

  document.addEventListener('visibilitychange', () => {
    lastFrame = performance.now();
    slowFrameTime = 0;
    if (document.hidden) {
      resetInputs();
      SoundFX.updateBoost(false);
    } else needsPaint = true;
  });

  function tick(now) {
    requestAnimationFrame(tick);
    const frameMs = Math.max(0, now - lastFrame);
    lastFrame = now;
    if (document.hidden || state === 'menu') return;

    const dt = Math.min(0.10, frameMs / 1000);
    if (state === 'playing') {
      if (renderer && settings.graphics !== 'top-down') {
        const threshold = quality === 'full' ? 26 : 43;
        const sample = Math.min(frameMs, 125);
        slowFrameTime = frameMs > threshold ? slowFrameTime + sample : Math.max(0, slowFrameTime - sample);
        if (slowFrameTime >= (quality === 'full' ? 700 : 1000)) {
          autoQuality = quality === 'full' ? 'light-3d' : 'top-down';
          applyQuality(autoQuality);
        }
      }
      // Small simulation steps keep collisions and steering consistent at lower frame rates.
      const steps = Math.max(1, Math.ceil(dt * 35));
      const step = dt / steps;
      for (let i = 0; i < steps && state === 'playing'; i++) {
        time += step;
        updatePlaying(step);
      }
      if (renderer) updateParticles(dt);
    } else if (state === 'ended' && renderer) {
      time += dt;
      updateEndCamera(dt);
      updateParticles(dt * (endWasVictory ? 0.85 : 0.45));
    }

    const animated = state === 'playing' || (state === 'ended' && renderer);
    if (needsPaint || paintedState !== state || (animated && now >= nextPaint - 1)) {
      const frameInterval = state === 'ended' ? 50 : quality === 'full' ? 1000 / 60 : 1000 / 30;
      nextPaint = needsPaint || paintedState !== state || now > nextPaint + frameInterval
        ? now + frameInterval : nextPaint + frameInterval;
      paintedState = state;
      needsPaint = false;
      const cssWidth = Math.max(1, overlayCanvas.clientWidth);
      const cssHeight = Math.max(1, overlayCanvas.clientHeight);
      const maxPixels = quality === 'full' ? 1650000 : 650000;
      const dpr = Math.min(window.devicePixelRatio || 1, quality === 'full' ? 1.25 : 1,
        Math.sqrt(maxPixels / (cssWidth * cssHeight)));
      const width = Math.max(1, Math.floor(cssWidth * dpr));
      const height = Math.max(1, Math.floor(cssHeight * dpr));
      renderScene(width, height);
      drawOverlay2D(width, height, dpr);
    }

    if (state === 'playing' && now >= nextHud) {
      syncHud();
      nextHud = now + 100;
    }
    if (state === 'playing' && renderer && now >= nextRadar) {
      nextRadar = now + 100;
      if (settings.players === 1) drawRadarForPlayer(radarSingle, players[0]);
      else {
        drawRadarForPlayer(radarP1, players[0]);
        drawRadarForPlayer(radarP2, players[1]);
      }
    }

  }

  // Boot!
  inputNameP1.value = settings.nameP1 || '';
  inputNameP2.value = settings.nameP2 || '';
  applyAudioSettings();
  refreshTitleUI();
  syncSettingsUI();
  requestAnimationFrame(tick);
})();
