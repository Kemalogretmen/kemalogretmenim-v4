const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '../..');
const origin = 'http://exam.test';
const passage = { x: 40, y: 60, width: 180, height: 300 };
const question = { x: 340, y: 300, width: 220, height: 180 };
const pdfJsBase = process.env.EXAM_PDFJS_BASE;
function pdfFixture() {
  const stream = '1 1 1 rg 0 0 600 600 re f\n1 0 1 rg 240 0 70 600 re f 340 360 220 180 re f\n' +
    '0.7960784314 0.8941176471 1 rg 40 240 180 300 re f\n0.9882352941 0.9450980392 0.7294117647 rg 340 120 220 180 re f\n' +
    '0 0 0 rg BT /F1 12 Tf 48 512 Td (Ortak okuma metni) Tj ET\n';
  const page = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 600] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>',
    page, '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', page];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 7\n0000000000 65535 f \n` + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(pdf + `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
function paintFixture(ctx) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 600);
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(240, 0, 70, 600); ctx.fillRect(340, 60, 220, 180);
  ctx.fillStyle = '#cbe4ff'; ctx.fillRect(40, 60, 180, 300);
  ctx.fillStyle = '#fcf1ba'; ctx.fillRect(340, 300, 220, 180);
  ctx.fillStyle = '#111'; ctx.font = '12px sans-serif';
  for (let y = 88; y < 350; y += 22) ctx.fillText('Ortak okuma metni', 48, y);
  ctx.fillText('Metne göre hangisi doğrudur?', 350, 323);
  ctx.fillText('A) Birinci seçenek', 350, 350);
  ctx.fillText('B) İkinci seçenek', 350, 390);
  ctx.fillText('C) Üçüncü seçenek', 350, 430);
}
const pdfMock = `
  ${paintFixture.toString()}
  window.pdfjsLib={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:2,
    getPage:async()=>({getViewport:({scale})=>({width:600*scale,height:600*scale,scale}),
      render:({canvasContext:ctx,viewport,transform})=>({cancel:()=>{},promise:Promise.resolve().then(()=>{
        ctx.save();ctx.setTransform(...transform);ctx.scale(viewport.scale,viewport.scale);paintFixture(ctx);ctx.restore();
      })})})
  })})};`;
const ocrMock = `window.Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async source=>{
  window.ocrSources=(window.ocrSources||[]).concat(source);
  const img=new Image();img.src=source;await img.decode();
  return {data:{blocks:[{paragraphs:[{lines:['A','B','C'].map((letter,i)=>({words:[{
    text:letter+')',confidence:99,bbox:{x0:img.width*.55,y0:img.height*(.15+i*.1),x1:img.width*.58,y1:img.height*(.18+i*.1)}
  }]}))}]}]}};
}})};`;
function adminHtml() {
  const source = fs.readFileSync(path.join(root, 'sinav_sitesi/admin.html'), 'utf8');
  return source.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, code) => `<script type="module">
    const app={},db={},getAuth=()=>({}),onAuthStateChanged=()=>{},collection=()=>{},query=()=>{},where=()=>{},orderBy=()=>{},getDocs=async()=>({docs:[]});
    ${code.replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm, '')}
    authReady=true;currentUser={uid:'admin'};currentUserIsAdmin=true;currentAdminAccessProfile={isOwner:true};
    A.page='create';A.step=3;A.grade=2;A.grades=[2];A.subject='Türkçe';A.examName='Kırpma';A.optionCount=3;render();
    window.cropTestZoom=async zoom=>{A.pdfZoom=zoom;if(A.pdfDoc)await renderPage(A.pdfPage);else renderImageOnCanvas();};
    window.cropTestZoomRace=async()=>{
      const first=window.cropTestZoom(3);
      for(let i=0;i<100&&!pdfRenderTask;i++) await Promise.resolve();
      const wasRendering=!!pdfRenderTask;
      await Promise.all([first,W.zoomOut(),W.zoomIn(),W.zoomOut()]);
      return wasRendering;
    };
    window.cropTestImage=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=600;(${paintFixture.toString()})(canvas.getContext('2d'));return canvas.toDataURL();};
  </script>`);
}

