const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name, mocks = {}) {
  const file = path.join(root, 'src', name + '.ts');
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : id.startsWith('@/') ? load(id.slice(2), mocks) : require(id), URL, Date, console, setTimeout, clearTimeout, AbortController });
  return module.exports;
}
const reminders = load('platform/reminderModel'), dates = load('platform/dateTime'), updates = load('platform/updateModel');
const now = new Date(2026, 10, 1, 10, 0).getTime();
const reminder = { id: 'plan1', title: '  Okuma zamanı  ', date: '2026-11-02', time: '09:30', remind: true };
test('reminders require opt-in and valid future local dates/times', () => {
  const planned = reminders.planReminders('teacher', [reminder, { ...reminder, id: 'past', date: '2026-10-01' }, { ...reminder, id: 'invalid', date: '2026-02-31' }, { ...reminder, id: 'bad-time', time: '25:00' }, { ...reminder, id: 'silent-choice', remind: false }, { ...reminder, id: 'done', done: true }], now);
  assert.equal(planned.length, 1); assert.equal(planned[0].title, 'Okuma zamanı');
  assert.equal(planned[0].at, new Date(2026, 10, 2, 9, 30).getTime());
});
test('reminder scheduling supports advance minutes, stable deduplication and iOS-safe cap', () => {
  const planned = reminders.planReminders('teacher', [reminder, { ...reminder, minutesBefore: 15 }], now);
  assert.equal(planned.length, 1); assert.equal(planned[0].at, new Date(2026, 10, 2, 9, 15).getTime());
  assert.equal(reminders.planReminders('teacher', Array.from({ length: 80 }, (_, i) => ({ ...reminder, id: 'plan-' + i })), now).length, 40);
  assert.notEqual(reminders.planReminders('teacher', [reminder], now)[0].identifier, reminders.planReminders('other-user', [reminder], now)[0].identifier);
});
test('notification taps cannot launch arbitrary URLs or another account agenda', () => {
  assert.equal(reminders.reminderDestination({ kind: 'agenda-reminder-v2', owner: 'other', date: '2026-11-02', url: 'https://evil.test' }, 'teacher'), null);
  assert.equal(reminders.reminderDestination({ kind: 'agenda-reminder-v2', owner: 'teacher', date: '2026-02-31' }, 'teacher'), null);
  assert.equal(reminders.reminderDestination({ kind: 'external', owner: 'teacher', date: '2026-11-02', url: 'javascript:alert(1)' }, 'teacher'), null);
  assert.equal(reminders.reminderDestination({ kind: 'agenda-reminder-v2', owner: 'teacher', date: '2026-11-02' }, 'teacher').date, '2026-11-02');
});
test('native picker conversion keeps local calendar date and 24-hour clock', () => {
  const date = new Date(2026, 10, 2, 0, 5);
  assert.equal(dates.pickerValue(date, 'date'), '2026-11-02');
  assert.equal(dates.pickerValue(date, 'time'), '00:05');
  assert.equal(dates.pickerDate('23:59', 'time', date).getHours(), 23);
  assert.equal(dates.pickerDate('2026-11-02', 'date').getDate(), 2);
});
const release = (version, code, overrides = {}) => ({ tag_name: 'mobile-v4', body: `<!-- kemal-mobile-version:${version};android-code:${code} -->`, assets: [{ name: 'kemal-ogretmenim-v4.apk', browser_download_url: 'https://github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/mobile-v4/kemal-ogretmenim-v4.apk' }], ...overrides });
test('update check uses explicit version+code and ignores prerelease, unrelated releases and old mutable tags', () => {
  assert.equal(updates.availableUpdate([release('0.7.0', 7)], '0.6.0', 6).version, '0.7.0');
  for (const invalid of [release('0.5.0', 5), release('0.7.0', 6), release('0.7.0', 7, { prerelease: true }), release('0.7.0', 7, { draft: true }), release('0.7.0', 7, { tag_name: 'aquarium-v9.0.0' }), release('0.7.0', 7, { body: 'new APK published today' })]) assert.equal(updates.availableUpdate([invalid], '0.6.0', 6), null);
  assert.equal(updates.compareVersions('0.10.0', '0.9.9'), 1);
});
test('update download can only open the expected GitHub repository HTTPS APK', () => {
  for (const bad of ['https://evil.test/app.apk', 'http://github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/x/a.apk', 'https://github.com.evil.test/Kemalogretmen/kemalogretmenim-v4/releases/download/x/a.apk', 'https://github.com/other/repo/releases/download/x/a.apk', 'https://user:pass@github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/x/a.apk', 'https://github.com/Kemalogretmen/kemalogretmenim-v4/releases/download/x/a.html', 'javascript:alert(1)']) assert.equal(updates.safeApkUrl(bad), null);
});
function serviceHarness() {
  const pending = new Map(), presented = new Map(), calls = [];
  const notifications = {
    AndroidImportance: { HIGH: 6 }, AndroidNotificationVisibility: { PRIVATE: 2 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: () => {}, setNotificationChannelAsync: async (id, channel) => calls.push(['channel', id, channel]),
    getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }), requestPermissionsAsync: async () => { calls.push(['request']); return { granted: true, canAskAgain: true }; },
    getAllScheduledNotificationsAsync: async () => [...pending.values()], getPresentedNotificationsAsync: async () => [...presented.values()],
    cancelScheduledNotificationAsync: async id => { calls.push(['cancel', id]); pending.delete(id); }, dismissNotificationAsync: async id => presented.delete(id),
    scheduleNotificationAsync: async notification => { calls.push(['schedule', notification]); pending.set(notification.identifier, notification); return notification.identifier; },
  };
  const service = load('services/notifications', {
    'expo-constants': { expoConfig: {} }, 'expo-crypto': {}, 'expo-device': { isDevice: false }, 'expo-notifications': notifications,
    'expo-secure-store': {}, 'react-native': { Platform: { OS: 'android' } }, '@/constants/config': { APP_CONFIG: {} }, '@/lib/supabase': {},
  });
  return { service, calls, pending, presented, notifications };
}
test('device reminder reconciliation is idempotent, updates changes and cancels deleted items', async () => {
  const h = serviceHarness(); await h.service.setReminderAccount('teacher');
  const future = { ...reminder, date: '2035-11-02' };
  await h.service.reconcileAgendaReminders('teacher', [future]);
  await h.service.reconcileAgendaReminders('teacher', [future]);
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 1);
  const scheduled = h.calls.find(c => c[0] === 'schedule')[1];
  assert.equal(scheduled.content.sound, 'default'); assert.equal(scheduled.trigger.delivery, 'bestEffort');
  assert.equal(scheduled.trigger.channelId, 'agenda-reminders-v2');
  assert.equal(h.calls.filter(c => c[0] === 'request').length, 0);
  await h.service.reconcileAgendaReminders('teacher', [{ ...future, title: 'Yeni başlık' }]);
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 2);
  await h.service.reconcileAgendaReminders('teacher', []); assert.equal(h.pending.size, 0);
});
test('account switch clears old reminders and rejects stale account reconciliation', async () => {
  const h = serviceHarness(); await h.service.setReminderAccount('teacher');
  await h.service.reconcileAgendaReminders('teacher', [{ ...reminder, date: '2035-11-02' }]);
  assert.equal(h.pending.size, 1);
  await h.service.setReminderAccount('other'); assert.equal(h.pending.size, 0);
  await h.service.reconcileAgendaReminders('teacher', [{ ...reminder, date: '2035-11-02' }]); assert.equal(h.pending.size, 0);
  await h.service.clearAgendaReminders(); assert.equal(h.pending.size, 0);
});

