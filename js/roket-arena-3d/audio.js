// audio.js — Stadium Arcade Web Audio Engine: Upbeat Multi-Track Music + Juicy Soccer/Paint SFX + Turkish Speech

const SoundFX = (() => {
  let ctx = null;
  let sfxBus = null;
  let musicBus = null;
  let delayNode = null;
  let delayFeedback = null;
  let noiseBuffer = null;

  let sfxEnabled = true;
  let musicEnabled = true;
  let speechEnabled = true;
  let sfxVolume = 0.85;
  let musicVolume = 0.48;

  let boostGain = null;
  let boostOsc = null;
  let boostFilter = null;
  let lastSliderTick = 0;

  const POP_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  // Upbeat Sunny Stadium Synth Composition (C Major — bright, sporty, kid-friendly)
  const N = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  };

  // 8-bar upbeat chord cycle (64 eighth-note steps)
  const CHORDS = [
    { bass: N.C3, pad: [N.C4, N.E4, N.G4], arp: [N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, N.G4, N.C5] },
    { bass: N.G2, pad: [N.B3, N.D4, N.G4], arp: [N.G3, N.B3, N.D4, N.G4, N.D4, N.B3, N.D4, N.G4] },
    { bass: N.A2, pad: [N.C4, N.E4, N.A4], arp: [N.A3, N.C4, N.E4, N.A4, N.E4, N.C4, N.E4, N.A4] },
    { bass: N.F2, pad: [N.A3, N.C4, N.F4], arp: [N.F3, N.A3, N.C4, N.F4, N.C4, N.A3, N.C4, N.F4] },
    { bass: N.C3, pad: [N.C4, N.E4, N.G4], arp: [N.C4, N.G4, N.E4, N.C5, N.G4, N.E4, N.C4, N.E4] },
    { bass: N.D3, pad: [N.D4, N.F4, N.A4], arp: [N.D4, N.F4, N.A4, N.D5, N.A4, N.F4, N.A4, N.D5] },
    { bass: N.F2, pad: [N.C4, N.F4, N.A4], arp: [N.F3, N.C4, N.F4, N.A4, N.F4, N.C4, N.A3, N.C4] },
    { bass: N.G2, pad: [N.B3, N.D4, N.G4], arp: [N.G3, N.D4, N.G4, N.B4, N.G4, N.D4, N.B3, N.D4] },
  ];

  // Joyful bright synth lead across 64 eighth notes
  const LEAD_MELODY = [
    { s: 0,  f: N.E5, d: 2 }, { s: 2,  f: N.G5, d: 2 }, { s: 4,  f: N.E5, d: 1 }, { s: 5,  f: N.D5, d: 1 }, { s: 6, f: N.C5, d: 2 },
    { s: 8,  f: N.D5, d: 3 }, { s: 11, f: N.E5, d: 1 }, { s: 12, f: N.D5, d: 2 }, { s: 14, f: N.B4, d: 2 },
    { s: 16, f: N.C5, d: 2 }, { s: 18, f: N.E5, d: 2 }, { s: 20, f: N.A5, d: 2 }, { s: 22, f: N.G5, d: 2 },
    { s: 24, f: N.F5, d: 3 }, { s: 27, f: N.E5, d: 1 }, { s: 28, f: N.D5, d: 2 }, { s: 30, f: N.C5, d: 2 },
    { s: 32, f: N.E5, d: 2 }, { s: 34, f: N.G5, d: 2 }, { s: 36, f: N.C5, d: 2 }, { s: 38, f: N.E5, d: 2 },
    { s: 40, f: N.F5, d: 2 }, { s: 42, f: N.A5, d: 2 }, { s: 44, f: N.G5, d: 2 }, { s: 46, f: N.F5, d: 2 },
    { s: 48, f: N.E5, d: 2 }, { s: 50, f: N.C5, d: 2 }, { s: 52, f: N.F5, d: 2 }, { s: 54, f: N.A5, d: 2 },
    { s: 56, f: N.G5, d: 3 }, { s: 59, f: N.E5, d: 1 }, { s: 60, f: N.D5, d: 4 },
  ];

  const melodyByStep = new Map();
  LEAD_MELODY.forEach((m) => melodyByStep.set(m.s, m));

  let musicTimer = null;
  let nextStepTime = 0;
  let currentStep = 0;
  let musicIntensity = 'menu'; // 'menu' | 'edu' | 'fun'
  const STEP_DUR = 60 / 118 / 2; // 118 BPM eighth note

  function createNoiseBuffer(audioCtx) {
    const len = audioCtx.sampleRate * 1.2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      noiseBuffer = createNoiseBuffer(ctx);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = sfxEnabled ? sfxVolume : 0.0001;
      sfxBus.connect(ctx.destination);

      musicBus = ctx.createGain();
      musicBus.gain.value = musicEnabled ? musicVolume : 0.0001;

      delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = STEP_DUR * 1.5;
      delayFeedback = ctx.createGain();
      delayFeedback.gain.value = 0.22;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2400;

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
    boostOsc = ctx.createOscillator();
    boostOsc.type = 'sawtooth';
    boostOsc.frequency.value = 92;

    boostFilter = ctx.createBiquadFilter();
    boostFilter.type = 'lowpass';
    boostFilter.frequency.value = 340;

    boostGain = ctx.createGain();
    boostGain.gain.value = 0.0001;

    boostOsc.connect(boostFilter);
    boostFilter.connect(boostGain);
    boostGain.connect(sfxBus);
    boostOsc.start();
  }

  function playNote(dest, freq, startTime, dur, type, peakGain, attack = 0.015, cutoff = 3200) {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(cutoff, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(filt);
    filt.connect(g);
    g.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.04);
  }

  function playDrumTick(time, isKick, gainVal) {
    if (isKick) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      g.gain.setValueAtTime(gainVal, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
      osc.connect(g);
      g.connect(musicBus);
      osc.start(time);
      osc.stop(time + 0.14);
    } else if (noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(5200, time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gainVal * 0.35, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
      src.connect(hp);
      hp.connect(g);
      g.connect(musicBus);
      src.start(time);
      src.stop(time + 0.055);
    }
  }

  function scheduleMusicStep(step, time) {
    if (!ctx || !musicBus || !musicEnabled) return;
    const step64 = step % 64;
    const barIdx = Math.floor(step64 / 8);
    const beatStep = step64 % 8;
    const chord = CHORDS[barIdx];
    const isActive = musicIntensity !== 'menu';
    const levelMul = musicIntensity === 'fun' ? 1.05 : musicIntensity === 'edu' ? 0.88 : 0.72;

    // Warm bouncy synth bass on beats 0, 3, 4, 6
    if (beatStep === 0 || beatStep === 4) {
      playNote(musicBus, chord.bass, time, STEP_DUR * 2.1, 'triangle', 0.15 * levelMul, 0.012, 650);
    } else if (isActive && (beatStep === 3 || beatStep === 6)) {
      playNote(musicBus, chord.bass * 1.5, time, STEP_DUR * 1.1, 'triangle', 0.08 * levelMul, 0.01, 750);
    }

    // Soft bright pad on bar downbeat
    if (beatStep === 0) {
      for (const pf of chord.pad) {
        playNote(musicBus, pf, time, STEP_DUR * 7.6, 'sine', 0.036 * levelMul, 0.12, 1600);
      }
    }

    // Sparkling marimba arpeggio
    const arpFreq = chord.arp[beatStep];
    if (arpFreq && (isActive || beatStep % 2 === 0)) {
      playNote(musicBus, arpFreq, time, STEP_DUR * 1.45, 'triangle', 0.055 * levelMul, 0.008, 2800);
    }

    // Light upbeat percussion when playing
    if (isActive) {
      if (beatStep === 0 || beatStep === 4) {
        playDrumTick(time, true, 0.11 * levelMul);
      }
      if (beatStep === 2 || beatStep === 6) {
        playDrumTick(time, false, 0.08 * levelMul);
      }
    }

    // Lead melody
    const mel = melodyByStep.get(step64);
    if (mel) {
      playNote(musicBus, mel.f, time, STEP_DUR * mel.d * 0.92, 'sine', 0.085 * levelMul, 0.02, 3400);
      if (musicIntensity === 'fun') {
        playNote(musicBus, mel.f * 0.5, time, STEP_DUR * mel.d * 0.85, 'triangle', 0.035, 0.02, 1800);
      }
    }
  }

  function musicScheduler() {
    if (!ctx || !musicEnabled) return;
    while (nextStepTime < ctx.currentTime + 0.16) {
      scheduleMusicStep(currentStep, nextStepTime);
      nextStepTime += STEP_DUR;
      currentStep++;
    }
  }

  function startMusicLoopIfNeeded() {
    if (!ctx || !musicEnabled) return;
    if (musicTimer !== null) return;
    nextStepTime = ctx.currentTime + 0.08;
    musicTimer = setInterval(musicScheduler, 45);
  }

  function stopMusicLoop() {
    if (musicTimer !== null) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setMusicIntensity(mode) {
    musicIntensity = mode;
  }

  function setMusicEnabled(enabled) {
    musicEnabled = !!enabled;
    if (ctx && musicBus) {
      musicBus.gain.setTargetAtTime(musicEnabled ? musicVolume : 0.0001, ctx.currentTime, 0.08);
    }
    if (musicEnabled && ctx) startMusicLoopIfNeeded();
    else if (!musicEnabled) stopMusicLoop();
  }

  function setSfxEnabled(enabled) {
    sfxEnabled = !!enabled;
    if (ctx && sfxBus) {
      sfxBus.gain.setTargetAtTime(sfxEnabled ? sfxVolume : 0.0001, ctx.currentTime, 0.05);
    }
  }

  function setSpeechEnabled(enabled) {
    speechEnabled = !!enabled;
    if (!speechEnabled && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, v));
    if (ctx && musicBus && musicEnabled) {
      musicBus.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.05);
    }
  }

  function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, v));
    if (ctx && sfxBus && sfxEnabled) {
      sfxBus.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.05);
    }
  }

  // ==================== UI & GAMEPLAY SFX ====================

  function playUiClick(pitch = 620) {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    playNote(sfxBus, pitch, t, 0.065, 'triangle', 0.16, 0.004, 3000);
    playNote(sfxBus, pitch * 1.45, t + 0.018, 0.055, 'sine', 0.10, 0.004, 3500);
  }

  function playToggle(on) {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    playNote(sfxBus, on ? 540 : 480, t, 0.06, 'sine', 0.14, 0.005);
    playNote(sfxBus, on ? 760 : 340, t + 0.045, 0.08, 'triangle', 0.14, 0.005);
  }

  function playSliderTick() {
    const now = performance.now();
    if (now - lastSliderTick < 55) return;
    lastSliderTick = now;
    playUiClick(780);
  }

  function playKick(intensity = 0.7) {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const p = Math.max(0.25, Math.min(1.2, intensity));

    // Punchy low leather ball thump
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165 + p * 65, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    g.gain.setValueAtTime(0.32 * p, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.18);

    // Crisp transient pop
    if (noiseBuffer) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, t);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.14 * p, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(sfxBus);
      src.start(t);
      src.stop(t + 0.06);
    }
  }

  function playJump() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.15);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function playGoal() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;

    // Stadium celebratory brass horn chord (C4 + E4 + G4 + C5)
    const chord = [261.63, 329.63, 392.0, 523.25];
    chord.forEach((f, idx) => {
      const osc = c.createOscillator();
      const filt = c.createBiquadFilter();
      const g = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.985, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1850, t);
      filt.frequency.linearRampToValueAtTime(1100, t + 0.72);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11 - idx * 0.01, t + 0.04);
      g.gain.setValueAtTime(0.095 - idx * 0.01, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(filt);
      filt.connect(g);
      g.connect(sfxBus);
      osc.start(t);
      osc.stop(t + 0.9);
    });

    // Ascending victory arpeggio sparkles
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      playNote(sfxBus, f, t + 0.06 + i * 0.075, 0.28, 'triangle', 0.18, 0.01, 4200);
    });

    // Warm filtered crowd cheer burst
    if (noiseBuffer) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1100, t);
      bp.Q.value = 1.1;
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
      src.connect(bp);
      bp.connect(g);
      g.connect(sfxBus);
      src.start(t);
      src.stop(t + 1.1);
    }
  }

  function playPaintFire() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(115, t + 0.095);
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  function playPaintPop(comboIdx = 0) {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const freq = POP_SCALE[Math.min(Math.max(0, comboIdx), POP_SCALE.length - 1)];

    // Crisp balloon pop chirp
    const pop = c.createOscillator();
    const pg = c.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(freq * 0.72, t);
    pop.frequency.exponentialRampToValueAtTime(freq * 1.45, t + 0.06);
    pg.gain.setValueAtTime(0.28, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    pop.connect(pg);
    pg.connect(sfxBus);
    pop.start(t);
    pop.stop(t + 0.16);

    // Sparkling harmonic reward ding
    playNote(sfxBus, freq, t + 0.025, 0.24, 'triangle', 0.18, 0.006, 4000);
    playNote(sfxBus, freq * 1.5, t + 0.075, 0.20, 'sine', 0.12, 0.006, 4500);

    // Wet paint splash noise burst
    if (noiseBuffer) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800, t);
      bp.frequency.exponentialRampToValueAtTime(620, t + 0.11);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.16, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(sfxBus);
      src.start(t);
      src.stop(t + 0.13);
    }
  }

  function playBomb() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.32);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.38);

    if (noiseBuffer) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.24, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(sfxBus);
      src.start(t);
      src.stop(t + 0.30);
    }
  }

  function playWrong() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    // Playful soft rubber boing (friendly for young learners)
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(155, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(215, t + 0.24);
    osc.frequency.exponentialRampToValueAtTime(135, t + 0.34);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  function playBoostPad() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    [440, 587.33, 880].forEach((f, i) => {
      playNote(sfxBus, f, t + i * 0.04, 0.16, 'triangle', 0.14, 0.005, 3800);
    });
  }

  function playWhistle() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const g = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2650, t);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(34, t);
    lfoGain.gain.setValueAtTime(110, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.02);
    g.gain.setValueAtTime(0.12, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

    osc.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.36);
    lfo.stop(t + 0.36);
  }

  function playVictory() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const notes = [
      { f: 523.25, s: 0.00, d: 0.16 },
      { f: 659.25, s: 0.13, d: 0.16 },
      { f: 783.99, s: 0.26, d: 0.16 },
      { f: 1046.5, s: 0.40, d: 0.55 },
      { f: 783.99, s: 0.40, d: 0.55 },
      { f: 523.25, s: 0.40, d: 0.55 },
    ];
    notes.forEach((n) => {
      playNote(sfxBus, n.f, t + n.s, n.d, 'triangle', 0.18, 0.01, 4200);
    });
  }

  function playPostClang() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    // Metallic goalpost clang (inharmonic ring)
    [420, 668, 1095].forEach((f, i) => {
      playNote(sfxBus, f, t, 0.36 - i * 0.06, 'triangle', 0.16 - i * 0.03, 0.004, 4200);
    });
  }

  function playRampLaunch() {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.24);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    osc.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.30);
  }

  function playSpecial(kind = 'dash') {
    const c = ensure();
    if (!c || !sfxEnabled) return;
    const t = c.currentTime;
    if (kind === 'shockwave') {
      playBomb();
      [330, 495, 660].forEach((f, i) => playNote(sfxBus, f, t + i * 0.03, 0.24, 'triangle', 0.18, 0.006, 3800));
    } else if (kind === 'slowfield') {
      [1174, 880, 659, 523].forEach((f, i) => playNote(sfxBus, f, t + i * 0.045, 0.28, 'sine', 0.15, 0.008, 4500));
    } else if (kind === 'magnet') {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.26);
      g.gain.setValueAtTime(0.20, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
      osc.connect(g);
      g.connect(sfxBus);
      osc.start(t);
      osc.stop(t + 0.32);
    } else if (kind === 'megajump') {
      playRampLaunch();
      playNote(sfxBus, 784, t + 0.08, 0.22, 'triangle', 0.16, 0.006, 4000);
    } else {
      // Dash / Overdrive jet whoosh + ascending power triad
      [392, 523.25, 783.99, 1046.5].forEach((f, i) => {
        playNote(sfxBus, f, t + i * 0.04, 0.18, 'triangle', 0.16, 0.005, 4200);
      });
    }
  }

  function setBoost(amount) {
    if (!ctx || !boostGain || !boostOsc) return;
    const active = sfxEnabled ? Math.max(0, Math.min(1, amount)) : 0;
    const t = ctx.currentTime;
    boostGain.gain.setTargetAtTime(active > 0.05 ? active * 0.10 : 0.0001, t, 0.06);
    boostOsc.frequency.setTargetAtTime(88 + active * 105, t, 0.06);
    if (boostFilter) {
      boostFilter.frequency.setTargetAtTime(280 + active * 720, t, 0.06);
    }
  }

  function speak(text) {
    if (!speechEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'tr-TR';
      u.rate = 1.06;
      u.pitch = 1.08;
      u.volume = Math.min(1, sfxVolume + 0.1);
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  return {
    ensure,
    setMusicIntensity,
    setMusicEnabled,
    setSfxEnabled,
    setSpeechEnabled,
    setMusicVolume,
    setSfxVolume,
    playUiClick,
    playToggle,
    playSliderTick,
    playKick,
    playJump,
    playGoal,
    playPaintFire,
    playPaintPop,
    playBomb,
    playWrong,
    playBoostPad,
    playPostClang,
    playRampLaunch,
    playSpecial,
    playWhistle,
    playVictory,
    setBoost,
    speak,
  };
})();
