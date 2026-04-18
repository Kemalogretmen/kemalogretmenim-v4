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

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
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

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon;
revoke all on public.admin_users from public;
grant select, insert, update, delete on public.admin_users to authenticated;
grant execute on function public.current_admin_email() to authenticated;
grant execute on function public.admin_users_is_empty() to authenticated;
grant execute on function public.is_admin_owner() to authenticated;

drop policy if exists "admin_users bootstrap owner insert" on public.admin_users;
create policy "admin_users bootstrap owner insert"
on public.admin_users
for insert
to authenticated
with check (
  public.admin_users_is_empty()
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

commit;
