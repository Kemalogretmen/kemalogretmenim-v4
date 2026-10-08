-- Apply after supabase-akvaryum-veli.sql. Owner document is never exposed through visitor RPCs.
begin;
create table if not exists public.aquarium_accounts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=16777216),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.aquarium_accounts enable row level security;
revoke all on public.aquarium_accounts from public,anon,authenticated;
grant select on public.aquarium_accounts to authenticated;
drop policy if exists aquarium_account_owner on public.aquarium_accounts;
create policy aquarium_account_owner on public.aquarium_accounts for select to authenticated
using(owner_id=auth.uid() and public.current_user_is_teacher());
create or replace function public.save_aquarium_account(p_document jsonb,p_revision bigint,p_snapshots jsonb,p_owner uuid default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); actual bigint; next_revision bigint; item jsonb;
begin
 if uid is null or (p_owner is not null and p_owner<>uid) or not public.current_user_is_teacher() then raise exception 'Teacher required' using errcode='42501'; end if;
 if jsonb_typeof(p_document) is distinct from 'object' or p_document->>'version' is distinct from '1'
 or jsonb_typeof(p_document->'classes') is distinct from 'array' or jsonb_typeof(p_snapshots) is distinct from 'array'
 or octet_length(p_document::text)>16777216 then raise exception 'Invalid aquarium document'; end if;
 if jsonb_array_length(p_document->'classes') not between 1 and 30 or jsonb_array_length(p_snapshots)>30 then raise exception 'Invalid class count'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into actual from public.aquarium_accounts where owner_id=uid;
 if coalesce(actual,0) is distinct from p_revision then raise exception 'Aquarium revision conflict' using errcode='40001'; end if;
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
$$;
revoke all on function public.save_aquarium_account(jsonb,bigint,jsonb,uuid) from public,anon;
grant execute on function public.save_aquarium_account(jsonb,bigint,jsonb,uuid) to authenticated;
create or replace function public.aquarium_view_snapshot(doc jsonb, child_id text default null)
returns jsonb language sql immutable set search_path=public as $$
select jsonb_build_object(
  'name',case when child_id is null then left(doc->>'name',80) else 'Deniz dostum' end,
  'theme',doc->>'theme',
  'settings',jsonb_build_object('names',coalesce(doc#>'{settings,names}'='true'::jsonb,false),
    'points',coalesce(doc#>'{settings,points}'='true'::jsonb,false),
    'classPoints',child_id is null and coalesce(doc#>'{settings,classPoints}'='true'::jsonb,false),
    'motion',coalesce(doc#>'{settings,motion}'='true'::jsonb,false),
    'chat',child_id is null and coalesce(doc#>'{settings,chat}'='true'::jsonb,false)),
  'classPoints',case when child_id is null and doc#>'{settings,classPoints}'='true'::jsonb and jsonb_typeof(doc->'classPoints')='number' then doc->'classPoints' else 'null'::jsonb end,
  'teacher',case when child_id is null and jsonb_typeof(doc->'teacher')='object' then jsonb_build_object('name',case when doc#>'{settings,names}'='true'::jsonb then left(doc#>>'{teacher,name}',80) else '' end,'species',left(doc#>>'{teacher,species}',30)) else 'null'::jsonb end,
  'students',coalesce((select jsonb_agg(jsonb_build_object(
    'id',case when child_id is null then left(s->>'id',90) else 'my-child' end,
    'appearance',jsonb_build_object('egg',coalesce(s#>'{appearance,egg}'='true'::jsonb,false),'scale',case when jsonb_typeof(s#>'{appearance,scale}')='number' then greatest(0.35,least(1,(s#>>'{appearance,scale}')::numeric)) else 1 end,'trophy',coalesce(s#>'{appearance,trophy}'='true'::jsonb,false)),
    'species',left(s->>'species',30),'mood',left(s->>'mood',20),
    'name',case when doc#>'{settings,names}'='true'::jsonb then left(s->>'name',80) else '' end,
    'points',case when doc#>'{settings,points}'='true'::jsonb and jsonb_typeof(s->'points')='number' then s->'points' else 'null'::jsonb end
  )) from (select value s from jsonb_array_elements(case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end)
     where child_id is null or value->>'id'=child_id limit (case when child_id is null then 60 else 1 end)) fish),'[]'::jsonb)
);
$$;
revoke all on function public.aquarium_view_snapshot(jsonb,text) from public,anon,authenticated;

commit;
