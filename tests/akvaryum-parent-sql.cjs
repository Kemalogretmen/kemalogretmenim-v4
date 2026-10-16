// Isolated PostgreSQL/PGlite security regression. Never connects to Supabase.
// node tests/akvaryum-parent-sql.cjs /path/to/@electric-sql/pglite
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require(process.argv[2] || '@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create table public.user_profiles(id uuid primary key,role text,approval_status text,active boolean);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;
   create function public.current_user_is_teacher() returns boolean language sql stable security definer set search_path=public as $$
    select exists(select 1 from public.user_profiles where id=auth.uid() and role='teacher' and approval_status='active' and active)$$;
   insert into auth.users values('11111111-1111-4111-8111-111111111111');
   insert into public.user_profiles values('11111111-1111-4111-8111-111111111111','teacher','active',true);`);
  for(const file of ['supabase-akvaryum.sql','supabase-akvaryum-veli.sql','supabase-akvaryum-cloud.sql','supabase-akvaryum-veli-rapor.sql','supabase-akvaryum-paylasim-gorunumu.sql'])await db.exec(fs.readFileSync(file,'utf8'));
  await db.exec(fs.readFileSync('supabase-akvaryum-paylasim-gorunumu.sql','utf8')); // safe repeated installation
  for(const file of ['tests/akvaryum-rls.sql','tests/akvaryum-child-rls.sql','tests/akvaryum-cloud-rls.sql'])await db.exec(fs.readFileSync(file,'utf8'));
  const bounded=(await db.query('select public.aquarium_water_settings($1) as data',[JSON.stringify({settings:{bubbleAmount:999,lightStrength:-10,waveStrength:'invalid',teacherEncouragement:true}})])).rows[0].data;
  assert.equal(bounded.bubbleAmount,150);assert.equal(bounded.lightStrength,50);assert.equal(bounded.waveStrength,100);assert.equal(bounded.teacherEncouragement,undefined);
  console.log('Existing owner, public and child RLS regressions passed.');
  const dates=(await db.query(`select (now() at time zone 'Europe/Istanbul')::date::text as today,
   date_trunc('week',now() at time zone 'Europe/Istanbul')::date::text as week,
   date_trunc('month',now() at time zone 'Europe/Istanbul')::date::text as month,
   ((now() at time zone 'Europe/Istanbul')::date-40)::text as older`)).rows[0];
  const own={id:'child-a',name:'Own Child',species:'cleanershrimp',days:{},feeds:[]};
  function add(date,title,points,status='done'){(own.days[date]||={tasks:[],absent:false}).tasks.push({id:title,title,points,status,awardedAt:0});}
  add(dates.today,'Read a book',10);add(dates.today,'Correction',-2);add(dates.today,'Reversed',100,'pending');
  add(dates.week,'Weekly responsibility',4);add(dates.month,'Monthly activity',6);add(dates.older,'Older activity',7);
  const awards=[{studentId:'child-a',date:dates.older,title:'Past season',points:11,status:'done'},
   {studentId:'child-a',date:dates.older,title:'Past correction',points:-1,status:'done'},
   {studentId:'child-b',date:dates.today,title:'PEER-PRIVATE-HISTORY',points:999,status:'done'}];
  const cls={id:'report-class',name:'Class',students:[own,{id:'child-b',name:'Other Child',days:{},feeds:[]}],seasons:[{label:'Sezon 1',awards}]};
  const doc={version:1,classes:[cls],settings:{}};
  const snapshot={name:'Class',theme:'reef',classPoints:1006,settings:{names:true,points:true,classPoints:true,motion:true,lightMotion:false,waterWaves:true,bubbleAmount:150,lightStrength:125,waveStrength:50,teacherEncouragement:true},students:[
   {id:'child-a',name:'Own Child',species:'cleanershrimp',points:25,mood:'happy',appearance:{egg:false,scale:.6,trophy:false}},
   {id:'child-b',name:'Other Child',species:'tang',points:999,mood:'happy',appearance:{egg:false,scale:1,trophy:true}}]};
  const share='22222222-2222-4222-8222-222222222222',classToken='33333333-3333-4333-8333-333333333333',childToken='44444444-4444-4444-8444-444444444444';
  await db.query(`insert into public.aquarium_accounts(owner_id,document) values('11111111-1111-4111-8111-111111111111',$1)`,[JSON.stringify(doc)]);
  await db.query(`insert into public.aquarium_shares(id,owner_id,local_id,token,snapshot) values($1,'11111111-1111-4111-8111-111111111111','report-class',$2,$3)`,[share,classToken,JSON.stringify(snapshot)]);
  await db.query(`insert into public.aquarium_student_links(share_id,student_id,token,enabled) values($1,'child-a',$2,true)`,[share,childToken]);
  const view=async token=>(await db.query('select public.view_aquarium_child($1) as data',[token])).rows[0].data;
  const history=async(period='day',offset=0,token=childToken)=>(await db.query('select public.view_aquarium_child_history($1,$2,$3) as data',[token,period,offset])).rows[0].data;
  await db.exec('set role anon');
  const childView=await view(childToken);assert.equal(childView.students.length,1);
  assert.equal(childView.settings.bubbleAmount,150);assert.equal(childView.settings.lightStrength,125);assert.equal(childView.settings.waveStrength,50);assert.equal(childView.settings.teacherEncouragement,undefined);
  await assert.rejects(db.query('select public.aquarium_water_settings($1)',[JSON.stringify(snapshot)]),e=>e.code==='42501');
  for(const [period,lower] of [['day',dates.today],['week',dates.week],['month',dates.month],['all','0000-01-01']]) {
   const current=Object.entries(own.days).flatMap(([date,d])=>d.tasks.filter(t=>t.status==='done').map(t=>({...t,date})));
   const all=current.concat(awards.filter(a=>a.studentId==='child-a'));
   const selected=all.filter(a=>a.date>=lower && a.date<=dates.today),report=await history(period);
   assert.equal(report.periodTotal,selected.reduce((sum,e)=>sum+e.points,0));assert.equal(report.count,selected.length);
   assert.equal(report.currentTotal,25);assert.equal(report.allTimeTotal,35);
   assert.ok(!JSON.stringify(report).includes('Other Child')&&!JSON.stringify(report).includes('PEER-PRIVATE-HISTORY')&&!JSON.stringify(report).includes('999'));
  }
  assert.equal(await history('all',0,classToken),null);
  assert.equal(await history('all',0,'55555555-5555-4555-8555-555555555555'),null);
  await assert.rejects(history('invalid'),e=>e.code==='22023');
  await assert.rejects(db.query('select * from public.aquarium_accounts'),e=>e.code==='42501');
  await assert.rejects(db.query('select * from public.aquarium_student_links'),e=>e.code==='42501');
  await assert.rejects(db.query("update public.aquarium_student_links set view_scope='class'"),e=>e.code==='42501');
  await db.exec('reset role');
  await db.query("update public.aquarium_student_links set view_scope='class' where token=$1",[childToken]);
  await db.exec('set role anon');
  const expanded=await view(childToken);assert.equal(expanded.students.length,2);assert.equal(expanded.viewScope,'class');
  assert.equal(expanded.students[0].appearance.scale,.6);assert.equal(expanded.students[1].appearance.scale,1);
  assert.equal(expanded.students[0].id,'my-child');assert.equal(expanded.students[0].points,25);
  assert.equal(expanded.students[1].name,'Other Child');assert.equal(expanded.students[1].points,null);assert.equal(expanded.students[1].appearance.trophy,false);
  assert.equal(expanded.classPoints,null);assert.equal(expanded.settings.classPoints,false);
  assert.equal((await db.query('select public.view_aquarium($1) as data',[classToken])).rows[0].data,null,'private class mode must not open public permission');
  await db.exec('reset role');
  await db.query('update public.aquarium_shares set enabled=true,show_points=false where id=$1',[share]);
  await db.exec('set role anon');
  const publicHidden=(await db.query('select public.view_aquarium($1) as data',[classToken])).rows[0].data;
  assert.equal(publicHidden.settings.lightMotion,false);assert.equal(publicHidden.settings.waterWaves,true);
  assert.equal(publicHidden.students.length,2);assert.equal(publicHidden.settings.points,false);
  assert.ok(publicHidden.students.every(s=>s.points===null && !s.appearance.trophy));
  assert.equal(publicHidden.classPoints,null);assert.equal(publicHidden.students[1].name,'Other Child');
  assert.equal(publicHidden.students[0].appearance.scale,.6);
  await assert.rejects(db.query('select public.aquarium_share_projection($1,false,null,true)',[JSON.stringify(snapshot)]),e=>e.code==='42501');
  await db.exec('reset role');await db.query('update public.aquarium_shares set show_points=true where id=$1',[share]);
  await db.exec('set role anon');
  const publicScores=(await db.query('select public.view_aquarium($1) as data',[classToken])).rows[0].data;
  assert.equal(publicScores.students[0].points,25);assert.equal(publicScores.students[1].points,999);
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify({child:childView,class:expanded,publicHidden,publicScores}));
  assert.equal(publicScores.classPoints,1006);assert.equal(publicScores.students[1].appearance.trophy,true);
  assert.equal(publicScores.settings.lightMotion,false);assert.equal(publicScores.settings.waterWaves,true);
  const stillPrivate=await view(childToken);assert.equal(stillPrivate.settings.waterWaves,true);assert.equal(stillPrivate.students[1].points,null);assert.equal(stillPrivate.classPoints,null);
  assert.equal(JSON.stringify(stillPrivate).includes('999'),false);
  await db.exec('reset role');
  const hiddenLocal=JSON.parse(JSON.stringify(snapshot));hiddenLocal.settings.names=false;hiddenLocal.settings.points=false;
  hiddenLocal.students.forEach(s=>{s.shareName=s.name;s.sharePoints=s.points;s.name='';s.points=null;});
  hiddenLocal.shareClassPoints=1006;hiddenLocal.classPoints=null;
  await db.query('update public.aquarium_shares set snapshot=$1 where id=$2',[JSON.stringify(hiddenLocal),share]);
  await db.exec('set role anon');const independent=await view(childToken);
  assert.equal(independent.students[0].points,25);assert.equal(independent.students[1].points,null);
  assert.equal(independent.students[1].name,'Other Child');assert.equal(independent.students[1].appearance.scale,1);
  assert.equal(JSON.stringify(independent).includes('sharePoints'),false);
  await db.exec('reset role');await db.query('update public.aquarium_shares set enabled=false,snapshot=$1 where id=$2',[JSON.stringify(snapshot),share]);
  await db.exec('set role anon');

  assert.equal((await history('all')).allTimeTotal,35);
  await db.exec('reset role');
  add(dates.today,'Large current correction',-100);
  await db.query('update public.aquarium_accounts set document=$1 where owner_id=\'11111111-1111-4111-8111-111111111111\'',[JSON.stringify(doc)]);
  await db.exec('set role anon');const corrected=await history('all');
  assert.equal(corrected.currentTotal,0);assert.equal(corrected.allTimeTotal,10,'current deductions cannot consume earned points from an archived season');
  await db.exec('reset role');own.days[dates.today].tasks.pop();
  for(let i=0;i<35;i++)add(dates.today,'Page item '+i,1);
  await db.query('update public.aquarium_accounts set document=$1 where owner_id=\'11111111-1111-4111-8111-111111111111\'',[JSON.stringify(doc)]);
  await db.exec('set role anon');const page=await history('day'),next=await history('day',30);assert.equal(page.events.length,30);assert.equal(page.hasMore,true);assert.ok(next.events.length>0);assert.equal(next.hasMore,false);
  await db.exec('reset role');
  await db.query('update public.aquarium_student_links set enabled=false where token=$1',[childToken]);await db.exec('set role anon');
  assert.equal(await view(childToken),null);assert.equal(await history(),null);
  await db.exec('reset role');await db.query('update public.aquarium_student_links set enabled=true where token=$1',[childToken]);
  await db.exec("update public.user_profiles set active=false");await db.exec('set role anon');assert.equal(await view(childToken),null);assert.equal(await history(),null);
  console.log('Parent scopes, hidden peer scores, archived periods, corrections, pagination, invalid tokens, read-only access and revocation passed.');
 } finally {await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
