-- ==========================================================
-- Kemal Ogretmenim - Ana Sayfa Kontrollu Vitrin Slaytlari
-- Supabase SQL Editor icinde calistirin.
--
-- Bu script:
-- 1. homepage_slides tablosunu olusturur
-- 2. aktif slaytlari herkese acik okutur
-- 3. yonetimi mevcut dokuman yetkileriyle korur
-- 4. gorseller icin mevcut public dokumanlar bucket'ini kullanir
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama_html text,
  makale_html text,
  icerik_turu text not null default 'text'
    check (icerik_turu in ('text', 'image', 'youtube', 'document')),
  ikon text not null default '⭐',
  tema_renk text not null default '#6C3DED',
  media_url text,
  media_path text,
  media_fit text not null default 'contain'
    check (media_fit in ('contain', 'cover')),
  youtube_url text,
  youtube_embed_url text,
  youtube_video_id text,
  dokuman_id uuid,
  link_url text,
  link_label text not null default 'İncele',
  gecis_suresi_ms integer not null default 4000
    check (gecis_suresi_ms between 3000 and 10000),
  siralama integer not null default 0,
  aktif boolean not null default true,
  olusturma_tarihi timestamptz not null default now(),
  guncelleme_tarihi timestamptz not null default now()
);

alter table public.homepage_slides
  add column if not exists aciklama_html text,
  add column if not exists makale_html text,
  add column if not exists icerik_turu text not null default 'text',
  add column if not exists ikon text not null default '⭐',
  add column if not exists tema_renk text not null default '#6C3DED',
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists media_fit text not null default 'contain',
  add column if not exists youtube_url text,
  add column if not exists youtube_embed_url text,
  add column if not exists youtube_video_id text,
  add column if not exists dokuman_id uuid,
  add column if not exists link_url text,
  add column if not exists link_label text not null default 'İncele',
  add column if not exists gecis_suresi_ms integer not null default 4000,
  add column if not exists siralama integer not null default 0,
  add column if not exists aktif boolean not null default true,
  add column if not exists olusturma_tarihi timestamptz not null default now(),
  add column if not exists guncelleme_tarihi timestamptz not null default now();

alter table public.homepage_slides enable row level security;

drop policy if exists "homepage slides public read active" on public.homepage_slides;
create policy "homepage slides public read active"
on public.homepage_slides
for select
using (aktif = true);

drop policy if exists "homepage slides auth read all" on public.homepage_slides;
create policy "homepage slides auth read all"
on public.homepage_slides
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'dokuman_ekleme',
    'dokuman_duzenleme',
    'dokuman_silme',
    'site_admin_dashboard'
  ])
);

drop policy if exists "homepage slides auth insert" on public.homepage_slides;
create policy "homepage slides auth insert"
on public.homepage_slides
for insert
to authenticated
with check (
  public.current_admin_has_any_permission(array[
    'dokuman_ekleme',
    'site_admin_dashboard'
  ])
);

drop policy if exists "homepage slides auth update" on public.homepage_slides;
create policy "homepage slides auth update"
on public.homepage_slides
for update
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'dokuman_duzenleme',
    'site_admin_dashboard'
  ])
)
with check (
  public.current_admin_has_any_permission(array[
    'dokuman_duzenleme',
    'site_admin_dashboard'
  ])
);

drop policy if exists "homepage slides auth delete" on public.homepage_slides;
create policy "homepage slides auth delete"
on public.homepage_slides
for delete
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'dokuman_silme',
    'site_admin_dashboard'
  ])
);

create index if not exists idx_homepage_slides_active_order
  on public.homepage_slides (aktif, siralama, olusturma_tarihi desc);

create index if not exists idx_homepage_slides_type_active
  on public.homepage_slides (icerik_turu, aktif);

grant select on public.homepage_slides to anon;
grant select, insert, update, delete on public.homepage_slides to authenticated;

-- Gorseller mevcut `dokumanlar` bucket'ina `homepage-vitrin/...` yolu ile yuklenir.
-- Bucket ve storage policy'leri `supabase-dokumanlar.sql` tarafindan kurulur.
