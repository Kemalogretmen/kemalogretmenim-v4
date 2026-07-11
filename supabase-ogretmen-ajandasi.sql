-- Kemal Ogretmenim - Ogretmen Ajandasi bulut senkron altyapisi
-- Supabase SQL Editor icinde calistirin.
-- Kayitli ve aktif ogretmenler icin ajanda verisini tek satir JSONB olarak saklar.

grant usage on schema public to anon, authenticated;

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
      and approval_status = 'active'
      and active = true
  );
$$;

grant execute on function public.current_user_is_teacher() to authenticated;

create table if not exists public.teacher_agenda_states (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  agenda_state jsonb not null default '{}'::jsonb,
  lesson_planner_state jsonb,
  app_version text not null default 'teacher-agenda-v1',
  storage_bytes integer not null default 0,
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_agenda_states_storage_bytes_check
    check (storage_bytes >= 0 and storage_bytes <= 6291456)
);

create index if not exists idx_teacher_agenda_states_updated_at
on public.teacher_agenda_states (updated_at desc);

create or replace function public.touch_teacher_agenda_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teacher_agenda_states_updated_at on public.teacher_agenda_states;
create trigger trg_teacher_agenda_states_updated_at
before update on public.teacher_agenda_states
for each row
execute function public.touch_teacher_agenda_states_updated_at();

alter table public.teacher_agenda_states enable row level security;

drop policy if exists "teacher agenda read own" on public.teacher_agenda_states;
create policy "teacher agenda read own"
on public.teacher_agenda_states
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "teacher agenda insert own" on public.teacher_agenda_states;
create policy "teacher agenda insert own"
on public.teacher_agenda_states
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_user_is_teacher()
);

drop policy if exists "teacher agenda update own" on public.teacher_agenda_states;
create policy "teacher agenda update own"
on public.teacher_agenda_states
for update
to authenticated
using (
  user_id = auth.uid()
  and public.current_user_is_teacher()
)
with check (
  user_id = auth.uid()
  and public.current_user_is_teacher()
);

drop policy if exists "teacher agenda delete own" on public.teacher_agenda_states;
create policy "teacher agenda delete own"
on public.teacher_agenda_states
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.current_user_is_teacher()
);

grant select, insert, update, delete on public.teacher_agenda_states to authenticated;
