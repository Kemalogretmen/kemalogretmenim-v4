-- ==========================================================
-- Kemal Ogretmenim - Ucretsiz ve Uzun Vadeli Mimari (v1)
-- Supabase SQL Editor icinde calistirin.
-- Bu script:
-- 1. site_settings tablosunu kurar
-- 2. hizli okuma tablolarini olusturur / genisletir
-- 3. gerekli RLS politikalarini ekler
-- 4. anonim ogrenci akislarini, giris yapmis ogretmen yonetimini destekler
-- ==========================================================

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

-- ----------------------------------------------------------
-- SITE SETTINGS
-- ----------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read"
on public.site_settings
for select
using (key = 'site_content');

drop policy if exists "site_settings auth manage" on public.site_settings;
create policy "site_settings auth manage"
on public.site_settings
for all
to authenticated
using (true)
with check (true);

insert into public.site_settings (key, value_json)
values ('site_content', '{}'::jsonb)
on conflict (key) do nothing;

-- ----------------------------------------------------------
-- OKUMA METINLERI
-- ----------------------------------------------------------
create table if not exists public.metinler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  baslik_stil_json jsonb not null default '{}'::jsonb,
  icerik text,
  icerik_html text,
  plain_text text,
  sinif integer,
  siniflar integer[] not null default '{}',
  aktif boolean not null default true,
  goruntuleme_modu text not null default 'tam',
  hedef_hiz integer not null default 80,
  kelime_ms integer not null default 500,
  tikla_mod boolean not null default false,
  yazi_tipi text not null default 'nunito',
  yazi_boyutu integer not null default 18,
  yazi_rengi text not null default '#1A1040',
  kelime_sayisi integer not null default 0,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.metinler
  add column if not exists baslik_stil_json jsonb not null default '{}'::jsonb,
  add column if not exists icerik_html text,
  add column if not exists plain_text text,
  add column if not exists siniflar integer[] not null default '{}',
  add column if not exists aktif boolean not null default true,
  add column if not exists goruntuleme_modu text not null default 'tam',
  add column if not exists hedef_hiz integer not null default 80,
  add column if not exists kelime_ms integer not null default 500,
  add column if not exists tikla_mod boolean not null default false,
  add column if not exists yazi_tipi text not null default 'nunito',
  add column if not exists yazi_boyutu integer not null default 18,
  add column if not exists yazi_rengi text not null default '#1A1040',
  add column if not exists kelime_sayisi integer not null default 0,
  add column if not exists olusturma_tarihi timestamptz not null default now();

update public.metinler
set siniflar = array[sinif]
where (siniflar is null or cardinality(siniflar) = 0) and sinif is not null;

update public.metinler
set plain_text = coalesce(nullif(trim(plain_text), ''), icerik)
where coalesce(nullif(trim(plain_text), ''), '') = '';

alter table public.metinler enable row level security;

drop policy if exists "metinler public read active" on public.metinler;
create policy "metinler public read active"
on public.metinler
for select
using (aktif = true);

drop policy if exists "metinler auth manage" on public.metinler;
create policy "metinler auth manage"
on public.metinler
for all
to authenticated
using (true)
with check (true);

create index if not exists idx_metinler_aktif on public.metinler (aktif);
create index if not exists idx_metinler_olusturma on public.metinler (olusturma_tarihi desc);
create index if not exists idx_metinler_siniflar on public.metinler using gin (siniflar);

grant select, insert, update, delete on public.metinler to authenticated;
grant select on public.metinler to anon;

-- ----------------------------------------------------------
-- SORULAR
-- ----------------------------------------------------------
create table if not exists public.sorular (
  id uuid primary key default gen_random_uuid(),
  metin_id uuid not null references public.metinler(id) on delete cascade,
  soru_metni text not null,
  soru_tipi text not null default 'coktan-secmeli',
  ayar_json jsonb not null default '{}'::jsonb,
  sira integer not null default 1
);

alter table public.sorular
  add column if not exists metin_id uuid references public.metinler(id) on delete cascade,
  add column if not exists soru_metni text,
  add column if not exists soru_tipi text not null default 'coktan-secmeli',
  add column if not exists ayar_json jsonb not null default '{}'::jsonb,
  add column if not exists sira integer not null default 1;

alter table public.sorular enable row level security;

drop policy if exists "sorular public read" on public.sorular;
create policy "sorular public read"
on public.sorular
for select
using (true);

drop policy if exists "sorular auth manage" on public.sorular;
create policy "sorular auth manage"
on public.sorular
for all
to authenticated
using (true)
with check (true);

create index if not exists idx_sorular_metin on public.sorular (metin_id, sira);

grant select, insert, update, delete on public.sorular to authenticated;
grant select on public.sorular to anon;

-- ----------------------------------------------------------
-- SECENEKLER
-- ----------------------------------------------------------
create table if not exists public.secenekler (
  id uuid primary key default gen_random_uuid(),
  soru_id uuid not null references public.sorular(id) on delete cascade,
  secenek_metni text not null,
  dogru_mu boolean not null default false,
  sira integer not null default 1
);

alter table public.secenekler
  add column if not exists soru_id uuid references public.sorular(id) on delete cascade,
  add column if not exists secenek_metni text,
  add column if not exists dogru_mu boolean not null default false,
  add column if not exists sira integer not null default 1;

