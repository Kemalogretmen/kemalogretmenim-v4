const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

function setup(random = 0) {
  const html = fs.readFileSync(require.resolve('../ogretmen/matematik.html'), 'utf8');
  const { document, window } = parseHTML(html);
  const timers = [], sounds = [];
  window.setTimeout = (callback, delay) => timers.push({ callback, delay });
  const mode = document.getElementById('wheelNumberMode');
  const decimals = document.getElementById('wheelDecimalCount');
  for (const [element, value] of [[mode, 'integer'], [decimals, '2']])
    Object.defineProperty(element, 'value', { configurable: true, writable: true, value });
  const context = vm.createContext({ document, window, Math: Object.assign(Object.create(Math), { random: () => random }), playRotationSound: (...args) => sounds.push(args) });
  vm.runInContext(html.slice(html.indexOf('    function initNumberWheel()'), html.indexOf('    function buildCircleFractionSvg(')), context);
  vm.runInContext('initNumberWheel()', context);
  const change = (id, value, event = 'change') => {
    const element = document.getElementById(id); element.value = String(value);
    element.dispatchEvent(new window.Event(event));
  };
  return { document, window, change, sounds, timers, finish() { timers.splice(0).sort((a,b) => a.delay-b.delay).forEach(t => t.callback()); } };
}

test('integer mode retains twelve digits and cannot generate a leading zero', () => {
  const q = setup(); q.change('wheelDigitCount', 12, 'input');
  assert.equal(q.document.querySelectorAll('.digit-strip').length, 12);
  assert.equal(q.document.querySelector('.wheel-decimal-mark'), null);
  q.window.spinNumberWheel(); q.finish();
  assert.equal(q.document.getElementById('wheelResult').textContent, 'Sonuç: 100000000000');
});

test('decimal modes preserve one, two or three fractional digits including trailing zeroes', () => {
  for (const places of [1, 2, 3]) {
    const q = setup(); q.change('wheelNumberMode', 'decimal');
    q.change('wheelDigitCount', 1, 'input'); q.change('wheelDecimalCount', places);
    assert.equal(q.document.querySelectorAll('.is-fraction').length, places);
    assert.equal(q.document.querySelectorAll('.wheel-decimal-mark').length, 1);
    assert.equal(q.document.getElementById('wheelDecimalSettings').hidden, false);
    q.window.spinNumberWheel(); q.finish();
    assert.equal(q.document.getElementById('wheelResult').textContent, 'Sonuç: 0,' + '0'.repeat(places));
    assert.equal(q.document.getElementById('wheelContainer').getAttribute('aria-busy'), 'false');
  }
});

test('twelve integer and three decimal digits remain exact and repeat spins are blocked until completion', () => {
  const q = setup(.99999); q.change('wheelNumberMode', 'decimal');
  q.change('wheelDigitCount', 12, 'input'); q.change('wheelDecimalCount', 3);
  q.window.spinNumberWheel(); q.window.spinNumberWheel();
  assert.equal(q.sounds.length, 1);
  assert.equal(q.document.getElementById('wheelNumberMode').disabled, true);
  q.finish();
  assert.equal(q.document.getElementById('wheelResult').textContent, 'Sonuç: 999999999999,999');
  assert.equal(q.document.getElementById('wheelNumberMode').disabled, false);
  q.change('wheelNumberMode', 'integer');
  assert.equal(q.document.querySelectorAll('.is-fraction').length, 0);
  assert.equal(q.document.getElementById('wheelDecimalSettings').hidden, true);
  assert.equal(q.document.querySelectorAll('.digit-strip').length, 12);
});
