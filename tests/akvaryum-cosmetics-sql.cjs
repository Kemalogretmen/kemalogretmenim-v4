// Isolated PostgreSQL regression; never connects to a live Supabase project.
// node tests/akvaryum-cosmetics-sql.cjs /path/to/@electric-sql/pglite
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../js/akvaryum-core.js'),{PGlite}=require(process.argv[2]||'@electric-sql/pglite');
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
 for(const file of ['supabase-akvaryum.sql','supabase-akvaryum-veli.sql','supabase-akvaryum-cloud.sql','supabase-akvaryum-veli-rapor.sql','supabase-akvaryum-paylasim-gorunumu.sql','supabase-akvaryum-anlik.sql','supabase-akvaryum-cakisma-duzeltme.sql','supabase-akvaryum-ozellestirme.sql','supabase-akvaryum-ozellestirme.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 for(const file of ['tests/akvaryum-rls.sql','tests/akvaryum-child-rls.sql','tests/akvaryum-cloud-rls.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 const authenticate=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 const window={AquariumCore:C};vm.runInNewContext(fs.readFileSync('js/akvaryum-sharing.js','utf8'),{window});
 const doc=C.initialState(),cl=doc.classes[0];cl.students=[C.newStudent('Ada','clown'),C.newStudent('Ece','betta')];for(const s of cl.students)C.ensureDay(s,cl);
 cl.customization={enabled:true,collectionUnlocked:true};cl.students[0].cosmetics={accessory:'sailor',palette:'cool'};cl.students[1].cosmetics={accessory:'star',palette:'pearl'};
 C.awardBehavior(cl.students[0],cl,C.dayKey(),cl.tasks[0].id);
 const snapshot=d=>window.AquariumSharing.snapshot(d.classes[0],{names:true,points:true,motion:true,classPoints:true});
 const save=async(d,rev,snap=snapshot(d))=>(await db.query('select public.save_aquarium_account($1,$2,$3) as rev',[JSON.stringify(d),rev,JSON.stringify([{local_id:cl.id,snapshot:snap}])])).rows[0].rev;
 const read=async()=>(await db.query('select document from aquarium_accounts')).rows[0].document;
 const token='33333333-3333-4333-8333-333333333333',childToken='44444444-4444-4444-8444-444444444444';
 await authenticate(owner);assert.equal(await save(doc,0),1);
 const share=(await db.query('insert into aquarium_shares(owner_id,local_id,token,enabled,show_points,snapshot) values($1,$2,$3,true,false,$4) returning id',[owner,cl.id,token,JSON.stringify(snapshot(doc))])).rows[0].id;
 await db.query("insert into aquarium_student_links(share_id,student_id,token,enabled,view_scope) values($1,$2,$3,true,'class')",[share,cl.students[0].id,childToken]);
 assert.deepEqual((await read()).classes[0].students[0].cosmetics,cl.students[0].cosmetics);
 const legacy=JSON.parse(JSON.stringify(doc));delete legacy.classes[0].customization;for(const s of legacy.classes[0].students){delete s.cosmetics;delete s.characterUnlocked;}
 C.awardBehavior(legacy.classes[0].students[1],legacy.classes[0],C.dayKey(),cl.tasks[0].id);
 const oldSnapshot=snapshot(legacy);delete oldSnapshot.settings.customization;for(const s of oldSnapshot.students)delete s.appearance.cosmetics;
 assert.equal(await save(legacy,1,oldSnapshot),2);const preserved=await read();
 assert.equal(C.earned(preserved.classes[0].students[1]),1);assert.deepEqual(preserved.classes[0].customization,cl.customization);
 assert.deepEqual(preserved.classes[0].students.map(s=>s.cosmetics),cl.students.map(s=>s.cosmetics));
 await assert.rejects(save(doc,1),e=>e.code==='PT409');
 await db.exec('reset role;set role anon');
 let view=(await db.query('select public.view_aquarium($1) as data',[token])).rows[0].data;
 assert.equal(view.settings.customization,true);assert.equal(view.students.length,2);assert.ok(view.students.every(s=>s.points===null));assert.equal(view.classPoints,null);
 assert.deepEqual(view.students[1].appearance.cosmetics,{accessory:'star',palette:'pearl'});
 let parent=(await db.query('select public.view_aquarium_child($1) as data',[childToken])).rows[0].data;
 assert.equal(parent.students[0].points,1);assert.equal(parent.students[1].points,null);assert.equal(parent.classPoints,null);assert.equal(parent.students[1].appearance.trophy,false);
 assert.equal(parent.students[0].id,'my-child');assert.ok(!JSON.stringify(parent).includes('Kitabımı'));assert.ok(!JSON.stringify(parent).includes('collectionUnlocked'));
 for(const sql of ['select * from aquarium_accounts',"select public.aquarium_cosmetic_style('{}','clown')",'select public.aquarium_share_keep_cosmetics()'])await assert.rejects(db.query(sql),e=>e.code==='42501');
 await authenticate(other);assert.equal((await db.query('select * from aquarium_accounts')).rows.length,0);
 await assert.rejects(db.query('select public.save_aquarium_account($1,2,$2,$3)',[JSON.stringify(preserved),'[]',owner]),e=>e.code==='42501');
 await authenticate(owner);preserved.classes[0].customization.enabled=false;assert.equal(await save(preserved,2),3);
 assert.equal((await read()).classes[0].students[0].cosmetics.accessory,'sailor');
 await db.exec('reset role;set role anon');view=(await db.query('select public.view_aquarium($1) as data',[token])).rows[0].data;
 assert.equal(view.settings.customization,false);assert.ok(view.students.every(s=>s.appearance.cosmetics.accessory==='none'&&s.appearance.cosmetics.palette==='original'));
 await authenticate(owner);preserved.classes[0].customization.enabled=true;preserved.classes[0].students[0].cosmetics={accessory:'none',palette:'original'};assert.equal(await save(preserved,3),4);
 assert.equal((await read()).classes[0].students[0].cosmetics.accessory,'none','an explicit reset must win over the compatibility preservation');
 // An older client validates unknown species as clown; scoring must not erase
 // a new animal or a previously earned milestone on the canonical document.
 let revision=4;
 for(const kind of ['lina','spongebob']){
  const latest=await read();latest.classes[0].students[0].species=kind;latest.classes[0].students[0].characterUnlocked=true;
  revision=await save(latest,revision);
  const stale=JSON.parse(JSON.stringify(latest));for(const s of stale.classes[0].students)delete s.characterUnlocked;stale.classes[0].students[0].species='clown';
  revision=await save(stale,revision);assert.equal((await read()).classes[0].students[0].species,kind);assert.equal((await read()).classes[0].students[0].characterUnlocked,true);
  await db.exec('reset role;set role anon');view=(await db.query('select public.view_aquarium($1) as data',[token])).rows[0].data;
  assert.equal(view.students[0].species,kind);assert.ok(!JSON.stringify(view).includes('characterUnlocked'));await authenticate(owner);
 }
 const explicit=await read();explicit.classes[0].students[0].species='clown';revision=await save(explicit,revision);assert.equal((await read()).classes[0].students[0].species,'clown');
 await db.exec('reset role');const bad=(await db.query("select public.aquarium_cosmetic_style($1,'clown') as data",[JSON.stringify({accessory:'javascript:alert(1)',palette:'<script>',history:'PRIVATE'})])).rows[0].data;
 assert.deepEqual(bad,{accessory:'none',palette:'original'});
 console.log('PASS: repeatable migration, existing RLS, legacy cosmetics/new species/milestone preservation, canonical visitor identity, owner-only writes, score privacy, explicit selection/reset and PT409.');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
