(function(root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  // A grabbed corner and its original position define the paper's fold line.
  // Reflection across their perpendicular bisector preserves the sheet's dimensions.
  function geometry(width, height, pointer, corner) {
    const w = Math.max(1, number(width, 1)), h = Math.max(1, number(height, 1));
    const c = { x: w, y: corner === 'top' ? 0 : h };
    const p = { x: clamp(number(pointer && pointer.x, w), -w, w), y: clamp(number(pointer && pointer.y, c.y), 0, h) };
    const distance = Math.hypot(p.x, p.y - c.y);
    if (distance > w) {
      p.x *= w / distance;
      p.y = c.y + (p.y - c.y) * w / distance;
    }
    const dx = c.x - p.x, dy = c.y - p.y, length = Math.hypot(dx, dy);
    const midpoint = { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 };
    const normal = length < .0001 ? { x: 1, y: 0 } : { x: dx / length, y: dy / length };
    const rectangle = [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
    function signed(point) { return (point.x - midpoint.x) * normal.x + (point.y - midpoint.y) * normal.y; }
    function clip(positive) {
      const result = [];
      rectangle.forEach(function(a, i) {
        const b = rectangle[(i + 1) % rectangle.length], da = signed(a), db = signed(b);
        const insideA = positive ? da >= 0 : da <= 0, insideB = positive ? db >= 0 : db <= 0;
        if (insideA) result.push(a);
        if (insideA !== insideB) {
          const t = da / (da - db);
          result.push({x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t});
        }
      });
      return result;
    }
    const dot = midpoint.x * normal.x + midpoint.y * normal.y;
    const reflection = [1 - 2 * normal.x * normal.x, -2 * normal.x * normal.y,
      -2 * normal.x * normal.y, 1 - 2 * normal.y * normal.y,
      2 * normal.x * dot, 2 * normal.y * dot];
    return { width:w, height:h, pointer:p, midpoint, normal, reflection,
      fixed:length < .0001 ? rectangle : clip(false), folded:length < .0001 ? [] : clip(true),
      progress:clamp((w - p.x) / (2 * w), 0, 1) };
  }

  function path(context, points) {
    context.beginPath();
    points.forEach((p, i) => i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y));
    context.closePath();
  }

  class PaperTurn {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.options = options;
      this.width = options.width;
      this.height = options.height;
      this.spread = !!options.spread;
      this.pageWidth = this.spread ? options.width / 2 : options.width;
      this.sign = options.direction === 'prev' ? -1 : 1;
      this.origin = this.spread ? options.width / 2 : (this.sign > 0 ? 0 : options.width);
      this.corner = options.corner === 'top' ? 'top' : 'bottom';
      this.cornerY = this.corner === 'top' ? 0 : options.height;
      this.margin = 28;
      const ratio = Math.min(1.5, root.devicePixelRatio || 1, Math.sqrt(4000000 / ((this.width + 56) * (this.height + 56))));
      canvas.width = Math.ceil((this.width + 56) * ratio);
      canvas.height = Math.ceil((this.height + 56) * ratio);
      canvas.style.width = this.width + 56 + 'px';
      canvas.style.height = this.height + 56 + 'px';
      canvas.style.left = canvas.style.top = '-28px';
      this.context = canvas.getContext('2d');
      this.ratio = ratio;
      this.point = {x:this.pageWidth,y:this.cornerY};
      this.frame = null;
      this.stopped = false;
    }

    texture(image, width, height, mirror) {
      const ctx = this.context;
      ctx.save();
      if (mirror) { ctx.translate(width, 0); ctx.scale(-1, 1); }
      ctx.fillStyle = '#fffefb';
      ctx.fillRect(0, 0, width, height);
      if (image) ctx.drawImage(image, 0, 0, width, height);
      ctx.restore();
    }

    render(pointer) {
      if (this.stopped) return;
      const ctx = this.context, w = this.pageWidth, h = this.height;
      const fold = geometry(w, h, pointer, this.corner);
      this.point = fold.pointer;
      this.progress = fold.progress;
      ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      ctx.clearRect(0, 0, this.width + 56, h + 56);
      ctx.translate(this.margin, this.margin);
      ctx.save();
      ctx.shadowColor = 'rgba(24,18,44,.18)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#fffefb'; ctx.fillRect(0, 0, this.width, h);
      ctx.restore();
      if (this.spread) {
        ctx.save(); ctx.translate(this.sign > 0 ? 0 : w, 0);
        this.texture(this.options.stationary, w, h, false); ctx.restore();
      }
      ctx.save();
      ctx.translate(this.spread && this.sign > 0 ? w : 0, 0);
      this.texture(this.options.under, w, h, false); ctx.restore();
      if (this.spread) {
        const spine = ctx.createLinearGradient(w - 10, 0, w + 10, 0);
        spine.addColorStop(0, 'rgba(25,18,37,0)'); spine.addColorStop(.5, 'rgba(25,18,37,.16)'); spine.addColorStop(1, 'rgba(25,18,37,0)');
        ctx.fillStyle = spine; ctx.fillRect(w - 10, 0, 20, h);
      }
      ctx.save(); ctx.translate(this.origin, 0); ctx.scale(this.sign, 1);
      if (fold.fixed.length) {
        ctx.save(); path(ctx, fold.fixed); ctx.clip();
        this.texture(this.options.front, w, h, this.sign < 0);
        if (fold.progress > .001) this.shade(fold, false);
        ctx.restore();
      }
      if (fold.folded.length && fold.progress > .0001) {
        ctx.save(); ctx.transform.apply(ctx, fold.reflection);
        path(ctx, fold.folded);
        const lift = Math.sin(Math.PI * fold.progress);
        ctx.shadowColor = 'rgba(20,14,32,' + (.13 + lift * .25) + ')';
        ctx.shadowBlur = 12 + lift * 24; ctx.shadowOffsetX = lift * 9; ctx.shadowOffsetY = lift * 10;
        ctx.fillStyle = '#fffefb'; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        ctx.clip();
        this.texture(this.options.back, w, h, this.sign > 0);
        this.shade(fold, true);
        ctx.restore();
      }
      ctx.restore();
    }

    shade(fold, back) {
      const ctx = this.context, n = fold.normal, m = fold.midpoint;
      const width = Math.max(12, Math.min(100, this.pageWidth * .16)) * (.45 + Math.sin(Math.PI * fold.progress) * .55);
      const side = back ? 1 : -1;
      const gradient = ctx.createLinearGradient(m.x, m.y, m.x + n.x * width * side, m.y + n.y * width * side);
      gradient.addColorStop(0, back ? 'rgba(21,17,33,.30)' : 'rgba(21,17,33,.21)');
      gradient.addColorStop(.17, back ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.18)');
      gradient.addColorStop(.55, back ? 'rgba(21,17,33,.07)' : 'rgba(21,17,33,.03)');
      gradient.addColorStop(1, 'rgba(21,17,33,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, this.pageWidth, this.height);
    }

    fromProgress(progress) {
      const p = clamp(progress, 0, 1);
      return {x:this.pageWidth * (1 - 2 * p), y:this.cornerY + (this.corner === 'top' ? 1 : -1) * Math.sin(Math.PI * p) * Math.min(this.height * .18, this.pageWidth * .3)};
    }

    animate(complete, duration, done) {
      if (this.stopped) return;
      if (this.frame !== null) root.cancelAnimationFrame(this.frame);
      const start = this.point, end = {x:complete ? -this.pageWidth : this.pageWidth,y:this.cornerY};
      let began;
      const tick = time => {
        if (this.stopped) return;
        if (began === undefined) began = time;
        const elapsed = clamp((time - began) / Math.max(1, duration), 0, 1);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        if (this.options.automatic) this.render(this.fromProgress(complete ? eased : 1 - eased));
        else this.render({x:start.x + (end.x - start.x) * eased,y:start.y + (end.y - start.y) * eased});
        if (elapsed < 1) this.frame = root.requestAnimationFrame(tick);
        else { this.frame = null; if (done) done(); }
      };
      this.frame = root.requestAnimationFrame(tick);
    }

    stop() {
      this.stopped = true;
      if (this.frame !== null) root.cancelAnimationFrame(this.frame);
      this.frame = null;
      this.options = {};
    }
  }

  root.KemalPaperTurn = { geometry, PaperTurn };
})(typeof window !== 'undefined' ? window : globalThis);
