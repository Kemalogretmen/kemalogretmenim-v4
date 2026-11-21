const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const repo = path.resolve(__dirname, '../..');
const origin = 'http://exam.test';
const examPath = '/sinav_sitesi/sinav.html';
const source = fs.readFileSync(path.join(repo, examPath.slice(1)), 'utf8');
const image = '/fixture-question.svg';
const exam = {
  id: 'test', subject: 'Deneme', grade: 2, title: 'Örnek Deneme', duration: 60,
  negativeMarking: false, scoreScale: 100, optionCount: 3,
  questionSections: [{ label: 'Türkçe', start: 1, end: 2 }, { label: 'Matematik', start: 3, end: 3 }]
};
const questions = Array.from({ length: 3 }, (_, order) => ({
  order, examId: 'test', id: 'question-' + order, imageUrl: origin + image,
  correctAnswer: 'A', learningOutcome: 'Örnek kazanım', pointValue: 33.33,
  optionPositions: { A: { x: .5, y: .45 }, B: { x: .5, y: .60 }, C: { x: .5, y: .75 } }
}));
const mockFirebase = optionCount => `
  const db={}, doc=(_db,_table,id)=>id, collection=(_db,table)=>table,
    getDoc=async()=>({exists:()=>true,id:'test',data:()=>(${JSON.stringify({ ...exam, optionCount })})}),
    getDocs=async()=>({docs:${JSON.stringify(questions)}.map(q=>({id:q.id,data:()=>q}))}),
    query=()=>{}, where=()=>{}, orderBy=()=>{}, serverTimestamp=()=>new Date(),
    addDoc=async(_table,data)=>{window.testResult=data;return {id:'test-result'};};
`;
const examHtml = optionCount => source.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, code) =>
  '<script type="module">' + mockFirebase(optionCount) + code.replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm, '') + '</script>');
const mockAuth = `
  window.kemalUserAuth={
    ready:async()=>{},
    getState:()=>({user:{id:'student-1'},profile:{role:'student',id:'student-1'}}),
    getClient:()=>({from:()=>({
      upsert:async row=>{window.testProgress=row;return {error:null};},
      select:()=>({eq:()=>({order:async()=>({data:[]})})})
    })})
  };
`;

const editorHtml = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <link rel="stylesheet" href="/sinav_sitesi/js/exam-workspace.css">
  <script src="/sinav_sitesi/js/exam-workspace.js"></script>
  <script src="/sinav_sitesi/js/exam-option-editor.js"></script>
  <div id="editor"></div><script>
    window.readLayout=window.KemalExamOptionEditor.mount(document.getElementById('editor'),{
      source:'${image}',count:3,auto:true
    });
  </script></html>`;
const fixtureOCR = `
  const word=(text,x,y)=>({text,confidence:95,bbox:{x0:x-10,x1:x+10,y0:y-9,y1:y+9}});
  window.Tesseract={createWorker:async()=>({
    setParameters:async()=>{},
    recognize:async()=>({data:{blocks:[{paragraphs:[{lines:[{words:[
      word('A)',250,153),word('B)',250,204),word('C)',250,255)
    ]}]}]}]}})
  })};