async function dragRegion(page, region, pointerType, { reverse = false, cancel = false, secondPointer = false } = {}) {
  const coordinates = await page.evaluate(region => {
    const wrap = document.getElementById('pdfCont');
    wrap.scrollIntoView({ block: 'start' });
    const box = document.getElementById('pdfCanvas').getBoundingClientRect();
    const viewport = wrap.getBoundingClientRect();
    const scale = box.width / 600;
    wrap.scrollLeft += box.left + (region.x + region.width / 2) * scale - (viewport.left + viewport.width / 2);
    wrap.scrollTop += box.top + (region.y + region.height / 2) * scale - (viewport.top + viewport.height / 2);
    const actual = document.getElementById('pdfCanvas').getBoundingClientRect();
    return { start: { x: actual.left + region.x * scale, y: actual.top + region.y * scale },
      end: { x: actual.left + (region.x + region.width) * scale, y: actual.top + (region.y + region.height) * scale } };
  }, region);
  const [start, end] = reverse ? [coordinates.end, coordinates.start] : [coordinates.start, coordinates.end];
  if (pointerType === 'mouse' && !cancel && !secondPointer) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  } else {
    // Playwright has no touch-drag API in WebKit. Exercise the same browser pointer handlers.
    await page.evaluate(({ start, end, pointerType, cancel, secondPointer }) => {
      const canvas = document.getElementById('cropCanvas');
      const event = (target, type, point, id = 11) => target.dispatchEvent(new PointerEvent(type, {
        clientX: point.x, clientY: point.y, pointerId: id, pointerType, button: 0, buttons: type === 'pointerup' ? 0 : 1,
        bubbles: true, cancelable: true, isPrimary: id === 11
      }));
      event(canvas, 'pointerdown', start);
      if (secondPointer) { event(canvas, 'pointerdown', end, 12); event(window, 'pointerup', end, 12); }
      event(window, 'pointermove', end);
      event(window, cancel ? 'pointercancel' : 'pointerup', end);
    }, { start, end, pointerType, cancel, secondPointer });
  }
}
async function readDraft(page) {
  return page.evaluate(async () => {
    const image = new Image(); image.src = A.draftImg; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixel = (x, y) => Array.from(ctx.getImageData(Math.floor(x * image.width), Math.floor(y * image.height), 1, 1).data).slice(0, 3);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let unwanted = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 240 && data[i + 1] < 20 && data[i + 2] > 240) unwanted++;
    return { width: image.width, height: image.height, left: pixel(.01, .01), right: pixel(.46, .01),
      belowQuestion: pixel(.8, .9), unwanted };
  });
}
async function checkJoinedDraft(page) {
  await page.locator('#cropModal').waitFor();
  await page.locator('#cropModal [data-status]').filter({ hasText: '3/3 konum hazır' }).waitFor();
  const draft = await readDraft(page);
  assert.ok(Math.abs(draft.width / draft.height - 400 / 300) < .015, JSON.stringify(draft));
  assert.deepEqual(draft.left, [203, 228, 255]);
  assert.deepEqual(draft.right, [252, 241, 186]);
  assert.deepEqual(draft.belowQuestion, [255, 255, 255]);
  assert.equal(draft.unwanted, 0, 'Unselected PDF content must not be included');
  assert.ok(Math.max(draft.width, draft.height) <= 3600);
}
async function saveDraft(page, answer) {
  await page.locator('#ansOpts .ans-opt').filter({ hasText: new RegExp('^' + answer + '$') }).click();
  await page.locator('#confirmBtn').click();
  await page.locator('#cropModal').waitFor({ state: 'detached' });
}
async function run(engine, name, viewport, pointerType) {
  const browser = await engine.launch();
  try {
    const touch = pointerType !== 'mouse';
    const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.href.includes('/pdf.js/')) return pdfJsBase
        ? route.fulfill({ path: pdfJsBase + (url.pathname.includes('worker') ? '.worker.min.js' : '.min.js'), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } })
        : route.fulfill({ body: pdfMock, contentType: 'application/javascript' });
      if (url.href.includes('/tesseract.js@')) return route.fulfill({ body: ocrMock, contentType: 'application/javascript' });
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/sinav_sitesi/admin.html') return route.fulfill({ body: adminHtml(), contentType: 'text/html; charset=utf-8' });
      if (['/js/admin-auth.js', '/js/admin-shell.js', '/js/site-data.js', '/js/site-adsense.js'].includes(url.pathname)) return route.fulfill({ body: '', contentType: 'application/javascript' });
      const file = path.join(root, url.pathname.slice(1));
      if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
      return route.abort();
    });
    await page.goto(origin + '/sinav_sitesi/admin.html');
    await page.locator('#pdfFile').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: pdfFixture() });
    await page.waitForFunction(() => document.getElementById('pdfCanvas')?.dataset.cropReady === 'true');
    await page.evaluate(() => window.cropTestZoom(.6));
    // Existing single-region flow stays unchanged.
    await dragRegion(page, passage, pointerType);
    await page.locator('#cropModal').waitFor();
    const single = await readDraft(page);
    assert.ok(Math.abs(single.width / single.height - .6) < .01);
    await page.getByRole('button', { name: 'İptal', exact: true }).click();
    assert.equal(await page.evaluate(() => A.questions.length), 0);

    await page.getByRole('button', { name: 'İki alanı birleştir', exact: true }).click();
    await dragRegion(page, passage, pointerType, { cancel: true });
    assert.equal(await page.evaluate(() => A.cropAnchor), null);
    await dragRegion(page, { ...passage, width: 10, height: 10 }, pointerType);
    assert.equal(await page.evaluate(() => A.cropAnchor), null);
    await dragRegion(page, passage, pointerType, { secondPointer: true });
    await page.locator('#joinedCropStatus strong').filter({ hasText: '1. alan hazır' }).waitFor();
    assert.equal(await page.locator('#cropModal').count(), 0);
    assert.equal(await page.evaluate(() => window.ocrSources.length), 1, 'Only complete questions trigger OCR');
    const anchor = await page.evaluate(() => A.cropAnchor.thumbnail);

    // The first crop survives page changes, zoom changes and the pan tool.
    await page.evaluate(() => window.W.nextPage());
    await page.evaluate(() => window.W.prevPage());
    assert.equal(await page.evaluate(() => window.cropTestZoomRace()), true, 'Rapid zoom must cancel an active render');
    assert.equal(await page.locator('#pdfCanvas').getAttribute('data-crop-ready'), 'true');
    await page.evaluate(() => window.cropTestZoom(3));
    await page.locator('[data-crop-tool=pan]').click();
    await page.locator('#pdfCont').evaluate(el => el.scrollIntoView({ block: 'start' }));
    const box = await page.locator('#pdfCont').boundingBox();
    const scrollBefore = await page.locator('#pdfCont').evaluate(el => el.scrollLeft);
    const panStart = { x: box.x + box.width / 2, y: box.y + Math.min(100, box.height / 2) };
    await page.mouse.move(panStart.x, panStart.y); await page.mouse.down();
    await page.mouse.move(panStart.x - 60, panStart.y - 30); await page.mouse.up();
    assert.ok(await page.locator('#pdfCont').evaluate(el => el.scrollLeft) > scrollBefore);
    await page.evaluate(() => window.cropTestZoom(.6));
    await page.locator('#pdfCtrl button').filter({ hasText: /^\+$/ }).click();
    await page.waitForFunction(() => Math.abs(A.pdfZoom - .7) < .001 && document.getElementById('pdfCanvas').width === 840 && document.getElementById('pdfCanvas').dataset.cropReady === 'true');
    await page.locator('[data-crop-tool=crop]').click();
    assert.equal(await page.evaluate(() => A.cropAnchor.thumbnail), anchor);
    await dragRegion(page, question, pointerType, { reverse: true });
    await checkJoinedDraft(page);
    assert.equal(await page.locator('#cropModal [data-skip]').isVisible(), false);
    await page.locator('#cropModal').screenshot({ path: '/tmp/exam-crop-' + name + '.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'İptal', exact: true }).click();
    assert.equal(await page.evaluate(() => A.cropAnchor.thumbnail), anchor);
    assert.equal(await page.evaluate(() => A.questions.length), 0);
    await dragRegion(page, question, pointerType);
    await checkJoinedDraft(page);
    await saveDraft(page, 'B');
    const saved = await page.evaluate(() => A.questions[0]);
    assert.equal(saved.ans, 'B');
    assert.deepEqual(Object.keys(saved.optionPositions), ['A', 'B', 'C']);
    assert.ok(saved.optionPositions.A.x > .45, 'Option positions refer to the combined image');
    assert.equal('cropAnchor' in saved, false);
    await dragRegion(page, question, pointerType);
    await checkJoinedDraft(page);
    await saveDraft(page, 'A');
    assert.equal(await page.evaluate(() => A.questions.length), 2);
    await page.getByRole('button', { name: 'İlk alanı değiştir', exact: true }).click();
    assert.equal(await page.evaluate(() => A.cropAnchor), null);
    await dragRegion(page, passage, pointerType);
    assert.ok(await page.evaluate(() => !!A.cropAnchor));

    // A different upload must never inherit a passage from the previous document.
    const png = await page.evaluate(() => window.cropTestImage());
    await page.locator('#pdfFile').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from(png.split(',')[1], 'base64') });
    await page.waitForFunction(() => A.imgLoaded && A.cropAnchor === null);
    await page.evaluate(() => window.cropTestZoom(1.32));
    await dragRegion(page, passage, pointerType);
    await page.evaluate(() => window.W.zoomIn());
    await dragRegion(page, question, pointerType);
    await checkJoinedDraft(page);
    await saveDraft(page, 'C');
    assert.equal(await page.evaluate(() => A.questions.length), 3);
    await page.getByRole('button', { name: 'Tek alan', exact: true }).click();
    assert.equal(await page.evaluate(() => A.cropAnchor), null);
    assert.equal(await page.locator('#joinedCropStatus').isVisible(), false);
    assert.equal(await page.locator('#pdfCtrl').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log('PASS', name, pdfJsBase ? 'real PDF.js' : 'render fixture', 'PDF/image join, pixels, zoom, pan, cancel, pointer isolation, reuse, OCR, single question save');
  } finally { await browser.close(); }
}
(async () => {
  await run(chromium, 'desktop', { width: 1440, height: 1000 }, 'mouse');
  await run(webkit, 'tablet', { width: 1024, height: 1366 }, 'pen');
  await run(webkit, 'phone', { width: 390, height: 844 }, 'touch');
})().catch(error => { console.error(error); process.exitCode = 1; });
