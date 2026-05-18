-- ==========================================================
-- Kemal Ogretmenim - Icerik Begeni / Begenmeme Altyapisi
-- Supabase SQL Editor icinde calistirin.
-- Dokuman, okuma metni, sinav, calisma kagidi ve oyunlar icin
-- anonim ziyaretci bazli like/dislike kaydi ve admin raporu.
-- ==========================================================

begin;

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

create table if not exists public.content_reactions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text not null,
  visitor_id text not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  title text,
  href text,
  grade text,
  subject text,
  source_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id, visitor_id)
);

alter table public.content_reactions
  add column if not exists content_type text,
  add column if not exists content_id text,
  add column if not exists visitor_id text,
  add column if not exists reaction text,
  add column if not exists title text,
  add column if not exists href text,
  add column if not exists grade text,
  add column if not exists subject text,
  add column if not exists source_label text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_content_reactions_unique
on public.content_reactions (content_type, content_id, visitor_id);

create index if not exists idx_content_reactions_content
on public.content_reactions (content_type, content_id);

create index if not exists idx_content_reactions_reaction
on public.content_reactions (reaction);

create index if not exists idx_content_reactions_updated_at
on public.content_reactions (updated_at desc);

create or replace function public.touch_content_reactions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_reactions_updated_at on public.content_reactions;
create trigger trg_content_reactions_updated_at
before update on public.content_reactions
for each row
execute function public.touch_content_reactions_updated_at();

alter table public.content_reactions enable row level security;

revoke all on public.content_reactions from anon;
revoke all on public.content_reactions from public;
grant select, insert, update, delete on public.content_reactions to authenticated;

drop policy if exists "content reactions auth read" on public.content_reactions;
create policy "content reactions auth read"
on public.content_reactions
for select
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'));

drop policy if exists "content reactions auth manage" on public.content_reactions;
create policy "content reactions auth manage"
on public.content_reactions
for all
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'))
with check (public.current_admin_has_permission('site_admin_dashboard'));

create or replace function public.get_content_reaction_summary(
  input_content_type text,
  input_content_id text,
  input_visitor_id text default ''
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select
      count(*) filter (where reaction = 'like')::integer as likes,
      count(*) filter (where reaction = 'dislike')::integer as dislikes
    from public.content_reactions
    where content_type = lower(trim(input_content_type))
      and content_id = trim(input_content_id)
  ),
  mine as (
    select reaction
    from public.content_reactions
    where content_type = lower(trim(input_content_type))
      and content_id = trim(input_content_id)
      and visitor_id = trim(input_visitor_id)
    limit 1
  )
  select jsonb_build_object(
    'contentType', lower(trim(input_content_type)),
    'contentId', trim(input_content_id),
    'likes', coalesce((select likes from counts), 0),
    'dislikes', coalesce((select dislikes from counts), 0),
    'myReaction', coalesce((select reaction from mine), '')
  );
$$;

create or replace function public.get_content_reaction_summaries(
  content_keys jsonb,
  input_visitor_id text default ''
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with keys as (
    select distinct
      lower(trim(value ->> 'contentType')) as content_type,
      trim(value ->> 'contentId') as content_id
    from jsonb_array_elements(coalesce(content_keys, '[]'::jsonb))
    where coalesce(trim(value ->> 'contentType'), '') <> ''
      and coalesce(trim(value ->> 'contentId'), '') <> ''
  ),
  counts as (
    select
      k.content_type,
      k.content_id,
      count(r.*) filter (where r.reaction = 'like')::integer as likes,
      count(r.*) filter (where r.reaction = 'dislike')::integer as dislikes
    from keys k
    left join public.content_reactions r
      on r.content_type = k.content_type
     and r.content_id = k.content_id
    group by k.content_type, k.content_id
  ),
  mine as (
    select r.content_type, r.content_id, r.reaction
    from public.content_reactions r
    join keys k
      on k.content_type = r.content_type
     and k.content_id = r.content_id
    where r.visitor_id = trim(input_visitor_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'contentType', c.content_type,
    'contentId', c.content_id,
    'likes', coalesce(c.likes, 0),
    'dislikes', coalesce(c.dislikes, 0),
    'myReaction', coalesce(m.reaction, '')
  )), '[]'::jsonb)
  from counts c
  left join mine m
    on m.content_type = c.content_type
   and m.content_id = c.content_id;
$$;

