const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '../..');
const origin = 'http://exam.test';
const exam = { id: 'weekly9', title: 'Haftalık Deneme 9', subject: 'Deneme', grade: 2, optionCount: 4, questionCount: 4, status: 'active', published: true };
const questions = [
  { id: 'q1', order: 0, correctAnswer: 'A', sectionTitle: 'Türkçe', learningOutcome: 'Ana fikir' },
  { id: 'q2', order: 1, correctAnswer: 'B', sectionTitle: 'Türkçe', learningOutcome: 'Ana fikir' },
  { id: 'q3', order: 2, correctAnswer: 'C', sectionTitle: 'Matematik', learningOutcome: 'Kesirler' },
  { id: 'q4', order: 3, correctAnswer: 'D', sectionTitle: 'Matematik' }
].map(question => ({ ...question, examId: exam.id, imageUrl: origin + '/' + question.id + '.svg' }));
const results = [['B', 'B', 'A', 'D'], ['B', 'B', 'A', 'D'], ['C', 'B', '', 'D'], ['A', '', 'C', 'D']].map((answers, i) => ({
  id: 'result-' + i, examId: exam.id, examTitle: exam.title, subject: 'Deneme', grade: 2, sube: i < 2 ? 'A' : 'B',
  firstName: 'Örnek', lastName: String(i), date: { seconds: 100 }, total: 4, correct: 2, wrong: 2, blank: 0, score: 50,
  accountUid: 'student-' + i, clientAttemptId: 'attempt-' + i, status: 'completed',
  answerDetails: questions.map((question, index) => ({ questionNo: index + 1, questionId: question.id, correctAnswer: question.correctAnswer,
    selectedAnswer: answers[index], sectionTitle: question.sectionTitle, learningOutcome: question.learningOutcome || '', outcome: answers[index] === question.correctAnswer ? 'D' : answers[index] ? 'Y' : 'B' }))
}));
const fsModule = `
 export const db={},app={},collection=(_db,table)=>table,doc=(_db,table,id)=>({table,id}),where=(...args)=>args,orderBy=()=>null,
 query=(table,...clauses)=>({table,clauses}),getDoc=async()=>{if(window.failAnalysis)throw new Error('temporary');return {exists:()=>true,data:()=>(${JSON.stringify(exam)})};},
 getDocs=async query=>{const table=typeof query==='string'?query:query.table;
   window.analysisReads=(window.analysisReads||[]).concat([table]);
   if(table==='results'&&window.failAnalysisOnce){window.failAnalysisOnce=false;throw new Error('temporary');}
   return {docs:(table==='questions'?${JSON.stringify(questions)}:table==='results'?${JSON.stringify(results)}:[])
     .map(row=>({id:row.id,data:()=>row}))};
 }, addDoc=async()=>{},setDoc=async()=>{},updateDoc=async()=>{},deleteDoc=async()=>{},serverTimestamp=()=>null,deleteField=()=>null,writeBatch=()=>({});
`;
const authModule = 'export const getAuth=()=>({}),onAuthStateChanged=()=>{},signInWithEmailAndPassword=()=>{},signOut=()=>{};';
const snapshots = results.map((result, i) => ({ id: 'progress-' + i, user_id: result.accountUid, content_type: 'exam', content_id: exam.id, status: 'completed', detail_json: { meta: { resultSnapshot: result } }, updated_at: '2026-11-18T10:00:00Z' }));
const classes = [{ id: 'class-a', name: '2-A' }, { id: 'class-b', name: '2-B' }];
const students = results.map((row, i) => ({ id: 'member-' + i, student_profile_id: row.accountUid, class_id: i < 2 ? 'class-a' : 'class-b', status: 'active', display_name: 'Örnek' }));
const teacherMock = `
 window.currentTeacher='teacher';
 const allRows=${JSON.stringify(snapshots.concat(Array.from({length:205},(_,i)=>({id:'history-'+i,user_id:'student-0',content_id:'old-'+i,title:'Eski Deneme '+i}))))};
 window.kemalUserAuth={getState:()=>({user:{id:window.currentTeacher}}),getClient:()=>({from:table=>{
   const filters={};const chain={select:()=>chain,eq:(field,value)=>{filters[field]=value;return chain;},
    in:(field,ids)=>{filters[field]=ids;return chain;},order:()=>chain,
    range:async(start,end)=>{window.teacherReads=(window.teacherReads||[]).concat([{table,filters,start}]);
      return {data:allRows.filter(row=>filters.user_id.includes(row.user_id)&&(!filters.content_id||row.content_id===filters.content_id)).slice(start,end+1)};}};
   return chain;
 }})};
`;
function adminHtml() {
  const source = fs.readFileSync(path.join(root, 'sinav_sitesi/admin.html'), 'utf8');
  return source.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, code) => '<script type="module">' + fsModule.replace(/export /g, '') + authModule.replace(/export /g, '') + code.replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm, '') + `
    authReady=true;currentUser={uid:'admin'};currentUserIsAdmin=true;currentAdminAccessProfile={isOwner:true};
    A.page='exams';A.exams=${JSON.stringify([exam])};A.results=${JSON.stringify(results)};render();
    window.testAnalysisPermission=()=>{currentUserIsAdmin=false;currentAdminAccessProfile={active:true,permissions:{}};};
  </script>`);
}
function teacherJs() {
  const source = fs.readFileSync(path.join(root, 'js/ogretmen-paneli.js'), 'utf8');
  const start = source.lastIndexOf("  if (document.readyState === 'loading')");
  return source.slice(0, start) + `
    state.user={id:'teacher'};state.profile={role:'teacher',approval_status:'active',active:true};
    state.classes=${JSON.stringify(classes)};state.students=${JSON.stringify(students)};state.studentProgress=${JSON.stringify(snapshots)};
    document.querySelector('.teacher-shell').classList.remove('teacher-loading');
    bindEvents();renderReports();
  })();`;
}

