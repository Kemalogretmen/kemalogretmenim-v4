-- 2026-10-21: application version conflicts must not use serialization_failure.
-- PT409 returns HTTP 409 once, without the PostgREST 14 internal retry loop.
-- The owner check, advisory lock, revision guard and function ACL are preserved.
-- No account/score rows are modified by this installation.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
CREATE OR REPLACE FUNCTION public.save_aquarium_account(p_document jsonb, p_revision bigint, p_snapshots jsonb, p_owner uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid:=auth.uid(); actual bigint; next_revision bigint; item jsonb;
begin
 if uid is null or (p_owner is not null and p_owner<>uid) or not public.current_user_is_teacher() then raise exception 'Teacher required' using errcode='42501'; end if;
 if jsonb_typeof(p_document) is distinct from 'object' or p_document->>'version' is distinct from '1'
 or jsonb_typeof(p_document->'classes') is distinct from 'array' or jsonb_typeof(p_snapshots) is distinct from 'array'
 or octet_length(p_document::text)>16777216 then raise exception 'Invalid aquarium document'; end if;
 if jsonb_array_length(p_document->'classes') not between 1 and 30 or jsonb_array_length(p_snapshots)>30 then raise exception 'Invalid class count'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into actual from public.aquarium_accounts where owner_id=uid;
 if coalesce(actual,0) is distinct from p_revision then raise exception 'Aquarium revision conflict' using errcode='PT409'; end if;
 next_revision:=coalesce(actual,0)+1;
 insert into public.aquarium_accounts(owner_id,document,revision) values(uid,p_document,next_revision)
 on conflict(owner_id) do update set document=excluded.document,revision=excluded.revision,updated_at=now();
 for item in select value from jsonb_array_elements(p_snapshots) loop
 update public.aquarium_shares set snapshot=item->'snapshot',updated_at=now()
 where owner_id=uid and local_id=item->>'local_id';
 end loop;
 update public.aquarium_shares set enabled=false,snapshot='{}',updated_at=now()
 where owner_id=uid and not exists(select 1 from jsonb_array_elements(p_document->'classes') c where c->>'id'=local_id);
 return next_revision;
end;
$function$
;
commit;
