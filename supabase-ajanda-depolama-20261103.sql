-- Ajanda JSONB uyumluluğunu korur; öğrenci/sınav verisi silmez.
-- Önce supabase-ogretmen-ajandasi.sql kurulmuş olmalıdır.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- PostgreSQL büyük JSONB değerlerini TOAST ile sıkıştırabilir.
-- Base64/gzip ile JSONB'yi okunamaz bir metne çevirmeyin: web, mobil ve
-- öğretmen paneli aynı belgeyi okuyor. Politika sonraki yazımlarda uygulanır.
alter table public.teacher_agenda_states
  alter column agenda_state set storage extended,
  alter column lesson_planner_state set storage extended;

-- Sık değişen tek satırlı belgede ve TOAST parçalarında eski MVCC sürümlerinin
-- alanı yeniden kullanılabilsin. Sunucu genelinde autovacuum da açık olmalıdır.
alter table public.teacher_agenda_states set (
  autovacuum_enabled = true,
  autovacuum_vacuum_threshold = 10,
  autovacuum_vacuum_scale_factor = 0.1,
  toast.autovacuum_enabled = true,
  toast.autovacuum_vacuum_threshold = 50,
  toast.autovacuum_vacuum_scale_factor = 0.1
);

-- Boyut bilgisini istemcinin beyanından bağımsız hesapla.
-- Bu sıkıştırma öncesi JSON metin boyutudur; gerçek disk tüketimi değildir.
create or replace function public.measure_teacher_agenda_storage()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.storage_bytes := octet_length(new.agenda_state::text)
    + coalesce(octet_length(new.lesson_planner_state::text), 0);
  if new.storage_bytes > 6291456 then
    raise exception using errcode = '23514',
      message = 'Ajanda verisi 6 MB sınırını aşıyor. Büyük fotoğrafları küçültün veya yedek alıp gereksiz kayıtları kaldırın.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teacher_agenda_storage on public.teacher_agenda_states;
create trigger trg_teacher_agenda_storage
before insert or update on public.teacher_agenda_states
for each row execute function public.measure_teacher_agenda_storage();

comment on column public.teacher_agenda_states.storage_bytes is
  'Sunucuda hesaplanan sıkıştırma öncesi JSON metin baytı; disk tüketimi için pg_column_size / pg_total_relation_size kullanın.';
commit;

-- Mevcut belgeleri topluca yeniden yazmaz ve VACUUM FULL çalıştırmaz.
-- Salt okunur doğrulama: supabase-ajanda-depolama-denetim.sql
