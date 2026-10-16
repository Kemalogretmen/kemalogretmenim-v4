-- Apply after supabase-akvaryum-veli-rapor.sql. No code rotation or pupil data edits.
begin;
alter table public.aquarium_shares add column if not exists show_points boolean;
-- NULL preserves existing visitor settings until the teacher explicitly chooses.
create or replace function public.aquarium_water_settings(doc jsonb)
returns jsonb language sql immutable set search_path=public as $$
  select jsonb_build_object(
    'lightMotion',coalesce(doc#>'{settings,lightMotion}'<>'false'::jsonb,true),
    'waterWaves',coalesce(doc#>'{settings,waterWaves}'='true'::jsonb,false),
    'bubbleAmount',case when jsonb_typeof(doc#>'{settings,bubbleAmount}')='number' then greatest(50,least(150,(doc#>>'{settings,bubbleAmount}')::numeric)) else 100 end,
    'lightStrength',case when jsonb_typeof(doc#>'{settings,lightStrength}')='number' then greatest(50,least(125,(doc#>>'{settings,lightStrength}')::numeric)) else 100 end,
    'waveStrength',case when jsonb_typeof(doc#>'{settings,waveStrength}')='number' then greatest(50,least(150,(doc#>>'{settings,waveStrength}')::numeric)) else 100 end);
$$;
revoke all on function public.aquarium_water_settings(jsonb) from public,anon,authenticated;
create or replace function public.aquarium_share_projection(doc jsonb,show_points boolean,own_id text,whole_class boolean)
returns jsonb language plpgsql immutable set search_path=public as $$
declare normalized jsonb; result jsonb;
begin
  normalized:=jsonb_set(doc,'{students}',coalesce((select jsonb_agg(s||jsonb_build_object(
    'name',coalesce(s->'shareName',case when doc#>'{settings,names}'='true'::jsonb then s->'name' else '""'::jsonb end),
    'points',coalesce(s->'sharePoints',case when doc#>'{settings,points}'='true'::jsonb then s->'points' else 'null'::jsonb end,'null'::jsonb)) order by n)
    from jsonb_array_elements(case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end) with ordinality fish(s,n)),'[]'::jsonb));
  normalized:=jsonb_set(normalized,'{settings}',coalesce(doc->'settings','{}'::jsonb)||jsonb_build_object(
    'names',true,'points',show_points,'classPoints',show_points and own_id is null));
  normalized:=jsonb_set(normalized,'{classPoints}',coalesce(doc->'shareClassPoints',doc->'classPoints','null'::jsonb));
  result:=public.aquarium_view_snapshot(normalized);
  result:=jsonb_set(result,'{settings}',(result->'settings')||public.aquarium_water_settings(doc));
  result:=jsonb_set(result,'{students}',coalesce((select jsonb_agg(s||jsonb_build_object(
    'id',case when own_id is null then s->>'id' when s->>'id'=own_id then 'my-child' else 'peer-'||left(s->>'id',90) end,
    'points',case when show_points and (own_id is null or s->>'id'=own_id) then s->'points' else 'null'::jsonb end,
    'appearance',jsonb_set(s->'appearance','{trophy}',case when show_points and (own_id is null or s->>'id'=own_id)
      then coalesce(s#>'{appearance,trophy}','false'::jsonb) else 'false'::jsonb end)) order by n)
    from jsonb_array_elements(result->'students') with ordinality fish(s,n)
    where whole_class or s->>'id'=own_id),'[]'::jsonb));
  if own_id is not null then
    result:=jsonb_set(jsonb_set(result,'{settings,classPoints}','false'::jsonb),'{classPoints}','null'::jsonb);
    result:=jsonb_set(result,'{settings,chat}','false'::jsonb);
    if not whole_class then result:=result||jsonb_build_object('teacher',null,'name','Deniz dostum'); end if;
  end if;
  return result;
end;
$$;
revoke all on function public.aquarium_share_projection(jsonb,boolean,text,boolean) from public,anon,authenticated;

create or replace function public.view_aquarium(p_token uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when a.show_points is null then jsonb_set(public.aquarium_view_snapshot(a.snapshot),'{settings}',
    (public.aquarium_view_snapshot(a.snapshot)->'settings')||public.aquarium_water_settings(a.snapshot))
    else public.aquarium_share_projection(a.snapshot,a.show_points,null,true) end
  from public.aquarium_shares a join public.user_profiles p on p.id=a.owner_id
  where a.token=p_token and a.enabled and p.role='teacher' and p.approval_status='active' and p.active;
$$;
create or replace function public.view_aquarium_child(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare doc jsonb; child_id text; scope text; result jsonb;
begin
  select a.snapshot,l.student_id,l.view_scope into doc,child_id,scope
  from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
  join public.user_profiles p on p.id=a.owner_id
  where l.token=p_token and l.enabled and p.role='teacher' and p.approval_status='active' and p.active;
  if not found or not exists(select 1 from jsonb_array_elements(
    case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end) s where s->>'id'=child_id) then return null; end if;
  result:=public.aquarium_share_projection(doc,true,child_id,scope='class');
  return result||jsonb_build_object('viewScope',scope,'ownStudentId','my-child');
end;
$$;
revoke all on function public.view_aquarium(uuid) from public,anon,authenticated;
revoke all on function public.view_aquarium_child(uuid) from public,anon,authenticated;
grant execute on function public.view_aquarium(uuid) to anon,authenticated;
grant execute on function public.view_aquarium_child(uuid) to anon,authenticated;
commit;
