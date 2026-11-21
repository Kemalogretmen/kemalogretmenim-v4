-- Permanent class construction rewards. Apply after gazete-yayin-20261118.
-- No pupil records, score balances, links or access policies are changed.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';

create or replace function public.aquarium_reef_public(raw jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare n int:=0; part text;
begin
 if raw is null or raw->>'version' is distinct from '1' then return null;end if;
 if jsonb_typeof(raw->'earned')='object' then
  foreach part in array array['keel','hull','mast','reef'] loop
   exit when jsonb_typeof(raw#>array['earned',part]) is distinct from 'object';n:=n+1;
  end loop;
 elsif raw->>'stage' ~ '^[0-4]$' then n:=(raw->>'stage')::int;
 else return null;end if;
 return jsonb_build_object('version',1,'stage',n,'visible',raw->'visible'='true'::jsonb,
  'side',case when raw->>'side'='right' then 'right' else 'left' end,
  'size',case when raw->>'size'='small' then 'small' else 'medium' end);
end;
$$;
revoke all on function public.aquarium_reef_public(jsonb) from public,anon,authenticated;

create or replace function public.aquarium_account_keep_reef()
returns trigger language plpgsql security definer set search_path=public as $$
declare cls jsonb; prior jsonb; reward jsonb; old_reward jsonb; classes jsonb:='[]'; part text; old_client boolean;
begin
 for cls in select value from jsonb_array_elements(new.document->'classes') loop
  prior:=null;
  if tg_op='UPDATE' then select c into prior from jsonb_array_elements(old.document->'classes') c where c->>'id'=cls->>'id' limit 1;end if;
  old_reward:=prior->'reefCollection';old_client:=not(cls ? 'reefCollection');
  reward:=cls->'reefCollection';
  if old_reward->>'version'='1' then
   if reward->>'version' is distinct from '1' then reward:=old_reward;
   else
    -- Awards only accumulate; a stale client or correction cannot remove them.
    reward:=reward||jsonb_build_object('id',old_reward->'id','earned',coalesce(reward->'earned','{}')||coalesce(old_reward->'earned','{}'));
    foreach part in array array['keel','hull','mast','reef'] loop
     if old_reward#>array['earned',part] is not null then
      reward:=jsonb_set(reward,array['thresholds',(array_position(array['keel','hull','mast','reef'],part)-1)::text],old_reward#>array['thresholds',(array_position(array['keel','hull','mast','reef'],part)-1)::text]);
     end if;
    end loop;
   end if;
   cls:=cls||jsonb_build_object('reefCollection',reward);
   -- Preserve the active goal link only for an unaware old client editing the same goal.
   if old_client and prior#>>'{goal,reefId}'=old_reward->>'id'
    and (cls->'goal')-array['reefId','reefOffset']=(prior->'goal')-array['reefId','reefOffset'] then
    cls:=jsonb_set(cls,'{goal}',(cls->'goal')||jsonb_build_object('reefId',prior#>'{goal,reefId}','reefOffset',prior#>'{goal,reefOffset}'));
   end if;
  end if;
  classes:=classes||jsonb_build_array(cls);
 end loop;
 new.document:=jsonb_set(new.document,'{classes}',classes);return new;
end;
$$;
revoke all on function public.aquarium_account_keep_reef() from public,anon,authenticated;
create or replace trigger aquarium_account_keep_reef before insert or update on public.aquarium_accounts for each row execute function public.aquarium_account_keep_reef();

-- Preserve the established token authorization and pupil privacy projections.
do $$begin
 if to_regprocedure('public.view_aquarium_before_reef(uuid)') is null then alter function public.view_aquarium(uuid) rename to view_aquarium_before_reef;end if;
 if to_regprocedure('public.view_aquarium_child_before_reef(uuid)') is null then alter function public.view_aquarium_child(uuid) rename to view_aquarium_child_before_reef;end if;
 if to_regprocedure('public.view_aquarium_child_newspaper_before_reef(uuid,text)') is null then alter function public.view_aquarium_child_newspaper(uuid,text) rename to view_aquarium_child_newspaper_before_reef;end if;
end$$;
revoke all on function public.view_aquarium_before_reef(uuid) from public,anon,authenticated;
revoke all on function public.view_aquarium_child_before_reef(uuid) from public,anon,authenticated;
revoke all on function public.view_aquarium_child_newspaper_before_reef(uuid,text) from public,anon,authenticated;

create or replace function public.view_aquarium(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; reef jsonb;
begin
 result:=public.view_aquarium_before_reef(p_token);if result is null then return null;end if;
 select coalesce(public.aquarium_reef_public(c.value->'reefCollection'),public.aquarium_reef_public(a.snapshot->'reef')) into reef
 from public.aquarium_shares a left join public.aquarium_accounts account on account.owner_id=a.owner_id
 left join lateral jsonb_array_elements(coalesce(account.document->'classes','[]')) c(value) on c.value->>'id'=a.local_id where a.token=p_token limit 1;
 return result||jsonb_build_object('reef',reef);
end;
$$;
create or replace function public.view_aquarium_child(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; reef jsonb;
begin
 result:=public.view_aquarium_child_before_reef(p_token);if result is null then return null;end if;
 select coalesce(public.aquarium_reef_public(c.value->'reefCollection'),public.aquarium_reef_public(a.snapshot->'reef')) into reef
 from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
 left join public.aquarium_accounts account on account.owner_id=a.owner_id
 left join lateral jsonb_array_elements(coalesce(account.document->'classes','[]')) c(value) on c.value->>'id'=a.local_id where l.token=p_token limit 1;
 return result||jsonb_build_object('reef',reef);
end;
$$;
create or replace function public.view_aquarium_child_newspaper(p_token uuid,p_week text default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; collection jsonb; stories jsonb:='[]'; part text; idx int:=0; event jsonb;
 headlines text[]:=array['Gemimizin iskeletini birlikte kurduk!','Kayıp Gemi’nin güvertesi tamamlandı!','Gemimizin kaptan bölümü resifte yerini aldı!','Kayıp Gemi’yi birlikte tamamladık!'];
begin
 result:=public.view_aquarium_child_newspaper_before_reef(p_token,p_week);
 if result is null or result->'available' is distinct from 'true'::jsonb then return result;end if;
 select c.value->'reefCollection' into collection
 from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
 join public.aquarium_accounts account on account.owner_id=a.owner_id
 cross join lateral jsonb_array_elements(account.document->'classes') c(value)
 where l.token=p_token and c.value->>'id'=a.local_id limit 1;
 foreach part in array array['keel','hull','mast','reef'] loop
  idx:=idx+1;event:=collection#>array['earned',part];
  if event->>'on'>=result->>'weekStart' and event->>'on'<=least(result->>'weekEnd',result->>'asOf') then
   stories:=stories||jsonb_build_array(jsonb_build_object('stage',idx,'title',headlines[idx],'on',event->>'on'));
  end if;
 end loop;
 return result||jsonb_build_object('reefNews',stories);
end;
$$;
revoke all on function public.view_aquarium(uuid) from public,anon,authenticated;
revoke all on function public.view_aquarium_child(uuid) from public,anon,authenticated;
revoke all on function public.view_aquarium_child_newspaper(uuid,text) from public,anon,authenticated;
grant execute on function public.view_aquarium(uuid) to anon,authenticated;
grant execute on function public.view_aquarium_child(uuid) to anon,authenticated;
grant execute on function public.view_aquarium_child_newspaper(uuid,text) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
