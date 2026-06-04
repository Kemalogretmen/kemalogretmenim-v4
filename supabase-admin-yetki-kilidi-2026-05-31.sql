-- Kemal Ogretmenim - Admin yetki kilidi hotfix
-- Ogretmen / ogrenci / veli profili olan hesaplar yonetim panelinde
-- legacy/kurulum modundan ya da admin_users satirindan yetki alamaz.
-- Supabase SQL Editor icinde bir kez calistirin.

begin;

create table if not exists public.admin_users (
  email text primary key,
  display_name text,
  active boolean not null default true,
  is_owner boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_login_events (
  id bigserial primary key,
  email text not null,
  display_name text,
  is_owner boolean not null default false,
  area text not null default 'main',
  scope text not null default 'default',
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists is_owner boolean not null default false;
alter table public.admin_users add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();

alter table public.admin_login_events add column if not exists display_name text;
alter table public.admin_login_events add column if not exists is_owner boolean not null default false;
alter table public.admin_login_events add column if not exists area text not null default 'main';
alter table public.admin_login_events add column if not exists scope text not null default 'default';
alter table public.admin_login_events add column if not exists path text;
alter table public.admin_login_events add column if not exists user_agent text;
alter table public.admin_login_events add column if not exists created_at timestamptz not null default now();

update public.admin_users
set permissions = '{}'::jsonb
where permissions is null;

create index if not exists idx_admin_users_email on public.admin_users (lower(email));
create index if not exists idx_admin_users_active on public.admin_users (active);
create index if not exists idx_admin_login_events_created_at on public.admin_login_events (created_at desc);
create index if not exists idx_admin_login_events_email on public.admin_login_events (lower(email));
create index if not exists idx_admin_login_events_area on public.admin_login_events (area);

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

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''))
$$;

create or replace function public.current_user_has_panel_profile()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  blocked boolean := false;
begin
  if coalesce(current_email, '') = '' then
    return false;
  end if;

  if to_regclass('public.user_profiles') is null then
    return false;
  end if;

  execute
    'select exists (
      select 1
      from public.user_profiles
      where lower(email) = $1
        and role in (''teacher'', ''student'', ''parent'')
        and not exists (
          select 1
          from public.admin_users au
          where lower(au.email) = $1
            and au.active = true
        )
    )'
  into blocked
  using current_email;

  return coalesce(blocked, false);
end;
$$;

create or replace function public.admin_users_is_empty()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.admin_users)
$$;

create or replace function public.admin_users_has_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where active = true
      and is_owner = true
  )
$$;

create or replace function public.is_admin_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.current_user_has_panel_profile()
    and exists (
      select 1
      from public.admin_users
      where lower(email) = public.current_admin_email()
        and active = true
        and is_owner = true
    )
$$;

create or replace function public.admin_permission_json_has(permission_json jsonb, permission_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      coalesce(permission_json, '{}'::jsonb) as permissions,
      coalesce(permission_key, '') as requested_key
  )
  select case
    when requested_key = '' then false
    when jsonb_typeof(permissions) = 'array' then
      permissions ? requested_key
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ? 'dokuman_yonetimi'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ? 'okuma_editor'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ? 'oyunlar_admin'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ? 'exam_admin'
      )
    when jsonb_typeof(permissions) = 'object' then
      permissions ->> requested_key = 'true'
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ->> 'dokuman_yonetimi' = 'true'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ->> 'okuma_editor' = 'true'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ->> 'oyunlar_admin' = 'true'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ->> 'exam_admin' = 'true'
      )
    else false
  end
  from normalized
$$;

create or replace function public.current_admin_has_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  has_owner boolean := false;
  allowed boolean := false;
begin
  if coalesce(current_email, '') = '' then
    return false;
  end if;

  if public.current_user_has_panel_profile() then
    return false;
  end if;

  select exists (
    select 1
    from public.admin_users
    where lower(email) = current_email
      and active = true
      and (
        is_owner = true
        or public.admin_permission_json_has(permissions, permission_key)
      )
  )
  into allowed;

  if allowed then
    return true;
  end if;

  select exists (
    select 1
    from public.admin_users
    where active = true
      and is_owner = true
  )
  into has_owner;

  if not has_owner then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.current_admin_has_any_permission(permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(public.current_admin_has_permission(permission_key)), false)
  from unnest(coalesce(permission_keys, array[]::text[])) as p(permission_key)
