(function(root) {
  'use strict';

  function isAllGrades(text) {
    const grades = new Set((Array.isArray(text?.siniflar) ? text.siniflar : []).map(Number));
    return [1, 2, 3, 4, 5, 6, 7, 8].every(grade => grades.has(grade));
  }

  const api = { isAllGrades, defaultWordMs: 1000, minWordMs: 300, maxWordMs: 3000 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReadingSettings = api;
})(globalThis);
