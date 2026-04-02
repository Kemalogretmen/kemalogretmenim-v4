-- ==========================================================
-- Kemal Ogretmenim - Dokumanlar / PDF Sistemi
-- Supabase SQL Editor icinde calistirin.
-- Bu script:
-- 1. dokumanlar tablosunu olusturur
-- 2. public PDF bucket'ini kurar
-- 3. anonim goruntuleme + yonetici yonetimi icin RLS ekler
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.dokumanlar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  sinif integer not null check (sinif between 1 and 8),
  ders text not null,
  dosya_yolu text not null,
  dosya_adi text not null,
  dosya_boyutu bigint not null default 0,
  sayfa_sayisi integer not null default 0,
  kapak_renk text not null default '#6C3DED',
  siralama integer not null default 0,
  aktif boolean not null default true,
  oturum_gerekli boolean not null default false,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.dokumanlar
  add column if not exists aciklama text,
  add column if not exists sinif integer,
  add column if not exists ders text,
  add column if not exists dosya_yolu text,
  add column if not exists dosya_adi text,
  add column if not exists dosya_boyutu bigint not null default 0,
  add column if not exists sayfa_sayisi integer not null default 0,
  add column if not exists kapak_renk text not null default '#6C3DED',
  add column if not exists siralama integer not null default 0,
  add column if not exists aktif boolean not null default true,
  add column if not exists oturum_gerekli boolean not null default false,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

update public.dokumanlar
set guncelleme_tarihi = coalesce(guncelleme_tarihi, olusturma_tarihi, now())
where guncelleme_tarihi is null;

alter table public.dokumanlar alter column sinif set not null;
alter table public.dokumanlar alter column ders set not null;
alter table public.dokumanlar alter column dosya_yolu set not null;
alter table public.dokumanlar alter column dosya_adi set not null;

alter table public.dokumanlar enable row level security;

drop policy if exists "dokumanlar public read active" on public.dokumanlar;
create policy "dokumanlar public read active"
on public.dokumanlar
for select
using (aktif = true and oturum_gerekli = false);

drop policy if exists "dokumanlar auth manage" on public.dokumanlar;
create policy "dokumanlar auth manage"
on public.dokumanlar
for all
to authenticated
using (true)
with check (true);

create index if not exists idx_dokumanlar_grade_subject_active
  on public.dokumanlar (sinif, ders, aktif, siralama, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_updated_at
  on public.dokumanlar (guncelleme_tarihi desc);

grant select on public.dokumanlar to anon;
grant select, insert, update, delete on public.dokumanlar to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokumanlar',
  'dokumanlar',
  true,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dokuman storage public read" on storage.objects;
create policy "dokuman storage public read"
on storage.objects
for select
using (bucket_id = 'dokumanlar');

drop policy if exists "dokuman storage auth insert" on storage.objects;
create policy "dokuman storage auth insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'dokumanlar');

drop policy if exists "dokuman storage auth update" on storage.objects;
create policy "dokuman storage auth update"
on storage.objects
for update
to authenticated
using (bucket_id = 'dokumanlar')
with check (bucket_id = 'dokumanlar');

drop policy if exists "dokuman storage auth delete" on storage.objects;
create policy "dokuman storage auth delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'dokumanlar');
