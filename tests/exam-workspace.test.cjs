const assert = require('node:assert/strict');
const test = require('node:test');
const workspace = require('../sinav_sitesi/js/exam-workspace.js');

test('section tabs keep the original question order and include unassigned questions', () => {
  const questions = ['Türkçe', 'Türkçe', 'Matematik', 'Türkçe', 'Hayat Bilgisi', ''];
  assert.deepEqual(workspace.groupSections(questions, label => label), [
    { label: 'Türkçe', indices: [0, 1, 3] },
    { label: 'Matematik', indices: [2] },
    { label: 'Hayat Bilgisi', indices: [4] },
    { label: 'Genel', indices: [5] }
  ]);
});

test('OCR finds column and inline options while omitting ambiguous or low-confidence labels', () => {
  const word = (text, x, y, confidence = 90) => ({ text, confidence, bbox: { x0: x, y0: y, x1: x + 20, y1: y + 20 } });
  const blocks = [{ paragraphs: [{ lines: [
    { words: [word('A)', 50, 150), word('Metin', 75, 150), word('B)', 175, 150)] },
    { words: [word('C', 50, 200), word(')', 65, 200), word('D)', 175, 200, 34)] },
    { words: [word('B)', 55, 20)] }
  ] }] }];
  assert.deepEqual(workspace.detectOptions(blocks, 250, 250, 4), { A: { x: .24, y: .64 }, C: { x: .27, y: .84 } });
  assert.deepEqual(workspace.normalizeOptions({ A: { x: -.1, y: .2 }, F: { x: .2, y: .3 } }, 3), {});
});

test('compact ink preserves margin positions and erase order and bounds the attempt payload', () => {
  const strokes = [
    { tool: 'pencil', color: '#EF4444', size: 4, points: [{ x: -.35, y: 1.2 }, { x: .42, y: .86 }] },
    { tool: 'eraser', size: 9, points: [{ x: .42, y: .86 }] }
  ];
  const [result] = workspace.captureInk(['image'], () => strokes, x => x).values();
  assert.equal(result.inkImage, workspace.visualKey('image'));
  assert.notEqual(result.inkImage, workspace.visualKey('different image'));
  const unpacked = workspace.unpackInk(result.ink);
  assert.deepEqual(unpacked[0], strokes[0]);
  assert.equal(unpacked[1].tool, 'eraser');
  assert.deepEqual(unpacked[1].points, strokes[1].points);
  assert.deepEqual(workspace.unpackInk('////'), []);

  const big = [{ ...strokes[0], points: Array.from({ length: 10000 }, (_, i) => ({ x: i / 10000, y: .5 })) }];
  const packed = [...workspace.captureInk(Array(500).fill('q'), () => big, x => x).values()];
  assert.ok(packed.every(result => workspace.unpackInk(result.ink).length === 1));
  assert.ok(packed.reduce((bytes, result) => bytes + result.ink.length, 0) <= 96000);
});

test('item analysis counts blanks, handles repeated writes and keeps different question revisions apart', () => {
  const detail = { questionNo: 1, questionId: 'question-1', correctAnswer: 'A' };
  const first = { clientAttemptId: 'one', answerDetails: [{ ...detail, selectedAnswer: 'A', outcome: 'D' }] };
  const blank = { clientAttemptId: 'two', answerDetails: [{ ...detail, selectedAnswer: '', outcome: 'B' }] };
  const revised = { answerDetails: [{ ...detail, questionId: 'revision', selectedAnswer: 'C', outcome: 'Y' }] };
  const [hard, old] = workspace.summarizeItems([first, first, blank, revised, { ...blank, status: 'in_progress' }]);
  assert.equal(hard.choices.C, 1);
  assert.equal(hard.percentCorrect, 0);
  assert.equal(old.total, 2);
  assert.equal(old.percentCorrect, 50);
  assert.equal(old.blank, 1);
});
