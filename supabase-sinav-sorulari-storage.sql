-- ==========================================================
-- Kemal Ogretmenim - Sinav soru gorselleri bucket kurulumu
-- Supabase SQL Editor icinde calistirin.
-- Firebase Storage yerine yuksek kaliteli soru gorselleri icin kullanilir.
-- ==========================================================

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

drop policy if exists "sinav sorulari public read" on storage.objects;
create policy "sinav sorulari public read"
on storage.objects
for select
using (bucket_id = 'sinav-sorulari');

drop policy if exists "sinav sorulari anon insert" on storage.objects;
create policy "sinav sorulari anon insert"
on storage.objects
for insert
to anon
with check (bucket_id = 'sinav-sorulari');
