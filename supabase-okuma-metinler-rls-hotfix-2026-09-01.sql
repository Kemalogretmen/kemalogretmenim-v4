-- Kemal Ogretmenim - Okuma metni kayit RLS hotfix
-- Tarih: 2026-09-01
--
-- Hata:
--   new row violates row-level security policy for table "metinler"
--
-- Supabase SQL Editor icinde bir kez calistirin.
-- Bu dosya anonim kullaniciya yazma izni vermez; yalnizca admin_users
-- tablosunda aktif owner veya okuma metni yetkisi olan kullanicilar
-- metin ekleyebilir/duzenleyebilir.

begin;

grant usage on schema public to anon, authenticated;

create table if not exists public.admin_users (
  email text primary key,
  display_name text,
  active boolean not null default true,
  is_owner boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists is_owner boolean not null default false;
alter table public.admin_users add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();

insert into public.admin_users (
  email,
  display_name,
  active,
  is_owner,
  permissions
)
values (
  'kemalkocar@yandex.com',
  'Kemal Kocar',
  true,
  true,
  '{}'::jsonb
)
on conflict (email) do update
set
  display_name = coalesce(nullif(public.admin_users.display_name, ''), excluded.display_name),
  active = true,
  is_owner = true,
  updated_at = now();

alter table if exists public.metinler
  add column if not exists baslik_stil_json jsonb not null default '{}'::jsonb,
  add column if not exists plain_text text,
  add column if not exists oturum_gerekli boolean not null default false,
  add column if not exists gizli boolean not null default false,
  add column if not exists egitim_json jsonb not null default '{}'::jsonb;

create or replace function public.current_reading_admin_has_any_permission(permission_keys text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''));
  requested text[] := coalesce(permission_keys, array[]::text[]);
  allowed boolean := false;
begin
  if current_email = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.admin_users au
    where lower(au.email) = current_email
      and au.active = true
      and (
        au.is_owner = true
        or (
          jsonb_typeof(coalesce(au.permissions, '{}'::jsonb)) = 'array'
          and (
            au.permissions ?| requested
            or au.permissions ? 'okuma_editor'
          )
        )
        or (
          jsonb_typeof(coalesce(au.permissions, '{}'::jsonb)) = 'object'
          and (
            exists (
              select 1
              from unnest(requested) as p(permission_key)
              where au.permissions ->> p.permission_key = 'true'
            )
            or au.permissions ->> 'okuma_editor' = 'true'
          )
        )
      )
  )
  into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.current_reading_admin_has_any_permission(text[]) from public;
grant execute on function public.current_reading_admin_has_any_permission(text[]) to authenticated;

alter table public.metinler enable row level security;
grant select on public.metinler to anon;
grant select, insert, update, delete on public.metinler to authenticated;

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

drop policy if exists "metinler auth read published" on public.metinler;
create policy "metinler auth read published"
on public.metinler
for select
to authenticated
using (
  aktif = true
  and coalesce(gizli, false) = false
);

drop policy if exists "metinler auth read all" on public.metinler;
create policy "metinler auth read all"
on public.metinler
for select
to authenticated
using (
  public.current_reading_admin_has_any_permission(array[
    'okuma_metinleri',
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ])
);

drop policy if exists "metinler auth insert" on public.metinler;
create policy "metinler auth insert"
on public.metinler
for insert
to authenticated
with check (
  public.current_reading_admin_has_any_permission(array[
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ])
);

drop policy if exists "metinler auth update" on public.metinler;
create policy "metinler auth update"
on public.metinler
for update
to authenticated
using (
  public.current_reading_admin_has_any_permission(array['okuma_metni_duzenleme'])
)
with check (
  public.current_reading_admin_has_any_permission(array['okuma_metni_duzenleme'])
);

drop policy if exists "metinler auth delete" on public.metinler;
create policy "metinler auth delete"
on public.metinler
for delete
to authenticated
using (
  public.current_reading_admin_has_any_permission(array['okuma_metni_duzenleme'])
);

create index if not exists idx_metinler_active_hidden
  on public.metinler (aktif, gizli, olusturma_tarihi desc);

create index if not exists idx_metinler_egitim_seviye
  on public.metinler ((egitim_json ->> 'seviye'));

create index if not exists idx_metinler_egitim_tur
  on public.metinler ((egitim_json ->> 'tur'));

do $$
begin
  if to_regprocedure('public.replace_reading_questions(uuid, jsonb)') is not null then
    grant execute on function public.replace_reading_questions(uuid, jsonb) to authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;

select
  'metinler RLS hotfix hazir' as durum,
  public.current_reading_admin_has_any_permission(array['okuma_metni_ekleme']) as mevcut_oturum_metin_ekleyebilir;
