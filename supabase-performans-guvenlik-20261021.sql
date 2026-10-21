-- Audited against live catalog on 2026-10-21. Apply once after the PT409 hotfix.
-- Preserves policy roles, commands and row access; caches row-independent auth checks.
-- Duplicate standalone indexes are removed only when a valid, equivalent UNIQUE
-- constraint index remains. No table rows, storage files or user scores are deleted.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $policies$
begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='aquarium_accounts' and policyname='aquarium_account_owner' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((owner_id = auth.uid()) AND current_user_is_teacher())','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: aquarium_accounts/aquarium_account_owner'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='aquarium_live_state' and policyname='aquarium_live_owner' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((owner_id = auth.uid()) AND current_user_is_teacher())','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: aquarium_live_state/aquarium_live_owner'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='aquarium_shares' and policyname='aquarium_owner' and cmd='ALL' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((owner_id = auth.uid()) AND current_user_is_teacher())','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('((owner_id = auth.uid()) AND current_user_is_teacher())','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: aquarium_shares/aquarium_owner'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='aquarium_student_links' and policyname='aquarium_child_owner' and cmd='ALL' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = auth.uid())))))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('(current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = auth.uid())))))','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: aquarium_student_links/aquarium_child_owner'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress delete own' and cmd='DELETE' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = user_id)','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress delete own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress insert own' and cmd='INSERT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = user_id)','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress insert own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress parent read linked students' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = auth.uid()) AND (l.status = ''active''::text) AND (l.student_profile_id = user_content_progress.user_id))))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress parent read linked students'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress read own' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = user_id)','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress read own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress teacher read assigned students' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(EXISTS ( SELECT 1
 FROM teacher_class_students s
 WHERE ((s.teacher_id = auth.uid()) AND (s.status <> ''removed''::text) AND (s.student_profile_id = user_content_progress.user_id))))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress teacher read assigned students'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_content_progress' and policyname='user_content_progress update own' and cmd='UPDATE' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = user_id)','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = user_id)','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_content_progress/user_content_progress update own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles insert own profile' and cmd='INSERT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = id)','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_profiles/user_profiles insert own profile'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles parent teacher student read related' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((id = auth.uid()) OR (EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.status = ANY (ARRAY[''pending''::text, ''active''::text])) AND (((l.parent_id = auth.uid()) AND ((user_profiles.id = l.student_profile_id) OR (user_profiles.id = l.teacher_id))) OR ((l.student_profile_id = auth.uid()) AND (user_profiles.id = l.parent_id)) OR ((l.teacher_id = auth.uid()) AND ((user_profiles.id = l.parent_id) OR (user_profiles.id = l.student_profile_id))))))))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_profiles/user_profiles parent teacher student read related'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles read own profile' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = id)','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_profiles/user_profiles read own profile'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles update own profile' and cmd='UPDATE' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = id)','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('(auth.uid() = id)','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: user_profiles/user_profiles update own profile'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='parent_student_links' and policyname='parent_student_links read related' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((parent_id = auth.uid()) OR (student_profile_id = auth.uid()) OR (teacher_id = auth.uid()))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: parent_student_links/parent_student_links read related'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='teacher_class_students' and policyname='teacher_class_students teacher update own' and cmd='UPDATE' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((teacher_id = auth.uid()) OR (student_profile_id = auth.uid()))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('((teacher_id = auth.uid()) OR (student_profile_id = auth.uid()))','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: teacher_class_students/teacher_class_students teacher update own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='teacher_class_students' and policyname='teacher_class_students parent read linked' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('(EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = auth.uid()) AND (l.status = ''active''::text) AND (l.student_membership_id = teacher_class_students.id))))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: teacher_class_students/teacher_class_students parent read linked'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='teacher_class_students' and policyname='teacher_class_students teacher read own' and cmd='SELECT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace('((teacher_id = auth.uid()) OR (student_profile_id = auth.uid()))','[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g')) then raise exception 'Policy changed since audit: teacher_class_students/teacher_class_students teacher read own'; end if;
if not exists(select 1 from pg_policies where schemaname='public' and tablename='teacher_class_students' and policyname='teacher_class_students teacher insert own' and cmd='INSERT' and permissive='PERMISSIVE' and roles=ARRAY['authenticated']::name[] and regexp_replace(qual,'[[:space:]]+','','g') is not distinct from regexp_replace(NULL,'[[:space:]]+','','g') and regexp_replace(with_check,'[[:space:]]+','','g') is not distinct from regexp_replace('((teacher_id = auth.uid()) AND current_user_is_teacher() AND (EXISTS ( SELECT 1
 FROM teacher_classes c
 WHERE ((c.id = teacher_class_students.class_id) AND (c.teacher_id = auth.uid()) AND (c.status = ''active''::text)))))','[[:space:]]+','','g')) then raise exception 'Policy changed since audit: teacher_class_students/teacher_class_students teacher insert own'; end if;
end;
$policies$;
alter policy "aquarium_account_owner" on public."aquarium_accounts" using (((owner_id = (select auth.uid())) AND (select public.current_user_is_teacher())));
alter policy "aquarium_live_owner" on public."aquarium_live_state" using (((owner_id = (select auth.uid())) AND (select public.current_user_is_teacher())));
alter policy "aquarium_owner" on public."aquarium_shares" using (((owner_id = (select auth.uid())) AND (select public.current_user_is_teacher()))) with check (((owner_id = (select auth.uid())) AND (select public.current_user_is_teacher())));
alter policy "aquarium_child_owner" on public."aquarium_student_links" using (((select public.current_user_is_teacher()) AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = (select auth.uid()))))))) with check (((select public.current_user_is_teacher()) AND (EXISTS ( SELECT 1
 FROM aquarium_shares a
 WHERE ((a.id = aquarium_student_links.share_id) AND (a.owner_id = (select auth.uid())))))));
