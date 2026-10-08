/* Downloaded, unmodified Kevin MacLeod recordings, licensed CC BY 4.0.
   Sources, checksums and attribution: assets/akvaryum/muzikler/kaynaklar.json */
(function () {
  'use strict';
  const titles = { ocean: 'Hafif okyanus', peace: 'Meditation Impromptu 01', focus: 'Clean Soul', lively: 'Life of Riley', fun: 'Monkeys Spinning Monkeys' };
  const tracks = { off: 'Sessiz', ocean: 'Hafif okyanus · Kıyı dalgaları', peace: 'Huzurlu piyano · Meditation Impromptu 01', focus: 'Odaklanma · Clean Soul', lively: 'Hareketli · Life of Riley', fun: 'Eğlenceli · Monkeys Spinning Monkeys' };
  let player = null, generation = 0, mode = 'off', volume = .3, userPaused = false, loading = false;
  let context, master;
  function status(text) { const el = document.getElementById('musicStatus'); if (el) el.textContent = text; window.dispatchEvent(new CustomEvent('aquarium-audio-change')); }
  function stop() {
    generation++; userPaused = false; loading = false; mode = 'off';
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); player = null; }
    status('Müzik durduruldu.');
  }
  async function play(next) {
    stop(); if (!titles[next]) return false;
    const request = generation, audio = new window.Audio('/assets/akvaryum/muzikler/' + next + (next === 'ocean' ? '.wav' : '.mp3'));
    player = audio; mode = next; audio.loop = true; audio.volume = volume; audio.preload = 'none';
    loading = true; status('Ses yükleniyor…');
    audio.addEventListener('error', () => { if (request === generation) { stop(); status('Müzik yüklenemedi. Bağlantınızı kontrol edip Başlat’a basın.'); } });
    try {
      await audio.play();
      if (request !== generation) { audio.pause(); return false; }
      loading = false;
      if (userPaused) { audio.pause(); status('Duraklatıldı: ' + titles[next]); return false; }
      status('Çalıyor: ' + titles[next]); return true;
    } catch (error) {
      if (request !== generation) return false;
      stop(); status('Müzik başlatılamadı. Yeniden Başlat’a basın.');
      throw new Error('Müzik başlatılamadı. Bağlantınızı kontrol edip yeniden Başlat’a basın.');
    }
  }
  function pause() {
    userPaused = true;
    if (player) player.pause();
    status(mode === 'off' ? 'Bir ses seçin.' : 'Duraklatıldı: ' + titles[mode]);
  }
  async function resume() {
    if (!player) return false;
    const audio = player, request = generation;
    userPaused = false; loading = true; status('Ses yükleniyor…');
    try {
      await audio.play();
      if (request !== generation) { audio.pause(); return false; }
      loading = false;
      if (userPaused) audio.pause();
      status((userPaused ? 'Duraklatıldı: ' : 'Çalıyor: ') + titles[mode]);
      return !userPaused;
    } catch (error) {
      if (request !== generation) return false;
      loading = false; pause(); throw new Error('Ses sürdürülemedi. Yeniden başlatın.');
    }
  }
  async function toggle(selected) {
    if (player && !userPaused && (!player.paused || loading)) { pause(); return false; }
    return player ? resume() : play(selected);
  }
  async function feed() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) { context = new AudioContext(); master = context.createGain(); master.connect(context.destination); }
    master.gain.value = volume; await context.resume();
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const at = context.currentTime + i * .1, osc = context.createOscillator(), gain = context.createGain();
      osc.frequency.value = frequency; gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.16, at + .04); gain.gain.exponentialRampToValueAtTime(.0001, at + .3);
      osc.connect(gain); gain.connect(master); osc.start(at); osc.stop(at + .35);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }
  function setVolume(value) {
    volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (player) player.volume = volume;
    if (master) master.gain.setTargetAtTime(volume, context.currentTime, .1);
  }
  // Switching tabs must not override the teacher's playback choice.
  window.addEventListener('pagehide', stop);
  window.AquariumAudio = { tracks, titles, play, stop, pause, resume, toggle, feed, setVolume, current: () => mode, isPlaying: () => Boolean(player && !userPaused && (!player.paused || loading)) };
})();
