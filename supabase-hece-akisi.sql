-- Hece Akisi: public/admin etkinlikleri, ogretmen etkinlikleri ve guvenli sonuc kaydi.

create table if not exists public.syllable_streams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  owner_type text not null check (owner_type in ('admin', 'teacher')),
  title text not null check (char_length(trim(title)) between 2 and 140),
  description text not null default '',
  fixed_unit text not null check (char_length(trim(fixed_unit)) between 1 and 20),
  falling_units text[] not null,
  mode text not null default 'manual' check (mode in ('automatic', 'manual')),
  interval_ms integer not null default 2000 check (interval_ms between 300 and 10000),
  grade_level smallint not null default 1 check (grade_level between 1 and 8),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllable_stream_units_count check (cardinality(falling_units) between 1 and 200)
);

create table if not exists public.syllable_stream_results (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.syllable_streams(id) on delete cascade,
  owner_id uuid not null,
  teacher_id uuid,
  student_membership_id uuid,
  agenda_student_id text,
  student_profile_id uuid,
  reader_name text not null check (char_length(trim(reader_name)) between 2 and 120),
  mode text not null check (mode in ('automatic', 'manual')),
  elapsed_ms integer not null check (elapsed_ms between 250 and 3600000),
  item_count integer not null check (item_count between 1 and 200),
  words_per_minute numeric(8,2) not null check (words_per_minute > 0),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists syllable_streams_public_idx
  on public.syllable_streams (status, visibility, grade_level, created_at desc);
create index if not exists syllable_streams_owner_idx
  on public.syllable_streams (owner_id, created_at desc);
create index if not exists syllable_stream_results_stream_idx
  on public.syllable_stream_results (stream_id, completed_at desc);
create index if not exists syllable_stream_results_teacher_idx
  on public.syllable_stream_results (teacher_id, completed_at desc);
create index if not exists syllable_stream_results_student_idx
  on public.syllable_stream_results (student_profile_id, completed_at desc);

create or replace function public.syllable_stream_admin_allowed()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_admin_has_any_permission(
      array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme']::text[]
    ),
    false
  );
$$;

create or replace function public.syllable_stream_teacher_allowed()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
      and coalesce(p.approval_status, 'active') = 'active'
      and coalesce(p.active, true) = true
  );
$$;

create or replace function public.touch_syllable_stream_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists syllable_streams_touch_updated_at on public.syllable_streams;
create trigger syllable_streams_touch_updated_at
before update on public.syllable_streams
for each row execute function public.touch_syllable_stream_updated_at();

alter table public.syllable_streams enable row level security;
alter table public.syllable_stream_results enable row level security;

drop policy if exists "syllable streams public read" on public.syllable_streams;
create policy "syllable streams public read"
on public.syllable_streams for select
using (
  (status = 'published' and visibility = 'public')
  or owner_id = auth.uid()
  or public.syllable_stream_admin_allowed()
);

drop policy if exists "syllable streams teacher insert" on public.syllable_streams;
create policy "syllable streams teacher insert"
on public.syllable_streams for insert to authenticated
with check (
  owner_id = auth.uid()
  and owner_type = 'teacher'
  and visibility = 'private'
  and public.syllable_stream_teacher_allowed()
);

drop policy if exists "syllable streams teacher update" on public.syllable_streams;
create policy "syllable streams teacher update"
on public.syllable_streams for update to authenticated
using (
  owner_id = auth.uid()
  and owner_type = 'teacher'
  and public.syllable_stream_teacher_allowed()
)
with check (
  owner_id = auth.uid()
  and owner_type = 'teacher'
  and visibility = 'private'
  and public.syllable_stream_teacher_allowed()
);

drop policy if exists "syllable streams teacher delete" on public.syllable_streams;
create policy "syllable streams teacher delete"
on public.syllable_streams for delete to authenticated
using (
  owner_id = auth.uid()
  and owner_type = 'teacher'
  and public.syllable_stream_teacher_allowed()
);

drop policy if exists "syllable streams admin insert" on public.syllable_streams;
create policy "syllable streams admin insert"
on public.syllable_streams for insert to authenticated
with check (
  owner_id = auth.uid()
  and owner_type = 'admin'
  and public.syllable_stream_admin_allowed()
);

drop policy if exists "syllable streams admin update" on public.syllable_streams;
create policy "syllable streams admin update"
on public.syllable_streams for update to authenticated
using (owner_type = 'admin' and public.syllable_stream_admin_allowed())
with check (owner_type = 'admin' and public.syllable_stream_admin_allowed());

drop policy if exists "syllable streams admin delete" on public.syllable_streams;
create policy "syllable streams admin delete"
on public.syllable_streams for delete to authenticated
using (owner_type = 'admin' and public.syllable_stream_admin_allowed());

