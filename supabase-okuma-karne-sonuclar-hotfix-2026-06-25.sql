-- Okuma Karne Merkezi / Okuma Sonuclari goruntuleme hotfix
-- Bu dosya veri silmez. Sonuclar tablosu kayit/okuma izinlerini ve gerekli
-- fonksiyon calistirma izinlerini yeniden kurar.

begin;

alter table public.sonuclar enable row level security;

grant insert on public.sonuclar to anon, authenticated;
grant select, insert, update, delete on public.sonuclar to authenticated;

grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.current_admin_has_any_permission(text[]) to authenticated;

create or replace function public.submit_reading_result(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_attempt_id text := nullif(trim(p_payload #>> '{detay_json,attempt_id}'), '');
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Okuma sonucu payload nesne olmalidir.';
  end if;

  if v_attempt_id is not null then
    perform pg_advisory_xact_lock(hashtext('reading-result:' || v_attempt_id));

    select id
    into v_id
    from public.sonuclar
    where detay_json ->> 'attempt_id' = v_attempt_id
    order by olusturma_tarihi desc
    limit 1;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.sonuclar (
    ad,
    soyad,
    sinif,
    sube,
    metin_id,
    metin_adi,
    okuma_suresi_sn,
    kelime_sayisi,
    dakika_kelime,
    hedef_hiz,
    dogru_sayisi,
    yanlis_sayisi,
    toplam_soru,
    anlama_yuzdesi,
    detay_json
  )
  values (
    nullif(trim(p_payload ->> 'ad'), ''),
    nullif(trim(p_payload ->> 'soyad'), ''),
    nullif(trim(p_payload ->> 'sinif'), '')::integer,
    nullif(trim(p_payload ->> 'sube'), ''),
    nullif(trim(p_payload ->> 'metin_id'), '')::uuid,
    nullif(trim(p_payload ->> 'metin_adi'), ''),
    coalesce(nullif(trim(p_payload ->> 'okuma_suresi_sn'), '')::numeric, 0),
    coalesce(nullif(trim(p_payload ->> 'kelime_sayisi'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'dakika_kelime'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'hedef_hiz'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'dogru_sayisi'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'yanlis_sayisi'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'toplam_soru'), '')::integer, 0),
    coalesce(nullif(trim(p_payload ->> 'anlama_yuzdesi'), '')::integer, 0),
    coalesce(p_payload -> 'detay_json', '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_reading_result(jsonb) to anon, authenticated;

drop policy if exists "sonuclar insert for public" on public.sonuclar;
create policy "sonuclar insert for public"
on public.sonuclar
for insert
to anon, authenticated
with check (
  coalesce(trim(ad), '') <> ''
  and coalesce(trim(soyad), '') <> ''
  and sinif between 1 and 12
  and coalesce(trim(sube), '') <> ''
);

drop policy if exists "sonuclar auth read" on public.sonuclar;
create policy "sonuclar auth read"
on public.sonuclar
for select
to authenticated
using (
  (select public.current_admin_has_any_permission(array[
    'okuma_sonuclari',
    'okuma_sonuclari_duzenleme',
    'okuma_karne'
  ]))
);

drop policy if exists "sonuclar auth update" on public.sonuclar;
create policy "sonuclar auth update"
on public.sonuclar
for update
to authenticated
using ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')))
with check ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')));

drop policy if exists "sonuclar auth delete" on public.sonuclar;
create policy "sonuclar auth delete"
on public.sonuclar
for delete
to authenticated
using ((select public.current_admin_has_permission('okuma_sonuclari_duzenleme')));

commit;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'sonuclar'
order by policyname;