alter table public.secenekler enable row level security;

drop policy if exists "secenekler public read" on public.secenekler;
create policy "secenekler public read"
on public.secenekler
for select
using (true);

drop policy if exists "secenekler auth manage" on public.secenekler;
create policy "secenekler auth manage"
on public.secenekler
for all
to authenticated
using (true)
with check (true);

create index if not exists idx_secenekler_soru on public.secenekler (soru_id, sira);

grant select, insert, update, delete on public.secenekler to authenticated;
grant select on public.secenekler to anon;

-- ----------------------------------------------------------
-- SONUCLAR
-- ----------------------------------------------------------
create table if not exists public.sonuclar (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  soyad text not null,
  sinif integer not null,
  sube text not null,
  metin_id uuid references public.metinler(id) on delete set null,
  metin_adi text,
  okuma_suresi_sn numeric(10,2),
  kelime_sayisi integer,
  dakika_kelime integer,
  hedef_hiz integer,
  dogru_sayisi integer not null default 0,
  yanlis_sayisi integer not null default 0,
  toplam_soru integer not null default 0,
  anlama_yuzdesi integer not null default 0,
  detay_json jsonb not null default '{}'::jsonb,
  olusturma_tarihi timestamptz not null default now()
);

alter table public.sonuclar
  add column if not exists metin_id uuid references public.metinler(id) on delete set null,
  add column if not exists metin_adi text,
  add column if not exists okuma_suresi_sn numeric(10,2),
  add column if not exists kelime_sayisi integer,
  add column if not exists dakika_kelime integer,
  add column if not exists hedef_hiz integer,
  add column if not exists dogru_sayisi integer not null default 0,
  add column if not exists yanlis_sayisi integer not null default 0,
  add column if not exists toplam_soru integer not null default 0,
  add column if not exists anlama_yuzdesi integer not null default 0,
  add column if not exists detay_json jsonb not null default '{}'::jsonb,
  add column if not exists olusturma_tarihi timestamptz not null default now();

alter table public.sonuclar enable row level security;

drop policy if exists "sonuclar insert for public" on public.sonuclar;
create policy "sonuclar insert for public"
on public.sonuclar
for insert
with check (true);

drop policy if exists "sonuclar auth read" on public.sonuclar;
create policy "sonuclar auth read"
on public.sonuclar
for select
to authenticated
using (true);

drop policy if exists "sonuclar auth delete" on public.sonuclar;
create policy "sonuclar auth delete"
on public.sonuclar
for delete
to authenticated
using (true);

drop policy if exists "sonuclar auth update" on public.sonuclar;
create policy "sonuclar auth update"
on public.sonuclar
for update
to authenticated
using (true)
with check (true);

create index if not exists idx_sonuclar_tarih on public.sonuclar (olusturma_tarihi desc);
create index if not exists idx_sonuclar_metin on public.sonuclar (metin_id);
create index if not exists idx_sonuclar_sinif_sube on public.sonuclar (sinif, sube);

grant insert on public.sonuclar to anon;
grant select, insert, update, delete on public.sonuclar to authenticated;

grant select, insert, update, delete on public.site_settings to authenticated;
grant select on public.site_settings to anon;

-- ----------------------------------------------------------
-- SITE ANALYTICS
-- ----------------------------------------------------------
create table if not exists public.site_analytics_events (
  id bigint generated always as identity primary key,
  view_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'page_leave')),
  page_url text not null,
  page_path text not null,
  page_title text,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  screen_width integer,
  screen_height integer,
  language text,
  timezone text,
  active_seconds numeric(10,2),
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.site_analytics_events enable row level security;

drop policy if exists "site analytics public insert" on public.site_analytics_events;
create policy "site analytics public insert"
on public.site_analytics_events
for insert
with check (true);

drop policy if exists "site analytics auth read" on public.site_analytics_events;
create policy "site analytics auth read"
on public.site_analytics_events
for select
to authenticated
using (true);

create index if not exists idx_site_analytics_created_at on public.site_analytics_events (created_at desc);
create index if not exists idx_site_analytics_page_path on public.site_analytics_events (page_path);
create index if not exists idx_site_analytics_event_type on public.site_analytics_events (event_type);
create index if not exists idx_site_analytics_session on public.site_analytics_events (session_id);
create index if not exists idx_site_analytics_view on public.site_analytics_events (view_id, event_type);

grant insert on public.site_analytics_events to anon, authenticated;
grant select on public.site_analytics_events to authenticated;
grant usage, select on sequence public.site_analytics_events_id_seq to anon, authenticated;

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
    where created_at >= now() - make_interval(days => (select days from requested))
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

revoke all on function public.get_site_analytics_summary(integer) from public;
grant execute on function public.get_site_analytics_summary(integer) to authenticated;

-- ----------------------------------------------------------
-- NOTLAR
-- ----------------------------------------------------------
-- 1. Supabase Auth > Users bolumunden ogretmen hesabinizi olusturun.
-- 2. Bu script calistiktan sonra admin panellerine o e-posta ve sifre ile girin.
-- 3. Eski veri varsa yeni kolonlar otomatik eklenir; tam tasima gerekmez.

select 'Supabase v1 kurulumu tamamlandi ✅' as durum;
