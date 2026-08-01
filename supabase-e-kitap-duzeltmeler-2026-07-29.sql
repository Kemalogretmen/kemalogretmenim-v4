-- E-Kitap canlı kullanım düzeltmeleri
-- 1. Yorum özelliğini moderasyon ekranı hazırlanana kadar kapatır.
-- 2. Mevcut yorumları silmez.
-- 3. E-kitap sonuç tablosu ve kayıt fonksiyonuna dokunmaz.

begin;

drop policy if exists "e_kitap_yorumlari public read"
  on public.e_kitap_yorumlari;

drop policy if exists "e_kitap_yorumlari delete own"
  on public.e_kitap_yorumlari;

revoke all on public.e_kitap_yorumlari
  from anon, authenticated;

revoke all on function public.add_e_kitap_yorumu(uuid, text)
  from public, anon, authenticated;

commit;

select
  'e_kitap_duzeltmeleri' as kontrol,
  (select count(*) from public.e_kitap_sonuclari) as sonuc_sayisi,
  has_function_privilege('anon', 'public.add_e_kitap_yorumu(uuid,text)', 'EXECUTE') as anon_yorum_yazabilir,
  has_function_privilege('authenticated', 'public.add_e_kitap_yorumu(uuid,text)', 'EXECUTE') as kullanici_yorum_yazabilir;
