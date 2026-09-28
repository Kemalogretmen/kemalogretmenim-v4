-- Oyun katalogu icin gizlilik dostu populerlik siralamasi.
-- Yalnizca toplu sayim dondurur; kullanici, oturum veya ham olay verisi aciga cikmaz.

begin;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in ('page_view', 'page_leave', 'game_start', 'game_complete'));

create index if not exists idx_site_analytics_game_popularity
  on public.site_analytics_events (page_path, created_at desc)
  where event_type in ('page_view', 'page_leave', 'game_start', 'game_complete');

create or replace function public.get_popular_games(
  days integer default 30,
  limit_count integer default 3
)
returns table (
  game_path text,
  unique_players integer,
  starts integer,
  engaged_plays integer,
  completions integer,
  popularity_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select
      greatest(7, least(coalesce(days, 30), 90))::int as range_days,
      greatest(1, least(coalesce(limit_count, 3), 12))::int as row_limit
  ),
  game_events as (
    select
      page_path as game_path,
      session_id,
      event_type,
      coalesce(active_seconds, 0) as active_seconds
    from public.site_analytics_events
    where created_at >= now() - make_interval(days => (select range_days from requested))
      and page_path like '/oyun/%'
      and page_path not in ('/oyun/oyunlar.html', '/oyun/gorsel-hafiza.html')
      and event_type in ('page_view', 'page_leave', 'game_start', 'game_complete')
  ),
  session_games as (
    select
      game_path,
      session_id,
      bool_or(event_type = 'page_view') as opened,
      bool_or(event_type = 'game_start') as started,
      bool_or(event_type = 'game_complete') as completed,
      bool_or(event_type = 'page_leave' and active_seconds >= 20) as engaged
    from game_events
    group by game_path, session_id
  ),
  ranked as (
    select
      game_path,
      count(*) filter (where opened or started)::integer as unique_players,
      count(*) filter (where started)::integer as starts,
      count(*) filter (where engaged)::integer as engaged_plays,
      count(*) filter (where completed)::integer as completions
    from session_games
    where opened or started
    group by game_path
  )
  select
    game_path,
    unique_players,
    starts,
    engaged_plays,
    completions,
    round((unique_players + starts * 0.25 + engaged_plays * 0.75 + completions * 2)::numeric, 2) as popularity_score
  from ranked
  order by popularity_score desc, engaged_plays desc, unique_players desc, game_path asc
  limit (select row_limit from requested);
$$;

revoke all on function public.get_popular_games(integer, integer) from public;
grant execute on function public.get_popular_games(integer, integer) to anon, authenticated;

commit;
