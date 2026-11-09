const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const origin = process.env.AGENDA_ORIGIN || 'http://127.0.0.1:8776';
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'agenda-analysis-browser-'));

(async()=>{
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try {
    for(const width of [1440,390]) {
      const page=await browser.newPage({viewport:{width,height:1000},timezoneId:'Europe/Istanbul'});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(/\/js\/(site|site-data|user-auth)\.js/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
        return route.continue();
      });
      await page.goto(origin+'/ogretmen-ajandasi/',{waitUntil:'load'});
      await page.evaluate(()=>{
        state=normalizeState({classes:[{id:'c',name:'2-B',year:'2026-2027'},{id:'other',name:'3-A'}],activeClassId:'c',students:Array.from({length:24},(_,i)=>({id:'s'+i,classId:'c',schoolNo:String(i+1),firstName:'Örnek Öğrenci',lastName:String.fromCharCode(65+i)})),exams:[]});
        state.students.push({id:'foreign',classId:'other',firstName:'YABANCI',lastName:'ÖĞRENCİ'});
        state.exams=Array.from({length:12},(_,i)=>({id:'e'+i,classId:'c',name:'Deneme '+(i+1),date:'2026-10-'+String(i+1).padStart(2,'0'),subjects:['TÜRKÇE','MATEMATİK'],scoring:{maxScore:500},results:Object.fromEntries(state.students.filter(s=>s.id!=='s23'||i%3!==0).map(s=>[s.id,makeResult({'TÜRKÇE':{d:s.id==='foreign'?0:i%2?8:4,y:0,b:s.id==='foreign'?10:i%2?2:6},'MATEMATİK':{d:10,y:0,b:0}},{maxScore:500})]))}));
        renderAll();saveState();
      });
      await page.locator('.nav [data-view="reportsView"]').click();
      await page.locator('[data-report-mode="classAnalysis"]').click();
      assert.match(await page.locator('.analysis-report-score').textContent(),/%80/);
      assert.equal(await page.locator('#reportCard .analysis-chart-scroll').count(),2);
      assert.doesNotMatch(await page.locator('#reportCard').textContent(),/YABANCI/);
      await page.locator('#reportExam').selectOption('e0');
      assert.match(await page.locator('.analysis-report-score').textContent(),/%70/);
      await page.locator('#reportExam').selectOption('__selected__');
      for(const input of await page.locator('#reportExamPicker input').all()) await input.uncheck();
      await page.locator('#reportExamPicker input[value="e0"]').check();
      await page.locator('#reportExamPicker input[value="e1"]').check();
      assert.match(await page.locator('.analysis-report-score').textContent(),/%80/);
      await page.locator('#subjectPicker input[value="MATEMATİK"]').uncheck();
      assert.match(await page.locator('.analysis-report-score').textContent(),/%60/);
      await page.locator('#reportExam').selectOption('__all__');
      await page.locator('#subjectPicker input[value="MATEMATİK"]').uncheck();
      await page.locator('#analysisStudentNames').uncheck();
      assert.doesNotMatch(await page.locator('#reportCard').textContent(),/Örnek Öğrenci/);
      const excelEvent=page.waitForEvent('download');await page.locator('#downloadAnalysisExcelBtn').click();
      const excel=await excelEvent;assert.match(excel.suggestedFilename(),/sinif-analizi.xlsx$/);
      const excelPath=path.join(folder,'class-'+width+'.xlsx');await excel.saveAs(excelPath);
      assert.ok(fs.statSync(excelPath).size>5000);
      const sheets=await page.evaluate(bytes=>{
        const wb=XLSX.read(new Uint8Array(bytes),{type:'array'});return {names:wb.SheetNames,summary:XLSX.utils.sheet_to_json(wb.Sheets['Özet'],{header:1})};
      },[...fs.readFileSync(excelPath)]);
      assert.ok(!sheets.names.includes('Öğrenciler'));assert.equal(sheets.summary[1][1],60);
      await page.locator('#analysisStudentNames').check();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page-wide overflow');
      assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('#reportCard'),'::before').display==='none'),'No decorative layer covers class content');
      await page.locator('#reportsView').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(folder,'analysis-'+width+'.png')});
      await page.locator('#reportCard').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(folder,'report-'+width+'.png')});
      const pixels=await page.evaluate(async()=>{const canvas=await renderReportCanvas(reportExportTargets()[0]);const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;for(let i=0;i<data.length;i+=4)if(data[i]<220||data[i+1]<220||data[i+2]<220)ink++;return {width:canvas.width,height:canvas.height,ink};});
      assert.ok(pixels.width>=1000&&pixels.height>300&&pixels.ink>10000,'Nonblank report/chart export');
      if(width===1440) {
        const pdfEvent=page.waitForEvent('download');await page.locator('#downloadPdfBtn').click();
        const pdf=await pdfEvent;await pdf.saveAs(path.join(folder,'class-analysis.pdf'));
        assert.ok(fs.statSync(path.join(folder,'class-analysis.pdf')).size>20000);
      }
      await page.locator('[data-report-mode="comparison"]').click();
      await page.locator('#reportStudent').selectOption('s0');
      assert.ok(await page.locator('#reportCard .class-line').count()>0);
      assert.match(await page.locator('#reportCard').textContent(),/Sınıf Ort\./);

      await page.locator('.nav [data-view="examsView"]').click();
      const workbook=async(rows)=>Buffer.from(await page.evaluate(rows=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Sonuç');return [...new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}))];},rows));
      const upload=async(name,rows)=>{await page.locator('#examName').fill(name);await page.locator('#excelFile').setInputFiles({name:name+'.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await workbook(rows)});};
      const before=await page.evaluate(()=>state.exams.length);
      await upload('Temiz yükleme',[['Okul No','Ad Soyad','Türkçe D','Türkçe Y','Türkçe B'],['1','Örnek Öğrenci A',8,1,1]]);
      await page.locator('#uploadExamBtn').click();
      await page.waitForFunction(n=>state.exams.length===n+1,before);
      assert.equal(await page.locator('#importReviewDialog[open]').count(),0);
      await upload('Düzeltilecek',[['Okul No','Ad Soyad','Türkçe D','Türkçe Y','Türkçe B'],['1','Örnek Öğrenci A','O',1,1]]);
      await page.locator('#uploadExamBtn').click();await page.locator('#importReviewDialog[open]').waitFor();
      assert.ok(await page.locator('#confirmImportReviewBtn').isDisabled());
      await page.locator('[data-edit-import-row="0"] [data-import-field="d"]').fill('8');
      await page.locator('[data-recheck-import]').click();
      assert.ok(await page.locator('#confirmImportReviewBtn').isEnabled());
      await page.locator('#confirmImportReviewBtn').click();assert.equal(await page.evaluate(()=>state.exams.length),before+2);
      await upload('Eşleştirme',[['Kimlik','Kişi','Başarı','Hata','Cevapsız'],['1','Örnek Öğrenci A',7,2,1]]);
      await page.locator('#mapExamColumnsBtn').click();await page.locator('#mappingName').selectOption('1');await page.locator('#mappingSchoolNo').selectOption('0');
      await page.locator('[data-mapping-subject]').fill('Türkçe');
      for(const [key,col]of [['d','2'],['y','3'],['b','4']])await page.locator(`[data-mapping-kind="${key}"]`).selectOption(col);
      await page.locator('#applyExamMappingBtn').click();await page.locator('#importReviewDialog[open]').waitFor();
      await page.screenshot({path:path.join(folder,'import-'+width+'.png')});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Import no page overflow');
      await page.locator('#confirmImportReviewBtn').click();assert.equal(await page.evaluate(()=>state.exams.length),before+3);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}: class means, filters, privacy, charts/canvas/PDF/Excel, clean upload, corrections and column mapping.`);
      await page.close();
    }
  } finally {await browser.close();}
  console.log('Evidence: '+folder);
})().catch(error=>{console.error(error);process.exitCode=1;});
