const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const repo=path.resolve(__dirname,'../..');
(async()=>{
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(repo,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
  const engine=process.env.AGENDA_ENGINE==='webkit'?webkit:chromium;
  const executablePath=engine===webkit?process.env.WEBKIT_EXECUTABLE:process.env.CHROMIUM_EXECUTABLE;
  const browser=await engine.launch({headless:true,...(executablePath?{executablePath}:{})});
  try{for(const width of[1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
      if(/\/js\/(site|site-data|user-auth|content-progress|content-feed|content-reactions|content-saves)\.js/.test(url.pathname))return route.fulfill({body:'',contentType:'application/javascript'});
      return route.continue();
    });
    await page.addInitScript(()=>{
      const user={id:'teacher',email:'test@example.invalid'},profile={id:'teacher',full_name:'Test Öğretmen',role:'teacher',active:true,approval_status:'active'};
      const local={teacher:{name:'Test Öğretmen'},classes:[{id:'source',name:'2-B'}],activeClassId:'source',students:[{id:'s1',classId:'source',firstName:'Ada',lastName:'Kaya',schoolNo:'7',birthDate:'2019-01-04'},{id:'s2',classId:'source',firstName:'Efe',lastName:'Can',schoolNo:'27'}],exams:[],updatedAt:'2026-11-03T00:00:00Z'};
      if(!localStorage.getItem('sync-fixture')){localStorage.setItem('sync-fixture','1');localStorage.setItem('kemalOgretmenAjandasi.v1',JSON.stringify(local));}
      window.remote=JSON.parse(sessionStorage.getItem('fixture-cloud-agenda')||'null')||
        {agenda_state:JSON.parse(JSON.stringify(local)),lesson_planner_state:null,updated_at:'r1',storage_bytes:100};
      window.imported=[];window.cloudWrites=0;
      const client={auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},from(table){let mode='read',payload;const filters={};const query={select(){return query;},eq(k,v){filters[k]=v;return query;},in(){return query;},neq(){return query;},order(){return query;},or(){return query;},limit(){return query;},update(value){mode='update';payload=value;return query;},insert(value){mode='insert';payload=value;return query;},async maybeSingle(){
        if(table==='user_profiles')return{data:profile,error:null};
        if(table==='teacher_agenda_states'){
          if(mode==='read')return{data:window.remote,error:null};
          if(window.failAgendaWrites)return{data:null,error:{message:'Failed to fetch'}};
          if(filters.updated_at!==window.remote.updated_at)return{data:null,error:null};
          window.cloudWrites++;
          window.remote={...window.remote,...payload,updated_at:'r'+(Number(window.remote.updated_at.slice(1))+1)};
          sessionStorage.setItem('fixture-cloud-agenda',JSON.stringify(window.remote));
          return{data:window.remote,error:null};
        }return{data:null,error:null};},then(resolve,reject){return Promise.resolve({data:table==='teacher_classes'?[{id:'target',name:'Birincilerim',grade_level:2,branch:'B',invite_code:'TESTCODE'}]:table==='teacher_class_students'?window.imported:[],error:null}).then(resolve,reject);}};return query;},rpc:async(name,args)=>{window.lastImport={name,args};window.imported=args.selected_student_ids.map(id=>{const s=window.remote.agenda_state.students.find(s=>s.id===id);return{id:'membership-'+id,class_id:args.target_class_id,display_name:s.firstName+' '+s.lastName,student_no:s.schoolNo,status:'active',agenda_source_class_id:args.source_class_id,agenda_source_student_id:id};});return{data:{added:window.imported.length,kept:0,conflicts:0},error:null};}};
      window.kemalUserAuth={ready:async()=>({user,profile}),getState:()=>({user,profile}),getClient:()=>client};
    });
    await page.goto(origin+'/ogretmen-paneli.html');
    await page.getByRole('button',{name:'Sınıflarım',exact:true}).click();
    await page.locator('#loadAgendaRosterBtn').click();await page.locator('[data-agenda-student="s1"]').waitFor();
    await page.locator('[data-agenda-student="s1"]').check();await page.locator('#importAgendaRosterBtn').click();
    await page.waitForFunction(()=>window.lastImport?.args.selected_student_ids.length===1);
    assert.deepEqual(await page.evaluate(()=>window.lastImport.args.selected_student_ids),['s1']);
    const link=page.getByRole('link',{name:'Ajanda Bilgileri',exact:true});await link.waitFor();
    await page.locator('#agendaRosterPreview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),`teacher-agenda-import-${width}.png`)});
    await link.click();await page.locator('#studentDialog[open]').waitFor();assert.equal(await page.locator('#studentFirstName').inputValue(),'Ada');assert.equal(await page.locator('#studentBirth').inputValue(),'2019-01-04');
    await page.locator('#closeStudentDialogBtn').click();await page.locator('#renameClassBtn').click();assert.equal(await page.locator('.dashboard-settings').evaluate(e=>e.open),true);
    await page.locator('#className').fill('Şampiyonlar');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kemalOgretmenAjandasi.v1')).classes[0].name==='Şampiyonlar');
    await page.reload();await page.waitForFunction(()=>cloudSync.ready);assert.equal(await page.evaluate(()=>cloudSync.rowChecked),true);
    await page.waitForFunction(()=>!cloudSync.pending&&!cloudSync.saving);
    const cloudClass=await page.evaluate(()=>window.remote.agenda_state.classes[0].name);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
    const bytesBeforeQuota=await page.evaluate(()=>{
      const key='kemalOgretmenAjandasi.v1', snapshot=JSON.parse(localStorage.getItem(key));
      snapshot.updatedAt='2090-01-01T00:00:00Z';
      // Replace this test device's on-disk document with a legacy version.
      // There is no live edit from the old tab to flush on navigation.
      clearTimeout(cloudSync.timer); cloudSync.pending=false;
      localStorage.removeItem(key+'.base.teacher');
      for (const megabytes of [3, 2, 1.5, 1]) {
        snapshot.fixtureLargeField='x'.repeat(megabytes*1024*1024);
        const serialized=JSON.stringify(snapshot);
        try { localStorage.setItem(key,serialized); } catch(error) { if(error.name==='QuotaExceededError')continue;throw error; }
        try { localStorage.setItem('quota-probe',serialized); localStorage.removeItem('quota-probe'); }
        catch(error) { if(error.name==='QuotaExceededError')return snapshot.fixtureLargeField.length;throw error; }
      }
      return 0;
    });
    assert.ok(bytesBeforeQuota>0,'duplicating the active snapshot in localStorage must fail');
    await page.goto(origin+'/ogretmen-ajandasi/index.html');
    await page.waitForFunction(()=>cloudSync.mode==='error'&&!cloudSync.rowChecked);
    await page.locator('button[data-view="backupView"]').click();
    await page.locator('#cloudSaveNowBtnBackup').click();
    await page.waitForFunction(()=>cloudSync.status==='Buluta kaydedildi');
    assert.equal(await page.evaluate(()=>window.cloudWrites),1);
    const recovery = await page.evaluate(async()=>{
      const record=await accessCloudRecovery('teacher');
      return {local:record.local.agendaState.fixtureLargeField.length,cloud:record.cloud.agendaState.classes[0].name,
        other:!!(await accessCloudRecovery('another-teacher'))};
    });
    assert.deepEqual(recovery,{local:bytesBeforeQuota,cloud:cloudClass,other:false});
    await page.locator('#cloudRecoveryVersion').selectOption('cloud');
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportCloudRecoveryBtn').click()]);
    assert.match(download.suggestedFilename(),/kurtarma-bulut/);
    const restored=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(restored.classes[0].name,cloudClass);

    await page.locator('button[data-view="studentsView"]').click();
    await page.locator('#addStudentBtn').click();
    await page.locator('#studentFirstName').fill('Test Öğrenci');
    await page.waitForFunction(()=>state.students.some(student=>student.firstName==='Test Öğrenci'));
    await page.locator('#studentLastName').fill('Otomatik');
    await page.locator('#studentDialog [data-tab="tabNotes"]').click();
    await page.locator('#noteText').fill('Birinci not');
    await page.waitForFunction(()=>state.students.find(student=>student.id===editingStudentId)?.notes[0]?.text==='Birinci not');
    await page.locator('#noteText').fill('Düzeltilmiş not');
    await page.locator('#closeStudentDialogBtn').click();
    const student=await page.evaluate(()=>state.students.find(student=>student.firstName==='Test Öğrenci'));
    assert.equal(student.lastName,'OTOMATİK');
    assert.equal(student.notes.length,1);
    assert.equal(student.notes[0].text,'Düzeltilmiş not');

    await page.locator('button[data-view="examsView"]').click();
    await page.locator('#manualExamName').fill('Otomatik Deneme');
    await page.locator('#prepareManualExamBtn').click();
    const scoreInput=page.locator('#manualExamEntry [data-manual-student="s1"] input[data-kind="d"]').first();
    await scoreInput.fill('6');
    await page.waitForFunction(()=>state.exams.some(exam=>exam.name==='Otomatik Deneme'));
    await scoreInput.fill('8');
    await page.waitForFunction(()=>state.exams.filter(exam=>exam.name==='Otomatik Deneme').length===1 && state.exams.find(exam=>exam.name==='Otomatik Deneme').results.s1.total.d===8);

    await page.locator('button[data-view="calendarView"]').click();
    await page.locator('#newCalendarNoteBtn').click();
    await page.locator('#calendarEventTitle').fill('Takvim taslağı');
    await page.waitForFunction(()=>state.calendarEvents.some(event=>event.title==='Takvim taslağı'));
    await page.locator('#calendarEventTitle').fill('Düzeltilen takvim kaydı');
    await page.waitForFunction(()=>state.calendarEvents.length===1 && state.calendarEvents[0].title==='Düzeltilen takvim kaydı');

    await page.evaluate(()=>{window.failAgendaWrites=true;});
    await page.locator('#calendarEventNote').fill('Bağlantı kesilse de kalsın');
    const warning=page.locator('main [data-agenda-save-warning]');
    await warning.waitFor({state:'visible'});
    assert.match(await warning.innerText(),/Bulut bağlantısı kesildi/);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(STORE_KEY)).calendarEvents[0].note),'Bağlantı kesilse de kalsın');
    await page.evaluate(()=>{window.failAgendaWrites=false;window.dispatchEvent(new Event('online'));});
    await page.waitForFunction(()=>!cloudSync.pending && window.remote.agenda_state.calendarEvents[0]?.note==='Bağlantı kesilse de kalsın');
    await warning.waitFor({state:'hidden'});

    await page.evaluate(()=>{
      window.originalSet=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key===STORE_KEY)throw new DOMException('Quota','QuotaExceededError');return window.originalSet.call(this,key,value);};
    });
    await page.locator('#calendarEventNote').fill('Yedeğe giren değişiklik');
    await warning.waitFor({state:'visible'});
    assert.match(await warning.innerText(),/depolama alanı doldu/);
    const [failedBackup]=await Promise.all([page.waitForEvent('download'),warning.getByRole('button',{name:'JSON Yedeğini İndir'}).click()]);
    const failedDocument=JSON.parse(fs.readFileSync(await failedBackup.path(),'utf8'));
    assert.equal(failedDocument.calendarEvents[0].note,'Yedeğe giren değişiklik');
    await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}: sync recovery, automatic edits/additions, reconnect and download of unsaved work`);await page.close();
  }}finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(error=>{console.error(error);process.exitCode=1;});
