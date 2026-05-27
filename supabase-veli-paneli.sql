-- Kemal Ogretmenim - Veli paneli, mesajlasma ve dogum gunu altyapisi
-- Supabase SQL Editor icinde, mevcut kullanici ve ogretmen paneli SQL dosyalarindan sonra calistirin.

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

-- ----------------------------------------------------------
-- Kullanici rolleri ve profil ek alanlari
-- ----------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and constraint_name = 'user_profiles_role_check'
  ) then
    alter table public.user_profiles drop constraint user_profiles_role_check;
  end if;
end $$;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('teacher', 'student', 'parent'));

alter table public.user_profiles
  add column if not exists parent_link_code text not null default '',
  add column if not exists birth_date date;

alter table if exists public.teacher_class_students
  add column if not exists birth_date date,
  add column if not exists parent_note text not null default '';

create index if not exists idx_user_profiles_parent_link_code on public.user_profiles (upper(parent_link_code));
create index if not exists idx_user_profiles_birth_date on public.user_profiles (birth_date);
create index if not exists idx_teacher_class_students_birth_date on public.teacher_class_students (birth_date);

create or replace function public.current_user_is_parent()
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
      and role = 'parent'
      and active = true
  );
$$;

grant execute on function public.current_user_is_parent() to authenticated;

-- Auth trigger'ini veli rolunu taniyacak sekilde gunceller.
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
  if requested_role not in ('teacher', 'student', 'parent') then
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
    parent_link_code,
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
    case when requested_role = 'parent' then '' else coalesce(new.raw_user_meta_data->>'district', '') end,
    case
      when requested_role = 'parent' then null
      else nullif(new.raw_user_meta_data->>'school_id', '')::uuid
    end,
    case when requested_role = 'parent' then '' else coalesce(new.raw_user_meta_data->>'school_name', '') end,
    case when requested_role = 'parent' then false else coalesce(nullif(new.raw_user_meta_data->>'school_missing', '')::boolean, false) end,
    coalesce(new.raw_user_meta_data->>'branch', ''),
    nullif(new.raw_user_meta_data->>'grade_level', '')::integer,
    coalesce(new.raw_user_meta_data->>'teacher_code', ''),
    coalesce(new.raw_user_meta_data->>'parent_link_code', ''),
    case when requested_role = 'teacher' then 'pending' else 'active' end,
    'active',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ----------------------------------------------------------
