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

update public.admin_users
set permissions = '{}'::jsonb
where permissions is null;

create index if not exists idx_admin_users_email on public.admin_users (lower(email));
create index if not exists idx_admin_users_active on public.admin_users (active);
create index if not exists idx_admin_login_events_created_at on public.admin_login_events (created_at desc);
create index if not exists idx_admin_login_events_email on public.admin_login_events (lower(email));
create index if not exists idx_admin_login_events_area on public.admin_login_events (area);

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''))
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
  select exists (
    select 1
    from public.admin_users
    where lower(email) = public.current_admin_email()
      and active = true
      and is_owner = true
  )
$$;

create or replace function public.touch_admin_users_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.touch_admin_users_updated_at();

create or replace function public.record_admin_login(
  login_area text default 'main',
  login_scope text default 'default',
  login_path text default '',
  login_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  admin_display_name text;
  admin_is_owner boolean;
  admin_active boolean;
begin
  if coalesce(current_email, '') = '' then
    return;
  end if;

  select display_name, is_owner, active
    into admin_display_name, admin_is_owner, admin_active
  from public.admin_users
  where lower(email) = current_email
  limit 1;

  if not found or admin_active is false then
    return;
  end if;

  insert into public.admin_login_events (
    email,
    display_name,
    is_owner,
    area,
    scope,
    path,
    user_agent
  )
  values (
    current_email,
    coalesce(admin_display_name, split_part(current_email, '@', 1)),
    coalesce(admin_is_owner, false),
    coalesce(nullif(login_area, ''), 'main'),
    coalesce(nullif(login_scope, ''), 'default'),
    left(coalesce(login_path, ''), 500),
    left(coalesce(login_user_agent, ''), 500)
  );
end;
$$;

alter table public.admin_users enable row level security;
alter table public.admin_login_events enable row level security;

revoke all on public.admin_users from anon;
revoke all on public.admin_users from public;
revoke all on public.admin_login_events from anon;
revoke all on public.admin_login_events from public;
grant select, insert, update, delete on public.admin_users to authenticated;
grant select, insert, delete on public.admin_login_events to authenticated;
grant usage, select on sequence public.admin_login_events_id_seq to authenticated;
grant execute on function public.current_admin_email() to authenticated;
grant execute on function public.admin_users_is_empty() to authenticated;
grant execute on function public.admin_users_has_owner() to authenticated;
grant execute on function public.is_admin_owner() to authenticated;
grant execute on function public.record_admin_login(text, text, text, text) to authenticated;

drop policy if exists "admin_users bootstrap owner insert" on public.admin_users;
create policy "admin_users bootstrap owner insert"
on public.admin_users
for insert
to authenticated
with check (
  (public.admin_users_is_empty() or not public.admin_users_has_owner())
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
  not public.admin_users_has_owner()
  and lower(email) = public.current_admin_email()
)
with check (
  not public.admin_users_has_owner()
  and lower(email) = public.current_admin_email()
  and active = true
  and is_owner = true
);

drop policy if exists "admin_users owner insert" on public.admin_users;
create policy "admin_users owner insert"
on public.admin_users
for insert
to authenticated
with check (
  public.is_admin_owner()
);

drop policy if exists "admin_users read own or owner" on public.admin_users;
create policy "admin_users read own or owner"
on public.admin_users
for select
to authenticated
using (
  public.is_admin_owner()
  or lower(email) = public.current_admin_email()
);

drop policy if exists "admin_users owner update" on public.admin_users;
create policy "admin_users owner update"
on public.admin_users
for update
to authenticated
using (
  public.is_admin_owner()
)
with check (
  public.is_admin_owner()
);

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
  lower(email) = public.current_admin_email()
);

drop policy if exists "admin_login_events read own or owner" on public.admin_login_events;
create policy "admin_login_events read own or owner"
on public.admin_login_events
for select
to authenticated
using (
  public.is_admin_owner()
  or lower(email) = public.current_admin_email()
);

drop policy if exists "admin_login_events owner delete" on public.admin_login_events;
create policy "admin_login_events owner delete"
on public.admin_login_events
for delete
to authenticated
using (
  public.is_admin_owner()
);

commit;
