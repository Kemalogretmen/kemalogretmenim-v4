const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { parseHTML } = require('linkedom');

const plannerHtml = fs.readFileSync(path.resolve(__dirname, '../../ogretmen-ajandasi/ders-programi.html'), 'utf8');
const plannerSource = [...plannerHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('function createInitialState()'))[1].replace(/^init\(\);$/m, '');
const payload = `Özel " ' & <img src=x onerror="globalThis.plannerInjected=true"><svg onload="globalThis.plannerInjected=true"></svg><script>globalThis.plannerInjected=true</script>`;
function harness() {
  const { window, document } = parseHTML(plannerHtml);
  document.querySelectorAll('select').forEach(select => Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return this.querySelector('option[selected]')?.value || this.querySelector('option')?.value || ''; },
    set(value) { this.querySelectorAll('option').forEach(option => option.toggleAttribute('selected', option.value === String(value))); },
  }));
  window.parent = window;
  window.location = { origin: 'https://planner-fixture.invalid', search: '' };
  window.innerWidth = 400; window.innerHeight = 800;
  window.setTimeout = () => 0; window.clearTimeout = () => {};
  const saved = new Map(), writes = [];
  const context = vm.createContext({
    window, document, console, Date, URLSearchParams,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, requestAnimationFrame: () => 0,
    alert() {}, confirm: () => true,
    localStorage: { getItem: key => saved.get(key) || null, setItem(key, value) { saved.set(key, value); writes.push({ key, value }); } },
  });
  const run = code => vm.runInContext(code, context);
  run(plannerSource);
  return { window, document, context, run, writes, state: () => JSON.parse(run('JSON.stringify(state)')) };
}
function assertTextOnly(root) {
  assert.equal(root.querySelectorAll('script,img,svg,iframe,object,embed,link,style').length, 0, 'stored text must not produce active elements');
  for (const element of root.querySelectorAll('*')) for (const attribute of element.attributes) assert.doesNotMatch(attribute.name, /^on/i, 'stored values must not create executable attributes');
  for (const template of root.querySelectorAll('template')) assertTextOnly(template.content);
}

test('imported class labels and quoted IDs render as text, and class/select/delete actions retain the exact ID', () => {
  const h = harness();
  const id = `class_');globalThis.plannerInjected=true;//\" onpointerdown=bad`;
  h.run(`state.siniflar = ${JSON.stringify([{ id, name: payload }])}; state.activeSinif = ${JSON.stringify(id)};`);
  const before = h.state();
  h.run('renderSinifList(); setActiveSinif = id => { globalThis.activatedId = id; }; deleteSinif = id => { globalThis.deletedId = id; };');
  const chips = h.document.getElementById('sinif-list'), select = h.document.getElementById('plan-sinif-select');
  assertTextOnly(chips); assertTextOnly(select);
  assert.ok(chips.textContent.includes(payload));
  assert.equal(select.value, id);
  assert.equal(select.querySelector('option[selected]').textContent, payload);
  chips.querySelector('.sinif-chip').dispatchEvent(new h.window.Event('click', { bubbles: true }));
  assert.equal(h.context.activatedId, id);
  delete h.context.activatedId;
  chips.querySelector('.del-btn').dispatchEvent(new h.window.Event('click', { bubbles: true }));
  assert.equal(h.context.deletedId, id);
  assert.equal(h.context.activatedId, undefined, 'delete must not trigger class selection');
  assert.equal(h.context.plannerInjected, undefined);
  assert.deepEqual(h.state(), before, 'rendering must not rewrite stored class labels or IDs');
  assert.equal(h.writes.length, 0);
});

test('uploaded subject keys, file names and dates cannot create markup or JavaScript, while delete still targets the original key', () => {
  const h = harness();
  const subject = `Custom');globalThis.plannerInjected=true;//\" <img src=x onerror=bad>`;
  h.run(`state.yillikPlanlar = ${JSON.stringify({ [subject]: [{ hafta: 1 }, { hafta: 2 }] })}; state.filesMeta = ${JSON.stringify({ [subject]: { name: payload, date: payload } })};`);
  const before = h.state();
  h.run('renderUploadedFiles(); deletePlan = subject => { globalThis.deletedSubject = subject; };');
  const files = h.document.getElementById('uploaded-files');
  assertTextOnly(files);
  assert.equal(files.querySelector('.file-name').textContent, payload);
  assert.equal(files.querySelector('.ders-badge').textContent, subject);
  assert.ok(files.querySelector('.file-status').textContent.includes('2 haftalık kayıt'));
  assert.ok(files.querySelector('.file-status').textContent.includes(payload));
  files.querySelector('button').dispatchEvent(new h.window.Event('click'));
  assert.equal(h.context.deletedSubject, subject);
  assert.equal(h.context.plannerInjected, undefined);
  assert.deepEqual(h.state(), before);
  assert.equal(h.writes.length, 0);
});

