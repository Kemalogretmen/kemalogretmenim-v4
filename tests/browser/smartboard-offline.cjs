const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {PDFDocument}=require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
    const doc=await PDFDocument.create();doc.addPage([600,800]).drawText('OFFLINE LOCAL PDF',{x:60,y:650});
    const file={name:'Offline.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())};
    await page.locator('#smartboardPdfInput').setInputFiles(file);await page.waitForSelector('#boardPlane.has-pdf');
    await page.waitForFunction(()=>!document.querySelector('#whiteboardStage').hasAttribute('data-pdf-rendering'));
    await page.locator('.pdf-layout-select').selectOption('facing');
    await page.locator('[data-pdf=menu]').click();await page.locator('[data-pdf=offline]').click();
    await page.waitForFunction(()=>document.querySelector('.pdf-status').textContent.includes('Çevrimdışı kullanım hazır')||document.querySelector('.pdf-status').classList.contains('is-error'),{timeout:120000});
    assert.match(await page.locator('.pdf-status').textContent(),/Çevrimdışı kullanım hazır/);
    await page.waitForTimeout(4500);await context.setOffline(true);await page.reload({waitUntil:'load'});
    await page.locator('.pdf-notice [data-pdf=resume]').click();await page.waitForFunction(()=>document.querySelector('#boardPlane.has-pdf')&&!document.querySelector('#whiteboardStage').hasAttribute('data-pdf-rendering'));
    assert.equal(await page.locator('.pdf-layout-select').inputValue(),'facing');await page.locator('.pdf-reading-tools [data-pdf-input=text]').click();await page.waitForSelector('.pdf-text-layer span');
    await page.locator('[data-pdf=menu]').click();const download=page.waitForEvent('download');await page.locator('[data-pdf=export]').click();await(await download).saveAs('/tmp/smartboard-offline-export.pdf');
    const keys=await page.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('kemal-smartboard-pdf-v1');q.onsuccess=()=>r(q.result);});const keys=await new Promise(r=>{const t=db.transaction('session');const q=t.objectStore('session').getAllKeys();q.onsuccess=()=>r(q.result);});db.close();return keys;});assert.deepEqual(keys,['last','source']);
    await page.screenshot({path:'/tmp/smartboard-offline.png'});assert.deepEqual(errors,[]);
    console.log('PASS: offline reload, local resume, local PDF export, single bounded document store');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
