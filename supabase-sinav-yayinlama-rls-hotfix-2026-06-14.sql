-- ==========================================================
-- Kemal Ogretmenim - Sinav yayinlama RLS hotfix
-- Tarih: 2026-06-14
--
-- Hata: "new row violates row-level security policy"
-- Yer: sinav_sitesi/admin.html, sinav-sorulari storage upload
--
-- Supabase SQL Editor icinde calistirin.
-- ==========================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sinav-sorulari',
  'sinav-sorulari',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant execute on function public.current_admin_email() to authenticated;
grant execute on function public.current_user_has_panel_profile() to authenticated;
grant execute on function public.admin_permission_json_has(jsonb, text) to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to authenticated;

drop policy if exists "sinav sorulari anon insert" on storage.objects;
drop policy if exists "sinav sorulari auth insert" on storage.objects;
drop policy if exists "sinav sorulari auth update" on storage.objects;
drop policy if exists "sinav sorulari auth delete" on storage.objects;
drop policy if exists "sinav sorulari public read" on storage.objects;

create policy "sinav sorulari public read"
on storage.objects
for select
using (bucket_id = 'sinav-sorulari');

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

create policy "sinav sorulari auth update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'sinav-sorulari'
  and (select public.current_admin_has_any_permission(array[
    'exam_create',
    'exam_edit',
    'exam_admin'
  ]))
)
with check (
  bucket_id = 'sinav-sorulari'
  and (select public.current_admin_has_any_permission(array[
    'exam_create',
    'exam_edit',
    'exam_admin'
  ]))
);

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

commit;

-- Kontrol: aktif storage policy'leri ve bucket ayari.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'sinav-sorulari';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    qual ilike '%sinav-sorulari%'
    or with_check ilike '%sinav-sorulari%'
  )
order by policyname;
