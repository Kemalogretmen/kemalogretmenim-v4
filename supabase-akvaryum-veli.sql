-- Apply after supabase-akvaryum.sql. Public classroom permission and child codes are independent.
begin;
create table if not exists public.aquarium_student_links (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.aquarium_shares(id) on delete cascade,
  student_id text not null check(length(student_id) between 1 and 90),
  token uuid not null unique default gen_random_uuid(),
  enabled boolean not null default false,
  unique(share_id,student_id)
);
alter table public.aquarium_student_links enable row level security;
revoke all on public.aquarium_student_links from public,anon,authenticated;
grant select,insert,update,delete on public.aquarium_student_links to authenticated;
drop policy if exists aquarium_child_owner on public.aquarium_student_links;
create policy aquarium_child_owner on public.aquarium_student_links for all to authenticated
using (public.current_user_is_teacher() and exists(select 1 from public.aquarium_shares a where a.id=share_id and a.owner_id=auth.uid()))
with check (public.current_user_is_teacher() and exists(select 1 from public.aquarium_shares a where a.id=share_id and a.owner_id=auth.uid()));

-- No caller can invoke the sanitizer directly. Externally callable functions below authorize first.
create or replace function public.aquarium_view_snapshot(doc jsonb, child_id text default null)
returns jsonb language sql immutable set search_path=public as $$
select jsonb_build_object(
  'name',case when child_id is null then left(doc->>'name',80) else 'Deniz dostum' end,
  'theme',doc->>'theme',
  'settings',jsonb_build_object('names',coalesce(doc#>'{settings,names}'='true'::jsonb,false),
    'points',coalesce(doc#>'{settings,points}'='true'::jsonb,false),
    'classPoints',child_id is null and coalesce(doc#>'{settings,classPoints}'='true'::jsonb,false),
    'motion',coalesce(doc#>'{settings,motion}'='true'::jsonb,false),
    'chat',child_id is null and coalesce(doc#>'{settings,chat}'='true'::jsonb,false)),
  'classPoints',case when child_id is null and doc#>'{settings,classPoints}'='true'::jsonb and jsonb_typeof(doc->'classPoints')='number' then doc->'classPoints' else 'null'::jsonb end,
  'students',coalesce((select jsonb_agg(jsonb_build_object(
    'id',case when child_id is null then left(s->>'id',90) else 'my-child' end,
    'species',left(s->>'species',30),'mood',left(s->>'mood',20),
    'name',case when doc#>'{settings,names}'='true'::jsonb then left(s->>'name',80) else '' end,
    'points',case when doc#>'{settings,points}'='true'::jsonb and jsonb_typeof(s->'points')='number' then s->'points' else 'null'::jsonb end
  )) from (select value s from jsonb_array_elements(case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end)
     where child_id is null or value->>'id'=child_id limit (case when child_id is null then 60 else 1 end)) fish),'[]'::jsonb)
);
$$;
revoke all on function public.aquarium_view_snapshot(jsonb,text) from public,anon,authenticated;

create or replace function public.view_aquarium(p_token uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select public.aquarium_view_snapshot(a.snapshot)
  from public.aquarium_shares a join public.user_profiles p on p.id=a.owner_id
  where a.token=p_token and a.enabled and p.role='teacher' and p.approval_status='active' and p.active;
$$;
create or replace function public.view_aquarium_child(p_token uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select public.aquarium_view_snapshot(a.snapshot,l.student_id)
  from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
  join public.user_profiles p on p.id=a.owner_id
  where l.token=p_token and l.enabled and p.role='teacher' and p.approval_status='active' and p.active
    and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(a.snapshot->'students')='array' then a.snapshot->'students' else '[]'::jsonb end) s where s->>'id'=l.student_id);
$$;
revoke all on function public.view_aquarium(uuid) from public;
revoke all on function public.view_aquarium_child(uuid) from public;
grant execute on function public.view_aquarium(uuid) to anon,authenticated;
grant execute on function public.view_aquarium_child(uuid) to anon,authenticated;
commit;
