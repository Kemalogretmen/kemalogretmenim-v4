-- Transactional integration test against a configured project. Creates only synthetic data; rolls back.
begin;
do $$
declare owner uuid;
begin
  select id into owner from public.user_profiles where role='teacher' and approval_status='active' and active=true limit 1;
  if owner is null then raise exception 'An approved teacher is required for the RLS test'; end if;
  perform set_config('aq.test.owner',owner::text,true);
  perform set_config('aq.test.token',gen_random_uuid()::text,true);
  perform set_config('aq.test.local',gen_random_uuid()::text,true);
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
end $$;
set local role authenticated;
insert into public.aquarium_shares(owner_id,local_id,token,snapshot)
values(auth.uid(),current_setting('aq.test.local'),current_setting('aq.test.token')::uuid,
'{"name":"Synthetic aquarium test","theme":"reef","settings":{"names":false,"points":false,"motion":true,"chat":true},"private":"must not leak","students":[{"id":"synthetic","name":"Hidden name","species":"tang","mood":"happy","points":987,"days":{"private":"history"},"feeds":["secret"]}]}');
do $$ begin
  if public.view_aquarium(current_setting('aq.test.token')::uuid) is not null then raise exception 'Default sharing must be closed'; end if;
end $$;
update public.aquarium_shares set enabled=true where local_id=current_setting('aq.test.local');
set local role anon;
do $$
declare result jsonb;
begin
  result := public.view_aquarium(current_setting('aq.test.token')::uuid);
  if result is null then raise exception 'Enabled link must be readable'; end if;
  if result#>>'{students,0,name}' <> '' or result#>'{students,0,points}' <> 'null'::jsonb then raise exception 'Hidden fields leaked'; end if;
  if result::text like '%secret%' or result::text like '%private%' or result::text like '%987%' then raise exception 'Private data leaked'; end if;
  begin perform count(*) from public.aquarium_shares; raise exception 'Anonymous table read allowed'; exception when insufficient_privilege then null; end;
  begin update public.aquarium_shares set enabled=false; raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.aquarium_shares(owner_id,local_id) values(current_setting('aq.test.owner')::uuid,'attack'); raise exception 'Anonymous insert allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare affected int;
begin
  if exists(select 1 from public.aquarium_shares) then raise exception 'Other user can list shares'; end if;
  update public.aquarium_shares set enabled=false where local_id=current_setting('aq.test.local');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other user can edit'; end if;
  begin insert into public.aquarium_shares(owner_id,local_id) values(current_setting('aq.test.owner')::uuid,'attack'); raise exception 'Owner spoof allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  perform set_config('request.jwt.claim.sub',current_setting('aq.test.owner'),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('aq.test.owner'),'role','authenticated')::text,true);
end $$;
set local role authenticated;
update public.aquarium_shares set enabled=false where local_id=current_setting('aq.test.local');
do $$ begin
  if public.view_aquarium(current_setting('aq.test.token')::uuid) is not null then raise exception 'Revoked link remains readable'; end if;
end $$;
update public.aquarium_shares set enabled=true,token=gen_random_uuid() where local_id=current_setting('aq.test.local');
do $$ begin
  if public.view_aquarium(current_setting('aq.test.token')::uuid) is not null then raise exception 'Old token revived'; end if;
end $$;
rollback;
select 'PASS: default-private, owner-only writes, anonymous read projection, hidden fields, revocation, token rotation' as aquarium_security_tests;
