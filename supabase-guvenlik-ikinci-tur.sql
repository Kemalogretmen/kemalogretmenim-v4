-- Kemal Ogretmenim - Guvenlik ikinci tur
-- Supabase SQL Editor icinde, mevcut tablolar kurulduktan sonra calistirin.
--
-- Duzeltmeler:
-- 1. updated_at trigger fonksiyonlarina sabit search_path ekler.
-- 2. "USING (true)" / "WITH CHECK (true)" RLS policy'lerini admin yetkilerine baglar.
-- 3. Analitik ve begeni raporu RPC'lerinde yetkisiz authenticated kullanicilara veri dondurmez.

begin;

grant usage on schema public to anon, authenticated;

alter table if exists public.metinler
  add column if not exists oturum_gerekli boolean not null default false,
  add column if not exists gizli boolean not null default false;

alter table if exists public.dokumanlar
  add column if not exists gizli boolean not null default false;

alter table if exists public.user_profiles
  add column if not exists verification_status text not null default 'not_submitted',
  add column if not exists verification_file_path text not null default '',
  add column if not exists verification_file_name text not null default '',
  add column if not exists verification_file_type text not null default '',
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by text not null default '',
  add column if not exists verification_review_note text not null default '';

create table if not exists public.admin_users (
  email text primary key,
  display_name text,
  active boolean not null default true,
  is_owner boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''))
$$;

create or replace function public.current_user_has_panel_profile()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  blocked boolean := false;
begin
  if coalesce(current_email, '') = '' then
    return false;
  end if;

  if to_regclass('public.user_profiles') is null then
    return false;
  end if;

  execute
    'select exists (
      select 1
      from public.user_profiles
      where lower(email) = $1
        and role in (''teacher'', ''student'', ''parent'')
        and not exists (
          select 1
          from public.admin_users au
          where lower(au.email) = $1
            and au.active = true
        )
    )'
  into blocked
  using current_email;

  return coalesce(blocked, false);
end;
$$;

create or replace function public.admin_permission_json_has(permission_json jsonb, permission_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      coalesce(permission_json, '{}'::jsonb) as permissions,
      coalesce(permission_key, '') as requested_key
  )
  select case
    when requested_key = '' then false
    when jsonb_typeof(permissions) = 'array' then
      permissions ? requested_key
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ? 'dokuman_yonetimi'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ? 'okuma_editor'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ? 'oyunlar_admin'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ? 'exam_admin'
      )
    when jsonb_typeof(permissions) = 'object' then
      permissions ->> requested_key = 'true'
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ->> 'dokuman_yonetimi' = 'true'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ->> 'okuma_editor' = 'true'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ->> 'oyunlar_admin' = 'true'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ->> 'exam_admin' = 'true'
      )
    else false
  end
  from normalized
$$;

create or replace function public.current_admin_has_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  has_owner boolean := false;
  allowed boolean := false;
begin
  if coalesce(current_email, '') = '' then
    return false;
  end if;

  if public.current_user_has_panel_profile() then
    return false;
  end if;

  select exists (
    select 1
    from public.admin_users
    where lower(email) = current_email
      and active = true
      and (
        is_owner = true
        or public.admin_permission_json_has(permissions, permission_key)
      )
  )
  into allowed;

  if allowed then
    return true;
  end if;

  select exists (
    select 1
    from public.admin_users
    where active = true
      and is_owner = true
  )
  into has_owner;

  if not has_owner then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.current_admin_has_any_permission(permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(public.current_admin_has_permission(permission_key)), false)
  from unnest(coalesce(permission_keys, array[]::text[])) as p(permission_key)
$$;

grant execute on function public.current_admin_email() to anon, authenticated;
grant execute on function public.current_user_has_panel_profile() to anon, authenticated;
grant execute on function public.admin_permission_json_has(jsonb, text) to anon, authenticated;
grant execute on function public.current_admin_has_permission(text) to anon, authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to anon, authenticated;

create or replace function public.touch_menu_ogeler_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create or replace function public.touch_teacher_panel_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Site settings
drop policy if exists "site_settings auth manage" on public.site_settings;
create policy "site_settings auth manage"
on public.site_settings
for all
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'))
with check (
  key = 'site_content'
  and public.current_admin_has_permission('site_admin_dashboard')
);

-- Okuma metinleri
drop policy if exists "metinler public read active" on public.metinler;
create policy "metinler public read active"
on public.metinler
for select
using (aktif = true);

drop policy if exists "metinler auth manage" on public.metinler;
drop policy if exists "metinler auth read all" on public.metinler;
create policy "metinler auth read all"
on public.metinler
for select
to authenticated
using (
  (aktif = true)
  or
  public.current_admin_has_any_permission(array[
    'okuma_metinleri',
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ])
);

