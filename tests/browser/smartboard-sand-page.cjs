const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const origin = process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8766';

(async () => {
  for(const [name, engine, executablePath] of [
    ['chromium', chromium, process.env.CHROMIUM_EXECUTABLE], ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]
  ]) {
    const browser = await engine.launch({headless:true,...(executablePath ? {executablePath} : {})});
    try {
      for(const width of [390,1440]) {
        const page = await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:true,deviceScaleFactor:2});
        const errors=[]; page.on('pageerror',e=>{errors.push(e.message);console.error(name,width,e.stack);});
        page.on('requestfailed',r=>{if(r.url().startsWith(origin+'/js/')) console.error('Script request failed',r.url(),r.failure());});
        await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
        await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
        assert.deepEqual(errors,[],'page initializes without script errors');
        await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
        await page.locator('#sandGroupBtn').click();
        const c=page.locator('#sandCanvas');
        await c.waitFor({state:'visible'});
        await page.waitForTimeout(100);await page.locator('#whiteboardStage').evaluate(e=>{e.scrollTop=0;});
        const geometry=await c.evaluate(c=>{const a=c.getBoundingClientRect(),b=document.getElementById('boardPlane').getBoundingClientRect();return [a.x-b.x,a.y-b.y,a.width-b.width,a.height-b.height];});
        assert(geometry.every(v=>Math.abs(v)<1),`sand fills the page edge to edge: ${geometry}`);
        const sample=point=>c.evaluate((c,p)=>{const r=c.getBoundingClientRect();return [...c.getContext('2d').getImageData(Math.floor(p.x*c.width/r.width),Math.floor(p.y*c.height/r.height),1,1).data];},point);
        let box=await c.boundingBox(), point={x:Math.min(box.width*.55,450),y:200};
        await page.touchscreen.tap(box.x+point.x,box.y+point.y);
        assert((await sample(point))[3]<90,'native touch is aligned');
        await page.locator('#sandGroupBtn').click();
        if(name==='chromium' && width<700) {
          const panel=page.locator('#sandSubPanel');await panel.evaluate(e=>{e.scrollTop=0;});
          const bounds=await panel.boundingBox(),cdp=await page.context().newCDPSession(page);
          const x=bounds.x+bounds.width-14,y=bounds.y+bounds.height-30;
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
          for(let i=1;i<=12;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*14,id:1}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert(await panel.evaluate(e=>e.scrollTop)>50,'phone can scroll the material toolbox by touch');
        }
        await page.locator('[data-sand-color="#91b9dd"]').click();
        assert((await sample(point))[3]<90,'changing color preserves grooves');
        let pixel=await sample({x:box.width*.7,y:220}); assert(pixel[2]>pixel[0],'blue sand is blue');
        await page.locator('#sandGrainSize').fill('3'); await page.locator('#sandGrainSize').dispatchEvent('change');
        await page.locator('#sandMixedColor').check();
        await page.locator('#sandLineStyle').selectOption('handwriting');
        await page.locator('#sandLineSpacing').fill('32');
        assert.equal(await page.locator('#sandGuideLines').getAttribute('data-lines'),'handwriting');
        assert.equal(await page.locator('#sandGuideLines').evaluate(e=>e.style.getPropertyValue('--sand-line-step')),'32px');
        assert((await sample(point))[3]<90,'grain, mix and guides preserve grooves');
        await page.locator('[data-close-panel="sandSubPanel"]').click();
        await page.locator('#sandboxLayer [data-sand-mode="plain"]').click();
        await page.locator('#sandUndoBtn').click();
        assert((await sample(point))[3]>240,'undo remains available after material changes');
        await page.locator('#sandGroupBtn').click();
        await page.locator('#sandMixedColor').uncheck();
        await page.locator('[data-sand-color="#ddc394"]').click();
        await page.locator('#sandLineStyle').selectOption('ruled');
        await page.locator('[data-close-panel="sandSubPanel"]').click();
        if(width>700) {
          await page.locator('#pageGroupBtn').click(); await page.locator('#pageSizeSelect').selectOption('a4v');
          await page.locator('[data-close-panel="pageSubPanel"]').click();
          await page.locator('#whiteboardStage').evaluate(e=>{e.scrollTop=0;});
          box=await c.boundingBox(); assert.equal(Math.round(box.width),800); assert.equal(Math.round(box.height),1131);
          point={x:320,y:200}; await page.touchscreen.tap(box.x+point.x,box.y+point.y);
          const backing=await c.evaluate(c=>[c.width,c.height]);
          await page.locator('#pageGroupBtn').click(); await page.locator('#boardZoomInBtn').click();
          await page.locator('[data-close-panel="pageSubPanel"]').click();
          const next=await c.evaluate(c=>[c.width,c.height]); assert.deepEqual(next,backing,'zoom does not re-rasterize or shift sand');
          box=await c.boundingBox(); const zoom=box.width/800;
          assert((await sample({x:320*zoom,y:200*zoom}))[3]<90,'groove remains at same page position after zoom');
          await page.mouse.move(box.x+400*zoom,box.y+220*zoom);
          const tip=await page.locator('#sandCursor').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+20*58/64,y:r.y+2*58/64};});
          assert(Math.abs(tip.x-(box.x+400*zoom))<2 && Math.abs(tip.y-(box.y+220*zoom))<2,'cursor contact matches zoomed drawing position');
          await page.locator('[data-board-tool="pan"]').click();
          const alphaBefore=await c.evaluate(c=>c.toDataURL());
          await page.mouse.move(box.x+500*zoom,box.y+350);await page.mouse.down();await page.mouse.move(box.x+500*zoom,box.y+100,{steps:12});await page.mouse.up();
          assert(await page.locator('#whiteboardStage').evaluate(e=>e.scrollTop)>100,'pan moves the sand page');
          assert.equal(await c.evaluate(c=>c.toDataURL()),alphaBefore,'panning does not draw');
          await page.locator('#sandGroupBtn').click(); await page.locator('[data-sand-tool="finger"]').click();
          await page.locator('[data-close-panel="sandSubPanel"]').click();
          await page.locator('#whiteboardStage').evaluate(e=>{e.scrollTop=0;});
          box=await c.boundingBox();
          await page.mouse.move(box.x+300*zoom,box.y+260*zoom);await page.mouse.down();
          for(const p of [[420,260],[300,380],[420,380]]) await page.mouse.move(box.x+p[0]*zoom,box.y+p[1]*zoom,{steps:15});
          await page.mouse.up();
          const dl=page.waitForEvent('download'); await page.locator('#boardSaveBtn').click();const downloaded=await dl;
          assert.match(downloaded.suggestedFilename(),/\.png$/);
        }
        await page.locator('#sandGroupBtn').click();
        await page.screenshot({path:`/tmp/sand-fullpage-controls-${name}-${width}.png`});
        await page.locator('[data-close-panel="sandSubPanel"]').click();
        await page.locator('#whiteboardStage').screenshot({path:`/tmp/sand-fullpage-${name}-${width}.png`});
        if(name==='chromium' && width>700) {
          await page.locator('#pageGroupBtn').click();await page.locator('#pageSizeSelect').selectOption('auto');await page.locator('#boardZoomResetBtn').click();
          await page.locator('[data-close-panel="pageSubPanel"]').click();
          await page.locator('#sandGroupBtn').click();await page.locator('#sandGrainSize').fill('1.25');await page.locator('#sandGrainSize').dispatchEvent('change');
          await page.locator('#sandMixedColor').check();await page.locator('#sandLineStyle').selectOption('handwriting');
          await page.locator('[data-close-panel="sandSubPanel"]').click();
          await page.locator('#boardFullscreenBtn').click();await page.waitForFunction(()=>!!document.fullscreenElement);
          await page.locator('#sandGroupBtn').click();
          await page.locator('#sandSubPanel').evaluate(e=>{e.scrollTop=0;});
          await page.locator('#whiteboardStage').evaluate(e=>{e.scrollTop=0;e.scrollIntoView({block:'start',behavior:'instant'});});
          await page.locator('#whiteboardStage').screenshot({path:'/tmp/sand-fullpage-preview.png'});
          await page.evaluate(()=>document.exitFullscreen());
          await page.locator('#sandGrainSize').fill('3');await page.locator('#sandGrainSize').dispatchEvent('change');await page.locator('#sandLineStyle').selectOption('ruled');
        }
        await page.waitForTimeout(2000);
        await page.reload({waitUntil:'load'});await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({behavior:'instant'}));
        await page.locator('#sandGroupBtn').click();await page.locator('#sandGroupBtn').click();
        assert.equal(await page.locator('#sandGrainSize').inputValue(),'3');
        assert.equal(await page.locator('#sandLineStyle').inputValue(),'ruled');
        assert.deepEqual(errors,[]); console.log(`PASS ${name} ${width}: full page, touch, material preservation, guides, persistence${width>700?', A4, zoom, cursor, pan, export':''}`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
