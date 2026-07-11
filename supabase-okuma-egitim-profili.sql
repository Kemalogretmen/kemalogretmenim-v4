-- Hızlı okuma metinleri için geriye uyumlu eğitim profili alanı.
-- Admin editörde seviye, metin türü, tema, kazanım ve RSVP ayarları bu JSON alanda saklanır.

alter table if exists public.metinler
  add column if not exists egitim_json jsonb not null default '{}'::jsonb;

create index if not exists idx_metinler_egitim_seviye
  on public.metinler ((egitim_json ->> 'seviye'));

create index if not exists idx_metinler_egitim_tur
  on public.metinler ((egitim_json ->> 'tur'));