alter policy "user_content_progress delete own" on public."user_content_progress" using (((select auth.uid()) = user_id));
alter policy "user_content_progress insert own" on public."user_content_progress" with check (((select auth.uid()) = user_id));
alter policy "user_content_progress parent read linked students" on public."user_content_progress" using ((EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = (select auth.uid())) AND (l.status = 'active'::text) AND (l.student_profile_id = user_content_progress.user_id)))));
alter policy "user_content_progress read own" on public."user_content_progress" using (((select auth.uid()) = user_id));
alter policy "user_content_progress teacher read assigned students" on public."user_content_progress" using ((EXISTS ( SELECT 1
 FROM teacher_class_students s
 WHERE ((s.teacher_id = (select auth.uid())) AND (s.status <> 'removed'::text) AND (s.student_profile_id = user_content_progress.user_id)))));
alter policy "user_content_progress update own" on public."user_content_progress" using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));
alter policy "user_profiles insert own profile" on public."user_profiles" with check (((select auth.uid()) = id));
alter policy "user_profiles parent teacher student read related" on public."user_profiles" using (((id = (select auth.uid())) OR (EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.status = ANY (ARRAY['pending'::text, 'active'::text])) AND (((l.parent_id = (select auth.uid())) AND ((user_profiles.id = l.student_profile_id) OR (user_profiles.id = l.teacher_id))) OR ((l.student_profile_id = (select auth.uid())) AND (user_profiles.id = l.parent_id)) OR ((l.teacher_id = (select auth.uid())) AND ((user_profiles.id = l.parent_id) OR (user_profiles.id = l.student_profile_id)))))))));
alter policy "user_profiles read own profile" on public."user_profiles" using (((select auth.uid()) = id));
alter policy "user_profiles update own profile" on public."user_profiles" using (((select auth.uid()) = id)) with check (((select auth.uid()) = id));
alter policy "parent_student_links read related" on public."parent_student_links" using (((parent_id = (select auth.uid())) OR (student_profile_id = (select auth.uid())) OR (teacher_id = (select auth.uid()))));
alter policy "teacher_class_students teacher update own" on public."teacher_class_students" using (((teacher_id = (select auth.uid())) OR (student_profile_id = (select auth.uid())))) with check (((teacher_id = (select auth.uid())) OR (student_profile_id = (select auth.uid()))));
alter policy "teacher_class_students parent read linked" on public."teacher_class_students" using ((EXISTS ( SELECT 1
 FROM parent_student_links l
 WHERE ((l.parent_id = (select auth.uid())) AND (l.status = 'active'::text) AND (l.student_membership_id = teacher_class_students.id)))));
