-- Dinamik ust menu ve ders sayfalari
-- Supabase SQL Editor icinde bir kez calistirin.

create table if not exists public.menu_ogeler (
  id uuid primary key default gen_random_uuid(),
  nav_key text not null,
  sinif text not null,
  ders_key text not null,
  label text not null,
  icon text not null default '📄',
  sort_order integer not null default 99,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_ogeler_nav_key_check check (nav_key in ('1', '2', '3', '4', 'ortaokul')),
  constraint menu_ogeler_ders_key_check check (ders_key ~ '^[a-z0-9-]+$')
);

create unique index if not exists idx_menu_ogeler_unique_route
on public.menu_ogeler (sinif, ders_key);

create index if not exists idx_menu_ogeler_active_order
on public.menu_ogeler (active, nav_key, sort_order);

create or replace function public.touch_menu_ogeler_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_menu_ogeler_updated_at on public.menu_ogeler;
create trigger trg_menu_ogeler_updated_at
before update on public.menu_ogeler
for each row
execute function public.touch_menu_ogeler_updated_at();

alter table public.menu_ogeler enable row level security;

drop policy if exists "menu_ogeler public read active" on public.menu_ogeler;
create policy "menu_ogeler public read active"
on public.menu_ogeler
for select
to anon, authenticated
using (active = true or auth.role() = 'authenticated');

drop policy if exists "menu_ogeler authenticated insert" on public.menu_ogeler;
create policy "menu_ogeler authenticated insert"
on public.menu_ogeler
for insert
to authenticated
with check (true);

drop policy if exists "menu_ogeler authenticated update" on public.menu_ogeler;
create policy "menu_ogeler authenticated update"
on public.menu_ogeler
for update
to authenticated
using (true)
with check (true);

drop policy if exists "menu_ogeler authenticated delete" on public.menu_ogeler;
create policy "menu_ogeler authenticated delete"
on public.menu_ogeler
for delete
to authenticated
using (true);
