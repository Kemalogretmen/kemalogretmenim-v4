// audio.js — Studio Web Audio Engine: Light Fantasy Multi-Track Music + Crisp UI & Gameplay SFX + Turkish Voice

const SoundFX = (() => {
  let ctx = null;
  let sfxBus = null;
  let musicBus = null;
  let delayNode = null;
  let delayFeedback = null;

  let sfxEnabled = true;
  let musicEnabled = true;
  let speechEnabled = true;
  let sfxVolume = 0.85;
  let musicVolume = 0.52;

  let boostGain = null;
  let boostOsc = null;
  let boostFilter = null;
  let boostPlaying = null;
  let lastSliderTick = 0;

  // Musical pentatonic scale for gameplay eat feedback
  const EAT_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  // ==================== LIGHT FANTASY MUSIC COMPOSITION (G Major / Pastoral Adventure) ====================
  // Frequencies in Hz
  const N = {
    G2: 98.00,  A2: 110.00, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, Fs3: 185.00,
    G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99,
    G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99,
    G5: 783.99, A5: 880.00, B5: 987.77,
  };

  // 8-bar harmonic progression (each bar = 8 eighth-note steps -> 64 steps per cycle, 128 steps = 16 bars A+B!)
  const CHORDS = [
    // Section A (Pastoral Sunny Meadow)
    { bass: N.G2, pad: [N.G3, N.B3, N.D4],   harp: [N.G3, N.B3, N.D4, N.A4, N.G4, N.D4, N.B3, N.D4] },
    { bass: N.E3, pad: [N.E3, N.G3, N.B3],   harp: [N.E3, N.G3, N.B3, N.Fs4, N.E4, N.B3, N.G3, N.B3] },
    { bass: N.C3, pad: [N.C4, N.E4, N.G4],   harp: [N.C3, N.G3, N.C4, N.D4, N.E4, N.G4, N.E4, N.C4] },
    { bass: N.D3, pad: [N.D4, N.Fs4, N.A4],  harp: [N.D3, N.A3, N.D4, N.Fs4, N.A4, N.Fs4, N.D4, N.A3] },
    // Section B (Whimsical Hill Adventure)
    { bass: N.B2, pad: [N.B3, N.D4, N.Fs4],  harp: [N.B2, N.Fs3, N.B3, N.D4, N.Fs4, N.D4, N.B3, N.Fs3] },
    { bass: N.E3, pad: [N.E3, N.G3, N.B3],   harp: [N.E3, N.B3, N.E4, N.G4, N.B4, N.G4, N.E4, N.B3] },
    { bass: N.A2, pad: [N.A3, N.C4, N.E4],   harp: [N.A2, N.E3, N.A3, N.B3, N.C4, N.E4, N.C4, N.A3] },
    { bass: N.D3, pad: [N.D4, N.G4, N.A4],   harp: [N.D3, N.A3, N.D4, N.G4, N.Fs4, N.D4, N.A3, N.D4] },
  ];

  // Expressive Fantasy Flute melody across 128 eighth-note steps (16 bars: A1, B1, A2, B2)
  // Format: { step, freq, dur (in steps) }
  const FLUTE_MELODY = [
    // Bars 0-3 (Gentle singing opening)
    { s: 0,  f: N.B4, d: 3 }, { s: 3,  f: N.D5, d: 1 }, { s: 4,  f: N.G5, d: 3 }, { s: 7,  f: N.Fs5, d: 1 },
    { s: 8,  f: N.E5, d: 4 }, { s: 12, f: N.D5, d: 2 }, { s: 14, f: N.B4, d: 2 },
    { s: 16, f: N.C5, d: 3 }, { s: 19, f: N.D5, d: 1 }, { s: 20, f: N.E5, d: 2 }, { s: 22, f: N.G5, d: 2 },
    { s: 24, f: N.Fs5, d: 4 }, { s: 28, f: N.D5, d: 3 },
    // Bars 4-7 (Playful lift)
    { s: 32, f: N.D5, d: 2 }, { s: 34, f: N.Fs5, d: 2 }, { s: 36, f: N.A5, d: 2 }, { s: 38, f: N.Fs5, d: 2 },
    { s: 40, f: N.G5, d: 3 }, { s: 43, f: N.E5, d: 1 }, { s: 44, f: N.B4, d: 3 },
    { s: 48, f: N.C5, d: 2 }, { s: 50, f: N.E5, d: 2 }, { s: 52, f: N.G5, d: 2 }, { s: 54, f: N.E5, d: 2 },
    { s: 56, f: N.D5, d: 6 },
    // Bars 8-11 (Variation — airy & magical)
    { s: 64, f: N.G5, d: 3 }, { s: 67, f: N.Fs5, d: 1 }, { s: 68, f: N.D5, d: 2 }, { s: 70, f: N.B4, d: 2 },
    { s: 72, f: N.E5, d: 3 }, { s: 75, f: N.G5, d: 1 }, { s: 76, f: N.Fs5, d: 2 }, { s: 78, f: N.E5, d: 2 },
    { s: 80, f: N.E5, d: 2 }, { s: 82, f: N.C5, d: 2 }, { s: 84, f: N.G4, d: 2 }, { s: 86, f: N.C5, d: 2 },
    { s: 88, f: N.D5, d: 5 }, { s: 94, f: N.A4, d: 2 },
    // Bars 12-15 (Warm resolution)
    { s: 96,  f: N.B4, d: 2 }, { s: 98,  f: N.D5, d: 2 }, { s: 100, f: N.Fs5, d: 3 }, { s: 103, f: N.D5, d: 1 },
    { s: 104, f: N.G5, d: 2 }, { s: 106, f: N.A5, d: 2 }, { s: 108, f: N.B5, d: 2 }, { s: 110, f: N.G5, d: 2 },
    { s: 112, f: N.E5, d: 3 }, { s: 115, f: N.C5, d: 1 }, { s: 116, f: N.D5, d: 2 }, { s: 118, f: N.E5, d: 2 },
    { s: 120, f: N.D5, d: 3 }, { s: 123, f: N.Fs5, d: 1 }, { s: 124, f: N.G5, d: 4 },
  ];

  const melodyByStep = new Map();
  FLUTE_MELODY.forEach((m) => melodyByStep.set(m.s, m));

  let musicTimer = null;
  let nextStepTime = 0;
  let currentStep = 0;
  let musicIntensity = 'menu'; // 'menu' | 'edu' | 'fun'
  const STEP_DUR = 60 / 104 / 2; // 104 BPM eighth note (~0.288s)

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      sfxBus = ctx.createGain();
      sfxBus.gain.value = sfxEnabled ? sfxVolume : 0.0001;
      sfxBus.connect(ctx.destination);

      musicBus = ctx.createGain();
      musicBus.gain.value = musicEnabled ? musicVolume : 0.0001;

      // Airy magical echo/reverb bus for fantasy harp & flute
      delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = STEP_DUR * 1.5;
      delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.26;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2200;

      musicBus.connect(ctx.destination);
      musicBus.connect(delayNode);
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayFilter.connect(ctx.destination);

      setupBoostLoop();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    startMusicLoopIfNeeded();
    return ctx;
  }

  function setupBoostLoop() {
    if (!ctx || !sfxBus) return;
    try {
      boostOsc = ctx.createOscillator();
      boostOsc.type = 'triangle';
      boostOsc.frequency.value = 72;

      boostFilter = ctx.createBiquadFilter();
      boostFilter.type = 'lowpass';
      boostFilter.frequency.value = 180;
      boostFilter.Q.value = 2.2;

      boostGain = ctx.createGain();
      boostGain.gain.value = 0.0001;

      boostOsc.connect(boostFilter);
      boostFilter.connect(boostGain);
      boostGain.connect(sfxBus);
      boostOsc.start();
    } catch (_) {
      boostGain = null;
    }
  }

  function startMusicLoopIfNeeded() {
    if (!ctx || musicTimer !== null) return;
    nextStepTime = ctx.currentTime + 0.08;
    musicTimer = setInterval(scheduleMusic, 100);
  }

  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running' || !musicEnabled) {
      if (ctx) nextStepTime = ctx.currentTime + 0.1;
      return;
    }
    const lookahead = 0.24;
    while (nextStepTime < ctx.currentTime + lookahead) {
      playMusicStep(currentStep, nextStepTime);
      nextStepTime += STEP_DUR;
      currentStep = (currentStep + 1) % 128;
    }
  }

  function playMusicStep(step, t) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const beatInBar = step % 8;
    const ch = CHORDS[bar];

    // 1. Celtic Fantasy Harp Arpeggio
    const harpFreq = ch.harp[beatInBar];
    if (harpFreq) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(harpFreq, t);
      const peak = beatInBar === 0 ? 0.095 : 0.068;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + STEP_DUR * 2.4);
      osc.connect(g);
      g.connect(musicBus);
      osc.start(t);
      osc.stop(t + STEP_DUR * 2.5);
    }

    // 2. Warm Sustained Fantasy String Pad (on beat 0 of every bar)
    if (beatInBar === 0) {
      const barDur = STEP_DUR * 8.1;
      // Bass warmth
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(ch.bass, t);
      bGain.gain.setValueAtTime(0.0001, t);
      bGain.gain.linearRampToValueAtTime(0.085, t + 0.25);
      bGain.gain.exponentialRampToValueAtTime(0.0001, t + barDur);
      bOsc.connect(bGain);
      bGain.connect(musicBus);
      bOsc.start(t);
      bOsc.stop(t + barDur + 0.05);

      // Soft airy triad pad
      for (const pf of ch.pad) {
        const pOsc = ctx.createOscillator();
        const pFlt = ctx.createBiquadFilter();
        const pGain = ctx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(pf, t);
        pFlt.type = 'lowpass';
        pFlt.frequency.value = 1100;
        pGain.gain.setValueAtTime(0.0001, t);
        pGain.gain.linearRampToValueAtTime(0.028, t + 0.45);
        pGain.gain.setValueAtTime(0.025, t + barDur - 0.5);
        pGain.gain.exponentialRampToValueAtTime(0.0001, t + barDur);
        pOsc.connect(pFlt);
        pFlt.connect(pGain);
        pGain.connect(musicBus);
        pOsc.start(t);
        pOsc.stop(t + barDur + 0.05);
      }
    }

    // 3. Light Wooden Marimba Pulse during gameplay (subtle joyful bounce!)
    if (musicIntensity !== 'menu' && (beatInBar === 2 || beatInBar === 6)) {
      const mOsc = ctx.createOscillator();
      const mGain = ctx.createGain();
      mOsc.type = 'sine';
      mOsc.frequency.setValueAtTime(ch.bass * 2, t);
      mGain.gain.setValueAtTime(0.0001, t);
      mGain.gain.linearRampToValueAtTime(musicIntensity === 'fun' ? 0.055 : 0.036, t + 0.008);
      mGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      mOsc.connect(mGain);
      mGain.connect(musicBus);
      mOsc.start(t);
      mOsc.stop(t + 0.18);
    }

    // 4. Singing Fantasy Flute / Ocarina Lead Melody
    const mel = melodyByStep.get(step);
    if (mel) {
      const dur = mel.d * STEP_DUR * 0.96;
      const fOsc = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const fFlt = ctx.createBiquadFilter();
      const fGain = ctx.createGain();

      fOsc.type = 'sine';
      fOsc.frequency.setValueAtTime(mel.f, t);

      // Gentle expressive vibrato
      vib.type = 'sine';
      vib.frequency.value = 5.2;
      vibGain.gain.setValueAtTime(0.5, t);
      vibGain.gain.linearRampToValueAtTime(3.2, t + Math.min(0.35, dur * 0.6));
      vib.connect(vibGain);
      vibGain.connect(fOsc.frequency);

      fFlt.type = 'lowpass';
      fFlt.frequency.value = 2600;

      fGain.gain.setValueAtTime(0.0001, t);
      fGain.gain.linearRampToValueAtTime(0.068, t + 0.06);
      fGain.gain.setValueAtTime(0.058, t + Math.max(0.08, dur - 0.12));
      fGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      fOsc.connect(fFlt);
      fFlt.connect(fGain);
      fGain.connect(musicBus);

      fOsc.start(t);
      vib.start(t);
      fOsc.stop(t + dur + 0.04);
      vib.stop(t + dur + 0.04);
    }
  }

  function syncBusVolumes() {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (sfxBus) sfxBus.gain.setTargetAtTime(sfxEnabled ? sfxVolume : 0.0001, now, 0.04);
    if (musicBus) musicBus.gain.setTargetAtTime(musicEnabled ? musicVolume : 0.0001, now, 0.12);
    if (!sfxEnabled) updateBoost(false);
  }

  // ==================== SFX HELPERS ====================

  function playTone(freq, duration, type = 'sine', volume = 0.14, delay = 0, freqEnd = null) {
    if (!sfxEnabled) return;
    const c = ensure();
    if (!c || !sfxBus) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.025);
  }

  // Professional Studio UI Sounds
  function playHover() {
    playTone(980, 0.035, 'sine', 0.035, 0, 1140);
  }

  function playClick() {
    playTone(680, 0.06, 'triangle', 0.09, 0, 960);
    playTone(1360, 0.045, 'sine', 0.04, 0.01, 1520);
  }

  function playTab() {
    playTone(587.33, 0.075, 'triangle', 0.08, 0);
    playTone(880.0, 0.10, 'sine', 0.08, 0.045);
  }

  function playToggle(on) {
    if (on) {
      playTone(523.25, 0.07, 'triangle', 0.08, 0, 783.99);
    } else {
      playTone(620, 0.07, 'triangle', 0.07, 0, 392);
    }
  }

  function playSlider() {
    const now = performance.now();
    if (now - lastSliderTick < 48) return;
    lastSliderTick = now;
    playTone(820, 0.03, 'sine', 0.045, 0, 900);
  }

  // Gameplay Sounds
  function playEat(stepIdx = 0) {
    const base = EAT_SCALE[stepIdx % EAT_SCALE.length];
    playTone(base, 0.18, 'triangle', 0.16, 0, base * 1.08);
    playTone(base * 1.5, 0.22, 'sine', 0.10, 0.04, base * 1.54);
  }

  function playGolden() {
    [587.33, 739.99, 880.0, 1174.66, 1479.98].forEach((f, i) => {
      playTone(f, 0.28, 'triangle', 0.11, i * 0.045);
      playTone(f * 2, 0.16, 'sine', 0.04, i * 0.045);
    });
  }

  function playMagnet() {
    [659.25, 987.77, 1318.51].forEach((f, i) => playTone(f, 0.22, 'sine', 0.10, i * 0.05, f * 1.04));
  }

  function playVictory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => {
      playTone(f, 0.34, 'triangle', 0.14, i * 0.075);
      playTone(f * 1.5, 0.22, 'sine', 0.06, i * 0.075 + 0.02);
    });
  }

  function playRecord() {
    [587.33, 783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => {
      playTone(f, 0.32, 'sine', 0.12, i * 0.065);
    });
  }

  function playWrongApple() {
    playTone(270, 0.22, 'sawtooth', 0.13, 0, 185);
    playTone(195, 0.36, 'sawtooth', 0.14, 0.16, 110);
  }

  function playJump() {
    playTone(210, 0.20, 'sine', 0.12, 0, 540);
    playTone(300, 0.15, 'triangle', 0.06, 0.02, 640);
  }

  function playLand() {
    playTone(125, 0.11, 'sine', 0.10, 0, 52);
  }

  function playBoostPad() {
    playTone(340, 0.22, 'triangle', 0.11, 0, 920);
    playTone(680, 0.24, 'sine', 0.10, 0.03, 1320);
  }

  function playTailJump() {
    playTone(659.25, 0.16, 'triangle', 0.12, 0);
    playTone(987.77, 0.24, 'sine', 0.12, 0.07);
  }

  function playCrash() {
    if (!sfxEnabled) return;
    const c = ensure();
    if (!c || !sfxBus) return;
    playTone(155, 0.42, 'sawtooth', 0.16, 0, 34);
    playTone(98, 0.50, 'triangle', 0.15, 0.02, 28);

    const len = Math.floor(c.sampleRate * 0.30);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(850, c.currentTime);
    flt.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.29);
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.29);
    src.connect(flt);
    flt.connect(g);
    g.connect(sfxBus);
    src.start();
  }

  function speakNumber(num) {
    if (!sfxEnabled || !speechEnabled) return;
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(String(num));
      utt.lang = 'tr-TR';
      utt.rate = 1.15;
      utt.pitch = 1.1;
      utt.volume = Math.min(1, sfxVolume);
      window.speechSynthesis.speak(utt);
    } catch (_) {}
  }

  function updateBoost(active) {
    if (!ctx || !boostGain || !boostOsc || !boostFilter) return;
    const on = active && sfxEnabled;
    if (on === boostPlaying) return;
    boostPlaying = on;
    const now = ctx.currentTime;
    boostGain.gain.setTargetAtTime(on ? 0.045 : 0.0001, now, 0.06);
    boostOsc.frequency.setTargetAtTime(on ? 115 : 68, now, 0.08);
    boostFilter.frequency.setTargetAtTime(on ? 400 : 140, now, 0.08);
  }

  function setMusicEnabled(en) {
    musicEnabled = !!en;
    if (musicEnabled) ensure();
    syncBusVolumes();
    return musicEnabled;
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    syncBusVolumes();
    return musicVolume;
  }

  function setSfxEnabled(en) {
    sfxEnabled = !!en;
    syncBusVolumes();
    return sfxEnabled;
  }

  function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
    syncBusVolumes();
    return sfxVolume;
  }

  function setSpeechEnabled(en) {
    speechEnabled = !!en;
    return speechEnabled;
  }

  function setMusicIntensity(mode) {
    musicIntensity = mode; // 'menu' | 'edu' | 'fun'
  }

  // Legacy convenience wrapper
  function setMuted(m) {
    setSfxEnabled(!m);
    setMusicEnabled(!m);
    if (m) {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
    }
    return m;
  }

  return {
    unlock: () => ensure(),
    playHover,
    playClick,
    playTab,
    playToggle,
    playSlider,
    playEat,
    playGolden,
    playMagnet,
    playVictory,
    playRecord,
    playWrongApple,
    playJump,
    playLand,
    playBoostPad,
    playTailJump,
    playCrash,
    speakNumber,
    updateBoost,
    setMusicEnabled,
    isMusicEnabled: () => musicEnabled,
    setMusicVolume,
    getMusicVolume: () => musicVolume,
    setSfxEnabled,
    isSfxEnabled: () => sfxEnabled,
    setSfxVolume,
    getSfxVolume: () => sfxVolume,
    setSpeechEnabled,
    isSpeechEnabled: () => speechEnabled,
    setMusicIntensity,
    setMuted,
    isMuted: () => !sfxEnabled && !musicEnabled,
  };
})();
