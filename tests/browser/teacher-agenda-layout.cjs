const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
const origin=process.env.AGENDA_ORIGIN || 'http://127.0.0.1:8776';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'agenda-layout-'));
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try {
    for(const width of [1440,1024,390]) {
      const page=await browser.newPage({viewport:{width,height:1000},timezoneId:'Europe/Istanbul'}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin) {
          const vendor=/\/jszip\//.test(url.pathname)?'mobile-app/vendor/agenda/jszip.min.js':/\/mammoth\//.test(url.pathname)?'mobile-app/vendor/agenda/mammoth.browser.min.js':/\/xlsx\//.test(url.pathname)?'ogretmen-ajandasi/vendor/xlsx.full.min.js':/\/html2canvas\//.test(url.pathname)?'ogretmen-ajandasi/vendor/html2canvas.min.js':/\/jspdf\//.test(url.pathname)?'ogretmen-ajandasi/vendor/jspdf.umd.min.js':null;
          return vendor?route.fulfill({body:fs.readFileSync(vendor),contentType:'application/javascript'}):route.abort();
        }
        if(/\/js\/(site-data|user-auth)\.js/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
        const local=path.resolve('.',decodeURIComponent(url.pathname).replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':''));
        const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'};
        if(local.startsWith(process.cwd()+path.sep)&&fs.existsSync(local)&&fs.statSync(local).isFile())return route.fulfill({body:fs.readFileSync(local),contentType:mime[path.extname(local)]||'application/octet-stream'});
        return route.abort();
      });
      await page.addInitScript(()=>{
        if(localStorage.getItem('layout-fixture'))return;
        localStorage.setItem('layout-fixture','1');
        localStorage.setItem('kemalOgretmenAjandasi.v1',JSON.stringify({classes:[{id:'c',name:'2-B',year:'2026-2027'}],activeClassId:'c',students:[{id:'s',classId:'c',firstName:'Ada',lastName:'Kaya',birthDate:'2018-11-03'}],exams:[],calendarEvents:[
          {id:'n',classId:'c',date:'2026-11-03',time:'09:00',type:'note',title:'Günün hazırlıkları',note:'Kitaplar, çalışma dosyaları ve haftalık hedefler.'},
          {id:'m',classId:'c',date:'2026-11-03',time:'15:30',type:'meeting',title:'Veli görüşmesi',note:'Öğrencinin gelişimi ve okuma alışkanlığı hakkında uzun görüşme notu. NOTUN TAMAMI'},
          {id:'e',classId:'c',date:'2026-11-04',time:'10:00',type:'exam',title:'Matematik değerlendirmesi'},
          {id:'r',classId:'c',date:'2026-11-06',time:'08:30',type:'reminder',title:'Gezi izin belgeleri',note:'İmzalı formları kontrol et.'}
        ]}));
        localStorage.setItem('ogretmen_plan_v2',JSON.stringify({version:7,siniflar:[{id:'p',name:'2-B'}],activeSinif:'p',programs:{p:Object.fromEntries(['Mon','Tue','Wed','Thu','Fri'].map(day=>[day,Array.from({length:8},(_,i)=>({ders:i%2?'MATEMATİK':'TÜRKÇE'}))]))},yillikPlanlar:{'TÜRKÇE':[{hafta:8,tarihStart:'2026-11-02',kazanim:'T.2.1. Öğrenme çıktısının uzun ayrıntıları. '.repeat(14)+'ÇIKTI TAMAMI'}],'MATEMATİK':[{hafta:8,tarihStart:'2026-11-02',kazanim:'MAT.2.1. Sayıları inceleyebilme. '.repeat(14)+'ÇIKTI TAMAMI'}]},tatiller:[],lastFocusDate:'2026-11-03'}));
      });
      await page.goto(origin+'/ogretmen-ajandasi/',{waitUntil:'load'});
      await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());});
      await page.evaluate(()=>selectCalendarDate('2026-11-03'));
      await page.locator('.nav [data-view="calendarView"]').click();
      assert.equal(await page.locator('.calendar-week-column').count(),7);
      assert.ok(await page.locator('.calendar-week-column.selected .agenda-sticky').count()>=3);
      assert.equal(await page.locator('#calendarComposer').getAttribute('open'),null);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Calendar no page overflow');
      await page.screenshot({path:path.join(folder,`calendar-${width}.png`)});
      if(width>700)await page.locator('.calendar-week-column.selected [data-calendar-note-date]').first().click();
      assert.match(await page.locator('#selectedDayEvents').textContent(),/NOTUN TAMAMI/);
      await page.locator('[data-calendar-mode="month"]').click();assert.equal(await page.locator('#calendarGrid [data-calendar-date]').count(),42);
      await page.locator('[data-calendar-mode="week"]').click();
      await page.locator('#newCalendarNoteBtn').click();await page.locator('#calendarEventTitle').fill('Yeni plan');await page.locator('#calendarEventNote').fill('Ayrıntılı çalışma notu');await page.locator('#saveCalendarEventBtn').click();
      assert.match(await page.locator('#selectedDayEvents').textContent(),/Yeni plan/);
      await page.locator('.nav [data-view="scheduleView"]').click();
      await page.locator('#lessonPlannerFocusDate').fill('2026-11-03');await page.locator('#lessonPlannerFocusDate').dispatchEvent('change');
      const frame=page.frames().find(f=>f.url().includes('ders-programi.html'));assert.ok(frame);
      await frame.locator('#tab-plan.active').waitFor();
      try {await frame.locator('.planner-view-switch').waitFor({timeout:5000});} catch(error) {console.log({errors,child:await frame.evaluate(()=>({ready:window.KemalPlannerViewReady,status:document.readyState,host:!!document.getElementById('weekly-plan-card'),switch:document.querySelector('.planner-view-switch')?.outerHTML,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('program-gorunum')).map(r=>({url:r.name,bytes:r.transferSize})),src:[...document.scripts].map(s=>s.src).filter(Boolean)}))});throw error;}
      await page.waitForTimeout(400);
      const narrow=await frame.evaluate(()=>innerWidth<=700);
      assert.equal(await frame.evaluate(()=>document.documentElement.dataset.plannerView),narrow?'day':'week');
      const extent=await frame.evaluate(()=>({scroll:document.documentElement.scrollHeight,height:innerHeight,body:document.body.getBoundingClientRect().height}));
      assert.ok(extent.scroll<=extent.height+2,`No vertical inner scroll ${JSON.stringify(extent)}`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Timetable no page overflow');
      const iframe=await page.locator('#lessonPlannerFrame').boundingBox();
      const cell=await frame.locator(narrow?'.plan-table td.kemal-active-day':'.plan-table tbody td:not(.row-label-cell)').first().boundingBox();
      assert.ok(cell.y<850,'Lessons visible without scrolling past large duplicate headers');
      await page.screenshot({path:path.join(folder,`schedule-${width}.png`)});
      const stored=await page.evaluate(()=>localStorage.getItem('ogretmen_plan_v2'));
      await frame.locator('[data-planner-mode="day"]').click();
      assert.equal(await frame.locator('.kemal-day-picker button').count(),5);
      await frame.locator('.kemal-day-picker button').last().click();assert.match(await frame.locator('.kemal-day-caption').textContent(),/Cuma/);
      assert.equal(await page.evaluate(()=>localStorage.getItem('ogretmen_plan_v2')),stored,'Day viewing never changes saved plan');
      await frame.locator('.kemal-day-picker button').first().click();
      const more=frame.locator('.kemal-active-day .learning-output-more').first();await more.click();assert.match(await frame.locator('#learning-output-popover').textContent(),/ÇIKTI TAMAMI/);await frame.locator('.learning-output-popover-close').click();
      if(width===390) {
        const canvas=await frame.evaluate(async()=>{
          const real=window.html2canvas;let columns;
          window.html2canvas=async(...args)=>{columns=Array.from(document.querySelector('.plan-table tbody tr').children).map(cell=>getComputedStyle(cell).display);return real(...args);};
          try{const canvas=await captureWeeklyPlanCanvas();const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;for(let i=0;i<data.length;i+=4)if(data[i]<220||data[i+1]<220||data[i+2]<220)ink++;return {columns,width:canvas.width,height:canvas.height,ink};}finally{window.html2canvas=real;}
        });
        assert.ok(canvas.columns.every(display=>display==='table-cell'),'Mobile export includes every weekday');assert.ok(canvas.width>1000&&canvas.ink>10000,'Nonblank full week export');
      }
      await frame.locator('[data-planner-mode="week"]').click();
      await page.waitForTimeout(300);
      const heightA=await page.locator('#lessonPlannerFrame').evaluate(el=>el.clientHeight);await page.waitForTimeout(300);const heightB=await page.locator('#lessonPlannerFrame').evaluate(el=>el.clientHeight);assert.ok(Math.abs(heightA-heightB)<=2,'Height converges, not a resize loop');
      await frame.locator('.tab-btn[onclick*="tab-program"]').click();await frame.locator('#tab-program.active').waitFor();assert.ok(await frame.locator('#lesson-catalog-panel').isVisible());
      assert.deepEqual(errors,[]);console.log(`PASS ${width}: sticky week/month, full notes, add, responsive lessons, auto height, day/week, outcomes, export, settings`);await page.close();
    }
  } finally {await browser.close();}
  console.log('Evidence: '+folder);
})().catch(error=>{console.error(error);process.exitCode=1;});
