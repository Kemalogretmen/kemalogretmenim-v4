-- 2026-10-23. Apply after the existing aquarium migrations, before the web release.
-- Additive, repeatable migration. No rows, scores, tokens, roles or RLS policies change.
-- Preserve cosmetic fields when an older open client saves a score without them.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';

create or replace function public.aquarium_cosmetic_style(style jsonb, species text)
returns jsonb language sql immutable set search_path=public as $$
 select jsonb_build_object(
  'accessory',case when species in ('clown','tang','yellowtang','betta','goldfish','guppy')
    and style->>'accessory' in ('none','sailor','flower','leaf','shell','star','ribbon') then style->>'accessory' else 'none' end,
  'palette',case when species in ('clown','tang','yellowtang','betta','goldfish','guppy')
    and style->>'palette' in ('original','warm','cool','pearl') then style->>'palette' else 'original' end);
$$;
revoke all on function public.aquarium_cosmetic_style(jsonb,text) from public,anon,authenticated;

create or replace function public.aquarium_account_keep_cosmetics()
returns trigger language plpgsql security definer set search_path=public as $$
declare cls jsonb; prior jsonb; student jsonb; old_student jsonb; classes jsonb:='[]'; students jsonb; cfg jsonb;
begin
 for cls in select value from jsonb_array_elements(new.document->'classes') loop
  prior:=null;
  if tg_op='UPDATE' then select c into prior from jsonb_array_elements(old.document->'classes') c where c->>'id'=cls->>'id' limit 1; end if;
  cfg:=coalesce(cls->'customization',prior->'customization');
  if cfg is not null then
   cfg:=jsonb_build_object('enabled',coalesce(cfg->'enabled'='true'::jsonb,false),
     'collectionUnlocked',coalesce(cfg->'collectionUnlocked'='true'::jsonb,false));
   cls:=cls||jsonb_build_object('customization',cfg);
  end if;
  students:='[]';
  for student in select value from jsonb_array_elements(case when jsonb_typeof(cls->'students')='array' then cls->'students' else '[]'::jsonb end) loop
   old_student:=null;
   select s into old_student from jsonb_array_elements(case when jsonb_typeof(prior->'students')='array' then prior->'students' else '[]'::jsonb end) s where s->>'id'=student->>'id' limit 1;
   -- Pre-25 October clients know neither the milestone flag nor these species;
   -- their validator silently maps an unknown choice to clown while scoring.
   if not (student ? 'characterUnlocked') and student->>'species'='clown'
      and old_student->>'species' in ('eel','angler','mantis','crab','lina','spongebob','patrick','mrkrabs') then
    student:=jsonb_set(student,'{species}',old_student->'species');
   end if;
   if student ? 'characterUnlocked' or old_student ? 'characterUnlocked' then
    student:=student||jsonb_build_object('characterUnlocked',coalesce(student->'characterUnlocked'='true'::jsonb,false) or coalesce(old_student->'characterUnlocked'='true'::jsonb,false));
   end if;
   if student ? 'cosmetics' or old_student ? 'cosmetics' then
    student:=student||jsonb_build_object('cosmetics',public.aquarium_cosmetic_style(
      coalesce(student->'cosmetics',old_student->'cosmetics'),student->>'species'));
   end if;
   students:=students||jsonb_build_array(student);
  end loop;
  if jsonb_typeof(cls->'students')='array' then cls:=cls||jsonb_build_object('students',students); end if;
  classes:=classes||jsonb_build_array(cls);
 end loop;
 new.document:=jsonb_set(new.document,'{classes}',classes);
 return new;
end;
$$;
revoke all on function public.aquarium_account_keep_cosmetics() from public,anon,authenticated;
drop trigger if exists aquarium_account_keep_cosmetics on public.aquarium_accounts;
create trigger aquarium_account_keep_cosmetics before insert or update of document on public.aquarium_accounts
for each row execute function public.aquarium_account_keep_cosmetics();