drop policy if exists "syllable results owner read" on public.syllable_stream_results;
create policy "syllable results owner read"
on public.syllable_stream_results for select to authenticated
using (
  owner_id = auth.uid()
  or teacher_id = auth.uid()
  or student_profile_id = auth.uid()
  or public.syllable_stream_admin_allowed()
);

drop policy if exists "syllable results owner delete" on public.syllable_stream_results;
create policy "syllable results owner delete"
on public.syllable_stream_results for delete to authenticated
using (
  owner_id = auth.uid()
  or public.syllable_stream_admin_allowed()
);

create or replace function public.record_syllable_stream_result(
  p_stream_id uuid,
  p_elapsed_ms integer,
  p_reader_name text,
  p_student_membership_id uuid default null,
  p_agenda_student_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.syllable_stream_results
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_stream public.syllable_streams%rowtype;
  v_result public.syllable_stream_results%rowtype;
  v_item_count integer;
  v_wpm numeric(8,2);
  v_teacher_id uuid;
  v_student_profile_id uuid;
  v_reader_name text;
begin
  if p_elapsed_ms is null or p_elapsed_ms < 250 or p_elapsed_ms > 3600000 then
    raise exception 'Gecersiz okuma suresi.';
  end if;

  select * into v_stream
  from public.syllable_streams s
  where s.id = p_stream_id
    and (
      (s.status = 'published' and s.visibility = 'public')
      or s.owner_id = auth.uid()
      or public.syllable_stream_admin_allowed()
    );

  if not found then
    raise exception 'Etkinlik bulunamadi veya erisim izni yok.';
  end if;

  v_item_count := cardinality(v_stream.falling_units);
  v_wpm := round((v_item_count::numeric * 60000::numeric) / p_elapsed_ms::numeric, 2);
  v_reader_name := left(trim(p_reader_name), 120);

  if v_stream.owner_type = 'teacher' and v_stream.owner_id = auth.uid() then
    v_teacher_id := auth.uid();

    if p_student_membership_id is not null then
      select left(trim(s.display_name), 120) into v_reader_name
      from public.teacher_class_students s
      where s.id = p_student_membership_id
        and s.teacher_id = auth.uid()
        and coalesce(s.status, 'active') = 'active';

      if not found then
        raise exception 'Secilen ogrenci bu ogretmene ait degil.';
      end if;
    end if;

    if nullif(trim(p_agenda_student_id), '') is not null then
      select left(
        trim(concat_ws(' ', nullif(trim(s->>'firstName'), ''), nullif(trim(s->>'lastName'), ''))),
        120
      ) into v_reader_name
      from public.teacher_agenda_states a,
           jsonb_array_elements(coalesce(a.agenda_state->'students', '[]'::jsonb)) s
      where a.user_id = auth.uid()
        and s->>'id' = trim(p_agenda_student_id);

      if not found then
        raise exception 'Secilen ajanda ogrencisi bulunamadi.';
      end if;
    end if;
  elsif p_student_membership_id is not null or nullif(trim(p_agenda_student_id), '') is not null then
    raise exception 'Ogrenci secimi yalnizca etkinlik sahibi ogretmen tarafindan yapilabilir.';
  end if;

  if auth.uid() is not null and exists (
    select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'student'
  ) then
    v_student_profile_id := auth.uid();
    select left(
      trim(coalesce(nullif(p.full_name, ''), concat_ws(' ', nullif(p.first_name, ''), nullif(p.last_name, '')))),
      120
    ) into v_reader_name
    from public.user_profiles p
    where p.id = auth.uid();
  end if;

  if char_length(coalesce(v_reader_name, '')) < 2 then
    raise exception 'Okuyucu adi gecersiz.';
  end if;

  insert into public.syllable_stream_results (
    stream_id,
    owner_id,
    teacher_id,
    student_membership_id,
    agenda_student_id,
    student_profile_id,
    reader_name,
    mode,
    elapsed_ms,
    item_count,
    words_per_minute,
    metadata
  ) values (
    v_stream.id,
    v_stream.owner_id,
    v_teacher_id,
    p_student_membership_id,
    nullif(left(trim(p_agenda_student_id), 100), ''),
    v_student_profile_id,
    v_reader_name,
    v_stream.mode,
    p_elapsed_ms,
    v_item_count,
    v_wpm,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.record_syllable_stream_result(uuid, integer, text, uuid, text, jsonb) from public;
grant execute on function public.record_syllable_stream_result(uuid, integer, text, uuid, text, jsonb) to anon, authenticated;
grant select on public.syllable_streams to anon, authenticated;
grant insert, update, delete on public.syllable_streams to authenticated;
grant select, delete on public.syllable_stream_results to authenticated;
