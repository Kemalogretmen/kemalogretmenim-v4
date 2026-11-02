const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const XLSX=require('../../ogretmen-ajandasi/vendor/xlsx.full.min.js');
const origin=process.env.AGENDA_ORIGIN||'http://127.0.0.1:8776';
function workbook(sheets) {
  const book=XLSX.utils.book_new();
  for (const [name,rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),name);
  return Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
}
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try {
    for(const width of [1440,390]) {
      const page=await browser.newPage({viewport:{width,height:1000},locale:'tr-TR',timezoneId:'Europe/Istanbul',hasTouch:width===390});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',dialog=>dialog.accept());
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(/\/js\/(site|site-data|user-auth|ogretmen-paneli)\.js/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
        return route.continue();
      });
      await page.addInitScript(()=>{
        if(localStorage.getItem('roster-ui-fixture'))return;
        localStorage.setItem('roster-ui-fixture','1');
        localStorage.setItem('kemalOgretmenAjandasi.v1',JSON.stringify({classes:[{id:'a',name:'2-B'},{id:'b',name:'3-A'}],activeClassId:'a',exams:[],students:[
          {id:'s1',classId:'a',schoolNo:'1',firstName:'Ada',lastName:'Kaya'},
          {id:'s2',classId:'a',schoolNo:'2',firstName:'Efe',lastName:'Can'},
          {id:'s3',classId:'b',schoolNo:'2',firstName:'Başka',lastName:'Öğrenci'}]}));
        localStorage.setItem('ogretmen_plan_v2',JSON.stringify({version:7,siniflar:[{id:'p1',name:'2-B'}],activeSinif:'p1',programs:{p1:{Mon:[{ders:'MATEMATİK'}],Tue:[{ders:'TÜRKÇE'}]}},yillikPlanlar:{'TÜRKÇE':[{hafta:8,tarihStart:'2026-11-02',kazanim:'Plan korunur'}]},tatiller:[]}));
      });
      await page.goto(origin+'/ogretmen-ajandasi/',{waitUntil:'load'});
      await page.locator('.agenda-panel-link').click();
      assert.equal(new URL(page.url()).pathname,'/ogretmen-paneli.html');
      assert.equal(await page.locator('.teacher-tabs a[href="/ogretmen-ajandasi/index.html"]').count(),1);
      // Only expose the static fixture layout; no real account or backend is used.
      await page.evaluate(()=>document.querySelector('.teacher-shell').classList.remove('teacher-loading'));
      await page.locator('#section-home a[href="/ogretmen-ajandasi/index.html"]').click();
      await page.locator('.nav [data-view="studentsView"]').click();
      await page.locator('#studentImportPanel summary').click();
      const bytes=workbook({List:[['Okul No','Ad','Soyad'],['001','Ada','Kaya'],['3','Deniz','Öztürk'],['4','Ece','Can'],['3','Deniz','Öztürk'],['1','Yanlış','İsim']],Other:[['Ad Soyad'],['Yeni Sınıf']]});
      await page.locator('#studentRosterFile').setInputFiles({name:'ogrenciler.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
      await page.locator('#previewStudentImportBtn').click();
      await page.waitForFunction(()=>!!pendingStudentImport);
      assert.equal(await page.locator('[data-roster-row]').count(),5);
      assert.equal(await page.evaluate(()=>state.students.length),3);
      await page.locator('[data-roster-row="2"]').uncheck();
      await page.locator('#studentImportPreview').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(os.tmpdir(),`agenda-roster-${width}.png`)});
      await page.locator('#confirmStudentImportBtn').click();
      assert.equal(await page.evaluate(()=>state.students.length),4);
      assert.equal(await page.evaluate(()=>state.students.some(student=>student.firstName==='Ece')),false);
      await page.locator('#previewStudentImportBtn').click();
      assert.equal(await page.locator('[data-roster-row="1"]').isDisabled(),true);
      await page.locator('#studentImportClass').selectOption('b');
      await page.locator('#studentImportSheet').selectOption('Other');
      await page.waitForFunction(()=>pendingStudentImport?.classId==='b');
      await page.locator('#confirmStudentImportBtn').click();
      assert.equal(await page.locator('#activeClassSelect').inputValue(),'b');
      assert.equal(await page.evaluate(()=>state.students.filter(student=>student.classId==='b').length),2);
      const downloadEvent=page.waitForEvent('download');
      await page.locator('#exportStudentRosterBtn').click();
      const download=await downloadEvent;
      const book=XLSX.read(await fs.readFile(await download.path()),{type:'buffer'});
      const exported=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1});
      assert.equal(exported.length,3);
      assert.doesNotMatch(JSON.stringify(exported),/Deniz|Ada/);
      await page.reload({waitUntil:'load'});
      await page.locator('.nav [data-view="scheduleView"]').click();
      let frame=page.frames().find(frame=>frame.url().includes('ders-programi.html'));
      const setup=async()=>{
        await frame.getByRole('button',{name:'Ders Programı Ayarla',exact:false}).click();
        if(!await frame.locator('#lesson-catalog-panel').evaluate(node=>node.open)) await frame.locator('#lesson-catalog-panel > summary').click();
      };
      await setup();
      assert.equal(await frame.locator('#program-card').isVisible(),true);
      await frame.locator('#new-lesson-name').fill('Satranç');
      await frame.locator('#lesson-catalog-form button').click();
      let select=frame.locator('.cell-select[data-gun="Mon"][data-row="0"]');
      await select.selectOption('SATRANÇ');
      await frame.getByRole('button',{name:'Programı Kaydet',exact:false}).click();
      await page.reload({waitUntil:'load'});
      await page.locator('.nav [data-view="scheduleView"]').click();
      frame=page.frames().find(frame=>frame.url().includes('ders-programi.html'));
      await setup();
      select=frame.locator('.cell-select[data-gun="Mon"][data-row="0"]');
      assert.equal(await select.inputValue(),'SATRANÇ');
      await frame.getByRole('button',{name:'Pazartesi 1. ders: SATRANÇ dersini kaldır',exact:true}).click();
      assert.equal(await select.inputValue(),'');
      await frame.getByRole('button',{name:'TÜRKÇE dersini sil',exact:true}).click();
      assert.equal(await frame.locator('.cell-select[data-gun="Tue"][data-row="0"]').inputValue(),'');
      assert.equal(await frame.evaluate(`state.yillikPlanlar['TÜRKÇE'][0].kazanim`),'Plan korunur');
      await frame.locator('#removed-lessons summary').click();
      await frame.getByRole('button',{name:'TÜRKÇE dersini geri ekle',exact:true}).click();
      assert.ok(await frame.locator('.cell-select[data-gun="Tue"][data-row="0"] option[value="TÜRKÇE"]').count());
      await frame.locator('#lesson-catalog-form').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(os.tmpdir(),`agenda-lessons-${width}.png`)});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}: reciprocal links, real XLSX preview/selection/import/export, saved custom lessons, clear/delete/restore, no JS errors.`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
