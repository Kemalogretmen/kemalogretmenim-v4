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
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists district text not null default '';
alter table public.user_profiles add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.user_profiles add column if not exists school_name text not null default '';
alter table public.user_profiles add column if not exists school_missing boolean not null default false;

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_email on public.user_profiles(lower(email));
create index if not exists idx_user_profiles_teacher_code on public.user_profiles(teacher_code);
create index if not exists idx_user_profiles_school_id on public.user_profiles(school_id);

create or replace function public.touch_user_profiles_updated_at()
returns trigger
language plpgsql
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
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('teacher', 'student') then
    requested_role := 'student';
  end if;

  insert into public.user_profiles (
    id,
    role,
    email,
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
    active
  )
  values (
    new.id,
    requested_role,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_user_meta_data->>'district', ''),
    nullif(new.raw_user_meta_data->>'school_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'school_name', ''),
    coalesce((new.raw_user_meta_data->>'school_missing')::boolean, false),
    coalesce(new.raw_user_meta_data->>'branch', ''),
    nullif(new.raw_user_meta_data->>'grade_level', '')::integer,
    coalesce(new.raw_user_meta_data->>'teacher_code', ''),
    case when requested_role = 'teacher' then 'pending' else 'active' end,
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
