(function(root) {
  'use strict';
  function create(canvas) {
    var brushes = new Map(), history = [], sound = null, noise = null, soundFilter = null, enabled = false;
    function brush(width, angle) {
      var key = Math.round(width / 2) * 2, direction = Math.round(angle / (Math.PI * 2) * 24);
      var cacheKey = key + ':' + direction;
      if(brushes.has(cacheKey)) return brushes.get(cacheKey);
      var size = Math.ceil(key * 2), center = size / 2, radius = key / 2;
      var cut = document.createElement('canvas'), relief = document.createElement('canvas');
      cut.width = cut.height = relief.width = relief.height = size;
      var c = cut.getContext('2d'), r = relief.getContext('2d');
      var mask = c.createRadialGradient(center, center, radius * .62, center, center, radius * 1.08);
      mask.addColorStop(0, 'rgba(0,0,0,.98)'); mask.addColorStop(.7, 'rgba(0,0,0,.92)'); mask.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = mask; c.fillRect(0, 0, size, size);
      // Cached side-lit ridges and grains give depth without a full-surface simulation.
      for(var i = 0; i < 62; i++) {
        var a = i * 2.39996, wave = Math.sin(i * 17.73 + key) * .5 + .5;
        if(Math.abs(Math.cos(a - angle)) > .48) continue;
        var distance = radius * (1.03 + wave * .28);
        var x = center + Math.cos(a) * distance, y = center + Math.sin(a) * distance;
        r.fillStyle = Math.sin(a) < 0 ? 'rgba(255,244,207,.65)' : 'rgba(94,59,27,.3)';
        r.beginPath(); r.ellipse(x, y, .65 + wave * 1.1, .5 + wave * .65, a, 0, Math.PI * 2); r.fill();
      }
      [-1, 1].forEach(function(side) {
        var middle = angle + side * Math.PI / 2;
        r.beginPath(); r.arc(center, center, radius * 1.04, middle - .38, middle + .38);
        r.strokeStyle = Math.sin(middle) < 0 ? 'rgba(255,243,199,.5)' : 'rgba(103,65,29,.22)'; r.lineWidth = 1.5; r.stroke();
      });
      var result = { cut: cut, relief: relief, size: size, width: key };
      brushes.set(cacheKey, result);
      if(brushes.size > 96) brushes.delete(brushes.keys().next().value);
      return result;
    }
    function groove(ctx, from, to, width) {
      var b = brush(width, Math.atan2(to.y - from.y, to.x - from.x)), distance = Math.hypot(to.x - from.x, to.y - from.y);
      var steps = Math.max(1, Math.ceil(distance / Math.max(2, b.width * .21)));
      ctx.save();
      for(var i = 0; i <= steps; i++) {
        var x = from.x + (to.x - from.x) * i / steps - b.size / 2;
        var y = from.y + (to.y - from.y) * i / steps - b.size / 2;
        ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(b.cut, x, y);
        ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(b.relief, x, y);
      }
      ctx.restore();
    }
    function stroke(ctx, from, to, tool, width, pattern) {
      if(tool === 'smooth') {
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = pattern;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width * 3;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x + .01, to.y + .01); ctx.stroke(); ctx.restore(); return;
      }
      if(tool === 'rake') {
        var angle = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
        for(var t = 0; t < 4; t++) {
          var offset = (t - 1.5) * width * .5, x = Math.cos(angle) * offset, y = Math.sin(angle) * offset;
          groove(ctx, { x: from.x + x, y: from.y + y }, { x: to.x + x, y: to.y + y }, Math.max(5, width * .23));
        }
      } else groove(ctx, from, to, width);
    }
    function checkpoint() {
      if(!canvas.width || !canvas.height) return;
      var copy = document.createElement('canvas'), scale = Math.min(1, 900 / canvas.width, 600 / canvas.height);
      copy.width = Math.max(1, Math.round(canvas.width * scale)); copy.height = Math.max(1, Math.round(canvas.height * scale));
      copy.getContext('2d').drawImage(canvas, 0, 0, copy.width, copy.height);
      history.push(copy); if(history.length > 6) history.shift();
    }
    function undo(ctx, width, height) {
      var copy = history.pop(); if(!copy) return false;
      ctx.save(); ctx.clearRect(0, 0, width, height); ctx.drawImage(copy, 0, 0, width, height); ctx.restore(); return true;
    }
    function stopSound() {
      if(noise) { try { noise.stop(); } catch(error) {} noise.disconnect(); noise = null; }
      if(soundFilter) { soundFilter.disconnect(); soundFilter = null; }
    }
    function startSound() {
      if(!enabled) return;
      try {
        var Audio = root.AudioContext || root.webkitAudioContext; if(!Audio) return;
        sound = sound || new Audio(); sound.resume().catch(function() {}); stopSound();
        var buffer = sound.createBuffer(1, Math.floor(sound.sampleRate * .5), sound.sampleRate), data = buffer.getChannelData(0);
        for(var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .09;
        noise = sound.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        soundFilter = sound.createBiquadFilter(); soundFilter.type = 'lowpass'; soundFilter.frequency.value = 1500;
        noise.connect(soundFilter); soundFilter.connect(sound.destination); noise.start();
      } catch(error) { stopSound(); }
    }
    document.addEventListener('visibilitychange', function() { if(document.hidden) stopSound(); });
    root.addEventListener('pagehide', function() { stopSound(); if(sound) sound.close().catch(function() {}); sound = null; });
    return { stroke: stroke, checkpoint: checkpoint, undo: undo, startSound: startSound, stopSound: stopSound,
      setSound: function(value) { enabled = !!value; if(!enabled) stopSound(); }, canUndo: function() { return history.length > 0; } };
  }
  root.createSmartSand = create;
})(window);
