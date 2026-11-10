const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

// Synthetic fixtures only: these contexts never connect to Supabase or use a
// real browser's localStorage. The shared Map models a parent and its iframe.
const root = path.resolve(__dirname, '../..');
const origin = 'https://agenda-fixture.invalid';
const plannerKey = 'ogretmen_plan_v2';
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-02T12:00:00+03:00'])); }
  static now() { return Date.parse('2026-11-02T12:00:00+03:00'); }
}
function fixture() {
  return {
    agenda_state: {
      classes: [{ id: 'roster', name: '3/A' }], activeClassId: 'roster',
      students: [], exams: [], scheduleItems: [], calendarEvents: [],
      updatedAt: '2026-11-02T09:00:00Z',
    },
    lesson_planner_state: {
      version: 7, siniflar: [{ id: 'planner', name: '3/A' }], activeSinif: 'planner',
      programs: { planner: { Mon: [{ ders: 'MATEMATİK', isHoliday: false }] } },
      yillikPlanlar: { 'MATEMATİK': [{ hafta: 8, tarihStart: '2026-11-02', kazanim: 'Fixture outcome' }] },
      tatiller: [], settings: { lessonCount: 5, weekend: {} },
      totalWeeks: 36, currentWeek: 8,
    },
    updated_at: '2026-11-02T09:00:00Z',
    client_updated_at: '2026-11-02T09:00:00Z',
  };
}

function harness({ planner = null, startChild = false, queueMessages = false } = {}) {
  const saved = new Map(planner ? [[plannerKey, JSON.stringify(planner)]] : []);
  const writes = [];
  const localStorage = {
    getItem: key => saved.get(key) || null,
    setItem(key, value) { writes.push({ key, value: String(value) }); saved.set(key, String(value)); },
    removeItem: key => saved.delete(key),
  };
  const { document } = parseHTML(fs.readFileSync(path.join(root, 'ogretmen-ajandasi/index.html'), 'utf8'));
  const childDocument = parseHTML(fs.readFileSync(path.join(root, 'ogretmen-ajandasi/ders-programi.html'), 'utf8')).document;
  childDocument.querySelectorAll('select').forEach(select => {
    Object.defineProperty(select, 'value', {
      get() { return this.querySelector('option[selected]')?.value || this.querySelector('option')?.value || ''; },
      set(value) { this.querySelectorAll('option').forEach(option => option.toggleAttribute('selected', option.value === String(value))); },
    });
  });
  const childListeners = new Map();
  const queuedMessages = [];
  const childPosts = [];
  const parentWindow = { location: { origin }, addEventListener() {}, postMessage(data) { childPosts.push(data); } };
  const childWindow = {
    location: { origin, search: '' }, parent: parentWindow,
    addEventListener(type, callback) {
      const listeners = childListeners.get(type) || [];
      listeners.push(callback); childListeners.set(type, listeners);
    },
    postMessage(data, targetOrigin) {
      assert.equal(targetOrigin, origin);
      const message = { data, origin, source: parentWindow };
      if (queueMessages) queuedMessages.push(message);
      else for (const listener of childListeners.get('message') || []) listener(message);
    },
  };
  Object.defineProperty(document.getElementById('lessonPlannerFrame'), 'contentWindow', { value: childWindow });
  const globals = { console, Date: FixtureDate, TextEncoder, URLSearchParams, localStorage, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, requestAnimationFrame: () => 0, confirm: () => true, alert() {} };
  const parent = vm.createContext({ ...globals, window: parentWindow, document });
  const child = vm.createContext({ ...globals, window: childWindow, document: childDocument });
  const parentRun = code => vm.runInContext(code, parent);
  const childRun = code => vm.runInContext(code, child);
  parentRun(fs.readFileSync(path.join(root, 'ogretmen-ajandasi/app.js'), 'utf8'));
  parentRun("bindElements(); renderAll = () => {}; cloudSync.userId = 'fixture-teacher'; accessCloudRecovery = async () => {};");
  const childHtml = fs.readFileSync(path.join(root, 'ogretmen-ajandasi/ders-programi.html'), 'utf8');
  const childSource = [...childHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('function loadFromStorage()'))[1];
  // Skip automatic boot, then exercise the real storage, messages and rendering.
  childRun(childSource.replace(/^init\(\);$/m, ''));
  if (startChild) childRun('loadFromStorage(); ensureStateDefaults(); renderSinifList(); applyInitialWeekFocus();');
  return {
    saved, writes, parentRun, childRun, childPosts, childDocument,
    loadCloud(row = fixture()) { return parentRun(`applyCloudRow(${JSON.stringify(row)})`); },
    importBackup(backup) {
      parent.FileReader = class {
        readAsText() { this.result = JSON.stringify(backup); this.onload(); }
      };
      Object.defineProperty(document.getElementById('backupFile'), 'files', { value: [{}], configurable: true });
      parentRun('importBackup()');
    },
    message(data, { messageOrigin = origin, fromParent = true } = {}) {
      for (const listener of childListeners.get('message') || []) listener({ data, origin: messageOrigin, source: fromParent ? parentWindow : {} });
    },
    flushMessages() {
      while (queuedMessages.length) {
        const message = queuedMessages.shift();
        for (const listener of childListeners.get('message') || []) listener(message);
      }
    },
    childState() { return JSON.parse(childRun('JSON.stringify(state)')); },
    storedPlanner() { return JSON.parse(saved.get(plannerKey) || 'null'); },
  };
}

