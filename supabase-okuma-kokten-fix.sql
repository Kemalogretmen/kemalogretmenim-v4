-- Kemal Ogretmenim - Okuma sistemi kokten fix
-- Supabase SQL Editor icinde calistirin.
--
-- Bu script sunlari yapar:
-- 1. Anon kullanicinin okuma sorulari ve seceneklerini okuyabildigini garanti eder
-- 2. Public view'lari dogru kolonlarla yeniden olusturur
-- 3. Var olan sorularin ayar_json alanina dogru secenek bilgilerini geri yazar

grant usage on schema public to anon, authenticated;

grant select on public.sorular to anon, authenticated;
grant select on public.secenekler to anon, authenticated;

create or replace view public.sorular_public
with (security_invoker = true) as
select
  id,
  metin_id,
  soru_metni,
  sira,
  soru_tipi,
  ayar_json
from public.sorular;

create or replace view public.secenekler_public
with (security_invoker = true) as
select
  id,
  soru_id,
  secenek_metni,
  sira,
  dogru_mu
from public.secenekler;

grant select on public.sorular_public to anon, authenticated;
grant select on public.secenekler_public to anon, authenticated;

with correct_choices as (
  select
    s.id as soru_id,
    c.id as dogru_id,
    c.secenek_metni as dogru_metin,
    c.sira as dogru_sira
  from public.sorular s
  join lateral (
    select
      sc.id,
      sc.secenek_metni,
      sc.sira
    from public.secenekler sc
    where sc.soru_id = s.id
      and sc.dogru_mu is true
    order by sc.sira asc, sc.id asc
    limit 1
  ) c on true
)
update public.sorular s
set ayar_json = coalesce(s.ayar_json, '{}'::jsonb)
  || jsonb_build_object(
    'dogruSecenekId', cc.dogru_id,
    'correctChoiceId', cc.dogru_id,
    'correctId', cc.dogru_id,
    'dogruSecenekMetni', cc.dogru_metin,
    'correctChoiceText', cc.dogru_metin,
    'correctText', cc.dogru_metin,
    'dogruMetin', cc.dogru_metin,
    'dogruSecenekSira', cc.dogru_sira,
    'correctChoiceOrder', cc.dogru_sira,
    'correctOrder', cc.dogru_sira
  )
from correct_choices cc
where s.id = cc.soru_id;
