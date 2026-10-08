-- Synthetic fixtures only. Every mutation rolls back.
begin;
do $$ declare owner uuid; begin
 select id into owner from public.user_profiles where role='teacher' and approval_status='active' and active limit 1;
 if owner is null then raise exception 'Approved teacher required'; end if;
 perform set_config('aq.owner',owner::text,true);
 perform set_config('aq.share',gen_random_uuid()::text,true);
 perform set_config('aq.token',gen_random_uuid()::text,true);
 perform set_config('aq.childtoken',gen_random_uuid()::text,true);
 perform set_config('aq.link',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
end $$;
set local role authenticated;
insert into public.aquarium_shares(id,owner_id,local_id,token,snapshot) values(current_setting('aq.share')::uuid,auth.uid(),'child-test-'||current_setting('aq.share'),current_setting('aq.token')::uuid,
'{"name":"Private class","theme":"reef","classPoints":123456,"settings":{"names":true,"points":true,"classPoints":true,"motion":true,"chat":true},"students":[{"id":"child-a","name":"Own Child","species":"clown","points":7,"mood":"happy","days":{"secret":true}},{"id":"child-b","name":"Other Child","species":"tang","points":444,"mood":"calm"}]}');
insert into public.aquarium_student_links(id,share_id,student_id,token) values(current_setting('aq.link')::uuid,current_setting('aq.share')::uuid,'child-a',current_setting('aq.childtoken')::uuid);
do $$ begin
 if public.view_aquarium_child(current_setting('aq.childtoken')::uuid) is not null then raise exception 'Child sharing must be closed by default'; end if;
end $$;
update public.aquarium_student_links set enabled=true where id=current_setting('aq.link')::uuid;
set local role anon;
do $$ declare data jsonb; begin
 data:=public.view_aquarium_child(current_setting('aq.childtoken')::uuid);
 if jsonb_array_length(data->'students')<>1 or data#>>'{students,0,name}'<>'Own Child' or data#>>'{students,0,points}'<>'7' then raise exception 'Child projection incorrect'; end if;
 if data::text like '%Other Child%' or data::text like '%444%' or data::text like '%123456%' or data::text like '%Private class%' or data::text like '%secret%' then raise exception 'Child privacy leak'; end if;
 if data#>'{settings,classPoints}'<>'false'::jsonb or data->'classPoints'<>'null'::jsonb then raise exception 'Class score leaked'; end if;
 if public.view_aquarium(current_setting('aq.token')::uuid) is not null then raise exception 'Child permission opened the class'; end if;
 if public.view_aquarium(current_setting('aq.childtoken')::uuid) is not null then raise exception 'Child token can read classroom'; end if;
 if public.view_aquarium_child(current_setting('aq.token')::uuid) is not null then raise exception 'Class token accepted as child token'; end if;
 begin perform * from public.aquarium_student_links; raise exception 'Anon can list child codes'; exception when insufficient_privilege then null; end;
 begin update public.aquarium_student_links set enabled=true; raise exception 'Anon can write child codes'; exception when insufficient_privilege then null; end;
 begin perform public.aquarium_view_snapshot('{}'::jsonb,null); raise exception 'Anon can call internal helper'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
update public.aquarium_shares set enabled=true where id=current_setting('aq.share')::uuid;
set local role anon;
do $$ declare data jsonb; begin
 data:=public.view_aquarium(current_setting('aq.token')::uuid);
 if jsonb_array_length(data->'students')<>2 or data->>'classPoints'<>'123456' then raise exception 'Explicit public permission not applied'; end if;
 if jsonb_array_length(public.view_aquarium_child(current_setting('aq.childtoken')::uuid)->'students')<>1 then raise exception 'Public class expands child permission'; end if;
end $$;
set local role authenticated;
update public.aquarium_shares set enabled=false,snapshot=jsonb_set(jsonb_set(snapshot,'{settings,names}','false'),'{settings,points}','false') where id=current_setting('aq.share')::uuid;
set local role anon;
do $$ declare data jsonb; begin
 data:=public.view_aquarium_child(current_setting('aq.childtoken')::uuid);
 if data#>>'{students,0,name}'<>'' or data#>'{students,0,points}'<>'null'::jsonb then raise exception 'Teacher visibility not enforced for child'; end if;
 if data is null then raise exception 'Closing class must not close child permission'; end if;
end $$;
reset role;
do $$ begin
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare n int; begin
 if exists(select 1 from public.aquarium_student_links where id=current_setting('aq.link')::uuid) then raise exception 'Other account can list codes'; end if;
 update public.aquarium_student_links set student_id='child-b' where id=current_setting('aq.link')::uuid;
 get diagnostics n=row_count; if n<>0 then raise exception 'Other account can reassign child'; end if;
 begin insert into public.aquarium_student_links(share_id,student_id) values(current_setting('aq.share')::uuid,'child-b'); raise exception 'Other account can issue child token'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 perform set_config('request.jwt.claim.sub',current_setting('aq.owner'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('aq.owner'),'role','authenticated')::text,true);
end $$;
set local role authenticated;
update public.aquarium_student_links set enabled=false where id=current_setting('aq.link')::uuid;
do $$ begin
 if public.view_aquarium_child(current_setting('aq.childtoken')::uuid) is not null then raise exception 'Revoked code still works'; end if;
end $$;
update public.aquarium_student_links set enabled=true,token=gen_random_uuid() where id=current_setting('aq.link')::uuid;
do $$ begin
 if public.view_aquarium_child(current_setting('aq.childtoken')::uuid) is not null then raise exception 'Old code reactivated'; end if;
 perform set_config('aq.childtoken',(select token::text from public.aquarium_student_links where id=current_setting('aq.link')::uuid),true);
end $$;
update public.aquarium_shares set snapshot=jsonb_set(snapshot,'{students}','[]') where id=current_setting('aq.share')::uuid;
do $$ begin
 if public.view_aquarium_child(current_setting('aq.childtoken')::uuid) is not null then raise exception 'Removed child still visible'; end if;
end $$;
rollback;
select 'Child privacy, owner permissions, hidden fields, public separation, revocation and deletion passed' as result;