async function checkQuestionListLayout(page, name) {
  await page.evaluate(() => {
    const exam = { id: 'layout', title: 'Uzun soru listesi', subject: 'Türkçe', questionCount: 30, optionCount: 4 };
    const results = Array.from({ length: 19 }, (_, student) => ({
      examId: exam.id, accountUid: 'layout-student-' + student, total: 30, status: 'completed',
      answerDetails: Array.from({ length: 30 }, (_, index) => ({
        questionNo: index + 1, correctAnswer: 'A',
        selectedAnswer: student < (index === 5 ? 9 : 4) ? 'B' : student === 18 && index !== 5 ? '' : 'A',
        sectionTitle: index === 29 ? 'Din Kültürü ve Ahlak Bilgisi' : 'Türkçe'
      }))
    }));
    window.KemalExamAnalysisView.open({ load: async () => ({ exam, results }) });
  });
  const list = page.locator('.ea-dialog .ea-questions');
  await page.waitForFunction(() => document.querySelectorAll('.ea-questions button').length === 30);
  await list.scrollIntoViewIfNeeded();
  const layout = await list.evaluate(element => ({
    scrollable: element.scrollHeight > element.clientHeight,
    fitsWidth: element.scrollWidth <= element.clientWidth + 1,
    overflow: [...element.querySelectorAll('button')].flatMap(button => {
      const outer = button.getBoundingClientRect();
      return [...button.children].filter(child => {
        const inner = child.getBoundingClientRect();
        return inner.top < outer.top - 1 || inner.bottom > outer.bottom + 1 || inner.left < outer.left - 1 || inner.right > outer.right + 1;
      }).map(child => ({ question: button.textContent, child: child.className || child.tagName }));
    })
  }));
  assert.equal(layout.scrollable, true, 'Long question lists must scroll');
  assert.equal(layout.fitsWidth, true, 'Question cards must fit the list width');
  assert.deepEqual(layout.overflow, [], 'Question statistics and meters must stay inside their cards');
  await list.locator('button').last().scrollIntoViewIfNeeded();
  await list.locator('button').last().click();
  assert.match(await page.locator('.ea-dialog .ea-detail h4').textContent(), /30. soru/);
  await list.locator('button').first().scrollIntoViewIfNeeded();
  await list.screenshot({ path: '/tmp/exam-analysis-cards-' + name + '.png' });
  await page.getByRole('button', { name: 'Sınav analizini kapat' }).click();
  await page.locator('.ea-dialog').waitFor({ state: 'detached' });
}

