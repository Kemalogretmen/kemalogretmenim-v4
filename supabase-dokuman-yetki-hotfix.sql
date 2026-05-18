-- Kemal Ogretmenim - Dokuman RLS yetki hotfix
-- Dunku guvenlik patchinden sonra dokuman eklerken RLS hatasi aliyorsaniz
-- bu dosyayi Supabase SQL Editor icinde calistirin.

begin;

create or replace function public.current_admin_email()
returns text
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''))
$$;

create or replace function public.admin_permission_json_has(permission_json jsonb, permission_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select
      coalesce(permission_json, '{}'::jsonb) as permissions,
      coalesce(permission_key, '') as requested_key
  )
  select case
    when requested_key = '' then false
    when jsonb_typeof(permissions) = 'array' then
      permissions ? requested_key
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ? 'dokuman_yonetimi'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ? 'okuma_editor'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ? 'oyunlar_admin'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ? 'exam_admin'
      )
    when jsonb_typeof(permissions) = 'object' then
      permissions ->> requested_key = 'true'
      or (
        requested_key = any(array['dokuman_ekleme', 'dokuman_duzenleme', 'dokuman_silme'])
        and permissions ->> 'dokuman_yonetimi' = 'true'
      )
      or (
        requested_key = any(array['okuma_metinleri', 'okuma_metni_ekleme', 'okuma_metni_duzenleme'])
        and permissions ->> 'okuma_editor' = 'true'
      )
      or (
        requested_key = 'oyun_ekleme'
        and permissions ->> 'oyunlar_admin' = 'true'
      )
      or (
        requested_key = any(array[
          'exam_create',
          'exam_categories',
          'exam_category_create',
          'exam_category_edit',
          'exam_category_delete',
          'exam_list',
          'exam_edit',
          'exam_delete',
          'exam_results',
          'exam_results_edit',
          'exam_results_delete',
          'exam_single_report',
          'exam_report_center',
          'exam_appeals'
        ])
        and permissions ->> 'exam_admin' = 'true'
      )
    else false
  end
  from normalized
$$;

create or replace function public.current_admin_has_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_email text := public.current_admin_email();
  has_owner boolean := false;
  has_public_profile boolean := false;
  allowed boolean := false;
begin
  if coalesce(current_email, '') = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.admin_users
    where lower(email) = current_email
      and active = true
      and (
        is_owner = true
        or public.admin_permission_json_has(permissions, permission_key)
      )
  )
  into allowed;

  if allowed then
    return true;
  end if;

  select exists (
    select 1
    from public.admin_users
    where active = true
      and is_owner = true
  )
  into has_owner;

  if not has_owner then
    if to_regclass('public.user_profiles') is not null then
      execute
        'select exists (
          select 1
          from public.user_profiles
          where lower(email) = $1
            and role in (''teacher'', ''student'')
        )'
      into has_public_profile
      using current_email;

      if has_public_profile then
        return false;
      end if;
    end if;

    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.current_admin_email() to anon, authenticated;
grant execute on function public.admin_permission_json_has(jsonb, text) to anon, authenticated;
grant execute on function public.current_admin_has_permission(text) to anon, authenticated;

commit;
