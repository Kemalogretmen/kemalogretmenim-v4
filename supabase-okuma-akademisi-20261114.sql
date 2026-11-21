begin;

create table if not exists public.reading_academy_activities (
  id uuid primary key default gen_random_uuid(),
  level_key text not null check (level_key in ('temel', 'akici', 'anlama')),
  category text not null check (category in ('decoding', 'attention', 'fluency', 'comprehension')),
  activity_type text not null check (activity_type in ('quiz', 'repeat', 'writing')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  skill text not null check (char_length(btrim(skill)) between 1 and 100),
  body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 130000),
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.reading_academy_activities enable row level security;
revoke all on public.reading_academy_activities from public, anon, authenticated;
grant select on public.reading_academy_activities to anon, authenticated;
grant insert, update on public.reading_academy_activities to authenticated;

drop policy if exists academy_public_read on public.reading_academy_activities;
create policy academy_public_read on public.reading_academy_activities
  for select to anon, authenticated using (is_published);

drop policy if exists academy_editor_read on public.reading_academy_activities;
create policy academy_editor_read on public.reading_academy_activities
  for select to authenticated using (
    public.current_admin_has_any_permission(array['okuma_metinleri','okuma_metni_ekleme','okuma_metni_duzenleme'])
  );

drop policy if exists academy_editor_insert on public.reading_academy_activities;
create policy academy_editor_insert on public.reading_academy_activities
  for insert to authenticated with check (
    public.current_admin_has_any_permission(array['okuma_metinleri','okuma_metni_ekleme'])
  );

drop policy if exists academy_editor_update on public.reading_academy_activities;
create policy academy_editor_update on public.reading_academy_activities
  for update to authenticated
  using (public.current_admin_has_any_permission(array['okuma_metinleri','okuma_metni_duzenleme']))
  with check (public.current_admin_has_any_permission(array['okuma_metinleri','okuma_metni_duzenleme']));

create index if not exists reading_academy_published_idx
  on public.reading_academy_activities (updated_at desc, id) where is_published;

notify pgrst, 'reload schema';
commit;
