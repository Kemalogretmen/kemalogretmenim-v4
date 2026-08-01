-- ==========================================================
-- Kemal Ogretmenim - E-Kitaplik salt okunur dogrulama raporu
-- Veri degistirmez. Kurulumdan ve sonraki SQL guncellemelerinden
-- sonra Supabase SQL Editor icinde calistirilabilir.
-- ==========================================================

with checks as (
  select
    10 as sira,
    'e_kitaplar tablosu'::text as kontrol,
    (to_regclass('public.e_kitaplar') is not null) as basarili,
    coalesce(to_regclass('public.e_kitaplar')::text, 'bulunamadi') as detay

  union all

  select
    20,
    'sonuc tablosu',
    (to_regclass('public.e_kitap_sonuclari') is not null),
    coalesce(to_regclass('public.e_kitap_sonuclari')::text, 'bulunamadi')

  union all

  select
    30,
    'e-kitap bucket private',
    coalesce((
      select b.public = false
        and b.file_size_limit = 52428800
      from storage.buckets b
      where b.id = 'e-kitaplar'
    ), false),
    coalesce((
      select 'public=' || b.public::text || ', limit=' || b.file_size_limit::text
      from storage.buckets b
      where b.id = 'e-kitaplar'
    ), 'bucket bulunamadi')

  union all

  select
    40,
    'e-kitap RLS',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'e_kitaplar'
    ), false),
    'public.e_kitaplar'

  union all

  select
    50,
    'sonuc RLS',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'e_kitap_sonuclari'
    ), false),
    'public.e_kitap_sonuclari'

  union all

  select
    60,
    'yonetim kayit RPC',
    (to_regprocedure('public.save_e_kitap_admin(jsonb,jsonb,jsonb)') is not null),
    coalesce(
      to_regprocedure('public.save_e_kitap_admin(jsonb,jsonb,jsonb)')::text,
      'bulunamadi'
    )

  union all

  select
    70,
    'sonuc kayit RPC',
    (to_regprocedure('public.save_e_kitap_result(jsonb)') is not null),
    coalesce(
      to_regprocedure('public.save_e_kitap_result(jsonb)')::text,
      'bulunamadi'
    )

  union all

  select
    80,
    'sinif bazli benchmark RPC',
    (to_regprocedure('public.get_e_kitap_benchmark(uuid,integer)') is not null),
    coalesce(
      to_regprocedure('public.get_e_kitap_benchmark(uuid,integer)')::text,
      'bulunamadi'
    )

  union all

  select
    90,
    'yonetim istatistik RPC',
    (to_regprocedure('public.get_e_kitap_admin_stats()') is not null),
    coalesce(
      to_regprocedure('public.get_e_kitap_admin_stats()')::text,
      'bulunamadi'
    )

  union all

  select
    100,
    'Storage politika sayisi',
    (
      select count(*) >= 5
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'e_kitap storage%'
    ),
    (
      select count(*)::text || ' politika'
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'e_kitap storage%'
    )

  union all

  select
    110,
    'gecersiz kitap kaydi',
    not exists (
      select 1
      from public.e_kitaplar e
      where e.kelime_sayisi <= 0
        or e.hedef_hiz < 10
        or coalesce(cardinality(e.siniflar), 0) = 0
        or (
          e.kaynak_turu = 'supabase_pdf'
          and coalesce(trim(e.dosya_yolu), '') = ''
        )
        or (
          e.kaynak_turu = 'external_pdf'
          and coalesce(trim(e.harici_url), '') = ''
        )
    ),
    (
      select count(*)::text || ' gecersiz kayit'
      from public.e_kitaplar e
      where e.kelime_sayisi <= 0
        or e.hedef_hiz < 10
        or coalesce(cardinality(e.siniflar), 0) = 0
        or (
          e.kaynak_turu = 'supabase_pdf'
          and coalesce(trim(e.dosya_yolu), '') = ''
        )
        or (
          e.kaynak_turu = 'external_pdf'
          and coalesce(trim(e.harici_url), '') = ''
        )
    )

  union all

  select
    120,
    'sahipsiz Storage dosyasi',
    not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'e-kitaplar'
        and not exists (
          select 1
          from public.e_kitaplar e
          where e.id::text = split_part(o.name, '/', 1)
        )
    ),
    (
      select count(*)::text || ' sahipsiz dosya'
      from storage.objects o
      where o.bucket_id = 'e-kitaplar'
        and not exists (
          select 1
          from public.e_kitaplar e
          where e.id::text = split_part(o.name, '/', 1)
        )
    )
)
select
  kontrol,
  case when basarili then 'OK' else 'KONTROL' end as durum,
  detay
from checks
order by sira;
