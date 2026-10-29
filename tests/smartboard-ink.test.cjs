const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Alpha-only rasterizer: verifies repeated segments cannot darken stroke joins.
class Canvas {
  constructor() { this.width = 320; this.height = 100; this.pixels = new Float32Array(32000); this.ctx = new Context(this); }
  getContext() { return this.ctx; }
}
class Context {
  constructor(canvas) { this.canvas = canvas; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; this.lineWidth = 10; this.stack = []; }
  setTransform() {}
  save() { this.stack.push({ globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation, lineWidth: this.lineWidth }); }
  restore() { Object.assign(this, this.stack.pop()); }
  beginPath() { this.points = []; }
  moveTo(x, y) { this.points.push({ x, y }); }
  lineTo(x, y) { this.points.push({ x, y }); }
  paint(x, y, alpha) {
    if(x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) return;
    const index = y * this.canvas.width + x, old = this.canvas.pixels[index];
    this.canvas.pixels[index] = alpha + old * (1 - alpha);
  }
  stroke() {
    for(let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1], b = this.points[i], dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
      for(let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - this.lineWidth)); y < Math.min(this.canvas.height, Math.ceil(Math.max(a.y, b.y) + this.lineWidth)); y++) {
        for(let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - this.lineWidth)); x < Math.min(this.canvas.width, Math.ceil(Math.max(a.x, b.x) + this.lineWidth)); x++) {
          const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0;
          if(Math.hypot(x - a.x - dx * t, y - a.y - dy * t) <= this.lineWidth / 2) this.paint(x, y, this.globalAlpha);
        }
      }
    }
  }
  clearRect(x, y, width, height) {
    for(let py = Math.floor(y); py < y + height; py++) for(let px = Math.floor(x); px < x + width; px++) {
      if(px >= 0 && py >= 0 && px < this.canvas.width && py < this.canvas.height) this.canvas.pixels[py * this.canvas.width + px] = 0;
    }
  }
  drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    for(let y = 0; y < dh; y++) for(let x = 0; x < dw; x++) {
      const sourceX = Math.floor(sx + x / dw * sw), sourceY = Math.floor(sy + y / dh * sh);
      const alpha = source.pixels[sourceY * source.width + sourceX] || 0;
      this.paint(Math.floor(dx + x), Math.floor(dy + y), alpha * this.globalAlpha);
    }
  }
}
function setup(alpha) {
  const window = {}, document = { createElement: () => new Canvas() };
  vm.runInNewContext(fs.readFileSync('js/smartboard-ink.js', 'utf8'), { window, document });
  const preview = new Canvas(), board = new Canvas();
  const ink = window.SmartboardInk.create({ preview, ratio: () => 1, width: () => 320, height: () => 100,
    style: () => ({ alpha, width: 12, color: '#ffffff', composite: 'source-over' }) });
  return { ink, preview, board };
}
for(const [tool, alpha] of [['highlighter', .26], ['pencil', .78]]) {
  test(`${tool}: joins stay uniform across many live batches, then commit only once`, () => {
    const { ink, preview, board } = setup(alpha), stroke = { tool, points: [{ x: 20, y: 50 }] };
    for(let x = 25; x <= 280; x += 5) {
      const from = stroke.points.at(-1), to = { x, y: 50 }; stroke.points.push(to);
      ink.append(stroke, from, [to]); ink.render();
    }
    for(let x = 25; x <= 275; x++) assert(Math.abs(preview.pixels[50 * 320 + x] - alpha) < .00001, `Uneven live alpha at ${x}`);
    assert.equal(board.pixels.some(Boolean), false, 'The permanent board stays untouched until commit');
    ink.finish(stroke, board.ctx);
    for(let x = 25; x <= 275; x++) assert(Math.abs(board.pixels[50 * 320 + x] - alpha) < .00001);
    assert.equal(preview.pixels.some(Boolean), false, 'No doubled preview remains after release');
  });
}
test('two separate highlighter strokes overlap naturally, and cancelling another preview leaves no ink', () => {
  const { ink, board, preview } = setup(.26);
  for(let i = 0; i < 2; i++) {
    const stroke = { tool: 'highlighter', points: [{ x: 30, y: 50 }, { x: 250, y: 50 }] };
    ink.append(stroke, stroke.points[0], [stroke.points[1]]); ink.render(); ink.finish(stroke, board.ctx);
  }
  assert(Math.abs(board.pixels[50 * 320 + 100] - (1 - .74 ** 2)) < .00001);
  const cancelled = { tool: 'pencil', points: [{ x: 20, y: 20 }, { x: 200, y: 20 }] };
  ink.append(cancelled, cancelled.points[0], [cancelled.points[1]]); ink.render(); ink.refresh([]);
  assert.equal(preview.pixels.some(Boolean), false);
  assert.equal(board.pixels[20 * 320 + 100], 0);
});
