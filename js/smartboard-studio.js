(function(root) {
  'use strict';
  var CATALOG = [
    ['spotlight', 'Odak ışığı', 'scan-eye'], ['shade', 'Ekran perdesi', 'panel-top-close'],
    ['laser', 'Lazer işaretçi', 'mouse-pointer-2'], ['timer', 'Görsel süre', 'timer'],
    ['random', 'Öğrenci seç', 'shuffle'], ['groups', 'Grup oluştur', 'users'],
    ['score', 'Puan tablosu', 'trophy'], ['signal', 'Çalışma modu', 'traffic-cone'],
    ['note', 'Ders notu', 'sticky-note'], ['noise', 'Ses göstergesi', 'mic'],
    ['image', 'Görsel ekle', 'image-plus']
  ];
  function icon(name) { return '<span class="sb-icon" aria-hidden="true" style="--sb-icon:url(/assets/smartboard-icons/' + name + '.svg)"></span>'; }
  function iconButton(name, title, action) { return '<button type="button" class="sb-icon-button" title="' + title + '" aria-label="' + title + '" data-sb-action="' + action + '">' + icon(name) + '</button>'; }
  function splitNames(value) { return String(value || '').split(/[\n,;]/).map(function(s) { return s.trim(); }).filter(Boolean).slice(0, 200); }
  function shuffled(list) {
    var result = list.slice();
    for(var i = result.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = result[i]; result[i] = result[j]; result[j] = t; }
    return result;
  }
  function makeGroups(names, count) {
    var groups = Array.from({ length: Math.max(1, Math.min(names.length || 1, Math.floor(count) || 1)) }, function() { return []; });
    shuffled(names).forEach(function(name, i) { groups[i % groups.length].push(name); }); return groups;
  }
  function remaining(timer, now) { return Math.max(0, timer.running ? timer.deadline - now : timer.left); }
  function init(api) {
    var stage = api.stage, launch = document.getElementById('boardAddonsBtn');
    var launches = [launch, document.getElementById('boardAddonsToolbarBtn')].filter(Boolean), activeLaunch = launch;
    var host = document.createElement('div'); host.className = 'sb-layer'; host.id = 'smartboardAddons'; document.body.appendChild(host);
    var catalog = document.createElement('aside'); catalog.className = 'sb-catalog'; catalog.id = 'smartboardCatalog'; catalog.hidden = true;
    catalog.setAttribute('aria-label', 'Akıllı Tahta eklentileri');
    catalog.innerHTML = '<div class="sb-heading"><h3>Ders Araçları</h3>' + iconButton('x', 'Eklentileri kapat', 'close-catalog') + '</div><div class="sb-tool-grid">' + CATALOG.map(function(item) {
      return '<button type="button" data-sb-tool="' + item[0] + '">' + icon(item[2]) + '<span>' + item[1] + '</span></button>';
    }).join('') + '</div><div class="sb-shortcuts"><a href="/ogretmen/matematik.html">Matematik araçları</a><a href="/ogretmen/sinifimcark.html">Sınıf çarkı</a><a href="/sinif-kaynaklari.html?tur=document">Dokümanlar</a></div><p class="sb-status" role="status"></p>';
    document.body.appendChild(catalog);
    var widgets = new Map(), stored = {}, effect = null, resizeQueued = false, sandbox = false;
    var STORAGE = 'kemal_smartboard_addons_v1';
    try { var parsed = JSON.parse(localStorage.getItem(STORAGE)); if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed; } catch(error) {}
    function save() { try { var data = {}; widgets.forEach(function(w, key) { data[key] = w.state; }); localStorage.setItem(STORAGE, JSON.stringify(data)); } catch(error) {} }
    function layout() {
      resizeQueued = false;
      var parent = document.fullscreenElement || document.webkitFullscreenElement;
      var target = parent === stage ? stage : document.body;
      if(host.parentNode !== target) target.appendChild(host);
      if(catalog.parentNode !== target) target.appendChild(catalog);
      var r = stage.getBoundingClientRect(), top = Math.max(0, r.top), left = Math.max(0, r.left);
      host.style.left = left + 'px'; host.style.top = top + 'px';
      host.style.width = Math.max(0, Math.min(innerWidth, r.right) - left) + 'px';
      host.style.height = Math.max(0, Math.min(innerHeight, r.bottom) - top) + 'px';
      host.hidden = r.bottom <= 0 || r.top >= innerHeight;
      widgets.forEach(function(w) { position(w); });
    }
    function queueLayout() { if(!resizeQueued) { resizeQueued = true; requestAnimationFrame(layout); } }
    function position(w) {
      var maxX = Math.max(0, host.clientWidth - w.el.offsetWidth - 8), maxY = Math.max(0, host.clientHeight - w.el.offsetHeight - 80);
      w.el.style.left = Math.max(8, Math.min(maxX, Number(w.state.x) || maxX - 4)) + 'px';
      w.el.style.top = Math.max(8, Math.min(maxY, Number(w.state.y) || 12)) + 'px'; w.el.style.right = 'auto';
    }
    function closeCatalog() { catalog.hidden = true; launches.forEach(function(button) { button.setAttribute('aria-expanded', 'false'); }); }
    launches.forEach(function(button) { button.addEventListener('click', function() {
      activeLaunch = button;
      catalog.hidden = !catalog.hidden; launches.forEach(function(b) { b.setAttribute('aria-expanded', String(!catalog.hidden)); });
      if(!catalog.hidden) {
        var rect = stage.getBoundingClientRect();
        if(Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top) < 260) stage.scrollIntoView({ block: 'start', behavior: 'instant' });
        layout(); catalog.querySelector('button').focus();
      }
    }); });
    catalog.addEventListener('click', function(event) {
      var button = event.target.closest('button'); if(!button) return;
      if(button.dataset.sbAction === 'close-catalog') { closeCatalog(); activeLaunch.focus(); return; }
      var type = button.dataset.sbTool; if(!type) return;
      if(type !== 'image') api.activate();
      if(['spotlight', 'shade', 'laser'].indexOf(type) >= 0) { openEffect(type); }
      else if(type === 'image') { imageInput.click(); }
      else openWidget(type);
      if(type !== 'image') closeCatalog();
    });
    function closeEffect() { if(effect) { effect.remove(); effect = null; } }
    function openEffect(type) {
      closeEffect(); layout();
      var el = document.createElement('div'); el.className = 'sb-focus'; el.dataset.effect = type;
      el.innerHTML = (type === 'spotlight' ? '<div class="sb-spot-hole"></div>' : type === 'shade' ? '<div class="sb-shade"><span class="sb-shade-grip">' + icon('move') + '</span></div>' : '<div class="sb-laser-dot" hidden></div>') +
        '<div class="sb-focus-controls"><strong>' + CATALOG.find(function(t) { return t[0] === type; })[1] + '</strong>' +
        (type !== 'laser' ? '<input type="range" min="' + (type === 'spotlight' ? 70 : 0) + '" max="' + (type === 'spotlight' ? 460 : 100) + '" value="' + (type === 'spotlight' ? 200 : 0) + '" aria-label="' + (type === 'spotlight' ? 'Odak boyutu' : 'Perdeyi aç') + '">' : '') + iconButton('x', 'Aracı kapat', 'close-effect') + '</div>';
      host.prepend(el); effect = el;
      var x = host.clientWidth / 2, y = host.clientHeight / 2, size = Math.min(200, host.clientWidth * .7), down = null;
      function paint() {
        var hole = el.querySelector('.sb-spot-hole');
        if(hole) { hole.style.left = (x - size / 2) + 'px'; hole.style.top = (y - size / 2) + 'px'; hole.style.setProperty('--spot-size', size + 'px'); }
      }
      paint();
      var slider = el.querySelector('input');
      if(slider) slider.addEventListener('input', function() { if(type === 'spotlight') { size = Number(slider.value); paint(); } else el.querySelector('.sb-shade').style.setProperty('--reveal', slider.value + '%'); });
      el.querySelector('[data-sb-action="close-effect"]').addEventListener('click', closeEffect);
      el.addEventListener('pointerdown', function(e) {
        if(e.target.closest('.sb-focus-controls')) return;
        e.preventDefault(); var r = host.getBoundingClientRect();
        down = e.pointerId; el.setPointerCapture(down); x = e.clientX - r.left; y = e.clientY - r.top;
        if(type === 'spotlight') paint();
      });
      el.addEventListener('pointermove', function(e) {
        if(e.target.closest('.sb-focus-controls')) return;
        var r = host.getBoundingClientRect();
        if(type === 'laser') {
          var dot = el.querySelector('.sb-laser-dot'); dot.hidden = false; dot.style.left = (e.clientX - r.left) + 'px'; dot.style.top = (e.clientY - r.top) + 'px';
        } else if(down === e.pointerId) {
          e.preventDefault(); x = e.clientX - r.left; y = e.clientY - r.top;
          if(type === 'spotlight') paint();
          else { slider.value = Math.max(0, Math.min(100, 100 - y / Math.max(1, host.clientHeight) * 100)); slider.dispatchEvent(new Event('input')); }
        }
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(name) { el.addEventListener(name, function(e) {
        if(down === e.pointerId) { down = null; if(el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); }
        if(type === 'laser' && e.pointerType !== 'mouse') el.querySelector('.sb-laser-dot').hidden = true;
      }); });
      el.addEventListener('pointerleave', function() { if(type === 'laser') el.querySelector('.sb-laser-dot').hidden = true; });
    }
    function baseWidget(type, title) {
      var state = stored[type] && typeof stored[type] === 'object' ? stored[type] : {};
      if(!stored[type]) { state.x = Math.max(8, host.clientWidth - 312 - widgets.size * 22); state.y = 12 + widgets.size * 22; }
      var el = document.createElement('section'); el.className = 'sb-widget'; el.dataset.widget = type; el.setAttribute('aria-label', title);
      el.innerHTML = '<div class="sb-widget-header">' + iconButton('move', 'Aracı taşı', 'move') + '<strong>' + title + '</strong>' + iconButton('x', 'Aracı kapat', 'close') + '</div><div class="sb-widget-body"></div>';
      el.querySelector('[data-sb-action="move"]').classList.add('sb-drag');
      host.appendChild(el);
      var w = { el: el, body: el.lastElementChild, state: state, dispose: function() {} };
      widgets.set(type, w);
      function bringForward() { widgets.forEach(function(other) { other.el.style.zIndex = '1'; }); el.style.zIndex = '2'; }
      el.addEventListener('pointerdown', bringForward); el.addEventListener('focusin', bringForward); bringForward();
      el.querySelector('[data-sb-action="close"]').addEventListener('click', function() { w.dispose(); el.remove(); widgets.delete(type); delete stored[type]; save(); });
      var handle = el.querySelector('[data-sb-action="move"]'), drag = null;
      handle.addEventListener('pointerdown', function(e) { e.preventDefault(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop }; handle.setPointerCapture(e.pointerId); });
      handle.addEventListener('pointermove', function(e) { if(!drag || drag.id !== e.pointerId) return; e.preventDefault(); state.x = Math.max(8, drag.left + e.clientX - drag.x); state.y = Math.max(8, drag.top + e.clientY - drag.y); position(w); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(name) { handle.addEventListener(name, function(e) { if(!drag || drag.id !== e.pointerId) return; drag = null; save(); }); });
      handle.addEventListener('keydown', function(e) {
        var delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
        if(!delta) return; e.preventDefault(); e.stopPropagation(); state.x = el.offsetLeft + delta[0]; state.y = el.offsetTop + delta[1]; position(w); save();
      });
      return w;
    }
    function openWidget(type) {
      if(widgets.has(type)) { widgets.get(type).el.querySelector('button').focus(); return; }
      var item = CATALOG.find(function(t) { return t[0] === type; }); if(!item) return;
      layout(); var w = baseWidget(type, item[1]), b = w.body, s = w.state;
      if(type === 'timer') timerWidget(w);
      if(type === 'random' || type === 'groups') namesWidget(w, type === 'groups');
      if(type === 'score') {
        s.scores = Array.isArray(s.scores) ? s.scores.slice(0, 2) : [0, 0]; s.names = Array.isArray(s.names) ? s.names : ['1. Takım', '2. Takım'];
        b.innerHTML = '<div class="sb-score-grid">' + [0, 1].map(function(i) { return '<div><input aria-label="' + (i + 1) + '. takım adı" maxlength="30"><output class="sb-score">0</output><div class="sb-actions">' + iconButton('minus', 'Puan azalt', 'less') + iconButton('plus', 'Puan ekle', 'more') + '</div></div>'; }).join('') + '</div>';
        Array.from(b.querySelector('.sb-score-grid').children).forEach(function(team, i) {
          var input = team.querySelector('input'), output = team.querySelector('output'); input.value = s.names[i]; output.value = Math.max(0, Number(s.scores[i]) || 0);
          input.addEventListener('input', function() { s.names[i] = input.value; save(); });
          team.querySelectorAll('button').forEach(function(button) { button.addEventListener('click', function() { s.scores[i] = Math.max(0, Math.min(9999, (Number(s.scores[i]) || 0) + (button.dataset.sbAction === 'more' ? 1 : -1))); output.value = s.scores[i]; save(); }); });
        });
      }
      if(type === 'signal') {
        b.innerHTML = '<div class="sb-signal">' + [['#c94e46', 'Sessizlik'], ['#e5af25', 'Hazırlanıyoruz'], ['#3d9560', 'Çalışıyoruz']].map(function(a, i) { return '<button type="button" style="--signal:' + a[0] + '" aria-label="' + a[1] + '" title="' + a[1] + '" data-signal="' + i + '"></button>'; }).join('') + '</div><output class="sb-result"></output><label>Çalışma biçimi<select><option>Bireysel çalışma</option><option>Eşli çalışma</option><option>Grup çalışması</option><option>Öğretmeni dinliyoruz</option></select></label>';
        var select = b.querySelector('select'); select.selectedIndex = Math.max(0, Math.min(3, Number(s.mode) || 0));
        function updateSignal() { b.querySelectorAll('[data-signal]').forEach(function(button) { button.setAttribute('aria-pressed', String(Number(button.dataset.signal) === (Number(s.light) || 0))); }); b.querySelector('output').textContent = ['Sessizlik', 'Hazırlanıyoruz', 'Çalışıyoruz'][Number(s.light) || 0]; }
        b.querySelectorAll('[data-signal]').forEach(function(button) { button.addEventListener('click', function() { s.light = Number(button.dataset.signal); updateSignal(); save(); }); });
        select.addEventListener('change', function() { s.mode = select.selectedIndex; save(); }); updateSignal();
      }
      if(type === 'note') {
        b.innerHTML = '<textarea class="sb-note" aria-label="Ders notu" maxlength="3000" placeholder="Dersin konusu, yönerge veya görev…"></textarea>';
        b.firstChild.value = String(s.text || '').slice(0, 3000); b.firstChild.addEventListener('input', function() { s.text = b.firstChild.value; save(); });
      }
      if(type === 'noise') noiseWidget(w);
      position(w); save();
    }
    function timerWidget(w) {
      var b = w.body, s = w.state, interval = null, audio = null;
      s.minutes = Math.max(1, Math.min(120, Number(s.minutes) || 5));
      s.running = !!s.running && Number.isFinite(s.deadline); s.left = Math.max(0, Number.isFinite(s.left) ? s.left : s.minutes * 60000);
      b.innerHTML = '<label>Süre (dakika)<input type="number" min="1" max="120"></label><output class="sb-readout" aria-live="off"></output><div class="sb-timer-track"><span></span></div><div class="sb-actions">' + iconButton('play', 'Başlat veya duraklat', 'toggle') + iconButton('rotate-ccw', 'Süreyi sıfırla', 'reset') + '<label class="sb-check"><input type="checkbox">Bitiş sesi</label></div>';
      var input = b.querySelector('input[type=number]'), toggle = b.querySelector('[data-sb-action=toggle]'); input.value = s.minutes;
      b.querySelector('input[type=checkbox]').checked = s.bell !== false;
      function paint() {
        var left = remaining(s, Date.now()), seconds = Math.ceil(left / 1000);
        b.querySelector('output').value = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
        b.querySelector('.sb-timer-track span').style.width = Math.min(100, left / (s.minutes * 60000) * 100) + '%';
        w.el.classList.toggle('is-finished', left === 0); input.disabled = s.running;
        toggle.innerHTML = icon(s.running ? 'pause' : 'play');
        if(left === 0 && s.running) {
          s.running = false; s.left = 0; clearInterval(interval); interval = null; save();
          if(audio && s.bell !== false) {
            var tone = audio.createOscillator(), gain = audio.createGain(); tone.frequency.value = 660; gain.gain.setValueAtTime(.12, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .7); tone.connect(gain); gain.connect(audio.destination); tone.start(); tone.stop(audio.currentTime + .7);
          }
          toggle.innerHTML = icon('play'); input.disabled = false;
        }
      }
      function startInterval() { clearInterval(interval); interval = setInterval(paint, 250); }
      toggle.addEventListener('click', function() {
        if(s.running) { s.left = remaining(s, Date.now()); s.running = false; clearInterval(interval); }
        else {
          if(!s.left) s.left = s.minutes * 60000;
          s.deadline = Date.now() + s.left; s.running = true; startInterval();
          try { var Audio = root.AudioContext || root.webkitAudioContext; if(Audio && s.bell !== false) { audio = audio || new Audio(); audio.resume().catch(function() {}); } } catch(error) {}
        }
        paint(); save();
      });
      b.querySelector('[data-sb-action=reset]').addEventListener('click', function() { s.running = false; s.left = s.minutes * 60000; clearInterval(interval); paint(); save(); });
      input.addEventListener('change', function() { s.minutes = Math.max(1, Math.min(120, Number(input.value) || 5)); input.value = s.minutes; s.left = s.minutes * 60000; paint(); save(); });
      b.querySelector('input[type=checkbox]').addEventListener('change', function(e) { s.bell = e.target.checked; save(); });
      if(s.running) startInterval(); paint();
      w.dispose = function() { clearInterval(interval); if(audio) audio.close().catch(function() {}); };
    }
    function namesWidget(w, groupMode) {
      var b = w.body, s = w.state, pool = [];
      b.innerHTML = '<label>Öğrenciler<textarea maxlength="5000" aria-label="Öğrenci listesi" placeholder="Her satıra bir öğrenci"></textarea></label>' +
        (groupMode ? '<label>Grup sayısı<input type="number" min="1" max="30" value="3"></label>' : '<label class="sb-check"><input type="checkbox" checked>Herkese sıra gelsin</label>') +
        '<button type="button" class="sb-command">' + (groupMode ? 'Grupları oluştur' : 'Öğrenci seç') + '</button><output class="sb-result" aria-live="polite"></output><div class="sb-group-list"></div>';
      var other = widgets.get(groupMode ? 'random' : 'groups');
      var names = b.querySelector('textarea'); names.value = String(s.names || (other && other.state.names) || '').slice(0, 5000);
      names.addEventListener('input', function() { s.names = names.value; pool = []; save(); });
      b.querySelector('.sb-command').addEventListener('click', function() {
        var list = splitNames(names.value), out = b.querySelector('output'), result = b.querySelector('.sb-group-list'); result.replaceChildren();
        if(!list.length) { out.textContent = 'Öğrenci listesi boş'; return; }
        if(groupMode) {
          var count = Math.max(1, Math.min(30, Number(b.querySelector('input').value) || 1));
          makeGroups(list, count).forEach(function(group, i) { var section = document.createElement('section'), title = document.createElement('strong'), body = document.createElement('div'); title.textContent = (i + 1) + '. Grup'; body.textContent = group.join(', '); section.append(title, body); result.appendChild(section); }); out.textContent = '';
        } else {
          if(!pool.length || !b.querySelector('input').checked) pool = shuffled(list);
          out.textContent = pool.pop();
        }
      });
    }
    function noiseWidget(w) {
      var b = w.body, stream = null, context = null, interval = null, generation = 0;
      b.innerHTML = '<div class="sb-noise-meter"><span></span></div><output class="sb-noise-label" aria-live="polite">Mikrofon kapalı</output><label>Hassasiyet<input type="range" min="1" max="12" value="5"></label><button class="sb-command" type="button">Mikrofonu aç</button>';
      var button = b.querySelector('button'), output = b.querySelector('output');
      function stop() {
        generation++; clearInterval(interval); interval = null;
        if(stream) stream.getTracks().forEach(function(track) { track.stop(); }); stream = null;
        if(context) context.close().catch(function() {}); context = null;
        button.textContent = 'Mikrofonu aç'; button.disabled = false; output.value = 'Mikrofon kapalı'; b.querySelector('.sb-noise-meter span').style.width = '0%';
      }
      button.addEventListener('click', async function() {
        if(stream) { stop(); return; }
        if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { output.value = 'Bu tarayıcıda mikrofon kullanılamıyor'; return; }
        var request = ++generation; button.disabled = true;
        try {
          var next = await navigator.mediaDevices.getUserMedia({ audio: true });
          if(request !== generation || !w.el.isConnected) { next.getTracks().forEach(function(t) { t.stop(); }); return; }
          stream = next; var Audio = root.AudioContext || root.webkitAudioContext; context = new Audio(); await context.resume();
          if(request !== generation || !context) { stop(); return; }
          var analyser = context.createAnalyser(); analyser.fftSize = 1024; context.createMediaStreamSource(stream).connect(analyser);
          var data = new Uint8Array(analyser.fftSize);
          interval = setInterval(function() {
            analyser.getByteTimeDomainData(data); var sum = 0;
            for(var i = 0; i < data.length; i++) { var n = (data[i] - 128) / 128; sum += n * n; }
            var level = Math.min(100, Math.sqrt(sum / data.length) * Number(b.querySelector('input').value) * 100);
            var bar = b.querySelector('.sb-noise-meter span'); bar.style.width = level + '%'; bar.style.background = level > 75 ? '#c94e46' : level > 45 ? '#c19124' : '#368650';
            var text = level > 75 ? 'Ses yüksek' : level > 45 ? 'Orta ses' : 'Sakin'; if(output.value !== text) output.value = text;
          }, 120);
          button.textContent = 'Mikrofonu kapat'; button.disabled = false;
        } catch(error) { stop(); output.value = 'Mikrofon açılamadı. Tarayıcı iznini kontrol edin.'; }
      });
      function onVisibility() { if(document.hidden) stop(); }
      document.addEventListener('visibilitychange', onVisibility);
      w.suspend = stop;
      w.dispose = function() { stop(); document.removeEventListener('visibilitychange', onVisibility); };
    }
    var imageInput = document.createElement('input'); imageInput.type = 'file'; imageInput.accept = 'image/png,image/jpeg,image/webp'; imageInput.hidden = true; catalog.appendChild(imageInput);
    imageInput.addEventListener('change', async function() {
      var file = imageInput.files[0]; if(!file) return;
      try { await api.addImage(file); closeCatalog(); } catch(error) { catalog.querySelector('.sb-status').textContent = error.message || 'Görsel açılamadı'; }
      imageInput.value = '';
    });
    document.addEventListener('keydown', function(e) { if(e.key === 'Escape' && (effect || !catalog.hidden)) { closeEffect(); closeCatalog(); } });
    root.addEventListener('scroll', queueLayout, { passive: true }); root.addEventListener('resize', queueLayout);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function(name) { document.addEventListener(name, queueLayout); });
    if(root.ResizeObserver) new ResizeObserver(queueLayout).observe(stage);
    root.addEventListener('pagehide', function() { save(); widgets.forEach(function(w) { w.dispose(); }); });
    Object.keys(stored).forEach(function(type) { if(['timer', 'random', 'groups', 'score', 'signal', 'note'].indexOf(type) >= 0) openWidget(type); });
    layout();
    return { closeEffect: closeEffect, layout: queueLayout, open: openWidget, setSandbox: function(active) {
      if(sandbox === !!active) return;
      sandbox = !!active; if(sandbox) closeEffect();
      widgets.forEach(function(w) { w.el.hidden = sandbox; if(sandbox && w.suspend) w.suspend(); });
    } };
  }
  root.SmartboardStudio = { init: init, splitNames: splitNames, makeGroups: makeGroups, remaining: remaining };
  if(typeof module !== 'undefined' && module.exports) module.exports = root.SmartboardStudio;
})(typeof window !== 'undefined' ? window : globalThis);
