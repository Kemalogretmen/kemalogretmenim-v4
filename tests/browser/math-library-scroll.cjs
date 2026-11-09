const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
(async()=>{
  for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]]){
    const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
    try{for(const [width,height] of [[1440,800],[1280,600],[390,500]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<700});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
      await page.goto(origin+'/ogretmen/matematik.html',{waitUntil:'load'});
      await page.addStyleTag({content:'html {scroll-behavior:auto!important}'});
      if(width<861)await page.locator('.math-library-trigger').click();
      await page.locator('#mathToolLibrary').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
      await page.waitForTimeout(300);
      const scroll=page.locator('.math-library-scroll');
      const box=await scroll.boundingBox();assert(box.height>60&&box.y>=0&&box.y+box.height<=height);
      const heading=await page.locator('.math-library-heading').boundingBox();
      const libraryBox=await page.locator('#mathToolLibrary').boundingBox();
      const overflows=await scroll.evaluate(e=>e.scrollHeight>e.clientHeight);
      if(name==='webkit'&&width<700){await scroll.focus();await page.keyboard.press('End');}
      else{await page.mouse.move(box.x+box.width/2,box.y+Math.min(65,box.height/2));await page.mouse.wheel(0,1000);}
      await page.waitForTimeout(500);
      if(overflows)assert(await scroll.evaluate(e=>e.scrollTop)>0,'wheel scrolls the list');
      const last=page.locator('.math-nav-link').last();
      const accessible=await last.evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.math-library-scroll').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom+1;});
      assert(accessible,'last geometry tool is visible inside the scroller');
      const headerInset=(await page.locator('.math-library-heading').boundingBox()).y-(await page.locator('#mathToolLibrary').boundingBox()).y;
      assert(Math.abs(headerInset-(heading.y-libraryBox.y))<1,'heading stays outside scrolling content');
      await scroll.focus();await page.keyboard.press('Home');await page.keyboard.press('End');await page.waitForTimeout(200);
      if(overflows)assert(await scroll.evaluate(e=>e.scrollTop)>0,'keyboard can reach bottom');
      if(name==='chromium'&&width<700&&overflows){
        await scroll.evaluate(e=>{e.scrollTop=0;});const cdp=await page.context().newCDPSession(page);
        const x=box.x+box.width/2,y=box.y+box.height*.6;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
        for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*Math.min(15,box.height*.5/10),id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(await scroll.evaluate(e=>e.scrollTop)>0,'touch scroll works');
        await scroll.evaluate(e=>{e.scrollTop=e.scrollHeight;});
      }
      if(width===1280)await page.locator('#mathToolLibrary').screenshot({path:`/tmp/math-library-scroll-${name}.png`});
      assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}x${height}: keyboard, last geometry link, fixed search${width>=700||name==='chromium'?', wheel':''}${width<700&&name==='chromium'?', touch':''}`);await page.close();
    }}finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
