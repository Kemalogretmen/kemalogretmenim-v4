-- Apply after supabase-akvaryum-cloud.sql. Only small owner-only signals are
-- replicated; private account documents and parent reports are not published.
begin;
create table if not exists public.aquarium_live_state (
 owner_id uuid not null references auth.users(id) on delete cascade,
 class_id text not null default '' check(length(class_id)<=90),
 account_revision bigint not null default 0,
 sequence bigint not null default 0,
 pick_id uuid,
 student_id text,
 picked_at timestamptz,
 pick_date date,
 round_ids jsonb not null default '[]' check(jsonb_typeof(round_ids)='array' and jsonb_array_length(round_ids)<=60),
 primary key(owner_id,class_id)
);
alter table public.aquarium_live_state enable row level security;
revoke all on public.aquarium_live_state from public,anon,authenticated;
grant select on public.aquarium_live_state to authenticated;
drop policy if exists aquarium_live_owner on public.aquarium_live_state;
create policy aquarium_live_owner on public.aquarium_live_state for select to authenticated
 using(owner_id=auth.uid() and public.current_user_is_teacher());
create table if not exists public.aquarium_pick_requests (
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(owner_id,request_id)
);
alter table public.aquarium_pick_requests enable row level security;
create index if not exists aquarium_pick_requests_cleanup on public.aquarium_pick_requests(owner_id,created_at);
revoke all on public.aquarium_pick_requests from public,anon,authenticated;
create or replace function public.aquarium_live_snapshot()
returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('server_now',clock_timestamp(),'rows',coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb))
 from public.aquarium_live_state s where owner_id=auth.uid() and public.current_user_is_teacher();
$$;
revoke all on function public.aquarium_live_snapshot() from public,anon;
grant execute on function public.aquarium_live_snapshot() to authenticated;
create or replace function public.aquarium_account_signal()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.aquarium_live_state(owner_id,class_id,account_revision)
 values(new.owner_id,'',new.revision)
 on conflict(owner_id,class_id) do update set account_revision=excluded.account_revision;
 return new;
end;$$;
revoke all on function public.aquarium_account_signal() from public,anon,authenticated;
drop trigger if exists aquarium_account_signal on public.aquarium_accounts;
create trigger aquarium_account_signal after insert or update of revision on public.aquarium_accounts
 for each row execute function public.aquarium_account_signal();
insert into public.aquarium_live_state(owner_id,class_id,account_revision)
select owner_id,'',revision from public.aquarium_accounts
on conflict(owner_id,class_id) do update set account_revision=excluded.account_revision;

create or replace function public.aquarium_pick_student(p_class_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); doc jsonb; cls jsonb; rev bigint; prior public.aquarium_live_state;
 eligible text[]; remaining text[]; used text[]; chosen text; saved_result jsonb; today date:=(now() at time zone 'Europe/Istanbul')::date;
begin
 if uid is null or not public.current_user_is_teacher() then raise exception 'Teacher required' using errcode='42501';end if;
 if p_request_id is null or p_class_id is null or length(p_class_id) not between 1 and 90 then raise exception 'Invalid draw' using errcode='22023';end if;
 -- Same lock as account writes: selection uses one committed class snapshot.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select result into saved_result from public.aquarium_pick_requests where owner_id=uid and request_id=p_request_id;
 if saved_result is not null then return saved_result||jsonb_build_object('server_now',clock_timestamp());end if;
 select document,revision into doc,rev from public.aquarium_accounts where owner_id=uid;
 select c into cls from jsonb_array_elements(coalesce(doc->'classes','[]')) c where c->>'id'=p_class_id;
 if cls is null then raise exception 'Class unavailable' using errcode='22023';end if;
 select * into prior from public.aquarium_live_state where owner_id=uid and class_id=p_class_id;
 if prior.pick_id=p_request_id then return to_jsonb(prior)||jsonb_build_object('server_now',clock_timestamp());end if;
 select array_agg(s->>'id') into eligible from jsonb_array_elements(cls->'students') s
 where coalesce(s#>>array['days',today::text,'absent'],'false')<>'true';
 if coalesce(cardinality(eligible),0) not between 1 and 60 then raise exception 'No eligible student' using errcode='22023';end if;
 -- Two near-simultaneous devices share the ongoing draw instead of drawing twice.
 if prior.picked_at>clock_timestamp()-interval '2.4 seconds' and prior.pick_date=today and prior.student_id=any(eligible) then
  insert into public.aquarium_pick_requests(owner_id,request_id,result) values(uid,p_request_id,to_jsonb(prior));
  return to_jsonb(prior)||jsonb_build_object('server_now',clock_timestamp());
 end if;
 if prior.pick_date=today then select array_agg(v) into used from jsonb_array_elements_text(prior.round_ids) v where v=any(eligible);end if;
 select array_agg(v) into remaining from unnest(eligible) v where not(v=any(coalesce(used,array[]::text[])));
 if coalesce(cardinality(remaining),0)=0 then used=array[]::text[];remaining=eligible;end if;
 select v into chosen from unnest(remaining) v order by random() limit 1;
 insert into public.aquarium_live_state(owner_id,class_id,account_revision,sequence,pick_id,student_id,picked_at,pick_date,round_ids)
 values(uid,p_class_id,rev,coalesce(prior.sequence,0)+1,p_request_id,chosen,clock_timestamp(),today,to_jsonb(array_append(coalesce(used,array[]::text[]),chosen)))
 on conflict(owner_id,class_id) do update set account_revision=excluded.account_revision,sequence=excluded.sequence,pick_id=excluded.pick_id,
 student_id=excluded.student_id,picked_at=excluded.picked_at,pick_date=excluded.pick_date,round_ids=excluded.round_ids
 returning * into prior;
 insert into public.aquarium_pick_requests(owner_id,request_id,result) values(uid,p_request_id,to_jsonb(prior));
 delete from public.aquarium_pick_requests where owner_id=uid and created_at<now()-interval '7 days';
 return to_jsonb(prior)||jsonb_build_object('server_now',clock_timestamp());
end;$$;
revoke all on function public.aquarium_pick_student(text,uuid) from public,anon;
grant execute on function public.aquarium_pick_student(text,uuid) to authenticated;
-- Idempotent; do not publish the full aquarium_accounts table.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='aquarium_live_state'
 ) then alter publication supabase_realtime add table public.aquarium_live_state;end if;
end;$$;
commit;
