-- Kemal Ogretmenim - Gizli icerik alanlari
-- Supabase SQL Editor icinde bir kez calistirin.
-- Gizli icerik aktif kalir, listelerden kaldirilir ve dogrudan linkle acilabilir.

alter table if exists public.dokumanlar
  add column if not exists gizli boolean not null default false;

alter table if exists public.metinler
  add column if not exists gizli boolean not null default false;

create index if not exists idx_dokumanlar_active_hidden
  on public.dokumanlar (aktif, gizli, olusturma_tarihi desc);

create index if not exists idx_metinler_active_hidden
  on public.metinler (aktif, gizli, olusturma_tarihi desc);
