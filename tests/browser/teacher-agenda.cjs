const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const origin = process.env.AGENDA_ORIGIN || 'http://127.0.0.1:8776';

(async () => {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]].filter(([name])=>!process.env.AGENDA_ENGINE || name===process.env.AGENDA_ENGINE)) {
    const executablePath = name === 'chromium' ? process.env.CHROMIUM_EXECUTABLE : process.env.WEBKIT_EXECUTABLE;
    const browser = await engine.launch({headless:true,timeout:15000,...(executablePath ? {executablePath} : {})});
    try {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({viewport:{width,height:1000},timezoneId:'Europe/Istanbul',hasTouch:width===390});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) return route.abort();
          // Local-only fixture: do not sign into or write to the production backend.
          if (/\/js\/(site|site-data|user-auth)\.js/.test(url.pathname)) return route.fulfill({body:'',contentType:'application/javascript'});
          return route.continue();
        });
        await page.clock.install({time:new Date('2026-10-26T09:00:00+03:00')});
        await page.addInitScript(() => {
          if (localStorage.getItem('agenda-browser-fixture')) return;
          localStorage.setItem('agenda-browser-fixture','1');
          localStorage.setItem('kemalOgretmenAjandasi.v1',JSON.stringify({
            classes:[{id:'c1',name:'2-B',year:'2026-2027'},{id:'c2',name:'3-A',year:'2026-2027'}],activeClassId:'c1',exams:[],
            students:[{id:'s1',classId:'c1',firstName:'Ada',lastName:'Kaya',schoolNo:'1'},
              {id:'s2',classId:'c1',firstName:'Efe',lastName:'Can',schoolNo:'2'},
              {id:'other',classId:'c2',firstName:'Diğer',lastName:'Öğrenci'}]
          }));
          localStorage.setItem('ogretmen_plan_v2',JSON.stringify({version:7,siniflar:[{id:'p1',name:'2-B'}],activeSinif:'p1',
            programs:{p1:{Mon:[{ders:'MATEMATİK'}],Tue:[],Wed:[],Thu:[],Fri:[]}},
            yillikPlanlar:{'MATEMATİK':[{hafta:7,tarihStart:'2026-10-26',kazanim:'MAT.2.1.1. 100’e kadar olan niceliklerin büyüklüklerini temsil etmede sayıların sembolik temsillerinden yararlanabilme. Öğrenciler farklı modellerle sayıları karşılaştırır ve öğrendiklerini günlük yaşamda uygular. TAM ÇIKTI SONU',surec:'Sayıları modellerle inceleme.'},{hafta:8,tarihStart:'2026-11-02',kazanim:'Sekizinci hafta'}]},tatiller:[],lastFocusDate:'2026-09-14'}));
        });
        await page.goto(origin+'/ogretmen-ajandasi/',{waitUntil:'load'});
        await page.locator('.nav [data-view="examsView"]').click();
        await page.locator('#manualExamName').fill('1. Deneme');
        await page.locator('#manualExamType').fill('Kazanım testi');
        await page.locator('#prepareManualExamBtn').click();
        async function counts(id,d,y,b) {
          for (const [kind,value] of Object.entries({d,y,b})) await page.locator(`[data-manual-student="${id}"] [data-subject="TÜRKÇE"][data-kind="${kind}"]`).fill(String(value));
        }
        await counts('s1',8,1,1);
        await counts('s2',10,0,0);
        assert.match(await page.locator('[data-manual-student="s1"] [data-total="score"]').textContent(),/400.*500/);
        await page.locator('#manualWrongPenalty').check();
        assert.match(await page.locator('[data-manual-student="s1"] [data-total="net"]').textContent(),/7,67/);
        await page.locator('#manualWrongPenalty').uncheck();
        await page.locator('#manualStudent').selectOption('s1');
        assert.equal(await page.locator('[data-manual-student]').count(),1);
        await page.locator('#saveManualExamBtn').click();
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kemalOgretmenAjandasi.v1')).exams[0].results.s2.total.score),500);
        await page.locator('[data-exam-edit]').click();
        await counts('s1',9,0,1);
        await page.locator('#saveManualExamBtn').click();
        await page.reload({waitUntil:'load'});
        await page.locator('.nav [data-view="examsView"]').click();
        assert.equal(await page.locator('[data-exam-edit]').count(),1);
        await page.locator('[data-exam-edit]').click();
        assert.equal(await page.locator('[data-manual-student="s1"] [data-kind="d"]').first().inputValue(),'9');
        const screenshot = path.join(os.tmpdir(),`teacher-agenda-${name}-${width}.png`);
        await page.locator('.manual-results-wrap').scrollIntoViewIfNeeded();
        await page.screenshot({path:screenshot});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),'No page-wide horizontal overflow');
        await page.locator('[data-exam-ranking]').click();
        assert.match(await page.locator('#reportCard').textContent(),/Ada Kaya/);
        assert.match(await page.locator('#reportCard').textContent(),/500/);
        await page.locator('#reportType').selectOption('academic');
        await page.locator('#reportStudent').selectOption('__all__');
        assert.equal(await page.locator('.student-report-page').count(),2);
        assert.doesNotMatch(await page.locator('#reportCard').textContent(),/Diğer Öğrenci/);
        if (name==='chromium' && width===1440) {
          const downloadEvent=page.waitForEvent('download');
          await page.locator('#downloadPdfBtn').click();
          const download=await downloadEvent;
          const pdfPath=path.join(os.tmpdir(),'teacher-agenda-class.pdf');
          await download.saveAs(pdfPath);
          assert.ok(fs.statSync(pdfPath).size>10000);
        }
        await page.locator('.nav [data-view="scheduleView"]').click();
        const frame = page.frames().find(frame=>frame.url().includes('ders-programi.html'));
        assert.equal(await frame.evaluate('state.currentWeek'),7);
        assert.deepEqual(errors,[]);
        const more = frame.locator('.learning-output-more').first();
        await more.click();
        assert.match(await frame.locator('#learning-output-popover').textContent(),/TAM ÇIKTI SONU/);
        assert.equal(await more.getAttribute('aria-expanded'),'true');
        await frame.locator('.learning-output-popover-close').click();
        await more.focus();
        await page.keyboard.press('Enter');
        assert.equal(await more.getAttribute('aria-expanded'),'true');
        await page.keyboard.press('Escape');
        assert.equal(await more.getAttribute('aria-expanded'),'false');
        await frame.locator('#week-jump').selectOption('6');
        await page.clock.setSystemTime(new Date('2026-11-02T00:01:00+03:00'));
        await page.clock.runFor(30050);
        assert.equal(await frame.evaluate('state.currentWeek'),8);
        assert.deepEqual(errors,[]);
        console.log(`PASS ${name} ${width}: save/edit/reload, live net/score, rankings, class reports, full outcome, Monday rollover. Screenshot: ${screenshot}`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