-- Veli ogrenci baglantilari
-- ----------------------------------------------------------
create table if not exists public.parent_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  code_type text not null check (code_type in ('teacher_to_parent', 'parent_to_student')),
  parent_id uuid references public.user_profiles(id) on delete cascade,
  student_profile_id uuid references public.user_profiles(id) on delete cascade,
  student_membership_id uuid references public.teacher_class_students(id) on delete cascade,
  teacher_id uuid references public.user_profiles(id) on delete set null,
  class_id uuid references public.teacher_classes(id) on delete set null,
  created_by uuid not null references public.user_profiles(id) on delete cascade,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.user_profiles(id) on delete cascade,
  student_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  student_membership_id uuid references public.teacher_class_students(id) on delete set null,
  teacher_id uuid references public.user_profiles(id) on delete set null,
  class_id uuid references public.teacher_classes(id) on delete set null,
  relationship text not null default 'parent' check (relationship in ('mother', 'father', 'parent', 'guardian')),
  source text not null default 'parent_code' check (source in ('teacher_code', 'student_code', 'parent_code', 'manual')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'rejected')),
  teacher_review_status text not null default 'not_required' check (teacher_review_status in ('not_required', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_parent_student_links_active_unique
  on public.parent_student_links (parent_id, student_profile_id)
  where status in ('pending', 'active');

create index if not exists idx_parent_student_links_parent on public.parent_student_links (parent_id, status);
create index if not exists idx_parent_student_links_student on public.parent_student_links (student_profile_id, status);
create index if not exists idx_parent_student_links_teacher on public.parent_student_links (teacher_id, status, teacher_review_status);
create index if not exists idx_parent_link_codes_code on public.parent_link_codes (upper(code), status);

alter table public.parent_link_codes enable row level security;
alter table public.parent_student_links enable row level security;
grant select, insert, update, delete on public.parent_link_codes to authenticated;
grant select, insert, update, delete on public.parent_student_links to authenticated;

drop policy if exists "parent_link_codes read own" on public.parent_link_codes;
create policy "parent_link_codes read own"
on public.parent_link_codes
for select
to authenticated
using (created_by = auth.uid() or parent_id = auth.uid() or teacher_id = auth.uid());

drop policy if exists "parent_link_codes manage own" on public.parent_link_codes;
create policy "parent_link_codes manage own"
on public.parent_link_codes
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "parent_student_links read related" on public.parent_student_links;
create policy "parent_student_links read related"
on public.parent_student_links
for select
to authenticated
using (
  parent_id = auth.uid()
  or student_profile_id = auth.uid()
  or teacher_id = auth.uid()
);

drop policy if exists "parent_student_links update related" on public.parent_student_links;
-- Durum degisiklikleri RPC fonksiyonlari uzerinden yapilir; boylece veli onayi ogretmen denetimini asamaz.

-- Kod uretimi icin yardimci fonksiyon.
create or replace function public.generate_panel_code(p_prefix text default 'V')
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := upper(left(coalesce(nullif(p_prefix, ''), 'V'), 1));
  i integer := 0;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_parent_account_code()
returns public.parent_link_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.parent_link_codes%rowtype;
begin
  if not public.current_user_is_parent() then
    raise exception 'only parent accounts can create this code';
  end if;

  loop
    v_code := public.generate_panel_code('V');
    exit when not exists (select 1 from public.parent_link_codes where upper(code) = upper(v_code));
  end loop;

  insert into public.parent_link_codes (code, code_type, parent_id, created_by, max_uses, expires_at)
  values (v_code, 'parent_to_student', auth.uid(), auth.uid(), 4, now() + interval '30 days')
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_teacher_parent_code(p_student_membership_id uuid, p_max_uses integer default 2)
returns public.parent_link_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.teacher_class_students%rowtype;
  v_code text;
  v_row public.parent_link_codes%rowtype;
begin
  if not public.current_user_is_teacher() then
    raise exception 'only teachers can create parent codes';
  end if;

  select * into v_membership
  from public.teacher_class_students
  where id = p_student_membership_id
    and teacher_id = auth.uid()
    and status <> 'removed';

  if not found or v_membership.student_profile_id is null then
    raise exception 'student membership not found or not linked to a student account';
  end if;

  loop
    v_code := public.generate_panel_code('A');
    exit when not exists (select 1 from public.parent_link_codes where upper(code) = upper(v_code));
  end loop;

  insert into public.parent_link_codes (
    code,
    code_type,
    student_profile_id,
    student_membership_id,
    teacher_id,
    class_id,
    created_by,
    max_uses,
    expires_at
  )
  values (
    v_code,
    'teacher_to_parent',
    v_membership.student_profile_id,
    v_membership.id,
    auth.uid(),
    v_membership.class_id,
    auth.uid(),
    greatest(1, least(coalesce(p_max_uses, 2), 2)),
    now() + interval '14 days'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.connect_parent_with_teacher_code(p_code text, p_relationship text default 'parent')
returns public.parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.parent_link_codes%rowtype;
  v_relationship text := lower(coalesce(nullif(trim(p_relationship), ''), 'parent'));
  v_row public.parent_student_links%rowtype;
begin
  if not public.current_user_is_parent() then
    raise exception 'only parent accounts can use this code';
  end if;

  if v_relationship not in ('mother', 'father', 'parent', 'guardian') then
    v_relationship := 'parent';
  end if;

  select * into v_code
  from public.parent_link_codes
  where upper(code) = upper(trim(p_code))
    and code_type = 'teacher_to_parent'
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and used_count < max_uses
  for update;

  if not found then
    raise exception 'invalid or expired code';
  end if;

  insert into public.parent_student_links (
    parent_id,
    student_profile_id,
    student_membership_id,
    teacher_id,
    class_id,
    relationship,
    source,
    status,
    teacher_review_status
  )
  values (
    auth.uid(),
    v_code.student_profile_id,
    v_code.student_membership_id,
    v_code.teacher_id,
    v_code.class_id,
    v_relationship,
    'teacher_code',
    'active',
    'approved'
  )
  on conflict (parent_id, student_profile_id) where status in ('pending', 'active')
  do update set
    relationship = excluded.relationship,
    source = excluded.source,
    status = 'active',
    teacher_review_status = 'approved',
    updated_at = now()
  returning * into v_row;

  update public.parent_link_codes
  set used_count = used_count + 1,
      status = case when used_count + 1 >= max_uses then 'used' else status end,
      updated_at = now()
  where id = v_code.id;

  return v_row;
end;
$$;

create or replace function public.connect_student_with_parent_code(p_code text, p_relationship text default 'parent')
returns public.parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.parent_link_codes%rowtype;
  v_profile public.user_profiles%rowtype;
  v_membership public.teacher_class_students%rowtype;
  v_relationship text := lower(coalesce(nullif(trim(p_relationship), ''), 'parent'));
  v_row public.parent_student_links%rowtype;
begin
  if not public.current_user_is_student() then
    raise exception 'only student accounts can use this code';
  end if;

  if v_relationship not in ('mother', 'father', 'parent', 'guardian') then
    v_relationship := 'parent';
  end if;

  select * into v_code
  from public.parent_link_codes
  where upper(code) = upper(trim(p_code))
    and code_type = 'parent_to_student'
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and used_count < max_uses
  for update;

  if not found then
    raise exception 'invalid or expired code';
  end if;

  select * into v_profile
  from public.user_profiles
  where id = auth.uid()
    and role = 'student'
    and active = true;

  if not found then
    raise exception 'student profile not found';
  end if;

  select * into v_membership
  from public.teacher_class_students
  where student_profile_id = auth.uid()
    and status <> 'removed'
  order by created_at desc
  limit 1;

  insert into public.parent_student_links (
    parent_id,
    student_profile_id,
    student_membership_id,
    teacher_id,
    class_id,
    relationship,
    source,
    status,
    teacher_review_status
  )
  values (
    v_code.parent_id,
    auth.uid(),
    case when found then v_membership.id else null end,
    case when found then v_membership.teacher_id else null end,
    case when found then v_membership.class_id else null end,
    v_relationship,
    'student_code',
    case when found then 'pending' else 'active' end,
    case when found then 'pending' else 'not_required' end
  )
  on conflict (parent_id, student_profile_id) where status in ('pending', 'active')
  do update set
    relationship = excluded.relationship,
    student_membership_id = excluded.student_membership_id,
    teacher_id = excluded.teacher_id,
    class_id = excluded.class_id,
    status = excluded.status,
    teacher_review_status = excluded.teacher_review_status,
    updated_at = now()
  returning * into v_row;

  update public.parent_link_codes
  set used_count = used_count + 1,
      status = case when used_count + 1 >= max_uses then 'used' else status end,
      updated_at = now()
  where id = v_code.id;

  return v_row;
end;
$$;

create or replace function public.review_parent_student_link(p_link_id uuid, p_review text)
returns public.parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review text := lower(coalesce(nullif(trim(p_review), ''), ''));
  v_row public.parent_student_links%rowtype;
begin
  if not public.current_user_is_teacher() then
    raise exception 'only teachers can review parent links';
  end if;

  if v_review not in ('approved', 'rejected') then
    raise exception 'invalid review status';
  end if;

  update public.parent_student_links
  set teacher_review_status = v_review,
      status = case when v_review = 'approved' then 'active' else 'rejected' end,
      updated_at = now()
  where id = p_link_id
    and teacher_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'parent link not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.revoke_parent_student_link(p_link_id uuid)
returns public.parent_student_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.parent_student_links%rowtype;
begin
  update public.parent_student_links
  set status = 'revoked',
      updated_at = now()
  where id = p_link_id
    and (
      parent_id = auth.uid()
      or student_profile_id = auth.uid()
      or teacher_id = auth.uid()
    )
  returning * into v_row;

  if not found then
    raise exception 'parent link not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_parent_account_code() to authenticated;
grant execute on function public.create_teacher_parent_code(uuid, integer) to authenticated;
grant execute on function public.connect_parent_with_teacher_code(text, text) to authenticated;
grant execute on function public.connect_student_with_parent_code(text, text) to authenticated;
grant execute on function public.review_parent_student_link(uuid, text) to authenticated;
grant execute on function public.revoke_parent_student_link(uuid) to authenticated;

-- ----------------------------------------------------------
-- Mesajlasma
-- ----------------------------------------------------------
create table if not exists public.panel_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('teacher', 'student', 'parent')),
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  related_student_profile_id uuid references public.user_profiles(id) on delete set null,
  class_id uuid references public.teacher_classes(id) on delete set null,
  subject text not null default '',
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'read', 'archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  sender_deleted_at timestamptz,
  recipient_deleted_at timestamptz
);

alter table public.panel_messages
  add column if not exists sender_deleted_at timestamptz,
  add column if not exists recipient_deleted_at timestamptz;

create index if not exists idx_panel_messages_recipient on public.panel_messages (recipient_id, status, created_at desc);
create index if not exists idx_panel_messages_sender on public.panel_messages (sender_id, created_at desc);
create index if not exists idx_panel_messages_student on public.panel_messages (related_student_profile_id, created_at desc);

alter table public.panel_messages enable row level security;
grant select, insert, update, delete on public.panel_messages to authenticated;

drop policy if exists "panel_messages read own" on public.panel_messages;
create policy "panel_messages read own"
on public.panel_messages
for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "panel_messages insert own" on public.panel_messages;
create policy "panel_messages insert own"
on public.panel_messages
for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists "panel_messages update recipient" on public.panel_messages;
drop policy if exists "panel_messages update own side" on public.panel_messages;
create policy "panel_messages update own side"
on public.panel_messages
for update
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid())
with check (sender_id = auth.uid() or recipient_id = auth.uid());