alter policy "teacher_class_students teacher read own" on public."teacher_class_students" using (((teacher_id = (select auth.uid())) OR (student_profile_id = (select auth.uid()))));
alter policy "teacher_class_students teacher insert own" on public."teacher_class_students" with check (((teacher_id = (select auth.uid())) AND (select public.current_user_is_teacher()) AND (EXISTS ( SELECT 1
 FROM teacher_classes c
 WHERE ((c.id = teacher_class_students.class_id) AND (c.teacher_id = (select auth.uid())) AND (c.status = 'active'::text))))));
CREATE OR REPLACE FUNCTION public.get_system_health_report()
 RETURNS TABLE(alan text, kontrol text, durum text, detay text, sira integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare
 v_missing_docs integer := null;
 v_bucket record;
begin
 if not coalesce(
 current_setting('role', true) in ('postgres', 'service_role', 'supabase_admin')
 or (coalesce(current_setting('role', true), 'none') = 'none'
     and session_user in ('postgres', 'service_role', 'supabase_admin'))
 or public.current_admin_has_permission('system_health'), false) then
 raise exception 'Sistem sagligi yonetici yetkisi gerekli.' using errcode='42501';
 end if;

 return query
 select
 'Okuma'::text,
 'Okuma sonucu RPC'::text,
 case when to_regprocedure('public.submit_reading_result(jsonb)') is not null then 'OK' else 'EKSIK' end,
 case when to_regprocedure('public.submit_reading_result(jsonb)') is not null
 then 'Okuma sonuçları güvenli ve tekrar gönderime dayanıklı RPC üzerinden kaydedilebilir.'
 else 'submit_reading_result(jsonb) eksik. Okuma sonucu kayıtları SQL güncellemesinden etkilenebilir.'
 end,
 10;

 return query
 select
 'Okuma'::text,
 'sonuclar tablosu'::text,
 case when to_regclass('public.sonuclar') is not null then 'OK' else 'EKSIK' end,
 case when to_regclass('public.sonuclar') is not null
 then 'Okuma karne sonuç tablosu erişilebilir.'
 else 'public.sonuclar tablosu bulunamadı.'
 end,
 20;

 return query
 select
 'Okuma'::text,
 'sonuclar public insert policy'::text,
 case when exists (
 select 1
 from pg_policies
 where schemaname = 'public'
 and tablename = 'sonuclar'
 and policyname = 'sonuclar insert for public'
 and cmd = 'INSERT'
 ) then 'OK' else 'EKSIK' end,
 'Öğrenci okuma sonucunun anonim/oturumlu kayıt izni kontrol edilir.'::text,
 30;

 return query
 select
 'Okuma'::text,
 'sonuclar yetkili okuma policy'::text,
 case when exists (
 select 1
 from pg_policies
 where schemaname = 'public'
 and tablename = 'sonuclar'
 and policyname = 'sonuclar auth read'
 and cmd = 'SELECT'
 ) then 'OK' else 'EKSIK' end,
 'Admin okuma sonuç ekranının kayıtları okuyabilmesi kontrol edilir.'::text,
 40;

 return query
 select
 'İlerleme'::text,
 'user_content_progress tablosu'::text,
 case when to_regclass('public.user_content_progress') is not null then 'OK' else 'EKSIK' end,
 case when to_regclass('public.user_content_progress') is not null
 then 'Öğrenci içerik/sınav/okuma ilerleme tablosu erişilebilir.'
 else 'public.user_content_progress tablosu bulunamadı.'
 end,
 50;

 return query
 select
 'İlerleme'::text,
 'benzersiz upsert index'::text,
 case when exists (
 select 1
 from pg_index i
 where i.indrelid = 'public.user_content_progress'::regclass
 and i.indisunique and i.indisvalid and i.indisready
 and i.indpred is null and i.indexprs is null and i.indnkeyatts = 3
 and (select array_agg(a.attname::text order by k.ord)
      from unnest(i.indkey) with ordinality k(attnum, ord)
      join pg_attribute a on a.attrelid=i.indrelid and a.attnum=k.attnum
      where k.ord <= i.indnkeyatts) = array['user_id','content_type','content_id']::text[]
 ) then 'OK' else 'EKSIK' end,
 'Aynı içerik ilerlemesinin tekrar tekrar çoğalmaması için gereken index kontrol edilir.'::text,
 60;

 return query
 select
 'Doküman'::text,
 'kırık kayıt listeleme RPC'::text,
 case when to_regprocedure('public.list_missing_dokuman_storage()') is not null then 'OK' else 'EKSIK' end,
 'Storage dosyası silinmiş ama sitede kaydı kalan dokümanları bulur.'::text,
 70;

 return query
 select
 'Doküman'::text,
 'boşta kalan storage listeleme RPC'::text,
 case when to_regprocedure('public.list_orphan_dokuman_storage()') is not null then 'OK' else 'EKSIK' end,
 'Sitede kullanılmayan Storage dosyalarını bulur.'::text,
 80;

 if to_regclass('public.dokumanlar') is not null and to_regclass('storage.objects') is not null then
 execute $q$
 select count(*)::integer
 from public.dokumanlar d
 where coalesce(d.icerik_turu, 'document') = 'document'
 and coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
 and nullif(trim(d.dosya_yolu), '') is not null
 and not exists (
 select 1
 from storage.objects o
 where o.bucket_id = 'dokumanlar'
 and o.name = d.dosya_yolu
 )
 $q$ into v_missing_docs;

 alan := 'Doküman';
 kontrol := 'kırık doküman kaydı';
 durum := case when coalesce(v_missing_docs, 0) = 0 then 'OK' else 'UYARI' end;
 detay := case when coalesce(v_missing_docs, 0) = 0
 then 'Storage dosyası eksik görünen doküman kaydı yok.'
 else v_missing_docs::text || ' doküman kaydının Storage dosyası eksik görünüyor. Doküman Yönetimi > Kırık Kayıtları Temizle butonunu kullan.'
 end;
 sira := 90;
 return next;
 end if;

 if to_regclass('storage.objects') is not null then
 for v_bucket in
 execute $q$
 select
 bucket_id,
 count(*)::integer as file_count,
 round(sum(
 case
 when metadata ? 'size' and (metadata ->> 'size') ~ '^[0-9]+(\.[0-9]+)?$'
 then (metadata ->> 'size')::numeric
 else 0
 end
 ) / 1024 / 1024, 2) as total_mb
 from storage.objects
 where bucket_id in ('dokumanlar', 'sinav-sorulari', 'teacher-verifications')
 group by bucket_id
 order by bucket_id
 $q$
 loop
 alan := 'Storage';
 kontrol := v_bucket.bucket_id;
 durum := case
 when v_bucket.bucket_id = 'dokumanlar' and v_bucket.total_mb >= 450 then 'UYARI'
 when v_bucket.bucket_id = 'sinav-sorulari' and v_bucket.total_mb >= 450 then 'UYARI'
 else 'OK'
 end;
 detay := v_bucket.file_count::text || ' dosya, yaklaşık ' || coalesce(v_bucket.total_mb, 0)::text || ' MB.';
 sira := 100;
 return next;
 end loop;
 end if;
end;
$function$
;
revoke all on function public.get_system_health_report() from public,anon;
grant execute on function public.get_system_health_report() to authenticated,service_role;

do $guard$
declare item record;
begin
 for item in select * from (values
 ('idx_content_reactions_unique','content_reactions_content_type_content_id_visitor_id_key'),
 ('idx_user_content_progress_unique','user_content_progress_user_id_content_type_content_id_key')
 ) as pairs(extra,kept) loop
  if to_regclass('public.'||item.extra) is not null then
   if not exists (
    select 1 from pg_index e join pg_index k on e.indrelid=k.indrelid
    where e.indexrelid=to_regclass('public.'||item.extra)
    and k.indexrelid=to_regclass('public.'||item.kept)
    and e.indisunique and k.indisunique and e.indnullsnotdistinct=k.indnullsnotdistinct and k.indisvalid and k.indisready
    and not e.indisprimary and not e.indisreplident
    and e.indkey=k.indkey and e.indclass=k.indclass
    and e.indcollation=k.indcollation and e.indoption=k.indoption
    and e.indnkeyatts=k.indnkeyatts and e.indnatts=k.indnatts
    and e.indpred is null and k.indpred is null
    and e.indexprs is null and k.indexprs is null
    and not exists(select 1 from pg_constraint c where c.conindid=e.indexrelid)
    and exists(select 1 from pg_constraint c where c.conindid=k.indexrelid and c.contype='u')
   ) then raise exception 'Index is not a redundant standalone unique index: %',item.extra; end if;
   execute format('drop index public.%I',item.extra);
  end if;
 end loop;
end;
$guard$;

commit;