`;

async function testOptionEditor(page) {
  await page.goto(origin + '/fixture-option-editor');
  await page.getByText(/3\/3 konum hazır/).waitFor();
  const start = await page.evaluate(() => readLayout());
  assert.equal(start.A.y, .45);
  const marker = page.getByRole('button', { name: /A işaretçisi/ });
  const box = await marker.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 12, { steps: 5 });
  await page.mouse.up();
  let next = await page.evaluate(() => readLayout());
  assert.ok(next.A.x > start.A.x);
  assert.ok(next.A.y > start.A.y);
  await marker.press('ArrowRight');
  const moved = await page.evaluate(() => readLayout());
  assert.ok(moved.A.x > next.A.x);
  await page.getByRole('button', { name: 'Konumu sil' }).click();
  next = await page.evaluate(() => readLayout());
  assert.equal(next.A, undefined);
  assert.deepEqual(next.B, start.B);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
}

async function assertAnswerBar(page, optionCount) {
  const layout = await page.evaluate(() => {
    const screen = document.querySelector('#screenExam').getBoundingClientRect();
    const controls = [...document.querySelectorAll('#btnPrev, #btnNext, #examAnswers button, .exam-nav-actions button')]
      .filter(element => element.getClientRects().length);
    return {
      answers: [...document.querySelectorAll('#examAnswers button')].map(element => element.getBoundingClientRect().x),
      prev: document.querySelector('#btnPrev').getBoundingClientRect().right,
      next: document.querySelector('#btnNext').getBoundingClientRect().left,
      clipped: controls.flatMap(element => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const inView = rect.left >= -.5 && rect.right <= innerWidth + .5
          && rect.top >= screen.top && rect.bottom <= Math.min(screen.bottom, innerHeight) + .5
          && (element.disabled || element.contains(hit));
        return inView ? [] : [{ control: element.textContent.trim(), bottom: rect.bottom,
          screen: screen.bottom, viewport: innerHeight, hit: hit?.className }];
      }),
      stageAboveBar: document.querySelector('#examMain').getBoundingClientRect().bottom
        <= document.querySelector('.exam-navrow').getBoundingClientRect().top + .5,
      bodyFits: document.documentElement.scrollWidth <= innerWidth + 1
    };
  });
  assert.equal(layout.answers.length, optionCount);
  assert.ok(layout.answers[0] >= layout.prev && layout.answers.at(-1) < layout.next);
  assert.deepEqual(layout.clipped, []);
  assert.equal(layout.stageAboveBar, true);
  assert.equal(layout.bodyFits, true);
}

async function testAnswerLayout(page, { touch, optionCount }) {
  const activate = locator => touch ? locator.tap() : locator.click();
  const bottomOption = letter => page.getByRole('button', { name: letter + ' şıkkı', exact: true });
  await assertAnswerBar(page, optionCount);
  await page.locator('#examMain').evaluate(main => { main.scrollTop = main.scrollHeight; });
  await assertAnswerBar(page, optionCount);
  await bottomOption('B').focus();
  await page.keyboard.press('Space');
  assert.equal(await bottomOption('B').getAttribute('aria-pressed'), 'true');
  await activate(bottomOption('B'));
  assert.equal(await bottomOption('B').getAttribute('aria-pressed'), 'false');

  const optic = page.locator('#opticFab');
  if (await optic.isVisible()) {
    await activate(optic);
    assert.equal(await optic.getAttribute('aria-expanded'), 'true');
    await activate(page.getByRole('button', { name: 'Optik formu kapat' }));
    assert.equal(await optic.getAttribute('aria-expanded'), 'false');
  }

  await activate(page.locator('#examFullscreenButton'));
  await page.locator('#screenExam.exam-expanded').waitFor();
  await assertAnswerBar(page, optionCount);
  await activate(page.locator('[data-draw-tool="select"]'));
  const selected = page.getByRole('button', { name: 'Görseldeki A şıkkı' });
  await activate(selected);
  assert.equal(await bottomOption('A').getAttribute('aria-pressed'), 'true');
  const style = await selected.evaluate(option => {
    const ring = getComputedStyle(option, '::before');
    const tick = getComputedStyle(option, '::after');
    return { ring: ring.borderRadius, border: parseFloat(ring.borderTopWidth),
      width: ring.width, height: ring.height, fill: ring.backgroundColor, tick: tick.content };
  });
  assert.equal(style.ring, '50%');
  assert.ok(style.border >= 2);
  assert.equal(style.width, style.height);
  assert.equal(style.fill, 'rgba(0, 0, 0, 0)');
  assert.equal(style.tick, 'none');
  await activate(bottomOption('B'));
  assert.equal(await selected.getAttribute('aria-pressed'), 'false');
  assert.equal(await page.getByRole('button', { name: 'Görseldeki B şıkkı' }).getAttribute('aria-pressed'), 'true');
  await activate(bottomOption('B'));
  await activate(page.getByRole('button', { name: 'Sonraki soru', exact: true }));
  await assertAnswerBar(page, optionCount);
  await activate(page.getByRole('button', { name: 'Önceki soru', exact: true }));
  assert.equal(await bottomOption('B').getAttribute('aria-pressed'), 'false');
  await activate(page.locator('#examFullscreenButton'));
  await page.locator('#screenExam.exam-expanded').waitFor({ state: 'hidden' });
  await assertAnswerBar(page, optionCount);
}

async function testBrowser(engine, name, viewport, { touch = false, layoutOnly = false, optionCount = 3 } = {}) {
  if (process.env.EXAM_TEST_CASE && !name.includes(process.env.EXAM_TEST_CASE)) return;
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.setDefaultTimeout(5500);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.endsWith('/tesseract.min.js')) {
        return route.fulfill({ body: fixtureOCR, contentType: 'application/javascript' });
      }
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/fixture-option-editor') return route.fulfill({ body: editorHtml, contentType: 'text/html' });
      if (url.pathname === examPath) return route.fulfill({ body: examHtml(optionCount), contentType: 'text/html' });
      if (url.pathname === '/js/user-auth.js') return route.fulfill({ body: mockAuth, contentType: 'application/javascript' });
      if (url.pathname === image) return route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="340"><rect width="500" height="340" fill="white"/><text x="248" y="153">A) İlk seçenek</text><text x="248" y="204">B) İkinci seçenek</text><text x="248" y="255">C) Üçüncü seçenek</text></svg>',
        contentType: 'image/svg+xml'
      });
      const local = path.join(repo, url.pathname.slice(1));
      if (local.startsWith(repo + path.sep) && fs.existsSync(local) && fs.statSync(local).isFile()) return route.fulfill({ path: local });
      return route.abort();
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('sinav_examId', 'test');
      sessionStorage.setItem('sinav_student', JSON.stringify({
        firstName: 'Örnek', lastName: 'Öğrenci', grade: 2, sube: 'A', accountUid: 'student-1'
      }));
      window.Chart = class { destroy() {} };
    });
    try { if (!layoutOnly) await testOptionEditor(page); } catch (error) {
      console.error(errors, await page.locator("body").textContent());
      throw error;
    }
    await page.goto(origin + examPath);
    try {
      await page.getByRole('button', { name: /BAŞLAT/ }).click();
    } catch (error) {
      console.error(errors, await page.locator('#screenLoad').textContent(), page.url());
      throw error;
    }
    await testAnswerLayout(page, { touch, optionCount });
    if (layoutOnly) {
      assert.deepEqual(errors, []);
      console.log('PASS', name, viewport.width + '×' + viewport.height, optionCount + ' options');
      return;
    }
    const math = page.getByRole('tab', { name: /Matematik/ });
    const turkish = page.getByRole('tab', { name: /Türkçe/ });
    await turkish.waitFor();
    assert.equal(await turkish.getAttribute('aria-selected'), 'true');
    await page.locator('#btnNext').click();
    await math.click();
    assert.match(await page.locator('#qProg').textContent(), /3 \/ 3/);
    await turkish.click();
    assert.match(await page.locator('#qProg').textContent(), /2 \/ 3/);
    await page.locator('#examFullscreenButton').click();
    await page.locator('#screenExam.exam-expanded').waitFor();
    await page.locator('#examTimer').waitFor();
    await page.locator('#toolbarDock').waitFor();
    const geometry = await page.evaluate(() => ({
      main: document.querySelector('#examMain').clientWidth,
      stage: document.querySelector('#mediaStage').getBoundingClientRect().width,
      body: document.documentElement.scrollWidth,
      viewport: innerWidth
    }));
    assert.ok(geometry.stage / geometry.main > .92);
    assert.ok(geometry.body <= geometry.viewport + 2);

    await page.locator('[data-draw-tool="select"]').click();
    const option = page.getByRole('button', { name: 'Görseldeki A şıkkı' });
    await option.click();
    assert.equal(await page.locator('.ans-btn').first().getAttribute('aria-pressed'), 'true');
    await option.click();
    assert.equal(await option.getAttribute('aria-pressed'), 'false');
    await page.locator('.ans-btn').first().click();
    assert.equal(await option.getAttribute('aria-pressed'), 'true');

    await page.locator('#flagQuestion').click();
    await math.click();
    await page.locator('#nextFlaggedQuestion').click();
    assert.equal(await page.locator('#flagQuestion').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => window.setDrawTool('pencil'));
    const box = await page.locator('#qImg').boundingBox();
    await page.mouse.move(box.x + box.width * .67, box.y + box.height * .32);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .80, box.y + box.height * .37, { steps: 8 });
    await page.mouse.up();
    assert.equal(await page.locator('#undoExamInk').isEnabled(), true);

    await page.locator('.finish-btn').click();
    await page.locator('#finishModal1').getByRole('button', { name: 'Bitir', exact: true }).click();
    await page.locator('#finishModal2').getByRole('button', { name: 'Bitir', exact: true }).click();
    await page.locator('#screenKarne').waitFor();
    const { firestore, snapshot } = await page.evaluate(() => ({
      firestore: window.testResult,
      snapshot: window.kemalContentProgress.listRecords().find(record => record.type === 'exam').meta.resultSnapshot
    }));
    assert.ok(firestore.answerDetails[1].ink.length > 0);
    assert.equal(snapshot.answerDetails[1].ink, firestore.answerDetails[1].ink);
    assert.equal(snapshot.answerDetails[1].selectedAnswer, 'A');

    // Panel routes pass the same authorized result snapshot to this report page.
    const synced = await page.evaluate(() => window.testProgress);
    assert.equal(synced.user_id, 'student-1');
    assert.equal(synced.detail_json.meta.resultSnapshot.answerDetails[1].ink, firestore.answerDetails[1].ink);
    await page.evaluate(snapshot => localStorage.setItem('kemal_exam_admin_karne_result_v1', JSON.stringify(snapshot)), snapshot);
    for (const [panel, label] of [['student', 'Öğrenci Paneli'], ['teacher', 'Öğretmen Paneli'], ['parent', 'Veli Paneli']]) {
      await page.goto(origin + examPath + '?adminKarne=1&panel=' + panel);
      await page.locator('#screenKarne').waitFor();
      assert.match(await page.locator('#karneBackBtn').textContent(), new RegExp(label));
    }
    await page.evaluate(() => window.showQuestionModal(1));
    const drawing = page.locator('[data-review-ink]');
    await drawing.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-review-ink]').disabled);
    await drawing.click();
    assert.equal(await drawing.getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: 'İnceleme kalemi' }).click();
    const review = page.locator('.review-surface canvas').last();
    const work = await review.boundingBox();
    await page.mouse.move(work.x + work.width * .55, work.y + work.height * .35);
    await page.mouse.down();
    await page.mouse.move(work.x + work.width * .65, work.y + work.height * .35, { steps: 4 });
    await page.mouse.up();
    const drawn = await review.evaluate(canvas => canvas.getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data.some((channel, index) => index % 4 === 3 && channel));
    assert.equal(drawn, true);
    await page.getByRole('button', { name: 'Kapat', exact: true }).click();
    await page.getByRole('button', { name: 'Paylaş', exact: true }).click();
    assert.match(await page.getByRole('link', { name: 'E-posta' }).getAttribute('href'), /^mailto:/);
    assert.match(await page.getByRole('link', { name: 'WhatsApp' }).getAttribute('href'), /^https:\/\/wa.me\//);
    assert.deepEqual(errors, []);
    console.log('PASS', name, viewport.width);
  } finally {
    await browser.close();
  }
}

(async () => {
  await testBrowser(chromium, 'Chromium', { width: 1440, height: 900 });
  await testBrowser(webkit, 'WebKit iPhone', { width: 390, height: 844 }, { touch: true });
  await testBrowser(chromium, 'Chromium compact desktop', { width: 1280, height: 600 }, { layoutOnly: true, optionCount: 6 });
  await testBrowser(chromium, 'Chromium Android phone', { width: 360, height: 640 }, { touch: true, layoutOnly: true, optionCount: 6 });
  await testBrowser(webkit, 'WebKit small iPhone', { width: 320, height: 568 }, { touch: true, layoutOnly: true, optionCount: 6 });
  await testBrowser(webkit, 'WebKit iPhone landscape', { width: 667, height: 375 }, { touch: true, layoutOnly: true, optionCount: 6 });
  await testBrowser(webkit, 'WebKit iPad portrait', { width: 768, height: 1024 }, { touch: true, layoutOnly: true, optionCount: 6 });
  await testBrowser(chromium, 'Chromium tablet landscape', { width: 1024, height: 768 }, { touch: true, layoutOnly: true, optionCount: 6 });
})().catch(error => { console.error(error); process.exitCode = 1; });
