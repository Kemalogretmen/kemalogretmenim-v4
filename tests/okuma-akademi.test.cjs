const assert = require('node:assert/strict');
const test = require('node:test');
const settings = require('../js/okuma-ayar.js');
const levels = require('../js/okuma-akademi-veri.js');
const content = require('../js/okuma-akademi-icerik.js');

test('only texts assigned to all eight grades expose a choice', () => {
  assert.equal(settings.isAllGrades({ siniflar: ['8', 1, 2, 3, 4, 5, 6, 7] }), true);
  assert.equal(settings.isAllGrades({ siniflar: [1, 2, 3, 4, 5, 6, 7, 7] }), false);
  assert.equal(settings.isAllGrades({ sinif: 1 }), false);
  assert.equal(settings.isAllGrades(null), false);
  assert.equal(settings.defaultWordMs, 1000);
  assert.ok(settings.minWordMs < settings.defaultWordMs && settings.maxWordMs > settings.defaultWordMs);
});

test('all academy levels have unique, playable activities and a guided reread', () => {
  const activityIds = new Set();
  assert.deepEqual(levels.map(level => level.id), ['temel', 'akici', 'anlama']);
  assert.equal(levels.flatMap(level => level.activities).length, 17);
  for (const level of levels) {
    assert.ok(level.activities.some(activity => activity.repeat));
    for (const activity of level.activities) {
      assert.ok(!activityIds.has(activity.id));
      activityIds.add(activity.id);
      assert.ok(activity.title && activity.task && activity.skill);
      assert.ok(content.categories[activity.category]);
      if (activity.passage) assert.ok(activity.passage.paragraphs.length > 1);
      if (activity.repeat) assert.ok(activity.secondTask && activity.passage);
      if (activity.sample) {
        assert.ok(activity.passage && activity.criteria.length === 3);
      } else {
        assert.ok(activity.questions.length > 1);
        for (const question of activity.questions) {
          assert.ok(question.prompt && question.options[question.correct] && question.explanation);
          assert.equal(new Set(question.options).size, question.options.length);
        }
      }
    }
  }
});

test('published content keeps plain text and rejects invalid answers', async () => {
  const row = {
    id: '9432647d-f2f3-49d8-9c74-35a3febcb42d',
    level_key: 'temel', category: 'attention', activity_type: 'quiz', title: '<em>Çalışma</em>', skill: 'Görsel takip',
    body: { task: 'Seç', questions: [{ prompt: 'Hangisi?', options: ['A', 'B'], correct: 1, explanation: 'İkincisi' }] }
  };
  assert.match(content.escapeHtml(content.toActivity(row).title), /^&lt;em&gt;/);
  assert.equal(content.toActivity({ ...row, level_key: '__proto__' }), null);
  assert.equal(content.toActivity({ ...row, body: { ...row.body, questions: [{ ...row.body.questions[0], correct: 2 }] } }), null);
  assert.throws(() => content.normalize({ ...row, activity_type: 'repeat' }), /metni zorunlu/);
  const items = await content.loadPublished({ supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'test' }, async url => {
    assert.equal(url.searchParams.get('is_published'), 'eq.true');
    return { ok: true, json: async () => [{ ...row, is_published: true }, { ...row, is_published: false }] };
  });
  assert.equal(items.length, 1);
});