-- ----------------------------------------------------------
-- Velinin bagli ogrencisinin okul verilerini okuyabilmesi
-- ----------------------------------------------------------
drop policy if exists "user_profiles parent teacher student read related" on public.user_profiles;
create policy "user_profiles parent teacher student read related"
on public.user_profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.parent_student_links l
    where l.status in ('pending', 'active')
      and (
        (l.parent_id = auth.uid() and user_profiles.id in (l.student_profile_id, l.teacher_id))
        or (l.student_profile_id = auth.uid() and user_profiles.id = l.parent_id)
        or (l.teacher_id = auth.uid() and user_profiles.id in (l.parent_id, l.student_profile_id))
      )
  )
);

drop policy if exists "teacher_class_students parent read linked" on public.teacher_class_students;
create policy "teacher_class_students parent read linked"
on public.teacher_class_students
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.status = 'active'
      and l.student_membership_id = teacher_class_students.id
  )
);

drop policy if exists "teacher_classes parent read linked" on public.teacher_classes;
create policy "teacher_classes parent read linked"
on public.teacher_classes
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.status = 'active'
      and l.class_id = teacher_classes.id
  )
);

drop policy if exists "teacher_assignments parent read linked" on public.teacher_assignments;
create policy "teacher_assignments parent read linked"
on public.teacher_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.status = 'active'
      and l.class_id = teacher_assignments.class_id
      and (
        teacher_assignments.target_type = 'class'
        or l.student_membership_id = any(teacher_assignments.target_student_ids)
      )
  )
);

