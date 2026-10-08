-- Run after supabase-ogretmen-paneli.sql. No public table access, only a sanitized read RPC.
begin;
create table if not exists public.aquarium_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null check (length(local_id) between 1 and 90),
  token uuid not null unique default gen_random_uuid(),
  enabled boolean not null default false,
  snapshot jsonb not null default '{}'::jsonb check (octet_length(snapshot::text) <= 65536),
  updated_at timestamptz not null default now(),
  unique(owner_id, local_id)
);
alter table public.aquarium_shares enable row level security;
revoke all on public.aquarium_shares from public, anon, authenticated;
grant select, insert, update, delete on public.aquarium_shares to authenticated;
drop policy if exists aquarium_owner on public.aquarium_shares;
create policy aquarium_owner on public.aquarium_shares for all to authenticated
using (owner_id = auth.uid() and public.current_user_is_teacher())
with check (owner_id = auth.uid() and public.current_user_is_teacher());

create or replace function public.view_aquarium(p_token uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'name', left(a.snapshot->>'name',80),
    'theme', a.snapshot->>'theme',
    'settings', jsonb_build_object('names', a.snapshot#>'{settings,names}' = 'true'::jsonb,
      'points', a.snapshot#>'{settings,points}' = 'true'::jsonb,
      'motion', a.snapshot#>'{settings,motion}' = 'true'::jsonb,
      'chat', a.snapshot#>'{settings,chat}' = 'true'::jsonb),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
      'id', left(s->>'id',90), 'species', left(s->>'species',30), 'mood', left(s->>'mood',20),
      'name', case when a.snapshot#>'{settings,names}' = 'true'::jsonb then left(s->>'name',80) else '' end,
      'points', case when a.snapshot#>'{settings,points}' = 'true'::jsonb and jsonb_typeof(s->'points') = 'number' then s->'points' else 'null'::jsonb end
    )) from (select value as s from jsonb_array_elements(case when jsonb_typeof(a.snapshot->'students') = 'array' then a.snapshot->'students' else '[]'::jsonb end) limit 60) students), '[]'::jsonb)
  ) from public.aquarium_shares a
  join public.user_profiles p on p.id = a.owner_id
  where a.token = p_token and a.enabled = true
    and p.role = 'teacher' and p.approval_status = 'active' and p.active = true;
$$;
revoke all on function public.view_aquarium(uuid) from public;
grant execute on function public.view_aquarium(uuid) to anon, authenticated;
commit;
