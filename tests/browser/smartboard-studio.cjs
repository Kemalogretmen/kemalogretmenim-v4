const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const origin = process.env.WHITEBOARD_ORIGIN || 'http://127.0.0.1:8766';

(async()=>{
  for(const [name, engine, executablePath] of [
    ['chromium', chromium, process.env.CHROMIUM_EXECUTABLE], ['webkit', webkit, process.env.WEBKIT_EXECUTABLE]
  ]) {
    const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
    try {
      for(const width of [390,1440]) {
        const page=await browser.newPage({viewport:{width,height:1000},hasTouch:true,isMobile:width<700,deviceScaleFactor:2});
        const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
        await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
        await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
        await page.locator('#pageGroupBtn').click();await page.locator('[data-board-bg="#064e3b"]').click();await page.locator('[data-close-panel="pageSubPanel"]').click();
        for(const [tool,expected] of [['highlighter',66],['pencil',199]]) {
          await page.locator('#penGroupBtn').click();await page.locator(`[data-board-tool="${tool}"]`).click();
          await page.locator('#penSubPanel [data-board-color="#ffffff"]').click();
          await page.locator('[data-close-panel="penSubPanel"]').click();
          const c=page.locator('#whiteboardPreviewCanvas'),box=await c.boundingBox();
          const start={x:box.x+Math.min(100,box.width*.3),y:box.y+180};
          await page.mouse.move(start.x,start.y);await page.mouse.down();
          for(let i=1;i<=18;i++){await page.mouse.move(start.x+i*8,start.y);await page.waitForTimeout(18);}
          const before=await c.evaluate((c,p)=>{const r=c.getBoundingClientRect(),ctx=c.getContext('2d');return Array.from({length:12},(_,i)=>ctx.getImageData(Math.floor((p.x+12+i*8-r.left)*c.width/r.width),Math.floor((p.y-r.top)*c.height/r.height),1,1).data[3]);},start);
          assert(Math.max(...before)-Math.min(...before)<=4,`${tool}: uneven live alpha ${before}`);
          assert(before.every(a=>Math.abs(a-expected)<4),`${tool}: unexpected alpha ${before}`);
          await page.mouse.up();
          const after=await page.locator('#whiteboardCanvas').evaluate((c,p)=>{const r=c.getBoundingClientRect(),ctx=c.getContext('2d');return Array.from({length:12},(_,i)=>ctx.getImageData(Math.floor((p.x+12+i*8-r.left)*c.width/r.width),Math.floor((p.y-r.top)*c.height/r.height),1,1).data[3]);},start);
          assert(Math.max(...after)-Math.min(...after)<=4,`${tool}: uneven committed alpha ${after}`);
          await page.locator('#whiteboardStage').screenshot({path:`/tmp/smartboard-brush-${tool}-${name}-${width}.png`});
          await page.locator('#boardUndoBtn').click();
        }
        async function open(type){await page.locator('#boardAddonsBtn').click();await page.locator(`[data-sb-tool="${type}"]`).click();}
        await page.locator('#boardAddonsBtn').click();await page.locator('#smartboardCatalog').screenshot({path:`/tmp/smartboard-catalog-${name}-${width}.png`});await page.locator('[data-sb-action="close-catalog"]').click();
        await open('note');await page.locator('.sb-note').fill('A sesini yazalım.');
        await open('timer');await page.locator('[data-widget="timer"] [data-sb-action="toggle"]').click();
        await page.locator('[data-widget="timer"] [data-sb-action="close"]').click();
        await open('spotlight');assert(await page.locator('.sb-spot-hole').isVisible());
        await page.locator('[data-sb-action="close-effect"]').click();
        const imageData=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=72;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle='#1288aa';ctx.fillRect(0,0,72,48);return c.toDataURL('image/png').split(',')[1];});
        await page.locator('#boardAddonsBtn').click();
        await page.locator('#smartboardCatalog input[type=file]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(imageData,'base64')});
        await page.waitForFunction(()=>Object.values(localStorage).some(s=>{try{return JSON.parse(s)?.pages?.some(p=>p.items.some(i=>i.kind==='image'));}catch{return false;}}));
        await page.locator('#boardUndoBtn').click();
        await open('shade');await page.locator('.sb-focus-controls input').evaluate(el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}));});
        await page.locator('[data-sb-action="close-effect"]').click();
        await page.locator('#sandGroupBtn').click();
        const sand=page.locator('#sandCanvas'),box=await sand.boundingBox();
        await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.5);
        const read=()=>sand.evaluate(c=>c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]);
        assert(await read()<100);await page.locator('#sandUndoBtn').click();assert(await read()>240);
        await page.screenshot({path:`/tmp/smartboard-${name}-${width}.png`});
        assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: brush alpha, addon lifecycle, sand undo`);await page.close();
      }
    }finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
