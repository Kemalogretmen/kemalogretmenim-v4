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
      window.remote={agenda_state:JSON.parse(JSON.stringify(local)),lesson_planner_state:null,updated_at:'r1',storage_bytes:100};window.imported=[];window.cloudWrites=0;
      const client={auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},from(table){let mode='read',payload;const filters={};const query={select(){return query;},eq(k,v){filters[k]=v;return query;},in(){return query;},neq(){return query;},order(){return query;},or(){return query;},limit(){return query;},update(value){mode='update';payload=value;return query;},insert(value){mode='insert';payload=value;return query;},async maybeSingle(){
        if(table==='user_profiles')return{data:profile,error:null};
        if(table==='teacher_agenda_states'){
          if(mode==='read')return{data:window.remote,error:null};
          if(filters.updated_at!==window.remote.updated_at)return{data:null,error:null};
          window.cloudWrites++;window.remote={...window.remote,...payload,updated_at:'r'+(window.cloudWrites+1)};return{data:window.remote,error:null};
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
    await page.locator('#className').fill('Şampiyonlar');await page.locator('#saveSettingsBtn').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kemalOgretmenAjandasi.v1')).classes[0].name==='Şampiyonlar');
    await page.reload();await page.waitForFunction(()=>cloudSync.ready);assert.equal(await page.evaluate(()=>cloudSync.rowChecked),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
    const bytesBeforeQuota=await page.evaluate(()=>{
      const key='kemalOgretmenAjandasi.v1', snapshot=JSON.parse(localStorage.getItem(key));
      snapshot.updatedAt='2090-01-01T00:00:00Z';
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
    assert.deepEqual(recovery,{local:bytesBeforeQuota,cloud:'2-B',other:false});
    await page.locator('#cloudRecoveryVersion').selectOption('cloud');
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportCloudRecoveryBtn').click()]);
    assert.match(download.suggestedFilename(),/kurtarma-bulut/);
    const restored=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(restored.classes[0].name,'2-B');
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}: panel import, reload, actual storage quota, indexed backups, revision and JSON download`);await page.close();
  }}finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(error=>{console.error(error);process.exitCode=1;});
