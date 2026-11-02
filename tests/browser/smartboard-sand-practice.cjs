const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
(async()=>{
  for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]]) {
    const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
    try {
      for(const width of [390,1440]) {
        const page=await browser.newPage({viewport:{width,height:900},hasTouch:true,isMobile:width<700,deviceScaleFactor:2});
        await page.addInitScript(()=>{
          const Native=window.AudioContext||window.webkitAudioContext;
          window.__sandAudio={sources:0,stops:0,decoded:0,targets:[],gain:null};
          if(!Native)return;
          class Probe extends Native {
            decodeAudioData(bytes){return super.decodeAudioData(bytes).then(b=>{window.__sandAudio.decoded++;return b;});}
            createBufferSource(){const n=super.createBufferSource(),start=n.start.bind(n),stop=n.stop.bind(n);n.start=(...a)=>{window.__sandAudio.sources++;return start(...a);};n.stop=(...a)=>{window.__sandAudio.stops++;return stop(...a);};return n;}
            createGain(){const n=super.createGain(),set=n.gain.setTargetAtTime.bind(n.gain);window.__sandAudio.gain=n.gain;n.gain.setTargetAtTime=(...a)=>{window.__sandAudio.targets.push(a[0]);return set(...a);};return n;}
          }
          window.AudioContext=Probe;if(window.webkitAudioContext)window.webkitAudioContext=Probe;
        });
        const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
        await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
        await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
        await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({behavior:'instant'}));
        await page.locator('#sandGroupBtn').click();await page.locator('#sandCanvas').waitFor({state:'visible'});
        await page.waitForTimeout(220);
        const center=await page.locator('#whiteboardStage').evaluate(e=>({actual:e.scrollTop,expected:(document.getElementById('boardPlane').offsetHeight-e.clientHeight)/2}));
        assert(Math.abs(center.actual-center.expected)<3,`${name} centered on entry: ${JSON.stringify(center)}`);
        assert.equal(await page.locator('#sandGuideText').textContent(),'Aa');
        const glyph=await page.locator('#sandGuideText').evaluate(e=>{
          const ctx=document.createElement('canvas').getContext('2d'),style=getComputedStyle(e);ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
          const baseline=Number(e.getAttribute('y')),capital=ctx.measureText('H'),lower=ctx.measureText('x');
          const shade=document.getElementById('sandGuideShade'),mid=Number(shade.getAttribute('y')),bottom=mid+Number(shade.getAttribute('height'));
          return {baseline,bottom,lower:lower.actualBoundingBoxAscent,mid,capital:capital.actualBoundingBoxAscent,path:document.getElementById('sandGuidePath').getAttribute('d')};
        });
        assert(Math.abs(glyph.baseline-glyph.bottom)<1);assert(Math.abs(glyph.baseline-glyph.lower-glyph.mid)<2,JSON.stringify(glyph));
        assert.equal((glyph.path.match(/M/g)||[]).length,3,'three lines, not a page-filling pattern');
        await page.locator('#sandGroupBtn').click();await page.locator('[data-sand-case="lower"]').click();
        await page.locator('#sandTargetInput').fill('g');assert.equal(await page.locator('#sandGuideText').textContent(),'g');
        await page.locator('[data-sand-case="pair"]').click();assert.equal(await page.locator('#sandGuideText').textContent(),'Gg');
        await page.locator('#sandTargetInput').fill('i');assert.equal(await page.locator('#sandGuideText').textContent(),'İi');
        await page.locator('#sandSoundToggle').check();await page.locator('[data-close-panel="sandSubPanel"]').click();
        await page.waitForFunction(()=>window.__sandAudio.decoded===1);
        const canvas=page.locator('#sandCanvas');
        const point=await canvas.evaluate(c=>{const r=c.getBoundingClientRect(),s=document.getElementById('whiteboardStage').getBoundingClientRect();return {x:r.x+r.width*.6,y:Math.max(s.y,0)+s.height*.52};});
        const normalized=await canvas.evaluate((c,p)=>{const r=c.getBoundingClientRect();return {x:(p.x-r.x)/r.width,y:(p.y-r.y)/r.height};},point);
        const alpha=()=>canvas.evaluate((c,p)=>c.getContext('2d').getImageData(Math.floor(p.x*c.width),Math.floor(p.y*c.height),1,1).data[3],normalized);
        await page.touchscreen.tap(point.x,point.y);assert(await alpha()<100,'touch tracks fingertip after centering');
        assert.equal(await page.evaluate(()=>window.__sandAudio.sources),0,'stationary contact is silent');
        await page.mouse.move(point.x,point.y+45);await page.mouse.down();
        for(let i=1;i<=8;i++){await page.mouse.move(point.x+i*5,point.y+45);await page.waitForTimeout(18);}
        assert(await page.evaluate(()=>window.__sandAudio.sources)>0,'motion plays the generated sample');
        assert(await page.evaluate(()=>window.__sandAudio.targets.some(v=>v>0)),'motion drives gain');
        await page.waitForTimeout(250);assert(await page.evaluate(()=>window.__sandAudio.gain.value)<.005,'holding still fades to silence');
        await page.mouse.up();await page.waitForTimeout(130);assert(await page.evaluate(()=>window.__sandAudio.stops)>0,'release stops the source');
        await page.locator('#sandClearTopBtn').click();assert.equal(await page.locator('#sandboxLayer').getAttribute('aria-busy'),'true');
        assert(await page.locator('#sandLeveler').isVisible());
        const first=await page.locator('#sandLeveler').evaluate(e=>e.style.transform);await page.waitForTimeout(180);
        const second=await page.locator('#sandLeveler').evaluate(e=>e.style.transform);assert.notEqual(first,second,'screed actually sweeps');
        await page.locator('#sandboxLayer').filter({has:page.locator('#sandLeveler')}).waitFor({state:'visible'});
        await page.waitForFunction(()=>document.getElementById('sandboxLayer').getAttribute('aria-busy')==='false');
        assert(await alpha()>240,'swept sand is flat');await page.locator('#sandUndoBtn').click();assert(await alpha()<100,`clear can be undone: ${await alpha()}`);
        await page.locator('#sandClearTopBtn').click();await page.locator('#sandUndoBtn').click();
        assert.equal(await page.locator('#sandboxLayer').getAttribute('aria-busy'),'false');assert(await alpha()<100,'undo cancels animation safely');
        if(width>700) {
          await page.locator('#boardFullscreenBtn').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(100);
          await page.locator('#sandGroupBtn').click();await page.locator('#sandTargetInput').fill('a');
          await page.locator('[data-close-panel="sandSubPanel"]').click();
          await page.locator('#whiteboardStage').screenshot({path:'/tmp/sand-practice-final.png'});
        }
        assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: centered page, single TTKB guide, Turkish letter cases, sweeping clear and undo`);
        await page.close();
      }
    }finally{await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
