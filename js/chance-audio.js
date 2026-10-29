/* Short, physically inspired plastic and metal transients. No recordings,
   downloads or autoplay: the audio context is opened by a user gesture. */
(() => {
  'use strict';
  let context = null, master = null, enabled = true, sequence = 1;
  const voices = new Set(), clips = new Map();
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function random(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  }
  function synthesize(kind, sampleRate, seed) {
    const rng = random(seed), duration = kind === 'coin' ? .54 : kind === 'launch' ? .19 : .18;
    const samples = new Float32Array(Math.ceil(duration * sampleRate));
    const detune = .975 + rng() * .05;
    const modes = (kind === 'coin'
      ? [[241, .13, 70], [1463, .12, 16], [2759, .16, 10], [4217, .09, 13], [5873, .045, 18]]
      : kind === 'launch'
        ? [[540, .1, 115], [1733, .075, 44], [3391, .035, 65]]
        : [[186, .27, 48], [397, .2, 83], [739, .13, 120], [1297, .09, 160], [2483, .065, 230]])
      .map(([frequency, amplitude, decay]) => ({ omega: 2 * Math.PI * Math.min(sampleRate * .42, frequency * detune), amplitude, decay, phase: rng() * Math.PI * 2 }));
    let low = 0, previous = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate, attack = Math.min(1, t / .0007), noise = rng() * 2 - 1;
      low += .28 * (noise - low);
      const bright = noise - previous * .65; previous = noise;
      let value = 0;
      for (const mode of modes) value += mode.amplitude * Math.sin(mode.omega * t + mode.phase) * Math.exp(-mode.decay * t);
      if (kind === 'coin') value += bright * .27 * Math.exp(-t * 380) + low * .15 * Math.exp(-t * 90);
      else if (kind === 'launch') {
        // Finger flick followed by a faint band of air, rather than a loud beep.
        value += bright * .18 * Math.exp(-t * 420);
        const air = Math.sin(Math.PI * clamp(t / .16, 0, 1));
        value += low * .035 * air * air;
      } else value += low * .5 * Math.exp(-t * 155) + bright * .13 * Math.exp(-t * 410);
      const release = Math.min(1, (duration - t) / .012);
      samples[i] = Math.tanh(value * attack * release) * .88;
    }
    return samples;
  }
  function bufferFor(kind) {
    const variant = sequence++ % 4, key = `${kind}:${variant}:${context.sampleRate}`;
    if (!clips.has(key)) {
      const data = synthesize(kind, context.sampleRate, 2917 + variant * 779 + kind.length * 1187);
      const buffer = context.createBuffer(1, data.length, context.sampleRate);
      buffer.getChannelData(0).set(data); clips.set(key, buffer);
    }
    return clips.get(key);
  }
  function unlock() {
    if (!enabled) return Promise.resolve(false);
    if (!context || context.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return Promise.resolve(false);
      try {
        context = new Audio(); master = context.createGain();
        master.gain.setValueAtTime(.62, context.currentTime); master.connect(context.destination); clips.clear();
      } catch (_) { context = null; master = null; return Promise.resolve(false); }
    }
    try { return Promise.resolve(context.state === 'suspended' ? context.resume() : undefined).then(() => true, () => false); }
    catch (_) { return Promise.resolve(false); }
  }
  function play(kind, strength = 1, delay = 0, pan = 0) {
    if (!enabled || !context || context.state === 'closed' || document.hidden) return false;
    const amount = clamp(Number.isFinite(strength) ? strength : 1, 0, 1);
    if (!amount) return false;
    try {
      const source = context.createBufferSource(), level = context.createGain();
      const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      const start = context.currentTime + clamp(Number.isFinite(delay) ? delay : 0, 0, 3);
      source.buffer = bufferFor(kind); source.playbackRate.value = .97 + (sequence % 7) * .01;
      level.gain.setValueAtTime(Math.sqrt(amount) * (kind === 'launch' ? .68 : .88), start);
      source.connect(level);
      if (panner) { panner.pan.value = clamp(Number.isFinite(pan) ? pan : 0, -1, 1); level.connect(panner); panner.connect(master); }
      else level.connect(master);
      const voice = { source, level, panner }; voices.add(voice);
      source.onended = () => { voices.delete(voice); source.disconnect(); level.disconnect(); panner?.disconnect(); };
      source.start(start); return true;
    } catch (_) { return false; }
  }
  function stop() {
    for (const voice of voices) {
      try { voice.source.stop(); } catch (_) {}
      try { voice.source.disconnect(); voice.level.disconnect(); voice.panner?.disconnect(); } catch (_) {}
    }
    voices.clear();
  }
  function setEnabled(value) {
    enabled = !!value;
    if (!enabled) stop();
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(enabled ? .62 : 0, context.currentTime);
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.ChanceAudio = Object.freeze({
    unlock, setEnabled, stop,
    diceImpact: (strength = 1, delay = 0, pan = 0) => play('dice', strength, delay, pan),
    coinLaunch: (delay = 0) => play('launch', 1, delay),
    coinImpact: (strength = 1, delay = 0, pan = 0) => play('coin', strength, delay, pan)
  });
})();
