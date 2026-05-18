-- Kemal Öğretmenim kullanıcı kayıt altyapısı
-- Supabase SQL Editor içinde bir kez çalıştır.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  meb_code text,
  name text not null,
  type text not null default '',
  city text not null,
  district text not null,
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  active boolean not null default true,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, district, name)
);

create index if not exists idx_schools_city_district on public.schools(city, district);
create index if not exists idx_schools_meb_code on public.schools(meb_code);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  city text not null default '',
  district text not null default '',
  school_id uuid references public.schools(id) on delete set null,
  school_name text not null default '',
  school_missing boolean not null default false,
  branch text not null default '',
  grade_level integer check (grade_level between 1 and 12),
  teacher_code text not null default '',
  approval_status text not null default 'active' check (approval_status in ('pending', 'active', 'rejected')),
  account_status text not null default 'active',
  auth_provider text not null default 'email',
  last_login_at timestamptz,
  avatar_url text not null default '',
  verification_status text not null default 'not_submitted' check (verification_status in ('not_required', 'not_submitted', 'submitted', 'approved', 'rejected')),
  verification_file_path text not null default '',
  verification_file_name text not null default '',
  verification_file_type text not null default '',
  verification_submitted_at timestamptz,
  verification_reviewed_at timestamptz,
  verification_reviewed_by text not null default '',
  verification_review_note text not null default '',
  deactivated_at timestamptz,
  deletion_requested_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists first_name text not null default '';
alter table public.user_profiles add column if not exists last_name text not null default '';
alter table public.user_profiles add column if not exists district text not null default '';
alter table public.user_profiles add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.user_profiles add column if not exists school_name text not null default '';
alter table public.user_profiles add column if not exists school_missing boolean not null default false;
alter table public.user_profiles add column if not exists account_status text not null default 'active';
alter table public.user_profiles add column if not exists auth_provider text not null default 'email';
alter table public.user_profiles add column if not exists last_login_at timestamptz;
alter table public.user_profiles add column if not exists avatar_url text not null default '';
alter table public.user_profiles add column if not exists verification_status text not null default 'not_submitted';
alter table public.user_profiles add column if not exists verification_file_path text not null default '';
alter table public.user_profiles add column if not exists verification_file_name text not null default '';
alter table public.user_profiles add column if not exists verification_file_type text not null default '';
alter table public.user_profiles add column if not exists verification_submitted_at timestamptz;
alter table public.user_profiles add column if not exists verification_reviewed_at timestamptz;
alter table public.user_profiles add column if not exists verification_reviewed_by text not null default '';
alter table public.user_profiles add column if not exists verification_review_note text not null default '';
alter table public.user_profiles add column if not exists deactivated_at timestamptz;
alter table public.user_profiles add column if not exists deletion_requested_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and constraint_name = 'user_profiles_verification_status_check'
  ) then
    alter table public.user_profiles drop constraint user_profiles_verification_status_check;
  end if;
end $$;

alter table public.user_profiles
  add constraint user_profiles_verification_status_check
  check (verification_status in ('not_required', 'not_submitted', 'submitted', 'approved', 'rejected'));

update public.user_profiles
set verification_status = 'not_required'
where role = 'student'
  and verification_status = 'not_submitted';

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_email on public.user_profiles(lower(email));
create index if not exists idx_user_profiles_teacher_code on public.user_profiles(teacher_code);
create index if not exists idx_user_profiles_school_id on public.user_profiles(school_id);

create or replace function public.touch_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.touch_user_profiles_updated_at();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  meta_full_name text;
  meta_first_name text;
  meta_last_name text;
