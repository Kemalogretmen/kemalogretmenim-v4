-- Kemal Ogretmenim - kayit sagligi kontrol raporu
-- Bu dosya veri yazmaz ve silmez. SQL Editor icinde calistirip okuma/dokuman
-- tarafinda kritik fonksiyon, policy ve grant durumunu tek ekranda kontrol edin.

create or replace function public.get_system_health_report()
returns table (
  alan text,
  kontrol text,
  durum text,
  detay text,
  sira integer
)
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_missing_docs integer := null;
  v_bucket record;
begin
  if auth.uid() is null and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Oturum gerekli.';
  end if;

  return query
  select
    'Okuma'::text,
    'Okuma sonucu RPC'::text,
    case when to_regprocedure('public.submit_reading_result(jsonb)') is not null then 'OK' else 'EKSIK' end,
    case when to_regprocedure('public.submit_reading_result(jsonb)') is not null
      then 'Okuma sonuçları güvenli ve tekrar gönderime dayanıklı RPC üzerinden kaydedilebilir.'
      else 'submit_reading_result(jsonb) eksik. Okuma sonucu kayıtları SQL güncellemesinden etkilenebilir.'
    end,
    10;

  return query
  select
    'Okuma'::text,
    'sonuclar tablosu'::text,
    case when to_regclass('public.sonuclar') is not null then 'OK' else 'EKSIK' end,
    case when to_regclass('public.sonuclar') is not null
      then 'Okuma karne sonuç tablosu erişilebilir.'
      else 'public.sonuclar tablosu bulunamadı.'
    end,
    20;

  return query
  select
    'Okuma'::text,
    'sonuclar public insert policy'::text,
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'sonuclar'
        and policyname = 'sonuclar insert for public'
        and cmd = 'INSERT'
    ) then 'OK' else 'EKSIK' end,
    'Öğrenci okuma sonucunun anonim/oturumlu kayıt izni kontrol edilir.'::text,
    30;

  return query
  select
    'Okuma'::text,
    'sonuclar yetkili okuma policy'::text,
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'sonuclar'
        and policyname = 'sonuclar auth read'
        and cmd = 'SELECT'
    ) then 'OK' else 'EKSIK' end,
    'Admin okuma sonuç ekranının kayıtları okuyabilmesi kontrol edilir.'::text,
    40;

  return query
  select
    'İlerleme'::text,
    'user_content_progress tablosu'::text,
    case when to_regclass('public.user_content_progress') is not null then 'OK' else 'EKSIK' end,
    case when to_regclass('public.user_content_progress') is not null
      then 'Öğrenci içerik/sınav/okuma ilerleme tablosu erişilebilir.'
      else 'public.user_content_progress tablosu bulunamadı.'
    end,
    50;

  return query
  select
    'İlerleme'::text,
    'benzersiz upsert index'::text,
    case when exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'user_content_progress'
        and indexname = 'idx_user_content_progress_unique'
    ) then 'OK' else 'EKSIK' end,
    'Aynı içerik ilerlemesinin tekrar tekrar çoğalmaması için gereken index kontrol edilir.'::text,
    60;

  return query
  select
    'Doküman'::text,
    'kırık kayıt listeleme RPC'::text,
    case when to_regprocedure('public.list_missing_dokuman_storage()') is not null then 'OK' else 'EKSIK' end,
    'Storage dosyası silinmiş ama sitede kaydı kalan dokümanları bulur.'::text,
    70;

  return query
  select
    'Doküman'::text,
    'boşta kalan storage listeleme RPC'::text,
    case when to_regprocedure('public.list_orphan_dokuman_storage()') is not null then 'OK' else 'EKSIK' end,
    'Sitede kullanılmayan Storage dosyalarını bulur.'::text,
    80;

  if to_regclass('public.dokumanlar') is not null and to_regclass('storage.objects') is not null then
    execute $q$
      select count(*)::integer
      from public.dokumanlar d
      where coalesce(d.icerik_turu, 'document') = 'document'
        and coalesce(d.dosya_kaynak_turu, 'supabase') = 'supabase'
        and nullif(trim(d.dosya_yolu), '') is not null
        and not exists (
          select 1
          from storage.objects o
          where o.bucket_id = 'dokumanlar'
            and o.name = d.dosya_yolu
        )
    $q$ into v_missing_docs;

    alan := 'Doküman';
    kontrol := 'kırık doküman kaydı';
    durum := case when coalesce(v_missing_docs, 0) = 0 then 'OK' else 'UYARI' end;
    detay := case when coalesce(v_missing_docs, 0) = 0
      then 'Storage dosyası eksik görünen doküman kaydı yok.'
      else v_missing_docs::text || ' doküman kaydının Storage dosyası eksik görünüyor. Doküman Yönetimi > Kırık Kayıtları Temizle butonunu kullan.'
    end;
    sira := 90;
    return next;
  end if;

  if to_regclass('storage.objects') is not null then
    for v_bucket in
      execute $q$
        select
          bucket_id,
          count(*)::integer as file_count,
          round(sum(
            case
              when metadata ? 'size' and (metadata ->> 'size') ~ '^[0-9]+(\.[0-9]+)?$'
                then (metadata ->> 'size')::numeric
              else 0
            end
          ) / 1024 / 1024, 2) as total_mb
        from storage.objects
        where bucket_id in ('dokumanlar', 'sinav-sorulari', 'teacher-verifications')
        group by bucket_id
        order by bucket_id
      $q$
    loop
      alan := 'Storage';
      kontrol := v_bucket.bucket_id;
      durum := case
        when v_bucket.bucket_id = 'dokumanlar' and v_bucket.total_mb >= 450 then 'UYARI'
        when v_bucket.bucket_id = 'sinav-sorulari' and v_bucket.total_mb >= 450 then 'UYARI'
        else 'OK'
      end;
      detay := v_bucket.file_count::text || ' dosya, yaklaşık ' || coalesce(v_bucket.total_mb, 0)::text || ' MB.';
      sira := 100;
      return next;
    end loop;
  end if;
