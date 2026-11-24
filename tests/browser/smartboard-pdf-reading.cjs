const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {PDFDocument,rgb,degrees}=require('../../vendor/smartboard-pdf/pdf-lib.min.js');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
(async()=>{
 const d=await PDFDocument.create();for(let i=0;i<20;i++){const p=d.addPage([600,800]);p.drawRectangle({x:0,y:0,width:600,height:800,color:rgb(.92,.97,.98)});p.drawText('READ PAGE '+(i+1),{x:70,y:650,size:24});if(i===19)p.setRotation(degrees(90));}const fixture=Buffer.from(await d.save());
 for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]].filter(x=>!process.env.PDF_ENGINE||x[0]===process.env.PDF_ENGINE)){
 const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
 try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,isMobile:width<700,deviceScaleFactor:2}),page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack);});page.on('dialog',d=>d.accept());
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
 await page.locator('#smartboardPdfInput').setInputFiles({name:'Reading.pdf',mimeType:'application/pdf',buffer:fixture});
 async function ready(n){await page.waitForFunction(n=>{const s=document.querySelector('#whiteboardStage');return document.querySelector('#boardPlane.has-pdf')&&!s.hasAttribute('data-pdf-busy')&&!s.hasAttribute('data-pdf-rendering')&&(!n||document.querySelector('.pdf-page-nav input').value===String(n));},n);await page.waitForTimeout(150);assert.equal(await page.locator('.pdf-status.is-error').count(),0);}
 await ready(1);await page.evaluate(()=>document.fonts.ready);
 await page.locator('.pdf-layout-select').selectOption('facing');await ready(1);
 const first=await page.locator('.pdf-view-page[data-pdf-page="0"]').boundingBox(),second=await page.locator('.pdf-view-page[data-pdf-page="1"]').boundingBox();assert(Math.abs(first.y-second.y)<2);assert(second.x>first.x+first.width);
 const x=second.x+second.width*.4,y=second.y+second.height*.45;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+second.width*.2,y,{steps:16});await page.mouse.up();await ready(2);
 const ink=()=>page.locator('#whiteboardCanvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)n++;return n;});assert(await ink()>20,'writing on the inactive page activates and writes on that page');
 await page.locator('[data-board-tool=select]').first().click();await page.mouse.click(x+second.width*.1,y);
 await page.evaluate(()=>{window.__pdfClip=new DataTransfer();document.body.dispatchEvent(new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:window.__pdfClip}));});
 await page.locator('.pdf-page-nav input').fill('3');await page.locator('.pdf-page-nav input').press('Enter');await page.locator('.pdf-page-nav input').blur();await ready(3);
 await page.evaluate(()=>document.body.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:window.__pdfClip})));assert(await ink()>20);
 await page.keyboard.press('Control+z');assert.equal(await ink(),0,'one undo removes exactly one paste');await page.keyboard.press('Control+Shift+z');assert(await ink()>20);
 await page.locator('.pdf-reading-tools [data-pdf-input=text]').click();await page.waitForSelector('.pdf-text-layer span');
 await page.locator('.pdf-text-layer span').filter({hasText:'READ PAGE'}).first().evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(range);});
 assert.match(await page.evaluate(()=>String(getSelection())),/READ PAGE/);
 await page.locator('#whiteboardStage').screenshot({path:`/tmp/pdf-reading-text-${name}-${width}.png`});
 await page.locator('.pdf-reading-tools [data-pdf-input=copy]').click();await page.waitForTimeout(100);await page.locator('.pdf-reading-tools [data-pdf-input=paste]').click();assert(await page.locator('.pdf-text-layer').isHidden());
 await page.locator('.pdf-reading-tools [data-pdf-input=pan]').click();await page.keyboard.press('Home');await ready(1);await page.keyboard.press('PageDown');await ready(3);await page.keyboard.press('PageUp');await ready(1);
 await page.keyboard.press('End');await ready(20);await page.locator('.pdf-reading-tools [data-pdf-input=text]').click();await page.waitForSelector('.pdf-text-layer span');
 const aligned=await page.locator('.pdf-text-layer span').filter({hasText:'READ PAGE'}).first().evaluate(el=>{const r=el.getBoundingClientRect(),c=document.querySelector('#smartboardPdfCanvas'),b=c.getBoundingClientRect(),x=Math.max(0,Math.floor((r.left-b.left)*c.width/b.width)-2),y=Math.max(0,Math.floor((r.top-b.top)*c.height/b.height)-2),w=Math.min(c.width-x,Math.ceil(r.width*c.width/b.width)+4),h=Math.min(c.height-y,Math.ceil(r.height*c.height/b.height)+4);if(w<1||h<1)return false;const data=c.getContext('2d').getImageData(x,y,w,h).data;for(let i=0;i<data.length;i+=4)if(data[i]<80&&data[i+1]<80&&data[i+2]<80)return true;return false;});assert(aligned,'rotated text layer covers the printed PDF glyphs');
 await page.locator('.pdf-reading-tools [data-pdf-input=pan]').click();await page.keyboard.press('Home');await ready(1);
 await page.locator('.pdf-layout-select').selectOption('continuous');await ready(1);
 await page.locator('#whiteboardStage').evaluate(s=>{const c=document.querySelector('.pdf-view-page[data-pdf-page="9"]');s.scrollTop=c.parentElement.offsetTop+c.offsetTop-Number(s.dataset.pdfTop);});await ready(10);
 await page.waitForTimeout(300);const budget=await page.locator('.pdf-view-background,.pdf-view-notes').evaluateAll(cs=>cs.reduce((s,c)=>s+c.width*c.height,0));assert(budget<3700000,'offscreen page bitmaps stay bounded: '+budget);
 const r=await page.locator('#whiteboardPreviewCanvas').boundingBox(),cx=r.x+r.width*.5,cy=Math.max(r.y+80,Math.min(650,r.y+r.height*.5));
 const before=await page.locator('#whiteboardPreviewCanvas').evaluate((c,p)=>{const r=c.getBoundingClientRect();return{x:(p.x-r.left)/r.width,y:(p.y-r.top)/r.height};},{x:cx,y:cy});
 const z=await page.locator('.pdf-zoom').evaluate(e=>e.value);
 await page.locator('#whiteboardPreviewCanvas').evaluate((c,p)=>{function send(type,id,x){c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:x,clientY:p.y,buttons:type==='pointerup'?0:1}));}send('pointerdown',31,p.x-35);send('pointerdown',32,p.x+35);send('pointermove',31,p.x-70);send('pointermove',32,p.x+70);},{x:cx,y:cy});await page.waitForTimeout(160);
 await page.locator('#whiteboardPreviewCanvas').evaluate((c,p)=>{for(const id of [31,32])c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:p.x,clientY:p.y}));},{x:cx,y:cy});
 assert.notEqual(await page.locator('.pdf-zoom').evaluate(e=>e.value),z);assert.equal(await ink(),0,'pinching leaves no accidental ink');
 const after=await page.locator('#whiteboardPreviewCanvas').evaluate((c,p)=>{const r=c.getBoundingClientRect();return{x:(p.x-r.left)/r.width,y:(p.y-r.top)/r.height};},{x:cx,y:cy});assert(Math.abs(after.x-before.x)<.04&&Math.abs(after.y-before.y)<.04,'pinch preserves the contact anchor');
 await page.locator('#whiteboardStage').screenshot({path:`/tmp/pdf-reading-continuous-${name}-${width}.png`});
 await page.waitForTimeout(4000);console.log('reading cache',name,width,await page.locator('.pdf-cache-status').textContent());await page.reload({waitUntil:'load'});await page.locator('[data-pdf=resume]').click();await ready(10);assert.equal(await page.locator('.pdf-layout-select').inputValue(),'continuous');
 await page.locator('.pdf-reading-tools [data-pdf-input=pan]').click();await page.keyboard.press('Control+0');await page.locator('.pdf-layout-select').selectOption('single');await ready(10);
 const swipeRect=await page.locator('#whiteboardPreviewCanvas').boundingBox();await page.locator('#whiteboardPreviewCanvas').evaluate((c,r)=>{const x=r.x+r.width*.8,y=r.y+r.height*.4;for(const [type,dx]of [['pointerdown',0],['pointermove',-120],['pointerup',-120]])c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:81,clientX:x+dx,clientY:y,buttons:type==='pointerup'?0:1}));},swipeRect);await ready(11);
 const beforeTap=await page.locator('.pdf-zoom').evaluate(e=>e.value);await page.locator('#whiteboardPreviewCanvas').evaluate(c=>{const r=c.getBoundingClientRect();for(const id of [82,83])for(const type of ['pointerdown','pointerup'])c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:r.left+r.width*.5,clientY:r.top+r.height*.4,buttons:type==='pointerup'?0:1}));});assert.notEqual(await page.locator('.pdf-zoom').evaluate(e=>e.value),beforeTap);
 const beforeWheel=await page.locator('.pdf-zoom').evaluate(e=>e.value);await page.locator('#whiteboardPreviewCanvas').evaluate(c=>{const r=c.getBoundingClientRect();c.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY:-60,clientX:r.left+r.width*.5,clientY:r.top+r.height*.4}));});assert.notEqual(await page.locator('.pdf-zoom').evaluate(e=>e.value),beforeWheel);assert.equal(await ink(),0);await page.keyboard.press('Control+0');
 await page.locator('#whiteboardStage').screenshot({path:`/tmp/pdf-reading-${name}-${width}.png`});
 assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: facing ink, clipboard, text selection, shortcuts, virtual scrolling, pinch anchor and no stray ink`);await context.close();
 }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
