-- Kemal Ogretmenim - 27.05.2026 panel guncellemesi
-- Mevcut ogretmen + veli paneli SQL'leri daha once calistiysa bu dosya yeterlidir.

alter table if exists public.teacher_class_students
  add column if not exists birth_date date,
  add column if not exists parent_note text not null default '';

do $$
begin
  if to_regclass('public.teacher_class_students') is not null then
    execute 'create index if not exists idx_teacher_class_students_birth_date on public.teacher_class_students (birth_date)';
  end if;
end $$;

alter table if exists public.panel_messages
  add column if not exists sender_deleted_at timestamptz,
  add column if not exists recipient_deleted_at timestamptz;

do $$
begin
  if to_regclass('public.panel_messages') is not null then
    execute 'drop policy if exists "panel_messages update recipient" on public.panel_messages';
    execute 'drop policy if exists "panel_messages update own side" on public.panel_messages';
    execute 'create policy "panel_messages update own side"
      on public.panel_messages
      for update
      to authenticated
      using (sender_id = auth.uid() or recipient_id = auth.uid())
      with check (sender_id = auth.uid() or recipient_id = auth.uid())';
  end if;
end $$;
