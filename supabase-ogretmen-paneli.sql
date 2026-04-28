-- Kemal Ogretmenim - Ogretmen paneli altyapisi
-- Supabase SQL Editor icinde calistirin.
-- Bu script sinif, ogrenci, odev, ilerleme, liyakat ve ogretmen icerik sahipligi tablolarini kurar.

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

-- ----------------------------------------------------------
-- Yardimci fonksiyonlar
-- ----------------------------------------------------------
create or replace function public.current_user_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'teacher'
      and active = true
  );
$$;

create or replace function public.current_user_is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'student'
      and active = true
  );
$$;

grant execute on function public.current_user_is_teacher() to authenticated;
grant execute on function public.current_user_is_student() to authenticated;

alter table if exists public.user_profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deactivated_at timestamptz,
  add column if not exists deletion_requested_at timestamptz;

-- ----------------------------------------------------------
-- Siniflar
-- ----------------------------------------------------------
create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  grade_level integer not null check (grade_level between 1 and 12),
  branch text not null default '',
  invite_code text not null unique,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_classes_teacher on public.teacher_classes (teacher_id, status, created_at desc);
create index if not exists idx_teacher_classes_invite_code on public.teacher_classes (upper(invite_code));

alter table public.teacher_classes enable row level security;
grant select, insert, update, delete on public.teacher_classes to authenticated;

drop policy if exists "teacher_classes teacher read own" on public.teacher_classes;
drop policy if exists "teacher_classes read related" on public.teacher_classes;
create policy "teacher_classes read related"
on public.teacher_classes
for select
to authenticated
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.teacher_class_students s
    where s.class_id = teacher_classes.id
      and s.student_profile_id = auth.uid()
      and s.status <> 'removed'
  )
);

drop policy if exists "teacher_classes teacher insert own" on public.teacher_classes;
create policy "teacher_classes teacher insert own"
on public.teacher_classes
for insert
to authenticated
with check (teacher_id = auth.uid() and public.current_user_is_teacher());

drop policy if exists "teacher_classes teacher update own" on public.teacher_classes;
create policy "teacher_classes teacher update own"
on public.teacher_classes
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and public.current_user_is_teacher());

-- ----------------------------------------------------------
-- Sinif ogrencileri
-- ----------------------------------------------------------
create table if not exists public.teacher_class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references public.user_profiles(id) on delete cascade,
  student_profile_id uuid references public.user_profiles(id) on delete set null,
  display_name text not null,
  email text not null default '',
  student_no text not null default '',
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  merit_points integer not null default 0,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_class_students_class on public.teacher_class_students (class_id, status, display_name);
create index if not exists idx_teacher_class_students_teacher on public.teacher_class_students (teacher_id, status);
create index if not exists idx_teacher_class_students_profile on public.teacher_class_students (student_profile_id);
create unique index if not exists idx_teacher_class_students_unique_profile
  on public.teacher_class_students (class_id, student_profile_id)
  where student_profile_id is not null and status <> 'removed';

alter table public.teacher_class_students enable row level security;
grant select, insert, update, delete on public.teacher_class_students to authenticated;

drop policy if exists "teacher_class_students teacher read own" on public.teacher_class_students;
create policy "teacher_class_students teacher read own"
on public.teacher_class_students
for select
to authenticated
using (teacher_id = auth.uid() or student_profile_id = auth.uid());

drop policy if exists "teacher_class_students teacher insert own" on public.teacher_class_students;
create policy "teacher_class_students teacher insert own"
on public.teacher_class_students
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_user_is_teacher()
  and exists (
    select 1
    from public.teacher_classes c
    where c.id = teacher_class_students.class_id
      and c.teacher_id = auth.uid()
      and c.status = 'active'
  )
);

drop policy if exists "teacher_class_students teacher update own" on public.teacher_class_students;
create policy "teacher_class_students teacher update own"
on public.teacher_class_students
for update
to authenticated
using (teacher_id = auth.uid() or student_profile_id = auth.uid())
with check (teacher_id = auth.uid() or student_profile_id = auth.uid());

