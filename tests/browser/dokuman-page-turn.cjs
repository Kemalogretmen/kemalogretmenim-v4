const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {chromium,webkit} = require('playwright');
const origin=process.env.DOCUMENT_ORIGIN||'http://127.0.0.1:8782';
const id='22222222-2222-4222-8222-222222222222';
const fabric=fs.readFileSync(process.env.FABRIC_FIXTURE,'utf8');
const store=fs.readFileSync('js/dokuman-store.js','utf8');
const row={id,baslik:'Sayfa Çevirme Denemesi',sinif:2,ders:'turkce',dosya_adi:'deneme.pdf',dosyaUrl:origin+'/fixture.pdf',etkilesim_json:{},aktif:true};
const pdfFixture=`window.pdfjsLib={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:5,getPage:async number=>({getViewport:({scale})=>({width:600*scale,height:820*scale}),render:({canvasContext:ctx,viewport:v,transform})=>{ctx.save();if(transform)ctx.transform(...transform);ctx.fillStyle=['','#fef3c7','#dbeafe','#dcfce7','#ffe4e6','#f3e8ff'][number];ctx.fillRect(0,0,v.width,v.height);ctx.fillStyle='#1e293b';ctx.textAlign='center';ctx.font='bold '+v.width*.13+'px Arial';ctx.fillText('SAYFA '+number,v.width/2,v.height*.3);ctx.font=v.width*.035+'px Arial';ctx.fillText('SOL → SAĞ',v.width/2,v.height*.4);ctx.restore();return{promise:Promise.resolve()};}})})})};`;

async function setup(browser,width,reducedMotion) {
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<600,reducedMotion:reducedMotion?'reduce':'no-preference'});
  page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/fabric.min.js'))return route.fulfill({body:fabric,contentType:'application/javascript'});
    if(url.pathname.endsWith('/pdf.min.js'))return route.fulfill({body:pdfFixture,contentType:'application/javascript'});
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/js/dokuman-store.js')return route.fulfill({body:store+'\nwindow.kemalDocumentStore.getDocumentById=async()=>('+JSON.stringify(row)+');',contentType:'application/javascript'});
    if(/\/js\/(site|site-data|user-auth|content-progress|admin-auth|calisma-kagidi-store)\.js$/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
    return route.continue();
  });
  await page.goto(origin+'/dokuman.html?id='+id);
  await page.waitForFunction(()=>document.querySelector('#viewerStatusLeft').textContent.includes('Doküman hazır'));
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const prototype=window.KemalPaperTurn.PaperTurn.prototype,animate=prototype.animate;prototype.animate=function(complete,duration,done){window.fixturePaperTurn=this;this.fixtureDone=done;return animate.call(this,complete,duration,done);};});
  return {page,errors};
}
const current=page=>page.locator('#pageCounter').textContent();
const idle=page=>page.waitForFunction(()=>!document.querySelector('#pageTurnLayer').classList.contains('is-active'));
const next=page=>page.locator('[data-edge-page="next"]').first().click();
const prev=page=>page.locator('[data-edge-page="prev"]').first().click();
const waitPage=(page,n)=>page.waitForFunction(n=>document.querySelector('#pageCounter').textContent.trim().startsWith(n),String(n));

