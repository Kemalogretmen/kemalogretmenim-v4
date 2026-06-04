-- Kemal Öğretmenim mobil uygulama push altyapısı
-- Supabase SQL Editor içinde bir kez çalıştır.

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null default '',
  device_id text not null,
  device_name text not null default '',
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_device_push_tokens_user on public.device_push_tokens (user_id, active);
create index if not exists idx_device_push_tokens_token on public.device_push_tokens (expo_push_token);

alter table public.device_push_tokens enable row level security;
grant select, insert, update, delete on public.device_push_tokens to authenticated;

drop policy if exists "device_push_tokens manage own" on public.device_push_tokens;
create policy "device_push_tokens manage own"
on public.device_push_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.mobile_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('panel_message', 'teacher_assignment')),
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_mobile_notification_events_pending
  on public.mobile_notification_events (status, created_at)
  where status = 'pending';

alter table public.mobile_notification_events enable row level security;
grant select, insert, update on public.mobile_notification_events to service_role;

create or replace function public.enqueue_panel_message_mobile_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mobile_notification_events (
    event_type,
    recipient_id,
    title,
    body,
    data
  ) values (
    'panel_message',
    new.recipient_id,
    coalesce(nullif(new.subject, ''), 'Yeni mesaj'),
    left(coalesce(new.body, ''), 180),
    jsonb_build_object(
      'kind', 'panel_message',
      'messageId', new.id,
      'senderId', new.sender_id,
      'classId', new.class_id,
      'relatedStudentProfileId', new.related_student_profile_id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_panel_messages_mobile_notification on public.panel_messages;
create trigger trg_panel_messages_mobile_notification
after insert on public.panel_messages
for each row
execute function public.enqueue_panel_message_mobile_notification();

create or replace function public.enqueue_assignment_mobile_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_record record;
  target_student_ids uuid[] := coalesce(new.target_student_ids, '{}'::uuid[]);
begin
  if new.status <> 'active' then
    return new;
  end if;

  for student_record in
    select distinct s.student_profile_id
    from public.teacher_class_students s
    where s.class_id = new.class_id
      and s.status <> 'removed'
      and s.student_profile_id is not null
      and (
        new.target_type = 'class'
        or s.id = any(target_student_ids)
      )
  loop
    insert into public.mobile_notification_events (
      event_type,
      recipient_id,
      title,
      body,
      data
    ) values (
      'teacher_assignment',
      student_record.student_profile_id,
      'Yeni ödev',
      left(new.title, 180),
      jsonb_build_object(
        'kind', 'teacher_assignment',
        'assignmentId', new.id,
        'classId', new.class_id,
        'contentType', new.content_type
      )
    );

    insert into public.mobile_notification_events (
      event_type,
      recipient_id,
      title,
      body,
      data
    )
    select
      'teacher_assignment',
      l.parent_id,
      'Çocuğun için yeni ödev',
      left(new.title, 180),
      jsonb_build_object(
        'kind', 'teacher_assignment',
        'assignmentId', new.id,
        'classId', new.class_id,
        'studentProfileId', student_record.student_profile_id,
        'contentType', new.content_type
      )
    from public.parent_student_links l
    where l.student_profile_id = student_record.student_profile_id
      and l.status = 'active';
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_teacher_assignments_mobile_notification on public.teacher_assignments;
create trigger trg_teacher_assignments_mobile_notification
after insert on public.teacher_assignments
for each row
execute function public.enqueue_assignment_mobile_notifications();
