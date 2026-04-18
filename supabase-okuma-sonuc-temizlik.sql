-- Kemal Ogretmenim - Okuma sonuc temizligi
-- Bu script:
-- 1. Eski "started / devam ediyor" satirlarini temizler
-- 2. Ayni attempt_id ile olusmus yinelenen tamamlanmis satirlari teke indirir
-- 3. Gelecekte kontrolu kolaylastirmak icin attempt_id index'i ekler
--
-- Not:
-- Uygulamanin guncel kodunda okuma baslarken veritabani kaydi acilmiyor.
-- Yani bu script esas olarak eski kirli verileri toparlamak icindir.

begin;

-- 1. Ayni attempt_id ile yinelenmis tamamlanmis kayitlardan sadece en yenisini birak
with ranked_completed as (
  select
    id,
    row_number() over (
      partition by coalesce(detay_json ->> 'attempt_id', '')
      order by olusturma_tarihi desc, id desc
    ) as rn
  from public.sonuclar
  where coalesce(detay_json ->> 'attempt_status', 'completed') = 'completed'
    and coalesce(detay_json ->> 'attempt_id', '') <> ''
)
delete from public.sonuclar s
using ranked_completed rc
where s.id = rc.id
  and rc.rn > 1;

-- 2. Eski "started" satirlarini tamamen temizle
delete from public.sonuclar
where coalesce(detay_json ->> 'attempt_status', 'completed') = 'started';

-- 3. Attempt id ile kontrol kolaylassin
create index if not exists idx_sonuclar_attempt_id
on public.sonuclar ((detay_json ->> 'attempt_id'));

commit;

select
  count(*) filter (where coalesce(detay_json ->> 'attempt_status', 'completed') = 'completed') as tamamlanan_kayit_sayisi,
  count(*) filter (where coalesce(detay_json ->> 'attempt_status', 'completed') = 'started') as kalan_started_kayit_sayisi
from public.sonuclar;
