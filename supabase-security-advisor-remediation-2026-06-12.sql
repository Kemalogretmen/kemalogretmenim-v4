-- ==========================================================
-- Kemal Ogretmenim - Supabase Security Advisor duzeltmeleri
-- Tarih: 2026-06-12
--
-- Supabase SQL Editor icinde once "KONTROL" sorgularini calistirin.
-- Sonra ihtiyaciniza gore "DUZELTME" bolumlerini calistirin.
-- ==========================================================

-- ----------------------------------------------------------
-- KONTROL 1: Always true / genis RLS politikalarini listele
-- ----------------------------------------------------------
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
  and (
    coalesce(qual, '') in ('true', '(true)')
    or coalesce(with_check, '') in ('true', '(true)')
    or coalesce(qual, '') ilike '%USING (true)%'
    or coalesce(with_check, '') ilike '%WITH CHECK (true)%'
  )
order by schemaname, tablename, policyname;

-- ----------------------------------------------------------
-- KONTROL 2: Storage bucket ve object politikalarini listele
-- ----------------------------------------------------------
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('dokumanlar', 'sinav-sorulari');

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    qual ilike '%dokumanlar%'
    or qual ilike '%sinav-sorulari%'
    or with_check ilike '%dokumanlar%'
    or with_check ilike '%sinav-sorulari%'
  )
order by policyname;

-- ----------------------------------------------------------
-- KONTROL 3: SECURITY DEFINER fonksiyon izinlerini listele
-- ----------------------------------------------------------
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  p.proacl as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- ==========================================================
-- DUZELTME A: Okuma tablolari icin eski always-true politikalari kaldir
-- ==========================================================
drop policy if exists "pub_del_metinler" on public.metinler;
drop policy if exists "pub_ins_metinler" on public.metinler;
drop policy if exists "pub_sel_metinler" on public.metinler;
drop policy if exists "pub_upd_metinler" on public.metinler;
drop policy if exists "pub_all_secenekler" on public.secenekler;
drop policy if exists "pub_sel_secenekler" on public.secenekler;
drop policy if exists "pub_del_sonuclar" on public.sonuclar;
drop policy if exists "pub_ins_sonuclar" on public.sonuclar;
drop policy if exists "pub_sel_sonuclar" on public.sonuclar;
drop policy if exists "pub_all_sorular" on public.sorular;
drop policy if exists "pub_sel_sorular" on public.sorular;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('metinler', 'sorular', 'secenekler', 'sonuclar')
      and (
        coalesce(qual, '') in ('true', '(true)')
        or coalesce(with_check, '') in ('true', '(true)')
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Metinler: anonim ziyaretci sadece aktif, gizli olmayan, oturum gerektirmeyen metinleri okur.
drop policy if exists "metinler public read active" on public.metinler;
create policy "metinler public read active"
on public.metinler
for select
to anon
using (
  aktif = true
  and coalesce(gizli, false) = false
  and coalesce(oturum_gerekli, false) = false
);

-- Girmis kullanici/ogrenci aktif ve gizli olmayan metinleri okuyabilir.
drop policy if exists "metinler auth read published" on public.metinler;
create policy "metinler auth read published"
on public.metinler
for select
to authenticated
using (
  aktif = true
  and coalesce(gizli, false) = false
);

-- Admin/editor okuma ve yonetim politikalari.
drop policy if exists "metinler auth read all" on public.metinler;
create policy "metinler auth read all"
on public.metinler
for select
to authenticated
using (
  (select public.current_admin_has_any_permission(array[
    'okuma_metinleri',
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ]))
);

drop policy if exists "metinler auth insert" on public.metinler;
create policy "metinler auth insert"
on public.metinler
for insert
to authenticated
with check ((select public.current_admin_has_permission('okuma_metni_ekleme')));

drop policy if exists "metinler auth update" on public.metinler;
create policy "metinler auth update"
on public.metinler
for update
to authenticated
using ((select public.current_admin_has_permission('okuma_metni_duzenleme')))
with check ((select public.current_admin_has_permission('okuma_metni_duzenleme')));

drop policy if exists "metinler auth delete" on public.metinler;
create policy "metinler auth delete"
on public.metinler
for delete
to authenticated
using ((select public.current_admin_has_permission('okuma_metni_duzenleme')));

-- Sorular/secenekler: sadece yayinlanan metinlere bagli olanlar gorunsun.
drop policy if exists "sorular public read" on public.sorular;
create policy "sorular public read"
on public.sorular
for select
to anon
using (
  exists (
    select 1
    from public.metinler m
    where m.id = sorular.metin_id
      and m.aktif = true
      and coalesce(m.gizli, false) = false
      and coalesce(m.oturum_gerekli, false) = false
  )
);

drop policy if exists "sorular auth read published" on public.sorular;
create policy "sorular auth read published"
on public.sorular
for select
to authenticated
using (
  exists (
    select 1
    from public.metinler m
    where m.id = sorular.metin_id
      and m.aktif = true
      and coalesce(m.gizli, false) = false
  )
);

drop policy if exists "secenekler public read" on public.secenekler;
create policy "secenekler public read"
on public.secenekler
for select
to anon
using (
  exists (
    select 1
    from public.sorular q
    join public.metinler m on m.id = q.metin_id
    where q.id = secenekler.soru_id
      and m.aktif = true
      and coalesce(m.gizli, false) = false
      and coalesce(m.oturum_gerekli, false) = false
  )
);

drop policy if exists "secenekler auth read published" on public.secenekler;
create policy "secenekler auth read published"
on public.secenekler
for select
to authenticated
using (
  exists (
    select 1
    from public.sorular q
    join public.metinler m on m.id = q.metin_id
    where q.id = secenekler.soru_id
      and m.aktif = true
      and coalesce(m.gizli, false) = false
  )
);

-- Sonuclar: anonim insert kalsin, ama select/update/delete sadece yetkili admin.
drop policy if exists "sonuclar insert for public" on public.sonuclar;
create policy "sonuclar insert for public"
on public.sonuclar
for insert
to anon, authenticated
with check (
  coalesce(trim(ad), '') <> ''
  and coalesce(trim(soyad), '') <> ''
  and sinif between 1 and 12
  and coalesce(trim(sube), '') <> ''
);

drop policy if exists "sonuclar auth read" on public.sonuclar;
create policy "sonuclar auth read"
on public.sonuclar
for select
to authenticated
using (
  (select public.current_admin_has_any_permission(array[
    'okuma_sonuclari',
    'okuma_sonuclari_duzenleme',
    'okuma_karne'
  ]))
);

-- ==========================================================
-- DUZELTME B: Storage bucket listeleme/yukleme riskleri
-- ==========================================================

-- Sinav soru gorselleri: anonim yukleme kapatilir.
drop policy if exists "sinav sorulari anon insert" on storage.objects;

drop policy if exists "sinav sorulari auth insert" on storage.objects;
create policy "sinav sorulari auth insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sinav-sorulari'
  and (select public.current_admin_has_any_permission(array[
    'exam_create',
    'exam_edit',
    'exam_admin'
  ]))
);

