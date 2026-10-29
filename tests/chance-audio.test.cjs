const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function setup({ available = true } = {}) {
  const { window, document } = parseHTML('<html><body></body></html>');
  const contexts = [], buffers = [], sources = [], gains = [], panners = [];
  const param = () => ({ value: 0, calls: [], setValueAtTime(value, time) { this.value = value; this.calls.push({ value, time }); }, cancelScheduledValues() {} });
  const audioNode = () => ({ connect() {}, disconnect() { this.disconnected = true; } });
  class AudioContext {
    constructor() { contexts.push(this); this.sampleRate = 24000; this.currentTime = 12; this.state = 'suspended'; this.destination = {}; }
    resume() { this.resumed = (this.resumed || 0) + 1; this.state = 'running'; return Promise.resolve(); }
    createGain() { const node = { ...audioNode(), gain: param() }; gains.push(node); return node; }
    createStereoPanner() { const node = { ...audioNode(), pan: param() }; panners.push(node); return node; }
    createBuffer(channels, length, sampleRate) { const data = new Float32Array(length); const buffer = { length, sampleRate, data, getChannelData: () => data }; buffers.push(buffer); return buffer; }
    createBufferSource() {
      const node = { ...audioNode(), playbackRate: param(), start(time) { this.startsAt = time; }, stop() { this.stopped = true; } };
      sources.push(node); return node;
    }
  }
  window.AudioContext = available ? AudioContext : undefined; window.webkitAudioContext = undefined;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/chance-audio.js'), 'utf8'), { window, document });
  return { window, document, api: window.ChanceAudio, contexts, buffers, sources, gains, panners };
}
const rms = data => Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);

test('probability audio stays silent on load and unlocks one context only after interaction', async () => {
  const q = setup(); assert.equal(q.contexts.length, 0); assert.equal(q.api.diceImpact(), false);
  assert.equal(await q.api.unlock(), true); assert.equal(await q.api.unlock(), true);
  assert.equal(q.contexts.length, 1); assert.equal(q.contexts[0].resumed, 1);
  const unavailable = setup({ available: false }); assert.equal(await unavailable.api.unlock(), false); assert.equal(unavailable.api.coinLaunch(), false);
});

test('plastic impacts, coin flicks and metal landings contain finite bounded transients with decaying energy', async () => {
  const q = setup(); await q.api.unlock(); q.api.diceImpact(); q.api.coinLaunch(); q.api.coinImpact();
  const [dice, flick, coin] = q.sources.map(source => source.buffer);
  assert(coin.length > flick.length && coin.length > dice.length);
  for (const buffer of [dice, flick, coin]) {
    assert(buffer.data.every(Number.isFinite)); assert(Math.max(...buffer.data.map(Math.abs)) <= .88);
    assert(rms(buffer.data.slice(0, 960)) > .025);
    assert(rms(buffer.data.slice(-240)) < rms(buffer.data.slice(0, 960)) / 5);
    assert.equal(buffer.data[0], 0);
  }
  assert.notDeepEqual([...dice.data.slice(0, 100)], [...coin.data.slice(0, 100)]);
});

test('impact scheduling respects collision offsets, strength and stereo position', async () => {
  const q = setup(); await q.api.unlock();
  q.api.diceImpact(.25, .4, -.75); const first = q.sources[0];
  assert.equal(first.startsAt, 12.4); assert.equal(q.panners[0].pan.value, -.75);
  assert.equal(q.gains[1].gain.value, .44);
  const before = q.sources.length; assert.equal(q.api.diceImpact(0), false); assert.equal(q.sources.length, before);
  q.api.coinImpact(NaN, Infinity, 9); assert.equal(q.sources[1].startsAt, 12); assert.equal(q.panners[1].pan.value, 1);
  q.api.coinImpact(.3, 100, -9); assert.equal(q.sources[2].startsAt, 15); assert.equal(q.panners[2].pan.value, -1);
});

test('muting cancels active and delayed voices immediately and unmuting restores playback', async () => {
  const q = setup(); await q.api.unlock(); q.api.coinLaunch(); q.api.coinImpact(1, .8);
  q.api.setEnabled(false); assert(q.sources.every(source => source.stopped)); assert.equal(q.gains[0].gain.value, 0);
  const count = q.sources.length; assert.equal(q.api.coinImpact(), false); assert.equal(q.sources.length, count);
  q.api.setEnabled(true); assert.equal(q.api.coinImpact(.4), true); assert(q.gains[0].gain.value > 0);
});

test('bounded sample variants avoid identical impacts and cached variants do not keep allocating', async () => {
  const q = setup(); await q.api.unlock();
  for (let i = 0; i < 20; i++) q.api.diceImpact();
  assert.equal(q.buffers.length, 4);
  assert.notDeepEqual([...q.sources[0].buffer.data.slice(0, 120)], [...q.sources[1].buffer.data.slice(0, 120)]);
  q.api.stop(); assert(q.sources.every(source => source.stopped && source.disconnected));
});

test('leaving the page stops probability audio without changing the sound preference', async () => {
  const q = setup(); await q.api.unlock(); q.api.coinImpact();
  Object.defineProperty(q.document, 'hidden', { configurable: true, value: true });
  q.document.dispatchEvent(new q.window.Event('visibilitychange'));
  assert(q.sources[0].stopped); assert.equal(q.api.diceImpact(), false);
  Object.defineProperty(q.document, 'hidden', { configurable: true, value: false }); assert.equal(q.api.diceImpact(), true);
});