(async()=>{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.DOCUMENT_ENGINE||process.env.DOCUMENT_ENGINE===name)){
  const browser=await engine.launch({headless:true,timeout:15000});
  try{
   for(const width of (process.env.DOCUMENT_WIDTH?[Number(process.env.DOCUMENT_WIDTH)]:[1440,390])){
    const {page,errors}=await setup(browser,width,false);
    await page.locator('#viewerFullscreenBtn').click();
    await page.waitForTimeout(700);
    // Notes remain attached to page one while snapshots fold above the book.
    const pen=page.locator('#docMainTools [data-tool="pen"]');await pen.click();await pen.click();
    let box=await page.locator('.flip-page.is-active .upper-canvas').boundingBox();
    await page.mouse.move(box.x+box.width*.35,box.y+box.height*.6);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.65,box.y+box.height*.65,{steps:8});await page.mouse.up();
    const saved=()=>page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).pages['1']).objects.length,'kemal_dokuman_annotations_v1_'+id);
    assert.equal(await saved(),1);
    // Drawing at an edge must never turn a page.
    await page.mouse.move(box.x+box.width-12,box.y+box.height-28);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.7,box.y+box.height*.8,{steps:5});await page.mouse.up();
    assert.match(await current(page),/^1/);assert.equal(await saved(),2);
    await page.locator('#docMainTools [data-tool="select"]').click();
    await next(page);
    await page.locator('#pageTurnLayer.is-active').waitFor();
    await page.waitForTimeout(180);
    await page.evaluate(()=>{const turn=window.fixturePaperTurn;cancelAnimationFrame(turn.frame);turn.frame=null;turn.render(turn.fromProgress(.38));});
    assert.match(await current(page),/^1/,'The source page stays current until the fold completes');
    assert.equal(await page.locator('[data-edge-page="next"]').first().isDisabled(),true);
    await page.screenshot({path:path.join(os.tmpdir(),'paper-turn-'+name+'-'+width+'-mid.png')});
    await page.evaluate(()=>{const turn=window.fixturePaperTurn;turn.options.automatic=false;turn.animate(true,220,turn.fixtureDone);});
    await idle(page);await waitPage(page,2);
    await prev(page);await idle(page);await waitPage(page,1);assert.equal(await saved(),2);
    // Hold a short fold, then cancel; do not skip or commit a page.
    box=await page.locator('.flip-page.is-active').boundingBox();
    await page.mouse.move(box.x+box.width-6,box.y+box.height-9);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.8,box.y+box.height*.87,{steps:8});
    await page.waitForTimeout(350);await page.mouse.up();await idle(page);assert.match(await current(page),/^1/);
    if(name==='chromium'&&width===390){
      // Actual touch input verifies the browser does not turn the gesture into scrolling.
      const cdp=await page.context().newCDPSession(page);
      const finger=(x,y)=>({x,y,id:1,radiusX:4,radiusY:4,force:1});
      box=await page.locator('.flip-page.is-active').boundingBox();
      const start={x:box.x+box.width-6,y:box.y+box.height*.8};
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(start.x,start.y)]});
      for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(start.x-box.width*.85*i/8,start.y-box.height*.12*i/8)]});
      assert.equal(await page.locator('#pageTurnLayer').isVisible(),true);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await idle(page);await waitPage(page,2);await prev(page);await idle(page);await waitPage(page,1);
      box=await page.locator('.flip-page.is-active').boundingBox();start.x=box.x+box.width-6;start.y=box.y+box.height*.8;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(start.x,start.y)]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(start.x-box.width*.3,start.y-30)]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      await idle(page);assert.match(await current(page),/^1/);
      // A second finger hands the corner gesture over to the existing pinch-to-zoom.
      box=await page.locator('.flip-page.is-active').boundingBox();start.x=box.x+box.width-6;start.y=box.y+box.height*.65;
      const second=finger(box.x+box.width*.6,start.y);second.id=2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(start.x,start.y)]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(start.x,start.y),second]});
      await idle(page);
      second.x=box.x+box.width*.2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(start.x,start.y),second]});
      await page.waitForFunction(()=>Number(document.querySelector('#zoomValue').textContent.replace('%',''))>110);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.keyboard.press('0');await page.waitForTimeout(350);await cdp.detach();
    }
    // A committed drag follows the pointer and advances exactly once.
    box=await page.locator('.flip-page.is-active').boundingBox();
    await page.mouse.move(box.x+box.width-6,box.y+box.height-9);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.12,box.y+box.height*.85,{steps:14});
    await page.screenshot({path:path.join(os.tmpdir(),'paper-turn-'+name+'-'+width+'-drag.png')});
    await page.mouse.up();await idle(page);await waitPage(page,2);
    assert.equal(await page.locator('#viewerFullscreenBtn').getAttribute('aria-pressed'),'true');
    await page.locator('#docPagePanelBtn').click();await page.locator('#viewSpreadBtn').click();
    await page.waitForFunction(()=>document.querySelector('#bookRoot').classList.contains('is-spread')&&document.querySelectorAll('.flip-page.is-active').length===2);
    await page.locator('#docPagePanelBtn').click();
    await next(page);await page.waitForTimeout(260);
    await page.screenshot({path:path.join(os.tmpdir(),'paper-turn-'+name+'-'+width+'-spread.png')});
    await idle(page);assert.match(await current(page),/3.*4/);
    await next(page);await idle(page);assert.match(await current(page),/^5/,'The last odd page has no phantom duplicate');
    assert.equal(await page.locator('[data-edge-page="next"]').first().isDisabled(),true);
    await prev(page);await idle(page);assert.match(await current(page),/3.*4/);
    await prev(page);await idle(page);assert.match(await current(page),/1.*2/);assert.equal(await saved(),2);
    // Restore the native browser window before resizing (Chromium rejects fullscreen resize).
    await page.locator('#viewerFullscreenBtn').click();await page.waitForTimeout(700);
    // A viewport change aborts a partial fold and releases all controls.
    await next(page);await page.waitForTimeout(180);await page.setViewportSize({width:width===1440?1200:430,height:900});
    await page.waitForTimeout(700);await idle(page);
    assert.equal(await page.locator('[data-edge-page="next"]').first().isDisabled(),false);
    assert.equal(await page.locator('#bookRoot').evaluate(el=>el.classList.contains('is-paper-turning')),false);
    assert.deepEqual(errors,[]);await page.close();console.log(name,width,'paper fold, drag/cancel, notes, spreads, last page, fullscreen and resize PASS');
   }
   const {page,errors}=await setup(browser,1200,true);
   await next(page);await waitPage(page,2);assert.equal(await page.locator('#pageTurnLayer').isVisible(),false);
   await prev(page);await waitPage(page,1);assert.deepEqual(errors,[]);await page.close();console.log(name,'reduced motion PASS');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
