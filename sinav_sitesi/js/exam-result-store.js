(function() {
  'use strict';

  const EXAM_ATTEMPT_STORAGE_KEY = 'kemal_exam_attempt_id_v1';
  const PENDING_EXAM_RESULTS_KEY = 'kemal_exam_pending_results_v1';

  let deps = {
    db: null,
    addDoc: null,
    collection: null,
    serverTimestamp: function() {
      return new Date();
    },
    isTeacherSession: function() {
      return false;
    },
  };

  function configure(nextDeps) {
    deps = Object.assign({}, deps, nextDeps || {});
  }

  function createClientAttemptId() {
    const random = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    return 'exam_attempt_' + Date.now() + '_' + random;
  }

  function getAttemptId() {
    try {
      let attemptId = sessionStorage.getItem(EXAM_ATTEMPT_STORAGE_KEY) || '';
      if (!attemptId) {
        attemptId = createClientAttemptId();
        sessionStorage.setItem(EXAM_ATTEMPT_STORAGE_KEY, attemptId);
      }
      return attemptId;
    } catch (error) {
      return createClientAttemptId();
    }
  }

  function resetAttemptId() {
    const attemptId = createClientAttemptId();
    try {
      sessionStorage.setItem(EXAM_ATTEMPT_STORAGE_KEY, attemptId);
    } catch (error) {}
    return attemptId;
  }

  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getResultClientAttemptId(result) {
    return String(result && result.clientAttemptId || '').trim();
  }

  function dedupePendingResults(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).slice().reverse().filter(function(item) {
      const attemptId = getResultClientAttemptId(item);
      if (!attemptId) {
        return true;
      }
      if (seen.has(attemptId)) {
        return false;
      }
      seen.add(attemptId);
      return true;
    }).reverse();
  }

  function getPendingResults() {
    try {
      return dedupePendingResults(safeJsonParse(localStorage.getItem(PENDING_EXAM_RESULTS_KEY), []));
    } catch (error) {
      return [];
    }
  }

  function setPendingResults(list) {
    localStorage.setItem(PENDING_EXAM_RESULTS_KEY, JSON.stringify(dedupePendingResults(list || [])));
  }

  function queueResult(result) {
    if (!result || deps.isTeacherSession()) {
      return;
    }
    const pending = getPendingResults();
    pending.push(Object.assign({}, result, { queuedAt: new Date().toISOString() }));
    setPendingResults(pending);
  }

  function ensureFirestoreDeps() {
    if (!deps.db || typeof deps.addDoc !== 'function' || typeof deps.collection !== 'function') {
      throw new Error('Sinav sonuc kayit baglantisi hazir degil.');
    }
  }

  function buildPayloadAttempts(result) {
    const basePayload = {
      firstName: result.firstName,
      lastName: result.lastName,
      grade: parseInt(result.grade, 10) || result.grade,
      sube: result.sube,
      subject: result.subject,
      examTitle: result.examTitle,
      examId: result.examId,
      correct: result.correct,
      wrong: result.wrong,
      blank: result.blank,
      netCorrect: result.netCorrect,
      score: result.score,
      total: result.total,
      negativeMarking: result.negativeMarking || false,
      elapsed: result.elapsed,
      date: deps.serverTimestamp(),
    };
    return [
      {
        name: 'modern',
        data: Object.assign({}, basePayload, {
          accountUid: result.accountUid || '',
          email: result.email || '',
          studentKey: result.studentKey,
          clientAttemptId: result.clientAttemptId || '',
          score100: result.score100,
          examScore: result.examScore,
          scoreScale: result.scoreScale,
          answerDetails: result.answerDetails || [],
          questionSections: result.questionSections || [],
        }),
      },
      {
        name: 'legacy-v3',
        data: Object.assign({}, basePayload, {
          answerDetails: result.answerDetails || [],
          studentKey: result.studentKey || '',
          questionSections: result.questionSections || [],
        }),
      },
      {
        name: 'legacy-v2',
        data: Object.assign({}, basePayload, {
          answerDetails: result.answerDetails || [],
        }),
      },
      {
        name: 'legacy-v1',
        data: Object.assign({}, basePayload, {
          accountUid: result.accountUid || '',
          email: result.email || '',
          studentKey: result.studentKey,
          answerDetails: result.answerDetails || [],
          questionSections: result.questionSections || [],
        }),
      },
      {
        name: 'legacy-v0',
        data: Object.assign({}, basePayload),
      },
    ];
  }

  async function persistResultRecord(result, options) {
    const opts = options || {};
    if (deps.isTeacherSession()) {
      result.resultId = 'teacher-preview-' + Date.now();
      return result.resultId;
    }
    if (!result.clientAttemptId) {
      result.clientAttemptId = getAttemptId();
    }
    if (!opts.skipPendingFlush) {
      await flushPendingResults(result.clientAttemptId);
    }
    ensureFirestoreDeps();

    const payloadAttempts = buildPayloadAttempts(result);
    let lastError = null;
    for (const attempt of payloadAttempts) {
      try {
        const resultRef = await deps.addDoc(deps.collection(deps.db, 'results'), attempt.data);
        result.resultId = resultRef.id;
        if (attempt.name !== 'modern') {
          console.warn('Sonuc kaydi ' + attempt.name + ' uyumluluk moduyla olusturuldu.');
        }
        return resultRef.id;
      } catch (error) {
        lastError = error;
        const code = String(error && error.code || '').trim().toLowerCase();
        const message = String(error && error.message || '').toLowerCase();
        const canRetryLegacy =
          code === 'permission-denied' ||
          message.includes('missing or insufficient permissions') ||
          message.includes('permission denied');
        if (!canRetryLegacy) {
          throw error;
        }
        console.warn('Sonuc kaydi ' + attempt.name + ' semasiyla reddedildi, sonraki uyumluluk katmani deneniyor.', error);
      }
    }
    throw lastError || new Error('Sonuc kaydi olusturulamadi.');
  }

  async function flushPendingResults(skipAttemptId) {
    const pending = getPendingResults();
    if (!pending.length) {
      return;
    }
    const remaining = [];
    for (const item of pending) {
      if (skipAttemptId && getResultClientAttemptId(item) === skipAttemptId) {
        remaining.push(item);
        continue;
      }
      try {
        await persistResultRecord(Object.assign({}, item), {
          skipPendingFlush: true,
          fromQueue: true,
        });
      } catch (error) {
        remaining.push(item);
      }
    }
    setPendingResults(remaining);
  }

  window.KemalExamResultStore = {
    configure: configure,
    getAttemptId: getAttemptId,
    resetAttemptId: resetAttemptId,
    queueResult: queueResult,
    flushPendingResults: flushPendingResults,
    persistResultRecord: persistResultRecord,
    getPendingResults: getPendingResults,
  };
})();