end;
$$;

grant execute on function public.get_system_health_report() to authenticated;

with checks as (
  select
    'system_health_rpc' as alan,
    'get_system_health_report() fonksiyonu var' as kontrol,
    to_regprocedure('public.get_system_health_report()') is not null as tamam
  union all
  select
    'reading_rpc' as alan,
    'submit_reading_result(jsonb) fonksiyonu var' as kontrol,
    to_regprocedure('public.submit_reading_result(jsonb)') is not null as tamam
  union all
  select
    'reading_table',
    'sonuclar tablosu var',
    to_regclass('public.sonuclar') is not null
  union all
  select
    'reading_policy',
    'sonuclar public insert policy var',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'sonuclar'
        and policyname = 'sonuclar insert for public'
        and cmd = 'INSERT'
    )
  union all
  select
    'reading_policy',
    'sonuclar yetkili okuma policy var',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'sonuclar'
        and policyname = 'sonuclar auth read'
        and cmd = 'SELECT'
    )
  union all
  select
    'progress_table',
    'user_content_progress tablosu var',
    to_regclass('public.user_content_progress') is not null
  union all
  select
    'progress_index',
    'user_content_progress benzersiz upsert index var',
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'user_content_progress'
        and indexname = 'idx_user_content_progress_unique'
    )
  union all
  select
    'documents_rpc',
    'kirik dokuman kaydi listeleme fonksiyonu var',
    to_regprocedure('public.list_missing_dokuman_storage()') is not null
  union all
  select
    'documents_rpc',
    'bosa dusmus storage listeleme fonksiyonu var',
    to_regprocedure('public.list_orphan_dokuman_storage()') is not null
)
select
  alan,
  kontrol,
  case when tamam then 'OK' else 'EKSIK' end as durum
from checks
order by alan, kontrol;

select
  'sonuclar_policies' as rapor,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'sonuclar'
order by policyname;

select
  'progress_policies' as rapor,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'user_content_progress'
order by policyname;
