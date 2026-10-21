// Isolated PostgreSQL test; never connects to the production database.
// node tests/akvaryum-live-sql.cjs /path/to/@electric-sql/pglite
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../js/akvaryum-core.js');
const {PGlite}=require(process.argv[2]||'@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
 const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create table public.user_profiles(id uuid primary key,role text,approval_status text,active boolean);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 create function public.current_user_is_teacher() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_profiles where id=auth.uid() and role='teacher' and approval_status='active' and active)$$;
 insert into auth.users values('${owner}'),('${other}');insert into user_profiles values('${owner}','teacher','active',true),('${other}','teacher','active',true);
 create publication supabase_realtime;`);
 for(const file of ['supabase-akvaryum.sql','supabase-akvaryum-veli.sql','supabase-akvaryum-cloud.sql','supabase-akvaryum-anlik.sql','supabase-akvaryum-anlik.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 const today=(await db.query("select (now() at time zone 'Europe/Istanbul')::date::text as date")).rows[0].date;
 const doc=C.initialState(),cl=doc.classes[0];cl.students=['Ada','Bahar','Çınar'].map(name=>C.newStudent(name));for(const s of cl.students)C.ensureDay(s,cl,today);cl.students[2].days[today].absent=true;
 const authenticate=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 await authenticate(owner);assert.equal((await db.query('select public.save_aquarium_account($1,0,$2) as rev',[JSON.stringify(doc),'[]'])).rows[0].rev,1);
 let signals=(await db.query('select * from aquarium_live_state')).rows;assert.equal(signals.length,1);assert.equal(signals[0].class_id,'');assert.equal(signals[0].account_revision,1);
 const pick=async id=>(await db.query('select public.aquarium_pick_student($1,$2) as data',[cl.id,id])).rows[0].data;
 const firstId=C.uid(),first=await pick(firstId);assert.ok(cl.students.slice(0,2).some(s=>s.id===first.student_id));assert.equal(first.sequence,1);
 const aliasId=C.uid(),alias=await pick(aliasId);assert.equal(alias.student_id,first.student_id);assert.equal(alias.sequence,first.sequence,'simultaneous devices must share one result');
 const expire=async()=>{await db.exec('reset role');await db.query("update aquarium_live_state set picked_at=clock_timestamp()-interval '3 seconds' where owner_id=$1 and class_id=$2",[owner,cl.id]);await authenticate(owner);};
 await expire();const second=await pick(C.uid());assert.notEqual(second.student_id,first.student_id);assert.equal(second.round_ids.length,2);
 await expire();const third=await pick(C.uid());assert.equal(third.round_ids.length,1,'a completed round starts afresh');assert.equal(third.sequence,3);
 const retried=await pick(firstId),retriedAlias=await pick(aliasId);assert.equal(retried.pick_id,first.pick_id);assert.equal(retriedAlias.pick_id,first.pick_id);
 assert.deepEqual((await db.query('select document from aquarium_accounts')).rows[0].document,doc,'random selection must not alter scores, attendance or account revision');
 const snapshot=(await db.query('select public.aquarium_live_snapshot() as data')).rows[0].data;assert.equal(snapshot.rows.length,2);assert.ok(Number.isFinite(Date.parse(snapshot.server_now)));assert.ok(!JSON.stringify(snapshot).includes('Ada'),'signals contain IDs, never names or point histories');
 await db.query('select public.save_aquarium_account($1,1,$2)',[JSON.stringify(doc),'[]']);assert.equal((await db.query("select account_revision from aquarium_live_state where class_id=''")).rows[0].account_revision,2);
 await assert.rejects(db.query("update aquarium_live_state set student_id='forged'"),e=>e.code==='42501');
 await assert.rejects(db.query('select * from aquarium_pick_requests'),e=>e.code==='42501');
 await authenticate(other);assert.equal((await db.query('select * from aquarium_live_state')).rows.length,0);assert.deepEqual((await db.query('select public.aquarium_live_snapshot() as data')).rows[0].data.rows,[]);
 await assert.rejects(pick(C.uid()),e=>e.code==='22023');
 await db.exec('reset role');await db.exec(`update user_profiles set active=false where id='${owner}'`);await authenticate(owner);assert.equal((await db.query('select * from aquarium_live_state')).rows.length,0);await assert.rejects(pick(C.uid()),e=>e.code==='42501');
 await db.exec('reset role;set role anon');for(const sql of ['select * from aquarium_live_state','select * from aquarium_pick_requests','select public.aquarium_live_snapshot()',`select public.aquarium_pick_student('${cl.id}','${C.uid()}')`])await assert.rejects(db.query(sql),e=>e.code==='42501');
 await db.exec('reset role');const published=(await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows;assert.deepEqual(published.map(r=>r.tablename),['aquarium_live_state']);
 console.log('Realtime migration, compact signals, owner/anon/inactive RLS, shared rounds, concurrency cooldown and idempotent retries passed.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
