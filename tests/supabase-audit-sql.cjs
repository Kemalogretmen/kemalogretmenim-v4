// Isolated PostgreSQL regression test. No network or production data access.
// node tests/supabase-audit-sql.cjs /path/to/@electric-sql/pglite
const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require(process.argv[2]||'@electric-sql/pglite');
const policies=require('./fixtures/supabase-policy-audit-20261021.json');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const quote=s=>'"'+s.replaceAll('"','""')+'"';
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant usage on schema storage to service_role;
 create table user_profiles(id uuid primary key, role text, approval_status text, active boolean);
 create table user_content_progress(id uuid primary key,user_id uuid,content_type text,content_id text,status text,
 constraint user_content_progress_user_id_content_type_content_id_key unique(user_id,content_type,content_id));
 create unique index idx_user_content_progress_unique on user_content_progress(user_id,content_type,content_id);
 create table content_reactions(id uuid primary key,content_type text,content_id text,visitor_id text,
 constraint content_reactions_content_type_content_id_visitor_id_key unique(content_type,content_id,visitor_id));
 create unique index idx_content_reactions_unique on content_reactions(content_type,content_id,visitor_id);
 create table parent_student_links(id uuid primary key,parent_id uuid,student_profile_id uuid,teacher_id uuid,status text,student_membership_id uuid,class_id uuid);
 create table teacher_class_students(id uuid primary key,teacher_id uuid,student_profile_id uuid,class_id uuid,status text);
 create table teacher_classes(id uuid primary key,teacher_id uuid,status text);
 create table aquarium_accounts(owner_id uuid primary key,document jsonb,revision bigint);
 create table aquarium_live_state(owner_id uuid,class_id text,primary key(owner_id,class_id));
 create table aquarium_shares(id uuid primary key,owner_id uuid);
 create table aquarium_student_links(id uuid primary key,share_id uuid);
 create table storage.objects(bucket_id text,name text,metadata jsonb);
 create function current_user_is_teacher() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from user_profiles where id=auth.uid() and role='teacher' and approval_status='active' and active)$$;
 create function current_admin_has_permission(text) returns boolean language sql stable security definer set search_path=public as $$select auth.uid()='${uid(99)}'::uuid and $1='system_health'$$;`);
 for(const n of [1,2,3,4,5,6,7,99])await db.query('insert into user_profiles values($1,$2,$3,$4)',[uid(n),n<=3?'teacher':n<=5?'student':'parent','active',n!==3]);
 await db.exec(`insert into teacher_classes values('${uid(11)}','${uid(1)}','active'),('${uid(12)}','${uid(2)}','active');
 insert into teacher_class_students values('${uid(21)}','${uid(1)}','${uid(4)}','${uid(11)}','active'),('${uid(22)}','${uid(2)}','${uid(5)}','${uid(12)}','removed');
 insert into parent_student_links values('${uid(31)}','${uid(6)}','${uid(4)}','${uid(1)}','active','${uid(21)}','${uid(11)}'),('${uid(32)}','${uid(7)}','${uid(5)}','${uid(2)}','pending','${uid(22)}','${uid(12)}');`);
 for(const n of [1,2,3]){
  await db.query('insert into aquarium_accounts values($1,$2,1)',[uid(n),{}]);
  await db.query('insert into aquarium_live_state values($1,$2)',[uid(n),'class']);
  await db.query('insert into aquarium_shares values($1,$2)',[uid(40+n),uid(n)]);
  await db.query('insert into aquarium_student_links values($1,$2)',[uid(50+n),uid(40+n)]);
 }
 for(const n of [1,4,5])await db.query('insert into user_content_progress values($1,$2,$3,$4,$5)',[uid(60+n),uid(n),'book','one','started']);
 for(const table of new Set(policies.map(p=>p.tablename))){await db.exec(`alter table ${quote(table)} enable row level security;grant select,insert,update,delete on ${quote(table)} to authenticated;`);}
 for(const p of policies)await db.exec(`create policy ${quote(p.policyname)} on ${quote(p.tablename)} as ${p.permissive} for ${p.cmd} to authenticated${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
 // The extra join target is read-only in this isolated fixture; its live policy is unchanged.
 await db.exec('grant select on teacher_classes to authenticated');
 const identity=async n=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?uid(n):'']);await db.exec(n===0?'set role anon':'set role authenticated');};
 const readSnapshot=async()=>{const result={};for(const n of [1,2,3,4,5,6,7,99,0]){await identity(n);result[n]={};for(const t of new Set(policies.map(p=>p.tablename))){try{result[n][t]=(await db.query(`select to_jsonb(t) as row from ${quote(t)} t order by to_jsonb(t)::text`)).rows;}catch(e){result[n][t]={code:e.code};}}}await db.exec('reset role');return result;};
 const writes=async()=>{const results=[];for(const n of [1,2,3,4,5,6,7,0])for(const op of [
  `update user_content_progress set status='done' where user_id='${uid(4)}'`,
  `delete from user_content_progress where user_id='${uid(4)}'`,
  `insert into user_content_progress values('${uid(81)}','${uid(4)}','book','two','started')`,
  `update user_profiles set active=false where id='${uid(4)}'`,
  `insert into user_profiles values('${uid(90)}','student','active',true)`,
  `insert into aquarium_shares values('${uid(91)}','${uid(1)}')`,
  `delete from aquarium_shares where owner_id='${uid(1)}'`,
  `update aquarium_student_links set share_id='${uid(42)}' where id='${uid(51)}'`,
  `insert into aquarium_student_links values('${uid(92)}','${uid(41)}')`,
  `update teacher_class_students set status='removed' where student_profile_id='${uid(4)}'`,
  `insert into teacher_class_students values('${uid(93)}','${uid(1)}','${uid(5)}','${uid(11)}','active')`
 ]){await identity(n);await db.exec('begin');try{const r=await db.query(op);results.push({n,op,affected:r.affectedRows});}catch(e){results.push({n,op,code:e.code});}await db.exec('rollback');}await db.exec('reset role');return results;};
 const before=await readSnapshot(),beforeWrites=await writes();
 assert.equal(before[1].aquarium_accounts.length,1);assert.equal(before[3].aquarium_accounts.length,0);assert.equal(before[4].user_content_progress.length,1);assert.equal(before[6].user_content_progress.length,1);assert.equal(before[7].user_content_progress.length,0);assert.equal(before[0].aquarium_accounts.code,'42501');
 await db.exec(fs.readFileSync('supabase-performans-guvenlik-20261021.sql','utf8'));
 assert.deepEqual(await readSnapshot(),before,'all owner, teacher, parent, child, inactive and anon visibility stays identical');
 assert.deepEqual(await writes(),beforeWrites,'insert/update/delete behavior must remain identical');
 assert.equal((await db.query("select count(*)::int as n from pg_indexes where indexname in('idx_content_reactions_unique','idx_user_content_progress_unique')")).rows[0].n,0);
 await db.query("insert into user_content_progress values($1,$2,'book','one','done') on conflict(user_id,content_type,content_id) do update set status=excluded.status",[uid(94),uid(4)]);
 await assert.rejects(db.query("insert into content_reactions values($1,'book','one','same'),($2,'book','one','same')",[uid(95),uid(96)]),e=>e.code==='23505');
 await identity(4);const plan=await db.query('explain select * from user_content_progress');assert.match(JSON.stringify(plan.rows),/InitPlan/);
 await assert.rejects(db.query('select * from get_system_health_report()'),e=>e.code==='42501');
 await identity(0);await assert.rejects(db.query('select * from get_system_health_report()'),e=>e.code==='42501');
 await identity(99);const health=(await db.query('select * from get_system_health_report()')).rows;assert.equal(health.find(r=>r.kontrol==='benzersiz upsert index').durum,'OK');
 await db.exec('reset role;set role service_role');assert.ok((await db.query('select * from get_system_health_report()')).rows.length);
 await db.exec('reset role');assert.ok((await db.query('select * from get_system_health_report()')).rows.length);
 await db.exec(fs.readFileSync('supabase-kayit-sagligi-kontrol.sql','utf8'));
 assert.equal((await db.query("select has_function_privilege('anon','get_system_health_report()','EXECUTE') as allowed")).rows[0].allowed,false);
 const beforeRollback=await readSnapshot();
 await db.exec(fs.readFileSync('supabase-performans-20261021-geri-al.sql','utf8'));
 assert.deepEqual(await readSnapshot(),beforeRollback);
 await db.exec(fs.readFileSync('supabase-performans-guvenlik-20261021.sql','utf8'));
 console.log('19 RLS policies: 72 read scopes and 88 write attempts unchanged; initplans, unique upserts, admin-only health report and trusted maintenance access passed.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