create or replace function public.join_teacher_class_by_code(p_invite_code text)
returns public.teacher_class_students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.user_profiles%rowtype;
  v_class public.teacher_classes%rowtype;
  v_row public.teacher_class_students%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Giris yapmalisiniz.';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where id = auth.uid()
    and role = 'student'
    and active = true;

  if not found then
    raise exception 'Bu islem icin ogrenci hesabi gerekli.';
  end if;

  select *
  into v_class
  from public.teacher_classes
  where upper(invite_code) = upper(trim(p_invite_code))
    and status = 'active'
  limit 1;

  if not found then
    raise exception 'Sinif kodu bulunamadi.';
  end if;

  insert into public.teacher_class_students (
    class_id,
    teacher_id,
    student_profile_id,
    display_name,
    email,
    status,
    joined_at
  )
  values (
    v_class.id,
    v_class.teacher_id,
    v_profile.id,
    coalesce(nullif(trim(v_profile.full_name), ''), v_profile.email),
    v_profile.email,
    'active',
    now()
  )
  on conflict do nothing;

  select *
  into v_row
  from public.teacher_class_students
  where class_id = v_class.id
    and student_profile_id = v_profile.id
    and status <> 'removed'
  order by created_at desc
  limit 1;

  return v_row;
end;
$$;

grant execute on function public.join_teacher_class_by_code(text) to authenticated;

-- ----------------------------------------------------------
-- Ogretmen icerik kayitlari / paylasim modeli
-- ----------------------------------------------------------
create table if not exists public.teacher_contents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.user_profiles(id) on delete cascade,
  content_type text not null check (content_type in ('reading', 'exam', 'document', 'worksheet', 'custom')),
  source_system text not null default 'supabase' check (source_system in ('supabase', 'firestore', 'external')),
  source_id text not null default '',
  title text not null,
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('public_anonymous', 'class_only', 'selected_students', 'private')),
  class_ids uuid[] not null default '{}',
  student_membership_ids uuid[] not null default '{}',
  public_anonymous boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_contents_teacher on public.teacher_contents (teacher_id, content_type, status, created_at desc);
create index if not exists idx_teacher_contents_visibility on public.teacher_contents (visibility, status);

alter table public.teacher_contents enable row level security;
grant select on public.teacher_contents to anon;
grant select, insert, update, delete on public.teacher_contents to authenticated;

drop policy if exists "teacher_contents public anonymous read" on public.teacher_contents;
create policy "teacher_contents public anonymous read"
on public.teacher_contents
for select
to anon, authenticated
using (status = 'published' and visibility = 'public_anonymous' and public_anonymous = true);

drop policy if exists "teacher_contents teacher manage own" on public.teacher_contents;
create policy "teacher_contents teacher manage own"
on public.teacher_contents
for all
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and public.current_user_is_teacher());

-- Mevcut Supabase icerik tablolarina ogretmen sahipligi ve gorunurluk alani.
alter table if exists public.metinler
  add column if not exists teacher_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists visibility text not null default 'public_anonymous',
  add column if not exists class_ids uuid[] not null default '{}',
  add column if not exists student_membership_ids uuid[] not null default '{}';

alter table if exists public.dokumanlar
  add column if not exists teacher_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists visibility text not null default 'public_anonymous',
  add column if not exists class_ids uuid[] not null default '{}',
  add column if not exists student_membership_ids uuid[] not null default '{}';

-- ----------------------------------------------------------
-- Odevler
-- ----------------------------------------------------------
create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.user_profiles(id) on delete cascade,
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  title text not null,
  content_type text not null check (content_type in ('reading', 'exam', 'document', 'worksheet', 'custom')),
  content_ref text not null default '',
  target_type text not null default 'class' check (target_type in ('class', 'students')),
  target_student_ids uuid[] not null default '{}',
  start_at date not null default current_date,
  due_at date,
  instructions text not null default '',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_assignments_teacher on public.teacher_assignments (teacher_id, status, due_at);
create index if not exists idx_teacher_assignments_class on public.teacher_assignments (class_id, status, due_at);
create index if not exists idx_teacher_assignments_targets on public.teacher_assignments using gin (target_student_ids);

alter table public.teacher_assignments enable row level security;
grant select, insert, update, delete on public.teacher_assignments to authenticated;

drop policy if exists "teacher_assignments teacher read own" on public.teacher_assignments;
create policy "teacher_assignments teacher read own"
on public.teacher_assignments
for select
to authenticated
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.teacher_class_students s
    where s.student_profile_id = auth.uid()
      and s.status <> 'removed'
      and s.class_id = teacher_assignments.class_id
  )
);

drop policy if exists "teacher_assignments teacher insert own" on public.teacher_assignments;
create policy "teacher_assignments teacher insert own"
on public.teacher_assignments
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and public.current_user_is_teacher()
  and exists (
    select 1
    from public.teacher_classes c
    where c.id = teacher_assignments.class_id
      and c.teacher_id = auth.uid()
      and c.status = 'active'
  )
);

drop policy if exists "teacher_assignments teacher update own" on public.teacher_assignments;
create policy "teacher_assignments teacher update own"
on public.teacher_assignments
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and public.current_user_is_teacher());

