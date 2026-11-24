const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium,webkit}=require('playwright');
const {PDFDocument,rgb,degrees}=require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
(async()=>{
  const doc=await PDFDocument.create();
  for(let i=0;i<3;i++){const p=doc.addPage(i===2?[800,500]:[600,800]);p.drawRectangle({x:50,y:60,width:450,height:600,color:rgb(.88,.95,.97)});p.drawText('LOCAL PDF PAGE '+(i+1),{x:70,y:650,size:24});if(i===1){p.setCropBox(20,30,540,720);p.setRotation(degrees(90));}}
  const fixture=Buffer.from(await doc.save());
  for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]].filter(x=>!process.env.PDF_ENGINE||x[0]===process.env.PDF_ENGINE)){
    const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
    try{for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:width<700,deviceScaleFactor:2,acceptDownloads:true});
      const page=await context.newPage(), errors=[], requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('browser error',e.stack);});
      await page.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin)return r.abort();requests.push({url:r.request().url(),method:r.request().method()});return r.continue();});
      page.on('dialog',d=>d.accept());
      await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
      await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
      async function ready(){await page.waitForFunction(()=>document.querySelector('#boardPlane.has-pdf')&&!document.querySelector('#whiteboardStage').hasAttribute('data-pdf-rendering')&&!document.querySelector('#whiteboardStage').hasAttribute('data-pdf-busy'));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);assert.equal(await page.locator('.pdf-status.is-error').count(),0);}
      await page.locator('#smartboardPdfInput').setInputFiles({name:'Yerel-belge.pdf',mimeType:'application/pdf',buffer:fixture});await ready();
      assert.equal(await page.locator('.pdf-count').textContent(),'/ 3');
      assert(await page.locator('#smartboardPdfCanvas').evaluate(c=>{let d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,n=0;for(let i=0;i<d.length;i+=400)if(d[i]<240)n++;return n>50&&c.width*c.height<=1810000;}));
      async function ink(){const c=page.locator('#whiteboardPreviewCanvas'),r=await c.boundingBox();const x=r.x+r.width*.4,y=r.y+r.height*.4;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+r.width*.2,y,{steps:20});await page.mouse.up();await page.waitForTimeout(100);const alpha=await c.evaluate(c=>{const d=document.querySelector('#whiteboardCanvas'),p=d.getContext('2d').getImageData(Math.floor(d.width*.5),Math.floor(d.height*.4),1,1).data;return p[3];});if(alpha<=200){await page.screenshot({path:'/tmp/pdf-ink-fail.png'});console.log('ink failure',name,width,r,alpha);}return alpha;}
      assert(await ink()>200);
      await page.locator('[data-pdf=next]').click();await ready();assert.equal(await page.locator('.pdf-page-nav input').inputValue(),'2');
      assert(await ink()>200);await page.locator('[data-pdf=prev]').click();await ready();
      assert(await page.locator('#whiteboardCanvas').evaluate(c=>c.getContext('2d').getImageData(Math.floor(c.width*.5),Math.floor(c.height*.4),1,1).data[3]>200));
      await page.locator('[data-pdf=menu]').click();
      await page.locator('.pdf-search-label input').fill('LOCAL');await page.waitForFunction(()=>document.querySelectorAll('.pdf-search-highlights polygon').length>0);
      await page.locator('[data-pdf=bookmark]').click();assert.equal(await page.locator('.pdf-bookmarks option').count(),2);
      await page.locator('[data-pdf=duplicate]').click();assert.equal(await page.locator('.pdf-count').textContent(),'/ 4');
      await page.locator('[data-pdf=delete]').click();assert.equal(await page.locator('.pdf-count').textContent(),'/ 3');await ready();
      const projectWait=page.waitForEvent('download');await page.locator('[data-pdf=project]').click();const project=await projectWait;await project.saveAs(`/tmp/smartboard-${name}-${width}.tahta`);
      await page.waitForTimeout(1000);const exportWait=page.waitForEvent('download');await page.locator('[data-pdf=export]').click();const exp=await exportWait;const output=`/tmp/smartboard-${name}-${width}.pdf`;await exp.saveAs(output);
      const saved=await PDFDocument.load(await fs.readFile(output));assert.equal(saved.getPageCount(),3);assert.equal(saved.getPages()[1].getRotation().angle,90);
      await page.locator('#smartboardPdfInput').setInputFiles(output);await ready();
      async function exportedInk(){return page.locator('#smartboardPdfCanvas').evaluate(c=>{const x=Math.floor(c.width*.5),y=Math.floor(c.height*.4),d=c.getContext('2d').getImageData(x-2,y-2,5,5).data;for(let i=0;i<d.length;i+=4)if(d[i]<70&&d[i+1]<70&&d[i+2]<100)return true;return false;});}
      assert(await exportedInk(),'exported first-page drawing stays aligned');await page.locator('[data-pdf=next]').click();await ready();assert(await exportedInk(),'rotated/cropped exported drawing stays aligned');
      await page.locator('#smartboardPdfInput').setInputFiles(`/tmp/smartboard-${name}-${width}.tahta`);await ready();
      await page.waitForTimeout(5500);console.log('cache',name,width,await page.locator('.pdf-cache-status').textContent());await page.reload({waitUntil:'load'});await page.locator('.pdf-notice [data-pdf=resume]').click();await ready();
      assert.equal(await page.locator('.pdf-page-nav input').inputValue(),'2');
      assert(await page.locator('#whiteboardCanvas').evaluate(c=>c.getContext('2d').getImageData(Math.floor(c.width*.5),Math.floor(c.height*.4),1,1).data[3]>200));
      await page.locator('#smartboardPdfInput').setInputFiles(`/tmp/smartboard-${name}-${width}.tahta`);await ready();
      await page.locator('#whiteboardStage').screenshot({path:`/tmp/smartboard-pdf-${name}-${width}.png`});
      await page.locator('#boardAddonsBtn').click();await page.locator('[data-sb-tool=noise]').click();
      assert(await page.locator('.sb-noise-bubbles span').count()===16);assert(await page.locator('.sb-noise-graph').isVisible());
      await page.evaluate(()=>{window.__micStopped=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){window.__micStopped++;}}]})}});window.AudioContext=class{resume(){return Promise.resolve();}close(){return Promise.resolve();}createMediaStreamSource(){return{connect(){}};}createAnalyser(){return{fftSize:1024,getByteTimeDomainData(a){for(let i=0;i<a.length;i++)a[i]=i%2?170:86;}};}};});
      await page.locator('[data-widget=noise] .sb-command').click();await page.waitForFunction(()=>document.querySelector('.sb-noise-scene').classList.contains('is-loud'));assert((await page.locator('.sb-noise-line').getAttribute('d')).length>5);
      await page.locator('[data-sb-action=noise-fullscreen]').click();assert(await page.locator('.is-noise-expanded').isVisible());
      await page.screenshot({path:`/tmp/smartboard-noise-${name}-${width}.png`});
      await page.locator('[data-widget=noise] [data-sb-action=close]').click();assert.equal(await page.locator('[data-widget=noise]').count(),0);assert.equal(await page.evaluate(()=>window.__micStopped),1);
      await page.locator('[data-pdf=fullscreen]').click();await page.locator('#boardStageExitFs').waitFor({state:'visible'});await page.locator('#boardStageExitFs').click();
      await page.waitForFunction(()=>!document.fullscreenElement&&!document.webkitFullscreenElement);
      await page.locator('#whiteboardStage').evaluate(el=>{el.requestFullscreen=undefined;el.webkitRequestFullscreen=undefined;});
      await page.locator('[data-pdf=fullscreen]').click();await page.waitForSelector('#whiteboardStage.is-board-fullscreen');
      assert.equal(await page.locator('#smartboardPdfBar').evaluate(el=>el.parentElement.id),'whiteboardStage');await page.locator('#boardStageExitFs').click();assert.equal(await page.locator('.is-board-fullscreen').count(),0);
      await page.locator('#sandGroupBtn').click();await page.locator('.board-plane.sand-mode').waitFor();assert(await page.locator('#smartboardPdfBar').isHidden());await page.locator('#sandCloseBtn').click();assert(await page.locator('#smartboardPdfBar').isVisible());
      assert(!requests.some(r=>r.method==='POST'&&r.url.includes('pdf')));assert.deepEqual(errors,[]);
      console.log(`PASS ${name} ${width}: PDF pixels, annotations, rotated export, page operations, local project/resume, noise fullscreen`);await context.close();
    }}finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