async function run(engine, name, viewport, touch) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
    await page.addInitScript(() => { window.scrollTo = () => {}; });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.href.includes('firebase-firestore.js')) return route.fulfill({ body: fsModule, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
      if (url.href.includes('firebase-auth.js')) return route.fulfill({ body: authModule, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/sinav_sitesi/admin.html') return route.fulfill({ body: adminHtml(), contentType: 'text/html; charset=utf-8' });
      if (url.pathname === '/sinav_sitesi/js/firebase.js') return route.fulfill({ body: fsModule, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
      if (url.pathname === '/js/ogretmen-paneli.js') return route.fulfill({ body: teacherJs(), contentType: 'application/javascript' });
      if (url.pathname === '/js/user-auth.js') return route.fulfill({ body: teacherMock, contentType: 'application/javascript' });
      if (/^\/q[1-4]\.svg$/.test(url.pathname)) return route.fulfill({ body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300"><rect width="500" height="300" fill="white"/><text x="20" y="40">' + url.pathname + '</text></svg>', contentType: 'image/svg+xml' });
      if (['/js/admin-auth.js', '/js/admin-shell.js', '/js/site.js', '/js/site-data.js', '/js/content-feed.js', '/js/content-saves.js', '/js/content-reactions.js', '/js/content-progress.js', '/js/site-adsense.js'].includes(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
      const file = path.join(root, url.pathname.slice(1));
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
      return route.abort();
    });
    await page.goto(origin + '/sinav_sitesi/admin.html');
    try { await page.getByRole('button', { name: 'Sınav Analizi', exact: true }).click(); } catch(error) { console.error(await page.locator('#app').innerText()); throw error; }
    const dialog = page.getByRole('dialog', { name: /Haftalık Deneme 9/ });
    await dialog.getByRole('heading', { name: 'Derslere göre analiz' }).waitFor();
    assert.match(await dialog.locator('.ea-summary').textContent(), /4 öğrenci kaydı/);
    assert.match(await dialog.locator('.ea-highlights').first().textContent(), /%37,5/);
    assert.equal(await dialog.locator('.ea-questions button').count(), 4);
    assert.match(await dialog.locator('.ea-detail').textContent(), /B şıkkı 2 kez \(%50\)/);
    assert.match(await dialog.locator('.ea-detail').textContent(), /%66,7/);
    await dialog.locator('.ea-detail').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.ea-detail img')?.naturalWidth > 0);
    await dialog.screenshot({path:'/tmp/exam-analysis-'+(touch?'mobile':'desktop')+'.png'});
    await dialog.locator('[data-sort]').selectOption('correctRate');
    assert.match(await dialog.locator('.ea-questions button').first().textContent(), /4. soru/);
    await dialog.locator('[data-group="lesson"]').filter({ hasText: 'Türkçe' }).click();
    assert.equal(await dialog.locator('.ea-questions button').count(), 2);
    await dialog.locator('[data-lesson]').selectOption('');
    await dialog.locator('[data-outcome]').selectOption('1');
    assert.equal(await dialog.locator('.ea-questions button').count(), 1);
    assert.match(await dialog.locator('.ea-detail').textContent(), /Kesirler/);
    const fits = await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1);
    assert.equal(fits, true);
    if (!touch) {
      const boxes = await dialog.evaluate(element => ({ img: element.querySelector('.ea-preview').getBoundingClientRect().right, stats: element.querySelector('.ea-question-detail > div:last-child').getBoundingClientRect().left }));
      assert.ok(boxes.img <= boxes.stats);
    }
    await dialog.getByRole('button', { name: 'Sınav analizini kapat' }).click();
    await page.getByRole('button', { name: '📊 Sonuçlar' }).click();
    await page.getByRole('button', { name: 'Sınav Analizini Aç' }).click();
    await dialog.getByRole('heading', { name: 'Derslere göre analiz' }).waitFor();
    await dialog.getByRole('button', { name: 'Sınav analizini kapat' }).click();
    await page.evaluate(() => {window.failAnalysis=true;window.W.openExamAnalysis('weekly9');});
    await page.getByRole('alert').filter({hasText:'Analiz verileri yüklenemedi'}).waitFor();
    await page.evaluate(()=>{window.failAnalysis=false;});
    await page.getByRole('button',{name:'Yeniden dene',exact:true}).click();
    await dialog.getByRole('heading', { name: 'Derslere göre analiz' }).waitFor();
    await dialog.getByRole('button', { name: 'Sınav analizini kapat' }).click();
    await checkQuestionListLayout(page, name + '-admin');
    await page.evaluate(() => { window.testAnalysisPermission();window.W.openExamAnalysis('weekly9'); });
    await page.waitForFunction(() => !document.querySelector('.ea-dialog'));

    await page.goto(origin + '/ogretmen-paneli.html');
    // Reports are a tab in the production teacher page.
    await page.locator('.teacher-tabs [data-tab=reports]').click();
    await page.locator('#teacherAnalysisExam').selectOption('weekly9');
    await page.locator('#teacherAnalysisClass').selectOption('class-a');
    await page.locator('#teacherExamAnalysisBtn').click();
    await dialog.getByRole('heading', { name: 'Derslere göre analiz' }).waitFor();
    assert.match(await dialog.locator('.ea-summary').textContent(), /2 öğrenci kaydı/);
    assert.match(await dialog.locator('.ea-header').textContent(), /2-A/);
    const reads = await page.evaluate(() => window.teacherReads);
    const analysisRead=reads.find(read=>read.filters.content_id==='weekly9');
    assert.deepEqual(analysisRead.filters.user_id, ['student-0', 'student-1']);
    assert.equal(analysisRead.filters.status, 'completed');
    assert.ok(reads.some(read=>!read.filters.content_id&&read.start===200));
    await page.evaluate(() => { window.currentTeacher='another';window.dispatchEvent(new Event('kemal-user-auth-changed')); });
    await page.waitForFunction(() => !document.querySelector('.ea-dialog'));
    assert.equal(await page.locator('#teacherExamAnalysisBtn').isDisabled(), true);
    await page.evaluate(()=>window.KemalExamAnalysisView.open({scope:'Boş grup',load:async()=>({exam:{id:'empty',title:'Boş sınav'},results:[]})}));
    await page.getByText('Bu grupta soru ayrıntısı bulunan tamamlanmış sınav kaydı yok.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Sınav analizini kapat'}).click();
    await checkQuestionListLayout(page, name + '-teacher');
    await page.evaluate(()=>window.KemalExamAnalysisView.open({load:async()=>({exam:{id:'safe',title:'<img src=x onerror=alert(1)>'},results:[{examId:'safe',total:1,answerDetails:[{questionNo:1,selectedAnswer:'A',correctAnswer:'A',sectionTitle:'<script>unsafe</script>',learningOutcome:'<b>Etiket</b>'}]}]})}));
    await page.locator('.ea-dialog .ea-questions button').waitFor();
    assert.equal(await page.locator('.ea-dialog script, .ea-dialog [onerror], .ea-dialog h2 img').count(),0);
    await page.getByRole('button',{name:'Sınav analizini kapat'}).click();
    assert.deepEqual(errors, []);
    console.log('PASS', name, viewport.width + '×' + viewport.height, 'admin + teacher, 30 question cards without overflow, metrics, preview, filters, permissions');
  } finally { await browser.close(); }
}
(async () => {
  await run(chromium, 'Chromium', { width: 1440, height: 1000 }, false);
  await run(webkit, 'WebKit phone', { width: 390, height: 844 }, true);
})().catch(error => { console.error(error); process.exitCode = 1; });