drop policy if exists "teacher_assignment_progress parent read linked" on public.teacher_assignment_progress;
create policy "teacher_assignment_progress parent read linked"
on public.teacher_assignment_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.status = 'active'
      and l.student_membership_id = teacher_assignment_progress.student_membership_id
  )
);

drop policy if exists "teacher_merit_events parent read linked" on public.teacher_merit_events;
create policy "teacher_merit_events parent read linked"
on public.teacher_merit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_student_links l
    where l.parent_id = auth.uid()
      and l.status = 'active'
      and l.student_membership_id = teacher_merit_events.student_membership_id
  )
);

do $$
begin
  if to_regclass('public.user_content_progress') is not null then
    execute 'drop policy if exists "user_content_progress parent read linked students" on public.user_content_progress';
    execute $policy$
      create policy "user_content_progress parent read linked students"
      on public.user_content_progress
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.parent_student_links l
          where l.parent_id = auth.uid()
            and l.status = 'active'
            and l.student_profile_id = user_content_progress.user_id
        )
      )
    $policy$;
  end if;
end $$;

create or replace function public.touch_teacher_panel_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_parent_link_codes_updated_at on public.parent_link_codes;
create trigger trg_parent_link_codes_updated_at
before update on public.parent_link_codes
for each row execute function public.touch_teacher_panel_updated_at();

drop trigger if exists trg_parent_student_links_updated_at on public.parent_student_links;
create trigger trg_parent_student_links_updated_at
before update on public.parent_student_links
for each row execute function public.touch_teacher_panel_updated_at();
