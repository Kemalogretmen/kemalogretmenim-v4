-- Publish birthday greetings in the pupil's own authorized newspaper issue.
-- Apply after supabase-akvaryum-resif-insasi-20261118.sql.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';
create or replace function public.view_aquarium_child_newspaper(p_token uuid,p_week text default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; collection jsonb; stories jsonb:='[]'; part text; idx int:=0; event jsonb; birthday jsonb; birthday_on text;
 headlines text[]:=array['Gemimizin iskeletini birlikte kurduk!','Kayıp Gemi’nin güvertesi tamamlandı!','Gemimizin kaptan bölümü resifte yerini aldı!','Kayıp Gemi’yi birlikte tamamladık!'];
begin
 result:=public.view_aquarium_child_newspaper_before_reef(p_token,p_week);
 if result is null or result->'available' is distinct from 'true'::jsonb then return result;end if;
 select c.value->'reefCollection',pupil.value->'birthday' into collection,birthday
 from public.aquarium_student_links l join public.aquarium_shares a on a.id=l.share_id
 join public.aquarium_accounts account on account.owner_id=a.owner_id
 cross join lateral jsonb_array_elements(account.document->'classes') c(value)
 cross join lateral jsonb_array_elements(c.value->'students') pupil(value)
 where l.token=p_token and c.value->>'id'=a.local_id and pupil.value->>'id'=l.student_id limit 1;
 foreach part in array array['keel','hull','mast','reef'] loop
  idx:=idx+1;event:=collection#>array['earned',part];
  if event->>'on'>=result->>'weekStart' and event->>'on'<=least(result->>'weekEnd',result->>'asOf') then
   stories:=stories||jsonb_build_array(jsonb_build_object('stage',idx,'title',headlines[idx],'on',event->>'on'));
  end if;
 end loop;
 -- Only the authorized pupil's date in the selected published issue is returned.
 select to_char(candidates.day,'YYYY-MM-DD') into birthday_on
 from generate_series(0,6) as step(n)
 cross join lateral (select (result->>'weekStart')::date+step.n as day) candidates
 where candidates.day<=(result->>'asOf')::date
   and extract(month from candidates.day)::int::text=birthday->>'month'
   and extract(day from candidates.day)::int::text=birthday->>'day';
 return result||jsonb_build_object('reefNews',stories,'birthdayOn',birthday_on);
end;
$$;
notify pgrst, 'reload schema';
commit;
