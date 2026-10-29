const test = require('node:test');
const assert = require('node:assert/strict');
const Studio = require('../js/smartboard-studio.js');

test('class groups include every student once and differ in size by at most one', () => {
  const students = Array.from({ length: 31 }, (_, i) => `Öğrenci ${i + 1}`);
  for(const count of [1, 2, 3, 6, 40]) {
    const groups = Studio.makeGroups(students, count);
    assert.deepEqual(groups.flat().sort(), students.slice().sort());
    const lengths = groups.map(g => g.length);
    assert(Math.max(...lengths) - Math.min(...lengths) <= 1);
    assert(lengths.every(n => n > 0));
  }
});
test('visual timer uses the deadline even after a background pause or reload', () => {
  const timer = { running: true, deadline: 100000, left: 60000 };
  assert.equal(Studio.remaining(timer, 70000), 30000);
  assert.equal(Studio.remaining(timer, 130000), 0);
  assert.equal(Studio.remaining({ running: false, left: 12345 }, 999999), 12345);
});
