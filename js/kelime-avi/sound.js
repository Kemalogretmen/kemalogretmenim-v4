/**
 * Kelime Avı Atölyesi — Web Audio API Ses Efektleri & Konfeti Motoru
 * Harici ses dosyası gerektirmez, MEB / çevrimdışı akıllı tahta uyumludur.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KelimeSound = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let audioCtx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTone(freq, startOffset, duration, type, volume) {
    const ctx = ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + (startOffset || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function setMuted(val) {
    muted = Boolean(val);
  }

  function isMuted() {
    return muted;
  }

  function playStep(stepIndex) {
    const base = 392; // G4
    const semis = Math.min(14, stepIndex || 0);
    const freq = base * Math.pow(2, semis / 12);
    playTone(freq, 0, 0.06, 'sine', 0.045);
  }

  function playFound(combo) {
    const shift = Math.min(4, Math.max(0, (combo || 1) - 1));
    const mult = Math.pow(2, shift / 12);
    playTone(523.25 * mult, 0.00, 0.14, 'triangle', 0.10); // C5
    playTone(659.25 * mult, 0.07, 0.16, 'triangle', 0.10); // E5
    playTone(783.99 * mult, 0.14, 0.24, 'sine', 0.11);     // G5
  }

  function playWrong() {
    playTone(230, 0.00, 0.12, 'sawtooth', 0.04);
    playTone(185, 0.08, 0.16, 'sawtooth', 0.035);
  }

  function playHint() {
    playTone(698.46, 0.00, 0.12, 'sine', 0.07);
    playTone(880.00, 0.09, 0.18, 'sine', 0.08);
  }

  function playVictory() {
    const notes = [
      [523.25, 0.00, 0.16],
      [659.25, 0.11, 0.16],
      [783.99, 0.22, 0.16],
      [1046.50, 0.34, 0.42],
      [783.99, 0.50, 0.14],
      [1046.50, 0.62, 0.50]
    ];
    notes.forEach(([f, t, d]) => playTone(f, t, d, 'triangle', 0.11));
  }

  function playTimeUp() {
    playTone(440, 0.00, 0.22, 'square', 0.05);
    playTone(349.23, 0.24, 0.22, 'square', 0.05);
    playTone(293.66, 0.48, 0.38, 'square', 0.05);
  }

  // ==================== CONFETTI ENGINE ====================

  function launchConfetti(canvasEl) {
    if (!canvasEl || typeof window === 'undefined') return;
    const ctx = canvasEl.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.display = 'block';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ['#6C3DED', '#2563EB', '#0F9F75', '#F59E0B', '#EC4899', '#14B8A6', '#EF4444'];
    const particles = Array.from({ length: 120 }, () => ({
      x: w * (0.15 + Math.random() * 0.7),
      y: -20 - Math.random() * 140,
      vx: (Math.random() - 0.5) * 7,
      vy: 3 + Math.random() * 5.5,
      size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.22,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.4 ? 'rect' : 'circle'
    }));

    let frame = 0;
    function tick() {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.99;
        p.rot += p.vrot;
        if (p.y < h + 40) alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0 && frame < 210) {
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        canvasEl.style.display = 'none';
      }
    }
    requestAnimationFrame(tick);
  }

  return {
    setMuted,
    isMuted,
    playStep,
    playFound,
    playWrong,
    playHint,
    playVictory,
    playTimeUp,
    launchConfetti
  };
}));
