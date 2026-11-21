(function () {
  'use strict';

  let context = { classes: [], students: [], records: [], ownerId: '', canAnalyze: false };
  const examSelect = document.getElementById('teacherAnalysisExam');
  const classSelect = document.getElementById('teacherAnalysisClass');
  const button = document.getElementById('teacherExamAnalysisBtn');
  const status = document.getElementById('teacherAnalysisStatus');
  if (!examSelect || !classSelect || !button) return;
  let selectionOwner = '';
  let catalogSignature = '';
  let catalog = [];

  function profileIds(classId) {
    return [...new Set(context.students.filter(student => student.status !== 'removed' && (!classId || String(student.class_id) === classId))
      .map(student => String(student.student_profile_id || '')).filter(Boolean))];
  }

  function options(select, entries, placeholder, selected) {
    select.replaceChildren(new Option(placeholder, ''), ...entries.map(entry => new Option(entry.label, entry.id)));
    if (entries.some(entry => entry.id === selected)) select.value = selected;
  }

  function renderExams() {
    const ids = new Set(profileIds(classSelect.value));
    const exams = new Map();
    for (const row of context.records) {
      const result = row.detail_json?.meta?.resultSnapshot;
      if (row.content_type !== 'exam' || row.status !== 'completed' || !ids.has(String(row.user_id)) || !result?.examId) continue;
      exams.set(result.examId, { id: result.examId, label: result.examTitle || row.title || 'Sınav' });
    }
    for (const row of catalog) {
      if (ids.has(String(row.user_id))) exams.set(row.content_id, { id: row.content_id, label: row.title || 'Sınav' });
    }
    options(examSelect, [...exams.values()].sort((a, b) => a.label.localeCompare(b.label, 'tr')), 'Sınav seçin', examSelect.value);
    button.disabled = !context.canAnalyze || !examSelect.value;
    status.textContent = exams.size ? 'Öğrenci panellerine kaydedilen tamamlanmış sonuçlar analiz edilir.' : 'Bu grupta tamamlanmış sınav kaydı bulunamadı.';
  }

  function update(next) {
    context = next;
    if (selectionOwner !== next.ownerId) {
      examSelect.value = '';
      classSelect.value = '';
      document.querySelector('.ea-dialog')?.close();
      catalog = [];
      catalogSignature = '';
    }
    selectionOwner = next.ownerId;
    options(classSelect, next.classes.map(row => ({ id: String(row.id), label: row.name })), 'Tüm sınıflarım', classSelect.value);
    renderExams();
    const signature = JSON.stringify([next.ownerId, profileIds(''), next.records.filter(row => row.content_type === 'exam').map(row => [row.id, row.updated_at])]);
    if (next.canAnalyze && signature !== catalogSignature) {
      catalogSignature = signature;
      loadCatalog(next, signature);
    }
  }

  function assertOwner(owner) {
    if (!context.canAnalyze || !owner || context.ownerId !== owner || window.kemalUserAuth?.getState()?.user?.id !== owner) {
      throw new Error('Öğretmen oturumu değişti.');
    }
  }

  async function loadCatalog(source, signature) {
    try {
      const rows = await readProgress(source.client, profileIds(''), source.ownerId, 'id,user_id,content_id,title');
      if (signature !== catalogSignature) return;
      catalog = rows;
      renderExams();
    } catch (error) {
      if (signature === catalogSignature) {
        catalogSignature = '';
        status.textContent = 'Sınav listesi tamamen yüklenemedi. Panelde Yenile ile tekrar deneyebilirsiniz.';
      }
    }
  }

  async function readProgress(client, ids, owner, fields, examId) {
    const records = [];
    for (let start = 0; start < ids.length; start += 100) {
      for (let offset = 0; ; offset += 200) {
        assertOwner(owner);
        let query = client.from('user_content_progress').select(fields)
          .eq('content_type', 'exam').eq('status', 'completed');
        if (examId) query = query.eq('content_id', examId);
        const response = await query.in('user_id', ids.slice(start, start + 100))
          .order('id', { ascending: true }).range(offset, offset + 199);
        assertOwner(owner);
        if (response.error) throw response.error;
        const rows = response.data || [];
        records.push(...rows.filter(row => ids.includes(String(row.user_id))));
        if (rows.length < 200) break;
      }
    }
    return records;
  }

  async function loadResults(client, examId, ids, owner) {
    const results = [];
    const rows = await readProgress(client, ids, owner, 'id,user_id,detail_json,updated_at', examId);
    for (const row of rows) {
      const snapshot = row.detail_json?.meta?.resultSnapshot;
      if (snapshot?.examId === examId) {
        results.push({ ...snapshot, accountUid: row.user_id, updated_at: row.updated_at, id: row.id });
      }
    }
    return results;
  }

  async function loadQuestionMetadata(examId, result) {
    const fallback = { id: examId, title: result?.examTitle || 'Sınav', subject: result?.subject || 'Genel', questionSections: result?.questionSections || [] };
    try {
      const [{ db }, firestore] = await Promise.all([
        import('./firebase.js'), import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
      ]);
      const { doc, getDoc, getDocs, query, where, collection } = firestore;
      const [exam, questions] = await Promise.all([
        getDoc(doc(db, 'exams', examId)), getDocs(query(collection(db, 'questions'), where('examId', '==', examId)))
      ]);
      return {
        exam: exam.exists() ? { ...fallback, ...exam.data(), id: examId } : fallback,
        questions: questions.docs.map(question => ({ ...question.data(), id: question.id })).sort((a, b) => a.order - b.order)
      };
    } catch (error) {
      return { exam: fallback, questions: [], metadataUnavailable: true };
    }
  }

  classSelect.addEventListener('change', renderExams);
  examSelect.addEventListener('change', () => { button.disabled = !context.canAnalyze || !examSelect.value; });
  button.addEventListener('click', () => {
    if (!context.canAnalyze || !examSelect.value) return;
    const owner = context.ownerId, examId = examSelect.value, classId = classSelect.value;
    const ids = profileIds(classId);
    const group = classId ? context.classes.find(row => String(row.id) === classId)?.name : 'Tüm sınıflarım';
    const title = examSelect.selectedOptions[0].textContent;
    window.KemalExamAnalysisView.open({ title, scope: group + ' · ' + ids.length + ' bağlı öğrenci hesabı', load: async () => {
      assertOwner(owner);
      const results = await loadResults(context.client, examId, ids, owner);
      const metadata = await loadQuestionMetadata(examId, results[0]);
      assertOwner(owner);
      if (!ids.every(id => profileIds(classId).includes(id))) throw new Error('Sınıf üyeliği değişti.');
      return { ...metadata, results };
    }});
  });
  window.addEventListener('kemal-user-auth-changed', () => {
    if (window.kemalUserAuth?.getState()?.user?.id !== context.ownerId) {
      context.canAnalyze = false;
      button.disabled = true;
      document.querySelector('.ea-dialog')?.close();
    }
  });
  window.KemalTeacherExamAnalysis = { update };
})();
