(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KemalExamAnalysis = factory();
})(globalThis, function () {
  'use strict';

  const letters = 'ABCDEF';
  const text = value => String(value ?? '').trim();
  const answer = value => letters.includes(text(value).toUpperCase()) && text(value).length === 1 ? text(value).toUpperCase() : '';
  const percent = (count, total) => total ? Math.round(count * 1000 / total) / 10 : 0;

  function timestamp(value) {
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (Number.isFinite(value?.seconds)) return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const resultTime = result => timestamp(result.updated_at) || timestamp(result.date);

  function latestAttempts(results, examId) {
    const attempts = new Map();
    let unfinished = 0;
    results.forEach((result, index) => {
      if (text(result?.examId) !== text(examId)) return;
      if (['in_progress', 'started', 'pending'].includes(result.status)) { unfinished++; return; }
      const key = text(result.clientAttemptId) || 'record:' + index;
      const previous = attempts.get(key);
      const time = resultTime(result);
      const previousTime = previous ? resultTime(previous) : -1;
      if (!previous || time > previousTime || (time === previousTime && (result.answerDetails?.length || 0) > (previous.answerDetails?.length || 0))) {
        attempts.set(key, result);
      }
    });
    const students = new Map();
    for (const [attemptKey, result] of attempts) {
      const identity = text(result.accountUid || result.userId || result.studentKey || result.email);
      const key = identity ? 'student:' + identity : attemptKey;
      const previous = students.get(key);
      if (!previous || resultTime(result) > resultTime(previous)) students.set(key, result);
    }
    const anonymousRecords = [...students.values()].filter(result => !text(result.accountUid || result.userId || result.studentKey || result.email)).length;
    return { results: [...students.values()], anonymousRecords, unfinished, omittedAttempts: attempts.size - students.size };
  }

  function sectionLabel(number, sections) {
    const section = (Array.isArray(sections) ? sections : []).find(row => number >= Number(row.start) && number <= Number(row.end));
    return text(section?.label || section?.title);
  }

  function createBucket(label) {
    return { label, correct: 0, wrong: 0, blank: 0, total: 0, questionKeys: new Set() };
  }

  function finalize(bucket) {
    return {
      ...bucket,
      questionKeys: [...bucket.questionKeys],
      correctRate: percent(bucket.correct, bucket.total),
      wrongRate: percent(bucket.wrong, bucket.total),
      blankRate: percent(bucket.blank, bucket.total)
    };
  }

  function safeImage(source) {
    if (typeof source !== 'string' || !source.trim()) return '';
    try {
      const url = new URL(source, 'https://kemalogretmenim.com.tr');
      if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', 'exam.test'].includes(url.hostname))) return url.href;
      if (/^data:image\/(png|jpeg|webp);base64,/i.test(source)) return source;
    } catch (error) {}
    return '';
  }

  function build({ exam, questions = [], results = [], metadataUnavailable = false }) {
    const selected = latestAttempts(results, exam.id);
    const currentById = new Map(questions.filter(question => question.id).map(question => [text(question.id), question]));
    const items = new Map(), lessons = new Map(), outcomes = new Map();
    let withoutDetails = 0, invalidDetails = 0, unknownSelections = 0, withDetails = 0;
    let expectedResponses = 0, untagged = 0;
    for (const result of selected.results) {
      const details = Array.isArray(result.answerDetails) ? result.answerDetails : [];
      const declaredTotal = Number(result.total);
      expectedResponses += Number.isInteger(declaredTotal) && declaredTotal > 0 && declaredTotal <= 500 ? declaredTotal : details.length;
      if (!details.length) { withoutDetails++; continue; }
      let recorded = 0;
      const seen = new Set();
      for (const detail of details) {
        const number = Number(detail?.questionNo);
        const id = text(detail?.questionId);
        if (!Number.isInteger(number) || number < 1 || number > 500 || seen.has(number)) { invalidDetails++; continue; }
        seen.add(number);
        const current = id ? currentById.get(id) : questions.find(question => Number(question.order) + 1 === number);
        const archived = (Array.isArray(result.questions) ? result.questions : []).find((question, index) => id ? text(question.id) === id : index + 1 === number);
        // A stored answer key belongs to that attempt, including corrected or older revisions.
        const correctAnswer = answer(detail.correctAnswer) || answer(archived?.correctAnswer) || answer(current?.correctAnswer);
        const hasSelection = Object.hasOwn(detail, 'selectedAnswer');
        const rawSelection = text(detail.selectedAnswer);
        const chosen = answer(rawSelection);
        let outcome = '';
        if (hasSelection && rawSelection && !chosen) { invalidDetails++; continue; }
        if (hasSelection && !rawSelection) outcome = 'blank';
        else if (chosen && correctAnswer) outcome = chosen === correctAnswer ? 'correct' : 'wrong';
        else outcome = { D: 'correct', Y: 'wrong', B: 'blank' }[detail.outcome] || '';
        if (!outcome) { invalidDetails++; continue; }
        const metadata = archived || current;
        const lesson = text(detail.sectionTitle) || text(metadata?.sectionTitle)
          || sectionLabel(number, result.questionSections) || sectionLabel(number, exam.questionSections) || text(exam.subject) || 'Genel';
        const learningOutcome = text(detail.learningOutcome) || text(metadata?.learningOutcome);
        const key = JSON.stringify([number, id, correctAnswer, lesson, learningOutcome]);
        let item = items.get(key);
        if (!item) {
          const sameKey = current && (!correctAnswer || answer(current.correctAnswer) === correctAnswer);
          const imageUrl = safeImage(archived?.imageUrl || archived?.imageData || (sameKey && (current.imageUrl || current.imageData)));
          item = {
            ...createBucket(number + '. soru'), key, number, questionId: id, lesson, learningOutcome,
            correctAnswer, imageUrl, currentImage: !archived && !!imageUrl,
            choices: Object.fromEntries([...letters.slice(0, Math.min(6, Math.max(2, Number(exam.optionCount) || 4)))].map(letter => [letter, 0])),
            unknown: 0
          };
          if (correctAnswer) item.choices[correctAnswer] = 0;
          items.set(key, item);
        }
        item[outcome]++;
        item.total++;
        item.questionKeys.add(key);
        if (chosen) item.choices[chosen] = (item.choices[chosen] || 0) + 1;
        else if (outcome !== 'blank') { item.unknown++; unknownSelections++; }
        if (!lessons.has(lesson)) lessons.set(lesson, createBucket(lesson));
        const lessonBucket = lessons.get(lesson);
        lessonBucket[outcome]++;
        lessonBucket.total++;
        lessonBucket.questionKeys.add(key);
        if (learningOutcome) {
          const outcomeKey = JSON.stringify([lesson, learningOutcome]);
          if (!outcomes.has(outcomeKey)) outcomes.set(outcomeKey, { ...createBucket(learningOutcome), lesson });
          const bucket = outcomes.get(outcomeKey);
          bucket[outcome]++;
          bucket.total++;
          bucket.questionKeys.add(key);
        } else untagged++;
        recorded++;
      }
      if (recorded) withDetails++;
      else withoutDetails++;
    }
    const questionRows = [...items.values()].map(item => {
      const row = finalize(item);
      const distractors = Object.entries(row.choices).filter(([letter, count]) => row.correctAnswer && letter !== row.correctAnswer && count > 0);
      const max = Math.max(0, ...distractors.map(([, count]) => count));
      return {
        ...row,
        distractors: distractors.map(([letter, count]) => ({ letter, count, rate: percent(count, row.total), wrongRate: percent(count, row.wrong) })),
        topDistractors: distractors.filter(([, count]) => count === max).map(([letter]) => letter)
      };
    });
    const totals = questionRows.reduce((summary, item) => {
      for (const field of ['correct', 'wrong', 'blank', 'total']) summary[field] += item[field];
      return summary;
    }, createBucket('Sınav'));
    return {
      exam, metadataUnavailable, questions: questionRows, lessons: [...lessons.values()].map(finalize),
      outcomes: [...outcomes.values()].map(finalize), totals: finalize(totals),
      coverage: { students: selected.results.length, withDetails, withoutDetails, invalidDetails,
        expectedResponses, observedResponses: totals.total, unknownSelections, untagged,
        anonymousRecords: selected.anonymousRecords, omittedAttempts: selected.omittedAttempts, unfinished: selected.unfinished }
    };
  }

  function rank(rows, field) {
    return [...rows].sort((a, b) => (b[field] - a[field]) || (b.total - a.total) || (a.number || 0) - (b.number || 0) || a.label.localeCompare(b.label, 'tr'));
  }

  return { build, rank, percent };
});