drop policy if exists "metinler auth insert" on public.metinler;
create policy "metinler auth insert"
on public.metinler
for insert
to authenticated
with check (public.current_admin_has_permission('okuma_metni_ekleme'));

drop policy if exists "metinler auth update" on public.metinler;
create policy "metinler auth update"
on public.metinler
for update
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'))
with check (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "metinler auth delete" on public.metinler;
create policy "metinler auth delete"
on public.metinler
for delete
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "sorular public read" on public.sorular;
create policy "sorular public read"
on public.sorular
for select
using (
  exists (
    select 1
    from public.metinler m
    where m.id = sorular.metin_id
      and m.aktif = true
  )
);

drop policy if exists "sorular auth manage" on public.sorular;
drop policy if exists "sorular auth read all" on public.sorular;
create policy "sorular auth read all"
on public.sorular
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'okuma_metinleri',
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ])
);

drop policy if exists "sorular auth insert" on public.sorular;
create policy "sorular auth insert"
on public.sorular
for insert
to authenticated
with check (public.current_admin_has_permission('okuma_metni_ekleme'));

drop policy if exists "sorular auth update" on public.sorular;
create policy "sorular auth update"
on public.sorular
for update
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'))
with check (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "sorular auth delete" on public.sorular;
create policy "sorular auth delete"
on public.sorular
for delete
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "secenekler public read" on public.secenekler;
create policy "secenekler public read"
on public.secenekler
for select
using (
  exists (
    select 1
    from public.sorular q
    join public.metinler m on m.id = q.metin_id
    where q.id = secenekler.soru_id
      and m.aktif = true
  )
);

drop policy if exists "secenekler auth manage" on public.secenekler;
drop policy if exists "secenekler auth read all" on public.secenekler;
create policy "secenekler auth read all"
on public.secenekler
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'okuma_metinleri',
    'okuma_metni_ekleme',
    'okuma_metni_duzenleme'
  ])
);

drop policy if exists "secenekler auth insert" on public.secenekler;
create policy "secenekler auth insert"
on public.secenekler
for insert
to authenticated
with check (public.current_admin_has_permission('okuma_metni_ekleme'));

drop policy if exists "secenekler auth update" on public.secenekler;
create policy "secenekler auth update"
on public.secenekler
for update
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'))
with check (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "secenekler auth delete" on public.secenekler;
create policy "secenekler auth delete"
on public.secenekler
for delete
to authenticated
using (public.current_admin_has_permission('okuma_metni_duzenleme'));

drop policy if exists "sonuclar insert for public" on public.sonuclar;
create policy "sonuclar insert for public"
on public.sonuclar
for insert
with check (
  coalesce(trim(ad), '') <> ''
  and coalesce(trim(soyad), '') <> ''
  and sinif between 1 and 12
  and coalesce(trim(sube), '') <> ''
);

drop policy if exists "sonuclar auth read" on public.sonuclar;
create policy "sonuclar auth read"
on public.sonuclar
for select
to authenticated
using (
  public.current_admin_has_any_permission(array[
    'okuma_sonuclari',
    'okuma_sonuclari_duzenleme',
    'okuma_karne'
  ])
);

drop policy if exists "sonuclar auth delete" on public.sonuclar;
create policy "sonuclar auth delete"
on public.sonuclar
for delete
to authenticated
using (public.current_admin_has_permission('okuma_sonuclari_duzenleme'));

drop policy if exists "sonuclar auth update" on public.sonuclar;
create policy "sonuclar auth update"
on public.sonuclar
for update
to authenticated
using (public.current_admin_has_permission('okuma_sonuclari_duzenleme'))
with check (public.current_admin_has_permission('okuma_sonuclari_duzenleme'));

drop policy if exists "site analytics public insert" on public.site_analytics_events;
create policy "site analytics public insert"
on public.site_analytics_events
for insert
with check (
  view_id is not null
  and session_id is not null
  and coalesce(trim(page_url), '') <> ''
  and coalesce(trim(page_path), '') <> ''
);

drop policy if exists "site analytics auth read" on public.site_analytics_events;
create policy "site analytics auth read"
on public.site_analytics_events
for select
to authenticated
using (public.current_admin_has_permission('site_admin_dashboard'));

-- Dokumanlar ve storage
drop policy if exists "dokumanlar public read active" on public.dokumanlar;
create policy "dokumanlar public read active"
on public.dokumanlar
for select
using (aktif = true);

drop policy if exists "dokumanlar auth manage" on public.dokumanlar;
drop policy if exists "dokumanlar auth read all" on public.dokumanlar;
create policy "dokumanlar auth read all"
on public.dokumanlar
for select
to authenticated
using (
  (aktif = true)
  or
  public.current_admin_has_any_permission(array[
    'dokuman_ekleme',
    'dokuman_duzenleme',
    'dokuman_silme'
  ])
);

drop policy if exists "dokumanlar auth insert" on public.dokumanlar;
create policy "dokumanlar auth insert"
on public.dokumanlar
for insert
to authenticated
with check (public.current_admin_has_permission('dokuman_ekleme'));

drop policy if exists "dokumanlar auth update" on public.dokumanlar;
create policy "dokumanlar auth update"
on public.dokumanlar
for update
to authenticated
using (public.current_admin_has_permission('dokuman_duzenleme'))
with check (public.current_admin_has_permission('dokuman_duzenleme'));

drop policy if exists "dokumanlar auth delete" on public.dokumanlar;
create policy "dokumanlar auth delete"
on public.dokumanlar
for delete
to authenticated
using (public.current_admin_has_permission('dokuman_silme'));

drop policy if exists "dokuman storage auth insert" on storage.objects;
create policy "dokuman storage auth insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_ekleme')
);

