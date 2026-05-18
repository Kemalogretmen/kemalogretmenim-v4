-- ==========================================================
-- Kemal Ogretmenim - Dokumanlar / PDF ve Gorsel Sistemi
-- Supabase SQL Editor icinde calistirin.
-- Bu script:
-- 1. dokumanlar tablosunu olusturur
-- 2. public dokuman bucket'ini kurar
-- 3. anonim goruntuleme + yonetici yonetimi icin RLS ekler
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.dokumanlar (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text,
  sinif integer not null check (sinif between 1 and 8),
  ders text not null,
  hedefler jsonb not null default '[]'::jsonb,
  dosya_yolu text not null,
  dosya_adi text not null,
  dosya_boyutu bigint not null default 0,
  sayfa_sayisi integer not null default 0,
  icerik_turu text not null default 'document' check (icerik_turu in ('document', 'video')),
  video_url text,
  video_embed_url text,
  video_provider text,
  video_html text,
  kapak_renk text not null default '#6C3DED',
  etkilesim_json jsonb not null default '{}'::jsonb,
  siralama integer not null default 0,
  aktif boolean not null default true,
  gizli boolean not null default false,
  oturum_gerekli boolean not null default false,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.dokumanlar
  add column if not exists aciklama text,
  add column if not exists sinif integer,
  add column if not exists ders text,
  add column if not exists hedefler jsonb not null default '[]'::jsonb,
  add column if not exists dosya_yolu text,
  add column if not exists dosya_adi text,
  add column if not exists dosya_boyutu bigint not null default 0,
  add column if not exists sayfa_sayisi integer not null default 0,
  add column if not exists icerik_turu text not null default 'document',
  add column if not exists video_url text,
  add column if not exists video_embed_url text,
  add column if not exists video_provider text,
  add column if not exists video_html text,
  add column if not exists kapak_renk text not null default '#6C3DED',
  add column if not exists etkilesim_json jsonb not null default '{}'::jsonb,
  add column if not exists siralama integer not null default 0,
  add column if not exists aktif boolean not null default true,
  add column if not exists gizli boolean not null default false,
  add column if not exists oturum_gerekli boolean not null default false,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

update public.dokumanlar
set guncelleme_tarihi = coalesce(guncelleme_tarihi, olusturma_tarihi, now())
where guncelleme_tarihi is null;

update public.dokumanlar
set hedefler = jsonb_build_array(jsonb_build_object('sinif', sinif, 'ders', ders))
where (hedefler is null or hedefler = '[]'::jsonb)
  and sinif is not null
  and ders is not null;

alter table public.dokumanlar alter column sinif set not null;
alter table public.dokumanlar alter column ders set not null;
alter table public.dokumanlar alter column dosya_yolu set not null;
alter table public.dokumanlar alter column dosya_adi set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dokumanlar_icerik_turu_check'
      and conrelid = 'public.dokumanlar'::regclass
  ) then
    alter table public.dokumanlar
      add constraint dokumanlar_icerik_turu_check
      check (icerik_turu in ('document', 'video'));
  end if;
end $$;

alter table public.dokumanlar enable row level security;

drop policy if exists "dokumanlar public read active" on public.dokumanlar;
create policy "dokumanlar public read active"
on public.dokumanlar
for select
using (aktif = true);

drop policy if exists "dokumanlar auth manage" on public.dokumanlar;
drop policy if exists "dokumanlar auth read all" on public.dokumanlar;
create policy "dokumanlar auth read all"
on public.dokumanlar
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'dokuman_ekleme',
    'dokuman_duzenleme',
    'dokuman_silme'
  ])
);

drop policy if exists "dokumanlar auth insert" on public.dokumanlar;
create policy "dokumanlar auth insert"
on public.dokumanlar
for insert
to authenticated
with check (public.current_admin_has_permission('dokuman_ekleme'));

drop policy if exists "dokumanlar auth update" on public.dokumanlar;
create policy "dokumanlar auth update"
on public.dokumanlar
for update
to authenticated
using (public.current_admin_has_permission('dokuman_duzenleme'))
with check (public.current_admin_has_permission('dokuman_duzenleme'));

drop policy if exists "dokumanlar auth delete" on public.dokumanlar;
create policy "dokumanlar auth delete"
on public.dokumanlar
for delete
to authenticated
using (public.current_admin_has_permission('dokuman_silme'));

create index if not exists idx_dokumanlar_grade_subject_active
  on public.dokumanlar (sinif, ders, aktif, siralama, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_active_hidden
  on public.dokumanlar (aktif, gizli, olusturma_tarihi desc);

create index if not exists idx_dokumanlar_targets_gin
  on public.dokumanlar using gin (hedefler);

create index if not exists idx_dokumanlar_updated_at
  on public.dokumanlar (guncelleme_tarihi desc);

create index if not exists idx_dokumanlar_type_active
  on public.dokumanlar (icerik_turu, aktif, siralama, olusturma_tarihi desc);

grant select on public.dokumanlar to anon;
grant select, insert, update, delete on public.dokumanlar to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokumanlar',
  'dokumanlar',
  true,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
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
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_ekleme')
);

drop policy if exists "dokuman storage auth update" on storage.objects;
create policy "dokuman storage auth update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
)
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
);

drop policy if exists "dokuman storage auth delete" on storage.objects;
create policy "dokuman storage auth delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_silme')
);
