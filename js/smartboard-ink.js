(function(root) {
  'use strict';
  function translucent(stroke) { return stroke.tool === 'highlighter' || stroke.tool === 'pencil'; }
  function union(a, b) {
    if(!a) return b;
    var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  }
  function create(api) {
    var records = new Map(), pending = null;
    function strokeBounds(stroke, points) {
      var style = api.style(stroke), pad = style.width / 2 + 3;
      var xs = points.map(function(p) { return p.x; }), ys = points.map(function(p) { return p.y; });
      var x = Math.min.apply(null, xs) - pad, y = Math.min.apply(null, ys) - pad;
      return { x: x, y: y, w: Math.max.apply(null, xs) + pad - x, h: Math.max.apply(null, ys) + pad - y };
    }
    function path(ctx, stroke, from, points) {
      var style = api.style(stroke);
      ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = style.color; ctx.lineWidth = style.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(from.x, from.y);
      points.forEach(function(p) { ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    }
    function get(stroke, rebuild) {
      var record = records.get(stroke), preview = api.preview;
      if(!record || record.canvas.width !== preview.width || record.canvas.height !== preview.height || rebuild) {
        var canvas = document.createElement('canvas'); canvas.width = preview.width; canvas.height = preview.height;
        var ctx = canvas.getContext('2d', { desynchronized: true }); ctx.setTransform(api.ratio(), 0, 0, api.ratio(), 0, 0);
        record = { canvas: canvas, ctx: ctx, bounds: strokeBounds(stroke, stroke.points) }; records.set(stroke, record);
        var first = stroke.points[0];
        path(ctx, stroke, first, stroke.points.length > 1 ? stroke.points.slice(1) : [{ x: first.x + .1, y: first.y + .1 }]);
      }
      return record;
    }
    function composite(target, stroke, record, bounds) {
      var ratio = api.ratio(), style = api.style(stroke);
      target.save(); target.globalAlpha = style.alpha; target.globalCompositeOperation = style.composite;
      target.drawImage(record.canvas, bounds.x * ratio, bounds.y * ratio, bounds.w * ratio, bounds.h * ratio, bounds.x, bounds.y, bounds.w, bounds.h); target.restore();
    }
    function clipped(bounds) {
      var x = Math.max(0, Math.floor(bounds.x)), y = Math.max(0, Math.floor(bounds.y));
      return { x: x, y: y, w: Math.max(0, Math.min(api.width(), Math.ceil(bounds.x + bounds.w)) - x), h: Math.max(0, Math.min(api.height(), Math.ceil(bounds.y + bounds.h)) - y) };
    }
    function render() {
      if(!pending) return;
      var bounds = clipped(pending); pending = null; if(!bounds.w || !bounds.h) return;
      var ctx = api.preview.getContext('2d'); ctx.clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
      records.forEach(function(record, stroke) { composite(ctx, stroke, record, bounds); });
    }
    function append(stroke, from, points) {
      var record = get(stroke), bounds = strokeBounds(stroke, [from].concat(points));
      path(record.ctx, stroke, from, points); record.bounds = union(record.bounds, bounds); pending = union(pending, bounds);
    }
    function finish(stroke, target) {
      var record = get(stroke), bounds = clipped(record.bounds);
      if(bounds.w && bounds.h) composite(target, stroke, record, bounds);
      records.delete(stroke); pending = union(pending, record.bounds); render();
    }
    function refresh(strokes) {
      records.forEach(function(record, stroke) { if(strokes.indexOf(stroke) < 0) records.delete(stroke); });
      strokes.filter(translucent).forEach(function(stroke) { get(stroke, true); });
      pending = { x: 0, y: 0, w: api.width(), h: api.height() }; render();
    }
    return { append: append, render: render, finish: finish, refresh: refresh };
  }
  root.SmartboardInk = { create: create, translucent: translucent };
})(typeof window !== 'undefined' ? window : globalThis);
