-- ==========================================================
-- Kemal Ogretmenim - is_admin_user izin hotfix
-- Tarih: 2026-06-14
--
-- Hata: permission denied for function is_admin_user
-- Sebep: Canli veritabaninda bazi eski RLS/storage policy'leri
-- public.is_admin_user() fonksiyonunu cagiriyor, fakat execute izni
-- guvenlik temizliginde kaldirildi.
--
-- Supabase SQL Editor icinde calistirin.
-- ==========================================================

grant execute on function public.is_admin_user() to authenticated;

-- Kontrol: authenticated yetkisi acl icinde gorunmeli.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.proacl as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_admin_user';