const personal = load('platform/personalPlanModel');
const plan = { id: 'one', title: 'Kitap oku', date: '2026-11-02', time: '09:30', done: false, reminder: 5, updatedAt: 'server-revision-1', deletedAt: null };
test('personal plans validate local dates/time and strip arbitrary owner/database fields', () => {
  assert.throws(() => personal.validatePlanPatch({ date: '2026-02-31' }));
  assert.throws(() => personal.validatePlanPatch({ time: '29:00' }));
  assert.throws(() => personal.validatePlanPatch({ reminder: -1 }));
  const clean = personal.validatePlanPatch({ title: '  Kitap  ', user_id: 'other-account', deleted_at: 'bad' });
  assert.equal(clean.title, 'Kitap'); assert.equal(clean.user_id, undefined); assert.equal(clean.deleted_at, undefined);
  const normalized = personal.normalizePersonalPlan({ id: 'one', title: 'Kitap', event_date: '2026-11-02', event_time: '09:30:00', reminder_minutes: 5, updated_at: 'revision', deleted_at: null });
  assert.equal(normalized.time, '09:30'); assert.equal(normalized.reminder, 5);
});
test('personal row merge preserves unrelated remote edits and rejects same-field conflicts', () => {
  const operation = { id: 'op', itemId: 'one', kind: 'patch', before: plan, patch: { done: true }, createdAt: 'now' };
  const result = personal.applyPlanOperation({ ...plan, title: 'Uzaktaki yeni başlık' }, operation);
  assert.equal(result.title, 'Uzaktaki yeni başlık'); assert.equal(result.done, true);
  assert.throws(() => personal.applyPlanOperation({ ...plan, title: 'Uzaktaki yeni başlık' }, { ...operation, patch: { title: 'Benim başlığım' } }));
  assert.equal(personal.applyPlanOperation({ ...plan, done: true }, operation).done, true);
});
test('personal deletions remain tombstones and queued edits cannot resurrect a deleted plan', () => {
  const operation = { id: 'remove', itemId: 'one', kind: 'remove', before: plan, createdAt: '2026-11-01T18:00:00Z' };
  const deleted = personal.applyPlanOperation(plan, operation);
  assert.equal(deleted.deletedAt, operation.createdAt);
  assert.equal(personal.applyPlanOperation(deleted, operation).deletedAt, operation.createdAt);
  assert.throws(() => personal.applyPlanOperation(deleted, { ...operation, kind: 'patch', patch: { done: true } }));
  assert.throws(() => personal.applyPlanOperation({ ...plan, title: 'Başka cihaz değiştirdi' }, operation));
  const merged = personal.optimisticPlans([plan], [operation]); assert.equal(merged.length, 1); assert.ok(merged[0].deletedAt);
});
test('personal plan add retries are idempotent and outbox updates preserve other plans', () => {
  const add = { id: 'add', itemId: 'two', kind: 'add', patch: { title: 'Yeni plan', date: '2026-11-02', time: '', reminder: null }, createdAt: 'now' };
  const created = personal.applyPlanOperation(null, add);
  assert.equal(personal.applyPlanOperation(created, add).title, 'Yeni plan');
  const result = personal.optimisticPlans([plan], [add]); assert.equal(result.length, 2); assert.equal(result.find(p => p.id === 'one').title, plan.title);
  const fields = personal.planFields(created); assert.equal(fields.event_time, null); assert.equal(fields.reminder_minutes, null); assert.equal(fields.user_id, undefined);
});
test('personal plan schema restricts writes to active authenticated owner and keeps CAS/tombstones', () => {
  const sql = fs.readFileSync(path.join(root, '..', 'supabase-mobile-personal-plans.sql'), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all[\s\S]*from anon, authenticated/i);
  assert.match(sql, /grant select, insert, update[\s\S]*to authenticated/i);
  assert.equal((sql.match(/user_id = \(select auth\.uid\(\)\)/g) || []).length, 4);
  assert.match(sql, /coalesce\(p\.active, true\)/);
  assert.match(sql, /new\.user_id is distinct from old\.user_id/);
  assert.match(sql, /new\.updated_at := clock_timestamp\(\)/);
  assert.match(sql, /deleted_at timestamptz/);
  const hook = fs.readFileSync(path.join(root, 'src/platform/usePersonalPlans.tsx'), 'utf8');
  assert.match(hook, /\.eq\('updated_at', latest\.updatedAt\)/);
  assert.match(hook, /\.eq\('user_id', uid\)/);
});

