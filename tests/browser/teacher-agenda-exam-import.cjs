const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { chromium, webkit } = require('playwright');
const origin = process.env.AGENDA_ORIGIN || 'http://127.0.0.1:8776';
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-exam-browser-'));
let samples;
if (process.env.AGENDA_EXAM_SAMPLE_DIR) {
  const source = process.env.AGENDA_EXAM_SAMPLE_DIR;
  samples = fs.readdirSync(source).filter(name => /004308067|zeltilmi/.test(name)).map(name => path.join(source, name));
  assert.equal(samples.length, 2);
} else {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('ogretmen-ajandasi/vendor/xlsx.full.min.js', 'utf8'), context);
  context.rows = [['Ad Soyad', 'Türkçe D', 'Türkçe Y', 'Türkçe B', 'Matematik D', 'Matematik Y', 'Matematik B'], ...Array.from({length:24}, (_,i) => [`Örnek Öğrenci ${String.fromCharCode(65+i)}`,8,1,1,5,0,0])];
  const bytes = vm.runInContext(`(()=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Sonuç');return XLSX.write(wb,{type:'array',bookType:'xlsx'});})()`,context);
  const file = path.join(folder, 'sinav.xlsx'); fs.writeFileSync(file, Buffer.from(bytes)); samples = [file];
}

(async () => {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]].filter(([name]) => !process.env.AGENDA_ENGINE || name === process.env.AGENDA_ENGINE)) {
    const executablePath = name === 'chromium' ? process.env.CHROMIUM_EXECUTABLE : process.env.WEBKIT_EXECUTABLE;
    const browser = await engine.launch({headless:true,timeout:15000,...(executablePath ? {executablePath} : {})});
    try {
      for (const width of [1440, 390]) for (const [index, file] of samples.entries()) {
        const page = await browser.newPage({viewport:{width,height:1000},timezoneId:'Europe/Istanbul'});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        // No upload, auth or data request may reach production during testing.
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          if (/\/js\/(site|site-data|user-auth)\.js/.test(url.pathname)) return route.fulfill({body:'',contentType:'application/javascript'});
          return route.continue();
        });
        await page.goto(origin + '/ogretmen-ajandasi/', {waitUntil:'load'});
        await page.locator('.nav [data-view="examsView"]').click();
        await page.locator('#examName').fill('Haftalık Deneme');
        await page.locator('#examMaxScore').fill('500');
        await page.locator('#excelFile').setInputFiles(file);
        await page.locator('#importExamBtn').click();
        await page.locator('#importReviewDialog[open]').waitFor();
        assert.equal(await page.locator('#importReviewBody .import-edit-grid tbody tr').count(), 24);
        assert.equal(await page.evaluate(() => state.exams.length), 0);
        assert.match(await page.locator('#importReviewBody').textContent(), /500 puan üzerinden/);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
        if (width === 390 && index === 0) await page.screenshot({path:path.join(folder, `review-${name}.png`)});
        await page.locator('#cancelImportReviewBtn').click();
        assert.equal(await page.evaluate(() => state.exams.length), 0);
        await page.locator('#importExamBtn').click();
        await page.locator('#confirmImportReviewBtn').click();
        assert.equal(await page.evaluate(() => state.students.length), 24);
        assert.equal(await page.evaluate(() => Object.keys(state.exams[0].results).length), 24);
        assert.equal(await page.evaluate(() => state.exams[0].scoring.maxScore), 500);
        await page.reload({waitUntil:'load'});
        assert.equal(await page.evaluate(() => Object.keys(state.exams[0].results).length), 24);
        const download = page.waitForEvent('download');
        await page.locator('.nav [data-view="examsView"]').click();
        await page.locator('#downloadExamTemplateBtn').click();
        const saved = await download;
        assert.match(saved.suggestedFilename(), /sablonu\.xlsx$/);
        assert.deepEqual(errors, []);
        console.log(`PASS ${name} ${width}, sample ${index+1}: 24 rows, preview/cancel/confirm/reload, max score, template, no overflow or production request.`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
  console.log('Browser evidence folder: ' + folder);
})().catch(error => { console.error(error); process.exitCode = 1; });
