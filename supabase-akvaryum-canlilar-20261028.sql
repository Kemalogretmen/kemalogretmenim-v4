-- Apply after supabase-akvaryum-ozellestirme.sql and before the new-creature web release.
-- Repeatable compatibility change only: no new tables, grants, RLS, score edits or deletions.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';

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
  -- Pre-28 October clients do not recognize these two new animals. Preserve
  -- the canonical teacher species while allowing an explicit current choice.
  if jsonb_typeof(cls->'teacher')='object' then
   if not (cls->'teacher' ? 'speciesCatalogVersion') and cls#>>'{teacher,species}'='clown'
      and prior#>>'{teacher,species}' in ('hammerhead','axolotl') then
    cls:=jsonb_set(cls,'{teacher,species}',prior#>'{teacher,species}');
   end if;
   if cls->'teacher' ? 'speciesCatalogVersion' or prior->'teacher' ? 'speciesCatalogVersion' then
    cls:=jsonb_set(cls,'{teacher,speciesCatalogVersion}','2'::jsonb);
   end if;
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
   if not (student ? 'speciesCatalogVersion') and student->>'species'='clown'
      and old_student->>'species' in ('hammerhead','axolotl') then
    student:=jsonb_set(student,'{species}',old_student->'species');
   end if;
   if student ? 'speciesCatalogVersion' or old_student ? 'speciesCatalogVersion' then
    student:=student||jsonb_build_object('speciesCatalogVersion',2);
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

commit;