create or replace function public.set_content_reaction(
  input_content_type text,
  input_content_id text,
  input_reaction text,
  input_visitor_id text,
  input_title text default '',
  input_href text default '',
  input_grade text default '',
  input_subject text default '',
  input_source_label text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_type text := lower(trim(input_content_type));
  safe_id text := trim(input_content_id);
  safe_visitor text := trim(input_visitor_id);
  safe_reaction text := lower(trim(coalesce(input_reaction, '')));
begin
  if safe_type = '' or safe_id = '' or safe_visitor = '' then
    raise exception 'content_type, content_id ve visitor_id zorunludur';
  end if;

  if safe_reaction in ('', 'none', 'clear') then
    delete from public.content_reactions
    where content_type = safe_type
      and content_id = safe_id
      and visitor_id = safe_visitor;
  elsif safe_reaction in ('like', 'dislike') then
    insert into public.content_reactions (
      content_type,
      content_id,
      visitor_id,
      reaction,
      title,
      href,
      grade,
      subject,
      source_label
    )
    values (
      safe_type,
      safe_id,
      safe_visitor,
      safe_reaction,
      left(nullif(trim(input_title), ''), 240),
      left(nullif(trim(input_href), ''), 500),
      left(nullif(trim(input_grade), ''), 80),
      left(nullif(trim(input_subject), ''), 120),
      left(nullif(trim(input_source_label), ''), 120)
    )
    on conflict (content_type, content_id, visitor_id)
    do update set
      reaction = excluded.reaction,
      title = coalesce(excluded.title, public.content_reactions.title),
      href = coalesce(excluded.href, public.content_reactions.href),
      grade = coalesce(excluded.grade, public.content_reactions.grade),
      subject = coalesce(excluded.subject, public.content_reactions.subject),
      source_label = coalesce(excluded.source_label, public.content_reactions.source_label),
      updated_at = now();
  else
    raise exception 'reaction like veya dislike olmali';
  end if;

  return public.get_content_reaction_summary(safe_type, safe_id, safe_visitor);
end;
$$;

create or replace function public.get_content_reaction_report(
  days integer default 90,
  limit_count integer default 80
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.content_reactions
    where public.current_admin_has_permission('site_admin_dashboard')
      and updated_at >= now() - make_interval(days => greatest(1, least(coalesce(days, 90), 365)))
  ),
  grouped as (
    select
      content_type,
      content_id,
      max(title) filter (where title is not null) as title,
      max(href) filter (where href is not null) as href,
      max(grade) filter (where grade is not null) as grade,
      max(subject) filter (where subject is not null) as subject,
      max(source_label) filter (where source_label is not null) as source_label,
      count(*) filter (where reaction = 'like')::integer as likes,
      count(*) filter (where reaction = 'dislike')::integer as dislikes,
      count(*)::integer as total,
      max(updated_at) as last_reacted_at
    from scoped
    group by content_type, content_id
  ),
  summary as (
    select
      count(*)::integer as total_reactions,
      count(distinct visitor_id)::integer as visitors,
      count(*) filter (where reaction = 'like')::integer as likes,
      count(*) filter (where reaction = 'dislike')::integer as dislikes,
      count(distinct content_type || ':' || content_id)::integer as content_count
    from scoped
  )
  select jsonb_build_object(
    'summary', coalesce((select to_jsonb(summary) from summary), '{}'::jsonb),
    'topLiked', coalesce((
      select jsonb_agg(to_jsonb(row_data))
      from (
        select *
        from grouped
        order by likes desc, total desc, last_reacted_at desc
        limit greatest(1, least(coalesce(limit_count, 80), 200))
      ) row_data
    ), '[]'::jsonb),
    'topDisliked', coalesce((
      select jsonb_agg(to_jsonb(row_data))
      from (
        select *
        from grouped
        order by dislikes desc, total desc, last_reacted_at desc
        limit greatest(1, least(coalesce(limit_count, 80), 200))
      ) row_data
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(row_data))
      from (
        select
          content_type,
          content_id,
          title,
          href,
          grade,
          subject,
          source_label,
          reaction,
          updated_at
        from scoped
        order by updated_at desc
        limit 40
      ) row_data
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_content_reaction_summary(text, text, text) from public;
revoke all on function public.get_content_reaction_summaries(jsonb, text) from public;
revoke all on function public.set_content_reaction(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.get_content_reaction_report(integer, integer) from public;

grant execute on function public.get_content_reaction_summary(text, text, text) to anon, authenticated;
grant execute on function public.get_content_reaction_summaries(jsonb, text) to anon, authenticated;
grant execute on function public.set_content_reaction(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_content_reaction_report(integer, integer) to authenticated;

commit;
