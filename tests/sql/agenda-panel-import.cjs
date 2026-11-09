const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const target='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',foreign='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('PostgreSQL import is owner-scoped, transactional, idempotent, and preserves profiles/parent data',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role authenticated;create role anon;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;
      create table public.user_profiles(id uuid primary key,role text,active boolean,approval_status text);
      insert into user_profiles values('${uid}','teacher',true,'active'),('${other}','teacher',true,'active');
      create function public.current_user_is_teacher() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from user_profiles where id=auth.uid() and role='teacher' and active and approval_status='active')$$;
      create table public.teacher_classes(id uuid primary key,teacher_id uuid,name text,status text);
      create table public.teacher_class_students(id uuid primary key default gen_random_uuid(),class_id uuid,teacher_id uuid,student_profile_id uuid,display_name text,student_no text default '',status text,email text default '',parent_note text default '');
      create table public.teacher_agenda_states(user_id uuid primary key,agenda_state jsonb);
      insert into teacher_classes values('${target}','${uid}','2-B','active'),('${foreign}','${other}','Başka sınıf','active');
      insert into teacher_class_students(class_id,teacher_id,display_name,student_no,status,student_profile_id,parent_note) values
        ('${target}','${uid}','Ada Kaya','1','active','${other}','Veli bağlantısı korunur'),
        ('${target}','${uid}','Başka öğrenci','4','active',null,'');
      alter table teacher_classes enable row level security;alter table teacher_class_students enable row level security;alter table teacher_agenda_states enable row level security;
      create policy own_classes on teacher_classes to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
      create policy own_students on teacher_class_students to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
      create policy own_agenda on teacher_agenda_states to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,update on teacher_classes to authenticated;grant select,insert,update on teacher_class_students to authenticated;grant select,update on teacher_agenda_states to authenticated;`);
    const agenda={classes:[{id:'a',name:'Ajanda sınıfı'},{id:'b',name:'Diğer sınıf'}],students:[
      {id:'s1',classId:'a',firstName:'Ada',lastName:'Kaya',schoolNo:'1',family:{phone:'private'}},
      {id:'s2',classId:'a',firstName:'Efe',lastName:'Can',schoolNo:'2',healthStatus:'private'},
      {id:'s3',classId:'b',firstName:'Başka',lastName:'Sınıf',schoolNo:'3'},
      {id:'s4',classId:'a',firstName:'Çakışan',lastName:'Numara',schoolNo:'4'},
      {id:'s5',classId:'a',firstName:'Yeni',lastName:'Öğrenci',schoolNo:'5'}]};
    await db.query('insert into teacher_agenda_states values($1,$2)',[uid,agenda]);
    const migration=fs.readFileSync('supabase-ajanda-panel-aktarim.sql','utf8');
    await db.exec(migration);await db.exec(migration);
    await db.exec(`set role authenticated;set app.uid='${uid}'`);
    const call=async(ids,source='a',dest=target)=>(await db.query('select public.import_agenda_students($1,$2,$3) as result',[source,dest,ids])).rows[0].result;
    assert.deepEqual(await call(['s1','s2','s2','s4']),{added:1,kept:1,conflicts:1});
    assert.deepEqual(await call(['s1','s2']),{added:0,kept:2,conflicts:0});
    const rows=(await db.query('select * from teacher_class_students order by student_no')).rows;
    assert.equal(rows.length,3);
    assert.equal(rows[0].student_profile_id,other);assert.equal(rows[0].parent_note,'Veli bağlantısı korunur');
    assert.equal(rows[1].agenda_source_student_id,'s2');assert.equal(JSON.stringify(rows).includes('private'),false);
    await assert.rejects(call(['s5','s3']),/source class/);
    assert.equal((await db.query('select count(*)::int as n from teacher_class_students')).rows[0].n,3,'Invalid selection rolls the whole batch back');
    await assert.rejects(call(['s2'],'a',foreign),/not owned/);
    await assert.rejects(call(['s2'],'foreign-source'),/not found/);
    await assert.rejects(call([]),/between 1 and 500/);
    await db.exec(`set app.uid='${other}'`);
    await assert.rejects(call(['s2']),/not owned/);
    await db.exec(`reset role;update user_profiles set approval_status='pending' where id='${uid}';set role authenticated;set app.uid='${uid}'`);
    await assert.rejects(call(['s2']),/approved teacher/);
    await db.exec(`reset role;set role anon`);
    await assert.rejects(call(['s2']),/permission denied/);
  } finally { await db.close(); }
});
