-- Supabase SQL Editor / yetkili bakım oturumu. Tamamen salt okunurdur.
-- Kişisel veri veya öğrenci adları döndürmez.
select current_setting('autovacuum') as autovacuum,
  pg_size_pretty(pg_database_size(current_database())) as database_size;

select a.attname as column_name, a.attstorage as storage_policy,
  c.reloptions as table_options, toast.reloptions as toast_options
from pg_attribute a
join pg_class c on c.oid = a.attrelid
left join pg_class toast on toast.oid = c.reltoastrelid
where a.attrelid = 'public.teacher_agenda_states'::regclass
  and a.attname in ('agenda_state', 'lesson_planner_state');

select count(*) as teacher_documents,
  coalesce(sum(octet_length(agenda_state::text) + coalesce(octet_length(lesson_planner_state::text), 0)), 0) as logical_json_bytes,
  coalesce(sum(pg_column_size(agenda_state) + coalesce(pg_column_size(lesson_planner_state), 0)), 0) as stored_value_bytes,
  pg_size_pretty(pg_total_relation_size('public.teacher_agenda_states')) as total_table_with_toast_and_indexes
from public.teacher_agenda_states;

select relname, n_live_tup, n_dead_tup, last_autovacuum, last_vacuum
from pg_stat_all_tables
where relid = 'public.teacher_agenda_states'::regclass
  or relid = (select reltoastrelid from pg_class where oid = 'public.teacher_agenda_states'::regclass);

select count(*) filter (where not exists (
    select 1 from jsonb_array_elements(coalesce(a.agenda_state->'classes', '[]')) c
    where c->>'id' = s->>'classId'
  )) as orphan_student_references
from public.teacher_agenda_states a
cross join lateral jsonb_array_elements(coalesce(a.agenda_state->'students', '[]')) s;

select count(*) as orphan_exam_result_references
from public.teacher_agenda_states a
cross join lateral jsonb_array_elements(coalesce(a.agenda_state->'exams', '[]')) e
cross join lateral jsonb_object_keys(coalesce(e->'results', '{}')) student_id
where not exists (
  select 1 from jsonb_array_elements(coalesce(a.agenda_state->'students', '[]')) s
  where s->>'id' = student_id
);

select count(*) as orphan_linked_exam_participants
from public.teacher_agenda_states a
cross join lateral jsonb_array_elements(coalesce(a.agenda_state->'exams', '[]')) e
cross join lateral jsonb_array_elements(coalesce(e->'participants', '[]')) p
where coalesce(p->>'studentId', '') <> '' and not exists (
  select 1 from jsonb_array_elements(coalesce(a.agenda_state->'students', '[]')) s
  where s->>'id' = p->>'studentId'
);

select relrowsecurity as row_security_enabled from pg_class
where oid = 'public.teacher_agenda_states'::regclass;
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'teacher_agenda_states';