drop policy if exists "sinav sorulari auth delete" on storage.objects;
create policy "sinav sorulari auth delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sinav-sorulari'
  and (select public.current_admin_has_any_permission(array[
    'exam_delete',
    'exam_edit',
    'exam_admin'
  ]))
);

-- Public listing uyarisi istemiyorsaniz bucket'i private yapin.
-- Bu degisiklikten sonra uygulamada public URL yerine signed URL gerekir.
-- update storage.buckets set public = false where id in ('dokumanlar', 'sinav-sorulari');

-- ==========================================================
-- DUZELTME C: SECURITY DEFINER fonksiyonlari icin public execute temizligi
-- ==========================================================

-- Guvenli varsayilan: tum public fonksiyonlarda eski execute haklarini kaldir.
-- Asagida uygulamanin kullandigi fonksiyonlara gerekli roller geri verilir.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.record_admin_login(text, text, text, text) to authenticated;
grant execute on function public.get_site_analytics_summary(integer) to authenticated;

grant execute on function public.submit_calisma_kagidi(uuid, text, text, integer, text, jsonb) to anon, authenticated;
grant execute on function public.calisma_kagidi_cevap_dogru_mu(text, jsonb, jsonb) to anon, authenticated;

grant execute on function public.get_content_reaction_summary(text, text, text) to anon, authenticated;
grant execute on function public.get_content_reaction_summaries(jsonb, text) to anon, authenticated;
grant execute on function public.set_content_reaction(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_content_reaction_report(integer, integer) to authenticated;

grant execute on function public.current_admin_email() to authenticated;
grant execute on function public.current_user_has_panel_profile() to authenticated;
grant execute on function public.admin_users_is_empty() to authenticated;
grant execute on function public.admin_users_has_owner() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_admin_owner() to authenticated;
grant execute on function public.admin_permission_json_has(jsonb, text) to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to authenticated;
grant execute on function public.get_user_profile_counts() to authenticated;
grant execute on function public.list_registered_users() to authenticated;

grant execute on function public.current_user_is_teacher() to authenticated;
grant execute on function public.current_user_is_student() to authenticated;
grant execute on function public.current_user_is_parent() to authenticated;
grant execute on function public.list_teacher_verification_requests(text) to authenticated;
grant execute on function public.review_teacher_verification(uuid, text, text) to authenticated;
grant execute on function public.join_teacher_class_by_code(text) to authenticated;

grant execute on function public.create_parent_account_code() to authenticated;
grant execute on function public.create_teacher_parent_code(uuid, integer) to authenticated;
grant execute on function public.connect_parent_with_teacher_code(text, text) to authenticated;
grant execute on function public.connect_student_with_parent_code(text, text) to authenticated;
grant execute on function public.review_parent_student_link(uuid, text) to authenticated;
grant execute on function public.revoke_parent_student_link(uuid) to authenticated;

grant execute on function public.current_request_can_delete_dokuman() to authenticated;
grant execute on function public.delete_dokuman_with_cleanup(uuid) to authenticated;
grant execute on function public.list_orphan_dokuman_storage() to authenticated;
grant execute on function public.cleanup_deleted_dokuman_artifacts() to authenticated;

grant execute on function public.content_safety_normalized_parts(text) to anon, authenticated;
grant execute on function public.content_safety_has_violation(text) to anon, authenticated;
grant execute on function public.content_safety_reject_if_violation(text, text) to anon, authenticated;
grant execute on function public.delete_old_content_safety_events(integer) to authenticated;

-- ==========================================================
-- DUZELTME D: Performance Advisor "Auth RLS Initialization Plan"
-- Not: Bu scriptte yeni/duzeltilen politikalarda auth/helper fonksiyonlari
-- (select public.fn(...)) bicimine alindi. Sonra Advisor > Rerun linter.
-- ==========================================================