test('web cloud snapshots preserve the raw planner schema expected by native code', () => {
  const row = fixture(), h = harness({ planner: row.lesson_planner_state });
  const snapshot = JSON.parse(h.parentRun('JSON.stringify(buildCloudSnapshot())'));
  assert.deepEqual(snapshot.lessonPlannerState, row.lesson_planner_state);
  assert.equal(snapshot.lessonPlannerState.siniflar[0].id, 'planner');
  assert.equal(snapshot.lessonPlannerState.programs.planner.Mon[0].ders, 'MATEMATİK');
});

test('loading cloud after the iframe has initialized refreshes its visible planner classes', async () => {
  const h = harness({ startChild: true });
  assert.equal(h.childState().siniflar.length, 0);
  await h.loadCloud();
  assert.equal(h.storedPlanner().siniflar[0].id, 'planner');
  assert.equal(h.childState().siniflar[0]?.id, 'planner', 'cloud hydration must also refresh the already-loaded iframe');
  assert.match(h.childDocument.getElementById('sinif-list').textContent, /3\/A/);
  assert.equal(h.childDocument.getElementById('plan-sinif-select').value, 'planner');
  assert.match(h.childDocument.getElementById('weekly-plan-container').textContent, /Fixture outcome/);
});

test('opening the lesson view after cloud hydration cannot replace the loaded planner with stale iframe state', async () => {
  const h = harness({ startChild: true });
  await h.loadCloud();
  h.parentRun('syncLessonPlannerFrame()');
  assert.equal(h.storedPlanner().siniflar[0]?.id, 'planner');
  assert.equal(h.storedPlanner().programs.planner?.Mon[0].ders, 'MATEMATİK');
  assert.equal(h.storedPlanner().yillikPlanlar['MATEMATİK']?.[0].kazanim, 'Fixture outcome');
});

test('a focus message queued before cloud hydration cannot leave stale planner data in storage', async () => {
  const h = harness({ startChild: true, queueMessages: true });
  h.parentRun('syncLessonPlannerFrame()');
  await h.loadCloud();
  h.writes.length = 0;
  h.flushMessages();
  assert.equal(h.writes.filter(item => item.key === plannerKey).some(item => JSON.parse(item.value).siniflar.length === 0), false);
  assert.equal(h.storedPlanner().siniflar[0]?.id, 'planner');
  assert.equal(h.storedPlanner().programs.planner?.Mon[0].ders, 'MATEMATİK');
});

test('hydrating a planner renders without notifying the parent to save cloud data', async () => {
  const h = harness({ startChild: true });
  h.childPosts.length = 0;
  await h.loadCloud();
  assert.equal(h.childPosts.length, 0);
});

test('mobile import task stays on its requested tab when cloud focus arrives later', async () => {
  const h = harness({ startChild: true });
  await h.loadCloud();
  h.message({ type: 'kemal-ajanda-focus-week', date: '2026-11-02', plannerTab: 'tab-yukle' });
  assert.ok(h.childDocument.getElementById('tab-yukle').classList.contains('active'));
  assert.equal(h.childState().siniflar[0].id, 'planner');
  h.message({ type: 'kemal-ajanda-focus-week', date: '2026-11-02', plannerTab: 'foreign-tab' });
  assert.ok(h.childDocument.getElementById('tab-plan').classList.contains('active'));
});

test('importing a JSON backup also refreshes the already-loaded lesson planner', () => {
  const h = harness({ startChild: true }), row = fixture();
  h.importBackup({ ...row.agenda_state, lessonPlannerBackup: row.lesson_planner_state });
  assert.equal(h.childState().siniflar[0]?.id, 'planner');
  assert.match(h.childDocument.getElementById('weekly-plan-container').textContent, /Fixture outcome/);
});

test('a null remote planner preserves the existing planner and its visible classes', async () => {
  const row = fixture(), h = harness({ planner: row.lesson_planner_state, startChild: true });
  const before = h.storedPlanner();
  await h.loadCloud({ ...row, lesson_planner_state: null });
  assert.deepEqual(h.storedPlanner(), before);
  assert.equal(h.childState().siniflar[0]?.id, 'planner');
});

test('planner hydration ignores a foreign origin or a source other than its parent', () => {
  const h = harness({ startChild: true });
  const incoming = { type: 'kemal-ajanda-restore-planner', plannerState: fixture().lesson_planner_state, date: '2026-11-02' };
  h.message(incoming, { messageOrigin: 'https://foreign.invalid' });
  h.message(incoming, { fromParent: false });
  assert.equal(h.childState().siniflar.length, 0);
  assert.equal(h.storedPlanner().siniflar.length, 0);
});

test('malformed hydration messages leave the existing planner intact', () => {
  const row = fixture(), h = harness({ planner: row.lesson_planner_state, startChild: true });
  const before = h.storedPlanner();
  for (const plannerState of [null, [], {}, { ...row.lesson_planner_state, siniflar: [null] }, { ...row.lesson_planner_state, yillikPlanlar: { Bad: [null] } }]) {
    h.message({ type: 'kemal-ajanda-restore-planner', plannerState, date: '2026-11-02' });
  }
  assert.deepEqual(h.storedPlanner(), before);
  assert.equal(h.childState().siniflar[0]?.id, 'planner');
});
