const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const {chromium}=require('playwright');
const origin=process.env.AGENDA_ORIGIN||'http://127.0.0.1:8776';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try {
    for(const width of [1440,390]) {
      const page=await browser.newPage({viewport:{width,height:1000},locale:'tr-TR',timezoneId:'Europe/Istanbul',hasTouch:width===390});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',dialog=>dialog.accept());
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(/\/js\/(site|site-data|user-auth)\.js/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
        return route.continue();
      });
      await page.addInitScript(()=>{
        if(localStorage.getItem('holiday-ui-fixture'))return;
        localStorage.setItem('holiday-ui-fixture','1');
        localStorage.setItem('kemalOgretmenAjandasi.v1',JSON.stringify({classes:[{id:'a',name:'2-B'}],activeClassId:'a',exams:[],students:[]}));
        const program=Object.fromEntries(['Mon','Tue','Wed','Thu','Fri'].map(day=>[day,Array.from({length:9},()=>({ders:'TÜRKÇE'}))]));
        localStorage.setItem('ogretmen_plan_v2',JSON.stringify({version:7,siniflar:[{id:'p1',name:'2-B'}],activeSinif:'p1',
          settings:{lessonCount:9},programs:{p1:program},yillikPlanlar:{'TÜRKÇE':[{hafta:7,tarihStart:'2026-10-26',tarihEnd:'2026-10-30',kazanim:'Ders çıktısı'}]},tatiller:[]}));
      });
      await page.goto(origin+'/ogretmen-ajandasi/',{waitUntil:'load'});
      await page.locator('.nav [data-view="scheduleView"]').click();
      const frame=page.frames().find(frame=>frame.url().includes('ders-programi.html'));
      await page.evaluate(()=>setLessonPlannerFocusDate('2026-10-26'));
      await frame.waitForFunction(()=>state.lastFocusDate==='2026-10-26');
      await frame.waitForFunction(()=>document.querySelectorAll('.tatil-plan-cell').length===14,{},{timeout:5000}).catch(async error=>{
        console.log('Planner debug',await frame.evaluate(()=>({week:state.currentWeek,focus:state.lastFocusDate,dates:getWeekDates(state.currentWeek).map(toDateKey),count:document.querySelectorAll('.tatil-plan-cell').length})),await page.evaluate(()=>state.lessonPlannerFocusDate));throw error;
      });
      const rows=frame.locator('.plan-table tbody tr');
      assert.equal(await rows.count(),9);
      for(let i=0;i<9;i++) {
        assert.equal(await rows.nth(i).locator('td').nth(3).locator('.tatil-plan-cell').count(),i>=4?1:0);
        assert.equal(await rows.nth(i).locator('td').nth(4).locator('.tatil-plan-cell').count(),1);
      }
      await frame.locator('#weekly-plan-container').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(os.tmpdir(),`agenda-holiday-plan-${width}.png`)});
      await page.locator('.nav [data-view="calendarView"]').click();
      await page.evaluate(()=>selectCalendarDate('2026-10-29'));
      assert.match(await page.locator('#selectedDayEvents').textContent(),/Cumhuriyet Bayramı/);
      await page.locator('#manageHolidaysBtn').click();
      await frame.locator('#tab-tatil.active').waitFor();
      assert.equal(await frame.locator('#holiday-year').inputValue(),'2026');
      const holiday=frame.locator('[data-holiday-id="tr-2026-29-ekim"]');
      await holiday.getByRole('button',{name:'Düzenle',exact:true}).click();
      await frame.locator('#tatil-days').fill('3');
      await frame.locator('#tatil-days').dispatchEvent('change');
      assert.equal(await frame.locator('#tatil-end').inputValue(),'2026-10-31');
      await frame.locator('#tatil-save').click();
      await page.locator('.nav [data-view="calendarView"]').click();
      await page.evaluate(()=>selectCalendarDate('2026-10-30'));
      assert.match(await page.locator('#selectedDayEvents').textContent(),/Cumhuriyet Bayramı/);
      await page.reload({waitUntil:'load'});
      await page.locator('.nav [data-view="calendarView"]').click();
      await page.evaluate(()=>selectCalendarDate('2026-10-30'));
      assert.match(await page.locator('#selectedDayEvents').textContent(),/Cumhuriyet Bayramı/);
      await page.locator('#manageHolidaysBtn').click();
      const restoredFrame=page.frames().find(frame=>frame.url().includes('ders-programi.html'));
      const restoredHoliday=restoredFrame.locator('[data-holiday-id="tr-2026-29-ekim"]');
      await restoredHoliday.getByRole('button',{name:'Devre Dışı Bırak',exact:true}).click();
      await page.locator('.nav [data-view="calendarView"]').click();
      assert.doesNotMatch(await page.locator('#selectedDayEvents').textContent(),/Cumhuriyet Bayramı/);
      await page.locator('#manageHolidaysBtn').click();
      await restoredHoliday.getByRole('button',{name:'Resmî Tarihe Dön',exact:true}).click();
      await restoredFrame.locator('#tatil-start').fill('2026-11-02');
      await restoredFrame.locator('#tatil-start').dispatchEvent('change');
      await restoredFrame.locator('#tatil-name').fill('Okula özel tatil');
      await restoredFrame.locator('#tatil-days').fill('2');
      await restoredFrame.locator('#tatil-days').dispatchEvent('change');
      await restoredFrame.locator('#tatil-save').click();
      await restoredFrame.locator('#half-day-start-period').selectOption('3');
      await restoredFrame.locator('#holiday-form').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(os.tmpdir(),`agenda-holiday-settings-${width}.png`)});
      assert.ok(await restoredFrame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Holiday controls fit the iframe viewport');
      await page.locator('.nav [data-view="calendarView"]').click();
      await page.evaluate(()=>selectCalendarDate('2026-11-03'));
      assert.match(await page.locator('#selectedDayEvents').textContent(),/Okula özel tatil/);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}: official full/half day timetable, shared calendar, editing/duration/reload, disable/reset, manual days, responsive controls, no JS errors.`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
