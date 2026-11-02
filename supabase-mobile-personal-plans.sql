-- Mobile 0.6.0: private registered-user plans. Additive, no existing records removed.
-- Apply in Supabase SQL Editor. Requires public.user_profiles(id, active).
begin;

create table if not exists public.mobile_personal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  event_date date not null,
  event_time time without time zone,
  done boolean not null default false,
  reminder_minutes integer check (reminder_minutes between 0 and 10080),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint personal_plan_reminder_requires_time check (reminder_minutes is null or event_time is not null)
);
create index if not exists mobile_personal_plans_owner_date_idx on public.mobile_personal_plans (user_id, event_date);
create index if not exists mobile_personal_plans_owner_updated_idx on public.mobile_personal_plans (user_id, updated_at);

create or replace function public.mobile_personal_plan_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
      raise exception 'A personal plan cannot change owner or identity' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    -- A delayed offline update cannot clear a deletion tombstone.
    if old.deleted_at is not null then new.deleted_at := old.deleted_at; end if;
  else
    new.created_at := clock_timestamp();
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists mobile_personal_plan_timestamp on public.mobile_personal_plans;
create trigger mobile_personal_plan_timestamp before insert or update on public.mobile_personal_plans
for each row execute function public.mobile_personal_plan_timestamp();

alter table public.mobile_personal_plans enable row level security;
revoke all on public.mobile_personal_plans from anon, authenticated;
grant select, insert, update on public.mobile_personal_plans to authenticated;

-- Policies deliberately include tombstones in owner SELECT so other devices can
-- observe deletion. There is no authenticated DELETE permission or policy.
drop policy if exists mobile_personal_plans_select_own on public.mobile_personal_plans;
create policy mobile_personal_plans_select_own on public.mobile_personal_plans for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and coalesce(p.active, true)));
drop policy if exists mobile_personal_plans_insert_own on public.mobile_personal_plans;
create policy mobile_personal_plans_insert_own on public.mobile_personal_plans for insert to authenticated
with check (user_id = (select auth.uid()) and deleted_at is null and exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and coalesce(p.active, true)));
drop policy if exists mobile_personal_plans_update_own on public.mobile_personal_plans;
create policy mobile_personal_plans_update_own on public.mobile_personal_plans for update to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and coalesce(p.active, true)))
with check (user_id = (select auth.uid()) and exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and coalesce(p.active, true)));

-- Realtime is an optimization; the app also polls/focus-refreshes if unavailable.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mobile_personal_plans') then
    alter publication supabase_realtime add table public.mobile_personal_plans;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and to_regclass('public.teacher_agenda_states') is not null
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teacher_agenda_states') then
    alter publication supabase_realtime add table public.teacher_agenda_states;
  end if;
end $$;

comment on table public.mobile_personal_plans is 'Private mobile plans; owner-only RLS, CAS via updated_at, deletions retained as tombstones for sync.';
commit;