test('teacher reminders retain web atTime/hour/day/week offsets and the all-day default',()=>{
 const events=['atTime','1h','1d','1w','', 'invalid'].map((value,i)=>({id:String(i),title:'Toplantı',date:'2035-11-15',time:'10:00',reminder:value}));
 const normalized=reminders.teacherAgendaReminders(events);
 assert.deepEqual(Array.from(normalized.map(x=>x.minutesBefore)),[0,60,1440,10080,undefined,undefined]);
 assert.equal(normalized[4].remind,false);assert.equal(normalized[5].remind,false);
 const allDay=reminders.teacherAgendaReminders([{id:'all',title:'Hazırlık',date:'2035-11-15',time:'',reminder:'atTime'}]);assert.equal(allDay[0].time,'09:00');
 const planned=reminders.planReminders('teacher',normalized,new Date(2035,10,1).getTime());
 assert.equal(planned.length,4);assert.equal(planned[0].at,new Date(2035,10,8,10).getTime());
});

test('an old reminder job cannot resume after A to B to A account switching',async()=>{
 const h=serviceHarness();await h.service.setReminderAccount('teacher');
 let release,entered;const barrier=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
 h.notifications.getPermissionsAsync=async()=>{entered();await barrier;return{granted:true,canAskAgain:true};};
 const old=h.service.reconcileAgendaReminders('teacher',[{...reminder,date:'2035-11-02'}]);
 await started;const b=h.service.setReminderAccount('other'),a=h.service.setReminderAccount('teacher');release();await Promise.all([old,b,a]);
 assert.equal(h.calls.filter(c=>c[0]==='schedule').length,0);
 await h.service.reconcileAgendaReminders('teacher',[{...reminder,date:'2035-11-02'}]);assert.equal(h.calls.filter(c=>c[0]==='schedule').length,1);
});
