(function(root) {
  'use strict';
  function material(value) {
    value = value || {};
    var grain = Number(value.grain), spacing = Number(value.spacing);
    return {
      color: /^#[0-9a-f]{6}$/i.test(value.color) ? value.color.toLowerCase() : '#ddc394',
      grain: Math.max(.75, Math.min(3, Number.isFinite(grain) ? grain : 1)),
      mixed: value.mixed === true,
      lines: ['none', 'ruled', 'grid', 'handwriting'].indexOf(value.lines) > -1 ? value.lines : 'handwriting',
      spacing: Math.max(24, Math.min(96, Number.isFinite(spacing) ? spacing : 48))
    };
  }
  function rgb(hex) { return [1, 3, 5].map(function(i) { return parseInt(hex.slice(i, i + 2), 16); }); }
  function hash(x, y) {
    var n = Math.imul(x + 73, 374761393) ^ Math.imul(y + 131, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function texture(value, depth) {
    var m = material(value), tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    var ctx = tile.getContext('2d'), pixels = ctx.createImageData(256, 256), base = rgb(m.color);
    var palette = ['#e9c36a', '#d78f9b', '#77b9b5', '#719ecb', '#ae91c3', '#e2d8b5'].map(rgb);
    var cells = Math.round(256 / (.6 + m.grain * .45)), pitch = 256 / cells;
    for(var y = 0; y < 256; y++) for(var x = 0; x < 256; x++) {
      var cellX = Math.floor(x / pitch), cellY = Math.floor(y / pitch), best = Infinity, noise = 0, shadeSeed = 0, offsetY = 0;
      // Periodic, jittered grain centers avoid square pixels and visible tile seams.
      for(var gy = cellY - 1; gy <= cellY + 1; gy++) for(var gx = cellX - 1; gx <= cellX + 1; gx++) {
        var hx = (gx + cells) % cells, hy = (gy + cells) % cells;
        var dx = x - (gx + .15 + hash(hx, hy) * .7) * pitch;
        var dy = y - (gy + .15 + hash(hx + 37, hy + 17) * .7) * pitch;
        var distance = dx * dx + dy * dy;
        if(distance < best) { best = distance; noise = hash(hx + 53, hy); shadeSeed = hash(hx + 19, hy + 47); offsetY = dy; }
      }
      var tint = m.mixed ? palette[Math.floor(noise * palette.length)] : base;
      var shade = .81 + shadeSeed * .35;
      var light = (hash(x, y) - .5) * 13 - offsetY / pitch * 19 + (noise > .94 ? 15 : 0);
      var i = (y * 256 + x) * 4;
      for(var c = 0; c < 3; c++) {
        var channel = m.mixed ? tint[c] * .78 + base[c] * .22 : base[c];
        pixels.data[i + c] = Math.max(0, Math.min(255, (channel * shade + light) * (depth ? .68 : 1)));
      }
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return tile;
  }
  function paintMaterial(ctx, width, height, pattern) {
    ctx.save(); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height); ctx.restore();
  }
  function create(canvas) {
    var brushes = new Map(), history = [], audio = root.SmartSandSound.create(), leveling = null;
    var surface = material(), tones = rgb(surface.color);
    function tone(light, alpha) {
      return 'rgba(' + tones.map(function(c) { return Math.round(light ? c + (255 - c) * .65 : c * .42); }).join(',') + ',' + alpha + ')';
    }
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
        r.fillStyle = Math.sin(a) < 0 ? tone(true, .22) : tone(false, .12);
        var grain = Math.sqrt(surface.grain);
        r.beginPath(); r.ellipse(x, y, (.65 + wave * 1.1) * grain, (.5 + wave * .65) * grain, a, 0, Math.PI * 2); r.fill();
      }
      [-1, 1].forEach(function(side) {
        var middle = angle + side * Math.PI / 2;
        r.beginPath(); r.arc(center, center, radius * 1.04, middle - .38, middle + .38);
        r.strokeStyle = Math.sin(middle) < 0 ? tone(true, .09) : tone(false, .08); r.lineWidth = 1; r.stroke();
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
    function cancelLeveling() {
      if(!leveling)return;
      var pending=leveling;leveling=null;root.cancelAnimationFrame(pending.frame);pending.done();
    }
    function level(ctx,width,height,pattern,step,done,reduced) {
      cancelLeveling();audio.end();
      var state={frame:null,done:done,start:null,previous:0};leveling=state;
      function tick(time) {
        if(leveling!==state)return;
        if(state.start===null)state.start=time;
        var progress=reduced?1:Math.min(1,(time-state.start)/850),y=height*progress;
        ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=pattern;
        ctx.fillRect(0,Math.max(0,state.previous-1),width,y-state.previous+2);ctx.restore();state.previous=y;step(y);
        if(progress===1){leveling=null;done();}else state.frame=root.requestAnimationFrame(tick);
      }
      state.frame=root.requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange',function(){if(document.hidden)cancelLeveling();});
    root.addEventListener('pagehide',cancelLeveling);
    return { stroke: stroke, checkpoint: checkpoint, undo: undo, startSound: audio.begin, moveSound: audio.move, stopSound: audio.end,
      level:level,cancelLeveling:cancelLeveling,
      setMaterial: function(value) { surface = material(value); tones = rgb(surface.color); brushes.clear(); },
      retexture: function(ctx, width, height, pattern) {
        paintMaterial(ctx, width, height, pattern);
        history.forEach(function(copy) {
          var hctx = copy.getContext('2d'); hctx.save(); hctx.scale(copy.width / width, copy.height / height);
          paintMaterial(hctx, width, height, pattern); hctx.restore();
        });
      },
      setSound: audio.setEnabled, canUndo: function() { return history.length > 0; } };
  }
  create.material = material;
  create.texture = texture;
  root.createSmartSand = create;
  if(typeof module !== 'undefined' && module.exports) module.exports = create;
})(typeof window !== 'undefined' ? window : globalThis);