$$;

alter table public.admin_users enable row level security;
alter table public.admin_login_events enable row level security;

grant usage on schema public to anon, authenticated;

revoke all on public.admin_users from anon;
revoke all on public.admin_users from public;
revoke all on public.admin_login_events from anon;
revoke all on public.admin_login_events from public;

grant select, insert, update, delete on public.admin_users to authenticated;
grant select, insert, delete on public.admin_login_events to authenticated;

do $$
begin
  if to_regclass('public.admin_login_events_id_seq') is not null then
    grant usage, select on sequence public.admin_login_events_id_seq to authenticated;
  end if;
end $$;

grant execute on function public.current_admin_email() to anon, authenticated;
grant execute on function public.current_user_has_panel_profile() to anon, authenticated;
grant execute on function public.admin_users_is_empty() to authenticated;
grant execute on function public.admin_users_has_owner() to authenticated;
grant execute on function public.is_admin_owner() to authenticated;
grant execute on function public.admin_permission_json_has(jsonb, text) to anon, authenticated;
grant execute on function public.current_admin_has_permission(text) to anon, authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to anon, authenticated;

drop policy if exists "admin_users bootstrap owner insert" on public.admin_users;
create policy "admin_users bootstrap owner insert"
on public.admin_users
for insert
to authenticated
with check (
  not public.current_user_has_panel_profile()
  and (public.admin_users_is_empty() or not public.admin_users_has_owner())
  and lower(email) = public.current_admin_email()
  and active = true
  and is_owner = true
);

drop policy if exists "admin_users bootstrap owner update" on public.admin_users;
create policy "admin_users bootstrap owner update"
on public.admin_users
for update
to authenticated
using (
  not public.current_user_has_panel_profile()
  and not public.admin_users_has_owner()
  and lower(email) = public.current_admin_email()
)
with check (
  not public.current_user_has_panel_profile()
  and not public.admin_users_has_owner()
  and lower(email) = public.current_admin_email()
  and active = true
  and is_owner = true
);

drop policy if exists "admin_users owner insert" on public.admin_users;
create policy "admin_users owner insert"
on public.admin_users
for insert
to authenticated
with check (public.is_admin_owner());

drop policy if exists "admin_users read own or owner" on public.admin_users;
create policy "admin_users read own or owner"
on public.admin_users
for select
to authenticated
using (
  public.is_admin_owner()
  or (
    not public.current_user_has_panel_profile()
    and lower(email) = public.current_admin_email()
  )
);

drop policy if exists "admin_users owner update" on public.admin_users;
create policy "admin_users owner update"
on public.admin_users
for update
to authenticated
using (public.is_admin_owner())
with check (public.is_admin_owner());

drop policy if exists "admin_users owner delete" on public.admin_users;
create policy "admin_users owner delete"
on public.admin_users
for delete
to authenticated
using (
  public.is_admin_owner()
  and lower(email) <> public.current_admin_email()
);

drop policy if exists "admin_login_events insert own" on public.admin_login_events;
create policy "admin_login_events insert own"
on public.admin_login_events
for insert
to authenticated
with check (
  not public.current_user_has_panel_profile()
  and lower(email) = public.current_admin_email()
);

drop policy if exists "admin_login_events read own or owner" on public.admin_login_events;
create policy "admin_login_events read own or owner"
on public.admin_login_events
for select
to authenticated
using (
  public.is_admin_owner()
  or (
    not public.current_user_has_panel_profile()
    and lower(email) = public.current_admin_email()
  )
);

drop policy if exists "admin_login_events owner delete" on public.admin_login_events;
create policy "admin_login_events owner delete"
on public.admin_login_events
for delete
to authenticated
using (public.is_admin_owner());

commit;
