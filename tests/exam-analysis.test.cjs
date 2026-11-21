const test = require('node:test');
const assert = require('node:assert/strict');
const { build, rank } = require('../sinav_sitesi/js/exam-analysis.js');

const exam = { id: 'weekly9', title: 'Haftalık Deneme 9', subject: 'Deneme', optionCount: 4 };
const questions = [
  { id: 'q1', order: 0, correctAnswer: 'A', sectionTitle: 'Türkçe', learningOutcome: 'Ana fikir', imageUrl: 'https://example.com/q1.png' },
  { id: 'q2', order: 1, correctAnswer: 'B', sectionTitle: 'Türkçe', learningOutcome: 'Ana fikir', imageUrl: 'https://example.com/q2.png' },
  { id: 'q3', order: 2, correctAnswer: 'C', sectionTitle: 'Matematik', learningOutcome: 'Kesirler', imageUrl: 'https://example.com/q3.png' },
  { id: 'q4', order: 3, correctAnswer: 'D', sectionTitle: 'Matematik', learningOutcome: '', imageUrl: 'https://example.com/q4.png' }
];
function attempt(id, answers, overrides = {}) {
  return { examId: exam.id, accountUid: id, clientAttemptId: 'attempt-' + id, total: 4, date: { seconds: 100 },
    answerDetails: questions.map((question, index) => ({ questionNo: index + 1, questionId: question.id,
      correctAnswer: question.correctAnswer, selectedAnswer: answers[index], sectionTitle: question.sectionTitle,
      learningOutcome: question.learningOutcome, outcome: answers[index] ? answers[index] === question.correctAnswer ? 'D' : 'Y' : 'B' })), ...overrides };
}
const results = [attempt('one', ['B', 'B', 'A', 'D']), attempt('two', ['B', 'B', 'A', 'D']),
  attempt('three', ['C', 'B', '', 'D']), attempt('four', ['A', '', 'C', 'D'])];

test('lesson, outcome and question counts use observed responses and separate blanks', () => {
  const report = build({ exam, questions, results });
  assert.equal(report.coverage.students, 4);
  assert.equal(report.totals.total, 16);
  assert.equal(report.totals.correct, 9);
  assert.equal(report.totals.wrong, 5);
  assert.equal(report.totals.blank, 2);
  const [turkish, math] = report.lessons;
  assert.equal(turkish.wrongRate, 37.5);
  assert.equal(math.wrongRate, 25);
  assert.equal(math.correctRate, 62.5);
  assert.equal(rank(report.questions, 'wrongRate')[0].number, 1);
  assert.equal(rank(report.questions, 'correctRate')[0].number, 4);
  assert.equal(report.outcomes.length, 2);
  assert.equal(report.coverage.untagged, 4);
  const first = report.questions[0];
  assert.deepEqual(first.topDistractors, ['B']);
  assert.deepEqual(first.distractors[0], { letter: 'B', count: 2, rate: 50, wrongRate: 66.7 });
  assert.equal(first.wrongRate, 75);
});

test('last completed student attempt wins, duplicate retry counts once and other exams never enter', () => {
  const old = attempt('one', ['A', 'B', 'C', 'D']);
  const newest = attempt('one', ['B', 'A', 'A', 'A'], { clientAttemptId: 'new', date: { seconds: 300 } });
  const unfinished = attempt('one', ['A', 'B', 'C', 'D'], { clientAttemptId: 'ongoing', date: { seconds: 400 }, status: 'in_progress' });
  const report = build({ exam, questions, results: [old, newest, newest, unfinished, { ...newest, examId: 'different' }] });
  assert.equal(report.coverage.students, 1);
  assert.equal(report.coverage.omittedAttempts, 1);
  assert.equal(report.coverage.unfinished, 1);
  assert.equal(report.totals.wrong, 4);
});

test('legacy missing details, malformed and repeated entries do not manufacture blanks', () => {
  const incomplete = attempt('one', ['A', 'B', 'C', 'D']);
  incomplete.answerDetails = [incomplete.answerDetails[0], incomplete.answerDetails[0], { questionNo: -1 },
    { questionNo: 2, selectedAnswer: 'X', correctAnswer: 'A' }, { questionNo: 3, selectedAnswer: 'A' }];
  const legacy = attempt('two', [], { answerDetails: [] });
  const report = build({ exam, questions, results: [incomplete, legacy] });
  assert.equal(report.coverage.withDetails, 1);
  assert.equal(report.coverage.withoutDetails, 1);
  assert.equal(report.coverage.invalidDetails, 3);
  assert.equal(report.coverage.observedResponses, 2);
  assert.equal(report.coverage.expectedResponses, 8);
  assert.equal(report.totals.blank, 0);
});

test('older question IDs and changed answer keys never borrow an unrelated preview', () => {
  const old = attempt('old', ['B', 'B', 'C', 'D']);
  old.answerDetails = [{ ...old.answerDetails[0], questionId: 'old-q1', correctAnswer: 'B' }];
  const changedKey = attempt('changed', ['B', 'B', 'C', 'D']);
  changedKey.answerDetails = [{ ...changedKey.answerDetails[0], correctAnswer: 'B' }];
  const fresh = attempt('new', ['B', 'B', 'C', 'D']);
  fresh.answerDetails = [fresh.answerDetails[0]];
  const report = build({ exam, questions, results: [old, changedKey, fresh] });
  assert.equal(report.questions.length, 3);
  assert.equal(report.questions[0].imageUrl, '');
  assert.equal(report.questions[1].imageUrl, '');
  assert.equal(report.questions[2].imageUrl, questions[0].imageUrl);
  assert.equal(report.questions[0].correct, 1);
});

test('unknown selected choices are explicit and tied distractors all appear', () => {
  const unknown = attempt('unknown', ['A', 'B', 'C', 'D']);
  unknown.answerDetails = [{ questionNo: 1, questionId: 'q1', correctAnswer: 'A', outcome: 'Y' }];
  const b = attempt('b', ['B', 'B', 'C', 'D']); b.answerDetails.length = 1;
  const c = attempt('c', ['C', 'B', 'C', 'D']); c.answerDetails.length = 1;
  const report = build({ exam, questions, results: [unknown, b, c] });
  assert.equal(report.coverage.unknownSelections, 1);
  assert.equal(report.questions[0].unknown, 1);
  assert.deepEqual(report.questions[0].topDistractors, ['B', 'C']);
  assert.equal(report.questions[0].wrongRate, 100);
});

test('section config and metadata support older details and remote timestamps decide newer attempts', () => {
  const base = attempt('one', ['A', 'B', 'C', 'D'], { date: '18.11.2026', updated_at: '2026-11-18T10:00:00Z' });
  const later = attempt('one', ['B', 'B', 'C', 'D'], { clientAttemptId: 'later', date: '18.11.2026', updated_at: '2026-11-18T11:00:00Z', questionSections: [{ label: 'Türkçe', start: 1, end: 4 }] });
  later.answerDetails = [{ questionNo: 1, selectedAnswer: 'B', correctAnswer: 'A' }];
  const report = build({ exam, results: [base, later] });
  assert.equal(report.lessons[0].label, 'Türkçe');
  assert.equal(report.totals.wrong, 1);
});

test('no participants produces a finite empty report', () => {
  const report = build({ exam, results: [] });
  assert.equal(report.totals.correctRate, 0);
  assert.equal(report.coverage.students, 0);
  assert.deepEqual(report.questions, []);
});