drop policy if exists "dokuman storage auth update" on storage.objects;
create policy "dokuman storage auth update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
)
with check (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_duzenleme')
);

drop policy if exists "dokuman storage auth delete" on storage.objects;
create policy "dokuman storage auth delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dokumanlar'
  and public.current_admin_has_permission('dokuman_silme')
);

-- Menu
drop policy if exists "menu_ogeler public read active" on public.menu_ogeler;
create policy "menu_ogeler public read active"
on public.menu_ogeler
for select
to anon, authenticated
using (
  active = true
  or public.current_admin_has_permission('menu_yonetimi')
);

drop policy if exists "menu_ogeler authenticated insert" on public.menu_ogeler;
create policy "menu_ogeler authenticated insert"
on public.menu_ogeler
for insert
to authenticated
with check (public.current_admin_has_permission('menu_yonetimi'));

drop policy if exists "menu_ogeler authenticated update" on public.menu_ogeler;
create policy "menu_ogeler authenticated update"
on public.menu_ogeler
for update
to authenticated
using (public.current_admin_has_permission('menu_yonetimi'))
with check (public.current_admin_has_permission('menu_yonetimi'));

drop policy if exists "menu_ogeler authenticated delete" on public.menu_ogeler;
create policy "menu_ogeler authenticated delete"
on public.menu_ogeler
for delete
to authenticated
using (public.current_admin_has_permission('menu_yonetimi'));

-- Calisma kagitlari
drop policy if exists "calisma kagitlari auth manage" on public.calisma_kagitlari;
create policy "calisma kagitlari auth manage"
on public.calisma_kagitlari
for all
to authenticated
using (public.current_admin_has_permission('calisma_kagidi'))
with check (public.current_admin_has_permission('calisma_kagidi'));

drop policy if exists "calisma alani auth manage" on public.calisma_kagidi_alanlari;
create policy "calisma alani auth manage"
on public.calisma_kagidi_alanlari
for all
to authenticated
using (public.current_admin_has_permission('calisma_kagidi'))
with check (public.current_admin_has_permission('calisma_kagidi'));

drop policy if exists "calisma gonderim auth read" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth read"
on public.calisma_kagidi_gonderimleri
for select
to authenticated
using (public.current_admin_has_permission('calisma_kagidi'));

drop policy if exists "calisma gonderim auth delete" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth delete"
on public.calisma_kagidi_gonderimleri
for delete
to authenticated
using (public.current_admin_has_permission('calisma_kagidi'));

drop policy if exists "calisma gonderim auth update" on public.calisma_kagidi_gonderimleri;
create policy "calisma gonderim auth update"
on public.calisma_kagidi_gonderimleri
for update
to authenticated
using (public.current_admin_has_permission('calisma_kagidi'))
with check (public.current_admin_has_permission('calisma_kagidi'));

-- Icerik reaksiyonlari
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

