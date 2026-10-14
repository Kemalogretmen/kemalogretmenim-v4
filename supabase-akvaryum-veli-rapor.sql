-- Approved batch release, installed in the production project on 2026-10-14.
-- Requires supabase-akvaryum-cloud.sql. Existing child codes remain child-only.
begin;
alter table public.aquarium_student_links
  add column if not exists view_scope text not null default 'child'
  check (view_scope in ('child','class'));

create or replace function public.view_aquarium_child(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare doc jsonb; child_id text; scope text; result jsonb;
begin
  select a.snapshot,l.student_id,l.view_scope into doc,child_id,scope
  from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
  join public.user_profiles p on p.id=a.owner_id
  where l.token=p_token and l.enabled and p.role='teacher' and p.approval_status='active' and p.active;
  if not found or not exists(select 1 from jsonb_array_elements(
    case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end
  ) s where s->>'id'=child_id) then return null; end if;
  if scope='child' then result:=public.aquarium_view_snapshot(doc,child_id);
  else
    result:=public.aquarium_view_snapshot(doc);
    result:=jsonb_set(result,'{students}',coalesce((select jsonb_agg(
      s || jsonb_build_object('id',case when s->>'id'=child_id then 'my-child' else 'peer-'||left(s->>'id',90) end,
        'points',case when s->>'id'=child_id then s->'points' else 'null'::jsonb end,
        'appearance',jsonb_set(s->'appearance','{trophy}',
          case when s->>'id'=child_id then coalesce(s#>'{appearance,trophy}','false'::jsonb) else 'false'::jsonb end))
      order by position
    ) from jsonb_array_elements(result->'students') with ordinality fish(s,position)),'[]'::jsonb));
  end if;
  result:=jsonb_set(jsonb_set(result,'{settings,classPoints}','false'::jsonb),'{classPoints}','null'::jsonb);
  return result||jsonb_build_object('viewScope',scope,'ownStudentId','my-child');
end;
$$;
revoke all on function public.view_aquarium_child(uuid) from public,anon,authenticated;
grant execute on function public.view_aquarium_child(uuid) to anon,authenticated;

-- The token determines the child on the server. There is deliberately no
-- student-id parameter, and public classroom tokens cannot use this function.
create or replace function public.view_aquarium_child_history(
  p_token uuid,p_period text default 'day',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cls jsonb; child jsonb; child_id text; lower_day text; report jsonb;
  today date:=(now() at time zone 'Europe/Istanbul')::date;
  page_offset integer:=greatest(0,least(coalesce(p_offset,0),1000000));
begin
  if p_period is null or p_period not in ('day','week','month','all') then
    raise exception 'Invalid report period' using errcode='22023';
  end if;
  select c.value,s.value,l.student_id into cls,child,child_id
  from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
  join public.user_profiles p on p.id=a.owner_id
  join public.aquarium_accounts account on account.owner_id=a.owner_id
  cross join lateral jsonb_array_elements(case when jsonb_typeof(account.document->'classes')='array'
    then account.document->'classes' else '[]'::jsonb end) c(value)
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value->'students')='array'
    then c.value->'students' else '[]'::jsonb end) s(value)
  where l.token=p_token and l.enabled and p.role='teacher' and p.approval_status='active' and p.active
    and c.value->>'id'=a.local_id and s.value->>'id'=l.student_id
    and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(a.snapshot->'students')='array'
      then a.snapshot->'students' else '[]'::jsonb end) visible where visible->>'id'=l.student_id)
  limit 1;
  if not found then return null; end if;
  lower_day:=case p_period when 'day' then today::text
    when 'week' then (today-(extract(isodow from today)::int-1))::text
    when 'month' then date_trunc('month',today)::date::text else '0000-01-01' end;
  with raw_events as (
    select day.key as event_day,task.value as task,'Bu sezon'::text as season,false as archived,'current'::text as season_key
    from jsonb_each(case when jsonb_typeof(child->'days')='object' then child->'days' else '{}'::jsonb end) day
    cross join lateral jsonb_array_elements(case when jsonb_typeof(day.value->'tasks')='array'
      then day.value->'tasks' else '[]'::jsonb end) task(value)
    union all
    select award.value->>'date',award.value,left(season.value->>'label',80),true,'archive-'||season.position
    from jsonb_array_elements(case when jsonb_typeof(cls->'seasons')='array'
      then cls->'seasons' else '[]'::jsonb end) with ordinality season(value,position)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(season.value->'awards')='array'
      then season.value->'awards' else '[]'::jsonb end) award(value)
    where award.value->>'studentId'=child_id
  ), events as (
    select event_day,left(task->>'title',120) as title,left(coalesce(task->>'icon',''),16) as icon,
      case when task->>'points' ~ '^-?[0-9]{1,4}$' then (task->>'points')::int
        when task->'points' is null then 1 else 0 end as points,
      case when task->>'awardedAt' ~ '^[0-9]{1,16}$' then least((task->>'awardedAt')::numeric,8640000000000000) else 0 end as awarded_at,
      season,archived,season_key
    from raw_events where task->>'status'='done'
      and event_day ~ '^[0-9]{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$'
  ), valid_events as (
    select * from events where abs(points) between 1 and 1000
  ), selected_events as (
    select * from valid_events where event_day between lower_day and today::text
  ), page as (
    select * from selected_events order by event_day desc,awarded_at desc,title,season
    limit 30 offset page_offset
  )
  select jsonb_build_object('period',p_period,'asOf',now(),'name',left(child->>'name',80),
    'currentTotal',greatest(0,coalesce((select sum(points) from valid_events where not archived),0)),
    'allTimeTotal',coalesce((select sum(total) from
      (select greatest(0,sum(points)) as total from valid_events group by season_key) season_totals),0),
    'periodTotal',coalesce((select sum(points) from selected_events),0),
    'earned',coalesce((select sum(points) from selected_events where points>0),0),
    'deducted',coalesce((select -sum(points) from selected_events where points<0),0),
    'count',(select count(*) from selected_events),'offset',page_offset,
    'hasMore',page_offset+30<(select count(*) from selected_events),
    'events',coalesce((select jsonb_agg(jsonb_build_object('date',event_day,'title',title,'icon',icon,
      'points',points,'awardedAt',awarded_at,'season',season)
      order by event_day desc,awarded_at desc,title,season) from page),'[]'::jsonb)) into report;
  return report;
end;
$$;
revoke all on function public.view_aquarium_child_history(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.view_aquarium_child_history(uuid,text,integer) to anon,authenticated;
commit;
