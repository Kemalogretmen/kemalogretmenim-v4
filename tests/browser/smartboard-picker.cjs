const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const origin=process.env.WHITEBOARD_ORIGIN||'http://127.0.0.1:8767';
const agenda={activeClassId:'c1',classes:[{id:'c1',name:'1/A'},{id:'c2',name:'2/B'}],students:[
 {id:'s1',classId:'c1',firstName:'Ada',lastName:'Yılmaz',health:'PRIVATE'},
 {id:'s2',classId:'c1',firstName:'Deniz',lastName:'Kaya'},
 {id:'s3',classId:'c1',firstName:'Ege',lastName:'Ak'},
 {id:'s4',classId:'c2',firstName:'İpek',lastName:'Öz'}]};
(async()=>{
for(const [name,engine,executablePath] of [['chromium',chromium,process.env.CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.WEBKIT_EXECUTABLE]]){
 const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:true,isMobile:width<700});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(u.pathname==='/js/user-auth.js')return r.fulfill({contentType:'application/javascript',body:'window.kemalUserAuth=window.__pickerAuth;window.dispatchEvent(new CustomEvent("kemal-user-auth-changed"));'});
   return u.origin===origin?r.continue():r.abort();
  });
  await page.addInitScript(data=>{
   window.__pickerSession={user:{id:'teacher-demo'},profile:{role:'teacher',active:true,approval_status:'active'}};
   window.__pickerReads=[];
   window.__pickerAuth={ready:async()=>window.__pickerSession,getState:()=>window.__pickerSession,getClient:()=>({from:t=>({select:f=>({eq:(key,id)=>({maybeSingle:async()=>{window.__pickerReads.push([t,f,key,id]);return {data:{agenda_state:data}};}})})})})};
   window.kemalUserAuth=window.__pickerAuth;
  },agenda);
  await page.goto(origin+'/ogretmen/beyaztahta.html',{waitUntil:'load'});
  await page.locator('#whiteboardStage').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  // Essential controls must work even when external SVG assets cannot load.
  await page.route('**/assets/smartboard-icons/{move,plus,minus,x}.svg',r=>r.abort());
  await page.locator('#boardAddonsToolbarBtn').click();await page.locator('[data-sb-tool="groups"]').click();
  const groups=page.locator('[data-widget="groups"]');
  await page.waitForFunction(()=>document.querySelector('[data-widget="groups"] select').options.length===3);
  assert.equal(await groups.locator('select').inputValue(),'c1');
  await groups.locator('input[type=number]').fill('2');await groups.locator('.sb-pick-command').click();
  const members=await groups.locator('.sb-group-list li').allTextContents();assert.deepEqual(members.slice().sort(),['Ada Yılmaz','Deniz Kaya','Ege Ak'].sort());
  assert.equal(await groups.locator('.sb-group-list section').count(),2);
  const sizes=await groups.locator('.sb-group-list section').evaluateAll(els=>els.map(el=>el.querySelectorAll('li').length));assert(Math.max(...sizes)-Math.min(...sizes)<=1);
  await page.screenshot({path:`/tmp/smartboard-groups-${name}-${width}.png`});
  assert(!(await page.evaluate(()=>localStorage.getItem('kemal_smartboard_addons_v1'))).includes('Ada'),'group output never copied into addon storage');
  await groups.locator('select').selectOption('c2');assert.equal(await groups.locator('.sb-group-list li').count(),0);
  await groups.locator('.sb-pick-command').click();assert.deepEqual(await groups.locator('.sb-group-list li').allTextContents(),['İpek Öz']);
  await page.evaluate(()=>{window.__pickerSession={user:null,profile:null};window.dispatchEvent(new CustomEvent('kemal-user-auth-changed'));});
  await page.waitForFunction(()=>document.querySelector('[data-widget="groups"] select').options.length===1);assert.equal(await groups.locator('.sb-group-list li').count(),0);
  await groups.locator('textarea').fill('Manuel A\nManuel B');await groups.locator('.sb-pick-command').click();assert.equal(await groups.locator('.sb-group-list li').count(),2);
  await groups.locator('[data-sb-action="close"]').click();
  await page.evaluate(()=>{window.__pickerSession={user:{id:'teacher-demo'},profile:{role:'teacher',active:true,approval_status:'active'}};window.dispatchEvent(new CustomEvent('kemal-user-auth-changed'));});
  await page.locator('#boardAddonsToolbarBtn').click();await page.locator('[data-sb-tool="score"]').click();
  const score=page.locator('[data-widget="score"]');assert.equal(await score.locator('button svg.sb-icon').count(),9);
  for(const svg of await score.locator('button svg.sb-icon').all()){
    assert(await svg.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),shape=el.firstElementChild.getBBox();return r.width>=20&&r.height>=20&&shape.width>0&&s.maskImage==='none'&&s.stroke!=='none';}),'score control has a visible inline Lucide icon');
  }
  await score.locator('[data-sb-action="more"]').first().click();assert.equal(await score.locator('output').first().evaluate(el=>el.value),'1');
  await score.locator('[data-sb-action="less"]').first().click();assert.equal(await score.locator('output').first().evaluate(el=>el.value),'0');
  for(let i=0;i<4;i++)await score.locator('[data-sb-action="add-team"]').click();
  assert.equal(await score.locator('.sb-score-team').count(),6);
  await score.locator('.sb-score-team').last().locator('input').fill('Altıncı takım');
  await score.locator('.sb-score-team').last().locator('[data-sb-action="more"]').click();
  assert.equal(await score.locator('.sb-score-team').last().locator('output').evaluate(el=>el.value),'1');
  await score.locator('[data-sb-action="remove-team"]').nth(2).click();assert.equal(await score.locator('.sb-score-team').count(),5);
  assert.equal(await score.locator('.sb-score-team').last().locator('input').inputValue(),'Altıncı takım');
  await page.screenshot({path:`/tmp/smartboard-score-icons-${name}-${width}.png`});await score.locator('[data-sb-action="close"]').click();
  await page.locator('#boardAddonsToolbarBtn').click();await page.locator('[data-sb-tool="random"]').click();
  const widget=page.locator('[data-widget="random"]'),select=widget.locator('select'),button=widget.locator('.sb-pick-command'),out=widget.locator('output');
  await page.waitForFunction(()=>document.querySelector('[data-widget="random"] select').options.length===3);
  assert.equal(await select.inputValue(),'c1');assert(!await widget.locator('textarea').isVisible());
  const winners=[];
  for(let i=0;i<3;i++){await button.click();assert(await widget.evaluate(e=>e.classList.contains('is-picking')));await page.waitForFunction(()=>!document.querySelector('[data-widget="random"]').classList.contains('is-picking'));winners.push(await out.textContent());}
  assert.equal(new Set(winners).size,3,'everyone gets a turn');assert.match(await widget.locator('.sb-picker-count').textContent(),/^0 \/ 3/);
  await select.selectOption('c2');await button.click();await page.waitForFunction(()=>!document.querySelector('[data-widget="random"]').classList.contains('is-picking'));assert.equal(await out.textContent(),'İpek Öz');
  await page.screenshot({path:`/tmp/smartboard-picker-${name}-${width}.png`});
  const saved=await page.evaluate(()=>localStorage.getItem('kemal_smartboard_addons_v1'));
  assert(!saved.includes('Ada')&&!saved.includes('İpek')&&!saved.includes('PRIVATE'),'agenda students never duplicated into addon storage');
  await select.selectOption('');await widget.locator('textarea').fill('Manuel Bir\nManuel İki');
  await page.emulateMedia({reducedMotion:'reduce'});await button.click();assert.match(await out.textContent(),/^Manuel/);
  await page.evaluate(()=>{window.__pickerSession={user:null,profile:null};window.dispatchEvent(new CustomEvent('kemal-user-auth-changed'));});
  await page.waitForFunction(()=>document.querySelector('[data-widget="random"] select').options.length===1);assert.equal(await widget.locator('textarea').inputValue(),'Manuel Bir\nManuel İki');
  await page.evaluate(()=>{window.__pickerSession={user:{id:'other'},profile:{role:'student'}};window.dispatchEvent(new CustomEvent('kemal-user-auth-changed'));});
  assert.equal(await select.locator('option').count(),1);
  await page.emulateMedia({reducedMotion:'no-preference'});await button.click();await widget.locator('[data-sb-action="close"]').click();await page.waitForTimeout(1500);assert.equal(await widget.count(),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: agenda groups, balanced distribution, offline-safe score icons, picker, logout, privacy and disposal`);await page.close();
 }}finally{await browser.close();}
}
})().catch(e=>{console.error(e);process.exitCode=1;});