begin
  if to_regclass('public.admin_users') is not null then
    if exists (
      select 1
      from public.admin_users
      where lower(email) = lower(coalesce(new.email, ''))
        and active = true
    ) then
      return new;
    end if;
  end if;

  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('teacher', 'student') then
    requested_role := 'student';
  end if;

  meta_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    ''
  );
  meta_first_name := coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), split_part(meta_full_name, ' ', 1), '');
  meta_last_name := coalesce(
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(trim(regexp_replace(meta_full_name, '^\S+\s*', '')), ''),
    ''
  );

  insert into public.user_profiles (
    id,
    role,
    email,
    first_name,
    last_name,
    full_name,
    city,
    district,
    school_id,
    school_name,
    school_missing,
    branch,
    grade_level,
    teacher_code,
    approval_status,
    account_status,
    auth_provider,
    active
  )
  values (
    new.id,
    requested_role,
    coalesce(new.email, ''),
    meta_first_name,
    meta_last_name,
    coalesce(nullif(meta_full_name, ''), trim(meta_first_name || ' ' || meta_last_name)),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'district', ''),
    nullif(new.raw_user_meta_data->>'school_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'school_name', ''),
    coalesce((new.raw_user_meta_data->>'school_missing')::boolean, false),
    coalesce(new.raw_user_meta_data->>'branch', ''),
    nullif(new.raw_user_meta_data->>'grade_level', '')::integer,
    coalesce(new.raw_user_meta_data->>'teacher_code', ''),
    case when requested_role = 'teacher' then 'pending' else 'active' end,
    'active',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();

do $$
begin
  if to_regclass('public.admin_users') is not null then
    execute '
      update public.user_profiles up
      set active = false,
          account_status = ''admin_account'',
          updated_at = now()
      where coalesce(up.active, true) = true
        and up.role in (''student'', ''teacher'')
        and exists (
          select 1
          from public.admin_users au
          where lower(au.email) = lower(up.email)
            and au.active = true
        )';
  end if;
end $$;

alter table public.user_profiles enable row level security;
alter table public.schools enable row level security;

grant select, insert, update on public.user_profiles to authenticated;
grant select on public.schools to anon, authenticated;

drop policy if exists "schools public active read" on public.schools;
create policy "schools public active read"
on public.schools
for select
to anon, authenticated
using (active = true);

drop policy if exists "user_profiles read own profile" on public.user_profiles;
create policy "user_profiles read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "user_profiles insert own profile" on public.user_profiles;
create policy "user_profiles insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "user_profiles update own profile" on public.user_profiles;
create policy "user_profiles update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.user_content_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('reading', 'exam', 'document', 'worksheet', 'video', 'game', 'content')),
  content_id text not null,
  title text not null default '',
  href text not null default '',
  grade text not null default '',
  subject text not null default '',
  status text not null default 'read' check (status in ('read', 'started', 'completed', 'watched', 'solved')),
  score numeric(8,2),
  detail_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

alter table public.user_content_progress
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists content_type text,
  add column if not exists content_id text,
  add column if not exists title text not null default '',
  add column if not exists href text not null default '',
  add column if not exists grade text not null default '',
  add column if not exists subject text not null default '',
  add column if not exists status text not null default 'read',
  add column if not exists score numeric(8,2),
  add column if not exists detail_json jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_user_content_progress_unique
  on public.user_content_progress (user_id, content_type, content_id);
create index if not exists idx_user_content_progress_user_updated
  on public.user_content_progress (user_id, updated_at desc);
create index if not exists idx_user_content_progress_type
  on public.user_content_progress (content_type, status);

create or replace function public.touch_user_content_progress_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_content_progress_updated_at on public.user_content_progress;
create trigger trg_user_content_progress_updated_at
before update on public.user_content_progress
for each row
execute function public.touch_user_content_progress_updated_at();

alter table public.user_content_progress enable row level security;
grant select, insert, update, delete on public.user_content_progress to authenticated;

drop policy if exists "user_content_progress read own" on public.user_content_progress;
create policy "user_content_progress read own"
on public.user_content_progress
for select
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if to_regclass('public.teacher_class_students') is not null then
    execute 'drop policy if exists "user_content_progress teacher read assigned students" on public.user_content_progress';
    execute $policy$
      create policy "user_content_progress teacher read assigned students"
      on public.user_content_progress
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.teacher_class_students s
          where s.teacher_id = auth.uid()
            and s.status <> 'removed'
            and s.student_profile_id = user_content_progress.user_id
        )
      )
    $policy$;
  end if;
end $$;

drop policy if exists "user_content_progress insert own" on public.user_content_progress;
create policy "user_content_progress insert own"
on public.user_content_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_content_progress update own" on public.user_content_progress;
create policy "user_content_progress update own"
on public.user_content_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_content_progress delete own" on public.user_content_progress;
create policy "user_content_progress delete own"
on public.user_content_progress
for delete
to authenticated
using (auth.uid() = user_id);
