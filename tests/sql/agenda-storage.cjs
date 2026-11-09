const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

test('agenda storage migration is repeatable, compresses JSONB, measures server bytes, preserves RLS and reclaims obsolete versions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid',true),'')::uuid$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
      create table public.user_profiles(id uuid primary key,role text,active boolean,approval_status text);
      insert into user_profiles values('${owner}','teacher',true,'active'),('${other}','teacher',true,'active');`);
    await db.exec(fs.readFileSync('supabase-ogretmen-ajandasi.sql', 'utf8'));
    const migration = fs.readFileSync('supabase-ajanda-depolama-20261103.sql', 'utf8');
    await db.exec(migration); await db.exec(migration);
    const policy = await db.query(`select attname,attstorage from pg_attribute where attrelid='teacher_agenda_states'::regclass and attname in('agenda_state','lesson_planner_state')`);
    assert.ok(policy.rows.every(r => r.attstorage === 'x'));
    const document = { classes: [{id:'c',name:'2-B'}], students: Array.from({length:24}, (_,i) => ({id:`s${i}`,classId:'c',firstName:`Öğrenci ${i}`,lastName:'Örnek'})),
      exams: Array.from({length:52}, (_,i) => ({id:`e${i}`,classId:'c',subjects:['TÜRKÇE','MATEMATİK','HAYAT BİLGİSİ'],results:{s0:{subjects:{'TÜRKÇE':{d:8,y:1,b:0},'MATEMATİK':{d:5,y:0,b:0},'HAYAT BİLGİSİ':{d:5,y:0,b:0}}}}})) };
    const planner = {yillikPlanlar:{T:Array.from({length:36}, (_,i)=>({hafta:i+1,kazanim:'Okuma ve yazma çalışmaları. '.repeat(30)}))}};
    await db.exec(`set role authenticated;set app.uid='${owner}'`);
    await db.query('insert into teacher_agenda_states(user_id,agenda_state,lesson_planner_state,storage_bytes) values($1,$2,$3,0)', [owner, document, planner]);
    const sizes = (await db.query(`select storage_bytes,octet_length(agenda_state::text)+octet_length(lesson_planner_state::text) as logical,
      pg_column_size(agenda_state)+pg_column_size(lesson_planner_state) as stored from teacher_agenda_states`)).rows[0];
    assert.equal(sizes.storage_bytes, sizes.logical); assert.ok(sizes.stored < sizes.logical, 'TOAST compression saves physical value bytes');
    await db.exec(`set app.uid='${other}'`);
    assert.equal((await db.query('select * from teacher_agenda_states')).rows.length, 0);
    assert.equal((await db.query(`update teacher_agenda_states set agenda_state='{}' where user_id=$1 returning user_id`, [owner])).rows.length, 0);
    await assert.rejects(db.query('insert into teacher_agenda_states(user_id) values($1)',[owner]), /row-level security/);
    await db.exec(`set app.uid='${owner}'`);
    for (let i = 0; i < 3; i++) {
      const next = {...document, exams: document.exams.slice(1)};
      await db.query('update teacher_agenda_states set agenda_state=$1,storage_bytes=1 where user_id=$2',[next,owner]);
    }
    assert.equal((await db.query('select count(*)::int as n from teacher_agenda_states')).rows[0].n, 1);
    assert.equal((await db.query(`select agenda_state->'exams'->0->>'id' as id from teacher_agenda_states`)).rows[0].id, 'e1');
    const tooLarge = { ...document, oversized: 'x'.repeat(6291456) };
    await assert.rejects(db.query('update teacher_agenda_states set agenda_state=$1,storage_bytes=0 where user_id=$2', [tooLarge, owner]), /6 MB/);
    assert.equal((await db.query(`select agenda_state->'exams'->0->>'id' as id from teacher_agenda_states`)).rows[0].id, 'e1');
    await db.exec('reset role');
    await db.exec('vacuum (analyze) teacher_agenda_states');
    await db.exec(fs.readFileSync('supabase-ajanda-depolama-denetim.sql', 'utf8'));
    await db.query('delete from user_profiles where id=$1',[owner]);
    assert.equal((await db.query('select count(*)::int as n from teacher_agenda_states')).rows[0].n, 0);
    console.log(`SQL storage sample: ${sizes.logical} logical bytes, ${sizes.stored} stored value bytes. Production autovacuum remains a live verification.`);
  } finally { await db.close(); }
});