test('holiday labels and raw date fields remain literal text, with functional removal', () => {
  const h = harness();
  h.run(`state.tatiller = ${JSON.stringify([{ name: payload, start: payload, end: payload }, { name: 'Ara tatil', start: '2026-11-09', end: '2026-11-13' }])};`);
  const before = h.state();
  h.run('renderTatilList(); deleteTatil = index => { globalThis.deletedHoliday = index; };');
  const list = h.document.getElementById('tatil-list');
  assertTextOnly(list);
  assert.ok(list.querySelector('.tatil-row').textContent.includes(payload));
  list.querySelectorAll('.tatil-row')[1].querySelector('.btn-danger').dispatchEvent(new h.window.Event('click'));
  assert.equal(h.context.deletedHoliday, 1);
  assert.deepEqual(h.state(), before);
  assert.equal(h.writes.length, 0);
});

test('weekly plan and week picker escape imported labels, subjects, teachers, holidays and learning details', () => {
  const h = harness(), subject = 'Özel ders ' + payload;
  h.run(`
    state.siniflar = [{ id: 'safe-class', name: ${JSON.stringify(payload)} }];
    state.activeSinif = 'safe-class';
    state.programs = { 'safe-class': createEmptyProgram() };
    state.programs['safe-class'].Mon[0].ders = ${JSON.stringify(subject)};
    state.dersOgretmenleri[normalizeDersKey(${JSON.stringify(subject)})] = ${JSON.stringify(payload)};
    state.yillikPlanlar = ${JSON.stringify({ [subject]: [{ hafta: 8, tarihStart: '2026-11-02', tarihLabel: payload, kazanim: payload, surec: payload, additionalOutcomes: [{ kazanim: payload, surec: payload }] }] })};
    state.tatiller = [{ start: '2026-11-03', end: '2026-11-03', name: ${JSON.stringify(payload)} }];
    state.currentWeek = 8;
    state.settings.lessonCount = 5;
    ensureStateDefaults();
    renderSinifList();
  `);
  const before = h.state();
  h.run('buildWeekJumpOptions(); renderWeeklyPlan();');
  const plan = h.document.getElementById('weekly-plan-container'), weeks = h.document.getElementById('week-jump');
  assertTextOnly(plan); assertTextOnly(weeks);
  assert.ok(plan.textContent.includes(payload));
  assert.equal(plan.querySelector('.cell-ders-name').textContent, subject);
  assert.ok(plan.querySelector('.cell-teacher').textContent.includes(payload));
  assert.ok(Array.from(plan.querySelectorAll('thead th')).some(th => th.textContent.includes(payload)));
  assert.ok(weeks.textContent.includes(payload));
  const more = plan.querySelector('.learning-output-more');
  assert.ok(more, 'learning detail control must remain present');
  more.getBoundingClientRect = () => ({ left: 10, bottom: 30 });
  more.dispatchEvent(new h.window.Event('click', { bubbles: true }));
  const popover = h.document.getElementById('learning-output-popover');
  assertTextOnly(popover);
  assert.ok(popover.textContent.includes(payload));
  assert.equal(more.getAttribute('aria-expanded'), 'true');
  popover.querySelector('button').dispatchEvent(new h.window.Event('click'));
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  assert.equal(h.context.plannerInjected, undefined);
  assert.deepEqual(h.state(), before);
  assert.equal(h.writes.length, 0);
});

test('HTML escaping accepts imported scalar values without dropping zero or false', () => {
  const h = harness();
  assert.equal(h.run('escapeHtml(0)'), '0');
  assert.equal(h.run('escapeHtml(false)'), 'false');
  assert.equal(h.run('escapeHtml(null)'), '');
  assert.equal(h.run(`escapeHtml(${JSON.stringify(payload)})`).includes('<img'), false);
});
