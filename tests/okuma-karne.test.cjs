const { test } = require('node:test');
const assert = require('node:assert/strict');
const { previousAttempts, pageCuts } = require('../js/okuma-karne-araclari.js');

test('reading history keeps at most four past attempts for the signed-in student', () => {
  const date = day => '2026-11-' + String(day).padStart(2, '0') + 'T12:00:00.000Z';
  const attempt = (day, extra = {}) => ({ id: 'attempt-' + day, date: date(day), speed: 45 + day, comprehension: 75, ...extra });
  const current = attempt(16);
  const own = { type: 'reading', status: 'completed', title: 'Birinci metin',
    meta: { accountUid: 'student', readingAttempts: [attempt(10), attempt(11), attempt(12), attempt(14), current, attempt(17)] } };
  const localOther = { ...own, meta: { accountUid: 'another-student', readingAttempts: [attempt(15, { id: 'private' })] } };
  const remote = { user_id: 'student', content_type: 'reading', status: 'completed', title: 'Diğer metin',
    detail_json: { meta: { accountUid: 'student', attemptId: 'attempt-15', wpm: 100, total: 0,
      readingFlow: 'kelime-otomatik', readingResult: { tarih: date(15) } } } };
  const spoofed = { ...remote, user_id: 'someone-else' };
  assert.deepEqual(previousAttempts([own, localOther, remote, remote], 'student', current).map(x => x.id),
    ['attempt-15', 'attempt-14', 'attempt-12', 'attempt-11']);
  const [last] = previousAttempts([remote], 'student', current);
  assert.equal(last.comprehension, null);
  assert.equal(last.mode, 'kelime-otomatik');
  assert.deepEqual(previousAttempts([localOther, spoofed], 'student', current), []);
  assert.deepEqual(previousAttempts([own], '', current), []);
});

test('PDF uses content boundaries without exceeding available page height', () => {
  assert.deepEqual(pageCuts(2300, 900, [1400, 860, 100, 1610, 2260]), [860, 1610, 2300]);
  assert.deepEqual(pageCuts(2000, 900, []), [900, 1800, 2000]);
});