create or replace function public.get_site_analytics_summary(days integer default 7)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with requested as (
    select greatest(1, least(coalesce(days, 7), 90))::int as days
  ),
  filtered_events as (
    select *
    from public.site_analytics_events
    where public.current_admin_has_permission('site_admin_dashboard')
      and created_at >= now() - make_interval(days => (select days from requested))
  ),
  page_views as (
    select distinct on (view_id)
      view_id,
      session_id,
      page_path,
      page_url,
      nullif(trim(page_title), '') as page_title,
      nullif(trim(referrer_host), '') as referrer_host,
      created_at
    from filtered_events
    where event_type = 'page_view'
    order by view_id, created_at desc
  ),
  page_leaves as (
    select
      view_id,
      max(active_seconds) filter (where active_seconds is not null) as active_seconds,
      max(
        coalesce(
          nullif(event_payload ->> 'open_seconds', '')::numeric,
          active_seconds
        )
      ) as open_seconds
    from filtered_events
    where event_type = 'page_leave'
    group by view_id
  ),
  visits as (
    select
      pv.view_id,
      pv.session_id,
      pv.page_path,
      pv.page_url,
      coalesce(pv.page_title, pv.page_path) as page_title,
      pv.referrer_host,
      pv.created_at,
      coalesce(pl.active_seconds, 0)::numeric(10,2) as active_seconds,
      coalesce(pl.open_seconds, pl.active_seconds, 0)::numeric(10,2) as open_seconds
    from page_views pv
    left join page_leaves pl using (view_id)
  ),
  summary as (
    select
      count(*) as pageviews,
      count(distinct session_id) as sessions,
      round(avg(active_seconds), 1) as avg_active_seconds,
      round(avg(open_seconds), 1) as avg_open_seconds
    from visits
  ),
  top_page as (
    select
      page_path,
      min(page_title) as page_title,
      count(*) as pageviews
    from visits
    group by page_path
    order by pageviews desc, page_path asc
    limit 1
  ),
  daily as (
    select
      to_char(date_trunc('day', created_at at time zone 'Europe/Istanbul'), 'YYYY-MM-DD') as day,
      count(*) as pageviews,
      count(distinct session_id) as sessions
    from visits
    group by 1
    order by 1
  ),
  top_pages as (
    select
      page_path,
      min(page_title) as page_title,
      count(*) as pageviews,
      round(avg(active_seconds), 1) as avg_active_seconds
    from visits
    group by page_path
    order by pageviews desc, page_path asc
    limit 10
  ),
  referrers as (
    select
      coalesce(referrer_host, '') as source,
      count(*) as pageviews
    from visits
    group by 1
    order by pageviews desc, source asc
    limit 10
  ),
  recent as (
    select
      page_title,
      page_path,
      coalesce(referrer_host, '') as referrer_host,
      created_at,
      active_seconds,
      open_seconds
    from visits
    order by created_at desc
    limit 15
  )
  select jsonb_build_object(
    'range_days', (select days from requested),
    'generated_at', now(),
    'summary', jsonb_build_object(
      'pageviews', coalesce((select pageviews from summary), 0),
      'sessions', coalesce((select sessions from summary), 0),
      'avg_active_seconds', coalesce((select avg_active_seconds from summary), 0),
      'avg_open_seconds', coalesce((select avg_open_seconds from summary), 0),
      'top_page',
        coalesce(
          (
            select jsonb_build_object(
              'page_path', page_path,
              'page_title', page_title,
              'pageviews', pageviews
            )
            from top_page
          ),
          '{}'::jsonb
        )
    ),
    'daily',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'day', day,
              'pageviews', pageviews,
              'sessions', sessions
            )
            order by day
          )
          from daily
        ),
        '[]'::jsonb
      ),
    'top_pages',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'page_path', page_path,
              'page_title', page_title,
              'pageviews', pageviews,
              'avg_active_seconds', avg_active_seconds
            )
            order by pageviews desc, page_path asc
          )
          from top_pages
        ),
        '[]'::jsonb
      ),
    'referrers',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'source', source,
              'pageviews', pageviews
            )
            order by pageviews desc, source asc
          )
          from referrers
        ),
        '[]'::jsonb
      ),
    'recent',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'page_title', page_title,
              'page_path', page_path,
              'referrer_host', referrer_host,
              'created_at', created_at,
              'active_seconds', active_seconds,
              'open_seconds', open_seconds
            )
            order by created_at desc
          )
          from recent
        ),
        '[]'::jsonb
      )
  );
$$;

create or replace function public.get_user_profile_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  student_count integer := 0;
  teacher_count integer := 0;
  pending_teacher_count integer := 0;
  total_count integer := 0;
begin
  if not public.current_admin_has_permission('site_admin_dashboard') then
    raise exception 'permission denied';
  end if;

  select
    count(*) filter (where role = 'student'),
    count(*) filter (where role = 'teacher'),
    count(*) filter (where role = 'teacher' and approval_status = 'pending'),
    count(*)
  into student_count, teacher_count, pending_teacher_count, total_count
  from public.user_profiles
  where coalesce(active, true) = true
    and not exists (
      select 1
      from public.admin_users au
      where lower(au.email) = lower(user_profiles.email)
        and au.active = true
    );

  return jsonb_build_object(
    'students', coalesce(student_count, 0),
    'teachers', coalesce(teacher_count, 0),
    'pending_teachers', coalesce(pending_teacher_count, 0),
    'total', coalesce(total_count, 0)
  );
end;
$$;

grant execute on function public.get_content_reaction_report(integer, integer) to authenticated;
grant execute on function public.get_site_analytics_summary(integer) to authenticated;
grant execute on function public.get_user_profile_counts() to authenticated;

do $$
begin
  if to_regclass('public.user_profiles') is not null then
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

commit;
