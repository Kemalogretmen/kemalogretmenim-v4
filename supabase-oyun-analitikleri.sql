-- Kemal Öğretmenim - Oyun Analitikleri
-- Oyun yönetim ekranı için yalnızca toplu, anonim kullanım özeti döndürür.
-- Ham oturum veya ziyaretçi ayrıntıları yönetim arayüzüne verilmez.

begin;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in ('page_view', 'page_leave', 'game_start', 'game_complete'));

create index if not exists idx_site_analytics_game_dashboard
  on public.site_analytics_events (page_path, created_at desc, event_type)
  where page_path like '/oyun/%';

create or replace function public.get_game_analytics_summary(days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select greatest(1, least(coalesce(days, 30), 90))::int as range_days
  ),
  game_events as (
    select
      case
        when split_part(page_path, '?', 1) = '/oyun/iframe-oyun.html' then page_path
        else split_part(page_path, '?', 1)
      end as game_path,
      view_id,
      session_id,
      event_type,
      nullif(trim(page_title), '') as page_title,
      active_seconds,
      coalesce(event_payload ->> 'open_seconds', '') as open_seconds_raw,
      lower(coalesce(event_payload ->> 'source', '')) as source,
      created_at
    from public.site_analytics_events
    where public.current_admin_has_any_permission(array['site_admin_dashboard', 'oyun_ekleme'])
      and created_at >= now() - make_interval(days => (select range_days from requested))
      and split_part(page_path, '?', 1) like '/oyun/%'
      and split_part(page_path, '?', 1) not in ('/oyun/oyunlar.html', '/oyun/gorsel-hafiza.html')
      and event_type in ('page_view', 'page_leave', 'game_start', 'game_complete')
  ),
  page_views as (
    select distinct on (view_id)
      game_path,
      view_id,
      session_id,
      page_title,
      created_at
    from game_events
    where event_type = 'page_view'
    order by view_id, created_at desc
  ),
  page_leaves as (
    select
      view_id,
      max(active_seconds) filter (where active_seconds is not null) as active_seconds,
      max(case
        when length(open_seconds_raw) <= 24
          and open_seconds_raw ~ '^[0-9]+([.][0-9]+)?$'
        then least(open_seconds_raw::numeric, 99999999.99)
      end) as open_seconds
    from game_events
    where event_type = 'page_leave'
    group by view_id
  ),
  visits as (
    select
      pv.game_path,
      pv.view_id,
      pv.session_id,
      coalesce(pv.page_title, pv.game_path) as page_title,
      coalesce(pl.active_seconds, 0)::numeric(10,2) as active_seconds,
      coalesce(pl.open_seconds, pl.active_seconds, 0)::numeric(10,2) as open_seconds
    from page_views pv
    left join page_leaves pl using (view_id)
  ),
  actions as (
    select
      game_path,
      count(*) filter (where event_type = 'game_start' and source in ('catalog', 'popular_games')) as catalog_clicks,
      count(distinct session_id) filter (where event_type = 'game_start') as started_sessions,
      count(distinct session_id) filter (where event_type = 'game_complete') as completed_sessions
    from game_events
    group by game_path
  ),
  games as (
    select
      v.game_path,
      min(v.page_title) as page_title,
      count(*)::integer as opens,
      count(distinct v.session_id)::integer as unique_players,
      coalesce(a.catalog_clicks, 0)::integer as catalog_clicks,
      coalesce(a.started_sessions, 0)::integer as started_sessions,
      coalesce(a.completed_sessions, 0)::integer as completed_sessions,
      count(*) filter (where v.active_seconds >= 20)::integer as engaged_visits,
      round(avg(nullif(v.active_seconds, 0)), 1) as avg_active_seconds,
      round(sum(v.active_seconds), 1) as total_active_seconds
    from visits v
    left join actions a using (game_path)
    group by v.game_path, a.catalog_clicks, a.started_sessions, a.completed_sessions
  ),
  summary as (
    select
      count(*)::integer as game_count,
      coalesce(sum(opens), 0)::integer as opens,
      (select count(distinct session_id)::integer from visits) as unique_players,
      coalesce(sum(catalog_clicks), 0)::integer as catalog_clicks,
      coalesce(sum(started_sessions), 0)::integer as started_sessions,
      coalesce(sum(completed_sessions), 0)::integer as completed_sessions,
      round(avg(nullif(avg_active_seconds, 0)), 1) as avg_active_seconds,
      round(sum(total_active_seconds), 1) as total_active_seconds
    from games
  )
  select jsonb_build_object(
    'range_days', (select range_days from requested),
    'generated_at', now(),
    'summary', jsonb_build_object(
      'game_count', coalesce((select game_count from summary), 0),
      'opens', coalesce((select opens from summary), 0),
      'unique_players', coalesce((select unique_players from summary), 0),
      'catalog_clicks', coalesce((select catalog_clicks from summary), 0),
      'started_sessions', coalesce((select started_sessions from summary), 0),
      'completed_sessions', coalesce((select completed_sessions from summary), 0),
      'avg_active_seconds', coalesce((select avg_active_seconds from summary), 0),
      'total_active_seconds', coalesce((select total_active_seconds from summary), 0)
    ),
    'games', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'game_path', game_path,
            'page_title', page_title,
            'opens', opens,
            'unique_players', unique_players,
            'catalog_clicks', catalog_clicks,
            'started_sessions', started_sessions,
            'completed_sessions', completed_sessions,
            'engaged_visits', engaged_visits,
            'avg_active_seconds', coalesce(avg_active_seconds, 0),
            'total_active_seconds', coalesce(total_active_seconds, 0)
          )
          order by opens desc, unique_players desc, game_path asc
        )
        from games
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.get_game_analytics_summary(integer) from public;
revoke all on function public.get_game_analytics_summary(integer) from anon;
grant execute on function public.get_game_analytics_summary(integer) to authenticated;

commit;
