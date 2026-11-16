begin;

create table if not exists public.site_adsense_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  publisher_id text not null default '' check (publisher_id = '' or publisher_id ~ '^ca-pub-[0-9]{16}$'),
  slot_id text not null default '' check (slot_id = '' or slot_id ~ '^[0-9]{1,20}$'),
  article_ids uuid[] not null default '{}',
  revision uuid not null default gen_random_uuid()
);

alter table public.site_adsense_settings
  add column if not exists placements text[] not null default '{}',
  drop constraint if exists site_adsense_settings_check,
  drop constraint if exists site_adsense_settings_allowed_placements,
  drop constraint if exists site_adsense_settings_enabled_has_placement;

alter table public.site_adsense_settings
  add constraint site_adsense_settings_allowed_placements
    check (placements <@ array['home', 'games', 'reading', 'exams', 'resources', 'teacher-tools', 'teacher-panel', 'student-panel']),
  add constraint site_adsense_settings_enabled_has_placement check (
    not enabled or (
      publisher_id <> '' and slot_id <> ''
      and cardinality(placements) + cardinality(article_ids) > 0
    )
  );

alter table public.site_adsense_settings enable row level security;

revoke all on public.site_adsense_settings from anon, authenticated;
grant select on public.site_adsense_settings to anon, authenticated;
grant update on public.site_adsense_settings to authenticated;

drop policy if exists "AdSense settings public read" on public.site_adsense_settings;
create policy "AdSense settings public read" on public.site_adsense_settings
  for select to anon, authenticated using (id = 1);

drop policy if exists "AdSense settings owner update" on public.site_adsense_settings;
create policy "AdSense settings owner update" on public.site_adsense_settings
  for update to authenticated using (public.is_admin_owner()) with check (public.is_admin_owner());

insert into public.site_adsense_settings (id, publisher_id, slot_id, placements)
values (
  1, 'ca-pub-4242003290700067', '3992222373',
  array['home', 'games', 'reading', 'exams', 'resources', 'teacher-tools', 'teacher-panel', 'student-panel']
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