-- ----------------------------------------------------------
-- Odev ilerleme
-- ----------------------------------------------------------
create table if not exists public.teacher_assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  student_membership_id uuid not null references public.teacher_class_students(id) on delete cascade,
  student_profile_id uuid references public.user_profiles(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned', 'started', 'completed', 'late', 'excused')),
  score numeric(6,2),
  completed_at timestamptz,
  evidence_ref text not null default '',
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_membership_id)
);

create index if not exists idx_teacher_assignment_progress_assignment on public.teacher_assignment_progress (assignment_id, status);
create index if not exists idx_teacher_assignment_progress_student on public.teacher_assignment_progress (student_membership_id, status);

alter table public.teacher_assignment_progress enable row level security;
grant select, insert, update, delete on public.teacher_assignment_progress to authenticated;

drop policy if exists "teacher_assignment_progress read related" on public.teacher_assignment_progress;
create policy "teacher_assignment_progress read related"
on public.teacher_assignment_progress
for select
to authenticated
using (
  student_profile_id = auth.uid()
  or exists (
    select 1
    from public.teacher_assignments a
    where a.id = teacher_assignment_progress.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "teacher_assignment_progress insert related" on public.teacher_assignment_progress;
create policy "teacher_assignment_progress insert related"
on public.teacher_assignment_progress
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
  or exists (
    select 1
    from public.teacher_assignments a
    where a.id = teacher_assignment_progress.assignment_id
      and a.teacher_id = auth.uid()
  )
);

drop policy if exists "teacher_assignment_progress update related" on public.teacher_assignment_progress;
create policy "teacher_assignment_progress update related"
on public.teacher_assignment_progress
for update
to authenticated
using (
  student_profile_id = auth.uid()
  or exists (
    select 1
    from public.teacher_assignments a
    where a.id = teacher_assignment_progress.assignment_id
      and a.teacher_id = auth.uid()
  )
)
with check (
  student_profile_id = auth.uid()
  or exists (
    select 1
    from public.teacher_assignments a
    where a.id = teacher_assignment_progress.assignment_id
      and a.teacher_id = auth.uid()
  )
);

-- ----------------------------------------------------------
-- Liyakat puanlari
-- ----------------------------------------------------------
create table if not exists public.teacher_merit_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.user_profiles(id) on delete cascade,
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  student_membership_id uuid not null references public.teacher_class_students(id) on delete cascade,
  points integer not null,
  reason text not null,
  source_type text not null default 'manual' check (source_type in ('manual', 'assignment', 'reading', 'exam', 'document')),
  source_id text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_teacher_merit_events_student on public.teacher_merit_events (student_membership_id, created_at desc);
create index if not exists idx_teacher_merit_events_teacher on public.teacher_merit_events (teacher_id, created_at desc);

alter table public.teacher_merit_events enable row level security;
grant select, insert, update, delete on public.teacher_merit_events to authenticated;

drop policy if exists "teacher_merit_events read related" on public.teacher_merit_events;
create policy "teacher_merit_events read related"
on public.teacher_merit_events
for select
to authenticated
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from public.teacher_class_students s
    where s.id = teacher_merit_events.student_membership_id
      and s.student_profile_id = auth.uid()
  )
);

drop policy if exists "teacher_merit_events teacher manage own" on public.teacher_merit_events;
create policy "teacher_merit_events teacher manage own"
on public.teacher_merit_events
for all
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and public.current_user_is_teacher());

-- ----------------------------------------------------------
-- updated_at tetikleyicileri
-- ----------------------------------------------------------
create or replace function public.touch_teacher_panel_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teacher_classes_updated_at on public.teacher_classes;
create trigger trg_teacher_classes_updated_at
before update on public.teacher_classes
for each row execute function public.touch_teacher_panel_updated_at();

drop trigger if exists trg_teacher_class_students_updated_at on public.teacher_class_students;
create trigger trg_teacher_class_students_updated_at
before update on public.teacher_class_students
for each row execute function public.touch_teacher_panel_updated_at();

drop trigger if exists trg_teacher_contents_updated_at on public.teacher_contents;
create trigger trg_teacher_contents_updated_at
before update on public.teacher_contents
for each row execute function public.touch_teacher_panel_updated_at();

drop trigger if exists trg_teacher_assignments_updated_at on public.teacher_assignments;
create trigger trg_teacher_assignments_updated_at
before update on public.teacher_assignments
for each row execute function public.touch_teacher_panel_updated_at();

drop trigger if exists trg_teacher_assignment_progress_updated_at on public.teacher_assignment_progress;
create trigger trg_teacher_assignment_progress_updated_at
before update on public.teacher_assignment_progress
for each row execute function public.touch_teacher_panel_updated_at();
