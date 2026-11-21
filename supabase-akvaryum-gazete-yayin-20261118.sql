-- Resif Postası v2: explicit activation, send and withdraw.
-- Apply after supabase-akvaryum-gazete-20261118.sql. No pupil rows are edited.
-- Requires supabase-akvaryum-veli-rapor.sql. No score or access-policy changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';

-- Old open clients must not erase an announcement they cannot display yet.
create or replace function public.aquarium_account_keep_newspaper()
returns trigger language plpgsql security definer set search_path=public as $$
declare cls jsonb; prior jsonb; classes jsonb:='[]';
begin
 for cls in select value from jsonb_array_elements(new.document->'classes') loop
  prior:=null;
  if tg_op='UPDATE' then
   select c into prior from jsonb_array_elements(old.document->'classes') c where c->>'id'=cls->>'id' limit 1;
   if not (cls ? 'newspaper') or (prior#>>'{newspaper,version}'='2' and cls#>>'{newspaper,version}' is distinct from '2') then
    if prior ? 'newspaper' then cls:=cls||jsonb_build_object('newspaper',prior->'newspaper');end if;
   end if;
  end if;
  classes:=classes||jsonb_build_array(cls);
 end loop;
 new.document:=jsonb_set(new.document,'{classes}',classes);return new;
end;
$$;
revoke all on function public.aquarium_account_keep_newspaper() from public,anon,authenticated;

create or replace function public.view_aquarium_child_newspaper(p_token uuid,p_week text default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cls jsonb; child jsonb; child_id text; issue jsonb; report jsonb; publication jsonb; published_weeks jsonb;
 today date:=(now() at time zone 'Europe/Istanbul')::date;
 start_day date; end_day date; total bigint; unlocked boolean;
begin
 if p_week is null then start_day:=today-(extract(isodow from today)::int-1);
 else
  if p_week !~ '^[0-9]{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$' then raise exception 'Invalid week' using errcode='22023';end if;
  begin start_day:=p_week::date;exception when others then raise exception 'Invalid week' using errcode='22023';end;
 end if;
 if extract(isodow from start_day)<>1 or start_day>today or start_day<today-84 then raise exception 'Invalid week' using errcode='22023';end if;
 end_day:=start_day+6;
 -- The token selects the pupil on the server, regardless of classroom view scope.
 select c.value,s.value,l.student_id into cls,child,child_id
 from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
 join public.user_profiles p on p.id=a.owner_id
 join public.aquarium_accounts account on account.owner_id=a.owner_id
 cross join lateral jsonb_array_elements(case when jsonb_typeof(account.document->'classes')='array' then account.document->'classes' else '[]'::jsonb end) c(value)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value->'students')='array' then c.value->'students' else '[]'::jsonb end) s(value)
 where l.token=p_token and l.enabled and p.role='teacher' and p.approval_status='active' and p.active
  and c.value->>'id'=a.local_id and s.value->>'id'=l.student_id
  and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(a.snapshot->'students')='array' then a.snapshot->'students' else '[]'::jsonb end) visible where visible->>'id'=l.student_id)
 limit 1;
 if not found then return null;end if;
 if cls#>'{newspaper,enabled}' is distinct from 'true'::jsonb then
  return jsonb_build_object('available',false,'weekStart',start_day::text,'publishedWeeks','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(key order by key desc),'[]'::jsonb) into published_weeks
 from jsonb_each(case when jsonb_typeof(cls#>'{newspaper,weeks}')='object' then cls#>'{newspaper,weeks}' else '{}'::jsonb end)
 where key between (today-(extract(isodow from today)::int-1)-77)::text and today::text
  and key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and value->'published'='true'::jsonb
  and jsonb_typeof(value->'publication')='object';
 issue:=cls#>array['newspaper','weeks',start_day::text];
 publication:=issue->'publication';
 if issue->'published' is distinct from 'true'::jsonb or jsonb_typeof(publication) is distinct from 'object' then
  return jsonb_build_object('available',false,'weekStart',start_day::text,'publishedWeeks',published_weeks);
 end if;
 with raw_events as (
  select day.key as event_day,task.value as task,false as archived
  from jsonb_each(case when jsonb_typeof(child->'days')='object' then child->'days' else '{}'::jsonb end) day
  cross join lateral jsonb_array_elements(case when jsonb_typeof(day.value->'tasks')='array' then day.value->'tasks' else '[]'::jsonb end) task(value)
  union all
  select award.value->>'date',award.value,true
  from jsonb_array_elements(case when jsonb_typeof(cls->'seasons')='array' then cls->'seasons' else '[]'::jsonb end) season(value)
  cross join lateral jsonb_array_elements(case when jsonb_typeof(season.value->'awards')='array' then season.value->'awards' else '[]'::jsonb end) award(value)
  where award.value->>'studentId'=child_id
 ), events as (
  select event_day,left(task->>'title',120) as title,
   case when task->>'points' ~ '^-?[0-9]{1,4}$' then (task->>'points')::int when task->'points' is null then 1 else 0 end as points,archived
  from raw_events where task->>'status'='done' and event_day ~ '^[0-9]{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$'
 ), valid_events as (select * from events where abs(points) between 1 and 1000),
 selected as (select * from valid_events where points>0 and event_day between start_day::text and least(end_day,today)::text),
 headlines as (select title,count(*) as count,sum(points) as points from selected group by title order by count(*) desc,title limit 5)
 select jsonb_build_object('positiveCount',(select count(*) from selected),'activeDays',(select count(distinct event_day) from selected),
  'earned',coalesce((select sum(points) from selected),0),
  'highlights',coalesce((select jsonb_agg(jsonb_build_object('title',title,'count',count,'points',points) order by count desc,title) from headlines),'[]'::jsonb),
  'currentTotal',greatest(0,coalesce((select sum(points) from valid_events where not archived),0))) into report;
 total:=(report->>'currentTotal')::bigint;
 unlocked:=coalesce(child->'characterUnlocked'='true'::jsonb,false) or total>=100 or exists(
  select 1 from jsonb_array_elements(case when jsonb_typeof(cls->'seasons')='array' then cls->'seasons' else '[]'::jsonb end) season(value)
  cross join lateral jsonb_array_elements(case when jsonb_typeof(season.value->'students')='array' then season.value->'students' else '[]'::jsonb end) pupil(value)
  where pupil.value->>'id'=child_id and case when pupil.value->>'points' ~ '^[0-9]{1,9}$' then (pupil.value->>'points')::bigint>=100 else false end);
 -- Only the own-child target and published class announcement cross this boundary.
 return report||jsonb_build_object('available',true,'publicationId',left(publication->>'id',90),'publishedWeeks',published_weeks,'weekStart',start_day::text,'weekEnd',end_day::text,'asOf',today::text,
  'name',left(child->>'name',80),'species',left(child->>'species',30),'characterUnlocked',unlocked,
  'growth',case when jsonb_typeof(cls->'growth')='object' then jsonb_build_object('enabled',cls#>'{growth,enabled}','thresholds',cls#>'{growth,thresholds}') else null end,
  'announcement',case when length(trim(publication->>'body'))>0 then jsonb_build_object('title',left(publication->>'title',100),'body',left(publication->>'body',1800)) else null end,
  'target',left(coalesce(publication#>>array['targets',child_id],''),300));
end;
$$;
revoke all on function public.view_aquarium_child_newspaper(uuid,text) from public,anon,authenticated;
grant execute on function public.view_aquarium_child_newspaper(uuid,text) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
