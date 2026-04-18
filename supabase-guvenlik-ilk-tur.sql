-- Kemal Ogretmenim - Guvenlik ilk tur
-- Amac:
-- 1. admin_users tablosunda RLS ve fonksiyon hijyenini guclendirmek
-- 2. Public view'lari security invoker moduna almak
-- 3. Calisma kagidi fonksiyonunda search_path uyarilarini kapatmak
--
-- Not:
-- Bu script bucket listeleme/policy tarafina dokunmaz.
-- O kisim ogrenci akislarini etkilememek icin ikinci tura bilerek birakildi.

begin;

grant usage on schema public to anon, authenticated;

alter table if exists public.admin_users enable row level security;
revoke all on public.admin_users from anon;
revoke all on public.admin_users from public;
grant select, insert, update, delete on public.admin_users to authenticated;

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.touch_admin_users_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on function public.current_admin_email() to authenticated;

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

create or replace view public.calisma_kagidi_ogrenci_alanlari
with (security_invoker = true) as
select
  a.id,
  w.dokuman_id,
  a.soru_kodu,
  a.soru_etiketi,
  a.alan_tipi,
  a.sayfa_no,
  a.x,
  a.y,
  a.genislik,
  a.yukseklik,
  a.puan,
  a.zorunlu,
  a.sira,
  a.ayar_json
from public.calisma_kagidi_alanlari a
join public.calisma_kagitlari w on w.id = a.calisma_kagidi_id
where w.aktif = true and w.yayinda = true;

grant select on public.calisma_kagidi_ogrenci_alanlari to anon, authenticated;

create or replace function public.calisma_kagidi_cevap_dogru_mu(
  p_alan_tipi text,
  p_cevap jsonb,
  p_yanit jsonb
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_tip text := lower(coalesce(trim(p_alan_tipi), ''));
  v_beklenen text;
  v_gelen text;
begin
  if v_tip = 'dogru-yanlis' then
    v_beklenen := lower(coalesce(p_cevap ->> 'dogru_deger', ''));
    v_gelen := lower(trim(both '"' from coalesce(p_yanit::text, '')));
    return v_beklenen <> '' and v_beklenen = v_gelen;
  end if;

  if v_tip = 'tek-secim' then
    v_beklenen := coalesce(p_cevap ->> 'dogru_secenek', '');
    v_gelen := trim(both '"' from coalesce(p_yanit::text, ''));
    return v_beklenen <> '' and v_beklenen = v_gelen;
  end if;

  if v_tip = 'coklu-secim' then
    return coalesce(p_cevap -> 'dogru_secenekler', '{}'::jsonb) = coalesce(p_yanit, '{}'::jsonb);
  end if;

  if v_tip = 'eslestirme' then
    return coalesce(p_cevap -> 'eslesmeler', '{}'::jsonb) = coalesce(p_yanit, '{}'::jsonb);
  end if;

  return false;
end;
$$;

commit;