-- Project only allowlisted appearance IDs from the same owner's canonical class.
-- This also keeps snapshots sent by older clients consistent with the account.
create or replace function public.aquarium_share_keep_cosmetics()
returns trigger language plpgsql security definer set search_path=public as $$
declare cls jsonb; student jsonb; own_student jsonb; appearance jsonb; style jsonb; cfg jsonb; students jsonb:='[]';
begin
 if jsonb_typeof(new.snapshot->'students') is distinct from 'array' then return new; end if;
 select c into cls from public.aquarium_accounts a cross join lateral jsonb_array_elements(a.document->'classes') c
 where a.owner_id=new.owner_id and c->>'id'=new.local_id limit 1;
 if cls is null then return new; end if;
 cfg:=cls->'customization';
 for student in select value from jsonb_array_elements(new.snapshot->'students') loop
  own_student:=null;
  select s into own_student from jsonb_array_elements(cls->'students') s where s->>'id'=student->>'id' limit 1;
  if own_student is not null then student:=jsonb_set(student,'{species}',own_student->'species'); end if;
  style:=public.aquarium_cosmetic_style(case when cfg->'enabled'='true'::jsonb then own_student->'cosmetics' else null end,own_student->>'species');
  if style->>'accessory' in ('star','ribbon') and cfg->'collectionUnlocked' is distinct from 'true'::jsonb then style:=jsonb_set(style,'{accessory}','"none"'); end if;
  appearance:=case when jsonb_typeof(student->'appearance')='object' then student->'appearance' else '{}'::jsonb end;
  students:=students||jsonb_build_array(student||jsonb_build_object('appearance',appearance||jsonb_build_object('cosmetics',style)));
 end loop;
 new.snapshot:=jsonb_set(new.snapshot,'{students}',students);
 new.snapshot:=jsonb_set(new.snapshot,'{settings}',coalesce(new.snapshot->'settings','{}')||jsonb_build_object('customization',coalesce(cfg->'enabled'='true'::jsonb,false)));
 return new;
end;
$$;
revoke all on function public.aquarium_share_keep_cosmetics() from public,anon,authenticated;
drop trigger if exists aquarium_share_keep_cosmetics on public.aquarium_shares;
create trigger aquarium_share_keep_cosmetics before insert or update of snapshot on public.aquarium_shares
for each row execute function public.aquarium_share_keep_cosmetics();

create or replace function public.aquarium_view_snapshot(doc jsonb, child_id text default null)
returns jsonb language sql immutable set search_path=public as $$
select jsonb_build_object(
  'name',case when child_id is null then left(doc->>'name',80) else 'Deniz dostum' end,
  'theme',doc->>'theme',
  'settings',jsonb_build_object('customization',coalesce(doc#>'{settings,customization}'='true'::jsonb,false),'names',coalesce(doc#>'{settings,names}'='true'::jsonb,false),
    'points',coalesce(doc#>'{settings,points}'='true'::jsonb,false),
    'classPoints',child_id is null and coalesce(doc#>'{settings,classPoints}'='true'::jsonb,false),
    'motion',coalesce(doc#>'{settings,motion}'='true'::jsonb,false),
    'chat',child_id is null and coalesce(doc#>'{settings,chat}'='true'::jsonb,false)),
  'classPoints',case when child_id is null and doc#>'{settings,classPoints}'='true'::jsonb and jsonb_typeof(doc->'classPoints')='number' then doc->'classPoints' else 'null'::jsonb end,
  'teacher',case when child_id is null and jsonb_typeof(doc->'teacher')='object' then jsonb_build_object('name',case when doc#>'{settings,names}'='true'::jsonb then left(doc#>>'{teacher,name}',80) else '' end,'species',left(doc#>>'{teacher,species}',30)) else 'null'::jsonb end,
  'students',coalesce((select jsonb_agg(jsonb_build_object(
    'id',case when child_id is null then left(s->>'id',90) else 'my-child' end,
    'appearance',jsonb_build_object('cosmetics',public.aquarium_cosmetic_style(case when doc#>'{settings,customization}'='true'::jsonb then s#>'{appearance,cosmetics}' else null end,s->>'species'),'egg',coalesce(s#>'{appearance,egg}'='true'::jsonb,false),'scale',case when jsonb_typeof(s#>'{appearance,scale}')='number' then greatest(0.35,least(1,(s#>>'{appearance,scale}')::numeric)) else 1 end,'trophy',coalesce(s#>'{appearance,trophy}'='true'::jsonb,false)),
    'species',left(s->>'species',30),'mood',left(s->>'mood',20),
    'name',case when doc#>'{settings,names}'='true'::jsonb then left(s->>'name',80) else '' end,
    'points',case when doc#>'{settings,points}'='true'::jsonb and jsonb_typeof(s->'points')='number' then s->'points' else 'null'::jsonb end
  )) from (select value s from jsonb_array_elements(case when jsonb_typeof(doc->'students')='array' then doc->'students' else '[]'::jsonb end)
     where child_id is null or value->>'id'=child_id limit (case when child_id is null then 60 else 1 end)) fish),'[]'::jsonb)
);
$$;
revoke all on function public.aquarium_view_snapshot(jsonb,text) from public,anon,authenticated;

commit;
