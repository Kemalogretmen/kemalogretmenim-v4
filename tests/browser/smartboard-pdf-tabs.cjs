const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {PDFDocument,rgb}=require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
async function file(name,color,count=2){const d=await PDFDocument.create();for(let i=0;i<count;i++){const p=d.addPage([600,800]);p.drawRectangle({x:0,y:0,width:600,height:800,color:rgb(...color)});p.drawText(name+' '+(i+1),{x:60,y:700,size:22});}return{name:name+'.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())};}
(async()=>{
 const a=await file('Birinci',[.86,.95,.97]),b=await file('Ikinci',[.98,.94,.79],3),c=await file('Ucuncu',[.93,.88,.97]);
 for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]]){
  const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
  try{for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:width<700,deviceScaleFactor:2,acceptDownloads:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
   await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
   async function ready(label){await page.waitForFunction(n=>{const s=document.querySelector('#whiteboardStage'),t=document.querySelector('.pdf-tabs [aria-selected=true]');return !!t&&t.textContent===n&&!s.hasAttribute('data-pdf-busy')&&!s.hasAttribute('data-pdf-rendering');},label);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);assert.equal(await page.locator('.pdf-status.is-error').count(),0);}
   await page.locator('#smartboardPdfInput').setInputFiles(a);await ready('Birinci.pdf');
   await page.locator('[data-pdf=next]').click();await ready('Birinci.pdf');
   const canvas=page.locator('#whiteboardPreviewCanvas'),r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.35,r.y+r.height*.45);await page.mouse.down();await page.mouse.move(r.x+r.width*.65,r.y+r.height*.45,{steps:20});await page.mouse.up();
   const alpha=()=>page.locator('#whiteboardCanvas').evaluate(c=>{const d=c.getContext('2d').getImageData(Math.floor(c.width*.5)-3,Math.floor(c.height*.45)-3,7,7).data;return Math.max(...Array.from(d).filter((_,i)=>i%4===3));});
   assert(await alpha()>200);
   await page.locator('#smartboardPdfInput').setInputFiles([b,c]);await ready('Ucuncu.pdf');assert.equal(await page.getByRole('tab').count(),3);assert.equal(await alpha(),0);
   await page.getByRole('tab',{name:'Birinci.pdf',exact:true}).click();await ready('Birinci.pdf');assert.equal(await page.locator('.pdf-page-nav input').inputValue(),'2');assert(await alpha()>200);
   await page.locator('#boardUndoBtn').click();assert.equal(await alpha(),0);await page.locator('#boardRedoBtn').click();assert(await alpha()>200);
   await page.getByRole('tab',{name:'Ikinci.pdf',exact:true}).click();await ready('Ikinci.pdf');assert.equal(await alpha(),0);await page.locator('[data-pdf=next]').click();await ready('Ikinci.pdf');
   await page.getByRole('tab',{name:'Birinci.pdf',exact:true}).click();await ready('Birinci.pdf');
   await page.waitForFunction(()=>document.querySelector('.pdf-cache-status').textContent.includes('3 PDF kaydedildi'));
   await page.reload({waitUntil:'load'});await page.locator('[data-pdf=resume]').click();await ready('Birinci.pdf');assert.equal(await page.getByRole('tab').count(),3);assert(await alpha()>200);assert.equal(await page.locator('.pdf-page-nav input').inputValue(),'2');
   await page.getByRole('tab',{name:'Ikinci.pdf',exact:true}).click();await ready('Ikinci.pdf');assert.equal(await page.locator('.pdf-page-nav input').inputValue(),'2');assert.equal(await alpha(),0);
   await page.locator('#whiteboardStage').screenshot({path:`/tmp/smartboard-tabs-multi-${name}-${width}.png`});
   await page.locator('[data-pdf-tab-close]').filter({has:page.locator('svg')}).first().click();await ready('Ikinci.pdf');assert.equal(await page.getByRole('tab').count(),2);
   await page.getByRole('button',{name:'PDF sekmesini kapat: Ikinci.pdf',exact:true}).click();await ready('Ucuncu.pdf');assert.equal(await page.getByRole('tab').count(),1);
   await page.getByRole('button',{name:'PDF sekmesini kapat: Ucuncu.pdf',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#boardPlane').classList.contains('has-pdf'));assert(await page.locator('#smartboardPdfBar').isHidden());assert.equal(await page.locator('.pdf-status.is-error').count(),0);
   await page.locator('#smartboardPdfInput').setInputFiles(a);await ready('Birinci.pdf');
   await page.locator('#whiteboardStage').screenshot({path:`/tmp/smartboard-tabs-${name}-${width}.png`});
   await page.locator('#smartboardPdfInput').setInputFiles([b,c,a,b,c,a,b]);await ready('Ikinci.pdf');assert.equal(await page.getByRole('tab').count(),8);
   const firstId=await page.getByRole('tab').first().getAttribute('id');await page.locator('.pdf-tabs [aria-selected=true]').focus();await page.keyboard.press('Home');await ready('Birinci.pdf');assert.equal(await page.locator('.pdf-tabs [aria-selected=true]').getAttribute('id'),firstId);
   await page.locator('#smartboardPdfInput').setInputFiles(c);assert.equal(await page.getByRole('tab').count(),8);assert.match(await page.locator('.pdf-status').textContent(),/En fazla 8/);
   assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: multi-select, independent pages/ink/undo, workspace resume, active/inactive/last close`);await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
