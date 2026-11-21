const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse, skipDuplicates, asReadingQuestion } = require('../js/okuma-soru-aktar.js');
const academy = require('../js/okuma-akademi-icerik.js');
const example = fs.readFileSync(require('node:path').join(__dirname, 'fixtures/gobeklitepe-sorular.txt'), 'utf8');

test('imports all ten pasted Markdown questions without assuming the answer', () => {
  const questions = parse(example);
  assert.equal(questions.length, 10);
  assert.ok(questions.every((question, index) => question.number === index + 1 && question.options.length === 4 && question.correct === -1));
  assert.equal(questions[0].prompt, 'Yazar, metinde anlatılan geziyi nereye ve hangi şehre yapmıştır?');
  assert.equal(questions[0].options[1], 'Göbeklitepe - Şanlıurfa');
  assert.match(questions[7].prompt, /12\.000/);
  assert.match(questions[9].options[2], /Şanlıurfa’nın kavurucu sıcağında/);
  assert.ok(asReadingQuestion(questions[0]).secenekler.every(option => !option.dogru_mu));
});

test('handles multiline options, inline keys, and a separate answer key', () => {
  const sample = '1) Test\r\n(A) Tek\r\nB. İki\r\nkelime\r\nC: Üç\r\n(Doğru Cevap: B)\r\n\r\n2. Soru? A) İlk B) İkinci C) Son\r\n**CEVAP ANAHTARI:** 1-B, 2: C';
  const [first, second] = parse(sample);
  assert.deepEqual(first.options, ['Tek', 'İki kelime', 'Üç']);
  assert.equal(first.correct, 1);
  assert.equal(second.correct, 2);
  assert.deepEqual(asReadingQuestion(second).secenekler.map(option => option.dogru_mu), [false, false, true]);
});

test('reports malformed questions without returning a partial import', () => {
  const good = '1. Soru? A) İlk B) İkinci C) Son';
  assert.throws(() => parse(good + '\n\n2. Bozuk A) İlk C) İkinci D) Son'), /2\. soru: seçenekler/);
  assert.throws(() => parse(good + '\nCevap Anahtarı: 1-E'), /şık seçeneklerde yok/);
  assert.throws(() => parse(good + '\nCevap Anahtarı: 3-A'), /3\. soru metinde yok/);
  assert.throws(() => parse(good + ' Doğru cevap: A\nCevap Anahtarı: 1-B'), /çelişen/);
  assert.throws(() => parse(good + '\nCevap Anahtarı: 1-B 2-F'), /okunamadı/);
  assert.throws(() => parse('1. Test A) A B) B C) C D) D E) E', { maxOptions: 4 }), /3–4/);
});

test('does not re-add an already present prompt and set of options', () => {
  const [first, second] = parse(example);
  const stored = { prompt: first.prompt.toLocaleLowerCase('tr-TR'), options: first.options.slice().reverse(), correct: 0 };
  assert.deepEqual(skipDuplicates([first, second, second], [stored]), [second]);
  assert.equal(stored.correct, 0);
});

test('academy can save imported questions without optional explanations', () => {
  const question = { ...parse(example)[0], correct: 1 };
  const row = { level_key: 'temel', category: 'comprehension', activity_type: 'quiz', title: 'Test', skill: 'Okuma', body: { task: 'Yanıtla.', questions: [question] } };
  assert.equal(academy.normalize(row).body.questions[0].explanation, '');
  assert.throws(() => academy.normalize({ ...row, body: { ...row.body, questions: [{ ...question, correct: -1 }] } }), /doğru seçeneği/);
});
