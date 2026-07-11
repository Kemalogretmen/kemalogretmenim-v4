-- ==========================================================
-- Kemal Ogretmenim - Content Safety Event Log
-- Supabase SQL Editor icinde calistirin.
-- Uygun olmayan kelime denemelerinde metnin kendisini saklamaz.
-- Edge Function kullanilirsa ham IP yerine yalnizca hash tutulur.
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.content_safety_events (
  id bigint generated always as identity primary key,
  session_id text not null default '',
  user_id uuid references public.user_profiles(id) on delete set null,
  surface text not null default '',
  field_name text not null default '',
  matched_key text not null default '',
  page_path text not null default '',
  page_url text not null default '',
  language text not null default '',
  timezone text not null default '',
  user_agent text not null default '',
  ip_hash text not null default '',
  country_code text not null default '',
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.content_safety_events enable row level security;

drop policy if exists "content safety public insert" on public.content_safety_events;
create policy "content safety public insert"
on public.content_safety_events
for insert
with check (
  coalesce(trim(surface), '') <> ''
  and coalesce(trim(field_name), '') <> ''
);

drop policy if exists "content safety admin read" on public.content_safety_events;
create policy "content safety admin read"
on public.content_safety_events
for select
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'));

drop policy if exists "content safety admin delete" on public.content_safety_events;
create policy "content safety admin delete"
on public.content_safety_events
for delete
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'));

create index if not exists idx_content_safety_created_at on public.content_safety_events (created_at desc);
create index if not exists idx_content_safety_user_id on public.content_safety_events (user_id, created_at desc);
create index if not exists idx_content_safety_session on public.content_safety_events (session_id, created_at desc);
create index if not exists idx_content_safety_page_path on public.content_safety_events (page_path);

grant insert on public.content_safety_events to anon, authenticated;
grant select, delete on public.content_safety_events to authenticated;
grant usage, select on sequence public.content_safety_events_id_seq to anon, authenticated;

create or replace function public.content_safety_normalized_parts(input_value text)
returns table (spaced text, compact text)
language plpgsql
immutable
as $$
declare
  v text := lower(coalesce(input_value, ''));
begin
  v := replace(v, 'ç', 'c');
  v := replace(v, 'ğ', 'g');
  v := replace(v, 'ı', 'i');
  v := replace(v, 'ö', 'o');
  v := replace(v, 'ş', 's');
  v := replace(v, 'ü', 'u');
  v := replace(v, 'â', 'a');
  v := replace(v, 'î', 'i');
  v := replace(v, 'û', 'u');
  v := replace(v, '@', 'a');
  v := replace(v, '4', 'a');
  v := replace(v, '3', 'e');
  v := replace(v, '1', 'i');
  v := replace(v, '!', 'i');
  v := replace(v, '|', 'i');
  v := replace(v, '0', 'o');
  v := replace(v, '5', 's');
  v := replace(v, '$', 's');
  v := replace(v, '7', 't');
  spaced := trim(regexp_replace(v, '[^a-z0-9]+', ' ', 'g'));
  compact := replace(spaced, ' ', '');
  return next;
end;
$$;

create or replace function public.content_safety_has_violation(input_value text)
returns boolean
language plpgsql
immutable
as $$
declare
  parts record;
  term text;
  compact_terms text[] := array[
    'motherfucker', 'sonofabitch', 'bullshit', 'asshole', 'dickhead', 'shithead',
    'fuckface', 'fuckyou', 'fucker', 'fucking', 'fuck', 'bastard', 'bitch', 'slut',
    'whore', 'pussy', 'dick', 'cock', 'wanker', 'idiot', 'stupid', 'moron',
    'retard', 'retarded', 'loser', 'scumbag',
    'aminakoyim', 'aminakodum', 'aminakoy', 'aminakod', 'amcik', 'amcuk',
    'orospu', 'oruspu', 'siktir', 'sikerim', 'sikeyim', 'sikik', 'sikim',
    'sokuk', 'gotveren', 'gotun', 'yarrak', 'yarak', 'yarraq', 'pezevenk',
    'kahpe', 'kaltak', 'gerizekali', 'gerizekalli', 'salak', 'aptal', 'ibne',
    'pic', 'pich', 'pust', 'haysiyetsiz', 'serefsiz', 'asagilik'
  ];
  token_terms text[] := array['amk', 'aq', 'got', 'bok', 'mal', 'damn', 'crap'];
begin
  select * into parts from public.content_safety_normalized_parts(input_value);
  if coalesce(parts.compact, '') = '' then
    return false;
  end if;

  foreach term in array compact_terms loop
    if parts.compact like '%' || term || '%' then
      return true;
    end if;
  end loop;

  foreach term in array token_terms loop
    if parts.compact = term or parts.spaced ~ ('(^| )' || term || '( |$)') then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function public.content_safety_reject_if_violation(field_label text, field_value text)
returns void
language plpgsql
as $$
begin
  if public.content_safety_has_violation(field_value) then
    raise exception 'Bu alanda ahlak kurallarına uygun olmayan kelime veya ifade kullanılamaz.'
      using errcode = '22023',
            detail = coalesce(field_label, 'text_field');
  end if;
end;
$$;

create or replace function public.content_safety_guard_trigger()
returns trigger
language plpgsql
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  if tg_table_name = 'user_profiles' then
    perform public.content_safety_reject_if_violation('ad', row_data ->> 'first_name');
    perform public.content_safety_reject_if_violation('soyad', row_data ->> 'last_name');
    perform public.content_safety_reject_if_violation('ad_soyad', row_data ->> 'full_name');
    perform public.content_safety_reject_if_violation('okul_adi', row_data ->> 'school_name');
  elsif tg_table_name = 'panel_messages' then
    perform public.content_safety_reject_if_violation('mesaj_konusu', row_data ->> 'subject');
    perform public.content_safety_reject_if_violation('mesaj_metni', row_data ->> 'body');
  elsif tg_table_name = 'teacher_classes' then
    perform public.content_safety_reject_if_violation('sinif_adi', row_data ->> 'name');
    perform public.content_safety_reject_if_violation('sube', row_data ->> 'branch');
  elsif tg_table_name = 'teacher_class_students' then
    perform public.content_safety_reject_if_violation('ogrenci_ad_soyad', row_data ->> 'display_name');
    perform public.content_safety_reject_if_violation('ogrenci_no', row_data ->> 'student_no');
  elsif tg_table_name = 'teacher_assignments' then
    perform public.content_safety_reject_if_violation('odev_basligi', row_data ->> 'title');
    perform public.content_safety_reject_if_violation('odev_yonerge', row_data ->> 'instructions');
  elsif tg_table_name = 'sonuclar' then
    perform public.content_safety_reject_if_violation('ogrenci_adi', row_data ->> 'ad');
    perform public.content_safety_reject_if_violation('ogrenci_soyadi', row_data ->> 'soyad');
    perform public.content_safety_reject_if_violation('sube', row_data ->> 'sube');
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.user_profiles') is not null then
    drop trigger if exists trg_content_safety_user_profiles on public.user_profiles;
    create trigger trg_content_safety_user_profiles
    before insert or update of first_name, last_name, full_name, school_name on public.user_profiles
    for each row execute function public.content_safety_guard_trigger();
  end if;

  if to_regclass('public.panel_messages') is not null then
    drop trigger if exists trg_content_safety_panel_messages on public.panel_messages;
    create trigger trg_content_safety_panel_messages
    before insert or update of subject, body on public.panel_messages
    for each row execute function public.content_safety_guard_trigger();
  end if;

  if to_regclass('public.teacher_classes') is not null then
    drop trigger if exists trg_content_safety_teacher_classes on public.teacher_classes;
    create trigger trg_content_safety_teacher_classes
    before insert or update of name, branch on public.teacher_classes
    for each row execute function public.content_safety_guard_trigger();
  end if;

  if to_regclass('public.teacher_class_students') is not null then
    drop trigger if exists trg_content_safety_teacher_class_students on public.teacher_class_students;
    create trigger trg_content_safety_teacher_class_students
    before insert or update of display_name, student_no on public.teacher_class_students
    for each row execute function public.content_safety_guard_trigger();
  end if;

  if to_regclass('public.teacher_assignments') is not null then
    drop trigger if exists trg_content_safety_teacher_assignments on public.teacher_assignments;
    create trigger trg_content_safety_teacher_assignments
    before insert or update of title, instructions on public.teacher_assignments
    for each row execute function public.content_safety_guard_trigger();
  end if;

  if to_regclass('public.sonuclar') is not null then
    drop trigger if exists trg_content_safety_sonuclar on public.sonuclar;
    create trigger trg_content_safety_sonuclar
    before insert or update of ad, soyad, sube on public.sonuclar
    for each row execute function public.content_safety_guard_trigger();
  end if;
end;
$$;

grant execute on function public.content_safety_normalized_parts(text) to anon, authenticated;
grant execute on function public.content_safety_has_violation(text) to anon, authenticated;
grant execute on function public.content_safety_reject_if_violation(text, text) to anon, authenticated;

create or replace function public.delete_old_content_safety_events(days_to_keep integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  keep_days integer := greatest(7, least(coalesce(days_to_keep, 90), 365));
begin
  if not public.current_admin_has_permission('site_admin_dashboard') then
    raise exception 'permission denied';
  end if;

  delete from public.content_safety_events
  where created_at < now() - make_interval(days => keep_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.delete_old_content_safety_events(integer) to authenticated;
