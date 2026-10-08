-- All fixtures and account modifications roll back. Run after the cloud migration.
begin;
do $$ declare owner uuid; begin
 select id into owner from public.user_profiles where role='teacher' and approval_status='active' and active limit 1;
 if owner is null then raise exception 'Approved teacher required'; end if;
 perform set_config('aq.owner',owner::text,true);
 perform set_config('request.jwt.claim.sub',owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$ declare rev bigint; doc jsonb; next_rev bigint; begin
 select revision into rev from public.aquarium_accounts where owner_id=auth.uid();
 doc:='{"version":1,"activeClassId":"cloud-test","classes":[{"id":"cloud-test","name":"Test","students":[],"tasks":[{"title":"Private task"}]}],"settings":{}}';
 next_rev:=public.save_aquarium_account(doc,coalesce(rev,0),'[]');
 if next_rev<>coalesce(rev,0)+1 then raise exception 'Revision not advanced'; end if;
 if not exists(select 1 from public.aquarium_accounts where document=doc) then raise exception 'Owner cannot read saved document'; end if;
 begin perform public.save_aquarium_account(doc,coalesce(rev,0),'[]');raise exception 'Stale write succeeded';exception when serialization_failure then null;end;
 begin perform public.save_aquarium_account(doc,next_rev,'[]',gen_random_uuid());raise exception 'Cross-account write succeeded';exception when insufficient_privilege then null;end;
 begin update public.aquarium_accounts set document='{}';raise exception 'Direct write succeeded';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.aquarium_accounts;raise exception 'Anon can read account';exception when insufficient_privilege then null;end;
 begin perform public.save_aquarium_account('{}',0,'[]');raise exception 'Anon can save account';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.aquarium_accounts) then raise exception 'Other account sees private document'; end if;
 begin perform public.save_aquarium_account('{}',0,'[]');raise exception 'Visitor can save';exception when insufficient_privilege then null;end;
end $$;
rollback;
