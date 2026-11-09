-- Run once in Supabase SQL Editor. Does not change roles, approvals or existing policies.
begin;

alter table public.teacher_class_students
  add column if not exists agenda_source_class_id text,
  add column if not exists agenda_source_student_id text;

create unique index if not exists teacher_student_agenda_source_unique
  on public.teacher_class_students (teacher_id, class_id, agenda_source_class_id, agenda_source_student_id)
  where agenda_source_student_id is not null;

create or replace function public.import_agenda_students(
  source_class_id text, target_class_id uuid, selected_student_ids text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  agenda jsonb;
  student jsonb;
  sid text;
  student_name text;
  school_no text;
  existing_id uuid;
  matches integer;
  added integer := 0;
  kept integer := 0;
  conflicts integer := 0;
begin
  if uid is null or not public.current_user_is_teacher() then
    raise exception 'Only an approved teacher can import agenda students' using errcode = '42501';
  end if;
  if coalesce(cardinality(selected_student_ids),0) not between 1 and 500 then
    raise exception 'Select between 1 and 500 students';
  end if;
  -- Serialize imports to this target; RLS and explicit ownership both apply.
  perform 1 from public.teacher_classes
    where id = target_class_id and teacher_id = uid and status = 'active' for update;
  if not found then raise exception 'Target class is not owned by this teacher' using errcode = '42501'; end if;
  select agenda_state into agenda from public.teacher_agenda_states where user_id = uid for share;
  if agenda is null or not exists (
    select 1 from jsonb_array_elements(agenda->'classes') c where c->>'id' = source_class_id
  ) then raise exception 'Source agenda class not found'; end if;

  for sid in select distinct unnest(selected_student_ids) loop
    select s into student from jsonb_array_elements(agenda->'students') s
      where s->>'id' = sid and s->>'classId' = source_class_id;
    if student is null then raise exception 'Selected student is not in the source class'; end if;
    student_name := btrim(concat_ws(' ', nullif(btrim(student->>'firstName'),''), nullif(btrim(student->>'lastName'),'')));
    school_no := coalesce(btrim(student->>'schoolNo'),'');
    if length(student_name) not between 1 and 180 or length(school_no)>30 then
      raise exception 'Invalid student name or school number';
    end if;
    if exists (select 1 from public.teacher_class_students where teacher_id=uid and class_id=target_class_id
      and agenda_source_class_id=source_class_id and agenda_source_student_id=sid) then
      kept := kept+1;
      continue;
    end if;
    select count(*), min(id::text)::uuid into matches, existing_id from public.teacher_class_students
      where teacher_id=uid and class_id=target_class_id and student_no=school_no and lower(btrim(display_name))=lower(student_name);
    if matches=1 then
      -- Link an exact existing record without changing its profile, status or parent links.
      update public.teacher_class_students set agenda_source_class_id=source_class_id, agenda_source_student_id=sid
        where id=existing_id and agenda_source_student_id is null;
      if not found then conflicts:=conflicts+1; else kept:=kept+1; end if;
    elsif matches>1 or (school_no<>'' and exists (select 1 from public.teacher_class_students
      where teacher_id=uid and class_id=target_class_id and student_no=school_no)) then
      conflicts:=conflicts+1;
    else
      insert into public.teacher_class_students(class_id,teacher_id,display_name,student_no,status,agenda_source_class_id,agenda_source_student_id)
        values(target_class_id,uid,student_name,school_no,'active',source_class_id,sid);
      added:=added+1;
    end if;
  end loop;
  return jsonb_build_object('added',added,'kept',kept,'conflicts',conflicts);
end;
$$;
revoke all on function public.import_agenda_students(text,uuid,text[]) from public, anon;
grant execute on function public.import_agenda_students(text,uuid,text[]) to authenticated;
commit;
